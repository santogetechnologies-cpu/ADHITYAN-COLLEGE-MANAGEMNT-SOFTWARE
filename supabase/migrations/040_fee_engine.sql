-- =============================================================================
-- Migration 040: Configurable fee engine
--
-- Replaces the fixed-column fee_structures model (tuition_fee, lab_fee, exam_fee ... one column per
-- kind of fee: adding a fee meant changing the database) with:
--   fee_heads        configurable kinds of fee (tuition, exam, lab, ... + anything you add)
--   fee_plans        a named bundle for an academic year, optionally limited to a department / class / quota
--   fee_plan_items   head + amount + billing cycle (one_time | per_semester | per_year [+ which semesters])
--   fee_runs         one application of a plan, or of a single ad-hoc fee, to a student / class / department / all
--   fee_adjustments  append-only waivers, concessions and cancellations
-- Each generated fee is its own row in the EXISTING student_fees table (one invoice per head), so
-- the finance dashboard, student/parent views and record_fee_payment keep working. Convention kept:
-- student_fees.total_due = outstanding balance; paid_amount = cumulative paid;
-- original_amount = paid + outstanding + waived.
--
-- Rules the database enforces:
--   * a plan can only be generated when Published; its items are frozen once Published (clone to change)
--   * generation is idempotent: the same item for the same student and term is never billed twice
--     (partial unique index on student_fees(student_record_id, charge_key) for non-cancelled rows)
--   * fees attach to the permanent student RECORD, so students without a portal login can be billed;
--     when a login is created later, their fees/payments are linked to it automatically
--   * fee_generate(preview) shows exactly what would be created without writing anything
-- Also: admission quota / admission type on applications and students (used by fee plans and seats).
-- Functions are SECURITY DEFINER, service_role only (the edge function authorises finance/admin roles).
-- Idempotent. Run after 039.
-- =============================================================================
BEGIN;

-- ---------------------------------------------------------------------------
-- 0. Admission quota / type (carried from application to student record)
-- ---------------------------------------------------------------------------
ALTER TABLE public.admission_applications
    ADD COLUMN IF NOT EXISTS quota TEXT,
    ADD COLUMN IF NOT EXISTS admission_type TEXT;
ALTER TABLE public.students
    ADD COLUMN IF NOT EXISTS admission_quota TEXT,
    ADD COLUMN IF NOT EXISTS admission_type TEXT,
    ADD COLUMN IF NOT EXISTS entry_academic_year TEXT;
CREATE INDEX IF NOT EXISTS idx_students_scope ON public.students(status, department, class_name, current_semester);

-- ---------------------------------------------------------------------------
-- 1. Fee heads
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fee_heads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9_]{2,24}$'),
    name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 100),
    category TEXT NOT NULL DEFAULT 'other',
    refundable BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO public.fee_heads (code, name, category, refundable) VALUES
    ('TUITION', 'Tuition fee', 'tuition', FALSE),
    ('EXAM', 'Examination fee', 'exam', FALSE),
    ('LAB', 'Laboratory fee', 'lab', FALSE),
    ('LIBRARY', 'Library fee', 'library', FALSE),
    ('SPORTS', 'Sports & activities fee', 'activity', FALSE),
    ('DEVELOPMENT', 'Development fund', 'other', FALSE),
    ('HOSTEL', 'Hostel fee', 'hostel', FALSE),
    ('MESS', 'Mess fee', 'hostel', FALSE),
    ('TRANSPORT', 'Transport fee', 'transport', FALSE),
    ('UNIFORM', 'Uniform & books', 'other', FALSE),
    ('ADMISSION', 'Admission / registration fee', 'admission', FALSE),
    ('CAUTION', 'Caution deposit', 'deposit', TRUE),
    ('CLINICAL', 'Clinical training fee', 'other', FALSE),
    ('FINE', 'Fine / late fee', 'other', FALSE)
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Plans and items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fee_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 150),
    academic_year TEXT NOT NULL,
    department TEXT,            -- NULL = every department
    class_name TEXT,            -- NULL = every class
    quota TEXT,                 -- NULL = every admission quota
    description TEXT,
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Published', 'Archived')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_fee_plans_name_year UNIQUE (name, academic_year)
);

CREATE TABLE IF NOT EXISTS public.fee_plan_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.fee_plans(id) ON DELETE CASCADE,
    fee_head_id UUID NOT NULL REFERENCES public.fee_heads(id) ON DELETE RESTRICT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('one_time', 'per_semester', 'per_year')),
    semesters INTEGER[],                       -- per_semester only: NULL = every semester
    due_days INTEGER NOT NULL DEFAULT 30 CHECK (due_days BETWEEN 0 AND 365),
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_fee_plan_item UNIQUE (plan_id, fee_head_id, billing_cycle),
    CONSTRAINT fee_plan_items_semesters_only_per_semester CHECK (semesters IS NULL OR billing_cycle = 'per_semester')
);
CREATE INDEX IF NOT EXISTS idx_fee_plan_items_plan ON public.fee_plan_items(plan_id);

CREATE OR REPLACE FUNCTION public.fee_plan_items_guard()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE v_status TEXT; v_plan UUID := COALESCE(NEW.plan_id, OLD.plan_id);
BEGIN
    SELECT status INTO v_status FROM public.fee_plans WHERE id = v_plan;
    IF v_status IS NOT NULL AND v_status <> 'Draft' THEN
        RAISE EXCEPTION 'FEE_PLAN_FROZEN: items of a % plan cannot be changed. Clone the plan to make changes.', v_status;
    END IF;
    RETURN COALESCE(NEW, OLD);
END; $$;
DROP TRIGGER IF EXISTS trg_fee_plan_items_guard ON public.fee_plan_items;
CREATE TRIGGER trg_fee_plan_items_guard BEFORE INSERT OR UPDATE OR DELETE ON public.fee_plan_items
    FOR EACH ROW EXECUTE FUNCTION public.fee_plan_items_guard();

-- a published plan cannot go back to Draft (editing would silently change what was billed)
CREATE OR REPLACE FUNCTION public.fee_plans_guard()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
    IF OLD.status <> 'Draft' AND NEW.status = 'Draft' THEN
        RAISE EXCEPTION 'FEE_PLAN_FROZEN: a % plan cannot return to Draft.', OLD.status;
    END IF;
    IF OLD.status <> 'Draft' AND (NEW.academic_year, NEW.department, NEW.class_name, NEW.quota)
         IS DISTINCT FROM (OLD.academic_year, OLD.department, OLD.class_name, OLD.quota) THEN
        RAISE EXCEPTION 'FEE_PLAN_FROZEN: the targeting of a % plan cannot be changed.', OLD.status;
    END IF;
    IF NEW.status = 'Published' AND OLD.status = 'Draft' THEN
        IF NOT EXISTS (SELECT 1 FROM public.fee_plan_items WHERE plan_id = NEW.id) THEN
            RAISE EXCEPTION 'FEE_PLAN_EMPTY: add at least one fee item before publishing.';
        END IF;
        NEW.published_at := NOW();
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_fee_plans_guard ON public.fee_plans;
CREATE TRIGGER trg_fee_plans_guard BEFORE UPDATE ON public.fee_plans
    FOR EACH ROW EXECUTE FUNCTION public.fee_plans_guard();

-- ---------------------------------------------------------------------------
-- 3. Runs and adjustments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fee_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_type TEXT NOT NULL CHECK (run_type IN ('plan', 'adhoc')),
    plan_id UUID REFERENCES public.fee_plans(id) ON DELETE RESTRICT,
    fee_head_id UUID REFERENCES public.fee_heads(id) ON DELETE RESTRICT,
    amount NUMERIC(12,2),
    description TEXT,
    scope_type TEXT NOT NULL CHECK (scope_type IN ('student', 'class', 'department', 'all')),
    scope_value TEXT,
    quota_filter TEXT,
    semester_filter INTEGER,
    academic_year TEXT NOT NULL,
    due_date DATE,
    include_yearly BOOLEAN NOT NULL DEFAULT FALSE,
    include_one_time BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'Completed' CHECK (status IN ('Completed', 'Cancelled')),
    students_count INTEGER NOT NULL DEFAULT 0,
    demands_count INTEGER NOT NULL DEFAULT 0,
    total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ,
    cancel_reason TEXT,
    CONSTRAINT fee_runs_shape CHECK (
        (run_type = 'plan' AND plan_id IS NOT NULL) OR (run_type = 'adhoc' AND fee_head_id IS NOT NULL AND amount IS NOT NULL AND amount > 0))
);
CREATE INDEX IF NOT EXISTS idx_fee_runs_created ON public.fee_runs(created_at DESC);

ALTER TABLE public.student_fees
    ADD COLUMN IF NOT EXISTS student_record_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS fee_head_id UUID REFERENCES public.fee_heads(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS plan_item_id UUID REFERENCES public.fee_plan_items(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS run_id UUID REFERENCES public.fee_runs(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS charge_key TEXT,
    ADD COLUMN IF NOT EXISTS academic_year TEXT,
    ADD COLUMN IF NOT EXISTS term_label TEXT,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS original_amount NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS waived_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
-- legacy rows: original = outstanding + paid
UPDATE public.student_fees SET original_amount = COALESCE(total_due, 0) + COALESCE(paid_amount, 0) WHERE original_amount IS NULL;

DO $$ DECLARE c RECORD; BEGIN
  FOR c IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.student_fees'::regclass AND contype = 'c'
              AND pg_get_constraintdef(oid) ILIKE '%status%' LOOP
    EXECUTE format('ALTER TABLE public.student_fees DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;
ALTER TABLE public.student_fees ADD CONSTRAINT student_fees_status_check
    CHECK (status IN ('paid', 'pending', 'overdue', 'partially_paid', 'waived', 'cancelled'));
CREATE UNIQUE INDEX IF NOT EXISTS uq_student_fees_charge ON public.student_fees(student_record_id, charge_key)
    WHERE charge_key IS NOT NULL AND status <> 'cancelled';
CREATE INDEX IF NOT EXISTS idx_student_fees_record ON public.student_fees(student_record_id);
CREATE INDEX IF NOT EXISTS idx_student_fees_run ON public.student_fees(run_id);

CREATE TABLE IF NOT EXISTS public.fee_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_fee_id UUID NOT NULL REFERENCES public.student_fees(id) ON DELETE RESTRICT,
    kind TEXT NOT NULL CHECK (kind IN ('waiver', 'concession', 'cancellation')),
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL CHECK (length(trim(reason)) >= 3),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fee_adjustments_fee ON public.fee_adjustments(student_fee_id);

-- fee_payments / receipts: allow a student record without a login
ALTER TABLE public.fee_payments ALTER COLUMN student_id DROP NOT NULL;
ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS student_record_id UUID REFERENCES public.students(id) ON DELETE SET NULL;
ALTER TABLE public.fee_receipts ADD COLUMN IF NOT EXISTS student_record_id UUID REFERENCES public.students(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------------------
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['fee_heads','fee_plans','fee_plan_items','fee_runs','fee_adjustments'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_read', t);
    EXECUTE format($p$CREATE POLICY %I ON public.%I FOR SELECT TO authenticated
                      USING (public.get_current_user_role() IN ('admin','principal','finance_manager','financier','accountant'))$p$, t || '_read', t);
  END LOOP;
END $$;
GRANT SELECT ON public.fee_runs, public.fee_adjustments TO authenticated;   -- written only by the functions below
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_heads, public.fee_plans, public.fee_plan_items TO authenticated;
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['fee_heads','fee_plans','fee_plan_items'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_write', t);
    EXECUTE format($p$CREATE POLICY %I ON public.%I FOR ALL TO authenticated
                      USING (public.get_current_user_role() IN ('admin','finance_manager'))
                      WITH CHECK (public.get_current_user_role() IN ('admin','finance_manager'))$p$, t || '_write', t);
  END LOOP;
END $$;
-- deleting a head/plan that was ever billed is blocked by ON DELETE RESTRICT on runs / SET NULL elsewhere;
-- deactivate (fee_heads.active = false) or archive (fee_plans.status = 'Archived') instead.

-- ---------------------------------------------------------------------------
-- 5. Student record <-> login: link fees/payments when a login is created later
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_student_profile_after()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_status TEXT; v_sid UUID;
BEGIN
    IF NEW.role = 'student' AND NEW.student_id IS NOT NULL THEN
        v_status := CASE WHEN COALESCE(NEW.status, 'active') IN ('active','inactive','suspended','graduated','alumni','withdrawn')
                         THEN COALESCE(NEW.status, 'active') ELSE 'active' END;
        UPDATE public.students s SET
            user_id = NEW.id, name = COALESCE(NEW.name, s.name), email = COALESCE(NEW.email, s.email),
            department = COALESCE(NEW.department, s.department), class_name = COALESCE(NEW.class_name, s.class_name),
            status = v_status, phone = COALESCE(NEW.phone, s.phone), avatar_url = COALESCE(NEW.avatar_url, s.avatar_url),
            updated_at = NOW()
         WHERE s.student_id = NEW.student_id AND (s.user_id IS NULL OR s.user_id = NEW.id)
        RETURNING s.id INTO v_sid;
        IF v_sid IS NULL THEN
            INSERT INTO public.students (user_id, student_id, roll_number, name, email, department, class_name, status, phone, avatar_url)
            VALUES (NEW.id, NEW.student_id, NEW.student_id, COALESCE(NEW.name, 'Student'), NEW.email,
                    NEW.department, NEW.class_name, v_status, NEW.phone, NEW.avatar_url)
            ON CONFLICT (user_id) DO UPDATE SET
                name = EXCLUDED.name, email = EXCLUDED.email, department = EXCLUDED.department,
                class_name = EXCLUDED.class_name, status = EXCLUDED.status, phone = EXCLUDED.phone,
                avatar_url = EXCLUDED.avatar_url, updated_at = NOW()
            RETURNING id INTO v_sid;
        END IF;
        -- the student can now see their own fees, payments and receipts
        UPDATE public.student_fees   SET student_id = NEW.id WHERE student_record_id = v_sid AND student_id IS NULL;
        UPDATE public.fee_payments   SET student_id = NEW.id WHERE student_record_id = v_sid AND student_id IS NULL;
        UPDATE public.fee_receipts   SET student_id = NEW.id WHERE student_record_id = v_sid AND student_id IS NULL;
    END IF;
    RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_student_profile_after() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. admission_enroll: also carries quota / admission type / entry year to the student record
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admission_enroll(
    p_application_id UUID, p_actor UUID, p_department TEXT DEFAULT NULL, p_class_name TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_app public.admission_applications%ROWTYPE; v_stu public.students%ROWTYPE; v_rejected INT; v_linked BOOLEAN := FALSE;
BEGIN
    SELECT * INTO v_app FROM public.admission_applications WHERE id = p_application_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Application not found.');
    END IF;
    IF v_app.status = 'Enrolled' AND v_app.student_record_id IS NOT NULL THEN
        SELECT * INTO v_stu FROM public.students WHERE id = v_app.student_record_id;
        RETURN jsonb_build_object('success', true, 'already_enrolled', true, 'student_record_id', v_app.student_record_id, 'student_id', v_stu.student_id);
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
        IF EXISTS (SELECT 1 FROM public.admission_applications WHERE student_record_id = v_stu.id AND id <> v_app.id) THEN
            RETURN jsonb_build_object('success', false, 'code', 'DUPLICATE_STUDENT_ID',
                'error', format('Student id %s already belongs to another enrolled application.', v_app.application_number));
        END IF;
        v_linked := TRUE;
        UPDATE public.students SET admission_quota = COALESCE(admission_quota, v_app.quota),
               admission_type = COALESCE(admission_type, v_app.admission_type),
               entry_academic_year = COALESCE(entry_academic_year, v_app.academic_year), updated_at = NOW()
         WHERE id = v_stu.id RETURNING * INTO v_stu;
    ELSE
        INSERT INTO public.students (student_id, roll_number, name, email, department, class_name, admission_date, status, phone,
                                     admission_quota, admission_type, entry_academic_year)
        VALUES (v_app.application_number, v_app.application_number, v_app.applicant_name, NULLIF(v_app.email, ''),
                COALESCE(NULLIF(trim(p_department), ''), v_app.class_name), COALESCE(NULLIF(trim(p_class_name), ''), v_app.class_name),
                CURRENT_DATE, 'active', NULLIF(v_app.phone, ''), v_app.quota, v_app.admission_type, v_app.academic_year)
        RETURNING * INTO v_stu;
    END IF;

    UPDATE public.admission_applications
       SET status = 'Enrolled', student_record_id = v_stu.id, enrolled_at = NOW(), enrolled_by = p_actor,
           status_updated_at = NOW(), status_updated_by = p_actor, updated_at = NOW()
     WHERE id = v_app.id;
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
    VALUES (p_actor, 'admission_enrolled', 'admission_applications', v_app.id::text, jsonb_build_object('status', v_app.status),
            jsonb_build_object('student_record_id', v_stu.id, 'student_id', v_stu.student_id, 'linked_existing', v_linked));
    RETURN jsonb_build_object('success', true, 'already_enrolled', false, 'linked_existing', v_linked,
        'student_record_id', v_stu.id, 'student_id', v_stu.student_id);
END;
$$;
REVOKE ALL ON FUNCTION public.admission_enroll(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admission_enroll(UUID, UUID, TEXT, TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- 7. fee_generate: preview or execute a plan run / ad-hoc fee
--    p_plan_id  -> bill that Published plan's items
--    p_head_id + p_amount -> bill a single new fee ("add a fee in the middle of the year")
--    scope: student (value = student id) | class | department | all
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fee_generate(
    p_execute BOOLEAN, p_plan_id UUID, p_head_id UUID, p_amount NUMERIC, p_description TEXT,
    p_scope_type TEXT, p_scope_value TEXT, p_quota TEXT, p_semester INTEGER,
    p_academic_year TEXT, p_due_date DATE, p_include_yearly BOOLEAN, p_include_one_time BOOLEAN, p_actor UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_plan public.fee_plans%ROWTYPE; v_head public.fee_heads%ROWTYPE; v_year TEXT; v_run UUID := gen_random_uuid();
    v_students INT; v_new INT; v_skipped INT; v_total NUMERIC; v_breakdown JSONB; v_sample JSONB;
BEGIN
    IF p_scope_type NOT IN ('student', 'class', 'department', 'all') THEN
        RETURN jsonb_build_object('success', false, 'code', 'VALIDATION_ERROR', 'error', 'Scope must be student, class, department or all.');
    END IF;
    IF p_scope_type <> 'all' AND length(trim(COALESCE(p_scope_value, ''))) = 0 THEN
        RETURN jsonb_build_object('success', false, 'code', 'VALIDATION_ERROR', 'error', 'Choose which student, class or department to bill.');
    END IF;
    IF (p_plan_id IS NULL) = (p_head_id IS NULL) THEN
        RETURN jsonb_build_object('success', false, 'code', 'VALIDATION_ERROR', 'error', 'Choose either a fee plan or a single fee head.');
    END IF;

    IF p_plan_id IS NOT NULL THEN
        SELECT * INTO v_plan FROM public.fee_plans WHERE id = p_plan_id;
        IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Fee plan not found.'); END IF;
        IF v_plan.status <> 'Published' THEN
            RETURN jsonb_build_object('success', false, 'code', 'PLAN_NOT_PUBLISHED', 'error', format('The plan is %s. Publish it before billing.', v_plan.status));
        END IF;
        v_year := COALESCE(NULLIF(trim(p_academic_year), ''), v_plan.academic_year);
    ELSE
        SELECT * INTO v_head FROM public.fee_heads WHERE id = p_head_id;
        IF NOT FOUND OR NOT v_head.active THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Fee head not found or inactive.'); END IF;
        IF p_amount IS NULL OR p_amount <= 0 THEN RETURN jsonb_build_object('success', false, 'code', 'INVALID_AMOUNT', 'error', 'Amount must be greater than zero.'); END IF;
        IF p_due_date IS NULL THEN RETURN jsonb_build_object('success', false, 'code', 'VALIDATION_ERROR', 'error', 'A due date is required for a single fee.'); END IF;
        v_year := NULLIF(trim(p_academic_year), '');
        IF v_year IS NULL THEN RETURN jsonb_build_object('success', false, 'code', 'VALIDATION_ERROR', 'error', 'Academic year is required.'); END IF;
    END IF;

    DROP TABLE IF EXISTS _fee_cand;
    CREATE TEMP TABLE _fee_cand (
        student_rec UUID, student_user UUID, student_name TEXT, class_name TEXT, head_id UUID, head_name TEXT,
        item_id UUID, amount NUMERIC(12,2), charge_key TEXT, term_label TEXT, due DATE, is_new BOOLEAN) ON COMMIT DROP;

    WITH stu AS (
        SELECT s.* FROM public.students s
         WHERE s.status = 'active'
           AND (p_scope_type = 'all'
                OR (p_scope_type = 'student'    AND (s.id::text = p_scope_value OR s.student_id = p_scope_value))
                OR (p_scope_type = 'class'      AND s.class_name = p_scope_value)
                OR (p_scope_type = 'department' AND s.department = p_scope_value))
           AND (NULLIF(trim(p_quota), '') IS NULL OR s.admission_quota = trim(p_quota))
           AND (p_semester IS NULL OR s.current_semester = p_semester)
           AND (p_plan_id IS NULL OR (
                (v_plan.department IS NULL OR s.department = v_plan.department)
            AND (v_plan.class_name IS NULL OR s.class_name = v_plan.class_name)
            AND (v_plan.quota IS NULL OR s.admission_quota = v_plan.quota)))
    )
    INSERT INTO _fee_cand
    SELECT s.id, s.user_id, s.name, COALESCE(s.class_name, s.department, '—'), h.id, h.name, i.id, i.amount,
           i.id::text || ':' || CASE i.billing_cycle WHEN 'one_time' THEN 'ONCE'
                                                       WHEN 'per_year' THEN v_year
                                                       ELSE v_year || '/S' || s.current_semester END,
           CASE i.billing_cycle WHEN 'one_time' THEN 'One-time' WHEN 'per_year' THEN 'Year ' || v_year
                                ELSE 'Semester ' || s.current_semester END,
           COALESCE(p_due_date, CURRENT_DATE + i.due_days), FALSE
      FROM stu s
      JOIN public.fee_plan_items i ON i.plan_id = p_plan_id
      JOIN public.fee_heads h ON h.id = i.fee_head_id AND h.active
     WHERE p_plan_id IS NOT NULL
       AND ((i.billing_cycle = 'one_time' AND COALESCE(p_include_one_time, FALSE))
         OR (i.billing_cycle = 'per_year' AND COALESCE(p_include_yearly, FALSE))
         OR (i.billing_cycle = 'per_semester' AND (i.semesters IS NULL OR s.current_semester = ANY (i.semesters))));

    IF p_head_id IS NOT NULL THEN
        INSERT INTO _fee_cand
        SELECT s.id, s.user_id, s.name, COALESCE(s.class_name, s.department, '—'), v_head.id, v_head.name, NULL, p_amount,
               'adhoc:' || v_run::text, COALESCE(NULLIF(trim(p_description), ''), v_head.name), p_due_date, FALSE
          FROM public.students s
         WHERE s.status = 'active'
           AND (p_scope_type = 'all'
                OR (p_scope_type = 'student'    AND (s.id::text = p_scope_value OR s.student_id = p_scope_value))
                OR (p_scope_type = 'class'      AND s.class_name = p_scope_value)
                OR (p_scope_type = 'department' AND s.department = p_scope_value))
           AND (NULLIF(trim(p_quota), '') IS NULL OR s.admission_quota = trim(p_quota))
           AND (p_semester IS NULL OR s.current_semester = p_semester);
    END IF;

    UPDATE _fee_cand c SET is_new = NOT EXISTS (
        SELECT 1 FROM public.student_fees f WHERE f.student_record_id = c.student_rec AND f.charge_key = c.charge_key AND f.status <> 'cancelled');

    SELECT count(DISTINCT student_rec), count(*) FILTER (WHERE is_new), count(*) FILTER (WHERE NOT is_new),
           COALESCE(sum(amount) FILTER (WHERE is_new), 0)
      INTO v_students, v_new, v_skipped, v_total FROM _fee_cand;
    SELECT COALESCE(jsonb_agg(jsonb_build_object('head', head_name, 'students', n, 'amount', amt) ORDER BY head_name), '[]'::jsonb)
      INTO v_breakdown FROM (SELECT head_name, count(*) n, sum(amount) amt FROM _fee_cand WHERE is_new GROUP BY head_name) b;
    SELECT COALESCE(jsonb_agg(jsonb_build_object('student', student_name, 'class', class_name, 'fee', head_name, 'amount', amount, 'due', due)), '[]'::jsonb)
      INTO v_sample FROM (SELECT * FROM _fee_cand WHERE is_new ORDER BY student_name, head_name LIMIT 10) x;

    IF NOT p_execute THEN
        RETURN jsonb_build_object('success', true, 'preview', true, 'students', v_students, 'to_create', v_new,
            'already_billed', v_skipped, 'total_amount', v_total, 'by_head', v_breakdown, 'sample', v_sample);
    END IF;
    IF v_new = 0 THEN
        RETURN jsonb_build_object('success', false, 'code', 'NOTHING_TO_BILL', 'error',
            CASE WHEN v_skipped > 0 THEN 'Everything in this selection has already been billed.'
                 ELSE 'No active students match this selection.' END, 'already_billed', v_skipped);
    END IF;

    -- A single ad-hoc fee has no natural key, so an identical run in the last 10 minutes is treated as a double submit.
    IF p_head_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.fee_runs r
         WHERE r.run_type = 'adhoc' AND r.status = 'Completed' AND r.fee_head_id = p_head_id AND r.amount = p_amount
           AND r.scope_type = p_scope_type AND r.scope_value IS NOT DISTINCT FROM NULLIF(trim(p_scope_value), '')
           AND r.quota_filter IS NOT DISTINCT FROM NULLIF(trim(p_quota), '') AND r.semester_filter IS NOT DISTINCT FROM p_semester
           AND r.academic_year = v_year AND r.due_date IS NOT DISTINCT FROM p_due_date
           AND r.description IS NOT DISTINCT FROM NULLIF(trim(p_description), '') AND r.created_at > NOW() - INTERVAL '10 minutes') THEN
        RETURN jsonb_build_object('success', false, 'code', 'DUPLICATE_RUN',
            'error', 'An identical fee was billed to this selection in the last 10 minutes. Nothing was created.');
    END IF;

    INSERT INTO public.fee_runs (id, run_type, plan_id, fee_head_id, amount, description, scope_type, scope_value, quota_filter,
                                 semester_filter, academic_year, due_date, include_yearly, include_one_time, students_count,
                                 demands_count, total_amount, created_by)
    VALUES (v_run, CASE WHEN p_plan_id IS NULL THEN 'adhoc' ELSE 'plan' END, p_plan_id, p_head_id, p_amount,
            NULLIF(trim(p_description), ''), p_scope_type, NULLIF(trim(p_scope_value), ''), NULLIF(trim(p_quota), ''),
            p_semester, v_year, p_due_date, COALESCE(p_include_yearly, FALSE), COALESCE(p_include_one_time, FALSE),
            v_students, v_new, v_total, p_actor);

    INSERT INTO public.student_fees (student_id, student_record_id, student_name, class_name, total_due, paid_amount, due_date, status,
                                     fee_head_id, plan_item_id, run_id, charge_key, academic_year, term_label, description, original_amount)
    SELECT student_user, student_rec, student_name, class_name, amount, 0, due, 'pending',
           head_id, item_id, v_run, charge_key, v_year, term_label, head_name, amount
      FROM _fee_cand WHERE is_new;

    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_values)
    VALUES (p_actor, 'fee_run_executed', 'fee_runs', v_run::text,
            jsonb_build_object('scope', p_scope_type, 'value', p_scope_value, 'demands', v_new, 'total', v_total, 'plan', p_plan_id, 'head', p_head_id));
    RETURN jsonb_build_object('success', true, 'preview', false, 'run_id', v_run, 'students', v_students, 'created', v_new,
        'already_billed', v_skipped, 'total_amount', v_total, 'by_head', v_breakdown);
END;
$$;

-- ---------------------------------------------------------------------------
-- 8. fee_adjust (waiver / concession / cancellation) and fee_cancel_run
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fee_adjust(p_student_fee_id UUID, p_kind TEXT, p_amount NUMERIC, p_reason TEXT, p_actor UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_fee public.student_fees%ROWTYPE; v_amt NUMERIC(12,2); v_due NUMERIC(12,2); v_status TEXT;
BEGIN
    IF p_kind NOT IN ('waiver', 'concession', 'cancellation') THEN
        RETURN jsonb_build_object('success', false, 'code', 'VALIDATION_ERROR', 'error', 'Unknown adjustment type.');
    END IF;
    IF length(trim(COALESCE(p_reason, ''))) < 3 THEN
        RETURN jsonb_build_object('success', false, 'code', 'REASON_REQUIRED', 'error', 'A reason is required.');
    END IF;
    SELECT * INTO v_fee FROM public.student_fees WHERE id = p_student_fee_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Fee record not found.'); END IF;
    IF v_fee.status IN ('cancelled', 'waived') OR v_fee.total_due <= 0 THEN
        RETURN jsonb_build_object('success', false, 'code', 'NOTHING_DUE', 'error', 'There is no balance on this fee to adjust.');
    END IF;
    IF p_kind = 'cancellation' THEN
        IF v_fee.paid_amount > 0 THEN
            RETURN jsonb_build_object('success', false, 'code', 'HAS_PAYMENTS', 'error', 'A fee with payments cannot be cancelled. Waive the balance instead.');
        END IF;
        v_amt := v_fee.total_due;
    ELSE
        v_amt := round(p_amount, 2);
        IF v_amt IS NULL OR v_amt <= 0 THEN RETURN jsonb_build_object('success', false, 'code', 'INVALID_AMOUNT', 'error', 'Amount must be greater than zero.'); END IF;
        IF v_amt > v_fee.total_due THEN
            RETURN jsonb_build_object('success', false, 'code', 'EXCEEDS_BALANCE', 'error', format('Amount exceeds the outstanding balance (%s).', v_fee.total_due));
        END IF;
    END IF;
    v_due := v_fee.total_due - v_amt;
    v_status := CASE WHEN p_kind = 'cancellation' THEN 'cancelled'
                     WHEN v_due = 0 AND v_fee.paid_amount > 0 THEN 'paid'
                     WHEN v_due = 0 THEN 'waived'
                     WHEN v_fee.paid_amount > 0 THEN 'partially_paid' ELSE v_fee.status END;
    UPDATE public.student_fees SET total_due = v_due, waived_amount = waived_amount + CASE WHEN p_kind = 'cancellation' THEN 0 ELSE v_amt END,
           status = v_status WHERE id = v_fee.id;
    INSERT INTO public.fee_adjustments (student_fee_id, kind, amount, reason, created_by) VALUES (v_fee.id, p_kind, v_amt, trim(p_reason), p_actor);
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
    VALUES (p_actor, 'fee_' || p_kind, 'student_fees', v_fee.id::text, jsonb_build_object('total_due', v_fee.total_due, 'status', v_fee.status),
            jsonb_build_object('total_due', v_due, 'status', v_status, 'amount', v_amt, 'reason', p_reason));
    RETURN jsonb_build_object('success', true, 'status', v_status, 'balance_remaining', v_due);
END;
$$;

CREATE OR REPLACE FUNCTION public.fee_cancel_run(p_run_id UUID, p_reason TEXT, p_actor UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_run public.fee_runs%ROWTYPE; f RECORD; v_ok INT := 0; v_kept INT := 0;
BEGIN
    IF length(trim(COALESCE(p_reason, ''))) < 3 THEN
        RETURN jsonb_build_object('success', false, 'code', 'REASON_REQUIRED', 'error', 'A reason is required.');
    END IF;
    SELECT * INTO v_run FROM public.fee_runs WHERE id = p_run_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Run not found.'); END IF;
    IF v_run.status = 'Cancelled' THEN RETURN jsonb_build_object('success', true, 'already_cancelled', true); END IF;
    FOR f IN SELECT id, paid_amount, total_due, status FROM public.student_fees WHERE run_id = p_run_id FOR UPDATE LOOP
        IF f.status = 'cancelled' THEN CONTINUE; END IF;
        IF f.paid_amount > 0 OR f.total_due <= 0 THEN v_kept := v_kept + 1; CONTINUE; END IF;
        UPDATE public.student_fees SET total_due = 0, status = 'cancelled' WHERE id = f.id;
        INSERT INTO public.fee_adjustments (student_fee_id, kind, amount, reason, created_by) VALUES (f.id, 'cancellation', f.total_due, trim(p_reason), p_actor);
        v_ok := v_ok + 1;
    END LOOP;
    IF v_kept = 0 THEN
        UPDATE public.fee_runs SET status = 'Cancelled', cancelled_at = NOW(), cancel_reason = trim(p_reason) WHERE id = p_run_id;
    END IF;
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_values)
    VALUES (p_actor, 'fee_run_cancelled', 'fee_runs', p_run_id::text, jsonb_build_object('cancelled', v_ok, 'kept_with_payments', v_kept, 'reason', p_reason));
    RETURN jsonb_build_object('success', true, 'cancelled', v_ok, 'kept_because_paid', v_kept, 'run_closed', v_kept = 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.fee_plan_clone(p_plan_id UUID, p_new_name TEXT, p_new_year TEXT, p_actor UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_new UUID;
BEGIN
    IF length(trim(COALESCE(p_new_name, ''))) < 2 OR length(trim(COALESCE(p_new_year, ''))) < 4 THEN
        RETURN jsonb_build_object('success', false, 'code', 'VALIDATION_ERROR', 'error', 'A name and an academic year are required.');
    END IF;
    IF EXISTS (SELECT 1 FROM public.fee_plans WHERE name = trim(p_new_name) AND academic_year = trim(p_new_year)) THEN
        RETURN jsonb_build_object('success', false, 'code', 'DUPLICATE', 'error', 'A plan with this name already exists for that year.');
    END IF;
    INSERT INTO public.fee_plans (name, academic_year, department, class_name, quota, description, status, created_by)
    SELECT trim(p_new_name), trim(p_new_year), department, class_name, quota, description, 'Draft', p_actor FROM public.fee_plans WHERE id = p_plan_id
    RETURNING id INTO v_new;
    IF v_new IS NULL THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Plan not found.'); END IF;
    INSERT INTO public.fee_plan_items (plan_id, fee_head_id, amount, billing_cycle, semesters, due_days, description, sort_order)
    SELECT v_new, fee_head_id, amount, billing_cycle, semesters, due_days, description, sort_order FROM public.fee_plan_items WHERE plan_id = p_plan_id;
    RETURN jsonb_build_object('success', true, 'plan_id', v_new);
END;
$$;

REVOKE ALL ON FUNCTION public.fee_generate(BOOLEAN, UUID, UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, DATE, BOOLEAN, BOOLEAN, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fee_adjust(UUID, TEXT, NUMERIC, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fee_cancel_run(UUID, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fee_plan_clone(UUID, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fee_generate(BOOLEAN, UUID, UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, DATE, BOOLEAN, BOOLEAN, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.fee_adjust(UUID, TEXT, NUMERIC, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.fee_cancel_run(UUID, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.fee_plan_clone(UUID, TEXT, TEXT, UUID) TO service_role;

-- ---------------------------------------------------------------------------
-- 9. record_fee_payment: works for a student record without a login
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_fee_payment(
    p_student_fee_id UUID, p_amount NUMERIC, p_payment_mode TEXT, p_reference TEXT, p_idempotency_key TEXT,
    p_collected_by UUID, p_remarks TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_fee public.student_fees%ROWTYPE; v_stu public.students%ROWTYPE; v_prof public.profiles%ROWTYPE;
    v_existing public.fee_payments%ROWTYPE; v_pay_id UUID; v_rec_id UUID; v_rec_no TEXT; v_new_paid NUMERIC(12,2); v_new_due NUMERIC(12,2);
    v_name TEXT; v_roll TEXT; v_dept TEXT; v_head TEXT;
BEGIN
    IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) < 8 THEN
        RETURN jsonb_build_object('success', false, 'code', 'IDEMPOTENCY_KEY_REQUIRED', 'error', 'An idempotency key (>= 8 chars) is required.');
    END IF;
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'code', 'INVALID_AMOUNT', 'error', 'Amount must be greater than zero.');
    END IF;
    IF p_payment_mode NOT IN ('Cash','UPI','Card','Bank_Transfer','Cheque','Online_Gateway') THEN
        RETURN jsonb_build_object('success', false, 'code', 'INVALID_MODE', 'error', 'Unsupported payment mode.');
    END IF;
    SELECT * INTO v_existing FROM public.fee_payments WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN
        RETURN jsonb_build_object('success', true, 'duplicate', true, 'payment_id', v_existing.id, 'receipt_id', v_existing.receipt_id);
    END IF;
    SELECT * INTO v_fee FROM public.student_fees WHERE id = p_student_fee_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'FEE_NOT_FOUND', 'error', 'Fee record not found.'); END IF;
    IF v_fee.status IN ('cancelled', 'waived') OR v_fee.total_due <= 0 THEN
        RETURN jsonb_build_object('success', false, 'code', 'NOTHING_DUE', 'error', 'No balance is due on this fee record.');
    END IF;
    IF p_amount > v_fee.total_due THEN
        RETURN jsonb_build_object('success', false, 'code', 'OVERPAYMENT', 'error', format('Amount exceeds outstanding balance (%s).', v_fee.total_due));
    END IF;

    IF v_fee.student_record_id IS NOT NULL THEN SELECT * INTO v_stu FROM public.students WHERE id = v_fee.student_record_id; END IF;
    IF v_fee.student_id IS NOT NULL THEN SELECT * INTO v_prof FROM public.profiles WHERE id = v_fee.student_id; END IF;
    v_name := COALESCE(v_stu.name, v_prof.name, v_fee.student_name);
    v_roll := COALESCE(v_stu.student_id, v_prof.student_id, v_prof.roll_number, 'N/A');
    v_dept := COALESCE(v_stu.department, v_prof.department, v_fee.class_name, 'N/A');
    SELECT name INTO v_head FROM public.fee_heads WHERE id = v_fee.fee_head_id;

    INSERT INTO public.fee_payments (student_fee_id, student_id, student_record_id, amount, payment_mode, transaction_reference,
                                     idempotency_key, status, collected_by, remarks)
    VALUES (v_fee.id, v_fee.student_id, v_fee.student_record_id, p_amount, p_payment_mode, NULLIF(trim(p_reference), ''),
            p_idempotency_key, 'Completed', p_collected_by, p_remarks)
    RETURNING id INTO v_pay_id;

    v_new_paid := v_fee.paid_amount + p_amount;
    v_new_due := v_fee.total_due - p_amount;
    UPDATE public.student_fees SET paid_amount = v_new_paid, total_due = v_new_due,
           status = CASE WHEN v_new_due = 0 THEN 'paid' ELSE 'partially_paid' END WHERE id = v_fee.id;

    v_rec_no := 'REC-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('public.fee_receipt_seq')::TEXT, 6, '0');
    INSERT INTO public.fee_receipts (receipt_number, student_fee_id, student_id, student_record_id, student_name, roll_number, department,
                                     academic_year, fee_type, gross_amount, amount_paid, balance_remaining, payment_mode,
                                     transaction_reference, cashier_user_id, qr_verification_token)
    VALUES (v_rec_no, v_fee.id, v_fee.student_id, v_fee.student_record_id, v_name, v_roll, v_dept,
            COALESCE(v_fee.academic_year, '—'), COALESCE(v_head, v_fee.description, 'Fee'),
            COALESCE(v_fee.original_amount, v_fee.total_due + v_fee.paid_amount), p_amount, v_new_due, p_payment_mode,
            COALESCE(NULLIF(trim(p_reference), ''), v_pay_id::TEXT), p_collected_by, encode(gen_random_bytes(16), 'hex'))
    RETURNING id INTO v_rec_id;
    UPDATE public.fee_payments SET receipt_id = v_rec_id WHERE id = v_pay_id;

    INSERT INTO public.finance_transactions (type, amount, department, description, status)
    VALUES ('Fee Payment', p_amount, 'Academic Fees',
            format('Fee receipt %s: %s (%s) via %s%s', v_rec_no, v_name, COALESCE(v_head, 'Fee'), p_payment_mode,
                   CASE WHEN NULLIF(trim(p_reference), '') IS NULL THEN '' ELSE ' (ref ' || trim(p_reference) || ')' END),
            'Approved');
    RETURN jsonb_build_object('success', true, 'duplicate', false, 'payment_id', v_pay_id, 'receipt_id', v_rec_id,
        'receipt_number', v_rec_no, 'balance_remaining', v_new_due);
EXCEPTION WHEN unique_violation THEN
    SELECT * INTO v_existing FROM public.fee_payments
     WHERE idempotency_key = p_idempotency_key OR transaction_reference = NULLIF(trim(p_reference), '') LIMIT 1;
    IF FOUND THEN
        RETURN jsonb_build_object('success', true, 'duplicate', true, 'payment_id', v_existing.id, 'receipt_id', v_existing.receipt_id);
    END IF;
    RAISE;
END;
$$;
REVOKE ALL ON FUNCTION public.record_fee_payment(UUID, NUMERIC, TEXT, TEXT, TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_fee_payment(UUID, NUMERIC, TEXT, TEXT, TEXT, UUID, TEXT) TO service_role;

COMMIT;
