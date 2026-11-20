-- =============================================================================
-- Migration 007: Parent-Student Linking, Student Attendance & Parent RLS
-- =============================================================================

-- 1. PARENT-STUDENT LINKS TABLE
CREATE TABLE IF NOT EXISTS public.parent_student_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    relationship TEXT NOT NULL DEFAULT 'Parent',
    verified BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_parent_student UNIQUE (parent_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_parent_student_parent ON public.parent_student_links(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_student_student ON public.parent_student_links(student_id);

ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;

-- 2. STUDENT ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS public.student_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
    subject TEXT,
    remarks TEXT,
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_student_attendance_student_date ON public.student_attendance(student_id, date);

ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;

-- 3. HELPER FUNCTION: Check if auth.uid() is verified parent of given student
CREATE OR REPLACE FUNCTION public.is_parent_of(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.parent_student_links
    WHERE parent_id = auth.uid()
      AND student_id = p_student_id
      AND verified = true
  );
$$;

-- 4. RLS POLICIES FOR parent_student_links
DROP POLICY IF EXISTS "Admins can manage parent_student_links" ON public.parent_student_links;
CREATE POLICY "Admins can manage parent_student_links"
    ON public.parent_student_links FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal'))
    WITH CHECK (public.get_current_user_role() IN ('admin', 'principal'));

DROP POLICY IF EXISTS "Parents can view own parent_student_links" ON public.parent_student_links;
CREATE POLICY "Parents can view own parent_student_links"
    ON public.parent_student_links FOR SELECT TO authenticated
    USING (
        parent_id = auth.uid()
        OR student_id = auth.uid()
        OR public.get_current_user_role() IN ('admin', 'principal', 'teacher')
    );

-- 5. RLS POLICIES FOR student_attendance
DROP POLICY IF EXISTS "Teachers and admins can manage attendance" ON public.student_attendance;
CREATE POLICY "Teachers and admins can manage attendance"
    ON public.student_attendance FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('teacher', 'admin', 'principal'))
    WITH CHECK (public.get_current_user_role() IN ('teacher', 'admin', 'principal'));

DROP POLICY IF EXISTS "Students and parents can view attendance" ON public.student_attendance;
CREATE POLICY "Students and parents can view attendance"
    ON public.student_attendance FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR public.is_parent_of(student_id)
        OR public.get_current_user_role() IN ('teacher', 'admin', 'principal')
    );

-- 6. EXTEND RLS POLICIES FOR PARENTS ON EXISTING TABLES

-- EXAM RESULTS: Parents can view their linked children's results
DROP POLICY IF EXISTS "Students view own exam results" ON public.exam_results;
DROP POLICY IF EXISTS "Students and parents view exam results" ON public.exam_results;
CREATE POLICY "Students and parents view exam results"
    ON public.exam_results FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR public.is_parent_of(student_id)
        OR public.get_current_user_role() IN ('teacher', 'admin', 'principal')
    );

-- STUDENT FEES: Parents can view their linked children's fees
DROP POLICY IF EXISTS "Students and parents view student fees" ON public.student_fees;
CREATE POLICY "Students and parents view student fees"
    ON public.student_fees FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR public.is_parent_of(student_id)
        OR public.get_current_user_role() IN ('admin', 'financier', 'finance_manager', 'accountant', 'principal')
    );

-- STUDENT ACHIEVEMENTS: Parents can view linked children's achievements
DROP POLICY IF EXISTS "Students and parents view achievements" ON public.student_achievements;
CREATE POLICY "Students and parents view achievements"
    ON public.student_achievements FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR public.is_parent_of(student_id)
        OR public.get_current_user_role() IN ('teacher', 'admin', 'principal')
    );

-- STUDENT GOALS: Parents can view linked children's goals
DROP POLICY IF EXISTS "Students and parents view goals" ON public.student_goals;
CREATE POLICY "Students and parents view goals"
    ON public.student_goals FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR public.is_parent_of(student_id)
        OR public.get_current_user_role() IN ('teacher', 'admin', 'principal')
    );

-- WELLNESS CHECKINS: Parents can view linked children's wellness checkins
DROP POLICY IF EXISTS "Students and parents view wellness checkins" ON public.wellness_checkins;
CREATE POLICY "Students and parents view wellness checkins"
    ON public.wellness_checkins FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        OR public.is_parent_of(user_id)
        OR public.get_current_user_role() IN ('teacher', 'admin', 'principal')
    );

-- STUDENT TRANSPORT LOGS: Parents can view linked children's transport logs
DROP POLICY IF EXISTS "Students view own transport logs" ON public.student_transport_logs;
DROP POLICY IF EXISTS "Students and parents view transport logs" ON public.student_transport_logs;
CREATE POLICY "Students and parents view transport logs"
    ON public.student_transport_logs FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR public.is_parent_of(student_id)
        OR public.get_current_user_role() IN ('driver', 'transport_driver', 'admin', 'principal')
    );

-- CONCERNS: Parents can view their own concerns and their children's concerns
DROP POLICY IF EXISTS "Users view own concerns" ON public.concerns;
DROP POLICY IF EXISTS "Users and parents view concerns" ON public.concerns;
CREATE POLICY "Users and parents view concerns"
    ON public.concerns FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        OR student_id = auth.uid()
        OR (student_id IS NOT NULL AND public.is_parent_of(student_id))
        OR public.get_current_user_role() IN ('admin', 'principal')
    );

-- CONCERNS: Parents can submit concerns
DROP POLICY IF EXISTS "Users can submit own concerns" ON public.concerns;
CREATE POLICY "Users can submit own concerns"
    ON public.concerns FOR INSERT TO authenticated
    WITH CHECK (
        (student_id IS NOT NULL AND (student_id = auth.uid() OR public.is_parent_of(student_id)))
        OR (user_id IS NOT NULL AND user_id = auth.uid())
        OR is_anonymous = true
    );

-- TEACHER MESSAGES: Full bidirectional messaging between parents and teachers
DROP POLICY IF EXISTS "Users can view their sent or received messages" ON public.teacher_messages;
CREATE POLICY "Users can view their sent or received messages"
    ON public.teacher_messages FOR SELECT TO authenticated
    USING (
        sender_id = auth.uid()
        OR teacher_id = auth.uid()
        OR public.get_current_user_role() IN ('admin', 'principal')
    );

-- 7. SAFELY ADD NEW TABLES TO REALTIME PUBLICATION
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.parent_student_links;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.student_attendance;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END;
$$;

