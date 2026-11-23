-- Tables, part 2 of 7
-- Generated from the verified schema. Run as is; do not edit. Safe to run once on an EMPTY database.
SET check_function_bodies = false;
SET search_path = public, extensions;

SET check_function_bodies = false;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: app_setting_drafts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_setting_drafts (
    key text NOT NULL,
    value jsonb NOT NULL,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT app_setting_drafts_value_check CHECK ((pg_column_size(value) < 2000000))
);

--
-- Name: app_setting_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_setting_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    version integer NOT NULL,
    value jsonb NOT NULL,
    summary text,
    kind text DEFAULT 'publish'::text NOT NULL,
    rolled_back_to integer,
    published_by uuid,
    published_by_email text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT app_setting_versions_kind_check CHECK ((kind = ANY (ARRAY['publish'::text, 'rollback'::text])))
);

--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_settings (
    key text NOT NULL,
    value jsonb NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT app_settings_key_check CHECK ((key ~ '^[a-z][a-z0-9_]{1,60}$'::text)),
    CONSTRAINT app_settings_value_check CHECK ((pg_column_size(value) < 2000000))
);

--
-- Name: assignment_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assignment_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assignment_id uuid NOT NULL,
    student_id uuid,
    student_name text NOT NULL,
    subject text NOT NULL,
    score numeric,
    status text DEFAULT 'submitted'::text NOT NULL,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    feedback text,
    attachment_url text,
    submission_text text,
    CONSTRAINT assignment_submissions_status_check CHECK ((status = ANY (ARRAY['submitted'::text, 'graded'::text, 'pending'::text, 'late'::text])))
);

--
-- Name: assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    subject text NOT NULL,
    description text,
    type text DEFAULT 'assignment'::text NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    due_date timestamp with time zone NOT NULL,
    classes text[] DEFAULT '{}'::text[] NOT NULL,
    teacher_id uuid,
    teacher_name text,
    attachments text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT assignments_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]))),
    CONSTRAINT assignments_type_check CHECK ((type = ANY (ARRAY['assignment'::text, 'homework'::text, 'project'::text])))
);

ALTER TABLE ONLY public.assignments REPLICA IDENTITY FULL;

--
-- Name: attendance_shortage_warnings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance_shortage_warnings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid,
    student_name text NOT NULL,
    roll_number text NOT NULL,
    department text NOT NULL,
    class_name text NOT NULL,
    subject_code text NOT NULL,
    subject_title text NOT NULL,
    total_conducted integer NOT NULL,
    total_attended integer NOT NULL,
    percentage numeric(5,2) NOT NULL,
    warning_level text NOT NULL,
    issued_date date DEFAULT CURRENT_DATE,
    parent_notified boolean DEFAULT true NOT NULL,
    parent_acknowledged boolean DEFAULT false NOT NULL,
    is_detained boolean DEFAULT false NOT NULL,
    condonation_applied boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    user_email text NOT NULL,
    user_role text,
    action text NOT NULL,
    entity_type text,
    entity_id text,
    old_values jsonb,
    new_values jsonb,
    ip_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: auth_rate_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_rate_limits (
    key text NOT NULL,
    window_start timestamp with time zone DEFAULT now() NOT NULL,
    hits integer DEFAULT 0 NOT NULL
);

--
-- Name: book_issues; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.book_issues (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    book_id uuid NOT NULL,
    book_title text NOT NULL,
    book_code text NOT NULL,
    user_id uuid,
    student_name text NOT NULL,
    student_id text NOT NULL,
    roll_no text,
    class_name text,
    issue_date date DEFAULT CURRENT_DATE NOT NULL,
    due_date date NOT NULL,
    return_date date,
    status text DEFAULT 'Issued'::text NOT NULL,
    days_overdue integer DEFAULT 0,
    renew_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    fine_amount numeric(10,2) DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT book_issues_status_check CHECK ((status = ANY (ARRAY['Issued'::text, 'Overdue'::text, 'Returned'::text])))
);

ALTER TABLE ONLY public.book_issues REPLICA IDENTITY FULL;

--
-- Name: calendar_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendar_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    date date NOT NULL,
    "time" text,
    location text,
    category text DEFAULT 'academic'::text NOT NULL,
    target_audience text DEFAULT 'all'::text NOT NULL,
    department text,
    class_name text,
    priority text DEFAULT 'medium'::text NOT NULL,
    created_by text,
    status text DEFAULT 'upcoming'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT calendar_events_category_check CHECK ((category = ANY (ARRAY['academic'::text, 'cultural'::text, 'sports'::text, 'exam'::text, 'meeting'::text, 'holiday'::text]))),
    CONSTRAINT calendar_events_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]))),
    CONSTRAINT calendar_events_status_check CHECK ((status = ANY (ARRAY['upcoming'::text, 'ongoing'::text, 'completed'::text, 'cancelled'::text]))),
    CONSTRAINT calendar_events_target_audience_check CHECK ((target_audience = ANY (ARRAY['all'::text, 'students'::text, 'teachers'::text, 'parents'::text, 'staff'::text])))
);

ALTER TABLE ONLY public.calendar_events REPLICA IDENTITY FULL;

--
-- Name: class_attendance_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.class_attendance_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    teacher_id uuid,
    teacher_name text NOT NULL,
    class_name text NOT NULL,
    department text NOT NULL,
    subject_code text NOT NULL,
    subject_title text NOT NULL,
    session_date date DEFAULT CURRENT_DATE NOT NULL,
    period_number integer DEFAULT 1 NOT NULL,
    total_enrolled integer DEFAULT 0 NOT NULL,
    total_present integer DEFAULT 0 NOT NULL,
    total_absent integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'Completed'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    batch text DEFAULT 'All'::text NOT NULL
);

--
-- Name: concerns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.concerns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    user_name text,
    concern_type text NOT NULL,
    priority text NOT NULL,
    subject text NOT NULL,
    description text NOT NULL,
    is_anonymous boolean DEFAULT false NOT NULL,
    status text DEFAULT 'Pending'::text NOT NULL,
    resolution_notes text,
    attachments text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    student_id uuid,
    CONSTRAINT concerns_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT concerns_status_check CHECK ((status = ANY (ARRAY['Pending'::text, 'In Progress'::text, 'Resolved'::text, 'Dismissed'::text])))
);

ALTER TABLE ONLY public.concerns REPLICA IDENTITY FULL;

--
-- Name: courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.courses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    duration_years integer DEFAULT 3 NOT NULL,
    type text DEFAULT 'Degree'::text NOT NULL,
    department text NOT NULL,
    tuition_fee numeric(10,2) DEFAULT 45000.00 NOT NULL,
    description text,
    eligibility text DEFAULT '10+2 / Higher Secondary with Science / Relevant Stream'::text,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: daily_teaching_updates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_teaching_updates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    teacher_id uuid,
    teacher_name text,
    subject text NOT NULL,
    class_name text NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    topics_covered text[] DEFAULT '{}'::text[],
    important_topics text[] DEFAULT '{}'::text[],
    pyq text[] DEFAULT '{}'::text[],
    next_class_prep text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.daily_teaching_updates REPLICA IDENTITY FULL;

--
-- Name: departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    duration integer DEFAULT 4 NOT NULL,
    code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.departments REPLICA IDENTITY FULL;

--
-- Name: digital_library_resources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.digital_library_resources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    authors text[] DEFAULT '{}'::text[],
    journal text,
    resource_type text DEFAULT 'Research Paper'::text,
    published_date date,
    doi text,
    abstract text,
    file_url text,
    download_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: disciplinary_incidents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.disciplinary_incidents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid,
    student_name text NOT NULL,
    roll_no text,
    class_name text NOT NULL,
    incident text NOT NULL,
    severity text DEFAULT 'Minor'::text NOT NULL,
    reported_by text NOT NULL,
    incident_date date DEFAULT CURRENT_DATE NOT NULL,
    status text DEFAULT 'Pending Review'::text NOT NULL,
    action_taken text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    reported_by_user uuid DEFAULT auth.uid(),
    decided_by uuid,
    decided_at timestamp with time zone,
    CONSTRAINT disciplinary_incidents_severity_check CHECK ((severity = ANY (ARRAY['Minor'::text, 'Major'::text, 'Critical'::text]))),
    CONSTRAINT disciplinary_incidents_status_check CHECK ((status = ANY (ARRAY['Pending Review'::text, 'Under Investigation'::text, 'Resolved'::text])))
);

ALTER TABLE ONLY public.disciplinary_incidents REPLICA IDENTITY FULL;

--
-- Name: exam_invigilators; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_invigilators (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    exam_id uuid NOT NULL,
    exam_date date NOT NULL,
    start_time text NOT NULL,
    room_id uuid NOT NULL,
    teacher_id uuid NOT NULL,
    teacher_name text
);

--
-- PostgreSQL database dump complete
--
