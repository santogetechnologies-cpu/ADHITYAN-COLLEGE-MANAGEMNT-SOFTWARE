-- 060: Close the last wide-open policies and drop table privileges that bypass RLS.
-- * attendance_shortage_warnings had "ALL USING (true)": any signed-in user (a student!) could read every student's warnings
--   (including parent-acknowledgement and detention flags) and rewrite or delete them.
-- * scholarships_master had "ALL USING (true)": any signed-in user could create or change scholarship schemes
--   (discount type/value) used by the fee engine.
-- * anon/authenticated also held TRUNCATE/REFERENCES/TRIGGER on every public table; TRUNCATE is not subject to RLS.
-- Idempotent.

-- shortage warnings: the student, their parent, and teaching/exam staff read; staff write
DROP POLICY IF EXISTS shortage_warnings_all ON public.attendance_shortage_warnings;
DROP POLICY IF EXISTS shortage_warnings_select ON public.attendance_shortage_warnings;
DROP POLICY IF EXISTS shortage_warnings_write ON public.attendance_shortage_warnings;
CREATE POLICY shortage_warnings_select ON public.attendance_shortage_warnings FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR public.is_parent_of(student_id) OR public.get_current_user_role() IN ('admin','principal','hod','teacher','coe'));
CREATE POLICY shortage_warnings_write ON public.attendance_shortage_warnings FOR ALL TO authenticated
  USING (public.get_current_user_role() IN ('admin','principal','hod','teacher'))
  WITH CHECK (public.get_current_user_role() IN ('admin','principal','hod','teacher'));
-- parents acknowledge their own child's warning (nothing else)
DROP POLICY IF EXISTS shortage_warnings_parent_ack ON public.attendance_shortage_warnings;
CREATE POLICY shortage_warnings_parent_ack ON public.attendance_shortage_warnings FOR UPDATE TO authenticated
  USING (public.is_parent_of(student_id)) WITH CHECK (public.is_parent_of(student_id));
CREATE OR REPLACE FUNCTION public.shortage_ack_guard() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF public.get_current_user_role() = 'parent' THEN
    NEW := OLD; NEW.parent_acknowledged := TRUE;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS shortage_ack_guard ON public.attendance_shortage_warnings;
CREATE TRIGGER shortage_ack_guard BEFORE UPDATE ON public.attendance_shortage_warnings FOR EACH ROW EXECUTE FUNCTION public.shortage_ack_guard();

-- scholarship schemes: everyone signed in can read the active ones; only admin/principal/finance change them
DROP POLICY IF EXISTS scholarships_master_all ON public.scholarships_master;
DROP POLICY IF EXISTS scholarships_public_read ON public.scholarships_master;
DROP POLICY IF EXISTS scholarships_master_read ON public.scholarships_master;
DROP POLICY IF EXISTS scholarships_master_manage ON public.scholarships_master;
CREATE POLICY scholarships_master_read ON public.scholarships_master FOR SELECT TO authenticated USING (true);
CREATE POLICY scholarships_master_manage ON public.scholarships_master FOR ALL TO authenticated
  USING (public.get_current_user_role() IN ('admin','principal','finance_manager'))
  WITH CHECK (public.get_current_user_role() IN ('admin','principal','finance_manager'));

-- privileges that RLS does not govern
DO $$
DECLARE t RECORD;
BEGIN
  FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind IN ('r','p') LOOP
    EXECUTE format('REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.%I FROM anon, authenticated', t.relname);
  END LOOP;
END $$;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM anon, authenticated;
