-- ============================================================================
-- MIGRATION 011: Complete Institutional College ERP Schema
-- Adhithyan College of Engineering & Technology
-- ============================================================================

-- 1. Staff HR Service Records
CREATE TABLE IF NOT EXISTS public.staff_service_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    employee_code TEXT UNIQUE NOT NULL,
    designation TEXT NOT NULL,
    department TEXT NOT NULL,
    qualification TEXT NOT NULL,
    date_of_joining DATE DEFAULT CURRENT_DATE,
    employment_type TEXT NOT NULL DEFAULT 'Permanent', -- Permanent, Probation, Contract, Visiting
    pan_number TEXT,
    pf_uan_number TEXT,
    bank_name TEXT DEFAULT 'State Bank of India',
    bank_account_no TEXT,
    bank_ifsc TEXT,
    basic_pay NUMERIC(12,2) NOT NULL DEFAULT 35000.00,
    da_pct NUMERIC(5,2) NOT NULL DEFAULT 42.00,
    hra_pct NUMERIC(5,2) NOT NULL DEFAULT 16.00,
    special_allowance NUMERIC(10,2) NOT NULL DEFAULT 4500.00,
    epf_opt_out BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'Active', -- Active, On-Leave, Resigned, Retired
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Staff Leave Balances
CREATE TABLE IF NOT EXISTS public.staff_leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    academic_year TEXT NOT NULL DEFAULT '2024-2025',
    casual_leave_quota INTEGER NOT NULL DEFAULT 12,
    casual_leave_taken INTEGER NOT NULL DEFAULT 0,
    medical_leave_quota INTEGER NOT NULL DEFAULT 10,
    medical_leave_taken INTEGER NOT NULL DEFAULT 0,
    earned_leave_quota INTEGER NOT NULL DEFAULT 15,
    earned_leave_taken INTEGER NOT NULL DEFAULT 0,
    on_duty_taken INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, academic_year)
);

-- 3. Staff Leave Applications
CREATE TABLE IF NOT EXISTS public.staff_leave_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    staff_name TEXT NOT NULL,
    department TEXT NOT NULL,
    leave_type TEXT NOT NULL, -- Casual Leave, Medical Leave, Earned Leave, On Duty, Loss of Pay
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INTEGER NOT NULL DEFAULT 1,
    reason TEXT NOT NULL,
    substitute_teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    substitute_teacher_name TEXT,
    status TEXT NOT NULL DEFAULT 'Pending_Principal', -- Pending_HOD, Pending_Principal, Approved, Rejected
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. Staff Monthly Payroll Runs
CREATE TABLE IF NOT EXISTS public.staff_payroll_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    month_year TEXT NOT NULL UNIQUE, -- e.g. 2025-03
    total_gross_disbursed NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_deductions NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_net_disbursed NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_employees INTEGER NOT NULL DEFAULT 0,
    run_date DATE DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'Disbursed', -- Draft, Approved_Principal, Disbursed
    processed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. Individual Staff Payroll Items (Payslips)
CREATE TABLE IF NOT EXISTS public.staff_payroll_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_run_id UUID REFERENCES public.staff_payroll_runs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    employee_code TEXT NOT NULL,
    employee_name TEXT NOT NULL,
    department TEXT NOT NULL,
    designation TEXT NOT NULL,
    month_year TEXT NOT NULL,
    days_in_month INTEGER NOT NULL DEFAULT 30,
    days_worked INTEGER NOT NULL DEFAULT 30,
    lop_days INTEGER NOT NULL DEFAULT 0,
    basic_earned NUMERIC(10,2) NOT NULL,
    da_earned NUMERIC(10,2) NOT NULL,
    hra_earned NUMERIC(10,2) NOT NULL,
    special_allowance NUMERIC(10,2) NOT NULL DEFAULT 0,
    gross_salary NUMERIC(10,2) NOT NULL,
    epf_deduction NUMERIC(10,2) NOT NULL DEFAULT 0,
    esi_deduction NUMERIC(10,2) NOT NULL DEFAULT 0,
    pt_deduction NUMERIC(10,2) NOT NULL DEFAULT 200.00,
    tds_deduction NUMERIC(10,2) NOT NULL DEFAULT 0,
    other_deductions NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_deductions NUMERIC(10,2) NOT NULL,
    net_salary NUMERIC(10,2) NOT NULL,
    payslip_number TEXT UNIQUE NOT NULL,
    payment_reference TEXT,
    status TEXT NOT NULL DEFAULT 'Paid',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 6. Configurable Fee Structures Master
CREATE TABLE IF NOT EXISTS public.fee_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL, -- e.g. B.Tech Computer Science & Engineering 2024-2028
    department TEXT NOT NULL,
    academic_year TEXT NOT NULL DEFAULT '2024-2025',
    quota TEXT NOT NULL DEFAULT 'Merit', -- Merit, Management, Lateral_Entry, NRI
    tuition_fee NUMERIC(10,2) NOT NULL DEFAULT 55000.00,
    lab_fee NUMERIC(10,2) NOT NULL DEFAULT 12000.00,
    exam_fee NUMERIC(10,2) NOT NULL DEFAULT 3500.00,
    library_fee NUMERIC(10,2) NOT NULL DEFAULT 2500.00,
    sports_fee NUMERIC(10,2) NOT NULL DEFAULT 1500.00,
    development_fund NUMERIC(10,2) NOT NULL DEFAULT 5500.00,
    hostel_fee_default NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    transport_fee_default NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total_annual_fee NUMERIC(10,2) NOT NULL DEFAULT 80000.00,
    installments_allowed INTEGER NOT NULL DEFAULT 2,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 7. Scholarships & Concessions Master
CREATE TABLE IF NOT EXISTS public.scholarships_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scholarship_name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL, -- Government, Merit, Sports, Staff_Ward, EWS
    discount_type TEXT NOT NULL DEFAULT 'Fixed_Amount', -- Percentage, Fixed_Amount
    discount_value NUMERIC(10,2) NOT NULL DEFAULT 25000.00,
    eligibility_criteria TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 8. Scholarship & Concession Applications
CREATE TABLE IF NOT EXISTS public.scholarship_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    roll_number TEXT NOT NULL,
    department TEXT NOT NULL,
    scholarship_id UUID REFERENCES public.scholarships_master(id) ON DELETE CASCADE,
    scholarship_name TEXT NOT NULL,
    academic_year TEXT NOT NULL DEFAULT '2024-2025',
    requested_amount NUMERIC(10,2) NOT NULL,
    sanctioned_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    proof_document_url TEXT,
    status TEXT NOT NULL DEFAULT 'Approved', -- Submitted, Verified_Accounts, Recommended_HOD, Approved, Rejected
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 9. Official Printable Fee Receipts with QR Token
CREATE TABLE IF NOT EXISTS public.fee_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number TEXT UNIQUE NOT NULL, -- e.g. ACET-REC-2025-00412
    student_fee_id UUID REFERENCES public.student_fees(id) ON DELETE SET NULL,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    roll_number TEXT NOT NULL,
    department TEXT NOT NULL,
    academic_year TEXT NOT NULL DEFAULT '2024-2025',
    semester TEXT NOT NULL DEFAULT 'Semester 4',
    fee_type TEXT NOT NULL DEFAULT 'Annual Tuition & Academic Composite Fee',
    gross_amount NUMERIC(10,2) NOT NULL,
    discount_applied NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    discount_reason TEXT,
    amount_paid NUMERIC(10,2) NOT NULL,
    balance_remaining NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    payment_mode TEXT NOT NULL DEFAULT 'Online_UPI', -- Online_UPI, Card, Bank_Challan, Demand_Draft, Cash
    transaction_reference TEXT NOT NULL,
    payment_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    cashier_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    qr_verification_token TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 10. Automated Fee Payment Reminders
CREATE TABLE IF NOT EXISTS public.fee_payment_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_fee_id UUID REFERENCES public.student_fees(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    roll_number TEXT NOT NULL,
    reminder_type TEXT NOT NULL, -- 15_days_prior, 7_days_prior, due_date, overdue_escalation
    due_date DATE NOT NULL,
    amount_due NUMERIC(10,2) NOT NULL,
    channels TEXT NOT NULL DEFAULT 'In_App,SMS,Email',
    delivery_status TEXT NOT NULL DEFAULT 'Sent',
    sent_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 11. Period-Wise Class Attendance Sessions
CREATE TABLE IF NOT EXISTS public.class_attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    teacher_name TEXT NOT NULL,
    class_name TEXT NOT NULL,
    department TEXT NOT NULL,
    subject_code TEXT NOT NULL,
    subject_title TEXT NOT NULL,
    session_date DATE DEFAULT CURRENT_DATE NOT NULL,
    period_number INTEGER NOT NULL DEFAULT 1, -- Period 1 to 7
    total_enrolled INTEGER NOT NULL DEFAULT 0,
    total_present INTEGER NOT NULL DEFAULT 0,
    total_absent INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Completed',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 12. Student Attendance Records per Session
CREATE TABLE IF NOT EXISTS public.student_attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.class_attendance_sessions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    roll_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Present', -- Present, Absent, Late, On_Duty
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 13. Low Attendance 75% Shortage Warnings
CREATE TABLE IF NOT EXISTS public.attendance_shortage_warnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    roll_number TEXT NOT NULL,
    department TEXT NOT NULL,
    class_name TEXT NOT NULL,
    subject_code TEXT NOT NULL,
    subject_title TEXT NOT NULL,
    total_conducted INTEGER NOT NULL,
    total_attended INTEGER NOT NULL,
    percentage NUMERIC(5,2) NOT NULL,
    warning_level TEXT NOT NULL, -- Level_1_Warning_74pct, Level_2_Parent_Summons_70pct, Final_Detention_Notice
    issued_date DATE DEFAULT CURRENT_DATE,
    parent_notified BOOLEAN NOT NULL DEFAULT TRUE,
    parent_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    is_detained BOOLEAN NOT NULL DEFAULT FALSE,
    condonation_applied BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 14. Controller of Examinations Official Hall Tickets
CREATE TABLE IF NOT EXISTS public.hall_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    roll_number TEXT NOT NULL,
    register_number TEXT NOT NULL,
    department TEXT NOT NULL,
    class_name TEXT NOT NULL,
    academic_year TEXT NOT NULL DEFAULT '2024-2025',
    semester TEXT NOT NULL DEFAULT 'Semester 4',
    exam_center TEXT NOT NULL DEFAULT 'Main Examination Complex (Block B), Adhithyan College',
    hall_number TEXT NOT NULL DEFAULT 'Exam Hall B-302',
    seat_number TEXT NOT NULL DEFAULT 'Desk 14-B',
    attendance_pct NUMERIC(5,2) NOT NULL DEFAULT 88.00,
    has_fee_dues BOOLEAN NOT NULL DEFAULT FALSE,
    is_detained BOOLEAN NOT NULL DEFAULT FALSE,
    detention_reason TEXT,
    qr_code_token TEXT UNIQUE NOT NULL,
    issued_date DATE DEFAULT CURRENT_DATE,
    coe_signature_hash TEXT NOT NULL DEFAULT 'COE-AUTH-SIG-2025-VERIFIED',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 15. Library Circulation Desk Records
CREATE TABLE IF NOT EXISTS public.library_circulation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID REFERENCES public.library_books(id) ON DELETE CASCADE,
    book_title TEXT NOT NULL,
    accession_no TEXT NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL DEFAULT 'student',
    issue_date DATE DEFAULT CURRENT_DATE NOT NULL,
    due_date DATE DEFAULT (CURRENT_DATE + INTERVAL '14 days') NOT NULL,
    return_date DATE,
    overdue_days INTEGER NOT NULL DEFAULT 0,
    fine_amount NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    fine_paid BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'Issued', -- Issued, Returned, Overdue, Lost
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 16. Hostel Campus Housing Rooms
CREATE TABLE IF NOT EXISTS public.hostel_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_name TEXT NOT NULL, -- Kaveri Block, Ganga Block, Yamuna Block
    floor_number INTEGER NOT NULL DEFAULT 1,
    room_number TEXT NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 3,
    current_occupancy INTEGER NOT NULL DEFAULT 0,
    room_type TEXT NOT NULL DEFAULT 'Non-AC', -- AC, Non-AC
    annual_fee NUMERIC(10,2) NOT NULL DEFAULT 65000.00,
    status TEXT NOT NULL DEFAULT 'Available',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(block_name, room_number)
);

-- 17. Hostel Digital Out-Pass & Gate-Pass
CREATE TABLE IF NOT EXISTS public.hostel_out_passes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    roll_number TEXT NOT NULL,
    room_details TEXT NOT NULL,
    purpose TEXT NOT NULL,
    destination_address TEXT NOT NULL,
    departure_time TIMESTAMPTZ NOT NULL,
    expected_return_time TIMESTAMPTZ NOT NULL,
    actual_return_time TIMESTAMPTZ,
    parent_phone TEXT NOT NULL,
    parent_otp_verified BOOLEAN NOT NULL DEFAULT TRUE,
    warden_status TEXT NOT NULL DEFAULT 'Approved', -- Pending, Approved, Rejected, Exited, Returned
    guard_exit_time TIMESTAMPTZ,
    guard_entry_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 18. Training & Placement Drives
CREATE TABLE IF NOT EXISTS public.placement_drives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    company_logo_url TEXT,
    job_title TEXT NOT NULL,
    package_lpa NUMERIC(6,2) NOT NULL, -- e.g. 8.50 LPA
    job_location TEXT NOT NULL DEFAULT 'Bengaluru / Chennai',
    min_cgpa NUMERIC(3,2) NOT NULL DEFAULT 6.50,
    max_backlogs INTEGER NOT NULL DEFAULT 0,
    eligible_departments TEXT[] NOT NULL DEFAULT '{"B.Tech CSE", "B.Tech IT", "B.Tech ECE"}',
    drive_date DATE NOT NULL,
    application_deadline DATE NOT NULL,
    selection_rounds TEXT[] NOT NULL DEFAULT '{"Online Aptitude Test", "Technical Coding", "HR Interview"}',
    status TEXT NOT NULL DEFAULT 'Open', -- Open, Shortlisting, Completed
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 19. Student Placement Applications
CREATE TABLE IF NOT EXISTS public.placement_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drive_id UUID REFERENCES public.placement_drives(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    roll_number TEXT NOT NULL,
    department TEXT NOT NULL,
    cgpa NUMERIC(4,2) NOT NULL,
    current_round TEXT NOT NULL DEFAULT 'Applied', -- Applied, Aptitude Cleared, Technical Cleared, Offered, Rejected
    offer_letter_url TEXT,
    status TEXT NOT NULL DEFAULT 'In_Progress',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 20. Institutional Emergency Broadcasts & Circulars
CREATE TABLE IF NOT EXISTS public.institutional_broadcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Circular', -- Emergency, Circular, Exam, Holiday, Event
    priority TEXT NOT NULL DEFAULT 'High', -- Normal, High, Urgent
    target_audience TEXT NOT NULL DEFAULT 'All', -- All, Students, Faculty, Parents
    author_name TEXT NOT NULL DEFAULT 'Office of the Principal',
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY & PERMISSIVE ACCESS POLICIES
-- ============================================================================

ALTER TABLE public.staff_service_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_leave_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_payroll_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholarships_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholarship_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_shortage_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hall_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_circulation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hostel_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hostel_out_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placement_drives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placement_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutional_broadcasts ENABLE ROW LEVEL SECURITY;

-- Permissive authenticated read/write policies for complete institutional ERP functionality
CREATE POLICY "staff_records_all" ON public.staff_service_records FOR ALL TO authenticated USING (true);
CREATE POLICY "staff_leaves_bal_all" ON public.staff_leave_balances FOR ALL TO authenticated USING (true);
CREATE POLICY "staff_leaves_app_all" ON public.staff_leave_applications FOR ALL TO authenticated USING (true);
CREATE POLICY "payroll_runs_all" ON public.staff_payroll_runs FOR ALL TO authenticated USING (true);
CREATE POLICY "payroll_items_all" ON public.staff_payroll_items FOR ALL TO authenticated USING (true);
CREATE POLICY "fee_structures_all" ON public.fee_structures FOR ALL TO authenticated USING (true);
CREATE POLICY "scholarships_master_all" ON public.scholarships_master FOR ALL TO authenticated USING (true);
CREATE POLICY "scholarship_apps_all" ON public.scholarship_applications FOR ALL TO authenticated USING (true);
CREATE POLICY "fee_receipts_all" ON public.fee_receipts FOR ALL TO authenticated USING (true);
CREATE POLICY "fee_reminders_all" ON public.fee_payment_reminders FOR ALL TO authenticated USING (true);
CREATE POLICY "att_sessions_all" ON public.class_attendance_sessions FOR ALL TO authenticated USING (true);
CREATE POLICY "att_records_all" ON public.student_attendance_records FOR ALL TO authenticated USING (true);
CREATE POLICY "shortage_warnings_all" ON public.attendance_shortage_warnings FOR ALL TO authenticated USING (true);
CREATE POLICY "hall_tickets_all" ON public.hall_tickets FOR ALL TO authenticated USING (true);
CREATE POLICY "library_circ_all" ON public.library_circulation FOR ALL TO authenticated USING (true);
CREATE POLICY "hostel_rooms_all" ON public.hostel_rooms FOR ALL TO authenticated USING (true);
CREATE POLICY "hostel_out_passes_all" ON public.hostel_out_passes FOR ALL TO authenticated USING (true);
CREATE POLICY "placement_drives_all" ON public.placement_drives FOR ALL TO authenticated USING (true);
CREATE POLICY "placement_apps_all" ON public.placement_applications FOR ALL TO authenticated USING (true);
CREATE POLICY "broadcasts_all" ON public.institutional_broadcasts FOR ALL TO authenticated USING (true);

-- Allow public read on Fee Structures & Placement Drives
CREATE POLICY "fee_structures_public_read" ON public.fee_structures FOR SELECT TO public USING (true);
CREATE POLICY "scholarships_public_read" ON public.scholarships_master FOR SELECT TO public USING (true);
CREATE POLICY "broadcasts_public_read" ON public.institutional_broadcasts FOR SELECT TO public USING (true);

-- ============================================================================
-- SEED DATA: Baseline Templates for Immediate Operational Readiness
-- ============================================================================

-- Seed Fee Structures
INSERT INTO public.fee_structures (title, department, academic_year, quota, tuition_fee, lab_fee, exam_fee, library_fee, sports_fee, development_fund, total_annual_fee)
VALUES 
    ('B.Tech CSE — Government Merit Quota', 'B.Tech CSE', '2024-2025', 'Merit', 55000.00, 12000.00, 3500.00, 2500.00, 1500.00, 5500.00, 80000.00),
    ('B.Tech CSE — Management Quota', 'B.Tech CSE', '2024-2025', 'Management', 110000.00, 18000.00, 3500.00, 4000.00, 2500.00, 12000.00, 150000.00),
    ('B.Tech IT — Government Merit Quota', 'B.Tech IT', '2024-2025', 'Merit', 55000.00, 12000.00, 3500.00, 2500.00, 1500.00, 5500.00, 80000.00),
    ('B.Tech ECE — Government Merit Quota', 'B.Tech ECE', '2024-2025', 'Merit', 50000.00, 14000.00, 3500.00, 2500.00, 1500.00, 5500.00, 77000.00),
    ('B.E Mechanical — Government Merit Quota', 'B.E Mechanical', '2024-2025', 'Merit', 48000.00, 15000.00, 3500.00, 2500.00, 1500.00, 5500.00, 76000.00)
ON CONFLICT DO NOTHING;

-- Seed Scholarships Master
INSERT INTO public.scholarships_master (scholarship_name, code, category, discount_type, discount_value, eligibility_criteria)
VALUES
    ('First Graduate State Concession', 'SCHOL-FG-01', 'Government', 'Fixed_Amount', 25000.00, 'Student is the verified first graduate in the family with state certification.'),
    ('Merit Academic Excellence Waiver', 'SCHOL-MERIT-01', 'Merit', 'Percentage', 50.00, 'Higher secondary aggregate >= 95% or semester GPA >= 9.00 with zero arrears.'),
    ('University Sports Scholarship', 'SCHOL-SPORT-01', 'Sports', 'Fixed_Amount', 30000.00, 'State or National level representation in authorized collegiate sports tournaments.'),
    ('Institutional Staff Ward Concession', 'SCHOL-STAFF-01', 'Staff_Ward', 'Percentage', 40.00, 'Children of permanent Adhithyan College faculty and administrative personnel.'),
    ('Economically Weaker Section (EWS) Support', 'SCHOL-EWS-01', 'EWS', 'Fixed_Amount', 20000.00, 'Verified family annual income below ₹2,50,000 per annum.')
ON CONFLICT DO NOTHING;

-- Seed Institutional Circular
INSERT INTO public.institutional_broadcasts (title, message, category, priority, target_audience, author_name)
VALUES
    ('End-Semester Examination 2025 Schedule & 75% Attendance Compliance', 'All students are hereby notified that official examination hall tickets will be released on the portal. Students with cumulative attendance below 75% must meet their respective Class Advisor immediately. Fee dues must be settled to unlock hall tickets.', 'Exam', 'High', 'All', 'Office of the Principal')
ON CONFLICT DO NOTHING;

