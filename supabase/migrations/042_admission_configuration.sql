-- =============================================================================
-- Migration 042: Configurable admissions - routes, quotas, seats, form fields, required documents
--
-- Before: one fixed pipeline; no quota or admission-route concept; the "dynamic form fields" lived only
-- in each browser's localStorage (not shared with other staff, never validated by the server).
--
--   admission_routes            how a candidate is admitted: requires an entrance test? a merit selection?
--                               (seeded: MERIT_ENTRANCE, MERIT_MARKS, DIRECT, LATERAL; add your own)
--   admission_quotas            quota codes (GENERAL, MANAGEMENT, GOVERNMENT, NRI, SPORTS; add your own)
--   admission_seats             seats per course + academic year + quota
--   admission_form_fields       extra application-form fields per course (or all), validated by the server
--   admission_required_documents documents that must be VERIFIED before an application can be approved
--
-- Rules enforced in admission_set_status (approving / sending an offer):
--   * route.requires_entrance  -> a completed entrance test must exist
--   * route.requires_merit     -> approval only through the merit list (admission_apply_merit)
--   * required documents for the course (or all courses) must be Verified
-- Applications with no route set keep the previous behaviour, so existing data is unaffected.
-- admission_publish_merit / admission_apply_merit gain an optional quota; seats default from the matrix.
-- Idempotent. Run after 041.
-- =============================================================================
BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Configuration tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admission_routes (
    code TEXT PRIMARY KEY CHECK (code ~ '^[A-Z0-9_]{2,30}$'),
    name TEXT NOT NULL CHECK (length(trim(name)) >= 2),
    description TEXT,
    requires_entrance BOOLEAN NOT NULL DEFAULT FALSE,
    requires_merit BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO public.admission_routes (code, name, description, requires_entrance, requires_merit, sort_order) VALUES
    ('MERIT_ENTRANCE', 'Merit with entrance test', 'Ranked on qualifying marks and entrance-test score.', TRUE, TRUE, 1),
    ('MERIT_MARKS', 'Merit on qualifying marks', 'Ranked on qualifying marks only; no entrance test.', FALSE, TRUE, 2),
    ('DIRECT', 'Direct admission', 'Admitted directly by the approving authority; no entrance test or ranking.', FALSE, FALSE, 3),
    ('LATERAL', 'Lateral entry', 'Joins a later year; no entrance test or ranking.', FALSE, FALSE, 4)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.admission_quotas (
    code TEXT PRIMARY KEY CHECK (code ~ '^[A-Z0-9_]{2,30}$'),
    name TEXT NOT NULL CHECK (length(trim(name)) >= 2),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO public.admission_quotas (code, name, sort_order) VALUES
    ('GENERAL', 'General / open merit', 1), ('MANAGEMENT', 'Management quota', 2), ('GOVERNMENT', 'Government quota', 3),
    ('NRI', 'NRI quota', 4), ('SPORTS', 'Sports quota', 5)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.admission_seats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_name TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    quota_code TEXT NOT NULL REFERENCES public.admission_quotas(code) ON DELETE RESTRICT,
    seats INTEGER NOT NULL CHECK (seats >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_admission_seats UNIQUE (course_name, academic_year, quota_code)
);

CREATE TABLE IF NOT EXISTS public.admission_form_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_key TEXT NOT NULL CHECK (field_key ~ '^[a-z][a-z0-9_]{1,40}$'),
    label TEXT NOT NULL CHECK (length(trim(label)) >= 2),
    field_type TEXT NOT NULL CHECK (field_type IN ('text', 'textarea', 'number', 'date', 'select', 'checkbox')),
    required BOOLEAN NOT NULL DEFAULT FALSE,
    options TEXT[],                               -- select only
    help_text TEXT,
    section TEXT NOT NULL DEFAULT 'other' CHECK (section IN ('student', 'parent', 'academic', 'other')),
    course_name TEXT,                             -- NULL = every course
    sort_order INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT admission_form_fields_select_has_options CHECK (field_type <> 'select' OR (options IS NOT NULL AND cardinality(options) >= 1))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_admission_form_fields ON public.admission_form_fields (field_key, COALESCE(course_name, ''));

CREATE TABLE IF NOT EXISTS public.admission_required_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_name TEXT,                             -- NULL = every course
    doc_type TEXT NOT NULL CHECK (length(trim(doc_type)) >= 2),
    required BOOLEAN NOT NULL DEFAULT TRUE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_admission_required_documents ON public.admission_required_documents (COALESCE(course_name, ''), lower(doc_type));

ALTER TABLE public.admission_merit_lists ADD COLUMN IF NOT EXISTS quota TEXT;

-- RLS: staff read (the form needs them), admin/principal configure
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['admission_routes','admission_quotas','admission_seats','admission_form_fields','admission_required_documents'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_read', t);
    EXECUTE format($p$CREATE POLICY %I ON public.%I FOR SELECT TO authenticated
                      USING (public.get_current_user_role() IN ('admin','principal','receptionist','coe','hod'))$p$, t || '_read', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_write', t);
    EXECUTE format($p$CREATE POLICY %I ON public.%I FOR ALL TO authenticated
                      USING (public.get_current_user_role() IN ('admin','principal'))
                      WITH CHECK (public.get_current_user_role() IN ('admin','principal'))$p$, t || '_write', t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Custom-field validation (single place; used by the API before saving an application)
--    returns {valid, errors:[{field,message}], cleaned:{key:value}}  (unknown keys are dropped)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admission_validate_fields(p_course TEXT, p_values JSONB)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE f RECORD; v JSONB; txt TEXT; errs JSONB := '[]'::jsonb; cleaned JSONB := '{}'::jsonb;
BEGIN
    p_values := COALESCE(p_values, '{}'::jsonb);
    IF jsonb_typeof(p_values) <> 'object' THEN
        RETURN jsonb_build_object('valid', false, 'errors', jsonb_build_array(jsonb_build_object('field', '_', 'message', 'Custom fields must be an object.')), 'cleaned', '{}'::jsonb);
    END IF;
    FOR f IN SELECT * FROM public.admission_form_fields
              WHERE active AND (course_name IS NULL OR course_name = p_course) ORDER BY sort_order, label LOOP
        v := p_values -> f.field_key;
        txt := CASE WHEN v IS NULL OR jsonb_typeof(v) = 'null' THEN NULL ELSE trim(both '"' from v::text) END;
        IF txt IS NULL OR txt = '' OR (f.field_type = 'checkbox' AND txt = 'false' AND NOT f.required) THEN
            IF f.required AND (f.field_type <> 'checkbox' OR txt IS DISTINCT FROM 'true') THEN
                errs := errs || jsonb_build_object('field', f.field_key, 'message', format('%s is required.', f.label));
            END IF;
            CONTINUE;
        END IF;
        IF length(txt) > 2000 THEN
            errs := errs || jsonb_build_object('field', f.field_key, 'message', format('%s is too long.', f.label)); CONTINUE;
        END IF;
        IF f.field_type = 'number' AND txt !~ '^-?\d+(\.\d+)?$' THEN
            errs := errs || jsonb_build_object('field', f.field_key, 'message', format('%s must be a number.', f.label)); CONTINUE;
        ELSIF f.field_type = 'date' AND txt !~ '^\d{4}-\d{2}-\d{2}$' THEN
            errs := errs || jsonb_build_object('field', f.field_key, 'message', format('%s must be a date (YYYY-MM-DD).', f.label)); CONTINUE;
        ELSIF f.field_type = 'select' AND NOT (txt = ANY (f.options)) THEN
            errs := errs || jsonb_build_object('field', f.field_key, 'message', format('%s must be one of the listed options.', f.label)); CONTINUE;
        ELSIF f.field_type = 'checkbox' AND txt NOT IN ('true', 'false') THEN
            errs := errs || jsonb_build_object('field', f.field_key, 'message', format('%s must be yes or no.', f.label)); CONTINUE;
        END IF;
        cleaned := cleaned || jsonb_build_object(f.field_key, CASE f.field_type WHEN 'number' THEN to_jsonb(txt::numeric)
                                                                                WHEN 'checkbox' THEN to_jsonb(txt::boolean) ELSE to_jsonb(txt) END);
    END LOOP;
    RETURN jsonb_build_object('valid', jsonb_array_length(errs) = 0, 'errors', errs, 'cleaned', cleaned);
END;
$$;
REVOKE ALL ON FUNCTION public.admission_validate_fields(TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admission_validate_fields(TEXT, JSONB) TO service_role;

-- ---------------------------------------------------------------------------
-- 3. admission_set_status with route + document rules
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admission_set_status(
    p_application_id UUID, p_new_status TEXT, p_remarks TEXT, p_actor UUID
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_app public.admission_applications%ROWTYPE; v_route public.admission_routes%ROWTYPE; v_allowed TEXT[];
    v_rejected_docs INT; v_pending_docs INT; v_missing TEXT[];
BEGIN
    SELECT * INTO v_app FROM public.admission_applications WHERE id = p_application_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Application not found.');
    END IF;
    IF v_app.status = p_new_status THEN
        RETURN jsonb_build_object('success', true, 'unchanged', true, 'status', v_app.status);
    END IF;
    IF p_new_status = 'Enrolled' THEN
        RETURN jsonb_build_object('success', false, 'code', 'USE_ENROLL', 'error', 'Use the Enroll action to enroll an approved applicant.');
    END IF;
    v_allowed := CASE v_app.status
        WHEN 'Submitted'    THEN ARRAY['Under Review','Rejected','Cancelled']
        WHEN 'Under Review' THEN ARRAY['Approved','Waitlisted','Rejected','Cancelled']
        WHEN 'Waitlisted'   THEN ARRAY['Under Review','Approved','Rejected','Cancelled']
        WHEN 'Approved'     THEN ARRAY['Offered','Under Review','Cancelled']
        WHEN 'Offered'      THEN ARRAY['Approved','Cancelled']
        WHEN 'Rejected'     THEN ARRAY['Under Review']
        ELSE ARRAY[]::TEXT[] END;
    IF NOT (p_new_status = ANY (v_allowed)) THEN
        RETURN jsonb_build_object('success', false, 'code', 'INVALID_TRANSITION',
            'error', format('Cannot move an application from "%s" to "%s".', v_app.status, p_new_status), 'allowed', to_jsonb(v_allowed));
    END IF;

    SELECT count(*) FILTER (WHERE status = 'Rejected'), count(*) FILTER (WHERE status NOT IN ('Verified','Rejected'))
      INTO v_rejected_docs, v_pending_docs
      FROM public.admission_document_verifications WHERE application_id = p_application_id AND document_type <> 'APPLICATION_METADATA';

    IF p_new_status IN ('Approved','Offered') THEN
        IF v_rejected_docs > 0 THEN
            RETURN jsonb_build_object('success', false, 'code', 'DOCUMENTS_REJECTED', 'error', format('%s document(s) are rejected. Resolve them before approving.', v_rejected_docs));
        END IF;
        -- configured required documents must be Verified
        SELECT array_agg(r.doc_type ORDER BY r.sort_order, r.doc_type) INTO v_missing
          FROM public.admission_required_documents r
         WHERE r.active AND r.required AND (r.course_name IS NULL OR r.course_name = v_app.class_name)
           AND NOT EXISTS (SELECT 1 FROM public.admission_document_verifications d
                            WHERE d.application_id = p_application_id AND d.status = 'Verified'
                              AND lower(d.document_type) = lower(r.doc_type));
        IF v_missing IS NOT NULL THEN
            RETURN jsonb_build_object('success', false, 'code', 'DOCUMENTS_INCOMPLETE',
                'error', 'These documents must be verified first: ' || array_to_string(v_missing, ', ') || '.', 'missing', to_jsonb(v_missing));
        END IF;
        -- route rules (applications without a route keep the old behaviour)
        IF v_app.admission_type IS NOT NULL THEN
            SELECT * INTO v_route FROM public.admission_routes WHERE code = v_app.admission_type;
            IF FOUND THEN
                IF v_route.requires_entrance AND NOT EXISTS (
                    SELECT 1 FROM public.admission_entrance_tests t WHERE t.application_id = p_application_id AND t.status = 'Completed') THEN
                    RETURN jsonb_build_object('success', false, 'code', 'ENTRANCE_REQUIRED',
                        'error', format('The "%s" route needs a completed entrance test first.', v_route.name));
                END IF;
                IF v_route.requires_merit AND COALESCE(current_setting('app.merit_apply', true), '') <> 'on' THEN
                    RETURN jsonb_build_object('success', false, 'code', 'MERIT_REQUIRED',
                        'error', format('The "%s" route is approved through the merit list (Merit List tab → Apply to applications).', v_route.name));
                END IF;
            END IF;
        END IF;
    END IF;
    IF p_new_status IN ('Rejected','Cancelled') AND COALESCE(NULLIF(trim(p_remarks), ''), '') = '' THEN
        RETURN jsonb_build_object('success', false, 'code', 'REASON_REQUIRED', 'error', 'A reason is required.');
    END IF;

    UPDATE public.admission_applications SET status = p_new_status, remarks = COALESCE(NULLIF(trim(p_remarks), ''), remarks),
           status_updated_at = NOW(), status_updated_by = p_actor, updated_at = NOW() WHERE id = p_application_id;
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
    VALUES (p_actor, 'admission_status_change', 'admission_applications', p_application_id::text,
            jsonb_build_object('status', v_app.status), jsonb_build_object('status', p_new_status, 'remarks', p_remarks));
    RETURN jsonb_build_object('success', true, 'status', p_new_status, 'pending_documents', v_pending_docs);
END;
$$;
REVOKE ALL ON FUNCTION public.admission_set_status(UUID, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admission_set_status(UUID, TEXT, TEXT, UUID) TO service_role;

-- ---------------------------------------------------------------------------
-- 4. Merit with quota. Seats default from the seat matrix.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admission_publish_merit(TEXT, TEXT, INTEGER, INTEGER, UUID);
CREATE OR REPLACE FUNCTION public.admission_publish_merit(
    p_course TEXT, p_academic_year TEXT, p_seats INTEGER, p_weight_qualifying INTEGER, p_quota TEXT, p_actor UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_wq INTEGER := p_weight_qualifying; v_we INTEGER; v_seats INTEGER := p_seats; v_quota TEXT := NULLIF(trim(p_quota), '');
    v_excluded JSONB := '[]'::jsonb; v_rows JSONB; v_n INT; v_sel INT; v_year TEXT := NULLIF(trim(p_academic_year), '');
BEGIN
    IF p_course IS NULL OR length(trim(p_course)) = 0 THEN
        RETURN jsonb_build_object('success', false, 'code', 'VALIDATION_ERROR', 'error', 'Course is required.');
    END IF;
    IF v_wq IS NULL OR v_wq < 0 OR v_wq > 100 THEN
        RETURN jsonb_build_object('success', false, 'code', 'VALIDATION_ERROR', 'error', 'The qualifying-marks weight must be between 0 and 100.');
    END IF;
    IF v_seats IS NULL AND v_quota IS NOT NULL AND v_year IS NOT NULL THEN
        SELECT seats INTO v_seats FROM public.admission_seats WHERE course_name = p_course AND academic_year = v_year AND quota_code = v_quota;
    END IF;
    IF v_seats IS NULL OR v_seats < 1 THEN
        RETURN jsonb_build_object('success', false, 'code', 'SEATS_REQUIRED', 'error', 'Enter the number of seats (or set them in the seat matrix for this course, year and quota).');
    END IF;
    v_we := 100 - v_wq;

    DROP TABLE IF EXISTS _cand;
    CREATE TEMP TABLE _cand ON COMMIT DROP AS
    SELECT a.id AS application_id, a.applicant_name, a.application_number, a.merit_category, a.submission_date, a.status, a.quota,
           COALESCE(a.academic_year, v_year, '—') AS academic_year, a.qualifying_marks AS q,
           (SELECT round(t.score / t.max_score * 100, 2) FROM public.admission_entrance_tests t
             WHERE t.application_id = a.id AND t.status = 'Completed' ORDER BY t.test_date DESC LIMIT 1) AS e
      FROM public.admission_applications a
      LEFT JOIN public.admission_routes r ON r.code = a.admission_type
     WHERE a.class_name = p_course
       AND (v_year IS NULL OR a.academic_year = v_year)
       AND (v_quota IS NULL OR a.quota = v_quota)
       AND a.status IN ('Under Review', 'Approved', 'Waitlisted', 'Offered')
       AND (r.code IS NULL OR r.requires_merit);          -- direct / lateral routes are not ranked

    SELECT COALESCE(jsonb_agg(jsonb_build_object('application_id', application_id, 'name', applicant_name,
             'reason', CASE WHEN q IS NOT NULL AND (q < 0 OR q > 100) THEN 'qualifying marks outside 0-100'
                            WHEN v_wq > 0 AND q IS NULL THEN 'no qualifying marks recorded'
                            ELSE 'no completed entrance test' END)), '[]'::jsonb)
      INTO v_excluded FROM _cand
     WHERE (q IS NOT NULL AND (q < 0 OR q > 100)) OR (v_wq > 0 AND q IS NULL) OR (v_we > 0 AND e IS NULL);

    DELETE FROM public.admission_merit_lists
     WHERE course_name = p_course AND application_id IS NOT NULL AND (v_year IS NULL OR academic_year = v_year)
       AND (v_quota IS NULL OR quota = v_quota);

    WITH ranked AS (
        SELECT c.*, round((COALESCE(c.q, 0) * v_wq + COALESCE(c.e, 0) * v_we) / 100.0, 2) AS score,
               row_number() OVER (ORDER BY (COALESCE(c.q, 0) * v_wq + COALESCE(c.e, 0) * v_we) DESC,
                                           c.submission_date ASC NULLS LAST, c.application_number ASC) AS rnk
          FROM _cand c
         WHERE NOT ((c.q IS NOT NULL AND (c.q < 0 OR c.q > 100)) OR (v_wq > 0 AND c.q IS NULL) OR (v_we > 0 AND c.e IS NULL))
    ), ins AS (
        INSERT INTO public.admission_merit_lists (application_id, student_name, course_name, merit_score, rank, category, status, academic_year, quota)
        SELECT application_id, applicant_name, p_course, score, rnk::int, COALESCE(merit_category, 'General'),
               CASE WHEN rnk <= v_seats THEN 'Selected' ELSE 'Waitlist' END, academic_year, quota
          FROM ranked
        RETURNING *
    )
    SELECT COALESCE(jsonb_agg(jsonb_build_object('application_id', application_id, 'name', student_name, 'rank', rank,
             'score', merit_score, 'status', status) ORDER BY rank), '[]'::jsonb),
           count(*), count(*) FILTER (WHERE status = 'Selected')
      INTO v_rows, v_n, v_sel FROM ins;

    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_values)
    VALUES (p_actor, 'admission_merit_published', 'admission_merit_lists', p_course,
            jsonb_build_object('seats', v_seats, 'quota', v_quota, 'weight_qualifying', v_wq, 'weight_entrance', v_we, 'ranked', v_n, 'selected', v_sel));
    RETURN jsonb_build_object('success', true, 'ranked', v_n, 'selected', v_sel, 'waitlisted', v_n - v_sel, 'seats', v_seats,
                              'excluded', v_excluded, 'rows', v_rows, 'weights', jsonb_build_object('qualifying', v_wq, 'entrance', v_we));
END;
$$;

DROP FUNCTION IF EXISTS public.admission_apply_merit(TEXT, TEXT, UUID);
CREATE OR REPLACE FUNCTION public.admission_apply_merit(p_course TEXT, p_academic_year TEXT, p_quota TEXT, p_actor UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE m RECORD; v_app_status TEXT; r JSONB; v_ok INT := 0; v_skip JSONB := '[]'::jsonb; v_target TEXT;
        v_year TEXT := NULLIF(trim(p_academic_year), ''); v_quota TEXT := NULLIF(trim(p_quota), '');
BEGIN
    PERFORM set_config('app.merit_apply', 'on', true);        -- lets merit-route applications be approved
    FOR m IN SELECT * FROM public.admission_merit_lists
              WHERE course_name = p_course AND application_id IS NOT NULL AND (v_year IS NULL OR academic_year = v_year)
                AND (v_quota IS NULL OR quota = v_quota) ORDER BY rank LOOP
        SELECT status INTO v_app_status FROM public.admission_applications WHERE id = m.application_id;
        v_target := CASE WHEN m.status = 'Selected' THEN 'Approved' ELSE 'Waitlisted' END;
        IF v_app_status = v_target THEN CONTINUE; END IF;
        IF v_app_status NOT IN ('Under Review', 'Waitlisted') OR (v_app_status = 'Waitlisted' AND v_target = 'Waitlisted') THEN
            v_skip := v_skip || jsonb_build_object('application_id', m.application_id, 'name', m.student_name, 'reason', format('application is already %s', v_app_status));
            CONTINUE;
        END IF;
        r := public.admission_set_status(m.application_id, v_target, format('Merit list rank %s (score %s)', m.rank, m.merit_score), p_actor);
        IF (r->>'success')::boolean THEN v_ok := v_ok + 1;
        ELSE v_skip := v_skip || jsonb_build_object('application_id', m.application_id, 'name', m.student_name, 'reason', r->>'error');
        END IF;
    END LOOP;
    PERFORM set_config('app.merit_apply', 'off', true);
    RETURN jsonb_build_object('success', true, 'updated', v_ok, 'skipped', v_skip);
END;
$$;

REVOKE ALL ON FUNCTION public.admission_publish_merit(TEXT, TEXT, INTEGER, INTEGER, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admission_apply_merit(TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admission_publish_merit(TEXT, TEXT, INTEGER, INTEGER, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.admission_apply_merit(TEXT, TEXT, TEXT, UUID) TO service_role;

COMMIT;
