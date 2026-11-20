-- 066: Online fee payments (gateway-agnostic ledger; Razorpay adapter in the edge functions).
-- Flow: the student/parent starts a payment → the server creates an order for exact fee amounts (nothing is trusted from the
-- browser) → the gateway collects the money → the gateway WEBHOOK (signature-verified) settles the order by recording the fee
-- payments through record_fee_payment (idempotent, audited, receipts). The browser's "success" callback is only a convenience and
-- goes through the same idempotent settle. Money received that can no longer be applied (e.g. the fee was cleared meanwhile) puts the
-- order in 'Review' for finance instead of being lost.
-- All writes are service_role-only functions called by the edge functions. Idempotent.

ALTER TABLE public.institutional_settings ADD COLUMN IF NOT EXISTS online_payments_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  payer_role TEXT NOT NULL,
  student_id UUID,                     -- profile of the student the fees belong to (when they have a login)
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  gateway TEXT NOT NULL DEFAULT 'razorpay',
  gateway_order_id TEXT UNIQUE,
  gateway_payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'Created' CHECK (status IN ('Created','Paid','Failed','Cancelled','Review')),
  failure_reason TEXT,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS public.payment_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.payment_orders(id) ON DELETE CASCADE,
  student_fee_id UUID NOT NULL REFERENCES public.student_fees(id),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  UNIQUE (order_id, student_fee_id)
);
CREATE TABLE IF NOT EXISTS public.payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT,
  gateway_order_id TEXT,
  payload JSONB,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payment_orders_select ON public.payment_orders;
DROP POLICY IF EXISTS payment_items_select ON public.payment_order_items;
CREATE POLICY payment_orders_select ON public.payment_orders FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR student_id = auth.uid() OR public.is_parent_of(student_id)
         OR public.get_current_user_role() IN ('admin','principal','finance_manager','accountant','financier'));
CREATE POLICY payment_items_select ON public.payment_order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.payment_orders o WHERE o.id = order_id));      -- inherits the order's visibility
REVOKE ALL ON public.payment_orders, public.payment_order_items, public.payment_events FROM authenticated, anon;
GRANT SELECT ON public.payment_orders, public.payment_order_items TO authenticated;

-- service_role only ---------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.payment_order_create(p_actor UUID, p_items JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_role TEXT; v_enabled BOOLEAN; it JSONB; f public.student_fees; v_amt NUMERIC; v_total NUMERIC := 0; v_order UUID; v_stu UUID; v_first_stu UUID; v_n INT := 0; v_ok BOOLEAN; v_seen UUID[] := '{}';
BEGIN
  SELECT COALESCE(online_payments_enabled, FALSE) INTO v_enabled FROM public.institutional_settings LIMIT 1;
  IF NOT COALESCE(v_enabled, FALSE) THEN RETURN jsonb_build_object('success', false, 'code', 'DISABLED', 'error', 'Online payment is not enabled for this institution.'); END IF;
  SELECT role INTO v_role FROM public.profiles WHERE id = p_actor AND COALESCE(status,'active') = 'active';
  IF v_role IS NULL OR v_role NOT IN ('student','parent') THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only students and parents can pay online.'); END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 20 THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Choose between 1 and 20 fees to pay.'); END IF;
  INSERT INTO public.payment_orders (created_by, payer_role, amount, status) VALUES (p_actor, v_role, 0.01, 'Created') RETURNING id INTO v_order;
  FOR it IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    BEGIN v_amt := round((it->>'amount')::numeric, 2); EXCEPTION WHEN others THEN v_amt := NULL; END;
    IF v_amt IS NULL OR v_amt <= 0 THEN RAISE EXCEPTION 'INVALID_AMOUNT'; END IF;
    SELECT * INTO f FROM public.student_fees WHERE id = (it->>'student_fee_id')::uuid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'FEE_NOT_FOUND'; END IF;
    IF f.id = ANY (v_seen) THEN RAISE EXCEPTION 'DUPLICATE_FEE'; END IF;
    v_seen := v_seen || f.id;
    -- ownership: the student themself, or a verified parent of the student
    v_stu := COALESCE(f.student_id, (SELECT st.user_id FROM public.students st WHERE st.id = f.student_record_id));
    v_ok := (v_role = 'student' AND (f.student_id = p_actor OR EXISTS (SELECT 1 FROM public.students st WHERE st.id = f.student_record_id AND st.user_id = p_actor)))
         OR (v_role = 'parent' AND v_stu IS NOT NULL AND EXISTS (SELECT 1 FROM public.parent_student_links l WHERE l.parent_id = p_actor AND l.student_id = v_stu AND COALESCE(l.verified, FALSE)));
    IF NOT v_ok THEN RAISE EXCEPTION 'NOT_YOUR_FEE'; END IF;
    IF f.status IN ('cancelled','waived','paid') OR f.total_due <= 0 THEN RAISE EXCEPTION 'NOTHING_DUE'; END IF;
    IF v_amt > f.total_due THEN RAISE EXCEPTION 'EXCEEDS_BALANCE'; END IF;
    v_first_stu := COALESCE(v_first_stu, v_stu);
    INSERT INTO public.payment_order_items (order_id, student_fee_id, amount) VALUES (v_order, f.id, v_amt);
    v_total := v_total + v_amt; v_n := v_n + 1;
  END LOOP;
  UPDATE public.payment_orders SET amount = v_total, student_id = v_first_stu WHERE id = v_order;
  RETURN jsonb_build_object('success', true, 'order_id', v_order, 'amount', v_total, 'amount_paise', (v_total * 100)::bigint, 'items', v_n);
EXCEPTION WHEN raise_exception THEN
  RETURN jsonb_build_object('success', false, 'code', SQLERRM, 'error', CASE SQLERRM
    WHEN 'INVALID_AMOUNT' THEN 'Each amount must be greater than zero.' WHEN 'FEE_NOT_FOUND' THEN 'A selected fee was not found.'
    WHEN 'DUPLICATE_FEE' THEN 'The same fee was selected twice.' WHEN 'NOT_YOUR_FEE' THEN 'You can only pay your own or your linked child''s fees.'
    WHEN 'NOTHING_DUE' THEN 'A selected fee has no balance due.' WHEN 'EXCEEDS_BALANCE' THEN 'An amount exceeds the outstanding balance of that fee.'
    ELSE 'The order could not be created.' END);
END $$;

CREATE OR REPLACE FUNCTION public.payment_order_attach(p_order UUID, p_gateway_order_id TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  UPDATE public.payment_orders SET gateway_order_id = p_gateway_order_id WHERE id = p_order AND status = 'Created' AND gateway_order_id IS NULL;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Order not found or already attached.'); END IF;
  RETURN jsonb_build_object('success', true);
END $$;

-- Idempotent: the same gateway event (or the same payment seen via webhook AND browser callback) is applied once.
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

CREATE OR REPLACE FUNCTION public.payment_order_fail(p_gateway_order_id TEXT, p_reason TEXT, p_event_id TEXT, p_payload JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  INSERT INTO public.payment_events (gateway_event_id, event_type, gateway_order_id, payload) VALUES (p_event_id, 'payment.failed', p_gateway_order_id, p_payload) ON CONFLICT (gateway_event_id) DO NOTHING;
  UPDATE public.payment_orders SET status = 'Failed', failure_reason = left(COALESCE(p_reason, 'Payment failed'), 300) WHERE gateway_order_id = p_gateway_order_id AND status = 'Created';
  RETURN jsonb_build_object('success', true);
END $$;

REVOKE ALL ON FUNCTION public.payment_order_create(UUID,JSONB), public.payment_order_attach(UUID,TEXT), public.payment_order_settle(TEXT,TEXT,BIGINT,TEXT,TEXT,JSONB), public.payment_order_fail(TEXT,TEXT,TEXT,JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.payment_order_create(UUID,JSONB), public.payment_order_attach(UUID,TEXT), public.payment_order_settle(TEXT,TEXT,BIGINT,TEXT,TEXT,JSONB), public.payment_order_fail(TEXT,TEXT,TEXT,JSONB) TO service_role;

-- Switches kept on institutional_settings, changed through one audited function (finance cannot edit that table directly).
CREATE OR REPLACE FUNCTION public.payment_flags_set(p_online BOOLEAN, p_exam_fee_clearance BOOLEAN)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('admin','principal','finance_manager') THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only admin, principal or finance can change payment settings.'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.institutional_settings) THEN RETURN jsonb_build_object('success', false, 'code', 'NO_SETTINGS', 'error', 'Institution settings have not been created yet.'); END IF;
  UPDATE public.institutional_settings SET online_payments_enabled = COALESCE(p_online, online_payments_enabled), exam_requires_fee_clearance = COALESCE(p_exam_fee_clearance, exam_requires_fee_clearance), updated_at = now();
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values) VALUES (v_uid, v_role, 'payment_flags_set', 'institutional_settings', 'singleton', jsonb_build_object('online', p_online, 'exam_fee_clearance', p_exam_fee_clearance));
  RETURN jsonb_build_object('success', true);
END $$;
REVOKE ALL ON FUNCTION public.payment_flags_set(BOOLEAN, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.payment_flags_set(BOOLEAN, BOOLEAN) TO authenticated;
