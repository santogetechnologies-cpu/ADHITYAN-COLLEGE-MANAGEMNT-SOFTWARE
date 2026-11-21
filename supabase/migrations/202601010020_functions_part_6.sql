-- Functions and RPCs, part 6 of 6
-- Generated from the verified schema. Run as is; do not edit. Safe to run once on an EMPTY database.
SET check_function_bodies = false;
SET search_path = public, extensions;

SET check_function_bodies = false;

--
-- Name: set_exam_result_student_name(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_exam_result_student_name() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_real_name TEXT;
BEGIN
    IF NEW.student_id IS NULL THEN
        RAISE EXCEPTION 'Integrity Violation: student_id cannot be null for exam result.' 
            USING ERRCODE = '23502';
    END IF;

    SELECT name INTO v_real_name 
    FROM public.profiles 
    WHERE id = NEW.student_id AND role = 'student' AND status = 'active';

    IF v_real_name IS NULL THEN
        RAISE EXCEPTION 'Integrity Violation: Referenced student profile (%) does not exist or is not an active enrolled student.', NEW.student_id 
            USING ERRCODE = '23503';
    END IF;

    NEW.student_name := v_real_name;
    RETURN NEW;
END;
$$;

--
-- Name: set_super_admin_configs_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_super_admin_configs_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

--
-- Name: shortage_ack_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.shortage_ack_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF public.get_current_user_role() = 'parent' THEN
    NEW := OLD; NEW.parent_acknowledged := TRUE;
  END IF;
  RETURN NEW;
END $$;

--
-- Name: staff_leave_decide(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.staff_leave_decide(p_id uuid, p_decision text, p_reason text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); a public.staff_leave_applications;
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('hod','principal','hr_manager','admin') THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only an HOD, the principal, HR or admin can decide leave.'); END IF;
  IF p_decision NOT IN ('Approve','Reject') THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Decision must be Approve or Reject.'); END IF;
  SELECT * INTO a FROM public.staff_leave_applications WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Application not found.'); END IF;
  IF a.user_id = v_uid THEN RETURN jsonb_build_object('success', false, 'code', 'SELF_APPROVAL', 'error', 'You cannot decide your own leave.'); END IF;
  IF a.status IN ('Approved','Rejected','Cancelled') THEN
    RETURN jsonb_build_object('success', false, 'code', 'ALREADY_DECIDED', 'error', 'This application is already ' || lower(a.status) || '.'); END IF;
  IF p_decision = 'Reject' THEN
    IF length(trim(COALESCE(p_reason,''))) < 3 THEN RETURN jsonb_build_object('success', false, 'code', 'REASON_REQUIRED', 'error', 'Give a reason for rejecting.'); END IF;
    UPDATE public.staff_leave_applications SET status = 'Rejected', rejection_reason = trim(p_reason), approved_by = v_uid, updated_at = now() WHERE id = p_id;
    RETURN jsonb_build_object('success', true, 'status', 'Rejected');
  END IF;
  BEGIN
    UPDATE public.staff_leave_applications SET status = 'Approved', approved_by = v_uid, rejection_reason = NULL, updated_at = now() WHERE id = p_id;
  EXCEPTION WHEN check_violation THEN
    RETURN jsonb_build_object('success', false, 'code', 'BALANCE_EXCEEDED', 'error', SQLERRM);
  END;
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values)
  VALUES (v_uid, v_role, 'staff_leave_approved', 'staff_leave_applications', p_id::text, jsonb_build_object('type', a.leave_type, 'days', a.total_days));
  RETURN jsonb_build_object('success', true, 'status', 'Approved');
END $$;

--
-- Name: store_order_set_status(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.store_order_set_status(p_order uuid, p_status text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); o public.store_orders; v_staff BOOLEAN; l RECORD;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Sign in first.'); END IF;
  v_staff := v_role IN ('admin','store_manager','storekeeper');
  SELECT * INTO o FROM public.store_orders WHERE id = p_order FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Order not found.'); END IF;
  IF NOT v_staff AND NOT (o.user_id = v_uid AND p_status = 'Cancelled' AND o.status = 'Pending') THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'You can only cancel your own pending order.'); END IF;
  IF NOT ((o.status = 'Pending' AND p_status IN ('Processing','Delivered','Cancelled'))
       OR (o.status = 'Processing' AND p_status IN ('Delivered','Cancelled'))) THEN
    RETURN jsonb_build_object('success', false, 'code', 'BAD_STATE', 'error', format('An order that is %s cannot become %s.', o.status, p_status)); END IF;
  IF p_status = 'Cancelled' THEN   -- put the stock back
    FOR l IN SELECT (x->>'product_id')::uuid AS pid, (x->>'quantity')::int AS qty FROM jsonb_array_elements(o.items) x WHERE x ? 'product_id' LOOP
      UPDATE public.store_products SET stock = stock + l.qty, updated_at = now() WHERE id = l.pid;
    END LOOP;
  END IF;
  UPDATE public.store_orders SET status = p_status, updated_at = now() WHERE id = p_order;
  RETURN jsonb_build_object('success', true, 'status', p_status);
END $$;

--
-- Name: student_discontinue(uuid, text, text, date, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.student_discontinue(p_student uuid, p_type text, p_reason text, p_effective date DEFAULT CURRENT_DATE, p_force boolean DEFAULT false) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); s public.students; v_dues NUMERIC; v_alt UUID;
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('admin','principal') THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only admin or principal can discontinue a student.'); END IF;
  IF p_type NOT IN ('Withdrawn','Dropout','Transfer Certificate','Expelled','Other') THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Choose why the student is leaving.'); END IF;
  IF length(trim(COALESCE(p_reason,''))) < 3 THEN RETURN jsonb_build_object('success', false, 'code', 'REASON_REQUIRED', 'error', 'Write a short reason.'); END IF;
  SELECT * INTO s FROM public.students WHERE id = p_student FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Student not found.'); END IF;
  IF s.status NOT IN ('active','suspended','inactive') THEN
    RETURN jsonb_build_object('success', false, 'code', 'BAD_STATE', 'error', 'This student is already ' || s.status || '.'); END IF;
  v_dues := public._student_dues(s.user_id);
  IF v_dues > 0 AND NOT COALESCE(p_force, false) THEN
    RETURN jsonb_build_object('success', false, 'code', 'DUES_PENDING', 'dues', v_dues, 'error', 'This student owes ₹' || v_dues || '. Clear the dues, or confirm to proceed with the dues left on record.'); END IF;
  IF s.user_id IS NOT NULL THEN
    -- the profile trigger mirrors profile status onto the student row, so set the profile first and the student row last
    UPDATE public.profiles SET status = 'inactive', updated_at = now() WHERE id = s.user_id;
    SELECT id INTO v_alt FROM public.hostel_allotments WHERE student_id = s.user_id AND status = 'Active';
    IF v_alt IS NOT NULL THEN PERFORM public.hostel_vacate(v_alt); END IF;
    UPDATE public.transport_assignments SET status = 'Ended', end_date = CURRENT_DATE WHERE student_id = s.user_id AND status = 'Active';
  END IF;
  UPDATE public.students SET status = 'withdrawn', updated_at = now() WHERE id = s.id;
  INSERT INTO public.student_lifecycle_events(student_record_id, student_user_id, event_type, reason_type, reason, effective_date, from_department, from_class, dues_at_event, done_by)
  VALUES (s.id, s.user_id, 'discontinued', p_type, trim(p_reason), COALESCE(p_effective, CURRENT_DATE), s.department, s.class_name, v_dues, v_uid);
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values)
  VALUES (v_uid, v_role, 'student_discontinued', 'students', s.id::text, jsonb_build_object('type', p_type, 'reason', trim(p_reason), 'dues_left', v_dues));
  RETURN jsonb_build_object('success', true, 'dues_left', v_dues, 'released_hostel', v_alt IS NOT NULL);
END $$;

--
-- Name: student_fees_fill_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.student_fees_fill_code() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
    IF NEW.student_code IS NULL THEN
        IF NEW.student_record_id IS NOT NULL THEN
            SELECT student_id INTO NEW.student_code FROM public.students WHERE id = NEW.student_record_id;
        END IF;
        IF NEW.student_code IS NULL AND NEW.student_id IS NOT NULL THEN
            SELECT COALESCE(student_id, roll_number) INTO NEW.student_code FROM public.profiles WHERE id = NEW.student_id;
        END IF;
    END IF;
    RETURN NEW;
END; $$;

--
-- Name: student_gpa(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.student_gpa(p_student uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); v_staff BOOLEAN; v_out JSONB;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Sign in first.'); END IF;
  v_staff := v_role IN ('admin','principal','coe','hod','teacher','placement_officer');
  IF NOT v_staff AND NOT (p_student = v_uid OR public.is_parent_of(p_student)) THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Not allowed.'); END IF;
  WITH latest AS (
    SELECT DISTINCT ON (r.subject) r.exam_id, e.name AS exam_name, r.subject,
           COALESCE((SELECT sc.credits FROM public.exam_schedules sc WHERE sc.exam_id = r.exam_id AND sc.subject = r.subject AND sc.credits IS NOT NULL LIMIT 1), 1) AS credits,
           public.grade_point_for(CASE WHEN r.max_marks > 0 THEN r.marks_obtained / r.max_marks * 100 ELSE 0 END, r.result_status = 'Pass') AS gp,
           (r.result_status = 'Pass') AS passed
      FROM public.exam_results r JOIN public.exams e ON e.id = r.exam_id
     WHERE r.student_id = p_student AND COALESCE(r.result_status,'') <> 'Absent' AND (r.is_published OR v_staff)
     ORDER BY r.subject, e.end_date DESC NULLS LAST, r.created_at DESC
  ), terms AS (
    SELECT exam_id, exam_name, sum(credits) AS cr, round(sum(gp * credits) / NULLIF(sum(credits), 0), 2) AS sgpa FROM latest GROUP BY exam_id, exam_name
  )
  SELECT jsonb_build_object('success', true,
           'cgpa', (SELECT round(sum(gp * credits) / NULLIF(sum(credits), 0), 2) FROM latest),
           'credits', COALESCE((SELECT sum(credits) FROM latest), 0),
           'arrears', (SELECT count(*) FROM latest WHERE NOT passed),
           'terms', COALESCE((SELECT jsonb_agg(jsonb_build_object('exam_id', exam_id, 'exam', exam_name, 'credits', cr, 'sgpa', sgpa) ORDER BY exam_name) FROM terms), '[]'::jsonb),
           'scale_max', (SELECT max_points FROM public.grade_scales WHERE is_default))
    INTO v_out;
  RETURN v_out;
END $$;

--
-- Name: student_leave_apply(text, date, date, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.student_leave_apply(p_type text, p_from date, p_to date, p_reason text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_id UUID;
BEGIN
  IF auth.uid() IS NULL OR public.get_current_user_role() <> 'student' THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only students can apply for leave here.'); END IF;
  IF p_from IS NULL OR p_to IS NULL OR p_to < p_from THEN RETURN jsonb_build_object('success', false, 'code', 'INVALID_DATES', 'error', 'The last day cannot be before the first day.'); END IF;
  IF p_to - p_from > 60 THEN RETURN jsonb_build_object('success', false, 'code', 'TOO_LONG', 'error', 'Leave longer than 60 days needs the office. Please visit them.'); END IF;
  IF p_from < CURRENT_DATE - 7 THEN RETURN jsonb_build_object('success', false, 'code', 'TOO_OLD', 'error', 'You can only apply for leave starting within the last 7 days or later.'); END IF;
  IF length(trim(COALESCE(p_reason,''))) < 5 THEN RETURN jsonb_build_object('success', false, 'code', 'REASON_REQUIRED', 'error', 'Please say why (at least a few words).'); END IF;
  IF p_type NOT IN ('Medical','Personal','Family','Event','Other') THEN p_type := 'Other'; END IF;
  IF EXISTS (SELECT 1 FROM public.student_leave_requests WHERE student_id = auth.uid() AND status IN ('Pending','Approved') AND from_date <= p_to AND to_date >= p_from) THEN
    RETURN jsonb_build_object('success', false, 'code', 'OVERLAP', 'error', 'You already have leave covering some of these dates.'); END IF;
  INSERT INTO public.student_leave_requests(student_id, leave_type, from_date, to_date, reason) VALUES (auth.uid(), p_type, p_from, p_to, trim(p_reason)) RETURNING id INTO v_id;
  RETURN jsonb_build_object('success', true, 'id', v_id);
END $$;

--
-- Name: student_leave_cancel(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.student_leave_cancel(p_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  UPDATE public.student_leave_requests SET status = 'Cancelled', decided_at = now() WHERE id = p_id AND student_id = auth.uid() AND status IN ('Pending','Approved') AND to_date >= CURRENT_DATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'That request cannot be cancelled.'); END IF;
  RETURN jsonb_build_object('success', true);
END $$;

--
-- Name: student_leave_decide(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.student_leave_decide(p_id uuid, p_decision text, p_note text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); r public.student_leave_requests; v_class TEXT;
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('admin','principal','hod','teacher') THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only a teacher, HOD, principal or admin can decide leave.'); END IF;
  IF p_decision NOT IN ('Approve','Reject') THEN RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Decision must be Approve or Reject.'); END IF;
  SELECT * INTO r FROM public.student_leave_requests WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Request not found.'); END IF;
  IF v_role = 'teacher' THEN
    SELECT class_name INTO v_class FROM public.profiles WHERE id = r.student_id;
    IF NOT public.is_teacher_assigned_to_class(v_uid, v_class) THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_YOUR_CLASS', 'error', 'This student is not in a class you teach.'); END IF;
  END IF;
  IF r.status <> 'Pending' THEN RETURN jsonb_build_object('success', false, 'code', 'ALREADY_DECIDED', 'error', 'This request is already ' || lower(r.status) || '.'); END IF;
  IF p_decision = 'Reject' AND length(trim(COALESCE(p_note,''))) < 3 THEN RETURN jsonb_build_object('success', false, 'code', 'REASON_REQUIRED', 'error', 'Give a reason for rejecting.'); END IF;
  UPDATE public.student_leave_requests SET status = CASE WHEN p_decision = 'Approve' THEN 'Approved' ELSE 'Rejected' END, decided_by = v_uid, decision_note = NULLIF(trim(COALESCE(p_note,'')),''), decided_at = now() WHERE id = p_id;
  PERFORM public.notify_users(ARRAY[r.student_id], 'Leave ' || CASE WHEN p_decision = 'Approve' THEN 'approved' ELSE 'not approved' END,
     'Your leave from ' || r.from_date || ' to ' || r.to_date || CASE WHEN p_decision = 'Approve' THEN ' was approved.' ELSE ' was not approved' || COALESCE(': ' || NULLIF(trim(COALESCE(p_note,'')),''), '.') END,
     CASE WHEN p_decision = 'Approve' THEN 'success' ELSE 'warning' END, 'medium');
  RETURN jsonb_build_object('success', true, 'status', CASE WHEN p_decision = 'Approve' THEN 'Approved' ELSE 'Rejected' END);
END $$;

--
-- Name: student_lifecycle_history(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.student_lifecycle_history(p_student uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF auth.uid() IS NULL OR public.get_current_user_role() NOT IN ('admin','principal','hod','coe') THEN RETURN jsonb_build_object('items', '[]'::jsonb); END IF;
  RETURN jsonb_build_object('items', COALESCE((SELECT jsonb_agg(x ORDER BY (x->>'at') DESC) FROM (
    SELECT jsonb_build_object('id', e.id, 'student_id', e.student_record_id, 'name', s.name, 'code', s.student_id, 'event', e.event_type, 'type', e.reason_type, 'reason', e.reason,
      'effective', e.effective_date, 'from_class', e.from_class, 'to_class', e.to_class, 'from_department', e.from_department, 'to_department', e.to_department, 'dues', e.dues_at_event, 'at', e.created_at) AS x
    FROM public.student_lifecycle_events e JOIN public.students s ON s.id = e.student_record_id
    WHERE p_student IS NULL OR e.student_record_id = p_student ORDER BY e.created_at DESC LIMIT 100) q), '[]'::jsonb));
END $$;

--
-- Name: student_reinstate(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.student_reinstate(p_student uuid, p_reason text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); s public.students;
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('admin','principal') THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only admin or principal can reinstate a student.'); END IF;
  IF length(trim(COALESCE(p_reason,''))) < 3 THEN RETURN jsonb_build_object('success', false, 'code', 'REASON_REQUIRED', 'error', 'Write a short reason.'); END IF;
  SELECT * INTO s FROM public.students WHERE id = p_student FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Student not found.'); END IF;
  IF s.status NOT IN ('withdrawn','inactive') THEN RETURN jsonb_build_object('success', false, 'code', 'BAD_STATE', 'error', 'Only discontinued students can be reinstated.'); END IF;
  UPDATE public.students SET status = 'active', updated_at = now() WHERE id = s.id;
  IF s.user_id IS NOT NULL THEN UPDATE public.profiles SET status = 'active', updated_at = now() WHERE id = s.user_id; END IF;
  INSERT INTO public.student_lifecycle_events(student_record_id, student_user_id, event_type, reason, from_department, from_class, done_by)
  VALUES (s.id, s.user_id, 'reinstated', trim(p_reason), s.department, s.class_name, v_uid);
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values)
  VALUES (v_uid, v_role, 'student_reinstated', 'students', s.id::text, jsonb_build_object('reason', trim(p_reason)));
  RETURN jsonb_build_object('success', true);
END $$;

--
-- Name: student_transfer(uuid, text, text, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.student_transfer(p_student uuid, p_department text, p_class text, p_reason text, p_semester integer DEFAULT NULL::integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); s public.students; v_dept TEXT; v_cls TEXT;
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('admin','principal') THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only admin or principal can transfer a student.'); END IF;
  IF length(trim(COALESCE(p_reason,''))) < 3 THEN RETURN jsonb_build_object('success', false, 'code', 'REASON_REQUIRED', 'error', 'Write a short reason.'); END IF;
  SELECT * INTO s FROM public.students WHERE id = p_student FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Student not found.'); END IF;
  IF s.status <> 'active' THEN RETURN jsonb_build_object('success', false, 'code', 'BAD_STATE', 'error', 'Only active students can be transferred.'); END IF;
  v_dept := COALESCE(NULLIF(trim(COALESCE(p_department,'')),''), s.department);
  v_cls := COALESCE(NULLIF(trim(COALESCE(p_class,'')),''), s.class_name);
  IF v_dept IS NOT DISTINCT FROM s.department AND v_cls IS NOT DISTINCT FROM s.class_name AND (p_semester IS NULL OR p_semester = s.current_semester) THEN
    RETURN jsonb_build_object('success', false, 'code', 'NO_CHANGE', 'error', 'The student is already in that department, class and semester.'); END IF;
  IF p_semester IS NOT NULL AND p_semester < 1 THEN RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Semester must be at least 1.'); END IF;
  UPDATE public.students SET department = v_dept, class_name = v_cls, current_semester = COALESCE(p_semester, current_semester), updated_at = now() WHERE id = s.id;
  IF s.user_id IS NOT NULL THEN UPDATE public.profiles SET department = v_dept, class_name = v_cls, updated_at = now() WHERE id = s.user_id; END IF;
  INSERT INTO public.student_lifecycle_events(student_record_id, student_user_id, event_type, reason, from_department, from_class, to_department, to_class, done_by)
  VALUES (s.id, s.user_id, 'transferred', trim(p_reason), s.department, s.class_name, v_dept, v_cls, v_uid);
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values)
  VALUES (v_uid, v_role, 'student_transferred', 'students', s.id::text, jsonb_build_object('from', jsonb_build_object('department', s.department, 'class', s.class_name), 'to', jsonb_build_object('department', v_dept, 'class', v_cls)));
  IF s.user_id IS NOT NULL THEN
    PERFORM public.notify_users(ARRAY[s.user_id], 'You have been moved', 'Your class is now ' || COALESCE(v_cls,'—') || COALESCE(' (' || v_dept || ')', '') || '.', 'info', 'medium');
  END IF;
  RETURN jsonb_build_object('success', true, 'department', v_dept, 'class_name', v_cls);
END $$;

--
-- Name: students_promote(uuid[], text, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.students_promote(p_student_ids uuid[], p_action text, p_max_semester integer DEFAULT 8, p_academic_year text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); v_batch UUID := gen_random_uuid(); s public.students;
        v_moved INT := 0; v_skipped INT := 0; v_id UUID;
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('admin','principal') THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only admin or principal can promote students.'); END IF;
  IF p_action NOT IN ('promote','graduate') THEN RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Action must be promote or graduate.'); END IF;
  IF p_student_ids IS NULL OR array_length(p_student_ids, 1) IS NULL THEN RETURN jsonb_build_object('success', false, 'code', 'NO_STUDENTS', 'error', 'Select at least one student.'); END IF;
  IF COALESCE(p_max_semester,0) < 1 THEN RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Maximum semester must be at least 1.'); END IF;
  FOREACH v_id IN ARRAY p_student_ids LOOP
    SELECT * INTO s FROM public.students WHERE id = v_id AND status = 'active' FOR UPDATE;
    IF NOT FOUND THEN v_skipped := v_skipped + 1; CONTINUE; END IF;
    IF p_action = 'graduate' OR s.current_semester >= p_max_semester THEN
      IF p_action = 'promote' THEN v_skipped := v_skipped + 1; CONTINUE; END IF;  -- already in the final semester: graduate explicitly
      UPDATE public.students SET status = 'graduated', updated_at = now() WHERE id = s.id;
      INSERT INTO public.student_promotions(batch_id, student_id, action, from_semester, to_semester, from_status, to_status, academic_year, done_by)
      VALUES (v_batch, s.id, 'graduate', s.current_semester, s.current_semester, s.status, 'graduated', p_academic_year, v_uid);
    ELSE
      UPDATE public.students SET current_semester = current_semester + 1, updated_at = now() WHERE id = s.id;
      INSERT INTO public.student_promotions(batch_id, student_id, action, from_semester, to_semester, from_status, to_status, academic_year, done_by)
      VALUES (v_batch, s.id, 'promote', s.current_semester, s.current_semester + 1, s.status, s.status, p_academic_year, v_uid);
    END IF;
    v_moved := v_moved + 1;
  END LOOP;
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values)
  VALUES (v_uid, v_role, 'students_' || p_action, 'students', v_batch::text, jsonb_build_object('moved', v_moved, 'skipped', v_skipped, 'academic_year', p_academic_year));
  RETURN jsonb_build_object('success', true, 'batch_id', v_batch, 'moved', v_moved, 'skipped', v_skipped);
END $$;

--
-- Name: students_promotion_undo(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.students_promotion_undo(p_batch uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); r public.student_promotions; v_n INT := 0; v_new UUID := gen_random_uuid();
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('admin','principal') THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only admin or principal can undo a promotion.'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.student_promotions WHERE batch_id = p_batch) THEN
    RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Batch not found.'); END IF;
  IF EXISTS (SELECT 1 FROM public.student_promotions WHERE action = 'undo' AND to_status = p_batch::text) THEN
    RETURN jsonb_build_object('success', false, 'code', 'ALREADY_UNDONE', 'error', 'This batch was already undone.'); END IF;
  FOR r IN SELECT * FROM public.student_promotions WHERE batch_id = p_batch AND action IN ('promote','graduate') LOOP
    UPDATE public.students SET current_semester = r.from_semester, status = COALESCE(r.from_status, status), updated_at = now()
    WHERE id = r.student_id AND current_semester = r.to_semester AND status = r.to_status;
    IF FOUND THEN v_n := v_n + 1; END IF;
  END LOOP;
  INSERT INTO public.student_promotions(batch_id, student_id, action, from_status, to_status, done_by)
  SELECT v_new, student_id, 'undo', NULL, p_batch::text, v_uid FROM public.student_promotions WHERE batch_id = p_batch AND action IN ('promote','graduate');
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values)
  VALUES (v_uid, v_role, 'students_promotion_undone', 'students', p_batch::text, jsonb_build_object('restored', v_n));
  RETURN jsonb_build_object('success', true, 'restored', v_n);
END $$;

--
-- Name: sync_mood_student_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_mood_student_id() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
    IF NEW.student_id IS NULL OR NEW.student_id = '' THEN
        SELECT COALESCE(p.student_id, p.roll_number) INTO NEW.student_id
        FROM public.profiles p WHERE p.id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$;

--
-- Name: sync_staff_leave_balance_transition(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_staff_leave_balance_transition() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_old_year TEXT;
    v_new_year TEXT;
    v_old_type TEXT;
    v_new_type TEXT;
    v_rows_updated INT;
    v_old_exists INT;
    v_bal RECORD;
    v_old_bal RECORD;
    v_new_bal RECORD;
BEGIN
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        v_old_year := public.get_academic_year_for_date(OLD.start_date);
        v_old_type := LOWER(TRIM(OLD.leave_type));
    END IF;

    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        v_new_year := public.get_academic_year_for_date(NEW.start_date);
        v_new_type := LOWER(TRIM(NEW.leave_type));
    END IF;

    -- CASE A: DELETION of Approved Application -> Reverse Old Balance
    IF TG_OP = 'DELETE' THEN
        IF OLD.status = 'Approved' THEN
            IF v_old_year IS NULL THEN
                RAISE EXCEPTION 'Ledger Error: Cannot resolve academic year for leave start_date %.', OLD.start_date 
                    USING ERRCODE = '23502';
            END IF;

            -- Check existence of old balance row and lock it
            SELECT * INTO v_bal 
            FROM public.staff_leave_balances 
            WHERE user_id = OLD.user_id AND academic_year = v_old_year
            FOR UPDATE;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'Ledger Error: Historical balance row for user % in year % not found to reverse leave.', OLD.user_id, v_old_year
                    USING ERRCODE = '23514';
            END IF;

            -- Validate balance fields are non-null
            IF v_bal.casual_leave_taken IS NULL OR v_bal.medical_leave_taken IS NULL 
               OR v_bal.earned_leave_taken IS NULL OR v_bal.on_duty_taken IS NULL THEN
                RAISE EXCEPTION 'Ledger Corruption: Balance record contains null taken counts for user % in year %.', OLD.user_id, v_old_year 
                    USING ERRCODE = '23502';
            END IF;

            IF v_old_type LIKE '%casual%' THEN
                IF (v_bal.casual_leave_taken - OLD.total_days) < 0 THEN
                    RAISE EXCEPTION 'Ledger Error: Reversal of % days would cause negative casual leave taken count for employee % (Current: %).', 
                        OLD.total_days, OLD.user_id, v_bal.casual_leave_taken USING ERRCODE = '23514';
                END IF;
                UPDATE public.staff_leave_balances 
                SET casual_leave_taken = casual_leave_taken - OLD.total_days, updated_at = NOW()
                WHERE user_id = OLD.user_id AND academic_year = v_old_year;
            ELSIF v_old_type LIKE '%med%' OR v_old_type LIKE '%sick%' THEN
                IF (v_bal.medical_leave_taken - OLD.total_days) < 0 THEN
                    RAISE EXCEPTION 'Ledger Error: Reversal of % days would cause negative medical leave taken count for employee % (Current: %).', 
                        OLD.total_days, OLD.user_id, v_bal.medical_leave_taken USING ERRCODE = '23514';
                END IF;
                UPDATE public.staff_leave_balances 
                SET medical_leave_taken = medical_leave_taken - OLD.total_days, updated_at = NOW()
                WHERE user_id = OLD.user_id AND academic_year = v_old_year;
            ELSIF v_old_type LIKE '%earn%' THEN
                IF (v_bal.earned_leave_taken - OLD.total_days) < 0 THEN
                    RAISE EXCEPTION 'Ledger Error: Reversal of % days would cause negative earned leave taken count for employee % (Current: %).', 
                        OLD.total_days, OLD.user_id, v_bal.earned_leave_taken USING ERRCODE = '23514';
                END IF;
                UPDATE public.staff_leave_balances 
                SET earned_leave_taken = earned_leave_taken - OLD.total_days, updated_at = NOW()
                WHERE user_id = OLD.user_id AND academic_year = v_old_year;
            ELSIF v_old_type LIKE '%duty%' OR v_old_type LIKE '%on_duty%' THEN
                IF (v_bal.on_duty_taken - OLD.total_days) < 0 THEN
                    RAISE EXCEPTION 'Ledger Error: Reversal of % days would cause negative on-duty count for employee % (Current: %).', 
                        OLD.total_days, OLD.user_id, v_bal.on_duty_taken USING ERRCODE = '23514';
                END IF;
                UPDATE public.staff_leave_balances 
                SET on_duty_taken = on_duty_taken - OLD.total_days, updated_at = NOW()
                WHERE user_id = OLD.user_id AND academic_year = v_old_year;
            ELSIF v_old_type LIKE '%loss%' OR v_old_type LIKE '%lop%' THEN
                -- Loss of Pay does not affect paid leave quotas
                NULL;
            ELSE
                RAISE EXCEPTION 'Ledger Error: Unsupported leave type % cannot be processed for reversal.', OLD.leave_type
                    USING ERRCODE = '22023';
            END IF;

            IF v_old_type NOT LIKE '%loss%' AND v_old_type NOT LIKE '%lop%' THEN
                GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
                IF v_rows_updated = 0 THEN
                    RAISE EXCEPTION 'Ledger Error: Historical balance row for user % in year % not found to reverse leave.', OLD.user_id, v_old_year
                        USING ERRCODE = '23514';
                END IF;
            END IF;
        END IF;
        RETURN OLD;
    END IF;

    -- CASE B: INSERTION of Approved Application -> Apply New Balance
    IF TG_OP = 'INSERT' THEN
        IF NEW.status = 'Approved' THEN
            IF v_new_year IS NULL THEN
                RAISE EXCEPTION 'Ledger Error: Cannot resolve academic year for leave start_date %.', NEW.start_date 
                    USING ERRCODE = '23502';
            END IF;

            -- Ensure balance row exists using database schema column defaults (12, 10, 15)
            INSERT INTO public.staff_leave_balances (user_id, academic_year)
            VALUES (NEW.user_id, v_new_year)
            ON CONFLICT (user_id, academic_year) DO NOTHING;

            SELECT * INTO v_bal 
            FROM public.staff_leave_balances 
            WHERE user_id = NEW.user_id AND academic_year = v_new_year 
            FOR UPDATE;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'Ledger Integrity Failure: Balance row missing for user % in academic year %.', NEW.user_id, v_new_year 
                    USING ERRCODE = '23514';
            END IF;

            -- Validate balance fields are non-null
            IF v_bal.casual_leave_quota IS NULL OR v_bal.casual_leave_taken IS NULL 
               OR v_bal.medical_leave_quota IS NULL OR v_bal.medical_leave_taken IS NULL 
               OR v_bal.earned_leave_quota IS NULL OR v_bal.earned_leave_taken IS NULL 
               OR v_bal.on_duty_taken IS NULL THEN
                RAISE EXCEPTION 'Ledger Corruption: Balance record contains null quota or taken counts for user % in year %.', NEW.user_id, v_new_year 
                    USING ERRCODE = '23502';
            END IF;

            IF v_new_type LIKE '%casual%' THEN
                IF (v_bal.casual_leave_taken + NEW.total_days) > v_bal.casual_leave_quota THEN
                    RAISE EXCEPTION 'Leave Entitlement Exceeded: Employee % has insufficient casual leave balance (Quota: %, Already Taken: %, Requested: %).', 
                        NEW.user_id, v_bal.casual_leave_quota, v_bal.casual_leave_taken, NEW.total_days USING ERRCODE = '23514';
                END IF;
                UPDATE public.staff_leave_balances 
                SET casual_leave_taken = casual_leave_taken + NEW.total_days, updated_at = NOW()
                WHERE user_id = NEW.user_id AND academic_year = v_new_year;
            ELSIF v_new_type LIKE '%med%' OR v_new_type LIKE '%sick%' THEN
                IF (v_bal.medical_leave_taken + NEW.total_days) > v_bal.medical_leave_quota THEN
                    RAISE EXCEPTION 'Leave Entitlement Exceeded: Employee % has insufficient medical leave balance (Quota: %, Already Taken: %, Requested: %).', 
                        NEW.user_id, v_bal.medical_leave_quota, v_bal.medical_leave_taken, NEW.total_days USING ERRCODE = '23514';
                END IF;
                UPDATE public.staff_leave_balances 
                SET medical_leave_taken = medical_leave_taken + NEW.total_days, updated_at = NOW()
                WHERE user_id = NEW.user_id AND academic_year = v_new_year;
            ELSIF v_new_type LIKE '%earn%' THEN
                IF (v_bal.earned_leave_taken + NEW.total_days) > v_bal.earned_leave_quota THEN
                    RAISE EXCEPTION 'Leave Entitlement Exceeded: Employee % has insufficient earned leave balance (Quota: %, Already Taken: %, Requested: %).', 
                        NEW.user_id, v_bal.earned_leave_quota, v_bal.earned_leave_taken, NEW.total_days USING ERRCODE = '23514';
                END IF;
                UPDATE public.staff_leave_balances 
                SET earned_leave_taken = earned_leave_taken + NEW.total_days, updated_at = NOW()
                WHERE user_id = NEW.user_id AND academic_year = v_new_year;
            ELSIF v_new_type LIKE '%duty%' OR v_new_type LIKE '%on_duty%' THEN
                UPDATE public.staff_leave_balances 
                SET on_duty_taken = on_duty_taken + NEW.total_days, updated_at = NOW()
                WHERE user_id = NEW.user_id AND academic_year = v_new_year;
            ELSIF v_new_type LIKE '%loss%' OR v_new_type LIKE '%lop%' THEN
                -- Loss of Pay recorded without quota deduction
                NULL;
            ELSE
                RAISE EXCEPTION 'Ledger Error: Unsupported leave type % cannot be processed for deduction.', NEW.leave_type
                    USING ERRCODE = '22023';
            END IF;

            IF v_new_type NOT LIKE '%loss%' AND v_new_type NOT LIKE '%lop%' THEN
                GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
                IF v_rows_updated = 0 THEN
                    RAISE EXCEPTION 'Ledger Integrity Failure: Failed to apply balance deduction for user % in academic year %.', NEW.user_id, v_new_year 
                        USING ERRCODE = '23514';
                END IF;
            END IF;
        END IF;
        RETURN NEW;
    END IF;

    -- CASE C: UPDATE of Leave Application (Two-Phase Reverse & Apply)
    IF TG_OP = 'UPDATE' THEN
        IF OLD.status <> 'Approved' AND NEW.status <> 'Approved' THEN
            RETURN NEW;
        END IF;

        IF NEW.status = 'Approved' AND v_new_year IS NULL THEN
            RAISE EXCEPTION 'Ledger Error: Cannot resolve academic year for new leave start_date %.', NEW.start_date 
                USING ERRCODE = '23502';
        END IF;

        IF OLD.status = 'Approved' AND v_old_year IS NULL THEN
            RAISE EXCEPTION 'Ledger Error: Cannot resolve academic year for historical leave start_date %.', OLD.start_date 
                USING ERRCODE = '23502';
        END IF;

        -- Subcase C1: In-Place Same Employee, Same Academic Year, Same Leave Type
        IF OLD.status = 'Approved' AND NEW.status = 'Approved' 
           AND OLD.user_id = NEW.user_id 
           AND v_old_year = v_new_year 
           AND v_old_type = v_new_type THEN
            
            IF OLD.total_days <> NEW.total_days THEN
                SELECT * INTO v_bal 
                FROM public.staff_leave_balances 
                WHERE user_id = NEW.user_id AND academic_year = v_new_year 
                FOR UPDATE;

                IF NOT FOUND THEN
                    RAISE EXCEPTION 'Ledger Integrity Failure: Balance row missing for user % in academic year %.', NEW.user_id, v_new_year 
                        USING ERRCODE = '23514';
                END IF;

                IF v_new_type LIKE '%casual%' THEN
                    IF (v_bal.casual_leave_taken + (NEW.total_days - OLD.total_days)) > v_bal.casual_leave_quota THEN
                        RAISE EXCEPTION 'Leave Entitlement Exceeded: Modification exceeds casual leave quota for user % (Quota: %, Available: %).',
                            NEW.user_id, v_bal.casual_leave_quota, (v_bal.casual_leave_quota - v_bal.casual_leave_taken + OLD.total_days) USING ERRCODE = '23514';
                    END IF;
                    IF (v_bal.casual_leave_taken + (NEW.total_days - OLD.total_days)) < 0 THEN
                        RAISE EXCEPTION 'Ledger Error: Modification causes negative casual leave taken count.' USING ERRCODE = '23514';
                    END IF;
                    UPDATE public.staff_leave_balances 
                    SET casual_leave_taken = casual_leave_taken + (NEW.total_days - OLD.total_days), updated_at = NOW()
                    WHERE user_id = NEW.user_id AND academic_year = v_new_year;
                ELSIF v_new_type LIKE '%med%' OR v_new_type LIKE '%sick%' THEN
                    IF (v_bal.medical_leave_taken + (NEW.total_days - OLD.total_days)) > v_bal.medical_leave_quota THEN
                        RAISE EXCEPTION 'Leave Entitlement Exceeded: Modification exceeds medical leave quota for user % (Quota: %, Available: %).',
                            NEW.user_id, v_bal.medical_leave_quota, (v_bal.medical_leave_quota - v_bal.medical_leave_taken + OLD.total_days) USING ERRCODE = '23514';
                    END IF;
                    IF (v_bal.medical_leave_taken + (NEW.total_days - OLD.total_days)) < 0 THEN
                        RAISE EXCEPTION 'Ledger Error: Modification causes negative medical leave taken count.' USING ERRCODE = '23514';
                    END IF;
                    UPDATE public.staff_leave_balances 
                    SET medical_leave_taken = medical_leave_taken + (NEW.total_days - OLD.total_days), updated_at = NOW()
                    WHERE user_id = NEW.user_id AND academic_year = v_new_year;
                ELSIF v_new_type LIKE '%earn%' THEN
                    IF (v_bal.earned_leave_taken + (NEW.total_days - OLD.total_days)) > v_bal.earned_leave_quota THEN
                        RAISE EXCEPTION 'Leave Entitlement Exceeded: Modification exceeds earned leave quota for user % (Quota: %, Available: %).',
                            NEW.user_id, v_bal.earned_leave_quota, (v_bal.earned_leave_quota - v_bal.earned_leave_taken + OLD.total_days) USING ERRCODE = '23514';
                    END IF;
                    IF (v_bal.earned_leave_taken + (NEW.total_days - OLD.total_days)) < 0 THEN
                        RAISE EXCEPTION 'Ledger Error: Modification causes negative earned leave taken count.' USING ERRCODE = '23514';
                    END IF;
                    UPDATE public.staff_leave_balances 
                    SET earned_leave_taken = earned_leave_taken + (NEW.total_days - OLD.total_days), updated_at = NOW()
                    WHERE user_id = NEW.user_id AND academic_year = v_new_year;
                ELSIF v_new_type LIKE '%duty%' OR v_new_type LIKE '%on_duty%' THEN
                    IF (v_bal.on_duty_taken + (NEW.total_days - OLD.total_days)) < 0 THEN
                        RAISE EXCEPTION 'Ledger Error: Modification causes negative on-duty count.' USING ERRCODE = '23514';
                    END IF;
                    UPDATE public.staff_leave_balances 
                    SET on_duty_taken = on_duty_taken + (NEW.total_days - OLD.total_days), updated_at = NOW()
                    WHERE user_id = NEW.user_id AND academic_year = v_new_year;
                ELSIF v_new_type LIKE '%loss%' OR v_new_type LIKE '%lop%' THEN
                    NULL;
                ELSE
                    RAISE EXCEPTION 'Ledger Error: Unsupported leave type %.', NEW.leave_type 
                        USING ERRCODE = '22023';
                END IF;

                IF v_new_type NOT LIKE '%loss%' AND v_new_type NOT LIKE '%lop%' THEN
                    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
                    IF v_rows_updated = 0 THEN
                        RAISE EXCEPTION 'Ledger Integrity Failure: In-place balance update failed for user %.', NEW.user_id 
                            USING ERRCODE = '23514';
                    END IF;
                END IF;
            END IF;
            RETURN NEW;
        END IF;

        -- Subcase C2: Transition involving state change, employee reassignment, or leave reclassification (DEF-117)
        -- 1. Ensure NEW balance record exists if NEW is Approved using schema defaults
        IF NEW.status = 'Approved' THEN
            INSERT INTO public.staff_leave_balances (user_id, academic_year)
            VALUES (NEW.user_id, v_new_year)
            ON CONFLICT (user_id, academic_year) DO NOTHING;
        END IF;

        -- 2. Verify OLD balance record exists if reversal is required
        IF OLD.status = 'Approved' THEN
            SELECT COUNT(*) INTO v_old_exists 
            FROM public.staff_leave_balances 
            WHERE user_id = OLD.user_id AND academic_year = v_old_year;

            IF v_old_exists = 0 THEN
                RAISE EXCEPTION 'Ledger Integrity Failure: Cannot reverse leave. Historical balance row for user % in academic year % does not exist.', OLD.user_id, v_old_year
                    USING ERRCODE = '23514';
            END IF;
        END IF;

        -- 3. Lock affected rows in deterministic lexicographical order to prevent deadlocks
        IF OLD.status = 'Approved' AND NEW.status = 'Approved' 
           AND (OLD.user_id <> NEW.user_id OR v_old_year <> v_new_year) THEN
            IF (OLD.user_id::text, v_old_year) < (NEW.user_id::text, v_new_year) THEN
                SELECT * INTO v_old_bal FROM public.staff_leave_balances WHERE user_id = OLD.user_id AND academic_year = v_old_year FOR UPDATE;
                SELECT * INTO v_new_bal FROM public.staff_leave_balances WHERE user_id = NEW.user_id AND academic_year = v_new_year FOR UPDATE;
            ELSE
                SELECT * INTO v_new_bal FROM public.staff_leave_balances WHERE user_id = NEW.user_id AND academic_year = v_new_year FOR UPDATE;
                SELECT * INTO v_old_bal FROM public.staff_leave_balances WHERE user_id = OLD.user_id AND academic_year = v_old_year FOR UPDATE;
            END IF;
        ELSE
            IF OLD.status = 'Approved' THEN
                SELECT * INTO v_old_bal FROM public.staff_leave_balances WHERE user_id = OLD.user_id AND academic_year = v_old_year FOR UPDATE;
            END IF;
            IF NEW.status = 'Approved' AND (OLD.status <> 'Approved' OR OLD.user_id <> NEW.user_id OR v_old_year <> v_new_year) THEN
                SELECT * INTO v_new_bal FROM public.staff_leave_balances WHERE user_id = NEW.user_id AND academic_year = v_new_year FOR UPDATE;
            END IF;
        END IF;

        -- 4. Phase 1: Reverse Old Balance if it was previously Approved
        IF OLD.status = 'Approved' THEN
            IF v_old_bal.casual_leave_taken IS NULL OR v_old_bal.medical_leave_taken IS NULL 
               OR v_old_bal.earned_leave_taken IS NULL OR v_old_bal.on_duty_taken IS NULL THEN
                RAISE EXCEPTION 'Ledger Corruption: Old balance row contains null taken counts for user % year %.', OLD.user_id, v_old_year 
                    USING ERRCODE = '23502';
            END IF;

            IF v_old_type LIKE '%casual%' THEN
                IF (v_old_bal.casual_leave_taken - OLD.total_days) < 0 THEN
                    RAISE EXCEPTION 'Ledger Error: Reversal would result in negative casual leave taken count for employee % (Current: %, Reversal: %).', 
                        OLD.user_id, v_old_bal.casual_leave_taken, OLD.total_days USING ERRCODE = '23514';
                END IF;
                UPDATE public.staff_leave_balances 
                SET casual_leave_taken = casual_leave_taken - OLD.total_days, updated_at = NOW()
                WHERE user_id = OLD.user_id AND academic_year = v_old_year;
            ELSIF v_old_type LIKE '%med%' OR v_old_type LIKE '%sick%' THEN
                IF (v_old_bal.medical_leave_taken - OLD.total_days) < 0 THEN
                    RAISE EXCEPTION 'Ledger Error: Reversal would result in negative medical leave taken count for employee % (Current: %, Reversal: %).', 
                        OLD.user_id, v_old_bal.medical_leave_taken, OLD.total_days USING ERRCODE = '23514';
                END IF;
                UPDATE public.staff_leave_balances 
                SET medical_leave_taken = medical_leave_taken - OLD.total_days, updated_at = NOW()
                WHERE user_id = OLD.user_id AND academic_year = v_old_year;
            ELSIF v_old_type LIKE '%earn%' THEN
                IF (v_old_bal.earned_leave_taken - OLD.total_days) < 0 THEN
                    RAISE EXCEPTION 'Ledger Error: Reversal would result in negative earned leave taken count for employee % (Current: %, Reversal: %).', 
                        OLD.user_id, v_old_bal.earned_leave_taken, OLD.total_days USING ERRCODE = '23514';
                END IF;
                UPDATE public.staff_leave_balances 
                SET earned_leave_taken = earned_leave_taken - OLD.total_days, updated_at = NOW()
                WHERE user_id = OLD.user_id AND academic_year = v_old_year;
            ELSIF v_old_type LIKE '%duty%' OR v_old_type LIKE '%on_duty%' THEN
                IF (v_old_bal.on_duty_taken - OLD.total_days) < 0 THEN
                    RAISE EXCEPTION 'Ledger Error: Reversal would result in negative on-duty count for employee % (Current: %, Reversal: %).', 
                        OLD.user_id, v_old_bal.on_duty_taken, OLD.total_days USING ERRCODE = '23514';
                END IF;
                UPDATE public.staff_leave_balances 
                SET on_duty_taken = on_duty_taken - OLD.total_days, updated_at = NOW()
                WHERE user_id = OLD.user_id AND academic_year = v_old_year;
            ELSIF v_old_type LIKE '%loss%' OR v_old_type LIKE '%lop%' THEN
                NULL;
            ELSE
                RAISE EXCEPTION 'Ledger Error: Unsupported old leave type %.', OLD.leave_type 
                    USING ERRCODE = '22023';
            END IF;

            IF v_old_type NOT LIKE '%loss%' AND v_old_type NOT LIKE '%lop%' THEN
                GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
                IF v_rows_updated = 0 THEN
                    RAISE EXCEPTION 'Ledger Error: Failed to reverse old balance for user % in academic year %.', OLD.user_id, v_old_year 
                        USING ERRCODE = '23514';
                END IF;
            END IF;
        END IF;

        -- 5. Phase 2: Apply New Balance if it is now Approved
        IF NEW.status = 'Approved' THEN
            IF v_new_bal.casual_leave_quota IS NULL OR v_new_bal.casual_leave_taken IS NULL 
               OR v_new_bal.medical_leave_quota IS NULL OR v_new_bal.medical_leave_taken IS NULL 
               OR v_new_bal.earned_leave_quota IS NULL OR v_new_bal.earned_leave_taken IS NULL 
               OR v_new_bal.on_duty_taken IS NULL THEN
                RAISE EXCEPTION 'Ledger Corruption: Target balance row contains null quota or taken counts for user % year %.', NEW.user_id, v_new_year 
                    USING ERRCODE = '23502';
            END IF;

            IF v_new_type LIKE '%casual%' THEN
                IF (v_new_bal.casual_leave_taken + NEW.total_days) > v_new_bal.casual_leave_quota THEN
                    RAISE EXCEPTION 'Leave Entitlement Exceeded: Employee % has insufficient casual leave balance (Quota: %, Already Taken: %, Requested: %).',
                        NEW.user_id, v_new_bal.casual_leave_quota, v_new_bal.casual_leave_taken, NEW.total_days USING ERRCODE = '23514';
                END IF;
                UPDATE public.staff_leave_balances 
                SET casual_leave_taken = casual_leave_taken + NEW.total_days, updated_at = NOW()
                WHERE user_id = NEW.user_id AND academic_year = v_new_year;
            ELSIF v_new_type LIKE '%med%' OR v_new_type LIKE '%sick%' THEN
                IF (v_new_bal.medical_leave_taken + NEW.total_days) > v_new_bal.medical_leave_quota THEN
                    RAISE EXCEPTION 'Leave Entitlement Exceeded: Employee % has insufficient medical leave balance (Quota: %, Already Taken: %, Requested: %).',
                        NEW.user_id, v_new_bal.medical_leave_quota, v_new_bal.medical_leave_taken, NEW.total_days USING ERRCODE = '23514';
                END IF;
                UPDATE public.staff_leave_balances 
                SET medical_leave_taken = medical_leave_taken + NEW.total_days, updated_at = NOW()
                WHERE user_id = NEW.user_id AND academic_year = v_new_year;
            ELSIF v_new_type LIKE '%earn%' THEN
                IF (v_new_bal.earned_leave_taken + NEW.total_days) > v_new_bal.earned_leave_quota THEN
                    RAISE EXCEPTION 'Leave Entitlement Exceeded: Employee % has insufficient earned leave balance (Quota: %, Already Taken: %, Requested: %).',
                        NEW.user_id, v_new_bal.earned_leave_quota, v_new_bal.earned_leave_taken, NEW.total_days USING ERRCODE = '23514';
                END IF;
                UPDATE public.staff_leave_balances 
                SET earned_leave_taken = earned_leave_taken + NEW.total_days, updated_at = NOW()
                WHERE user_id = NEW.user_id AND academic_year = v_new_year;
            ELSIF v_new_type LIKE '%duty%' OR v_new_type LIKE '%on_duty%' THEN
                UPDATE public.staff_leave_balances 
                SET on_duty_taken = on_duty_taken + NEW.total_days, updated_at = NOW()
                WHERE user_id = NEW.user_id AND academic_year = v_new_year;
            ELSIF v_new_type LIKE '%loss%' OR v_new_type LIKE '%lop%' THEN
                NULL;
            ELSE
                RAISE EXCEPTION 'Ledger Error: Unsupported new leave type %.', NEW.leave_type 
                    USING ERRCODE = '22023';
            END IF;

            IF v_new_type NOT LIKE '%loss%' AND v_new_type NOT LIKE '%lop%' THEN
                GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
                IF v_rows_updated = 0 THEN
                    RAISE EXCEPTION 'Ledger Integrity Failure: Failed to apply balance deduction for user % in academic year %.', NEW.user_id, v_new_year 
                        USING ERRCODE = '23514';
                END IF;
            END IF;
        END IF;

        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

--
-- Name: sync_student_profile(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_student_profile() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
    IF NEW.role = 'student' THEN
        IF NEW.student_id IS NULL OR length(trim(NEW.student_id)) = 0 THEN
            NEW.student_id := COALESCE(NULLIF(trim(NEW.roll_number), ''), public.generate_student_id());
        END IF;
        NEW.roll_number := NEW.student_id;
        -- Defer the students upsert to AFTER trigger (profile row must exist for the FK)
    END IF;
    RETURN NEW;
END;
$$;

--
-- Name: sync_student_profile_after(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_student_profile_after() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_status TEXT; v_sid UUID;
BEGIN
    IF NEW.role = 'student' AND NEW.student_id IS NOT NULL THEN
        v_status := CASE WHEN COALESCE(NEW.status, 'active') IN ('active','inactive','suspended','graduated','alumni','withdrawn')
                         THEN COALESCE(NEW.status, 'active') ELSE 'active' END;
        UPDATE public.students s SET
            user_id = NEW.id, name = COALESCE(NEW.name, s.name), email = COALESCE(NEW.email, s.email),
            department = COALESCE(NEW.department, s.department), class_name = COALESCE(NEW.class_name, s.class_name),
            status = v_status, phone = COALESCE(NEW.phone, s.phone), avatar_url = COALESCE(NEW.avatar_url, s.avatar_url),
            updated_at = NOW()
         WHERE s.student_id = NEW.student_id AND (s.user_id IS NULL OR s.user_id = NEW.id)
        RETURNING s.id INTO v_sid;
        IF v_sid IS NULL THEN
            INSERT INTO public.students (user_id, student_id, roll_number, name, email, department, class_name, status, phone, avatar_url)
            VALUES (NEW.id, NEW.student_id, NEW.student_id, COALESCE(NEW.name, 'Student'), NEW.email,
                    NEW.department, NEW.class_name, v_status, NEW.phone, NEW.avatar_url)
            ON CONFLICT (user_id) DO UPDATE SET
                name = EXCLUDED.name, email = EXCLUDED.email, department = EXCLUDED.department,
                class_name = EXCLUDED.class_name, status = EXCLUDED.status, phone = EXCLUDED.phone,
                avatar_url = EXCLUDED.avatar_url, updated_at = NOW()
            RETURNING id INTO v_sid;
        END IF;
        -- the student can now see their own fees, payments and receipts
        UPDATE public.student_fees   SET student_id = NEW.id WHERE student_record_id = v_sid AND student_id IS NULL;
        UPDATE public.fee_payments   SET student_id = NEW.id WHERE student_record_id = v_sid AND student_id IS NULL;
        UPDATE public.fee_receipts   SET student_id = NEW.id WHERE student_record_id = v_sid AND student_id IS NULL;
    END IF;
    RETURN NEW;
END;
$$;

--
-- Name: transport_assign(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.transport_assign(p_student uuid, p_vehicle uuid, p_stop text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v public.transport_vehicles; v_riders INT; v_old UUID; v_new UUID;
BEGIN
  IF auth.uid() IS NULL OR v_role NOT IN ('admin','principal') THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only admin or principal can allocate transport.'); END IF;
  IF length(trim(COALESCE(p_stop,''))) = 0 THEN RETURN jsonb_build_object('success', false, 'code', 'STOP_REQUIRED', 'error', 'Choose the pick-up stop.'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_student AND role = 'student') THEN
    RETURN jsonb_build_object('success', false, 'code', 'NOT_A_STUDENT', 'error', 'Choose a student.'); END IF;
  SELECT * INTO v FROM public.transport_vehicles WHERE id = p_vehicle FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Vehicle not found.'); END IF;
  IF v.status = 'maintenance' THEN RETURN jsonb_build_object('success', false, 'code', 'VEHICLE_UNAVAILABLE', 'error', 'This vehicle is under maintenance.'); END IF;
  SELECT id INTO v_old FROM public.transport_assignments WHERE student_id = p_student AND status = 'Active';
  SELECT count(*) INTO v_riders FROM public.transport_assignments WHERE vehicle_id = p_vehicle AND status = 'Active' AND student_id <> p_student;
  IF v_riders >= v.capacity THEN RETURN jsonb_build_object('success', false, 'code', 'VEHICLE_FULL', 'error', 'This vehicle is full (' || v.capacity || ' seats).'); END IF;
  IF v_old IS NOT NULL THEN UPDATE public.transport_assignments SET status = 'Ended', end_date = CURRENT_DATE WHERE id = v_old; END IF;
  INSERT INTO public.transport_assignments(student_id, vehicle_id, stop_name, assigned_by) VALUES (p_student, p_vehicle, trim(p_stop), auth.uid()) RETURNING id INTO v_new;
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values)
  VALUES (auth.uid(), v_role, CASE WHEN v_old IS NULL THEN 'transport_assigned' ELSE 'transport_reassigned' END, 'transport_assignments', v_new::text, jsonb_build_object('student', p_student, 'vehicle', p_vehicle, 'stop', trim(p_stop)));
  RETURN jsonb_build_object('success', true, 'id', v_new, 'reassigned', v_old IS NOT NULL);
END $$;

--
-- Name: transport_generate_day_logs(uuid, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.transport_generate_day_logs(p_vehicle uuid, p_date date DEFAULT CURRENT_DATE) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_n INT;
BEGIN
  IF auth.uid() IS NULL OR NOT (v_role IN ('admin','principal') OR (v_role IN ('driver','transport_driver') AND public.is_my_vehicle(p_vehicle))) THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only the bus driver or admin can start the day roster.'); END IF;
  INSERT INTO public.student_transport_logs(vehicle_id, student_id, student_name, class_name, stop_name, status, date)
  SELECT a.vehicle_id, a.student_id, p.name, p.class_name, a.stop_name, 'waiting', p_date
    FROM public.transport_assignments a JOIN public.profiles p ON p.id = a.student_id
   WHERE a.vehicle_id = p_vehicle AND a.status = 'Active'
     AND NOT EXISTS (SELECT 1 FROM public.student_transport_logs l WHERE l.vehicle_id = a.vehicle_id AND l.student_id = a.student_id AND l.date = p_date);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN jsonb_build_object('success', true, 'created', v_n);
END $$;

--
-- Name: transport_overview(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.transport_overview() RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF auth.uid() IS NULL OR public.get_current_user_role() NOT IN ('admin','principal','receptionist') THEN RETURN jsonb_build_object('vehicles', '[]'::jsonb); END IF;
  RETURN jsonb_build_object('vehicles', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', v.id, 'vehicle_number', v.vehicle_number, 'route_name', v.route_name, 'driver_name', v.driver_name, 'driver_phone', v.driver_phone, 'driver_id', v.driver_id,
      'capacity', v.capacity, 'status', v.status,
      'riders', (SELECT count(*) FROM public.transport_assignments a WHERE a.vehicle_id = v.id AND a.status = 'Active'),
      'stops', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', s.id, 'name', s.stop_name, 'time', s.scheduled_time, 'order', s.stop_order,
                  'riders', (SELECT count(*) FROM public.transport_assignments a WHERE a.vehicle_id = v.id AND a.status = 'Active' AND a.stop_name = s.stop_name)) ORDER BY s.stop_order)
                FROM public.transport_stops s WHERE s.vehicle_id = v.id), '[]'::jsonb),
      'roster', COALESCE((SELECT jsonb_agg(jsonb_build_object('student_id', a.student_id, 'name', p.name, 'class_name', p.class_name, 'stop', a.stop_name) ORDER BY a.stop_name, p.name)
                FROM public.transport_assignments a JOIN public.profiles p ON p.id = a.student_id WHERE a.vehicle_id = v.id AND a.status = 'Active'), '[]'::jsonb))
    ORDER BY v.vehicle_number) FROM public.transport_vehicles v), '[]'::jsonb));
END $$;

--
-- Name: transport_unassign(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.transport_unassign(p_student uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_id UUID;
BEGIN
  IF auth.uid() IS NULL OR v_role NOT IN ('admin','principal') THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only admin or principal can change transport.'); END IF;
  UPDATE public.transport_assignments SET status = 'Ended', end_date = CURRENT_DATE WHERE student_id = p_student AND status = 'Active' RETURNING id INTO v_id;
  IF v_id IS NULL THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'This student has no active transport.'); END IF;
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values)
  VALUES (auth.uid(), v_role, 'transport_ended', 'transport_assignments', v_id::text, jsonb_build_object('student', p_student));
  RETURN jsonb_build_object('success', true);
END $$;

--
-- Name: transport_vehicle_driver_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.transport_vehicle_driver_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF public.get_current_user_role() IN ('driver','transport_driver') THEN
    NEW.vehicle_number := OLD.vehicle_number; NEW.vehicle_type := OLD.vehicle_type; NEW.route_name := OLD.route_name;
    NEW.driver_id := OLD.driver_id; NEW.driver_name := OLD.driver_name; NEW.driver_phone := OLD.driver_phone; NEW.capacity := OLD.capacity;
  END IF;
  IF NEW.occupied_seats IS NOT NULL AND NEW.capacity IS NOT NULL AND NEW.occupied_seats > NEW.capacity THEN
    RAISE EXCEPTION 'Occupied seats (%) exceed capacity (%)', NEW.occupied_seats, NEW.capacity USING ERRCODE = 'check_violation';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

--
-- Name: validate_staff_leave_application(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_staff_leave_application() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_jwt_role TEXT;
    v_caller_role TEXT;
    v_caller_status TEXT;
    v_caller_id UUID;
BEGIN
    -- Check for trusted backend service role or direct physical DBA
    BEGIN
        v_jwt_role := current_setting('request.jwt.claim.role', true);
    EXCEPTION WHEN OTHERS THEN
        v_jwt_role := NULL;
    END;

    IF v_jwt_role = 'service_role' THEN
        RETURN NEW;
    END IF;

    IF auth.uid() IS NULL AND session_user IN ('postgres', 'supabase_admin') THEN
        RETURN NEW;
    END IF;

    -- Fail-closed caller authentication check
    v_caller_id := auth.uid();
    SELECT role, status INTO v_caller_role, v_caller_status
    FROM public.profiles
    WHERE id = v_caller_id;

    IF v_caller_role IS NULL OR v_caller_status IS DISTINCT FROM 'active' THEN
        RAISE EXCEPTION 'Access Denied: Unregistered, missing or inactive account.' 
            USING ERRCODE = '42501';
    END IF;

    -- 1. Input Sanity Checks
    IF NEW.user_id IS NULL THEN
        RAISE EXCEPTION 'Validation Error: Leave application applicant user_id cannot be null.' 
            USING ERRCODE = '23502';
    END IF;

    IF NEW.start_date IS NULL OR NEW.end_date IS NULL THEN
        RAISE EXCEPTION 'Validation Error: Leave start_date and end_date are mandatory and cannot be null.' 
            USING ERRCODE = '23502';
    END IF;

    IF NEW.end_date < NEW.start_date THEN
        RAISE EXCEPTION 'Validation Error: Leave end_date (%) cannot precede start_date (%).', NEW.end_date, NEW.start_date 
            USING ERRCODE = '23514';
    END IF;

    IF NEW.total_days IS NULL OR NEW.total_days <= 0 THEN
        RAISE EXCEPTION 'Validation Error: total_days must be a strictly positive integer (> 0). Attempted: %.', NEW.total_days 
            USING ERRCODE = '23514';
    END IF;

    IF NEW.leave_type IS NULL OR LENGTH(TRIM(NEW.leave_type)) = 0 THEN
        RAISE EXCEPTION 'Validation Error: leave_type is mandatory and cannot be empty.' 
            USING ERRCODE = '23502';
    END IF;

    -- 2. Authorization & Transition Checks
    IF TG_OP = 'INSERT' THEN
        -- Non-admin staff cannot create an already-approved application
        IF NEW.status = 'Approved' AND v_caller_role NOT IN ('admin', 'principal', 'hr_manager') THEN
            RAISE EXCEPTION 'Security Violation: Role % cannot directly create approved leave applications. Must submit as Pending.', v_caller_role 
                USING ERRCODE = '42501';
        END IF;

        -- Ordinary staff can only submit for their own user_id
        IF v_caller_role NOT IN ('admin', 'principal', 'hr_manager') AND NEW.user_id <> v_caller_id THEN
            RAISE EXCEPTION 'Security Violation: Staff cannot submit leave applications on behalf of other employees.' 
                USING ERRCODE = '42501';
        END IF;

        IF NEW.status IS NULL THEN
            NEW.status := 'Pending';
        END IF;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        -- Approval transition authorization check
        IF NEW.status = 'Approved' AND (OLD.status IS NULL OR OLD.status <> 'Approved') THEN
            -- Self-approval is strictly forbidden (applicants cannot approve own leave)
            IF v_caller_id = NEW.user_id AND v_caller_role <> 'admin' THEN
                RAISE EXCEPTION 'Security Violation: Staff members cannot approve their own leave applications.' 
                    USING ERRCODE = '42501';
            END IF;

            -- Only authorized institutional roles can approve leave
            IF v_caller_role NOT IN ('admin', 'principal', 'hr_manager', 'hod') THEN
                RAISE EXCEPTION 'Security Violation: Role % is not authorized to approve leave applications.', v_caller_role 
                    USING ERRCODE = '42501';
            END IF;
        END IF;

        -- Applicants updating own pending leave cannot self-approve or reject
        IF v_caller_id = OLD.user_id AND v_caller_role NOT IN ('admin', 'principal', 'hr_manager', 'hod') THEN
            IF NEW.status IN ('Approved', 'Rejected') AND NEW.status IS DISTINCT FROM OLD.status THEN
                RAISE EXCEPTION 'Security Violation: Applicants cannot approve or reject their own applications.' 
                    USING ERRCODE = '42501';
            END IF;

            -- Cannot alter an already processed application
            IF OLD.status IN ('Approved', 'Rejected') AND (
                NEW.total_days IS DISTINCT FROM OLD.total_days OR
                NEW.start_date IS DISTINCT FROM OLD.start_date OR
                NEW.end_date IS DISTINCT FROM OLD.end_date OR
                NEW.leave_type IS DISTINCT FROM OLD.leave_type
            ) THEN
                RAISE EXCEPTION 'Security Violation: Processed leave applications cannot be modified. Contact HR or Administrator.' 
                    USING ERRCODE = '42501';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

--
-- PostgreSQL database dump complete
--
