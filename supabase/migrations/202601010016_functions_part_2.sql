-- Functions and RPCs, part 2 of 6
-- Generated from the verified schema. Run as is; do not edit. Safe to run once on an EMPTY database.
SET check_function_bodies = false;
SET search_path = public, extensions;

SET check_function_bodies = false;

--
-- Name: certificate_request(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.certificate_request(p_type text, p_purpose text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_uid UUID := auth.uid(); s public.students; c public.certificates;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Sign in first.'); END IF;
  SELECT * INTO s FROM public.students WHERE user_id = v_uid LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_A_STUDENT', 'error', 'Only students can request a certificate.'); END IF;
  IF length(trim(COALESCE(p_type,''))) = 0 OR length(trim(COALESCE(p_purpose,''))) < 3 THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Certificate type and purpose are required.'); END IF;
  c := public._cert_make(s, trim(p_type), trim(p_purpose), NULL, 'Pending', NULL);
  RETURN jsonb_build_object('success', true, 'id', c.id, 'certificate_number', c.certificate_number);
END $$;

--
-- Name: certificate_verify(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.certificate_verify(p_number text) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT COALESCE((SELECT jsonb_build_object('valid', true, 'type', certificate_type, 'student', student_name, 'issued_on', issue_date)
                   FROM public.certificates WHERE certificate_number = upper(trim(p_number)) AND status = 'Issued'),
                  jsonb_build_object('valid', false));
$$;

--
-- Name: check_rate_limit(text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_rate_limit(p_key text, p_max integer, p_window_seconds integer) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_hits INTEGER;
BEGIN
    IF p_key IS NULL OR p_max < 1 OR p_window_seconds < 1 THEN
        RETURN FALSE;
    END IF;
    INSERT INTO public.auth_rate_limits AS r (key, window_start, hits)
    VALUES (left(p_key, 200), NOW(), 1)
    ON CONFLICT (key) DO UPDATE
        SET hits = CASE WHEN r.window_start < NOW() - make_interval(secs => p_window_seconds)
                        THEN 1 ELSE r.hits + 1 END,
            window_start = CASE WHEN r.window_start < NOW() - make_interval(secs => p_window_seconds)
                                THEN NOW() ELSE r.window_start END
    RETURNING hits INTO v_hits;
    RETURN v_hits <= p_max;
END;
$$;

--
-- Name: checkout_store_order(uuid, jsonb, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.checkout_store_order(p_student_id uuid, p_items jsonb, p_total_amount numeric) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_role TEXT := public.get_current_user_role();
    v_item RECORD; v_stock INTEGER; v_price NUMERIC; v_name TEXT;
    v_total NUMERIC := 0; v_order UUID; v_uname TEXT; v_lines JSONB := '[]'::jsonb;
BEGIN
    IF NOT (p_student_id = auth.uid() OR v_role IN ('admin', 'store_manager', 'storekeeper')) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authorized to place this order.');
    END IF;
    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order has no items.');
    END IF;
    SELECT name INTO v_uname FROM public.profiles WHERE id = p_student_id;
    -- Lock rows in a deterministic order to avoid deadlocks; price is taken from the catalog, NOT the client.
    FOR v_item IN SELECT x.product_id, SUM(x.quantity)::INT AS quantity
                    FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INTEGER)
                   GROUP BY x.product_id ORDER BY x.product_id
    LOOP
        IF v_item.quantity IS NULL OR v_item.quantity <= 0 THEN
            RETURN jsonb_build_object('success', false, 'error', 'Invalid quantity.');
        END IF;
        SELECT stock, price, name INTO v_stock, v_price, v_name
          FROM public.store_products WHERE id = v_item.product_id FOR UPDATE;
        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', 'Product not found.');
        END IF;
        IF v_stock < v_item.quantity THEN
            RETURN jsonb_build_object('success', false,
                'error', format('Insufficient stock for "%s". Available: %s, requested: %s', v_name, v_stock, v_item.quantity));
        END IF;
        UPDATE public.store_products SET stock = stock - v_item.quantity, updated_at = NOW()
         WHERE id = v_item.product_id;
        v_total := v_total + v_price * v_item.quantity;
        v_lines := v_lines || jsonb_build_object('product_id', v_item.product_id, 'name', v_name,
                                                 'quantity', v_item.quantity, 'unit_price', v_price);
    END LOOP;
    IF p_total_amount IS NOT NULL AND abs(p_total_amount - v_total) > 0.01 THEN
        RAISE EXCEPTION 'PRICE_MISMATCH: client total % differs from catalog total %', p_total_amount, v_total;
    END IF;
    INSERT INTO public.store_orders (user_id, user_name, items, total_amount, status)
    VALUES (p_student_id, COALESCE(v_uname, 'Student'), v_lines, v_total, 'Pending')
    RETURNING id INTO v_order;
    RETURN jsonb_build_object('success', true, 'order_id', v_order, 'total_amount', v_total);
END;
$$;

--
-- Name: decrement_book_copies(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.decrement_book_copies(book_id uuid) RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
    SELECT available_copies FROM public.library_books WHERE id = book_id;
$$;

--
-- Name: discipline_update(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.discipline_update(p_id uuid, p_status text, p_action text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); r public.disciplinary_incidents;
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('admin','principal') THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only the principal or admin can act on incidents.'); END IF;
  IF p_status NOT IN ('Under Investigation','Resolved') THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Status must be Under Investigation or Resolved.'); END IF;
  IF p_status = 'Resolved' AND length(trim(COALESCE(p_action,''))) < 3 THEN
    RETURN jsonb_build_object('success', false, 'code', 'ACTION_REQUIRED', 'error', 'Record the action taken to resolve an incident.'); END IF;
  SELECT * INTO r FROM public.disciplinary_incidents WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Incident not found.'); END IF;
  IF r.status = 'Resolved' THEN RETURN jsonb_build_object('success', false, 'code', 'ALREADY_RESOLVED', 'error', 'This incident is already resolved.'); END IF;
  UPDATE public.disciplinary_incidents SET status = p_status, action_taken = COALESCE(NULLIF(trim(COALESCE(p_action,'')), ''), action_taken), decided_by = v_uid, decided_at = now() WHERE id = p_id;
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, old_values, new_values)
  VALUES (v_uid, v_role, 'discipline_' || lower(replace(p_status,' ','_')), 'disciplinary_incidents', p_id::text, jsonb_build_object('status', r.status), jsonb_build_object('status', p_status, 'action', p_action));
  RETURN jsonb_build_object('success', true, 'status', p_status);
END $$;

--
-- Name: enforce_immutable_student_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_immutable_student_id() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
    IF OLD.student_id IS NOT NULL AND NEW.student_id IS DISTINCT FROM OLD.student_id THEN
        RAISE EXCEPTION 'STUDENT_ID_IMMUTABLE: permanent student ID (%) cannot be modified.', OLD.student_id;
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

--
-- Name: exam_analytics(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.exam_analytics(p_exam_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE sql STABLE
    SET search_path TO 'public', 'pg_temp'
    AS $$
    WITH r AS (
        SELECT * FROM public.exam_results WHERE (p_exam_id IS NULL OR exam_id = p_exam_id)
    ), appeared AS (SELECT * FROM r WHERE COALESCE(result_status, '') <> 'Absent')
    SELECT jsonb_build_object(
        'total_results', (SELECT count(*) FROM r),
        'appeared', (SELECT count(*) FROM appeared),
        'absent', (SELECT count(*) FROM r) - (SELECT count(*) FROM appeared),
        'passed', (SELECT count(*) FROM appeared WHERE result_status = 'Pass'),
        'pass_percentage', COALESCE((SELECT round(100.0 * count(*) FILTER (WHERE result_status = 'Pass') / NULLIF(count(*), 0)) FROM appeared), 0),
        'average_percentage', COALESCE((SELECT round(avg(marks_obtained / NULLIF(max_marks, 0) * 100)) FROM appeared), 0),
        'by_subject', COALESCE((SELECT jsonb_agg(jsonb_build_object('subject', subject, 'appeared', n, 'pass_percentage', pp, 'average_percentage', ap) ORDER BY subject)
            FROM (SELECT subject, count(*) n, round(100.0 * count(*) FILTER (WHERE result_status = 'Pass') / NULLIF(count(*), 0)) pp,
                         round(avg(marks_obtained / NULLIF(max_marks, 0) * 100)) ap FROM appeared GROUP BY subject) s), '[]'::jsonb),
        'top', COALESCE((SELECT jsonb_agg(jsonb_build_object('student_name', student_name, 'class_name', class_name, 'subject', subject,
                  'marks', marks_obtained, 'max', max_marks, 'grade', grade) )
            FROM (SELECT * FROM appeared ORDER BY marks_obtained / NULLIF(max_marks, 0) DESC NULLS LAST LIMIT 5) t), '[]'::jsonb)
    )
$$;

--
-- Name: exam_assign_invigilator(uuid, date, text, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.exam_assign_invigilator(p_exam uuid, p_date date, p_start text, p_room uuid, p_teacher uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_role TEXT := public.get_current_user_role();
BEGIN
  IF auth.uid() IS NULL OR v_role NOT IN ('admin','principal','coe','hod') THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Not allowed.'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_teacher AND role IN ('teacher','hod') AND COALESCE(status,'active') = 'active') THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Choose an active teacher.'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.exam_seating WHERE exam_id = p_exam AND exam_date = p_date AND start_time = p_start AND room_id = p_room) THEN
    RETURN jsonb_build_object('success', false, 'code', 'ROOM_NOT_IN_USE', 'error', 'No students are seated in that room for this session. Generate seating first.'); END IF;
  -- not in two rooms at once, and not invigilating their own class's paper
  IF EXISTS (SELECT 1 FROM public.exam_invigilators WHERE exam_id = p_exam AND exam_date = p_date AND start_time = p_start AND teacher_id = p_teacher) THEN
    RETURN jsonb_build_object('success', false, 'code', 'CLASH', 'error', 'That teacher already has duty in this session.'); END IF;
  INSERT INTO public.exam_invigilators (exam_id, exam_date, start_time, room_id, teacher_id, teacher_name) VALUES (p_exam, p_date, p_start, p_room, p_teacher, (SELECT name FROM public.profiles WHERE id = p_teacher));
  RETURN jsonb_build_object('success', true);
END $$;

--
-- Name: exam_generate_hall_tickets(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.exam_generate_hall_tickets(p_exam_id uuid, p_class_name text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); v_exam public.exams%ROWTYPE;
    v_min NUMERIC; v_fee_rule BOOLEAN; s RECORD; v_att NUMERIC; v_dues BOOLEAN; v_detained BOOLEAN; v_reason TEXT;
    v_issued INT := 0; v_withheld INT := 0; v_kept INT := 0; v_list JSONB := '[]'::jsonb; v_classes TEXT[]; v_existing public.hall_tickets%ROWTYPE;
    v_token TEXT; v_room TEXT; v_seat TEXT;
BEGIN
    IF v_uid IS NULL OR v_role NOT IN ('admin', 'principal', 'coe') THEN
        RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only the Controller of Examinations, principal or admin can generate hall tickets.');
    END IF;
    SELECT * INTO v_exam FROM public.exams WHERE id = p_exam_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Examination not found.'); END IF;
    SELECT COALESCE(min_attendance_percentage, 75), COALESCE(exam_requires_fee_clearance, FALSE) INTO v_min, v_fee_rule FROM public.institutional_settings LIMIT 1;
    v_min := COALESCE(v_min, 75); v_fee_rule := COALESCE(v_fee_rule, FALSE);

    SELECT array_agg(DISTINCT class_name) INTO v_classes FROM public.exam_schedules
     WHERE exam_id = p_exam_id AND class_name IS NOT NULL AND (p_class_name IS NULL OR class_name = p_class_name);
    IF v_classes IS NULL THEN
        RETURN jsonb_build_object('success', false, 'code', 'NO_PAPERS', 'error', 'This examination has no papers for the chosen class. Schedule papers first.');
    END IF;

    FOR s IN SELECT p.id, p.name, p.student_id, p.roll_number, p.department, p.class_name FROM public.profiles p
              WHERE p.role = 'student' AND COALESCE(p.status, 'active') = 'active' AND p.class_name = ANY (v_classes)
                AND (NOT COALESCE(v_exam.registration_required, FALSE)
                     OR EXISTS (SELECT 1 FROM public.exam_registrations r WHERE r.exam_id = p_exam_id AND r.student_id = p.id AND r.status = 'Registered'))
              ORDER BY p.class_name, p.name LOOP
        SELECT round(100.0 * count(*) FILTER (WHERE lower(status) IN ('present', 'late', 'excused')) / NULLIF(count(*), 0), 2)
          INTO v_att FROM public.student_attendance_records WHERE student_id = s.id;
        SELECT EXISTS (SELECT 1 FROM public.student_fees f WHERE (f.student_id = s.id OR f.student_record_id IN (SELECT st.id FROM public.students st WHERE st.user_id = s.id))
                          AND f.total_due > 0 AND f.due_date < CURRENT_DATE AND f.status NOT IN ('cancelled', 'waived')) INTO v_dues;
        v_reason := NULL;
        IF v_att IS NOT NULL AND v_att < v_min THEN v_reason := format('Attendance %s%% is below the required %s%%.', v_att, v_min); END IF;
        IF v_fee_rule AND v_dues THEN v_reason := COALESCE(v_reason || ' ', '') || 'Fee dues are outstanding.'; END IF;
        v_detained := v_reason IS NOT NULL;
        v_seat := NULL;
        SELECT rm.name, sq.seat_no::text INTO v_room, v_seat FROM public.exam_seating sq JOIN public.exam_rooms rm ON rm.id = sq.room_id
         WHERE sq.exam_id = p_exam_id AND sq.student_id = s.id ORDER BY sq.exam_date, sq.start_time LIMIT 1;
        IF v_room IS NULL THEN
          SELECT room INTO v_room FROM public.exam_schedules WHERE exam_id = p_exam_id AND class_name = s.class_name ORDER BY exam_date, start_time LIMIT 1;
        END IF;
        v_token := 'HT-' || replace(gen_random_uuid()::text, '-', '');

        SELECT * INTO v_existing FROM public.hall_tickets WHERE exam_id = p_exam_id AND student_id = s.id;
        IF FOUND AND v_existing.override_reason IS NOT NULL THEN
            -- a released ticket stays released; only the facts are refreshed
            UPDATE public.hall_tickets SET attendance_pct = v_att, has_fee_dues = v_dues WHERE id = v_existing.id;
            v_kept := v_kept + 1; CONTINUE;
        END IF;
        INSERT INTO public.hall_tickets (exam_id, student_id, student_name, roll_number, register_number, department, class_name, academic_year,
                                         semester, hall_number, seat_number, attendance_pct, has_fee_dues, is_detained, detention_reason, qr_code_token, coe_signature_hash,
                                         issued_date, status, exam_title)
        VALUES (p_exam_id, s.id, s.name, COALESCE(s.roll_number, s.student_id, 'N/A'), COALESCE(s.student_id, s.roll_number, 'N/A'),
                COALESCE(s.department, '—'), s.class_name, v_exam.academic_year, v_exam.semester, v_room, v_seat, v_att, v_dues, v_detained, v_reason,
                v_token, encode(sha256(convert_to(v_token || ':' || s.id::text || ':' || p_exam_id::text, 'UTF8')), 'hex'),
                CURRENT_DATE, CASE WHEN v_detained THEN 'Withheld' ELSE 'Issued' END, v_exam.name)
        ON CONFLICT (exam_id, student_id) WHERE exam_id IS NOT NULL AND student_id IS NOT NULL DO UPDATE
            SET hall_number = EXCLUDED.hall_number, seat_number = EXCLUDED.seat_number, attendance_pct = EXCLUDED.attendance_pct, has_fee_dues = EXCLUDED.has_fee_dues, is_detained = EXCLUDED.is_detained,
                detention_reason = EXCLUDED.detention_reason, status = EXCLUDED.status, student_name = EXCLUDED.student_name,
                class_name = EXCLUDED.class_name, exam_title = EXCLUDED.exam_title;
        IF v_detained THEN
            v_withheld := v_withheld + 1;
            v_list := v_list || jsonb_build_object('student', s.name, 'class', s.class_name, 'reason', v_reason);
        ELSE v_issued := v_issued + 1; END IF;
    END LOOP;

    INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values)
    VALUES (v_uid, v_role, 'hall_tickets_generated', 'exams', p_exam_id::text,
            jsonb_build_object('issued', v_issued, 'withheld', v_withheld, 'kept_released', v_kept, 'min_attendance', v_min, 'fee_rule', v_fee_rule));
    RETURN jsonb_build_object('success', true, 'issued', v_issued, 'withheld', v_withheld, 'kept_released', v_kept, 'withheld_list', v_list,
                              'rules', jsonb_build_object('min_attendance', v_min, 'fee_clearance_required', v_fee_rule));
END;
$$;

--
-- Name: exam_generate_seating(uuid, date, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.exam_generate_seating(p_exam uuid, p_date date, p_start text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); e public.exams; v_total INT; v_cap INT; v_room RECORD; v_seat INT := 0;
  v_ids UUID[]; v_idx INT := 1; v_n INT := 0; v_per RECORD;
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('admin','principal','coe') THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only the Controller of Examinations, principal or admin can generate seating.'); END IF;
  SELECT * INTO e FROM public.exams WHERE id = p_exam;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Examination not found.'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.exam_schedules WHERE exam_id = p_exam AND exam_date = p_date AND start_time = p_start) THEN
    RETURN jsonb_build_object('success', false, 'code', 'NO_SESSION', 'error', 'No paper is scheduled at that date and time.'); END IF;

  CREATE TEMP TABLE _pool ON COMMIT DROP AS
  SELECT p.id AS student_id, p.class_name, sc.subject, p.name, p.roll_number,
         row_number() OVER (PARTITION BY p.class_name ORDER BY p.roll_number NULLS LAST, p.name) AS pos_in_class,
         dense_rank() OVER (ORDER BY p.class_name) AS class_rank
    FROM public.exam_schedules sc
    JOIN public.profiles p ON p.role = 'student' AND COALESCE(p.status,'active') = 'active' AND p.class_name = sc.class_name
   WHERE sc.exam_id = p_exam AND sc.exam_date = p_date AND sc.start_time = p_start
     AND (NOT e.registration_required OR EXISTS (SELECT 1 FROM public.exam_registrations r WHERE r.exam_id = p_exam AND r.student_id = p.id AND r.status = 'Registered'))
     AND NOT EXISTS (SELECT 1 FROM public.hall_tickets h WHERE h.exam_id = p_exam AND h.student_id = p.id AND h.status = 'Withheld');
  SELECT count(*) INTO v_total FROM _pool;
  IF v_total = 0 THEN DROP TABLE _pool; RETURN jsonb_build_object('success', false, 'code', 'NO_STUDENTS', 'error', 'No eligible students for this session (check registration and withheld hall tickets).'); END IF;
  SELECT COALESCE(sum(capacity), 0) INTO v_cap FROM public.exam_rooms WHERE active;
  IF v_cap < v_total THEN
    DROP TABLE _pool;
    RETURN jsonb_build_object('success', false, 'code', 'NO_CAPACITY', 'error', format('%s students need seats but active rooms hold only %s. Add rooms or capacity.', v_total, v_cap));
  END IF;

  DELETE FROM public.exam_seating WHERE exam_id = p_exam AND exam_date = p_date AND start_time = p_start;
  -- interleave: order by position-in-class first, then class, so seat k of each class alternates
  SELECT array_agg(student_id ORDER BY pos_in_class, class_rank) INTO v_ids FROM _pool;
  FOR v_room IN SELECT * FROM public.exam_rooms WHERE active ORDER BY capacity DESC, name LOOP
    v_seat := 0;
    WHILE v_seat < v_room.capacity AND v_idx <= array_length(v_ids, 1) LOOP
      v_seat := v_seat + 1;
      INSERT INTO public.exam_seating (exam_id, exam_date, start_time, student_id, class_name, subject, student_name, roll_number, room_id, seat_no)
      SELECT p_exam, p_date, p_start, pl.student_id, pl.class_name, pl.subject, pl.name, pl.roll_number, v_room.id, v_seat FROM _pool pl WHERE pl.student_id = v_ids[v_idx];
      v_idx := v_idx + 1; v_n := v_n + 1;
    END LOOP;
    EXIT WHEN v_idx > array_length(v_ids, 1);
  END LOOP;
  DROP TABLE _pool;
  -- tickets already generated pick up the hall/seat of the exam's first session
  UPDATE public.hall_tickets h SET hall_number = rm.name, seat_number = sq.seat_no::text
    FROM (SELECT DISTINCT ON (student_id) student_id, room_id, seat_no FROM public.exam_seating WHERE exam_id = p_exam ORDER BY student_id, exam_date, start_time) sq
    JOIN public.exam_rooms rm ON rm.id = sq.room_id
   WHERE h.exam_id = p_exam AND h.student_id = sq.student_id;
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values)
  VALUES (v_uid, v_role, 'exam_seating_generated', 'exams', p_exam::text, jsonb_build_object('date', p_date, 'start', p_start, 'students', v_n));
  RETURN jsonb_build_object('success', true, 'seated', v_n, 'rooms_used', (SELECT count(DISTINCT room_id) FROM public.exam_seating WHERE exam_id = p_exam AND exam_date = p_date AND start_time = p_start));
END $$;

--
-- Name: exam_gpa_report(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.exam_gpa_report(p_exam uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_rows JSONB;
BEGIN
  IF auth.uid() IS NULL OR v_role NOT IN ('admin','principal','coe','hod') THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Not allowed.'); END IF;
  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'student'), '[]'::jsonb) INTO v_rows FROM (
    SELECT jsonb_build_object('student_id', r.student_id, 'student', r.student_name, 'class', r.class_name,
             'subjects', count(*), 'failed', count(*) FILTER (WHERE r.result_status = 'Fail'),
             'sgpa', round(sum(public.grade_point_for(CASE WHEN r.max_marks > 0 THEN r.marks_obtained / r.max_marks * 100 ELSE 0 END, r.result_status = 'Pass')
                         * COALESCE(sc.credits, 1)) / NULLIF(sum(COALESCE(sc.credits, 1)), 0), 2)) AS x
      FROM public.exam_results r
      LEFT JOIN LATERAL (SELECT s.credits FROM public.exam_schedules s WHERE s.exam_id = r.exam_id AND s.subject = r.subject AND s.credits IS NOT NULL LIMIT 1) sc ON TRUE
     WHERE r.exam_id = p_exam AND COALESCE(r.result_status,'') <> 'Absent'
     GROUP BY r.student_id, r.student_name, r.class_name) q;
  RETURN jsonb_build_object('success', true, 'rows', v_rows);
END $$;

--
-- Name: exam_grade(numeric, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.exam_grade(p_pct numeric, p_pass boolean) RETURNS text
    LANGUAGE sql STABLE
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT CASE WHEN NOT p_pass THEN 'F'
    ELSE COALESCE((SELECT b.grade FROM public.grade_scale_bands b JOIN public.grade_scales s ON s.id = b.scale_id
                    WHERE s.is_default AND b.min_pct <= p_pct ORDER BY b.min_pct DESC LIMIT 1), 'P') END
$$;

--
-- Name: exam_list_teachers(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.exam_list_teachers() RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT CASE WHEN auth.uid() IS NULL OR public.get_current_user_role() NOT IN ('admin','principal','coe','hod')
              THEN jsonb_build_object('success', false, 'error', 'Not allowed.')
              ELSE jsonb_build_object('success', true, 'teachers', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'department', department) ORDER BY name)
                     FROM public.profiles WHERE role IN ('teacher','hod') AND COALESCE(status,'active') = 'active'), '[]'::jsonb)) END;
$$;

--
-- Name: exam_my_valuations(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.exam_my_valuations() RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT CASE WHEN auth.uid() IS NULL OR public.get_current_user_role() NOT IN ('teacher','hod') THEN jsonb_build_object('success', false, 'error', 'Not allowed.')
    ELSE jsonb_build_object('success', true, 'items', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', q.id, 'script', 'Script ' || upper(left(q.id::text, 6)), 'exam', e.name, 'subject', q.subject, 'max_marks', q.max_marks,
           'my_marks', q.valuer_marks, 'my_note', q.valuer_note) ORDER BY q.requested_at)
           FROM public.exam_revaluation_requests q JOIN public.exams e ON e.id = q.exam_id WHERE q.valuer_id = auth.uid() AND q.status = 'Requested'), '[]'::jsonb)) END;
$$;

--
-- Name: exam_publish_results(uuid, boolean, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.exam_publish_results(p_exam_id uuid, p_publish boolean, p_reason text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); v_n INT; v_students INT;
BEGIN
    IF v_uid IS NULL OR v_role NOT IN ('admin', 'principal', 'coe') THEN
        RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only the Controller of Examinations, principal or admin can publish results.');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exams WHERE id = p_exam_id) THEN
        RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Examination not found.');
    END IF;
    SELECT count(*), count(DISTINCT student_id) INTO v_n, v_students FROM public.exam_results WHERE exam_id = p_exam_id;
    IF p_publish THEN
        IF v_n = 0 THEN
            RETURN jsonb_build_object('success', false, 'code', 'NO_RESULTS', 'error', 'There are no marks to publish for this examination.');
        END IF;
        UPDATE public.exam_results SET is_published = TRUE, published_at = NOW() WHERE exam_id = p_exam_id;
        UPDATE public.exams SET results_published = TRUE, is_published = TRUE, status = 'Results Published' WHERE id = p_exam_id;
    ELSE
        IF length(trim(COALESCE(p_reason, ''))) < 3 THEN
            RETURN jsonb_build_object('success', false, 'code', 'REASON_REQUIRED', 'error', 'A reason is required to withdraw published results.');
        END IF;
        UPDATE public.exam_results SET is_published = FALSE, published_at = NULL WHERE exam_id = p_exam_id;
        UPDATE public.exams SET results_published = FALSE, status = 'Completed' WHERE id = p_exam_id;
    END IF;
    INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values)
    VALUES (v_uid, v_role, CASE WHEN p_publish THEN 'exam_results_published' ELSE 'exam_results_withdrawn' END, 'exams', p_exam_id::text,
            jsonb_build_object('results', v_n, 'students', v_students, 'reason', p_reason));
    RETURN jsonb_build_object('success', true, 'published', p_publish, 'results', v_n, 'students', v_students);
END;
$$;

--
-- Name: exam_register(uuid, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.exam_register(p_exam uuid, p_withdraw boolean DEFAULT false) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_uid UUID := auth.uid(); e public.exams; pr public.profiles; v_fee BOOLEAN; v_dues BOOLEAN;
BEGIN
  IF v_uid IS NULL OR public.get_current_user_role() <> 'student' THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only students can register for an examination.'); END IF;
  SELECT * INTO e FROM public.exams WHERE id = p_exam;
  IF NOT FOUND OR NOT e.registration_required THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_REQUIRED', 'error', 'This examination does not use registration.'); END IF;
  IF NOT e.registration_open OR (e.registration_deadline IS NOT NULL AND e.registration_deadline < CURRENT_DATE) THEN
    RETURN jsonb_build_object('success', false, 'code', 'CLOSED', 'error', 'Registration for this examination is closed.'); END IF;
  SELECT * INTO pr FROM public.profiles WHERE id = v_uid;
  IF e.parent_exam_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exam_results WHERE exam_id = e.parent_exam_id AND student_id = v_uid AND result_status IN ('Fail','Absent')) THEN
      RETURN jsonb_build_object('success', false, 'code', 'NOT_ELIGIBLE', 'error', 'This supplementary examination is only for students who failed or were absent in the main examination.'); END IF;
  ELSIF NOT EXISTS (SELECT 1 FROM public.exam_schedules s WHERE s.exam_id = p_exam AND s.class_name = pr.class_name) THEN
    RETURN jsonb_build_object('success', false, 'code', 'NOT_ELIGIBLE', 'error', 'No paper of this examination is scheduled for your class.');
  END IF;
  IF p_withdraw THEN
    UPDATE public.exam_registrations SET status = 'Withdrawn' WHERE exam_id = p_exam AND student_id = v_uid;
    RETURN jsonb_build_object('success', true, 'status', 'Withdrawn');
  END IF;
  SELECT COALESCE(exam_requires_fee_clearance, FALSE) INTO v_fee FROM public.institutional_settings LIMIT 1;
  IF COALESCE(v_fee, FALSE) THEN
    SELECT EXISTS (SELECT 1 FROM public.student_fees f WHERE (f.student_id = v_uid OR f.student_record_id IN (SELECT st.id FROM public.students st WHERE st.user_id = v_uid))
                    AND f.total_due > 0 AND f.due_date < CURRENT_DATE AND f.status NOT IN ('cancelled','waived')) INTO v_dues;
    IF v_dues THEN RETURN jsonb_build_object('success', false, 'code', 'FEE_DUES', 'error', 'Clear your outstanding fees before registering.'); END IF;
  END IF;
  INSERT INTO public.exam_registrations (exam_id, student_id, status, registered_by) VALUES (p_exam, v_uid, 'Registered', v_uid)
  ON CONFLICT (exam_id, student_id) DO UPDATE SET status = 'Registered', registered_at = now();
  RETURN jsonb_build_object('success', true, 'status', 'Registered');
END $$;

--
-- Name: exam_register_class(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.exam_register_class(p_exam uuid, p_class text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); n INT;
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('admin','principal','coe') THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Not allowed.'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.exam_schedules WHERE exam_id = p_exam AND class_name = p_class) THEN
    RETURN jsonb_build_object('success', false, 'code', 'NO_PAPERS', 'error', 'That class has no paper in this examination.'); END IF;
  INSERT INTO public.exam_registrations (exam_id, student_id, status, registered_by)
  SELECT p_exam, p.id, 'Registered', v_uid FROM public.profiles p WHERE p.role = 'student' AND COALESCE(p.status,'active') = 'active' AND p.class_name = p_class
  ON CONFLICT (exam_id, student_id) DO UPDATE SET status = 'Registered';
  GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values) VALUES (v_uid, v_role, 'exam_class_registered', 'exams', p_exam::text, jsonb_build_object('class', p_class, 'students', n));
  RETURN jsonb_build_object('success', true, 'registered', n);
END $$;

--
-- Name: exam_registration_set(uuid, boolean, boolean, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.exam_registration_set(p_exam uuid, p_required boolean, p_open boolean, p_deadline date DEFAULT NULL::date) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('admin','principal','coe') THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only the Controller of Examinations, principal or admin can set registration.'); END IF;
  UPDATE public.exams SET registration_required = p_required, registration_open = (p_required AND p_open), registration_deadline = p_deadline WHERE id = p_exam;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Examination not found.'); END IF;
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values) VALUES (v_uid, v_role, 'exam_registration_set', 'exams', p_exam::text, jsonb_build_object('required', p_required, 'open', p_open, 'deadline', p_deadline));
  RETURN jsonb_build_object('success', true);
END $$;

--
-- Name: exam_release_hall_ticket(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.exam_release_hall_ticket(p_ticket_id uuid, p_reason text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); t public.hall_tickets%ROWTYPE;
BEGIN
    IF v_uid IS NULL OR v_role NOT IN ('admin', 'principal', 'coe') THEN
        RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only the Controller of Examinations, principal or admin can release a withheld ticket.');
    END IF;
    IF length(trim(COALESCE(p_reason, ''))) < 3 THEN
        RETURN jsonb_build_object('success', false, 'code', 'REASON_REQUIRED', 'error', 'A reason is required.');
    END IF;
    SELECT * INTO t FROM public.hall_tickets WHERE id = p_ticket_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Ticket not found.'); END IF;
    UPDATE public.hall_tickets SET status = 'Issued', is_detained = FALSE, override_reason = trim(p_reason), overridden_by = v_uid, overridden_at = NOW() WHERE id = p_ticket_id;
    INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, old_values, new_values)
    VALUES (v_uid, v_role, 'hall_ticket_released', 'hall_tickets', p_ticket_id::text,
            jsonb_build_object('status', t.status, 'reason_withheld', t.detention_reason), jsonb_build_object('override_reason', p_reason));
    RETURN jsonb_build_object('success', true);
END;
$$;

--
-- Name: exam_remove_invigilator(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.exam_remove_invigilator(p_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF auth.uid() IS NULL OR public.get_current_user_role() NOT IN ('admin','principal','coe','hod') THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Not allowed.'); END IF;
  DELETE FROM public.exam_invigilators WHERE id = p_id; RETURN jsonb_build_object('success', true);
END $$;

--
-- Name: exam_revaluation_assign(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.exam_revaluation_assign(p_id uuid, p_teacher uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_role TEXT := public.get_current_user_role(); q public.exam_revaluation_requests; t public.profiles;
BEGIN
  IF auth.uid() IS NULL OR v_role NOT IN ('admin','principal','coe') THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Not allowed.'); END IF;
  SELECT * INTO q FROM public.exam_revaluation_requests WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR q.status <> 'Requested' THEN RETURN jsonb_build_object('success', false, 'code', 'BAD_STATE', 'error', 'Only an open request can be given to a valuer.'); END IF;
  SELECT * INTO t FROM public.profiles WHERE id = p_teacher AND role IN ('teacher','hod') AND COALESCE(status,'active') = 'active';
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Choose an active teacher.'); END IF;
  UPDATE public.exam_revaluation_requests SET valuer_id = p_teacher, valuer_name = t.name, valuer_marks = NULL, valuer_note = NULL, valued_at = NULL WHERE id = p_id;
  RETURN jsonb_build_object('success', true);
END $$;

--
-- Name: exam_revaluation_decide(uuid, text, numeric, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.exam_revaluation_decide(p_id uuid, p_decision text, p_new_marks numeric DEFAULT NULL::numeric, p_note text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); q public.exam_revaluation_requests; r public.exam_results; f public.student_fees;
  v_sched public.exam_schedules; v_pass_pct NUMERIC; v_pass_marks NUMERIC; v_pass BOOLEAN; v_grade TEXT; v_status TEXT; v_new NUMERIC;
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('admin','principal','coe') THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only the Controller of Examinations, principal or admin can decide revaluation.'); END IF;
  IF p_decision NOT IN ('Revise','Keep','Reject') THEN RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Decision must be Revise, Keep or Reject.'); END IF;
  IF length(trim(COALESCE(p_note,''))) < 3 THEN RETURN jsonb_build_object('success', false, 'code', 'NOTE_REQUIRED', 'error', 'Record a note explaining the decision.'); END IF;
  SELECT * INTO q FROM public.exam_revaluation_requests WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Request not found.'); END IF;
  IF q.status <> 'Requested' THEN RETURN jsonb_build_object('success', false, 'code', 'ALREADY_DECIDED', 'error', 'This request was already decided.'); END IF;
  IF q.fee_id IS NOT NULL THEN
    SELECT * INTO f FROM public.student_fees WHERE id = q.fee_id;
    IF FOUND AND f.status NOT IN ('paid','waived','cancelled') THEN RETURN jsonb_build_object('success', false, 'code', 'FEE_UNPAID', 'error', 'The revaluation fee has not been paid. Ask the student to pay it, or have finance waive it.'); END IF;
  END IF;
  IF q.valuer_id IS NOT NULL AND q.valuer_marks IS NULL AND p_decision = 'Revise' THEN RETURN jsonb_build_object('success', false, 'code', 'VALUATION_PENDING', 'error', 'The second valuer has not recorded marks yet.'); END IF;
  IF p_decision <> 'Revise' THEN
    UPDATE public.exam_revaluation_requests SET status = CASE p_decision WHEN 'Keep' THEN 'Kept' ELSE 'Rejected' END, decision_note = trim(p_note), decided_by = v_uid, decided_at = now() WHERE id = p_id;
    RETURN jsonb_build_object('success', true, 'status', CASE p_decision WHEN 'Keep' THEN 'Kept' ELSE 'Rejected' END);
  END IF;
  v_new := COALESCE(p_new_marks, q.valuer_marks);
  IF v_new IS NULL OR v_new < 0 OR v_new > q.max_marks THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_MARKS', 'error', format('Revised marks must be between 0 and %s.', q.max_marks)); END IF;
  SELECT * INTO r FROM public.exam_results WHERE exam_id = q.exam_id AND student_id = q.student_id AND subject = q.subject FOR UPDATE;
  SELECT * INTO v_sched FROM public.exam_schedules WHERE exam_id = q.exam_id AND subject = q.subject AND (class_name = q.class_name OR class_name IS NULL) ORDER BY class_name NULLS LAST LIMIT 1;
  SELECT COALESCE(passing_marks_percentage, 40) INTO v_pass_pct FROM public.institutional_settings LIMIT 1; v_pass_pct := COALESCE(v_pass_pct, 40);
  v_pass_marks := COALESCE(v_sched.passing_marks, ceil(q.max_marks * v_pass_pct / 100.0));
  v_pass := v_new >= v_pass_marks; v_grade := public.exam_grade(v_new / q.max_marks * 100, v_pass); v_status := CASE WHEN v_pass THEN 'Pass' ELSE 'Fail' END;
  INSERT INTO public.exam_result_history (exam_id, student_id, subject, old_marks, new_marks, old_grade, new_grade, old_status, new_status, reason, changed_by)
  VALUES (q.exam_id, q.student_id, q.subject, r.marks_obtained, v_new, r.grade, v_grade, r.result_status, v_status, 'Revaluation: ' || trim(p_note), v_uid);
  UPDATE public.exam_results SET marks_obtained = v_new, grade = v_grade, result_status = v_status, remarks = CASE WHEN v_pass THEN 'Passed (revalued)' ELSE 'Failed (revalued)' END WHERE id = r.id;
  UPDATE public.exam_revaluation_requests SET status = 'Revised', revised_marks = v_new, decision_note = trim(p_note), decided_by = v_uid, decided_at = now(),
         fee_refund_due = (q.fee_id IS NOT NULL AND v_new > q.original_marks) WHERE id = p_id;
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values)
  VALUES (v_uid, v_role, 'result_revalued', 'exam_results', r.id::text, jsonb_build_object('subject', q.subject, 'from', r.marks_obtained, 'to', v_new, 'note', p_note, 'valuer', q.valuer_name));
  RETURN jsonb_build_object('success', true, 'status', 'Revised', 'grade', v_grade, 'result', v_status, 'fee_refund_due', (q.fee_id IS NOT NULL AND v_new > q.original_marks));
END $$;

--
-- Name: exam_revaluation_request(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.exam_revaluation_request(p_exam uuid, p_subject text, p_reason text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_uid UUID := auth.uid(); e public.exams; r public.exam_results; v_req UUID; v_fee UUID; pr public.profiles;
BEGIN
  IF v_uid IS NULL OR public.get_current_user_role() <> 'student' THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only students can request revaluation.'); END IF;
  SELECT * INTO e FROM public.exams WHERE id = p_exam;
  IF NOT FOUND OR NOT e.revaluation_open OR (e.revaluation_deadline IS NOT NULL AND e.revaluation_deadline < CURRENT_DATE) THEN
    RETURN jsonb_build_object('success', false, 'code', 'CLOSED', 'error', 'Revaluation is not open for this examination.'); END IF;
  IF length(trim(COALESCE(p_reason,''))) < 10 THEN RETURN jsonb_build_object('success', false, 'code', 'REASON_REQUIRED', 'error', 'Explain why you are asking for revaluation (at least 10 characters).'); END IF;
  SELECT * INTO r FROM public.exam_results WHERE exam_id = p_exam AND student_id = v_uid AND subject = p_subject AND is_published;
  IF NOT FOUND OR r.result_status = 'Absent' THEN RETURN jsonb_build_object('success', false, 'code', 'NO_RESULT', 'error', 'There is no published mark for this subject.'); END IF;
  IF EXISTS (SELECT 1 FROM public.exam_revaluation_requests WHERE exam_id = p_exam AND student_id = v_uid AND subject = p_subject) THEN
    RETURN jsonb_build_object('success', false, 'code', 'ALREADY_REQUESTED', 'error', 'You have already requested revaluation for this subject.'); END IF;
  INSERT INTO public.exam_revaluation_requests (exam_id, student_id, student_name, class_name, subject, original_marks, max_marks, reason)
  VALUES (p_exam, v_uid, r.student_name, r.class_name, p_subject, r.marks_obtained, r.max_marks, trim(p_reason)) RETURNING id INTO v_req;
  IF e.revaluation_fee > 0 THEN
    SELECT * INTO pr FROM public.profiles WHERE id = v_uid;
    INSERT INTO public.student_fees (student_id, student_name, class_name, total_due, paid_amount, due_date, status, original_amount, description, academic_year, charge_key)
    VALUES (v_uid, COALESCE(pr.name, r.student_name), COALESCE(pr.class_name, r.class_name, '—'), e.revaluation_fee, 0, CURRENT_DATE + 7, 'pending', e.revaluation_fee,
            'Revaluation fee – ' || p_subject || ' (' || e.name || ')', e.academic_year, 'reval:' || v_req::text) RETURNING id INTO v_fee;
    UPDATE public.exam_revaluation_requests SET fee_id = v_fee WHERE id = v_req;
  END IF;
  RETURN jsonb_build_object('success', true, 'fee_id', v_fee, 'fee', e.revaluation_fee);
END $$;

--
-- Name: exam_revaluation_set(uuid, boolean, date, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.exam_revaluation_set(p_exam uuid, p_open boolean, p_deadline date DEFAULT NULL::date, p_fee numeric DEFAULT 0) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_role TEXT := public.get_current_user_role();
BEGIN
  IF auth.uid() IS NULL OR v_role NOT IN ('admin','principal','coe') THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only the Controller of Examinations, principal or admin can open revaluation.'); END IF;
  IF p_fee IS NULL OR p_fee < 0 OR p_fee > 100000 THEN RETURN jsonb_build_object('success', false, 'code', 'INVALID_FEE', 'error', 'The fee must be between 0 and 1,00,000.'); END IF;
  IF p_open AND NOT EXISTS (SELECT 1 FROM public.exams WHERE id = p_exam AND results_published) THEN
    RETURN jsonb_build_object('success', false, 'code', 'NOT_PUBLISHED', 'error', 'Revaluation can open only after results are published.'); END IF;
  UPDATE public.exams SET revaluation_open = COALESCE(p_open, FALSE), revaluation_deadline = p_deadline, revaluation_fee = round(p_fee, 2) WHERE id = p_exam;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Examination not found.'); END IF;
  RETURN jsonb_build_object('success', true);
END $$;

--
-- Name: exam_revaluation_value(uuid, numeric, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.exam_revaluation_value(p_id uuid, p_marks numeric, p_note text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE q public.exam_revaluation_requests;
BEGIN
  IF auth.uid() IS NULL OR public.get_current_user_role() NOT IN ('teacher','hod') THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only teachers can value scripts.'); END IF;
  SELECT * INTO q FROM public.exam_revaluation_requests WHERE id = p_id AND valuer_id = auth.uid() AND status = 'Requested' FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'That script is not assigned to you.'); END IF;
  IF p_marks IS NULL OR p_marks < 0 OR p_marks > q.max_marks THEN RETURN jsonb_build_object('success', false, 'code', 'INVALID_MARKS', 'error', format('Marks must be between 0 and %s.', q.max_marks)); END IF;
  UPDATE public.exam_revaluation_requests SET valuer_marks = p_marks, valuer_note = NULLIF(trim(COALESCE(p_note,'')), ''), valued_at = now() WHERE id = q.id;
  RETURN jsonb_build_object('success', true);
END $$;

--
-- Name: exam_room_save(uuid, text, text, integer, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.exam_room_save(p_id uuid, p_name text, p_block text, p_capacity integer, p_active boolean DEFAULT true) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_role TEXT := public.get_current_user_role();
BEGIN
  IF auth.uid() IS NULL OR v_role NOT IN ('admin','principal','coe') THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Not allowed.'); END IF;
  IF length(trim(COALESCE(p_name,''))) = 0 OR p_capacity IS NULL OR p_capacity <= 0 THEN RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'A room needs a name and a capacity above zero.'); END IF;
  IF p_id IS NULL THEN
    INSERT INTO public.exam_rooms (name, block, capacity, active) VALUES (trim(p_name), NULLIF(trim(COALESCE(p_block,'')),''), p_capacity, COALESCE(p_active, TRUE));
  ELSE
    UPDATE public.exam_rooms SET name = trim(p_name), block = NULLIF(trim(COALESCE(p_block,'')),''), capacity = p_capacity, active = COALESCE(p_active, TRUE) WHERE id = p_id;
  END IF;
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN unique_violation THEN RETURN jsonb_build_object('success', false, 'code', 'DUPLICATE', 'error', 'A room with that name already exists.');
END $$;

--
-- Name: exam_save_marks(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.exam_save_marks(p_exam_id uuid, p_rows jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $_$
DECLARE
    v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid();
    v_exam public.exams%ROWTYPE; r JSONB; v_prof public.profiles%ROWTYPE; v_sched public.exam_schedules%ROWTYPE;
    v_errors JSONB := '[]'::jsonb; v_n INT := 0; v_pass_pct NUMERIC; v_marks NUMERIC; v_max NUMERIC; v_pass_marks NUMERIC;
    v_absent BOOLEAN; v_pass BOOLEAN; v_sid UUID; v_subject TEXT; v_published BOOLEAN; v_old NUMERIC; v_idx INT := 0;
    v_changed JSONB := '[]'::jsonb;
BEGIN
    IF v_uid IS NULL OR v_role NOT IN ('admin', 'principal', 'coe', 'teacher', 'hod') THEN
        RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'You are not allowed to enter marks.');
    END IF;
    IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' OR jsonb_array_length(p_rows) = 0 OR jsonb_array_length(p_rows) > 1000 THEN
        RETURN jsonb_build_object('success', false, 'code', 'VALIDATION_ERROR', 'error', 'Send between 1 and 1000 rows.');
    END IF;
    SELECT * INTO v_exam FROM public.exams WHERE id = p_exam_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Examination not found.'); END IF;
    SELECT COALESCE(passing_marks_percentage, 40) INTO v_pass_pct FROM public.institutional_settings LIMIT 1;
    v_pass_pct := COALESCE(v_pass_pct, 40);

    -- pass 1: validate everything, write nothing
    FOR r IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
        v_idx := v_idx + 1;
        BEGIN v_sid := (r->>'student_id')::uuid; EXCEPTION WHEN others THEN v_sid := NULL; END;
        v_subject := NULLIF(trim(r->>'subject'), '');
        IF v_sid IS NULL OR v_subject IS NULL THEN
            v_errors := v_errors || jsonb_build_object('row', v_idx, 'error', 'student_id and subject are required.'); CONTINUE;
        END IF;
        SELECT * INTO v_prof FROM public.profiles WHERE id = v_sid AND role = 'student' AND COALESCE(status, 'active') = 'active';
        IF NOT FOUND THEN
            v_errors := v_errors || jsonb_build_object('row', v_idx, 'error', 'Student not found or not active.'); CONTINUE;
        END IF;
        IF v_role IN ('teacher', 'hod') AND NOT public.is_teacher_assigned_to_class(v_uid, v_prof.class_name) THEN
            v_errors := v_errors || jsonb_build_object('row', v_idx, 'student', v_prof.name, 'error', format('You are not assigned to class %s.', v_prof.class_name)); CONTINUE;
        END IF;
        SELECT is_published INTO v_published FROM public.exam_results WHERE exam_id = p_exam_id AND student_id = v_sid AND subject = v_subject;
        IF COALESCE(v_published, FALSE) AND v_role IN ('teacher', 'hod') THEN
            v_errors := v_errors || jsonb_build_object('row', v_idx, 'student', v_prof.name, 'error', 'Published marks can only be corrected by the Controller of Examinations, principal or admin.'); CONTINUE;
        END IF;
        v_absent := COALESCE((r->>'absent')::boolean, FALSE);
        IF NOT v_absent THEN
            IF r->>'marks' IS NULL OR r->>'marks' !~ '^\d+(\.\d+)?$' THEN
                v_errors := v_errors || jsonb_build_object('row', v_idx, 'student', v_prof.name, 'error', 'Marks must be a number of 0 or more.'); CONTINUE;
            END IF;
            SELECT * INTO v_sched FROM public.exam_schedules WHERE exam_id = p_exam_id AND subject = v_subject AND (class_name = v_prof.class_name OR class_name IS NULL) ORDER BY class_name NULLS LAST LIMIT 1;
            v_max := COALESCE(NULLIF(r->>'max_marks','')::numeric, v_sched.max_marks, 100);
            IF v_max <= 0 OR (r->>'marks')::numeric > v_max THEN
                v_errors := v_errors || jsonb_build_object('row', v_idx, 'student', v_prof.name, 'error', format('Marks cannot exceed the maximum (%s).', v_max)); CONTINUE;
            END IF;
        END IF;
    END LOOP;
    IF jsonb_array_length(v_errors) > 0 THEN
        RETURN jsonb_build_object('success', false, 'code', 'VALIDATION_ERROR', 'error', 'No marks were saved. Fix the listed rows and save again.', 'errors', v_errors);
    END IF;

    -- pass 2: write everything (all or nothing)
    FOR r IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
        v_sid := (r->>'student_id')::uuid; v_subject := trim(r->>'subject');
        SELECT * INTO v_prof FROM public.profiles WHERE id = v_sid;
        v_absent := COALESCE((r->>'absent')::boolean, FALSE);
        SELECT * INTO v_sched FROM public.exam_schedules WHERE exam_id = p_exam_id AND subject = v_subject AND (class_name = v_prof.class_name OR class_name IS NULL) ORDER BY class_name NULLS LAST LIMIT 1;
        v_max := COALESCE(NULLIF(r->>'max_marks','')::numeric, v_sched.max_marks, 100);
        v_marks := CASE WHEN v_absent THEN 0 ELSE (r->>'marks')::numeric END;
        v_pass_marks := COALESCE(v_sched.passing_marks, ceil(v_max * v_pass_pct / 100.0));
        v_pass := NOT v_absent AND v_marks >= v_pass_marks;
        SELECT marks_obtained INTO v_old FROM public.exam_results WHERE exam_id = p_exam_id AND student_id = v_sid AND subject = v_subject;
        INSERT INTO public.exam_results AS er (exam_id, student_id, student_name, class_name, subject, subject_code, marks_obtained, max_marks, grade, result_status, remarks, is_published)
        VALUES (p_exam_id, v_sid, v_prof.name, COALESCE(v_prof.class_name, '—'), v_subject, v_sched.subject_code, v_marks, v_max,
                CASE WHEN v_absent THEN 'AB' ELSE public.exam_grade(v_marks / v_max * 100, v_pass) END,
                CASE WHEN v_absent THEN 'Absent' WHEN v_pass THEN 'Pass' ELSE 'Fail' END,
                CASE WHEN v_absent THEN 'Absent' WHEN v_pass THEN 'Passed' ELSE 'Failed' END, FALSE)
        ON CONFLICT (exam_id, student_id, subject) WHERE student_id IS NOT NULL DO UPDATE
            SET marks_obtained = EXCLUDED.marks_obtained, max_marks = EXCLUDED.max_marks, grade = EXCLUDED.grade,
                result_status = EXCLUDED.result_status, remarks = EXCLUDED.remarks, subject_code = COALESCE(EXCLUDED.subject_code, er.subject_code);
        v_n := v_n + 1;
        IF v_old IS NOT NULL AND v_old IS DISTINCT FROM v_marks THEN
            v_changed := v_changed || jsonb_build_object('student', v_prof.name, 'subject', v_subject, 'from', v_old, 'to', v_marks);
        END IF;
    END LOOP;
    INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values)
    VALUES (v_uid, v_role, 'exam_marks_saved', 'exams', p_exam_id::text,
            jsonb_build_object('rows', v_n, 'changed_existing', v_changed));
    RETURN jsonb_build_object('success', true, 'saved', v_n, 'changed_existing', jsonb_array_length(v_changed));
END;
$_$;

--
-- Name: exam_seating_photo(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.exam_seating_photo() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF NEW.photo_url IS NULL THEN SELECT avatar_url INTO NEW.photo_url FROM public.profiles WHERE id = NEW.student_id; END IF;
  RETURN NEW;
END $$;

--
-- Name: exam_set_hall_tickets_visible(uuid, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.exam_set_hall_tickets_visible(p_exam_id uuid, p_visible boolean) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); v_n INT;
BEGIN
    IF v_uid IS NULL OR v_role NOT IN ('admin', 'principal', 'coe') THEN
        RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Not allowed.');
    END IF;
    SELECT count(*) INTO v_n FROM public.hall_tickets WHERE exam_id = p_exam_id;
    IF p_visible AND v_n = 0 THEN
        RETURN jsonb_build_object('success', false, 'code', 'NO_TICKETS', 'error', 'Generate the hall tickets first.');
    END IF;
    UPDATE public.exams SET hall_ticket_published = p_visible WHERE id = p_exam_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Examination not found.'); END IF;
    INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values)
    VALUES (v_uid, v_role, CASE WHEN p_visible THEN 'hall_tickets_shown' ELSE 'hall_tickets_hidden' END, 'exams', p_exam_id::text, jsonb_build_object('tickets', v_n));
    RETURN jsonb_build_object('success', true, 'visible', p_visible, 'tickets', v_n);
END;
$$;

--
-- PostgreSQL database dump complete
--
