-- 076: Student lifecycle (discontinue / reinstate / transfer), student leave requests, announcements that notify,
-- fee-due reminders, staff-side global search and data export. Idempotent. Depends on 028, 057, 074, 075.

-- ---------- Student lifecycle ----------
CREATE TABLE IF NOT EXISTS public.student_lifecycle_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_record_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  student_user_id UUID,
  event_type TEXT NOT NULL CHECK (event_type IN ('discontinued','reinstated','transferred')),
  reason_type TEXT,
  reason TEXT NOT NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  from_department TEXT, from_class TEXT, to_department TEXT, to_class TEXT,
  dues_at_event NUMERIC(12,2) NOT NULL DEFAULT 0,
  done_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS student_lifecycle_student ON public.student_lifecycle_events(student_record_id, created_at DESC);
ALTER TABLE public.student_lifecycle_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS student_lifecycle_select ON public.student_lifecycle_events;
CREATE POLICY student_lifecycle_select ON public.student_lifecycle_events FOR SELECT TO authenticated
  USING (public.get_current_user_role() IN ('admin','principal','hod','coe'));
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.student_lifecycle_events FROM authenticated, anon;
GRANT SELECT ON public.student_lifecycle_events TO authenticated;

CREATE OR REPLACE FUNCTION public._student_dues(p_user UUID) RETURNS NUMERIC
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT COALESCE(sum(total_due), 0) FROM public.student_fees WHERE student_id = p_user AND total_due > 0 AND status NOT IN ('paid','waived','cancelled');
$$;
REVOKE ALL ON FUNCTION public._student_dues(UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.student_discontinue(p_student UUID, p_type TEXT, p_reason TEXT, p_effective DATE DEFAULT CURRENT_DATE, p_force BOOLEAN DEFAULT false)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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

CREATE OR REPLACE FUNCTION public.student_reinstate(p_student UUID, p_reason TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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

CREATE OR REPLACE FUNCTION public.student_transfer(p_student UUID, p_department TEXT, p_class TEXT, p_reason TEXT, p_semester INT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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

CREATE OR REPLACE FUNCTION public.student_lifecycle_history(p_student UUID DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL OR public.get_current_user_role() NOT IN ('admin','principal','hod','coe') THEN RETURN jsonb_build_object('items', '[]'::jsonb); END IF;
  RETURN jsonb_build_object('items', COALESCE((SELECT jsonb_agg(x ORDER BY (x->>'at') DESC) FROM (
    SELECT jsonb_build_object('id', e.id, 'student_id', e.student_record_id, 'name', s.name, 'code', s.student_id, 'event', e.event_type, 'type', e.reason_type, 'reason', e.reason,
      'effective', e.effective_date, 'from_class', e.from_class, 'to_class', e.to_class, 'from_department', e.from_department, 'to_department', e.to_department, 'dues', e.dues_at_event, 'at', e.created_at) AS x
    FROM public.student_lifecycle_events e JOIN public.students s ON s.id = e.student_record_id
    WHERE p_student IS NULL OR e.student_record_id = p_student ORDER BY e.created_at DESC LIMIT 100) q), '[]'::jsonb));
END $$;

-- ---------- Student leave requests ----------
CREATE TABLE IF NOT EXISTS public.student_leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL DEFAULT 'Personal' CHECK (leave_type IN ('Medical','Personal','Family','Event','Other')),
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Approved','Rejected','Cancelled')),
  decided_by UUID,
  decision_note TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (to_date >= from_date)
);
CREATE INDEX IF NOT EXISTS student_leave_student ON public.student_leave_requests(student_id, from_date DESC);
ALTER TABLE public.student_leave_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS student_leave_select ON public.student_leave_requests;
CREATE POLICY student_leave_select ON public.student_leave_requests FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR public.is_parent_of(student_id) OR public.get_current_user_role() IN ('admin','principal','hod','hostel_warden')
         OR (public.get_current_user_role() = 'teacher' AND public.is_teacher_assigned_to_class(auth.uid(), (SELECT class_name FROM public.profiles p WHERE p.id = student_leave_requests.student_id))));
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.student_leave_requests FROM authenticated, anon;
GRANT SELECT ON public.student_leave_requests TO authenticated;

CREATE OR REPLACE FUNCTION public.student_leave_apply(p_type TEXT, p_from DATE, p_to DATE, p_reason TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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

CREATE OR REPLACE FUNCTION public.student_leave_cancel(p_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  UPDATE public.student_leave_requests SET status = 'Cancelled', decided_at = now() WHERE id = p_id AND student_id = auth.uid() AND status IN ('Pending','Approved') AND to_date >= CURRENT_DATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'That request cannot be cancelled.'); END IF;
  RETURN jsonb_build_object('success', true);
END $$;

CREATE OR REPLACE FUNCTION public.student_leave_decide(p_id UUID, p_decision TEXT, p_note TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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

-- ---------- Announcements that actually reach people ----------
CREATE OR REPLACE FUNCTION public.announcement_publish(p_title TEXT, p_message TEXT, p_category TEXT DEFAULT 'Circular', p_priority TEXT DEFAULT 'Normal', p_audience TEXT DEFAULT 'All')
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); v_id UUID; v_roles TEXT[]; v_name TEXT;
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('admin','principal') THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only admin or principal can publish announcements.'); END IF;
  IF length(trim(COALESCE(p_title,''))) < 3 OR length(trim(COALESCE(p_message,''))) < 3 THEN RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'A title and a message are required.'); END IF;
  IF p_audience NOT IN ('All','Students','Faculty','Parents') THEN RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Choose who should see this.'); END IF;
  IF p_priority NOT IN ('Normal','High','Urgent') THEN p_priority := 'Normal'; END IF;
  SELECT name INTO v_name FROM public.profiles WHERE id = v_uid;
  INSERT INTO public.institutional_broadcasts(title, message, category, priority, target_audience, author_name, author_id)
  VALUES (trim(p_title), trim(p_message), COALESCE(NULLIF(trim(p_category),''),'Circular'), p_priority, p_audience, COALESCE(v_name,'Office'), v_uid) RETURNING id INTO v_id;
  v_roles := CASE p_audience WHEN 'Students' THEN ARRAY['student'] WHEN 'Parents' THEN ARRAY['parent'] WHEN 'Faculty' THEN ARRAY['teacher','hod']
    ELSE ARRAY['student','parent','teacher','hod','coe','hr_manager','finance_manager','accountant','financier','librarian','hostel_warden','placement_officer','receptionist','store_manager','storekeeper','naac_coordinator','transport_driver','driver'] END;
  PERFORM public.notify_roles(v_roles, left(trim(p_title), 200), left(trim(p_message), 2000), CASE WHEN p_priority = 'Urgent' THEN 'warning' ELSE 'info' END, CASE WHEN p_priority = 'Normal' THEN 'medium' ELSE 'high' END);
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values)
  VALUES (v_uid, v_role, 'announcement_published', 'institutional_broadcasts', v_id::text, jsonb_build_object('audience', p_audience, 'title', trim(p_title)));
  RETURN jsonb_build_object('success', true, 'id', v_id);
END $$;

-- ---------- Fee due reminders ----------
CREATE OR REPLACE FUNCTION public.fee_send_reminders(p_days_ahead INT DEFAULT 7)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); f RECORD; v_type TEXT; v_sent INT := 0; v_skipped INT := 0; v_ids UUID[];
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('admin','principal','finance_manager','financier','accountant') THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only the finance team can send reminders.'); END IF;
  p_days_ahead := LEAST(GREATEST(COALESCE(p_days_ahead, 7), 0), 30);
  FOR f IN SELECT sf.* FROM public.student_fees sf JOIN public.profiles p ON p.id = sf.student_id AND p.status = 'active'
            WHERE sf.total_due > 0 AND sf.status NOT IN ('paid','waived','cancelled') AND sf.due_date <= CURRENT_DATE + p_days_ahead LOOP
    v_type := CASE WHEN f.due_date < CURRENT_DATE THEN 'overdue_escalation' WHEN f.due_date = CURRENT_DATE THEN 'due_date' ELSE 'upcoming' END;
    IF EXISTS (SELECT 1 FROM public.fee_payment_reminders r WHERE r.student_fee_id = f.id AND r.reminder_type = v_type
                 AND r.sent_at > now() - CASE WHEN v_type = 'overdue_escalation' THEN interval '7 days' ELSE interval '3 days' END) THEN
      v_skipped := v_skipped + 1; CONTINUE; END IF;
    INSERT INTO public.fee_payment_reminders(student_id, student_fee_id, student_name, roll_number, reminder_type, due_date, amount_due, channels, delivery_status)
    VALUES (f.student_id, f.id, f.student_name, COALESCE(f.student_code, ''), v_type, f.due_date, f.total_due, 'In_App', 'Sent');
    SELECT array_agg(DISTINCT x) INTO v_ids FROM (SELECT f.student_id AS x UNION SELECT l.parent_id FROM public.parent_student_links l WHERE l.student_id = f.student_id) q;
    PERFORM public.notify_users(v_ids, CASE WHEN v_type = 'overdue_escalation' THEN 'Fee overdue' ELSE 'Fee due soon' END,
      COALESCE(f.description, 'Fee') || ' of ₹' || f.total_due || CASE WHEN f.due_date < CURRENT_DATE THEN ' was due on ' ELSE ' is due on ' END || f.due_date || '.',
      CASE WHEN v_type = 'overdue_escalation' THEN 'warning' ELSE 'info' END, CASE WHEN v_type = 'overdue_escalation' THEN 'high' ELSE 'medium' END);
    v_sent := v_sent + 1;
  END LOOP;
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values)
  VALUES (v_uid, v_role, 'fee_reminders_sent', 'student_fees', NULL, jsonb_build_object('sent', v_sent, 'skipped', v_skipped, 'days_ahead', p_days_ahead));
  RETURN jsonb_build_object('success', true, 'sent', v_sent, 'skipped', v_skipped);
END $$;

-- ---------- Global search & export ----------
CREATE OR REPLACE FUNCTION public.global_search(p_query TEXT)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_q TEXT := '%' || replace(replace(trim(COALESCE(p_query,'')), '%', ''), '_', '') || '%';
BEGIN
  IF auth.uid() IS NULL OR length(trim(COALESCE(p_query,''))) < 2
     OR v_role NOT IN ('admin','principal','hod','coe','receptionist','finance_manager','financier','accountant','librarian','hostel_warden','hr_manager','placement_officer','teacher') THEN
    RETURN jsonb_build_object('students', '[]'::jsonb, 'staff', '[]'::jsonb); END IF;
  RETURN jsonb_build_object(
    'students', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'student_id', s.student_id, 'class_name', s.class_name, 'department', s.department, 'status', s.status))
      FROM (SELECT * FROM public.students WHERE name ILIKE v_q OR student_id ILIKE v_q OR roll_number ILIKE v_q OR email ILIKE v_q ORDER BY name LIMIT 10) s
      WHERE v_role <> 'teacher' OR public.is_teacher_assigned_to_class(auth.uid(), s.class_name)), '[]'::jsonb),
    'staff', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'role', p.role, 'department', p.department, 'email', p.email))
      FROM (SELECT * FROM public.profiles WHERE role NOT IN ('student','parent') AND (name ILIKE v_q OR email ILIKE v_q) ORDER BY name LIMIT 10) p
      WHERE v_role IN ('admin','principal','hr_manager','hod')), '[]'::jsonb));
END $$;

CREATE OR REPLACE FUNCTION public.export_dataset(p_name TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_rows JSONB;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Sign in first.'); END IF;
  IF p_name = 'students' AND v_role IN ('admin','principal') THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(q)), '[]'::jsonb) INTO v_rows FROM (SELECT student_id, roll_number, name, email, phone, department, class_name, current_semester, status, admission_date FROM public.students ORDER BY name) q;
  ELSIF p_name = 'staff' AND v_role IN ('admin','principal','hr_manager') THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(q)), '[]'::jsonb) INTO v_rows FROM (SELECT name, email, phone, role, department, status FROM public.profiles WHERE role NOT IN ('student','parent') ORDER BY name) q;
  ELSIF p_name = 'fees' AND v_role IN ('admin','principal','finance_manager','financier','accountant') THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(q)), '[]'::jsonb) INTO v_rows FROM (SELECT student_code, student_name, class_name, academic_year, term_label, description, original_amount, paid_amount, waived_amount, total_due AS outstanding, due_date, status FROM public.student_fees WHERE status <> 'cancelled' ORDER BY due_date, student_name) q;
  ELSIF p_name = 'lifecycle' AND v_role IN ('admin','principal') THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(q)), '[]'::jsonb) INTO v_rows FROM (SELECT s.student_id, s.name, e.event_type, e.reason_type, e.reason, e.effective_date, e.from_class, e.to_class, e.dues_at_event FROM public.student_lifecycle_events e JOIN public.students s ON s.id = e.student_record_id ORDER BY e.created_at DESC) q;
  ELSE
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'You cannot export that list.'); END IF;
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values)
  VALUES (auth.uid(), v_role, 'data_exported', p_name, NULL, jsonb_build_object('rows', jsonb_array_length(v_rows)));
  RETURN jsonb_build_object('success', true, 'rows', v_rows);
END $$;

REVOKE ALL ON FUNCTION public.student_discontinue(UUID,TEXT,TEXT,DATE,BOOLEAN), public.student_reinstate(UUID,TEXT), public.student_transfer(UUID,TEXT,TEXT,TEXT,INT), public.student_lifecycle_history(UUID),
  public.student_leave_apply(TEXT,DATE,DATE,TEXT), public.student_leave_cancel(UUID), public.student_leave_decide(UUID,TEXT,TEXT), public.announcement_publish(TEXT,TEXT,TEXT,TEXT,TEXT),
  public.fee_send_reminders(INT), public.global_search(TEXT), public.export_dataset(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.student_discontinue(UUID,TEXT,TEXT,DATE,BOOLEAN), public.student_reinstate(UUID,TEXT), public.student_transfer(UUID,TEXT,TEXT,TEXT,INT), public.student_lifecycle_history(UUID),
  public.student_leave_apply(TEXT,DATE,DATE,TEXT), public.student_leave_cancel(UUID), public.student_leave_decide(UUID,TEXT,TEXT), public.announcement_publish(TEXT,TEXT,TEXT,TEXT,TEXT),
  public.fee_send_reminders(INT), public.global_search(TEXT), public.export_dataset(TEXT) TO authenticated;
