-- 062: Staff leave — decisions deduct balances atomically and cannot be self-approved.
-- Before: HODs/principal/HR/admin updated the application row directly (the balance ledger trigger already deducted on approval), so
-- a staff member who is also a principal/admin could approve their own leave and a rejection did not need a reason.
-- Idempotent. Depends on 053 helpers.

DROP POLICY IF EXISTS leave_apps_update ON public.staff_leave_applications;
CREATE POLICY leave_apps_update ON public.staff_leave_applications FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status IN ('Pending_HOD','Pending_Principal','Pending'))
  WITH CHECK (user_id = auth.uid() AND status IN ('Pending_HOD','Pending_Principal','Pending'));
REVOKE INSERT, UPDATE, DELETE ON public.staff_leave_balances FROM authenticated, anon;

-- The balance ledger itself is maintained by the existing trigger `trg_sync_staff_leave_balance` (deducts on approval, enforces the
-- quota, reverses on change). This function adds the missing rules around the decision and turns the ledger's refusal into a message.
CREATE OR REPLACE FUNCTION public.staff_leave_decide(p_id UUID, p_decision TEXT, p_reason TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); a public.staff_leave_applications;
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('hod','principal','hr_manager','admin') THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only an HOD, the principal, HR or admin can decide leave.'); END IF;
  IF p_decision NOT IN ('Approve','Reject') THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Decision must be Approve or Reject.'); END IF;
  SELECT * INTO a FROM public.staff_leave_applications WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Application not found.'); END IF;
  IF a.user_id = v_uid THEN RETURN jsonb_build_object('success', false, 'code', 'SELF_APPROVAL', 'error', 'You cannot decide your own leave.'); END IF;
  IF a.status IN ('Approved','Rejected','Cancelled') THEN
    RETURN jsonb_build_object('success', false, 'code', 'ALREADY_DECIDED', 'error', 'This application is already ' || lower(a.status) || '.'); END IF;
  IF p_decision = 'Reject' THEN
    IF length(trim(COALESCE(p_reason,''))) < 3 THEN RETURN jsonb_build_object('success', false, 'code', 'REASON_REQUIRED', 'error', 'Give a reason for rejecting.'); END IF;
    UPDATE public.staff_leave_applications SET status = 'Rejected', rejection_reason = trim(p_reason), approved_by = v_uid, updated_at = now() WHERE id = p_id;
    RETURN jsonb_build_object('success', true, 'status', 'Rejected');
  END IF;
  BEGIN
    UPDATE public.staff_leave_applications SET status = 'Approved', approved_by = v_uid, rejection_reason = NULL, updated_at = now() WHERE id = p_id;
  EXCEPTION WHEN check_violation THEN
    RETURN jsonb_build_object('success', false, 'code', 'BALANCE_EXCEEDED', 'error', SQLERRM);
  END;
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values)
  VALUES (v_uid, v_role, 'staff_leave_approved', 'staff_leave_applications', p_id::text, jsonb_build_object('type', a.leave_type, 'days', a.total_days));
  RETURN jsonb_build_object('success', true, 'status', 'Approved');
END $$;
REVOKE ALL ON FUNCTION public.staff_leave_decide(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.staff_leave_decide(UUID, TEXT, TEXT) TO authenticated;

-- days must fit the dates
DO $$ BEGIN
  ALTER TABLE public.staff_leave_applications ADD CONSTRAINT staff_leave_dates_chk
    CHECK (end_date >= start_date AND total_days >= 1 AND total_days <= (end_date - start_date) + 1) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
