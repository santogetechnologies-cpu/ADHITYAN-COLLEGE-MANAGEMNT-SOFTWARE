-- 068: Revaluation and supplementary examinations.
-- Revaluation: students ask for a re-check of a PUBLISHED result inside a window set by the COE; the COE records the outcome
-- (revise marks / keep / reject). A revision recomputes grade and pass/fail exactly as normal marks entry does and every change is
-- kept in exam_result_history. Supplementary: an examination linked to a parent examination; only students who failed or were absent
-- in the parent may register; papers can be generated from the failed subjects; results then flow into GPA (latest attempt counts).
-- Idempotent. Depends on 045, 064, 065.

ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS parent_exam_id UUID REFERENCES public.exams(id) ON DELETE SET NULL;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS revaluation_open BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS revaluation_deadline DATE;

CREATE TABLE IF NOT EXISTS public.exam_revaluation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_name TEXT, class_name TEXT,
  subject TEXT NOT NULL,
  original_marks NUMERIC NOT NULL,
  max_marks NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Requested' CHECK (status IN ('Requested','Revised','Kept','Rejected')),
  revised_marks NUMERIC,
  decision_note TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_by UUID, decided_at TIMESTAMPTZ,
  UNIQUE (exam_id, student_id, subject)
);
CREATE TABLE IF NOT EXISTS public.exam_result_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL, student_id UUID NOT NULL, subject TEXT NOT NULL,
  old_marks NUMERIC, new_marks NUMERIC, old_grade TEXT, new_grade TEXT, old_status TEXT, new_status TEXT,
  reason TEXT, changed_by UUID, changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.exam_revaluation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_result_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS reval_select ON public.exam_revaluation_requests;
DROP POLICY IF EXISTS result_history_select ON public.exam_result_history;
CREATE POLICY reval_select ON public.exam_revaluation_requests FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR public.is_parent_of(student_id) OR public.get_current_user_role() IN ('admin','principal','coe','hod'));
CREATE POLICY result_history_select ON public.exam_result_history FOR SELECT TO authenticated USING (public.get_current_user_role() IN ('admin','principal','coe'));
REVOKE INSERT, UPDATE, DELETE ON public.exam_revaluation_requests, public.exam_result_history FROM authenticated, anon;

CREATE OR REPLACE FUNCTION public.exam_revaluation_set(p_exam UUID, p_open BOOLEAN, p_deadline DATE DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role TEXT := public.get_current_user_role();
BEGIN
  IF auth.uid() IS NULL OR v_role NOT IN ('admin','principal','coe') THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only the Controller of Examinations, principal or admin can open revaluation.'); END IF;
  IF p_open AND NOT EXISTS (SELECT 1 FROM public.exams WHERE id = p_exam AND results_published) THEN
    RETURN jsonb_build_object('success', false, 'code', 'NOT_PUBLISHED', 'error', 'Revaluation can open only after results are published.'); END IF;
  UPDATE public.exams SET revaluation_open = COALESCE(p_open, FALSE), revaluation_deadline = p_deadline WHERE id = p_exam;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Examination not found.'); END IF;
  RETURN jsonb_build_object('success', true);
END $$;

CREATE OR REPLACE FUNCTION public.exam_revaluation_request(p_exam UUID, p_subject TEXT, p_reason TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid UUID := auth.uid(); e public.exams; r public.exam_results;
BEGIN
  IF v_uid IS NULL OR public.get_current_user_role() <> 'student' THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only students can request revaluation.'); END IF;
  SELECT * INTO e FROM public.exams WHERE id = p_exam;
  IF NOT FOUND OR NOT e.revaluation_open OR (e.revaluation_deadline IS NOT NULL AND e.revaluation_deadline < CURRENT_DATE) THEN
    RETURN jsonb_build_object('success', false, 'code', 'CLOSED', 'error', 'Revaluation is not open for this examination.'); END IF;
  IF length(trim(COALESCE(p_reason,''))) < 10 THEN RETURN jsonb_build_object('success', false, 'code', 'REASON_REQUIRED', 'error', 'Explain why you are asking for revaluation (at least 10 characters).'); END IF;
  SELECT * INTO r FROM public.exam_results WHERE exam_id = p_exam AND student_id = v_uid AND subject = p_subject AND is_published;
  IF NOT FOUND OR r.result_status = 'Absent' THEN RETURN jsonb_build_object('success', false, 'code', 'NO_RESULT', 'error', 'There is no published mark for this subject.'); END IF;
  IF EXISTS (SELECT 1 FROM public.exam_revaluation_requests WHERE exam_id = p_exam AND student_id = v_uid AND subject = p_subject) THEN
    RETURN jsonb_build_object('success', false, 'code', 'ALREADY_REQUESTED', 'error', 'You have already requested revaluation for this subject.'); END IF;
  INSERT INTO public.exam_revaluation_requests (exam_id, student_id, student_name, class_name, subject, original_marks, max_marks, reason)
  VALUES (p_exam, v_uid, r.student_name, r.class_name, p_subject, r.marks_obtained, r.max_marks, trim(p_reason));
  RETURN jsonb_build_object('success', true);
END $$;

CREATE OR REPLACE FUNCTION public.exam_revaluation_decide(p_id UUID, p_decision TEXT, p_new_marks NUMERIC DEFAULT NULL, p_note TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); q public.exam_revaluation_requests; r public.exam_results;
  v_sched public.exam_schedules; v_pass_pct NUMERIC; v_pass_marks NUMERIC; v_pass BOOLEAN; v_grade TEXT; v_status TEXT;
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('admin','principal','coe') THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only the Controller of Examinations, principal or admin can decide revaluation.'); END IF;
  IF p_decision NOT IN ('Revise','Keep','Reject') THEN RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Decision must be Revise, Keep or Reject.'); END IF;
  IF length(trim(COALESCE(p_note,''))) < 3 THEN RETURN jsonb_build_object('success', false, 'code', 'NOTE_REQUIRED', 'error', 'Record a note explaining the decision.'); END IF;
  SELECT * INTO q FROM public.exam_revaluation_requests WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Request not found.'); END IF;
  IF q.status <> 'Requested' THEN RETURN jsonb_build_object('success', false, 'code', 'ALREADY_DECIDED', 'error', 'This request was already decided.'); END IF;
  IF p_decision <> 'Revise' THEN
    UPDATE public.exam_revaluation_requests SET status = CASE p_decision WHEN 'Keep' THEN 'Kept' ELSE 'Rejected' END, decision_note = trim(p_note), decided_by = v_uid, decided_at = now() WHERE id = p_id;
    RETURN jsonb_build_object('success', true, 'status', CASE p_decision WHEN 'Keep' THEN 'Kept' ELSE 'Rejected' END);
  END IF;
  IF p_new_marks IS NULL OR p_new_marks < 0 OR p_new_marks > q.max_marks THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_MARKS', 'error', format('Revised marks must be between 0 and %s.', q.max_marks)); END IF;
  SELECT * INTO r FROM public.exam_results WHERE exam_id = q.exam_id AND student_id = q.student_id AND subject = q.subject FOR UPDATE;
  SELECT * INTO v_sched FROM public.exam_schedules WHERE exam_id = q.exam_id AND subject = q.subject AND (class_name = q.class_name OR class_name IS NULL) ORDER BY class_name NULLS LAST LIMIT 1;
  SELECT COALESCE(passing_marks_percentage, 40) INTO v_pass_pct FROM public.institutional_settings LIMIT 1; v_pass_pct := COALESCE(v_pass_pct, 40);
  v_pass_marks := COALESCE(v_sched.passing_marks, ceil(q.max_marks * v_pass_pct / 100.0));
  v_pass := p_new_marks >= v_pass_marks;
  v_grade := public.exam_grade(p_new_marks / q.max_marks * 100, v_pass);
  v_status := CASE WHEN v_pass THEN 'Pass' ELSE 'Fail' END;
  INSERT INTO public.exam_result_history (exam_id, student_id, subject, old_marks, new_marks, old_grade, new_grade, old_status, new_status, reason, changed_by)
  VALUES (q.exam_id, q.student_id, q.subject, r.marks_obtained, p_new_marks, r.grade, v_grade, r.result_status, v_status, 'Revaluation: ' || trim(p_note), v_uid);
  UPDATE public.exam_results SET marks_obtained = p_new_marks, grade = v_grade, result_status = v_status, remarks = CASE WHEN v_pass THEN 'Passed (revalued)' ELSE 'Failed (revalued)' END WHERE id = r.id;
  UPDATE public.exam_revaluation_requests SET status = 'Revised', revised_marks = p_new_marks, decision_note = trim(p_note), decided_by = v_uid, decided_at = now() WHERE id = p_id;
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values)
  VALUES (v_uid, v_role, 'result_revalued', 'exam_results', r.id::text, jsonb_build_object('subject', q.subject, 'from', r.marks_obtained, 'to', p_new_marks, 'note', p_note));
  RETURN jsonb_build_object('success', true, 'status', 'Revised', 'grade', v_grade, 'result', v_status);
END $$;

-- ---- supplementary --------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.exam_supplementary_create(p_parent UUID, p_name TEXT, p_start DATE, p_end DATE)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); pe public.exams; v_id UUID; v_n INT;
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('admin','principal','coe') THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only the Controller of Examinations, principal or admin can create a supplementary examination.'); END IF;
  SELECT * INTO pe FROM public.exams WHERE id = p_parent;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Parent examination not found.'); END IF;
  IF length(trim(COALESCE(p_name,''))) = 0 OR p_start IS NULL OR p_end IS NULL OR p_end < p_start THEN RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Give a name and a valid date range.'); END IF;
  SELECT count(DISTINCT student_id) INTO v_n FROM public.exam_results WHERE exam_id = p_parent AND result_status IN ('Fail','Absent');
  IF v_n = 0 THEN RETURN jsonb_build_object('success', false, 'code', 'NOBODY_ELIGIBLE', 'error', 'No student failed or was absent in the parent examination.'); END IF;
  INSERT INTO public.exams (name, term, academic_year, start_date, end_date, status, course, semester, exam_category, parent_exam_id, registration_required, registration_open)
  VALUES (trim(p_name), pe.term, pe.academic_year, p_start, p_end, 'Scheduled', pe.course, pe.semester, 'Supplementary', p_parent, TRUE, FALSE) RETURNING id INTO v_id;
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values) VALUES (v_uid, v_role, 'supplementary_created', 'exams', v_id::text, jsonb_build_object('parent', p_parent, 'eligible_students', v_n));
  RETURN jsonb_build_object('success', true, 'exam_id', v_id, 'eligible_students', v_n);
END $$;

-- one paper per (class, failed subject), one per day from the first date, copying marks/credits from the parent paper
CREATE OR REPLACE FUNCTION public.exam_supplementary_papers(p_exam UUID, p_first_date DATE, p_start TEXT, p_end TEXT, p_room TEXT DEFAULT 'TBA')
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role TEXT := public.get_current_user_role(); e public.exams; x RECORD; v_day INT := 0; v_n INT := 0;
BEGIN
  IF auth.uid() IS NULL OR v_role NOT IN ('admin','principal','coe') THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Not allowed.'); END IF;
  SELECT * INTO e FROM public.exams WHERE id = p_exam;
  IF NOT FOUND OR e.parent_exam_id IS NULL THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_SUPPLEMENTARY', 'error', 'This is not a supplementary examination.'); END IF;
  IF p_first_date IS NULL OR p_start IS NULL OR p_end IS NULL OR p_end <= p_start THEN RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Give the first date and valid start/end times.'); END IF;
  FOR x IN SELECT DISTINCT ON (r.class_name, r.subject) r.class_name, r.subject, r.subject_code,
                  (SELECT sc.max_marks FROM public.exam_schedules sc WHERE sc.exam_id = e.parent_exam_id AND sc.subject = r.subject LIMIT 1) AS max_marks,
                  (SELECT sc.passing_marks FROM public.exam_schedules sc WHERE sc.exam_id = e.parent_exam_id AND sc.subject = r.subject LIMIT 1) AS passing_marks,
                  (SELECT sc.credits FROM public.exam_schedules sc WHERE sc.exam_id = e.parent_exam_id AND sc.subject = r.subject LIMIT 1) AS credits
             FROM public.exam_results r WHERE r.exam_id = e.parent_exam_id AND r.result_status IN ('Fail','Absent') ORDER BY r.class_name, r.subject LOOP
    IF EXISTS (SELECT 1 FROM public.exam_schedules WHERE exam_id = p_exam AND subject = x.subject AND class_name = x.class_name) THEN CONTINUE; END IF;
    INSERT INTO public.exam_schedules (exam_id, subject, subject_code, class_name, exam_date, start_time, end_time, room, max_marks, passing_marks, credits)
    VALUES (p_exam, x.subject, x.subject_code, x.class_name, p_first_date + v_day, p_start, p_end, COALESCE(NULLIF(trim(p_room),''), 'TBA'), COALESCE(x.max_marks, 100), x.passing_marks, x.credits);
    v_day := v_day + 1; v_n := v_n + 1;
  END LOOP;
  RETURN jsonb_build_object('success', true, 'papers', v_n);
END $$;

-- registration: a supplementary exam accepts only students who failed or were absent in the parent
CREATE OR REPLACE FUNCTION public.exam_register(p_exam UUID, p_withdraw BOOLEAN DEFAULT FALSE)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid UUID := auth.uid(); e public.exams; pr public.profiles; v_fee BOOLEAN; v_dues BOOLEAN;
BEGIN
  IF v_uid IS NULL OR public.get_current_user_role() <> 'student' THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only students can register for an examination.'); END IF;
  SELECT * INTO e FROM public.exams WHERE id = p_exam;
  IF NOT FOUND OR NOT e.registration_required THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_REQUIRED', 'error', 'This examination does not use registration.'); END IF;
  IF NOT e.registration_open OR (e.registration_deadline IS NOT NULL AND e.registration_deadline < CURRENT_DATE) THEN
    RETURN jsonb_build_object('success', false, 'code', 'CLOSED', 'error', 'Registration for this examination is closed.'); END IF;
  SELECT * INTO pr FROM public.profiles WHERE id = v_uid;
  IF e.parent_exam_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exam_results WHERE exam_id = e.parent_exam_id AND student_id = v_uid AND result_status IN ('Fail','Absent')) THEN
      RETURN jsonb_build_object('success', false, 'code', 'NOT_ELIGIBLE', 'error', 'This supplementary examination is only for students who failed or were absent in the main examination.'); END IF;
  ELSIF NOT EXISTS (SELECT 1 FROM public.exam_schedules s WHERE s.exam_id = p_exam AND s.class_name = pr.class_name) THEN
    RETURN jsonb_build_object('success', false, 'code', 'NOT_ELIGIBLE', 'error', 'No paper of this examination is scheduled for your class.');
  END IF;
  IF p_withdraw THEN
    UPDATE public.exam_registrations SET status = 'Withdrawn' WHERE exam_id = p_exam AND student_id = v_uid;
    RETURN jsonb_build_object('success', true, 'status', 'Withdrawn');
  END IF;
  SELECT COALESCE(exam_requires_fee_clearance, FALSE) INTO v_fee FROM public.institutional_settings LIMIT 1;
  IF COALESCE(v_fee, FALSE) THEN
    SELECT EXISTS (SELECT 1 FROM public.student_fees f WHERE (f.student_id = v_uid OR f.student_record_id IN (SELECT st.id FROM public.students st WHERE st.user_id = v_uid))
                    AND f.total_due > 0 AND f.due_date < CURRENT_DATE AND f.status NOT IN ('cancelled','waived')) INTO v_dues;
    IF v_dues THEN RETURN jsonb_build_object('success', false, 'code', 'FEE_DUES', 'error', 'Clear your outstanding fees before registering.'); END IF;
  END IF;
  INSERT INTO public.exam_registrations (exam_id, student_id, status, registered_by) VALUES (p_exam, v_uid, 'Registered', v_uid)
  ON CONFLICT (exam_id, student_id) DO UPDATE SET status = 'Registered', registered_at = now();
  RETURN jsonb_build_object('success', true, 'status', 'Registered');
END $$;

REVOKE ALL ON FUNCTION public.exam_revaluation_set(UUID,BOOLEAN,DATE), public.exam_revaluation_request(UUID,TEXT,TEXT), public.exam_revaluation_decide(UUID,TEXT,NUMERIC,TEXT),
  public.exam_supplementary_create(UUID,TEXT,DATE,DATE), public.exam_supplementary_papers(UUID,DATE,TEXT,TEXT,TEXT), public.exam_register(UUID,BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.exam_revaluation_set(UUID,BOOLEAN,DATE), public.exam_revaluation_request(UUID,TEXT,TEXT), public.exam_revaluation_decide(UUID,TEXT,NUMERIC,TEXT),
  public.exam_supplementary_create(UUID,TEXT,DATE,DATE), public.exam_supplementary_papers(UUID,DATE,TEXT,TEXT,TEXT), public.exam_register(UUID,BOOLEAN) TO authenticated;
