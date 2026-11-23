-- Tables, part 1 of 7
-- Generated from the verified schema. Run as is; do not edit. Safe to run once on an EMPTY database.
SET check_function_bodies = false;
SET search_path = public, extensions;

SET check_function_bodies = false;

--
-- Name: certificate_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.certificate_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: fee_receipt_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fee_receipt_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: payslip_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payslip_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: student_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.student_id_seq
    START WITH 1001
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: certificates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.certificates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    certificate_type text NOT NULL,
    student_id uuid,
    student_name text NOT NULL,
    roll_number text,
    class_name text,
    purpose text,
    issue_date date DEFAULT CURRENT_DATE NOT NULL,
    status text DEFAULT 'Pending'::text NOT NULL,
    certificate_number text,
    qr_code_hash text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    details text,
    decided_by uuid,
    decided_at timestamp with time zone,
    decision_note text,
    department text,
    CONSTRAINT certificates_status_check CHECK ((status = ANY (ARRAY['Pending'::text, 'Approved'::text, 'Issued'::text, 'Rejected'::text])))
);

ALTER TABLE ONLY public.certificates REPLICA IDENTITY FULL;

--
-- Name: students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.students (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    student_id text NOT NULL,
    roll_number text,
    name text NOT NULL,
    email text,
    department text,
    class_name text,
    current_semester integer DEFAULT 1 NOT NULL,
    admission_date date DEFAULT CURRENT_DATE NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    phone text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    admission_quota text,
    admission_type text,
    entry_academic_year text,
    CONSTRAINT students_current_semester_check CHECK ((current_semester > 0)),
    CONSTRAINT students_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'suspended'::text, 'graduated'::text, 'alumni'::text, 'withdrawn'::text])))
);

--
-- Name: notification_outbox; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_outbox (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    notification_id uuid,
    user_id uuid,
    channel text NOT NULL,
    to_address text NOT NULL,
    subject text,
    body text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    last_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    claimed_at timestamp with time zone,
    sent_at timestamp with time zone,
    CONSTRAINT notification_outbox_channel_check CHECK ((channel = ANY (ARRAY['email'::text, 'sms'::text, 'whatsapp'::text]))),
    CONSTRAINT notification_outbox_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sending'::text, 'sent'::text, 'failed'::text])))
);

--
-- Name: admission_applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admission_applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_number text NOT NULL,
    applicant_name text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    class_name text NOT NULL,
    parent_name text NOT NULL,
    parent_phone text NOT NULL,
    status text DEFAULT 'Submitted'::text NOT NULL,
    submission_date date DEFAULT CURRENT_DATE NOT NULL,
    remarks text,
    documents jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    date_of_birth date,
    gender text,
    blood_group text,
    address text,
    previous_school text,
    parent_email text,
    relationship text,
    occupation text,
    annual_income text,
    academic_year text,
    admission_batch text,
    qualifying_board text,
    passing_year text,
    qualifying_marks numeric(6,2),
    science_score numeric(6,2),
    merit_category text,
    eligibility_verified boolean DEFAULT false NOT NULL,
    extra jsonb DEFAULT '{}'::jsonb NOT NULL,
    student_record_id uuid,
    enrolled_at timestamp with time zone,
    enrolled_by uuid,
    status_updated_at timestamp with time zone,
    status_updated_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    quota text,
    admission_type text,
    CONSTRAINT admission_applications_status_check CHECK ((status = ANY (ARRAY['Submitted'::text, 'Under Review'::text, 'Approved'::text, 'Waitlisted'::text, 'Offered'::text, 'Enrolled'::text, 'Rejected'::text, 'Cancelled'::text])))
);

ALTER TABLE ONLY public.admission_applications REPLICA IDENTITY FULL;

--
-- Name: admission_document_verifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admission_document_verifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid,
    student_name text NOT NULL,
    document_type text NOT NULL,
    document_url text,
    status text DEFAULT 'Pending'::text NOT NULL,
    verified_by uuid,
    verified_at timestamp with time zone,
    rejection_reason text,
    submission_date date DEFAULT CURRENT_DATE,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: admission_entrance_tests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admission_entrance_tests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid,
    applicant_name text NOT NULL,
    roll_no text NOT NULL,
    test_date date NOT NULL,
    score numeric,
    percentile numeric,
    status text DEFAULT 'Scheduled'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    max_score numeric(7,2) DEFAULT 100 NOT NULL,
    recorded_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT admission_entrance_tests_score_range CHECK (((max_score > (0)::numeric) AND ((score IS NULL) OR ((score >= (0)::numeric) AND (score <= max_score))))),
    CONSTRAINT admission_entrance_tests_status_check CHECK ((status = ANY (ARRAY['Scheduled'::text, 'Completed'::text, 'Absent'::text])))
);

--
-- Name: admission_fees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admission_fees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid,
    applicant_name text NOT NULL,
    class_name text NOT NULL,
    amount numeric(10,2) NOT NULL,
    payment_status text DEFAULT 'Pending'::text NOT NULL,
    payment_method text,
    transaction_id text,
    paid_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    idempotency_key text,
    receipt_id uuid,
    collected_by uuid,
    CONSTRAINT admission_fees_payment_status_check CHECK ((payment_status = ANY (ARRAY['Pending'::text, 'Paid'::text, 'Failed'::text])))
);

--
-- Name: admission_form_fields; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admission_form_fields (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    field_key text NOT NULL,
    label text NOT NULL,
    field_type text NOT NULL,
    required boolean DEFAULT false NOT NULL,
    options text[],
    help_text text,
    section text DEFAULT 'other'::text NOT NULL,
    course_name text,
    sort_order integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT admission_form_fields_field_key_check CHECK ((field_key ~ '^[a-z][a-z0-9_]{1,40}$'::text)),
    CONSTRAINT admission_form_fields_field_type_check CHECK ((field_type = ANY (ARRAY['text'::text, 'textarea'::text, 'number'::text, 'date'::text, 'select'::text, 'checkbox'::text]))),
    CONSTRAINT admission_form_fields_label_check CHECK ((length(TRIM(BOTH FROM label)) >= 2)),
    CONSTRAINT admission_form_fields_section_check CHECK ((section = ANY (ARRAY['student'::text, 'parent'::text, 'academic'::text, 'other'::text]))),
    CONSTRAINT admission_form_fields_select_has_options CHECK (((field_type <> 'select'::text) OR ((options IS NOT NULL) AND (cardinality(options) >= 1))))
);

--
-- Name: admission_merit_lists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admission_merit_lists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid,
    student_name text NOT NULL,
    course_name text NOT NULL,
    merit_score numeric(5,2) DEFAULT 0.0 NOT NULL,
    rank integer DEFAULT 1 NOT NULL,
    category text DEFAULT 'General'::text,
    status text DEFAULT 'Selected'::text NOT NULL,
    academic_year text DEFAULT '2025-2026'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    quota text
);

--
-- Name: admission_quotas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admission_quotas (
    code text NOT NULL,
    name text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT admission_quotas_code_check CHECK ((code ~ '^[A-Z0-9_]{2,30}$'::text)),
    CONSTRAINT admission_quotas_name_check CHECK ((length(TRIM(BOTH FROM name)) >= 2))
);

--
-- Name: admission_required_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admission_required_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_name text,
    doc_type text NOT NULL,
    required boolean DEFAULT true NOT NULL,
    active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT admission_required_documents_doc_type_check CHECK ((length(TRIM(BOTH FROM doc_type)) >= 2))
);

--
-- Name: admission_routes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admission_routes (
    code text NOT NULL,
    name text NOT NULL,
    description text,
    requires_entrance boolean DEFAULT false NOT NULL,
    requires_merit boolean DEFAULT false NOT NULL,
    active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT admission_routes_code_check CHECK ((code ~ '^[A-Z0-9_]{2,30}$'::text)),
    CONSTRAINT admission_routes_name_check CHECK ((length(TRIM(BOTH FROM name)) >= 2))
);

--
-- Name: admission_seats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admission_seats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_name text NOT NULL,
    academic_year text NOT NULL,
    quota_code text NOT NULL,
    seats integer NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT admission_seats_seats_check CHECK ((seats >= 0))
);

--
-- Name: ai_chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_chat_messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'ai'::text, 'system'::text])))
);

--
-- Name: alumni_donations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alumni_donations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    alumni_id uuid,
    donor_name text NOT NULL,
    amount numeric(12,2) NOT NULL,
    cause text NOT NULL,
    transaction_id text,
    donated_at timestamp with time zone DEFAULT now() NOT NULL,
    payment_mode text,
    status text DEFAULT 'Received'::text NOT NULL,
    recorded_by uuid,
    CONSTRAINT alumni_donations_amount_pos CHECK ((amount > (0)::numeric)),
    CONSTRAINT alumni_donations_status_chk CHECK ((status = ANY (ARRAY['Pledged'::text, 'Processing'::text, 'Received'::text, 'Cancelled'::text])))
);

--
-- Name: alumni_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alumni_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    event_date timestamp with time zone NOT NULL,
    location text NOT NULL,
    attendees_count integer DEFAULT 0,
    status text DEFAULT 'Upcoming'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT alumni_events_status_check CHECK ((status = ANY (ARRAY['Upcoming'::text, 'Ongoing'::text, 'Completed'::text, 'Planning'::text])))
);

ALTER TABLE ONLY public.alumni_events REPLICA IDENTITY FULL;

--
-- Name: alumni_mentorships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alumni_mentorships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mentor_id uuid NOT NULL,
    mentee_name text NOT NULL,
    mentee_student_id uuid,
    domain text NOT NULL,
    start_date date DEFAULT CURRENT_DATE NOT NULL,
    duration_months integer,
    status text DEFAULT 'Active'::text NOT NULL,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT alumni_mentorships_duration_months_check CHECK (((duration_months IS NULL) OR (duration_months > 0))),
    CONSTRAINT alumni_mentorships_status_check CHECK ((status = ANY (ARRAY['Active'::text, 'Completed'::text, 'Cancelled'::text])))
);

--
-- Name: alumni_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alumni_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text NOT NULL,
    phone text,
    roll_number text,
    course text,
    department text NOT NULL,
    graduation_year text NOT NULL,
    current_position text,
    company text,
    location text,
    linkedin_url text,
    bio text,
    status text DEFAULT 'Active'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT alumni_profiles_status_check CHECK ((status = ANY (ARRAY['Active'::text, 'Mentor'::text, 'Inactive'::text])))
);

--
-- PostgreSQL database dump complete
--
