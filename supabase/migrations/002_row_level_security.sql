-- =============================================================================
-- Migration: 002_row_level_security.sql
-- Description: Enable Row Level Security (RLS) and define granular security policies
-- =============================================================================

-- Helper function to fetch the current user's role safely from profiles table
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- Enable RLS on all tables
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_teaching_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concerns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wellness_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.infirmary_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_transport_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_entrance_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_library_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disciplinary_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sports_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sports_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.naac_criterion_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.naac_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reception_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reception_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reception_enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_goals ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- PROFILES POLICIES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow users to view own profile or admins/staff" ON public.profiles;
CREATE POLICY "Allow users to view own profile or admins/staff"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        id = auth.uid() OR 
        public.get_current_user_role() IN ('admin', 'principal', 'teacher')
    );

DROP POLICY IF EXISTS "Allow users to update own profile" ON public.profiles;
CREATE POLICY "Allow users to update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid() OR public.get_current_user_role() = 'admin')
    WITH CHECK (id = auth.uid() OR public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Allow insert on user registration" ON public.profiles;
CREATE POLICY "Allow insert on user registration"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid() OR public.get_current_user_role() = 'admin');

-- -----------------------------------------------------------------------------
-- GENERAL INSTITUTION READ ACCESS (Departments, Sections, Timetables, Events)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated can view departments" ON public.departments;
CREATE POLICY "Authenticated can view departments"
    ON public.departments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage departments" ON public.departments;
CREATE POLICY "Admins can manage departments"
    ON public.departments FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal'));

DROP POLICY IF EXISTS "Authenticated can view sections" ON public.sections;
CREATE POLICY "Authenticated can view sections"
    ON public.sections FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage sections" ON public.sections;
CREATE POLICY "Admins can manage sections"
    ON public.sections FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal'));

DROP POLICY IF EXISTS "Authenticated can view timetables" ON public.timetables;
CREATE POLICY "Authenticated can view timetables"
    ON public.timetables FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Staff can manage timetables" ON public.timetables;
CREATE POLICY "Staff can manage timetables"
    ON public.timetables FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'teacher'));

DROP POLICY IF EXISTS "Authenticated can view events" ON public.calendar_events;
CREATE POLICY "Authenticated can view events"
    ON public.calendar_events FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins and teachers can manage events" ON public.calendar_events;
CREATE POLICY "Admins and teachers can manage events"
    ON public.calendar_events FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'teacher'));

-- -----------------------------------------------------------------------------
-- ASSIGNMENTS & HOMEWORK
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated can view assignments" ON public.assignments;
CREATE POLICY "Authenticated can view assignments"
    ON public.assignments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Teachers and admins can manage assignments" ON public.assignments;
CREATE POLICY "Teachers and admins can manage assignments"
    ON public.assignments FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('teacher', 'admin', 'principal'));

DROP POLICY IF EXISTS "Students can view own submissions and teachers can view all" ON public.assignment_submissions;
CREATE POLICY "Students can view own submissions and teachers can view all"
    ON public.assignment_submissions FOR SELECT TO authenticated
    USING (student_id = auth.uid() OR public.get_current_user_role() IN ('teacher', 'admin', 'principal'));

DROP POLICY IF EXISTS "Students can submit assignments" ON public.assignment_submissions;
CREATE POLICY "Students can submit assignments"
    ON public.assignment_submissions FOR INSERT TO authenticated
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can grade assignments" ON public.assignment_submissions;
CREATE POLICY "Teachers can grade assignments"
    ON public.assignment_submissions FOR UPDATE TO authenticated
    USING (public.get_current_user_role() IN ('teacher', 'admin', 'principal'));

-- -----------------------------------------------------------------------------
-- DAILY TEACHING UPDATES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated can read teaching updates" ON public.daily_teaching_updates;
CREATE POLICY "Authenticated can read teaching updates"
    ON public.daily_teaching_updates FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Teachers can create and update teaching updates" ON public.daily_teaching_updates;
CREATE POLICY "Teachers can create and update teaching updates"
    ON public.daily_teaching_updates FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('teacher', 'admin'));

-- -----------------------------------------------------------------------------
-- FEEDBACK SYSTEM
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated can insert feedback" ON public.feedback_submissions;
CREATE POLICY "Authenticated can insert feedback"
    ON public.feedback_submissions FOR INSERT TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admins and teachers can view feedback" ON public.feedback_submissions;
CREATE POLICY "Admins and teachers can view feedback"
    ON public.feedback_submissions FOR SELECT TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'teacher'));

-- -----------------------------------------------------------------------------
-- CONCERNS
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own concerns or admins can view all" ON public.concerns;
CREATE POLICY "Users can view own concerns or admins can view all"
    ON public.concerns FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.get_current_user_role() IN ('admin', 'principal'));

DROP POLICY IF EXISTS "Authenticated can submit concerns" ON public.concerns;
CREATE POLICY "Authenticated can submit concerns"
    ON public.concerns FOR INSERT TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update concerns" ON public.concerns;
CREATE POLICY "Admins can update concerns"
    ON public.concerns FOR UPDATE TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal'));

-- -----------------------------------------------------------------------------
-- TEACHER MESSAGES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their sent or received messages" ON public.teacher_messages;
CREATE POLICY "Users can view their sent or received messages"
    ON public.teacher_messages FOR SELECT TO authenticated
    USING (sender_id = auth.uid() OR teacher_id = auth.uid() OR public.get_current_user_role() IN ('admin', 'principal'));

DROP POLICY IF EXISTS "Authenticated can send messages" ON public.teacher_messages;
CREATE POLICY "Authenticated can send messages"
    ON public.teacher_messages FOR INSERT TO authenticated
    WITH CHECK (sender_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can mark messages as read" ON public.teacher_messages;
CREATE POLICY "Teachers can mark messages as read"
    ON public.teacher_messages FOR UPDATE TO authenticated
    USING (teacher_id = auth.uid() OR sender_id = auth.uid());

-- -----------------------------------------------------------------------------
-- WELLNESS CHECKINS
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own wellness checkins" ON public.wellness_checkins;
CREATE POLICY "Users can view own wellness checkins"
    ON public.wellness_checkins FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.get_current_user_role() IN ('admin', 'principal', 'teacher'));

DROP POLICY IF EXISTS "Users can insert own wellness checkin" ON public.wellness_checkins;
CREATE POLICY "Users can insert own wellness checkin"
    ON public.wellness_checkins FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- HEALTH & INFIRMARY
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated can view health records" ON public.health_records;
CREATE POLICY "Authenticated can view health records"
    ON public.health_records FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.get_current_user_role() IN ('admin', 'principal', 'teacher'));

DROP POLICY IF EXISTS "Staff can manage health records" ON public.health_records;
CREATE POLICY "Staff can manage health records"
    ON public.health_records FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal'));

DROP POLICY IF EXISTS "Staff can manage infirmary visits" ON public.infirmary_visits;
CREATE POLICY "Staff can manage infirmary visits"
    ON public.infirmary_visits FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'teacher'));

-- -----------------------------------------------------------------------------
-- TRANSPORT & BUS TRACKING
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated can view transport vehicles" ON public.transport_vehicles;
CREATE POLICY "Authenticated can view transport vehicles"
    ON public.transport_vehicles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Drivers and admins can manage vehicles" ON public.transport_vehicles;
CREATE POLICY "Drivers and admins can manage vehicles"
    ON public.transport_vehicles FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('driver', 'transport_driver', 'admin', 'principal'));

DROP POLICY IF EXISTS "Authenticated can view stops" ON public.transport_stops;
CREATE POLICY "Authenticated can view stops"
    ON public.transport_stops FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Drivers can manage stops" ON public.transport_stops;
CREATE POLICY "Drivers can manage stops"
    ON public.transport_stops FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('driver', 'transport_driver', 'admin'));

DROP POLICY IF EXISTS "Authenticated can view transport logs" ON public.student_transport_logs;
CREATE POLICY "Authenticated can view transport logs"
    ON public.student_transport_logs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Drivers can manage transport logs" ON public.student_transport_logs;
CREATE POLICY "Drivers can manage transport logs"
    ON public.student_transport_logs FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('driver', 'transport_driver', 'admin'));

DROP POLICY IF EXISTS "Drivers can view vehicle maintenance" ON public.vehicle_maintenance;
CREATE POLICY "Drivers can view vehicle maintenance"
    ON public.vehicle_maintenance FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('driver', 'transport_driver', 'admin'));

-- -----------------------------------------------------------------------------
-- STORE & INVENTORY
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated can view store products" ON public.store_products;
CREATE POLICY "Authenticated can view store products"
    ON public.store_products FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Storekeepers and admins can manage products" ON public.store_products;
CREATE POLICY "Storekeepers and admins can manage products"
    ON public.store_products FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('storekeeper', 'store_manager', 'admin'));

DROP POLICY IF EXISTS "Users can view own orders" ON public.store_orders;
CREATE POLICY "Users can view own orders"
    ON public.store_orders FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.get_current_user_role() IN ('storekeeper', 'store_manager', 'admin'));

DROP POLICY IF EXISTS "Users can create orders" ON public.store_orders;
CREATE POLICY "Users can create orders"
    ON public.store_orders FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Storekeepers can manage inventory items" ON public.inventory_items;
CREATE POLICY "Storekeepers can manage inventory items"
    ON public.inventory_items FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('storekeeper', 'store_manager', 'admin'));

DROP POLICY IF EXISTS "Storekeepers can manage inventory transactions" ON public.inventory_transactions;
CREATE POLICY "Storekeepers can manage inventory transactions"
    ON public.inventory_transactions FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('storekeeper', 'store_manager', 'admin'));

-- -----------------------------------------------------------------------------
-- ADMISSIONS
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins and receptionists can manage admissions" ON public.admission_applications;
CREATE POLICY "Admins and receptionists can manage admissions"
    ON public.admission_applications FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'receptionist'));

DROP POLICY IF EXISTS "Admissions staff can manage entrance tests" ON public.admission_entrance_tests;
CREATE POLICY "Admissions staff can manage entrance tests"
    ON public.admission_entrance_tests FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'receptionist'));

DROP POLICY IF EXISTS "Admissions and finance staff can manage admission fees" ON public.admission_fees;
CREATE POLICY "Admissions and finance staff can manage admission fees"
    ON public.admission_fees FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'financier', 'finance_manager', 'accountant'));

-- -----------------------------------------------------------------------------
-- ALUMNI
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated can view alumni directory" ON public.alumni_profiles;
CREATE POLICY "Authenticated can view alumni directory"
    ON public.alumni_profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage alumni profiles" ON public.alumni_profiles;
CREATE POLICY "Admins can manage alumni profiles"
    ON public.alumni_profiles FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal'));

DROP POLICY IF EXISTS "Authenticated can view alumni events" ON public.alumni_events;
CREATE POLICY "Authenticated can view alumni events"
    ON public.alumni_events FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage alumni events" ON public.alumni_events;
CREATE POLICY "Admins can manage alumni events"
    ON public.alumni_events FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal'));

DROP POLICY IF EXISTS "Admins can view donations" ON public.alumni_donations;
CREATE POLICY "Admins can view donations"
    ON public.alumni_donations FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'financier', 'finance_manager'));

-- -----------------------------------------------------------------------------
-- LIBRARY
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated can view books" ON public.library_books;
CREATE POLICY "Authenticated can view books"
    ON public.library_books FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Staff can manage books" ON public.library_books;
CREATE POLICY "Staff can manage books"
    ON public.library_books FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'teacher'));

DROP POLICY IF EXISTS "Authenticated can view book issues" ON public.book_issues;
CREATE POLICY "Authenticated can view book issues"
    ON public.book_issues FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.get_current_user_role() IN ('admin', 'principal', 'teacher'));

DROP POLICY IF EXISTS "Staff can manage book issues" ON public.book_issues;
CREATE POLICY "Staff can manage book issues"
    ON public.book_issues FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'teacher'));

DROP POLICY IF EXISTS "Authenticated can view digital library resources" ON public.digital_library_resources;
CREATE POLICY "Authenticated can view digital library resources"
    ON public.digital_library_resources FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Staff can manage digital library resources" ON public.digital_library_resources;
CREATE POLICY "Staff can manage digital library resources"
    ON public.digital_library_resources FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'teacher'));

-- -----------------------------------------------------------------------------
-- CERTIFICATES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own certificates" ON public.certificates;
CREATE POLICY "Users can view own certificates"
    ON public.certificates FOR SELECT TO authenticated
    USING (student_id = auth.uid() OR public.get_current_user_role() IN ('admin', 'principal'));

DROP POLICY IF EXISTS "Staff can manage certificates" ON public.certificates;
CREATE POLICY "Staff can manage certificates"
    ON public.certificates FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal'));

-- -----------------------------------------------------------------------------
-- DISCIPLINARY INCIDENTS
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can view and manage disciplinary incidents" ON public.disciplinary_incidents;
CREATE POLICY "Staff can view and manage disciplinary incidents"
    ON public.disciplinary_incidents FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'teacher'));

-- -----------------------------------------------------------------------------
-- EXAMS & RESULTS
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated can view exams" ON public.exams;
CREATE POLICY "Authenticated can view exams"
    ON public.exams FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Staff can manage exams" ON public.exams;
CREATE POLICY "Staff can manage exams"
    ON public.exams FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'teacher'));

DROP POLICY IF EXISTS "Authenticated can view exam schedules" ON public.exam_schedules;
CREATE POLICY "Authenticated can view exam schedules"
    ON public.exam_schedules FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Staff can manage exam schedules" ON public.exam_schedules;
CREATE POLICY "Staff can manage exam schedules"
    ON public.exam_schedules FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'teacher'));

DROP POLICY IF EXISTS "Students can view own results and staff can view all" ON public.exam_results;
CREATE POLICY "Students can view own results and staff can view all"
    ON public.exam_results FOR SELECT TO authenticated
    USING (student_id = auth.uid() OR public.get_current_user_role() IN ('admin', 'principal', 'teacher'));

DROP POLICY IF EXISTS "Staff can manage exam results" ON public.exam_results;
CREATE POLICY "Staff can manage exam results"
    ON public.exam_results FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'teacher'));

-- -----------------------------------------------------------------------------
-- SPORTS & ACTIVITIES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated can view sports events" ON public.sports_events;
CREATE POLICY "Authenticated can view sports events"
    ON public.sports_events FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Staff can manage sports events" ON public.sports_events;
CREATE POLICY "Staff can manage sports events"
    ON public.sports_events FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'teacher'));

DROP POLICY IF EXISTS "Authenticated can view sports teams" ON public.sports_teams;
CREATE POLICY "Authenticated can view sports teams"
    ON public.sports_teams FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Staff can manage sports teams" ON public.sports_teams;
CREATE POLICY "Staff can manage sports teams"
    ON public.sports_teams FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'teacher'));

-- -----------------------------------------------------------------------------
-- NOTIFICATIONS
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view and manage their own notifications" ON public.notifications;
CREATE POLICY "Users can view and manage their own notifications"
    ON public.notifications FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- NAAC ACCREDITATION SYSTEM
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated can view NAAC progress" ON public.naac_criterion_progress;
CREATE POLICY "Authenticated can view NAAC progress"
    ON public.naac_criterion_progress FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "NAAC coordinators and admins can update NAAC progress" ON public.naac_criterion_progress;
CREATE POLICY "NAAC coordinators and admins can update NAAC progress"
    ON public.naac_criterion_progress FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('naac_coordinator', 'admin', 'principal'));

DROP POLICY IF EXISTS "Authenticated can view NAAC documents" ON public.naac_documents;
CREATE POLICY "Authenticated can view NAAC documents"
    ON public.naac_documents FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "NAAC coordinators and staff can manage NAAC documents" ON public.naac_documents;
CREATE POLICY "NAAC coordinators and staff can manage NAAC documents"
    ON public.naac_documents FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('naac_coordinator', 'admin', 'principal', 'teacher'));

-- -----------------------------------------------------------------------------
-- RECEPTION & FRONT OFFICE
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can manage reception visitors" ON public.reception_visitors;
CREATE POLICY "Staff can manage reception visitors"
    ON public.reception_visitors FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('receptionist', 'admin', 'principal'));

DROP POLICY IF EXISTS "Staff can manage reception appointments" ON public.reception_appointments;
CREATE POLICY "Staff can manage reception appointments"
    ON public.reception_appointments FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('receptionist', 'admin', 'principal'));

DROP POLICY IF EXISTS "Staff can manage reception enquiries" ON public.reception_enquiries;
CREATE POLICY "Staff can manage reception enquiries"
    ON public.reception_enquiries FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('receptionist', 'admin', 'principal'));

-- -----------------------------------------------------------------------------
-- FINANCE & FEES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Finance officers and admins can manage finance transactions" ON public.finance_transactions;
CREATE POLICY "Finance officers and admins can manage finance transactions"
    ON public.finance_transactions FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('financier', 'finance_manager', 'accountant', 'admin', 'principal'));

DROP POLICY IF EXISTS "Users can view own fee records" ON public.student_fees;
CREATE POLICY "Users can view own fee records"
    ON public.student_fees FOR SELECT TO authenticated
    USING (student_id = auth.uid() OR public.get_current_user_role() IN ('financier', 'finance_manager', 'accountant', 'admin', 'principal', 'parent'));

DROP POLICY IF EXISTS "Finance officers can manage fee records" ON public.student_fees;
CREATE POLICY "Finance officers can manage fee records"
    ON public.student_fees FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('financier', 'finance_manager', 'accountant', 'admin', 'principal'));

-- -----------------------------------------------------------------------------
-- ACHIEVEMENTS & GOALS
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Students can view and manage their achievements" ON public.student_achievements;
CREATE POLICY "Students can view and manage their achievements"
    ON public.student_achievements FOR ALL TO authenticated
    USING (student_id = auth.uid() OR public.get_current_user_role() IN ('admin', 'principal', 'teacher', 'parent'));

DROP POLICY IF EXISTS "Students can view and manage their goals" ON public.student_goals;
CREATE POLICY "Students can view and manage their goals"
    ON public.student_goals FOR ALL TO authenticated
    USING (student_id = auth.uid() OR public.get_current_user_role() IN ('admin', 'principal', 'teacher', 'parent'));

