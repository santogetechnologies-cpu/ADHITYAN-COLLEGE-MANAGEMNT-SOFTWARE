-- =============================================================================
-- Migration 035: Transactional, idempotent fee collection.
-- Replaces the old 'collect_fee_payment' behaviour (insert into a table that did
-- not exist, then return success even when the insert failed).
--
-- record_fee_payment():  payment row + student_fees update + receipt, in ONE
-- transaction; row-locks the fee, rejects over-payment, and is idempotent on
-- p_idempotency_key (a retry returns the original payment/receipt).
-- Callable by service_role only (the edge function authorises the caller first).
-- Run after 028 (needs fee_payments). Idempotent.
-- =============================================================================
BEGIN;

CREATE SEQUENCE IF NOT EXISTS public.fee_receipt_seq START WITH 1;

CREATE OR REPLACE FUNCTION public.record_fee_payment(
    p_student_fee_id  UUID,
    p_amount          NUMERIC,
    p_payment_mode    TEXT,
    p_reference       TEXT,
    p_idempotency_key TEXT,
    p_collected_by    UUID,
    p_remarks         TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_fee      public.student_fees%ROWTYPE;
    v_prof     public.profiles%ROWTYPE;
    v_existing public.fee_payments%ROWTYPE;
    v_pay_id   UUID;
    v_rec_id   UUID;
    v_rec_no   TEXT;
    v_new_paid NUMERIC(12,2);
BEGIN
    IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) < 8 THEN
        RETURN jsonb_build_object('success', false, 'code', 'IDEMPOTENCY_KEY_REQUIRED', 'error', 'An idempotency key (>= 8 chars) is required.');
    END IF;
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'code', 'INVALID_AMOUNT', 'error', 'Amount must be greater than zero.');
    END IF;
    IF p_payment_mode NOT IN ('Cash','UPI','Card','Bank_Transfer','Cheque','Online_Gateway') THEN
        RETURN jsonb_build_object('success', false, 'code', 'INVALID_MODE', 'error', 'Unsupported payment mode.');
    END IF;

    -- Retry of an already-processed request: return the original result.
    SELECT * INTO v_existing FROM public.fee_payments WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN
        RETURN jsonb_build_object('success', true, 'duplicate', true,
            'payment_id', v_existing.id, 'receipt_id', v_existing.receipt_id);
    END IF;

    SELECT * INTO v_fee FROM public.student_fees WHERE id = p_student_fee_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'code', 'FEE_NOT_FOUND', 'error', 'Fee record not found.');
    END IF;
    IF p_amount > (v_fee.total_due - v_fee.paid_amount) THEN
        RETURN jsonb_build_object('success', false, 'code', 'OVERPAYMENT',
            'error', format('Amount exceeds outstanding balance (%s).', v_fee.total_due - v_fee.paid_amount));
    END IF;

    INSERT INTO public.fee_payments (student_fee_id, student_id, amount, payment_mode, transaction_reference,
                                     idempotency_key, status, collected_by, remarks)
    VALUES (v_fee.id, v_fee.student_id, p_amount, p_payment_mode, NULLIF(trim(p_reference), ''),
            p_idempotency_key, 'Completed', p_collected_by, p_remarks)
    RETURNING id INTO v_pay_id;

    v_new_paid := v_fee.paid_amount + p_amount;
    UPDATE public.student_fees
       SET paid_amount = v_new_paid,
           status = CASE WHEN v_new_paid >= total_due THEN 'paid' ELSE 'partially_paid' END
     WHERE id = v_fee.id;

    SELECT * INTO v_prof FROM public.profiles WHERE id = v_fee.student_id;
    v_rec_no := 'REC-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('public.fee_receipt_seq')::TEXT, 6, '0');
    INSERT INTO public.fee_receipts (receipt_number, student_fee_id, student_id, student_name, roll_number, department,
                                     gross_amount, amount_paid, balance_remaining, payment_mode,
                                     transaction_reference, cashier_user_id, qr_verification_token)
    VALUES (v_rec_no, v_fee.id, v_fee.student_id, COALESCE(v_prof.name, v_fee.student_name),
            COALESCE(v_prof.student_id, v_prof.roll_number, 'N/A'), COALESCE(v_prof.department, 'N/A'),
            v_fee.total_due, p_amount, v_fee.total_due - v_new_paid, p_payment_mode,
            COALESCE(NULLIF(trim(p_reference), ''), v_pay_id::TEXT), p_collected_by,
            encode(gen_random_bytes(16), 'hex'))
    RETURNING id INTO v_rec_id;

    UPDATE public.fee_payments SET receipt_id = v_rec_id WHERE id = v_pay_id;

    RETURN jsonb_build_object('success', true, 'duplicate', false, 'payment_id', v_pay_id,
        'receipt_id', v_rec_id, 'receipt_number', v_rec_no,
        'balance_remaining', v_fee.total_due - v_new_paid);
EXCEPTION WHEN unique_violation THEN
    -- concurrent retry with the same key / bank reference
    SELECT * INTO v_existing FROM public.fee_payments
     WHERE idempotency_key = p_idempotency_key OR transaction_reference = NULLIF(trim(p_reference), '') LIMIT 1;
    IF FOUND THEN
        RETURN jsonb_build_object('success', true, 'duplicate', true, 'payment_id', v_existing.id, 'receipt_id', v_existing.receipt_id);
    END IF;
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.record_fee_payment(UUID, NUMERIC, TEXT, TEXT, TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_fee_payment(UUID, NUMERIC, TEXT, TEXT, TEXT, UUID, TEXT) TO service_role;

COMMIT;
