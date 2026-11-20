-- 069: Store inventory — every stock movement is one atomic, validated server call.
-- Before: issue/return/purchase were several browser writes; items were found by a fuzzy `ilike '%name%'` (could hit the wrong item);
-- when no item matched, an "Issue" was still recorded with no stock change; returns accepted any quantity from anyone;
-- two clerks could issue the same last units (read-modify-write); purchase orders had no receiving step, so ordered stock never arrived.
-- Now: exact item match with row locks, stock never below zero, returns limited to what that recipient still holds,
-- purchase orders are received (fully or in parts) or cancelled, and low-stock urgency follows the minimum automatically.
-- Idempotent. Depends on 001/002.

ALTER TABLE public.inventory_transactions ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES public.inventory_items(id);
ALTER TABLE public.inventory_transactions ADD COLUMN IF NOT EXISTS recipient TEXT;
ALTER TABLE public.inventory_transactions ADD COLUMN IF NOT EXISTS received_qty INTEGER NOT NULL DEFAULT 0 CHECK (received_qty >= 0);
ALTER TABLE public.inventory_transactions ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.inventory_transactions ADD COLUMN IF NOT EXISTS note TEXT;
DO $$ BEGIN ALTER TABLE public.inventory_items ADD CONSTRAINT inventory_stock_nonneg CHECK (current_stock >= 0) NOT VALID; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.inventory_transactions ADD CONSTRAINT inventory_qty_pos CHECK (quantity > 0) NOT VALID; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE UNIQUE INDEX IF NOT EXISTS inventory_items_name_uidx ON public.inventory_items (lower(name));
-- movements are written only by the functions below
DROP POLICY IF EXISTS "Storekeepers can manage inventory transactions" ON public.inventory_transactions;
DROP POLICY IF EXISTS inventory_tx_select ON public.inventory_transactions;
CREATE POLICY inventory_tx_select ON public.inventory_transactions FOR SELECT TO authenticated USING (public.get_current_user_role() IN ('storekeeper','store_manager','admin','principal','finance_manager','accountant'));
REVOKE INSERT, UPDATE, DELETE ON public.inventory_transactions FROM authenticated, anon;

CREATE OR REPLACE FUNCTION public._inventory_urgency(p_stock INT, p_min INT) RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN p_stock <= 0 THEN 'critical' WHEN p_min IS NOT NULL AND p_stock <= p_min THEN 'high' WHEN p_min IS NOT NULL AND p_stock <= p_min * 2 THEN 'medium' ELSE 'low' END
$$;
CREATE OR REPLACE FUNCTION public._inventory_check(p_qty INT) RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL OR public.get_current_user_role() NOT IN ('storekeeper','store_manager','admin') THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only store staff can move inventory.'); END IF;
  IF p_qty IS NULL OR p_qty <= 0 OR p_qty > 100000 THEN RETURN jsonb_build_object('success', false, 'code', 'INVALID_QTY', 'error', 'Quantity must be a whole number above zero.'); END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public._inventory_check(INT) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.inventory_issue(p_item_name TEXT, p_qty INT, p_recipient TEXT, p_department TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE bad JSONB := public._inventory_check(p_qty); it public.inventory_items;
BEGIN
  IF bad IS NOT NULL THEN RETURN bad; END IF;
  IF length(trim(COALESCE(p_recipient,''))) < 2 THEN RETURN jsonb_build_object('success', false, 'code', 'RECIPIENT_REQUIRED', 'error', 'Say who the item is issued to.'); END IF;
  SELECT * INTO it FROM public.inventory_items WHERE lower(name) = lower(trim(p_item_name)) FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'ITEM_NOT_FOUND', 'error', 'No inventory item with that exact name. Add it to the catalogue first.'); END IF;
  IF it.current_stock < p_qty THEN RETURN jsonb_build_object('success', false, 'code', 'INSUFFICIENT_STOCK', 'error', format('Only %s in stock.', it.current_stock)); END IF;
  UPDATE public.inventory_items SET current_stock = current_stock - p_qty, urgency = public._inventory_urgency(current_stock - p_qty, minimum_stock), updated_at = now() WHERE id = it.id;
  INSERT INTO public.inventory_transactions (type, item_id, item_name, quantity, recipient, department, status, created_by) VALUES ('Issue', it.id, it.name, p_qty, trim(p_recipient), NULLIF(trim(COALESCE(p_department,'')),''), 'completed', auth.uid());
  RETURN jsonb_build_object('success', true, 'stock_left', it.current_stock - p_qty);
END $$;

CREATE OR REPLACE FUNCTION public.inventory_return(p_item_name TEXT, p_qty INT, p_recipient TEXT, p_reason TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE bad JSONB := public._inventory_check(p_qty); it public.inventory_items; v_held INT;
BEGIN
  IF bad IS NOT NULL THEN RETURN bad; END IF;
  IF length(trim(COALESCE(p_recipient,''))) < 2 THEN RETURN jsonb_build_object('success', false, 'code', 'RECIPIENT_REQUIRED', 'error', 'Say who is returning the item.'); END IF;
  SELECT * INTO it FROM public.inventory_items WHERE lower(name) = lower(trim(p_item_name)) FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'ITEM_NOT_FOUND', 'error', 'No inventory item with that exact name.'); END IF;
  SELECT COALESCE(sum(CASE WHEN type = 'Issue' THEN quantity ELSE -quantity END), 0) INTO v_held
    FROM public.inventory_transactions WHERE item_id = it.id AND lower(recipient) = lower(trim(p_recipient)) AND type IN ('Issue','Adjustment') AND status = 'completed';
  IF p_qty > v_held THEN RETURN jsonb_build_object('success', false, 'code', 'EXCEEDS_ISSUED', 'error', format('%s currently holds %s of this item; cannot return %s.', trim(p_recipient), GREATEST(v_held, 0), p_qty)); END IF;
  UPDATE public.inventory_items SET current_stock = current_stock + p_qty, urgency = public._inventory_urgency(current_stock + p_qty, minimum_stock), updated_at = now() WHERE id = it.id;
  INSERT INTO public.inventory_transactions (type, item_id, item_name, quantity, recipient, status, note, created_by) VALUES ('Adjustment', it.id, it.name, p_qty, trim(p_recipient), 'completed', COALESCE(NULLIF(trim(p_reason),''), 'Returned'), auth.uid());
  RETURN jsonb_build_object('success', true, 'stock_now', it.current_stock + p_qty);
END $$;

CREATE OR REPLACE FUNCTION public.inventory_order(p_item_name TEXT, p_qty INT, p_supplier TEXT, p_department TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE bad JSONB := public._inventory_check(p_qty); it public.inventory_items; v_id UUID;
BEGIN
  IF bad IS NOT NULL THEN RETURN bad; END IF;
  IF length(trim(COALESCE(p_supplier,''))) < 2 THEN RETURN jsonb_build_object('success', false, 'code', 'SUPPLIER_REQUIRED', 'error', 'Enter the supplier.'); END IF;
  SELECT * INTO it FROM public.inventory_items WHERE lower(name) = lower(trim(p_item_name));
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'ITEM_NOT_FOUND', 'error', 'No inventory item with that exact name. Add it to the catalogue first.'); END IF;
  INSERT INTO public.inventory_transactions (type, item_id, item_name, quantity, supplier, department, status, created_by) VALUES ('Order', it.id, it.name, p_qty, trim(p_supplier), COALESCE(NULLIF(trim(COALESCE(p_department,'')),''), 'Procurement'), 'pending', auth.uid()) RETURNING id INTO v_id;
  RETURN jsonb_build_object('success', true, 'order_id', v_id);
END $$;

-- goods arrive: whole or part of an order
CREATE OR REPLACE FUNCTION public.inventory_receive(p_order UUID, p_qty INT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE bad JSONB := public._inventory_check(p_qty); o public.inventory_transactions; v_left INT;
BEGIN
  IF bad IS NOT NULL THEN RETURN bad; END IF;
  SELECT * INTO o FROM public.inventory_transactions WHERE id = p_order AND type = 'Order' FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Purchase order not found.'); END IF;
  IF o.status NOT IN ('pending','processing') THEN RETURN jsonb_build_object('success', false, 'code', 'BAD_STATE', 'error', 'This order is already ' || o.status || '.'); END IF;
  v_left := o.quantity - o.received_qty;
  IF p_qty > v_left THEN RETURN jsonb_build_object('success', false, 'code', 'EXCEEDS_ORDER', 'error', format('Only %s still expected on this order.', v_left)); END IF;
  UPDATE public.inventory_items SET current_stock = current_stock + p_qty, urgency = public._inventory_urgency(current_stock + p_qty, minimum_stock), updated_at = now() WHERE id = o.item_id;
  UPDATE public.inventory_transactions SET received_qty = received_qty + p_qty, status = CASE WHEN received_qty + p_qty >= quantity THEN 'completed' ELSE 'processing' END WHERE id = o.id;
  INSERT INTO public.inventory_transactions (type, item_id, item_name, quantity, supplier, status, note, created_by) VALUES ('Receipt', o.item_id, o.item_name, p_qty, o.supplier, 'completed', 'Against order ' || o.id::text, auth.uid());
  RETURN jsonb_build_object('success', true, 'complete', o.received_qty + p_qty >= o.quantity);
END $$;

CREATE OR REPLACE FUNCTION public.inventory_cancel_order(p_order UUID, p_reason TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE bad JSONB := public._inventory_check(1); o public.inventory_transactions;
BEGIN
  IF bad IS NOT NULL THEN RETURN bad; END IF;
  IF length(trim(COALESCE(p_reason,''))) < 3 THEN RETURN jsonb_build_object('success', false, 'code', 'REASON_REQUIRED', 'error', 'Give a reason.'); END IF;
  SELECT * INTO o FROM public.inventory_transactions WHERE id = p_order AND type = 'Order' FOR UPDATE;
  IF NOT FOUND OR o.status NOT IN ('pending','processing') THEN RETURN jsonb_build_object('success', false, 'code', 'BAD_STATE', 'error', 'Only an open order can be cancelled.'); END IF;
  UPDATE public.inventory_transactions SET status = 'cancelled', note = trim(p_reason) WHERE id = o.id;
  RETURN jsonb_build_object('success', true);
END $$;

REVOKE ALL ON FUNCTION public.inventory_issue(TEXT,INT,TEXT,TEXT), public.inventory_return(TEXT,INT,TEXT,TEXT), public.inventory_order(TEXT,INT,TEXT,TEXT), public.inventory_receive(UUID,INT), public.inventory_cancel_order(UUID,TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.inventory_issue(TEXT,INT,TEXT,TEXT), public.inventory_return(TEXT,INT,TEXT,TEXT), public.inventory_order(TEXT,INT,TEXT,TEXT), public.inventory_receive(UUID,INT), public.inventory_cancel_order(UUID,TEXT) TO authenticated;
