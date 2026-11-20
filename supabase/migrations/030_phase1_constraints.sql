-- =============================================================================
-- Migration Script: 028_stage2_constraints.sql (Phase 1.4.1 Final Consolidated Release)
-- Description: Business integrity constraints, institutional taxonomy & identity keys
-- Architecture: Single-Institution Dedicated Deployment (Adhityan College)
-- Target Database: PostgreSQL 15+ (Supabase Managed Instance: ogbbyqxulhegwvrtinib.supabase.co)
-- Defects Remediated: DEF-011 (single authoritative normalized attendance uniqueness index),
--                     DEF-012 (login_id validation), DEF-107 (preflight role validation & whitelist),
--                     DEF-123 (preflight duplicate detection & single uniqueness strategy),
--                     DEF-126 (prevent NULL roles & statuses, staff leave non-negative balance constraints)
-- Safety Safeguards: Strict lock_timeout (3s) and statement_timeout (10s)
-- Mode: Static Engineering Specification (Zero Live Execution)
-- =============================================================================

SET lock_timeout = '3s';
SET statement_timeout = '10s';

BEGIN;

-- =============================================================================
-- 1. INSTITUTIONAL ROLE TAXONOMY & NOT NULL CONSTRAINT (19 Primary Roles + 1 Alias)
-- Preflights existing rows to prevent silent data conversion or failure.
-- Enforces NOT NULL at column and check level to block future NULL insertions.
-- =============================================================================
DO $$
DECLARE
    v_invalid_roles INT;
BEGIN
    SELECT COUNT(*) INTO v_invalid_roles
    FROM public.profiles
    WHERE role NOT IN (
        'admin',              -- Institutional Super Admin & IT Systems Administrator
        'principal',          -- Head of Institution & Academic Executive
        'teacher',            -- Faculty, Course Instructor & Class Advisor
        'hod',                -- Head of Department
        'coe',                -- Controller of Examinations
        'student',            -- Enrolled Institutional Scholar
        'parent',             -- Verified Guardian of Enrolled Student
        'finance_manager',    -- Head of Accounts, Billing & Fee Structures
        'accountant',         -- Fee Collection & Operational Accounts
        'financier',          -- Financial Auditor & Executive Reviewer
        'store_manager',      -- Campus Store & Uniform Inventory Manager
        'storekeeper',        -- Point-of-Sale Clerk & Inventory Dispatch
        'transport_driver',   -- Institutional Vehicle Operator (Primary Role)
        'driver',             -- Operational alias of transport_driver
        'receptionist',       -- Front Desk Visitor & Enquiry Officer
        'naac_coordinator',   -- Accreditation & Institutional Quality Cell
        'hr_manager',         -- Staff Records, Payroll & Leave Administrator
        'librarian',          -- Library Assets & Book Circulation Officer
        'hostel_warden',      -- Student Housing & Out-Pass Administrator
        'placement_officer'   -- Career Services, Internships & Corporate Drives
    ) OR role IS NULL;

    IF v_invalid_roles > 0 THEN
        RAISE EXCEPTION 'Preflight Failure: public.profiles contains % rows with unrecognized or NULL roles. Manual remediation required.', v_invalid_roles;
    END IF;
END $$;

ALTER TABLE public.profiles 
    ALTER COLUMN role SET NOT NULL;

ALTER TABLE public.profiles 
    DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_role_check CHECK (
        role IS NOT NULL AND role IN (
            'admin', 'principal', 'teacher', 'hod', 'coe', 'student', 'parent',
            'finance_manager', 'accountant', 'financier', 'store_manager', 'storekeeper',
            'transport_driver', 'driver', 'receptionist', 'naac_coordinator', 'hr_manager',
            'librarian', 'hostel_warden', 'placement_officer'
        )
    );

-- =============================================================================
-- 2. ACCOUNT STATUS MACHINE & NOT NULL CONSTRAINT
-- Preflights status values to ensure no orphan states exist.
-- Enforces NOT NULL to guarantee valid lifecycle state for every identity.
-- =============================================================================
DO $$
DECLARE
    v_invalid_status INT;
BEGIN
    SELECT COUNT(*) INTO v_invalid_status
    FROM public.profiles
    WHERE status NOT IN ('active', 'inactive', 'suspended') OR status IS NULL;

    IF v_invalid_status > 0 THEN
        RAISE EXCEPTION 'Preflight Failure: public.profiles contains % rows with unrecognized or NULL status. Manual remediation required.', v_invalid_status;
    END IF;
END $$;

ALTER TABLE public.profiles 
    ALTER COLUMN status SET NOT NULL;

ALTER TABLE public.profiles 
    DROP CONSTRAINT IF EXISTS profiles_status_check;

ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_status_check CHECK (
        status IS NOT NULL AND status IN ('active', 'inactive', 'suspended')
    );

-- =============================================================================
-- 3. LOGIN IDENTIFIER VALIDATION & CASE-INSENSITIVE UNIQUE INDEX
-- DEF-012: Prevents empty string collisions while allowing NULL for uninvited accounts
-- =============================================================================
ALTER TABLE public.profiles 
    DROP CONSTRAINT IF EXISTS profiles_login_id_check;

ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_login_id_check 
    CHECK (login_id IS NULL OR LENGTH(TRIM(login_id)) >= 3);

-- Preflight duplicate login_id check
DO $$
DECLARE
    v_dup_logins INT;
BEGIN
    SELECT COUNT(*) INTO v_dup_logins FROM (
        SELECT LOWER(TRIM(login_id))
        FROM public.profiles
        WHERE login_id IS NOT NULL AND TRIM(login_id) <> ''
        GROUP BY LOWER(TRIM(login_id))
        HAVING COUNT(*) > 1
    ) d;

    IF v_dup_logins > 0 THEN
        RAISE EXCEPTION 'Preflight Failure: public.profiles contains % duplicate login_id values. Manual deduplication required.', v_dup_logins;
    END IF;
END $$;

DROP INDEX IF EXISTS public.idx_profiles_login_id_unique;

CREATE UNIQUE INDEX idx_profiles_login_id_unique 
    ON public.profiles(LOWER(TRIM(login_id))) 
    WHERE login_id IS NOT NULL AND TRIM(login_id) <> '';

-- =============================================================================
-- 4. CLASS ATTENDANCE SESSION AUTHORITATIVE UNIQUENESS STRATEGY
-- DEF-011 & DEF-123: Preflights all existing constraints and indexes before dropping
-- legacy duplicates. Establishes single authoritative normalized expression index.
-- =============================================================================
-- Preflight Duplicate Detection on Complete 5-Column Natural Key
DO $$
DECLARE
    v_dup_count INT;
BEGIN
    SELECT COUNT(*) INTO v_dup_count FROM (
        SELECT LOWER(TRIM(class_name)), session_date, period_number, LOWER(TRIM(subject_code)), LOWER(TRIM(batch))
        FROM public.class_attendance_sessions
        GROUP BY LOWER(TRIM(class_name)), session_date, period_number, LOWER(TRIM(subject_code)), LOWER(TRIM(batch))
        HAVING COUNT(*) > 1
    ) d;

    IF v_dup_count > 0 THEN
        RAISE EXCEPTION 'Preflight Failure: class_attendance_sessions contains % duplicate natural session groups. Manual deduplication required before applying unique index.', v_dup_count;
    END IF;
END $$;

-- Verify and drop all known legacy duplicate unique constraints
DO $$
BEGIN
    ALTER TABLE public.class_attendance_sessions DROP CONSTRAINT IF EXISTS uq_class_attendance_session;
    ALTER TABLE public.class_attendance_sessions DROP CONSTRAINT IF EXISTS class_attendance_sessions_class_name_session_date_period_number_key;
    ALTER TABLE public.class_attendance_sessions DROP CONSTRAINT IF EXISTS uq_class_attendance_session_batch;
    ALTER TABLE public.class_attendance_sessions DROP CONSTRAINT IF EXISTS class_attendance_sessions_unique;
END $$;

-- Drop any existing non-authoritative unique indexes
DROP INDEX IF EXISTS public.idx_class_attendance_session_unique;
DROP INDEX IF EXISTS public.idx_class_attendance_sessions_natural;
DROP INDEX IF EXISTS public.idx_class_attendance_sessions_unique_5col;

-- Apply single authoritative normalized unique index
CREATE UNIQUE INDEX idx_class_attendance_session_unique 
    ON public.class_attendance_sessions (
        LOWER(TRIM(class_name)),
        session_date,
        period_number,
        LOWER(TRIM(subject_code)),
        LOWER(TRIM(batch))
    );

-- =============================================================================
-- 5. STAFF LEAVE BALANCES NON-NEGATIVE INTEGRITY CONSTRAINT
-- Preflights balance table and enforces quota limits and non-negative taken counts.
-- =============================================================================
DO $$
DECLARE
    v_invalid_balances INT;
BEGIN
    SELECT COUNT(*) INTO v_invalid_balances
    FROM public.staff_leave_balances
    WHERE casual_leave_taken < 0 
       OR casual_leave_taken > casual_leave_quota
       OR medical_leave_taken < 0 
       OR medical_leave_taken > medical_leave_quota
       OR earned_leave_taken < 0 
       OR earned_leave_taken > earned_leave_quota
       OR on_duty_taken < 0
       OR casual_leave_quota < 0
       OR medical_leave_quota < 0
       OR earned_leave_quota < 0;

    IF v_invalid_balances > 0 THEN
        RAISE EXCEPTION 'Preflight Failure: public.staff_leave_balances contains % rows with negative balances or taken exceeding quota. Manual reconciliation required.', v_invalid_balances;
    END IF;
END $$;

ALTER TABLE public.staff_leave_balances 
    DROP CONSTRAINT IF EXISTS chk_staff_leave_balances_non_negative;

ALTER TABLE public.staff_leave_balances 
    ADD CONSTRAINT chk_staff_leave_balances_non_negative 
    CHECK (
        casual_leave_taken >= 0 AND casual_leave_taken <= casual_leave_quota AND
        medical_leave_taken >= 0 AND medical_leave_taken <= medical_leave_quota AND
        earned_leave_taken >= 0 AND earned_leave_taken <= earned_leave_quota AND
        on_duty_taken >= 0 AND
        casual_leave_quota >= 0 AND
        medical_leave_quota >= 0 AND
        earned_leave_quota >= 0
    );

COMMIT;
