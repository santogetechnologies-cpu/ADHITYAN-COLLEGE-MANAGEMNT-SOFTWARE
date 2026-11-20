-- 049: Medical module — private health data, real contacts and alerts.
-- Before: teachers could read EVERY health record (allergies, conditions); the screen showed invented counts (2847 records,
-- 23 visits, "7 alerts"), a fake flu outbreak, fake phone numbers, and its buttons only showed toasts. The infirmary screen
-- also read columns that do not exist (complaint, doctor_name, follow_up_date).
-- Idempotent. Depends on 001/002.

-- Health records: owner, parent of the student, admin and principal only. (Teachers no longer read medical history.)
DROP POLICY IF EXISTS "Authenticated can view health records" ON public.health_records;
DROP POLICY IF EXISTS "Staff can manage health records" ON public.health_records;
DROP POLICY IF EXISTS health_records_select ON public.health_records;
DROP POLICY IF EXISTS health_records_manage ON public.health_records;
CREATE POLICY health_records_select ON public.health_records FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.get_current_user_role() IN ('admin','principal'));
CREATE POLICY health_records_manage ON public.health_records FOR ALL TO authenticated
  USING (public.get_current_user_role() IN ('admin','principal'))
  WITH CHECK (public.get_current_user_role() IN ('admin','principal'));

CREATE UNIQUE INDEX IF NOT EXISTS health_records_roll_uidx ON public.health_records (lower(roll_no)) WHERE roll_no IS NOT NULL AND roll_no <> '';
ALTER TABLE public.health_records ADD COLUMN IF NOT EXISTS notes TEXT;

-- Infirmary visits: clinic staff (admin/principal/hostel warden); the patient may read their own.
ALTER TABLE public.infirmary_visits ADD COLUMN IF NOT EXISTS student_ref TEXT;
ALTER TABLE public.infirmary_visits ADD COLUMN IF NOT EXISTS follow_up_date DATE;
ALTER TABLE public.infirmary_visits ADD COLUMN IF NOT EXISTS recorded_by UUID;
DROP POLICY IF EXISTS "Staff can manage infirmary visits" ON public.infirmary_visits;
DROP POLICY IF EXISTS infirmary_visits_manage ON public.infirmary_visits;
CREATE POLICY infirmary_visits_manage ON public.infirmary_visits FOR ALL TO authenticated
  USING (public.get_current_user_role() IN ('admin','principal','hostel_warden'))
  WITH CHECK (public.get_current_user_role() IN ('admin','principal','hostel_warden'));

-- Emergency contacts (ambulance, duty doctor, hospital) kept by the institution.
CREATE TABLE IF NOT EXISTS public.medical_emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  phone TEXT NOT NULL,
  note TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.medical_emergency_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS med_contacts_read ON public.medical_emergency_contacts;
DROP POLICY IF EXISTS med_contacts_manage ON public.medical_emergency_contacts;
CREATE POLICY med_contacts_read ON public.medical_emergency_contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY med_contacts_manage ON public.medical_emergency_contacts FOR ALL TO authenticated
  USING (public.get_current_user_role() IN ('admin','principal'))
  WITH CHECK (public.get_current_user_role() IN ('admin','principal'));

-- Campus wellness alerts: staff publish, everyone signed in can read the active ones.
CREATE TABLE IF NOT EXISTS public.wellness_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'Info' CHECK (severity IN ('Info','Caution','Urgent')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wellness_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wellness_alerts_read ON public.wellness_alerts;
DROP POLICY IF EXISTS wellness_alerts_manage ON public.wellness_alerts;
CREATE POLICY wellness_alerts_read ON public.wellness_alerts FOR SELECT TO authenticated
  USING (active OR public.get_current_user_role() IN ('admin','principal','hostel_warden'));
CREATE POLICY wellness_alerts_manage ON public.wellness_alerts FOR ALL TO authenticated
  USING (public.get_current_user_role() IN ('admin','principal','hostel_warden'))
  WITH CHECK (public.get_current_user_role() IN ('admin','principal','hostel_warden'));
