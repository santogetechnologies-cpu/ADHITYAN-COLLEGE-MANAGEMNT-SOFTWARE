-- Live updates (Supabase Realtime): every table a screen subscribes to must be in the publication.
-- Includes the tables the app listens to that earlier versions forgot, so screens refresh without a reload.
SET search_path = public, extensions;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'admission_applications',
    'admission_document_verifications',
    'admission_merit_lists',
    'ai_chat_messages',
    'alumni_events',
    'alumni_profiles',
    'assignment_submissions',
    'assignments',
    'attendance_shortage_warnings',
    'book_issues',
    'calendar_events',
    'certificates',
    'class_attendance_sessions',
    'concerns',
    'courses',
    'daily_teaching_updates',
    'departments',
    'digital_library_resources',
    'disciplinary_incidents',
    'exam_results',
    'exam_schedules',
    'exams',
    'fee_receipts',
    'feedback_submissions',
    'finance_transactions',
    'hall_tickets',
    'health_records',
    'hostel_allotments',
    'hostel_out_passes',
    'infirmary_visits',
    'institutional_broadcasts',
    'institutional_settings',
    'inventory_items',
    'inventory_transactions',
    'learning_content',
    'library_books',
    'naac_criterion_progress',
    'naac_documents',
    'notifications',
    'parent_student_links',
    'profiles',
    'reception_appointments',
    'reception_enquiries',
    'reception_visitors',
    'scholarship_applications',
    'sports_events',
    'sports_teams',
    'staff_leave_applications',
    'store_orders',
    'store_products',
    'student_achievements',
    'student_attendance',
    'student_fees',
    'student_goals',
    'student_learning_progress',
    'student_leave_requests',
    'student_mood_checkins',
    'student_transport_logs',
    'teacher_messages',
    'timetables',
    'transport_assignments',
    'transport_stops',
    'transport_vehicles',
    'vehicle_maintenance',
    'wellness_alerts',
    'wellness_checkins'
  ] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t)
       AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
