-- 064: Configurable grade scale, credits, SGPA / CGPA.
-- Before: grade bands were hard-coded in exam_grade(), there were no credits and no grade points, so no semester or cumulative
-- GPA could be computed (placement CGPA was typed in by the student).
-- Now: the institution defines its scale (bands → grade, grade points, pass/fail); papers carry credits; the server computes SGPA per
-- examination and CGPA across all PUBLISHED results (latest published attempt per subject counts).
-- Idempotent. Depends on 045.

CREATE TABLE IF NOT EXISTS public.grade_scales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  max_points NUMERIC(4,1) NOT NULL DEFAULT 10 CHECK (max_points > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS grade_scales_one_default ON public.grade_scales (is_default) WHERE is_default;
CREATE TABLE IF NOT EXISTS public.grade_scale_bands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scale_id UUID NOT NULL REFERENCES public.grade_scales(id) ON DELETE CASCADE,
  min_pct NUMERIC(5,2) NOT NULL CHECK (min_pct >= 0 AND min_pct <= 100),
  grade TEXT NOT NULL,
  grade_point NUMERIC(4,2) NOT NULL CHECK (grade_point >= 0),
  UNIQUE (scale_id, min_pct), UNIQUE (scale_id, grade)
);
ALTER TABLE public.grade_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_scale_bands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS grade_scales_read ON public.grade_scales;
DROP POLICY IF EXISTS grade_bands_read ON public.grade_scale_bands;
CREATE POLICY grade_scales_read ON public.grade_scales FOR SELECT TO authenticated USING (true);
CREATE POLICY grade_bands_read ON public.grade_scale_bands FOR SELECT TO authenticated USING (true);
REVOKE INSERT, UPDATE, DELETE ON public.grade_scales, public.grade_scale_bands FROM authenticated, anon;

-- the default 10-point scale, matching the bands that were hard-coded before (A+ 90, A 80, B+ 70, B 60, C 50, D below) plus F
INSERT INTO public.grade_scales (name, is_default, max_points) VALUES ('Default 10-point scale', TRUE, 10) ON CONFLICT (name) DO NOTHING;
INSERT INTO public.grade_scale_bands (scale_id, min_pct, grade, grade_point)
SELECT s.id, b.min_pct, b.grade, b.gp FROM public.grade_scales s,
  (VALUES (90,'A+',10),(80,'A',9),(70,'B+',8),(60,'B',7),(50,'C',6),(0,'D',5)) AS b(min_pct, grade, gp)
WHERE s.is_default ON CONFLICT DO NOTHING;

ALTER TABLE public.exam_schedules ADD COLUMN IF NOT EXISTS credits NUMERIC(4,1) CHECK (credits IS NULL OR credits > 0);

-- grade for a percentage using the default scale; failing papers are 'F'
CREATE OR REPLACE FUNCTION public.exam_grade(p_pct NUMERIC, p_pass BOOLEAN)
RETURNS TEXT LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
  SELECT CASE WHEN NOT p_pass THEN 'F'
    ELSE COALESCE((SELECT b.grade FROM public.grade_scale_bands b JOIN public.grade_scales s ON s.id = b.scale_id
                    WHERE s.is_default AND b.min_pct <= p_pct ORDER BY b.min_pct DESC LIMIT 1), 'P') END
$$;

CREATE OR REPLACE FUNCTION public.grade_point_for(p_pct NUMERIC, p_pass BOOLEAN)
RETURNS NUMERIC LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
  SELECT CASE WHEN NOT p_pass THEN 0
    ELSE COALESCE((SELECT b.grade_point FROM public.grade_scale_bands b JOIN public.grade_scales s ON s.id = b.scale_id
                    WHERE s.is_default AND b.min_pct <= p_pct ORDER BY b.min_pct DESC LIMIT 1), 0) END
$$;

-- admin/principal/COE replace the whole default scale in one call: p_bands = [{min_pct, grade, grade_point}], must contain a 0% band
CREATE OR REPLACE FUNCTION public.grade_scale_save(p_bands JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); v_scale UUID; b JSONB; v_n INT := 0; v_zero BOOLEAN := FALSE;
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('admin','principal','coe') THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only the Controller of Examinations, principal or admin can change the grade scale.'); END IF;
  IF p_bands IS NULL OR jsonb_typeof(p_bands) <> 'array' OR jsonb_array_length(p_bands) < 2 THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Provide at least two grade bands.'); END IF;
  FOR b IN SELECT * FROM jsonb_array_elements(p_bands) LOOP
    IF (b->>'min_pct') IS NULL OR (b->>'min_pct')::numeric < 0 OR (b->>'min_pct')::numeric > 100 OR length(trim(COALESCE(b->>'grade',''))) = 0
       OR (b->>'grade_point') IS NULL OR (b->>'grade_point')::numeric < 0 THEN
      RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Each band needs a minimum % (0–100), a grade and non-negative grade points.'); END IF;
    IF (b->>'min_pct')::numeric = 0 THEN v_zero := TRUE; END IF;
  END LOOP;
  IF NOT v_zero THEN RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'A band starting at 0% is required so every mark has a grade.'); END IF;
  IF (SELECT count(DISTINCT (x->>'min_pct')::numeric) FROM jsonb_array_elements(p_bands) x) <> jsonb_array_length(p_bands)
     OR (SELECT count(DISTINCT lower(trim(x->>'grade'))) FROM jsonb_array_elements(p_bands) x) <> jsonb_array_length(p_bands) THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Minimum percentages and grade names must be unique.'); END IF;
  SELECT id INTO v_scale FROM public.grade_scales WHERE is_default;
  IF v_scale IS NULL THEN INSERT INTO public.grade_scales (name, is_default) VALUES ('Default 10-point scale', TRUE) RETURNING id INTO v_scale; END IF;
  DELETE FROM public.grade_scale_bands WHERE scale_id = v_scale;
  FOR b IN SELECT * FROM jsonb_array_elements(p_bands) LOOP
    INSERT INTO public.grade_scale_bands (scale_id, min_pct, grade, grade_point) VALUES (v_scale, (b->>'min_pct')::numeric, trim(b->>'grade'), (b->>'grade_point')::numeric);
    v_n := v_n + 1;
  END LOOP;
  UPDATE public.grade_scales SET max_points = (SELECT max(grade_point) FROM public.grade_scale_bands WHERE scale_id = v_scale) WHERE id = v_scale;
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values) VALUES (v_uid, v_role, 'grade_scale_changed', 'grade_scales', v_scale::text, p_bands);
  RETURN jsonb_build_object('success', true, 'bands', v_n);
END $$;

-- SGPA per examination + CGPA over published results. Students/parents see published results only; staff see all.
-- Latest attempt per subject counts (a supplementary pass replaces an earlier fail). Credits default to 1 when a paper has none.
CREATE OR REPLACE FUNCTION public.student_gpa(p_student UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); v_staff BOOLEAN; v_out JSONB;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Sign in first.'); END IF;
  v_staff := v_role IN ('admin','principal','coe','hod','teacher','placement_officer');
  IF NOT v_staff AND NOT (p_student = v_uid OR public.is_parent_of(p_student)) THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Not allowed.'); END IF;
  WITH latest AS (
    SELECT DISTINCT ON (r.subject) r.exam_id, e.name AS exam_name, r.subject,
           COALESCE((SELECT sc.credits FROM public.exam_schedules sc WHERE sc.exam_id = r.exam_id AND sc.subject = r.subject AND sc.credits IS NOT NULL LIMIT 1), 1) AS credits,
           public.grade_point_for(CASE WHEN r.max_marks > 0 THEN r.marks_obtained / r.max_marks * 100 ELSE 0 END, r.result_status = 'Pass') AS gp,
           (r.result_status = 'Pass') AS passed
      FROM public.exam_results r JOIN public.exams e ON e.id = r.exam_id
     WHERE r.student_id = p_student AND COALESCE(r.result_status,'') <> 'Absent' AND (r.is_published OR v_staff)
     ORDER BY r.subject, e.end_date DESC NULLS LAST, r.created_at DESC
  ), terms AS (
    SELECT exam_id, exam_name, sum(credits) AS cr, round(sum(gp * credits) / NULLIF(sum(credits), 0), 2) AS sgpa FROM latest GROUP BY exam_id, exam_name
  )
  SELECT jsonb_build_object('success', true,
           'cgpa', (SELECT round(sum(gp * credits) / NULLIF(sum(credits), 0), 2) FROM latest),
           'credits', COALESCE((SELECT sum(credits) FROM latest), 0),
           'arrears', (SELECT count(*) FROM latest WHERE NOT passed),
           'terms', COALESCE((SELECT jsonb_agg(jsonb_build_object('exam_id', exam_id, 'exam', exam_name, 'credits', cr, 'sgpa', sgpa) ORDER BY exam_name) FROM terms), '[]'::jsonb),
           'scale_max', (SELECT max_points FROM public.grade_scales WHERE is_default))
    INTO v_out;
  RETURN v_out;
END $$;

-- class report for one examination (staff)
CREATE OR REPLACE FUNCTION public.exam_gpa_report(p_exam UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_rows JSONB;
BEGIN
  IF auth.uid() IS NULL OR v_role NOT IN ('admin','principal','coe','hod') THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Not allowed.'); END IF;
  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'student'), '[]'::jsonb) INTO v_rows FROM (
    SELECT jsonb_build_object('student_id', r.student_id, 'student', r.student_name, 'class', r.class_name,
             'subjects', count(*), 'failed', count(*) FILTER (WHERE r.result_status = 'Fail'),
             'sgpa', round(sum(public.grade_point_for(CASE WHEN r.max_marks > 0 THEN r.marks_obtained / r.max_marks * 100 ELSE 0 END, r.result_status = 'Pass')
                         * COALESCE(sc.credits, 1)) / NULLIF(sum(COALESCE(sc.credits, 1)), 0), 2)) AS x
      FROM public.exam_results r
      LEFT JOIN LATERAL (SELECT s.credits FROM public.exam_schedules s WHERE s.exam_id = r.exam_id AND s.subject = r.subject AND s.credits IS NOT NULL LIMIT 1) sc ON TRUE
     WHERE r.exam_id = p_exam AND COALESCE(r.result_status,'') <> 'Absent'
     GROUP BY r.student_id, r.student_name, r.class_name) q;
  RETURN jsonb_build_object('success', true, 'rows', v_rows);
END $$;

REVOKE ALL ON FUNCTION public.grade_scale_save(JSONB), public.student_gpa(UUID), public.exam_gpa_report(UUID), public.grade_point_for(NUMERIC, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grade_scale_save(JSONB), public.student_gpa(UUID), public.exam_gpa_report(UUID), public.grade_point_for(NUMERIC, BOOLEAN) TO authenticated;

-- placement: verified CGPA from results when the student has any published credits; otherwise self-declared (flagged)
ALTER TABLE public.placement_applications ADD COLUMN IF NOT EXISTS cgpa_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- placement application uses the computed CGPA when the student has published results; self-declared otherwise (flagged for the officer)
CREATE OR REPLACE FUNCTION public.placement_apply(p_drive UUID, p_cgpa NUMERIC)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid UUID := auth.uid(); d public.placement_drives; pr public.profiles; s public.students; v_dept TEXT; v_roll TEXT; v_name TEXT; v_id UUID;
        g JSONB; v_cgpa NUMERIC; v_verified BOOLEAN := FALSE;
BEGIN
  IF v_uid IS NULL OR public.get_current_user_role() <> 'student' THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only students can apply.'); END IF;
  SELECT * INTO d FROM public.placement_drives WHERE id = p_drive;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Drive not found.'); END IF;
  IF d.status <> 'Open' OR d.application_deadline < CURRENT_DATE THEN
    RETURN jsonb_build_object('success', false, 'code', 'CLOSED', 'error', 'Applications for this drive are closed.'); END IF;
  g := public.student_gpa(v_uid);
  IF COALESCE((g->>'credits')::numeric, 0) > 0 AND (g->>'cgpa') IS NOT NULL THEN
    v_cgpa := (g->>'cgpa')::numeric; v_verified := TRUE;               -- computed from published results; the typed value is ignored
  ELSE
    IF p_cgpa IS NULL OR p_cgpa < 0 OR p_cgpa > 10 THEN
      RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'No published results yet — enter your CGPA (0 to 10); the placement cell will verify it.'); END IF;
    v_cgpa := p_cgpa;
  END IF;
  SELECT * INTO pr FROM public.profiles WHERE id = v_uid;
  SELECT * INTO s FROM public.students WHERE user_id = v_uid LIMIT 1;
  v_dept := COALESCE(s.department, pr.department); v_name := COALESCE(s.name, pr.name); v_roll := COALESCE(s.roll_number, s.student_id, pr.roll_number, pr.student_id);
  IF v_dept IS NULL OR v_roll IS NULL THEN RETURN jsonb_build_object('success', false, 'code', 'PROFILE_INCOMPLETE', 'error', 'Your department or student ID is missing from your record. Contact the office.'); END IF;
  IF d.eligible_departments IS NOT NULL AND array_length(d.eligible_departments, 1) > 0
     AND NOT EXISTS (SELECT 1 FROM unnest(d.eligible_departments) e WHERE lower(trim(e)) = lower(trim(v_dept))) THEN
    RETURN jsonb_build_object('success', false, 'code', 'NOT_ELIGIBLE', 'error', 'This drive is not open to your department.'); END IF;
  IF d.min_cgpa IS NOT NULL AND v_cgpa < d.min_cgpa THEN
    RETURN jsonb_build_object('success', false, 'code', 'NOT_ELIGIBLE', 'error', 'This drive requires a CGPA of at least ' || d.min_cgpa || (CASE WHEN v_verified THEN ' (yours is ' || v_cgpa || ').' ELSE '.' END)); END IF;
  IF d.max_backlogs IS NOT NULL AND v_verified AND COALESCE((g->>'arrears')::int, 0) > d.max_backlogs THEN
    RETURN jsonb_build_object('success', false, 'code', 'NOT_ELIGIBLE', 'error', 'This drive allows at most ' || d.max_backlogs || ' arrear(s).'); END IF;
  IF EXISTS (SELECT 1 FROM public.placement_applications WHERE drive_id = p_drive AND student_id = v_uid) THEN
    RETURN jsonb_build_object('success', false, 'code', 'ALREADY_APPLIED', 'error', 'You have already applied to this drive.'); END IF;
  INSERT INTO public.placement_applications (drive_id, student_id, student_name, roll_number, department, cgpa, status, cgpa_verified)
  VALUES (p_drive, v_uid, v_name, v_roll, v_dept, v_cgpa, 'Applied', v_verified) RETURNING id INTO v_id;
  RETURN jsonb_build_object('success', true, 'id', v_id, 'cgpa', v_cgpa, 'verified', v_verified);
END $$;
REVOKE ALL ON FUNCTION public.placement_apply(UUID, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.placement_apply(UUID, NUMERIC) TO authenticated;
