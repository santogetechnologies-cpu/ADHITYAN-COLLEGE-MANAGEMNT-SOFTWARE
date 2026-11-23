-- Tables, part 5 of 7
-- Generated from the verified schema. Run as is; do not edit. Safe to run once on an EMPTY database.
SET check_function_bodies = false;
SET search_path = public, extensions;

SET check_function_bodies = false;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: naac_criterion_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.naac_criterion_progress (
    criterion_number integer NOT NULL,
    completion_percentage integer DEFAULT 0 NOT NULL,
    total_metrics integer DEFAULT 10 NOT NULL,
    completed_metrics integer DEFAULT 0 NOT NULL,
    last_updated timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT naac_criterion_progress_criterion_number_check CHECK (((criterion_number >= 1) AND (criterion_number <= 7)))
);

ALTER TABLE ONLY public.naac_criterion_progress REPLICA IDENTITY FULL;

--
-- Name: naac_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.naac_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    filename text NOT NULL,
    file_url text,
    criterion_number integer NOT NULL,
    metric_code text NOT NULL,
    evidence_type text NOT NULL,
    file_type text DEFAULT 'PDF'::text NOT NULL,
    file_size text,
    tags text[] DEFAULT '{}'::text[],
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.naac_documents REPLICA IDENTITY FULL;

--
-- Name: naac_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.naac_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    criterion_number integer NOT NULL,
    metric_code text NOT NULL,
    title text NOT NULL,
    status text DEFAULT 'Pending'::text NOT NULL,
    academic_year text,
    quantitative_value numeric,
    description text,
    remarks text,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT naac_metrics_status_check CHECK ((status = ANY (ARRAY['Pending'::text, 'In progress'::text, 'Completed'::text])))
);

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    title text NOT NULL,
    message text NOT NULL,
    type text DEFAULT 'info'::text NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notifications_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]))),
    CONSTRAINT notifications_type_check CHECK ((type = ANY (ARRAY['info'::text, 'warning'::text, 'error'::text, 'success'::text])))
);

ALTER TABLE ONLY public.notifications REPLICA IDENTITY FULL;

--
-- Name: parent_student_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parent_student_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    parent_id uuid NOT NULL,
    student_id uuid NOT NULL,
    relationship text DEFAULT 'Parent'::text NOT NULL,
    verified boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: payment_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    gateway_event_id text NOT NULL,
    event_type text,
    gateway_order_id text,
    payload jsonb,
    received_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: payment_order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    student_fee_id uuid NOT NULL,
    amount numeric(12,2) NOT NULL,
    CONSTRAINT payment_order_items_amount_check CHECK ((amount > (0)::numeric))
);

--
-- Name: payment_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_by uuid NOT NULL,
    payer_role text NOT NULL,
    student_id uuid,
    amount numeric(12,2) NOT NULL,
    currency text DEFAULT 'INR'::text NOT NULL,
    gateway text DEFAULT 'razorpay'::text NOT NULL,
    gateway_order_id text,
    gateway_payment_id text,
    status text DEFAULT 'Created'::text NOT NULL,
    failure_reason text,
    review_note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    paid_at timestamp with time zone,
    refunded_amount numeric(12,2) DEFAULT 0 NOT NULL,
    store_order_id uuid,
    CONSTRAINT payment_orders_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT payment_orders_refunded_amount_check CHECK ((refunded_amount >= (0)::numeric)),
    CONSTRAINT payment_orders_status_check CHECK ((status = ANY (ARRAY['Created'::text, 'Paid'::text, 'Failed'::text, 'Cancelled'::text, 'Review'::text, 'Refunded'::text, 'Partially_Refunded'::text])))
);

--
-- Name: payment_refunds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_refunds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    amount numeric(12,2) NOT NULL,
    reason text NOT NULL,
    gateway_refund_id text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    detail jsonb,
    CONSTRAINT payment_refunds_amount_check CHECK ((amount > (0)::numeric))
);

--
-- Name: payment_settlements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_settlements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    settlement_id text NOT NULL,
    gateway_payment_id text NOT NULL,
    amount numeric(12,2) NOT NULL,
    fee numeric(12,2) DEFAULT 0 NOT NULL,
    tax numeric(12,2) DEFAULT 0 NOT NULL,
    net numeric(12,2) NOT NULL,
    settled_at timestamp with time zone,
    order_id uuid,
    status text NOT NULL,
    imported_by uuid,
    imported_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payment_settlements_status_check CHECK ((status = ANY (ARRAY['Matched'::text, 'AmountMismatch'::text, 'UnknownPayment'::text])))
);

--
-- Name: payroll_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_settings (
    id boolean DEFAULT true NOT NULL,
    configured boolean DEFAULT false NOT NULL,
    epf_rate_pct numeric(5,2) DEFAULT 0 NOT NULL,
    epf_wage_ceiling numeric(12,2),
    esi_rate_pct numeric(5,2) DEFAULT 0 NOT NULL,
    esi_gross_limit numeric(12,2),
    professional_tax_monthly numeric(10,2) DEFAULT 0 NOT NULL,
    lop_leave_types text[] DEFAULT ARRAY['Loss of Pay'::text, 'LOP'::text, 'Unpaid'::text] NOT NULL,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payroll_settings_epf_rate_pct_check CHECK (((epf_rate_pct >= (0)::numeric) AND (epf_rate_pct <= (100)::numeric))),
    CONSTRAINT payroll_settings_epf_wage_ceiling_check CHECK (((epf_wage_ceiling IS NULL) OR (epf_wage_ceiling > (0)::numeric))),
    CONSTRAINT payroll_settings_esi_gross_limit_check CHECK (((esi_gross_limit IS NULL) OR (esi_gross_limit > (0)::numeric))),
    CONSTRAINT payroll_settings_esi_rate_pct_check CHECK (((esi_rate_pct >= (0)::numeric) AND (esi_rate_pct <= (100)::numeric))),
    CONSTRAINT payroll_settings_id_check CHECK (id),
    CONSTRAINT payroll_settings_professional_tax_monthly_check CHECK ((professional_tax_monthly >= (0)::numeric))
);

--
-- Name: placement_applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.placement_applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    drive_id uuid,
    student_id uuid,
    student_name text NOT NULL,
    roll_number text NOT NULL,
    department text NOT NULL,
    cgpa numeric(4,2) NOT NULL,
    current_round text DEFAULT 'Applied'::text NOT NULL,
    offer_letter_url text,
    status text DEFAULT 'Applied'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    cgpa_verified boolean DEFAULT false NOT NULL
);

--
-- Name: placement_drives; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.placement_drives (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_name text NOT NULL,
    company_logo_url text,
    job_title text NOT NULL,
    package_lpa numeric(6,2) NOT NULL,
    job_location text DEFAULT 'Bengaluru / Chennai'::text NOT NULL,
    min_cgpa numeric(3,2) DEFAULT 6.50 NOT NULL,
    max_backlogs integer DEFAULT 0 NOT NULL,
    eligible_departments text[] DEFAULT '{"B.Tech CSE","B.Tech IT","B.Tech ECE"}'::text[] NOT NULL,
    drive_date date NOT NULL,
    application_deadline date NOT NULL,
    selection_rounds text[] DEFAULT '{"Online Aptitude Test","Technical Coding","HR Interview"}'::text[] NOT NULL,
    status text DEFAULT 'Open'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    role text NOT NULL,
    avatar_url text,
    phone text,
    department text,
    class_name text,
    roll_number text,
    bio text,
    preferences jsonb DEFAULT '{"theme": "light", "language": "en", "notifications": true}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    course text,
    status text DEFAULT 'active'::text NOT NULL,
    login_id text,
    student_id text,
    is_first_login boolean DEFAULT false,
    requires_password_change boolean DEFAULT false,
    CONSTRAINT profiles_login_id_check CHECK (((login_id IS NULL) OR (length(TRIM(BOTH FROM login_id)) >= 3))),
    CONSTRAINT profiles_role_check CHECK (((role IS NOT NULL) AND (role = ANY (ARRAY['admin'::text, 'principal'::text, 'teacher'::text, 'hod'::text, 'coe'::text, 'student'::text, 'parent'::text, 'finance_manager'::text, 'accountant'::text, 'financier'::text, 'store_manager'::text, 'storekeeper'::text, 'transport_driver'::text, 'driver'::text, 'receptionist'::text, 'naac_coordinator'::text, 'hr_manager'::text, 'librarian'::text, 'hostel_warden'::text, 'placement_officer'::text])))),
    CONSTRAINT profiles_status_check CHECK (((status IS NOT NULL) AND (status = ANY (ARRAY['active'::text, 'inactive'::text, 'suspended'::text]))))
);

ALTER TABLE ONLY public.profiles REPLICA IDENTITY FULL;

--
-- Name: reception_appointments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reception_appointments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "time" text NOT NULL,
    person text NOT NULL,
    with_whom text NOT NULL,
    type text DEFAULT 'meeting'::text NOT NULL,
    status text DEFAULT 'scheduled'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    with_user_id uuid,
    appointment_date date DEFAULT CURRENT_DATE,
    notes text,
    contact text,
    CONSTRAINT reception_appointments_status_check CHECK ((status = ANY (ARRAY['scheduled'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text]))),
    CONSTRAINT reception_appointments_type_check CHECK ((type = ANY (ARRAY['meeting'::text, 'interview'::text, 'business'::text, 'counseling'::text])))
);

ALTER TABLE ONLY public.reception_appointments REPLICA IDENTITY FULL;

--
-- Name: reception_enquiries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reception_enquiries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enquiry_code text NOT NULL,
    type text NOT NULL,
    parent_name text NOT NULL,
    grade text NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    phone text,
    email text,
    notes text,
    CONSTRAINT reception_enquiries_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]))),
    CONSTRAINT reception_enquiries_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'resolved'::text])))
);

ALTER TABLE ONLY public.reception_enquiries REPLICA IDENTITY FULL;

--
-- Name: reception_visitors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reception_visitors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    purpose text NOT NULL,
    "time" text NOT NULL,
    status text DEFAULT 'checked_in'::text NOT NULL,
    contact text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    check_out_time timestamp with time zone,
    host_person text,
    badge_number text,
    CONSTRAINT reception_visitors_status_check CHECK ((status = ANY (ARRAY['checked_in'::text, 'waiting'::text, 'completed'::text, 'pending'::text])))
);

ALTER TABLE ONLY public.reception_visitors REPLICA IDENTITY FULL;

--
-- Name: scholarship_applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scholarship_applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid,
    student_name text NOT NULL,
    roll_number text NOT NULL,
    department text NOT NULL,
    scholarship_id uuid,
    scholarship_name text NOT NULL,
    academic_year text DEFAULT '2024-2025'::text NOT NULL,
    requested_amount numeric(10,2) NOT NULL,
    sanctioned_amount numeric(10,2) DEFAULT 0 NOT NULL,
    proof_document_url text,
    status text DEFAULT 'Approved'::text NOT NULL,
    approved_by uuid,
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- PostgreSQL database dump complete
--
