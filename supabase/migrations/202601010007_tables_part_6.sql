-- Tables, part 6 of 7
-- Generated from the verified schema. Run as is; do not edit. Safe to run once on an EMPTY database.
SET check_function_bodies = false;
SET search_path = public, extensions;

SET check_function_bodies = false;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: scholarships_master; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scholarships_master (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    scholarship_name text NOT NULL,
    code text NOT NULL,
    category text NOT NULL,
    discount_type text DEFAULT 'Fixed_Amount'::text NOT NULL,
    discount_value numeric(10,2) DEFAULT 25000.00 NOT NULL,
    eligibility_criteria text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    department_id uuid NOT NULL,
    name text NOT NULL,
    capacity integer DEFAULT 50 NOT NULL,
    current_students integer DEFAULT 0 NOT NULL,
    assigned_teacher_id uuid,
    assigned_teacher_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: sports_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sports_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    sport text NOT NULL,
    date date NOT NULL,
    status text DEFAULT 'Upcoming'::text NOT NULL,
    participants integer DEFAULT 0 NOT NULL,
    teams integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sports_events_status_check CHECK ((status = ANY (ARRAY['Upcoming'::text, 'Registrations Open'::text, 'Ongoing'::text, 'Completed'::text])))
);

ALTER TABLE ONLY public.sports_events REPLICA IDENTITY FULL;

--
-- Name: sports_teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sports_teams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sport text NOT NULL,
    category text NOT NULL,
    captain text NOT NULL,
    members_count integer DEFAULT 0 NOT NULL,
    coach text NOT NULL,
    achievements text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.sports_teams REPLICA IDENTITY FULL;

--
-- Name: staff_leave_applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_leave_applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    staff_name text NOT NULL,
    department text NOT NULL,
    leave_type text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    total_days integer DEFAULT 1 NOT NULL,
    reason text NOT NULL,
    substitute_teacher_id uuid,
    substitute_teacher_name text,
    status text DEFAULT 'Pending_Principal'::text NOT NULL,
    approved_by uuid,
    rejection_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: staff_leave_balances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_leave_balances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    academic_year text DEFAULT '2024-2025'::text NOT NULL,
    casual_leave_quota integer DEFAULT 12 NOT NULL,
    casual_leave_taken integer DEFAULT 0 NOT NULL,
    medical_leave_quota integer DEFAULT 10 NOT NULL,
    medical_leave_taken integer DEFAULT 0 NOT NULL,
    earned_leave_quota integer DEFAULT 15 NOT NULL,
    earned_leave_taken integer DEFAULT 0 NOT NULL,
    on_duty_taken integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_staff_leave_balances_non_negative CHECK (((casual_leave_taken >= 0) AND (casual_leave_taken <= casual_leave_quota) AND (medical_leave_taken >= 0) AND (medical_leave_taken <= medical_leave_quota) AND (earned_leave_taken >= 0) AND (earned_leave_taken <= earned_leave_quota) AND (on_duty_taken >= 0) AND (casual_leave_quota >= 0) AND (medical_leave_quota >= 0) AND (earned_leave_quota >= 0)))
);

--
-- Name: staff_payroll_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_payroll_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payroll_run_id uuid,
    user_id uuid,
    employee_code text NOT NULL,
    employee_name text NOT NULL,
    department text NOT NULL,
    designation text NOT NULL,
    month_year text NOT NULL,
    days_in_month integer DEFAULT 30 NOT NULL,
    days_worked integer DEFAULT 30 NOT NULL,
    lop_days integer DEFAULT 0 NOT NULL,
    basic_earned numeric(10,2) NOT NULL,
    da_earned numeric(10,2) NOT NULL,
    hra_earned numeric(10,2) NOT NULL,
    special_allowance numeric(10,2) DEFAULT 0 NOT NULL,
    gross_salary numeric(10,2) NOT NULL,
    epf_deduction numeric(10,2) DEFAULT 0 NOT NULL,
    esi_deduction numeric(10,2) DEFAULT 0 NOT NULL,
    pt_deduction numeric(10,2) DEFAULT 200.00 NOT NULL,
    tds_deduction numeric(10,2) DEFAULT 0 NOT NULL,
    other_deductions numeric(10,2) DEFAULT 0 NOT NULL,
    total_deductions numeric(10,2) NOT NULL,
    net_salary numeric(10,2) NOT NULL,
    payslip_number text NOT NULL,
    payment_reference text,
    status text DEFAULT 'Paid'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: staff_payroll_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_payroll_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    month_year text NOT NULL,
    total_gross_disbursed numeric(14,2) DEFAULT 0 NOT NULL,
    total_deductions numeric(14,2) DEFAULT 0 NOT NULL,
    total_net_disbursed numeric(14,2) DEFAULT 0 NOT NULL,
    total_employees integer DEFAULT 0 NOT NULL,
    run_date date DEFAULT CURRENT_DATE,
    status text DEFAULT 'Disbursed'::text NOT NULL,
    processed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    approved_by uuid,
    approved_at timestamp with time zone,
    disbursed_at timestamp with time zone,
    payment_reference text
);

--
-- Name: staff_service_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_service_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    employee_code text NOT NULL,
    designation text NOT NULL,
    department text NOT NULL,
    qualification text NOT NULL,
    date_of_joining date DEFAULT CURRENT_DATE,
    employment_type text DEFAULT 'Permanent'::text NOT NULL,
    pan_number text,
    pf_uan_number text,
    bank_name text,
    bank_account_no text,
    bank_ifsc text,
    basic_pay numeric(12,2) DEFAULT 0 NOT NULL,
    da_pct numeric(5,2) DEFAULT 0 NOT NULL,
    hra_pct numeric(5,2) DEFAULT 0 NOT NULL,
    special_allowance numeric(10,2) DEFAULT 0 NOT NULL,
    epf_opt_out boolean DEFAULT false NOT NULL,
    status text DEFAULT 'Active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    monthly_tds numeric(12,2) DEFAULT 0 NOT NULL,
    other_deductions numeric(12,2) DEFAULT 0 NOT NULL,
    CONSTRAINT staff_service_records_monthly_tds_check CHECK ((monthly_tds >= (0)::numeric)),
    CONSTRAINT staff_service_records_other_deductions_check CHECK ((other_deductions >= (0)::numeric))
);

--
-- Name: store_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    user_name text NOT NULL,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    status text DEFAULT 'Pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    payment_status text DEFAULT 'Unpaid'::text NOT NULL,
    payment_order_id uuid,
    CONSTRAINT store_orders_payment_status_chk CHECK ((payment_status = ANY (ARRAY['Unpaid'::text, 'Paid'::text, 'Refunded'::text]))),
    CONSTRAINT store_orders_status_check CHECK ((status = ANY (ARRAY['Pending'::text, 'Processing'::text, 'Delivered'::text, 'Cancelled'::text])))
);

ALTER TABLE ONLY public.store_orders REPLICA IDENTITY FULL;

--
-- Name: store_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    price numeric(10,2) NOT NULL,
    category text NOT NULL,
    rating numeric(2,1) DEFAULT 4.5,
    image_url text DEFAULT '/placeholder.svg'::text,
    stock integer DEFAULT 0 NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.store_products REPLICA IDENTITY FULL;

--
-- Name: student_achievements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_achievements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid,
    title text NOT NULL,
    description text NOT NULL,
    type text NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    level text DEFAULT 'Gold'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT student_achievements_level_check CHECK ((level = ANY (ARRAY['Gold'::text, 'Silver'::text, 'Bronze'::text]))),
    CONSTRAINT student_achievements_type_check CHECK ((type = ANY (ARRAY['academic'::text, 'attendance'::text, 'social'::text, 'sports'::text])))
);

--
-- Name: student_attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_attendance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    status text NOT NULL,
    subject text,
    remarks text,
    recorded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    institutional_student_id text,
    course text,
    semester text,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT student_attendance_status_check CHECK ((status = ANY (ARRAY['present'::text, 'absent'::text, 'late'::text, 'leave'::text, 'excused'::text])))
);

--
-- Name: student_attendance_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_attendance_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid,
    student_id uuid,
    student_name text NOT NULL,
    roll_number text NOT NULL,
    status text DEFAULT 'Present'::text NOT NULL,
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: student_fees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_fees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid,
    student_name text NOT NULL,
    class_name text NOT NULL,
    total_due numeric(10,2) NOT NULL,
    paid_amount numeric(10,2) DEFAULT 0 NOT NULL,
    due_date date NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    student_record_id uuid,
    fee_head_id uuid,
    plan_item_id uuid,
    run_id uuid,
    charge_key text,
    academic_year text,
    term_label text,
    description text,
    original_amount numeric(12,2),
    waived_amount numeric(12,2) DEFAULT 0 NOT NULL,
    student_code text,
    CONSTRAINT student_fees_status_check CHECK ((status = ANY (ARRAY['paid'::text, 'pending'::text, 'overdue'::text, 'partially_paid'::text, 'waived'::text, 'cancelled'::text])))
);

ALTER TABLE ONLY public.student_fees REPLICA IDENTITY FULL;

--
-- Name: student_goals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_goals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid,
    title text NOT NULL,
    description text,
    progress integer DEFAULT 0 NOT NULL,
    current_value integer DEFAULT 0 NOT NULL,
    target_value integer DEFAULT 100 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: student_learning_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_learning_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    content_id uuid NOT NULL,
    current_module_index integer DEFAULT 0 NOT NULL,
    progress_percentage numeric DEFAULT 0 NOT NULL,
    last_position_seconds numeric DEFAULT 0 NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    notes text,
    completed_modules text[] DEFAULT '{}'::text[],
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: student_leave_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_leave_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    leave_type text DEFAULT 'Personal'::text NOT NULL,
    from_date date NOT NULL,
    to_date date NOT NULL,
    reason text NOT NULL,
    status text DEFAULT 'Pending'::text NOT NULL,
    decided_by uuid,
    decision_note text,
    decided_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT student_leave_requests_check CHECK ((to_date >= from_date)),
    CONSTRAINT student_leave_requests_leave_type_check CHECK ((leave_type = ANY (ARRAY['Medical'::text, 'Personal'::text, 'Family'::text, 'Event'::text, 'Other'::text]))),
    CONSTRAINT student_leave_requests_status_check CHECK ((status = ANY (ARRAY['Pending'::text, 'Approved'::text, 'Rejected'::text, 'Cancelled'::text])))
);

--
-- PostgreSQL database dump complete
--
