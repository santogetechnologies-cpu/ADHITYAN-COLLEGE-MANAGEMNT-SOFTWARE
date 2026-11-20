-- =============================================================================
-- Migration 021: Student Attendance & Dashboard Mood Check-In Separation
-- Institutional College Management System - Adithyan Institute of Paramedical
-- =============================================================================

-- 1. ENHANCE STUDENT ATTENDANCE TABLE
-- Ensures every record includes Student ID, UUID, Course, Semester, Subject, Date, Status, Timestamps
ALTER TABLE public.student_attendance
    ADD COLUMN IF NOT EXISTS institutional_student_id TEXT,
    ADD COLUMN IF NOT EXISTS course TEXT,
    ADD COLUMN IF NOT EXISTS semester TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Expand status check constraint to support 'leave'
ALTER TABLE public.student_attendance 
    DROP CONSTRAINT IF EXISTS student_attendance_status_check;

ALTER TABLE public.student_attendance
    ADD CONSTRAINT student_attendance_status_check 
    CHECK (status IN ('present', 'absent', 'late', 'leave', 'excused'));

-- Indexes for lightning-fast monthly and semester-wise calculations
CREATE INDEX IF NOT EXISTS idx_student_att_student_date 
    ON public.student_attendance(student_id, date);

CREATE INDEX IF NOT EXISTS idx_student_att_semester 
    ON public.student_attendance(student_id, semester);

CREATE INDEX IF NOT EXISTS idx_student_att_course 
    ON public.student_attendance(course);

CREATE INDEX IF NOT EXISTS idx_student_att_institutional_id 
    ON public.student_attendance(institutional_student_id);

-- Trigger to auto-enrich institutional_student_id, course, semester from profiles/students
CREATE OR REPLACE FUNCTION public.sync_attendance_student_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_student_id TEXT;
    v_department TEXT;
    v_class TEXT;
BEGIN
    SELECT 
        COALESCE(s.student_id, p.student_id, p.roll_number),
        COALESCE(s.department, p.department),
        COALESCE(s.class_name, p.class_name)
    INTO v_student_id, v_department, v_class
    FROM public.profiles p
    LEFT JOIN public.students s ON s.user_id = p.id
    WHERE p.id = NEW.student_id;

    IF NEW.institutional_student_id IS NULL OR NEW.institutional_student_id = '' THEN
        NEW.institutional_student_id := v_student_id;
    END IF;

    IF NEW.course IS NULL OR NEW.course = '' THEN
        NEW.course := v_department;
    END IF;

    IF NEW.semester IS NULL OR NEW.semester = '' THEN
        NEW.semester := v_class;
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_attendance_metadata ON public.student_attendance;
CREATE TRIGGER trg_sync_attendance_metadata
    BEFORE INSERT OR UPDATE ON public.student_attendance
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_attendance_student_metadata();

-- Backfill existing attendance records with institutional_student_id, course, semester
UPDATE public.student_attendance a
SET 
    institutional_student_id = COALESCE(a.institutional_student_id, s.student_id, p.student_id, p.roll_number, 'AIP-VERIFIED'),
    course = COALESCE(a.course, p.department, 'Paramedical Sciences'),
    semester = COALESCE(a.semester, p.class_name, 'Semester 1')
FROM public.profiles p
LEFT JOIN public.students s ON s.user_id = p.id
WHERE a.student_id = p.id
  AND (a.institutional_student_id IS NULL OR a.course IS NULL OR a.semester IS NULL);

-- Enforce strict RLS: Students have SELECT-only access; Teachers/Admins can manage
ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students and parents can view attendance" ON public.student_attendance;
CREATE POLICY "Students and parents can view attendance"
    ON public.student_attendance FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR public.is_parent_of(student_id)
        OR public.get_current_user_role() IN ('teacher', 'admin', 'principal')
    );

DROP POLICY IF EXISTS "Teachers and admins can manage attendance" ON public.student_attendance;
CREATE POLICY "Teachers and admins can manage attendance"
    ON public.student_attendance FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('teacher', 'admin', 'principal'))
    WITH CHECK (public.get_current_user_role() IN ('teacher', 'admin', 'principal'));


-- -----------------------------------------------------------------------------
-- 2. DEDICATED STUDENT MOOD CHECK-IN TABLE (COMPLETELY SEPARATE FROM ATTENDANCE)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_mood_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_id TEXT, -- Institutional Student ID (e.g. AIP-2025-1001)
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    session TEXT NOT NULL CHECK (session IN ('morning', 'afternoon', 'evening')),
    mood TEXT NOT NULL CHECK (mood IN ('Happy', 'Good', 'Normal', 'Tired', 'Stressed', 'Unwell')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_student_mood_per_session_day UNIQUE (user_id, date, session)
);

CREATE INDEX IF NOT EXISTS idx_student_mood_user_date ON public.student_mood_checkins(user_id, date);
CREATE INDEX IF NOT EXISTS idx_student_mood_student_id ON public.student_mood_checkins(student_id);

-- Auto-populate student_id in mood check-ins if not provided
CREATE OR REPLACE FUNCTION public.sync_mood_student_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_student_id TEXT;
BEGIN
    SELECT COALESCE(s.student_id, p.student_id, p.roll_number)
    INTO v_student_id
    FROM public.profiles p
    LEFT JOIN public.students s ON s.user_id = p.id
    WHERE p.id = NEW.user_id;

    IF NEW.student_id IS NULL OR NEW.student_id = '' THEN
        NEW.student_id := v_student_id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_mood_student_id ON public.student_mood_checkins;
CREATE TRIGGER trg_sync_mood_student_id
    BEFORE INSERT OR UPDATE ON public.student_mood_checkins
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_mood_student_id();

-- RLS for student mood checkins
ALTER TABLE public.student_mood_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own mood checkins" ON public.student_mood_checkins;
CREATE POLICY "Students can view own mood checkins"
    ON public.student_mood_checkins FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        OR public.get_current_user_role() IN ('teacher', 'admin', 'principal')
    );

DROP POLICY IF EXISTS "Students can submit own mood checkin" ON public.student_mood_checkins;
CREATE POLICY "Students can submit own mood checkin"
    ON public.student_mood_checkins FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Students can update own mood checkin for today" ON public.student_mood_checkins;
CREATE POLICY "Students can update own mood checkin for today"
    ON public.student_mood_checkins FOR UPDATE TO authenticated
    USING (user_id = auth.uid() AND date = CURRENT_DATE)
    WITH CHECK (user_id = auth.uid() AND date = CURRENT_DATE);

-- 3. REALTIME REPLICATION
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_mood_checkins;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

