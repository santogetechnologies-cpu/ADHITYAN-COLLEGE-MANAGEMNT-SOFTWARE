-- 053: Payroll — private pay data, server-side computation, configurable statutory rules, approval flow.
-- Before: staff_service_records had policy "ALL USING (true)" — every signed-in user (students, parents) could read and EDIT
-- every employee's PAN, bank account and salary. Payroll was computed in the browser with hard-coded rules (EPF 12% uncapped,
-- ESI 0.75%, PT 200, a crude 10% TDS), ignored leave without pay, invented payslip numbers and a bank reference
-- ("NEFT-SBIN2610..."), and marked runs 'Disbursed' without any payment being made.
-- Idempotent. Depends on 028/045 helpers (get_current_user_role, audit_logs).

-- 1. Who can see / change service records --------------------------------------------------------------------------------
DROP POLICY IF EXISTS staff_records_all ON public.staff_service_records;
DROP POLICY IF EXISTS staff_records_select ON public.staff_service_records;
DROP POLICY IF EXISTS staff_records_write ON public.staff_service_records;
DROP POLICY IF EXISTS staff_records_delete ON public.staff_service_records;
CREATE POLICY staff_records_select ON public.staff_service_records FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.get_current_user_role() IN ('admin','principal','hr_manager','finance_manager','accountant'));
CREATE POLICY staff_records_write ON public.staff_service_records FOR ALL TO authenticated
  USING (public.get_current_user_role() IN ('admin','hr_manager'))
  WITH CHECK (public.get_current_user_role() IN ('admin','hr_manager'));

-- no invented pay or bank defaults
ALTER TABLE public.staff_service_records ALTER COLUMN basic_pay SET DEFAULT 0;
ALTER TABLE public.staff_service_records ALTER COLUMN da_pct SET DEFAULT 0;
ALTER TABLE public.staff_service_records ALTER COLUMN hra_pct SET DEFAULT 0;
ALTER TABLE public.staff_service_records ALTER COLUMN special_allowance SET DEFAULT 0;
ALTER TABLE public.staff_service_records ALTER COLUMN bank_name DROP DEFAULT;
ALTER TABLE public.staff_service_records ADD COLUMN IF NOT EXISTS monthly_tds NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (monthly_tds >= 0);
ALTER TABLE public.staff_service_records ADD COLUMN IF NOT EXISTS other_deductions NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (other_deductions >= 0);
DO $$ BEGIN
  ALTER TABLE public.staff_service_records ADD CONSTRAINT staff_pay_nonneg CHECK (basic_pay >= 0 AND da_pct >= 0 AND hra_pct >= 0 AND special_allowance >= 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Statutory / institutional rules, set by the institution (nothing is assumed) --------------------------------------
CREATE TABLE IF NOT EXISTS public.payroll_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),          -- single row
  configured BOOLEAN NOT NULL DEFAULT FALSE,
  epf_rate_pct NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (epf_rate_pct BETWEEN 0 AND 100),
  epf_wage_ceiling NUMERIC(12,2) CHECK (epf_wage_ceiling IS NULL OR epf_wage_ceiling > 0),   -- NULL = no ceiling
  esi_rate_pct NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (esi_rate_pct BETWEEN 0 AND 100),
  esi_gross_limit NUMERIC(12,2) CHECK (esi_gross_limit IS NULL OR esi_gross_limit > 0),     -- NULL = applies to nobody
  professional_tax_monthly NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (professional_tax_monthly >= 0),
  lop_leave_types TEXT[] NOT NULL DEFAULT ARRAY['Loss of Pay','LOP','Unpaid'],
  updated_by UUID, updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.payroll_settings (id) VALUES (TRUE) ON CONFLICT DO NOTHING;
ALTER TABLE public.payroll_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payroll_settings_read ON public.payroll_settings;
CREATE POLICY payroll_settings_read ON public.payroll_settings FOR SELECT TO authenticated
  USING (public.get_current_user_role() IN ('admin','principal','hr_manager','finance_manager','accountant'));
REVOKE INSERT, UPDATE, DELETE ON public.payroll_settings FROM authenticated, anon;

CREATE OR REPLACE FUNCTION public.payroll_configure(p_epf_rate NUMERIC, p_epf_ceiling NUMERIC, p_esi_rate NUMERIC, p_esi_limit NUMERIC, p_pt NUMERIC, p_lop_types TEXT[] DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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

-- 3. Runs: Draft -> Approved -> Disbursed, computed on the server -------------------------------------------------------
ALTER TABLE public.staff_payroll_runs ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE public.staff_payroll_runs ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.staff_payroll_runs ADD COLUMN IF NOT EXISTS disbursed_at TIMESTAMPTZ;
ALTER TABLE public.staff_payroll_runs ADD COLUMN IF NOT EXISTS payment_reference TEXT;
DO $$ BEGIN
  ALTER TABLE public.staff_payroll_runs ADD CONSTRAINT payroll_run_status_chk CHECK (status IN ('Draft','Approved','Disbursed','Cancelled')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE SEQUENCE IF NOT EXISTS public.payslip_seq;
DROP POLICY IF EXISTS payroll_runs_insert ON public.staff_payroll_runs;
DROP POLICY IF EXISTS payroll_runs_update ON public.staff_payroll_runs;
DROP POLICY IF EXISTS payroll_runs_delete ON public.staff_payroll_runs;
DROP POLICY IF EXISTS payroll_items_insert ON public.staff_payroll_items;
DROP POLICY IF EXISTS payroll_items_update ON public.staff_payroll_items;
DROP POLICY IF EXISTS payroll_items_delete ON public.staff_payroll_items;
REVOKE INSERT, UPDATE, DELETE ON public.staff_payroll_runs, public.staff_payroll_items FROM authenticated, anon;

-- p_month is 'YYYY-MM'
CREATE OR REPLACE FUNCTION public.payroll_run_create(p_month TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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
END $$;

CREATE OR REPLACE FUNCTION public.payroll_run_approve(p_run UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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

-- Records that the bank transfer was made OUTSIDE this system; the reference comes from the bank.
CREATE OR REPLACE FUNCTION public.payroll_run_disburse(p_run UUID, p_reference TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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

CREATE OR REPLACE FUNCTION public.payroll_run_cancel(p_run UUID, p_reason TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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

-- a cancelled run must not block re-running the month
ALTER TABLE public.staff_payroll_runs DROP CONSTRAINT IF EXISTS staff_payroll_runs_month_year_key;
CREATE UNIQUE INDEX IF NOT EXISTS staff_payroll_runs_month_active_uidx ON public.staff_payroll_runs (month_year) WHERE status <> 'Cancelled';

REVOKE ALL ON FUNCTION public.payroll_configure(NUMERIC,NUMERIC,NUMERIC,NUMERIC,NUMERIC,TEXT[]), public.payroll_run_create(TEXT), public.payroll_run_approve(UUID),
  public.payroll_run_disburse(UUID,TEXT), public.payroll_run_cancel(UUID,TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.payroll_configure(NUMERIC,NUMERIC,NUMERIC,NUMERIC,NUMERIC,TEXT[]), public.payroll_run_create(TEXT), public.payroll_run_approve(UUID),
  public.payroll_run_disburse(UUID,TEXT), public.payroll_run_cancel(UUID,TEXT) TO authenticated;
