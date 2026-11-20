-- 051: Discipline — reporters see only their own reports; only principal/admin decide.
-- Before: every teacher could read ALL incidents and resolve any of them; failed saves/resolves still showed success in the UI.
-- Idempotent. Depends on 001/002.

ALTER TABLE public.disciplinary_incidents ADD COLUMN IF NOT EXISTS reported_by_user UUID DEFAULT auth.uid();
ALTER TABLE public.disciplinary_incidents ADD COLUMN IF NOT EXISTS decided_by UUID;
ALTER TABLE public.disciplinary_incidents ADD COLUMN IF NOT EXISTS decided_at TIMESTAMPTZ;

DROP POLICY IF EXISTS "Staff can view and manage disciplinary incidents" ON public.disciplinary_incidents;
DROP POLICY IF EXISTS discipline_select ON public.disciplinary_incidents;
DROP POLICY IF EXISTS discipline_insert ON public.disciplinary_incidents;
CREATE POLICY discipline_select ON public.disciplinary_incidents FOR SELECT TO authenticated
  USING (public.get_current_user_role() IN ('admin','principal')
         OR (public.get_current_user_role() IN ('teacher','hod','hostel_warden') AND reported_by_user = auth.uid()));
CREATE POLICY discipline_insert ON public.disciplinary_incidents FOR INSERT TO authenticated
  WITH CHECK (public.get_current_user_role() IN ('admin','principal','teacher','hod','hostel_warden')
              AND status = 'Pending Review' AND action_taken IS NULL AND reported_by_user = auth.uid());
REVOKE UPDATE, DELETE ON public.disciplinary_incidents FROM authenticated, anon;

-- Decisions go through one audited function.
CREATE OR REPLACE FUNCTION public.discipline_update(p_id UUID, p_status TEXT, p_action TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); r public.disciplinary_incidents;
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('admin','principal') THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only the principal or admin can act on incidents.'); END IF;
  IF p_status NOT IN ('Under Investigation','Resolved') THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Status must be Under Investigation or Resolved.'); END IF;
  IF p_status = 'Resolved' AND length(trim(COALESCE(p_action,''))) < 3 THEN
    RETURN jsonb_build_object('success', false, 'code', 'ACTION_REQUIRED', 'error', 'Record the action taken to resolve an incident.'); END IF;
  SELECT * INTO r FROM public.disciplinary_incidents WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Incident not found.'); END IF;
  IF r.status = 'Resolved' THEN RETURN jsonb_build_object('success', false, 'code', 'ALREADY_RESOLVED', 'error', 'This incident is already resolved.'); END IF;
  UPDATE public.disciplinary_incidents SET status = p_status, action_taken = COALESCE(NULLIF(trim(COALESCE(p_action,'')), ''), action_taken), decided_by = v_uid, decided_at = now() WHERE id = p_id;
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, old_values, new_values)
  VALUES (v_uid, v_role, 'discipline_' || lower(replace(p_status,' ','_')), 'disciplinary_incidents', p_id::text, jsonb_build_object('status', r.status), jsonb_build_object('status', p_status, 'action', p_action));
  RETURN jsonb_build_object('success', true, 'status', p_status);
END $$;
REVOKE ALL ON FUNCTION public.discipline_update(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.discipline_update(UUID, TEXT, TEXT) TO authenticated;
