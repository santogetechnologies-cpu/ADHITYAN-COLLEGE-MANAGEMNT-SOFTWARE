-- 061: HR can list staff accounts.
-- profiles were readable only by admin/principal/teacher and the owner, so the HR dashboard (which lists staff to attach
-- service records to) and the leave manager silently saw nothing. HR may read non-student, non-parent profiles only.
-- Idempotent.
DROP POLICY IF EXISTS profiles_hr_staff_directory ON public.profiles;
CREATE POLICY profiles_hr_staff_directory ON public.profiles FOR SELECT TO authenticated
  USING (public.get_current_user_role() = 'hr_manager' AND role NOT IN ('student','parent'));
