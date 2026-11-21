-- 074: Hostel room allotment, academic-year promotion/graduation, audit-log viewer.
-- Before: hostel_rooms had no link to students (occupancy was a free counter), there was no way to promote a batch to the next
-- semester or graduate it, and audit_logs could only be read from the database. Idempotent.

-- ---------- Hostel allotment ----------
CREATE TABLE IF NOT EXISTS public.hostel_allotments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.hostel_rooms(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Vacated')),
  allotted_on DATE NOT NULL DEFAULT CURRENT_DATE,
  vacated_on DATE,
  allotted_by UUID,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS hostel_allotments_one_active ON public.hostel_allotments(student_id) WHERE status = 'Active';
CREATE INDEX IF NOT EXISTS hostel_allotments_room ON public.hostel_allotments(room_id) WHERE status = 'Active';
ALTER TABLE public.hostel_allotments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hostel_allotments_select ON public.hostel_allotments;
CREATE POLICY hostel_allotments_select ON public.hostel_allotments FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR public.get_current_user_role() IN ('admin','principal','hostel_warden'));
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.hostel_allotments FROM authenticated, anon;
GRANT SELECT ON public.hostel_allotments TO authenticated;

-- Rooms become read-only to clients (allot/vacate keep occupancy exact); admin/warden manage rooms through hostel_room_save.
DROP POLICY IF EXISTS hostel_rooms_all ON public.hostel_rooms;
DROP POLICY IF EXISTS hostel_rooms_select ON public.hostel_rooms;
CREATE POLICY hostel_rooms_select ON public.hostel_rooms FOR SELECT TO authenticated USING (true);
REVOKE INSERT, UPDATE, DELETE ON public.hostel_rooms FROM authenticated, anon;

CREATE OR REPLACE FUNCTION public.hostel_room_save(p_id UUID, p_block TEXT, p_floor INT, p_room TEXT, p_capacity INT, p_type TEXT, p_fee NUMERIC, p_status TEXT DEFAULT 'Available')
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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

CREATE OR REPLACE FUNCTION public.hostel_allot(p_student UUID, p_room UUID, p_remarks TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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

CREATE OR REPLACE FUNCTION public.hostel_vacate(p_allotment UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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

CREATE OR REPLACE FUNCTION public.hostel_transfer(p_student UUID, p_room UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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

CREATE OR REPLACE FUNCTION public.hostel_occupancy()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
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

REVOKE ALL ON FUNCTION public.hostel_room_save(UUID,TEXT,INT,TEXT,INT,TEXT,NUMERIC,TEXT), public.hostel_allot(UUID,UUID,TEXT), public.hostel_vacate(UUID),
  public.hostel_transfer(UUID,UUID), public.hostel_occupancy() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hostel_room_save(UUID,TEXT,INT,TEXT,INT,TEXT,NUMERIC,TEXT), public.hostel_allot(UUID,UUID,TEXT), public.hostel_vacate(UUID),
  public.hostel_transfer(UUID,UUID), public.hostel_occupancy() TO authenticated;

-- ---------- Academic-year promotion / graduation ----------
CREATE TABLE IF NOT EXISTS public.student_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL,
  student_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('promote','graduate','hold','undo')),
  from_semester INT,
  to_semester INT,
  from_status TEXT,
  to_status TEXT,
  academic_year TEXT,
  done_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS student_promotions_batch ON public.student_promotions(batch_id);
ALTER TABLE public.student_promotions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS student_promotions_select ON public.student_promotions;
CREATE POLICY student_promotions_select ON public.student_promotions FOR SELECT TO authenticated
  USING (public.get_current_user_role() IN ('admin','principal','hod','coe'));
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.student_promotions FROM authenticated, anon;
GRANT SELECT ON public.student_promotions TO authenticated;

-- Preview: who would move, and who has dues (so the office can hold them back).
CREATE OR REPLACE FUNCTION public.promotion_preview(p_department TEXT DEFAULT NULL, p_class TEXT DEFAULT NULL, p_semester INT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
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

CREATE OR REPLACE FUNCTION public.students_promote(p_student_ids UUID[], p_action TEXT, p_max_semester INT DEFAULT 8, p_academic_year TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); v_batch UUID := gen_random_uuid(); s public.students;
        v_moved INT := 0; v_skipped INT := 0; v_id UUID;
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('admin','principal') THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only admin or principal can promote students.'); END IF;
  IF p_action NOT IN ('promote','graduate') THEN RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Action must be promote or graduate.'); END IF;
  IF p_student_ids IS NULL OR array_length(p_student_ids, 1) IS NULL THEN RETURN jsonb_build_object('success', false, 'code', 'NO_STUDENTS', 'error', 'Select at least one student.'); END IF;
  IF COALESCE(p_max_semester,0) < 1 THEN RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Maximum semester must be at least 1.'); END IF;
  FOREACH v_id IN ARRAY p_student_ids LOOP
    SELECT * INTO s FROM public.students WHERE id = v_id AND status = 'active' FOR UPDATE;
    IF NOT FOUND THEN v_skipped := v_skipped + 1; CONTINUE; END IF;
    IF p_action = 'graduate' OR s.current_semester >= p_max_semester THEN
      IF p_action = 'promote' THEN v_skipped := v_skipped + 1; CONTINUE; END IF;  -- already in the final semester: graduate explicitly
      UPDATE public.students SET status = 'graduated', updated_at = now() WHERE id = s.id;
      INSERT INTO public.student_promotions(batch_id, student_id, action, from_semester, to_semester, from_status, to_status, academic_year, done_by)
      VALUES (v_batch, s.id, 'graduate', s.current_semester, s.current_semester, s.status, 'graduated', p_academic_year, v_uid);
    ELSE
      UPDATE public.students SET current_semester = current_semester + 1, updated_at = now() WHERE id = s.id;
      INSERT INTO public.student_promotions(batch_id, student_id, action, from_semester, to_semester, from_status, to_status, academic_year, done_by)
      VALUES (v_batch, s.id, 'promote', s.current_semester, s.current_semester + 1, s.status, s.status, p_academic_year, v_uid);
    END IF;
    v_moved := v_moved + 1;
  END LOOP;
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values)
  VALUES (v_uid, v_role, 'students_' || p_action, 'students', v_batch::text, jsonb_build_object('moved', v_moved, 'skipped', v_skipped, 'academic_year', p_academic_year));
  RETURN jsonb_build_object('success', true, 'batch_id', v_batch, 'moved', v_moved, 'skipped', v_skipped);
END $$;

CREATE OR REPLACE FUNCTION public.students_promotion_undo(p_batch UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); r public.student_promotions; v_n INT := 0; v_new UUID := gen_random_uuid();
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('admin','principal') THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only admin or principal can undo a promotion.'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.student_promotions WHERE batch_id = p_batch) THEN
    RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Batch not found.'); END IF;
  IF EXISTS (SELECT 1 FROM public.student_promotions WHERE action = 'undo' AND to_status = p_batch::text) THEN
    RETURN jsonb_build_object('success', false, 'code', 'ALREADY_UNDONE', 'error', 'This batch was already undone.'); END IF;
  FOR r IN SELECT * FROM public.student_promotions WHERE batch_id = p_batch AND action IN ('promote','graduate') LOOP
    UPDATE public.students SET current_semester = r.from_semester, status = COALESCE(r.from_status, status), updated_at = now()
    WHERE id = r.student_id AND current_semester = r.to_semester AND status = r.to_status;
    IF FOUND THEN v_n := v_n + 1; END IF;
  END LOOP;
  INSERT INTO public.student_promotions(batch_id, student_id, action, from_status, to_status, done_by)
  SELECT v_new, student_id, 'undo', NULL, p_batch::text, v_uid FROM public.student_promotions WHERE batch_id = p_batch AND action IN ('promote','graduate');
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values)
  VALUES (v_uid, v_role, 'students_promotion_undone', 'students', p_batch::text, jsonb_build_object('restored', v_n));
  RETURN jsonb_build_object('success', true, 'restored', v_n);
END $$;

CREATE OR REPLACE FUNCTION public.promotion_history()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL OR public.get_current_user_role() NOT IN ('admin','principal') THEN RETURN jsonb_build_object('items', '[]'::jsonb); END IF;
  RETURN jsonb_build_object('items', COALESCE((SELECT jsonb_agg(x ORDER BY (x->>'at') DESC) FROM (
    SELECT jsonb_build_object('batch_id', batch_id, 'action', max(action), 'count', count(*), 'academic_year', max(academic_year), 'at', max(created_at),
      'undone', EXISTS (SELECT 1 FROM public.student_promotions u WHERE u.action = 'undo' AND u.to_status = sp.batch_id::text)) AS x
    FROM public.student_promotions sp WHERE action IN ('promote','graduate') GROUP BY batch_id LIMIT 50) q), '[]'::jsonb));
END $$;

REVOKE ALL ON FUNCTION public.promotion_preview(TEXT,TEXT,INT), public.students_promote(UUID[],TEXT,INT,TEXT), public.students_promotion_undo(UUID), public.promotion_history() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.promotion_preview(TEXT,TEXT,INT), public.students_promote(UUID[],TEXT,INT,TEXT), public.students_promotion_undo(UUID), public.promotion_history() TO authenticated;

-- ---------- Audit-log viewer ----------
CREATE OR REPLACE FUNCTION public.audit_log_search(p_query TEXT DEFAULT NULL, p_entity TEXT DEFAULT NULL, p_from DATE DEFAULT NULL, p_to DATE DEFAULT NULL, p_limit INT DEFAULT 100, p_offset INT DEFAULT 0)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
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
REVOKE ALL ON FUNCTION public.audit_log_search(TEXT,TEXT,DATE,DATE,INT,INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.audit_log_search(TEXT,TEXT,DATE,DATE,INT,INT) TO authenticated;
