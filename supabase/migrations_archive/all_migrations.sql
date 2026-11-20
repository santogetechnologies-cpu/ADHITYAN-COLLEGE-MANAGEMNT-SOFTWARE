-- =============================================================================
-- ALL MIGRATIONS COMBINED (Execute this in Supabase SQL Editor)
-- Project: Adhithyan College Management Software
-- =============================================================================

-- =============================================================================
-- SECTION 1: EXTENSIONS & HELPER FUNCTIONS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- SECTION 2: TABLES & INDEXES
-- =============================================================================

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN (
        'student', 'parent', 'teacher', 'admin', 'principal', 
        'financier', 'accountant', 'storekeeper', 'driver', 
        'receptionist', 'store_manager', 'finance_manager', 
        'transport_driver', 'naac_coordinator'
    )),
    avatar_url TEXT,
    phone TEXT,
    department TEXT,
    class_name TEXT,
    roll_number TEXT,
    bio TEXT,
    preferences JSONB DEFAULT '{"theme": "light", "language": "en", "notifications": true}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user registration automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, role, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
        COALESCE(NEW.raw_user_meta_data->>'avatar', '')
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        name = COALESCE(EXCLUDED.name, public.profiles.name),
        role = COALESCE(EXCLUDED.role, public.profiles.role),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. DEPARTMENTS & SECTIONS
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    duration INTEGER NOT NULL DEFAULT 4,
    code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 50,
    current_students INTEGER NOT NULL DEFAULT 0,
    assigned_teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_teacher_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_dept_section UNIQUE (department_id, name)
);

-- 3. TIMETABLES
CREATE TABLE IF NOT EXISTS public.timetables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_name TEXT NOT NULL,
    day_of_week TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    subject TEXT NOT NULL,
    teacher_name TEXT NOT NULL,
    teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    room TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. ASSIGNMENTS & SUBMISSIONS
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL DEFAULT 'assignment' CHECK (type IN ('assignment', 'homework', 'project')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    due_date TIMESTAMPTZ NOT NULL,
    classes TEXT[] NOT NULL DEFAULT '{}',
    teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    teacher_name TEXT,
    attachments TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.assignment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    score NUMERIC,
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded', 'pending', 'late')),
    submitted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    feedback TEXT,
    attachment_url TEXT
);

-- 5. DAILY TEACHING UPDATES
CREATE TABLE IF NOT EXISTS public.daily_teaching_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    teacher_name TEXT,
    subject TEXT NOT NULL,
    class_name TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    topics_covered TEXT[] DEFAULT '{}',
    important_topics TEXT[] DEFAULT '{}',
    pyq TEXT[] DEFAULT '{}',
    next_class_prep TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 6. FEEDBACK SUBMISSIONS
CREATE TABLE IF NOT EXISTS public.feedback_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    teacher_name TEXT NOT NULL,
    message TEXT NOT NULL,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 7. CONCERNS
CREATE TABLE IF NOT EXISTS public.concerns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_name TEXT,
    concern_type TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    is_anonymous BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Resolved', 'Dismissed')),
    resolution_notes TEXT,
    attachments TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 8. TEACHER MESSAGES
CREATE TABLE IF NOT EXISTS public.teacher_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    sender_name TEXT NOT NULL,
    sender_email TEXT,
    teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    teacher_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    attachments TEXT[] DEFAULT '{}',
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 9. WELLNESS & HEALTH
CREATE TABLE IF NOT EXISTS public.wellness_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    checkin_type TEXT NOT NULL CHECK (checkin_type IN ('morning', 'evening')),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    options TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.health_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    role TEXT NOT NULL DEFAULT 'student',
    class_name TEXT,
    roll_no TEXT,
    blood_group TEXT,
    allergies TEXT[] DEFAULT '{}',
    medical_conditions TEXT[] DEFAULT '{}',
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    vaccination_status TEXT DEFAULT 'Up to date',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.infirmary_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_name TEXT NOT NULL,
    patient_role TEXT NOT NULL DEFAULT 'student',
    class_name TEXT,
    visit_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    symptoms TEXT NOT NULL,
    treatment TEXT,
    attending_staff TEXT NOT NULL,
    status TEXT DEFAULT 'Admitted' CHECK (status IN ('Admitted', 'Discharged', 'Referred to Hospital')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 10. TRANSPORT
CREATE TABLE IF NOT EXISTS public.transport_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_number TEXT UNIQUE NOT NULL,
    vehicle_type TEXT NOT NULL DEFAULT 'Bus',
    route_name TEXT NOT NULL,
    driver_name TEXT NOT NULL,
    driver_phone TEXT,
    driver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    capacity INTEGER NOT NULL DEFAULT 40,
    occupied_seats INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'idle', 'delayed')),
    current_location TEXT DEFAULT 'Depot',
    eta_to_next_stop TEXT DEFAULT 'On Time',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.transport_stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.transport_vehicles(id) ON DELETE CASCADE,
    stop_name TEXT NOT NULL,
    scheduled_time TEXT NOT NULL,
    stop_order INTEGER NOT NULL DEFAULT 1,
    status TEXT DEFAULT 'Upcoming' CHECK (status IN ('Completed', 'Current', 'Upcoming', 'Skipped')),
    students_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.student_transport_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES public.transport_vehicles(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    student_name TEXT NOT NULL,
    class_name TEXT,
    stop_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('checked_in', 'waiting', 'absent', 'dropped')),
    checkin_time TIMESTAMPTZ,
    date DATE DEFAULT CURRENT_DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.vehicle_maintenance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.transport_vehicles(id) ON DELETE CASCADE,
    item TEXT NOT NULL,
    last_change TEXT,
    next_due TEXT,
    status TEXT NOT NULL DEFAULT 'good' CHECK (status IN ('good', 'warning', 'overdue')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 11. STORE & INVENTORY
CREATE TABLE IF NOT EXISTS public.store_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    category TEXT NOT NULL,
    rating NUMERIC(2,1) DEFAULT 4.5,
    image_url TEXT DEFAULT '/placeholder.svg',
    stock INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.store_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_name TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_amount NUMERIC(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Processing', 'Delivered', 'Cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    current_stock INTEGER NOT NULL DEFAULT 0,
    minimum_stock INTEGER NOT NULL DEFAULT 10,
    unit TEXT DEFAULT 'Units',
    urgency TEXT DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('Issue', 'Receipt', 'Order', 'Adjustment')),
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    department TEXT,
    supplier TEXT,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'processing', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 12. ADMISSIONS
CREATE TABLE IF NOT EXISTS public.admission_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_number TEXT UNIQUE NOT NULL,
    applicant_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    class_name TEXT NOT NULL,
    parent_name TEXT NOT NULL,
    parent_phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'Under Review', 'Approved', 'Rejected')),
    submission_date DATE NOT NULL DEFAULT CURRENT_DATE,
    remarks TEXT,
    documents JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.admission_entrance_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES public.admission_applications(id) ON DELETE CASCADE,
    applicant_name TEXT NOT NULL,
    roll_no TEXT UNIQUE NOT NULL,
    test_date DATE NOT NULL,
    score NUMERIC,
    percentile NUMERIC,
    status TEXT DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Completed', 'Absent')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.admission_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES public.admission_applications(id) ON DELETE CASCADE,
    applicant_name TEXT NOT NULL,
    class_name TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Paid', 'Failed')),
    payment_method TEXT,
    transaction_id TEXT,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 13. ALUMNI
CREATE TABLE IF NOT EXISTS public.alumni_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    roll_number TEXT,
    course TEXT,
    department TEXT NOT NULL,
    graduation_year TEXT NOT NULL,
    current_position TEXT,
    company TEXT,
    location TEXT,
    linkedin_url TEXT,
    bio TEXT,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Mentor', 'Inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.alumni_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    event_date TIMESTAMPTZ NOT NULL,
    location TEXT NOT NULL,
    attendees_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Upcoming' CHECK (status IN ('Upcoming', 'Ongoing', 'Completed', 'Planning')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.alumni_donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alumni_id UUID REFERENCES public.alumni_profiles(id) ON DELETE SET NULL,
    donor_name TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    cause TEXT NOT NULL,
    transaction_id TEXT,
    donated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 14. LIBRARY
CREATE TABLE IF NOT EXISTS public.library_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    isbn TEXT,
    category TEXT NOT NULL,
    subject TEXT NOT NULL,
    class_level TEXT,
    type TEXT NOT NULL DEFAULT 'Physical' CHECK (type IN ('Physical', 'Digital', 'Interactive', 'Audio')),
    status TEXT NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'Issued', 'Reserved', 'Maintenance')),
    total_copies INTEGER NOT NULL DEFAULT 1,
    available_copies INTEGER NOT NULL DEFAULT 1,
    published_year INTEGER,
    publisher TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.book_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID NOT NULL REFERENCES public.library_books(id) ON DELETE CASCADE,
    book_title TEXT NOT NULL,
    book_code TEXT NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    student_name TEXT NOT NULL,
    student_id TEXT NOT NULL,
    roll_no TEXT,
    class_name TEXT,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    return_date DATE,
    status TEXT NOT NULL DEFAULT 'Issued' CHECK (status IN ('Issued', 'Overdue', 'Returned')),
    days_overdue INTEGER DEFAULT 0,
    renew_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.digital_library_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    authors TEXT[] DEFAULT '{}',
    journal TEXT,
    resource_type TEXT DEFAULT 'Research Paper',
    published_date DATE,
    doi TEXT,
    abstract TEXT,
    file_url TEXT,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 15. CERTIFICATES
CREATE TABLE IF NOT EXISTS public.certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_type TEXT NOT NULL,
    student_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    student_name TEXT NOT NULL,
    roll_number TEXT,
    class_name TEXT,
    purpose TEXT,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Issued', 'Rejected')),
    certificate_number TEXT UNIQUE,
    qr_code_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 16. DISCIPLINARY INCIDENTS
CREATE TABLE IF NOT EXISTS public.disciplinary_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    student_name TEXT NOT NULL,
    roll_no TEXT,
    class_name TEXT NOT NULL,
    incident TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'Minor' CHECK (severity IN ('Minor', 'Major', 'Critical')),
    reported_by TEXT NOT NULL,
    incident_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'Pending Review' CHECK (status IN ('Pending Review', 'Under Investigation', 'Resolved')),
    action_taken TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 17. EXAMINATIONS
CREATE TABLE IF NOT EXISTS public.exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    term TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Ongoing', 'Completed', 'Results Published')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.exam_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    class_name TEXT NOT NULL,
    exam_date DATE NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    room TEXT NOT NULL,
    max_marks INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.exam_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    student_name TEXT NOT NULL,
    class_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    marks_obtained NUMERIC NOT NULL,
    max_marks NUMERIC NOT NULL DEFAULT 100,
    grade TEXT,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 18. SPORTS
CREATE TABLE IF NOT EXISTS public.sports_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    sport TEXT NOT NULL,
    date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Upcoming' CHECK (status IN ('Upcoming', 'Registrations Open', 'Ongoing', 'Completed')),
    participants INTEGER NOT NULL DEFAULT 0,
    teams INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.sports_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sport TEXT NOT NULL,
    category TEXT NOT NULL,
    captain TEXT NOT NULL,
    members_count INTEGER NOT NULL DEFAULT 0,
    coach TEXT NOT NULL,
    achievements TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 19. CALENDAR EVENTS
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    time TEXT,
    location TEXT,
    category TEXT NOT NULL DEFAULT 'academic' CHECK (category IN ('academic', 'cultural', 'sports', 'exam', 'meeting', 'holiday')),
    target_audience TEXT NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'students', 'teachers', 'parents', 'staff')),
    department TEXT,
    class_name TEXT,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    created_by TEXT,
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 20. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 21. NAAC
CREATE TABLE IF NOT EXISTS public.naac_criterion_progress (
    criterion_number INTEGER PRIMARY KEY CHECK (criterion_number BETWEEN 1 AND 7),
    completion_percentage INTEGER NOT NULL DEFAULT 0,
    total_metrics INTEGER NOT NULL DEFAULT 10,
    completed_metrics INTEGER NOT NULL DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.naac_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    filename TEXT NOT NULL,
    file_url TEXT,
    criterion_number INTEGER NOT NULL REFERENCES public.naac_criterion_progress(criterion_number) ON DELETE CASCADE,
    metric_code TEXT NOT NULL,
    evidence_type TEXT NOT NULL,
    file_type TEXT NOT NULL DEFAULT 'PDF',
    file_size TEXT,
    tags TEXT[] DEFAULT '{}',
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 22. RECEPTION
CREATE TABLE IF NOT EXISTS public.reception_visitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    purpose TEXT NOT NULL,
    time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'checked_in' CHECK (status IN ('checked_in', 'waiting', 'completed', 'pending')),
    contact TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.reception_appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    time TEXT NOT NULL,
    person TEXT NOT NULL,
    with_whom TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'meeting' CHECK (type IN ('meeting', 'interview', 'business', 'counseling')),
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.reception_enquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enquiry_code TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL,
    parent_name TEXT NOT NULL,
    grade TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 23. FINANCE
CREATE TABLE IF NOT EXISTS public.finance_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    department TEXT,
    description TEXT,
    urgency TEXT DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high')),
    status TEXT NOT NULL DEFAULT 'Approved' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.student_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    student_name TEXT NOT NULL,
    class_name TEXT NOT NULL,
    total_due NUMERIC(10,2) NOT NULL,
    paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'overdue', 'partially_paid')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 24. ACHIEVEMENTS & GOALS
CREATE TABLE IF NOT EXISTS public.student_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('academic', 'attendance', 'social', 'sports')),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    level TEXT NOT NULL DEFAULT 'Gold' CHECK (level IN ('Gold', 'Silver', 'Bronze')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.student_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    progress INTEGER NOT NULL DEFAULT 0,
    current_value INTEGER NOT NULL DEFAULT 0,
    target_value INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =============================================================================
-- SECTION 3: ROW LEVEL SECURITY POLICIES
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

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

-- Base Policies allowing authenticated read/write based on roles
CREATE POLICY "profiles_select_policy" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_policy" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.get_current_user_role() = 'admin');
CREATE POLICY "profiles_insert_policy" ON public.profiles FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "departments_all" ON public.departments FOR ALL TO authenticated USING (true);
CREATE POLICY "sections_all" ON public.sections FOR ALL TO authenticated USING (true);
CREATE POLICY "timetables_all" ON public.timetables FOR ALL TO authenticated USING (true);
CREATE POLICY "assignments_all" ON public.assignments FOR ALL TO authenticated USING (true);
CREATE POLICY "submissions_all" ON public.assignment_submissions FOR ALL TO authenticated USING (true);
CREATE POLICY "teaching_updates_all" ON public.daily_teaching_updates FOR ALL TO authenticated USING (true);
CREATE POLICY "feedback_all" ON public.feedback_submissions FOR ALL TO authenticated USING (true);
CREATE POLICY "concerns_all" ON public.concerns FOR ALL TO authenticated USING (true);
CREATE POLICY "messages_all" ON public.teacher_messages FOR ALL TO authenticated USING (true);
CREATE POLICY "wellness_all" ON public.wellness_checkins FOR ALL TO authenticated USING (true);
CREATE POLICY "health_all" ON public.health_records FOR ALL TO authenticated USING (true);
CREATE POLICY "infirmary_all" ON public.infirmary_visits FOR ALL TO authenticated USING (true);
CREATE POLICY "transport_vehicles_all" ON public.transport_vehicles FOR ALL TO authenticated USING (true);
CREATE POLICY "transport_stops_all" ON public.transport_stops FOR ALL TO authenticated USING (true);
CREATE POLICY "transport_logs_all" ON public.student_transport_logs FOR ALL TO authenticated USING (true);
CREATE POLICY "vehicle_maintenance_all" ON public.vehicle_maintenance FOR ALL TO authenticated USING (true);
CREATE POLICY "store_products_all" ON public.store_products FOR ALL TO authenticated USING (true);
CREATE POLICY "store_orders_all" ON public.store_orders FOR ALL TO authenticated USING (true);
CREATE POLICY "inventory_items_all" ON public.inventory_items FOR ALL TO authenticated USING (true);
CREATE POLICY "inventory_trans_all" ON public.inventory_transactions FOR ALL TO authenticated USING (true);
CREATE POLICY "admissions_all" ON public.admission_applications FOR ALL TO authenticated USING (true);
CREATE POLICY "admission_tests_all" ON public.admission_entrance_tests FOR ALL TO authenticated USING (true);
CREATE POLICY "admission_fees_all" ON public.admission_fees FOR ALL TO authenticated USING (true);
CREATE POLICY "alumni_all" ON public.alumni_profiles FOR ALL TO authenticated USING (true);
CREATE POLICY "alumni_events_all" ON public.alumni_events FOR ALL TO authenticated USING (true);
CREATE POLICY "alumni_donations_all" ON public.alumni_donations FOR ALL TO authenticated USING (true);
CREATE POLICY "library_books_all" ON public.library_books FOR ALL TO authenticated USING (true);
CREATE POLICY "book_issues_all" ON public.book_issues FOR ALL TO authenticated USING (true);
CREATE POLICY "digital_library_all" ON public.digital_library_resources FOR ALL TO authenticated USING (true);
CREATE POLICY "certificates_all" ON public.certificates FOR ALL TO authenticated USING (true);
CREATE POLICY "disciplinary_all" ON public.disciplinary_incidents FOR ALL TO authenticated USING (true);
CREATE POLICY "exams_all" ON public.exams FOR ALL TO authenticated USING (true);
CREATE POLICY "exam_schedules_all" ON public.exam_schedules FOR ALL TO authenticated USING (true);
CREATE POLICY "exam_results_all" ON public.exam_results FOR ALL TO authenticated USING (true);
CREATE POLICY "sports_events_all" ON public.sports_events FOR ALL TO authenticated USING (true);
CREATE POLICY "sports_teams_all" ON public.sports_teams FOR ALL TO authenticated USING (true);
CREATE POLICY "calendar_events_all" ON public.calendar_events FOR ALL TO authenticated USING (true);
CREATE POLICY "notifications_all" ON public.notifications FOR ALL TO authenticated USING (true);
CREATE POLICY "naac_progress_all" ON public.naac_criterion_progress FOR ALL TO authenticated USING (true);
CREATE POLICY "naac_documents_all" ON public.naac_documents FOR ALL TO authenticated USING (true);
CREATE POLICY "visitors_all" ON public.reception_visitors FOR ALL TO authenticated USING (true);
CREATE POLICY "appointments_all" ON public.reception_appointments FOR ALL TO authenticated USING (true);
CREATE POLICY "enquiries_all" ON public.reception_enquiries FOR ALL TO authenticated USING (true);
CREATE POLICY "finance_trans_all" ON public.finance_transactions FOR ALL TO authenticated USING (true);
CREATE POLICY "fees_all" ON public.student_fees FOR ALL TO authenticated USING (true);
CREATE POLICY "achievements_all" ON public.student_achievements FOR ALL TO authenticated USING (true);
CREATE POLICY "goals_all" ON public.student_goals FOR ALL TO authenticated USING (true);

-- Enable Supabase Realtime for live updates on critical tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_teaching_updates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transport_vehicles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.teacher_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.concerns;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admission_applications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reception_visitors;

-- =============================================================================
-- SECTION 4: STORAGE BUCKETS
-- =============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES 
    ('attachments', 'attachments', true, 20971520),
    ('documents', 'documents', true, 52428800),
    ('avatars', 'avatars', true, 10485760)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read access for attachments" ON storage.objects;
CREATE POLICY "Public read access for attachments" ON storage.objects FOR SELECT USING (bucket_id = 'attachments');
DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload attachments" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'attachments');

DROP POLICY IF EXISTS "Public read access for documents" ON storage.objects;
CREATE POLICY "Public read access for documents" ON storage.objects FOR SELECT USING (bucket_id = 'documents');
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "Public read access for avatars" ON storage.objects;
CREATE POLICY "Public read access for avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');

-- =============================================================================
-- MIGRATION 005: COMPLETE REALTIME SYNCHRONIZATION SETUP & NOTIFICATION TRIGGERS
-- =============================================================================

-- Enable REPLICA IDENTITY FULL on all core tables for full record payloads during UPDATE and DELETE
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'profiles',
        'departments',
        'timetables',
        'calendar_events',
        'assignments',
        'daily_teaching_updates',
        'feedback_submissions',
        'teacher_messages',
        'student_fees',
        'finance_transactions',
        'concerns',
        'admission_applications',
        'alumni_members',
        'alumni_events',
        'student_certificates',
        'disciplinary_incidents',
        'sports_events',
        'sports_teams',
        'health_records',
        'infirmary_visits',
        'library_books',
        'book_issues',
        'exam_schedules',
        'naac_criterion_progress',
        'naac_documents',
        'transport_vehicles',
        'transport_stops',
        'store_products',
        'store_orders',
        'inventory_items',
        'notifications',
        'wellness_checkins',
        'reception_visitors',
        'reception_appointments',
        'reception_enquiries'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL;', tbl);
            BEGIN
                EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
            EXCEPTION WHEN duplicate_object THEN
                -- Already added to publication
                NULL;
            END;
        END IF;
    END LOOP;
END $$;

-- =============================================================================
-- CROSS-ROLE AUTOMATED REALTIME NOTIFICATION TRIGGERS
-- =============================================================================

-- 1. Trigger on Admission Applications (Notifies Admins & Principals)
CREATE OR REPLACE FUNCTION notify_new_admission()
RETURNS TRIGGER AS $$
DECLARE
    admin_record RECORD;
BEGIN
    FOR admin_record IN SELECT id FROM public.profiles WHERE role IN ('admin', 'principal', 'super_admin') LOOP
        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            type,
            priority,
            is_read
        ) VALUES (
            admin_record.id,
            'New Admission Application',
            'New applicant: ' || NEW.student_name || ' for ' || COALESCE(NEW.applied_class, 'Program'),
            'info',
            'high',
            false
        );
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_new_admission ON public.admission_applications;
CREATE TRIGGER trg_notify_new_admission
AFTER INSERT ON public.admission_applications
FOR EACH ROW
EXECUTE FUNCTION notify_new_admission();

-- 2. Trigger on Certificate Status Changes (Notifies the Requesting Student)
CREATE OR REPLACE FUNCTION notify_certificate_status()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            type,
            priority,
            is_read
        ) VALUES (
            NEW.student_id,
            'Certificate Request ' || NEW.status,
            'Your request for "' || NEW.certificate_type || '" has been ' || LOWER(NEW.status) || '.',
            CASE WHEN NEW.status = 'Approved' THEN 'success' ELSE 'warning' END,
            'medium',
            false
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_certificate_status ON public.student_certificates;
CREATE TRIGGER trg_notify_certificate_status
AFTER UPDATE ON public.student_certificates
FOR EACH ROW
EXECUTE FUNCTION notify_certificate_status();

-- 3. Trigger on Student Concerns (Notifies Principals and Admins)
CREATE OR REPLACE FUNCTION notify_new_concern()
RETURNS TRIGGER AS $$
DECLARE
    admin_record RECORD;
BEGIN
    FOR admin_record IN SELECT id FROM public.profiles WHERE role IN ('principal', 'vice_principal', 'admin') LOOP
        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            type,
            priority,
            is_read
        ) VALUES (
            admin_record.id,
            'New Student Concern: ' || NEW.category,
            'Subject: ' || NEW.subject || ' (Priority: ' || COALESCE(NEW.priority, 'Normal') || ')',
            'warning',
            'high',
            false
        );
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_new_concern ON public.concerns;
CREATE TRIGGER trg_notify_new_concern
AFTER INSERT ON public.concerns
FOR EACH ROW
EXECUTE FUNCTION notify_new_concern();

-- 4. Trigger on Fee Payments (Notifies Student and Finance Dashboard)
CREATE OR REPLACE FUNCTION notify_fee_payment()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.status = 'Paid' AND (OLD IS NULL OR OLD.status <> 'Paid')) THEN
        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            type,
            priority,
            is_read
        ) VALUES (
            NEW.student_id,
            'Fee Payment Received',
            'Payment of $' || COALESCE(NEW.amount_paid::text, NEW.total_amount::text) || ' for term ' || COALESCE(NEW.term, 'Current') || ' has been confirmed.',
            'success',
            'medium',
            false
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_fee_payment ON public.student_fees;
CREATE TRIGGER trg_notify_fee_payment
AFTER INSERT OR UPDATE ON public.student_fees
FOR EACH ROW
EXECUTE FUNCTION notify_fee_payment();

-- 5. Trigger on New Assignments (Notifies Class Students)
CREATE OR REPLACE FUNCTION notify_new_assignment()
RETURNS TRIGGER AS $$
DECLARE
    student_record RECORD;
BEGIN
    FOR student_record IN 
        SELECT id FROM public.profiles 
        WHERE role = 'student' 
        AND (NEW.class_name IS NULL OR class_name = NEW.class_name) 
    LOOP
        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            type,
            priority,
            is_read
        ) VALUES (
            student_record.id,
            'New Assignment: ' || NEW.title,
            NEW.subject || ' assignment posted. Due: ' || COALESCE(NEW.due_date, 'Soon'),
            'info',
            'medium',
            false
        );
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_new_assignment ON public.assignments;
CREATE TRIGGER trg_notify_new_assignment
AFTER INSERT ON public.assignments
FOR EACH ROW
EXECUTE FUNCTION notify_new_assignment();

-- 6. Trigger on Store Orders (Notifies Store Manager)
CREATE OR REPLACE FUNCTION notify_store_order()
RETURNS TRIGGER AS $$
DECLARE
    store_record RECORD;
BEGIN
    FOR store_record IN SELECT id FROM public.profiles WHERE role IN ('store_manager', 'storekeeper', 'admin') LOOP
        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            type,
            priority,
            is_read
        ) VALUES (
            store_record.id,
            'New Campus Store Order',
            'Order #' || SUBSTRING(NEW.id::text, 1, 8) || ' placed for $' || NEW.total_amount::text,
            'info',
            'medium',
            false
        );
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_store_order ON public.store_orders;
CREATE TRIGGER trg_notify_store_order
AFTER INSERT ON public.store_orders
FOR EACH ROW
EXECUTE FUNCTION notify_store_order();
-- =============================================================================
-- Migration 006: Student Portal Enhancements, Atomic Store Orders & RLS Hardening
-- =============================================================================

-- 1. AI CHAT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.ai_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'ai', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_user_created ON public.ai_chat_messages(user_id, created_at ASC);

ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own ai chat messages" ON public.ai_chat_messages;
CREATE POLICY "Users can manage own ai chat messages"
    ON public.ai_chat_messages FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 2. WELLNESS CHECKINS UNIQUE CONSTRAINT FOR SAFE UPSERT
CREATE UNIQUE INDEX IF NOT EXISTS idx_wellness_user_date_type 
    ON public.wellness_checkins(user_id, date, checkin_type);

-- 3. ATOMIC STORE ORDER PLACEMENT WITH STOCK VALIDATION
CREATE OR REPLACE FUNCTION public.place_store_order(
    p_user_id UUID,
    p_user_name TEXT,
    p_items JSONB,
    p_total_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    item RECORD;
    v_product_id UUID;
    v_qty INT;
    v_available_stock INT;
    v_product_name TEXT;
    v_order_id UUID;
    v_order_result JSONB;
BEGIN
    -- Verify caller matches user_id or is privileged
    IF auth.uid() IS NULL OR (auth.uid() <> p_user_id AND public.get_current_user_role() NOT IN ('admin', 'store_manager', 'storekeeper')) THEN
        RAISE EXCEPTION 'Unauthorized order placement';
    END IF;

    -- Validate stock for each item atomically
    FOR item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(id UUID, name TEXT, quantity INT, price NUMERIC)
    LOOP
        v_product_id := item.id;
        v_qty := item.quantity;

        SELECT stock, name INTO v_available_stock, v_product_name
        FROM public.store_products
        WHERE id = v_product_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product % not found in store catalog.', item.name;
        END IF;

        IF v_available_stock < v_qty THEN
            RAISE EXCEPTION 'Insufficient stock for "%": % requested, but only % available.', v_product_name, v_qty, v_available_stock;
        END IF;

        -- Deduct stock
        UPDATE public.store_products
        SET stock = stock - v_qty,
            updated_at = NOW()
        WHERE id = v_product_id;
    END LOOP;

    -- Create store order record
    INSERT INTO public.store_orders (
        user_id,
        user_name,
        items,
        total_amount,
        status,
        created_at
    ) VALUES (
        p_user_id,
        p_user_name,
        p_items,
        p_total_amount,
        'Pending',
        NOW()
    )
    RETURNING id INTO v_order_id;

    SELECT to_jsonb(o.*) INTO v_order_result
    FROM public.store_orders o
    WHERE o.id = v_order_id;

    RETURN v_order_result;
END;
$$;

-- 4. HARDEN RLS POLICIES FOR STUDENT DATA PRIVACY

-- ASSIGNMENTS: Students only view assignments matching their enrolled class (or school-wide assignments)
DROP POLICY IF EXISTS "Authenticated can view assignments" ON public.assignments;
DROP POLICY IF EXISTS "Students can view class assignments" ON public.assignments;
CREATE POLICY "Students can view class assignments"
    ON public.assignments FOR SELECT TO authenticated
    USING (
        public.get_current_user_role() IN ('teacher', 'admin', 'principal')
        OR (SELECT class_name FROM public.profiles WHERE id = auth.uid()) = ANY(classes)
        OR classes = '{}'
        OR classes IS NULL
    );

-- EXAM SCHEDULES: Students only view exam schedules for their class or school-wide
DROP POLICY IF EXISTS "Authenticated can view exam schedules" ON public.exam_schedules;
DROP POLICY IF EXISTS "Students can view class exam schedules" ON public.exam_schedules;
CREATE POLICY "Students can view class exam schedules"
    ON public.exam_schedules FOR SELECT TO authenticated
    USING (
        public.get_current_user_role() IN ('teacher', 'admin', 'principal')
        OR class_name = (SELECT class_name FROM public.profiles WHERE id = auth.uid())
        OR class_name IS NULL
    );

-- EXAM RESULTS: Students can ONLY view their own results
DROP POLICY IF EXISTS "Students can view own results and teachers can view all" ON public.exam_results;
DROP POLICY IF EXISTS "Students view own exam results" ON public.exam_results;
CREATE POLICY "Students view own exam results"
    ON public.exam_results FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR public.get_current_user_role() IN ('teacher', 'admin', 'principal')
    );

-- STUDENT TRANSPORT LOGS: Students only view their own transport logs
DROP POLICY IF EXISTS "Authenticated can view transport logs" ON public.student_transport_logs;
DROP POLICY IF EXISTS "Students view own transport logs" ON public.student_transport_logs;
CREATE POLICY "Students view own transport logs"
    ON public.student_transport_logs FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR public.get_current_user_role() IN ('driver', 'transport_driver', 'admin', 'principal')
    );

-- CONCERNS / COMPLAINTS: Restrict insertion to student's own ID
DROP POLICY IF EXISTS "Authenticated can submit concerns" ON public.concerns;
DROP POLICY IF EXISTS "Users can submit own concerns" ON public.concerns;
CREATE POLICY "Users can submit own concerns"
    ON public.concerns FOR INSERT TO authenticated
    WITH CHECK (
        (student_id IS NOT NULL AND student_id = auth.uid())
        OR (user_id IS NOT NULL AND user_id = auth.uid())
        OR is_anonymous = true
    );

DROP POLICY IF EXISTS "Users can view own concerns or admins can view all" ON public.concerns;
DROP POLICY IF EXISTS "Users view own concerns" ON public.concerns;
CREATE POLICY "Users view own concerns"
    ON public.concerns FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR user_id = auth.uid()
        OR public.get_current_user_role() IN ('admin', 'principal')
    );

-- NOTIFICATIONS: Students can only view their own notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- STUDENT FEES: Students can only view their own fee records
DROP POLICY IF EXISTS "Students view own fees" ON public.student_fees;
CREATE POLICY "Students view own fees"
    ON public.student_fees FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR public.get_current_user_role() IN ('admin', 'finance_manager', 'principal')
    );

-- ENABLE REALTIME PUBLICATION FOR STUDENT TABLES
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_chat_messages;
EXCEPTION WHEN duplicate_object THEN
    -- Table already in publication
    NULL;
END $$;
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


-- MIGRATION 017: Auth Trigger & Profiles
-- =============================================================================
-- Migration: 017_auth_trigger_and_profiles.sql
-- Description: Automatic user profile sync trigger on auth.users, indexes,
--              updated_at triggers, and RLS policy alignment for 13 roles.
-- =============================================================================

-- 1. Automatic profile provisioning trigger from Supabase auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        name,
        role,
        avatar_url,
        status,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data->>'name',
            NEW.raw_user_meta_data->>'full_name',
            split_part(NEW.email, '@', 1)
        ),
        COALESCE(
            NEW.raw_user_meta_data->>'role',
            'student'
        ),
        COALESCE(NEW.raw_user_meta_data->>'avatar', NEW.raw_user_meta_data->>'avatar_url', ''),
        'active',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, public.profiles.name),
        role = COALESCE(EXCLUDED.role, public.profiles.role),
        avatar_url = COALESCE(NULLIF(EXCLUDED.avatar_url, ''), public.profiles.avatar_url),
        status = 'active',
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger cleanly on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Performance indexes across critical ERP foreign keys & query filters
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_timetables_dept_sem ON public.timetables(department_id, semester);
CREATE INDEX IF NOT EXISTS idx_timetables_day ON public.timetables(day_of_week);
CREATE INDEX IF NOT EXISTS idx_assignments_dept ON public.assignments(department_id);
CREATE INDEX IF NOT EXISTS idx_student_fees_student ON public.student_fees(student_id);
CREATE INDEX IF NOT EXISTS idx_student_fees_status ON public.student_fees(status);
CREATE INDEX IF NOT EXISTS idx_store_orders_student ON public.store_orders(student_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_status ON public.store_orders(status);
CREATE INDEX IF NOT EXISTS idx_transport_vehicles_status ON public.transport_vehicles(status);
CREATE INDEX IF NOT EXISTS idx_book_issues_student ON public.book_issues(student_id);

-- 3. Standard updated_at timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach updated_at triggers
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_departments_updated_at ON public.departments;
CREATE TRIGGER trg_departments_updated_at
    BEFORE UPDATE ON public.departments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_sections_updated_at ON public.sections;
CREATE TRIGGER trg_sections_updated_at
    BEFORE UPDATE ON public.sections
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_timetables_updated_at ON public.timetables;
CREATE TRIGGER trg_timetables_updated_at
    BEFORE UPDATE ON public.timetables
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_assignments_updated_at ON public.assignments;
CREATE TRIGGER trg_assignments_updated_at
    BEFORE UPDATE ON public.assignments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_student_fees_updated_at ON public.student_fees;
CREATE TRIGGER trg_student_fees_updated_at
    BEFORE UPDATE ON public.student_fees
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_store_orders_updated_at ON public.store_orders;
CREATE TRIGGER trg_store_orders_updated_at
    BEFORE UPDATE ON public.store_orders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. RLS Policy Enhancements for the 13 Institutional Roles
-- Allow institutional staff (Admin, Principal, Teacher, Receptionist, Store, Finance, Transport) to view student profiles
DROP POLICY IF EXISTS "Allow users to view own profile or admins/staff" ON public.profiles;
CREATE POLICY "Allow users to view own profile or admins/staff"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        id = auth.uid() OR 
        public.get_current_user_role() IN (
            'admin', 'principal', 'teacher', 'receptionist',
            'finance_manager', 'financier', 'accountant',
            'store_manager', 'storekeeper',
            'transport_driver', 'driver',
            'hr_manager', 'librarian', 'hostel_warden', 'placement_officer'
        )
    );

-- Allow authenticated users to view active departments & sections
DROP POLICY IF EXISTS "Authenticated users view departments" ON public.departments;
CREATE POLICY "Authenticated users view departments"
    ON public.departments FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated users view sections" ON public.sections;
CREATE POLICY "Authenticated users view sections"
    ON public.sections FOR SELECT
    TO authenticated
    USING (true);

-- Allow public and authenticated users to view store products
DROP POLICY IF EXISTS "Anyone can view store products" ON public.store_products;
CREATE POLICY "Anyone can view store products"
    ON public.store_products FOR SELECT
    TO authenticated, anon
    USING (true);

-- Allow students and guardians to view transport vehicles and stops
DROP POLICY IF EXISTS "Authenticated users view transport vehicles" ON public.transport_vehicles;
CREATE POLICY "Authenticated users view transport vehicles"
    ON public.transport_vehicles FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated users view transport stops" ON public.transport_stops;
CREATE POLICY "Authenticated users view transport stops"
    ON public.transport_stops FOR SELECT
    TO authenticated
    USING (true);


-- MIGRATION 018: Production Enhancements
-- =============================================================================
-- Migration: 018_erp_production_enhancements.sql
-- Description: RPC functions for transactional operations (library issue/return,
--              store checkout stock decrement, exam publishing, aggregate stats),
--              and RLS hardening for sensitive medical and parent-student links.
-- =============================================================================

-- 1. PARENT-STUDENT LINKS TABLE (if not already existing)
CREATE TABLE IF NOT EXISTS public.parent_student_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    relationship TEXT NOT NULL DEFAULT 'Parent',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_parent_student UNIQUE (parent_id, student_id)
);

ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parents can view linked students" ON public.parent_student_links;
CREATE POLICY "Parents can view linked students"
    ON public.parent_student_links FOR SELECT
    TO authenticated
    USING (parent_id = auth.uid() OR public.get_current_user_role() IN ('admin', 'principal', 'teacher'));

DROP POLICY IF EXISTS "Admins can manage parent links" ON public.parent_student_links;
CREATE POLICY "Admins can manage parent links"
    ON public.parent_student_links FOR ALL
    TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal'));

-- 2. ATOMIC LIBRARY ISSUE BOOK TRANSACTION
CREATE OR REPLACE FUNCTION public.issue_library_book(
    p_book_id UUID,
    p_student_id UUID,
    p_due_date DATE
)
RETURNS JSONB AS $$
DECLARE
    v_available INTEGER;
    v_issue_id UUID;
BEGIN
    -- Check copy availability with row lock
    SELECT copies_available INTO v_available
    FROM public.library_books
    WHERE id = p_book_id
    FOR UPDATE;

    IF v_available IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Book not found.');
    END IF;

    IF v_available <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'No copies currently available for issue.');
    END IF;

    -- Decrement available copy count
    UPDATE public.library_books
    SET copies_available = copies_available - 1,
        updated_at = NOW()
    WHERE id = p_book_id;

    -- Record issue entry
    INSERT INTO public.book_issues (
        book_id,
        student_id,
        issue_date,
        due_date,
        status
    )
    VALUES (
        p_book_id,
        p_student_id,
        CURRENT_DATE,
        p_due_date,
        'issued'
    )
    RETURNING id INTO v_issue_id;

    RETURN jsonb_build_object(
        'success', true,
        'issue_id', v_issue_id,
        'remaining_copies', v_available - 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. ATOMIC LIBRARY RETURN BOOK TRANSACTION
CREATE OR REPLACE FUNCTION public.return_library_book(
    p_issue_id UUID,
    p_fine_amount NUMERIC DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
    v_book_id UUID;
    v_status TEXT;
BEGIN
    SELECT book_id, status INTO v_book_id, v_status
    FROM public.book_issues
    WHERE id = p_issue_id
    FOR UPDATE;

    IF v_book_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Issue record not found.');
    END IF;

    IF v_status = 'returned' THEN
        RETURN jsonb_build_object('success', false, 'error', 'This book has already been returned.');
    END IF;

    -- Update issue status
    UPDATE public.book_issues
    SET return_date = CURRENT_DATE,
        fine_amount = COALESCE(p_fine_amount, 0),
        status = 'returned',
        updated_at = NOW()
    WHERE id = p_issue_id;

    -- Increment available copies in catalog
    UPDATE public.library_books
    SET copies_available = copies_available + 1,
        updated_at = NOW()
    WHERE id = v_book_id;

    RETURN jsonb_build_object('success', true, 'message', 'Book returned successfully.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. ATOMIC CAMPUS STORE CHECKOUT & STOCK DECREMENT
CREATE OR REPLACE FUNCTION public.checkout_store_order(
    p_student_id UUID,
    p_items JSONB,
    p_total_amount NUMERIC
)
RETURNS JSONB AS $$
DECLARE
    v_order_id UUID;
    v_item RECORD;
    v_product_id UUID;
    v_qty INTEGER;
    v_current_stock INTEGER;
    v_product_name TEXT;
BEGIN
    -- Verify stock for every line item first
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INTEGER)
    LOOP
        v_product_id := v_item.product_id;
        v_qty := v_item.quantity;

        SELECT stock, name INTO v_current_stock, v_product_name
        FROM public.store_products
        WHERE id = v_product_id
        FOR UPDATE;

        IF v_current_stock IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'Product ' || v_product_id || ' not found.');
        END IF;

        IF v_current_stock < v_qty THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Insufficient stock for "' || v_product_name || '". Available: ' || v_current_stock || ', Requested: ' || v_qty
            );
        END IF;
    END LOOP;

    -- Create order record
    INSERT INTO public.store_orders (
        student_id,
        total_amount,
        status,
        created_at,
        updated_at
    )
    VALUES (
        p_student_id,
        p_total_amount,
        'placed',
        NOW(),
        NOW()
    )
    RETURNING id INTO v_order_id;

    -- Decrement stock atomically
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INTEGER)
    LOOP
        UPDATE public.store_products
        SET stock = stock - v_item.quantity,
            updated_at = NOW()
        WHERE id = v_item.product_id;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'message', 'Order placed and stock reserved successfully.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. ADMIN OVERVIEW REAL-TIME AGGREGATES RPC
CREATE OR REPLACE FUNCTION public.get_admin_overview_stats()
RETURNS JSONB AS $$
DECLARE
    v_total_users BIGINT;
    v_active_students BIGINT;
    v_parent_accounts BIGINT;
    v_total_teachers BIGINT;
    v_total_courses BIGINT;
    v_total_orders BIGINT;
    v_total_revenue NUMERIC;
    v_active_buses BIGINT;
BEGIN
    SELECT COUNT(*) INTO v_total_users FROM public.profiles;
    SELECT COUNT(*) INTO v_active_students FROM public.profiles WHERE role = 'student' AND (status = 'active' OR status IS NULL);
    SELECT COUNT(*) INTO v_parent_accounts FROM public.profiles WHERE role = 'parent';
    SELECT COUNT(*) INTO v_total_teachers FROM public.profiles WHERE role = 'teacher';
    SELECT COUNT(*) INTO v_total_courses FROM public.departments;
    SELECT COUNT(*) INTO v_total_orders FROM public.store_orders;
    SELECT COALESCE(SUM(amount), 0) INTO v_total_revenue FROM public.finance_transactions WHERE transaction_type = 'income';
    SELECT COUNT(*) INTO v_active_buses FROM public.transport_vehicles WHERE status = 'active';

    RETURN jsonb_build_object(
        'totalUsers', v_total_users,
        'activeStudents', v_active_students,
        'parentAccounts', v_parent_accounts,
        'totalTeachers', v_total_teachers,
        'totalCourses', v_total_courses,
        'totalOrders', v_total_orders,
        'totalRevenue', v_total_revenue,
        'activeBuses', v_active_buses
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 6. MEDICAL RECORDS RLS HARDENING
-- Only healthcare staff, admins, and the student's own registered parent can view medical history
DROP POLICY IF EXISTS "Medical records privacy policy" ON public.health_records;
CREATE POLICY "Medical records privacy policy"
    ON public.health_records FOR SELECT
    TO authenticated
    USING (
        student_id = auth.uid() OR
        public.get_current_user_role() IN ('admin', 'principal') OR
        EXISTS (
            SELECT 1 FROM public.parent_student_links
            WHERE parent_id = auth.uid() AND student_id = public.health_records.student_id
        )
    );

DROP POLICY IF EXISTS "Infirmary visits privacy policy" ON public.infirmary_visits;
CREATE POLICY "Infirmary visits privacy policy"
    ON public.infirmary_visits FOR SELECT
    TO authenticated
    USING (
        student_id = auth.uid() OR
        public.get_current_user_role() IN ('admin', 'principal') OR
        EXISTS (
            SELECT 1 FROM public.parent_student_links
            WHERE parent_id = auth.uid() AND student_id = public.infirmary_visits.student_id
        )
    );

-- ============================================================================
-- MIGRATION 019: Safe addition of status column on public.profiles
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check CHECK (status IN ('active', 'inactive', 'suspended'));
        CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
    END IF;
END $$;


-- ============================================================================
-- MIGRATION 026: Super Admin Control Center Configuration Repository
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.super_admin_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_type TEXT NOT NULL,
    target_role TEXT DEFAULT 'global',
    is_published BOOLEAN DEFAULT false,
    version INTEGER DEFAULT 1,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    checksum TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_super_admin_configs_unique_active 
    ON public.super_admin_configs (config_type, target_role, is_published) 
    WHERE is_published = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_super_admin_configs_unique_draft 
    ON public.super_admin_configs (config_type, target_role, is_published) 
    WHERE is_published = false;

CREATE INDEX IF NOT EXISTS idx_super_admin_configs_type_role 
    ON public.super_admin_configs (config_type, target_role);

CREATE TABLE IF NOT EXISTS public.super_admin_releases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    release_version TEXT NOT NULL,
    version_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    change_summary TEXT,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    author_email TEXT,
    snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_super_admin_releases_version 
    ON public.super_admin_releases (version_number DESC);

CREATE TABLE IF NOT EXISTS public.super_admin_backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_name TEXT NOT NULL,
    backup_type TEXT DEFAULT 'manual',
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_by_email TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.super_admin_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.super_admin_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.super_admin_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full access to super_admin_configs" ON public.super_admin_configs;
DROP POLICY IF EXISTS "Authenticated users can read published configs" ON public.super_admin_configs;
DROP POLICY IF EXISTS "Admins have full access to super_admin_releases" ON public.super_admin_releases;
DROP POLICY IF EXISTS "Admins have full access to super_admin_backups" ON public.super_admin_backups;
DROP POLICY IF EXISTS "Admins have full access to audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert audit_logs" ON public.audit_logs;

CREATE POLICY "Admins have full access to super_admin_configs"
    ON public.super_admin_configs FOR ALL TO authenticated
    USING (public.get_current_user_role() = 'admin')
    WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "Authenticated users can read published configs"
    ON public.super_admin_configs FOR SELECT TO authenticated
    USING (is_published = true);

CREATE POLICY "Admins have full access to super_admin_releases"
    ON public.super_admin_releases FOR ALL TO authenticated
    USING (public.get_current_user_role() = 'admin')
    WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "Authenticated users can read active release"
    ON public.super_admin_releases FOR SELECT TO authenticated
    USING (is_active = true);

CREATE POLICY "Admins have full access to super_admin_backups"
    ON public.super_admin_backups FOR ALL TO authenticated
    USING (public.get_current_user_role() = 'admin')
    WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can view and filter all audit logs"
    ON public.audit_logs FOR SELECT TO authenticated
    USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Authenticated users can insert audit logs"
    ON public.audit_logs FOR INSERT TO authenticated
    WITH CHECK (true);
-- ============================================================================
-- MIGRATION 027: FULLY ISOLATED MULTI-COLLEGE PLATFORM ARCHITECTURE
-- Implements multi-tenant college isolation, Platform Super Admin governance,
-- college provisioning, dynamic configurations, and cross-college security.
-- ============================================================================

-- 1. COLLEGES TABLE (Independent College Tenants)
CREATE TABLE IF NOT EXISTS public.colleges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'archived')),
    institution_type TEXT NOT NULL DEFAULT 'Paramedical' CHECK (institution_type IN ('Paramedical', 'Medical', 'Engineering', 'Arts & Science', 'Multi-Disciplinary')),
    contact_email TEXT NOT NULL,
    contact_phone TEXT,
    address TEXT,
    website TEXT,
    academic_config JSONB NOT NULL DEFAULT '{
      "programs": ["B.Sc", "B.VOC", "Diploma"],
      "academicYears": ["2024-2025", "2025-2026", "2026-2027"],
      "semesterStructure": "Semester (1 to 8)",
      "departments": ["Cardiac Technology", "Dialysis Technology", "Radiology & Imaging", "Operation Theatre", "Medical Laboratory", "Physician Assistant", "Critical Care"]
    }'::jsonb,
    branding_config JSONB NOT NULL DEFAULT '{
      "palette": "blue",
      "primaryColor": "#2563eb",
      "fontScale": "md",
      "layoutDensity": "normal"
    }'::jsonb,
    admin_user_id UUID,
    current_version TEXT NOT NULL DEFAULT 'v1.0.0',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for quick lookup by status and code
CREATE INDEX IF NOT EXISTS idx_colleges_code ON public.colleges(code);
CREATE INDEX IF NOT EXISTS idx_colleges_status ON public.colleges(status);

-- 2. COLLEGE MEMBERSHIPS (Explicit College-User Binding)
CREATE TABLE IF NOT EXISTS public.college_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked')),
    is_primary BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(college_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_college_memberships_user ON public.college_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_college_memberships_college ON public.college_memberships(college_id);

-- 3. COLLEGE DYNAMIC CONFIGURATIONS (Roles, Modules, Features, Navigation, Pages per College)
CREATE TABLE IF NOT EXISTS public.college_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
    config_type TEXT NOT NULL CHECK (config_type IN ('roles', 'modules', 'features', 'permissions', 'navigation', 'pages', 'dashboards', 'forms', 'workflows', 'settings', 'theme')),
    target_role TEXT NOT NULL DEFAULT 'global',
    is_published BOOLEAN NOT NULL DEFAULT true,
    version INT NOT NULL DEFAULT 1,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_by TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(college_id, config_type, target_role, is_published)
);

CREATE INDEX IF NOT EXISTS idx_college_configs_college ON public.college_configurations(college_id, config_type);

-- 4. REUSABLE CONFIGURATION TEMPLATES
CREATE TABLE IF NOT EXISTS public.college_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name TEXT NOT NULL UNIQUE,
    description TEXT,
    institution_type TEXT NOT NULL DEFAULT 'Paramedical',
    roles JSONB NOT NULL DEFAULT '[]'::jsonb,
    modules JSONB NOT NULL DEFAULT '[]'::jsonb,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    navigation JSONB NOT NULL DEFAULT '{}'::jsonb,
    dashboards JSONB NOT NULL DEFAULT '{}'::jsonb,
    forms JSONB NOT NULL DEFAULT '{}'::jsonb,
    workflows JSONB NOT NULL DEFAULT '{}'::jsonb,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_builtin BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. PLATFORM AUDIT LOGS (Immutable Platform Super Admin Audit Trail)
CREATE TABLE IF NOT EXISTS public.platform_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    super_admin_email TEXT NOT NULL,
    super_admin_id UUID,
    college_id UUID REFERENCES public.colleges(id) ON DELETE SET NULL,
    college_code TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_audit_college ON public.platform_audit_logs(college_id);
CREATE INDEX IF NOT EXISTS idx_platform_audit_action ON public.platform_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_platform_audit_created ON public.platform_audit_logs(created_at DESC);

-- 6. SEED PRIMARY INITIAL COLLEGE: Adithyan College of Allied Health Sciences
INSERT INTO public.colleges (
    id,
    name,
    code,
    logo_url,
    status,
    institution_type,
    contact_email,
    contact_phone,
    address,
    website,
    academic_config,
    branding_config
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Adithyan College of Allied Health Sciences',
    'ADH-COLLEGE',
    '/lovable-uploads/8ea95178-bb37-43e2-ae4d-595e31707954.png',
    'active',
    'Paramedical',
    'admin@adithyan.edu.in',
    '+91 (044) 2876-4100',
    'Adithyan Nagar, Coimbatore, Tamil Nadu, India',
    'https://adithyan.edu.in',
    '{
      "programs": ["B.Sc Allied Health", "B.VOC Healthcare", "Diploma Allied Health"],
      "academicYears": ["2024-2025", "2025-2026", "2026-2027"],
      "semesterStructure": "Semester (1 to 8)",
      "departments": [
        "Cardiac Technology",
        "Dialysis Technology",
        "Radiology & Imaging Technology",
        "Operation Theatre & Anaesthesia Technology",
        "Medical Laboratory Technology",
        "Physician Assistant",
        "Critical Care Technology"
      ]
    }'::jsonb,
    '{
      "palette": "blue",
      "primaryColor": "#1e40af",
      "fontScale": "md",
      "layoutDensity": "normal"
    }'::jsonb
) ON CONFLICT (code) DO NOTHING;

-- Seed built-in platform templates
INSERT INTO public.college_templates (
    template_name,
    description,
    institution_type,
    is_builtin,
    modules,
    features,
    roles
) VALUES (
    'Default Paramedical ERP Template',
    'Complete institutional configuration template for Paramedical and Allied Health Science colleges with clinical rotations and NAAC accreditation.',
    'Paramedical',
    true,
    '[
      {"id": "students", "name": "Student Management", "enabled": true},
      {"id": "faculty", "name": "Faculty & Staff Directory", "enabled": true},
      {"id": "academics", "name": "Academics & Timetables", "enabled": true},
      {"id": "attendance", "name": "Biometric & Class Attendance", "enabled": true},
      {"id": "examinations", "name": "Exam Cell & Gradebook", "enabled": true},
      {"id": "finance", "name": "Fee Collection & Accounts", "enabled": true},
      {"id": "admissions", "name": "Admissions & Verification", "enabled": true},
      {"id": "certificates", "name": "Bonafide & Document Generation", "enabled": true},
      {"id": "medical", "name": "Infirmary & Clinical Health", "enabled": true},
      {"id": "naac", "name": "NAAC Accreditation System", "enabled": true},
      {"id": "transport", "name": "Fleet & Bus Tracking", "enabled": true},
      {"id": "store", "name": "Inventory & Uniform Store", "enabled": true}
    ]'::jsonb,
    '[
      {"id": "student_admission_provisioning", "enabled": true},
      {"id": "fee_receipt_pdf_export", "enabled": true},
      {"id": "hall_ticket_download", "enabled": true},
      {"id": "parent_telemetry_access", "enabled": true},
      {"id": "naac_repository_evidence", "enabled": true}
    ]'::jsonb,
    '[
      {"role": "admin", "label": "College Administrator", "category": "Administration"},
      {"role": "principal", "label": "Principal", "category": "Administration"},
      {"role": "teacher", "label": "Faculty & Instructor", "category": "Academic"},
      {"role": "student", "label": "Enrolled Student", "category": "Student & Parent"},
      {"role": "parent", "label": "Parent / Guardian", "category": "Student & Parent"},
      {"role": "finance_manager", "label": "Finance Manager", "category": "Finance"},
      {"role": "store_manager", "label": "Store Keeper", "category": "Operations"},
      {"role": "transport_driver", "label": "Transport Driver", "category": "Operations"},
      {"role": "receptionist", "label": "Front Desk Receptionist", "category": "Operations"}
    ]'::jsonb
),
(
    'Minimal College Template',
    'Streamlined lightweight ERP template containing only essential core academic, attendance, and student registry modules.',
    'Paramedical',
    true,
    '[
      {"id": "students", "name": "Student Management", "enabled": true},
      {"id": "faculty", "name": "Faculty Directory", "enabled": true},
      {"id": "academics", "name": "Academics", "enabled": true},
      {"id": "attendance", "name": "Class Attendance", "enabled": true},
      {"id": "finance", "name": "Fee Management", "enabled": true}
    ]'::jsonb,
    '[
      {"id": "fee_receipt_pdf_export", "enabled": true}
    ]'::jsonb,
    '[
      {"role": "admin", "label": "College Administrator", "category": "Administration"},
      {"role": "teacher", "label": "Teacher", "category": "Academic"},
      {"role": "student", "label": "Student", "category": "Student & Parent"},
      {"role": "parent", "label": "Parent", "category": "Student & Parent"},
      {"role": "finance_manager", "label": "Finance Officer", "category": "Finance"}
    ]'::jsonb
),
(
    'Full Multi-Disciplinary ERP Template',
    'Comprehensive platform deployment for large institutional universities with all 17 user roles, hostel management, placement cells, and sports councils.',
    'Multi-Disciplinary',
    true,
    '[
      {"id": "students", "name": "Student Management", "enabled": true},
      {"id": "faculty", "name": "Faculty & Staff Directory", "enabled": true},
      {"id": "academics", "name": "Academics & Timetables", "enabled": true},
      {"id": "attendance", "name": "Biometric Attendance", "enabled": true},
      {"id": "examinations", "name": "Examination Cell", "enabled": true},
      {"id": "finance", "name": "Finance & Accounts", "enabled": true},
      {"id": "admissions", "name": "Admissions", "enabled": true},
      {"id": "certificates", "name": "Certificates", "enabled": true},
      {"id": "medical", "name": "Medical Center", "enabled": true},
      {"id": "naac", "name": "NAAC Review", "enabled": true},
      {"id": "transport", "name": "Transport Fleet", "enabled": true},
      {"id": "store", "name": "Campus Store", "enabled": true},
      {"id": "library", "name": "Digital Library", "enabled": true},
      {"id": "hostel", "name": "Hostel Management", "enabled": true},
      {"id": "placements", "name": "Placement Drives", "enabled": true},
      {"id": "alumni", "name": "Alumni Association", "enabled": true}
    ]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb
) ON CONFLICT (template_name) DO NOTHING;

-- Enable Row Level Security (RLS) on newly created tables
ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.college_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.college_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.college_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated read on colleges and templates
CREATE POLICY "Public or authenticated users can read active colleges" 
ON public.colleges FOR SELECT USING (status != 'archived');

CREATE POLICY "Authenticated users can read college templates" 
ON public.college_templates FOR SELECT USING (true);

-- College membership read policy: users can read their own memberships
CREATE POLICY "Users can read their own college memberships" 
ON public.college_memberships FOR SELECT 
USING (user_id = auth.uid() OR auth.jwt() ->> 'role' = 'platform_super_admin');
