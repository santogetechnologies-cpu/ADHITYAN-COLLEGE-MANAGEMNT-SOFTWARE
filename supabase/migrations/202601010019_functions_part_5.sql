-- Functions and RPCs, part 5 of 6
-- Generated from the verified schema. Run as is; do not edit. Safe to run once on an EMPTY database.
SET check_function_bodies = false;
SET search_path = public, extensions;

SET check_function_bodies = false;

--
-- Name: payment_order_refund_check(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.payment_order_refund_check(p_order uuid, p_items jsonb DEFAULT NULL::jsonb) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE o public.payment_orders; it RECORD; v_total NUMERIC := 0; v_pay public.fee_payments; v_amt NUMERIC; v_list JSONB := '[]'::jsonb; x JSONB;
BEGIN
  SELECT * INTO o FROM public.payment_orders WHERE id = p_order;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Order not found.'); END IF;
  IF o.status NOT IN ('Paid','Partially_Refunded','Review') OR o.gateway_payment_id IS NULL THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_REFUNDABLE', 'error', 'This order cannot be refunded.'); END IF;
  IF o.status = 'Review' OR o.store_order_id IS NOT NULL THEN
    IF p_items IS NOT NULL THEN RETURN jsonb_build_object('success', false, 'code', 'WHOLE_ONLY', 'error', 'This order can only be refunded as a whole.'); END IF;
    v_total := o.amount - o.refunded_amount;
    RETURN jsonb_build_object('success', true, 'amount', v_total, 'amount_paise', (v_total * 100)::bigint, 'gateway_payment_id', o.gateway_payment_id, 'items', '[]'::jsonb);
  END IF;
  FOR it IN SELECT pi.student_fee_id, pi.amount FROM public.payment_order_items pi WHERE pi.order_id = o.id LOOP
    SELECT * INTO v_pay FROM public.fee_payments WHERE idempotency_key = 'online-' || o.gateway_payment_id || '-' || it.student_fee_id::text;
    IF NOT FOUND THEN CONTINUE; END IF;
    IF p_items IS NULL THEN v_amt := v_pay.amount - v_pay.refunded_amount;
    ELSE
      SELECT (e->>'amount')::numeric INTO v_amt FROM jsonb_array_elements(p_items) e WHERE (e->>'student_fee_id')::uuid = it.student_fee_id;
      IF v_amt IS NULL THEN CONTINUE; END IF;
    END IF;
    v_amt := round(v_amt, 2);
    IF v_amt <= 0 THEN CONTINUE; END IF;
    IF v_amt > v_pay.amount - v_pay.refunded_amount THEN RETURN jsonb_build_object('success', false, 'code', 'EXCEEDS_PAYMENT', 'error', format('Only %s of that payment can still be refunded.', v_pay.amount - v_pay.refunded_amount)); END IF;
    v_total := v_total + v_amt; v_list := v_list || jsonb_build_object('payment_id', v_pay.id, 'student_fee_id', it.student_fee_id, 'amount', v_amt);
  END LOOP;
  IF p_items IS NOT NULL THEN
    FOR x IN SELECT * FROM jsonb_array_elements(p_items) LOOP
      IF NOT EXISTS (SELECT 1 FROM public.payment_order_items WHERE order_id = o.id AND student_fee_id = (x->>'student_fee_id')::uuid) THEN
        RETURN jsonb_build_object('success', false, 'code', 'NOT_IN_ORDER', 'error', 'A selected fee is not part of this order.'); END IF;
    END LOOP;
  END IF;
  IF v_total <= 0 THEN RETURN jsonb_build_object('success', false, 'code', 'NOTHING_TO_REFUND', 'error', 'Nothing left to refund.'); END IF;
  RETURN jsonb_build_object('success', true, 'amount', v_total, 'amount_paise', (v_total * 100)::bigint, 'gateway_payment_id', o.gateway_payment_id, 'items', v_list);
END $$;

--
-- Name: payment_order_settle(text, text, bigint, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.payment_order_settle(p_gateway_order_id text, p_gateway_payment_id text, p_amount_paise bigint, p_event_id text, p_event_type text, p_payload jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE o public.payment_orders; it RECORD; r JSONB; v_n INT := 0;
BEGIN
  INSERT INTO public.payment_events (gateway_event_id, event_type, gateway_order_id, payload) VALUES (p_event_id, p_event_type, p_gateway_order_id, p_payload)
  ON CONFLICT (gateway_event_id) DO NOTHING;
  SELECT * INTO o FROM public.payment_orders WHERE gateway_order_id = p_gateway_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'UNKNOWN_ORDER', 'error', 'No order for this gateway order id.'); END IF;
  IF o.status = 'Paid' THEN RETURN jsonb_build_object('success', true, 'duplicate', true, 'order_id', o.id); END IF;
  IF o.status = 'Review' THEN RETURN jsonb_build_object('success', true, 'duplicate', true, 'order_id', o.id, 'review', true); END IF;
  IF p_amount_paise IS NULL OR p_amount_paise <> round(o.amount * 100)::bigint THEN
    UPDATE public.payment_orders SET status = 'Review', gateway_payment_id = p_gateway_payment_id, review_note = format('Gateway reports %s paise; order expects %s.', p_amount_paise, round(o.amount * 100)::bigint) WHERE id = o.id;
    RETURN jsonb_build_object('success', false, 'code', 'AMOUNT_MISMATCH', 'error', 'Amount does not match the order; sent to finance review.');
  END IF;
  BEGIN
    IF o.store_order_id IS NOT NULL THEN
      UPDATE public.store_orders SET payment_status = 'Paid', payment_order_id = o.id, updated_at = now() WHERE id = o.store_order_id AND status IN ('Pending','Processing') AND payment_status = 'Unpaid';
      IF NOT FOUND THEN RAISE EXCEPTION 'STORE_ORDER_NOT_PAYABLE'; END IF;
      v_n := 1;
    END IF;
    FOR it IN SELECT * FROM public.payment_order_items WHERE order_id = o.id ORDER BY student_fee_id LOOP
      r := public.record_fee_payment(it.student_fee_id, it.amount, 'Online_Gateway', p_gateway_payment_id, 'online-' || p_gateway_payment_id || '-' || it.student_fee_id::text, o.created_by, 'Online payment ' || o.id::text);
      IF NOT COALESCE((r->>'success')::boolean, FALSE) THEN RAISE EXCEPTION 'APPLY_FAILED: %', COALESCE(r->>'error', r->>'code'); END IF;
      v_n := v_n + 1;
    END LOOP;
  EXCEPTION WHEN raise_exception THEN
    -- nothing was applied (the block rolls back); the money has been taken, so finance must resolve it
    UPDATE public.payment_orders SET status = 'Review', gateway_payment_id = p_gateway_payment_id, review_note = SQLERRM WHERE id = o.id;
    RETURN jsonb_build_object('success', false, 'code', 'NEEDS_REVIEW', 'error', SQLERRM);
  END;
  UPDATE public.payment_orders SET status = 'Paid', gateway_payment_id = p_gateway_payment_id, paid_at = now() WHERE id = o.id;
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values)
  VALUES (o.created_by, o.payer_role, 'online_payment_settled', 'payment_orders', o.id::text, jsonb_build_object('amount', o.amount, 'payment_id', p_gateway_payment_id, 'items', v_n));
  RETURN jsonb_build_object('success', true, 'duplicate', false, 'order_id', o.id, 'applied', v_n);
END $$;

--
-- Name: payment_reconciliation(date, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.payment_reconciliation(p_from date, p_to date) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_days JSONB; v_ex JSONB;
BEGIN
  IF auth.uid() IS NULL OR public.get_current_user_role() NOT IN ('admin','principal','finance_manager','accountant','financier') THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Not allowed.'); END IF;
  IF p_from IS NULL OR p_to IS NULL OR p_to < p_from OR p_to - p_from > 366 THEN RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Choose a range of at most one year.'); END IF;
  SELECT COALESCE(jsonb_agg(d ORDER BY d->>'day', d->>'mode'), '[]'::jsonb) INTO v_days FROM (
    SELECT jsonb_build_object('day', paid_at::date, 'mode', payment_mode, 'payments', count(*) FILTER (WHERE status = 'Completed'),
             'collected', COALESCE(sum(amount) FILTER (WHERE status = 'Completed'), 0), 'reversed', COALESCE(sum(amount) FILTER (WHERE status = 'Reversed'), 0)) AS d
      FROM public.fee_payments WHERE paid_at::date BETWEEN p_from AND p_to GROUP BY paid_at::date, payment_mode) q;
  SELECT COALESCE(jsonb_agg(e), '[]'::jsonb) INTO v_ex FROM (
    SELECT jsonb_build_object('kind', 'order_in_review', 'ref', id, 'amount', amount, 'note', review_note) AS e FROM public.payment_orders WHERE status = 'Review'
    UNION ALL SELECT jsonb_build_object('kind', 'order_stuck', 'ref', id, 'amount', amount, 'note', 'Created ' || created_at::text || ' but never confirmed') FROM public.payment_orders WHERE status = 'Created' AND gateway_order_id IS NOT NULL AND created_at < now() - interval '1 day'
    UNION ALL SELECT jsonb_build_object('kind', 'online_payment_without_order', 'ref', fp.id, 'amount', fp.amount, 'note', fp.transaction_reference) FROM public.fee_payments fp
      WHERE fp.payment_mode = 'Online_Gateway' AND fp.status = 'Completed' AND NOT EXISTS (SELECT 1 FROM public.payment_orders o WHERE o.gateway_payment_id = fp.transaction_reference AND o.status = 'Paid')) x;
  RETURN jsonb_build_object('success', true, 'days', v_days, 'exceptions', v_ex);
END $$;

--
-- Name: payment_settlement_import(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.payment_settlement_import(p_rows jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); r JSONB; o public.payment_orders; v_amt NUMERIC; v_fee NUMERIC; v_tax NUMERIC; v_net NUMERIC; v_status TEXT;
  v_new INT := 0; v_dup INT := 0; v_mis JSONB := '[]'::jsonb; v_unk JSONB := '[]'::jsonb; v_unsettled JSONB; v_sid TEXT; v_pid TEXT; n INT;
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('admin','finance_manager','accountant') THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only finance can import settlements.'); END IF;
  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' OR jsonb_array_length(p_rows) = 0 OR jsonb_array_length(p_rows) > 5000 THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Provide between 1 and 5000 settlement rows.'); END IF;
  FOR r IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    v_sid := NULLIF(trim(r->>'settlement_id'), ''); v_pid := NULLIF(trim(r->>'payment_id'), '');
    IF v_sid IS NULL OR v_pid IS NULL THEN RETURN jsonb_build_object('success', false, 'code', 'INVALID_ROW', 'error', 'Every row needs a settlement id and a payment id.'); END IF;
    BEGIN v_amt := round((r->>'amount')::numeric, 2); v_fee := round(COALESCE(NULLIF(r->>'fee','')::numeric, 0), 2); v_tax := round(COALESCE(NULLIF(r->>'tax','')::numeric, 0), 2);
    EXCEPTION WHEN others THEN RETURN jsonb_build_object('success', false, 'code', 'INVALID_ROW', 'error', 'Amounts must be numbers (payment ' || v_pid || ').'); END;
    IF v_amt IS NULL OR v_amt <= 0 THEN RETURN jsonb_build_object('success', false, 'code', 'INVALID_ROW', 'error', 'Amount must be above zero (payment ' || v_pid || ').'); END IF;
    v_net := COALESCE(NULLIF(r->>'net','')::numeric, v_amt - v_fee - v_tax);
    SELECT * INTO o FROM public.payment_orders WHERE gateway_payment_id = v_pid;
    v_status := CASE WHEN NOT FOUND THEN 'UnknownPayment' WHEN o.amount = v_amt THEN 'Matched' ELSE 'AmountMismatch' END;
    INSERT INTO public.payment_settlements (settlement_id, gateway_payment_id, amount, fee, tax, net, settled_at, order_id, status, imported_by)
    VALUES (v_sid, v_pid, v_amt, v_fee, v_tax, v_net, NULLIF(r->>'settled_at','')::timestamptz, o.id, v_status, v_uid) ON CONFLICT (settlement_id, gateway_payment_id) DO NOTHING;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n = 0 THEN v_dup := v_dup + 1; CONTINUE; END IF;
    v_new := v_new + 1;
    IF v_status = 'AmountMismatch' THEN v_mis := v_mis || jsonb_build_object('payment_id', v_pid, 'file_amount', v_amt, 'our_amount', o.amount);
    ELSIF v_status = 'UnknownPayment' THEN v_unk := v_unk || jsonb_build_object('payment_id', v_pid, 'amount', v_amt); END IF;
  END LOOP;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('order_id', po.id, 'payment_id', po.gateway_payment_id, 'amount', po.amount, 'paid_at', po.paid_at)), '[]'::jsonb) INTO v_unsettled
    FROM public.payment_orders po WHERE po.status IN ('Paid','Partially_Refunded') AND po.paid_at < now() - interval '3 days'
     AND NOT EXISTS (SELECT 1 FROM public.payment_settlements s WHERE s.gateway_payment_id = po.gateway_payment_id);
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values) VALUES (v_uid, v_role, 'settlement_imported', 'payment_settlements', 'batch', jsonb_build_object('new', v_new, 'duplicates', v_dup, 'mismatches', jsonb_array_length(v_mis), 'unknown', jsonb_array_length(v_unk)));
  RETURN jsonb_build_object('success', true, 'imported', v_new, 'duplicates', v_dup, 'amount_mismatches', v_mis, 'unknown_payments', v_unk, 'paid_but_not_settled', v_unsettled);
END $$;

--
-- Name: payroll_configure(numeric, numeric, numeric, numeric, numeric, text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.payroll_configure(p_epf_rate numeric, p_epf_ceiling numeric, p_esi_rate numeric, p_esi_limit numeric, p_pt numeric, p_lop_types text[] DEFAULT NULL::text[]) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('admin','hr_manager','finance_manager') THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only admin, HR or finance can set payroll rules.'); END IF;
  IF p_epf_rate IS NULL OR p_epf_rate < 0 OR p_epf_rate > 100 OR p_esi_rate IS NULL OR p_esi_rate < 0 OR p_esi_rate > 100 OR p_pt IS NULL OR p_pt < 0
     OR (p_epf_ceiling IS NOT NULL AND p_epf_ceiling <= 0) OR (p_esi_limit IS NOT NULL AND p_esi_limit <= 0) THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Rates must be between 0 and 100 and amounts must be positive.'); END IF;
  UPDATE public.payroll_settings SET configured = TRUE, epf_rate_pct = p_epf_rate, epf_wage_ceiling = p_epf_ceiling, esi_rate_pct = p_esi_rate,
         esi_gross_limit = p_esi_limit, professional_tax_monthly = p_pt, lop_leave_types = COALESCE(p_lop_types, lop_leave_types), updated_by = v_uid, updated_at = now() WHERE id;
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values)
  VALUES (v_uid, v_role, 'payroll_rules_set', 'payroll_settings', 'singleton', jsonb_build_object('epf', p_epf_rate, 'epf_ceiling', p_epf_ceiling, 'esi', p_esi_rate, 'esi_limit', p_esi_limit, 'pt', p_pt));
  RETURN jsonb_build_object('success', true);
END $$;

--
-- Name: payroll_run_approve(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.payroll_run_approve(p_run uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); r public.staff_payroll_runs;
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('admin','principal','finance_manager') THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only finance, the principal or admin can approve payroll.'); END IF;
  SELECT * INTO r FROM public.staff_payroll_runs WHERE id = p_run FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Run not found.'); END IF;
  IF r.status <> 'Draft' THEN RETURN jsonb_build_object('success', false, 'code', 'BAD_STATE', 'error', 'Only a draft run can be approved.'); END IF;
  IF r.processed_by = v_uid THEN RETURN jsonb_build_object('success', false, 'code', 'SEPARATION_OF_DUTIES', 'error', 'The person who prepared the run cannot approve it.'); END IF;
  UPDATE public.staff_payroll_runs SET status = 'Approved', approved_by = v_uid, approved_at = now() WHERE id = p_run;
  UPDATE public.staff_payroll_items SET status = 'Approved' WHERE payroll_run_id = p_run;
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values) VALUES (v_uid, v_role, 'payroll_run_approved', 'staff_payroll_runs', p_run::text, jsonb_build_object('month', r.month_year, 'net', r.total_net_disbursed));
  RETURN jsonb_build_object('success', true);
END $$;

--
-- Name: payroll_run_cancel(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.payroll_run_cancel(p_run uuid, p_reason text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); r public.staff_payroll_runs;
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('admin','hr_manager','finance_manager') THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Not allowed.'); END IF;
  IF length(trim(COALESCE(p_reason,''))) < 3 THEN RETURN jsonb_build_object('success', false, 'code', 'REASON_REQUIRED', 'error', 'A reason is required.'); END IF;
  SELECT * INTO r FROM public.staff_payroll_runs WHERE id = p_run FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Run not found.'); END IF;
  IF r.status NOT IN ('Draft','Approved') THEN RETURN jsonb_build_object('success', false, 'code', 'BAD_STATE', 'error', 'A paid or cancelled run cannot be cancelled.'); END IF;
  UPDATE public.staff_payroll_runs SET status = 'Cancelled' WHERE id = p_run;
  UPDATE public.staff_payroll_items SET status = 'Cancelled' WHERE payroll_run_id = p_run;
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values) VALUES (v_uid, v_role, 'payroll_run_cancelled', 'staff_payroll_runs', p_run::text, jsonb_build_object('reason', p_reason));
  RETURN jsonb_build_object('success', true);
END $$;

--
-- Name: payroll_run_create(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.payroll_run_create(p_month text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $_$
DECLARE
  v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); st public.payroll_settings; v_run UUID; v_label TEXT;
  v_start DATE; v_end DATE; v_days INT; s RECORD; v_lop INT; v_worked INT; v_basic NUMERIC; v_da NUMERIC; v_hra NUMERIC; v_sp NUMERIC;
  v_gross NUMERIC; v_epf NUMERIC; v_esi NUMERIC; v_ded NUMERIC; v_n INT := 0; v_g NUMERIC := 0; v_d NUMERIC := 0; v_net NUMERIC := 0; v_ratio NUMERIC;
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('admin','hr_manager','finance_manager') THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only admin, HR or finance can prepare payroll.'); END IF;
  IF p_month IS NULL OR p_month !~ '^\d{4}-(0[1-9]|1[0-2])$' THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_MONTH', 'error', 'Month must look like 2026-04.'); END IF;
  SELECT * INTO st FROM public.payroll_settings WHERE id;
  IF NOT st.configured THEN
    RETURN jsonb_build_object('success', false, 'code', 'NOT_CONFIGURED', 'error', 'Set the institution''s payroll rules (EPF, ESI, professional tax) before running payroll.'); END IF;
  v_start := to_date(p_month || '-01', 'YYYY-MM-DD'); v_end := (v_start + interval '1 month - 1 day')::date; v_days := (v_end - v_start) + 1;
  v_label := to_char(v_start, 'FMMonth YYYY');
  IF EXISTS (SELECT 1 FROM public.staff_payroll_runs WHERE month_year = v_label AND status <> 'Cancelled') THEN
    RETURN jsonb_build_object('success', false, 'code', 'ALREADY_RUN', 'error', 'A payroll run already exists for ' || v_label || '.'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.staff_service_records WHERE status = 'Active' AND basic_pay > 0) THEN
    RETURN jsonb_build_object('success', false, 'code', 'NO_STAFF', 'error', 'No active staff with a basic pay on record.'); END IF;

  INSERT INTO public.staff_payroll_runs (month_year, total_gross_disbursed, total_deductions, total_net_disbursed, total_employees, run_date, status, processed_by)
  VALUES (v_label, 0, 0, 0, 0, CURRENT_DATE, 'Draft', v_uid) RETURNING id INTO v_run;

  FOR s IN SELECT r.*, COALESCE(p.name, r.employee_code) AS pname FROM public.staff_service_records r LEFT JOIN public.profiles p ON p.id = r.user_id
           WHERE r.status = 'Active' AND r.basic_pay > 0 AND r.date_of_joining <= v_end ORDER BY r.employee_code LOOP
    -- days of approved leave without pay that fall inside the month
    SELECT COALESCE(sum(GREATEST(0, (LEAST(la.end_date, v_end) - GREATEST(la.start_date, v_start)) + 1)), 0)::int INTO v_lop
      FROM public.staff_leave_applications la
     WHERE la.user_id = s.user_id AND la.status = 'Approved' AND la.start_date <= v_end AND la.end_date >= v_start
       AND EXISTS (SELECT 1 FROM unnest(st.lop_leave_types) t WHERE la.leave_type ILIKE '%' || t || '%');
    -- joining mid-month: only days from the joining date count
    v_worked := GREATEST(0, v_days - GREATEST(0, (s.date_of_joining - v_start))) ;
    v_worked := GREATEST(0, v_worked - v_lop);
    v_ratio := v_worked::numeric / v_days;
    v_basic := round(s.basic_pay * v_ratio);
    v_da    := round(s.basic_pay * s.da_pct / 100 * v_ratio);
    v_hra   := round(s.basic_pay * s.hra_pct / 100 * v_ratio);
    v_sp    := round(s.special_allowance * v_ratio);
    v_gross := v_basic + v_da + v_hra + v_sp;
    v_epf := CASE WHEN s.epf_opt_out THEN 0 ELSE round(LEAST(v_basic, COALESCE(st.epf_wage_ceiling, v_basic)) * st.epf_rate_pct / 100) END;
    v_esi := CASE WHEN st.esi_gross_limit IS NOT NULL AND v_gross <= st.esi_gross_limit THEN round(v_gross * st.esi_rate_pct / 100) ELSE 0 END;
    v_ded := v_epf + v_esi + st.professional_tax_monthly + s.monthly_tds + s.other_deductions;
    INSERT INTO public.staff_payroll_items (payroll_run_id, user_id, employee_code, employee_name, department, designation, month_year, days_in_month, days_worked, lop_days,
        basic_earned, da_earned, hra_earned, special_allowance, gross_salary, epf_deduction, esi_deduction, pt_deduction, tds_deduction, other_deductions, total_deductions, net_salary, payslip_number, status)
    VALUES (v_run, s.user_id, s.employee_code, s.pname, s.department, s.designation, v_label, v_days, v_worked, v_lop,
        v_basic, v_da, v_hra, v_sp, v_gross, v_epf, v_esi, st.professional_tax_monthly, s.monthly_tds, s.other_deductions, v_ded, v_gross - v_ded,
        'PS-' || to_char(v_start, 'YYYYMM') || '-' || lpad(nextval('public.payslip_seq')::text, 5, '0'), 'Draft');
    v_n := v_n + 1; v_g := v_g + v_gross; v_d := v_d + v_ded; v_net := v_net + (v_gross - v_ded);
  END LOOP;
  UPDATE public.staff_payroll_runs SET total_employees = v_n, total_gross_disbursed = v_g, total_deductions = v_d, total_net_disbursed = v_net WHERE id = v_run;
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values)
  VALUES (v_uid, v_role, 'payroll_run_created', 'staff_payroll_runs', v_run::text, jsonb_build_object('month', v_label, 'employees', v_n, 'gross', v_g, 'net', v_net));
  RETURN jsonb_build_object('success', true, 'run_id', v_run, 'employees', v_n, 'gross', v_g, 'net', v_net);
END $_$;

--
-- Name: payroll_run_disburse(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.payroll_run_disburse(p_run uuid, p_reference text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); r public.staff_payroll_runs;
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('admin','finance_manager','accountant') THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only finance or admin can record a disbursement.'); END IF;
  IF length(trim(COALESCE(p_reference,''))) < 4 THEN RETURN jsonb_build_object('success', false, 'code', 'REFERENCE_REQUIRED', 'error', 'Enter the bank batch / transaction reference.'); END IF;
  SELECT * INTO r FROM public.staff_payroll_runs WHERE id = p_run FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Run not found.'); END IF;
  IF r.status <> 'Approved' THEN RETURN jsonb_build_object('success', false, 'code', 'BAD_STATE', 'error', 'Only an approved run can be marked as paid.'); END IF;
  UPDATE public.staff_payroll_runs SET status = 'Disbursed', disbursed_at = now(), payment_reference = trim(p_reference) WHERE id = p_run;
  UPDATE public.staff_payroll_items SET status = 'Disbursed', payment_reference = trim(p_reference) WHERE payroll_run_id = p_run;
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values) VALUES (v_uid, v_role, 'payroll_run_disbursed', 'staff_payroll_runs', p_run::text, jsonb_build_object('reference', p_reference, 'net', r.total_net_disbursed));
  RETURN jsonb_build_object('success', true);
END $$;

--
-- Name: place_store_order(uuid, text, jsonb, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.place_store_order(p_user_id uuid, p_user_name text, p_items jsonb, p_total_amount numeric) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    item RECORD;
    v_product_id UUID;
    v_qty INT;
    v_available_stock INT;
    v_product_name TEXT;
    v_order_id UUID;
    v_order_result JSONB;
BEGIN
    -- Verify caller matches user_id or is privileged
    IF auth.uid() IS NULL OR (auth.uid() <> p_user_id AND public.get_current_user_role() NOT IN ('admin', 'store_manager', 'storekeeper')) THEN
        RAISE EXCEPTION 'Unauthorized order placement';
    END IF;

    -- Validate stock for each item atomically
    FOR item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(id UUID, name TEXT, quantity INT, price NUMERIC)
    LOOP
        v_product_id := item.id;
        v_qty := item.quantity;

        SELECT stock, name INTO v_available_stock, v_product_name
        FROM public.store_products
        WHERE id = v_product_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product % not found in store catalog.', item.name;
        END IF;

        IF v_available_stock < v_qty THEN
            RAISE EXCEPTION 'Insufficient stock for "%": % requested, but only % available.', v_product_name, v_qty, v_available_stock;
        END IF;

        -- Deduct stock
        UPDATE public.store_products
        SET stock = stock - v_qty,
            updated_at = NOW()
        WHERE id = v_product_id;
    END LOOP;

    -- Create store order record
    INSERT INTO public.store_orders (
        user_id,
        user_name,
        items,
        total_amount,
        status,
        created_at
    ) VALUES (
        p_user_id,
        p_user_name,
        p_items,
        p_total_amount,
        'Pending',
        NOW()
    )
    RETURNING id INTO v_order_id;

    SELECT to_jsonb(o.*) INTO v_order_result
    FROM public.store_orders o
    WHERE o.id = v_order_id;

    RETURN v_order_result;
END;
$$;

--
-- Name: placement_app_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.placement_app_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF public.get_current_user_role() NOT IN ('admin','principal','placement_officer') THEN
    NEW.cgpa := OLD.cgpa; NEW.department := OLD.department; NEW.student_name := OLD.student_name; NEW.roll_number := OLD.roll_number;
    NEW.current_round := OLD.current_round; NEW.offer_letter_url := OLD.offer_letter_url; NEW.drive_id := OLD.drive_id; NEW.student_id := OLD.student_id;
  END IF;
  RETURN NEW;
END $$;

--
-- Name: placement_apply(uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.placement_apply(p_drive uuid, p_cgpa numeric) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_uid UUID := auth.uid(); d public.placement_drives; pr public.profiles; s public.students; v_dept TEXT; v_roll TEXT; v_name TEXT; v_id UUID;
        g JSONB; v_cgpa NUMERIC; v_verified BOOLEAN := FALSE;
BEGIN
  IF v_uid IS NULL OR public.get_current_user_role() <> 'student' THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only students can apply.'); END IF;
  SELECT * INTO d FROM public.placement_drives WHERE id = p_drive;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Drive not found.'); END IF;
  IF d.status <> 'Open' OR d.application_deadline < CURRENT_DATE THEN
    RETURN jsonb_build_object('success', false, 'code', 'CLOSED', 'error', 'Applications for this drive are closed.'); END IF;
  g := public.student_gpa(v_uid);
  IF COALESCE((g->>'credits')::numeric, 0) > 0 AND (g->>'cgpa') IS NOT NULL THEN
    v_cgpa := (g->>'cgpa')::numeric; v_verified := TRUE;               -- computed from published results; the typed value is ignored
  ELSE
    IF p_cgpa IS NULL OR p_cgpa < 0 OR p_cgpa > 10 THEN
      RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'No published results yet — enter your CGPA (0 to 10); the placement cell will verify it.'); END IF;
    v_cgpa := p_cgpa;
  END IF;
  SELECT * INTO pr FROM public.profiles WHERE id = v_uid;
  SELECT * INTO s FROM public.students WHERE user_id = v_uid LIMIT 1;
  v_dept := COALESCE(s.department, pr.department); v_name := COALESCE(s.name, pr.name); v_roll := COALESCE(s.roll_number, s.student_id, pr.roll_number, pr.student_id);
  IF v_dept IS NULL OR v_roll IS NULL THEN RETURN jsonb_build_object('success', false, 'code', 'PROFILE_INCOMPLETE', 'error', 'Your department or student ID is missing from your record. Contact the office.'); END IF;
  IF d.eligible_departments IS NOT NULL AND array_length(d.eligible_departments, 1) > 0
     AND NOT EXISTS (SELECT 1 FROM unnest(d.eligible_departments) e WHERE lower(trim(e)) = lower(trim(v_dept))) THEN
    RETURN jsonb_build_object('success', false, 'code', 'NOT_ELIGIBLE', 'error', 'This drive is not open to your department.'); END IF;
  IF d.min_cgpa IS NOT NULL AND v_cgpa < d.min_cgpa THEN
    RETURN jsonb_build_object('success', false, 'code', 'NOT_ELIGIBLE', 'error', 'This drive requires a CGPA of at least ' || d.min_cgpa || (CASE WHEN v_verified THEN ' (yours is ' || v_cgpa || ').' ELSE '.' END)); END IF;
  IF d.max_backlogs IS NOT NULL AND v_verified AND COALESCE((g->>'arrears')::int, 0) > d.max_backlogs THEN
    RETURN jsonb_build_object('success', false, 'code', 'NOT_ELIGIBLE', 'error', 'This drive allows at most ' || d.max_backlogs || ' arrear(s).'); END IF;
  IF EXISTS (SELECT 1 FROM public.placement_applications WHERE drive_id = p_drive AND student_id = v_uid) THEN
    RETURN jsonb_build_object('success', false, 'code', 'ALREADY_APPLIED', 'error', 'You have already applied to this drive.'); END IF;
  INSERT INTO public.placement_applications (drive_id, student_id, student_name, roll_number, department, cgpa, status, cgpa_verified)
  VALUES (p_drive, v_uid, v_name, v_roll, v_dept, v_cgpa, 'Applied', v_verified) RETURNING id INTO v_id;
  RETURN jsonb_build_object('success', true, 'id', v_id, 'cgpa', v_cgpa, 'verified', v_verified);
END $$;

--
-- Name: prevent_audit_log_modification(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_audit_log_modification() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    RAISE EXCEPTION 'Security Violation: Audit logs are strictly append-only. UPDATE and DELETE operations are permanently prohibited.' 
        USING ERRCODE = '42501';
END;
$$;

--
-- Name: prevent_audit_log_truncate(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_audit_log_truncate() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    RAISE EXCEPTION 'Security Violation: Audit logs cannot be truncated. TRUNCATE operation is permanently prohibited.' 
        USING ERRCODE = '42501';
END;
$$;

--
-- Name: promotion_history(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.promotion_history() RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF auth.uid() IS NULL OR public.get_current_user_role() NOT IN ('admin','principal') THEN RETURN jsonb_build_object('items', '[]'::jsonb); END IF;
  RETURN jsonb_build_object('items', COALESCE((SELECT jsonb_agg(x ORDER BY (x->>'at') DESC) FROM (
    SELECT jsonb_build_object('batch_id', batch_id, 'action', max(action), 'count', count(*), 'academic_year', max(academic_year), 'at', max(created_at),
      'undone', EXISTS (SELECT 1 FROM public.student_promotions u WHERE u.action = 'undo' AND u.to_status = sp.batch_id::text)) AS x
    FROM public.student_promotions sp WHERE action IN ('promote','graduate') GROUP BY batch_id LIMIT 50) q), '[]'::jsonb));
END $$;

--
-- Name: promotion_preview(text, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.promotion_preview(p_department text DEFAULT NULL::text, p_class text DEFAULT NULL::text, p_semester integer DEFAULT NULL::integer) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF auth.uid() IS NULL OR public.get_current_user_role() NOT IN ('admin','principal') THEN
    RETURN jsonb_build_object('items', '[]'::jsonb); END IF;
  RETURN jsonb_build_object('items', COALESCE((
    SELECT jsonb_agg(jsonb_build_object('id', s.id, 'student_id', s.student_id, 'name', s.name, 'department', s.department, 'class_name', s.class_name,
      'semester', s.current_semester, 'dues', COALESCE((SELECT sum(f.total_due) FROM public.student_fees f WHERE f.student_id = s.user_id AND f.total_due > 0), 0),
      'arrear_subjects', COALESCE((SELECT count(*) FROM public.exam_results er WHERE er.student_id = s.user_id AND er.marks_obtained IS NOT NULL AND er.max_marks > 0 AND er.marks_obtained * 100.0 / er.max_marks < 40), 0))
    ORDER BY s.class_name, s.name)
    FROM public.students s
    WHERE s.status = 'active' AND (p_department IS NULL OR s.department = p_department) AND (p_class IS NULL OR s.class_name = p_class)
      AND (p_semester IS NULL OR s.current_semester = p_semester)), '[]'::jsonb));
END $$;

--
-- Name: protect_attendance_record_immutable_columns(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_attendance_record_immutable_columns() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_jwt_role TEXT;
    v_caller_role TEXT;
    v_caller_status TEXT;
    v_session_created_at TIMESTAMPTZ;
BEGIN
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

    SELECT role, status INTO v_caller_role, v_caller_status
    FROM public.profiles
    WHERE id = auth.uid();

    IF v_caller_role IS NULL OR v_caller_status IS DISTINCT FROM 'active' THEN
        RAISE EXCEPTION 'Access Denied: Unauthenticated, missing or inactive account.' 
            USING ERRCODE = '42501';
    END IF;

    IF v_caller_role NOT IN ('admin', 'principal') THEN
        IF NEW.student_id IS DISTINCT FROM OLD.student_id THEN
            RAISE EXCEPTION 'Security Violation: student_id cannot be modified on attendance records.' 
                USING ERRCODE = '42501';
        END IF;

        IF NEW.session_id IS DISTINCT FROM OLD.session_id THEN
            RAISE EXCEPTION 'Security Violation: session_id cannot be modified on attendance records.' 
                USING ERRCODE = '42501';
        END IF;

        IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
            RAISE EXCEPTION 'Security Violation: created_at is immutable on attendance records.' 
                USING ERRCODE = '42501';
        END IF;

        -- Enforce 24-hour window from session creation timestamp
        SELECT created_at INTO v_session_created_at
        FROM public.class_attendance_sessions
        WHERE id = OLD.session_id;

        IF v_session_created_at IS NOT NULL AND v_session_created_at < NOW() - INTERVAL '24 hours' THEN
            RAISE EXCEPTION 'Security Violation: Attendance record modification window (24 hours) has expired.' 
                USING ERRCODE = '42501';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

--
-- Name: protect_attendance_session_immutable_columns(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_attendance_session_immutable_columns() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_jwt_role TEXT;
    v_caller_role TEXT;
    v_caller_status TEXT;
BEGIN
    -- Trusted service role or physical direct DBA bypass
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

    -- Query caller profile and enforce fail-closed check
    SELECT role, status INTO v_caller_role, v_caller_status
    FROM public.profiles
    WHERE id = auth.uid();

    IF v_caller_role IS NULL OR v_caller_status IS DISTINCT FROM 'active' THEN
        RAISE EXCEPTION 'Access Denied: Unauthenticated, missing or inactive account.' 
            USING ERRCODE = '42501';
    END IF;

    IF v_caller_role NOT IN ('admin', 'principal') THEN
        IF NEW.teacher_id IS DISTINCT FROM OLD.teacher_id THEN
            RAISE EXCEPTION 'Security Violation: Session teacher assignment is immutable.' 
                USING ERRCODE = '42501';
        END IF;

        IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
            RAISE EXCEPTION 'Security Violation: Session creation timestamp is immutable.' 
                USING ERRCODE = '42501';
        END IF;

        -- Enforce 24-hour correction window
        IF OLD.created_at < NOW() - INTERVAL '24 hours' THEN
            RAISE EXCEPTION 'Security Violation: Attendance session modification window (24 hours) has expired. Contact HOD or Administrator.' 
                USING ERRCODE = '42501';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

--
-- Name: protect_profile_sensitive_columns(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_profile_sensitive_columns() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_jwt_role TEXT;
    v_caller_role TEXT;
    v_caller_status TEXT;
    v_caller_id UUID;
BEGIN
    -- 1. Check for trusted backend service-role API execution via JWT claim
    BEGIN
        v_jwt_role := current_setting('request.jwt.claim.role', true);
    EXCEPTION WHEN OTHERS THEN
        v_jwt_role := NULL;
    END;

    IF v_jwt_role = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- 2. Check for physical direct database connection (CLI migrations, DBA maintenance)
    IF auth.uid() IS NULL AND session_user IN ('postgres', 'supabase_admin') THEN
        RETURN NEW;
    END IF;

    -- 3. Authenticated end-user invocation: query database profile for role and status
    v_caller_id := auth.uid();
    SELECT role, status INTO v_caller_role, v_caller_status
    FROM public.profiles
    WHERE id = v_caller_id;

    -- Fail-closed: missing caller profile or non-active account is forbidden
    IF v_caller_role IS NULL OR v_caller_status IS DISTINCT FROM 'active' THEN
        RAISE EXCEPTION 'Access Denied: Unregistered, missing or inactive account.' 
            USING ERRCODE = '42501';
    END IF;

    -- DEF-106: SELF-MUTATION RESTRICTIONS (Applies to ALL callers, including Admin & Principal on own account)
    IF v_caller_id = OLD.id THEN
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'Security Violation: Self-modification of user role is strictly prohibited.' 
                USING ERRCODE = '42501';
        END IF;
        IF NEW.status IS DISTINCT FROM OLD.status THEN
            RAISE EXCEPTION 'Security Violation: Self-modification of account status is strictly prohibited.' 
                USING ERRCODE = '42501';
        END IF;
        IF NEW.student_id IS DISTINCT FROM OLD.student_id THEN
            RAISE EXCEPTION 'Security Violation: Self-modification of student_id is strictly prohibited.' 
                USING ERRCODE = '42501';
        END IF;
        IF NEW.roll_number IS DISTINCT FROM OLD.roll_number THEN
            RAISE EXCEPTION 'Security Violation: Self-modification of roll_number is strictly prohibited.' 
                USING ERRCODE = '42501';
        END IF;
        IF NEW.login_id IS DISTINCT FROM OLD.login_id THEN
            RAISE EXCEPTION 'Security Violation: Self-modification of login_id is strictly prohibited.' 
                USING ERRCODE = '42501';
        END IF;
        IF NEW.email IS DISTINCT FROM OLD.email THEN
            RAISE EXCEPTION 'Security Violation: Self-modification of profile email is strictly prohibited.' 
                USING ERRCODE = '42501';
        END IF;
    END IF;

    -- INSTITUTIONAL ADMINISTRATOR
    IF v_caller_role = 'admin' THEN
        RETURN NEW;
    END IF;

    -- PRINCIPAL PRIVILEGE BOUNDARIES (DEF-106 & DEF-122)
    IF v_caller_role = 'principal' THEN
        -- Rule 1: Cannot touch 'admin' accounts in any way
        IF NEW.role = 'admin' OR OLD.role = 'admin' THEN
            RAISE EXCEPTION 'Security Violation: Principal cannot manage administrative accounts.' 
                USING ERRCODE = '42501';
        END IF;

        -- Rule 2: Cannot touch other 'principal' accounts
        IF (NEW.role = 'principal' AND OLD.role <> 'principal') 
           OR (OLD.role = 'principal' AND OLD.id <> v_caller_id) THEN
            RAISE EXCEPTION 'Security Violation: Principal cannot manage other principal accounts.' 
                USING ERRCODE = '42501';
        END IF;

        -- Rule 3: Cannot touch financial administration roles
        IF NEW.role IN ('finance_manager', 'financier', 'accountant') 
           OR OLD.role IN ('finance_manager', 'financier', 'accountant') THEN
            RAISE EXCEPTION 'Security Violation: Principal cannot manage financial administration roles.' 
                USING ERRCODE = '42501';
        END IF;

        -- Rule 4: DEF-122 Disciplinary Status Barrier (Principal cannot suspend OR unsuspend accounts)
        IF NEW.status = 'suspended' OR OLD.status = 'suspended' THEN
            RAISE EXCEPTION 'Security Violation: Account suspension and disciplinary reinstatement are reserved strictly for System Administration.' 
                USING ERRCODE = '42501';
        END IF;

        -- Rule 5: Principal status modification restriction: Staff account status changes reserved for Admin
        IF OLD.role NOT IN ('student', 'parent') AND NEW.status IS DISTINCT FROM OLD.status THEN
            RAISE EXCEPTION 'Security Violation: Principal can only modify status for student and parent accounts. Staff account status modification requires System Administrator.' 
                USING ERRCODE = '42501';
        END IF;

        -- Rule 6: Explicit whitelist of assignable institutional roles
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            IF NEW.role NOT IN (
                'teacher', 'hod', 'student', 'parent', 'coe', 'librarian', 
                'receptionist', 'hostel_warden', 'placement_officer', 
                'transport_driver', 'driver', 'hr_manager', 'store_manager', 'storekeeper'
            ) THEN
                RAISE EXCEPTION 'Security Violation: Role % cannot be assigned by Principal.', NEW.role 
                    USING ERRCODE = '42501';
            END IF;
        END IF;

        -- Rule 7: Protection of Email Address (Identity modification reserved for Admin)
        IF NEW.email IS DISTINCT FROM OLD.email THEN
            RAISE EXCEPTION 'Security Violation: Principal cannot modify user email addresses. Identity modifications must be performed by System Administrator.' 
                USING ERRCODE = '42501';
        END IF;

        -- Rule 8: Protection of Login ID (cannot overwrite existing populated identifier)
        IF NEW.login_id IS DISTINCT FROM OLD.login_id AND OLD.login_id IS NOT NULL THEN
            RAISE EXCEPTION 'Security Violation: Principal cannot overwrite an existing login_id. Contact System Administrator.' 
                USING ERRCODE = '42501';
        END IF;

        -- Rule 9: Protection of Student ID & Roll Number (cannot overwrite existing)
        IF NEW.student_id IS DISTINCT FROM OLD.student_id AND OLD.student_id IS NOT NULL THEN
            RAISE EXCEPTION 'Security Violation: Principal cannot overwrite an existing student_id.' 
                USING ERRCODE = '42501';
        END IF;

        IF NEW.roll_number IS DISTINCT FROM OLD.roll_number AND OLD.roll_number IS NOT NULL THEN
            RAISE EXCEPTION 'Security Violation: Principal cannot overwrite an existing roll_number.' 
                USING ERRCODE = '42501';
        END IF;

        RETURN NEW;
    END IF;

    -- ALL OTHER CALLERS (Faculty, Staff, Students, Parents)
    -- Non-administrative callers cannot modify other users' profiles under any circumstances
    IF v_caller_id <> OLD.id THEN
        RAISE EXCEPTION 'Security Violation: Non-administrative callers cannot modify other user profiles.' 
            USING ERRCODE = '42501';
    END IF;

    -- STRICT SELF-SERVICE ALLOWLIST: Ordinary users can ONLY edit phone, bio, preferences, avatar_url, updated_at
    -- All security, official registrar, academic placement, and system identity columns are strictly locked
    IF NEW.id IS DISTINCT FROM OLD.id OR
       NEW.email IS DISTINCT FROM OLD.email OR
       NEW.role IS DISTINCT FROM OLD.role OR
       NEW.status IS DISTINCT FROM OLD.status OR
       NEW.name IS DISTINCT FROM OLD.name OR
       NEW.student_id IS DISTINCT FROM OLD.student_id OR
       NEW.roll_number IS DISTINCT FROM OLD.roll_number OR
       NEW.login_id IS DISTINCT FROM OLD.login_id OR
       NEW.department IS DISTINCT FROM OLD.department OR
       NEW.class_name IS DISTINCT FROM OLD.class_name OR
       NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'Security Violation: Modifying restricted profile attributes is prohibited. Only personal profile details (phone, bio, preferences, avatar_url) may be edited.' 
            USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$;

--
-- Name: purge_auth_rate_limits(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.purge_auth_rate_limits() RETURNS integer
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
    WITH d AS (DELETE FROM public.auth_rate_limits WHERE window_start < NOW() - INTERVAL '1 day' RETURNING 1)
    SELECT count(*)::INTEGER FROM d;
$$;

--
-- Name: record_admission_deposit(uuid, numeric, text, text, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_admission_deposit(p_application_id uuid, p_amount numeric, p_payment_mode text, p_reference text, p_idempotency_key text, p_actor uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
    v_app public.admission_applications%ROWTYPE;
    v_prev public.admission_fees%ROWTYPE;
    v_fee_id UUID; v_rec_id UUID; v_rec_no TEXT; v_ref TEXT; v_qr TEXT;
BEGIN
    IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) < 8 THEN
        RETURN jsonb_build_object('success', false, 'code', 'IDEMPOTENCY_KEY_REQUIRED', 'error', 'An idempotency key (>= 8 chars) is required.');
    END IF;
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'code', 'INVALID_AMOUNT', 'error', 'Amount must be greater than zero.');
    END IF;
    IF p_payment_mode NOT IN ('Cash','UPI','Card','Bank_Transfer','Cheque','Online_Gateway') THEN
        RETURN jsonb_build_object('success', false, 'code', 'INVALID_MODE', 'error', 'Unsupported payment mode.');
    END IF;

    SELECT * INTO v_prev FROM public.admission_fees WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN
        RETURN jsonb_build_object('success', true, 'duplicate', true, 'admission_fee_id', v_prev.id, 'receipt_id', v_prev.receipt_id);
    END IF;

    SELECT * INTO v_app FROM public.admission_applications WHERE id = p_application_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Application not found.');
    END IF;
    IF v_app.status IN ('Rejected', 'Cancelled') THEN
        RETURN jsonb_build_object('success', false, 'code', 'APPLICATION_CLOSED', 'error', format('The application is %s; a deposit cannot be taken.', v_app.status));
    END IF;

    v_rec_no := 'REC-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('public.fee_receipt_seq')::TEXT, 6, '0');
    v_ref := COALESCE(NULLIF(trim(p_reference), ''), 'ADM-' || left(replace(p_application_id::text, '-', ''), 10));
    v_qr := encode(gen_random_bytes(16), 'hex');

    INSERT INTO public.fee_receipts (receipt_number, student_fee_id, student_id, student_name, roll_number, department,
                                     academic_year, fee_type, gross_amount, amount_paid, balance_remaining, payment_mode,
                                     transaction_reference, cashier_user_id, qr_verification_token)
    VALUES (v_rec_no, NULL, NULL, v_app.applicant_name, v_app.application_number, v_app.class_name,
            COALESCE(v_app.academic_year, '—'), 'Admission Deposit', p_amount, p_amount, 0, p_payment_mode,
            v_ref, p_actor, v_qr)
    RETURNING id INTO v_rec_id;

    INSERT INTO public.admission_fees (application_id, applicant_name, class_name, amount, payment_status, payment_method,
                                       transaction_id, paid_at, idempotency_key, receipt_id, collected_by)
    VALUES (v_app.id, v_app.applicant_name, v_app.class_name, p_amount, 'Paid', p_payment_mode,
            v_ref, NOW(), p_idempotency_key, v_rec_id, p_actor)
    RETURNING id INTO v_fee_id;

    INSERT INTO public.finance_transactions (type, amount, department, description, status)
    VALUES ('Admission Deposit', p_amount, 'Academic Fees',
            format('Receipt %s: admission deposit from %s (%s) via %s', v_rec_no, v_app.applicant_name, v_app.application_number, p_payment_mode),
            'Approved');

    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_values)
    VALUES (p_actor, 'admission_deposit_recorded', 'admission_applications', v_app.id::text,
            jsonb_build_object('amount', p_amount, 'receipt', v_rec_no, 'mode', p_payment_mode));

    RETURN jsonb_build_object('success', true, 'duplicate', false, 'admission_fee_id', v_fee_id, 'receipt_id', v_rec_id,
        'receipt', jsonb_build_object('id', v_rec_id, 'receipt_number', v_rec_no, 'qr_verification_token', v_qr, 'gross_amount', p_amount,
            'discount_applied', 0, 'balance_remaining', 0, 'academic_year', COALESCE(v_app.academic_year, '—'), 'semester', 'Semester 1',
            'student_name', v_app.applicant_name,
            'roll_number', v_app.application_number, 'department', v_app.class_name, 'fee_type', 'Admission Deposit',
            'amount_paid', p_amount, 'payment_mode', p_payment_mode, 'transaction_reference', v_ref,
            'payment_date', CURRENT_DATE));
EXCEPTION WHEN unique_violation THEN
    SELECT * INTO v_prev FROM public.admission_fees WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN
        RETURN jsonb_build_object('success', true, 'duplicate', true, 'admission_fee_id', v_prev.id, 'receipt_id', v_prev.receipt_id);
    END IF;
    RAISE;
END;
$$;

--
-- Name: record_fee_payment(uuid, numeric, text, text, text, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_fee_payment(p_student_fee_id uuid, p_amount numeric, p_payment_mode text, p_reference text, p_idempotency_key text, p_collected_by uuid, p_remarks text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
    v_fee public.student_fees%ROWTYPE; v_stu public.students%ROWTYPE; v_prof public.profiles%ROWTYPE;
    v_existing public.fee_payments%ROWTYPE; v_pay_id UUID; v_rec_id UUID; v_rec_no TEXT; v_new_paid NUMERIC(12,2); v_new_due NUMERIC(12,2);
    v_name TEXT; v_roll TEXT; v_dept TEXT; v_head TEXT;
BEGIN
    IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) < 8 THEN
        RETURN jsonb_build_object('success', false, 'code', 'IDEMPOTENCY_KEY_REQUIRED', 'error', 'An idempotency key (>= 8 chars) is required.');
    END IF;
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'code', 'INVALID_AMOUNT', 'error', 'Amount must be greater than zero.');
    END IF;
    IF p_payment_mode NOT IN ('Cash','UPI','Card','Bank_Transfer','Cheque','Online_Gateway') THEN
        RETURN jsonb_build_object('success', false, 'code', 'INVALID_MODE', 'error', 'Unsupported payment mode.');
    END IF;
    SELECT * INTO v_existing FROM public.fee_payments WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN
        RETURN jsonb_build_object('success', true, 'duplicate', true, 'payment_id', v_existing.id, 'receipt_id', v_existing.receipt_id);
    END IF;
    SELECT * INTO v_fee FROM public.student_fees WHERE id = p_student_fee_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'FEE_NOT_FOUND', 'error', 'Fee record not found.'); END IF;
    IF v_fee.status IN ('cancelled', 'waived') OR v_fee.total_due <= 0 THEN
        RETURN jsonb_build_object('success', false, 'code', 'NOTHING_DUE', 'error', 'No balance is due on this fee record.');
    END IF;
    IF p_amount > v_fee.total_due THEN
        RETURN jsonb_build_object('success', false, 'code', 'OVERPAYMENT', 'error', format('Amount exceeds outstanding balance (%s).', v_fee.total_due));
    END IF;

    IF v_fee.student_record_id IS NOT NULL THEN SELECT * INTO v_stu FROM public.students WHERE id = v_fee.student_record_id; END IF;
    IF v_fee.student_id IS NOT NULL THEN SELECT * INTO v_prof FROM public.profiles WHERE id = v_fee.student_id; END IF;
    v_name := COALESCE(v_stu.name, v_prof.name, v_fee.student_name);
    v_roll := COALESCE(v_stu.student_id, v_prof.student_id, v_prof.roll_number, 'N/A');
    v_dept := COALESCE(v_stu.department, v_prof.department, v_fee.class_name, 'N/A');
    SELECT name INTO v_head FROM public.fee_heads WHERE id = v_fee.fee_head_id;

    INSERT INTO public.fee_payments (student_fee_id, student_id, student_record_id, amount, payment_mode, transaction_reference,
                                     idempotency_key, status, collected_by, remarks)
    VALUES (v_fee.id, v_fee.student_id, v_fee.student_record_id, p_amount, p_payment_mode, NULLIF(trim(p_reference), ''),
            p_idempotency_key, 'Completed', p_collected_by, p_remarks)
    RETURNING id INTO v_pay_id;

    v_new_paid := v_fee.paid_amount + p_amount;
    v_new_due := v_fee.total_due - p_amount;
    UPDATE public.student_fees SET paid_amount = v_new_paid, total_due = v_new_due,
           status = CASE WHEN v_new_due = 0 THEN 'paid' ELSE 'partially_paid' END WHERE id = v_fee.id;

    v_rec_no := 'REC-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('public.fee_receipt_seq')::TEXT, 6, '0');
    INSERT INTO public.fee_receipts (receipt_number, student_fee_id, student_id, student_record_id, student_name, roll_number, department,
                                     academic_year, fee_type, gross_amount, amount_paid, balance_remaining, payment_mode,
                                     transaction_reference, cashier_user_id, qr_verification_token)
    VALUES (v_rec_no, v_fee.id, v_fee.student_id, v_fee.student_record_id, v_name, v_roll, v_dept,
            COALESCE(v_fee.academic_year, '—'), COALESCE(v_head, v_fee.description, 'Fee'),
            COALESCE(v_fee.original_amount, v_fee.total_due + v_fee.paid_amount), p_amount, v_new_due, p_payment_mode,
            COALESCE(NULLIF(trim(p_reference), ''), v_pay_id::TEXT), p_collected_by, encode(gen_random_bytes(16), 'hex'))
    RETURNING id INTO v_rec_id;
    UPDATE public.fee_payments SET receipt_id = v_rec_id WHERE id = v_pay_id;

    INSERT INTO public.finance_transactions (type, amount, department, description, status)
    VALUES ('Fee Payment', p_amount, 'Academic Fees',
            format('Fee receipt %s: %s (%s) via %s%s', v_rec_no, v_name, COALESCE(v_head, 'Fee'), p_payment_mode,
                   CASE WHEN NULLIF(trim(p_reference), '') IS NULL THEN '' ELSE ' (ref ' || trim(p_reference) || ')' END),
            'Approved');
    RETURN jsonb_build_object('success', true, 'duplicate', false, 'payment_id', v_pay_id, 'receipt_id', v_rec_id,
        'receipt_number', v_rec_no, 'balance_remaining', v_new_due);
EXCEPTION WHEN unique_violation THEN
    SELECT * INTO v_existing FROM public.fee_payments
     WHERE idempotency_key = p_idempotency_key OR transaction_reference = NULLIF(trim(p_reference), '') LIMIT 1;
    IF FOUND THEN
        RETURN jsonb_build_object('success', true, 'duplicate', true, 'payment_id', v_existing.id, 'receipt_id', v_existing.receipt_id);
    END IF;
    RAISE;
END;
$$;

--
-- Name: renew_library_book(uuid, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.renew_library_book(p_issue_id uuid, p_days integer DEFAULT 14, p_max_renewals integer DEFAULT 2) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v public.book_issues%ROWTYPE; v_due DATE;
BEGIN
    IF public.get_current_user_role() NOT IN ('admin', 'principal', 'librarian') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authorized to renew books.');
    END IF;
    IF p_days IS NULL OR p_days < 1 OR p_days > 60 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Renewal period must be between 1 and 60 days.');
    END IF;
    SELECT * INTO v FROM public.book_issues WHERE id = p_issue_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Issue record not found.');
    END IF;
    IF v.status = 'Returned' THEN
        RETURN jsonb_build_object('success', false, 'error', 'This book has already been returned.');
    END IF;
    IF COALESCE(v.renew_count, 0) >= p_max_renewals THEN
        RETURN jsonb_build_object('success', false, 'error', format('This book has already been renewed %s time(s), the maximum.', p_max_renewals));
    END IF;
    v_due := GREATEST(v.due_date, CURRENT_DATE) + p_days;
    UPDATE public.book_issues
       SET due_date = v_due, renew_count = COALESCE(renew_count, 0) + 1, status = 'Issued', updated_at = NOW()
     WHERE id = p_issue_id;
    RETURN jsonb_build_object('success', true, 'due_date', v_due, 'renew_count', COALESCE(v.renew_count, 0) + 1);
END;
$$;

--
-- Name: resolve_login_id(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.resolve_login_id(p_login_id text) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
    SELECT p.email
      FROM public.profiles p
     WHERE length(trim(p_login_id)) BETWEEN 3 AND 64
       AND COALESCE(p.status, 'active') = 'active'
       AND (lower(p.login_id) = lower(trim(p_login_id))
         OR lower(p.student_id) = lower(trim(p_login_id))
         OR lower(p.roll_number) = lower(trim(p_login_id)))
     ORDER BY p.created_at
     LIMIT 1;
$$;

--
-- Name: return_library_book(uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.return_library_book(p_issue_id uuid, p_fine_amount numeric DEFAULT 0) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_book UUID; v_status TEXT;
BEGIN
    IF public.get_current_user_role() NOT IN ('admin', 'principal', 'librarian') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authorized to process returns.');
    END IF;
    IF COALESCE(p_fine_amount, 0) < 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Fine cannot be negative.');
    END IF;
    SELECT book_id, status INTO v_book, v_status FROM public.book_issues WHERE id = p_issue_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Issue record not found.');
    END IF;
    IF v_status = 'Returned' THEN
        RETURN jsonb_build_object('success', false, 'error', 'This book has already been returned.');
    END IF;
    UPDATE public.book_issues
       SET return_date = CURRENT_DATE, fine_amount = COALESCE(p_fine_amount, 0),
           status = 'Returned', updated_at = NOW()
     WHERE id = p_issue_id;
    UPDATE public.library_books
       SET available_copies = LEAST(available_copies + 1, total_copies),
           status = 'Available', updated_at = NOW()
     WHERE id = v_book;
    RETURN jsonb_build_object('success', true, 'message', 'Book returned successfully.');
END;
$$;

--
-- Name: rides_vehicle(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rides_vehicle(p_vehicle uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT EXISTS (SELECT 1 FROM public.student_transport_logs l WHERE l.vehicle_id = p_vehicle AND (l.student_id = auth.uid() OR public.is_parent_of(l.student_id)))
      OR EXISTS (SELECT 1 FROM public.transport_assignments a WHERE a.vehicle_id = p_vehicle AND a.status = 'Active' AND (a.student_id = auth.uid() OR public.is_parent_of(a.student_id)));
$$;

--
-- Name: safe_cast_uuid(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.safe_cast_uuid(p_text text) RETURNS uuid
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public'
    AS $_$
BEGIN
    IF p_text IS NULL THEN
        RETURN NULL;
    END IF;
    IF p_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        RETURN p_text::uuid;
    ELSE
        RETURN NULL;
    END IF;
END;
$_$;

--
-- Name: scholarship_app_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.scholarship_app_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF current_setting('app.scholarship_decision', true) = 'on' THEN RETURN NEW; END IF;
  NEW.sanctioned_amount := OLD.sanctioned_amount; NEW.approved_by := OLD.approved_by; NEW.student_id := OLD.student_id;
  NEW.student_name := OLD.student_name; NEW.roll_number := OLD.roll_number; NEW.department := OLD.department;
  RETURN NEW;
END $$;

--
-- Name: scholarship_decide(uuid, text, numeric, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.scholarship_decide(p_id uuid, p_decision text, p_amount numeric DEFAULT NULL::numeric, p_student_fee_id uuid DEFAULT NULL::uuid, p_reason text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); a public.scholarship_applications; f public.student_fees; r JSONB; v_rec UUID;
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('admin','principal','finance_manager') THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only the principal, finance or admin can decide scholarships.'); END IF;
  IF p_decision NOT IN ('Approve','Reject') THEN RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Decision must be Approve or Reject.'); END IF;
  SELECT * INTO a FROM public.scholarship_applications WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Application not found.'); END IF;
  IF a.status IN ('Approved','Rejected') THEN RETURN jsonb_build_object('success', false, 'code', 'ALREADY_DECIDED', 'error', 'This application is already ' || lower(a.status) || '.'); END IF;
  PERFORM set_config('app.scholarship_decision', 'on', true);
  IF p_decision = 'Reject' THEN
    IF length(trim(COALESCE(p_reason,''))) < 3 THEN PERFORM set_config('app.scholarship_decision','off',true); RETURN jsonb_build_object('success', false, 'code', 'REASON_REQUIRED', 'error', 'Give a reason for rejecting.'); END IF;
    UPDATE public.scholarship_applications SET status = 'Rejected', approved_by = v_uid, remarks = trim(p_reason), updated_at = now() WHERE id = p_id;
    PERFORM set_config('app.scholarship_decision','off',true);
    RETURN jsonb_build_object('success', true, 'status', 'Rejected');
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN PERFORM set_config('app.scholarship_decision','off',true); RETURN jsonb_build_object('success', false, 'code', 'INVALID_AMOUNT', 'error', 'Enter the amount to sanction.'); END IF;
  IF p_student_fee_id IS NOT NULL THEN
    SELECT * INTO f FROM public.student_fees WHERE id = p_student_fee_id AND (student_id = a.student_id OR student_record_id IN (SELECT id FROM public.students WHERE user_id = a.student_id));
  ELSE   -- the oldest fee that still has a balance
    SELECT * INTO f FROM public.student_fees WHERE (student_id = a.student_id OR student_record_id IN (SELECT id FROM public.students WHERE user_id = a.student_id))
       AND status NOT IN ('cancelled','waived','paid') AND total_due > 0 ORDER BY due_date NULLS LAST, created_at LIMIT 1;
  END IF;
  IF NOT FOUND THEN PERFORM set_config('app.scholarship_decision','off',true); RETURN jsonb_build_object('success', false, 'code', 'NO_FEE', 'error', 'The student has no outstanding fee to apply the concession to. Generate their fees first.'); END IF;
  r := public.fee_adjust(f.id, 'concession', p_amount, 'Scholarship: ' || COALESCE(a.scholarship_name, 'scheme') || ' (application ' || a.id || ')', v_uid);
  IF NOT COALESCE((r->>'success')::boolean, false) THEN PERFORM set_config('app.scholarship_decision','off',true); RETURN r; END IF;
  UPDATE public.scholarship_applications SET status = 'Approved', sanctioned_amount = round(p_amount, 2), approved_by = v_uid, updated_at = now() WHERE id = p_id;
  PERFORM set_config('app.scholarship_decision','off',true);
  RETURN jsonb_build_object('success', true, 'status', 'Approved', 'applied_to_fee', f.id, 'balance_remaining', r->'balance_remaining');
END $$;

--
-- Name: search_students_by_id_or_name(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_students_by_id_or_name(search_term text) RETURNS TABLE(id uuid, user_id uuid, student_id text, roll_number text, name text, email text, department text, class_name text, status text, avatar_url text)
    LANGUAGE sql STABLE
    SET search_path TO 'public', 'pg_temp'
    AS $$
    SELECT s.id, s.user_id, s.student_id, s.roll_number, s.name, s.email, s.department,
           s.class_name, s.status, s.avatar_url
    FROM public.students s
    WHERE length(trim(search_term)) >= 2
      AND (s.student_id ILIKE '%' || trim(search_term) || '%'
        OR s.name ILIKE '%' || trim(search_term) || '%'
        OR s.email ILIKE '%' || trim(search_term) || '%')
    ORDER BY s.student_id
    LIMIT 20;
$$;

--
-- PostgreSQL database dump complete
--
