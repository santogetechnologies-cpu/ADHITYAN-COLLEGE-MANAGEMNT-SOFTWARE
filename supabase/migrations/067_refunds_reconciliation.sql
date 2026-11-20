-- 067: Payment reversals/refunds and a daily reconciliation report.
-- A reversal puts the fee back on the student's ledger, voids the receipt and records a finance entry — nothing is deleted.
-- Online payments are refunded at the gateway by the `payments-refund` edge function, which then calls the service-only apply
-- function below. Counter payments (cash/cheque...) are reversed by finance through fee_payment_reverse (money handed back is a
-- manual act outside the system). Idempotent. Depends on 035, 066.

ALTER TABLE public.fee_receipts ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;
ALTER TABLE public.fee_receipts ADD COLUMN IF NOT EXISTS void_reason TEXT;
ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMPTZ;
ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS reversed_by UUID;
ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS reversal_reason TEXT;
ALTER TABLE public.payment_orders DROP CONSTRAINT IF EXISTS payment_orders_status_check;
ALTER TABLE public.payment_orders ADD CONSTRAINT payment_orders_status_check CHECK (status IN ('Created','Paid','Failed','Cancelled','Review','Refunded'));

CREATE TABLE IF NOT EXISTS public.payment_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.payment_orders(id),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  gateway_refund_id TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_refunds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payment_refunds_select ON public.payment_refunds;
CREATE POLICY payment_refunds_select ON public.payment_refunds FOR SELECT TO authenticated USING (public.get_current_user_role() IN ('admin','principal','finance_manager','accountant','financier'));
REVOKE ALL ON public.payment_refunds FROM authenticated, anon;
GRANT SELECT ON public.payment_refunds TO authenticated;

-- internal: reverse one completed payment
CREATE OR REPLACE FUNCTION public._fee_payment_reverse(p_payment UUID, p_reason TEXT, p_actor UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE p public.fee_payments; f public.student_fees; v_paid NUMERIC; v_due NUMERIC; v_status TEXT;
BEGIN
  SELECT * INTO p FROM public.fee_payments WHERE id = p_payment FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Payment not found.'); END IF;
  IF p.status <> 'Completed' THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_REVERSIBLE', 'error', 'Only a completed payment can be reversed (this one is ' || lower(p.status) || ').'); END IF;
  SELECT * INTO f FROM public.student_fees WHERE id = p.student_fee_id FOR UPDATE;
  v_paid := GREATEST(0, f.paid_amount - p.amount); v_due := f.total_due + p.amount;
  v_status := CASE WHEN v_paid > 0 THEN 'partially_paid' WHEN f.due_date < CURRENT_DATE THEN 'overdue' ELSE 'pending' END;
  UPDATE public.student_fees SET paid_amount = v_paid, total_due = v_due, status = v_status WHERE id = f.id;
  UPDATE public.fee_payments SET status = 'Reversed', reversed_at = now(), reversed_by = p_actor, reversal_reason = trim(p_reason) WHERE id = p.id;
  UPDATE public.fee_receipts SET voided_at = now(), void_reason = trim(p_reason) WHERE id = p.receipt_id;
  INSERT INTO public.finance_transactions (type, amount, department, description, status)
  VALUES ('Fee Refund', p.amount, 'Academic Fees', format('Reversal of payment %s (%s): %s', COALESCE(p.transaction_reference, p.id::text), p.payment_mode, trim(p_reason)), 'Approved');
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
  VALUES (p_actor, 'fee_payment_reversed', 'fee_payments', p.id::text, jsonb_build_object('fee_status', f.status, 'paid', f.paid_amount, 'due', f.total_due), jsonb_build_object('fee_status', v_status, 'paid', v_paid, 'due', v_due, 'reason', p_reason));
  RETURN jsonb_build_object('success', true, 'fee_status', v_status, 'balance_due', v_due);
END $$;
REVOKE ALL ON FUNCTION public._fee_payment_reverse(UUID,TEXT,UUID) FROM PUBLIC, anon, authenticated;

-- counter payments: finance reverses (reason required); online payments must go through payments-refund so the gateway is refunded too
CREATE OR REPLACE FUNCTION public.fee_payment_reverse(p_payment UUID, p_reason TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); p public.fee_payments;
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('admin','finance_manager') THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only finance or admin can reverse a payment.'); END IF;
  IF length(trim(COALESCE(p_reason,''))) < 5 THEN RETURN jsonb_build_object('success', false, 'code', 'REASON_REQUIRED', 'error', 'Give a reason (at least 5 characters).'); END IF;
  SELECT * INTO p FROM public.fee_payments WHERE id = p_payment;
  IF FOUND AND p.payment_mode = 'Online_Gateway' THEN
    RETURN jsonb_build_object('success', false, 'code', 'USE_GATEWAY_REFUND', 'error', 'Online payments are refunded from the Online payments tab so the gateway returns the money.'); END IF;
  RETURN public._fee_payment_reverse(p_payment, p_reason, v_uid);
END $$;

-- service role: after the gateway accepted the refund, put the ledger right
CREATE OR REPLACE FUNCTION public.payment_order_refund_apply(p_order UUID, p_reason TEXT, p_actor UUID, p_gateway_refund_id TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE o public.payment_orders; it RECORD; r JSONB;
BEGIN
  SELECT * INTO o FROM public.payment_orders WHERE id = p_order FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Order not found.'); END IF;
  IF o.status = 'Refunded' THEN RETURN jsonb_build_object('success', true, 'duplicate', true); END IF;
  IF o.status NOT IN ('Paid','Review') THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_REFUNDABLE', 'error', 'Only a paid order, or one under review, can be refunded.'); END IF;
  IF o.status = 'Paid' THEN
    FOR it IN SELECT pi.student_fee_id FROM public.payment_order_items pi WHERE pi.order_id = o.id LOOP
      r := public._fee_payment_reverse((SELECT id FROM public.fee_payments WHERE idempotency_key = 'online-' || o.gateway_payment_id || '-' || it.student_fee_id::text), p_reason, p_actor);
      IF NOT COALESCE((r->>'success')::boolean, FALSE) THEN RAISE EXCEPTION 'REVERSE_FAILED: %', COALESCE(r->>'error', r->>'code'); END IF;
    END LOOP;
  END IF;
  UPDATE public.payment_orders SET status = 'Refunded', review_note = COALESCE(review_note || ' | ', '') || 'Refunded: ' || trim(p_reason) WHERE id = o.id;
  INSERT INTO public.payment_refunds (order_id, amount, reason, gateway_refund_id, created_by) VALUES (o.id, o.amount, trim(p_reason), p_gateway_refund_id, p_actor);
  RETURN jsonb_build_object('success', true, 'duplicate', false);
END $$;
REVOKE ALL ON FUNCTION public.payment_order_refund_apply(UUID,TEXT,UUID,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.payment_order_refund_apply(UUID,TEXT,UUID,TEXT) TO service_role;
REVOKE ALL ON FUNCTION public.fee_payment_reverse(UUID,TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fee_payment_reverse(UUID,TEXT) TO authenticated;

-- daily reconciliation: collections by day and mode (net of reversals) and the exceptions finance must look at
CREATE OR REPLACE FUNCTION public.payment_reconciliation(p_from DATE, p_to DATE)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_days JSONB; v_ex JSONB;
BEGIN
  IF auth.uid() IS NULL OR public.get_current_user_role() NOT IN ('admin','principal','finance_manager','accountant','financier') THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Not allowed.'); END IF;
  IF p_from IS NULL OR p_to IS NULL OR p_to < p_from OR p_to - p_from > 366 THEN RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Choose a range of at most one year.'); END IF;
  SELECT COALESCE(jsonb_agg(d ORDER BY d->>'day', d->>'mode'), '[]'::jsonb) INTO v_days FROM (
    SELECT jsonb_build_object('day', paid_at::date, 'mode', payment_mode, 'payments', count(*) FILTER (WHERE status = 'Completed'),
             'collected', COALESCE(sum(amount) FILTER (WHERE status = 'Completed'), 0), 'reversed', COALESCE(sum(amount) FILTER (WHERE status = 'Reversed'), 0)) AS d
      FROM public.fee_payments WHERE paid_at::date BETWEEN p_from AND p_to GROUP BY paid_at::date, payment_mode) q;
  SELECT COALESCE(jsonb_agg(e), '[]'::jsonb) INTO v_ex FROM (
    SELECT jsonb_build_object('kind', 'order_in_review', 'ref', id, 'amount', amount, 'note', review_note) AS e FROM public.payment_orders WHERE status = 'Review'
    UNION ALL SELECT jsonb_build_object('kind', 'order_stuck', 'ref', id, 'amount', amount, 'note', 'Created ' || created_at::text || ' but never confirmed') FROM public.payment_orders WHERE status = 'Created' AND gateway_order_id IS NOT NULL AND created_at < now() - interval '1 day'
    UNION ALL SELECT jsonb_build_object('kind', 'online_payment_without_order', 'ref', fp.id, 'amount', fp.amount, 'note', fp.transaction_reference) FROM public.fee_payments fp
      WHERE fp.payment_mode = 'Online_Gateway' AND fp.status = 'Completed' AND NOT EXISTS (SELECT 1 FROM public.payment_orders o WHERE o.gateway_payment_id = fp.transaction_reference AND o.status = 'Paid')) x;
  RETURN jsonb_build_object('success', true, 'days', v_days, 'exceptions', v_ex);
END $$;
REVOKE ALL ON FUNCTION public.payment_reconciliation(DATE,DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.payment_reconciliation(DATE,DATE) TO authenticated;
