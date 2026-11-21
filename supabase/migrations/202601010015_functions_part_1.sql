-- Functions and RPCs, part 1 of 6
-- Generated from the verified schema. Run as is; do not edit. Safe to run once on an EMPTY database.
SET check_function_bodies = false;
SET search_path = public, extensions;

SET check_function_bodies = false;

--
-- Name: _cert_make(public.students, text, text, text, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._cert_make(p_student public.students, p_type text, p_purpose text, p_details text, p_status text, p_by uuid) RETURNS public.certificates
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE c public.certificates; n TEXT;
BEGIN
  n := 'CERT-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.certificate_number_seq')::text, 6, '0');
  INSERT INTO public.certificates (certificate_type, student_id, student_name, roll_number, class_name, department, purpose, details, status, certificate_number, qr_code_hash, decided_by, decided_at)
  VALUES (p_type, p_student.user_id, p_student.name, COALESCE(p_student.roll_number, p_student.student_id), p_student.class_name, p_student.department, p_purpose, p_details, p_status, n,
          encode(sha256(convert_to(n || ':' || p_student.id::text || ':' || p_type, 'UTF8')), 'hex'),
          CASE WHEN p_status = 'Issued' THEN p_by END, CASE WHEN p_status = 'Issued' THEN now() END)
  RETURNING * INTO c;
  RETURN c;
END $$;

--
-- Name: _fee_payment_reverse(uuid, text, uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._fee_payment_reverse(p_payment uuid, p_reason text, p_actor uuid, p_amount numeric DEFAULT NULL::numeric) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE p public.fee_payments; f public.student_fees; v_amt NUMERIC; v_left NUMERIC; v_paid NUMERIC; v_due NUMERIC; v_status TEXT; v_full BOOLEAN;
BEGIN
  SELECT * INTO p FROM public.fee_payments WHERE id = p_payment FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Payment not found.'); END IF;
  IF p.status <> 'Completed' THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_REVERSIBLE', 'error', 'Only a completed payment can be reversed (this one is ' || lower(p.status) || ').'); END IF;
  v_left := p.amount - p.refunded_amount;
  v_amt := round(COALESCE(p_amount, v_left), 2);
  IF v_amt IS NULL OR v_amt <= 0 THEN RETURN jsonb_build_object('success', false, 'code', 'INVALID_AMOUNT', 'error', 'Refund amount must be above zero.'); END IF;
  IF v_amt > v_left THEN RETURN jsonb_build_object('success', false, 'code', 'EXCEEDS_PAYMENT', 'error', format('Only %s of this payment can still be refunded.', v_left)); END IF;
  SELECT * INTO f FROM public.student_fees WHERE id = p.student_fee_id FOR UPDATE;
  v_paid := GREATEST(0, f.paid_amount - v_amt); v_due := f.total_due + v_amt;
  v_status := CASE WHEN v_paid > 0 THEN 'partially_paid' WHEN f.due_date < CURRENT_DATE THEN 'overdue' ELSE 'pending' END;
  v_full := (p.refunded_amount + v_amt) >= p.amount;
  UPDATE public.student_fees SET paid_amount = v_paid, total_due = v_due, status = v_status WHERE id = f.id;
  UPDATE public.fee_payments SET refunded_amount = refunded_amount + v_amt,
         status = CASE WHEN v_full THEN 'Reversed' ELSE status END,
         reversed_at = CASE WHEN v_full THEN now() ELSE reversed_at END, reversed_by = p_actor,
         reversal_reason = CASE WHEN reversal_reason IS NULL THEN trim(p_reason) ELSE reversal_reason || ' | ' || trim(p_reason) END WHERE id = p.id;
  IF v_full THEN UPDATE public.fee_receipts SET voided_at = now(), void_reason = trim(p_reason) WHERE id = p.receipt_id; END IF;
  INSERT INTO public.finance_transactions (type, amount, department, description, status)
  VALUES ('Fee Refund', v_amt, 'Academic Fees', format('%s of payment %s (%s): %s', CASE WHEN v_full THEN 'Reversal' ELSE 'Partial refund' END, COALESCE(p.transaction_reference, p.id::text), p.payment_mode, trim(p_reason)), 'Approved');
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
  VALUES (p_actor, 'fee_payment_reversed', 'fee_payments', p.id::text, jsonb_build_object('fee_status', f.status, 'paid', f.paid_amount, 'due', f.total_due),
          jsonb_build_object('fee_status', v_status, 'paid', v_paid, 'due', v_due, 'amount', v_amt, 'full', v_full, 'reason', p_reason));
  RETURN jsonb_build_object('success', true, 'fee_status', v_status, 'balance_due', v_due, 'refunded', v_amt, 'full', v_full);
END $$;

--
-- Name: _fee_reminders_core(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._fee_reminders_core(p_days_ahead integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE f RECORD; v_type TEXT; v_sent INT := 0; v_skipped INT := 0; v_uid UUID; v_title TEXT; v_msg TEXT; v_prio TEXT;
BEGIN
  p_days_ahead := LEAST(GREATEST(COALESCE(p_days_ahead, 7), 0), 30);
  FOR f IN SELECT sf.* FROM public.student_fees sf JOIN public.profiles p ON p.id = sf.student_id AND p.status = 'active'
            WHERE sf.total_due > 0 AND sf.status NOT IN ('paid','waived','cancelled') AND sf.due_date <= CURRENT_DATE + p_days_ahead LOOP
    v_type := CASE WHEN f.due_date < CURRENT_DATE THEN 'overdue_escalation' WHEN f.due_date = CURRENT_DATE THEN 'due_date' ELSE 'upcoming' END;
    IF EXISTS (SELECT 1 FROM public.fee_payment_reminders r WHERE r.student_fee_id = f.id AND r.reminder_type = v_type
                 AND r.sent_at > now() - CASE WHEN v_type = 'overdue_escalation' THEN interval '7 days' ELSE interval '3 days' END) THEN
      v_skipped := v_skipped + 1; CONTINUE; END IF;
    INSERT INTO public.fee_payment_reminders(student_id, student_fee_id, student_name, roll_number, reminder_type, due_date, amount_due, channels, delivery_status)
    VALUES (f.student_id, f.id, f.student_name, COALESCE(f.student_code, ''), v_type, f.due_date, f.total_due, 'In_App,Email,SMS', 'Sent');
    v_title := CASE WHEN v_type = 'overdue_escalation' THEN 'Fee overdue' ELSE 'Fee due soon' END;
    v_msg := COALESCE(f.description, 'Fee') || ' of ₹' || f.total_due || CASE WHEN f.due_date < CURRENT_DATE THEN ' was due on ' ELSE ' is due on ' END || f.due_date || '.';
    v_prio := CASE WHEN v_type = 'overdue_escalation' THEN 'high' ELSE 'medium' END;
    FOR v_uid IN SELECT f.student_id UNION SELECT l.parent_id FROM public.parent_student_links l WHERE l.student_id = f.student_id LOOP
      INSERT INTO public.notifications(user_id, title, message, type, priority) VALUES (v_uid, v_title, v_msg, CASE WHEN v_type = 'overdue_escalation' THEN 'warning' ELSE 'info' END, v_prio);
    END LOOP;
    v_sent := v_sent + 1;
  END LOOP;
  RETURN jsonb_build_object('success', true, 'sent', v_sent, 'skipped', v_skipped);
END $$;

--
-- Name: _inventory_check(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._inventory_check(p_qty integer) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF auth.uid() IS NULL OR public.get_current_user_role() NOT IN ('storekeeper','store_manager','admin') THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only store staff can move inventory.'); END IF;
  IF p_qty IS NULL OR p_qty <= 0 OR p_qty > 100000 THEN RETURN jsonb_build_object('success', false, 'code', 'INVALID_QTY', 'error', 'Quantity must be a whole number above zero.'); END IF;
  RETURN NULL;
END $$;

--
-- Name: _inventory_urgency(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._inventory_urgency(p_stock integer, p_min integer) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT CASE WHEN p_stock <= 0 THEN 'critical' WHEN p_min IS NOT NULL AND p_stock <= p_min THEN 'high' WHEN p_min IS NOT NULL AND p_stock <= p_min * 2 THEN 'medium' ELSE 'low' END
$$;

--
-- Name: _notify_check(text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._notify_check(p_title text, p_message text, p_type text, p_priority text) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Sign in first.'); END IF;
  IF public.get_current_user_role() IN ('student','parent') OR public.get_current_user_role() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only staff can send notifications to others.'); END IF;
  IF length(trim(COALESCE(p_title,''))) = 0 OR length(p_title) > 200 OR length(COALESCE(p_message,'')) > 2000 THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Title is required (max 200) and message at most 2000 characters.'); END IF;
  IF p_type NOT IN ('info','warning','error','success') OR p_priority NOT IN ('low','medium','high') THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Invalid type or priority.'); END IF;
  RETURN NULL;
END $$;

--
-- Name: _parent_has_child_in(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._parent_has_child_in(p_class text, p_department text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT EXISTS (SELECT 1 FROM public.parent_student_links l JOIN public.profiles st ON st.id = l.student_id
                  WHERE l.parent_id = auth.uid() AND (p_class IS NULL OR st.class_name = p_class) AND (p_department IS NULL OR st.department = p_department));
$$;

--
-- Name: _student_dues(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._student_dues(p_user uuid) RETURNS numeric
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT COALESCE(sum(total_due), 0) FROM public.student_fees WHERE student_id = p_user AND total_due > 0 AND status NOT IN ('paid','waived','cancelled');
$$;

--
-- Name: acknowledge_password_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.acknowledge_password_change() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Sign in first.'); END IF;
  UPDATE public.profiles SET requires_password_change = FALSE, is_first_login = FALSE WHERE id = auth.uid();
  RETURN jsonb_build_object('success', true);
END $$;

--
-- Name: admission_apply_merit(text, text, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admission_apply_merit(p_course text, p_academic_year text, p_quota text, p_actor uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE m RECORD; v_app_status TEXT; r JSONB; v_ok INT := 0; v_skip JSONB := '[]'::jsonb; v_target TEXT;
        v_year TEXT := NULLIF(trim(p_academic_year), ''); v_quota TEXT := NULLIF(trim(p_quota), '');
BEGIN
    PERFORM set_config('app.merit_apply', 'on', true);        -- lets merit-route applications be approved
    FOR m IN SELECT * FROM public.admission_merit_lists
              WHERE course_name = p_course AND application_id IS NOT NULL AND (v_year IS NULL OR academic_year = v_year)
                AND (v_quota IS NULL OR quota = v_quota) ORDER BY rank LOOP
        SELECT status INTO v_app_status FROM public.admission_applications WHERE id = m.application_id;
        v_target := CASE WHEN m.status = 'Selected' THEN 'Approved' ELSE 'Waitlisted' END;
        IF v_app_status = v_target THEN CONTINUE; END IF;
        IF v_app_status NOT IN ('Under Review', 'Waitlisted') OR (v_app_status = 'Waitlisted' AND v_target = 'Waitlisted') THEN
            v_skip := v_skip || jsonb_build_object('application_id', m.application_id, 'name', m.student_name, 'reason', format('application is already %s', v_app_status));
            CONTINUE;
        END IF;
        r := public.admission_set_status(m.application_id, v_target, format('Merit list rank %s (score %s)', m.rank, m.merit_score), p_actor);
        IF (r->>'success')::boolean THEN v_ok := v_ok + 1;
        ELSE v_skip := v_skip || jsonb_build_object('application_id', m.application_id, 'name', m.student_name, 'reason', r->>'error');
        END IF;
    END LOOP;
    PERFORM set_config('app.merit_apply', 'off', true);
    RETURN jsonb_build_object('success', true, 'updated', v_ok, 'skipped', v_skip);
END;
$$;

--
-- Name: admission_enroll(uuid, uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admission_enroll(p_application_id uuid, p_actor uuid, p_department text DEFAULT NULL::text, p_class_name text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_app public.admission_applications%ROWTYPE; v_stu public.students%ROWTYPE; v_rejected INT; v_linked BOOLEAN := FALSE;
BEGIN
    SELECT * INTO v_app FROM public.admission_applications WHERE id = p_application_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Application not found.');
    END IF;
    IF v_app.status = 'Enrolled' AND v_app.student_record_id IS NOT NULL THEN
        SELECT * INTO v_stu FROM public.students WHERE id = v_app.student_record_id;
        RETURN jsonb_build_object('success', true, 'already_enrolled', true, 'student_record_id', v_app.student_record_id, 'student_id', v_stu.student_id);
    END IF;
    IF v_app.status NOT IN ('Approved','Offered') THEN
        RETURN jsonb_build_object('success', false, 'code', 'NOT_APPROVED',
            'error', format('Only Approved or Offered applications can be enrolled (current: %s).', v_app.status));
    END IF;
    SELECT count(*) INTO v_rejected FROM public.admission_document_verifications
     WHERE application_id = p_application_id AND status = 'Rejected' AND document_type <> 'APPLICATION_METADATA';
    IF v_rejected > 0 THEN
        RETURN jsonb_build_object('success', false, 'code', 'DOCUMENTS_REJECTED', 'error', 'Rejected documents must be resolved first.');
    END IF;
    IF length(trim(COALESCE(v_app.application_number, ''))) = 0 THEN
        RETURN jsonb_build_object('success', false, 'code', 'STUDENT_ID_REQUIRED', 'error', 'The application has no student id.');
    END IF;

    SELECT * INTO v_stu FROM public.students WHERE student_id = v_app.application_number FOR UPDATE;
    IF FOUND THEN
        IF EXISTS (SELECT 1 FROM public.admission_applications WHERE student_record_id = v_stu.id AND id <> v_app.id) THEN
            RETURN jsonb_build_object('success', false, 'code', 'DUPLICATE_STUDENT_ID',
                'error', format('Student id %s already belongs to another enrolled application.', v_app.application_number));
        END IF;
        v_linked := TRUE;
        UPDATE public.students SET admission_quota = COALESCE(admission_quota, v_app.quota),
               admission_type = COALESCE(admission_type, v_app.admission_type),
               entry_academic_year = COALESCE(entry_academic_year, v_app.academic_year), updated_at = NOW()
         WHERE id = v_stu.id RETURNING * INTO v_stu;
    ELSE
        INSERT INTO public.students (student_id, roll_number, name, email, department, class_name, admission_date, status, phone,
                                     admission_quota, admission_type, entry_academic_year)
        VALUES (v_app.application_number, v_app.application_number, v_app.applicant_name, NULLIF(v_app.email, ''),
                COALESCE(NULLIF(trim(p_department), ''), v_app.class_name), COALESCE(NULLIF(trim(p_class_name), ''), v_app.class_name),
                CURRENT_DATE, 'active', NULLIF(v_app.phone, ''), v_app.quota, v_app.admission_type, v_app.academic_year)
        RETURNING * INTO v_stu;
    END IF;

    UPDATE public.admission_applications
       SET status = 'Enrolled', student_record_id = v_stu.id, enrolled_at = NOW(), enrolled_by = p_actor,
           status_updated_at = NOW(), status_updated_by = p_actor, updated_at = NOW()
     WHERE id = v_app.id;
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
    VALUES (p_actor, 'admission_enrolled', 'admission_applications', v_app.id::text, jsonb_build_object('status', v_app.status),
            jsonb_build_object('student_record_id', v_stu.id, 'student_id', v_stu.student_id, 'linked_existing', v_linked));
    RETURN jsonb_build_object('success', true, 'already_enrolled', false, 'linked_existing', v_linked,
        'student_record_id', v_stu.id, 'student_id', v_stu.student_id);
END;
$$;

--
-- Name: admission_publish_merit(text, text, integer, integer, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admission_publish_merit(p_course text, p_academic_year text, p_seats integer, p_weight_qualifying integer, p_quota text, p_actor uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_wq INTEGER := p_weight_qualifying; v_we INTEGER; v_seats INTEGER := p_seats; v_quota TEXT := NULLIF(trim(p_quota), '');
    v_excluded JSONB := '[]'::jsonb; v_rows JSONB; v_n INT; v_sel INT; v_year TEXT := NULLIF(trim(p_academic_year), '');
BEGIN
    IF p_course IS NULL OR length(trim(p_course)) = 0 THEN
        RETURN jsonb_build_object('success', false, 'code', 'VALIDATION_ERROR', 'error', 'Course is required.');
    END IF;
    IF v_wq IS NULL OR v_wq < 0 OR v_wq > 100 THEN
        RETURN jsonb_build_object('success', false, 'code', 'VALIDATION_ERROR', 'error', 'The qualifying-marks weight must be between 0 and 100.');
    END IF;
    IF v_seats IS NULL AND v_quota IS NOT NULL AND v_year IS NOT NULL THEN
        SELECT seats INTO v_seats FROM public.admission_seats WHERE course_name = p_course AND academic_year = v_year AND quota_code = v_quota;
    END IF;
    IF v_seats IS NULL OR v_seats < 1 THEN
        RETURN jsonb_build_object('success', false, 'code', 'SEATS_REQUIRED', 'error', 'Enter the number of seats (or set them in the seat matrix for this course, year and quota).');
    END IF;
    v_we := 100 - v_wq;

    DROP TABLE IF EXISTS _cand;
    CREATE TEMP TABLE _cand ON COMMIT DROP AS
    SELECT a.id AS application_id, a.applicant_name, a.application_number, a.merit_category, a.submission_date, a.status, a.quota,
           COALESCE(a.academic_year, v_year, '—') AS academic_year, a.qualifying_marks AS q,
           (SELECT round(t.score / t.max_score * 100, 2) FROM public.admission_entrance_tests t
             WHERE t.application_id = a.id AND t.status = 'Completed' ORDER BY t.test_date DESC LIMIT 1) AS e
      FROM public.admission_applications a
      LEFT JOIN public.admission_routes r ON r.code = a.admission_type
     WHERE a.class_name = p_course
       AND (v_year IS NULL OR a.academic_year = v_year)
       AND (v_quota IS NULL OR a.quota = v_quota)
       AND a.status IN ('Under Review', 'Approved', 'Waitlisted', 'Offered')
       AND (r.code IS NULL OR r.requires_merit);          -- direct / lateral routes are not ranked

    SELECT COALESCE(jsonb_agg(jsonb_build_object('application_id', application_id, 'name', applicant_name,
             'reason', CASE WHEN q IS NOT NULL AND (q < 0 OR q > 100) THEN 'qualifying marks outside 0-100'
                            WHEN v_wq > 0 AND q IS NULL THEN 'no qualifying marks recorded'
                            ELSE 'no completed entrance test' END)), '[]'::jsonb)
      INTO v_excluded FROM _cand
     WHERE (q IS NOT NULL AND (q < 0 OR q > 100)) OR (v_wq > 0 AND q IS NULL) OR (v_we > 0 AND e IS NULL);

    DELETE FROM public.admission_merit_lists
     WHERE course_name = p_course AND application_id IS NOT NULL AND (v_year IS NULL OR academic_year = v_year)
       AND (v_quota IS NULL OR quota = v_quota);

    WITH ranked AS (
        SELECT c.*, round((COALESCE(c.q, 0) * v_wq + COALESCE(c.e, 0) * v_we) / 100.0, 2) AS score,
               row_number() OVER (ORDER BY (COALESCE(c.q, 0) * v_wq + COALESCE(c.e, 0) * v_we) DESC,
                                           c.submission_date ASC NULLS LAST, c.application_number ASC) AS rnk
          FROM _cand c
         WHERE NOT ((c.q IS NOT NULL AND (c.q < 0 OR c.q > 100)) OR (v_wq > 0 AND c.q IS NULL) OR (v_we > 0 AND c.e IS NULL))
    ), ins AS (
        INSERT INTO public.admission_merit_lists (application_id, student_name, course_name, merit_score, rank, category, status, academic_year, quota)
        SELECT application_id, applicant_name, p_course, score, rnk::int, COALESCE(merit_category, 'General'),
               CASE WHEN rnk <= v_seats THEN 'Selected' ELSE 'Waitlist' END, academic_year, quota
          FROM ranked
        RETURNING *
    )
    SELECT COALESCE(jsonb_agg(jsonb_build_object('application_id', application_id, 'name', student_name, 'rank', rank,
             'score', merit_score, 'status', status) ORDER BY rank), '[]'::jsonb),
           count(*), count(*) FILTER (WHERE status = 'Selected')
      INTO v_rows, v_n, v_sel FROM ins;

    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_values)
    VALUES (p_actor, 'admission_merit_published', 'admission_merit_lists', p_course,
            jsonb_build_object('seats', v_seats, 'quota', v_quota, 'weight_qualifying', v_wq, 'weight_entrance', v_we, 'ranked', v_n, 'selected', v_sel));
    RETURN jsonb_build_object('success', true, 'ranked', v_n, 'selected', v_sel, 'waitlisted', v_n - v_sel, 'seats', v_seats,
                              'excluded', v_excluded, 'rows', v_rows, 'weights', jsonb_build_object('qualifying', v_wq, 'entrance', v_we));
END;
$$;

--
-- Name: admission_record_test_result(uuid, text, numeric, numeric, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admission_record_test_result(p_test_id uuid, p_status text, p_score numeric, p_max_score numeric, p_actor uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_t public.admission_entrance_tests%ROWTYPE; v_max NUMERIC;
BEGIN
    IF p_status NOT IN ('Completed', 'Absent') THEN
        RETURN jsonb_build_object('success', false, 'code', 'VALIDATION_ERROR', 'error', 'Status must be Completed or Absent.');
    END IF;
    SELECT * INTO v_t FROM public.admission_entrance_tests WHERE id = p_test_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Test record not found.');
    END IF;
    v_max := COALESCE(p_max_score, v_t.max_score);
    IF v_max IS NULL OR v_max <= 0 THEN
        RETURN jsonb_build_object('success', false, 'code', 'VALIDATION_ERROR', 'error', 'Maximum score must be greater than zero.');
    END IF;
    IF p_status = 'Completed' AND (p_score IS NULL OR p_score < 0 OR p_score > v_max) THEN
        RETURN jsonb_build_object('success', false, 'code', 'VALIDATION_ERROR', 'error', format('Score must be between 0 and %s.', v_max));
    END IF;
    UPDATE public.admission_entrance_tests
       SET status = p_status, score = CASE WHEN p_status = 'Completed' THEN p_score ELSE NULL END,
           max_score = v_max, percentile = NULL, recorded_by = p_actor, updated_at = NOW()
     WHERE id = p_test_id;
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
    VALUES (p_actor, 'admission_test_result', 'admission_entrance_tests', p_test_id::text,
            jsonb_build_object('status', v_t.status, 'score', v_t.score),
            jsonb_build_object('status', p_status, 'score', p_score, 'max', v_max));
    RETURN jsonb_build_object('success', true, 'status', p_status);
END;
$$;

--
-- Name: admission_schedule_tests(uuid[], date, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admission_schedule_tests(p_application_ids uuid[], p_test_date date, p_actor uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE a RECORD; v_t public.admission_entrance_tests%ROWTYPE; v_new INT := 0; v_moved INT := 0; v_skipped JSONB := '[]'::jsonb;
BEGIN
    IF p_test_date IS NULL THEN
        RETURN jsonb_build_object('success', false, 'code', 'VALIDATION_ERROR', 'error', 'A test date is required.');
    END IF;
    IF p_application_ids IS NULL OR cardinality(p_application_ids) = 0 THEN
        RETURN jsonb_build_object('success', false, 'code', 'VALIDATION_ERROR', 'error', 'Select at least one applicant.');
    END IF;
    FOR a IN SELECT * FROM public.admission_applications WHERE id = ANY (p_application_ids) ORDER BY application_number LOOP
        IF a.status IN ('Rejected', 'Cancelled', 'Enrolled') THEN
            v_skipped := v_skipped || jsonb_build_object('application_id', a.id, 'name', a.applicant_name, 'reason', format('application is %s', a.status));
            CONTINUE;
        END IF;
        SELECT * INTO v_t FROM public.admission_entrance_tests WHERE application_id = a.id FOR UPDATE;
        IF FOUND THEN
            IF v_t.status = 'Scheduled' THEN
                UPDATE public.admission_entrance_tests SET test_date = p_test_date, updated_at = NOW() WHERE id = v_t.id;
                v_moved := v_moved + 1;
            ELSE
                v_skipped := v_skipped || jsonb_build_object('application_id', a.id, 'name', a.applicant_name, 'reason', format('test already %s', lower(v_t.status)));
            END IF;
        ELSE
            INSERT INTO public.admission_entrance_tests (application_id, applicant_name, roll_no, test_date, status)
            VALUES (a.id, a.applicant_name, a.application_number, p_test_date, 'Scheduled');
            v_new := v_new + 1;
        END IF;
    END LOOP;
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_values)
    VALUES (p_actor, 'admission_tests_scheduled', 'admission_entrance_tests', NULL,
            jsonb_build_object('date', p_test_date, 'scheduled', v_new, 'rescheduled', v_moved, 'skipped', jsonb_array_length(v_skipped)));
    RETURN jsonb_build_object('success', true, 'scheduled', v_new, 'rescheduled', v_moved, 'skipped', v_skipped);
END;
$$;

--
-- Name: admission_set_status(uuid, text, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admission_set_status(p_application_id uuid, p_new_status text, p_remarks text, p_actor uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_app public.admission_applications%ROWTYPE; v_route public.admission_routes%ROWTYPE; v_allowed TEXT[];
    v_rejected_docs INT; v_pending_docs INT; v_missing TEXT[];
BEGIN
    SELECT * INTO v_app FROM public.admission_applications WHERE id = p_application_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Application not found.');
    END IF;
    IF v_app.status = p_new_status THEN
        RETURN jsonb_build_object('success', true, 'unchanged', true, 'status', v_app.status);
    END IF;
    IF p_new_status = 'Enrolled' THEN
        RETURN jsonb_build_object('success', false, 'code', 'USE_ENROLL', 'error', 'Use the Enroll action to enroll an approved applicant.');
    END IF;
    v_allowed := CASE v_app.status
        WHEN 'Submitted'    THEN ARRAY['Under Review','Rejected','Cancelled']
        WHEN 'Under Review' THEN ARRAY['Approved','Waitlisted','Rejected','Cancelled']
        WHEN 'Waitlisted'   THEN ARRAY['Under Review','Approved','Rejected','Cancelled']
        WHEN 'Approved'     THEN ARRAY['Offered','Under Review','Cancelled']
        WHEN 'Offered'      THEN ARRAY['Approved','Cancelled']
        WHEN 'Rejected'     THEN ARRAY['Under Review']
        ELSE ARRAY[]::TEXT[] END;
    IF NOT (p_new_status = ANY (v_allowed)) THEN
        RETURN jsonb_build_object('success', false, 'code', 'INVALID_TRANSITION',
            'error', format('Cannot move an application from "%s" to "%s".', v_app.status, p_new_status), 'allowed', to_jsonb(v_allowed));
    END IF;

    SELECT count(*) FILTER (WHERE status = 'Rejected'), count(*) FILTER (WHERE status NOT IN ('Verified','Rejected'))
      INTO v_rejected_docs, v_pending_docs
      FROM public.admission_document_verifications WHERE application_id = p_application_id AND document_type <> 'APPLICATION_METADATA';

    IF p_new_status IN ('Approved','Offered') THEN
        IF v_rejected_docs > 0 THEN
            RETURN jsonb_build_object('success', false, 'code', 'DOCUMENTS_REJECTED', 'error', format('%s document(s) are rejected. Resolve them before approving.', v_rejected_docs));
        END IF;
        -- configured required documents must be Verified
        SELECT array_agg(r.doc_type ORDER BY r.sort_order, r.doc_type) INTO v_missing
          FROM public.admission_required_documents r
         WHERE r.active AND r.required AND (r.course_name IS NULL OR r.course_name = v_app.class_name)
           AND NOT EXISTS (SELECT 1 FROM public.admission_document_verifications d
                            WHERE d.application_id = p_application_id AND d.status = 'Verified'
                              AND lower(d.document_type) = lower(r.doc_type));
        IF v_missing IS NOT NULL THEN
            RETURN jsonb_build_object('success', false, 'code', 'DOCUMENTS_INCOMPLETE',
                'error', 'These documents must be verified first: ' || array_to_string(v_missing, ', ') || '.', 'missing', to_jsonb(v_missing));
        END IF;
        -- route rules (applications without a route keep the old behaviour)
        IF v_app.admission_type IS NOT NULL THEN
            SELECT * INTO v_route FROM public.admission_routes WHERE code = v_app.admission_type;
            IF FOUND THEN
                IF v_route.requires_entrance AND NOT EXISTS (
                    SELECT 1 FROM public.admission_entrance_tests t WHERE t.application_id = p_application_id AND t.status = 'Completed') THEN
                    RETURN jsonb_build_object('success', false, 'code', 'ENTRANCE_REQUIRED',
                        'error', format('The "%s" route needs a completed entrance test first.', v_route.name));
                END IF;
                IF v_route.requires_merit AND COALESCE(current_setting('app.merit_apply', true), '') <> 'on' THEN
                    RETURN jsonb_build_object('success', false, 'code', 'MERIT_REQUIRED',
                        'error', format('The "%s" route is approved through the merit list (Merit List tab → Apply to applications).', v_route.name));
                END IF;
            END IF;
        END IF;
    END IF;
    IF p_new_status IN ('Rejected','Cancelled') AND COALESCE(NULLIF(trim(p_remarks), ''), '') = '' THEN
        RETURN jsonb_build_object('success', false, 'code', 'REASON_REQUIRED', 'error', 'A reason is required.');
    END IF;

    UPDATE public.admission_applications SET status = p_new_status, remarks = COALESCE(NULLIF(trim(p_remarks), ''), remarks),
           status_updated_at = NOW(), status_updated_by = p_actor, updated_at = NOW() WHERE id = p_application_id;
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
    VALUES (p_actor, 'admission_status_change', 'admission_applications', p_application_id::text,
            jsonb_build_object('status', v_app.status), jsonb_build_object('status', p_new_status, 'remarks', p_remarks));
    RETURN jsonb_build_object('success', true, 'status', p_new_status, 'pending_documents', v_pending_docs);
END;
$$;

--
-- Name: admission_validate_fields(text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admission_validate_fields(p_course text, p_values jsonb) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $_$
DECLARE f RECORD; v JSONB; txt TEXT; errs JSONB := '[]'::jsonb; cleaned JSONB := '{}'::jsonb;
BEGIN
    p_values := COALESCE(p_values, '{}'::jsonb);
    IF jsonb_typeof(p_values) <> 'object' THEN
        RETURN jsonb_build_object('valid', false, 'errors', jsonb_build_array(jsonb_build_object('field', '_', 'message', 'Custom fields must be an object.')), 'cleaned', '{}'::jsonb);
    END IF;
    FOR f IN SELECT * FROM public.admission_form_fields
              WHERE active AND (course_name IS NULL OR course_name = p_course) ORDER BY sort_order, label LOOP
        v := p_values -> f.field_key;
        txt := CASE WHEN v IS NULL OR jsonb_typeof(v) = 'null' THEN NULL ELSE trim(both '"' from v::text) END;
        IF txt IS NULL OR txt = '' OR (f.field_type = 'checkbox' AND txt = 'false' AND NOT f.required) THEN
            IF f.required AND (f.field_type <> 'checkbox' OR txt IS DISTINCT FROM 'true') THEN
                errs := errs || jsonb_build_object('field', f.field_key, 'message', format('%s is required.', f.label));
            END IF;
            CONTINUE;
        END IF;
        IF length(txt) > 2000 THEN
            errs := errs || jsonb_build_object('field', f.field_key, 'message', format('%s is too long.', f.label)); CONTINUE;
        END IF;
        IF f.field_type = 'number' AND txt !~ '^-?\d+(\.\d+)?$' THEN
            errs := errs || jsonb_build_object('field', f.field_key, 'message', format('%s must be a number.', f.label)); CONTINUE;
        ELSIF f.field_type = 'date' AND txt !~ '^\d{4}-\d{2}-\d{2}$' THEN
            errs := errs || jsonb_build_object('field', f.field_key, 'message', format('%s must be a date (YYYY-MM-DD).', f.label)); CONTINUE;
        ELSIF f.field_type = 'select' AND NOT (txt = ANY (f.options)) THEN
            errs := errs || jsonb_build_object('field', f.field_key, 'message', format('%s must be one of the listed options.', f.label)); CONTINUE;
        ELSIF f.field_type = 'checkbox' AND txt NOT IN ('true', 'false') THEN
            errs := errs || jsonb_build_object('field', f.field_key, 'message', format('%s must be yes or no.', f.label)); CONTINUE;
        END IF;
        cleaned := cleaned || jsonb_build_object(f.field_key, CASE f.field_type WHEN 'number' THEN to_jsonb(txt::numeric)
                                                                                WHEN 'checkbox' THEN to_jsonb(txt::boolean) ELSE to_jsonb(txt) END);
    END LOOP;
    RETURN jsonb_build_object('valid', jsonb_array_length(errs) = 0, 'errors', errs, 'cleaned', cleaned);
END;
$_$;

--
-- Name: announcement_publish(text, text, text, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.announcement_publish(p_title text, p_message text, p_category text DEFAULT 'Circular'::text, p_priority text DEFAULT 'Normal'::text, p_audience text DEFAULT 'All'::text, p_class text DEFAULT NULL::text, p_department text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); v_id UUID; v_roles TEXT[]; v_name TEXT; v_ids UUID[]; v_n INT := 0;
        v_class TEXT := NULLIF(trim(COALESCE(p_class,'')),''); v_dept TEXT := NULLIF(trim(COALESCE(p_department,'')),''); v_prio TEXT; v_type TEXT;
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('admin','principal') THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only admin or principal can publish announcements.'); END IF;
  IF length(trim(COALESCE(p_title,''))) < 3 OR length(trim(COALESCE(p_message,''))) < 3 THEN RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'A title and a message are required.'); END IF;
  IF p_audience NOT IN ('All','Students','Faculty','Parents') THEN RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Choose who should see this.'); END IF;
  IF p_priority NOT IN ('Normal','High','Urgent') THEN p_priority := 'Normal'; END IF;
  v_prio := CASE WHEN p_priority = 'Normal' THEN 'medium' ELSE 'high' END; v_type := CASE WHEN p_priority = 'Urgent' THEN 'warning' ELSE 'info' END;
  IF (v_class IS NOT NULL OR v_dept IS NOT NULL) THEN
    v_ids := ARRAY(
      SELECT st.id FROM public.profiles st WHERE st.role = 'student' AND st.status = 'active' AND p_audience IN ('All','Students')
         AND (v_class IS NULL OR st.class_name = v_class) AND (v_dept IS NULL OR st.department = v_dept)
      UNION
      SELECT l.parent_id FROM public.parent_student_links l JOIN public.profiles st ON st.id = l.student_id
       WHERE p_audience IN ('All','Parents') AND (v_class IS NULL OR st.class_name = v_class) AND (v_dept IS NULL OR st.department = v_dept)
      UNION
      SELECT t.teacher_id FROM public.timetables t WHERE p_audience IN ('All','Faculty') AND t.teacher_id IS NOT NULL AND v_class IS NOT NULL AND lower(trim(t.class_name)) = lower(v_class));
    IF COALESCE(array_length(v_ids, 1), 0) = 0 THEN
      RETURN jsonb_build_object('success', false, 'code', 'NO_RECIPIENTS', 'error', 'Nobody matches that class or department and audience. Check the spelling.'); END IF;
  END IF;
  SELECT name INTO v_name FROM public.profiles WHERE id = v_uid;
  INSERT INTO public.institutional_broadcasts(title, message, category, priority, target_audience, author_name, author_id, target_class, target_department)
  VALUES (trim(p_title), trim(p_message), COALESCE(NULLIF(trim(p_category),''),'Circular'), p_priority, p_audience, COALESCE(v_name,'Office'), v_uid, v_class, v_dept) RETURNING id INTO v_id;
  IF v_ids IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, title, message, type, priority) SELECT x, left(trim(p_title), 200), left(trim(p_message), 2000), v_type, v_prio FROM unnest(v_ids) x;
    v_n := array_length(v_ids, 1);
  ELSE
    v_roles := CASE p_audience WHEN 'Students' THEN ARRAY['student'] WHEN 'Parents' THEN ARRAY['parent'] WHEN 'Faculty' THEN ARRAY['teacher','hod']
      ELSE ARRAY['student','parent','teacher','hod','coe','hr_manager','finance_manager','accountant','financier','librarian','hostel_warden','placement_officer','receptionist','store_manager','storekeeper','naac_coordinator','transport_driver','driver'] END;
    PERFORM public.notify_roles(v_roles, left(trim(p_title), 200), left(trim(p_message), 2000), v_type, v_prio);
  END IF;
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values)
  VALUES (v_uid, v_role, 'announcement_published', 'institutional_broadcasts', v_id::text, jsonb_build_object('audience', p_audience, 'class', v_class, 'department', v_dept, 'title', trim(p_title)));
  RETURN jsonb_build_object('success', true, 'id', v_id, 'recipients', v_n);
END $$;

--
-- Name: app_setting_versions_immutable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.app_setting_versions_immutable() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
    RAISE EXCEPTION 'APP_SETTING_VERSIONS_APPEND_ONLY: release history cannot be changed or deleted.';
END; $$;

--
-- Name: app_settings_draft_merge(text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.app_settings_draft_merge(p_key text, p_patch jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_uid UUID := public.app_settings_require_admin(); v_new JSONB;
BEGIN
    IF jsonb_typeof(p_patch) <> 'object' THEN RAISE EXCEPTION 'VALIDATION_ERROR: patch must be an object.'; END IF;
    PERFORM pg_advisory_xact_lock(hashtext('app_setting_draft:' || p_key));
    INSERT INTO public.app_setting_drafts AS d (key, value, updated_by)
    VALUES (p_key, p_patch, v_uid)
    ON CONFLICT (key) DO UPDATE SET value = public.jsonb_merge_deep(d.value, EXCLUDED.value), updated_by = v_uid, updated_at = NOW()
    RETURNING value INTO v_new;
    RETURN v_new;
END; $$;

--
-- Name: app_settings_draft_save(text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.app_settings_draft_save(p_key text, p_value jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_uid UUID := public.app_settings_require_admin();
BEGIN
    IF jsonb_typeof(p_value) <> 'object' THEN RAISE EXCEPTION 'VALIDATION_ERROR: value must be an object.'; END IF;
    PERFORM pg_advisory_xact_lock(hashtext('app_setting_draft:' || p_key));
    INSERT INTO public.app_setting_drafts (key, value, updated_by) VALUES (p_key, p_value, v_uid)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = v_uid, updated_at = NOW();
    RETURN p_value;
END; $$;

--
-- Name: app_settings_publish(text, jsonb, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.app_settings_publish(p_key text, p_value jsonb, p_summary text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_uid UUID := public.app_settings_require_admin(); v_ver INTEGER; v_email TEXT;
BEGIN
    IF jsonb_typeof(p_value) <> 'object' THEN RAISE EXCEPTION 'VALIDATION_ERROR: value must be an object.'; END IF;
    PERFORM pg_advisory_xact_lock(hashtext('app_setting:' || p_key));
    SELECT COALESCE(max(version), 0) + 1 INTO v_ver FROM public.app_setting_versions WHERE key = p_key;
    SELECT email INTO v_email FROM public.profiles WHERE id = v_uid;
    INSERT INTO public.app_setting_versions (key, version, value, summary, kind, published_by, published_by_email)
    VALUES (p_key, v_ver, p_value, NULLIF(trim(p_summary), ''), 'publish', v_uid, v_email);
    INSERT INTO public.app_settings AS s (key, value, version, updated_by) VALUES (p_key, p_value, v_ver, v_uid)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, version = EXCLUDED.version, updated_by = v_uid, updated_at = NOW();
    DELETE FROM public.app_setting_drafts WHERE key = p_key;
    INSERT INTO public.audit_logs (user_id, user_email, user_role, action, entity_type, entity_id, new_values)
    VALUES (v_uid, v_email, 'admin', 'settings_published', 'app_settings', p_key, jsonb_build_object('version', v_ver, 'summary', p_summary));
    RETURN jsonb_build_object('success', true, 'version', v_ver);
END; $$;

--
-- Name: app_settings_require_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.app_settings_require_admin() RETURNS uuid
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
    IF auth.uid() IS NULL OR public.get_current_user_role() <> 'admin' THEN
        RAISE EXCEPTION 'FORBIDDEN: only an administrator can change application settings.' USING ERRCODE = '42501';
    END IF;
    RETURN auth.uid();
END; $$;

--
-- Name: app_settings_rollback(text, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.app_settings_rollback(p_key text, p_version integer, p_reason text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_uid UUID := public.app_settings_require_admin(); v_old public.app_setting_versions%ROWTYPE; v_ver INTEGER; v_email TEXT;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('app_setting:' || p_key));
    SELECT * INTO v_old FROM public.app_setting_versions WHERE key = p_key AND version = p_version;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', format('Release %s not found.', p_version));
    END IF;
    SELECT COALESCE(max(version), 0) + 1 INTO v_ver FROM public.app_setting_versions WHERE key = p_key;
    SELECT email INTO v_email FROM public.profiles WHERE id = v_uid;
    INSERT INTO public.app_setting_versions (key, version, value, summary, kind, rolled_back_to, published_by, published_by_email)
    VALUES (p_key, v_ver, v_old.value, COALESCE(NULLIF(trim(p_reason), ''), format('Rollback to release %s', p_version)), 'rollback', p_version, v_uid, v_email);
    INSERT INTO public.app_settings AS s (key, value, version, updated_by) VALUES (p_key, v_old.value, v_ver, v_uid)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, version = EXCLUDED.version, updated_by = v_uid, updated_at = NOW();
    DELETE FROM public.app_setting_drafts WHERE key = p_key;
    INSERT INTO public.audit_logs (user_id, user_email, user_role, action, entity_type, entity_id, new_values)
    VALUES (v_uid, v_email, 'admin', 'settings_rolled_back', 'app_settings', p_key, jsonb_build_object('to_version', p_version, 'new_version', v_ver));
    RETURN jsonb_build_object('success', true, 'version', v_ver, 'rolled_back_to', p_version);
END; $$;

--
-- Name: assignment_grade(uuid, numeric, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.assignment_grade(p_submission uuid, p_score numeric, p_feedback text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); sub public.assignment_submissions; a public.assignments;
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('teacher','admin','principal') THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only the teacher who set the work can grade it.'); END IF;
  IF p_score IS NULL OR p_score < 0 OR p_score > 100 THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Score must be between 0 and 100.'); END IF;
  SELECT * INTO sub FROM public.assignment_submissions WHERE id = p_submission FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Submission not found.'); END IF;
  SELECT * INTO a FROM public.assignments WHERE id = sub.assignment_id;
  IF v_role = 'teacher' AND a.teacher_id IS DISTINCT FROM v_uid THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'This assignment belongs to another teacher.'); END IF;
  PERFORM set_config('app.grading', 'on', true);
  UPDATE public.assignment_submissions SET score = p_score, feedback = NULLIF(trim(COALESCE(p_feedback,'')), ''), status = 'graded' WHERE id = p_submission;
  PERFORM set_config('app.grading', 'off', true);
  RETURN jsonb_build_object('success', true);
END $$;

--
-- Name: assignment_submission_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.assignment_submission_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE a public.assignments; pr public.profiles;
BEGIN
  IF current_setting('app.grading', true) = 'on' THEN RETURN NEW; END IF;   -- set only inside assignment_grade
  SELECT * INTO a FROM public.assignments WHERE id = NEW.assignment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Assignment not found' USING ERRCODE = 'foreign_key_violation'; END IF;
  IF TG_OP = 'INSERT' THEN
    SELECT * INTO pr FROM public.profiles WHERE id = NEW.student_id;
    IF a.classes IS NOT NULL AND cardinality(a.classes) > 0 AND NOT (pr.class_name = ANY (a.classes)) THEN
      RAISE EXCEPTION 'This assignment is not set for your class' USING ERRCODE = 'insufficient_privilege'; END IF;
    NEW.student_name := COALESCE(pr.name, NEW.student_name); NEW.subject := a.subject;
    NEW.submitted_at := now(); NEW.status := CASE WHEN now() > a.due_date THEN 'late' ELSE 'submitted' END;
    NEW.score := NULL; NEW.feedback := NULL;
  ELSE
    NEW.assignment_id := OLD.assignment_id; NEW.student_id := OLD.student_id; NEW.student_name := OLD.student_name; NEW.subject := OLD.subject;
    NEW.score := OLD.score; NEW.feedback := OLD.feedback;
    NEW.submitted_at := now(); NEW.status := CASE WHEN now() > a.due_date THEN 'late' ELSE 'submitted' END;
  END IF;
  RETURN NEW;
END $$;

--
-- Name: audit_log_search(text, text, date, date, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_log_search(p_query text DEFAULT NULL::text, p_entity text DEFAULT NULL::text, p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_total BIGINT; v_items JSONB; v_q TEXT := NULLIF(trim(COALESCE(p_query,'')),'');
BEGIN
  IF auth.uid() IS NULL OR public.get_current_user_role() NOT IN ('admin','principal') THEN
    RETURN jsonb_build_object('total', 0, 'items', '[]'::jsonb); END IF;
  SELECT count(*) INTO v_total FROM public.audit_logs a
   WHERE (v_q IS NULL OR a.action ILIKE '%'||v_q||'%' OR a.user_email ILIKE '%'||v_q||'%' OR a.entity_id ILIKE '%'||v_q||'%')
     AND (p_entity IS NULL OR a.entity_type = p_entity) AND (p_from IS NULL OR a.created_at >= p_from) AND (p_to IS NULL OR a.created_at < p_to + 1);
  SELECT COALESCE(jsonb_agg(x), '[]'::jsonb) INTO v_items FROM (
    SELECT to_jsonb(a) - 'ip_address' AS x FROM public.audit_logs a
     WHERE (v_q IS NULL OR a.action ILIKE '%'||v_q||'%' OR a.user_email ILIKE '%'||v_q||'%' OR a.entity_id ILIKE '%'||v_q||'%')
       AND (p_entity IS NULL OR a.entity_type = p_entity) AND (p_from IS NULL OR a.created_at >= p_from) AND (p_to IS NULL OR a.created_at < p_to + 1)
     ORDER BY a.created_at DESC LIMIT LEAST(GREATEST(COALESCE(p_limit,100),1),500) OFFSET GREATEST(COALESCE(p_offset,0),0)) q;
  RETURN jsonb_build_object('total', v_total, 'items', v_items);
END $$;

--
-- Name: bind_audit_log_actor(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.bind_audit_log_actor() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_caller_email TEXT;
    v_caller_role TEXT;
BEGIN
    NEW.id := gen_random_uuid();
    NEW.created_at := NOW();

    IF auth.uid() IS NOT NULL THEN
        NEW.user_id := auth.uid();
        
        -- Resolve genuine email from profiles or auth.users (No fake human emails)
        SELECT email, role INTO v_caller_email, v_caller_role 
        FROM public.profiles 
        WHERE id = auth.uid();

        IF v_caller_email IS NULL THEN
            SELECT email INTO v_caller_email 
            FROM auth.users 
            WHERE id = auth.uid();
        END IF;

        NEW.user_email := COALESCE(v_caller_email, 'auth_user_' || auth.uid()::text);
        NEW.user_role := COALESCE(v_caller_role, 'authenticated');
    ELSE
        -- Fallback for direct database administrative sessions
        NEW.user_id := '00000000-0000-0000-0000-000000000000'::uuid;
        NEW.user_email := 'system:' || session_user;
        NEW.user_role := 'system';
    END IF;

    RETURN NEW;
END;
$$;

--
-- Name: bind_super_admin_audit_log_actor(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.bind_super_admin_audit_log_actor() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_caller_email TEXT;
BEGIN
    NEW.id := gen_random_uuid();
    NEW.created_at := NOW();

    IF auth.uid() IS NOT NULL THEN
        NEW.admin_id := auth.uid();
        SELECT email INTO v_caller_email 
        FROM public.profiles 
        WHERE id = auth.uid();

        IF v_caller_email IS NULL THEN
            SELECT email INTO v_caller_email
            FROM auth.users
            WHERE id = auth.uid();
        END IF;
        
        NEW.admin_email := COALESCE(v_caller_email, 'auth_user_' || auth.uid()::text);
    ELSE
        NEW.admin_id := '00000000-0000-0000-0000-000000000000'::uuid;
        NEW.admin_email := 'system:' || session_user;
    END IF;

    RETURN NEW;
END;
$$;

--
-- Name: certificate_decide(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.certificate_decide(p_id uuid, p_decision text, p_note text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); c public.certificates; v_new TEXT;
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('admin','principal') THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only the principal or admin can decide requests.'); END IF;
  v_new := CASE p_decision WHEN 'Issue' THEN 'Issued' WHEN 'Reject' THEN 'Rejected' ELSE NULL END;
  IF v_new IS NULL THEN RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Decision must be Issue or Reject.'); END IF;
  IF v_new = 'Rejected' AND length(trim(COALESCE(p_note,''))) < 3 THEN
    RETURN jsonb_build_object('success', false, 'code', 'REASON_REQUIRED', 'error', 'A reason is required to reject.'); END IF;
  SELECT * INTO c FROM public.certificates WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Request not found.'); END IF;
  IF c.status NOT IN ('Pending','Approved') THEN
    RETURN jsonb_build_object('success', false, 'code', 'ALREADY_DECIDED', 'error', 'This request is already ' || lower(c.status) || '.'); END IF;
  UPDATE public.certificates SET status = v_new, decided_by = v_uid, decided_at = now(), decision_note = NULLIF(trim(COALESCE(p_note,'')), '') WHERE id = p_id;
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values)
  VALUES (v_uid, v_role, 'certificate_' || lower(v_new), 'certificates', p_id::text, jsonb_build_object('number', c.certificate_number, 'note', p_note));
  RETURN jsonb_build_object('success', true, 'status', v_new);
END $$;

--
-- Name: certificate_issue(text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.certificate_issue(p_student_ref text, p_type text, p_purpose text, p_details text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); s public.students; c public.certificates;
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('admin','principal') THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only the principal or admin can issue certificates.'); END IF;
  IF length(trim(COALESCE(p_type,''))) = 0 OR length(trim(COALESCE(p_purpose,''))) < 3 THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Certificate type and purpose are required.'); END IF;
  SELECT * INTO s FROM public.students WHERE lower(student_id) = lower(trim(p_student_ref)) OR lower(roll_number) = lower(trim(p_student_ref)) LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'STUDENT_NOT_FOUND', 'error', 'No student with that ID.'); END IF;
  c := public._cert_make(s, trim(p_type), trim(p_purpose), p_details, 'Issued', v_uid);
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values)
  VALUES (v_uid, v_role, 'certificate_issued', 'certificates', c.id::text, jsonb_build_object('number', c.certificate_number, 'type', c.certificate_type, 'student', s.student_id));
  RETURN jsonb_build_object('success', true, 'id', c.id, 'certificate_number', c.certificate_number);
END $$;

--
-- PostgreSQL database dump complete
--
