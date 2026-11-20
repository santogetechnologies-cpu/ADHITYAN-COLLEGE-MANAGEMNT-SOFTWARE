-- 054: Transport — a driver can only act on their own bus; riders' data is private.
-- Before: any driver could edit EVERY vehicle, stop, rider log and maintenance record (policy "ALL" for the driver role);
-- every signed-in user could read all vehicles including the driver's phone and live location.
-- Idempotent. Depends on 001/002 helpers (get_current_user_role, is_parent_of).

CREATE OR REPLACE FUNCTION public.is_my_vehicle(p_vehicle UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM public.transport_vehicles v WHERE v.id = p_vehicle AND v.driver_id = auth.uid());
$$;
-- a student/parent may see a vehicle only if the student rides it
CREATE OR REPLACE FUNCTION public.rides_vehicle(p_vehicle UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM public.student_transport_logs l WHERE l.vehicle_id = p_vehicle AND (l.student_id = auth.uid() OR public.is_parent_of(l.student_id)));
$$;
REVOKE ALL ON FUNCTION public.is_my_vehicle(UUID), public.rides_vehicle(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_my_vehicle(UUID), public.rides_vehicle(UUID) TO authenticated;

-- vehicles
DROP POLICY IF EXISTS "Authenticated can view transport vehicles" ON public.transport_vehicles;
DROP POLICY IF EXISTS "Drivers and admins can manage vehicles" ON public.transport_vehicles;
DROP POLICY IF EXISTS vehicles_select ON public.transport_vehicles;
DROP POLICY IF EXISTS vehicles_admin ON public.transport_vehicles;
DROP POLICY IF EXISTS vehicles_driver_update ON public.transport_vehicles;
CREATE POLICY vehicles_select ON public.transport_vehicles FOR SELECT TO authenticated
  USING (public.get_current_user_role() IN ('admin','principal','receptionist') OR driver_id = auth.uid() OR public.rides_vehicle(id));
CREATE POLICY vehicles_admin ON public.transport_vehicles FOR ALL TO authenticated
  USING (public.get_current_user_role() IN ('admin','principal')) WITH CHECK (public.get_current_user_role() IN ('admin','principal'));
CREATE POLICY vehicles_driver_update ON public.transport_vehicles FOR UPDATE TO authenticated
  USING (public.get_current_user_role() IN ('driver','transport_driver') AND driver_id = auth.uid())
  WITH CHECK (public.get_current_user_role() IN ('driver','transport_driver') AND driver_id = auth.uid());

-- a driver may only report position/status/seat count, not reassign the bus, change its number or driver
CREATE OR REPLACE FUNCTION public.transport_vehicle_driver_guard() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF public.get_current_user_role() IN ('driver','transport_driver') THEN
    NEW.vehicle_number := OLD.vehicle_number; NEW.vehicle_type := OLD.vehicle_type; NEW.route_name := OLD.route_name;
    NEW.driver_id := OLD.driver_id; NEW.driver_name := OLD.driver_name; NEW.driver_phone := OLD.driver_phone; NEW.capacity := OLD.capacity;
  END IF;
  IF NEW.occupied_seats IS NOT NULL AND NEW.capacity IS NOT NULL AND NEW.occupied_seats > NEW.capacity THEN
    RAISE EXCEPTION 'Occupied seats (%) exceed capacity (%)', NEW.occupied_seats, NEW.capacity USING ERRCODE = 'check_violation';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS transport_vehicle_driver_guard ON public.transport_vehicles;
CREATE TRIGGER transport_vehicle_driver_guard BEFORE UPDATE ON public.transport_vehicles FOR EACH ROW EXECUTE FUNCTION public.transport_vehicle_driver_guard();

-- stops
DROP POLICY IF EXISTS "Authenticated can view stops" ON public.transport_stops;
DROP POLICY IF EXISTS "Drivers can manage stops" ON public.transport_stops;
DROP POLICY IF EXISTS stops_select ON public.transport_stops;
DROP POLICY IF EXISTS stops_manage ON public.transport_stops;
CREATE POLICY stops_select ON public.transport_stops FOR SELECT TO authenticated
  USING (public.get_current_user_role() IN ('admin','principal','receptionist') OR public.is_my_vehicle(vehicle_id) OR public.rides_vehicle(vehicle_id));
CREATE POLICY stops_manage ON public.transport_stops FOR ALL TO authenticated
  USING (public.get_current_user_role() IN ('admin','principal') OR (public.get_current_user_role() IN ('driver','transport_driver') AND public.is_my_vehicle(vehicle_id)))
  WITH CHECK (public.get_current_user_role() IN ('admin','principal') OR (public.get_current_user_role() IN ('driver','transport_driver') AND public.is_my_vehicle(vehicle_id)));

-- rider logs
DROP POLICY IF EXISTS "Drivers can manage transport logs" ON public.student_transport_logs;
DROP POLICY IF EXISTS "Students and parents view transport logs" ON public.student_transport_logs;
DROP POLICY IF EXISTS transport_logs_select ON public.student_transport_logs;
DROP POLICY IF EXISTS transport_logs_manage ON public.student_transport_logs;
CREATE POLICY transport_logs_select ON public.student_transport_logs FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR public.is_parent_of(student_id) OR public.get_current_user_role() IN ('admin','principal') OR public.is_my_vehicle(vehicle_id));
CREATE POLICY transport_logs_manage ON public.student_transport_logs FOR ALL TO authenticated
  USING (public.get_current_user_role() IN ('admin','principal') OR (public.get_current_user_role() IN ('driver','transport_driver') AND public.is_my_vehicle(vehicle_id)))
  WITH CHECK (public.get_current_user_role() IN ('admin','principal') OR (public.get_current_user_role() IN ('driver','transport_driver') AND public.is_my_vehicle(vehicle_id)));

-- maintenance
DROP POLICY IF EXISTS "Drivers can view vehicle maintenance" ON public.vehicle_maintenance;
DROP POLICY IF EXISTS maintenance_manage ON public.vehicle_maintenance;
CREATE POLICY maintenance_manage ON public.vehicle_maintenance FOR ALL TO authenticated
  USING (public.get_current_user_role() IN ('admin','principal') OR (public.get_current_user_role() IN ('driver','transport_driver') AND public.is_my_vehicle(vehicle_id)))
  WITH CHECK (public.get_current_user_role() IN ('admin','principal') OR (public.get_current_user_role() IN ('driver','transport_driver') AND public.is_my_vehicle(vehicle_id)));
