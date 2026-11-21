-- 077: Email/SMS delivery queue, automatic (scheduled) fee reminders, notification settings. Idempotent. Depends on 057, 076.
-- Every in-app notification can also be e-mailed (medium/high priority) or texted (high priority) to people who have an
-- address/number and have not opted out. The queue is drained by the `notifications-dispatch` edge function.

ALTER TABLE public.institutional_settings
  ADD COLUMN IF NOT EXISTS auto_fee_reminders BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fee_reminder_days INT NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS sms_alerts_enabled BOOLEAN NOT NULL DEFAULT false;
DO $$ BEGIN
  ALTER TABLE public.institutional_settings ADD CONSTRAINT institutional_settings_reminder_days CHECK (fee_reminder_days BETWEEN 0 AND 30);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.notification_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES public.notifications(id) ON DELETE SET NULL,
  user_id UUID,
  channel TEXT NOT NULL CHECK (channel IN ('email','sms')),
  to_address TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','failed')),
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  claimed_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS notification_outbox_pending ON public.notification_outbox(created_at) WHERE status IN ('pending','sending');
ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notification_outbox_select ON public.notification_outbox;
CREATE POLICY notification_outbox_select ON public.notification_outbox FOR SELECT TO authenticated USING (public.get_current_user_role() IN ('admin','principal'));
REVOKE ALL ON public.notification_outbox FROM authenticated, anon;
GRANT SELECT ON public.notification_outbox TO authenticated;

-- enqueue on every notification: email for medium/high, SMS for high only; respects switches and per-person opt-out
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
  IF COALESCE(s.sms_alerts_enabled, false) AND NEW.priority = 'high' AND COALESCE(p.preferences->>'sms_notifications','true') <> 'false' AND v_phone ~ '^\+?[0-9]{10,15}$' THEN
    INSERT INTO public.notification_outbox(notification_id, user_id, channel, to_address, body) VALUES (NEW.id, NEW.user_id, 'sms', v_phone, left(NEW.title || ': ' || NEW.message, 300));
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.notifications_enqueue() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS notifications_enqueue ON public.notifications;
CREATE TRIGGER notifications_enqueue AFTER INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.notifications_enqueue();

-- worker API (service role only)
CREATE OR REPLACE FUNCTION public.outbox_claim(p_limit INT DEFAULT 25, p_channels TEXT[] DEFAULT ARRAY['email','sms'])
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
CREATE OR REPLACE FUNCTION public.outbox_complete(p_id UUID, p_ok BOOLEAN, p_error TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  UPDATE public.notification_outbox SET
    status = CASE WHEN p_ok THEN 'sent' WHEN attempts >= 3 THEN 'failed' ELSE 'pending' END,
    sent_at = CASE WHEN p_ok THEN now() ELSE NULL END, last_error = CASE WHEN p_ok THEN NULL ELSE left(COALESCE(p_error,'unknown error'), 500) END
  WHERE id = p_id;
$$;
REVOKE ALL ON FUNCTION public.outbox_claim(INT, TEXT[]), public.outbox_complete(UUID, BOOLEAN, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.outbox_claim(INT, TEXT[]), public.outbox_complete(UUID, BOOLEAN, TEXT) TO service_role;

-- admin view + settings
CREATE OR REPLACE FUNCTION public.notification_channel_status()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE s public.institutional_settings;
BEGIN
  IF auth.uid() IS NULL OR public.get_current_user_role() NOT IN ('admin','principal') THEN RETURN jsonb_build_object('allowed', false); END IF;
  SELECT * INTO s FROM public.institutional_settings LIMIT 1;
  RETURN jsonb_build_object('allowed', true,
    'settings', jsonb_build_object('email', COALESCE(s.enable_email_alerts, false), 'sms', COALESCE(s.sms_alerts_enabled, false), 'auto_reminders', COALESCE(s.auto_fee_reminders, false), 'reminder_days', COALESCE(s.fee_reminder_days, 7)),
    'counts', COALESCE((SELECT jsonb_object_agg(k, n) FROM (SELECT channel || ':' || status AS k, count(*) AS n FROM public.notification_outbox WHERE created_at > now() - interval '30 days' GROUP BY 1) q), '{}'::jsonb),
    'recent_failures', COALESCE((SELECT jsonb_agg(jsonb_build_object('channel', channel, 'to', to_address, 'error', last_error, 'at', created_at) ORDER BY created_at DESC) FROM (SELECT * FROM public.notification_outbox WHERE status = 'failed' ORDER BY created_at DESC LIMIT 10) f), '[]'::jsonb),
    'scheduler', EXISTS (SELECT 1 FROM pg_catalog.pg_extension WHERE extname = 'pg_cron'));
END $$;

CREATE OR REPLACE FUNCTION public.notification_settings_set(p_email BOOLEAN, p_sms BOOLEAN, p_auto_reminders BOOLEAN, p_reminder_days INT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role TEXT := public.get_current_user_role();
BEGIN
  IF auth.uid() IS NULL OR v_role NOT IN ('admin','principal') THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only admin or principal can change notification settings.'); END IF;
  IF COALESCE(p_reminder_days, -1) NOT BETWEEN 0 AND 30 THEN RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Reminder window must be 0 to 30 days.'); END IF;
  UPDATE public.institutional_settings SET enable_email_alerts = COALESCE(p_email, false), sms_alerts_enabled = COALESCE(p_sms, false),
    auto_fee_reminders = COALESCE(p_auto_reminders, false), fee_reminder_days = p_reminder_days, updated_at = now();
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values)
  VALUES (auth.uid(), v_role, 'notification_settings_changed', 'institutional_settings', NULL, jsonb_build_object('email', p_email, 'sms', p_sms, 'auto_reminders', p_auto_reminders, 'days', p_reminder_days));
  RETURN jsonb_build_object('success', true);
END $$;

CREATE OR REPLACE FUNCTION public.outbox_retry_failed()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE n INT;
BEGIN
  IF auth.uid() IS NULL OR public.get_current_user_role() NOT IN ('admin','principal') THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only admin or principal can retry.'); END IF;
  UPDATE public.notification_outbox SET status = 'pending', attempts = 0, created_at = now() WHERE status = 'failed' AND created_at > now() - interval '30 days';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN jsonb_build_object('success', true, 'requeued', n);
END $$;

-- ---------- fee reminders: one core, used by the button and by the scheduler ----------
CREATE OR REPLACE FUNCTION public._fee_reminders_core(p_days_ahead INT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE f RECORD; v_type TEXT; v_sent INT := 0; v_skipped INT := 0; v_uid UUID; v_title TEXT; v_msg TEXT; v_prio TEXT;
BEGIN
  p_days_ahead := LEAST(GREATEST(COALESCE(p_days_ahead, 7), 0), 30);
  FOR f IN SELECT sf.* FROM public.student_fees sf JOIN public.profiles p ON p.id = sf.student_id AND p.status = 'active'
            WHERE sf.total_due > 0 AND sf.status NOT IN ('paid','waived','cancelled') AND sf.due_date <= CURRENT_DATE + p_days_ahead LOOP
    v_type := CASE WHEN f.due_date < CURRENT_DATE THEN 'overdue_escalation' WHEN f.due_date = CURRENT_DATE THEN 'due_date' ELSE 'upcoming' END;
    IF EXISTS (SELECT 1 FROM public.fee_payment_reminders r WHERE r.student_fee_id = f.id AND r.reminder_type = v_type
                 AND r.sent_at > now() - CASE WHEN v_type = 'overdue_escalation' THEN interval '7 days' ELSE interval '3 days' END) THEN
      v_skipped := v_skipped + 1; CONTINUE; END IF;
    INSERT INTO public.fee_payment_reminders(student_id, student_fee_id, student_name, roll_number, reminder_type, due_date, amount_due, channels, delivery_status)
    VALUES (f.student_id, f.id, f.student_name, COALESCE(f.student_code, ''), v_type, f.due_date, f.total_due, 'In_App,Email,SMS', 'Sent');
    v_title := CASE WHEN v_type = 'overdue_escalation' THEN 'Fee overdue' ELSE 'Fee due soon' END;
    v_msg := COALESCE(f.description, 'Fee') || ' of ₹' || f.total_due || CASE WHEN f.due_date < CURRENT_DATE THEN ' was due on ' ELSE ' is due on ' END || f.due_date || '.';
    v_prio := CASE WHEN v_type = 'overdue_escalation' THEN 'high' ELSE 'medium' END;
    FOR v_uid IN SELECT f.student_id UNION SELECT l.parent_id FROM public.parent_student_links l WHERE l.student_id = f.student_id LOOP
      INSERT INTO public.notifications(user_id, title, message, type, priority) VALUES (v_uid, v_title, v_msg, CASE WHEN v_type = 'overdue_escalation' THEN 'warning' ELSE 'info' END, v_prio);
    END LOOP;
    v_sent := v_sent + 1;
  END LOOP;
  RETURN jsonb_build_object('success', true, 'sent', v_sent, 'skipped', v_skipped);
END $$;
REVOKE ALL ON FUNCTION public._fee_reminders_core(INT) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.fee_send_reminders(p_days_ahead INT DEFAULT 7)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); r JSONB;
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('admin','principal','finance_manager','financier','accountant') THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only the finance team can send reminders.'); END IF;
  r := public._fee_reminders_core(p_days_ahead);
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values) VALUES (v_uid, v_role, 'fee_reminders_sent', 'student_fees', NULL, r);
  RETURN r;
END $$;

-- called daily by the scheduler (no signed-in user); does nothing unless an admin switched automatic reminders on
CREATE OR REPLACE FUNCTION public.fee_reminders_auto() RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE s public.institutional_settings; r JSONB;
BEGIN
  SELECT * INTO s FROM public.institutional_settings LIMIT 1;
  IF NOT COALESCE(s.auto_fee_reminders, false) THEN RETURN jsonb_build_object('success', true, 'skipped', 'automatic reminders are off'); END IF;
  r := public._fee_reminders_core(s.fee_reminder_days);
  INSERT INTO public.audit_logs (action, entity_type, entity_id, new_values) VALUES ('fee_reminders_auto', 'student_fees', NULL, r);
  RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.fee_reminders_auto() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fee_reminders_auto() TO service_role;

REVOKE ALL ON FUNCTION public.notification_channel_status(), public.notification_settings_set(BOOLEAN,BOOLEAN,BOOLEAN,INT), public.outbox_retry_failed(), public.fee_send_reminders(INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notification_channel_status(), public.notification_settings_set(BOOLEAN,BOOLEAN,BOOLEAN,INT), public.outbox_retry_failed(), public.fee_send_reminders(INT) TO authenticated;

-- daily schedule (09:00 IST) where the pg_cron extension is available; otherwise enable pg_cron in the dashboard and re-run this block
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'erp-fee-reminders';
    PERFORM cron.schedule('erp-fee-reminders', '30 3 * * *', 'SELECT public.fee_reminders_auto()');
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron schedule not created: %', SQLERRM;
END $$;
