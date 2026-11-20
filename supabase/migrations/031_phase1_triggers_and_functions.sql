-- =============================================================================
-- Migration Script: 028_stage3_triggers.sql (Phase 1.4.1 Final Consolidated Release)
-- Description: Security triggers, state machine concurrency, helper permissions & search_path lockdown
-- Architecture: Single-Institution Dedicated Deployment (Adhityan College)
-- Target Database: PostgreSQL 15+ (Supabase Managed Instance: ogbbyqxulhegwvrtinib.supabase.co)
-- Defects Remediated: 
--   DEF-001: Profile protection trigger, self-service column allowlist & caller authorization
--   DEF-104: Attendance immutable fields, fail-closed authentication & 24-hour correction window
--   DEF-105 & DEF-117: Leave ledger state machine missing row initialization, reversal verification, deadlock-free lexicographical lock ordering & schema columns
--   DEF-106 & DEF-122: Principal privilege boundaries, disciplinary status barrier & email immutability
--   DEF-107: Exam result student identity & active status verification
--   DEF-110 & DEF-121: Function search_path pinning, dynamic catalog verification & revocation of PUBLIC/anon execute privileges
--   DEF-111: Safe UUID casting helper
--   DEF-118 & DEF-119: Stable UUID teacher assignments, exact normalized subject verification & helper authorization guards
--   DEF-127: Prevention of negative leave balances, quota overdraft protection & Loss of Pay compatibility
--   DEF-130: Positive leave days validation, date sanity checks, and authorized leave approval transitions
--   DEF-131: Deterministic academic-year derivation without silent current-date fallback for leave applications
-- Safety Safeguards: Strict lock_timeout (3s) and statement_timeout (10s)
-- Mode: Static Engineering Specification (Zero Live Execution)
-- =============================================================================

SET lock_timeout = '3s';
SET statement_timeout = '10s';

BEGIN;

-- =============================================================================
-- 0. HELPER FUNCTIONS
-- =============================================================================

-- DEF-131: Deterministic academic year resolution (June 1 - May 31 cycle)
-- Returns NULL when p_date is NULL to prevent concealing missing application dates
CREATE OR REPLACE FUNCTION public.get_academic_year_for_date(p_date DATE)
RETURNS TEXT AS $$
DECLARE
    v_year INT;
    v_month INT;
BEGIN
    IF p_date IS NULL THEN
        RETURN NULL;
    END IF;
    v_year := EXTRACT(YEAR FROM p_date)::INT;
    v_month := EXTRACT(MONTH FROM p_date)::INT;
    IF v_month >= 6 THEN
        RETURN v_year::TEXT || '-' || (v_year + 1)::TEXT;
    ELSE
        RETURN (v_year - 1)::TEXT || '-' || v_year::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE
SET search_path = public;

-- DEF-111: Safe UUID Casting Helper (Prevents syntax errors on non-UUID paths)
CREATE OR REPLACE FUNCTION public.safe_cast_uuid(p_text TEXT)
RETURNS UUID AS $$
BEGIN
    IF p_text IS NULL THEN
        RETURN NULL;
    END IF;
    IF p_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        RETURN p_text::uuid;
    ELSE
        RETURN NULL;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE
SET search_path = public;

-- DEF-104, DEF-118, DEF-119: Teacher-to-Class Assignment Verification Helper
-- Enforces stable teacher UUID matching against timetables with caller authorization guard
CREATE OR REPLACE FUNCTION public.is_teacher_assigned_to_class(p_teacher_id UUID, p_class_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- DEF-119: Caller Authorization Guard (Prevents leaking other faculty assignment data)
    IF p_teacher_id <> auth.uid() AND public.get_current_user_role() NOT IN ('admin', 'principal', 'hod') THEN
        RETURN FALSE;
    END IF;

    IF p_teacher_id IS NULL OR p_class_name IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Assigned via timetables table using stable teacher UUID (No loose name string matching)
    RETURN EXISTS (
        SELECT 1 FROM public.timetables t 
        WHERE t.teacher_id = p_teacher_id
          AND LOWER(TRIM(t.class_name)) = LOWER(TRIM(p_class_name))
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;

-- DEF-118: Teacher-to-Class and Subject Verification Helper
-- Strictly enforces stable UUID, exact class, and exact normalized subject matching (No partial matching or fallback)
CREATE OR REPLACE FUNCTION public.is_teacher_assigned_to_class_and_subject(
    p_teacher_id UUID, 
    p_class_name TEXT, 
    p_subject_code TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    -- DEF-119: Caller Authorization Guard
    IF p_teacher_id <> auth.uid() AND public.get_current_user_role() NOT IN ('admin', 'principal', 'hod') THEN
        RETURN FALSE;
    END IF;

    IF p_teacher_id IS NULL OR p_class_name IS NULL OR p_subject_code IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Strict verification via timetables: teacher UUID + exact class + exact normalized subject
    RETURN EXISTS (
        SELECT 1 FROM public.timetables t 
        WHERE t.teacher_id = p_teacher_id 
          AND LOWER(TRIM(t.class_name)) = LOWER(TRIM(p_class_name))
          AND LOWER(TRIM(t.subject)) = LOWER(TRIM(p_subject_code))
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;

-- =============================================================================
-- 1. BUG-SEC-001 / DEF-001 / DEF-106 / DEF-122: PROFILE PROTECTION TRIGGER
-- Implements self-service column allowlist, principal role whitelisting, disciplinary status barrier,
-- financial role separation, email immutability, and preserves registrar identifiers.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
RETURNS TRIGGER AS $$
DECLARE
    v_jwt_role TEXT;
    v_caller_role TEXT;
    v_caller_status TEXT;
    v_caller_id UUID;
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
    v_caller_id := auth.uid();
    SELECT role, status INTO v_caller_role, v_caller_status
    FROM public.profiles
    WHERE id = v_caller_id;

    -- Fail-closed: missing caller profile or non-active account is forbidden
    IF v_caller_role IS NULL OR v_caller_status IS DISTINCT FROM 'active' THEN
        RAISE EXCEPTION 'Access Denied: Unregistered, missing or inactive account.' 
            USING ERRCODE = '42501';
    END IF;

    -- DEF-106: SELF-MUTATION RESTRICTIONS (Applies to ALL callers, including Admin & Principal on own account)
    IF v_caller_id = OLD.id THEN
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'Security Violation: Self-modification of user role is strictly prohibited.' 
                USING ERRCODE = '42501';
        END IF;
        IF NEW.status IS DISTINCT FROM OLD.status THEN
            RAISE EXCEPTION 'Security Violation: Self-modification of account status is strictly prohibited.' 
                USING ERRCODE = '42501';
        END IF;
        IF NEW.student_id IS DISTINCT FROM OLD.student_id THEN
            RAISE EXCEPTION 'Security Violation: Self-modification of student_id is strictly prohibited.' 
                USING ERRCODE = '42501';
        END IF;
        IF NEW.roll_number IS DISTINCT FROM OLD.roll_number THEN
            RAISE EXCEPTION 'Security Violation: Self-modification of roll_number is strictly prohibited.' 
                USING ERRCODE = '42501';
        END IF;
        IF NEW.login_id IS DISTINCT FROM OLD.login_id THEN
            RAISE EXCEPTION 'Security Violation: Self-modification of login_id is strictly prohibited.' 
                USING ERRCODE = '42501';
        END IF;
        IF NEW.email IS DISTINCT FROM OLD.email THEN
            RAISE EXCEPTION 'Security Violation: Self-modification of profile email is strictly prohibited.' 
                USING ERRCODE = '42501';
        END IF;
    END IF;

    -- INSTITUTIONAL ADMINISTRATOR
    IF v_caller_role = 'admin' THEN
        RETURN NEW;
    END IF;

    -- PRINCIPAL PRIVILEGE BOUNDARIES (DEF-106 & DEF-122)
    IF v_caller_role = 'principal' THEN
        -- Rule 1: Cannot touch 'admin' accounts in any way
        IF NEW.role = 'admin' OR OLD.role = 'admin' THEN
            RAISE EXCEPTION 'Security Violation: Principal cannot manage administrative accounts.' 
                USING ERRCODE = '42501';
        END IF;

        -- Rule 2: Cannot touch other 'principal' accounts
        IF (NEW.role = 'principal' AND OLD.role <> 'principal') 
           OR (OLD.role = 'principal' AND OLD.id <> v_caller_id) THEN
            RAISE EXCEPTION 'Security Violation: Principal cannot manage other principal accounts.' 
                USING ERRCODE = '42501';
        END IF;

        -- Rule 3: Cannot touch financial administration roles
        IF NEW.role IN ('finance_manager', 'financier', 'accountant') 
           OR OLD.role IN ('finance_manager', 'financier', 'accountant') THEN
            RAISE EXCEPTION 'Security Violation: Principal cannot manage financial administration roles.' 
                USING ERRCODE = '42501';
        END IF;

        -- Rule 4: DEF-122 Disciplinary Status Barrier (Principal cannot suspend OR unsuspend accounts)
        IF NEW.status = 'suspended' OR OLD.status = 'suspended' THEN
            RAISE EXCEPTION 'Security Violation: Account suspension and disciplinary reinstatement are reserved strictly for System Administration.' 
                USING ERRCODE = '42501';
        END IF;

        -- Rule 5: Principal status modification restriction: Staff account status changes reserved for Admin
        IF OLD.role NOT IN ('student', 'parent') AND NEW.status IS DISTINCT FROM OLD.status THEN
            RAISE EXCEPTION 'Security Violation: Principal can only modify status for student and parent accounts. Staff account status modification requires System Administrator.' 
                USING ERRCODE = '42501';
        END IF;

        -- Rule 6: Explicit whitelist of assignable institutional roles
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            IF NEW.role NOT IN (
                'teacher', 'hod', 'student', 'parent', 'coe', 'librarian', 
                'receptionist', 'hostel_warden', 'placement_officer', 
                'transport_driver', 'driver', 'hr_manager', 'store_manager', 'storekeeper'
            ) THEN
                RAISE EXCEPTION 'Security Violation: Role % cannot be assigned by Principal.', NEW.role 
                    USING ERRCODE = '42501';
            END IF;
        END IF;

        -- Rule 7: Protection of Email Address (Identity modification reserved for Admin)
        IF NEW.email IS DISTINCT FROM OLD.email THEN
            RAISE EXCEPTION 'Security Violation: Principal cannot modify user email addresses. Identity modifications must be performed by System Administrator.' 
                USING ERRCODE = '42501';
        END IF;

        -- Rule 8: Protection of Login ID (cannot overwrite existing populated identifier)
        IF NEW.login_id IS DISTINCT FROM OLD.login_id AND OLD.login_id IS NOT NULL THEN
            RAISE EXCEPTION 'Security Violation: Principal cannot overwrite an existing login_id. Contact System Administrator.' 
                USING ERRCODE = '42501';
        END IF;

        -- Rule 9: Protection of Student ID & Roll Number (cannot overwrite existing)
        IF NEW.student_id IS DISTINCT FROM OLD.student_id AND OLD.student_id IS NOT NULL THEN
            RAISE EXCEPTION 'Security Violation: Principal cannot overwrite an existing student_id.' 
                USING ERRCODE = '42501';
        END IF;

        IF NEW.roll_number IS DISTINCT FROM OLD.roll_number AND OLD.roll_number IS NOT NULL THEN
            RAISE EXCEPTION 'Security Violation: Principal cannot overwrite an existing roll_number.' 
                USING ERRCODE = '42501';
        END IF;

        RETURN NEW;
    END IF;

    -- ALL OTHER CALLERS (Faculty, Staff, Students, Parents)
    -- Non-administrative callers cannot modify other users' profiles under any circumstances
    IF v_caller_id <> OLD.id THEN
        RAISE EXCEPTION 'Security Violation: Non-administrative callers cannot modify other user profiles.' 
            USING ERRCODE = '42501';
    END IF;

    -- STRICT SELF-SERVICE ALLOWLIST: Ordinary users can ONLY edit phone, bio, preferences, avatar_url, updated_at
    -- All security, official registrar, academic placement, and system identity columns are strictly locked
    IF NEW.id IS DISTINCT FROM OLD.id OR
       NEW.email IS DISTINCT FROM OLD.email OR
       NEW.role IS DISTINCT FROM OLD.role OR
       NEW.status IS DISTINCT FROM OLD.status OR
       NEW.name IS DISTINCT FROM OLD.name OR
       NEW.student_id IS DISTINCT FROM OLD.student_id OR
       NEW.roll_number IS DISTINCT FROM OLD.roll_number OR
       NEW.login_id IS DISTINCT FROM OLD.login_id OR
       NEW.department IS DISTINCT FROM OLD.department OR
       NEW.class_name IS DISTINCT FROM OLD.class_name OR
       NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'Security Violation: Modifying restricted profile attributes is prohibited. Only personal profile details (phone, bio, preferences, avatar_url) may be edited.' 
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
    WHERE id = NEW.student_id AND role = 'student' AND status = 'active';

    IF v_real_name IS NULL THEN
        RAISE EXCEPTION 'Integrity Violation: Referenced student profile (%) does not exist or is not an active enrolled student.', NEW.student_id 
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
-- 3. DEF-104: ATTENDANCE SESSION IMMUTABILITY, FAIL-CLOSED AUTH & 24-HOUR CORRECTION WINDOW
-- Prevents reassigning teacher_id or altering created_at timestamp.
-- Fails closed if caller is unauthenticated or has no active profile.
-- Enforces 24-hour correction window for non-admin instructors.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.protect_attendance_session_immutable_columns()
RETURNS TRIGGER AS $$
DECLARE
    v_jwt_role TEXT;
    v_caller_role TEXT;
    v_caller_status TEXT;
BEGIN
    -- Trusted service role or physical direct DBA bypass
    BEGIN
        v_jwt_role := current_setting('request.jwt.claim.role', true);
    EXCEPTION WHEN OTHERS THEN
        v_jwt_role := NULL;
    END;

    IF v_jwt_role = 'service_role' THEN
        RETURN NEW;
    END IF;

    IF auth.uid() IS NULL AND session_user IN ('postgres', 'supabase_admin') THEN
        RETURN NEW;
    END IF;

    -- Query caller profile and enforce fail-closed check
    SELECT role, status INTO v_caller_role, v_caller_status
    FROM public.profiles
    WHERE id = auth.uid();

    IF v_caller_role IS NULL OR v_caller_status IS DISTINCT FROM 'active' THEN
        RAISE EXCEPTION 'Access Denied: Unauthenticated, missing or inactive account.' 
            USING ERRCODE = '42501';
    END IF;

    IF v_caller_role NOT IN ('admin', 'principal') THEN
        IF NEW.teacher_id IS DISTINCT FROM OLD.teacher_id THEN
            RAISE EXCEPTION 'Security Violation: Session teacher assignment is immutable.' 
                USING ERRCODE = '42501';
        END IF;

        IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
            RAISE EXCEPTION 'Security Violation: Session creation timestamp is immutable.' 
                USING ERRCODE = '42501';
        END IF;

        -- Enforce 24-hour correction window
        IF OLD.created_at < NOW() - INTERVAL '24 hours' THEN
            RAISE EXCEPTION 'Security Violation: Attendance session modification window (24 hours) has expired. Contact HOD or Administrator.' 
                USING ERRCODE = '42501';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

DROP TRIGGER IF EXISTS trg_protect_attendance_session_immutable_columns ON public.class_attendance_sessions;

CREATE TRIGGER trg_protect_attendance_session_immutable_columns
    BEFORE UPDATE ON public.class_attendance_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_attendance_session_immutable_columns();

-- =============================================================================
-- 4. DEF-104: ATTENDANCE RECORD IMMUTABILITY, FAIL-CLOSED AUTH & 24-HOUR WINDOW
-- Locks student_id, session_id, and created_at against tampering.
-- Fails closed if caller is unauthenticated or inactive.
-- Validates that the associated session is within the 24-hour correction window.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.protect_attendance_record_immutable_columns()
RETURNS TRIGGER AS $$
DECLARE
    v_jwt_role TEXT;
    v_caller_role TEXT;
    v_caller_status TEXT;
    v_session_created_at TIMESTAMPTZ;
BEGIN
    BEGIN
        v_jwt_role := current_setting('request.jwt.claim.role', true);
    EXCEPTION WHEN OTHERS THEN
        v_jwt_role := NULL;
    END;

    IF v_jwt_role = 'service_role' THEN
        RETURN NEW;
    END IF;

    IF auth.uid() IS NULL AND session_user IN ('postgres', 'supabase_admin') THEN
        RETURN NEW;
    END IF;

    SELECT role, status INTO v_caller_role, v_caller_status
    FROM public.profiles
    WHERE id = auth.uid();

    IF v_caller_role IS NULL OR v_caller_status IS DISTINCT FROM 'active' THEN
        RAISE EXCEPTION 'Access Denied: Unauthenticated, missing or inactive account.' 
            USING ERRCODE = '42501';
    END IF;

    IF v_caller_role NOT IN ('admin', 'principal') THEN
        IF NEW.student_id IS DISTINCT FROM OLD.student_id THEN
            RAISE EXCEPTION 'Security Violation: student_id cannot be modified on attendance records.' 
                USING ERRCODE = '42501';
        END IF;

        IF NEW.session_id IS DISTINCT FROM OLD.session_id THEN
            RAISE EXCEPTION 'Security Violation: session_id cannot be modified on attendance records.' 
                USING ERRCODE = '42501';
        END IF;

        IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
            RAISE EXCEPTION 'Security Violation: created_at is immutable on attendance records.' 
                USING ERRCODE = '42501';
        END IF;

        -- Enforce 24-hour window from session creation timestamp
        SELECT created_at INTO v_session_created_at
        FROM public.class_attendance_sessions
        WHERE id = OLD.session_id;

        IF v_session_created_at IS NOT NULL AND v_session_created_at < NOW() - INTERVAL '24 hours' THEN
            RAISE EXCEPTION 'Security Violation: Attendance record modification window (24 hours) has expired.' 
                USING ERRCODE = '42501';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

DROP TRIGGER IF EXISTS trg_protect_attendance_record_immutable_columns ON public.student_attendance_records;

CREATE TRIGGER trg_protect_attendance_record_immutable_columns
    BEFORE UPDATE ON public.student_attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_attendance_record_immutable_columns();

-- =============================================================================
-- 5. DEF-130: STAFF LEAVE APPLICATION INPUT VALIDATION & APPROVAL AUTHORIZATION
-- Enforces strictly positive leave days, valid date ranges, non-empty leave types,
-- and prevents unauthorized callers or applicants from self-approving leave applications.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.validate_staff_leave_application()
RETURNS TRIGGER AS $$
DECLARE
    v_jwt_role TEXT;
    v_caller_role TEXT;
    v_caller_status TEXT;
    v_caller_id UUID;
BEGIN
    -- Check for trusted backend service role or direct physical DBA
    BEGIN
        v_jwt_role := current_setting('request.jwt.claim.role', true);
    EXCEPTION WHEN OTHERS THEN
        v_jwt_role := NULL;
    END;

    IF v_jwt_role = 'service_role' THEN
        RETURN NEW;
    END IF;

    IF auth.uid() IS NULL AND session_user IN ('postgres', 'supabase_admin') THEN
        RETURN NEW;
    END IF;

    -- Fail-closed caller authentication check
    v_caller_id := auth.uid();
    SELECT role, status INTO v_caller_role, v_caller_status
    FROM public.profiles
    WHERE id = v_caller_id;

    IF v_caller_role IS NULL OR v_caller_status IS DISTINCT FROM 'active' THEN
        RAISE EXCEPTION 'Access Denied: Unregistered, missing or inactive account.' 
            USING ERRCODE = '42501';
    END IF;

    -- 1. Input Sanity Checks
    IF NEW.user_id IS NULL THEN
        RAISE EXCEPTION 'Validation Error: Leave application applicant user_id cannot be null.' 
            USING ERRCODE = '23502';
    END IF;

    IF NEW.start_date IS NULL OR NEW.end_date IS NULL THEN
        RAISE EXCEPTION 'Validation Error: Leave start_date and end_date are mandatory and cannot be null.' 
            USING ERRCODE = '23502';
    END IF;

    IF NEW.end_date < NEW.start_date THEN
        RAISE EXCEPTION 'Validation Error: Leave end_date (%) cannot precede start_date (%).', NEW.end_date, NEW.start_date 
            USING ERRCODE = '23514';
    END IF;

    IF NEW.total_days IS NULL OR NEW.total_days <= 0 THEN
        RAISE EXCEPTION 'Validation Error: total_days must be a strictly positive integer (> 0). Attempted: %.', NEW.total_days 
            USING ERRCODE = '23514';
    END IF;

    IF NEW.leave_type IS NULL OR LENGTH(TRIM(NEW.leave_type)) = 0 THEN
        RAISE EXCEPTION 'Validation Error: leave_type is mandatory and cannot be empty.' 
            USING ERRCODE = '23502';
    END IF;

    -- 2. Authorization & Transition Checks
    IF TG_OP = 'INSERT' THEN
        -- Non-admin staff cannot create an already-approved application
        IF NEW.status = 'Approved' AND v_caller_role NOT IN ('admin', 'principal', 'hr_manager') THEN
            RAISE EXCEPTION 'Security Violation: Role % cannot directly create approved leave applications. Must submit as Pending.', v_caller_role 
                USING ERRCODE = '42501';
        END IF;

        -- Ordinary staff can only submit for their own user_id
        IF v_caller_role NOT IN ('admin', 'principal', 'hr_manager') AND NEW.user_id <> v_caller_id THEN
            RAISE EXCEPTION 'Security Violation: Staff cannot submit leave applications on behalf of other employees.' 
                USING ERRCODE = '42501';
        END IF;

        IF NEW.status IS NULL THEN
            NEW.status := 'Pending';
        END IF;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        -- Approval transition authorization check
        IF NEW.status = 'Approved' AND (OLD.status IS NULL OR OLD.status <> 'Approved') THEN
            -- Self-approval is strictly forbidden (applicants cannot approve own leave)
            IF v_caller_id = NEW.user_id AND v_caller_role <> 'admin' THEN
                RAISE EXCEPTION 'Security Violation: Staff members cannot approve their own leave applications.' 
                    USING ERRCODE = '42501';
            END IF;

            -- Only authorized institutional roles can approve leave
            IF v_caller_role NOT IN ('admin', 'principal', 'hr_manager', 'hod') THEN
                RAISE EXCEPTION 'Security Violation: Role % is not authorized to approve leave applications.', v_caller_role 
                    USING ERRCODE = '42501';
            END IF;
        END IF;

        -- Applicants updating own pending leave cannot self-approve or reject
        IF v_caller_id = OLD.user_id AND v_caller_role NOT IN ('admin', 'principal', 'hr_manager', 'hod') THEN
            IF NEW.status IN ('Approved', 'Rejected') AND NEW.status IS DISTINCT FROM OLD.status THEN
                RAISE EXCEPTION 'Security Violation: Applicants cannot approve or reject their own applications.' 
                    USING ERRCODE = '42501';
            END IF;

            -- Cannot alter an already processed application
            IF OLD.status IN ('Approved', 'Rejected') AND (
                NEW.total_days IS DISTINCT FROM OLD.total_days OR
                NEW.start_date IS DISTINCT FROM OLD.start_date OR
                NEW.end_date IS DISTINCT FROM OLD.end_date OR
                NEW.leave_type IS DISTINCT FROM OLD.leave_type
            ) THEN
                RAISE EXCEPTION 'Security Violation: Processed leave applications cannot be modified. Contact HR or Administrator.' 
                    USING ERRCODE = '42501';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

DROP TRIGGER IF EXISTS trg_validate_staff_leave_application ON public.staff_leave_applications;

CREATE TRIGGER trg_validate_staff_leave_application
    BEFORE INSERT OR UPDATE ON public.staff_leave_applications
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_staff_leave_application();

-- =============================================================================
-- 6. BUG-HR-001 / DEF-002-004 / DEF-105 / DEF-117 / DEF-127 / DEF-130 / DEF-131:
-- STAFF LEAVE BALANCE TRANSITION ENGINE (DEADLOCK-FREE & OVERDRAFT-PROTECTED)
-- Strictly validates quota limits: prevents taken > quota (negative available balance)
-- and taken - reversal < 0. Orders row locks in deterministic lexicographical order.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.sync_staff_leave_balance_transition()
RETURNS TRIGGER AS $$
DECLARE
    v_old_year TEXT;
    v_new_year TEXT;
    v_old_type TEXT;
    v_new_type TEXT;
    v_rows_updated INT;
    v_old_exists INT;
    v_bal RECORD;
    v_old_bal RECORD;
    v_new_bal RECORD;
BEGIN
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        v_old_year := public.get_academic_year_for_date(OLD.start_date);
        v_old_type := LOWER(TRIM(OLD.leave_type));
    END IF;

    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        v_new_year := public.get_academic_year_for_date(NEW.start_date);
        v_new_type := LOWER(TRIM(NEW.leave_type));
    END IF;

    -- CASE A: DELETION of Approved Application -> Reverse Old Balance
    IF TG_OP = 'DELETE' THEN
        IF OLD.status = 'Approved' THEN
            IF v_old_year IS NULL THEN
                RAISE EXCEPTION 'Ledger Error: Cannot resolve academic year for leave start_date %.', OLD.start_date 
                    USING ERRCODE = '23502';
            END IF;

            -- Check existence of old balance row and lock it
            SELECT * INTO v_bal 
            FROM public.staff_leave_balances 
            WHERE user_id = OLD.user_id AND academic_year = v_old_year
            FOR UPDATE;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'Ledger Error: Historical balance row for user % in year % not found to reverse leave.', OLD.user_id, v_old_year
                    USING ERRCODE = '23514';
            END IF;

            -- Validate balance fields are non-null
            IF v_bal.casual_leave_taken IS NULL OR v_bal.medical_leave_taken IS NULL 
               OR v_bal.earned_leave_taken IS NULL OR v_bal.on_duty_taken IS NULL THEN
                RAISE EXCEPTION 'Ledger Corruption: Balance record contains null taken counts for user % in year %.', OLD.user_id, v_old_year 
                    USING ERRCODE = '23502';
            END IF;

            IF v_old_type LIKE '%casual%' THEN
                IF (v_bal.casual_leave_taken - OLD.total_days) < 0 THEN
                    RAISE EXCEPTION 'Ledger Error: Reversal of % days would cause negative casual leave taken count for employee % (Current: %).', 
                        OLD.total_days, OLD.user_id, v_bal.casual_leave_taken USING ERRCODE = '23514';
                END IF;
                UPDATE public.staff_leave_balances 
                SET casual_leave_taken = casual_leave_taken - OLD.total_days, updated_at = NOW()
                WHERE user_id = OLD.user_id AND academic_year = v_old_year;
            ELSIF v_old_type LIKE '%med%' OR v_old_type LIKE '%sick%' THEN
                IF (v_bal.medical_leave_taken - OLD.total_days) < 0 THEN
                    RAISE EXCEPTION 'Ledger Error: Reversal of % days would cause negative medical leave taken count for employee % (Current: %).', 
                        OLD.total_days, OLD.user_id, v_bal.medical_leave_taken USING ERRCODE = '23514';
                END IF;
                UPDATE public.staff_leave_balances 
                SET medical_leave_taken = medical_leave_taken - OLD.total_days, updated_at = NOW()
                WHERE user_id = OLD.user_id AND academic_year = v_old_year;
            ELSIF v_old_type LIKE '%earn%' THEN
                IF (v_bal.earned_leave_taken - OLD.total_days) < 0 THEN
                    RAISE EXCEPTION 'Ledger Error: Reversal of % days would cause negative earned leave taken count for employee % (Current: %).', 
                        OLD.total_days, OLD.user_id, v_bal.earned_leave_taken USING ERRCODE = '23514';
                END IF;
                UPDATE public.staff_leave_balances 
                SET earned_leave_taken = earned_leave_taken - OLD.total_days, updated_at = NOW()
                WHERE user_id = OLD.user_id AND academic_year = v_old_year;
            ELSIF v_old_type LIKE '%duty%' OR v_old_type LIKE '%on_duty%' THEN
                IF (v_bal.on_duty_taken - OLD.total_days) < 0 THEN
                    RAISE EXCEPTION 'Ledger Error: Reversal of % days would cause negative on-duty count for employee % (Current: %).', 
                        OLD.total_days, OLD.user_id, v_bal.on_duty_taken USING ERRCODE = '23514';
                END IF;
                UPDATE public.staff_leave_balances 
                SET on_duty_taken = on_duty_taken - OLD.total_days, updated_at = NOW()
                WHERE user_id = OLD.user_id AND academic_year = v_old_year;
            ELSIF v_old_type LIKE '%loss%' OR v_old_type LIKE '%lop%' THEN
                -- Loss of Pay does not affect paid leave quotas
                NULL;
            ELSE
                RAISE EXCEPTION 'Ledger Error: Unsupported leave type % cannot be processed for reversal.', OLD.leave_type
                    USING ERRCODE = '22023';
            END IF;

            IF v_old_type NOT LIKE '%loss%' AND v_old_type NOT LIKE '%lop%' THEN
                GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
                IF v_rows_updated = 0 THEN
                    RAISE EXCEPTION 'Ledger Error: Historical balance row for user % in year % not found to reverse leave.', OLD.user_id, v_old_year
                        USING ERRCODE = '23514';
                END IF;
            END IF;
        END IF;
        RETURN OLD;
    END IF;

    -- CASE B: INSERTION of Approved Application -> Apply New Balance
    IF TG_OP = 'INSERT' THEN
        IF NEW.status = 'Approved' THEN
            IF v_new_year IS NULL THEN
                RAISE EXCEPTION 'Ledger Error: Cannot resolve academic year for leave start_date %.', NEW.start_date 
                    USING ERRCODE = '23502';
            END IF;

            -- Ensure balance row exists using database schema column defaults (12, 10, 15)
            INSERT INTO public.staff_leave_balances (user_id, academic_year)
            VALUES (NEW.user_id, v_new_year)
            ON CONFLICT (user_id, academic_year) DO NOTHING;

            SELECT * INTO v_bal 
            FROM public.staff_leave_balances 
            WHERE user_id = NEW.user_id AND academic_year = v_new_year 
            FOR UPDATE;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'Ledger Integrity Failure: Balance row missing for user % in academic year %.', NEW.user_id, v_new_year 
                    USING ERRCODE = '23514';
            END IF;

            -- Validate balance fields are non-null
            IF v_bal.casual_leave_quota IS NULL OR v_bal.casual_leave_taken IS NULL 
               OR v_bal.medical_leave_quota IS NULL OR v_bal.medical_leave_taken IS NULL 
               OR v_bal.earned_leave_quota IS NULL OR v_bal.earned_leave_taken IS NULL 
               OR v_bal.on_duty_taken IS NULL THEN
                RAISE EXCEPTION 'Ledger Corruption: Balance record contains null quota or taken counts for user % in year %.', NEW.user_id, v_new_year 
                    USING ERRCODE = '23502';
            END IF;

            IF v_new_type LIKE '%casual%' THEN
                IF (v_bal.casual_leave_taken + NEW.total_days) > v_bal.casual_leave_quota THEN
                    RAISE EXCEPTION 'Leave Entitlement Exceeded: Employee % has insufficient casual leave balance (Quota: %, Already Taken: %, Requested: %).', 
                        NEW.user_id, v_bal.casual_leave_quota, v_bal.casual_leave_taken, NEW.total_days USING ERRCODE = '23514';
                END IF;
                UPDATE public.staff_leave_balances 
                SET casual_leave_taken = casual_leave_taken + NEW.total_days, updated_at = NOW()
                WHERE user_id = NEW.user_id AND academic_year = v_new_year;
            ELSIF v_new_type LIKE '%med%' OR v_new_type LIKE '%sick%' THEN
                IF (v_bal.medical_leave_taken + NEW.total_days) > v_bal.medical_leave_quota THEN
                    RAISE EXCEPTION 'Leave Entitlement Exceeded: Employee % has insufficient medical leave balance (Quota: %, Already Taken: %, Requested: %).', 
                        NEW.user_id, v_bal.medical_leave_quota, v_bal.medical_leave_taken, NEW.total_days USING ERRCODE = '23514';
                END IF;
                UPDATE public.staff_leave_balances 
                SET medical_leave_taken = medical_leave_taken + NEW.total_days, updated_at = NOW()
                WHERE user_id = NEW.user_id AND academic_year = v_new_year;
            ELSIF v_new_type LIKE '%earn%' THEN
                IF (v_bal.earned_leave_taken + NEW.total_days) > v_bal.earned_leave_quota THEN
                    RAISE EXCEPTION 'Leave Entitlement Exceeded: Employee % has insufficient earned leave balance (Quota: %, Already Taken: %, Requested: %).', 
                        NEW.user_id, v_bal.earned_leave_quota, v_bal.earned_leave_taken, NEW.total_days USING ERRCODE = '23514';
                END IF;
                UPDATE public.staff_leave_balances 
                SET earned_leave_taken = earned_leave_taken + NEW.total_days, updated_at = NOW()
                WHERE user_id = NEW.user_id AND academic_year = v_new_year;
            ELSIF v_new_type LIKE '%duty%' OR v_new_type LIKE '%on_duty%' THEN
                UPDATE public.staff_leave_balances 
                SET on_duty_taken = on_duty_taken + NEW.total_days, updated_at = NOW()
                WHERE user_id = NEW.user_id AND academic_year = v_new_year;
            ELSIF v_new_type LIKE '%loss%' OR v_new_type LIKE '%lop%' THEN
                -- Loss of Pay recorded without quota deduction
                NULL;
            ELSE
                RAISE EXCEPTION 'Ledger Error: Unsupported leave type % cannot be processed for deduction.', NEW.leave_type
                    USING ERRCODE = '22023';
            END IF;

            IF v_new_type NOT LIKE '%loss%' AND v_new_type NOT LIKE '%lop%' THEN
                GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
                IF v_rows_updated = 0 THEN
                    RAISE EXCEPTION 'Ledger Integrity Failure: Failed to apply balance deduction for user % in academic year %.', NEW.user_id, v_new_year 
                        USING ERRCODE = '23514';
                END IF;
            END IF;
        END IF;
        RETURN NEW;
    END IF;

    -- CASE C: UPDATE of Leave Application (Two-Phase Reverse & Apply)
    IF TG_OP = 'UPDATE' THEN
        IF OLD.status <> 'Approved' AND NEW.status <> 'Approved' THEN
            RETURN NEW;
        END IF;

        IF NEW.status = 'Approved' AND v_new_year IS NULL THEN
            RAISE EXCEPTION 'Ledger Error: Cannot resolve academic year for new leave start_date %.', NEW.start_date 
                USING ERRCODE = '23502';
        END IF;

        IF OLD.status = 'Approved' AND v_old_year IS NULL THEN
            RAISE EXCEPTION 'Ledger Error: Cannot resolve academic year for historical leave start_date %.', OLD.start_date 
                USING ERRCODE = '23502';
        END IF;

        -- Subcase C1: In-Place Same Employee, Same Academic Year, Same Leave Type
        IF OLD.status = 'Approved' AND NEW.status = 'Approved' 
           AND OLD.user_id = NEW.user_id 
           AND v_old_year = v_new_year 
           AND v_old_type = v_new_type THEN
            
            IF OLD.total_days <> NEW.total_days THEN
                SELECT * INTO v_bal 
                FROM public.staff_leave_balances 
                WHERE user_id = NEW.user_id AND academic_year = v_new_year 
                FOR UPDATE;

                IF NOT FOUND THEN
                    RAISE EXCEPTION 'Ledger Integrity Failure: Balance row missing for user % in academic year %.', NEW.user_id, v_new_year 
                        USING ERRCODE = '23514';
                END IF;

                IF v_new_type LIKE '%casual%' THEN
                    IF (v_bal.casual_leave_taken + (NEW.total_days - OLD.total_days)) > v_bal.casual_leave_quota THEN
                        RAISE EXCEPTION 'Leave Entitlement Exceeded: Modification exceeds casual leave quota for user % (Quota: %, Available: %).',
                            NEW.user_id, v_bal.casual_leave_quota, (v_bal.casual_leave_quota - v_bal.casual_leave_taken + OLD.total_days) USING ERRCODE = '23514';
                    END IF;
                    IF (v_bal.casual_leave_taken + (NEW.total_days - OLD.total_days)) < 0 THEN
                        RAISE EXCEPTION 'Ledger Error: Modification causes negative casual leave taken count.' USING ERRCODE = '23514';
                    END IF;
                    UPDATE public.staff_leave_balances 
                    SET casual_leave_taken = casual_leave_taken + (NEW.total_days - OLD.total_days), updated_at = NOW()
                    WHERE user_id = NEW.user_id AND academic_year = v_new_year;
                ELSIF v_new_type LIKE '%med%' OR v_new_type LIKE '%sick%' THEN
                    IF (v_bal.medical_leave_taken + (NEW.total_days - OLD.total_days)) > v_bal.medical_leave_quota THEN
                        RAISE EXCEPTION 'Leave Entitlement Exceeded: Modification exceeds medical leave quota for user % (Quota: %, Available: %).',
                            NEW.user_id, v_bal.medical_leave_quota, (v_bal.medical_leave_quota - v_bal.medical_leave_taken + OLD.total_days) USING ERRCODE = '23514';
                    END IF;
                    IF (v_bal.medical_leave_taken + (NEW.total_days - OLD.total_days)) < 0 THEN
                        RAISE EXCEPTION 'Ledger Error: Modification causes negative medical leave taken count.' USING ERRCODE = '23514';
                    END IF;
                    UPDATE public.staff_leave_balances 
                    SET medical_leave_taken = medical_leave_taken + (NEW.total_days - OLD.total_days), updated_at = NOW()
                    WHERE user_id = NEW.user_id AND academic_year = v_new_year;
                ELSIF v_new_type LIKE '%earn%' THEN
                    IF (v_bal.earned_leave_taken + (NEW.total_days - OLD.total_days)) > v_bal.earned_leave_quota THEN
                        RAISE EXCEPTION 'Leave Entitlement Exceeded: Modification exceeds earned leave quota for user % (Quota: %, Available: %).',
                            NEW.user_id, v_bal.earned_leave_quota, (v_bal.earned_leave_quota - v_bal.earned_leave_taken + OLD.total_days) USING ERRCODE = '23514';
                    END IF;
                    IF (v_bal.earned_leave_taken + (NEW.total_days - OLD.total_days)) < 0 THEN
                        RAISE EXCEPTION 'Ledger Error: Modification causes negative earned leave taken count.' USING ERRCODE = '23514';
                    END IF;
                    UPDATE public.staff_leave_balances 
                    SET earned_leave_taken = earned_leave_taken + (NEW.total_days - OLD.total_days), updated_at = NOW()
                    WHERE user_id = NEW.user_id AND academic_year = v_new_year;
                ELSIF v_new_type LIKE '%duty%' OR v_new_type LIKE '%on_duty%' THEN
                    IF (v_bal.on_duty_taken + (NEW.total_days - OLD.total_days)) < 0 THEN
                        RAISE EXCEPTION 'Ledger Error: Modification causes negative on-duty count.' USING ERRCODE = '23514';
                    END IF;
                    UPDATE public.staff_leave_balances 
                    SET on_duty_taken = on_duty_taken + (NEW.total_days - OLD.total_days), updated_at = NOW()
                    WHERE user_id = NEW.user_id AND academic_year = v_new_year;
                ELSIF v_new_type LIKE '%loss%' OR v_new_type LIKE '%lop%' THEN
                    NULL;
                ELSE
                    RAISE EXCEPTION 'Ledger Error: Unsupported leave type %.', NEW.leave_type 
                        USING ERRCODE = '22023';
                END IF;

                IF v_new_type NOT LIKE '%loss%' AND v_new_type NOT LIKE '%lop%' THEN
                    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
                    IF v_rows_updated = 0 THEN
                        RAISE EXCEPTION 'Ledger Integrity Failure: In-place balance update failed for user %.', NEW.user_id 
                            USING ERRCODE = '23514';
                    END IF;
                END IF;
            END IF;
            RETURN NEW;
        END IF;

        -- Subcase C2: Transition involving state change, employee reassignment, or leave reclassification (DEF-117)
        -- 1. Ensure NEW balance record exists if NEW is Approved using schema defaults
        IF NEW.status = 'Approved' THEN
            INSERT INTO public.staff_leave_balances (user_id, academic_year)
            VALUES (NEW.user_id, v_new_year)
            ON CONFLICT (user_id, academic_year) DO NOTHING;
        END IF;

        -- 2. Verify OLD balance record exists if reversal is required
        IF OLD.status = 'Approved' THEN
            SELECT COUNT(*) INTO v_old_exists 
            FROM public.staff_leave_balances 
            WHERE user_id = OLD.user_id AND academic_year = v_old_year;

            IF v_old_exists = 0 THEN
                RAISE EXCEPTION 'Ledger Integrity Failure: Cannot reverse leave. Historical balance row for user % in academic year % does not exist.', OLD.user_id, v_old_year
                    USING ERRCODE = '23514';
            END IF;
        END IF;

        -- 3. Lock affected rows in deterministic lexicographical order to prevent deadlocks
        IF OLD.status = 'Approved' AND NEW.status = 'Approved' 
           AND (OLD.user_id <> NEW.user_id OR v_old_year <> v_new_year) THEN
            IF (OLD.user_id::text, v_old_year) < (NEW.user_id::text, v_new_year) THEN
                SELECT * INTO v_old_bal FROM public.staff_leave_balances WHERE user_id = OLD.user_id AND academic_year = v_old_year FOR UPDATE;
                SELECT * INTO v_new_bal FROM public.staff_leave_balances WHERE user_id = NEW.user_id AND academic_year = v_new_year FOR UPDATE;
            ELSE
                SELECT * INTO v_new_bal FROM public.staff_leave_balances WHERE user_id = NEW.user_id AND academic_year = v_new_year FOR UPDATE;
                SELECT * INTO v_old_bal FROM public.staff_leave_balances WHERE user_id = OLD.user_id AND academic_year = v_old_year FOR UPDATE;
            END IF;
        ELSE
            IF OLD.status = 'Approved' THEN
                SELECT * INTO v_old_bal FROM public.staff_leave_balances WHERE user_id = OLD.user_id AND academic_year = v_old_year FOR UPDATE;
            END IF;
            IF NEW.status = 'Approved' AND (OLD.status <> 'Approved' OR OLD.user_id <> NEW.user_id OR v_old_year <> v_new_year) THEN
                SELECT * INTO v_new_bal FROM public.staff_leave_balances WHERE user_id = NEW.user_id AND academic_year = v_new_year FOR UPDATE;
            END IF;
        END IF;

        -- 4. Phase 1: Reverse Old Balance if it was previously Approved
        IF OLD.status = 'Approved' THEN
            IF v_old_bal.casual_leave_taken IS NULL OR v_old_bal.medical_leave_taken IS NULL 
               OR v_old_bal.earned_leave_taken IS NULL OR v_old_bal.on_duty_taken IS NULL THEN
                RAISE EXCEPTION 'Ledger Corruption: Old balance row contains null taken counts for user % year %.', OLD.user_id, v_old_year 
                    USING ERRCODE = '23502';
            END IF;

            IF v_old_type LIKE '%casual%' THEN
                IF (v_old_bal.casual_leave_taken - OLD.total_days) < 0 THEN
                    RAISE EXCEPTION 'Ledger Error: Reversal would result in negative casual leave taken count for employee % (Current: %, Reversal: %).', 
                        OLD.user_id, v_old_bal.casual_leave_taken, OLD.total_days USING ERRCODE = '23514';
                END IF;
                UPDATE public.staff_leave_balances 
                SET casual_leave_taken = casual_leave_taken - OLD.total_days, updated_at = NOW()
                WHERE user_id = OLD.user_id AND academic_year = v_old_year;
            ELSIF v_old_type LIKE '%med%' OR v_old_type LIKE '%sick%' THEN
                IF (v_old_bal.medical_leave_taken - OLD.total_days) < 0 THEN
                    RAISE EXCEPTION 'Ledger Error: Reversal would result in negative medical leave taken count for employee % (Current: %, Reversal: %).', 
                        OLD.user_id, v_old_bal.medical_leave_taken, OLD.total_days USING ERRCODE = '23514';
                END IF;
                UPDATE public.staff_leave_balances 
                SET medical_leave_taken = medical_leave_taken - OLD.total_days, updated_at = NOW()
                WHERE user_id = OLD.user_id AND academic_year = v_old_year;
            ELSIF v_old_type LIKE '%earn%' THEN
                IF (v_old_bal.earned_leave_taken - OLD.total_days) < 0 THEN
                    RAISE EXCEPTION 'Ledger Error: Reversal would result in negative earned leave taken count for employee % (Current: %, Reversal: %).', 
                        OLD.user_id, v_old_bal.earned_leave_taken, OLD.total_days USING ERRCODE = '23514';
                END IF;
                UPDATE public.staff_leave_balances 
                SET earned_leave_taken = earned_leave_taken - OLD.total_days, updated_at = NOW()
                WHERE user_id = OLD.user_id AND academic_year = v_old_year;
            ELSIF v_old_type LIKE '%duty%' OR v_old_type LIKE '%on_duty%' THEN
                IF (v_old_bal.on_duty_taken - OLD.total_days) < 0 THEN
                    RAISE EXCEPTION 'Ledger Error: Reversal would result in negative on-duty count for employee % (Current: %, Reversal: %).', 
                        OLD.user_id, v_old_bal.on_duty_taken, OLD.total_days USING ERRCODE = '23514';
                END IF;
                UPDATE public.staff_leave_balances 
                SET on_duty_taken = on_duty_taken - OLD.total_days, updated_at = NOW()
                WHERE user_id = OLD.user_id AND academic_year = v_old_year;
            ELSIF v_old_type LIKE '%loss%' OR v_old_type LIKE '%lop%' THEN
                NULL;
            ELSE
                RAISE EXCEPTION 'Ledger Error: Unsupported old leave type %.', OLD.leave_type 
                    USING ERRCODE = '22023';
            END IF;

            IF v_old_type NOT LIKE '%loss%' AND v_old_type NOT LIKE '%lop%' THEN
                GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
                IF v_rows_updated = 0 THEN
                    RAISE EXCEPTION 'Ledger Error: Failed to reverse old balance for user % in academic year %.', OLD.user_id, v_old_year 
                        USING ERRCODE = '23514';
                END IF;
            END IF;
        END IF;

        -- 5. Phase 2: Apply New Balance if it is now Approved
        IF NEW.status = 'Approved' THEN
            IF v_new_bal.casual_leave_quota IS NULL OR v_new_bal.casual_leave_taken IS NULL 
               OR v_new_bal.medical_leave_quota IS NULL OR v_new_bal.medical_leave_taken IS NULL 
               OR v_new_bal.earned_leave_quota IS NULL OR v_new_bal.earned_leave_taken IS NULL 
               OR v_new_bal.on_duty_taken IS NULL THEN
                RAISE EXCEPTION 'Ledger Corruption: Target balance row contains null quota or taken counts for user % year %.', NEW.user_id, v_new_year 
                    USING ERRCODE = '23502';
            END IF;

            IF v_new_type LIKE '%casual%' THEN
                IF (v_new_bal.casual_leave_taken + NEW.total_days) > v_new_bal.casual_leave_quota THEN
                    RAISE EXCEPTION 'Leave Entitlement Exceeded: Employee % has insufficient casual leave balance (Quota: %, Already Taken: %, Requested: %).',
                        NEW.user_id, v_new_bal.casual_leave_quota, v_new_bal.casual_leave_taken, NEW.total_days USING ERRCODE = '23514';
                END IF;
                UPDATE public.staff_leave_balances 
                SET casual_leave_taken = casual_leave_taken + NEW.total_days, updated_at = NOW()
                WHERE user_id = NEW.user_id AND academic_year = v_new_year;
            ELSIF v_new_type LIKE '%med%' OR v_new_type LIKE '%sick%' THEN
                IF (v_new_bal.medical_leave_taken + NEW.total_days) > v_new_bal.medical_leave_quota THEN
                    RAISE EXCEPTION 'Leave Entitlement Exceeded: Employee % has insufficient medical leave balance (Quota: %, Already Taken: %, Requested: %).',
                        NEW.user_id, v_new_bal.medical_leave_quota, v_new_bal.medical_leave_taken, NEW.total_days USING ERRCODE = '23514';
                END IF;
                UPDATE public.staff_leave_balances 
                SET medical_leave_taken = medical_leave_taken + NEW.total_days, updated_at = NOW()
                WHERE user_id = NEW.user_id AND academic_year = v_new_year;
            ELSIF v_new_type LIKE '%earn%' THEN
                IF (v_new_bal.earned_leave_taken + NEW.total_days) > v_new_bal.earned_leave_quota THEN
                    RAISE EXCEPTION 'Leave Entitlement Exceeded: Employee % has insufficient earned leave balance (Quota: %, Already Taken: %, Requested: %).',
                        NEW.user_id, v_new_bal.earned_leave_quota, v_new_bal.earned_leave_taken, NEW.total_days USING ERRCODE = '23514';
                END IF;
                UPDATE public.staff_leave_balances 
                SET earned_leave_taken = earned_leave_taken + NEW.total_days, updated_at = NOW()
                WHERE user_id = NEW.user_id AND academic_year = v_new_year;
            ELSIF v_new_type LIKE '%duty%' OR v_new_type LIKE '%on_duty%' THEN
                UPDATE public.staff_leave_balances 
                SET on_duty_taken = on_duty_taken + NEW.total_days, updated_at = NOW()
                WHERE user_id = NEW.user_id AND academic_year = v_new_year;
            ELSIF v_new_type LIKE '%loss%' OR v_new_type LIKE '%lop%' THEN
                NULL;
            ELSE
                RAISE EXCEPTION 'Ledger Error: Unsupported new leave type %.', NEW.leave_type 
                    USING ERRCODE = '22023';
            END IF;

            IF v_new_type NOT LIKE '%loss%' AND v_new_type NOT LIKE '%lop%' THEN
                GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
                IF v_rows_updated = 0 THEN
                    RAISE EXCEPTION 'Ledger Integrity Failure: Failed to apply balance deduction for user % in academic year %.', NEW.user_id, v_new_year 
                        USING ERRCODE = '23514';
                END IF;
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
-- 7. BUG-SEC-002: HARDEN GET_CURRENT_USER_ROLE() (Fail-Closed & Search Path)
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
-- 8. DEF-110 & DEF-121: SEARCH_PATH LOCKDOWN & VERIFIED FUNCTION PERMISSIONS
-- Pins search_path and revokes ALL permissions from PUBLIC and anon.
-- Grants strictly EXECUTE to authenticated role for necessary RLS helper functions.
-- =============================================================================

-- Newly created / replaced functions in Stage 3:
ALTER FUNCTION public.get_current_user_role() SET search_path = public;
ALTER FUNCTION public.safe_cast_uuid(text) SET search_path = public;
ALTER FUNCTION public.get_academic_year_for_date(date) SET search_path = public;
ALTER FUNCTION public.is_teacher_assigned_to_class(uuid, text) SET search_path = public;
ALTER FUNCTION public.is_teacher_assigned_to_class_and_subject(uuid, text, text) SET search_path = public;
ALTER FUNCTION public.protect_profile_sensitive_columns() SET search_path = public;
ALTER FUNCTION public.set_exam_result_student_name() SET search_path = public;
ALTER FUNCTION public.protect_attendance_session_immutable_columns() SET search_path = public;
ALTER FUNCTION public.protect_attendance_record_immutable_columns() SET search_path = public;
ALTER FUNCTION public.validate_staff_leave_application() SET search_path = public;
ALTER FUNCTION public.sync_staff_leave_balance_transition() SET search_path = public;

-- Revoke ALL execution from PUBLIC and anon across all functions
REVOKE ALL ON FUNCTION public.get_current_user_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.safe_cast_uuid(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_academic_year_for_date(date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_teacher_assigned_to_class(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_teacher_assigned_to_class_and_subject(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.protect_profile_sensitive_columns() FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION public.set_exam_result_student_name() FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION public.protect_attendance_session_immutable_columns() FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION public.protect_attendance_record_immutable_columns() FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION public.validate_staff_leave_application() FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION public.sync_staff_leave_balance_transition() FROM PUBLIC, authenticated, anon;

-- Explicitly grant EXECUTE strictly to authenticated role for RLS policy helper functions
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.safe_cast_uuid(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_academic_year_for_date(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_teacher_assigned_to_class(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_teacher_assigned_to_class_and_subject(uuid, text, text) TO authenticated;

-- Dynamic verification of pre-existing catalog functions (Safely alters ONLY if function exists)
DO $$
BEGIN
    -- is_parent_of(uuid)
    IF EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'is_parent_of'
    ) THEN
        EXECUTE 'ALTER FUNCTION public.is_parent_of(uuid) SET search_path = public';
        EXECUTE 'REVOKE ALL ON FUNCTION public.is_parent_of(uuid) FROM PUBLIC, anon';
        EXECUTE 'GRANT EXECUTE ON FUNCTION public.is_parent_of(uuid) TO authenticated';
    END IF;

    -- place_store_order(uuid, text, jsonb, numeric)
    IF EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'place_store_order'
    ) THEN
        EXECUTE 'ALTER FUNCTION public.place_store_order(uuid, text, jsonb, numeric) SET search_path = public';
        EXECUTE 'REVOKE ALL ON FUNCTION public.place_store_order(uuid, text, jsonb, numeric) FROM PUBLIC, anon';
        EXECUTE 'GRANT EXECUTE ON FUNCTION public.place_store_order(uuid, text, jsonb, numeric) TO authenticated';
    END IF;

    -- notify_certificate_status()
    IF EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'notify_certificate_status'
    ) THEN
        EXECUTE 'ALTER FUNCTION public.notify_certificate_status() SET search_path = public';
        EXECUTE 'REVOKE ALL ON FUNCTION public.notify_certificate_status() FROM PUBLIC, anon';
    END IF;

    -- notify_fee_payment()
    IF EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'notify_fee_payment'
    ) THEN
        EXECUTE 'ALTER FUNCTION public.notify_fee_payment() SET search_path = public';
        EXECUTE 'REVOKE ALL ON FUNCTION public.notify_fee_payment() FROM PUBLIC, anon';
    END IF;

    -- notify_new_admission()
    IF EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'notify_new_admission'
    ) THEN
        EXECUTE 'ALTER FUNCTION public.notify_new_admission() SET search_path = public';
        EXECUTE 'REVOKE ALL ON FUNCTION public.notify_new_admission() FROM PUBLIC, anon';
    END IF;

    -- notify_new_assignment()
    IF EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'notify_new_assignment'
    ) THEN
        EXECUTE 'ALTER FUNCTION public.notify_new_assignment() SET search_path = public';
        EXECUTE 'REVOKE ALL ON FUNCTION public.notify_new_assignment() FROM PUBLIC, anon';
    END IF;

    -- notify_new_concern()
    IF EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'notify_new_concern'
    ) THEN
        EXECUTE 'ALTER FUNCTION public.notify_new_concern() SET search_path = public';
        EXECUTE 'REVOKE ALL ON FUNCTION public.notify_new_concern() FROM PUBLIC, anon';
    END IF;

    -- notify_store_order()
    IF EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'notify_store_order'
    ) THEN
        EXECUTE 'ALTER FUNCTION public.notify_store_order() SET search_path = public';
        EXECUTE 'REVOKE ALL ON FUNCTION public.notify_store_order() FROM PUBLIC, anon';
    END IF;
END $$;

COMMIT;
