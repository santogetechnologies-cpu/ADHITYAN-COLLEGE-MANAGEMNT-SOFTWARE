-- =============================================================================
-- MIGRATION 005: COMPLETE REALTIME SYNCHRONIZATION SETUP & NOTIFICATION TRIGGERS
-- =============================================================================

-- Enable REPLICA IDENTITY FULL on all core tables for full record payloads during UPDATE and DELETE
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'profiles',
        'departments',
        'timetables',
        'calendar_events',
        'assignments',
        'daily_teaching_updates',
        'feedback_submissions',
        'teacher_messages',
        'student_fees',
        'finance_transactions',
        'concerns',
        'admission_applications',
        'alumni_members',
        'alumni_events',
        'certificates',
        'disciplinary_incidents',
        'sports_events',
        'sports_teams',
        'health_records',
        'infirmary_visits',
        'library_books',
        'book_issues',
        'exam_schedules',
        'naac_criterion_progress',
        'naac_documents',
        'transport_vehicles',
        'transport_stops',
        'store_products',
        'store_orders',
        'inventory_items',
        'notifications',
        'wellness_checkins',
        'reception_visitors',
        'reception_appointments',
        'reception_enquiries'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL;', tbl);
            BEGIN
                EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
            EXCEPTION WHEN duplicate_object THEN
                -- Already added to publication
                NULL;
            END;
        END IF;
    END LOOP;
END $$;

-- =============================================================================
-- CROSS-ROLE AUTOMATED REALTIME NOTIFICATION TRIGGERS
-- =============================================================================

-- 1. Trigger on Admission Applications (Notifies Admins & Principals)
CREATE OR REPLACE FUNCTION notify_new_admission()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_new_admission ON public.admission_applications;
CREATE TRIGGER trg_notify_new_admission
AFTER INSERT ON public.admission_applications
FOR EACH ROW
EXECUTE FUNCTION notify_new_admission();

-- 2. Trigger on Certificate Status Changes (Notifies the Requesting Student)
CREATE OR REPLACE FUNCTION notify_certificate_status()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_certificate_status ON public.certificates;
CREATE TRIGGER trg_notify_certificate_status
AFTER UPDATE ON public.certificates
FOR EACH ROW
EXECUTE FUNCTION notify_certificate_status();

-- 3. Trigger on Student Concerns (Notifies Principals and Admins)
CREATE OR REPLACE FUNCTION notify_new_concern()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_new_concern ON public.concerns;
CREATE TRIGGER trg_notify_new_concern
AFTER INSERT ON public.concerns
FOR EACH ROW
EXECUTE FUNCTION notify_new_concern();

-- 4. Trigger on Fee Payments (Notifies Student and Finance Dashboard)
CREATE OR REPLACE FUNCTION notify_fee_payment()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_fee_payment ON public.student_fees;
CREATE TRIGGER trg_notify_fee_payment
AFTER INSERT OR UPDATE ON public.student_fees
FOR EACH ROW
EXECUTE FUNCTION notify_fee_payment();

-- 5. Trigger on New Assignments (Notifies Class Students)
CREATE OR REPLACE FUNCTION notify_new_assignment()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_new_assignment ON public.assignments;
CREATE TRIGGER trg_notify_new_assignment
AFTER INSERT ON public.assignments
FOR EACH ROW
EXECUTE FUNCTION notify_new_assignment();

-- 6. Trigger on Store Orders (Notifies Store Manager)
CREATE OR REPLACE FUNCTION notify_store_order()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_store_order ON public.store_orders;
CREATE TRIGGER trg_notify_store_order
AFTER INSERT ON public.store_orders
FOR EACH ROW
EXECUTE FUNCTION notify_store_order();

