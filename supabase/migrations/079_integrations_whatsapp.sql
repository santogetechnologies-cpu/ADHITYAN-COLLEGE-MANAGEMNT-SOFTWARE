-- 079: Provider configuration from the UI (payments, e-mail, SMS, WhatsApp) + a WhatsApp delivery channel. Idempotent. Depends on 066, 077.
-- Secrets (API keys) are stored ENCRYPTED (AES-GCM) by the `integrations-admin` edge function with a server-side key
-- (INTEGRATION_ENC_KEY); the database only ever holds ciphertext, and no signed-in role can read the table at all.
-- Admin/principal can see which provider is on, its non-secret settings and which secret fields are filled in (never their values).

CREATE TABLE IF NOT EXISTS public.integration_settings (
  kind TEXT PRIMARY KEY CHECK (kind IN ('payments','email','sms','whatsapp')),
  provider TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  public_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  secret_ciphertext TEXT,
  secret_keys TEXT[] NOT NULL DEFAULT '{}',
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_test_at TIMESTAMPTZ,
  last_test_ok BOOLEAN,
  last_test_message TEXT
);
ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.integration_settings FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.integration_settings TO service_role;

CREATE OR REPLACE FUNCTION public.integration_overview()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL OR public.get_current_user_role() NOT IN ('admin','principal') THEN RETURN jsonb_build_object('allowed', false); END IF;
  RETURN jsonb_build_object('allowed', true, 'items', COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'kind', kind, 'provider', provider, 'enabled', enabled, 'public_config', public_config, 'secret_keys', secret_keys,
    'updated_at', updated_at, 'last_test_at', last_test_at, 'last_test_ok', last_test_ok, 'last_test_message', last_test_message)) FROM public.integration_settings), '[]'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.integration_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.integration_overview() TO authenticated;

-- ---------- WhatsApp channel ----------
ALTER TABLE public.institutional_settings ADD COLUMN IF NOT EXISTS whatsapp_alerts_enabled BOOLEAN NOT NULL DEFAULT false;
DO $$
DECLARE c TEXT;
BEGIN
  SELECT conname INTO c FROM pg_constraint WHERE conrelid = 'public.notification_outbox'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%channel%' AND pg_get_constraintdef(oid) NOT LIKE '%status%';
  IF c IS NOT NULL THEN EXECUTE format('ALTER TABLE public.notification_outbox DROP CONSTRAINT %I', c); END IF;
  ALTER TABLE public.notification_outbox ADD CONSTRAINT notification_outbox_channel_check CHECK (channel IN ('email','sms','whatsapp'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.notifications_enqueue() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE s public.institutional_settings; p public.profiles; v_phone TEXT;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO s FROM public.institutional_settings LIMIT 1;
  SELECT * INTO p FROM public.profiles WHERE id = NEW.user_id AND status = 'active';
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF COALESCE(s.enable_email_alerts, false) AND NEW.priority IN ('medium','high') AND COALESCE(p.preferences->>'email_notifications','true') <> 'false'
     AND p.email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND p.email NOT LIKE '%@example.test' THEN
    INSERT INTO public.notification_outbox(notification_id, user_id, channel, to_address, subject, body) VALUES (NEW.id, NEW.user_id, 'email', p.email, left(NEW.title, 200), left(NEW.message, 2000));
  END IF;
  v_phone := regexp_replace(COALESCE(p.phone, ''), '[^0-9+]', '', 'g');
  IF v_phone ~ '^\+?[0-9]{10,15}$' AND NEW.priority = 'high' THEN
    IF COALESCE(s.sms_alerts_enabled, false) AND COALESCE(p.preferences->>'sms_notifications','true') <> 'false' THEN
      INSERT INTO public.notification_outbox(notification_id, user_id, channel, to_address, body) VALUES (NEW.id, NEW.user_id, 'sms', v_phone, left(NEW.title || ': ' || NEW.message, 300));
    END IF;
    -- WhatsApp is opt-in: only people who switched it on in their own settings
    IF COALESCE(s.whatsapp_alerts_enabled, false) AND COALESCE(p.preferences->>'whatsapp_notifications','false') = 'true' THEN
      INSERT INTO public.notification_outbox(notification_id, user_id, channel, to_address, subject, body) VALUES (NEW.id, NEW.user_id, 'whatsapp', v_phone, left(NEW.title, 200), left(NEW.title || E'\n' || NEW.message, 1000));
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.outbox_claim(p_limit INT DEFAULT 25, p_channels TEXT[] DEFAULT ARRAY['email','sms','whatsapp'])
RETURNS SETOF public.notification_outbox LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  DELETE FROM public.notification_outbox WHERE status = 'sent' AND sent_at < now() - interval '30 days';
  RETURN QUERY
  WITH c AS (
    SELECT id FROM public.notification_outbox
     WHERE channel = ANY(p_channels) AND attempts < 3 AND created_at > now() - interval '3 days'
       AND (status = 'pending' OR (status = 'sending' AND claimed_at < now() - interval '10 minutes'))
     ORDER BY created_at LIMIT LEAST(GREATEST(COALESCE(p_limit, 25), 1), 100) FOR UPDATE SKIP LOCKED)
  UPDATE public.notification_outbox o SET status = 'sending', attempts = o.attempts + 1, claimed_at = now() FROM c WHERE o.id = c.id RETURNING o.*;
END $$;

DROP FUNCTION IF EXISTS public.notification_settings_set(BOOLEAN, BOOLEAN, BOOLEAN, INT);
CREATE OR REPLACE FUNCTION public.notification_settings_set(p_email BOOLEAN, p_sms BOOLEAN, p_auto_reminders BOOLEAN, p_reminder_days INT, p_whatsapp BOOLEAN DEFAULT false)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role TEXT := public.get_current_user_role();
BEGIN
  IF auth.uid() IS NULL OR v_role NOT IN ('admin','principal') THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only admin or principal can change notification settings.'); END IF;
  IF COALESCE(p_reminder_days, -1) NOT BETWEEN 0 AND 30 THEN RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Reminder window must be 0 to 30 days.'); END IF;
  UPDATE public.institutional_settings SET enable_email_alerts = COALESCE(p_email, false), sms_alerts_enabled = COALESCE(p_sms, false), whatsapp_alerts_enabled = COALESCE(p_whatsapp, false),
    auto_fee_reminders = COALESCE(p_auto_reminders, false), fee_reminder_days = p_reminder_days, updated_at = now();
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values)
  VALUES (auth.uid(), v_role, 'notification_settings_changed', 'institutional_settings', NULL, jsonb_build_object('email', p_email, 'sms', p_sms, 'whatsapp', p_whatsapp, 'auto_reminders', p_auto_reminders, 'days', p_reminder_days));
  RETURN jsonb_build_object('success', true);
END $$;
REVOKE ALL ON FUNCTION public.notification_settings_set(BOOLEAN,BOOLEAN,BOOLEAN,INT,BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notification_settings_set(BOOLEAN,BOOLEAN,BOOLEAN,INT,BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.notification_channel_status()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE s public.institutional_settings;
BEGIN
  IF auth.uid() IS NULL OR public.get_current_user_role() NOT IN ('admin','principal') THEN RETURN jsonb_build_object('allowed', false); END IF;
  SELECT * INTO s FROM public.institutional_settings LIMIT 1;
  RETURN jsonb_build_object('allowed', true,
    'settings', jsonb_build_object('email', COALESCE(s.enable_email_alerts, false), 'sms', COALESCE(s.sms_alerts_enabled, false), 'whatsapp', COALESCE(s.whatsapp_alerts_enabled, false), 'auto_reminders', COALESCE(s.auto_fee_reminders, false), 'reminder_days', COALESCE(s.fee_reminder_days, 7)),
    'providers', COALESCE((SELECT jsonb_object_agg(kind, jsonb_build_object('provider', provider, 'enabled', enabled)) FROM public.integration_settings), '{}'::jsonb),
    'counts', COALESCE((SELECT jsonb_object_agg(k, n) FROM (SELECT channel || ':' || status AS k, count(*) AS n FROM public.notification_outbox WHERE created_at > now() - interval '30 days' GROUP BY 1) q), '{}'::jsonb),
    'recent_failures', COALESCE((SELECT jsonb_agg(jsonb_build_object('channel', channel, 'to', to_address, 'error', last_error, 'at', created_at) ORDER BY created_at DESC) FROM (SELECT * FROM public.notification_outbox WHERE status = 'failed' ORDER BY created_at DESC LIMIT 10) f), '[]'::jsonb),
    'scheduler', EXISTS (SELECT 1 FROM pg_catalog.pg_extension WHERE extname = 'pg_cron'));
END $$;
