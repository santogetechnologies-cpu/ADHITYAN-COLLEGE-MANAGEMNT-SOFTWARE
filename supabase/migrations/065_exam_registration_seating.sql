-- 065: Exam registration, seating plans and invigilation.
-- Before: every student of a class was treated as sitting every exam; rooms were free text on a paper; there was no seating plan,
-- no capacity check and no invigilator assignment.
-- Now: (1) an examination can require registration (open/close + deadline; fee clearance honoured); (2) rooms have capacities;
-- (3) seating is generated per exam session (date + start time), interleaving classes so neighbours sit different papers, refusing
-- when capacity is short; (4) invigilators are assigned to rooms per session without double-booking; (5) hall tickets carry the
-- generated hall and seat.
-- Idempotent. Depends on 045/046.

ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS registration_required BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS registration_open BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS registration_deadline DATE;

CREATE TABLE IF NOT EXISTS public.exam_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'Registered' CHECK (status IN ('Registered','Withdrawn')),
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  registered_by UUID,
  UNIQUE (exam_id, student_id)
);
CREATE TABLE IF NOT EXISTS public.exam_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  block TEXT,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.exam_seating (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  exam_date DATE NOT NULL,
  start_time TEXT NOT NULL,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_name TEXT,
  subject TEXT,
  student_name TEXT,
  roll_number TEXT,
  room_id UUID NOT NULL REFERENCES public.exam_rooms(id) ON DELETE RESTRICT,
  seat_no INTEGER NOT NULL CHECK (seat_no > 0),
  UNIQUE (exam_id, exam_date, start_time, student_id),
  UNIQUE (exam_id, exam_date, start_time, room_id, seat_no)
);
CREATE TABLE IF NOT EXISTS public.exam_invigilators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  exam_date DATE NOT NULL,
  start_time TEXT NOT NULL,
  room_id UUID NOT NULL REFERENCES public.exam_rooms(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  teacher_name TEXT,
  UNIQUE (exam_id, exam_date, start_time, teacher_id)
);
ALTER TABLE public.exam_seating ADD COLUMN IF NOT EXISTS student_name TEXT;
ALTER TABLE public.exam_seating ADD COLUMN IF NOT EXISTS roll_number TEXT;
ALTER TABLE public.exam_invigilators ADD COLUMN IF NOT EXISTS teacher_name TEXT;
ALTER TABLE public.exam_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_seating ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_invigilators ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS exam_reg_select ON public.exam_registrations;
DROP POLICY IF EXISTS exam_rooms_select ON public.exam_rooms;
DROP POLICY IF EXISTS exam_seating_select ON public.exam_seating;
DROP POLICY IF EXISTS exam_invig_select ON public.exam_invigilators;
CREATE POLICY exam_reg_select ON public.exam_registrations FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR public.is_parent_of(student_id) OR public.get_current_user_role() IN ('admin','principal','coe','hod','teacher'));
CREATE POLICY exam_rooms_select ON public.exam_rooms FOR SELECT TO authenticated
  USING (public.get_current_user_role() IN ('admin','principal','coe','hod','teacher'));
-- seating is visible to the student/parent only once hall tickets are published for the exam
CREATE POLICY exam_seating_select ON public.exam_seating FOR SELECT TO authenticated
  USING (public.get_current_user_role() IN ('admin','principal','coe','hod','teacher')
         OR ((student_id = auth.uid() OR public.is_parent_of(student_id)) AND EXISTS (SELECT 1 FROM public.exams e WHERE e.id = exam_seating.exam_id AND e.hall_ticket_published)));
CREATE POLICY exam_invig_select ON public.exam_invigilators FOR SELECT TO authenticated
  USING (teacher_id = auth.uid() OR public.get_current_user_role() IN ('admin','principal','coe','hod'));
REVOKE INSERT, UPDATE, DELETE ON public.exam_registrations, public.exam_rooms, public.exam_seating, public.exam_invigilators FROM authenticated, anon;

-- ---- registration -----------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.exam_registration_set(p_exam UUID, p_required BOOLEAN, p_open BOOLEAN, p_deadline DATE DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('admin','principal','coe') THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only the Controller of Examinations, principal or admin can set registration.'); END IF;
  UPDATE public.exams SET registration_required = p_required, registration_open = (p_required AND p_open), registration_deadline = p_deadline WHERE id = p_exam;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Examination not found.'); END IF;
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values) VALUES (v_uid, v_role, 'exam_registration_set', 'exams', p_exam::text, jsonb_build_object('required', p_required, 'open', p_open, 'deadline', p_deadline));
  RETURN jsonb_build_object('success', true);
END $$;

-- a student registers themself (or withdraws while registration is open)
CREATE OR REPLACE FUNCTION public.exam_register(p_exam UUID, p_withdraw BOOLEAN DEFAULT FALSE)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid UUID := auth.uid(); e public.exams; pr public.profiles; v_fee BOOLEAN; v_dues BOOLEAN;
BEGIN
  IF v_uid IS NULL OR public.get_current_user_role() <> 'student' THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only students can register for an examination.'); END IF;
  SELECT * INTO e FROM public.exams WHERE id = p_exam;
  IF NOT FOUND OR NOT e.registration_required THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_REQUIRED', 'error', 'This examination does not use registration.'); END IF;
  IF NOT e.registration_open OR (e.registration_deadline IS NOT NULL AND e.registration_deadline < CURRENT_DATE) THEN
    RETURN jsonb_build_object('success', false, 'code', 'CLOSED', 'error', 'Registration for this examination is closed.'); END IF;
  SELECT * INTO pr FROM public.profiles WHERE id = v_uid;
  IF NOT EXISTS (SELECT 1 FROM public.exam_schedules s WHERE s.exam_id = p_exam AND s.class_name = pr.class_name) THEN
    RETURN jsonb_build_object('success', false, 'code', 'NOT_ELIGIBLE', 'error', 'No paper of this examination is scheduled for your class.'); END IF;
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

-- staff register a whole class (e.g. arrears list or a class that cannot self-register)
CREATE OR REPLACE FUNCTION public.exam_register_class(p_exam UUID, p_class TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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

-- ---- rooms ------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.exam_room_save(p_id UUID, p_name TEXT, p_block TEXT, p_capacity INT, p_active BOOLEAN DEFAULT TRUE)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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

-- ---- seating ----------------------------------------------------------------------------------------------------------
-- One session = exam + date + start time. Students are the registered (or, without registration, all active) students of the
-- classes that have a paper in the session, minus withheld hall tickets. Classes are interleaved (round-robin) so that
-- neighbours are from different classes, rooms are filled in capacity order.
CREATE OR REPLACE FUNCTION public.exam_generate_seating(p_exam UUID, p_date DATE, p_start TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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

-- ---- invigilation -----------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.exam_assign_invigilator(p_exam UUID, p_date DATE, p_start TEXT, p_room UUID, p_teacher UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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
CREATE OR REPLACE FUNCTION public.exam_remove_invigilator(p_id UUID) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL OR public.get_current_user_role() NOT IN ('admin','principal','coe','hod') THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Not allowed.'); END IF;
  DELETE FROM public.exam_invigilators WHERE id = p_id; RETURN jsonb_build_object('success', true);
END $$;

REVOKE ALL ON FUNCTION public.exam_registration_set(UUID,BOOLEAN,BOOLEAN,DATE), public.exam_register(UUID,BOOLEAN), public.exam_register_class(UUID,TEXT),
  public.exam_room_save(UUID,TEXT,TEXT,INT,BOOLEAN), public.exam_generate_seating(UUID,DATE,TEXT), public.exam_assign_invigilator(UUID,DATE,TEXT,UUID,UUID), public.exam_remove_invigilator(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.exam_registration_set(UUID,BOOLEAN,BOOLEAN,DATE), public.exam_register(UUID,BOOLEAN), public.exam_register_class(UUID,TEXT),
  public.exam_room_save(UUID,TEXT,TEXT,INT,BOOLEAN), public.exam_generate_seating(UUID,DATE,TEXT), public.exam_assign_invigilator(UUID,DATE,TEXT,UUID,UUID), public.exam_remove_invigilator(UUID) TO authenticated;

-- hall tickets: only registered students when registration is required; hall/seat from the seating plan; fee dues also found via the student record
CREATE OR REPLACE FUNCTION public.exam_generate_hall_tickets(p_exam_id UUID, p_class_name TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
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

GRANT EXECUTE ON FUNCTION public.exam_generate_hall_tickets(UUID, TEXT) TO authenticated;

-- teachers available for invigilation (COE cannot read profiles directly)
CREATE OR REPLACE FUNCTION public.exam_list_teachers() RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT CASE WHEN auth.uid() IS NULL OR public.get_current_user_role() NOT IN ('admin','principal','coe','hod')
              THEN jsonb_build_object('success', false, 'error', 'Not allowed.')
              ELSE jsonb_build_object('success', true, 'teachers', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'department', department) ORDER BY name)
                     FROM public.profiles WHERE role IN ('teacher','hod') AND COALESCE(status,'active') = 'active'), '[]'::jsonb)) END;
$$;
REVOKE ALL ON FUNCTION public.exam_list_teachers() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.exam_list_teachers() TO authenticated;
