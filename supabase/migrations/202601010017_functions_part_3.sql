-- Functions and RPCs, part 3 of 6
-- Generated from the verified schema. Run as is; do not edit. Safe to run once on an EMPTY database.
SET check_function_bodies = false;
SET search_path = public, extensions;

SET check_function_bodies = false;

--
-- Name: exam_supplementary_create(uuid, text, date, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.exam_supplementary_create(p_parent uuid, p_name text, p_start date, p_end date) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); pe public.exams; v_id UUID; v_n INT;
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('admin','principal','coe') THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only the Controller of Examinations, principal or admin can create a supplementary examination.'); END IF;
  SELECT * INTO pe FROM public.exams WHERE id = p_parent;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Parent examination not found.'); END IF;
  IF length(trim(COALESCE(p_name,''))) = 0 OR p_start IS NULL OR p_end IS NULL OR p_end < p_start THEN RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Give a name and a valid date range.'); END IF;
  SELECT count(DISTINCT student_id) INTO v_n FROM public.exam_results WHERE exam_id = p_parent AND result_status IN ('Fail','Absent');
  IF v_n = 0 THEN RETURN jsonb_build_object('success', false, 'code', 'NOBODY_ELIGIBLE', 'error', 'No student failed or was absent in the parent examination.'); END IF;
  INSERT INTO public.exams (name, term, academic_year, start_date, end_date, status, course, semester, exam_category, parent_exam_id, registration_required, registration_open)
  VALUES (trim(p_name), pe.term, pe.academic_year, p_start, p_end, 'Scheduled', pe.course, pe.semester, 'Supplementary', p_parent, TRUE, FALSE) RETURNING id INTO v_id;
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values) VALUES (v_uid, v_role, 'supplementary_created', 'exams', v_id::text, jsonb_build_object('parent', p_parent, 'eligible_students', v_n));
  RETURN jsonb_build_object('success', true, 'exam_id', v_id, 'eligible_students', v_n);
END $$;

--
-- Name: exam_supplementary_papers(uuid, date, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.exam_supplementary_papers(p_exam uuid, p_first_date date, p_start text, p_end text, p_room text DEFAULT 'TBA'::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_role TEXT := public.get_current_user_role(); e public.exams; x RECORD; v_day INT := 0; v_n INT := 0;
BEGIN
  IF auth.uid() IS NULL OR v_role NOT IN ('admin','principal','coe') THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Not allowed.'); END IF;
  SELECT * INTO e FROM public.exams WHERE id = p_exam;
  IF NOT FOUND OR e.parent_exam_id IS NULL THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_SUPPLEMENTARY', 'error', 'This is not a supplementary examination.'); END IF;
  IF p_first_date IS NULL OR p_start IS NULL OR p_end IS NULL OR p_end <= p_start THEN RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Give the first date and valid start/end times.'); END IF;
  FOR x IN SELECT DISTINCT ON (r.class_name, r.subject) r.class_name, r.subject, r.subject_code,
                  (SELECT sc.max_marks FROM public.exam_schedules sc WHERE sc.exam_id = e.parent_exam_id AND sc.subject = r.subject LIMIT 1) AS max_marks,
                  (SELECT sc.passing_marks FROM public.exam_schedules sc WHERE sc.exam_id = e.parent_exam_id AND sc.subject = r.subject LIMIT 1) AS passing_marks,
                  (SELECT sc.credits FROM public.exam_schedules sc WHERE sc.exam_id = e.parent_exam_id AND sc.subject = r.subject LIMIT 1) AS credits
             FROM public.exam_results r WHERE r.exam_id = e.parent_exam_id AND r.result_status IN ('Fail','Absent') ORDER BY r.class_name, r.subject LOOP
    IF EXISTS (SELECT 1 FROM public.exam_schedules WHERE exam_id = p_exam AND subject = x.subject AND class_name = x.class_name) THEN CONTINUE; END IF;
    INSERT INTO public.exam_schedules (exam_id, subject, subject_code, class_name, exam_date, start_time, end_time, room, max_marks, passing_marks, credits)
    VALUES (p_exam, x.subject, x.subject_code, x.class_name, p_first_date + v_day, p_start, p_end, COALESCE(NULLIF(trim(p_room),''), 'TBA'), COALESCE(x.max_marks, 100), x.passing_marks, x.credits);
    v_day := v_day + 1; v_n := v_n + 1;
  END LOOP;
  RETURN jsonb_build_object('success', true, 'papers', v_n);
END $$;

--
-- Name: exam_verify_hall_ticket(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.exam_verify_hall_ticket(p_token text) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE t public.hall_tickets%ROWTYPE;
BEGIN
    IF public.get_current_user_role() NOT IN ('admin', 'principal', 'coe', 'teacher', 'hod') THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Only examination staff can verify tickets.');
    END IF;
    SELECT * INTO t FROM public.hall_tickets WHERE qr_code_token = trim(p_token);
    IF NOT FOUND THEN RETURN jsonb_build_object('valid', false, 'error', 'No such hall ticket.'); END IF;
    RETURN jsonb_build_object('valid', t.status = 'Issued'
                                       AND t.coe_signature_hash IS NOT DISTINCT FROM encode(sha256(convert_to(t.qr_code_token || ':' || t.student_id::text || ':' || t.exam_id::text, 'UTF8')), 'hex'),
                              'status', t.status, 'student', t.student_name, 'register_number', t.register_number,
                              'class', t.class_name, 'exam', t.exam_title, 'reason', t.detention_reason);
END;
$$;

--
-- Name: export_dataset(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.export_dataset(p_name text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
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

--
-- Name: fee_adjust(uuid, text, numeric, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fee_adjust(p_student_fee_id uuid, p_kind text, p_amount numeric, p_reason text, p_actor uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_fee public.student_fees%ROWTYPE; v_amt NUMERIC(12,2); v_due NUMERIC(12,2); v_status TEXT;
BEGIN
    IF p_kind NOT IN ('waiver', 'concession', 'cancellation') THEN
        RETURN jsonb_build_object('success', false, 'code', 'VALIDATION_ERROR', 'error', 'Unknown adjustment type.');
    END IF;
    IF length(trim(COALESCE(p_reason, ''))) < 3 THEN
        RETURN jsonb_build_object('success', false, 'code', 'REASON_REQUIRED', 'error', 'A reason is required.');
    END IF;
    SELECT * INTO v_fee FROM public.student_fees WHERE id = p_student_fee_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Fee record not found.'); END IF;
    IF v_fee.status IN ('cancelled', 'waived') OR v_fee.total_due <= 0 THEN
        RETURN jsonb_build_object('success', false, 'code', 'NOTHING_DUE', 'error', 'There is no balance on this fee to adjust.');
    END IF;
    IF p_kind = 'cancellation' THEN
        IF v_fee.paid_amount > 0 THEN
            RETURN jsonb_build_object('success', false, 'code', 'HAS_PAYMENTS', 'error', 'A fee with payments cannot be cancelled. Waive the balance instead.');
        END IF;
        v_amt := v_fee.total_due;
    ELSE
        v_amt := round(p_amount, 2);
        IF v_amt IS NULL OR v_amt <= 0 THEN RETURN jsonb_build_object('success', false, 'code', 'INVALID_AMOUNT', 'error', 'Amount must be greater than zero.'); END IF;
        IF v_amt > v_fee.total_due THEN
            RETURN jsonb_build_object('success', false, 'code', 'EXCEEDS_BALANCE', 'error', format('Amount exceeds the outstanding balance (%s).', v_fee.total_due));
        END IF;
    END IF;
    v_due := v_fee.total_due - v_amt;
    v_status := CASE WHEN p_kind = 'cancellation' THEN 'cancelled'
                     WHEN v_due = 0 AND v_fee.paid_amount > 0 THEN 'paid'
                     WHEN v_due = 0 THEN 'waived'
                     WHEN v_fee.paid_amount > 0 THEN 'partially_paid' ELSE v_fee.status END;
    UPDATE public.student_fees SET total_due = v_due, waived_amount = waived_amount + CASE WHEN p_kind = 'cancellation' THEN 0 ELSE v_amt END,
           status = v_status WHERE id = v_fee.id;
    INSERT INTO public.fee_adjustments (student_fee_id, kind, amount, reason, created_by) VALUES (v_fee.id, p_kind, v_amt, trim(p_reason), p_actor);
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
    VALUES (p_actor, 'fee_' || p_kind, 'student_fees', v_fee.id::text, jsonb_build_object('total_due', v_fee.total_due, 'status', v_fee.status),
            jsonb_build_object('total_due', v_due, 'status', v_status, 'amount', v_amt, 'reason', p_reason));
    RETURN jsonb_build_object('success', true, 'status', v_status, 'balance_remaining', v_due);
END;
$$;

--
-- Name: fee_cancel_run(uuid, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fee_cancel_run(p_run_id uuid, p_reason text, p_actor uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_run public.fee_runs%ROWTYPE; f RECORD; v_ok INT := 0; v_kept INT := 0;
BEGIN
    IF length(trim(COALESCE(p_reason, ''))) < 3 THEN
        RETURN jsonb_build_object('success', false, 'code', 'REASON_REQUIRED', 'error', 'A reason is required.');
    END IF;
    SELECT * INTO v_run FROM public.fee_runs WHERE id = p_run_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Run not found.'); END IF;
    IF v_run.status = 'Cancelled' THEN RETURN jsonb_build_object('success', true, 'already_cancelled', true); END IF;
    FOR f IN SELECT id, paid_amount, total_due, status FROM public.student_fees WHERE run_id = p_run_id FOR UPDATE LOOP
        IF f.status = 'cancelled' THEN CONTINUE; END IF;
        IF f.paid_amount > 0 OR f.total_due <= 0 THEN v_kept := v_kept + 1; CONTINUE; END IF;
        UPDATE public.student_fees SET total_due = 0, status = 'cancelled' WHERE id = f.id;
        INSERT INTO public.fee_adjustments (student_fee_id, kind, amount, reason, created_by) VALUES (f.id, 'cancellation', f.total_due, trim(p_reason), p_actor);
        v_ok := v_ok + 1;
    END LOOP;
    IF v_kept = 0 THEN
        UPDATE public.fee_runs SET status = 'Cancelled', cancelled_at = NOW(), cancel_reason = trim(p_reason) WHERE id = p_run_id;
    END IF;
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_values)
    VALUES (p_actor, 'fee_run_cancelled', 'fee_runs', p_run_id::text, jsonb_build_object('cancelled', v_ok, 'kept_with_payments', v_kept, 'reason', p_reason));
    RETURN jsonb_build_object('success', true, 'cancelled', v_ok, 'kept_because_paid', v_kept, 'run_closed', v_kept = 0);
END;
$$;

--
-- Name: fee_generate(boolean, uuid, uuid, numeric, text, text, text, text, integer, text, date, boolean, boolean, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fee_generate(p_execute boolean, p_plan_id uuid, p_head_id uuid, p_amount numeric, p_description text, p_scope_type text, p_scope_value text, p_quota text, p_semester integer, p_academic_year text, p_due_date date, p_include_yearly boolean, p_include_one_time boolean, p_actor uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_plan public.fee_plans%ROWTYPE; v_head public.fee_heads%ROWTYPE; v_year TEXT; v_run UUID := gen_random_uuid();
    v_students INT; v_new INT; v_skipped INT; v_total NUMERIC; v_breakdown JSONB; v_sample JSONB;
BEGIN
    IF p_scope_type NOT IN ('student', 'class', 'department', 'all') THEN
        RETURN jsonb_build_object('success', false, 'code', 'VALIDATION_ERROR', 'error', 'Scope must be student, class, department or all.');
    END IF;
    IF p_scope_type <> 'all' AND length(trim(COALESCE(p_scope_value, ''))) = 0 THEN
        RETURN jsonb_build_object('success', false, 'code', 'VALIDATION_ERROR', 'error', 'Choose which student, class or department to bill.');
    END IF;
    IF (p_plan_id IS NULL) = (p_head_id IS NULL) THEN
        RETURN jsonb_build_object('success', false, 'code', 'VALIDATION_ERROR', 'error', 'Choose either a fee plan or a single fee head.');
    END IF;

    IF p_plan_id IS NOT NULL THEN
        SELECT * INTO v_plan FROM public.fee_plans WHERE id = p_plan_id;
        IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Fee plan not found.'); END IF;
        IF v_plan.status <> 'Published' THEN
            RETURN jsonb_build_object('success', false, 'code', 'PLAN_NOT_PUBLISHED', 'error', format('The plan is %s. Publish it before billing.', v_plan.status));
        END IF;
        v_year := COALESCE(NULLIF(trim(p_academic_year), ''), v_plan.academic_year);
    ELSE
        SELECT * INTO v_head FROM public.fee_heads WHERE id = p_head_id;
        IF NOT FOUND OR NOT v_head.active THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Fee head not found or inactive.'); END IF;
        IF p_amount IS NULL OR p_amount <= 0 THEN RETURN jsonb_build_object('success', false, 'code', 'INVALID_AMOUNT', 'error', 'Amount must be greater than zero.'); END IF;
        IF p_due_date IS NULL THEN RETURN jsonb_build_object('success', false, 'code', 'VALIDATION_ERROR', 'error', 'A due date is required for a single fee.'); END IF;
        v_year := NULLIF(trim(p_academic_year), '');
        IF v_year IS NULL THEN RETURN jsonb_build_object('success', false, 'code', 'VALIDATION_ERROR', 'error', 'Academic year is required.'); END IF;
    END IF;

    DROP TABLE IF EXISTS _fee_cand;
    CREATE TEMP TABLE _fee_cand (
        student_rec UUID, student_user UUID, student_name TEXT, class_name TEXT, head_id UUID, head_name TEXT,
        item_id UUID, amount NUMERIC(12,2), charge_key TEXT, term_label TEXT, due DATE, is_new BOOLEAN) ON COMMIT DROP;

    WITH stu AS (
        SELECT s.* FROM public.students s
         WHERE s.status = 'active'
           AND (p_scope_type = 'all'
                OR (p_scope_type = 'student'    AND (s.id::text = p_scope_value OR s.student_id = p_scope_value))
                OR (p_scope_type = 'class'      AND s.class_name = p_scope_value)
                OR (p_scope_type = 'department' AND s.department = p_scope_value))
           AND (NULLIF(trim(p_quota), '') IS NULL OR s.admission_quota = trim(p_quota))
           AND (p_semester IS NULL OR s.current_semester = p_semester)
           AND (p_plan_id IS NULL OR (
                (v_plan.department IS NULL OR s.department = v_plan.department)
            AND (v_plan.class_name IS NULL OR s.class_name = v_plan.class_name)
            AND (v_plan.quota IS NULL OR s.admission_quota = v_plan.quota)))
    )
    INSERT INTO _fee_cand
    SELECT s.id, s.user_id, s.name, COALESCE(s.class_name, s.department, '—'), h.id, h.name, i.id, i.amount,
           i.id::text || ':' || CASE i.billing_cycle WHEN 'one_time' THEN 'ONCE'
                                                       WHEN 'per_year' THEN v_year
                                                       ELSE v_year || '/S' || s.current_semester END,
           CASE i.billing_cycle WHEN 'one_time' THEN 'One-time' WHEN 'per_year' THEN 'Year ' || v_year
                                ELSE 'Semester ' || s.current_semester END,
           COALESCE(p_due_date, CURRENT_DATE + i.due_days), FALSE
      FROM stu s
      JOIN public.fee_plan_items i ON i.plan_id = p_plan_id
      JOIN public.fee_heads h ON h.id = i.fee_head_id AND h.active
     WHERE p_plan_id IS NOT NULL
       AND ((i.billing_cycle = 'one_time' AND COALESCE(p_include_one_time, FALSE))
         OR (i.billing_cycle = 'per_year' AND COALESCE(p_include_yearly, FALSE))
         OR (i.billing_cycle = 'per_semester' AND (i.semesters IS NULL OR s.current_semester = ANY (i.semesters))));

    IF p_head_id IS NOT NULL THEN
        INSERT INTO _fee_cand
        SELECT s.id, s.user_id, s.name, COALESCE(s.class_name, s.department, '—'), v_head.id, v_head.name, NULL, p_amount,
               'adhoc:' || v_run::text, COALESCE(NULLIF(trim(p_description), ''), v_head.name), p_due_date, FALSE
          FROM public.students s
         WHERE s.status = 'active'
           AND (p_scope_type = 'all'
                OR (p_scope_type = 'student'    AND (s.id::text = p_scope_value OR s.student_id = p_scope_value))
                OR (p_scope_type = 'class'      AND s.class_name = p_scope_value)
                OR (p_scope_type = 'department' AND s.department = p_scope_value))
           AND (NULLIF(trim(p_quota), '') IS NULL OR s.admission_quota = trim(p_quota))
           AND (p_semester IS NULL OR s.current_semester = p_semester);
    END IF;

    UPDATE _fee_cand c SET is_new = NOT EXISTS (
        SELECT 1 FROM public.student_fees f WHERE f.student_record_id = c.student_rec AND f.charge_key = c.charge_key AND f.status <> 'cancelled');

    SELECT count(DISTINCT student_rec), count(*) FILTER (WHERE is_new), count(*) FILTER (WHERE NOT is_new),
           COALESCE(sum(amount) FILTER (WHERE is_new), 0)
      INTO v_students, v_new, v_skipped, v_total FROM _fee_cand;
    SELECT COALESCE(jsonb_agg(jsonb_build_object('head', head_name, 'students', n, 'amount', amt) ORDER BY head_name), '[]'::jsonb)
      INTO v_breakdown FROM (SELECT head_name, count(*) n, sum(amount) amt FROM _fee_cand WHERE is_new GROUP BY head_name) b;
    SELECT COALESCE(jsonb_agg(jsonb_build_object('student', student_name, 'class', class_name, 'fee', head_name, 'amount', amount, 'due', due)), '[]'::jsonb)
      INTO v_sample FROM (SELECT * FROM _fee_cand WHERE is_new ORDER BY student_name, head_name LIMIT 10) x;

    IF NOT p_execute THEN
        RETURN jsonb_build_object('success', true, 'preview', true, 'students', v_students, 'to_create', v_new,
            'already_billed', v_skipped, 'total_amount', v_total, 'by_head', v_breakdown, 'sample', v_sample);
    END IF;
    IF v_new = 0 THEN
        RETURN jsonb_build_object('success', false, 'code', 'NOTHING_TO_BILL', 'error',
            CASE WHEN v_skipped > 0 THEN 'Everything in this selection has already been billed.'
                 ELSE 'No active students match this selection.' END, 'already_billed', v_skipped);
    END IF;

    -- A single ad-hoc fee has no natural key, so an identical run in the last 10 minutes is treated as a double submit.
    IF p_head_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.fee_runs r
         WHERE r.run_type = 'adhoc' AND r.status = 'Completed' AND r.fee_head_id = p_head_id AND r.amount = p_amount
           AND r.scope_type = p_scope_type AND r.scope_value IS NOT DISTINCT FROM NULLIF(trim(p_scope_value), '')
           AND r.quota_filter IS NOT DISTINCT FROM NULLIF(trim(p_quota), '') AND r.semester_filter IS NOT DISTINCT FROM p_semester
           AND r.academic_year = v_year AND r.due_date IS NOT DISTINCT FROM p_due_date
           AND r.description IS NOT DISTINCT FROM NULLIF(trim(p_description), '') AND r.created_at > NOW() - INTERVAL '10 minutes') THEN
        RETURN jsonb_build_object('success', false, 'code', 'DUPLICATE_RUN',
            'error', 'An identical fee was billed to this selection in the last 10 minutes. Nothing was created.');
    END IF;

    INSERT INTO public.fee_runs (id, run_type, plan_id, fee_head_id, amount, description, scope_type, scope_value, quota_filter,
                                 semester_filter, academic_year, due_date, include_yearly, include_one_time, students_count,
                                 demands_count, total_amount, created_by)
    VALUES (v_run, CASE WHEN p_plan_id IS NULL THEN 'adhoc' ELSE 'plan' END, p_plan_id, p_head_id, p_amount,
            NULLIF(trim(p_description), ''), p_scope_type, NULLIF(trim(p_scope_value), ''), NULLIF(trim(p_quota), ''),
            p_semester, v_year, p_due_date, COALESCE(p_include_yearly, FALSE), COALESCE(p_include_one_time, FALSE),
            v_students, v_new, v_total, p_actor);

    INSERT INTO public.student_fees (student_id, student_record_id, student_name, class_name, total_due, paid_amount, due_date, status,
                                     fee_head_id, plan_item_id, run_id, charge_key, academic_year, term_label, description, original_amount)
    SELECT student_user, student_rec, student_name, class_name, amount, 0, due, 'pending',
           head_id, item_id, v_run, charge_key, v_year, term_label, head_name, amount
      FROM _fee_cand WHERE is_new;

    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_values)
    VALUES (p_actor, 'fee_run_executed', 'fee_runs', v_run::text,
            jsonb_build_object('scope', p_scope_type, 'value', p_scope_value, 'demands', v_new, 'total', v_total, 'plan', p_plan_id, 'head', p_head_id));
    RETURN jsonb_build_object('success', true, 'preview', false, 'run_id', v_run, 'students', v_students, 'created', v_new,
        'already_billed', v_skipped, 'total_amount', v_total, 'by_head', v_breakdown);
END;
$$;

--
-- Name: fee_payment_reverse(uuid, text, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fee_payment_reverse(p_payment uuid, p_reason text, p_amount numeric DEFAULT NULL::numeric) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); p public.fee_payments;
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('admin','finance_manager') THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only finance or admin can reverse a payment.'); END IF;
  IF length(trim(COALESCE(p_reason,''))) < 5 THEN RETURN jsonb_build_object('success', false, 'code', 'REASON_REQUIRED', 'error', 'Give a reason (at least 5 characters).'); END IF;
  SELECT * INTO p FROM public.fee_payments WHERE id = p_payment;
  IF FOUND AND p.payment_mode = 'Online_Gateway' THEN
    RETURN jsonb_build_object('success', false, 'code', 'USE_GATEWAY_REFUND', 'error', 'Online payments are refunded from the Online payments tab so the gateway returns the money.'); END IF;
  RETURN public._fee_payment_reverse(p_payment, p_reason, v_uid, p_amount);
END $$;

--
-- Name: fee_plan_clone(uuid, text, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fee_plan_clone(p_plan_id uuid, p_new_name text, p_new_year text, p_actor uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_new UUID;
BEGIN
    IF length(trim(COALESCE(p_new_name, ''))) < 2 OR length(trim(COALESCE(p_new_year, ''))) < 4 THEN
        RETURN jsonb_build_object('success', false, 'code', 'VALIDATION_ERROR', 'error', 'A name and an academic year are required.');
    END IF;
    IF EXISTS (SELECT 1 FROM public.fee_plans WHERE name = trim(p_new_name) AND academic_year = trim(p_new_year)) THEN
        RETURN jsonb_build_object('success', false, 'code', 'DUPLICATE', 'error', 'A plan with this name already exists for that year.');
    END IF;
    INSERT INTO public.fee_plans (name, academic_year, department, class_name, quota, description, status, created_by)
    SELECT trim(p_new_name), trim(p_new_year), department, class_name, quota, description, 'Draft', p_actor FROM public.fee_plans WHERE id = p_plan_id
    RETURNING id INTO v_new;
    IF v_new IS NULL THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Plan not found.'); END IF;
    INSERT INTO public.fee_plan_items (plan_id, fee_head_id, amount, billing_cycle, semesters, due_days, description, sort_order)
    SELECT v_new, fee_head_id, amount, billing_cycle, semesters, due_days, description, sort_order FROM public.fee_plan_items WHERE plan_id = p_plan_id;
    RETURN jsonb_build_object('success', true, 'plan_id', v_new);
END;
$$;

--
-- Name: fee_plan_items_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fee_plan_items_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_status TEXT; v_plan UUID := COALESCE(NEW.plan_id, OLD.plan_id);
BEGIN
    SELECT status INTO v_status FROM public.fee_plans WHERE id = v_plan;
    IF v_status IS NOT NULL AND v_status <> 'Draft' THEN
        RAISE EXCEPTION 'FEE_PLAN_FROZEN: items of a % plan cannot be changed. Clone the plan to make changes.', v_status;
    END IF;
    RETURN COALESCE(NEW, OLD);
END; $$;

--
-- Name: fee_plans_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fee_plans_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
    IF OLD.status <> 'Draft' AND NEW.status = 'Draft' THEN
        RAISE EXCEPTION 'FEE_PLAN_FROZEN: a % plan cannot return to Draft.', OLD.status;
    END IF;
    IF OLD.status <> 'Draft' AND (NEW.academic_year, NEW.department, NEW.class_name, NEW.quota)
         IS DISTINCT FROM (OLD.academic_year, OLD.department, OLD.class_name, OLD.quota) THEN
        RAISE EXCEPTION 'FEE_PLAN_FROZEN: the targeting of a % plan cannot be changed.', OLD.status;
    END IF;
    IF NEW.status = 'Published' AND OLD.status = 'Draft' THEN
        IF NOT EXISTS (SELECT 1 FROM public.fee_plan_items WHERE plan_id = NEW.id) THEN
            RAISE EXCEPTION 'FEE_PLAN_EMPTY: add at least one fee item before publishing.';
        END IF;
        NEW.published_at := NOW();
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END; $$;

--
-- Name: fee_reminders_auto(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fee_reminders_auto() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE s public.institutional_settings; r JSONB;
BEGIN
  SELECT * INTO s FROM public.institutional_settings LIMIT 1;
  IF NOT COALESCE(s.auto_fee_reminders, false) THEN RETURN jsonb_build_object('success', true, 'skipped', 'automatic reminders are off'); END IF;
  r := public._fee_reminders_core(s.fee_reminder_days);
  INSERT INTO public.audit_logs (action, entity_type, entity_id, new_values) VALUES ('fee_reminders_auto', 'student_fees', NULL, r);
  RETURN r;
END $$;

--
-- Name: fee_send_reminders(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fee_send_reminders(p_days_ahead integer DEFAULT 7) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); r JSONB;
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('admin','principal','finance_manager','financier','accountant') THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only the finance team can send reminders.'); END IF;
  r := public._fee_reminders_core(p_days_ahead);
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values) VALUES (v_uid, v_role, 'fee_reminders_sent', 'student_fees', NULL, r);
  RETURN r;
END $$;

--
-- Name: generate_student_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_student_id() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_prefix TEXT;
    v_candidate TEXT;
BEGIN
    SELECT student_id_prefix INTO v_prefix FROM public.institutional_settings LIMIT 1;
    v_prefix := COALESCE(v_prefix, 'AIP');
    LOOP
        v_candidate := v_prefix || '-' || to_char(CURRENT_DATE, 'YYYY') || '-'
                       || lpad(nextval('public.student_id_seq')::TEXT, 4, '0');
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE student_id = v_candidate OR roll_number = v_candidate)
              AND NOT EXISTS (SELECT 1 FROM public.students WHERE student_id = v_candidate);
    END LOOP;
    RETURN v_candidate;
END;
$$;

--
-- Name: get_academic_year_for_date(date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_academic_year_for_date(p_date date) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public'
    AS $$
DECLARE
    v_year INT;
    v_month INT;
BEGIN
    IF p_date IS NULL THEN
        RETURN NULL;
    END IF;
    v_year := EXTRACT(YEAR FROM p_date)::INT;
    v_month := EXTRACT(MONTH FROM p_date)::INT;
    IF v_month >= 6 THEN
        RETURN v_year::TEXT || '-' || (v_year + 1)::TEXT;
    ELSE
        RETURN (v_year - 1)::TEXT || '-' || v_year::TEXT;
    END IF;
END;
$$;

--
-- Name: get_current_user_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_current_user_role() RETURNS text
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role INTO v_role 
    FROM public.profiles 
    WHERE id = auth.uid() AND status = 'active';
    RETURN v_role;
END;
$$;

--
-- Name: get_first_login_status(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_first_login_status(p_identifier text) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v RECORD;
BEGIN
    IF p_identifier IS NULL OR length(trim(p_identifier)) < 3 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Identifier is required');
    END IF;
    SELECT id, role, is_first_login, requires_password_change INTO v
      FROM public.profiles
     WHERE lower(login_id) = lower(trim(p_identifier)) OR lower(student_id) = lower(trim(p_identifier))
        OR lower(roll_number) = lower(trim(p_identifier))
     LIMIT 1;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Account not found');
    END IF;
    -- Deliberately returns no name/email/phone: pre-auth callers must not learn PII.
    RETURN jsonb_build_object('success', true, 'role', v.role,
        'is_first_login', COALESCE(v.is_first_login, false),
        'requires_password_change', COALESCE(v.requires_password_change, false));
END;
$$;

--
-- Name: global_search(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.global_search(p_query text) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
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

--
-- Name: grade_point_for(numeric, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.grade_point_for(p_pct numeric, p_pass boolean) RETURNS numeric
    LANGUAGE sql STABLE
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT CASE WHEN NOT p_pass THEN 0
    ELSE COALESCE((SELECT b.grade_point FROM public.grade_scale_bands b JOIN public.grade_scales s ON s.id = b.scale_id
                    WHERE s.is_default AND b.min_pct <= p_pct ORDER BY b.min_pct DESC LIMIT 1), 0) END
$$;

--
-- Name: grade_scale_save(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.grade_scale_save(p_bands jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); v_scale UUID; b JSONB; v_n INT := 0; v_zero BOOLEAN := FALSE;
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('admin','principal','coe') THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only the Controller of Examinations, principal or admin can change the grade scale.'); END IF;
  IF p_bands IS NULL OR jsonb_typeof(p_bands) <> 'array' OR jsonb_array_length(p_bands) < 2 THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Provide at least two grade bands.'); END IF;
  FOR b IN SELECT * FROM jsonb_array_elements(p_bands) LOOP
    IF (b->>'min_pct') IS NULL OR (b->>'min_pct')::numeric < 0 OR (b->>'min_pct')::numeric > 100 OR length(trim(COALESCE(b->>'grade',''))) = 0
       OR (b->>'grade_point') IS NULL OR (b->>'grade_point')::numeric < 0 THEN
      RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Each band needs a minimum % (0–100), a grade and non-negative grade points.'); END IF;
    IF (b->>'min_pct')::numeric = 0 THEN v_zero := TRUE; END IF;
  END LOOP;
  IF NOT v_zero THEN RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'A band starting at 0% is required so every mark has a grade.'); END IF;
  IF (SELECT count(DISTINCT (x->>'min_pct')::numeric) FROM jsonb_array_elements(p_bands) x) <> jsonb_array_length(p_bands)
     OR (SELECT count(DISTINCT lower(trim(x->>'grade'))) FROM jsonb_array_elements(p_bands) x) <> jsonb_array_length(p_bands) THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Minimum percentages and grade names must be unique.'); END IF;
  SELECT id INTO v_scale FROM public.grade_scales WHERE is_default;
  IF v_scale IS NULL THEN INSERT INTO public.grade_scales (name, is_default) VALUES ('Default 10-point scale', TRUE) RETURNING id INTO v_scale; END IF;
  DELETE FROM public.grade_scale_bands WHERE scale_id = v_scale;
  FOR b IN SELECT * FROM jsonb_array_elements(p_bands) LOOP
    INSERT INTO public.grade_scale_bands (scale_id, min_pct, grade, grade_point) VALUES (v_scale, (b->>'min_pct')::numeric, trim(b->>'grade'), (b->>'grade_point')::numeric);
    v_n := v_n + 1;
  END LOOP;
  UPDATE public.grade_scales SET max_points = (SELECT max(grade_point) FROM public.grade_scale_bands WHERE scale_id = v_scale) WHERE id = v_scale;
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values) VALUES (v_uid, v_role, 'grade_scale_changed', 'grade_scales', v_scale::text, p_bands);
  RETURN jsonb_build_object('success', true, 'bands', v_n);
END $$;

--
-- Name: hostel_allot(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.hostel_allot(p_student uuid, p_room uuid, p_remarks text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_role TEXT := public.get_current_user_role(); r public.hostel_rooms; v_new UUID;
BEGIN
  IF auth.uid() IS NULL OR v_role NOT IN ('admin','principal','hostel_warden') THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only admin, principal or the warden can allot rooms.'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_student AND role = 'student') THEN
    RETURN jsonb_build_object('success', false, 'code', 'NOT_A_STUDENT', 'error', 'Choose a student.'); END IF;
  IF EXISTS (SELECT 1 FROM public.hostel_allotments WHERE student_id = p_student AND status = 'Active') THEN
    RETURN jsonb_build_object('success', false, 'code', 'ALREADY_ALLOTTED', 'error', 'This student already has a room. Vacate or transfer first.'); END IF;
  SELECT * INTO r FROM public.hostel_rooms WHERE id = p_room FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Room not found.'); END IF;
  IF r.status = 'Maintenance' THEN RETURN jsonb_build_object('success', false, 'code', 'ROOM_UNAVAILABLE', 'error', 'This room is under maintenance.'); END IF;
  IF r.current_occupancy >= r.capacity THEN RETURN jsonb_build_object('success', false, 'code', 'ROOM_FULL', 'error', 'This room is full.'); END IF;
  INSERT INTO public.hostel_allotments(student_id, room_id, allotted_by, remarks) VALUES (p_student, p_room, auth.uid(), NULLIF(trim(COALESCE(p_remarks,'')),'')) RETURNING id INTO v_new;
  UPDATE public.hostel_rooms SET current_occupancy = current_occupancy + 1, status = CASE WHEN current_occupancy + 1 >= capacity THEN 'Full' ELSE status END WHERE id = p_room;
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values)
  VALUES (auth.uid(), v_role, 'hostel_allotted', 'hostel_allotments', v_new::text, jsonb_build_object('student', p_student, 'room', p_room));
  RETURN jsonb_build_object('success', true, 'id', v_new);
END $$;

--
-- Name: hostel_occupancy(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.hostel_occupancy() RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF auth.uid() IS NULL OR public.get_current_user_role() NOT IN ('admin','principal','hostel_warden') THEN
    RETURN jsonb_build_object('rooms', '[]'::jsonb); END IF;
  RETURN jsonb_build_object('rooms', COALESCE((
    SELECT jsonb_agg(jsonb_build_object('id', r.id, 'block', r.block_name, 'floor', r.floor_number, 'room', r.room_number, 'capacity', r.capacity,
      'occupancy', r.current_occupancy, 'type', r.room_type, 'annual_fee', r.annual_fee, 'status', r.status,
      'occupants', COALESCE((SELECT jsonb_agg(jsonb_build_object('allotment_id', a.id, 'student_id', a.student_id, 'name', p.name, 'roll', p.student_id, 'since', a.allotted_on) ORDER BY p.name)
                              FROM public.hostel_allotments a JOIN public.profiles p ON p.id = a.student_id WHERE a.room_id = r.id AND a.status = 'Active'), '[]'::jsonb))
    ORDER BY r.block_name, r.floor_number, r.room_number) FROM public.hostel_rooms r), '[]'::jsonb));
END $$;

--
-- Name: hostel_outpass_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.hostel_outpass_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_staff BOOLEAN := v_role IN ('admin','principal','hostel_warden');
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT v_staff THEN
      NEW.parent_otp_verified := FALSE; NEW.guard_exit_time := NULL; NEW.guard_entry_time := NULL; NEW.actual_return_time := NULL;
    END IF;
    RETURN NEW;
  END IF;
  -- UPDATE
  IF NOT v_staff THEN
    -- students/parents may not touch consent, status or gate fields on a pending pass
    NEW.parent_otp_verified := OLD.parent_otp_verified; NEW.warden_status := OLD.warden_status;
    NEW.guard_exit_time := OLD.guard_exit_time; NEW.guard_entry_time := OLD.guard_entry_time; NEW.actual_return_time := OLD.actual_return_time;
    RETURN NEW;
  END IF;
  IF NEW.warden_status IS DISTINCT FROM OLD.warden_status AND NOT (
       (OLD.warden_status = 'Pending'  AND NEW.warden_status IN ('Approved','Rejected'))
    OR (OLD.warden_status = 'Approved' AND NEW.warden_status IN ('Exited','Rejected'))
    OR (OLD.warden_status = 'Exited'   AND NEW.warden_status = 'Returned')) THEN
    RAISE EXCEPTION 'Invalid out-pass status change % -> %', OLD.warden_status, NEW.warden_status USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.warden_status = 'Exited'   AND OLD.warden_status <> 'Exited'   THEN NEW.guard_exit_time := COALESCE(NEW.guard_exit_time, now()); END IF;
  IF NEW.warden_status = 'Returned' AND OLD.warden_status <> 'Returned' THEN NEW.guard_entry_time := COALESCE(NEW.guard_entry_time, now()); NEW.actual_return_time := COALESCE(NEW.actual_return_time, now()); END IF;
  RETURN NEW;
END $$;

--
-- Name: hostel_room_save(uuid, text, integer, text, integer, text, numeric, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.hostel_room_save(p_id uuid, p_block text, p_floor integer, p_room text, p_capacity integer, p_type text, p_fee numeric, p_status text DEFAULT 'Available'::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_id UUID; v_occ INT;
BEGIN
  IF auth.uid() IS NULL OR v_role NOT IN ('admin','principal','hostel_warden') THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only admin, principal or the warden can manage rooms.'); END IF;
  IF length(trim(COALESCE(p_block,''))) = 0 OR length(trim(COALESCE(p_room,''))) = 0 OR COALESCE(p_capacity,0) < 1 OR COALESCE(p_fee,0) < 0 THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Block, room number, a capacity of at least 1 and a non-negative fee are required.'); END IF;
  IF p_status NOT IN ('Available','Full','Maintenance') THEN p_status := 'Available'; END IF;
  IF p_id IS NULL THEN
    BEGIN
      INSERT INTO public.hostel_rooms(block_name, floor_number, room_number, capacity, room_type, annual_fee, status)
      VALUES (trim(p_block), COALESCE(p_floor,1), trim(p_room), p_capacity, COALESCE(NULLIF(trim(p_type),''),'Non-AC'), COALESCE(p_fee,0),
              CASE WHEN p_status = 'Maintenance' THEN 'Maintenance' ELSE 'Available' END) RETURNING id INTO v_id;
    EXCEPTION WHEN unique_violation THEN
      RETURN jsonb_build_object('success', false, 'code', 'DUPLICATE', 'error', 'That room already exists in this block.');
    END;
  ELSE
    SELECT current_occupancy INTO v_occ FROM public.hostel_rooms WHERE id = p_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Room not found.'); END IF;
    IF p_capacity < v_occ THEN RETURN jsonb_build_object('success', false, 'code', 'CAPACITY_BELOW_OCCUPANCY', 'error', 'Capacity cannot be lower than the ' || v_occ || ' students already in the room.'); END IF;
    UPDATE public.hostel_rooms SET block_name = trim(p_block), floor_number = COALESCE(p_floor,1), room_number = trim(p_room), capacity = p_capacity,
      room_type = COALESCE(NULLIF(trim(p_type),''),'Non-AC'), annual_fee = COALESCE(p_fee,0),
      status = CASE WHEN p_status = 'Maintenance' THEN 'Maintenance' WHEN v_occ >= p_capacity THEN 'Full' ELSE 'Available' END WHERE id = p_id;
    v_id := p_id;
  END IF;
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values)
  VALUES (auth.uid(), v_role, 'hostel_room_saved', 'hostel_rooms', v_id::text, jsonb_build_object('block', p_block, 'room', p_room, 'capacity', p_capacity));
  RETURN jsonb_build_object('success', true, 'id', v_id);
END $$;

--
-- Name: hostel_transfer(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.hostel_transfer(p_student uuid, p_room uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_old UUID; v_res JSONB; v_cap INT; v_occ INT;
BEGIN
  IF public.get_current_user_role() NOT IN ('admin','principal','hostel_warden') THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only admin, principal or the warden can transfer students.'); END IF;
  SELECT id INTO v_old FROM public.hostel_allotments WHERE student_id = p_student AND status = 'Active';
  IF v_old IS NULL THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_ALLOTTED', 'error', 'This student has no room to transfer from.'); END IF;
  SELECT capacity, current_occupancy INTO v_cap, v_occ FROM public.hostel_rooms WHERE id = p_room;
  IF v_cap IS NULL THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Room not found.'); END IF;
  IF v_occ >= v_cap THEN RETURN jsonb_build_object('success', false, 'code', 'ROOM_FULL', 'error', 'The new room is full.'); END IF;
  PERFORM public.hostel_vacate(v_old);
  v_res := public.hostel_allot(p_student, p_room, 'Transferred');
  RETURN v_res;
END $$;

--
-- Name: hostel_vacate(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.hostel_vacate(p_allotment uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_role TEXT := public.get_current_user_role(); a public.hostel_allotments;
BEGIN
  IF auth.uid() IS NULL OR v_role NOT IN ('admin','principal','hostel_warden') THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only admin, principal or the warden can vacate rooms.'); END IF;
  SELECT * INTO a FROM public.hostel_allotments WHERE id = p_allotment FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Allotment not found.'); END IF;
  IF a.status = 'Vacated' THEN RETURN jsonb_build_object('success', true, 'already', true); END IF;
  UPDATE public.hostel_allotments SET status = 'Vacated', vacated_on = CURRENT_DATE WHERE id = p_allotment;
  UPDATE public.hostel_rooms SET current_occupancy = GREATEST(current_occupancy - 1, 0), status = CASE WHEN status = 'Full' THEN 'Available' ELSE status END WHERE id = a.room_id;
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values)
  VALUES (auth.uid(), v_role, 'hostel_vacated', 'hostel_allotments', p_allotment::text, jsonb_build_object('student', a.student_id, 'room', a.room_id));
  RETURN jsonb_build_object('success', true);
END $$;

--
-- Name: integration_overview(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.integration_overview() RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF auth.uid() IS NULL OR public.get_current_user_role() NOT IN ('admin','principal') THEN RETURN jsonb_build_object('allowed', false); END IF;
  RETURN jsonb_build_object('allowed', true, 'items', COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'kind', kind, 'provider', provider, 'enabled', enabled, 'public_config', public_config, 'secret_keys', secret_keys,
    'updated_at', updated_at, 'last_test_at', last_test_at, 'last_test_ok', last_test_ok, 'last_test_message', last_test_message)) FROM public.integration_settings), '[]'::jsonb));
END $$;

--
-- Name: inventory_cancel_order(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.inventory_cancel_order(p_order uuid, p_reason text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE bad JSONB := public._inventory_check(1); o public.inventory_transactions;
BEGIN
  IF bad IS NOT NULL THEN RETURN bad; END IF;
  IF length(trim(COALESCE(p_reason,''))) < 3 THEN RETURN jsonb_build_object('success', false, 'code', 'REASON_REQUIRED', 'error', 'Give a reason.'); END IF;
  SELECT * INTO o FROM public.inventory_transactions WHERE id = p_order AND type = 'Order' FOR UPDATE;
  IF NOT FOUND OR o.status NOT IN ('pending','processing') THEN RETURN jsonb_build_object('success', false, 'code', 'BAD_STATE', 'error', 'Only an open order can be cancelled.'); END IF;
  UPDATE public.inventory_transactions SET status = 'cancelled', note = trim(p_reason) WHERE id = o.id;
  RETURN jsonb_build_object('success', true);
END $$;

--
-- Name: inventory_issue(text, integer, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.inventory_issue(p_item_name text, p_qty integer, p_recipient text, p_department text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE bad JSONB := public._inventory_check(p_qty); it public.inventory_items;
BEGIN
  IF bad IS NOT NULL THEN RETURN bad; END IF;
  IF length(trim(COALESCE(p_recipient,''))) < 2 THEN RETURN jsonb_build_object('success', false, 'code', 'RECIPIENT_REQUIRED', 'error', 'Say who the item is issued to.'); END IF;
  SELECT * INTO it FROM public.inventory_items WHERE lower(name) = lower(trim(p_item_name)) FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'ITEM_NOT_FOUND', 'error', 'No inventory item with that exact name. Add it to the catalogue first.'); END IF;
  IF it.current_stock < p_qty THEN RETURN jsonb_build_object('success', false, 'code', 'INSUFFICIENT_STOCK', 'error', format('Only %s in stock.', it.current_stock)); END IF;
  UPDATE public.inventory_items SET current_stock = current_stock - p_qty, urgency = public._inventory_urgency(current_stock - p_qty, minimum_stock), updated_at = now() WHERE id = it.id;
  INSERT INTO public.inventory_transactions (type, item_id, item_name, quantity, recipient, department, status, created_by) VALUES ('Issue', it.id, it.name, p_qty, trim(p_recipient), NULLIF(trim(COALESCE(p_department,'')),''), 'completed', auth.uid());
  RETURN jsonb_build_object('success', true, 'stock_left', it.current_stock - p_qty);
END $$;

--
-- Name: inventory_order(text, integer, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.inventory_order(p_item_name text, p_qty integer, p_supplier text, p_department text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE bad JSONB := public._inventory_check(p_qty); it public.inventory_items; v_id UUID;
BEGIN
  IF bad IS NOT NULL THEN RETURN bad; END IF;
  IF length(trim(COALESCE(p_supplier,''))) < 2 THEN RETURN jsonb_build_object('success', false, 'code', 'SUPPLIER_REQUIRED', 'error', 'Enter the supplier.'); END IF;
  SELECT * INTO it FROM public.inventory_items WHERE lower(name) = lower(trim(p_item_name));
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'ITEM_NOT_FOUND', 'error', 'No inventory item with that exact name. Add it to the catalogue first.'); END IF;
  INSERT INTO public.inventory_transactions (type, item_id, item_name, quantity, supplier, department, status, created_by) VALUES ('Order', it.id, it.name, p_qty, trim(p_supplier), COALESCE(NULLIF(trim(COALESCE(p_department,'')),''), 'Procurement'), 'pending', auth.uid()) RETURNING id INTO v_id;
  RETURN jsonb_build_object('success', true, 'order_id', v_id);
END $$;

--
-- PostgreSQL database dump complete
--
