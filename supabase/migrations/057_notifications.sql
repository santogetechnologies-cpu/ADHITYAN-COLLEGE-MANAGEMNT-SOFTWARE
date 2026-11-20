-- 057: Cross-user notifications actually work (and cannot be abused).
-- Before: the notifications policy was "ALL USING (user_id = auth.uid())", so a user could only ever write notifications FOR
-- THEMSELVES. Every alert one role sends to another (warden -> student out-pass, store -> admin purchase order, transport ->
-- riders, teacher -> parents ...) was rejected by RLS and the error was swallowed, so none were ever delivered. Several callers
-- also passed user_id 'admin' / 'all' (not UUIDs) and priority 'normal' (rejected by the CHECK constraint).
-- Now: staff send through notify_users / notify_roles (SECURITY DEFINER, role-checked, size-limited); everyone can still
-- create and read notifications for themselves.
-- Idempotent. Depends on 001/002.

DROP POLICY IF EXISTS "Users can view and manage their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS notifications_select ON public.notifications;
DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
DROP POLICY IF EXISTS notifications_delete_own ON public.notifications;
DROP POLICY IF EXISTS notifications_insert_own ON public.notifications;
CREATE POLICY notifications_select ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY notifications_update_own ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY notifications_delete_own ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY notifications_insert_own ON public.notifications FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public._notify_check(p_title TEXT, p_message TEXT, p_type TEXT, p_priority TEXT) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Sign in first.'); END IF;
  IF public.get_current_user_role() IN ('student','parent') OR public.get_current_user_role() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only staff can send notifications to others.'); END IF;
  IF length(trim(COALESCE(p_title,''))) = 0 OR length(p_title) > 200 OR length(COALESCE(p_message,'')) > 2000 THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Title is required (max 200) and message at most 2000 characters.'); END IF;
  IF p_type NOT IN ('info','warning','error','success') OR p_priority NOT IN ('low','medium','high') THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Invalid type or priority.'); END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public._notify_check(TEXT,TEXT,TEXT,TEXT) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_users(p_user_ids UUID[], p_title TEXT, p_message TEXT, p_type TEXT DEFAULT 'info', p_priority TEXT DEFAULT 'medium')
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE bad JSONB := public._notify_check(p_title, p_message, p_type, p_priority); n INT;
BEGIN
  IF bad IS NOT NULL THEN RETURN bad; END IF;
  IF p_user_ids IS NULL OR cardinality(p_user_ids) = 0 OR cardinality(p_user_ids) > 500 THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Send to between 1 and 500 recipients.'); END IF;
  INSERT INTO public.notifications (user_id, title, message, type, priority, is_read)
  SELECT p.id, trim(p_title), p_message, p_type, p_priority, FALSE FROM public.profiles p WHERE p.id = ANY (p_user_ids);
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN jsonb_build_object('success', true, 'sent', n);
END $$;

CREATE OR REPLACE FUNCTION public.notify_roles(p_roles TEXT[], p_title TEXT, p_message TEXT, p_type TEXT DEFAULT 'info', p_priority TEXT DEFAULT 'medium')
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE bad JSONB := public._notify_check(p_title, p_message, p_type, p_priority); n INT;
BEGIN
  IF bad IS NOT NULL THEN RETURN bad; END IF;
  IF p_roles IS NULL OR cardinality(p_roles) = 0 OR cardinality(p_roles) > 10 THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Choose between 1 and 10 roles.'); END IF;
  INSERT INTO public.notifications (user_id, title, message, type, priority, is_read)
  SELECT p.id, trim(p_title), p_message, p_type, p_priority, FALSE FROM public.profiles p WHERE p.role = ANY (p_roles) AND COALESCE(p.status,'active') = 'active';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN jsonb_build_object('success', true, 'sent', n);
END $$;
REVOKE ALL ON FUNCTION public.notify_users(UUID[],TEXT,TEXT,TEXT,TEXT), public.notify_roles(TEXT[],TEXT,TEXT,TEXT,TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notify_users(UUID[],TEXT,TEXT,TEXT,TEXT), public.notify_roles(TEXT[],TEXT,TEXT,TEXT,TEXT) TO authenticated;
