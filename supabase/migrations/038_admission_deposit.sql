-- =============================================================================
-- Migration 038: Server-side, idempotent admission deposit with a real receipt.
-- Replaces the admission form's browser-built receipt (random receipt number, direct insert into
-- fee_receipts with errors swallowed, receipt displayed even when nothing was saved).
-- record_admission_deposit(): admission_fees row + receipt + ledger entry in ONE transaction.
-- Callable by service_role only (the edge function authorises admin/principal/receptionist first).
-- Run after 037. Idempotent.
-- =============================================================================
BEGIN;

ALTER TABLE public.admission_fees ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE public.admission_fees ADD COLUMN IF NOT EXISTS receipt_id UUID REFERENCES public.fee_receipts(id) ON DELETE SET NULL;
ALTER TABLE public.admission_fees ADD COLUMN IF NOT EXISTS collected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_admission_fees_idempotency ON public.admission_fees(idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.record_admission_deposit(
    p_application_id  UUID,
    p_amount          NUMERIC,
    p_payment_mode    TEXT,
    p_reference       TEXT,
    p_idempotency_key TEXT,
    p_actor           UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_app public.admission_applications%ROWTYPE;
    v_prev public.admission_fees%ROWTYPE;
    v_fee_id UUID; v_rec_id UUID; v_rec_no TEXT; v_ref TEXT; v_qr TEXT;
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

    SELECT * INTO v_prev FROM public.admission_fees WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN
        RETURN jsonb_build_object('success', true, 'duplicate', true, 'admission_fee_id', v_prev.id, 'receipt_id', v_prev.receipt_id);
    END IF;

    SELECT * INTO v_app FROM public.admission_applications WHERE id = p_application_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Application not found.');
    END IF;
    IF v_app.status IN ('Rejected', 'Cancelled') THEN
        RETURN jsonb_build_object('success', false, 'code', 'APPLICATION_CLOSED', 'error', format('The application is %s; a deposit cannot be taken.', v_app.status));
    END IF;

    v_rec_no := 'REC-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('public.fee_receipt_seq')::TEXT, 6, '0');
    v_ref := COALESCE(NULLIF(trim(p_reference), ''), 'ADM-' || left(replace(p_application_id::text, '-', ''), 10));
    v_qr := encode(gen_random_bytes(16), 'hex');

    INSERT INTO public.fee_receipts (receipt_number, student_fee_id, student_id, student_name, roll_number, department,
                                     academic_year, fee_type, gross_amount, amount_paid, balance_remaining, payment_mode,
                                     transaction_reference, cashier_user_id, qr_verification_token)
    VALUES (v_rec_no, NULL, NULL, v_app.applicant_name, v_app.application_number, v_app.class_name,
            COALESCE(v_app.academic_year, '—'), 'Admission Deposit', p_amount, p_amount, 0, p_payment_mode,
            v_ref, p_actor, v_qr)
    RETURNING id INTO v_rec_id;

    INSERT INTO public.admission_fees (application_id, applicant_name, class_name, amount, payment_status, payment_method,
                                       transaction_id, paid_at, idempotency_key, receipt_id, collected_by)
    VALUES (v_app.id, v_app.applicant_name, v_app.class_name, p_amount, 'Paid', p_payment_mode,
            v_ref, NOW(), p_idempotency_key, v_rec_id, p_actor)
    RETURNING id INTO v_fee_id;

    INSERT INTO public.finance_transactions (type, amount, department, description, status)
    VALUES ('Admission Deposit', p_amount, 'Academic Fees',
            format('Receipt %s: admission deposit from %s (%s) via %s', v_rec_no, v_app.applicant_name, v_app.application_number, p_payment_mode),
            'Approved');

    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_values)
    VALUES (p_actor, 'admission_deposit_recorded', 'admission_applications', v_app.id::text,
            jsonb_build_object('amount', p_amount, 'receipt', v_rec_no, 'mode', p_payment_mode));

    RETURN jsonb_build_object('success', true, 'duplicate', false, 'admission_fee_id', v_fee_id, 'receipt_id', v_rec_id,
        'receipt', jsonb_build_object('id', v_rec_id, 'receipt_number', v_rec_no, 'qr_verification_token', v_qr, 'gross_amount', p_amount,
            'discount_applied', 0, 'balance_remaining', 0, 'academic_year', COALESCE(v_app.academic_year, '—'), 'semester', 'Semester 1',
            'student_name', v_app.applicant_name,
            'roll_number', v_app.application_number, 'department', v_app.class_name, 'fee_type', 'Admission Deposit',
            'amount_paid', p_amount, 'payment_mode', p_payment_mode, 'transaction_reference', v_ref,
            'payment_date', CURRENT_DATE));
EXCEPTION WHEN unique_violation THEN
    SELECT * INTO v_prev FROM public.admission_fees WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN
        RETURN jsonb_build_object('success', true, 'duplicate', true, 'admission_fee_id', v_prev.id, 'receipt_id', v_prev.receipt_id);
    END IF;
    RAISE;
END;
$$;
REVOKE ALL ON FUNCTION public.record_admission_deposit(UUID, NUMERIC, TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_admission_deposit(UUID, NUMERIC, TEXT, TEXT, TEXT, UUID) TO service_role;

COMMIT;
