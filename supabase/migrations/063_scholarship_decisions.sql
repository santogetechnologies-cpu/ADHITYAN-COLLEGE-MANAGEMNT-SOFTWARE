-- 063: Scholarship decisions apply the concession through the fee ledger, on the server.
-- Before: the principal's screen updated the application, then edited `student_fees.total_due` of the student's FIRST fee row
-- directly from the browser (no adjustment record, no audit, no waived-amount tracking, wrong fee if there were several), and
-- wrote a finance transaction row itself. A student could also edit their own pending application, including the sanctioned amount.
-- Idempotent. Depends on 040 (fee_adjust, fee_adjustments).

DROP POLICY IF EXISTS scholarship_apps_update ON public.scholarship_applications;
CREATE POLICY scholarship_apps_update ON public.scholarship_applications FOR UPDATE TO authenticated
  USING (student_id = auth.uid() AND status IN ('Draft','Submitted','Pending'))
  WITH CHECK (student_id = auth.uid() AND status IN ('Draft','Submitted','Pending'));
CREATE OR REPLACE FUNCTION public.scholarship_app_guard() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF current_setting('app.scholarship_decision', true) = 'on' THEN RETURN NEW; END IF;
  NEW.sanctioned_amount := OLD.sanctioned_amount; NEW.approved_by := OLD.approved_by; NEW.student_id := OLD.student_id;
  NEW.student_name := OLD.student_name; NEW.roll_number := OLD.roll_number; NEW.department := OLD.department;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS scholarship_app_guard ON public.scholarship_applications;
CREATE TRIGGER scholarship_app_guard BEFORE UPDATE ON public.scholarship_applications FOR EACH ROW EXECUTE FUNCTION public.scholarship_app_guard();

CREATE OR REPLACE FUNCTION public.scholarship_decide(p_id UUID, p_decision TEXT, p_amount NUMERIC DEFAULT NULL, p_student_fee_id UUID DEFAULT NULL, p_reason TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); a public.scholarship_applications; f public.student_fees; r JSONB; v_rec UUID;
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('admin','principal','finance_manager') THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only the principal, finance or admin can decide scholarships.'); END IF;
  IF p_decision NOT IN ('Approve','Reject') THEN RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Decision must be Approve or Reject.'); END IF;
  SELECT * INTO a FROM public.scholarship_applications WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Application not found.'); END IF;
  IF a.status IN ('Approved','Rejected') THEN RETURN jsonb_build_object('success', false, 'code', 'ALREADY_DECIDED', 'error', 'This application is already ' || lower(a.status) || '.'); END IF;
  PERFORM set_config('app.scholarship_decision', 'on', true);
  IF p_decision = 'Reject' THEN
    IF length(trim(COALESCE(p_reason,''))) < 3 THEN PERFORM set_config('app.scholarship_decision','off',true); RETURN jsonb_build_object('success', false, 'code', 'REASON_REQUIRED', 'error', 'Give a reason for rejecting.'); END IF;
    UPDATE public.scholarship_applications SET status = 'Rejected', approved_by = v_uid, remarks = trim(p_reason), updated_at = now() WHERE id = p_id;
    PERFORM set_config('app.scholarship_decision','off',true);
    RETURN jsonb_build_object('success', true, 'status', 'Rejected');
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN PERFORM set_config('app.scholarship_decision','off',true); RETURN jsonb_build_object('success', false, 'code', 'INVALID_AMOUNT', 'error', 'Enter the amount to sanction.'); END IF;
  IF p_student_fee_id IS NOT NULL THEN
    SELECT * INTO f FROM public.student_fees WHERE id = p_student_fee_id AND (student_id = a.student_id OR student_record_id IN (SELECT id FROM public.students WHERE user_id = a.student_id));
  ELSE   -- the oldest fee that still has a balance
    SELECT * INTO f FROM public.student_fees WHERE (student_id = a.student_id OR student_record_id IN (SELECT id FROM public.students WHERE user_id = a.student_id))
       AND status NOT IN ('cancelled','waived','paid') AND total_due > 0 ORDER BY due_date NULLS LAST, created_at LIMIT 1;
  END IF;
  IF NOT FOUND THEN PERFORM set_config('app.scholarship_decision','off',true); RETURN jsonb_build_object('success', false, 'code', 'NO_FEE', 'error', 'The student has no outstanding fee to apply the concession to. Generate their fees first.'); END IF;
  r := public.fee_adjust(f.id, 'concession', p_amount, 'Scholarship: ' || COALESCE(a.scholarship_name, 'scheme') || ' (application ' || a.id || ')', v_uid);
  IF NOT COALESCE((r->>'success')::boolean, false) THEN PERFORM set_config('app.scholarship_decision','off',true); RETURN r; END IF;
  UPDATE public.scholarship_applications SET status = 'Approved', sanctioned_amount = round(p_amount, 2), approved_by = v_uid, updated_at = now() WHERE id = p_id;
  PERFORM set_config('app.scholarship_decision','off',true);
  RETURN jsonb_build_object('success', true, 'status', 'Approved', 'applied_to_fee', f.id, 'balance_remaining', r->'balance_remaining');
END $$;
REVOKE ALL ON FUNCTION public.scholarship_decide(UUID,TEXT,NUMERIC,UUID,TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.scholarship_decide(UUID,TEXT,NUMERIC,UUID,TEXT) TO authenticated;
