-- Step 33: who becomes an administrator.
--
--   * Any account created DIRECTLY in Supabase (Dashboard -> Authentication -> Add user, or the service key) becomes the
--     SUPER ADMIN (role 'admin') automatically. That is how the very first administrator is created.
--   * Every other account (staff, teachers, students, parents ...) is created from inside the app by that Super Admin.
--     The app's server functions mark the accounts they create with app_metadata.erp_provisioned = true, so this trigger
--     leaves them alone and they get exactly the role the Super Admin chose.
--
-- IMPORTANT: turn OFF public sign-ups (Authentication -> Providers -> Email -> "Allow new users to sign up" = off,
-- and supabase/config.toml has enable_signup = false). Otherwise a stranger could register and become an administrator.
-- app_metadata can only be written by the server, never by a visitor, so the marker cannot be faked.
SET search_path = public, extensions;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_name  text;
  v_email text;
BEGIN
  IF COALESCE(NEW.raw_app_meta_data ->> 'erp_provisioned', '') = 'true' THEN
    RETURN NEW;   -- created by the app: the app writes the profile with the chosen role
  END IF;

  v_email := lower(COALESCE(NULLIF(trim(NEW.email), ''), NEW.id::text || '@no-email.invalid'));
  v_name  := COALESCE(NULLIF(trim(NEW.raw_user_meta_data ->> 'name'), ''),
                      NULLIF(trim(NEW.raw_user_meta_data ->> 'full_name'), ''),
                      NULLIF(split_part(v_email, '@', 1), ''), 'Super Admin');

  INSERT INTO public.profiles (id, email, name, role, status, is_first_login, requires_password_change)
  VALUES (NEW.id, v_email, v_name, 'admin', 'active', false, false)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.audit_logs (user_id, user_email, user_role, action, entity_type, entity_id, new_values)
  VALUES (NEW.id, v_email, 'admin', 'super_admin_bootstrapped', 'profiles', NEW.id::text,
          jsonb_build_object('reason', 'account created directly in Supabase Auth'));
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    GRANT EXECUTE ON FUNCTION public.handle_new_auth_user() TO supabase_auth_admin;
  END IF;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
