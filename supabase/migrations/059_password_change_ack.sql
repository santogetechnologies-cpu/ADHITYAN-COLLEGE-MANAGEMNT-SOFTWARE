-- 059: A user who has just set their own new password clears their own "must change password" flag.
-- The flag lives on profiles and is protected from direct self-edits (protect_profile_sensitive_columns), so this narrow
-- function is the only way a user can clear it, and only for themselves.
-- Idempotent.
CREATE OR REPLACE FUNCTION public.acknowledge_password_change() RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Sign in first.'); END IF;
  UPDATE public.profiles SET requires_password_change = FALSE, is_first_login = FALSE WHERE id = auth.uid();
  RETURN jsonb_build_object('success', true);
END $$;
REVOKE ALL ON FUNCTION public.acknowledge_password_change() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.acknowledge_password_change() TO authenticated;
