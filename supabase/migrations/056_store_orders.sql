-- 056: Campus store — orders are priced and stocked by the server only.
-- Before: the student screen called `place_store_order`, which trusted the browser's prices and total; when that failed it
-- fell back to writing orders and stock directly from the browser (client-supplied total, no row locks); students could INSERT
-- orders with any total/status ('Delivered') because the policy only checked user_id; and there was NO update policy, so a
-- store manager's "Processing / Delivered / Cancelled" changes never persisted. Cancelled orders never returned stock.
-- Idempotent. Depends on 028 (checkout_store_order).

DROP POLICY IF EXISTS "Users can create orders" ON public.store_orders;
REVOKE INSERT, UPDATE, DELETE ON public.store_orders FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.place_store_order(UUID, TEXT, JSONB, NUMERIC) FROM authenticated, anon, PUBLIC;
DROP POLICY IF EXISTS "Public can view store products" ON public.store_products;
DROP POLICY IF EXISTS "Authenticated can view store products" ON public.store_products;
DROP POLICY IF EXISTS store_products_read ON public.store_products;
CREATE POLICY store_products_read ON public.store_products FOR SELECT TO authenticated USING (true);
DO $$ BEGIN ALTER TABLE public.store_products ADD CONSTRAINT store_products_nonneg CHECK (stock >= 0 AND price >= 0) NOT VALID; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.store_orders ADD CONSTRAINT store_orders_status_chk CHECK (status IN ('Pending','Processing','Delivered','Cancelled')) NOT VALID; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.store_order_set_status(p_order UUID, p_status TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); o public.store_orders; v_staff BOOLEAN; l RECORD;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Sign in first.'); END IF;
  v_staff := v_role IN ('admin','store_manager','storekeeper');
  SELECT * INTO o FROM public.store_orders WHERE id = p_order FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Order not found.'); END IF;
  IF NOT v_staff AND NOT (o.user_id = v_uid AND p_status = 'Cancelled' AND o.status = 'Pending') THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'You can only cancel your own pending order.'); END IF;
  IF NOT ((o.status = 'Pending' AND p_status IN ('Processing','Delivered','Cancelled'))
       OR (o.status = 'Processing' AND p_status IN ('Delivered','Cancelled'))) THEN
    RETURN jsonb_build_object('success', false, 'code', 'BAD_STATE', 'error', format('An order that is %s cannot become %s.', o.status, p_status)); END IF;
  IF p_status = 'Cancelled' THEN   -- put the stock back
    FOR l IN SELECT (x->>'product_id')::uuid AS pid, (x->>'quantity')::int AS qty FROM jsonb_array_elements(o.items) x WHERE x ? 'product_id' LOOP
      UPDATE public.store_products SET stock = stock + l.qty, updated_at = now() WHERE id = l.pid;
    END LOOP;
  END IF;
  UPDATE public.store_orders SET status = p_status, updated_at = now() WHERE id = p_order;
  RETURN jsonb_build_object('success', true, 'status', p_status);
END $$;
REVOKE ALL ON FUNCTION public.store_order_set_status(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.store_order_set_status(UUID, TEXT) TO authenticated;
