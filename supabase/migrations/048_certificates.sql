-- 048: Certificates issued by the server, not the browser.
-- Before: the browser typed the student's name, made up the certificate number (CRT-2024-####, collision-prone) and,
-- when the insert failed, still showed the certificate as created. Anyone with the admin screen could forge a record.
-- Now: number, QR hash, name and class come from the database; students request, staff decide; anyone can verify a number.
-- Idempotent. Depends on 001/002/028 (students) and 046 style audit_logs.

ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS details TEXT;
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS decided_by UUID;
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS decided_at TIMESTAMPTZ;
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS decision_note TEXT;
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS department TEXT;

CREATE SEQUENCE IF NOT EXISTS public.certificate_number_seq;

DROP POLICY IF EXISTS "Users can view own certificates" ON public.certificates;
DROP POLICY IF EXISTS "Staff can manage certificates" ON public.certificates;
DROP POLICY IF EXISTS certificates_select ON public.certificates;
CREATE POLICY certificates_select ON public.certificates FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR public.get_current_user_role() IN ('admin','principal','receptionist'));
-- No direct INSERT/UPDATE/DELETE policies: all changes go through the functions below.
REVOKE INSERT, UPDATE, DELETE ON public.certificates FROM authenticated, anon;

CREATE OR REPLACE FUNCTION public._cert_make(p_student public.students, p_type TEXT, p_purpose TEXT, p_details TEXT, p_status TEXT, p_by UUID)
RETURNS public.certificates LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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
REVOKE ALL ON FUNCTION public._cert_make(public.students, TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;

-- Staff issue directly (student found by their institution ID / roll number).
CREATE OR REPLACE FUNCTION public.certificate_issue(p_student_ref TEXT, p_type TEXT, p_purpose TEXT, p_details TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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

-- A student asks for a certificate for themselves.
CREATE OR REPLACE FUNCTION public.certificate_request(p_type TEXT, p_purpose TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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

-- Staff approve (issue) or reject a request. Rejection needs a reason.
CREATE OR REPLACE FUNCTION public.certificate_decide(p_id UUID, p_decision TEXT, p_note TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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

-- Public verification: reveals only whether the number is genuine plus type / name / date.
CREATE OR REPLACE FUNCTION public.certificate_verify(p_number TEXT)
RETURNS JSONB LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, pg_temp AS $$
  SELECT COALESCE((SELECT jsonb_build_object('valid', true, 'type', certificate_type, 'student', student_name, 'issued_on', issue_date)
                   FROM public.certificates WHERE certificate_number = upper(trim(p_number)) AND status = 'Issued'),
                  jsonb_build_object('valid', false));
$$;

REVOKE ALL ON FUNCTION public.certificate_issue(TEXT,TEXT,TEXT,TEXT), public.certificate_request(TEXT,TEXT), public.certificate_decide(UUID,TEXT,TEXT), public.certificate_verify(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.certificate_issue(TEXT,TEXT,TEXT,TEXT), public.certificate_request(TEXT,TEXT), public.certificate_decide(UUID,TEXT,TEXT), public.certificate_verify(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.certificate_verify(TEXT) TO anon;
