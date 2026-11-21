-- 075: Transport — permanent student↔bus/stop allocation and a daily roster generator.
-- Before: the only student-to-bus link was a per-day log row, so nobody could say "who rides bus 3" and a driver's list
-- was empty each morning unless someone created rows by hand. Idempotent.

CREATE TABLE IF NOT EXISTS public.transport_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.transport_vehicles(id) ON DELETE CASCADE,
  stop_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Ended')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  assigned_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS transport_assignments_one_active ON public.transport_assignments(student_id) WHERE status = 'Active';
CREATE INDEX IF NOT EXISTS transport_assignments_vehicle ON public.transport_assignments(vehicle_id) WHERE status = 'Active';
ALTER TABLE public.transport_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS transport_assignments_select ON public.transport_assignments;
CREATE POLICY transport_assignments_select ON public.transport_assignments FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR public.is_parent_of(student_id) OR public.get_current_user_role() IN ('admin','principal','receptionist')
         OR (public.get_current_user_role() IN ('driver','transport_driver') AND public.is_my_vehicle(vehicle_id)));
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.transport_assignments FROM authenticated, anon;
GRANT SELECT ON public.transport_assignments TO authenticated;

-- a rider (or parent) can see the vehicle they are allotted even before any daily log exists
CREATE OR REPLACE FUNCTION public.rides_vehicle(p_vehicle UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM public.student_transport_logs l WHERE l.vehicle_id = p_vehicle AND (l.student_id = auth.uid() OR public.is_parent_of(l.student_id)))
      OR EXISTS (SELECT 1 FROM public.transport_assignments a WHERE a.vehicle_id = p_vehicle AND a.status = 'Active' AND (a.student_id = auth.uid() OR public.is_parent_of(a.student_id)));
$$;

CREATE OR REPLACE FUNCTION public.transport_assign(p_student UUID, p_vehicle UUID, p_stop TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v public.transport_vehicles; v_riders INT; v_old UUID; v_new UUID;
BEGIN
  IF auth.uid() IS NULL OR v_role NOT IN ('admin','principal') THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only admin or principal can allocate transport.'); END IF;
  IF length(trim(COALESCE(p_stop,''))) = 0 THEN RETURN jsonb_build_object('success', false, 'code', 'STOP_REQUIRED', 'error', 'Choose the pick-up stop.'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_student AND role = 'student') THEN
    RETURN jsonb_build_object('success', false, 'code', 'NOT_A_STUDENT', 'error', 'Choose a student.'); END IF;
  SELECT * INTO v FROM public.transport_vehicles WHERE id = p_vehicle FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Vehicle not found.'); END IF;
  IF v.status = 'maintenance' THEN RETURN jsonb_build_object('success', false, 'code', 'VEHICLE_UNAVAILABLE', 'error', 'This vehicle is under maintenance.'); END IF;
  SELECT id INTO v_old FROM public.transport_assignments WHERE student_id = p_student AND status = 'Active';
  SELECT count(*) INTO v_riders FROM public.transport_assignments WHERE vehicle_id = p_vehicle AND status = 'Active' AND student_id <> p_student;
  IF v_riders >= v.capacity THEN RETURN jsonb_build_object('success', false, 'code', 'VEHICLE_FULL', 'error', 'This vehicle is full (' || v.capacity || ' seats).'); END IF;
  IF v_old IS NOT NULL THEN UPDATE public.transport_assignments SET status = 'Ended', end_date = CURRENT_DATE WHERE id = v_old; END IF;
  INSERT INTO public.transport_assignments(student_id, vehicle_id, stop_name, assigned_by) VALUES (p_student, p_vehicle, trim(p_stop), auth.uid()) RETURNING id INTO v_new;
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values)
  VALUES (auth.uid(), v_role, CASE WHEN v_old IS NULL THEN 'transport_assigned' ELSE 'transport_reassigned' END, 'transport_assignments', v_new::text, jsonb_build_object('student', p_student, 'vehicle', p_vehicle, 'stop', trim(p_stop)));
  RETURN jsonb_build_object('success', true, 'id', v_new, 'reassigned', v_old IS NOT NULL);
END $$;

CREATE OR REPLACE FUNCTION public.transport_unassign(p_student UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_id UUID;
BEGIN
  IF auth.uid() IS NULL OR v_role NOT IN ('admin','principal') THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only admin or principal can change transport.'); END IF;
  UPDATE public.transport_assignments SET status = 'Ended', end_date = CURRENT_DATE WHERE student_id = p_student AND status = 'Active' RETURNING id INTO v_id;
  IF v_id IS NULL THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'This student has no active transport.'); END IF;
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values)
  VALUES (auth.uid(), v_role, 'transport_ended', 'transport_assignments', v_id::text, jsonb_build_object('student', p_student));
  RETURN jsonb_build_object('success', true);
END $$;

-- Vehicles with live rider counts, for the admin desk.
CREATE OR REPLACE FUNCTION public.transport_overview()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL OR public.get_current_user_role() NOT IN ('admin','principal','receptionist') THEN RETURN jsonb_build_object('vehicles', '[]'::jsonb); END IF;
  RETURN jsonb_build_object('vehicles', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', v.id, 'vehicle_number', v.vehicle_number, 'route_name', v.route_name, 'driver_name', v.driver_name, 'driver_phone', v.driver_phone, 'driver_id', v.driver_id,
      'capacity', v.capacity, 'status', v.status,
      'riders', (SELECT count(*) FROM public.transport_assignments a WHERE a.vehicle_id = v.id AND a.status = 'Active'),
      'stops', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', s.id, 'name', s.stop_name, 'time', s.scheduled_time, 'order', s.stop_order,
                  'riders', (SELECT count(*) FROM public.transport_assignments a WHERE a.vehicle_id = v.id AND a.status = 'Active' AND a.stop_name = s.stop_name)) ORDER BY s.stop_order)
                FROM public.transport_stops s WHERE s.vehicle_id = v.id), '[]'::jsonb),
      'roster', COALESCE((SELECT jsonb_agg(jsonb_build_object('student_id', a.student_id, 'name', p.name, 'class_name', p.class_name, 'stop', a.stop_name) ORDER BY a.stop_name, p.name)
                FROM public.transport_assignments a JOIN public.profiles p ON p.id = a.student_id WHERE a.vehicle_id = v.id AND a.status = 'Active'), '[]'::jsonb))
    ORDER BY v.vehicle_number) FROM public.transport_vehicles v), '[]'::jsonb));
END $$;

-- Creates today's "waiting" rows for every allotted rider. Safe to call repeatedly. Admin, or the driver of that bus.
CREATE OR REPLACE FUNCTION public.transport_generate_day_logs(p_vehicle UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_n INT;
BEGIN
  IF auth.uid() IS NULL OR NOT (v_role IN ('admin','principal') OR (v_role IN ('driver','transport_driver') AND public.is_my_vehicle(p_vehicle))) THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only the bus driver or admin can start the day roster.'); END IF;
  INSERT INTO public.student_transport_logs(vehicle_id, student_id, student_name, class_name, stop_name, status, date)
  SELECT a.vehicle_id, a.student_id, p.name, p.class_name, a.stop_name, 'waiting', p_date
    FROM public.transport_assignments a JOIN public.profiles p ON p.id = a.student_id
   WHERE a.vehicle_id = p_vehicle AND a.status = 'Active'
     AND NOT EXISTS (SELECT 1 FROM public.student_transport_logs l WHERE l.vehicle_id = a.vehicle_id AND l.student_id = a.student_id AND l.date = p_date);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN jsonb_build_object('success', true, 'created', v_n);
END $$;

REVOKE ALL ON FUNCTION public.transport_assign(UUID,UUID,TEXT), public.transport_unassign(UUID), public.transport_overview(), public.transport_generate_day_logs(UUID,DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transport_assign(UUID,UUID,TEXT), public.transport_unassign(UUID), public.transport_overview(), public.transport_generate_day_logs(UUID,DATE) TO authenticated;
