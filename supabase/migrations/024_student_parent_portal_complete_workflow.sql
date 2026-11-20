-- =============================================================================
-- Migration: 024_student_parent_portal_complete_workflow.sql
-- Description: Automatic Account Creation, First Login Verification,
--              Multi-Child Parent-Student RLS, and Centralized ID Generation
-- =============================================================================

-- 1. Ensure Columns Exist on public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS student_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS login_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_login_completed BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS requires_password_change BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMPTZ;

-- Indices on identifiers
CREATE INDEX IF NOT EXISTS idx_profiles_student_id ON public.profiles(student_id);
CREATE INDEX IF NOT EXISTS idx_profiles_login_id ON public.profiles(login_id);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- 2. Sequences for Permanent Human-Readable IDs
CREATE SEQUENCE IF NOT EXISTS public.student_id_seq START WITH 1001;
CREATE SEQUENCE IF NOT EXISTS public.parent_id_seq START WITH 1001;

-- 3. Function to Generate Formatted Unique Student ID: STU-YYYY-NNNN
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
        v_candidate := 'STU-' || v_year || '-' || lpad(v_seq_num::text, 4, '0');
        
        SELECT EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE student_id = v_candidate OR roll_number = v_candidate OR login_id = v_candidate
        ) INTO v_exists;
        
        IF NOT v_exists THEN
            RETURN v_candidate;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 4. Function to Generate Formatted Unique Parent ID: PAR-YYYY-NNNN
CREATE OR REPLACE FUNCTION public.generate_parent_id()
RETURNS TEXT AS $$
DECLARE
    v_year TEXT;
    v_seq_num BIGINT;
    v_candidate TEXT;
    v_exists BOOLEAN;
BEGIN
    v_year := to_char(CURRENT_DATE, 'YYYY');
    LOOP
        v_seq_num := nextval('public.parent_id_seq');
        v_candidate := 'PAR-' || v_year || '-' || lpad(v_seq_num::text, 4, '0');
        
        SELECT EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE login_id = v_candidate
        ) INTO v_exists;
        
        IF NOT v_exists THEN
            RETURN v_candidate;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 5. Enhanced Resolver RPC: Resolves Student ID, Parent ID, Phone, or Email to Auth Email
CREATE OR REPLACE FUNCTION public.resolve_login_id(p_login_id text)
RETURNS text AS $$
DECLARE
    v_email text;
    v_clean text;
BEGIN
    IF p_login_id IS NULL OR TRIM(p_login_id) = '' THEN
        RETURN NULL;
    END IF;

    v_clean := TRIM(p_login_id);

    SELECT email INTO v_email
    FROM public.profiles
    WHERE LOWER(TRIM(login_id)) = LOWER(v_clean)
       OR LOWER(TRIM(student_id)) = LOWER(v_clean)
       OR LOWER(TRIM(roll_number)) = LOWER(v_clean)
       OR LOWER(TRIM(email)) = LOWER(v_clean)
       OR (phone IS NOT NULL AND TRIM(phone) = v_clean)
    LIMIT 1;

    RETURN v_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.resolve_login_id(text) TO anon, authenticated;

-- 6. RPC to Fetch User First Login Status
CREATE OR REPLACE FUNCTION public.get_first_login_status(p_identifier text)
RETURNS jsonb AS $$
DECLARE
    v_user RECORD;
    v_clean text;
BEGIN
    IF p_identifier IS NULL OR TRIM(p_identifier) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Identifier is required');
    END IF;

    v_clean := TRIM(p_identifier);

    SELECT id, email, name, role, phone, student_id, login_id, is_first_login, requires_password_change
    INTO v_user
    FROM public.profiles
    WHERE LOWER(TRIM(login_id)) = LOWER(v_clean)
       OR LOWER(TRIM(student_id)) = LOWER(v_clean)
       OR LOWER(TRIM(roll_number)) = LOWER(v_clean)
       OR LOWER(TRIM(email)) = LOWER(v_clean)
       OR (phone IS NOT NULL AND TRIM(phone) = v_clean)
    LIMIT 1;

    IF v_user.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No institutional account found matching this identifier');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_user.id,
        'email', v_user.email,
        'name', v_user.name,
        'role', v_user.role,
        'is_first_login', COALESCE(v_user.is_first_login, false),
        'requires_password_change', COALESCE(v_user.requires_password_change, false),
        'student_id', v_user.student_id,
        'login_id', v_user.login_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_first_login_status(text) TO anon, authenticated;

-- 7. Ensure RLS Allows Parents to View Linked Children's Academic Records
DROP POLICY IF EXISTS "Parents can view linked children attendance" ON public.student_attendance;
CREATE POLICY "Parents can view linked children attendance"
    ON public.student_attendance FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR student_id IN (
            SELECT psl.student_id FROM public.parent_student_links psl
            WHERE psl.parent_id = auth.uid() AND psl.verified = true
        )
        OR public.get_current_user_role() IN ('admin', 'principal', 'teacher', 'receptionist')
    );

DROP POLICY IF EXISTS "Parents can view linked children exam results" ON public.exam_results;
CREATE POLICY "Parents can view linked children exam results"
    ON public.exam_results FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR student_id IN (
            SELECT psl.student_id FROM public.parent_student_links psl
            WHERE psl.parent_id = auth.uid() AND psl.verified = true
        )
        OR public.get_current_user_role() IN ('admin', 'principal', 'teacher')
    );

DROP POLICY IF EXISTS "Parents can view linked children fees" ON public.student_fees;
CREATE POLICY "Parents can view linked children fees"
    ON public.student_fees FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR student_id IN (
            SELECT psl.student_id FROM public.parent_student_links psl
            WHERE psl.parent_id = auth.uid() AND psl.verified = true
        )
        OR public.get_current_user_role() IN ('admin', 'principal', 'finance_manager', 'financier', 'accountant', 'receptionist')
    );

DROP POLICY IF EXISTS "Parents can view linked children fee receipts" ON public.fee_receipts;
CREATE POLICY "Parents can view linked children fee receipts"
    ON public.fee_receipts FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR student_id IN (
            SELECT psl.student_id FROM public.parent_student_links psl
            WHERE psl.parent_id = auth.uid() AND psl.verified = true
        )
        OR public.get_current_user_role() IN ('admin', 'principal', 'finance_manager', 'financier', 'accountant', 'receptionist')
    );

