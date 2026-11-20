-- Migration 022: Academic Examination & Timetable Desk Enhancements
-- Adds course, semester, publication status, and link references

-- 1. Exams Table Enhancements
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS course TEXT;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS semester TEXT;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS exam_category TEXT DEFAULT 'University Examination';
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS timetable_published BOOLEAN DEFAULT TRUE;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS hall_ticket_published BOOLEAN DEFAULT TRUE;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS results_published BOOLEAN DEFAULT FALSE;

-- 2. Exam Schedules Table Enhancements
ALTER TABLE public.exam_schedules ADD COLUMN IF NOT EXISTS subject_code TEXT;
ALTER TABLE public.exam_schedules ADD COLUMN IF NOT EXISTS day_of_week TEXT;
ALTER TABLE public.exam_schedules ADD COLUMN IF NOT EXISTS passing_marks INTEGER DEFAULT 40;

-- 3. Hall Tickets Table Enhancements
ALTER TABLE public.hall_tickets ADD COLUMN IF NOT EXISTS exam_id UUID REFERENCES public.exams(id) ON DELETE SET NULL;
ALTER TABLE public.hall_tickets ADD COLUMN IF NOT EXISTS file_url TEXT;

-- 4. Exam Results Table Enhancements
ALTER TABLE public.exam_results ADD COLUMN IF NOT EXISTS subject_code TEXT;
ALTER TABLE public.exam_results ADD COLUMN IF NOT EXISTS result_status TEXT DEFAULT 'PASS';
ALTER TABLE public.exam_results ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE;
ALTER TABLE public.exam_results ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ DEFAULT NOW();

-- 5. RLS Updates: Allow students to read published exams, schedules, and hall tickets
DROP POLICY IF EXISTS "exams_read_authenticated" ON public.exams;
CREATE POLICY "exams_read_authenticated" ON public.exams FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "exam_schedules_read_authenticated" ON public.exam_schedules;
CREATE POLICY "exam_schedules_read_authenticated" ON public.exam_schedules FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "hall_tickets_read_student" ON public.hall_tickets;
CREATE POLICY "hall_tickets_read_student" ON public.hall_tickets FOR SELECT TO authenticated 
USING (
    student_id = auth.uid() 
    OR roll_number = (SELECT student_id FROM public.profiles WHERE id = auth.uid())
    OR roll_number = (SELECT roll_number FROM public.profiles WHERE id = auth.uid())
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'principal', 'teacher')
);

