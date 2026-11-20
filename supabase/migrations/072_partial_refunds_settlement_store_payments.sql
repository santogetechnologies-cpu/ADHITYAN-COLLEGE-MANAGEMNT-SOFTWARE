-- 072: Partial / per-fee refunds, gateway settlement import, online payment for store orders.
-- * A payment can be refunded in parts (counter payments by finance, online payments through the gateway); the fee returns to the
--   ledger by exactly the refunded amount and the receipt is voided only when the payment is fully refunded.
-- * Finance imports the gateway's settlement report (CSV rows) to check every online payment actually settled with the right amount.
-- * Store orders can be paid online through the same ledger (server-priced, signature-verified, idempotent).
-- Idempotent. Depends on 066, 067, 056.

ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS refunded_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (refunded_amount >= 0);
UPDATE public.fee_payments SET refunded_amount = amount WHERE status = 'Reversed' AND refunded_amount = 0;
ALTER TABLE public.payment_orders ADD COLUMN IF NOT EXISTS refunded_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (refunded_amount >= 0);
UPDATE public.payment_orders SET refunded_amount = amount WHERE status = 'Refunded' AND refunded_amount = 0;
ALTER TABLE public.payment_orders ADD COLUMN IF NOT EXISTS store_order_id UUID REFERENCES public.store_orders(id);
ALTER TABLE public.payment_orders DROP CONSTRAINT IF EXISTS payment_orders_status_check;
ALTER TABLE public.payment_orders ADD CONSTRAINT payment_orders_status_check CHECK (status IN ('Created','Paid','Failed','Cancelled','Review','Refunded','Partially_Refunded'));
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'Unpaid';
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS payment_order_id UUID;
DO $$ BEGIN ALTER TABLE public.store_orders ADD CONSTRAINT store_orders_payment_status_chk CHECK (payment_status IN ('Unpaid','Paid','Refunded')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE UNIQUE INDEX IF NOT EXISTS payment_refunds_gateway_uidx ON public.payment_refunds (gateway_refund_id) WHERE gateway_refund_id IS NOT NULL;
ALTER TABLE public.payment_refunds ADD COLUMN IF NOT EXISTS detail JSONB;

-- ---- reversal of part or all of one payment ------------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public._fee_payment_reverse(UUID, TEXT, UUID);
CREATE OR REPLACE FUNCTION public._fee_payment_reverse(p_payment UUID, p_reason TEXT, p_actor UUID, p_amount NUMERIC DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE p public.fee_payments; f public.student_fees; v_amt NUMERIC; v_left NUMERIC; v_paid NUMERIC; v_due NUMERIC; v_status TEXT; v_full BOOLEAN;
BEGIN
  SELECT * INTO p FROM public.fee_payments WHERE id = p_payment FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Payment not found.'); END IF;
  IF p.status <> 'Completed' THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_REVERSIBLE', 'error', 'Only a completed payment can be reversed (this one is ' || lower(p.status) || ').'); END IF;
  v_left := p.amount - p.refunded_amount;
  v_amt := round(COALESCE(p_amount, v_left), 2);
  IF v_amt IS NULL OR v_amt <= 0 THEN RETURN jsonb_build_object('success', false, 'code', 'INVALID_AMOUNT', 'error', 'Refund amount must be above zero.'); END IF;
  IF v_amt > v_left THEN RETURN jsonb_build_object('success', false, 'code', 'EXCEEDS_PAYMENT', 'error', format('Only %s of this payment can still be refunded.', v_left)); END IF;
  SELECT * INTO f FROM public.student_fees WHERE id = p.student_fee_id FOR UPDATE;
  v_paid := GREATEST(0, f.paid_amount - v_amt); v_due := f.total_due + v_amt;
  v_status := CASE WHEN v_paid > 0 THEN 'partially_paid' WHEN f.due_date < CURRENT_DATE THEN 'overdue' ELSE 'pending' END;
  v_full := (p.refunded_amount + v_amt) >= p.amount;
  UPDATE public.student_fees SET paid_amount = v_paid, total_due = v_due, status = v_status WHERE id = f.id;
  UPDATE public.fee_payments SET refunded_amount = refunded_amount + v_amt,
         status = CASE WHEN v_full THEN 'Reversed' ELSE status END,
         reversed_at = CASE WHEN v_full THEN now() ELSE reversed_at END, reversed_by = p_actor,
         reversal_reason = CASE WHEN reversal_reason IS NULL THEN trim(p_reason) ELSE reversal_reason || ' | ' || trim(p_reason) END WHERE id = p.id;
  IF v_full THEN UPDATE public.fee_receipts SET voided_at = now(), void_reason = trim(p_reason) WHERE id = p.receipt_id; END IF;
  INSERT INTO public.finance_transactions (type, amount, department, description, status)
  VALUES ('Fee Refund', v_amt, 'Academic Fees', format('%s of payment %s (%s): %s', CASE WHEN v_full THEN 'Reversal' ELSE 'Partial refund' END, COALESCE(p.transaction_reference, p.id::text), p.payment_mode, trim(p_reason)), 'Approved');
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
  VALUES (p_actor, 'fee_payment_reversed', 'fee_payments', p.id::text, jsonb_build_object('fee_status', f.status, 'paid', f.paid_amount, 'due', f.total_due),
          jsonb_build_object('fee_status', v_status, 'paid', v_paid, 'due', v_due, 'amount', v_amt, 'full', v_full, 'reason', p_reason));
  RETURN jsonb_build_object('success', true, 'fee_status', v_status, 'balance_due', v_due, 'refunded', v_amt, 'full', v_full);
END $$;
REVOKE ALL ON FUNCTION public._fee_payment_reverse(UUID,TEXT,UUID,NUMERIC) FROM PUBLIC, anon, authenticated;

DROP FUNCTION IF EXISTS public.fee_payment_reverse(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.fee_payment_reverse(p_payment UUID, p_reason TEXT, p_amount NUMERIC DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); p public.fee_payments;
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('admin','finance_manager') THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only finance or admin can reverse a payment.'); END IF;
  IF length(trim(COALESCE(p_reason,''))) < 5 THEN RETURN jsonb_build_object('success', false, 'code', 'REASON_REQUIRED', 'error', 'Give a reason (at least 5 characters).'); END IF;
  SELECT * INTO p FROM public.fee_payments WHERE id = p_payment;
  IF FOUND AND p.payment_mode = 'Online_Gateway' THEN
    RETURN jsonb_build_object('success', false, 'code', 'USE_GATEWAY_REFUND', 'error', 'Online payments are refunded from the Online payments tab so the gateway returns the money.'); END IF;
  RETURN public._fee_payment_reverse(p_payment, p_reason, v_uid, p_amount);
END $$;
REVOKE ALL ON FUNCTION public.fee_payment_reverse(UUID,TEXT,NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fee_payment_reverse(UUID,TEXT,NUMERIC) TO authenticated;

-- ---- gateway refund of an online order (whole, or chosen fees/amounts) -------------------------------------------------------------
-- p_items = [{student_fee_id, amount}] or NULL for everything still refundable. Returns the exact amount to send to the gateway.
CREATE OR REPLACE FUNCTION public.payment_order_refund_check(p_order UUID, p_items JSONB DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE o public.payment_orders; it RECORD; v_total NUMERIC := 0; v_pay public.fee_payments; v_amt NUMERIC; v_list JSONB := '[]'::jsonb; x JSONB;
BEGIN
  SELECT * INTO o FROM public.payment_orders WHERE id = p_order;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Order not found.'); END IF;
  IF o.status NOT IN ('Paid','Partially_Refunded','Review') OR o.gateway_payment_id IS NULL THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_REFUNDABLE', 'error', 'This order cannot be refunded.'); END IF;
  IF o.status = 'Review' OR o.store_order_id IS NOT NULL THEN
    IF p_items IS NOT NULL THEN RETURN jsonb_build_object('success', false, 'code', 'WHOLE_ONLY', 'error', 'This order can only be refunded as a whole.'); END IF;
    v_total := o.amount - o.refunded_amount;
    RETURN jsonb_build_object('success', true, 'amount', v_total, 'amount_paise', (v_total * 100)::bigint, 'gateway_payment_id', o.gateway_payment_id, 'items', '[]'::jsonb);
  END IF;
  FOR it IN SELECT pi.student_fee_id, pi.amount FROM public.payment_order_items pi WHERE pi.order_id = o.id LOOP
    SELECT * INTO v_pay FROM public.fee_payments WHERE idempotency_key = 'online-' || o.gateway_payment_id || '-' || it.student_fee_id::text;
    IF NOT FOUND THEN CONTINUE; END IF;
    IF p_items IS NULL THEN v_amt := v_pay.amount - v_pay.refunded_amount;
    ELSE
      SELECT (e->>'amount')::numeric INTO v_amt FROM jsonb_array_elements(p_items) e WHERE (e->>'student_fee_id')::uuid = it.student_fee_id;
      IF v_amt IS NULL THEN CONTINUE; END IF;
    END IF;
    v_amt := round(v_amt, 2);
    IF v_amt <= 0 THEN CONTINUE; END IF;
    IF v_amt > v_pay.amount - v_pay.refunded_amount THEN RETURN jsonb_build_object('success', false, 'code', 'EXCEEDS_PAYMENT', 'error', format('Only %s of that payment can still be refunded.', v_pay.amount - v_pay.refunded_amount)); END IF;
    v_total := v_total + v_amt; v_list := v_list || jsonb_build_object('payment_id', v_pay.id, 'student_fee_id', it.student_fee_id, 'amount', v_amt);
  END LOOP;
  IF p_items IS NOT NULL THEN
    FOR x IN SELECT * FROM jsonb_array_elements(p_items) LOOP
      IF NOT EXISTS (SELECT 1 FROM public.payment_order_items WHERE order_id = o.id AND student_fee_id = (x->>'student_fee_id')::uuid) THEN
        RETURN jsonb_build_object('success', false, 'code', 'NOT_IN_ORDER', 'error', 'A selected fee is not part of this order.'); END IF;
    END LOOP;
  END IF;
  IF v_total <= 0 THEN RETURN jsonb_build_object('success', false, 'code', 'NOTHING_TO_REFUND', 'error', 'Nothing left to refund.'); END IF;
  RETURN jsonb_build_object('success', true, 'amount', v_total, 'amount_paise', (v_total * 100)::bigint, 'gateway_payment_id', o.gateway_payment_id, 'items', v_list);
END $$;
REVOKE ALL ON FUNCTION public.payment_order_refund_check(UUID,JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.payment_order_refund_check(UUID,JSONB) TO service_role;

DROP FUNCTION IF EXISTS public.payment_order_refund_apply(UUID, TEXT, UUID, TEXT);
CREATE OR REPLACE FUNCTION public.payment_order_refund_apply(p_order UUID, p_reason TEXT, p_actor UUID, p_gateway_refund_id TEXT, p_items JSONB DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE o public.payment_orders; chk JSONB; x JSONB; r JSONB; v_amt NUMERIC; so public.store_orders; l RECORD;
BEGIN
  IF p_gateway_refund_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.payment_refunds WHERE gateway_refund_id = p_gateway_refund_id) THEN
    RETURN jsonb_build_object('success', true, 'duplicate', true); END IF;
  SELECT * INTO o FROM public.payment_orders WHERE id = p_order FOR UPDATE;
  IF FOUND AND o.status = 'Refunded' THEN RETURN jsonb_build_object('success', true, 'duplicate', true); END IF;
  chk := public.payment_order_refund_check(p_order, p_items);
  IF NOT COALESCE((chk->>'success')::boolean, FALSE) THEN RETURN chk; END IF;
  v_amt := (chk->>'amount')::numeric;
  IF o.status IN ('Paid','Partially_Refunded') AND o.store_order_id IS NULL THEN
    FOR x IN SELECT * FROM jsonb_array_elements(chk->'items') LOOP
      r := public._fee_payment_reverse((x->>'payment_id')::uuid, p_reason, p_actor, (x->>'amount')::numeric);
      IF NOT COALESCE((r->>'success')::boolean, FALSE) THEN RAISE EXCEPTION 'REVERSE_FAILED: %', COALESCE(r->>'error', r->>'code'); END IF;
    END LOOP;
  ELSIF o.store_order_id IS NOT NULL THEN
    SELECT * INTO so FROM public.store_orders WHERE id = o.store_order_id FOR UPDATE;
    IF so.status IN ('Pending','Processing') THEN
      FOR l IN SELECT (e->>'product_id')::uuid AS pid, (e->>'quantity')::int AS qty FROM jsonb_array_elements(so.items) e WHERE e ? 'product_id' LOOP
        UPDATE public.store_products SET stock = stock + l.qty, updated_at = now() WHERE id = l.pid;
      END LOOP;
      UPDATE public.store_orders SET status = 'Cancelled', payment_status = 'Refunded', updated_at = now() WHERE id = so.id;
    ELSE
      UPDATE public.store_orders SET payment_status = 'Refunded', updated_at = now() WHERE id = so.id;
    END IF;
  END IF;
  UPDATE public.payment_orders SET refunded_amount = refunded_amount + v_amt,
         status = CASE WHEN refunded_amount + v_amt >= amount THEN 'Refunded' ELSE 'Partially_Refunded' END,
         review_note = COALESCE(review_note || ' | ', '') || 'Refunded ' || v_amt || ': ' || trim(p_reason) WHERE id = o.id;
  INSERT INTO public.payment_refunds (order_id, amount, reason, gateway_refund_id, created_by, detail) VALUES (o.id, v_amt, trim(p_reason), p_gateway_refund_id, p_actor, chk->'items');
  RETURN jsonb_build_object('success', true, 'duplicate', false, 'refunded', v_amt);
END $$;
REVOKE ALL ON FUNCTION public.payment_order_refund_apply(UUID,TEXT,UUID,TEXT,JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.payment_order_refund_apply(UUID,TEXT,UUID,TEXT,JSONB) TO service_role;

-- ---- settlement import ---------------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id TEXT NOT NULL,
  gateway_payment_id TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  net NUMERIC(12,2) NOT NULL,
  settled_at TIMESTAMPTZ,
  order_id UUID REFERENCES public.payment_orders(id),
  status TEXT NOT NULL CHECK (status IN ('Matched','AmountMismatch','UnknownPayment')),
  imported_by UUID, imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (settlement_id, gateway_payment_id)
);
ALTER TABLE public.payment_settlements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payment_settlements_select ON public.payment_settlements;
CREATE POLICY payment_settlements_select ON public.payment_settlements FOR SELECT TO authenticated USING (public.get_current_user_role() IN ('admin','principal','finance_manager','accountant','financier'));
REVOKE ALL ON public.payment_settlements FROM authenticated, anon;
GRANT SELECT ON public.payment_settlements TO authenticated;

CREATE OR REPLACE FUNCTION public.payment_settlement_import(p_rows JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); r JSONB; o public.payment_orders; v_amt NUMERIC; v_fee NUMERIC; v_tax NUMERIC; v_net NUMERIC; v_status TEXT;
  v_new INT := 0; v_dup INT := 0; v_mis JSONB := '[]'::jsonb; v_unk JSONB := '[]'::jsonb; v_unsettled JSONB; v_sid TEXT; v_pid TEXT; n INT;
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('admin','finance_manager','accountant') THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only finance can import settlements.'); END IF;
  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' OR jsonb_array_length(p_rows) = 0 OR jsonb_array_length(p_rows) > 5000 THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Provide between 1 and 5000 settlement rows.'); END IF;
  FOR r IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    v_sid := NULLIF(trim(r->>'settlement_id'), ''); v_pid := NULLIF(trim(r->>'payment_id'), '');
    IF v_sid IS NULL OR v_pid IS NULL THEN RETURN jsonb_build_object('success', false, 'code', 'INVALID_ROW', 'error', 'Every row needs a settlement id and a payment id.'); END IF;
    BEGIN v_amt := round((r->>'amount')::numeric, 2); v_fee := round(COALESCE(NULLIF(r->>'fee','')::numeric, 0), 2); v_tax := round(COALESCE(NULLIF(r->>'tax','')::numeric, 0), 2);
    EXCEPTION WHEN others THEN RETURN jsonb_build_object('success', false, 'code', 'INVALID_ROW', 'error', 'Amounts must be numbers (payment ' || v_pid || ').'); END;
    IF v_amt IS NULL OR v_amt <= 0 THEN RETURN jsonb_build_object('success', false, 'code', 'INVALID_ROW', 'error', 'Amount must be above zero (payment ' || v_pid || ').'); END IF;
    v_net := COALESCE(NULLIF(r->>'net','')::numeric, v_amt - v_fee - v_tax);
    SELECT * INTO o FROM public.payment_orders WHERE gateway_payment_id = v_pid;
    v_status := CASE WHEN NOT FOUND THEN 'UnknownPayment' WHEN o.amount = v_amt THEN 'Matched' ELSE 'AmountMismatch' END;
    INSERT INTO public.payment_settlements (settlement_id, gateway_payment_id, amount, fee, tax, net, settled_at, order_id, status, imported_by)
    VALUES (v_sid, v_pid, v_amt, v_fee, v_tax, v_net, NULLIF(r->>'settled_at','')::timestamptz, o.id, v_status, v_uid) ON CONFLICT (settlement_id, gateway_payment_id) DO NOTHING;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n = 0 THEN v_dup := v_dup + 1; CONTINUE; END IF;
    v_new := v_new + 1;
    IF v_status = 'AmountMismatch' THEN v_mis := v_mis || jsonb_build_object('payment_id', v_pid, 'file_amount', v_amt, 'our_amount', o.amount);
    ELSIF v_status = 'UnknownPayment' THEN v_unk := v_unk || jsonb_build_object('payment_id', v_pid, 'amount', v_amt); END IF;
  END LOOP;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('order_id', po.id, 'payment_id', po.gateway_payment_id, 'amount', po.amount, 'paid_at', po.paid_at)), '[]'::jsonb) INTO v_unsettled
    FROM public.payment_orders po WHERE po.status IN ('Paid','Partially_Refunded') AND po.paid_at < now() - interval '3 days'
     AND NOT EXISTS (SELECT 1 FROM public.payment_settlements s WHERE s.gateway_payment_id = po.gateway_payment_id);
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values) VALUES (v_uid, v_role, 'settlement_imported', 'payment_settlements', 'batch', jsonb_build_object('new', v_new, 'duplicates', v_dup, 'mismatches', jsonb_array_length(v_mis), 'unknown', jsonb_array_length(v_unk)));
  RETURN jsonb_build_object('success', true, 'imported', v_new, 'duplicates', v_dup, 'amount_mismatches', v_mis, 'unknown_payments', v_unk, 'paid_but_not_settled', v_unsettled);
END $$;
REVOKE ALL ON FUNCTION public.payment_settlement_import(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.payment_settlement_import(JSONB) TO authenticated;

-- ---- online payment of a store order -------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.payment_order_create_store(p_actor UUID, p_store_order UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role TEXT; v_enabled BOOLEAN; so public.store_orders; v_order UUID;
BEGIN
  SELECT COALESCE(online_payments_enabled, FALSE) INTO v_enabled FROM public.institutional_settings LIMIT 1;
  IF NOT COALESCE(v_enabled, FALSE) THEN RETURN jsonb_build_object('success', false, 'code', 'DISABLED', 'error', 'Online payment is not enabled for this institution.'); END IF;
  SELECT role INTO v_role FROM public.profiles WHERE id = p_actor AND COALESCE(status,'active') = 'active';
  IF v_role IS NULL OR v_role NOT IN ('student','parent') THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only students and parents can pay online.'); END IF;
  SELECT * INTO so FROM public.store_orders WHERE id = p_store_order FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Order not found.'); END IF;
  IF NOT (so.user_id = p_actor OR (v_role = 'parent' AND EXISTS (SELECT 1 FROM public.parent_student_links l WHERE l.parent_id = p_actor AND l.student_id = so.user_id AND COALESCE(l.verified, FALSE)))) THEN
    RETURN jsonb_build_object('success', false, 'code', 'NOT_YOUR_ORDER', 'error', 'This is not your order.'); END IF;
  IF so.status NOT IN ('Pending','Processing') OR so.payment_status <> 'Unpaid' THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_PAYABLE', 'error', 'This order cannot be paid (it is ' || lower(so.status) || ', ' || lower(so.payment_status) || ').'); END IF;
  IF so.total_amount IS NULL OR so.total_amount <= 0 THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_PAYABLE', 'error', 'This order has nothing to pay.'); END IF;
  INSERT INTO public.payment_orders (created_by, payer_role, student_id, amount, status, store_order_id) VALUES (p_actor, v_role, so.user_id, so.total_amount, 'Created', so.id) RETURNING id INTO v_order;
  RETURN jsonb_build_object('success', true, 'order_id', v_order, 'amount', so.total_amount, 'amount_paise', (so.total_amount * 100)::bigint);
END $$;
REVOKE ALL ON FUNCTION public.payment_order_create_store(UUID,UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.payment_order_create_store(UUID,UUID) TO service_role;

-- Settlement, now also for store orders: marks the store order paid instead of applying fee payments. (Replaces the 066 definition.)
CREATE OR REPLACE FUNCTION public.payment_order_settle(p_gateway_order_id TEXT, p_gateway_payment_id TEXT, p_amount_paise BIGINT, p_event_id TEXT, p_event_type TEXT, p_payload JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp AS $$
DECLARE o public.payment_orders; it RECORD; r JSONB; v_n INT := 0;
BEGIN
  INSERT INTO public.payment_events (gateway_event_id, event_type, gateway_order_id, payload) VALUES (p_event_id, p_event_type, p_gateway_order_id, p_payload)
  ON CONFLICT (gateway_event_id) DO NOTHING;
  SELECT * INTO o FROM public.payment_orders WHERE gateway_order_id = p_gateway_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'UNKNOWN_ORDER', 'error', 'No order for this gateway order id.'); END IF;
  IF o.status = 'Paid' THEN RETURN jsonb_build_object('success', true, 'duplicate', true, 'order_id', o.id); END IF;
  IF o.status = 'Review' THEN RETURN jsonb_build_object('success', true, 'duplicate', true, 'order_id', o.id, 'review', true); END IF;
  IF p_amount_paise IS NULL OR p_amount_paise <> round(o.amount * 100)::bigint THEN
    UPDATE public.payment_orders SET status = 'Review', gateway_payment_id = p_gateway_payment_id, review_note = format('Gateway reports %s paise; order expects %s.', p_amount_paise, round(o.amount * 100)::bigint) WHERE id = o.id;
    RETURN jsonb_build_object('success', false, 'code', 'AMOUNT_MISMATCH', 'error', 'Amount does not match the order; sent to finance review.');
  END IF;
  BEGIN
    IF o.store_order_id IS NOT NULL THEN
      UPDATE public.store_orders SET payment_status = 'Paid', payment_order_id = o.id, updated_at = now() WHERE id = o.store_order_id AND status IN ('Pending','Processing') AND payment_status = 'Unpaid';
      IF NOT FOUND THEN RAISE EXCEPTION 'STORE_ORDER_NOT_PAYABLE'; END IF;
      v_n := 1;
    END IF;
    FOR it IN SELECT * FROM public.payment_order_items WHERE order_id = o.id ORDER BY student_fee_id LOOP
      r := public.record_fee_payment(it.student_fee_id, it.amount, 'Online_Gateway', p_gateway_payment_id, 'online-' || p_gateway_payment_id || '-' || it.student_fee_id::text, o.created_by, 'Online payment ' || o.id::text);
      IF NOT COALESCE((r->>'success')::boolean, FALSE) THEN RAISE EXCEPTION 'APPLY_FAILED: %', COALESCE(r->>'error', r->>'code'); END IF;
      v_n := v_n + 1;
    END LOOP;
  EXCEPTION WHEN raise_exception THEN
    -- nothing was applied (the block rolls back); the money has been taken, so finance must resolve it
    UPDATE public.payment_orders SET status = 'Review', gateway_payment_id = p_gateway_payment_id, review_note = SQLERRM WHERE id = o.id;
    RETURN jsonb_build_object('success', false, 'code', 'NEEDS_REVIEW', 'error', SQLERRM);
  END;
  UPDATE public.payment_orders SET status = 'Paid', gateway_payment_id = p_gateway_payment_id, paid_at = now() WHERE id = o.id;
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values)
  VALUES (o.created_by, o.payer_role, 'online_payment_settled', 'payment_orders', o.id::text, jsonb_build_object('amount', o.amount, 'payment_id', p_gateway_payment_id, 'items', v_n));
  RETURN jsonb_build_object('success', true, 'duplicate', false, 'order_id', o.id, 'applied', v_n);
END $$;


REVOKE ALL ON FUNCTION public.payment_order_settle(TEXT,TEXT,BIGINT,TEXT,TEXT,JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.payment_order_settle(TEXT,TEXT,BIGINT,TEXT,TEXT,JSONB) TO service_role;
