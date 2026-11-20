-- =============================================================================
-- Migration 039: Entrance tests and merit ranking on top of applications.
-- Before: the Entrance Test screen sent columns the table does not have (could never save, error
-- swallowed); the Merit List was hand-typed names with no link to applications, seats or formula.
-- Now (all SECURITY DEFINER, service_role only; the edge function authorises admin/principal/receptionist):
--   admission_schedule_tests   - schedule/reschedule tests for chosen applications (one record per applicant)
--   admission_record_test_result - record a score or absence
--   admission_publish_merit    - rank a course server-side from qualifying marks and entrance score
--                                (weights and seats are inputs), replacing that course's published list
--   admission_apply_merit      - move applications to Approved / Waitlisted according to the list,
--                                through admission_set_status (so document gates + audit apply)
-- Scores are treated as percentages: qualifying_marks 0-100; entrance score is converted with max_score.
-- Idempotent. Run after 038.
-- =============================================================================
BEGIN;

ALTER TABLE public.admission_entrance_tests
    ADD COLUMN IF NOT EXISTS max_score NUMERIC(7,2) NOT NULL DEFAULT 100,
    ADD COLUMN IF NOT EXISTS recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admission_entrance_tests_score_range') THEN
    ALTER TABLE public.admission_entrance_tests ADD CONSTRAINT admission_entrance_tests_score_range
      CHECK (max_score > 0 AND (score IS NULL OR (score >= 0 AND score <= max_score)));
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS uq_admission_entrance_application ON public.admission_entrance_tests(application_id) WHERE application_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admission_merit_course ON public.admission_merit_lists(course_name, academic_year);
CREATE UNIQUE INDEX IF NOT EXISTS uq_admission_merit_application_course ON public.admission_merit_lists(application_id, course_name, academic_year) WHERE application_id IS NOT NULL;

-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admission_schedule_tests(p_application_ids UUID[], p_test_date DATE, p_actor UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE a RECORD; v_t public.admission_entrance_tests%ROWTYPE; v_new INT := 0; v_moved INT := 0; v_skipped JSONB := '[]'::jsonb;
BEGIN
    IF p_test_date IS NULL THEN
        RETURN jsonb_build_object('success', false, 'code', 'VALIDATION_ERROR', 'error', 'A test date is required.');
    END IF;
    IF p_application_ids IS NULL OR cardinality(p_application_ids) = 0 THEN
        RETURN jsonb_build_object('success', false, 'code', 'VALIDATION_ERROR', 'error', 'Select at least one applicant.');
    END IF;
    FOR a IN SELECT * FROM public.admission_applications WHERE id = ANY (p_application_ids) ORDER BY application_number LOOP
        IF a.status IN ('Rejected', 'Cancelled', 'Enrolled') THEN
            v_skipped := v_skipped || jsonb_build_object('application_id', a.id, 'name', a.applicant_name, 'reason', format('application is %s', a.status));
            CONTINUE;
        END IF;
        SELECT * INTO v_t FROM public.admission_entrance_tests WHERE application_id = a.id FOR UPDATE;
        IF FOUND THEN
            IF v_t.status = 'Scheduled' THEN
                UPDATE public.admission_entrance_tests SET test_date = p_test_date, updated_at = NOW() WHERE id = v_t.id;
                v_moved := v_moved + 1;
            ELSE
                v_skipped := v_skipped || jsonb_build_object('application_id', a.id, 'name', a.applicant_name, 'reason', format('test already %s', lower(v_t.status)));
            END IF;
        ELSE
            INSERT INTO public.admission_entrance_tests (application_id, applicant_name, roll_no, test_date, status)
            VALUES (a.id, a.applicant_name, a.application_number, p_test_date, 'Scheduled');
            v_new := v_new + 1;
        END IF;
    END LOOP;
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_values)
    VALUES (p_actor, 'admission_tests_scheduled', 'admission_entrance_tests', NULL,
            jsonb_build_object('date', p_test_date, 'scheduled', v_new, 'rescheduled', v_moved, 'skipped', jsonb_array_length(v_skipped)));
    RETURN jsonb_build_object('success', true, 'scheduled', v_new, 'rescheduled', v_moved, 'skipped', v_skipped);
END;
$$;

CREATE OR REPLACE FUNCTION public.admission_record_test_result(p_test_id UUID, p_status TEXT, p_score NUMERIC, p_max_score NUMERIC, p_actor UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_t public.admission_entrance_tests%ROWTYPE; v_max NUMERIC;
BEGIN
    IF p_status NOT IN ('Completed', 'Absent') THEN
        RETURN jsonb_build_object('success', false, 'code', 'VALIDATION_ERROR', 'error', 'Status must be Completed or Absent.');
    END IF;
    SELECT * INTO v_t FROM public.admission_entrance_tests WHERE id = p_test_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Test record not found.');
    END IF;
    v_max := COALESCE(p_max_score, v_t.max_score);
    IF v_max IS NULL OR v_max <= 0 THEN
        RETURN jsonb_build_object('success', false, 'code', 'VALIDATION_ERROR', 'error', 'Maximum score must be greater than zero.');
    END IF;
    IF p_status = 'Completed' AND (p_score IS NULL OR p_score < 0 OR p_score > v_max) THEN
        RETURN jsonb_build_object('success', false, 'code', 'VALIDATION_ERROR', 'error', format('Score must be between 0 and %s.', v_max));
    END IF;
    UPDATE public.admission_entrance_tests
       SET status = p_status, score = CASE WHEN p_status = 'Completed' THEN p_score ELSE NULL END,
           max_score = v_max, percentile = NULL, recorded_by = p_actor, updated_at = NOW()
     WHERE id = p_test_id;
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
    VALUES (p_actor, 'admission_test_result', 'admission_entrance_tests', p_test_id::text,
            jsonb_build_object('status', v_t.status, 'score', v_t.score),
            jsonb_build_object('status', p_status, 'score', p_score, 'max', v_max));
    RETURN jsonb_build_object('success', true, 'status', p_status);
END;
$$;

CREATE OR REPLACE FUNCTION public.admission_publish_merit(
    p_course TEXT, p_academic_year TEXT, p_seats INTEGER, p_weight_qualifying INTEGER, p_actor UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_wq INTEGER := p_weight_qualifying; v_we INTEGER;
    v_excluded JSONB := '[]'::jsonb; v_rows JSONB; v_n INT; v_sel INT; v_year TEXT := NULLIF(trim(p_academic_year), '');
BEGIN
    IF p_course IS NULL OR length(trim(p_course)) = 0 THEN
        RETURN jsonb_build_object('success', false, 'code', 'VALIDATION_ERROR', 'error', 'Course is required.');
    END IF;
    IF p_seats IS NULL OR p_seats < 1 THEN
        RETURN jsonb_build_object('success', false, 'code', 'VALIDATION_ERROR', 'error', 'Seats must be at least 1.');
    END IF;
    IF v_wq IS NULL OR v_wq < 0 OR v_wq > 100 THEN
        RETURN jsonb_build_object('success', false, 'code', 'VALIDATION_ERROR', 'error', 'The qualifying-marks weight must be between 0 and 100.');
    END IF;
    v_we := 100 - v_wq;

    DROP TABLE IF EXISTS _cand;
    CREATE TEMP TABLE _cand ON COMMIT DROP AS
    SELECT a.id AS application_id, a.applicant_name, a.application_number, a.merit_category, a.submission_date, a.status,
           COALESCE(a.academic_year, v_year, '—') AS academic_year,
           a.qualifying_marks AS q,
           (SELECT round(t.score / t.max_score * 100, 2) FROM public.admission_entrance_tests t
             WHERE t.application_id = a.id AND t.status = 'Completed' ORDER BY t.test_date DESC LIMIT 1) AS e
      FROM public.admission_applications a
     WHERE a.class_name = p_course
       AND (v_year IS NULL OR a.academic_year = v_year)
       AND a.status IN ('Under Review', 'Approved', 'Waitlisted', 'Offered');

    SELECT COALESCE(jsonb_agg(jsonb_build_object('application_id', application_id, 'name', applicant_name,
             'reason', CASE WHEN q IS NOT NULL AND (q < 0 OR q > 100) THEN 'qualifying marks outside 0-100'
                            WHEN v_wq > 0 AND q IS NULL THEN 'no qualifying marks recorded'
                            ELSE 'no completed entrance test' END)), '[]'::jsonb)
      INTO v_excluded
      FROM _cand
     WHERE (q IS NOT NULL AND (q < 0 OR q > 100)) OR (v_wq > 0 AND q IS NULL) OR (v_we > 0 AND e IS NULL);

    DELETE FROM public.admission_merit_lists
     WHERE course_name = p_course AND application_id IS NOT NULL
       AND (v_year IS NULL OR academic_year = v_year);

    WITH ranked AS (
        SELECT c.*, round((COALESCE(c.q, 0) * v_wq + COALESCE(c.e, 0) * v_we) / 100.0, 2) AS score,
               row_number() OVER (ORDER BY (COALESCE(c.q, 0) * v_wq + COALESCE(c.e, 0) * v_we) DESC,
                                           c.submission_date ASC NULLS LAST, c.application_number ASC) AS rnk
          FROM _cand c
         WHERE NOT ((c.q IS NOT NULL AND (c.q < 0 OR c.q > 100)) OR (v_wq > 0 AND c.q IS NULL) OR (v_we > 0 AND c.e IS NULL))
    ), ins AS (
        INSERT INTO public.admission_merit_lists (application_id, student_name, course_name, merit_score, rank, category, status, academic_year)
        SELECT application_id, applicant_name, p_course, score, rnk::int, COALESCE(merit_category, 'General'),
               CASE WHEN rnk <= p_seats THEN 'Selected' ELSE 'Waitlist' END, academic_year
          FROM ranked
        RETURNING *
    )
    SELECT COALESCE(jsonb_agg(jsonb_build_object('application_id', application_id, 'name', student_name, 'rank', rank,
             'score', merit_score, 'status', status) ORDER BY rank), '[]'::jsonb),
           count(*), count(*) FILTER (WHERE status = 'Selected')
      INTO v_rows, v_n, v_sel FROM ins;

    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_values)
    VALUES (p_actor, 'admission_merit_published', 'admission_merit_lists', p_course,
            jsonb_build_object('seats', p_seats, 'weight_qualifying', v_wq, 'weight_entrance', v_we, 'ranked', v_n, 'selected', v_sel));
    RETURN jsonb_build_object('success', true, 'ranked', v_n, 'selected', v_sel, 'waitlisted', v_n - v_sel,
                              'excluded', v_excluded, 'rows', v_rows, 'weights', jsonb_build_object('qualifying', v_wq, 'entrance', v_we));
END;
$$;

CREATE OR REPLACE FUNCTION public.admission_apply_merit(p_course TEXT, p_academic_year TEXT, p_actor UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE m RECORD; v_app_status TEXT; r JSONB; v_ok INT := 0; v_skip JSONB := '[]'::jsonb; v_target TEXT; v_year TEXT := NULLIF(trim(p_academic_year), '');
BEGIN
    FOR m IN SELECT * FROM public.admission_merit_lists
              WHERE course_name = p_course AND application_id IS NOT NULL AND (v_year IS NULL OR academic_year = v_year)
              ORDER BY rank LOOP
        SELECT status INTO v_app_status FROM public.admission_applications WHERE id = m.application_id;
        v_target := CASE WHEN m.status = 'Selected' THEN 'Approved' ELSE 'Waitlisted' END;
        IF v_app_status = v_target THEN CONTINUE; END IF;
        IF v_app_status NOT IN ('Under Review', 'Waitlisted') OR (v_app_status = 'Waitlisted' AND v_target = 'Waitlisted') THEN
            v_skip := v_skip || jsonb_build_object('application_id', m.application_id, 'name', m.student_name,
                        'reason', format('application is already %s', v_app_status));
            CONTINUE;
        END IF;
        r := public.admission_set_status(m.application_id, v_target, format('Merit list rank %s (score %s)', m.rank, m.merit_score), p_actor);
        IF (r->>'success')::boolean THEN v_ok := v_ok + 1;
        ELSE v_skip := v_skip || jsonb_build_object('application_id', m.application_id, 'name', m.student_name, 'reason', r->>'error');
        END IF;
    END LOOP;
    RETURN jsonb_build_object('success', true, 'updated', v_ok, 'skipped', v_skip);
END;
$$;

REVOKE ALL ON FUNCTION public.admission_schedule_tests(UUID[], DATE, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admission_record_test_result(UUID, TEXT, NUMERIC, NUMERIC, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admission_publish_merit(TEXT, TEXT, INTEGER, INTEGER, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admission_apply_merit(TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admission_schedule_tests(UUID[], DATE, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.admission_record_test_result(UUID, TEXT, NUMERIC, NUMERIC, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.admission_publish_merit(TEXT, TEXT, INTEGER, INTEGER, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.admission_apply_merit(TEXT, TEXT, UUID) TO service_role;

COMMIT;
