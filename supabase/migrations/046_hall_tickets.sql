-- =============================================================================
-- Migration 046: Hall tickets with real eligibility
--
-- Before: the Hall Ticket screen could only flip the status of tickets that ALREADY existed (nothing created
-- them), swallowed save errors and showed "Generated" regardless, and students could see a ticket the moment
-- one existed, including tickets they had been barred from.
--
--   exam_generate_hall_tickets(exam, class?)  creates/refreshes a ticket for every active student of the classes
--       that have a paper in the exam. Eligibility is computed from REAL data: attendance % (student_attendance_records)
--       against institutional_settings.min_attendance_percentage, and fee dues (overdue student_fees) when the institution
--       requires fee clearance (institutional_settings.exam_requires_fee_clearance, default off).
--       Not eligible -> status 'Withheld' with the reason. Idempotent. A released (overridden) ticket is never re-withheld.
--   exam_release_hall_ticket(ticket, reason)  COE/principal/admin override of a withheld ticket (reason mandatory, audited)
--   exam_set_hall_tickets_visible(exam, visible)  shows/hides the tickets to students and parents
--   exam_verify_hall_ticket(token)  for invigilators: who the ticket belongs to and whether it is valid
-- Students and parents see a ticket only after the exam's hall tickets are published.
-- Idempotent. Run after 045.
-- =============================================================================
BEGIN;

ALTER TABLE public.institutional_settings ADD COLUMN IF NOT EXISTS exam_requires_fee_clearance BOOLEAN NOT NULL DEFAULT FALSE;
-- The table's column defaults FABRICATED a venue, hall, seat, attendance (88%), semester ('Semester 4'), year ('2024-2025')
-- and a "verified" COE signature on every ticket. Nothing may be printed that was not computed or entered.
ALTER TABLE public.hall_tickets
    ALTER COLUMN academic_year DROP DEFAULT, ALTER COLUMN semester DROP DEFAULT, ALTER COLUMN exam_center DROP DEFAULT,
    ALTER COLUMN hall_number DROP DEFAULT, ALTER COLUMN seat_number DROP DEFAULT, ALTER COLUMN attendance_pct DROP DEFAULT,
    ALTER COLUMN coe_signature_hash DROP DEFAULT, ALTER COLUMN exam_title DROP DEFAULT, ALTER COLUMN status SET DEFAULT 'Issued';
ALTER TABLE public.hall_tickets
    ALTER COLUMN academic_year DROP NOT NULL, ALTER COLUMN semester DROP NOT NULL, ALTER COLUMN exam_center DROP NOT NULL,
    ALTER COLUMN hall_number DROP NOT NULL, ALTER COLUMN seat_number DROP NOT NULL, ALTER COLUMN coe_signature_hash DROP NOT NULL;
-- Old rows that carry the fabricated placeholders keep their data, but the placeholders are cleared so they are not printed.
UPDATE public.hall_tickets SET coe_signature_hash = NULL WHERE coe_signature_hash = 'COE-AUTH-SIG-2025-VERIFIED';
UPDATE public.hall_tickets SET exam_center = NULL WHERE exam_center = 'Main Examination Complex (Block B), Adhithyan College';
UPDATE public.hall_tickets SET hall_number = NULL WHERE hall_number = 'Exam Hall B-302';
UPDATE public.hall_tickets SET seat_number = NULL WHERE seat_number = 'Desk 14-B';

-- pgcrypto may live in the `extensions` schema (newer Supabase projects). Two earlier functions use gen_random_bytes():
-- make them find it wherever it is installed. (New code below uses only core functions.)
ALTER FUNCTION public.record_fee_payment(UUID, NUMERIC, TEXT, TEXT, TEXT, UUID, TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.record_admission_deposit(UUID, NUMERIC, TEXT, TEXT, TEXT, UUID) SET search_path = public, extensions, pg_temp;

ALTER TABLE public.hall_tickets
    ADD COLUMN IF NOT EXISTS override_reason TEXT,
    ADD COLUMN IF NOT EXISTS overridden_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS overridden_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS uq_hall_tickets_exam_student ON public.hall_tickets (exam_id, student_id) WHERE exam_id IS NOT NULL AND student_id IS NOT NULL;

-- students / parents: only after the hall tickets of that exam are published
DROP POLICY IF EXISTS hall_tickets_select ON public.hall_tickets;
CREATE POLICY hall_tickets_select ON public.hall_tickets FOR SELECT TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'coe', 'teacher', 'hod')
           OR ((student_id = auth.uid() OR public.is_parent_of(student_id))
               AND (exam_id IS NULL OR EXISTS (SELECT 1 FROM public.exams e WHERE e.id = hall_tickets.exam_id AND e.hall_ticket_published))));

CREATE OR REPLACE FUNCTION public.exam_generate_hall_tickets(p_exam_id UUID, p_class_name TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); v_exam public.exams%ROWTYPE;
    v_min NUMERIC; v_fee_rule BOOLEAN; s RECORD; v_att NUMERIC; v_dues BOOLEAN; v_detained BOOLEAN; v_reason TEXT;
    v_issued INT := 0; v_withheld INT := 0; v_kept INT := 0; v_list JSONB := '[]'::jsonb; v_classes TEXT[]; v_existing public.hall_tickets%ROWTYPE;
    v_token TEXT; v_room TEXT;
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
              WHERE p.role = 'student' AND COALESCE(p.status, 'active') = 'active' AND p.class_name = ANY (v_classes) ORDER BY p.class_name, p.name LOOP
        SELECT round(100.0 * count(*) FILTER (WHERE lower(status) IN ('present', 'late', 'excused')) / NULLIF(count(*), 0), 2)
          INTO v_att FROM public.student_attendance_records WHERE student_id = s.id;
        SELECT EXISTS (SELECT 1 FROM public.student_fees f WHERE f.student_id = s.id AND f.total_due > 0
                          AND f.due_date < CURRENT_DATE AND f.status NOT IN ('cancelled', 'waived')) INTO v_dues;
        v_reason := NULL;
        IF v_att IS NOT NULL AND v_att < v_min THEN v_reason := format('Attendance %s%% is below the required %s%%.', v_att, v_min); END IF;
        IF v_fee_rule AND v_dues THEN v_reason := COALESCE(v_reason || ' ', '') || 'Fee dues are outstanding.'; END IF;
        v_detained := v_reason IS NOT NULL;
        SELECT room INTO v_room FROM public.exam_schedules WHERE exam_id = p_exam_id AND class_name = s.class_name ORDER BY exam_date, start_time LIMIT 1;
        v_token := 'HT-' || replace(gen_random_uuid()::text, '-', '');

        SELECT * INTO v_existing FROM public.hall_tickets WHERE exam_id = p_exam_id AND student_id = s.id;
        IF FOUND AND v_existing.override_reason IS NOT NULL THEN
            -- a released ticket stays released; only the facts are refreshed
            UPDATE public.hall_tickets SET attendance_pct = v_att, has_fee_dues = v_dues WHERE id = v_existing.id;
            v_kept := v_kept + 1; CONTINUE;
        END IF;
        INSERT INTO public.hall_tickets (exam_id, student_id, student_name, roll_number, register_number, department, class_name, academic_year,
                                         semester, hall_number, attendance_pct, has_fee_dues, is_detained, detention_reason, qr_code_token, coe_signature_hash,
                                         issued_date, status, exam_title)
        VALUES (p_exam_id, s.id, s.name, COALESCE(s.roll_number, s.student_id, 'N/A'), COALESCE(s.student_id, s.roll_number, 'N/A'),
                COALESCE(s.department, '—'), s.class_name, v_exam.academic_year, v_exam.semester, v_room, v_att, v_dues, v_detained, v_reason,
                v_token, encode(sha256(convert_to(v_token || ':' || s.id::text || ':' || p_exam_id::text, 'UTF8')), 'hex'),
                CURRENT_DATE, CASE WHEN v_detained THEN 'Withheld' ELSE 'Issued' END, v_exam.name)
        ON CONFLICT (exam_id, student_id) WHERE exam_id IS NOT NULL AND student_id IS NOT NULL DO UPDATE
            SET attendance_pct = EXCLUDED.attendance_pct, has_fee_dues = EXCLUDED.has_fee_dues, is_detained = EXCLUDED.is_detained,
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

CREATE OR REPLACE FUNCTION public.exam_release_hall_ticket(p_ticket_id UUID, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
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

CREATE OR REPLACE FUNCTION public.exam_set_hall_tickets_visible(p_exam_id UUID, p_visible BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
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

CREATE OR REPLACE FUNCTION public.exam_verify_hall_ticket(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
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

REVOKE ALL ON FUNCTION public.exam_generate_hall_tickets(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.exam_release_hall_ticket(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.exam_set_hall_tickets_visible(UUID, BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.exam_verify_hall_ticket(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.exam_generate_hall_tickets(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.exam_release_hall_ticket(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.exam_set_hall_tickets_visible(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.exam_verify_hall_ticket(TEXT) TO authenticated;

COMMIT;
