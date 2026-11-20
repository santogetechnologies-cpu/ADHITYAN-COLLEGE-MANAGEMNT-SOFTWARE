-- 055: Placement — students apply through a checked function; applicants cannot edit their own outcome.
-- Before: a student could insert/update their own application directly (the CGPA, department and round were whatever the
-- browser sent), there was no limit of one application per drive, no deadline/eligibility check, and no student screen at all.
-- Idempotent. Depends on 001/032.

DELETE FROM public.placement_applications a USING public.placement_applications b
 WHERE a.drive_id = b.drive_id AND a.student_id = b.student_id AND a.created_at > b.created_at;
CREATE UNIQUE INDEX IF NOT EXISTS placement_apps_one_per_drive ON public.placement_applications (drive_id, student_id) WHERE student_id IS NOT NULL;
DO $$ BEGIN
  ALTER TABLE public.placement_drives ADD CONSTRAINT placement_drive_status_chk CHECK (status IN ('Open','Shortlisting','Completed','Closed')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.placement_applications ADD CONSTRAINT placement_app_status_chk CHECK (status IN ('Applied','Shortlisted','Selected','Rejected','Withdrawn')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public.placement_applications ALTER COLUMN status SET DEFAULT 'Applied';

-- drives are visible to students/parents/staff only (not any role, e.g. vendors/drivers)
DROP POLICY IF EXISTS placement_drives_select ON public.placement_drives;
CREATE POLICY placement_drives_select ON public.placement_drives FOR SELECT TO authenticated
  USING (public.get_current_user_role() IN ('admin','principal','placement_officer','hod','teacher','student','parent'));

-- students no longer insert directly; they call placement_apply
DROP POLICY IF EXISTS placement_apps_insert ON public.placement_applications;
CREATE POLICY placement_apps_insert ON public.placement_applications FOR INSERT TO authenticated
  WITH CHECK (public.get_current_user_role() IN ('admin','principal','placement_officer'));

-- an applicant may only withdraw their own pending application; everything else is staff-only
DROP POLICY IF EXISTS placement_apps_update ON public.placement_applications;
CREATE POLICY placement_apps_update ON public.placement_applications FOR UPDATE TO authenticated
  USING (public.get_current_user_role() IN ('admin','principal','placement_officer') OR (student_id = auth.uid() AND status = 'Applied'))
  WITH CHECK (public.get_current_user_role() IN ('admin','principal','placement_officer') OR (student_id = auth.uid() AND status IN ('Applied','Withdrawn')));
CREATE OR REPLACE FUNCTION public.placement_app_guard() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF public.get_current_user_role() NOT IN ('admin','principal','placement_officer') THEN
    NEW.cgpa := OLD.cgpa; NEW.department := OLD.department; NEW.student_name := OLD.student_name; NEW.roll_number := OLD.roll_number;
    NEW.current_round := OLD.current_round; NEW.offer_letter_url := OLD.offer_letter_url; NEW.drive_id := OLD.drive_id; NEW.student_id := OLD.student_id;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS placement_app_guard ON public.placement_applications;
CREATE TRIGGER placement_app_guard BEFORE UPDATE ON public.placement_applications FOR EACH ROW EXECUTE FUNCTION public.placement_app_guard();

-- The student applies. CGPA is self-declared until grade points are computed from results; the officer verifies it.
CREATE OR REPLACE FUNCTION public.placement_apply(p_drive UUID, p_cgpa NUMERIC)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid UUID := auth.uid(); d public.placement_drives; pr public.profiles; s public.students; v_dept TEXT; v_roll TEXT; v_name TEXT; v_id UUID;
BEGIN
  IF v_uid IS NULL OR public.get_current_user_role() <> 'student' THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only students can apply.'); END IF;
  IF p_cgpa IS NULL OR p_cgpa < 0 OR p_cgpa > 10 THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Enter your CGPA (0 to 10).'); END IF;
  SELECT * INTO d FROM public.placement_drives WHERE id = p_drive;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Drive not found.'); END IF;
  IF d.status <> 'Open' OR d.application_deadline < CURRENT_DATE THEN
    RETURN jsonb_build_object('success', false, 'code', 'CLOSED', 'error', 'Applications for this drive are closed.'); END IF;
  SELECT * INTO pr FROM public.profiles WHERE id = v_uid;
  SELECT * INTO s FROM public.students WHERE user_id = v_uid LIMIT 1;
  v_dept := COALESCE(s.department, pr.department); v_name := COALESCE(s.name, pr.name); v_roll := COALESCE(s.roll_number, s.student_id, pr.roll_number, pr.student_id);
  IF v_dept IS NULL OR v_roll IS NULL THEN RETURN jsonb_build_object('success', false, 'code', 'PROFILE_INCOMPLETE', 'error', 'Your department or student ID is missing from your record. Contact the office.'); END IF;
  IF d.eligible_departments IS NOT NULL AND array_length(d.eligible_departments, 1) > 0
     AND NOT EXISTS (SELECT 1 FROM unnest(d.eligible_departments) e WHERE lower(trim(e)) = lower(trim(v_dept))) THEN
    RETURN jsonb_build_object('success', false, 'code', 'NOT_ELIGIBLE', 'error', 'This drive is not open to your department.'); END IF;
  IF d.min_cgpa IS NOT NULL AND p_cgpa < d.min_cgpa THEN
    RETURN jsonb_build_object('success', false, 'code', 'NOT_ELIGIBLE', 'error', 'This drive requires a CGPA of at least ' || d.min_cgpa || '.'); END IF;
  IF EXISTS (SELECT 1 FROM public.placement_applications WHERE drive_id = p_drive AND student_id = v_uid) THEN
    RETURN jsonb_build_object('success', false, 'code', 'ALREADY_APPLIED', 'error', 'You have already applied to this drive.'); END IF;
  INSERT INTO public.placement_applications (drive_id, student_id, student_name, roll_number, department, cgpa, status)
  VALUES (p_drive, v_uid, v_name, v_roll, v_dept, p_cgpa, 'Applied') RETURNING id INTO v_id;
  RETURN jsonb_build_object('success', true, 'id', v_id);
END $$;
REVOKE ALL ON FUNCTION public.placement_apply(UUID, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.placement_apply(UUID, NUMERIC) TO authenticated;
