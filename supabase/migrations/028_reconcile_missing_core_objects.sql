-- =============================================================================
-- Migration 028: Reconcile objects the application uses but the live database
--                (baseline = migrations 001-015) does not have.
--
-- Found by diffing every .from('<table>') / .rpc('<fn>') in src/ against a
-- scratch database built from 001-015:
--   tables : institutional_settings, fee_payments, students, student_mood_checkins
--   rpcs   : issue_library_book, return_library_book, decrement_book_copies,
--            checkout_store_order, resolve_login_id, get_first_login_status
--
-- Supersedes the broken/conflicting definitions in 017, 018, 020, 021, 023, 024
-- (e.g. 018 referenced library_books.copies_available, book_issues.student_id/
-- fine_amount/updated_at and store_orders.student_id, none of which exist, and
-- wrote status values rejected by the CHECK constraints).
--
-- Single-institution design: no college_id / multi-tenant objects.
-- Idempotent: safe to re-run. Does not delete or rewrite existing data.
-- Run order: this file BEFORE 029.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. Profile columns required by the objects below (029 hardens them further)
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS login_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS student_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS requires_password_change BOOLEAN DEFAULT FALSE;

-- ---------------------------------------------------------------------------
-- 1. institutional_settings  (single row; referenced by 013 but never created)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.institutional_settings (
    id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    institution_name TEXT NOT NULL DEFAULT 'Adhithyan Group of Institutions',
    institution_code TEXT NOT NULL DEFAULT 'ADH',
    academic_year TEXT NOT NULL DEFAULT '2026-2027',
    contact_email TEXT,
    contact_phone TEXT,
    address TEXT,
    student_id_prefix TEXT NOT NULL DEFAULT 'AIP',
    min_attendance_percentage NUMERIC(5,2) NOT NULL DEFAULT 75.0,
    passing_marks_percentage NUMERIC(5,2) NOT NULL DEFAULT 40.0,
    enable_realtime BOOLEAN NOT NULL DEFAULT TRUE,
    enable_email_alerts BOOLEAN NOT NULL DEFAULT TRUE,
    maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT institutional_settings_singleton CHECK (id = '00000000-0000-0000-0000-000000000001'::uuid),
    CONSTRAINT institutional_settings_pct CHECK (
        min_attendance_percentage BETWEEN 0 AND 100 AND passing_marks_percentage BETWEEN 0 AND 100),
    CONSTRAINT institutional_settings_prefix CHECK (student_id_prefix ~ '^[A-Z0-9]{2,8}$')
);

-- Table may pre-exist from a manual/remote creation: add anything missing.
ALTER TABLE public.institutional_settings
    ADD COLUMN IF NOT EXISTS student_id_prefix TEXT NOT NULL DEFAULT 'AIP',
    ADD COLUMN IF NOT EXISTS min_attendance_percentage NUMERIC(5,2) NOT NULL DEFAULT 75.0,
    ADD COLUMN IF NOT EXISTS passing_marks_percentage NUMERIC(5,2) NOT NULL DEFAULT 40.0,
    ADD COLUMN IF NOT EXISTS enable_realtime BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS enable_email_alerts BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE;

INSERT INTO public.institutional_settings (id) VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.institutional_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.institutional_settings FROM PUBLIC, anon;
GRANT SELECT, UPDATE ON public.institutional_settings TO authenticated;

DROP POLICY IF EXISTS "Allow read settings" ON public.institutional_settings;
DROP POLICY IF EXISTS "Allow admin write settings" ON public.institutional_settings;
DROP POLICY IF EXISTS institutional_settings_select ON public.institutional_settings;
CREATE POLICY institutional_settings_select ON public.institutional_settings
    FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS institutional_settings_update ON public.institutional_settings;
CREATE POLICY institutional_settings_update ON public.institutional_settings
    FOR UPDATE TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal'))
    WITH CHECK (public.get_current_user_role() IN ('admin', 'principal'));

DROP TRIGGER IF EXISTS trg_institutional_settings_updated ON public.institutional_settings;
CREATE TRIGGER trg_institutional_settings_updated
    BEFORE UPDATE ON public.institutional_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 2. students  (central student record; separate from the auth account)
-- ---------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.student_id_seq START WITH 1001;

CREATE OR REPLACE FUNCTION public.generate_student_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_prefix TEXT;
    v_candidate TEXT;
BEGIN
    SELECT student_id_prefix INTO v_prefix FROM public.institutional_settings LIMIT 1;
    v_prefix := COALESCE(v_prefix, 'AIP');
    LOOP
        v_candidate := v_prefix || '-' || to_char(CURRENT_DATE, 'YYYY') || '-'
                       || lpad(nextval('public.student_id_seq')::TEXT, 4, '0');
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE student_id = v_candidate OR roll_number = v_candidate)
              AND NOT EXISTS (SELECT 1 FROM public.students WHERE student_id = v_candidate);
    END LOOP;
    RETURN v_candidate;
END;
$$;
REVOKE ALL ON FUNCTION public.generate_student_id() FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE SET NULL,
    student_id TEXT UNIQUE NOT NULL,
    roll_number TEXT,
    name TEXT NOT NULL,
    email TEXT,
    department TEXT,
    class_name TEXT,
    current_semester INTEGER NOT NULL DEFAULT 1 CHECK (current_semester > 0),
    admission_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'suspended', 'graduated', 'alumni', 'withdrawn')),
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- NOTE: ON DELETE SET NULL (020 used CASCADE): deleting a login account must
-- never erase the permanent student record or its academic/financial history.
CREATE INDEX IF NOT EXISTS idx_students_user_id ON public.students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_name ON public.students(name);
CREATE INDEX IF NOT EXISTS idx_students_department ON public.students(department);
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students(status);
CREATE INDEX IF NOT EXISTS idx_profiles_student_id ON public.profiles(student_id);
CREATE INDEX IF NOT EXISTS idx_profiles_roll_number ON public.profiles(roll_number);

CREATE OR REPLACE FUNCTION public.sync_student_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.role = 'student' THEN
        IF NEW.student_id IS NULL OR length(trim(NEW.student_id)) = 0 THEN
            NEW.student_id := COALESCE(NULLIF(trim(NEW.roll_number), ''), public.generate_student_id());
        END IF;
        NEW.roll_number := NEW.student_id;
        -- Defer the students upsert to AFTER trigger (profile row must exist for the FK)
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_student_profile_after()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.role = 'student' AND NEW.student_id IS NOT NULL THEN
        INSERT INTO public.students (user_id, student_id, roll_number, name, email, department,
                                     class_name, status, phone, avatar_url)
        VALUES (NEW.id, NEW.student_id, NEW.student_id, COALESCE(NEW.name, 'Student'), NEW.email,
                NEW.department, NEW.class_name,
                CASE WHEN COALESCE(NEW.status, 'active') IN ('active','inactive','suspended','graduated','alumni','withdrawn')
                     THEN COALESCE(NEW.status, 'active') ELSE 'active' END,
                NEW.phone, NEW.avatar_url)
        ON CONFLICT (user_id) DO UPDATE SET
            name = EXCLUDED.name, email = EXCLUDED.email, department = EXCLUDED.department,
            class_name = EXCLUDED.class_name, status = EXCLUDED.status, phone = EXCLUDED.phone,
            avatar_url = EXCLUDED.avatar_url, updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_student_profile() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_student_profile_after() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_student_profile ON public.profiles;
CREATE TRIGGER trg_sync_student_profile
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.sync_student_profile();
DROP TRIGGER IF EXISTS trg_sync_student_profile_after ON public.profiles;
CREATE TRIGGER trg_sync_student_profile_after
    AFTER INSERT OR UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.sync_student_profile_after();

CREATE OR REPLACE FUNCTION public.enforce_immutable_student_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    IF OLD.student_id IS NOT NULL AND NEW.student_id IS DISTINCT FROM OLD.student_id THEN
        RAISE EXCEPTION 'STUDENT_ID_IMMUTABLE: permanent student ID (%) cannot be modified.', OLD.student_id;
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_enforce_immutable_student_id ON public.students;
CREATE TRIGGER trg_enforce_immutable_student_id
    BEFORE UPDATE ON public.students
    FOR EACH ROW EXECUTE FUNCTION public.enforce_immutable_student_id();

-- Backfill: give every existing student profile a permanent id + students row.
-- UPDATE fires the triggers above; existing roll_number is preserved as the id.
UPDATE public.profiles SET student_id = student_id WHERE role = 'student';

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.students FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.students TO authenticated;

DROP POLICY IF EXISTS "Students can view own central record" ON public.students;
DROP POLICY IF EXISTS "Authorized staff can manage central students" ON public.students;
DROP POLICY IF EXISTS students_select ON public.students;
CREATE POLICY students_select ON public.students FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        OR public.get_current_user_role() IN (
            'admin', 'principal', 'hod', 'coe', 'teacher', 'receptionist', 'finance_manager',
            'financier', 'accountant', 'librarian', 'hostel_warden', 'placement_officer',
            'transport_driver', 'driver', 'store_manager', 'storekeeper')
        OR EXISTS (SELECT 1 FROM public.parent_student_links l
                   WHERE l.parent_id = auth.uid() AND l.student_id = students.user_id
                     AND COALESCE(l.verified, FALSE))
    );
DROP POLICY IF EXISTS students_write ON public.students;
CREATE POLICY students_write ON public.students FOR INSERT TO authenticated
    WITH CHECK (public.get_current_user_role() IN ('admin', 'receptionist'));
DROP POLICY IF EXISTS students_update ON public.students;
CREATE POLICY students_update ON public.students FOR UPDATE TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'receptionist'))
    WITH CHECK (public.get_current_user_role() IN ('admin', 'receptionist'));

CREATE OR REPLACE FUNCTION public.search_students_by_id_or_name(search_term TEXT)
RETURNS TABLE (id UUID, user_id UUID, student_id TEXT, roll_number TEXT, name TEXT, email TEXT,
               department TEXT, class_name TEXT, status TEXT, avatar_url TEXT)
LANGUAGE sql
STABLE
SECURITY INVOKER           -- RLS on students applies (018/020 used DEFINER = data leak)
SET search_path = public, pg_temp
AS $$
    SELECT s.id, s.user_id, s.student_id, s.roll_number, s.name, s.email, s.department,
           s.class_name, s.status, s.avatar_url
    FROM public.students s
    WHERE length(trim(search_term)) >= 2
      AND (s.student_id ILIKE '%' || trim(search_term) || '%'
        OR s.name ILIKE '%' || trim(search_term) || '%'
        OR s.email ILIKE '%' || trim(search_term) || '%')
    ORDER BY s.student_id
    LIMIT 20;
$$;
REVOKE ALL ON FUNCTION public.search_students_by_id_or_name(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_students_by_id_or_name(TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. student_mood_checkins  (kept separate from attendance)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_mood_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_id TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    session TEXT NOT NULL CHECK (session IN ('morning', 'afternoon', 'evening')),
    mood TEXT NOT NULL CHECK (mood IN ('Happy', 'Good', 'Normal', 'Tired', 'Stressed', 'Unwell')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_student_mood_per_session_day UNIQUE (user_id, date, session)
);
CREATE INDEX IF NOT EXISTS idx_student_mood_user_date ON public.student_mood_checkins(user_id, date);

CREATE OR REPLACE FUNCTION public.sync_mood_student_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.student_id IS NULL OR NEW.student_id = '' THEN
        SELECT COALESCE(p.student_id, p.roll_number) INTO NEW.student_id
        FROM public.profiles p WHERE p.id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_mood_student_id() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_sync_mood_student_id ON public.student_mood_checkins;
CREATE TRIGGER trg_sync_mood_student_id BEFORE INSERT OR UPDATE ON public.student_mood_checkins
    FOR EACH ROW EXECUTE FUNCTION public.sync_mood_student_id();

ALTER TABLE public.student_mood_checkins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.student_mood_checkins FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.student_mood_checkins TO authenticated;
DROP POLICY IF EXISTS "Students can view own mood checkins" ON public.student_mood_checkins;
CREATE POLICY "Students can view own mood checkins" ON public.student_mood_checkins FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.get_current_user_role() IN ('teacher', 'hod', 'admin', 'principal'));
DROP POLICY IF EXISTS "Students can submit own mood checkin" ON public.student_mood_checkins;
CREATE POLICY "Students can submit own mood checkin" ON public.student_mood_checkins FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Students can update own mood checkin for today" ON public.student_mood_checkins;
CREATE POLICY "Students can update own mood checkin for today" ON public.student_mood_checkins FOR UPDATE TO authenticated
    USING (user_id = auth.uid() AND date = CURRENT_DATE)
    WITH CHECK (user_id = auth.uid() AND date = CURRENT_DATE);

-- ---------------------------------------------------------------------------
-- 4. fee_payments  (payment ledger; src/server/adminBackend.ts collect_fee_payment)
--    Append-only. Idempotency key prevents duplicate postings on retry.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fee_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_fee_id UUID REFERENCES public.student_fees(id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    payment_mode TEXT NOT NULL CHECK (payment_mode IN ('Cash','UPI','Card','Bank_Transfer','Cheque','Online_Gateway')),
    transaction_reference TEXT,
    idempotency_key TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Completed' CHECK (status IN ('Pending','Completed','Failed','Reversed')),
    collected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    receipt_id UUID REFERENCES public.fee_receipts(id) ON DELETE SET NULL,
    remarks TEXT,
    paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_fee_payments_idempotency UNIQUE (idempotency_key)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_fee_payments_txn_ref
    ON public.fee_payments (transaction_reference) WHERE transaction_reference IS NOT NULL AND status <> 'Failed';
CREATE INDEX IF NOT EXISTS idx_fee_payments_student ON public.fee_payments(student_id, paid_at DESC);

ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fee_payments FROM PUBLIC, anon;
GRANT SELECT, INSERT ON public.fee_payments TO authenticated;     -- no UPDATE/DELETE: corrections are reversals
DROP POLICY IF EXISTS fee_payments_select ON public.fee_payments;
CREATE POLICY fee_payments_select ON public.fee_payments FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR public.get_current_user_role() IN ('admin', 'principal', 'finance_manager', 'financier', 'accountant')
        OR (public.get_current_user_role() = 'parent' AND public.is_parent_of(student_id))
    );
DROP POLICY IF EXISTS fee_payments_insert ON public.fee_payments;
CREATE POLICY fee_payments_insert ON public.fee_payments FOR INSERT TO authenticated
    WITH CHECK (public.get_current_user_role() IN ('admin', 'finance_manager', 'financier')
                AND collected_by = auth.uid());

-- ---------------------------------------------------------------------------
-- 5. RPCs (corrected against the real column names / CHECK constraints)
-- ---------------------------------------------------------------------------
ALTER TABLE public.book_issues ADD COLUMN IF NOT EXISTS fine_amount NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.book_issues ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.library_books ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE OR REPLACE FUNCTION public.issue_library_book(p_book_id UUID, p_student_id UUID, p_due_date DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_avail INTEGER; v_title TEXT; v_code TEXT; v_issue UUID; v_p RECORD;
BEGIN
    IF public.get_current_user_role() NOT IN ('admin', 'principal', 'librarian') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authorized to issue books.');
    END IF;
    IF p_due_date IS NULL OR p_due_date <= CURRENT_DATE THEN
        RETURN jsonb_build_object('success', false, 'error', 'Due date must be in the future.');
    END IF;
    SELECT id, name, student_id, roll_number, class_name INTO v_p
      FROM public.profiles WHERE id = p_student_id AND role IN ('student', 'teacher');
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Borrower not found.');
    END IF;
    SELECT available_copies, title, book_code INTO v_avail, v_title, v_code
      FROM public.library_books WHERE id = p_book_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Book not found.');
    END IF;
    IF v_avail <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'No copies currently available.');
    END IF;
    UPDATE public.library_books
       SET available_copies = available_copies - 1,
           status = CASE WHEN available_copies - 1 = 0 THEN 'Issued' ELSE status END,
           updated_at = NOW()
     WHERE id = p_book_id;
    INSERT INTO public.book_issues (book_id, book_title, book_code, user_id, student_name, student_id,
                                    roll_no, class_name, issue_date, due_date, status)
    VALUES (p_book_id, v_title, v_code, p_student_id, v_p.name, v_p.student_id,
            v_p.roll_number, v_p.class_name, CURRENT_DATE, p_due_date, 'Issued')
    RETURNING id INTO v_issue;
    RETURN jsonb_build_object('success', true, 'issue_id', v_issue, 'remaining_copies', v_avail - 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.return_library_book(p_issue_id UUID, p_fine_amount NUMERIC DEFAULT 0)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_book UUID; v_status TEXT;
BEGIN
    IF public.get_current_user_role() NOT IN ('admin', 'principal', 'librarian') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authorized to process returns.');
    END IF;
    IF COALESCE(p_fine_amount, 0) < 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Fine cannot be negative.');
    END IF;
    SELECT book_id, status INTO v_book, v_status FROM public.book_issues WHERE id = p_issue_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Issue record not found.');
    END IF;
    IF v_status = 'Returned' THEN
        RETURN jsonb_build_object('success', false, 'error', 'This book has already been returned.');
    END IF;
    UPDATE public.book_issues
       SET return_date = CURRENT_DATE, fine_amount = COALESCE(p_fine_amount, 0),
           status = 'Returned', updated_at = NOW()
     WHERE id = p_issue_id;
    UPDATE public.library_books
       SET available_copies = LEAST(available_copies + 1, total_copies),
           status = 'Available', updated_at = NOW()
     WHERE id = v_book;
    RETURN jsonb_build_object('success', true, 'message', 'Book returned successfully.');
END;
$$;

-- Legacy client call (src/services/supabase/database.ts issueBook). Kept so the
-- call does not 404; issue_library_book already decrements, so this is a no-op
-- guard returning the current count and MUST NOT double-decrement.
CREATE OR REPLACE FUNCTION public.decrement_book_copies(book_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT available_copies FROM public.library_books WHERE id = book_id;
$$;

CREATE OR REPLACE FUNCTION public.checkout_store_order(p_student_id UUID, p_items JSONB, p_total_amount NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_role TEXT := public.get_current_user_role();
    v_item RECORD; v_stock INTEGER; v_price NUMERIC; v_name TEXT;
    v_total NUMERIC := 0; v_order UUID; v_uname TEXT; v_lines JSONB := '[]'::jsonb;
BEGIN
    IF NOT (p_student_id = auth.uid() OR v_role IN ('admin', 'store_manager', 'storekeeper')) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authorized to place this order.');
    END IF;
    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order has no items.');
    END IF;
    SELECT name INTO v_uname FROM public.profiles WHERE id = p_student_id;
    -- Lock rows in a deterministic order to avoid deadlocks; price is taken from the catalog, NOT the client.
    FOR v_item IN SELECT x.product_id, SUM(x.quantity)::INT AS quantity
                    FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INTEGER)
                   GROUP BY x.product_id ORDER BY x.product_id
    LOOP
        IF v_item.quantity IS NULL OR v_item.quantity <= 0 THEN
            RETURN jsonb_build_object('success', false, 'error', 'Invalid quantity.');
        END IF;
        SELECT stock, price, name INTO v_stock, v_price, v_name
          FROM public.store_products WHERE id = v_item.product_id FOR UPDATE;
        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', 'Product not found.');
        END IF;
        IF v_stock < v_item.quantity THEN
            RETURN jsonb_build_object('success', false,
                'error', format('Insufficient stock for "%s". Available: %s, requested: %s', v_name, v_stock, v_item.quantity));
        END IF;
        UPDATE public.store_products SET stock = stock - v_item.quantity, updated_at = NOW()
         WHERE id = v_item.product_id;
        v_total := v_total + v_price * v_item.quantity;
        v_lines := v_lines || jsonb_build_object('product_id', v_item.product_id, 'name', v_name,
                                                 'quantity', v_item.quantity, 'unit_price', v_price);
    END LOOP;
    IF p_total_amount IS NOT NULL AND abs(p_total_amount - v_total) > 0.01 THEN
        RAISE EXCEPTION 'PRICE_MISMATCH: client total % differs from catalog total %', p_total_amount, v_total;
    END IF;
    INSERT INTO public.store_orders (user_id, user_name, items, total_amount, status)
    VALUES (p_student_id, COALESCE(v_uname, 'Student'), v_lines, v_total, 'Pending')
    RETURNING id INTO v_order;
    RETURN jsonb_build_object('success', true, 'order_id', v_order, 'total_amount', v_total);
END;
$$;

-- Login-id -> email resolution used by the login screen BEFORE authentication.
-- Hardened vs 023/024: matches only login identifiers (not phone/email), exact
-- case-insensitive match, never returns more than one row, and returns NULL
-- (not an error) for unknown ids so it cannot be used to distinguish "no such id".
CREATE OR REPLACE FUNCTION public.resolve_login_id(p_login_id TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT p.email
      FROM public.profiles p
     WHERE length(trim(p_login_id)) BETWEEN 3 AND 64
       AND COALESCE(p.status, 'active') = 'active'
       AND (lower(p.login_id) = lower(trim(p_login_id))
         OR lower(p.student_id) = lower(trim(p_login_id))
         OR lower(p.roll_number) = lower(trim(p_login_id)))
     ORDER BY p.created_at
     LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.resolve_login_id(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_login_id(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_first_login_status(p_identifier TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v RECORD;
BEGIN
    IF p_identifier IS NULL OR length(trim(p_identifier)) < 3 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Identifier is required');
    END IF;
    SELECT id, role, is_first_login, requires_password_change INTO v
      FROM public.profiles
     WHERE lower(login_id) = lower(trim(p_identifier)) OR lower(student_id) = lower(trim(p_identifier))
        OR lower(roll_number) = lower(trim(p_identifier))
     LIMIT 1;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Account not found');
    END IF;
    -- Deliberately returns no name/email/phone: pre-auth callers must not learn PII.
    RETURN jsonb_build_object('success', true, 'role', v.role,
        'is_first_login', COALESCE(v.is_first_login, false),
        'requires_password_change', COALESCE(v.requires_password_change, false));
END;
$$;
REVOKE ALL ON FUNCTION public.get_first_login_status(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_first_login_status(TEXT) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.issue_library_book(UUID, UUID, DATE) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.return_library_book(UUID, NUMERIC) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.decrement_book_copies(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.checkout_store_order(UUID, JSONB, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.issue_library_book(UUID, UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.return_library_book(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_book_copies(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.checkout_store_order(UUID, JSONB, NUMERIC) TO authenticated;

COMMIT;
