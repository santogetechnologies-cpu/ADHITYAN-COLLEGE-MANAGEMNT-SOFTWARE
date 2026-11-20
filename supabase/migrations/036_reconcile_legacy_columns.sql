-- =============================================================================
-- Migration 036: Columns the application uses that only existed in the abandoned
-- migrations 016-027 (archived in supabase/migrations_archive/). Purely additive and
-- idempotent; no data is changed. Run after 035.
--   timetables.session_type      (src/components/admin/TimetableManagement.tsx)
--   exam_schedules.day_of_week   (exam timetable UI)
--   student_attendance.*         (institutional id / course / semester enrichment, 'leave' status)
--   reception_appointments.contact, reception_enquiries.email/notes
-- Deliberately NOT carried over: profiles.verification_code / verification_expires_at
-- (OTP stored in plain text - replaced by Supabase email OTP in auth-first-login).
-- =============================================================================
BEGIN;

ALTER TABLE public.timetables ADD COLUMN IF NOT EXISTS session_type TEXT DEFAULT 'theory';
ALTER TABLE public.exam_schedules ADD COLUMN IF NOT EXISTS day_of_week TEXT;

ALTER TABLE public.student_attendance
    ADD COLUMN IF NOT EXISTS institutional_student_id TEXT,
    ADD COLUMN IF NOT EXISTS course TEXT,
    ADD COLUMN IF NOT EXISTS semester TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
-- widen only (adds 'leave'); every previously valid value stays valid
ALTER TABLE public.student_attendance DROP CONSTRAINT IF EXISTS student_attendance_status_check;
ALTER TABLE public.student_attendance ADD CONSTRAINT student_attendance_status_check
    CHECK (status IN ('present', 'absent', 'late', 'leave', 'excused'));
CREATE INDEX IF NOT EXISTS idx_student_att_student_date ON public.student_attendance(student_id, date);
CREATE INDEX IF NOT EXISTS idx_student_att_semester ON public.student_attendance(student_id, semester);

ALTER TABLE public.reception_appointments ADD COLUMN IF NOT EXISTS contact TEXT;
ALTER TABLE public.reception_enquiries
    ADD COLUMN IF NOT EXISTS email TEXT,
    ADD COLUMN IF NOT EXISTS notes TEXT;

COMMIT;
