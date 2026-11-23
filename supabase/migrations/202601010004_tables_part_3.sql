-- Tables, part 3 of 7
-- Generated from the verified schema. Run as is; do not edit. Safe to run once on an EMPTY database.
SET check_function_bodies = false;
SET search_path = public, extensions;

SET check_function_bodies = false;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: exam_registrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_registrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    exam_id uuid NOT NULL,
    student_id uuid NOT NULL,
    status text DEFAULT 'Registered'::text NOT NULL,
    registered_at timestamp with time zone DEFAULT now() NOT NULL,
    registered_by uuid,
    CONSTRAINT exam_registrations_status_check CHECK ((status = ANY (ARRAY['Registered'::text, 'Withdrawn'::text])))
);

--
-- Name: exam_result_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_result_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    exam_id uuid NOT NULL,
    student_id uuid NOT NULL,
    subject text NOT NULL,
    old_marks numeric,
    new_marks numeric,
    old_grade text,
    new_grade text,
    old_status text,
    new_status text,
    reason text,
    changed_by uuid,
    changed_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: exam_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    exam_id uuid NOT NULL,
    student_id uuid,
    student_name text NOT NULL,
    class_name text NOT NULL,
    subject text NOT NULL,
    marks_obtained numeric NOT NULL,
    max_marks numeric DEFAULT 100 NOT NULL,
    grade text,
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    subject_code text,
    result_status text DEFAULT 'PENDING'::text NOT NULL,
    is_published boolean DEFAULT false NOT NULL,
    published_at timestamp with time zone
);

--
-- Name: exam_revaluation_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_revaluation_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    exam_id uuid NOT NULL,
    student_id uuid NOT NULL,
    student_name text,
    class_name text,
    subject text NOT NULL,
    original_marks numeric NOT NULL,
    max_marks numeric NOT NULL,
    reason text NOT NULL,
    status text DEFAULT 'Requested'::text NOT NULL,
    revised_marks numeric,
    decision_note text,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    decided_by uuid,
    decided_at timestamp with time zone,
    fee_id uuid,
    fee_refund_due boolean DEFAULT false NOT NULL,
    valuer_id uuid,
    valuer_name text,
    valuer_marks numeric,
    valuer_note text,
    valued_at timestamp with time zone,
    CONSTRAINT exam_revaluation_requests_status_check CHECK ((status = ANY (ARRAY['Requested'::text, 'Revised'::text, 'Kept'::text, 'Rejected'::text])))
);

--
-- Name: exam_rooms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_rooms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    block text,
    capacity integer NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT exam_rooms_capacity_check CHECK ((capacity > 0))
);

--
-- Name: exam_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    exam_id uuid NOT NULL,
    subject text NOT NULL,
    class_name text NOT NULL,
    exam_date date NOT NULL,
    start_time text NOT NULL,
    end_time text NOT NULL,
    room text NOT NULL,
    max_marks integer DEFAULT 100 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    subject_code text,
    passing_marks integer DEFAULT 40,
    day_of_week text,
    credits numeric(4,1),
    CONSTRAINT exam_schedules_credits_check CHECK (((credits IS NULL) OR (credits > (0)::numeric)))
);

ALTER TABLE ONLY public.exam_schedules REPLICA IDENTITY FULL;

--
-- Name: exam_seating; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_seating (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    exam_id uuid NOT NULL,
    exam_date date NOT NULL,
    start_time text NOT NULL,
    student_id uuid NOT NULL,
    class_name text,
    subject text,
    student_name text,
    roll_number text,
    room_id uuid NOT NULL,
    seat_no integer NOT NULL,
    photo_url text,
    CONSTRAINT exam_seating_seat_no_check CHECK ((seat_no > 0))
);

--
-- Name: exams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    term text NOT NULL,
    academic_year text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    status text DEFAULT 'Scheduled'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    course text,
    semester text,
    exam_category text DEFAULT 'University Examination'::text,
    is_published boolean DEFAULT false NOT NULL,
    timetable_published boolean DEFAULT false NOT NULL,
    hall_ticket_published boolean DEFAULT false NOT NULL,
    results_published boolean DEFAULT false NOT NULL,
    registration_required boolean DEFAULT false NOT NULL,
    registration_open boolean DEFAULT false NOT NULL,
    registration_deadline date,
    parent_exam_id uuid,
    revaluation_open boolean DEFAULT false NOT NULL,
    revaluation_deadline date,
    revaluation_fee numeric(10,2) DEFAULT 0 NOT NULL,
    CONSTRAINT exams_revaluation_fee_check CHECK ((revaluation_fee >= (0)::numeric)),
    CONSTRAINT exams_status_check CHECK ((status = ANY (ARRAY['Scheduled'::text, 'Ongoing'::text, 'Completed'::text, 'Results Published'::text])))
);

--
-- Name: fee_adjustments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fee_adjustments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_fee_id uuid NOT NULL,
    kind text NOT NULL,
    amount numeric(12,2) NOT NULL,
    reason text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fee_adjustments_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT fee_adjustments_kind_check CHECK ((kind = ANY (ARRAY['waiver'::text, 'concession'::text, 'cancellation'::text]))),
    CONSTRAINT fee_adjustments_reason_check CHECK ((length(TRIM(BOTH FROM reason)) >= 3))
);

--
-- Name: fee_heads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fee_heads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    category text DEFAULT 'other'::text NOT NULL,
    refundable boolean DEFAULT false NOT NULL,
    active boolean DEFAULT true NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fee_heads_code_check CHECK ((code ~ '^[A-Z0-9_]{2,24}$'::text)),
    CONSTRAINT fee_heads_name_check CHECK (((length(TRIM(BOTH FROM name)) >= 2) AND (length(TRIM(BOTH FROM name)) <= 100)))
);

--
-- Name: fee_payment_reminders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fee_payment_reminders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid,
    student_fee_id uuid,
    student_name text NOT NULL,
    roll_number text NOT NULL,
    reminder_type text NOT NULL,
    due_date date NOT NULL,
    amount_due numeric(10,2) NOT NULL,
    channels text DEFAULT 'In_App,SMS,Email'::text NOT NULL,
    delivery_status text DEFAULT 'Sent'::text NOT NULL,
    sent_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: fee_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fee_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_fee_id uuid,
    student_id uuid,
    amount numeric(12,2) NOT NULL,
    payment_mode text NOT NULL,
    transaction_reference text,
    idempotency_key text NOT NULL,
    status text DEFAULT 'Completed'::text NOT NULL,
    collected_by uuid,
    receipt_id uuid,
    remarks text,
    paid_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    student_record_id uuid,
    reversed_at timestamp with time zone,
    reversed_by uuid,
    reversal_reason text,
    refunded_amount numeric(12,2) DEFAULT 0 NOT NULL,
    CONSTRAINT fee_payments_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT fee_payments_payment_mode_check CHECK ((payment_mode = ANY (ARRAY['Cash'::text, 'UPI'::text, 'Card'::text, 'Bank_Transfer'::text, 'Cheque'::text, 'Online_Gateway'::text]))),
    CONSTRAINT fee_payments_refunded_amount_check CHECK ((refunded_amount >= (0)::numeric)),
    CONSTRAINT fee_payments_status_check CHECK ((status = ANY (ARRAY['Pending'::text, 'Completed'::text, 'Failed'::text, 'Reversed'::text])))
);

--
-- Name: fee_plan_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fee_plan_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id uuid NOT NULL,
    fee_head_id uuid NOT NULL,
    amount numeric(12,2) NOT NULL,
    billing_cycle text NOT NULL,
    semesters integer[],
    due_days integer DEFAULT 30 NOT NULL,
    description text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fee_plan_items_amount_check CHECK ((amount >= (0)::numeric)),
    CONSTRAINT fee_plan_items_billing_cycle_check CHECK ((billing_cycle = ANY (ARRAY['one_time'::text, 'per_semester'::text, 'per_year'::text]))),
    CONSTRAINT fee_plan_items_due_days_check CHECK (((due_days >= 0) AND (due_days <= 365))),
    CONSTRAINT fee_plan_items_semesters_only_per_semester CHECK (((semesters IS NULL) OR (billing_cycle = 'per_semester'::text)))
);

--
-- Name: fee_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fee_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    academic_year text NOT NULL,
    department text,
    class_name text,
    quota text,
    description text,
    status text DEFAULT 'Draft'::text NOT NULL,
    created_by uuid,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fee_plans_name_check CHECK (((length(TRIM(BOTH FROM name)) >= 2) AND (length(TRIM(BOTH FROM name)) <= 150))),
    CONSTRAINT fee_plans_status_check CHECK ((status = ANY (ARRAY['Draft'::text, 'Published'::text, 'Archived'::text])))
);

--
-- Name: fee_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fee_receipts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    receipt_number text NOT NULL,
    student_fee_id uuid,
    student_id uuid,
    student_name text NOT NULL,
    roll_number text NOT NULL,
    department text NOT NULL,
    academic_year text DEFAULT '2024-2025'::text NOT NULL,
    semester text DEFAULT 'Semester 4'::text NOT NULL,
    fee_type text DEFAULT 'Annual Tuition & Academic Composite Fee'::text NOT NULL,
    gross_amount numeric(10,2) NOT NULL,
    discount_applied numeric(10,2) DEFAULT 0.00 NOT NULL,
    discount_reason text,
    amount_paid numeric(10,2) NOT NULL,
    balance_remaining numeric(10,2) DEFAULT 0.00 NOT NULL,
    payment_mode text DEFAULT 'Online_UPI'::text NOT NULL,
    transaction_reference text NOT NULL,
    payment_date timestamp with time zone DEFAULT now() NOT NULL,
    cashier_user_id uuid,
    qr_verification_token text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    student_record_id uuid,
    voided_at timestamp with time zone,
    void_reason text
);

--
-- Name: fee_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fee_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    run_type text NOT NULL,
    plan_id uuid,
    fee_head_id uuid,
    amount numeric(12,2),
    description text,
    scope_type text NOT NULL,
    scope_value text,
    quota_filter text,
    semester_filter integer,
    academic_year text NOT NULL,
    due_date date,
    include_yearly boolean DEFAULT false NOT NULL,
    include_one_time boolean DEFAULT false NOT NULL,
    status text DEFAULT 'Completed'::text NOT NULL,
    students_count integer DEFAULT 0 NOT NULL,
    demands_count integer DEFAULT 0 NOT NULL,
    total_amount numeric(14,2) DEFAULT 0 NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    cancelled_at timestamp with time zone,
    cancel_reason text,
    CONSTRAINT fee_runs_run_type_check CHECK ((run_type = ANY (ARRAY['plan'::text, 'adhoc'::text]))),
    CONSTRAINT fee_runs_scope_type_check CHECK ((scope_type = ANY (ARRAY['student'::text, 'class'::text, 'department'::text, 'all'::text]))),
    CONSTRAINT fee_runs_shape CHECK ((((run_type = 'plan'::text) AND (plan_id IS NOT NULL)) OR ((run_type = 'adhoc'::text) AND (fee_head_id IS NOT NULL) AND (amount IS NOT NULL) AND (amount > (0)::numeric)))),
    CONSTRAINT fee_runs_status_check CHECK ((status = ANY (ARRAY['Completed'::text, 'Cancelled'::text])))
);

--
-- Name: fee_structures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fee_structures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    department text NOT NULL,
    academic_year text DEFAULT '2024-2025'::text NOT NULL,
    quota text DEFAULT 'Merit'::text NOT NULL,
    tuition_fee numeric(10,2) DEFAULT 55000.00 NOT NULL,
    lab_fee numeric(10,2) DEFAULT 12000.00 NOT NULL,
    exam_fee numeric(10,2) DEFAULT 3500.00 NOT NULL,
    library_fee numeric(10,2) DEFAULT 2500.00 NOT NULL,
    sports_fee numeric(10,2) DEFAULT 1500.00 NOT NULL,
    development_fund numeric(10,2) DEFAULT 5500.00 NOT NULL,
    hostel_fee_default numeric(10,2) DEFAULT 0.00 NOT NULL,
    transport_fee_default numeric(10,2) DEFAULT 0.00 NOT NULL,
    total_annual_fee numeric(10,2) DEFAULT 80000.00 NOT NULL,
    installments_allowed integer DEFAULT 2 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: feedback_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feedback_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    class_name text NOT NULL,
    subject text NOT NULL,
    teacher_name text NOT NULL,
    message text NOT NULL,
    sender_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.feedback_submissions REPLICA IDENTITY FULL;

--
-- PostgreSQL database dump complete
--
