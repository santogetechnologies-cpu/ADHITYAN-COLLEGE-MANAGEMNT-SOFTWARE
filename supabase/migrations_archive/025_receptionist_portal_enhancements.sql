-- =============================================================================
-- Migration: 025_receptionist_portal_enhancements.sql
-- Description: Receptionist Front Office Enhancements, Visitor Tracking, 
--              Appointments with Host Binding, Targeted Notifications, and RLS
-- =============================================================================

-- 1. ENHANCE RECEPTION VISITORS TABLE
ALTER TABLE public.reception_visitors 
    ADD COLUMN IF NOT EXISTS check_out_time TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS host_person TEXT,
    ADD COLUMN IF NOT EXISTS badge_number TEXT;

-- 2. ENHANCE RECEPTION APPOINTMENTS TABLE
ALTER TABLE public.reception_appointments 
    ADD COLUMN IF NOT EXISTS with_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS contact TEXT,
    ADD COLUMN IF NOT EXISTS appointment_date DATE DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. ENHANCE RECEPTION ENQUIRIES TABLE
ALTER TABLE public.reception_enquiries 
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS email TEXT,
    ADD COLUMN IF NOT EXISTS notes TEXT;

-- 4. UPDATE RLS ON RECEPTION VISITORS
DROP POLICY IF EXISTS "Staff can manage reception visitors" ON public.reception_visitors;
CREATE POLICY "Staff can manage reception visitors"
    ON public.reception_visitors FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('receptionist', 'admin', 'principal'))
    WITH CHECK (public.get_current_user_role() IN ('receptionist', 'admin', 'principal'));

-- 5. UPDATE RLS ON RECEPTION APPOINTMENTS
DROP POLICY IF EXISTS "Staff can manage reception appointments" ON public.reception_appointments;
CREATE POLICY "Staff can manage reception appointments"
    ON public.reception_appointments FOR ALL TO authenticated
    USING (
        public.get_current_user_role() IN ('receptionist', 'admin', 'principal')
        OR with_user_id = auth.uid()
    )
    WITH CHECK (public.get_current_user_role() IN ('receptionist', 'admin', 'principal'));

-- 6. UPDATE RLS ON RECEPTION ENQUIRIES
DROP POLICY IF EXISTS "Staff can manage reception enquiries" ON public.reception_enquiries;
CREATE POLICY "Staff can manage reception enquiries"
    ON public.reception_enquiries FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('receptionist', 'admin', 'principal'))
    WITH CHECK (public.get_current_user_role() IN ('receptionist', 'admin', 'principal'));

-- 7. UPDATE RLS ON CALENDAR EVENTS (Ensure Receptionist can post notices)
DROP POLICY IF EXISTS "Admins and teachers can manage events" ON public.calendar_events;
CREATE POLICY "Staff can manage calendar events"
    ON public.calendar_events FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'teacher', 'receptionist'))
    WITH CHECK (public.get_current_user_role() IN ('admin', 'principal', 'teacher', 'receptionist'));

-- 8. UPDATE RLS ON NOTIFICATIONS
-- Allow users to manage their own notifications, AND allow front-desk/admin/teacher to dispatch notifications to recipients
DROP POLICY IF EXISTS "Users can view and manage their own notifications" ON public.notifications;

CREATE POLICY "Users can view and update their own notifications"
    ON public.notifications FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications"
    ON public.notifications FOR DELETE TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Staff can create notifications for users"
    ON public.notifications FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid() 
        OR public.get_current_user_role() IN ('admin', 'principal', 'receptionist', 'teacher')
    );

