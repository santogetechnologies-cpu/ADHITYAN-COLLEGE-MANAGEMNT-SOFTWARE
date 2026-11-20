-- ============================================================================
-- MIGRATION 016: College Course Timetable & Profiles Status Support
-- Adhithyan Group of Institutions
-- ============================================================================

DO $$
BEGIN
    -- 1. PROFILES STATUS COLUMN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'status'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check CHECK (status IN ('active', 'inactive', 'suspended'));
    END IF;

    -- Ensure all existing profiles have status set to 'active'
    UPDATE public.profiles SET status = 'active' WHERE status IS NULL;

    -- Index for real-time overview counts
    CREATE INDEX IF NOT EXISTS idx_profiles_role_status ON public.profiles(role, status);

    -- 2. COLLEGE TIMETABLES REFACTOR
    -- Add college-specific columns to timetables table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'timetables' 
          AND column_name = 'course_name'
    ) THEN
        ALTER TABLE public.timetables ADD COLUMN course_name TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'timetables' 
          AND column_name = 'year_semester'
    ) THEN
        ALTER TABLE public.timetables ADD COLUMN year_semester TEXT DEFAULT '1st Year';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'timetables' 
          AND column_name = 'room_lab'
    ) THEN
        ALTER TABLE public.timetables ADD COLUMN room_lab TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'timetables' 
          AND column_name = 'session_type'
    ) THEN
        ALTER TABLE public.timetables ADD COLUMN session_type TEXT DEFAULT 'theory';
    END IF;

    -- Backfill existing rows
    UPDATE public.timetables 
    SET 
        course_name = COALESCE(course_name, class_name),
        year_semester = COALESCE(year_semester, '1st Year'),
        room_lab = COALESCE(room_lab, room)
    WHERE course_name IS NULL;

    -- Ensure class_name is synchronized with course_name for backwards compatibility
    UPDATE public.timetables
    SET class_name = course_name || ' (' || year_semester || ')'
    WHERE class_name IS NULL OR class_name = '';

    -- Create high-performance indexes for college timetable queries
    CREATE INDEX IF NOT EXISTS idx_timetables_course_year ON public.timetables(course_name, year_semester, day_of_week);
    CREATE INDEX IF NOT EXISTS idx_timetables_room_lab ON public.timetables(room_lab, day_of_week);
    CREATE INDEX IF NOT EXISTS idx_timetables_teacher_day ON public.timetables(teacher_name, day_of_week);
END $$;

