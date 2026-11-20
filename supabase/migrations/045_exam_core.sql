-- =============================================================================
-- Migration 045: Examination core - access rules, marks entry, publishing, analytics
--
-- SECURITY (found in the module scan):
--   exam_results had several overlapping PERMISSIVE policies (RLS ORs them), so the strict policy that
--   requires is_published was bypassed: a student or parent could read their UNPUBLISHED marks, and any
--   teacher could edit ANY result (policy "Staff can manage exam results" = teacher ALL).
--   The same legacy policies on exams ("Authenticated can view exams" = true) and exam_schedules
--   (visible to the class regardless of timetable_published) leaked unpublished exams/timetables.
--   -> legacy policies are dropped. Teachers/HODs may enter marks only for classes they are assigned to,
--      and only while the result is unpublished; corrections after publication need admin/principal/COE.
-- DATA INTEGRITY:
--   * one result per (exam, student, subject): unique index (duplicates are merged first, newest kept)
--   * exam_save_marks(): validates every row first, then writes ALL or NOTHING; fills student name/class,
--     max marks (from the schedule), pass/fail and grade from the configured pass percentage
--   * exam_publish_results(): publish / withdraw (reason mandatory) - sets the flags students' access depends on
--   * exam_analytics(): pass %, averages, per-subject and top performers from real results (RLS applies)
-- Idempotent. Run after 044.
-- =============================================================================
BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Drop the legacy permissive policies that bypass the strict ones
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Students can view own results and staff can view all" ON public.exam_results;
DROP POLICY IF EXISTS "Staff can manage exam results" ON public.exam_results;
DROP POLICY IF EXISTS "Students and parents view exam results" ON public.exam_results;
DROP POLICY IF EXISTS "Authenticated can view exams" ON public.exams;
DROP POLICY IF EXISTS "Staff can manage exams" ON public.exams;
DROP POLICY IF EXISTS "Staff can manage exam schedules" ON public.exam_schedules;
DROP POLICY IF EXISTS "Students can view class exam schedules" ON public.exam_schedules;

-- Students may see an exam once ANY part of it has been published (timetable, hall tickets or results);
-- the old strict policy required is_published, which hid the exam from students whose timetable was published.
DROP POLICY IF EXISTS exams_select ON public.exams;
CREATE POLICY exams_select ON public.exams FOR SELECT TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'coe', 'teacher', 'hod')
           OR COALESCE(is_published, FALSE) OR COALESCE(timetable_published, FALSE)
           OR COALESCE(hall_ticket_published, FALSE) OR COALESCE(results_published, FALSE));

-- ---------------------------------------------------------------------------
-- 2. Teachers / HODs: marks entry for their own classes, unpublished results only
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS exam_results_teacher_insert ON public.exam_results;
CREATE POLICY exam_results_teacher_insert ON public.exam_results FOR INSERT TO authenticated
    WITH CHECK (public.get_current_user_role() IN ('teacher', 'hod')
                AND COALESCE(is_published, FALSE) = FALSE
                AND public.is_teacher_assigned_to_class(auth.uid(), class_name));
DROP POLICY IF EXISTS exam_results_teacher_update ON public.exam_results;
CREATE POLICY exam_results_teacher_update ON public.exam_results FOR UPDATE TO authenticated
    USING (public.get_current_user_role() IN ('teacher', 'hod') AND COALESCE(is_published, FALSE) = FALSE
           AND public.is_teacher_assigned_to_class(auth.uid(), class_name))
    WITH CHECK (public.get_current_user_role() IN ('teacher', 'hod') AND COALESCE(is_published, FALSE) = FALSE
                AND public.is_teacher_assigned_to_class(auth.uid(), class_name));

-- ---------------------------------------------------------------------------
-- 3. One result per exam + student + subject
-- ---------------------------------------------------------------------------
DELETE FROM public.exam_results a
 USING public.exam_results b
 WHERE a.exam_id = b.exam_id AND a.student_id IS NOT DISTINCT FROM b.student_id AND a.subject = b.subject
   AND a.student_id IS NOT NULL
   AND (a.created_at < b.created_at OR (a.created_at = b.created_at AND a.id < b.id));
CREATE UNIQUE INDEX IF NOT EXISTS uq_exam_results_exam_student_subject
    ON public.exam_results (exam_id, student_id, subject) WHERE student_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exam_results_exam ON public.exam_results (exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_schedules_exam ON public.exam_schedules (exam_id);

-- ---------------------------------------------------------------------------
-- 4. Grade bands (single place). pct = marks / max * 100
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.exam_grade(p_pct NUMERIC, p_pass BOOLEAN)
RETURNS TEXT LANGUAGE sql IMMUTABLE SET search_path = public, pg_temp AS $$
    SELECT CASE WHEN NOT p_pass THEN 'F'
                WHEN p_pct >= 90 THEN 'A+' WHEN p_pct >= 80 THEN 'A' WHEN p_pct >= 70 THEN 'B+'
                WHEN p_pct >= 60 THEN 'B'  WHEN p_pct >= 50 THEN 'C' ELSE 'D' END
$$;

-- ---------------------------------------------------------------------------
-- 5. exam_save_marks: p_rows = [{student_id, subject, marks, max_marks?, absent?}]
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.exam_save_marks(p_exam_id UUID, p_rows JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid();
    v_exam public.exams%ROWTYPE; r JSONB; v_prof public.profiles%ROWTYPE; v_sched public.exam_schedules%ROWTYPE;
    v_errors JSONB := '[]'::jsonb; v_n INT := 0; v_pass_pct NUMERIC; v_marks NUMERIC; v_max NUMERIC; v_pass_marks NUMERIC;
    v_absent BOOLEAN; v_pass BOOLEAN; v_sid UUID; v_subject TEXT; v_published BOOLEAN; v_old NUMERIC; v_idx INT := 0;
    v_changed JSONB := '[]'::jsonb;
BEGIN
    IF v_uid IS NULL OR v_role NOT IN ('admin', 'principal', 'coe', 'teacher', 'hod') THEN
        RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'You are not allowed to enter marks.');
    END IF;
    IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' OR jsonb_array_length(p_rows) = 0 OR jsonb_array_length(p_rows) > 1000 THEN
        RETURN jsonb_build_object('success', false, 'code', 'VALIDATION_ERROR', 'error', 'Send between 1 and 1000 rows.');
    END IF;
    SELECT * INTO v_exam FROM public.exams WHERE id = p_exam_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Examination not found.'); END IF;
    SELECT COALESCE(passing_marks_percentage, 40) INTO v_pass_pct FROM public.institutional_settings LIMIT 1;
    v_pass_pct := COALESCE(v_pass_pct, 40);

    -- pass 1: validate everything, write nothing
    FOR r IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
        v_idx := v_idx + 1;
        BEGIN v_sid := (r->>'student_id')::uuid; EXCEPTION WHEN others THEN v_sid := NULL; END;
        v_subject := NULLIF(trim(r->>'subject'), '');
        IF v_sid IS NULL OR v_subject IS NULL THEN
            v_errors := v_errors || jsonb_build_object('row', v_idx, 'error', 'student_id and subject are required.'); CONTINUE;
        END IF;
        SELECT * INTO v_prof FROM public.profiles WHERE id = v_sid AND role = 'student' AND COALESCE(status, 'active') = 'active';
        IF NOT FOUND THEN
            v_errors := v_errors || jsonb_build_object('row', v_idx, 'error', 'Student not found or not active.'); CONTINUE;
        END IF;
        IF v_role IN ('teacher', 'hod') AND NOT public.is_teacher_assigned_to_class(v_uid, v_prof.class_name) THEN
            v_errors := v_errors || jsonb_build_object('row', v_idx, 'student', v_prof.name, 'error', format('You are not assigned to class %s.', v_prof.class_name)); CONTINUE;
        END IF;
        SELECT is_published INTO v_published FROM public.exam_results WHERE exam_id = p_exam_id AND student_id = v_sid AND subject = v_subject;
        IF COALESCE(v_published, FALSE) AND v_role IN ('teacher', 'hod') THEN
            v_errors := v_errors || jsonb_build_object('row', v_idx, 'student', v_prof.name, 'error', 'Published marks can only be corrected by the Controller of Examinations, principal or admin.'); CONTINUE;
        END IF;
        v_absent := COALESCE((r->>'absent')::boolean, FALSE);
        IF NOT v_absent THEN
            IF r->>'marks' IS NULL OR r->>'marks' !~ '^\d+(\.\d+)?$' THEN
                v_errors := v_errors || jsonb_build_object('row', v_idx, 'student', v_prof.name, 'error', 'Marks must be a number of 0 or more.'); CONTINUE;
            END IF;
            SELECT * INTO v_sched FROM public.exam_schedules WHERE exam_id = p_exam_id AND subject = v_subject AND (class_name = v_prof.class_name OR class_name IS NULL) ORDER BY class_name NULLS LAST LIMIT 1;
            v_max := COALESCE(NULLIF(r->>'max_marks','')::numeric, v_sched.max_marks, 100);
            IF v_max <= 0 OR (r->>'marks')::numeric > v_max THEN
                v_errors := v_errors || jsonb_build_object('row', v_idx, 'student', v_prof.name, 'error', format('Marks cannot exceed the maximum (%s).', v_max)); CONTINUE;
            END IF;
        END IF;
    END LOOP;
    IF jsonb_array_length(v_errors) > 0 THEN
        RETURN jsonb_build_object('success', false, 'code', 'VALIDATION_ERROR', 'error', 'No marks were saved. Fix the listed rows and save again.', 'errors', v_errors);
    END IF;

    -- pass 2: write everything (all or nothing)
    FOR r IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
        v_sid := (r->>'student_id')::uuid; v_subject := trim(r->>'subject');
        SELECT * INTO v_prof FROM public.profiles WHERE id = v_sid;
        v_absent := COALESCE((r->>'absent')::boolean, FALSE);
        SELECT * INTO v_sched FROM public.exam_schedules WHERE exam_id = p_exam_id AND subject = v_subject AND (class_name = v_prof.class_name OR class_name IS NULL) ORDER BY class_name NULLS LAST LIMIT 1;
        v_max := COALESCE(NULLIF(r->>'max_marks','')::numeric, v_sched.max_marks, 100);
        v_marks := CASE WHEN v_absent THEN 0 ELSE (r->>'marks')::numeric END;
        v_pass_marks := COALESCE(v_sched.passing_marks, ceil(v_max * v_pass_pct / 100.0));
        v_pass := NOT v_absent AND v_marks >= v_pass_marks;
        SELECT marks_obtained INTO v_old FROM public.exam_results WHERE exam_id = p_exam_id AND student_id = v_sid AND subject = v_subject;
        INSERT INTO public.exam_results AS er (exam_id, student_id, student_name, class_name, subject, subject_code, marks_obtained, max_marks, grade, result_status, remarks, is_published)
        VALUES (p_exam_id, v_sid, v_prof.name, COALESCE(v_prof.class_name, '—'), v_subject, v_sched.subject_code, v_marks, v_max,
                CASE WHEN v_absent THEN 'AB' ELSE public.exam_grade(v_marks / v_max * 100, v_pass) END,
                CASE WHEN v_absent THEN 'Absent' WHEN v_pass THEN 'Pass' ELSE 'Fail' END,
                CASE WHEN v_absent THEN 'Absent' WHEN v_pass THEN 'Passed' ELSE 'Failed' END, FALSE)
        ON CONFLICT (exam_id, student_id, subject) WHERE student_id IS NOT NULL DO UPDATE
            SET marks_obtained = EXCLUDED.marks_obtained, max_marks = EXCLUDED.max_marks, grade = EXCLUDED.grade,
                result_status = EXCLUDED.result_status, remarks = EXCLUDED.remarks, subject_code = COALESCE(EXCLUDED.subject_code, er.subject_code);
        v_n := v_n + 1;
        IF v_old IS NOT NULL AND v_old IS DISTINCT FROM v_marks THEN
            v_changed := v_changed || jsonb_build_object('student', v_prof.name, 'subject', v_subject, 'from', v_old, 'to', v_marks);
        END IF;
    END LOOP;
    INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values)
    VALUES (v_uid, v_role, 'exam_marks_saved', 'exams', p_exam_id::text,
            jsonb_build_object('rows', v_n, 'changed_existing', v_changed));
    RETURN jsonb_build_object('success', true, 'saved', v_n, 'changed_existing', jsonb_array_length(v_changed));
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. exam_publish_results: publish or withdraw
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.exam_publish_results(p_exam_id UUID, p_publish BOOLEAN, p_reason TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); v_n INT; v_students INT;
BEGIN
    IF v_uid IS NULL OR v_role NOT IN ('admin', 'principal', 'coe') THEN
        RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only the Controller of Examinations, principal or admin can publish results.');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exams WHERE id = p_exam_id) THEN
        RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Examination not found.');
    END IF;
    SELECT count(*), count(DISTINCT student_id) INTO v_n, v_students FROM public.exam_results WHERE exam_id = p_exam_id;
    IF p_publish THEN
        IF v_n = 0 THEN
            RETURN jsonb_build_object('success', false, 'code', 'NO_RESULTS', 'error', 'There are no marks to publish for this examination.');
        END IF;
        UPDATE public.exam_results SET is_published = TRUE, published_at = NOW() WHERE exam_id = p_exam_id;
        UPDATE public.exams SET results_published = TRUE, is_published = TRUE, status = 'Results Published' WHERE id = p_exam_id;
    ELSE
        IF length(trim(COALESCE(p_reason, ''))) < 3 THEN
            RETURN jsonb_build_object('success', false, 'code', 'REASON_REQUIRED', 'error', 'A reason is required to withdraw published results.');
        END IF;
        UPDATE public.exam_results SET is_published = FALSE, published_at = NULL WHERE exam_id = p_exam_id;
        UPDATE public.exams SET results_published = FALSE, status = 'Completed' WHERE id = p_exam_id;
    END IF;
    INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values)
    VALUES (v_uid, v_role, CASE WHEN p_publish THEN 'exam_results_published' ELSE 'exam_results_withdrawn' END, 'exams', p_exam_id::text,
            jsonb_build_object('results', v_n, 'students', v_students, 'reason', p_reason));
    RETURN jsonb_build_object('success', true, 'published', p_publish, 'results', v_n, 'students', v_students);
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. exam_analytics (SECURITY INVOKER: a teacher only sees the classes the RLS lets them see)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.exam_analytics(p_exam_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE sql STABLE SET search_path = public, pg_temp
AS $$
    WITH r AS (
        SELECT * FROM public.exam_results WHERE (p_exam_id IS NULL OR exam_id = p_exam_id)
    ), appeared AS (SELECT * FROM r WHERE COALESCE(result_status, '') <> 'Absent')
    SELECT jsonb_build_object(
        'total_results', (SELECT count(*) FROM r),
        'appeared', (SELECT count(*) FROM appeared),
        'absent', (SELECT count(*) FROM r) - (SELECT count(*) FROM appeared),
        'passed', (SELECT count(*) FROM appeared WHERE result_status = 'Pass'),
        'pass_percentage', COALESCE((SELECT round(100.0 * count(*) FILTER (WHERE result_status = 'Pass') / NULLIF(count(*), 0)) FROM appeared), 0),
        'average_percentage', COALESCE((SELECT round(avg(marks_obtained / NULLIF(max_marks, 0) * 100)) FROM appeared), 0),
        'by_subject', COALESCE((SELECT jsonb_agg(jsonb_build_object('subject', subject, 'appeared', n, 'pass_percentage', pp, 'average_percentage', ap) ORDER BY subject)
            FROM (SELECT subject, count(*) n, round(100.0 * count(*) FILTER (WHERE result_status = 'Pass') / NULLIF(count(*), 0)) pp,
                         round(avg(marks_obtained / NULLIF(max_marks, 0) * 100)) ap FROM appeared GROUP BY subject) s), '[]'::jsonb),
        'top', COALESCE((SELECT jsonb_agg(jsonb_build_object('student_name', student_name, 'class_name', class_name, 'subject', subject,
                  'marks', marks_obtained, 'max', max_marks, 'grade', grade) )
            FROM (SELECT * FROM appeared ORDER BY marks_obtained / NULLIF(max_marks, 0) DESC NULLS LAST LIMIT 5) t), '[]'::jsonb)
    )
$$;

REVOKE ALL ON FUNCTION public.exam_save_marks(UUID, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.exam_publish_results(UUID, BOOLEAN, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.exam_analytics(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.exam_save_marks(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.exam_publish_results(UUID, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.exam_analytics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.exam_grade(NUMERIC, BOOLEAN) TO authenticated;

COMMIT;
