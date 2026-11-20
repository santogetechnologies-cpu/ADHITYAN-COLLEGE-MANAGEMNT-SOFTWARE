-- 058: Assignments — a student cannot grade themselves; a teacher only manages their own assignments.
-- Before: the submission INSERT policy only checked student_id, so a student could submit with status 'graded' and any score;
-- any teacher could edit any teacher's assignments and grade any submission; grading had no range check and the screen said
-- "Graded" even when the update was rejected.
-- Idempotent. Depends on 001/002.

DELETE FROM public.assignment_submissions a USING public.assignment_submissions b
 WHERE a.assignment_id = b.assignment_id AND a.student_id = b.student_id AND a.submitted_at > b.submitted_at;
CREATE UNIQUE INDEX IF NOT EXISTS assignment_submission_one_per_student ON public.assignment_submissions (assignment_id, student_id) WHERE student_id IS NOT NULL;
DO $$ BEGIN ALTER TABLE public.assignment_submissions ADD CONSTRAINT assignment_score_range CHECK (score IS NULL OR (score >= 0 AND score <= 100)) NOT VALID; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- assignments: own for teachers; admin/principal all
DROP POLICY IF EXISTS "Teachers and admins can manage assignments" ON public.assignments;
DROP POLICY IF EXISTS assignments_manage ON public.assignments;
CREATE POLICY assignments_manage ON public.assignments FOR ALL TO authenticated
  USING (public.get_current_user_role() IN ('admin','principal') OR (public.get_current_user_role() = 'teacher' AND teacher_id = auth.uid()))
  WITH CHECK (public.get_current_user_role() IN ('admin','principal') OR (public.get_current_user_role() = 'teacher' AND teacher_id = auth.uid()));

-- submissions
DROP POLICY IF EXISTS "Students can view own submissions and teachers can view all" ON public.assignment_submissions;
DROP POLICY IF EXISTS "Students can view own submissions and teachers can view all" ON public.assignment_submissions;
DROP POLICY IF EXISTS "Students can submit assignments" ON public.assignment_submissions;
DROP POLICY IF EXISTS "Teachers can grade assignments" ON public.assignment_submissions;
DROP POLICY IF EXISTS submissions_select ON public.assignment_submissions;
DROP POLICY IF EXISTS submissions_insert ON public.assignment_submissions;
DROP POLICY IF EXISTS submissions_update ON public.assignment_submissions;
CREATE POLICY submissions_select ON public.assignment_submissions FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR public.is_parent_of(student_id) OR public.get_current_user_role() IN ('admin','principal')
         OR (public.get_current_user_role() = 'teacher' AND EXISTS (SELECT 1 FROM public.assignments a WHERE a.id = assignment_id AND a.teacher_id = auth.uid())));
CREATE POLICY submissions_insert ON public.assignment_submissions FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid() AND public.get_current_user_role() = 'student');
CREATE POLICY submissions_update ON public.assignment_submissions FOR UPDATE TO authenticated
  USING (student_id = auth.uid() AND status IN ('submitted','late','pending'))
  WITH CHECK (student_id = auth.uid());
REVOKE DELETE ON public.assignment_submissions FROM authenticated, anon;

CREATE OR REPLACE FUNCTION public.assignment_submission_guard() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE a public.assignments; pr public.profiles;
BEGIN
  IF current_setting('app.grading', true) = 'on' THEN RETURN NEW; END IF;   -- set only inside assignment_grade
  SELECT * INTO a FROM public.assignments WHERE id = NEW.assignment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Assignment not found' USING ERRCODE = 'foreign_key_violation'; END IF;
  IF TG_OP = 'INSERT' THEN
    SELECT * INTO pr FROM public.profiles WHERE id = NEW.student_id;
    IF a.classes IS NOT NULL AND cardinality(a.classes) > 0 AND NOT (pr.class_name = ANY (a.classes)) THEN
      RAISE EXCEPTION 'This assignment is not set for your class' USING ERRCODE = 'insufficient_privilege'; END IF;
    NEW.student_name := COALESCE(pr.name, NEW.student_name); NEW.subject := a.subject;
    NEW.submitted_at := now(); NEW.status := CASE WHEN now() > a.due_date THEN 'late' ELSE 'submitted' END;
    NEW.score := NULL; NEW.feedback := NULL;
  ELSE
    NEW.assignment_id := OLD.assignment_id; NEW.student_id := OLD.student_id; NEW.student_name := OLD.student_name; NEW.subject := OLD.subject;
    NEW.score := OLD.score; NEW.feedback := OLD.feedback;
    NEW.submitted_at := now(); NEW.status := CASE WHEN now() > a.due_date THEN 'late' ELSE 'submitted' END;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS assignment_submission_guard ON public.assignment_submissions;
CREATE TRIGGER assignment_submission_guard BEFORE INSERT OR UPDATE ON public.assignment_submissions FOR EACH ROW EXECUTE FUNCTION public.assignment_submission_guard();

CREATE OR REPLACE FUNCTION public.assignment_grade(p_submission UUID, p_score NUMERIC, p_feedback TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); sub public.assignment_submissions; a public.assignments;
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('teacher','admin','principal') THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only the teacher who set the work can grade it.'); END IF;
  IF p_score IS NULL OR p_score < 0 OR p_score > 100 THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Score must be between 0 and 100.'); END IF;
  SELECT * INTO sub FROM public.assignment_submissions WHERE id = p_submission FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Submission not found.'); END IF;
  SELECT * INTO a FROM public.assignments WHERE id = sub.assignment_id;
  IF v_role = 'teacher' AND a.teacher_id IS DISTINCT FROM v_uid THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'This assignment belongs to another teacher.'); END IF;
  PERFORM set_config('app.grading', 'on', true);
  UPDATE public.assignment_submissions SET score = p_score, feedback = NULLIF(trim(COALESCE(p_feedback,'')), ''), status = 'graded' WHERE id = p_submission;
  PERFORM set_config('app.grading', 'off', true);
  RETURN jsonb_build_object('success', true);
END $$;
REVOKE ALL ON FUNCTION public.assignment_grade(UUID,NUMERIC,TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assignment_grade(UUID,NUMERIC,TEXT) TO authenticated;
