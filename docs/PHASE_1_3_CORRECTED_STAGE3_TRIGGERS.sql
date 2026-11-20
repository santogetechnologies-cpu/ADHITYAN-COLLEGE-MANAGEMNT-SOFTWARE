-- =============================================================================
-- Migration Script: 028_stage3_triggers.sql (Phase 1.3 Corrected Release)
-- Description: Security triggers, state machine concurrency & search_path lockdown
-- Architecture: Single-Institution Dedicated Deployment (Adhityan College)
-- Target Database: PostgreSQL 15+ (Supabase Managed Instance: ogbbyqxulhegwvrtinib.supabase.co)
-- Defects Remediated: DEF-001 (auth verification), DEF-105 (leave state machine),
--                     DEF-106 (privilege ceilings), DEF-107 (exam result student check),
--                     DEF-110 (catalog function search_path lockdown)
-- Safety Safeguards: Strict lock_timeout (3s) and statement_timeout (10s)
-- Mode: Static Engineering Specification (Zero Live Execution)
-- =============================================================================

SET lock_timeout = '3s';
SET statement_timeout = '10s';

BEGIN;

-- =============================================================================
-- HELPER: DETERMINISTIC ACADEMIC YEAR RESOLUTION
-- Computes June 1 to May 31 academic calendar cycle for higher education
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_academic_year_for_date(p_date DATE)
RETURNS TEXT AS $$
DECLARE
    v_year INT;
    v_month INT;
BEGIN
    IF p_date IS NULL THEN
        p_date := CURRENT_DATE;
    END IF;
    v_year := EXTRACT(YEAR FROM p_date)::INT;
    v_month := EXTRACT(MONTH FROM p_date)::INT;
    IF v_month >= 6 THEN
        RETURN v_year::TEXT || '-' || (v_year + 1)::TEXT;
    ELSE
        RETURN (v_year - 1)::TEXT || '-' || v_year::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE
SET search_path = public;

-- =============================================================================
-- 1. BUG-SEC-001 / DEF-001 / DEF-106: PROFILE SENSITIVE COLUMN PROTECTION TRIGGER
-- Enforces fail-closed multi-tier caller verification, blocks privilege escalation,
-- and prevents Principals from granting or revoking administrative privileges.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
RETURNS TRIGGER AS $$
DECLARE
    v_jwt_role TEXT;
    v_caller_role TEXT;
    v_caller_status TEXT;
BEGIN
    -- 1. Check for trusted backend service-role API execution via JWT claim
    BEGIN
        v_jwt_role := current_setting('request.jwt.claim.role', true);
    EXCEPTION WHEN OTHERS THEN
        v_jwt_role := NULL;
    END;

    IF v_jwt_role = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- 2. Check for physical direct database connection (CLI migrations, DBA maintenance)
    IF auth.uid() IS NULL AND session_user IN ('postgres', 'supabase_admin') THEN
        RETURN NEW;
    END IF;

    -- 3. Authenticated end-user invocation: query database profile for role and status
    SELECT role, status INTO v_caller_role, v_caller_status
    FROM public.profiles
    WHERE id = auth.uid();

    -- Fail-closed: missing caller profile or non-active account is forbidden
    IF v_caller_role IS NULL OR v_caller_status IS DISTINCT FROM 'active' THEN
        RAISE EXCEPTION 'Access Denied: Unregistered, missing or inactive account.' 
            USING ERRCODE = '42501';
    END IF;

    -- DEF-106: Principal Privilege Ceiling Enforcement
    -- A Principal cannot grant the 'admin' role or revoke an existing 'admin' role.
    IF v_caller_role = 'principal' AND (NEW.role = 'admin' OR OLD.role = 'admin') THEN
        RAISE EXCEPTION 'Security Violation: Principal cannot grant or revoke administrative privileges.' 
            USING ERRCODE = '42501';
    END IF;

    -- Institutional Administrator can modify any profile field
    IF v_caller_role = 'admin' THEN
        RETURN NEW;
    END IF;

    -- Principal can manage academic and staff roles (excluding admin, protected above)
    IF v_caller_role = 'principal' THEN
        RETURN NEW;
    END IF;

    -- Non-administrative callers cannot modify sensitive security/identity columns
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'Security Violation: Profile role modification requires administrator privileges.' 
            USING ERRCODE = '42501';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
        RAISE EXCEPTION 'Security Violation: Profile status modification requires administrator privileges.' 
            USING ERRCODE = '42501';
    END IF;

    IF NEW.student_id IS DISTINCT FROM OLD.student_id THEN
        RAISE EXCEPTION 'Security Violation: Profile student_id modification requires administrator privileges.' 
            USING ERRCODE = '42501';
    END IF;

    IF NEW.roll_number IS DISTINCT FROM OLD.roll_number THEN
        RAISE EXCEPTION 'Security Violation: Profile roll_number modification requires administrator privileges.' 
            USING ERRCODE = '42501';
    END IF;

    IF NEW.login_id IS DISTINCT FROM OLD.login_id THEN
        RAISE EXCEPTION 'Security Violation: Profile login_id modification requires administrator privileges.' 
            USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

DROP TRIGGER IF EXISTS trg_protect_profile_sensitive_columns ON public.profiles;

CREATE TRIGGER trg_protect_profile_sensitive_columns
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_profile_sensitive_columns();

-- =============================================================================
-- 2. DEF-107: EXAM RESULT STUDENT IDENTITY VERIFICATION TRIGGER
-- Guarantees referenced student exists as an enrolled student profile in the database.
-- Eliminates placeholder/synthetic names ('Student ' || id).
-- =============================================================================
CREATE OR REPLACE FUNCTION public.set_exam_result_student_name()
RETURNS TRIGGER AS $$
DECLARE
    v_real_name TEXT;
BEGIN
    IF NEW.student_id IS NULL THEN
        RAISE EXCEPTION 'Integrity Violation: student_id cannot be null for exam result.' 
            USING ERRCODE = '23502';
    END IF;

    SELECT name INTO v_real_name 
    FROM public.profiles 
    WHERE id = NEW.student_id AND role = 'student';

    IF v_real_name IS NULL THEN
        RAISE EXCEPTION 'Integrity Violation: Referenced student profile (%) does not exist or is not an enrolled student.', NEW.student_id 
            USING ERRCODE = '23503';
    END IF;

    NEW.student_name := v_real_name;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

DROP TRIGGER IF EXISTS trg_set_exam_result_student_name ON public.exam_results;

CREATE TRIGGER trg_set_exam_result_student_name
    BEFORE INSERT OR UPDATE ON public.exam_results
    FOR EACH ROW
    EXECUTE FUNCTION public.set_exam_result_student_name();

-- =============================================================================
-- 3. BUG-HR-001 / DEF-002-004 / DEF-105: STAFF LEAVE BALANCE TRANSITION ENGINE
-- Dynamic academic year derivation, two-phase reverse/apply ledger pattern,
-- deadlock-free row locking (ORDER BY user_id, academic_year), zero negative clamping.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.sync_staff_leave_balance_transition()
RETURNS TRIGGER AS $$
DECLARE
    v_old_year TEXT;
    v_new_year TEXT;
    v_old_type TEXT;
    v_new_type TEXT;
    v_first_user UUID;
    v_second_user UUID;
    v_first_year TEXT;
    v_second_year TEXT;
BEGIN
    -- Determine academic year dynamically from leave application dates
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        v_old_year := public.get_academic_year_for_date(OLD.start_date);
        v_old_type := LOWER(TRIM(OLD.leave_type));
    END IF;

    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        v_new_year := public.get_academic_year_for_date(NEW.start_date);
        v_new_type := LOWER(TRIM(NEW.leave_type));
    END IF;

    -- -------------------------------------------------------------------------
    -- CASE A: DELETION of an Approved Leave Application -> Reverse Old Balance
    -- -------------------------------------------------------------------------
    IF TG_OP = 'DELETE' THEN
        IF OLD.status = 'Approved' THEN
            -- Pessimistic lock on staff leave balance row
            PERFORM id FROM public.staff_leave_balances 
            WHERE user_id = OLD.user_id AND academic_year = v_old_year 
            FOR UPDATE;

            IF v_old_type LIKE '%casual%' THEN
                UPDATE public.staff_leave_balances 
                SET casual_leave_taken = casual_leave_taken - OLD.total_days, updated_at = NOW()
                WHERE user_id = OLD.user_id AND academic_year = v_old_year;
            ELSIF v_old_type LIKE '%sick%' OR v_old_type LIKE '%med%' THEN
                UPDATE public.staff_leave_balances 
                SET sick_leave_taken = sick_leave_taken - OLD.total_days, updated_at = NOW()
                WHERE user_id = OLD.user_id AND academic_year = v_old_year;
            ELSIF v_old_type LIKE '%earn%' THEN
                UPDATE public.staff_leave_balances 
                SET earned_leave_taken = earned_leave_taken - OLD.total_days, updated_at = NOW()
                WHERE user_id = OLD.user_id AND academic_year = v_old_year;
            END IF;
        END IF;
        RETURN OLD;
    END IF;

    -- -------------------------------------------------------------------------
    -- CASE B: INSERTION of an Approved Leave Application -> Apply New Balance
    -- -------------------------------------------------------------------------
    IF TG_OP = 'INSERT' THEN
        IF NEW.status = 'Approved' THEN
            -- Ensure balance row exists and lock it
            INSERT INTO public.staff_leave_balances (user_id, academic_year, casual_leave_total, casual_leave_taken, sick_leave_total, sick_leave_taken, earned_leave_total, earned_leave_taken)
            VALUES (NEW.user_id, v_new_year, 12, 0, 10, 0, 15, 0)
            ON CONFLICT (user_id, academic_year) DO NOTHING;

            PERFORM id FROM public.staff_leave_balances 
            WHERE user_id = NEW.user_id AND academic_year = v_new_year 
            FOR UPDATE;

            IF v_new_type LIKE '%casual%' THEN
                UPDATE public.staff_leave_balances 
                SET casual_leave_taken = casual_leave_taken + NEW.total_days, updated_at = NOW()
                WHERE user_id = NEW.user_id AND academic_year = v_new_year;
            ELSIF v_new_type LIKE '%sick%' OR v_new_type LIKE '%med%' THEN
                UPDATE public.staff_leave_balances 
                SET sick_leave_taken = sick_leave_taken + NEW.total_days, updated_at = NOW()
                WHERE user_id = NEW.user_id AND academic_year = v_new_year;
            ELSIF v_new_type LIKE '%earn%' THEN
                UPDATE public.staff_leave_balances 
                SET earned_leave_taken = earned_leave_taken + NEW.total_days, updated_at = NOW()
                WHERE user_id = NEW.user_id AND academic_year = v_new_year;
            END IF;
        END IF;
        RETURN NEW;
    END IF;

    -- -------------------------------------------------------------------------
    -- CASE C: UPDATE of Leave Application (Two-Phase Reverse & Apply)
    -- -------------------------------------------------------------------------
    IF TG_OP = 'UPDATE' THEN
        -- If neither old nor new is Approved, no balance mutation occurs
        IF OLD.status <> 'Approved' AND NEW.status <> 'Approved' THEN
            RETURN NEW;
        END IF;

        -- Subcase C1: In-Place Same Employee, Same Academic Year, Same Leave Type
        IF OLD.status = 'Approved' AND NEW.status = 'Approved' 
           AND OLD.user_id = NEW.user_id 
           AND v_old_year = v_new_year 
           AND v_old_type = v_new_type THEN
            
            IF OLD.total_days <> NEW.total_days THEN
                PERFORM id FROM public.staff_leave_balances 
                WHERE user_id = NEW.user_id AND academic_year = v_new_year 
                FOR UPDATE;

                IF v_new_type LIKE '%casual%' THEN
                    UPDATE public.staff_leave_balances 
                    SET casual_leave_taken = casual_leave_taken + (NEW.total_days - OLD.total_days), updated_at = NOW()
                    WHERE user_id = NEW.user_id AND academic_year = v_new_year;
                ELSIF v_new_type LIKE '%sick%' OR v_new_type LIKE '%med%' THEN
                    UPDATE public.staff_leave_balances 
                    SET sick_leave_taken = sick_leave_taken + (NEW.total_days - OLD.total_days), updated_at = NOW()
                    WHERE user_id = NEW.user_id AND academic_year = v_new_year;
                ELSIF v_new_type LIKE '%earn%' THEN
                    UPDATE public.staff_leave_balances 
                    SET earned_leave_taken = earned_leave_taken + (NEW.total_days - OLD.total_days), updated_at = NOW()
                    WHERE user_id = NEW.user_id AND academic_year = v_new_year;
                END IF;
            END IF;
            RETURN NEW;
        END IF;

        -- Subcase C2: Transition involving state change, employee reassignment, or leave reclassification
        -- Lock affected balance rows in deterministic order to eliminate deadlock risks
        IF OLD.status = 'Approved' AND NEW.status = 'Approved' 
           AND (OLD.user_id <> NEW.user_id OR v_old_year <> v_new_year) THEN
            IF (OLD.user_id, v_old_year) < (NEW.user_id, v_new_year) THEN
                PERFORM id FROM public.staff_leave_balances WHERE user_id = OLD.user_id AND academic_year = v_old_year FOR UPDATE;
                PERFORM id FROM public.staff_leave_balances WHERE user_id = NEW.user_id AND academic_year = v_new_year FOR UPDATE;
            ELSE
                PERFORM id FROM public.staff_leave_balances WHERE user_id = NEW.user_id AND academic_year = v_new_year FOR UPDATE;
                PERFORM id FROM public.staff_leave_balances WHERE user_id = OLD.user_id AND academic_year = v_old_year FOR UPDATE;
            END IF;
        ELSE
            IF OLD.status = 'Approved' THEN
                PERFORM id FROM public.staff_leave_balances WHERE user_id = OLD.user_id AND academic_year = v_old_year FOR UPDATE;
            END IF;
            IF NEW.status = 'Approved' THEN
                INSERT INTO public.staff_leave_balances (user_id, academic_year, casual_leave_total, casual_leave_taken, sick_leave_total, sick_leave_taken, earned_leave_total, earned_leave_taken)
                VALUES (NEW.user_id, v_new_year, 12, 0, 10, 0, 15, 0)
                ON CONFLICT (user_id, academic_year) DO NOTHING;
                PERFORM id FROM public.staff_leave_balances WHERE user_id = NEW.user_id AND academic_year = v_new_year FOR UPDATE;
            END IF;
        END IF;

        -- Phase 1: Reverse Old Balance if it was previously Approved
        IF OLD.status = 'Approved' THEN
            IF v_old_type LIKE '%casual%' THEN
                UPDATE public.staff_leave_balances 
                SET casual_leave_taken = casual_leave_taken - OLD.total_days, updated_at = NOW()
                WHERE user_id = OLD.user_id AND academic_year = v_old_year;
            ELSIF v_old_type LIKE '%sick%' OR v_old_type LIKE '%med%' THEN
                UPDATE public.staff_leave_balances 
                SET sick_leave_taken = sick_leave_taken - OLD.total_days, updated_at = NOW()
                WHERE user_id = OLD.user_id AND academic_year = v_old_year;
            ELSIF v_old_type LIKE '%earn%' THEN
                UPDATE public.staff_leave_balances 
                SET earned_leave_taken = earned_leave_taken - OLD.total_days, updated_at = NOW()
                WHERE user_id = OLD.user_id AND academic_year = v_old_year;
            END IF;
        END IF;

        -- Phase 2: Apply New Balance if it is now Approved
        IF NEW.status = 'Approved' THEN
            IF v_new_type LIKE '%casual%' THEN
                UPDATE public.staff_leave_balances 
                SET casual_leave_taken = casual_leave_taken + NEW.total_days, updated_at = NOW()
                WHERE user_id = NEW.user_id AND academic_year = v_new_year;
            ELSIF v_new_type LIKE '%sick%' OR v_new_type LIKE '%med%' THEN
                UPDATE public.staff_leave_balances 
                SET sick_leave_taken = sick_leave_taken + NEW.total_days, updated_at = NOW()
                WHERE user_id = NEW.user_id AND academic_year = v_new_year;
            ELSIF v_new_type LIKE '%earn%' THEN
                UPDATE public.staff_leave_balances 
                SET earned_leave_taken = earned_leave_taken + NEW.total_days, updated_at = NOW()
                WHERE user_id = NEW.user_id AND academic_year = v_new_year;
            END IF;
        END IF;

        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_staff_leave_balance ON public.staff_leave_applications;

CREATE TRIGGER trg_sync_staff_leave_balance
    AFTER INSERT OR UPDATE OR DELETE ON public.staff_leave_applications
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_staff_leave_balance_transition();

-- =============================================================================
-- 4. BUG-SEC-002: HARDEN GET_CURRENT_USER_ROLE() (Fail-Closed & Search Path)
-- Suspended or inactive users return NULL to prevent RLS role assumption
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role INTO v_role 
    FROM public.profiles 
    WHERE id = auth.uid() AND status = 'active';
    RETURN v_role;
END;
$$;

-- =============================================================================
-- 5. DEF-005 & DEF-110: SEARCH_PATH LOCKDOWN FOR ALL LIVE SECURITY DEFINER FUNCTIONS
-- Explicitly hardens all 10 live catalog functions against search_path injection
-- =============================================================================
ALTER FUNCTION public.get_current_user_role() SET search_path = public;
ALTER FUNCTION public.is_parent_of(uuid) SET search_path = public;
ALTER FUNCTION public.notify_certificate_status() SET search_path = public;
ALTER FUNCTION public.notify_fee_payment() SET search_path = public;
ALTER FUNCTION public.notify_new_admission() SET search_path = public;
ALTER FUNCTION public.notify_new_assignment() SET search_path = public;
ALTER FUNCTION public.notify_new_concern() SET search_path = public;
ALTER FUNCTION public.notify_store_order() SET search_path = public;
ALTER FUNCTION public.place_store_order(uuid, text, jsonb, numeric) SET search_path = public;
ALTER FUNCTION public.rls_auto_enable() SET search_path = pg_catalog;

COMMIT;
