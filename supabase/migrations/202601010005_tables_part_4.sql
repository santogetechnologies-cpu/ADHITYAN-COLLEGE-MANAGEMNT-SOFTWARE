-- Tables, part 4 of 7
-- Generated from the verified schema. Run as is; do not edit. Safe to run once on an EMPTY database.
SET check_function_bodies = false;
SET search_path = public, extensions;

SET check_function_bodies = false;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: finance_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.finance_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type text NOT NULL,
    amount numeric(12,2) NOT NULL,
    department text,
    description text,
    urgency text DEFAULT 'medium'::text,
    status text DEFAULT 'Approved'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT finance_transactions_status_check CHECK ((status = ANY (ARRAY['Pending'::text, 'Approved'::text, 'Rejected'::text]))),
    CONSTRAINT finance_transactions_urgency_check CHECK ((urgency = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])))
);

ALTER TABLE ONLY public.finance_transactions REPLICA IDENTITY FULL;

--
-- Name: grade_scale_bands; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grade_scale_bands (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    scale_id uuid NOT NULL,
    min_pct numeric(5,2) NOT NULL,
    grade text NOT NULL,
    grade_point numeric(4,2) NOT NULL,
    CONSTRAINT grade_scale_bands_grade_point_check CHECK ((grade_point >= (0)::numeric)),
    CONSTRAINT grade_scale_bands_min_pct_check CHECK (((min_pct >= (0)::numeric) AND (min_pct <= (100)::numeric)))
);

--
-- Name: grade_scales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grade_scales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    max_points numeric(4,1) DEFAULT 10 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT grade_scales_max_points_check CHECK ((max_points > (0)::numeric))
);

--
-- Name: hall_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hall_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid,
    student_name text NOT NULL,
    roll_number text NOT NULL,
    register_number text NOT NULL,
    department text NOT NULL,
    class_name text NOT NULL,
    academic_year text,
    semester text,
    exam_center text,
    hall_number text,
    seat_number text,
    attendance_pct numeric(5,2) NOT NULL,
    has_fee_dues boolean DEFAULT false NOT NULL,
    is_detained boolean DEFAULT false NOT NULL,
    detention_reason text,
    qr_code_token text NOT NULL,
    issued_date date DEFAULT CURRENT_DATE,
    coe_signature_hash text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'Issued'::text,
    exam_title text,
    exam_id uuid,
    file_url text,
    override_reason text,
    overridden_by uuid,
    overridden_at timestamp with time zone
);

--
-- Name: health_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.health_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    user_id uuid,
    role text DEFAULT 'student'::text NOT NULL,
    class_name text,
    roll_no text,
    blood_group text,
    allergies text[] DEFAULT '{}'::text[],
    medical_conditions text[] DEFAULT '{}'::text[],
    emergency_contact_name text,
    emergency_contact_phone text,
    vaccination_status text DEFAULT 'Up to date'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    notes text
);

ALTER TABLE ONLY public.health_records REPLICA IDENTITY FULL;

--
-- Name: hostel_allotments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hostel_allotments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    room_id uuid NOT NULL,
    status text DEFAULT 'Active'::text NOT NULL,
    allotted_on date DEFAULT CURRENT_DATE NOT NULL,
    vacated_on date,
    allotted_by uuid,
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT hostel_allotments_status_check CHECK ((status = ANY (ARRAY['Active'::text, 'Vacated'::text])))
);

--
-- Name: hostel_out_passes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hostel_out_passes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid,
    student_name text NOT NULL,
    roll_number text NOT NULL,
    room_details text NOT NULL,
    purpose text NOT NULL,
    destination_address text NOT NULL,
    departure_time timestamp with time zone NOT NULL,
    expected_return_time timestamp with time zone NOT NULL,
    actual_return_time timestamp with time zone,
    parent_phone text NOT NULL,
    parent_otp_verified boolean DEFAULT false NOT NULL,
    warden_status text DEFAULT 'Pending'::text NOT NULL,
    guard_exit_time timestamp with time zone,
    guard_entry_time timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: hostel_rooms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hostel_rooms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    block_name text NOT NULL,
    floor_number integer DEFAULT 1 NOT NULL,
    room_number text NOT NULL,
    capacity integer DEFAULT 3 NOT NULL,
    current_occupancy integer DEFAULT 0 NOT NULL,
    room_type text DEFAULT 'Non-AC'::text NOT NULL,
    annual_fee numeric(10,2) DEFAULT 65000.00 NOT NULL,
    status text DEFAULT 'Available'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: infirmary_visits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.infirmary_visits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_name text NOT NULL,
    patient_role text DEFAULT 'student'::text NOT NULL,
    class_name text,
    visit_date timestamp with time zone DEFAULT now() NOT NULL,
    symptoms text NOT NULL,
    treatment text,
    attending_staff text NOT NULL,
    status text DEFAULT 'Admitted'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    student_ref text,
    follow_up_date date,
    recorded_by uuid,
    CONSTRAINT infirmary_visits_status_check CHECK ((status = ANY (ARRAY['Admitted'::text, 'Discharged'::text, 'Referred to Hospital'::text])))
);

ALTER TABLE ONLY public.infirmary_visits REPLICA IDENTITY FULL;

--
-- Name: institutional_broadcasts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.institutional_broadcasts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    category text DEFAULT 'Circular'::text NOT NULL,
    priority text DEFAULT 'High'::text NOT NULL,
    target_audience text DEFAULT 'All'::text NOT NULL,
    author_name text DEFAULT 'Office of the Principal'::text NOT NULL,
    author_id uuid,
    published_at timestamp with time zone DEFAULT now() NOT NULL,
    target_class text,
    target_department text
);

--
-- Name: institutional_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.institutional_settings (
    id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    institution_name text DEFAULT 'Adhithyan Group of Institutions'::text NOT NULL,
    institution_code text DEFAULT 'ADH'::text NOT NULL,
    academic_year text DEFAULT '2026-2027'::text NOT NULL,
    contact_email text,
    contact_phone text,
    address text,
    student_id_prefix text DEFAULT 'AIP'::text NOT NULL,
    min_attendance_percentage numeric(5,2) DEFAULT 75.0 NOT NULL,
    passing_marks_percentage numeric(5,2) DEFAULT 40.0 NOT NULL,
    enable_realtime boolean DEFAULT true NOT NULL,
    enable_email_alerts boolean DEFAULT true NOT NULL,
    maintenance_mode boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    exam_requires_fee_clearance boolean DEFAULT false NOT NULL,
    online_payments_enabled boolean DEFAULT false NOT NULL,
    auto_fee_reminders boolean DEFAULT false NOT NULL,
    fee_reminder_days integer DEFAULT 7 NOT NULL,
    sms_alerts_enabled boolean DEFAULT false NOT NULL,
    whatsapp_alerts_enabled boolean DEFAULT false NOT NULL,
    CONSTRAINT institutional_settings_pct CHECK ((((min_attendance_percentage >= (0)::numeric) AND (min_attendance_percentage <= (100)::numeric)) AND ((passing_marks_percentage >= (0)::numeric) AND (passing_marks_percentage <= (100)::numeric)))),
    CONSTRAINT institutional_settings_prefix CHECK ((student_id_prefix ~ '^[A-Z0-9]{2,8}$'::text)),
    CONSTRAINT institutional_settings_reminder_days CHECK (((fee_reminder_days >= 0) AND (fee_reminder_days <= 30))),
    CONSTRAINT institutional_settings_singleton CHECK ((id = '00000000-0000-0000-0000-000000000001'::uuid))
);

--
-- Name: integration_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integration_settings (
    kind text NOT NULL,
    provider text NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    public_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    secret_ciphertext text,
    secret_keys text[] DEFAULT '{}'::text[] NOT NULL,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_test_at timestamp with time zone,
    last_test_ok boolean,
    last_test_message text,
    CONSTRAINT integration_settings_kind_check CHECK ((kind = ANY (ARRAY['payments'::text, 'email'::text, 'sms'::text, 'whatsapp'::text])))
);

--
-- Name: inventory_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    current_stock integer DEFAULT 0 NOT NULL,
    minimum_stock integer DEFAULT 10 NOT NULL,
    unit text DEFAULT 'Units'::text,
    urgency text DEFAULT 'medium'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT inventory_items_urgency_check CHECK ((urgency = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])))
);

ALTER TABLE ONLY public.inventory_items REPLICA IDENTITY FULL;

--
-- Name: inventory_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type text NOT NULL,
    item_name text NOT NULL,
    quantity integer NOT NULL,
    department text,
    supplier text,
    status text DEFAULT 'completed'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    item_id uuid,
    recipient text,
    received_qty integer DEFAULT 0 NOT NULL,
    created_by uuid,
    note text,
    CONSTRAINT inventory_transactions_received_qty_check CHECK ((received_qty >= 0)),
    CONSTRAINT inventory_transactions_status_check CHECK ((status = ANY (ARRAY['completed'::text, 'pending'::text, 'processing'::text, 'cancelled'::text]))),
    CONSTRAINT inventory_transactions_type_check CHECK ((type = ANY (ARRAY['Issue'::text, 'Receipt'::text, 'Order'::text, 'Adjustment'::text])))
);

--
-- Name: learning_content; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.learning_content (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    subject text NOT NULL,
    department text,
    class_name text,
    difficulty text DEFAULT 'Intermediate'::text,
    estimated_duration text DEFAULT '2 hours'::text,
    modules jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_published boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT learning_content_difficulty_check CHECK ((difficulty = ANY (ARRAY['Beginner'::text, 'Intermediate'::text, 'Advanced'::text])))
);

--
-- Name: library_books; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.library_books (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    book_code text NOT NULL,
    title text NOT NULL,
    author text NOT NULL,
    isbn text,
    category text NOT NULL,
    subject text NOT NULL,
    class_level text,
    type text DEFAULT 'Physical'::text NOT NULL,
    status text DEFAULT 'Available'::text NOT NULL,
    total_copies integer DEFAULT 1 NOT NULL,
    available_copies integer DEFAULT 1 NOT NULL,
    published_year integer,
    publisher text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT library_books_status_check CHECK ((status = ANY (ARRAY['Available'::text, 'Issued'::text, 'Reserved'::text, 'Maintenance'::text]))),
    CONSTRAINT library_books_type_check CHECK ((type = ANY (ARRAY['Physical'::text, 'Digital'::text, 'Interactive'::text, 'Audio'::text])))
);

ALTER TABLE ONLY public.library_books REPLICA IDENTITY FULL;

--
-- Name: library_circulation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.library_circulation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    book_id uuid,
    book_title text NOT NULL,
    accession_no text NOT NULL,
    user_id uuid,
    user_name text NOT NULL,
    user_role text DEFAULT 'student'::text NOT NULL,
    issue_date date DEFAULT CURRENT_DATE NOT NULL,
    due_date date DEFAULT (CURRENT_DATE + '14 days'::interval) NOT NULL,
    return_date date,
    overdue_days integer DEFAULT 0 NOT NULL,
    fine_amount numeric(8,2) DEFAULT 0.00 NOT NULL,
    fine_paid boolean DEFAULT false NOT NULL,
    status text DEFAULT 'Issued'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: medical_emergency_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medical_emergency_contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    label text NOT NULL,
    phone text NOT NULL,
    note text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- PostgreSQL database dump complete
--
