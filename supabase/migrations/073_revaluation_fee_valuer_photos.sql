-- 073: Revaluation fee through the fee ledger, blind second valuation, student photos on seating sheets.
-- * exams.revaluation_fee: requesting revaluation creates a fee on the student's ledger (payable online or at the counter). The COE
--   cannot decide until it is paid (or waived/cancelled by finance). If the marks are revised upward the fee is flagged refundable.
-- * The COE may assign a second valuer (a teacher). The valuer sees only a blind entry (no student, no original marks) and records marks;
--   the COE's Revise decision then uses those marks.
-- * Seating rows carry the student's photo (from their profile) so invigilators can check identity.
-- Idempotent. Depends on 068, 065.

ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS revaluation_fee NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (revaluation_fee >= 0);
ALTER TABLE public.exam_revaluation_requests ADD COLUMN IF NOT EXISTS fee_id UUID REFERENCES public.student_fees(id);
ALTER TABLE public.exam_revaluation_requests ADD COLUMN IF NOT EXISTS fee_refund_due BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.exam_revaluation_requests ADD COLUMN IF NOT EXISTS valuer_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.exam_revaluation_requests ADD COLUMN IF NOT EXISTS valuer_name TEXT;
ALTER TABLE public.exam_revaluation_requests ADD COLUMN IF NOT EXISTS valuer_marks NUMERIC;
ALTER TABLE public.exam_revaluation_requests ADD COLUMN IF NOT EXISTS valuer_note TEXT;
ALTER TABLE public.exam_revaluation_requests ADD COLUMN IF NOT EXISTS valued_at TIMESTAMPTZ;
ALTER TABLE public.exam_seating ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- ---- photos on the seating sheet -------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.exam_seating_photo() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.photo_url IS NULL THEN SELECT avatar_url INTO NEW.photo_url FROM public.profiles WHERE id = NEW.student_id; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS exam_seating_photo ON public.exam_seating;
CREATE TRIGGER exam_seating_photo BEFORE INSERT ON public.exam_seating FOR EACH ROW EXECUTE FUNCTION public.exam_seating_photo();
UPDATE public.exam_seating s SET photo_url = p.avatar_url FROM public.profiles p WHERE p.id = s.student_id AND s.photo_url IS NULL;

-- ---- revaluation window with fee ---------------------------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.exam_revaluation_set(UUID, BOOLEAN, DATE);
CREATE OR REPLACE FUNCTION public.exam_revaluation_set(p_exam UUID, p_open BOOLEAN, p_deadline DATE DEFAULT NULL, p_fee NUMERIC DEFAULT 0)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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
REVOKE ALL ON FUNCTION public.exam_revaluation_set(UUID,BOOLEAN,DATE,NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.exam_revaluation_set(UUID,BOOLEAN,DATE,NUMERIC) TO authenticated;

-- request: creates the fee when the exam charges one
CREATE OR REPLACE FUNCTION public.exam_revaluation_request(p_exam UUID, p_subject TEXT, p_reason TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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

-- ---- second valuer (blind) -------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.exam_revaluation_assign(p_id UUID, p_teacher UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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

-- what a valuer is allowed to see: no student, no original marks
CREATE OR REPLACE FUNCTION public.exam_my_valuations() RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT CASE WHEN auth.uid() IS NULL OR public.get_current_user_role() NOT IN ('teacher','hod') THEN jsonb_build_object('success', false, 'error', 'Not allowed.')
    ELSE jsonb_build_object('success', true, 'items', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', q.id, 'script', 'Script ' || upper(left(q.id::text, 6)), 'exam', e.name, 'subject', q.subject, 'max_marks', q.max_marks,
           'my_marks', q.valuer_marks, 'my_note', q.valuer_note) ORDER BY q.requested_at)
           FROM public.exam_revaluation_requests q JOIN public.exams e ON e.id = q.exam_id WHERE q.valuer_id = auth.uid() AND q.status = 'Requested'), '[]'::jsonb)) END;
$$;
CREATE OR REPLACE FUNCTION public.exam_revaluation_value(p_id UUID, p_marks NUMERIC, p_note TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE q public.exam_revaluation_requests;
BEGIN
  IF auth.uid() IS NULL OR public.get_current_user_role() NOT IN ('teacher','hod') THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only teachers can value scripts.'); END IF;
  SELECT * INTO q FROM public.exam_revaluation_requests WHERE id = p_id AND valuer_id = auth.uid() AND status = 'Requested' FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'That script is not assigned to you.'); END IF;
  IF p_marks IS NULL OR p_marks < 0 OR p_marks > q.max_marks THEN RETURN jsonb_build_object('success', false, 'code', 'INVALID_MARKS', 'error', format('Marks must be between 0 and %s.', q.max_marks)); END IF;
  UPDATE public.exam_revaluation_requests SET valuer_marks = p_marks, valuer_note = NULLIF(trim(COALESCE(p_note,'')), ''), valued_at = now() WHERE id = q.id;
  RETURN jsonb_build_object('success', true);
END $$;

-- decision: fee must be settled; with a valuer assigned the valuation must be in and is used when no marks are given
CREATE OR REPLACE FUNCTION public.exam_revaluation_decide(p_id UUID, p_decision TEXT, p_new_marks NUMERIC DEFAULT NULL, p_note TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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

REVOKE ALL ON FUNCTION public.exam_revaluation_request(UUID,TEXT,TEXT), public.exam_revaluation_assign(UUID,UUID), public.exam_my_valuations(), public.exam_revaluation_value(UUID,NUMERIC,TEXT), public.exam_revaluation_decide(UUID,TEXT,NUMERIC,TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.exam_revaluation_request(UUID,TEXT,TEXT), public.exam_revaluation_assign(UUID,UUID), public.exam_my_valuations(), public.exam_revaluation_value(UUID,NUMERIC,TEXT), public.exam_revaluation_decide(UUID,TEXT,NUMERIC,TEXT) TO authenticated;
