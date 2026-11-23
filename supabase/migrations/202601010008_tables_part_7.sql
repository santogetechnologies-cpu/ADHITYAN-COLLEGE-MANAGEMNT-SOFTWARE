-- Tables, part 7 of 7
-- Generated from the verified schema. Run as is; do not edit. Safe to run once on an EMPTY database.
SET check_function_bodies = false;
SET search_path = public, extensions;

SET check_function_bodies = false;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: student_lifecycle_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_lifecycle_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_record_id uuid NOT NULL,
    student_user_id uuid,
    event_type text NOT NULL,
    reason_type text,
    reason text NOT NULL,
    effective_date date DEFAULT CURRENT_DATE NOT NULL,
    from_department text,
    from_class text,
    to_department text,
    to_class text,
    dues_at_event numeric(12,2) DEFAULT 0 NOT NULL,
    done_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT student_lifecycle_events_event_type_check CHECK ((event_type = ANY (ARRAY['discontinued'::text, 'reinstated'::text, 'transferred'::text])))
);

--
-- Name: student_mood_checkins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_mood_checkins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    student_id text,
    date date DEFAULT CURRENT_DATE NOT NULL,
    session text NOT NULL,
    mood text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT student_mood_checkins_mood_check CHECK ((mood = ANY (ARRAY['Happy'::text, 'Good'::text, 'Normal'::text, 'Tired'::text, 'Stressed'::text, 'Unwell'::text]))),
    CONSTRAINT student_mood_checkins_session_check CHECK ((session = ANY (ARRAY['morning'::text, 'afternoon'::text, 'evening'::text])))
);

--
-- Name: student_promotions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_promotions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch_id uuid NOT NULL,
    student_id uuid NOT NULL,
    action text NOT NULL,
    from_semester integer,
    to_semester integer,
    from_status text,
    to_status text,
    academic_year text,
    done_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT student_promotions_action_check CHECK ((action = ANY (ARRAY['promote'::text, 'graduate'::text, 'hold'::text, 'undo'::text])))
);

--
-- Name: student_transport_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_transport_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vehicle_id uuid,
    student_id uuid,
    student_name text NOT NULL,
    class_name text,
    stop_name text NOT NULL,
    status text DEFAULT 'waiting'::text NOT NULL,
    checkin_time timestamp with time zone,
    date date DEFAULT CURRENT_DATE NOT NULL,
    CONSTRAINT student_transport_logs_status_check CHECK ((status = ANY (ARRAY['checked_in'::text, 'waiting'::text, 'absent'::text, 'dropped'::text])))
);

--
-- Name: super_admin_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.super_admin_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid NOT NULL,
    admin_email text NOT NULL,
    action text NOT NULL,
    target_entity text NOT NULL,
    target_id text,
    changes jsonb,
    ip_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: super_admin_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.super_admin_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category text DEFAULT 'features'::text NOT NULL,
    key text DEFAULT 'default_key'::text NOT NULL,
    value jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_encrypted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT super_admin_configs_category_check CHECK (((category IS NULL) OR (category = ANY (ARRAY['branding'::text, 'features'::text, 'roles'::text, 'database'::text, 'integrations'::text]))))
);

--
-- Name: super_admin_releases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.super_admin_releases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    version text DEFAULT 'v1.0.0'::text NOT NULL,
    release_date date DEFAULT CURRENT_DATE NOT NULL,
    channel text DEFAULT 'stable'::text NOT NULL,
    is_deployed boolean DEFAULT false NOT NULL,
    deployed_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT super_admin_releases_channel_check CHECK ((channel = ANY (ARRAY['stable'::text, 'beta'::text, 'lts'::text])))
);

--
-- Name: teacher_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teacher_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sender_id uuid,
    sender_name text NOT NULL,
    sender_email text,
    teacher_id uuid,
    teacher_name text NOT NULL,
    subject text NOT NULL,
    message text NOT NULL,
    attachments text[] DEFAULT '{}'::text[],
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.teacher_messages REPLICA IDENTITY FULL;

--
-- Name: timetables; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.timetables (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    class_name text NOT NULL,
    day_of_week text NOT NULL,
    start_time text NOT NULL,
    end_time text NOT NULL,
    subject text NOT NULL,
    teacher_name text NOT NULL,
    teacher_id uuid,
    room text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    course_name text,
    year_semester text DEFAULT '1st Year'::text,
    room_lab text,
    session_type text DEFAULT 'theory'::text,
    CONSTRAINT timetables_day_of_week_check CHECK ((day_of_week = ANY (ARRAY['Monday'::text, 'Tuesday'::text, 'Wednesday'::text, 'Thursday'::text, 'Friday'::text, 'Saturday'::text])))
);

ALTER TABLE ONLY public.timetables REPLICA IDENTITY FULL;

--
-- Name: transport_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transport_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    vehicle_id uuid NOT NULL,
    stop_name text NOT NULL,
    status text DEFAULT 'Active'::text NOT NULL,
    start_date date DEFAULT CURRENT_DATE NOT NULL,
    end_date date,
    assigned_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT transport_assignments_status_check CHECK ((status = ANY (ARRAY['Active'::text, 'Ended'::text])))
);

--
-- Name: transport_stops; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transport_stops (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vehicle_id uuid NOT NULL,
    stop_name text NOT NULL,
    scheduled_time text NOT NULL,
    stop_order integer DEFAULT 1 NOT NULL,
    status text DEFAULT 'Upcoming'::text,
    students_count integer DEFAULT 0,
    CONSTRAINT transport_stops_status_check CHECK ((status = ANY (ARRAY['Completed'::text, 'Current'::text, 'Upcoming'::text, 'Skipped'::text])))
);

ALTER TABLE ONLY public.transport_stops REPLICA IDENTITY FULL;

--
-- Name: transport_vehicles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transport_vehicles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vehicle_number text NOT NULL,
    vehicle_type text DEFAULT 'Bus'::text NOT NULL,
    route_name text NOT NULL,
    driver_name text NOT NULL,
    driver_phone text,
    driver_id uuid,
    capacity integer DEFAULT 40 NOT NULL,
    occupied_seats integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    current_location text DEFAULT 'Depot'::text,
    eta_to_next_stop text DEFAULT 'On Time'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT transport_vehicles_status_check CHECK ((status = ANY (ARRAY['active'::text, 'maintenance'::text, 'idle'::text, 'delayed'::text])))
);

ALTER TABLE ONLY public.transport_vehicles REPLICA IDENTITY FULL;

--
-- Name: vehicle_maintenance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicle_maintenance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vehicle_id uuid NOT NULL,
    item text NOT NULL,
    last_change text,
    next_due text,
    status text DEFAULT 'good'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT vehicle_maintenance_status_check CHECK ((status = ANY (ARRAY['good'::text, 'warning'::text, 'overdue'::text])))
);

--
-- Name: wellness_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wellness_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    severity text DEFAULT 'Info'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wellness_alerts_severity_check CHECK ((severity = ANY (ARRAY['Info'::text, 'Caution'::text, 'Urgent'::text])))
);

--
-- Name: wellness_checkins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wellness_checkins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    checkin_type text NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    options text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    mood text,
    energy_level integer,
    readiness_score integer,
    learning_goal text,
    reflection text,
    completed_tasks text[] DEFAULT '{}'::text[],
    difficulties text,
    day_rating integer,
    improvements text,
    notes text,
    details jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT wellness_checkins_checkin_type_check CHECK ((checkin_type = ANY (ARRAY['morning'::text, 'afternoon'::text, 'evening'::text])))
);

ALTER TABLE ONLY public.wellness_checkins REPLICA IDENTITY FULL;

--
-- PostgreSQL database dump complete
--
