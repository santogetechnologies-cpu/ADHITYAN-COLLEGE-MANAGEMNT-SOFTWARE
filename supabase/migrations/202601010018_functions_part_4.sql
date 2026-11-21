-- Functions and RPCs, part 4 of 6
-- Generated from the verified schema. Run as is; do not edit. Safe to run once on an EMPTY database.
SET check_function_bodies = false;
SET search_path = public, extensions;

SET check_function_bodies = false;

--
-- Name: inventory_receive(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.inventory_receive(p_order uuid, p_qty integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE bad JSONB := public._inventory_check(p_qty); o public.inventory_transactions; v_left INT;
BEGIN
  IF bad IS NOT NULL THEN RETURN bad; END IF;
  SELECT * INTO o FROM public.inventory_transactions WHERE id = p_order AND type = 'Order' FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Purchase order not found.'); END IF;
  IF o.status NOT IN ('pending','processing') THEN RETURN jsonb_build_object('success', false, 'code', 'BAD_STATE', 'error', 'This order is already ' || o.status || '.'); END IF;
  v_left := o.quantity - o.received_qty;
  IF p_qty > v_left THEN RETURN jsonb_build_object('success', false, 'code', 'EXCEEDS_ORDER', 'error', format('Only %s still expected on this order.', v_left)); END IF;
  UPDATE public.inventory_items SET current_stock = current_stock + p_qty, urgency = public._inventory_urgency(current_stock + p_qty, minimum_stock), updated_at = now() WHERE id = o.item_id;
  UPDATE public.inventory_transactions SET received_qty = received_qty + p_qty, status = CASE WHEN received_qty + p_qty >= quantity THEN 'completed' ELSE 'processing' END WHERE id = o.id;
  INSERT INTO public.inventory_transactions (type, item_id, item_name, quantity, supplier, status, note, created_by) VALUES ('Receipt', o.item_id, o.item_name, p_qty, o.supplier, 'completed', 'Against order ' || o.id::text, auth.uid());
  RETURN jsonb_build_object('success', true, 'complete', o.received_qty + p_qty >= o.quantity);
END $$;

--
-- Name: inventory_return(text, integer, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.inventory_return(p_item_name text, p_qty integer, p_recipient text, p_reason text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE bad JSONB := public._inventory_check(p_qty); it public.inventory_items; v_held INT;
BEGIN
  IF bad IS NOT NULL THEN RETURN bad; END IF;
  IF length(trim(COALESCE(p_recipient,''))) < 2 THEN RETURN jsonb_build_object('success', false, 'code', 'RECIPIENT_REQUIRED', 'error', 'Say who is returning the item.'); END IF;
  SELECT * INTO it FROM public.inventory_items WHERE lower(name) = lower(trim(p_item_name)) FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'ITEM_NOT_FOUND', 'error', 'No inventory item with that exact name.'); END IF;
  SELECT COALESCE(sum(CASE WHEN type = 'Issue' THEN quantity ELSE -quantity END), 0) INTO v_held
    FROM public.inventory_transactions WHERE item_id = it.id AND lower(recipient) = lower(trim(p_recipient)) AND type IN ('Issue','Adjustment') AND status = 'completed';
  IF p_qty > v_held THEN RETURN jsonb_build_object('success', false, 'code', 'EXCEEDS_ISSUED', 'error', format('%s currently holds %s of this item; cannot return %s.', trim(p_recipient), GREATEST(v_held, 0), p_qty)); END IF;
  UPDATE public.inventory_items SET current_stock = current_stock + p_qty, urgency = public._inventory_urgency(current_stock + p_qty, minimum_stock), updated_at = now() WHERE id = it.id;
  INSERT INTO public.inventory_transactions (type, item_id, item_name, quantity, recipient, status, note, created_by) VALUES ('Adjustment', it.id, it.name, p_qty, trim(p_recipient), 'completed', COALESCE(NULLIF(trim(p_reason),''), 'Returned'), auth.uid());
  RETURN jsonb_build_object('success', true, 'stock_now', it.current_stock + p_qty);
END $$;

--
-- Name: is_my_vehicle(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_my_vehicle(p_vehicle uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT EXISTS (SELECT 1 FROM public.transport_vehicles v WHERE v.id = p_vehicle AND v.driver_id = auth.uid());
$$;

--
-- Name: is_parent_of(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_parent_of(p_student_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.parent_student_links
    WHERE parent_id = auth.uid()
      AND student_id = p_student_id
      AND verified = true
  );
$$;

--
-- Name: is_teacher_assigned_to_class(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_teacher_assigned_to_class(p_teacher_id uuid, p_class_name text) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    -- DEF-119: Caller Authorization Guard (Prevents leaking other faculty assignment data)
    IF p_teacher_id <> auth.uid() AND public.get_current_user_role() NOT IN ('admin', 'principal', 'hod') THEN
        RETURN FALSE;
    END IF;

    IF p_teacher_id IS NULL OR p_class_name IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Assigned via timetables table using stable teacher UUID (No loose name string matching)
    RETURN EXISTS (
        SELECT 1 FROM public.timetables t 
        WHERE t.teacher_id = p_teacher_id
          AND LOWER(TRIM(t.class_name)) = LOWER(TRIM(p_class_name))
    );
END;
$$;

--
-- Name: is_teacher_assigned_to_class_and_subject(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_teacher_assigned_to_class_and_subject(p_teacher_id uuid, p_class_name text, p_subject_code text) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    -- DEF-119: Caller Authorization Guard
    IF p_teacher_id <> auth.uid() AND public.get_current_user_role() NOT IN ('admin', 'principal', 'hod') THEN
        RETURN FALSE;
    END IF;

    IF p_teacher_id IS NULL OR p_class_name IS NULL OR p_subject_code IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Strict verification via timetables: teacher UUID + exact class + exact normalized subject
    RETURN EXISTS (
        SELECT 1 FROM public.timetables t 
        WHERE t.teacher_id = p_teacher_id 
          AND LOWER(TRIM(t.class_name)) = LOWER(TRIM(p_class_name))
          AND LOWER(TRIM(t.subject)) = LOWER(TRIM(p_subject_code))
    );
END;
$$;

--
-- Name: issue_library_book(uuid, uuid, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.issue_library_book(p_book_id uuid, p_student_id uuid, p_due_date date) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_avail INTEGER; v_title TEXT; v_code TEXT; v_issue UUID; v_p RECORD;
BEGIN
    IF public.get_current_user_role() NOT IN ('admin', 'principal', 'librarian') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authorized to issue books.');
    END IF;
    IF p_due_date IS NULL OR p_due_date <= CURRENT_DATE THEN
        RETURN jsonb_build_object('success', false, 'error', 'Due date must be in the future.');
    END IF;
    SELECT id, name, student_id, roll_number, class_name INTO v_p
      FROM public.profiles WHERE id = p_student_id AND role IN ('student', 'teacher');
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Borrower not found.');
    END IF;
    SELECT available_copies, title, book_code INTO v_avail, v_title, v_code
      FROM public.library_books WHERE id = p_book_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Book not found.');
    END IF;
    IF v_avail <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'No copies currently available.');
    END IF;
    UPDATE public.library_books
       SET available_copies = available_copies - 1,
           status = CASE WHEN available_copies - 1 = 0 THEN 'Issued' ELSE status END,
           updated_at = NOW()
     WHERE id = p_book_id;
    INSERT INTO public.book_issues (book_id, book_title, book_code, user_id, student_name, student_id,
                                    roll_no, class_name, issue_date, due_date, status)
    VALUES (p_book_id, v_title, v_code, p_student_id, v_p.name, v_p.student_id,
            v_p.roll_number, v_p.class_name, CURRENT_DATE, p_due_date, 'Issued')
    RETURNING id INTO v_issue;
    RETURN jsonb_build_object('success', true, 'issue_id', v_issue, 'remaining_copies', v_avail - 1);
END;
$$;

--
-- Name: jsonb_merge_deep(jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.jsonb_merge_deep(a jsonb, b jsonb) RETURNS jsonb
    LANGUAGE sql IMMUTABLE
    SET search_path TO 'public', 'pg_temp'
    AS $$
    SELECT CASE
        WHEN jsonb_typeof(a) = 'object' AND jsonb_typeof(b) = 'object' THEN
            COALESCE((SELECT jsonb_object_agg(k, CASE WHEN a ? k AND b ? k THEN public.jsonb_merge_deep(a -> k, b -> k)
                                                      WHEN b ? k THEN b -> k ELSE a -> k END)
                        FROM (SELECT jsonb_object_keys(a) AS k UNION SELECT jsonb_object_keys(b)) keys), '{}'::jsonb)
        ELSE COALESCE(b, a) END
$$;

--
-- Name: naac_metrics_after(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.naac_metrics_after() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') THEN PERFORM public.naac_recompute_progress(OLD.criterion_number); END IF;
  IF TG_OP IN ('INSERT','UPDATE') THEN PERFORM public.naac_recompute_progress(NEW.criterion_number); END IF;
  RETURN NULL;
END $$;

--
-- Name: naac_recompute_progress(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.naac_recompute_progress(p_criterion integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_total INT; v_done INT;
BEGIN
  SELECT count(*), count(*) FILTER (WHERE status = 'Completed') INTO v_total, v_done FROM public.naac_metrics WHERE criterion_number = p_criterion;
  UPDATE public.naac_criterion_progress SET total_metrics = v_total, completed_metrics = v_done,
         completion_percentage = CASE WHEN v_total = 0 THEN 0 ELSE round(100.0 * v_done / v_total)::int END, last_updated = now()
   WHERE criterion_number = p_criterion;
END $$;

--
-- Name: notification_channel_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notification_channel_status() RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
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

--
-- Name: notification_settings_set(boolean, boolean, boolean, integer, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notification_settings_set(p_email boolean, p_sms boolean, p_auto_reminders boolean, p_reminder_days integer, p_whatsapp boolean DEFAULT false) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
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

--
-- Name: notifications_enqueue(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notifications_enqueue() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $_$
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
END $_$;

--
-- Name: notify_certificate_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_certificate_status() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            type,
            priority,
            is_read
        ) VALUES (
            NEW.student_id,
            'Certificate Request ' || NEW.status,
            'Your request for "' || NEW.certificate_type || '" has been ' || LOWER(NEW.status) || '.',
            CASE WHEN NEW.status = 'Approved' THEN 'success' ELSE 'warning' END,
            'medium',
            false
        );
    END IF;
    RETURN NEW;
END;
$$;

--
-- Name: notify_fee_payment(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_fee_payment() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    IF (LOWER(NEW.status) = 'paid' AND (OLD IS NULL OR LOWER(OLD.status) <> 'paid')) THEN
        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            type,
            priority,
            is_read
        ) VALUES (
            NEW.student_id,
            'Fee Payment Received',
            'Payment of ₹' || COALESCE(NEW.paid_amount::text, NEW.total_due::text) || ' has been confirmed.',
            'success',
            'medium',
            false
        );
    END IF;
    RETURN NEW;
END;
$$;

--
-- Name: notify_new_admission(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_new_admission() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    admin_record RECORD;
BEGIN
    FOR admin_record IN SELECT id FROM public.profiles WHERE role IN ('admin', 'principal', 'super_admin') LOOP
        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            type,
            priority,
            is_read
        ) VALUES (
            admin_record.id,
            'New Admission Application',
            'New applicant: ' || NEW.student_name || ' for ' || COALESCE(NEW.applied_class, 'Program'),
            'info',
            'high',
            false
        );
    END LOOP;
    RETURN NEW;
END;
$$;

--
-- Name: notify_new_assignment(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_new_assignment() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    student_record RECORD;
BEGIN
    FOR student_record IN 
        SELECT id FROM public.profiles 
        WHERE role = 'student' 
        AND (NEW.classes IS NULL OR array_length(NEW.classes, 1) IS NULL OR class_name = ANY(NEW.classes)) 
    LOOP
        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            type,
            priority,
            is_read
        ) VALUES (
            student_record.id,
            'New Assignment: ' || NEW.title,
            NEW.subject || ' assignment posted. Due: ' || COALESCE(NEW.due_date::date::text, 'Soon'),
            'info',
            'medium',
            false
        );
    END LOOP;
    RETURN NEW;
END;
$$;

--
-- Name: notify_new_concern(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_new_concern() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    admin_record RECORD;
BEGIN
    FOR admin_record IN SELECT id FROM public.profiles WHERE role IN ('principal', 'vice_principal', 'admin') LOOP
        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            type,
            priority,
            is_read
        ) VALUES (
            admin_record.id,
            'New Student Concern: ' || NEW.category,
            'Subject: ' || NEW.subject || ' (Priority: ' || COALESCE(NEW.priority, 'Normal') || ')',
            'warning',
            'high',
            false
        );
    END LOOP;
    RETURN NEW;
END;
$$;

--
-- Name: notify_roles(text[], text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_roles(p_roles text[], p_title text, p_message text, p_type text DEFAULT 'info'::text, p_priority text DEFAULT 'medium'::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
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

--
-- Name: notify_store_order(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_store_order() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
    store_record RECORD;
BEGIN
    FOR store_record IN SELECT id FROM public.profiles WHERE role IN ('store_manager', 'storekeeper', 'admin') LOOP
        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            type,
            priority,
            is_read
        ) VALUES (
            store_record.id,
            'New Campus Store Order',
            'Order #' || SUBSTRING(NEW.id::text, 1, 8) || ' placed for $' || NEW.total_amount::text,
            'info',
            'medium',
            false
        );
    END LOOP;
    RETURN NEW;
END;
$_$;

--
-- Name: notify_users(uuid[], text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_users(p_user_ids uuid[], p_title text, p_message text, p_type text DEFAULT 'info'::text, p_priority text DEFAULT 'medium'::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
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

--
-- Name: outbox_claim(integer, text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.outbox_claim(p_limit integer DEFAULT 25, p_channels text[] DEFAULT ARRAY['email'::text, 'sms'::text, 'whatsapp'::text]) RETURNS SETOF public.notification_outbox
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
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

--
-- Name: outbox_complete(uuid, boolean, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.outbox_complete(p_id uuid, p_ok boolean, p_error text DEFAULT NULL::text) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  UPDATE public.notification_outbox SET
    status = CASE WHEN p_ok THEN 'sent' WHEN attempts >= 3 THEN 'failed' ELSE 'pending' END,
    sent_at = CASE WHEN p_ok THEN now() ELSE NULL END, last_error = CASE WHEN p_ok THEN NULL ELSE left(COALESCE(p_error,'unknown error'), 500) END
  WHERE id = p_id;
$$;

--
-- Name: outbox_retry_failed(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.outbox_retry_failed() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE n INT;
BEGIN
  IF auth.uid() IS NULL OR public.get_current_user_role() NOT IN ('admin','principal') THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only admin or principal can retry.'); END IF;
  UPDATE public.notification_outbox SET status = 'pending', attempts = 0, created_at = now() WHERE status = 'failed' AND created_at > now() - interval '30 days';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN jsonb_build_object('success', true, 'requeued', n);
END $$;

--
-- Name: payment_flags_set(boolean, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.payment_flags_set(p_online boolean, p_exam_fee_clearance boolean) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('admin','principal','finance_manager') THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only admin, principal or finance can change payment settings.'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.institutional_settings) THEN RETURN jsonb_build_object('success', false, 'code', 'NO_SETTINGS', 'error', 'Institution settings have not been created yet.'); END IF;
  UPDATE public.institutional_settings SET online_payments_enabled = COALESCE(p_online, online_payments_enabled), exam_requires_fee_clearance = COALESCE(p_exam_fee_clearance, exam_requires_fee_clearance), updated_at = now();
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values) VALUES (v_uid, v_role, 'payment_flags_set', 'institutional_settings', 'singleton', jsonb_build_object('online', p_online, 'exam_fee_clearance', p_exam_fee_clearance));
  RETURN jsonb_build_object('success', true);
END $$;

--
-- Name: payment_order_attach(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.payment_order_attach(p_order uuid, p_gateway_order_id text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  UPDATE public.payment_orders SET gateway_order_id = p_gateway_order_id WHERE id = p_order AND status = 'Created' AND gateway_order_id IS NULL;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Order not found or already attached.'); END IF;
  RETURN jsonb_build_object('success', true);
END $$;

--
-- Name: payment_order_create(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.payment_order_create(p_actor uuid, p_items jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_role TEXT; v_enabled BOOLEAN; it JSONB; f public.student_fees; v_amt NUMERIC; v_total NUMERIC := 0; v_order UUID; v_stu UUID; v_first_stu UUID; v_n INT := 0; v_ok BOOLEAN; v_seen UUID[] := '{}';
BEGIN
  SELECT COALESCE(online_payments_enabled, FALSE) INTO v_enabled FROM public.institutional_settings LIMIT 1;
  IF NOT COALESCE(v_enabled, FALSE) THEN RETURN jsonb_build_object('success', false, 'code', 'DISABLED', 'error', 'Online payment is not enabled for this institution.'); END IF;
  SELECT role INTO v_role FROM public.profiles WHERE id = p_actor AND COALESCE(status,'active') = 'active';
  IF v_role IS NULL OR v_role NOT IN ('student','parent') THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only students and parents can pay online.'); END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 20 THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Choose between 1 and 20 fees to pay.'); END IF;
  INSERT INTO public.payment_orders (created_by, payer_role, amount, status) VALUES (p_actor, v_role, 0.01, 'Created') RETURNING id INTO v_order;
  FOR it IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    BEGIN v_amt := round((it->>'amount')::numeric, 2); EXCEPTION WHEN others THEN v_amt := NULL; END;
    IF v_amt IS NULL OR v_amt <= 0 THEN RAISE EXCEPTION 'INVALID_AMOUNT'; END IF;
    SELECT * INTO f FROM public.student_fees WHERE id = (it->>'student_fee_id')::uuid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'FEE_NOT_FOUND'; END IF;
    IF f.id = ANY (v_seen) THEN RAISE EXCEPTION 'DUPLICATE_FEE'; END IF;
    v_seen := v_seen || f.id;
    -- ownership: the student themself, or a verified parent of the student
    v_stu := COALESCE(f.student_id, (SELECT st.user_id FROM public.students st WHERE st.id = f.student_record_id));
    v_ok := (v_role = 'student' AND (f.student_id = p_actor OR EXISTS (SELECT 1 FROM public.students st WHERE st.id = f.student_record_id AND st.user_id = p_actor)))
         OR (v_role = 'parent' AND v_stu IS NOT NULL AND EXISTS (SELECT 1 FROM public.parent_student_links l WHERE l.parent_id = p_actor AND l.student_id = v_stu AND COALESCE(l.verified, FALSE)));
    IF NOT v_ok THEN RAISE EXCEPTION 'NOT_YOUR_FEE'; END IF;
    IF f.status IN ('cancelled','waived','paid') OR f.total_due <= 0 THEN RAISE EXCEPTION 'NOTHING_DUE'; END IF;
    IF v_amt > f.total_due THEN RAISE EXCEPTION 'EXCEEDS_BALANCE'; END IF;
    v_first_stu := COALESCE(v_first_stu, v_stu);
    INSERT INTO public.payment_order_items (order_id, student_fee_id, amount) VALUES (v_order, f.id, v_amt);
    v_total := v_total + v_amt; v_n := v_n + 1;
  END LOOP;
  UPDATE public.payment_orders SET amount = v_total, student_id = v_first_stu WHERE id = v_order;
  RETURN jsonb_build_object('success', true, 'order_id', v_order, 'amount', v_total, 'amount_paise', (v_total * 100)::bigint, 'items', v_n);
EXCEPTION WHEN raise_exception THEN
  RETURN jsonb_build_object('success', false, 'code', SQLERRM, 'error', CASE SQLERRM
    WHEN 'INVALID_AMOUNT' THEN 'Each amount must be greater than zero.' WHEN 'FEE_NOT_FOUND' THEN 'A selected fee was not found.'
    WHEN 'DUPLICATE_FEE' THEN 'The same fee was selected twice.' WHEN 'NOT_YOUR_FEE' THEN 'You can only pay your own or your linked child''s fees.'
    WHEN 'NOTHING_DUE' THEN 'A selected fee has no balance due.' WHEN 'EXCEEDS_BALANCE' THEN 'An amount exceeds the outstanding balance of that fee.'
    ELSE 'The order could not be created.' END);
END $$;

--
-- Name: payment_order_create_store(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.payment_order_create_store(p_actor uuid, p_store_order uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_role TEXT; v_enabled BOOLEAN; so public.store_orders; v_order UUID;
BEGIN
  SELECT COALESCE(online_payments_enabled, FALSE) INTO v_enabled FROM public.institutional_settings LIMIT 1;
  IF NOT COALESCE(v_enabled, FALSE) THEN RETURN jsonb_build_object('success', false, 'code', 'DISABLED', 'error', 'Online payment is not enabled for this institution.'); END IF;
  SELECT role INTO v_role FROM public.profiles WHERE id = p_actor AND COALESCE(status,'active') = 'active';
  IF v_role IS NULL OR v_role NOT IN ('student','parent') THEN RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only students and parents can pay online.'); END IF;
  SELECT * INTO so FROM public.store_orders WHERE id = p_store_order FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Order not found.'); END IF;
  IF NOT (so.user_id = p_actor OR (v_role = 'parent' AND EXISTS (SELECT 1 FROM public.parent_student_links l WHERE l.parent_id = p_actor AND l.student_id = so.user_id AND COALESCE(l.verified, FALSE)))) THEN
    RETURN jsonb_build_object('success', false, 'code', 'NOT_YOUR_ORDER', 'error', 'This is not your order.'); END IF;
  IF so.status NOT IN ('Pending','Processing') OR so.payment_status <> 'Unpaid' THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_PAYABLE', 'error', 'This order cannot be paid (it is ' || lower(so.status) || ', ' || lower(so.payment_status) || ').'); END IF;
  IF so.total_amount IS NULL OR so.total_amount <= 0 THEN RETURN jsonb_build_object('success', false, 'code', 'NOT_PAYABLE', 'error', 'This order has nothing to pay.'); END IF;
  INSERT INTO public.payment_orders (created_by, payer_role, student_id, amount, status, store_order_id) VALUES (p_actor, v_role, so.user_id, so.total_amount, 'Created', so.id) RETURNING id INTO v_order;
  RETURN jsonb_build_object('success', true, 'order_id', v_order, 'amount', so.total_amount, 'amount_paise', (so.total_amount * 100)::bigint);
END $$;

--
-- Name: payment_order_fail(text, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.payment_order_fail(p_gateway_order_id text, p_reason text, p_event_id text, p_payload jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  INSERT INTO public.payment_events (gateway_event_id, event_type, gateway_order_id, payload) VALUES (p_event_id, 'payment.failed', p_gateway_order_id, p_payload) ON CONFLICT (gateway_event_id) DO NOTHING;
  UPDATE public.payment_orders SET status = 'Failed', failure_reason = left(COALESCE(p_reason, 'Payment failed'), 300) WHERE gateway_order_id = p_gateway_order_id AND status = 'Created';
  RETURN jsonb_build_object('success', true);
END $$;

--
-- Name: payment_order_refund_apply(uuid, text, uuid, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.payment_order_refund_apply(p_order uuid, p_reason text, p_actor uuid, p_gateway_refund_id text, p_items jsonb DEFAULT NULL::jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE o public.payment_orders; chk JSONB; x JSONB; r JSONB; v_amt NUMERIC; so public.store_orders; l RECORD;
BEGIN
  IF p_gateway_refund_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.payment_refunds WHERE gateway_refund_id = p_gateway_refund_id) THEN
    RETURN jsonb_build_object('success', true, 'duplicate', true); END IF;
  SELECT * INTO o FROM public.payment_orders WHERE id = p_order FOR UPDATE;
  IF FOUND AND o.status = 'Refunded' THEN RETURN jsonb_build_object('success', true, 'duplicate', true); END IF;
  chk := public.payment_order_refund_check(p_order, p_items);
  IF NOT COALESCE((chk->>'success')::boolean, FALSE) THEN RETURN chk; END IF;
  v_amt := (chk->>'amount')::numeric;
  IF o.status IN ('Paid','Partially_Refunded') AND o.store_order_id IS NULL THEN
    FOR x IN SELECT * FROM jsonb_array_elements(chk->'items') LOOP
      r := public._fee_payment_reverse((x->>'payment_id')::uuid, p_reason, p_actor, (x->>'amount')::numeric);
      IF NOT COALESCE((r->>'success')::boolean, FALSE) THEN RAISE EXCEPTION 'REVERSE_FAILED: %', COALESCE(r->>'error', r->>'code'); END IF;
    END LOOP;
  ELSIF o.store_order_id IS NOT NULL THEN
    SELECT * INTO so FROM public.store_orders WHERE id = o.store_order_id FOR UPDATE;
    IF so.status IN ('Pending','Processing') THEN
      FOR l IN SELECT (e->>'product_id')::uuid AS pid, (e->>'quantity')::int AS qty FROM jsonb_array_elements(so.items) e WHERE e ? 'product_id' LOOP
        UPDATE public.store_products SET stock = stock + l.qty, updated_at = now() WHERE id = l.pid;
      END LOOP;
      UPDATE public.store_orders SET status = 'Cancelled', payment_status = 'Refunded', updated_at = now() WHERE id = so.id;
    ELSE
      UPDATE public.store_orders SET payment_status = 'Refunded', updated_at = now() WHERE id = so.id;
    END IF;
  END IF;
  UPDATE public.payment_orders SET refunded_amount = refunded_amount + v_amt,
         status = CASE WHEN refunded_amount + v_amt >= amount THEN 'Refunded' ELSE 'Partially_Refunded' END,
         review_note = COALESCE(review_note || ' | ', '') || 'Refunded ' || v_amt || ': ' || trim(p_reason) WHERE id = o.id;
  INSERT INTO public.payment_refunds (order_id, amount, reason, gateway_refund_id, created_by, detail) VALUES (o.id, v_amt, trim(p_reason), p_gateway_refund_id, p_actor, chk->'items');
  RETURN jsonb_build_object('success', true, 'duplicate', false, 'refunded', v_amt);
END $$;

--
-- PostgreSQL database dump complete
--
