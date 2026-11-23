-- Switch on row level security for every table
-- Generated from the verified schema. Run as is; do not edit. Safe to run once on an EMPTY database.
SET check_function_bodies = false;
SET search_path = public, extensions;

SET check_function_bodies = false;

--
-- Name: admission_applications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admission_applications ENABLE ROW LEVEL SECURITY;

--
-- Name: admission_document_verifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admission_document_verifications ENABLE ROW LEVEL SECURITY;

--
-- Name: admission_entrance_tests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admission_entrance_tests ENABLE ROW LEVEL SECURITY;

--
-- Name: admission_fees; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admission_fees ENABLE ROW LEVEL SECURITY;

--
-- Name: admission_form_fields; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admission_form_fields ENABLE ROW LEVEL SECURITY;

--
-- Name: admission_merit_lists; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admission_merit_lists ENABLE ROW LEVEL SECURITY;

--
-- Name: admission_quotas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admission_quotas ENABLE ROW LEVEL SECURITY;

--
-- Name: admission_required_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admission_required_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: admission_routes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admission_routes ENABLE ROW LEVEL SECURITY;

--
-- Name: admission_seats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admission_seats ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_chat_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: alumni_donations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.alumni_donations ENABLE ROW LEVEL SECURITY;

--
-- Name: alumni_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.alumni_events ENABLE ROW LEVEL SECURITY;

--
-- Name: alumni_mentorships; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.alumni_mentorships ENABLE ROW LEVEL SECURITY;

--
-- Name: alumni_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.alumni_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: app_setting_drafts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_setting_drafts ENABLE ROW LEVEL SECURITY;

--
-- Name: app_setting_versions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_setting_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: app_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: assignment_submissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: attendance_shortage_warnings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.attendance_shortage_warnings ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: auth_rate_limits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

--
-- Name: book_issues; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.book_issues ENABLE ROW LEVEL SECURITY;

--
-- Name: calendar_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

--
-- Name: certificates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

--
-- Name: class_attendance_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.class_attendance_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: concerns; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.concerns ENABLE ROW LEVEL SECURITY;

--
-- Name: courses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_teaching_updates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.daily_teaching_updates ENABLE ROW LEVEL SECURITY;

--
-- Name: departments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

--
-- Name: digital_library_resources; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.digital_library_resources ENABLE ROW LEVEL SECURITY;

--
-- Name: disciplinary_incidents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.disciplinary_incidents ENABLE ROW LEVEL SECURITY;

--
-- Name: exam_invigilators; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exam_invigilators ENABLE ROW LEVEL SECURITY;

--
-- Name: exam_registrations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exam_registrations ENABLE ROW LEVEL SECURITY;

--
-- Name: exam_result_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exam_result_history ENABLE ROW LEVEL SECURITY;

--
-- Name: exam_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;

--
-- Name: exam_revaluation_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exam_revaluation_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: exam_rooms; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exam_rooms ENABLE ROW LEVEL SECURITY;

--
-- Name: exam_schedules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exam_schedules ENABLE ROW LEVEL SECURITY;

--
-- Name: exam_seating; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exam_seating ENABLE ROW LEVEL SECURITY;

--
-- Name: exams; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

--
-- Name: fee_adjustments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fee_adjustments ENABLE ROW LEVEL SECURITY;

--
-- Name: fee_heads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fee_heads ENABLE ROW LEVEL SECURITY;

--
-- Name: fee_payment_reminders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fee_payment_reminders ENABLE ROW LEVEL SECURITY;

--
-- Name: fee_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;

--
-- Name: fee_plan_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fee_plan_items ENABLE ROW LEVEL SECURITY;

--
-- Name: fee_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fee_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: fee_receipts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fee_receipts ENABLE ROW LEVEL SECURITY;

--
-- Name: fee_runs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fee_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: fee_structures; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;

--
-- Name: feedback_submissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: finance_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: grade_scale_bands; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.grade_scale_bands ENABLE ROW LEVEL SECURITY;

--
-- Name: grade_scales; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.grade_scales ENABLE ROW LEVEL SECURITY;

--
-- Name: hall_tickets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hall_tickets ENABLE ROW LEVEL SECURITY;

--
-- Name: health_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;

--
-- Name: hostel_allotments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hostel_allotments ENABLE ROW LEVEL SECURITY;

--
-- Name: hostel_out_passes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hostel_out_passes ENABLE ROW LEVEL SECURITY;

--
-- Name: hostel_rooms; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hostel_rooms ENABLE ROW LEVEL SECURITY;

--
-- Name: infirmary_visits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.infirmary_visits ENABLE ROW LEVEL SECURITY;

--
-- Name: institutional_broadcasts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.institutional_broadcasts ENABLE ROW LEVEL SECURITY;

--
-- Name: institutional_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.institutional_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: integration_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: learning_content; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.learning_content ENABLE ROW LEVEL SECURITY;

--
-- Name: library_books; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.library_books ENABLE ROW LEVEL SECURITY;

--
-- Name: library_circulation; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.library_circulation ENABLE ROW LEVEL SECURITY;

--
-- Name: medical_emergency_contacts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.medical_emergency_contacts ENABLE ROW LEVEL SECURITY;

--
-- Name: naac_criterion_progress; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.naac_criterion_progress ENABLE ROW LEVEL SECURITY;

--
-- Name: naac_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.naac_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: naac_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.naac_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_outbox; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: parent_student_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_order_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_order_items ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_refunds; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_refunds ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_settlements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_settlements ENABLE ROW LEVEL SECURITY;

--
-- Name: payroll_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payroll_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: placement_applications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.placement_applications ENABLE ROW LEVEL SECURITY;

--
-- Name: placement_drives; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.placement_drives ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: reception_appointments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reception_appointments ENABLE ROW LEVEL SECURITY;

--
-- Name: reception_enquiries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reception_enquiries ENABLE ROW LEVEL SECURITY;

--
-- Name: reception_visitors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reception_visitors ENABLE ROW LEVEL SECURITY;

--
-- Name: scholarship_applications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scholarship_applications ENABLE ROW LEVEL SECURITY;

--
-- Name: scholarships_master; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scholarships_master ENABLE ROW LEVEL SECURITY;

--
-- Name: sections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

--
-- Name: sports_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sports_events ENABLE ROW LEVEL SECURITY;

--
-- Name: sports_teams; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sports_teams ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_leave_applications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff_leave_applications ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_leave_balances; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff_leave_balances ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_payroll_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff_payroll_items ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_payroll_runs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff_payroll_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_service_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff_service_records ENABLE ROW LEVEL SECURITY;

--
-- Name: store_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: store_products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;

--
-- Name: student_achievements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.student_achievements ENABLE ROW LEVEL SECURITY;

--
-- Name: student_attendance; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;

--
-- Name: student_attendance_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.student_attendance_records ENABLE ROW LEVEL SECURITY;

--
-- Name: student_fees; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.student_fees ENABLE ROW LEVEL SECURITY;

--
-- Name: student_goals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.student_goals ENABLE ROW LEVEL SECURITY;

--
-- Name: student_learning_progress; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.student_learning_progress ENABLE ROW LEVEL SECURITY;

--
-- Name: student_leave_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.student_leave_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: student_lifecycle_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.student_lifecycle_events ENABLE ROW LEVEL SECURITY;

--
-- Name: student_mood_checkins; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.student_mood_checkins ENABLE ROW LEVEL SECURITY;

--
-- Name: student_promotions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.student_promotions ENABLE ROW LEVEL SECURITY;

--
-- Name: student_transport_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.student_transport_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: students; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

--
-- Name: super_admin_audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.super_admin_audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: super_admin_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.super_admin_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: super_admin_releases; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.super_admin_releases ENABLE ROW LEVEL SECURITY;

--
-- Name: teacher_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.teacher_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: timetables; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.timetables ENABLE ROW LEVEL SECURITY;

--
-- Name: transport_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transport_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: transport_stops; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transport_stops ENABLE ROW LEVEL SECURITY;

--
-- Name: transport_vehicles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transport_vehicles ENABLE ROW LEVEL SECURITY;

--
-- Name: vehicle_maintenance; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vehicle_maintenance ENABLE ROW LEVEL SECURITY;

--
-- Name: wellness_alerts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wellness_alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: wellness_checkins; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wellness_checkins ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--
