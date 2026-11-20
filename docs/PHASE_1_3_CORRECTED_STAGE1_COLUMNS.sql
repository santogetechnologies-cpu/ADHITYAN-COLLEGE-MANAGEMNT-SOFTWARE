-- =============================================================================
-- Migration Script: 028_stage1_columns.sql (Phase 1.3 Corrected Release)
-- Description: Non-destructive additive column schema modifications
-- Architecture: Single-Institution Dedicated Deployment (Adhityan College)
-- Target Database: PostgreSQL 15+ (Supabase Managed Instance: ogbbyqxulhegwvrtinib.supabase.co)
-- Defects Remediated: ISSUE-01 (student_id), DEF-011 (batch), DEF-103 (safe academic defaults)
-- Safety Safeguards: Strict lock_timeout (3s) and statement_timeout (10s)
-- Mode: Static Engineering Specification (Zero Live Execution)
-- =============================================================================

SET lock_timeout = '3s';
SET statement_timeout = '10s';

BEGIN;

-- =============================================================================
-- 1. PUBLIC.PROFILES (Account Lifecycle, Login Identifier & Student Link)
-- =============================================================================
-- Adds status column to support fail-closed state machine ('active', 'inactive', 'suspended')
ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- Adds institutional login identifier (Roll No / Staff ID) for multi-credential authentication
ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS login_id TEXT DEFAULT NULL;

-- ISSUE-01 / DEF-103: Adds institutional student ID code referenced by exam results & admissions
ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS student_id TEXT DEFAULT NULL;

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
-- 3. PUBLIC.EXAMS (Exam Scope & Controlled Publication Gates)
-- DEF-103: Publication flags MUST default to FALSE to prevent unverified leaks
-- =============================================================================
ALTER TABLE public.exams 
    ADD COLUMN IF NOT EXISTS course TEXT DEFAULT NULL;

ALTER TABLE public.exams 
    ADD COLUMN IF NOT EXISTS semester TEXT DEFAULT NULL;

ALTER TABLE public.exams 
    ADD COLUMN IF NOT EXISTS exam_category TEXT DEFAULT 'University Examination';

-- Master visibility toggle for exam portal (default FALSE until COE approval)
ALTER TABLE public.exams 
    ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE;

-- Timetable publication flag (default FALSE)
ALTER TABLE public.exams 
    ADD COLUMN IF NOT EXISTS timetable_published BOOLEAN DEFAULT FALSE;

-- Hall ticket publication flag (default FALSE)
ALTER TABLE public.exams 
    ADD COLUMN IF NOT EXISTS hall_ticket_published BOOLEAN DEFAULT FALSE;

-- Result publication gate (default FALSE)
ALTER TABLE public.exams 
    ADD COLUMN IF NOT EXISTS results_published BOOLEAN DEFAULT FALSE;

-- =============================================================================
-- 4. PUBLIC.EXAM_SCHEDULES (Subject Code & University Passing Threshold)
-- =============================================================================
ALTER TABLE public.exam_schedules 
    ADD COLUMN IF NOT EXISTS subject_code TEXT DEFAULT NULL;

ALTER TABLE public.exam_schedules 
    ADD COLUMN IF NOT EXISTS passing_marks INTEGER DEFAULT 40;

-- =============================================================================
-- 5. PUBLIC.EXAM_RESULTS (Marksheet Metadata & Safe Academic Defaults)
-- DEF-103: Result status defaults to 'PENDING', is_published to FALSE, published_at to NULL
-- =============================================================================
ALTER TABLE public.exam_results 
    ADD COLUMN IF NOT EXISTS subject_code TEXT DEFAULT NULL;

ALTER TABLE public.exam_results 
    ADD COLUMN IF NOT EXISTS result_status TEXT DEFAULT 'PENDING';

ALTER TABLE public.exam_results 
    ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE;

ALTER TABLE public.exam_results 
    ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ DEFAULT NULL;

-- =============================================================================
-- 6. PUBLIC.CLASS_ATTENDANCE_SESSIONS (Clinical Lab Practical Batch Support)
-- DEF-011: Enables parallel practical lab sessions in the same period
-- =============================================================================
ALTER TABLE public.class_attendance_sessions 
    ADD COLUMN IF NOT EXISTS batch TEXT NOT NULL DEFAULT 'All';

-- =============================================================================
-- 7. PUBLIC.RECEPTION_VISITORS (Campus Access Control & Tracking)
-- =============================================================================
ALTER TABLE public.reception_visitors 
    ADD COLUMN IF NOT EXISTS check_out_time TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.reception_visitors 
    ADD COLUMN IF NOT EXISTS host_person TEXT DEFAULT NULL;

ALTER TABLE public.reception_visitors 
    ADD COLUMN IF NOT EXISTS badge_number TEXT DEFAULT NULL;

-- =============================================================================
-- 8. PUBLIC.RECEPTION_APPOINTMENTS (Institutional Guest Management)
-- =============================================================================
ALTER TABLE public.reception_appointments 
    ADD COLUMN IF NOT EXISTS with_user_id UUID DEFAULT NULL REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.reception_appointments 
    ADD COLUMN IF NOT EXISTS appointment_date DATE DEFAULT CURRENT_DATE;

ALTER TABLE public.reception_appointments 
    ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;

-- =============================================================================
-- 9. PUBLIC.RECEPTION_ENQUIRIES (Prospective Student & Visitor Contact)
-- =============================================================================
ALTER TABLE public.reception_enquiries 
    ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT NULL;

COMMIT;
