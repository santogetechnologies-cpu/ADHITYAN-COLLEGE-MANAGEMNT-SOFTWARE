-- =============================================================================
-- Migration Script: 028_stage2_constraints.sql (Phase 1.4 Corrected Release)
-- Description: Business integrity constraints, institutional taxonomy & identity keys
-- Architecture: Single-Institution Dedicated Deployment (Adhityan College)
-- Target Database: PostgreSQL 15+ (Supabase Managed Instance: ogbbyqxulhegwvrtinib.supabase.co)
-- Defects Remediated: DEF-011 (5-tuple attendance key & unique index), DEF-012 (login_id validation)
-- Safety Safeguards: Strict lock_timeout (3s) and statement_timeout (10s)
-- Mode: Static Engineering Specification (Zero Live Execution)
-- =============================================================================

SET lock_timeout = '3s';
SET statement_timeout = '10s';

BEGIN;

-- =============================================================================
-- 1. INSTITUTIONAL ROLE TAXONOMY CONSTRAINT (19 Primary Roles + 1 Alias)
-- Permanently eliminates multi-tenant platform_super_admin architecture
-- =============================================================================
ALTER TABLE public.profiles 
    DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_role_check CHECK (role IN (
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
        'driver',             -- Backward-compatible operational alias of transport_driver
        'receptionist',       -- Front Desk Visitor & Enquiry Officer
        'naac_coordinator',   -- Accreditation & Institutional Quality Cell
        'hr_manager',         -- Staff Records, Payroll & Leave Administrator
        'librarian',          -- Library Assets & Book Circulation Officer
        'hostel_warden',      -- Student Housing & Out-Pass Administrator
        'placement_officer'   -- Career Services, Internships & Corporate Drives
    ));

-- =============================================================================
-- 2. ACCOUNT STATUS MACHINE CONSTRAINT
-- Required for fail-closed security trigger enforcement
-- =============================================================================
ALTER TABLE public.profiles 
    DROP CONSTRAINT IF EXISTS profiles_status_check;

ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_status_check CHECK (status IN ('active', 'inactive', 'suspended'));

-- =============================================================================
-- 3. LOGIN IDENTIFIER VALIDATION & CASE-INSENSITIVE UNIQUE INDEX
-- DEF-012: Prevents empty string collisions while allowing NULL for uninvited accounts
-- =============================================================================
ALTER TABLE public.profiles 
    DROP CONSTRAINT IF EXISTS profiles_login_id_check;

ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_login_id_check 
    CHECK (login_id IS NULL OR LENGTH(TRIM(login_id)) >= 3);

DROP INDEX IF EXISTS public.idx_profiles_login_id_unique;

CREATE UNIQUE INDEX idx_profiles_login_id_unique 
    ON public.profiles(LOWER(TRIM(login_id))) 
    WHERE login_id IS NOT NULL AND TRIM(login_id) <> '';

-- =============================================================================
-- 4. CLASS ATTENDANCE SESSION COMPOSITE NATURAL KEY & UNIQUE INDEX
-- DEF-011: Composite 5-tuple natural key supporting whole-class theory lectures
-- and clinical practical laboratory groups. Enforces casing & whitespace normalization.
-- =============================================================================
ALTER TABLE public.class_attendance_sessions 
    DROP CONSTRAINT IF EXISTS uq_class_attendance_session;

ALTER TABLE public.class_attendance_sessions 
    ADD CONSTRAINT uq_class_attendance_session 
    UNIQUE (class_name, session_date, period_number, subject_code, batch);

DROP INDEX IF EXISTS public.idx_class_attendance_session_unique;

CREATE UNIQUE INDEX idx_class_attendance_session_unique 
    ON public.class_attendance_sessions (
        LOWER(TRIM(class_name)),
        session_date,
        period_number,
        LOWER(TRIM(subject_code)),
        LOWER(TRIM(batch))
    );

COMMIT;
