-- =============================================================================
-- Migration Script: 028_stage1_columns.sql (Phase 1.4.1 Final Consolidated Release)
-- Description: Non-destructive additive column schema modifications, explicit default resets,
--              preflight NOT NULL assertions, safe backfills, and verified foreign key attachments
-- Architecture: Single-Institution Dedicated Deployment (Adhityan College)
-- Target Database: PostgreSQL 15+ (Supabase Managed Instance: ogbbyqxulhegwvrtinib.supabase.co)
-- Defects Remediated: ISSUE-01 (student_id), DEF-011 (batch), DEF-103 (explicit column defaults & COE preservation),
--                     DEF-106 (hall_tickets & reception FK attachments), DEF-123 (preflight nullability checks & key column NOT NULL enforcement)
-- Safety Safeguards: Strict lock_timeout (3s) and statement_timeout (10s)
-- Mode: Static Engineering Specification (Zero Live Execution)
-- =============================================================================

SET lock_timeout = '3s';
SET statement_timeout = '10s';

BEGIN;

-- =============================================================================
-- 1. PUBLIC.PROFILES (Account Lifecycle, Login Identifier & Role NOT NULL Enforcement)
-- =============================================================================
ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

ALTER TABLE public.profiles 
    ALTER COLUMN status SET DEFAULT 'active';

ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS login_id TEXT DEFAULT NULL;

ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS student_id TEXT DEFAULT NULL;

-- Backfill missing status safely before asserting NOT NULL
UPDATE public.profiles 
SET status = 'active' 
WHERE status IS NULL;

-- Preflight check on profiles role and status to prevent constraint failure
DO $$
DECLARE
    v_null_roles INT;
    v_null_status INT;
BEGIN
    SELECT COUNT(*) INTO v_null_roles FROM public.profiles WHERE role IS NULL;
    IF v_null_roles > 0 THEN
        RAISE EXCEPTION 'Preflight Failure: public.profiles contains % rows with NULL role. Manual remediation required.', v_null_roles;
    END IF;

    SELECT COUNT(*) INTO v_null_status FROM public.profiles WHERE status IS NULL;
    IF v_null_status > 0 THEN
        RAISE EXCEPTION 'Preflight Failure: public.profiles contains % rows with NULL status after backfill.', v_null_status;
    END IF;
END $$;

ALTER TABLE public.profiles 
    ALTER COLUMN status SET NOT NULL;

ALTER TABLE public.profiles 
    ALTER COLUMN role SET NOT NULL;

-- =============================================================================
-- 2. PUBLIC.TIMETABLES (Paramedical Term, Program & Laboratory Tracking)
-- =============================================================================
ALTER TABLE public.timetables 
    ADD COLUMN IF NOT EXISTS course_name TEXT DEFAULT NULL;

ALTER TABLE public.timetables 
    ADD COLUMN IF NOT EXISTS year_semester TEXT DEFAULT '1st Year';

ALTER TABLE public.timetables 
    ADD COLUMN IF NOT EXISTS room_lab TEXT DEFAULT NULL;

-- =============================================================================
-- 3. PUBLIC.EXAMS (Exam Scope & Controlled Publication Defaults)
-- DEF-103: Alter column defaults to FALSE for future records without blindly overwriting
-- historical examination publication states, pending Controller of Examinations audit.
-- =============================================================================
ALTER TABLE public.exams 
    ADD COLUMN IF NOT EXISTS course TEXT DEFAULT NULL;

ALTER TABLE public.exams 
    ADD COLUMN IF NOT EXISTS semester TEXT DEFAULT NULL;

ALTER TABLE public.exams 
    ADD COLUMN IF NOT EXISTS exam_category TEXT DEFAULT 'University Examination';

-- Master portal visibility toggle (Future insertions default to FALSE)
ALTER TABLE public.exams 
    ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE;
ALTER TABLE public.exams 
    ALTER COLUMN is_published SET DEFAULT FALSE;

-- Timetable publication flag
ALTER TABLE public.exams 
    ADD COLUMN IF NOT EXISTS timetable_published BOOLEAN DEFAULT FALSE;
ALTER TABLE public.exams 
    ALTER COLUMN timetable_published SET DEFAULT FALSE;

-- Hall ticket download publication flag
ALTER TABLE public.exams 
    ADD COLUMN IF NOT EXISTS hall_ticket_published BOOLEAN DEFAULT FALSE;
ALTER TABLE public.exams 
    ALTER COLUMN hall_ticket_published SET DEFAULT FALSE;

-- Result publication gate
ALTER TABLE public.exams 
    ADD COLUMN IF NOT EXISTS results_published BOOLEAN DEFAULT FALSE;
ALTER TABLE public.exams 
    ALTER COLUMN results_published SET DEFAULT FALSE;

-- Backfill NULL flags safely to FALSE without touching existing TRUE records (Preserves historical COE data)
UPDATE public.exams SET is_published = FALSE WHERE is_published IS NULL;
UPDATE public.exams SET timetable_published = FALSE WHERE timetable_published IS NULL;
UPDATE public.exams SET hall_ticket_published = FALSE WHERE hall_ticket_published IS NULL;
UPDATE public.exams SET results_published = FALSE WHERE results_published IS NULL;

-- Enforce NOT NULL on publication boolean flags
ALTER TABLE public.exams 
    ALTER COLUMN is_published SET NOT NULL;

ALTER TABLE public.exams 
    ALTER COLUMN timetable_published SET NOT NULL;

ALTER TABLE public.exams 
    ALTER COLUMN hall_ticket_published SET NOT NULL;

ALTER TABLE public.exams 
    ALTER COLUMN results_published SET NOT NULL;

-- =============================================================================
-- 4. PUBLIC.EXAM_SCHEDULES (Subject Code & University Passing Threshold)
-- =============================================================================
ALTER TABLE public.exam_schedules 
    ADD COLUMN IF NOT EXISTS subject_code TEXT DEFAULT NULL;

ALTER TABLE public.exam_schedules 
    ADD COLUMN IF NOT EXISTS passing_marks INTEGER DEFAULT 40;

-- =============================================================================
-- 5. PUBLIC.EXAM_RESULTS (Marksheet Metadata & Safe Academic Defaults)
-- =============================================================================
ALTER TABLE public.exam_results 
    ADD COLUMN IF NOT EXISTS subject_code TEXT DEFAULT NULL;

ALTER TABLE public.exam_results 
    ADD COLUMN IF NOT EXISTS result_status TEXT DEFAULT 'PENDING';
ALTER TABLE public.exam_results 
    ALTER COLUMN result_status SET DEFAULT 'PENDING';

ALTER TABLE public.exam_results 
    ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE;
ALTER TABLE public.exam_results 
    ALTER COLUMN is_published SET DEFAULT FALSE;

ALTER TABLE public.exam_results 
    ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.exam_results 
    ALTER COLUMN published_at SET DEFAULT NULL;

-- Backfill NULL flags safely without modifying existing historical evaluations
UPDATE public.exam_results SET result_status = 'PENDING' WHERE result_status IS NULL;
UPDATE public.exam_results SET is_published = FALSE WHERE is_published IS NULL;

-- Enforce NOT NULL on key evaluation fields
ALTER TABLE public.exam_results 
    ALTER COLUMN result_status SET NOT NULL;

ALTER TABLE public.exam_results 
    ALTER COLUMN is_published SET NOT NULL;

-- =============================================================================
-- 6. PUBLIC.CLASS_ATTENDANCE_SESSIONS (Preflight Nullability & NOT NULL Assertion)
-- DEF-011 & DEF-123: Validates existing records have zero NULLs in key columns
-- before asserting NOT NULL constraints. Does NOT fabricate fake identifiers.
-- =============================================================================
ALTER TABLE public.class_attendance_sessions 
    ADD COLUMN IF NOT EXISTS batch TEXT DEFAULT 'All';

ALTER TABLE public.class_attendance_sessions 
    ALTER COLUMN batch SET DEFAULT 'All';

UPDATE public.class_attendance_sessions 
SET batch = 'All' 
WHERE batch IS NULL;

-- Preflight Nullability Verification
DO $$
DECLARE
    v_null_count INT;
BEGIN
    SELECT COUNT(*) INTO v_null_count 
    FROM public.class_attendance_sessions 
    WHERE class_name IS NULL 
       OR session_date IS NULL 
       OR period_number IS NULL 
       OR subject_code IS NULL 
       OR batch IS NULL;

    IF v_null_count > 0 THEN
        RAISE EXCEPTION 'Preflight Failure: class_attendance_sessions contains % rows with NULL in key columns. Manual data resolution required.', v_null_count;
    END IF;
END $$;

ALTER TABLE public.class_attendance_sessions 
    ALTER COLUMN batch SET NOT NULL;

ALTER TABLE public.class_attendance_sessions 
    ALTER COLUMN class_name SET NOT NULL;

ALTER TABLE public.class_attendance_sessions 
    ALTER COLUMN session_date SET NOT NULL;

ALTER TABLE public.class_attendance_sessions 
    ALTER COLUMN period_number SET NOT NULL;

ALTER TABLE public.class_attendance_sessions 
    ALTER COLUMN subject_code SET NOT NULL;

-- =============================================================================
-- 7. PUBLIC.HALL_TICKETS (DEF-106: Exam Reference & Verified Foreign Key)
-- =============================================================================
ALTER TABLE public.hall_tickets 
    ADD COLUMN IF NOT EXISTS exam_id UUID DEFAULT NULL;

ALTER TABLE public.hall_tickets 
    ADD COLUMN IF NOT EXISTS file_url TEXT DEFAULT NULL;

-- Preflight Orphan Verification for hall_tickets.exam_id
DO $$
DECLARE
    v_orphan_count INT;
BEGIN
    SELECT COUNT(*) INTO v_orphan_count
    FROM public.hall_tickets ht
    WHERE ht.exam_id IS NOT NULL 
      AND NOT EXISTS (SELECT 1 FROM public.exams e WHERE e.id = ht.exam_id);

    IF v_orphan_count > 0 THEN
        -- Nullify orphan references safely to preserve student hall ticket records
        UPDATE public.hall_tickets ht
        SET exam_id = NULL
        WHERE ht.exam_id IS NOT NULL 
          AND NOT EXISTS (SELECT 1 FROM public.exams e WHERE e.id = ht.exam_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc 
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name 
         AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND tc.table_schema = 'public'
          AND tc.table_name = 'hall_tickets' 
          AND kcu.column_name = 'exam_id'
    ) THEN
        ALTER TABLE public.hall_tickets 
            ADD CONSTRAINT fk_hall_tickets_exam 
            FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE SET NULL;
    END IF;
END $$;

-- =============================================================================
-- 8. PUBLIC.RECEPTION_VISITORS (Campus Access Control & Tracking)
-- =============================================================================
ALTER TABLE public.reception_visitors 
    ADD COLUMN IF NOT EXISTS check_out_time TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.reception_visitors 
    ADD COLUMN IF NOT EXISTS host_person TEXT DEFAULT NULL;

ALTER TABLE public.reception_visitors 
    ADD COLUMN IF NOT EXISTS badge_number TEXT DEFAULT NULL;

-- =============================================================================
-- 9. PUBLIC.RECEPTION_APPOINTMENTS (Institutional Guest Management & Verified FK)
-- =============================================================================
ALTER TABLE public.reception_appointments 
    ADD COLUMN IF NOT EXISTS with_user_id UUID DEFAULT NULL;

-- Preflight Orphan Verification for reception_appointments.with_user_id
DO $$
DECLARE
    v_orphan_count INT;
BEGIN
    SELECT COUNT(*) INTO v_orphan_count
    FROM public.reception_appointments ra
    WHERE ra.with_user_id IS NOT NULL 
      AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = ra.with_user_id);

    IF v_orphan_count > 0 THEN
        UPDATE public.reception_appointments ra
        SET with_user_id = NULL
        WHERE ra.with_user_id IS NOT NULL 
          AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = ra.with_user_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc 
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name 
         AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND tc.table_schema = 'public'
          AND tc.table_name = 'reception_appointments' 
          AND kcu.column_name = 'with_user_id'
    ) THEN
        ALTER TABLE public.reception_appointments 
            ADD CONSTRAINT fk_reception_appointments_with_user 
            FOREIGN KEY (with_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

ALTER TABLE public.reception_appointments 
    ADD COLUMN IF NOT EXISTS appointment_date DATE DEFAULT CURRENT_DATE;

ALTER TABLE public.reception_appointments 
    ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;

-- =============================================================================
-- 10. PUBLIC.RECEPTION_ENQUIRIES (Prospective Student & Visitor Contact)
-- =============================================================================
ALTER TABLE public.reception_enquiries 
    ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT NULL;

-- =============================================================================
-- X. PUBLIC.HOSTEL_OUT_PASSES (fail-safe defaults)
-- The original defaults auto-approved every new out-pass (warden_status='Approved',
-- parent_otp_verified=TRUE). New rows must start pending/unverified. Existing rows
-- are NOT modified.
-- =============================================================================
ALTER TABLE public.hostel_out_passes ALTER COLUMN warden_status SET DEFAULT 'Pending';
ALTER TABLE public.hostel_out_passes ALTER COLUMN parent_otp_verified SET DEFAULT FALSE;

COMMIT;
