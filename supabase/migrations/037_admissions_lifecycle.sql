-- =============================================================================
-- Migration 037: Admissions lifecycle (application -> student record)
--
-- Fixes found in docs/audit/09-Admissions-Trace.md:
--  A0 SECURITY: admission_document_verifications (applicant details + document links) and
--     admission_merit_lists had row level security OFF while anon holds table grants.
--  A2 Application extras (DOB, address, previous school ...) were stored as JSON inside
--     admission_document_verifications.document_url (document_type='APPLICATION_METADATA').
--     -> typed columns on admission_applications + one-time backfill (originals are kept).
--  A4/A5 Status set too small; no path from an approved application to a student.
--     -> wider status set, validated transitions (admission_set_status) and a transactional,
--        idempotent admission_enroll() that creates/links the permanent `students` record.
--  A6 No transaction around enrolment.
--
-- Design notes
--  * `application_number` remains the institution's manually entered student id (existing
--    business rule: "Student ID must be entered manually"); it becomes students.student_id.
--  * Enrolling creates the student RECORD only. Portal login accounts remain a separate,
--    explicit provisioning step (a student can exist without portal access).
--  * Both functions are SECURITY DEFINER and callable by service_role only; the edge function
--    authorises the caller (admin / principal / receptionist) first.
-- Idempotent. Run after 036.
-- =============================================================================
BEGIN;

-- ---------------------------------------------------------------------------
-- A0. Close the open tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.admission_document_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_merit_lists            ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admission_document_verifications FROM PUBLIC, anon;
REVOKE ALL ON public.admission_merit_lists            FROM PUBLIC, anon;
REVOKE TRUNCATE ON public.admission_document_verifications, public.admission_merit_lists FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admission_document_verifications, public.admission_merit_lists TO authenticated;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['admission_document_verifications', 'admission_merit_lists'] LOOP
    -- drop any permissive legacy policies from 013 / manual setups
    EXECUTE (SELECT COALESCE(string_agg(format('DROP POLICY IF EXISTS %I ON public.%I;', polname, t), ' '), '')
               FROM pg_policy WHERE polrelid = ('public.' || t)::regclass);
    EXECUTE format($p$CREATE POLICY %I ON public.%I FOR ALL TO authenticated
                      USING (public.get_current_user_role() IN ('admin','principal','receptionist'))
                      WITH CHECK (public.get_current_user_role() IN ('admin','principal','receptionist'))$p$,
                   t || '_staff_all', t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- A2. Typed application columns, wider status set, links
-- ---------------------------------------------------------------------------
ALTER TABLE public.admission_applications
    ADD COLUMN IF NOT EXISTS date_of_birth DATE,
    ADD COLUMN IF NOT EXISTS gender TEXT,
    ADD COLUMN IF NOT EXISTS blood_group TEXT,
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS previous_school TEXT,
    ADD COLUMN IF NOT EXISTS parent_email TEXT,
    ADD COLUMN IF NOT EXISTS relationship TEXT,
    ADD COLUMN IF NOT EXISTS occupation TEXT,
    ADD COLUMN IF NOT EXISTS annual_income TEXT,
    ADD COLUMN IF NOT EXISTS academic_year TEXT,
    ADD COLUMN IF NOT EXISTS admission_batch TEXT,
    ADD COLUMN IF NOT EXISTS qualifying_board TEXT,
    ADD COLUMN IF NOT EXISTS passing_year TEXT,
    ADD COLUMN IF NOT EXISTS qualifying_marks NUMERIC(6,2),
    ADD COLUMN IF NOT EXISTS science_score NUMERIC(6,2),
    ADD COLUMN IF NOT EXISTS merit_category TEXT,
    ADD COLUMN IF NOT EXISTS eligibility_verified BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS extra JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS student_record_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS enrolled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS enrolled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS status_updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
DECLARE c RECORD;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint
            WHERE conrelid = 'public.admission_applications'::regclass AND contype = 'c'
              AND pg_get_constraintdef(oid) ILIKE '%status%' LOOP
    EXECUTE format('ALTER TABLE public.admission_applications DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;
ALTER TABLE public.admission_applications ADD CONSTRAINT admission_applications_status_check
    CHECK (status IN ('Submitted','Under Review','Approved','Waitlisted','Offered','Enrolled','Rejected','Cancelled'));
CREATE INDEX IF NOT EXISTS idx_admission_applications_status ON public.admission_applications(status);
CREATE INDEX IF NOT EXISTS idx_admission_applications_course ON public.admission_applications(class_name, academic_year);
CREATE UNIQUE INDEX IF NOT EXISTS uq_admission_applications_student_record
    ON public.admission_applications(student_record_id) WHERE student_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admission_docs_application ON public.admission_document_verifications(application_id);

-- ---------------------------------------------------------------------------
-- Backfill from the JSON-in-documents workaround. Originals are NOT deleted.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD; m JSONB; v_id UUID; v_no TEXT; v_status TEXT; n_ok INT := 0; n_skip INT := 0;
  fn_date  CONSTANT TEXT := '^\d{4}-\d{2}-\d{2}';
BEGIN
  FOR r IN SELECT * FROM public.admission_document_verifications WHERE document_type = 'APPLICATION_METADATA' LOOP
    BEGIN
      m := r.document_url::jsonb;
      v_id := COALESCE(NULLIF(m->>'application_id',''), NULLIF(m->>'id',''))::uuid;
      v_no := COALESCE(NULLIF(trim(m->>'application_number'),''), NULLIF(trim(m->>'application_no'),''),
                       NULLIF(trim(m->>'student_id'),''), 'APP-' || left(r.id::text, 8));
      v_status := CASE WHEN m->>'status' IN ('Submitted','Under Review','Approved','Waitlisted','Offered','Enrolled','Rejected','Cancelled')
                       THEN m->>'status' WHEN m->>'status' = 'Verified' THEN 'Under Review' ELSE 'Submitted' END;
      IF v_id IS NULL THEN v_id := gen_random_uuid(); END IF;

      INSERT INTO public.admission_applications AS a (
          id, application_number, applicant_name, email, phone, class_name, parent_name, parent_phone, status,
          submission_date, remarks, date_of_birth, gender, blood_group, address, previous_school, parent_email,
          relationship, occupation, annual_income, academic_year, admission_batch, qualifying_board, passing_year,
          qualifying_marks, science_score, merit_category, eligibility_verified, extra, documents)
      VALUES (
          v_id, v_no, COALESCE(NULLIF(m->>'applicant_name',''), NULLIF(m->>'name',''), r.student_name),
          COALESCE(m->>'email',''), COALESCE(m->>'phone',''),
          COALESCE(NULLIF(m->>'class_name',''), NULLIF(m->>'class_applied',''), 'Not specified'),
          COALESCE(NULLIF(m->>'parent_name',''), 'Guardian'), COALESCE(m->>'parent_phone',''), v_status,
          CASE WHEN m->>'submission_date' ~ fn_date THEN (m->>'submission_date')::date ELSE r.submission_date END,
          m->>'remarks',
          CASE WHEN m->>'date_of_birth' ~ fn_date THEN (m->>'date_of_birth')::date END,
          m->>'gender', m->>'blood_group', m->>'address', m->>'previous_school', m->>'parent_email',
          m->>'relationship', m->>'occupation', m->>'annual_income', m->>'academic_year', m->>'admission_batch',
          m->>'qualifying_board', m->>'passing_year',
          CASE WHEN m->>'qualifying_marks' ~ '^\d+(\.\d+)?$' THEN (m->>'qualifying_marks')::numeric END,
          CASE WHEN m->>'science_score' ~ '^\d+(\.\d+)?$' THEN (m->>'science_score')::numeric END,
          m->>'merit_category', COALESCE((m->>'eligibility_verified')::boolean, FALSE),
          jsonb_strip_nulls(jsonb_build_object('custom_fields', m->'custom_fields', 'fee_payment', m->'fee_payment',
                                               'legacy_metadata_id', r.id)),
          CASE WHEN jsonb_typeof(m->'documents') = 'array' THEN m->'documents' ELSE NULL END)
      ON CONFLICT DO NOTHING;
      IF FOUND THEN n_ok := n_ok + 1; ELSE n_skip := n_skip + 1; END IF;
    EXCEPTION WHEN others THEN
      n_skip := n_skip + 1;
      RAISE NOTICE 'admissions backfill skipped legacy row % (%)', r.id, SQLERRM;
    END;
  END LOOP;
  RAISE NOTICE 'admissions backfill: % inserted, % skipped/existing', n_ok, n_skip;
END $$;

-- ---------------------------------------------------------------------------
-- students <-> profiles: let a student RECORD created at enrolment (no login yet) be adopted
-- when the portal account is provisioned later (028's version would hit students_student_id_key).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_student_profile_after()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_status TEXT;
BEGIN
    IF NEW.role = 'student' AND NEW.student_id IS NOT NULL THEN
        v_status := CASE WHEN COALESCE(NEW.status, 'active') IN ('active','inactive','suspended','graduated','alumni','withdrawn')
                         THEN COALESCE(NEW.status, 'active') ELSE 'active' END;
        -- adopt an existing record that has no login yet
        UPDATE public.students s SET
            user_id = NEW.id, name = COALESCE(NEW.name, s.name), email = COALESCE(NEW.email, s.email),
            department = COALESCE(NEW.department, s.department), class_name = COALESCE(NEW.class_name, s.class_name),
            status = v_status, phone = COALESCE(NEW.phone, s.phone), avatar_url = COALESCE(NEW.avatar_url, s.avatar_url),
            updated_at = NOW()
         WHERE s.student_id = NEW.student_id AND (s.user_id IS NULL OR s.user_id = NEW.id);
        IF NOT FOUND THEN
            INSERT INTO public.students (user_id, student_id, roll_number, name, email, department, class_name, status, phone, avatar_url)
            VALUES (NEW.id, NEW.student_id, NEW.student_id, COALESCE(NEW.name, 'Student'), NEW.email,
                    NEW.department, NEW.class_name, v_status, NEW.phone, NEW.avatar_url)
            ON CONFLICT (user_id) DO UPDATE SET
                name = EXCLUDED.name, email = EXCLUDED.email, department = EXCLUDED.department,
                class_name = EXCLUDED.class_name, status = EXCLUDED.status, phone = EXCLUDED.phone,
                avatar_url = EXCLUDED.avatar_url, updated_at = NOW();
        END IF;
    END IF;
    RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_student_profile_after() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- admission_set_status: validated stage transitions + audit
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admission_set_status(
    p_application_id UUID, p_new_status TEXT, p_remarks TEXT, p_actor UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_app public.admission_applications%ROWTYPE;
    v_allowed TEXT[];
    v_rejected_docs INT; v_pending_docs INT;
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
        ELSE ARRAY[]::TEXT[]            -- Enrolled / Cancelled are terminal here
    END;
    IF NOT (p_new_status = ANY (v_allowed)) THEN
        RETURN jsonb_build_object('success', false, 'code', 'INVALID_TRANSITION',
            'error', format('Cannot move an application from "%s" to "%s".', v_app.status, p_new_status),
            'allowed', to_jsonb(v_allowed));
    END IF;

    SELECT count(*) FILTER (WHERE status = 'Rejected'),
           count(*) FILTER (WHERE status NOT IN ('Verified','Rejected'))
      INTO v_rejected_docs, v_pending_docs
      FROM public.admission_document_verifications
     WHERE application_id = p_application_id AND document_type <> 'APPLICATION_METADATA';
    IF p_new_status IN ('Approved','Offered') AND v_rejected_docs > 0 THEN
        RETURN jsonb_build_object('success', false, 'code', 'DOCUMENTS_REJECTED',
            'error', format('%s document(s) are rejected. Resolve them before approving.', v_rejected_docs));
    END IF;
    IF p_new_status IN ('Rejected','Cancelled') AND COALESCE(NULLIF(trim(p_remarks), ''), '') = '' THEN
        RETURN jsonb_build_object('success', false, 'code', 'REASON_REQUIRED', 'error', 'A reason is required.');
    END IF;

    UPDATE public.admission_applications
       SET status = p_new_status, remarks = COALESCE(NULLIF(trim(p_remarks), ''), remarks),
           status_updated_at = NOW(), status_updated_by = p_actor, updated_at = NOW()
     WHERE id = p_application_id;

    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
    VALUES (p_actor, 'admission_status_change', 'admission_applications', p_application_id::text,
            jsonb_build_object('status', v_app.status),
            jsonb_build_object('status', p_new_status, 'remarks', p_remarks));

    RETURN jsonb_build_object('success', true, 'status', p_new_status, 'pending_documents', v_pending_docs);
END;
$$;

-- ---------------------------------------------------------------------------
-- admission_enroll: one transaction, idempotent. Creates (or links) the permanent student record.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admission_enroll(
    p_application_id UUID, p_actor UUID, p_department TEXT DEFAULT NULL, p_class_name TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_app public.admission_applications%ROWTYPE;
    v_stu public.students%ROWTYPE;
    v_rejected INT;
    v_linked BOOLEAN := FALSE;
BEGIN
    SELECT * INTO v_app FROM public.admission_applications WHERE id = p_application_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Application not found.');
    END IF;

    -- idempotent retry
    IF v_app.status = 'Enrolled' AND v_app.student_record_id IS NOT NULL THEN
        SELECT * INTO v_stu FROM public.students WHERE id = v_app.student_record_id;
        RETURN jsonb_build_object('success', true, 'already_enrolled', true,
            'student_record_id', v_app.student_record_id, 'student_id', v_stu.student_id);
    END IF;
    IF v_app.status NOT IN ('Approved','Offered') THEN
        RETURN jsonb_build_object('success', false, 'code', 'NOT_APPROVED',
            'error', format('Only Approved or Offered applications can be enrolled (current: %s).', v_app.status));
    END IF;
    SELECT count(*) INTO v_rejected FROM public.admission_document_verifications
     WHERE application_id = p_application_id AND status = 'Rejected' AND document_type <> 'APPLICATION_METADATA';
    IF v_rejected > 0 THEN
        RETURN jsonb_build_object('success', false, 'code', 'DOCUMENTS_REJECTED', 'error', 'Rejected documents must be resolved first.');
    END IF;
    IF length(trim(COALESCE(v_app.application_number, ''))) = 0 THEN
        RETURN jsonb_build_object('success', false, 'code', 'STUDENT_ID_REQUIRED', 'error', 'The application has no student id.');
    END IF;

    SELECT * INTO v_stu FROM public.students WHERE student_id = v_app.application_number FOR UPDATE;
    IF FOUND THEN
        -- the id already exists: only acceptable if it is not owned by another application
        IF EXISTS (SELECT 1 FROM public.admission_applications WHERE student_record_id = v_stu.id AND id <> v_app.id) THEN
            RETURN jsonb_build_object('success', false, 'code', 'DUPLICATE_STUDENT_ID',
                'error', format('Student id %s already belongs to another enrolled application.', v_app.application_number));
        END IF;
        v_linked := TRUE;   -- e.g. student created earlier through the legacy confirm_admission flow
    ELSE
        INSERT INTO public.students (student_id, roll_number, name, email, department, class_name, admission_date, status, phone)
        VALUES (v_app.application_number, v_app.application_number, v_app.applicant_name, NULLIF(v_app.email, ''),
                COALESCE(NULLIF(trim(p_department), ''), v_app.class_name),
                COALESCE(NULLIF(trim(p_class_name), ''), v_app.class_name),
                CURRENT_DATE, 'active', NULLIF(v_app.phone, ''))
        RETURNING * INTO v_stu;
    END IF;

    UPDATE public.admission_applications
       SET status = 'Enrolled', student_record_id = v_stu.id, enrolled_at = NOW(), enrolled_by = p_actor,
           status_updated_at = NOW(), status_updated_by = p_actor, updated_at = NOW()
     WHERE id = v_app.id;

    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
    VALUES (p_actor, 'admission_enrolled', 'admission_applications', v_app.id::text,
            jsonb_build_object('status', v_app.status),
            jsonb_build_object('student_record_id', v_stu.id, 'student_id', v_stu.student_id, 'linked_existing', v_linked));

    RETURN jsonb_build_object('success', true, 'already_enrolled', false, 'linked_existing', v_linked,
        'student_record_id', v_stu.id, 'student_id', v_stu.student_id);
END;
$$;

REVOKE ALL ON FUNCTION public.admission_set_status(UUID, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admission_enroll(UUID, UUID, TEXT, TEXT)     FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admission_set_status(UUID, TEXT, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.admission_enroll(UUID, UUID, TEXT, TEXT)     TO service_role;

COMMIT;
