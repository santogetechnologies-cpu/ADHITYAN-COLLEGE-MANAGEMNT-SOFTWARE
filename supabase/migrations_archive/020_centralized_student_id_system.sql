-- =============================================================================
-- MIGRATION 020: CENTRALIZED UNIQUE STUDENT ID SYSTEM & DATA ARCHITECTURE
-- Institution: Adithyan Institute of Paramedical
-- =============================================================================

-- 1. Create a permanent institutional sequence for Student IDs
CREATE SEQUENCE IF NOT EXISTS public.student_id_seq START WITH 1001;

-- 2. Function to generate a formatted, unique, immutable Student ID
-- Format: AIP-YYYY-NNNN (e.g. AIP-2025-1001)
CREATE OR REPLACE FUNCTION public.generate_student_id()
RETURNS TEXT AS $$
DECLARE
    v_year TEXT;
    v_seq_num BIGINT;
    v_candidate TEXT;
    v_exists BOOLEAN;
BEGIN
    v_year := to_char(CURRENT_DATE, 'YYYY');
    LOOP
        v_seq_num := nextval('public.student_id_seq');
        v_candidate := 'AIP-' || v_year || '-' || lpad(v_seq_num::text, 4, '0');
        
        -- Verify candidate does not collide in profiles or students
        SELECT EXISTS (
            SELECT 1 FROM public.profiles WHERE roll_number = v_candidate
        ) INTO v_exists;
        
        IF NOT v_exists THEN
            RETURN v_candidate;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 3. Enhance PROFILES table with explicit student_id column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS student_id TEXT;

-- Create index and unique constraint on student_id for student role
CREATE INDEX IF NOT EXISTS idx_profiles_student_id ON public.profiles(student_id);
CREATE INDEX IF NOT EXISTS idx_profiles_roll_number ON public.profiles(roll_number);

-- 4. Central STUDENTS table as the Single Source of Truth
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_id TEXT UNIQUE NOT NULL,
    roll_number TEXT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    department TEXT NOT NULL DEFAULT 'Paramedical Sciences',
    class_name TEXT DEFAULT 'Current Term',
    current_semester INTEGER NOT NULL DEFAULT 1,
    admission_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'graduated', 'alumni')),
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_students_student_id ON public.students(student_id);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON public.students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_name ON public.students(name);
CREATE INDEX IF NOT EXISTS idx_students_department ON public.students(department);
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students(status);

-- 5. Data Migration: Backfill existing students into central students table
DO $$
DECLARE
    r RECORD;
    v_new_id TEXT;
BEGIN
    FOR r IN SELECT id, name, email, department, class_name, roll_number, phone, avatar_url, status 
             FROM public.profiles 
             WHERE role = 'student'
    LOOP
        -- Determine or generate permanent Student ID
        IF r.roll_number IS NOT NULL AND length(trim(r.roll_number)) > 0 THEN
            v_new_id := trim(r.roll_number);
        ELSE
            v_new_id := public.generate_student_id();
        END IF;

        -- Update profiles with student_id and synced roll_number
        UPDATE public.profiles 
        SET student_id = v_new_id, 
            roll_number = v_new_id 
        WHERE id = r.id;

        -- Upsert into central students table
        INSERT INTO public.students (
            user_id,
            student_id,
            roll_number,
            name,
            email,
            department,
            class_name,
            current_semester,
            status,
            phone,
            avatar_url
        ) VALUES (
            r.id,
            v_new_id,
            v_new_id,
            r.name,
            r.email,
            COALESCE(r.department, 'Paramedical Sciences'),
            COALESCE(r.class_name, 'Current Term'),
            1,
            COALESCE(r.status, 'active'),
            r.phone,
            r.avatar_url
        ) ON CONFLICT (user_id) DO UPDATE SET
            student_id = EXCLUDED.student_id,
            roll_number = EXCLUDED.roll_number,
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            department = EXCLUDED.department,
            class_name = EXCLUDED.class_name,
            status = EXCLUDED.status,
            phone = EXCLUDED.phone,
            avatar_url = EXCLUDED.avatar_url,
            updated_at = NOW();
    END LOOP;
END;
$$;

-- 6. Trigger: Auto-generate student_id and sync profiles <-> students
CREATE OR REPLACE FUNCTION public.sync_student_profile()
RETURNS TRIGGER AS $$
DECLARE
    v_generated_id TEXT;
BEGIN
    IF NEW.role = 'student' THEN
        -- Auto-generate Student ID if missing
        IF NEW.student_id IS NULL OR length(trim(NEW.student_id)) = 0 THEN
            IF NEW.roll_number IS NOT NULL AND length(trim(NEW.roll_number)) > 0 THEN
                NEW.student_id := trim(NEW.roll_number);
            ELSE
                NEW.student_id := public.generate_student_id();
            END IF;
        END IF;

        -- Keep roll_number identical to student_id for consistency
        NEW.roll_number := NEW.student_id;

        -- Insert or update central students record
        INSERT INTO public.students (
            user_id,
            student_id,
            roll_number,
            name,
            email,
            department,
            class_name,
            status,
            phone,
            avatar_url
        ) VALUES (
            NEW.id,
            NEW.student_id,
            NEW.student_id,
            NEW.name,
            NEW.email,
            COALESCE(NEW.department, 'Paramedical Sciences'),
            COALESCE(NEW.class_name, 'Current Term'),
            COALESCE(NEW.status, 'active'),
            NEW.phone,
            NEW.avatar_url
        ) ON CONFLICT (user_id) DO UPDATE SET
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            department = EXCLUDED.department,
            class_name = EXCLUDED.class_name,
            status = EXCLUDED.status,
            phone = EXCLUDED.phone,
            avatar_url = EXCLUDED.avatar_url,
            updated_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_student_profile ON public.profiles;
CREATE TRIGGER trg_sync_student_profile
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_student_profile();

-- 7. Immutability Trigger on students.student_id: Prevent tampering or changing Student ID
CREATE OR REPLACE FUNCTION public.enforce_immutable_student_id()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.student_id IS NOT NULL AND NEW.student_id <> OLD.student_id THEN
        RAISE EXCEPTION 'STUDENT_ID_IMMUTABLE: Permanent institutional Student ID (%) cannot be modified.', OLD.student_id;
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_immutable_student_id ON public.students;
CREATE TRIGGER trg_enforce_immutable_student_id
    BEFORE UPDATE ON public.students
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_immutable_student_id();

-- 8. Row Level Security on STUDENTS table
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own central record" ON public.students;
CREATE POLICY "Students can view own central record"
    ON public.students FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid() OR
        public.get_current_user_role() IN (
            'admin', 'principal', 'teacher', 'receptionist', 
            'finance_manager', 'financier', 'accountant',
            'store_manager', 'storekeeper', 'transport_driver', 'driver'
        ) OR EXISTS (
            SELECT 1 FROM public.parent_student_links
            WHERE parent_id = auth.uid() AND student_id = public.students.user_id AND verified = true
        )
    );

DROP POLICY IF EXISTS "Authorized staff can manage central students" ON public.students;
CREATE POLICY "Authorized staff can manage central students"
    ON public.students FOR ALL
    TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'receptionist'))
    WITH CHECK (public.get_current_user_role() IN ('admin', 'receptionist'));

-- 9. RPC Function: Search Students with complete demographic safety
CREATE OR REPLACE FUNCTION public.search_students_by_id_or_name(search_term TEXT)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    student_id TEXT,
    roll_number TEXT,
    name TEXT,
    email TEXT,
    department TEXT,
    class_name TEXT,
    status TEXT,
    avatar_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.user_id,
        s.student_id,
        s.roll_number,
        s.name,
        s.email,
        s.department,
        s.class_name,
        s.status,
        s.avatar_url
    FROM public.students s
    WHERE 
        s.student_id ILIKE '%' || search_term || '%' OR
        s.name ILIKE '%' || search_term || '%' OR
        s.email ILIKE '%' || search_term || '%'
    ORDER BY s.student_id ASC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

