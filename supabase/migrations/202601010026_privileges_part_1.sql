-- Table and function privileges, part 1 of 4
-- Generated from the verified schema. Run as is; do not edit. Safe to run once on an EMPTY database.
SET check_function_bodies = false;
SET search_path = public, extensions;

-- Reset every grant in the public schema first, then apply the exact final privileges below.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated, service_role;

SET check_function_bodies = false;

--
-- Name: TABLE certificates; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.certificates TO anon;
GRANT SELECT ON TABLE public.certificates TO authenticated;
GRANT ALL ON TABLE public.certificates TO service_role;

--
-- Name: TABLE students; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.students TO authenticated;
GRANT ALL ON TABLE public.students TO service_role;

--
-- Name: FUNCTION _cert_make(p_student public.students, p_type text, p_purpose text, p_details text, p_status text, p_by uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public._cert_make(p_student public.students, p_type text, p_purpose text, p_details text, p_status text, p_by uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public._cert_make(p_student public.students, p_type text, p_purpose text, p_details text, p_status text, p_by uuid) TO service_role;

--
-- Name: FUNCTION _fee_payment_reverse(p_payment uuid, p_reason text, p_actor uuid, p_amount numeric); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public._fee_payment_reverse(p_payment uuid, p_reason text, p_actor uuid, p_amount numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION public._fee_payment_reverse(p_payment uuid, p_reason text, p_actor uuid, p_amount numeric) TO service_role;

--
-- Name: FUNCTION _fee_reminders_core(p_days_ahead integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public._fee_reminders_core(p_days_ahead integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public._fee_reminders_core(p_days_ahead integer) TO service_role;

--
-- Name: FUNCTION _inventory_check(p_qty integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public._inventory_check(p_qty integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public._inventory_check(p_qty integer) TO service_role;

--
-- Name: FUNCTION _inventory_urgency(p_stock integer, p_min integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public._inventory_urgency(p_stock integer, p_min integer) TO anon;
GRANT ALL ON FUNCTION public._inventory_urgency(p_stock integer, p_min integer) TO authenticated;
GRANT ALL ON FUNCTION public._inventory_urgency(p_stock integer, p_min integer) TO service_role;

--
-- Name: FUNCTION _notify_check(p_title text, p_message text, p_type text, p_priority text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public._notify_check(p_title text, p_message text, p_type text, p_priority text) FROM PUBLIC;
GRANT ALL ON FUNCTION public._notify_check(p_title text, p_message text, p_type text, p_priority text) TO service_role;

--
-- Name: FUNCTION _parent_has_child_in(p_class text, p_department text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public._parent_has_child_in(p_class text, p_department text) FROM PUBLIC;
GRANT ALL ON FUNCTION public._parent_has_child_in(p_class text, p_department text) TO authenticated;
GRANT ALL ON FUNCTION public._parent_has_child_in(p_class text, p_department text) TO service_role;

--
-- Name: FUNCTION _student_dues(p_user uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public._student_dues(p_user uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public._student_dues(p_user uuid) TO service_role;

--
-- Name: FUNCTION acknowledge_password_change(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.acknowledge_password_change() FROM PUBLIC;
GRANT ALL ON FUNCTION public.acknowledge_password_change() TO authenticated;
GRANT ALL ON FUNCTION public.acknowledge_password_change() TO service_role;

--
-- Name: FUNCTION admission_apply_merit(p_course text, p_academic_year text, p_quota text, p_actor uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admission_apply_merit(p_course text, p_academic_year text, p_quota text, p_actor uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admission_apply_merit(p_course text, p_academic_year text, p_quota text, p_actor uuid) TO service_role;

--
-- Name: FUNCTION admission_enroll(p_application_id uuid, p_actor uuid, p_department text, p_class_name text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admission_enroll(p_application_id uuid, p_actor uuid, p_department text, p_class_name text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admission_enroll(p_application_id uuid, p_actor uuid, p_department text, p_class_name text) TO service_role;

--
-- Name: FUNCTION admission_publish_merit(p_course text, p_academic_year text, p_seats integer, p_weight_qualifying integer, p_quota text, p_actor uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admission_publish_merit(p_course text, p_academic_year text, p_seats integer, p_weight_qualifying integer, p_quota text, p_actor uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admission_publish_merit(p_course text, p_academic_year text, p_seats integer, p_weight_qualifying integer, p_quota text, p_actor uuid) TO service_role;

--
-- Name: FUNCTION admission_record_test_result(p_test_id uuid, p_status text, p_score numeric, p_max_score numeric, p_actor uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admission_record_test_result(p_test_id uuid, p_status text, p_score numeric, p_max_score numeric, p_actor uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admission_record_test_result(p_test_id uuid, p_status text, p_score numeric, p_max_score numeric, p_actor uuid) TO service_role;

--
-- Name: FUNCTION admission_schedule_tests(p_application_ids uuid[], p_test_date date, p_actor uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admission_schedule_tests(p_application_ids uuid[], p_test_date date, p_actor uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admission_schedule_tests(p_application_ids uuid[], p_test_date date, p_actor uuid) TO service_role;

--
-- Name: FUNCTION admission_set_status(p_application_id uuid, p_new_status text, p_remarks text, p_actor uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admission_set_status(p_application_id uuid, p_new_status text, p_remarks text, p_actor uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admission_set_status(p_application_id uuid, p_new_status text, p_remarks text, p_actor uuid) TO service_role;

--
-- Name: FUNCTION admission_validate_fields(p_course text, p_values jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admission_validate_fields(p_course text, p_values jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admission_validate_fields(p_course text, p_values jsonb) TO service_role;

--
-- Name: FUNCTION announcement_publish(p_title text, p_message text, p_category text, p_priority text, p_audience text, p_class text, p_department text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.announcement_publish(p_title text, p_message text, p_category text, p_priority text, p_audience text, p_class text, p_department text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.announcement_publish(p_title text, p_message text, p_category text, p_priority text, p_audience text, p_class text, p_department text) TO authenticated;
GRANT ALL ON FUNCTION public.announcement_publish(p_title text, p_message text, p_category text, p_priority text, p_audience text, p_class text, p_department text) TO service_role;

--
-- Name: FUNCTION app_setting_versions_immutable(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.app_setting_versions_immutable() TO anon;
GRANT ALL ON FUNCTION public.app_setting_versions_immutable() TO authenticated;
GRANT ALL ON FUNCTION public.app_setting_versions_immutable() TO service_role;

--
-- Name: FUNCTION app_settings_draft_merge(p_key text, p_patch jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.app_settings_draft_merge(p_key text, p_patch jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.app_settings_draft_merge(p_key text, p_patch jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.app_settings_draft_merge(p_key text, p_patch jsonb) TO service_role;

--
-- Name: FUNCTION app_settings_draft_save(p_key text, p_value jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.app_settings_draft_save(p_key text, p_value jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.app_settings_draft_save(p_key text, p_value jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.app_settings_draft_save(p_key text, p_value jsonb) TO service_role;

--
-- Name: FUNCTION app_settings_publish(p_key text, p_value jsonb, p_summary text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.app_settings_publish(p_key text, p_value jsonb, p_summary text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.app_settings_publish(p_key text, p_value jsonb, p_summary text) TO authenticated;
GRANT ALL ON FUNCTION public.app_settings_publish(p_key text, p_value jsonb, p_summary text) TO service_role;

--
-- Name: FUNCTION app_settings_require_admin(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.app_settings_require_admin() FROM PUBLIC;
GRANT ALL ON FUNCTION public.app_settings_require_admin() TO authenticated;
GRANT ALL ON FUNCTION public.app_settings_require_admin() TO service_role;

--
-- Name: FUNCTION app_settings_rollback(p_key text, p_version integer, p_reason text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.app_settings_rollback(p_key text, p_version integer, p_reason text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.app_settings_rollback(p_key text, p_version integer, p_reason text) TO authenticated;
GRANT ALL ON FUNCTION public.app_settings_rollback(p_key text, p_version integer, p_reason text) TO service_role;

--
-- Name: FUNCTION assignment_grade(p_submission uuid, p_score numeric, p_feedback text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.assignment_grade(p_submission uuid, p_score numeric, p_feedback text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.assignment_grade(p_submission uuid, p_score numeric, p_feedback text) TO authenticated;
GRANT ALL ON FUNCTION public.assignment_grade(p_submission uuid, p_score numeric, p_feedback text) TO service_role;

--
-- Name: FUNCTION assignment_submission_guard(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.assignment_submission_guard() TO anon;
GRANT ALL ON FUNCTION public.assignment_submission_guard() TO authenticated;
GRANT ALL ON FUNCTION public.assignment_submission_guard() TO service_role;

--
-- Name: FUNCTION audit_log_search(p_query text, p_entity text, p_from date, p_to date, p_limit integer, p_offset integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.audit_log_search(p_query text, p_entity text, p_from date, p_to date, p_limit integer, p_offset integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.audit_log_search(p_query text, p_entity text, p_from date, p_to date, p_limit integer, p_offset integer) TO authenticated;
GRANT ALL ON FUNCTION public.audit_log_search(p_query text, p_entity text, p_from date, p_to date, p_limit integer, p_offset integer) TO service_role;

--
-- Name: FUNCTION bind_audit_log_actor(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.bind_audit_log_actor() FROM PUBLIC;
GRANT ALL ON FUNCTION public.bind_audit_log_actor() TO service_role;

--
-- Name: FUNCTION bind_super_admin_audit_log_actor(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.bind_super_admin_audit_log_actor() FROM PUBLIC;
GRANT ALL ON FUNCTION public.bind_super_admin_audit_log_actor() TO service_role;

--
-- Name: FUNCTION certificate_decide(p_id uuid, p_decision text, p_note text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.certificate_decide(p_id uuid, p_decision text, p_note text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.certificate_decide(p_id uuid, p_decision text, p_note text) TO authenticated;
GRANT ALL ON FUNCTION public.certificate_decide(p_id uuid, p_decision text, p_note text) TO service_role;

--
-- Name: FUNCTION certificate_issue(p_student_ref text, p_type text, p_purpose text, p_details text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.certificate_issue(p_student_ref text, p_type text, p_purpose text, p_details text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.certificate_issue(p_student_ref text, p_type text, p_purpose text, p_details text) TO authenticated;
GRANT ALL ON FUNCTION public.certificate_issue(p_student_ref text, p_type text, p_purpose text, p_details text) TO service_role;

--
-- Name: FUNCTION certificate_request(p_type text, p_purpose text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.certificate_request(p_type text, p_purpose text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.certificate_request(p_type text, p_purpose text) TO authenticated;
GRANT ALL ON FUNCTION public.certificate_request(p_type text, p_purpose text) TO service_role;

--
-- Name: FUNCTION certificate_verify(p_number text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.certificate_verify(p_number text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.certificate_verify(p_number text) TO authenticated;
GRANT ALL ON FUNCTION public.certificate_verify(p_number text) TO service_role;
GRANT ALL ON FUNCTION public.certificate_verify(p_number text) TO anon;

--
-- Name: FUNCTION check_rate_limit(p_key text, p_max integer, p_window_seconds integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.check_rate_limit(p_key text, p_max integer, p_window_seconds integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.check_rate_limit(p_key text, p_max integer, p_window_seconds integer) TO service_role;

--
-- Name: FUNCTION checkout_store_order(p_student_id uuid, p_items jsonb, p_total_amount numeric); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.checkout_store_order(p_student_id uuid, p_items jsonb, p_total_amount numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION public.checkout_store_order(p_student_id uuid, p_items jsonb, p_total_amount numeric) TO authenticated;
GRANT ALL ON FUNCTION public.checkout_store_order(p_student_id uuid, p_items jsonb, p_total_amount numeric) TO service_role;

--
-- Name: FUNCTION decrement_book_copies(book_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.decrement_book_copies(book_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.decrement_book_copies(book_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.decrement_book_copies(book_id uuid) TO service_role;

--
-- Name: FUNCTION discipline_update(p_id uuid, p_status text, p_action text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.discipline_update(p_id uuid, p_status text, p_action text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.discipline_update(p_id uuid, p_status text, p_action text) TO authenticated;
GRANT ALL ON FUNCTION public.discipline_update(p_id uuid, p_status text, p_action text) TO service_role;

--
-- Name: FUNCTION enforce_immutable_student_id(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.enforce_immutable_student_id() TO anon;
GRANT ALL ON FUNCTION public.enforce_immutable_student_id() TO authenticated;
GRANT ALL ON FUNCTION public.enforce_immutable_student_id() TO service_role;

--
-- Name: FUNCTION exam_analytics(p_exam_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.exam_analytics(p_exam_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.exam_analytics(p_exam_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.exam_analytics(p_exam_id uuid) TO service_role;

--
-- Name: FUNCTION exam_assign_invigilator(p_exam uuid, p_date date, p_start text, p_room uuid, p_teacher uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.exam_assign_invigilator(p_exam uuid, p_date date, p_start text, p_room uuid, p_teacher uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.exam_assign_invigilator(p_exam uuid, p_date date, p_start text, p_room uuid, p_teacher uuid) TO authenticated;
GRANT ALL ON FUNCTION public.exam_assign_invigilator(p_exam uuid, p_date date, p_start text, p_room uuid, p_teacher uuid) TO service_role;

--
-- Name: FUNCTION exam_generate_hall_tickets(p_exam_id uuid, p_class_name text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.exam_generate_hall_tickets(p_exam_id uuid, p_class_name text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.exam_generate_hall_tickets(p_exam_id uuid, p_class_name text) TO authenticated;
GRANT ALL ON FUNCTION public.exam_generate_hall_tickets(p_exam_id uuid, p_class_name text) TO service_role;

--
-- Name: FUNCTION exam_generate_seating(p_exam uuid, p_date date, p_start text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.exam_generate_seating(p_exam uuid, p_date date, p_start text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.exam_generate_seating(p_exam uuid, p_date date, p_start text) TO authenticated;
GRANT ALL ON FUNCTION public.exam_generate_seating(p_exam uuid, p_date date, p_start text) TO service_role;

--
-- Name: FUNCTION exam_gpa_report(p_exam uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.exam_gpa_report(p_exam uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.exam_gpa_report(p_exam uuid) TO authenticated;
GRANT ALL ON FUNCTION public.exam_gpa_report(p_exam uuid) TO service_role;

--
-- Name: FUNCTION exam_grade(p_pct numeric, p_pass boolean); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.exam_grade(p_pct numeric, p_pass boolean) TO anon;
GRANT ALL ON FUNCTION public.exam_grade(p_pct numeric, p_pass boolean) TO authenticated;
GRANT ALL ON FUNCTION public.exam_grade(p_pct numeric, p_pass boolean) TO service_role;

--
-- Name: FUNCTION exam_list_teachers(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.exam_list_teachers() FROM PUBLIC;
GRANT ALL ON FUNCTION public.exam_list_teachers() TO authenticated;
GRANT ALL ON FUNCTION public.exam_list_teachers() TO service_role;

--
-- Name: FUNCTION exam_my_valuations(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.exam_my_valuations() FROM PUBLIC;
GRANT ALL ON FUNCTION public.exam_my_valuations() TO authenticated;
GRANT ALL ON FUNCTION public.exam_my_valuations() TO service_role;

--
-- Name: FUNCTION exam_publish_results(p_exam_id uuid, p_publish boolean, p_reason text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.exam_publish_results(p_exam_id uuid, p_publish boolean, p_reason text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.exam_publish_results(p_exam_id uuid, p_publish boolean, p_reason text) TO authenticated;
GRANT ALL ON FUNCTION public.exam_publish_results(p_exam_id uuid, p_publish boolean, p_reason text) TO service_role;

--
-- Name: FUNCTION exam_register(p_exam uuid, p_withdraw boolean); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.exam_register(p_exam uuid, p_withdraw boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.exam_register(p_exam uuid, p_withdraw boolean) TO authenticated;
GRANT ALL ON FUNCTION public.exam_register(p_exam uuid, p_withdraw boolean) TO service_role;

--
-- Name: FUNCTION exam_register_class(p_exam uuid, p_class text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.exam_register_class(p_exam uuid, p_class text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.exam_register_class(p_exam uuid, p_class text) TO authenticated;
GRANT ALL ON FUNCTION public.exam_register_class(p_exam uuid, p_class text) TO service_role;

--
-- Name: FUNCTION exam_registration_set(p_exam uuid, p_required boolean, p_open boolean, p_deadline date); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.exam_registration_set(p_exam uuid, p_required boolean, p_open boolean, p_deadline date) FROM PUBLIC;
GRANT ALL ON FUNCTION public.exam_registration_set(p_exam uuid, p_required boolean, p_open boolean, p_deadline date) TO authenticated;
GRANT ALL ON FUNCTION public.exam_registration_set(p_exam uuid, p_required boolean, p_open boolean, p_deadline date) TO service_role;

--
-- Name: FUNCTION exam_release_hall_ticket(p_ticket_id uuid, p_reason text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.exam_release_hall_ticket(p_ticket_id uuid, p_reason text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.exam_release_hall_ticket(p_ticket_id uuid, p_reason text) TO authenticated;
GRANT ALL ON FUNCTION public.exam_release_hall_ticket(p_ticket_id uuid, p_reason text) TO service_role;

--
-- Name: FUNCTION exam_remove_invigilator(p_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.exam_remove_invigilator(p_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.exam_remove_invigilator(p_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.exam_remove_invigilator(p_id uuid) TO service_role;

--
-- Name: FUNCTION exam_revaluation_assign(p_id uuid, p_teacher uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.exam_revaluation_assign(p_id uuid, p_teacher uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.exam_revaluation_assign(p_id uuid, p_teacher uuid) TO authenticated;
GRANT ALL ON FUNCTION public.exam_revaluation_assign(p_id uuid, p_teacher uuid) TO service_role;

--
-- Name: FUNCTION exam_revaluation_decide(p_id uuid, p_decision text, p_new_marks numeric, p_note text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.exam_revaluation_decide(p_id uuid, p_decision text, p_new_marks numeric, p_note text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.exam_revaluation_decide(p_id uuid, p_decision text, p_new_marks numeric, p_note text) TO authenticated;
GRANT ALL ON FUNCTION public.exam_revaluation_decide(p_id uuid, p_decision text, p_new_marks numeric, p_note text) TO service_role;

--
-- Name: FUNCTION exam_revaluation_request(p_exam uuid, p_subject text, p_reason text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.exam_revaluation_request(p_exam uuid, p_subject text, p_reason text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.exam_revaluation_request(p_exam uuid, p_subject text, p_reason text) TO authenticated;
GRANT ALL ON FUNCTION public.exam_revaluation_request(p_exam uuid, p_subject text, p_reason text) TO service_role;

--
-- Name: FUNCTION exam_revaluation_set(p_exam uuid, p_open boolean, p_deadline date, p_fee numeric); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.exam_revaluation_set(p_exam uuid, p_open boolean, p_deadline date, p_fee numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION public.exam_revaluation_set(p_exam uuid, p_open boolean, p_deadline date, p_fee numeric) TO authenticated;
GRANT ALL ON FUNCTION public.exam_revaluation_set(p_exam uuid, p_open boolean, p_deadline date, p_fee numeric) TO service_role;

--
-- Name: FUNCTION exam_revaluation_value(p_id uuid, p_marks numeric, p_note text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.exam_revaluation_value(p_id uuid, p_marks numeric, p_note text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.exam_revaluation_value(p_id uuid, p_marks numeric, p_note text) TO authenticated;
GRANT ALL ON FUNCTION public.exam_revaluation_value(p_id uuid, p_marks numeric, p_note text) TO service_role;

--
-- Name: FUNCTION exam_room_save(p_id uuid, p_name text, p_block text, p_capacity integer, p_active boolean); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.exam_room_save(p_id uuid, p_name text, p_block text, p_capacity integer, p_active boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.exam_room_save(p_id uuid, p_name text, p_block text, p_capacity integer, p_active boolean) TO authenticated;
GRANT ALL ON FUNCTION public.exam_room_save(p_id uuid, p_name text, p_block text, p_capacity integer, p_active boolean) TO service_role;

--
-- Name: FUNCTION exam_save_marks(p_exam_id uuid, p_rows jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.exam_save_marks(p_exam_id uuid, p_rows jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.exam_save_marks(p_exam_id uuid, p_rows jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.exam_save_marks(p_exam_id uuid, p_rows jsonb) TO service_role;

--
-- Name: FUNCTION exam_seating_photo(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.exam_seating_photo() TO anon;
GRANT ALL ON FUNCTION public.exam_seating_photo() TO authenticated;
GRANT ALL ON FUNCTION public.exam_seating_photo() TO service_role;

--
-- Name: FUNCTION exam_set_hall_tickets_visible(p_exam_id uuid, p_visible boolean); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.exam_set_hall_tickets_visible(p_exam_id uuid, p_visible boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.exam_set_hall_tickets_visible(p_exam_id uuid, p_visible boolean) TO authenticated;
GRANT ALL ON FUNCTION public.exam_set_hall_tickets_visible(p_exam_id uuid, p_visible boolean) TO service_role;

--
-- Name: FUNCTION exam_supplementary_create(p_parent uuid, p_name text, p_start date, p_end date); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.exam_supplementary_create(p_parent uuid, p_name text, p_start date, p_end date) FROM PUBLIC;
GRANT ALL ON FUNCTION public.exam_supplementary_create(p_parent uuid, p_name text, p_start date, p_end date) TO authenticated;
GRANT ALL ON FUNCTION public.exam_supplementary_create(p_parent uuid, p_name text, p_start date, p_end date) TO service_role;

--
-- Name: FUNCTION exam_supplementary_papers(p_exam uuid, p_first_date date, p_start text, p_end text, p_room text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.exam_supplementary_papers(p_exam uuid, p_first_date date, p_start text, p_end text, p_room text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.exam_supplementary_papers(p_exam uuid, p_first_date date, p_start text, p_end text, p_room text) TO authenticated;
GRANT ALL ON FUNCTION public.exam_supplementary_papers(p_exam uuid, p_first_date date, p_start text, p_end text, p_room text) TO service_role;

--
-- Name: FUNCTION exam_verify_hall_ticket(p_token text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.exam_verify_hall_ticket(p_token text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.exam_verify_hall_ticket(p_token text) TO authenticated;
GRANT ALL ON FUNCTION public.exam_verify_hall_ticket(p_token text) TO service_role;

--
-- Name: FUNCTION export_dataset(p_name text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.export_dataset(p_name text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.export_dataset(p_name text) TO authenticated;
GRANT ALL ON FUNCTION public.export_dataset(p_name text) TO service_role;

--
-- Name: FUNCTION fee_adjust(p_student_fee_id uuid, p_kind text, p_amount numeric, p_reason text, p_actor uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.fee_adjust(p_student_fee_id uuid, p_kind text, p_amount numeric, p_reason text, p_actor uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.fee_adjust(p_student_fee_id uuid, p_kind text, p_amount numeric, p_reason text, p_actor uuid) TO service_role;

--
-- Name: FUNCTION fee_cancel_run(p_run_id uuid, p_reason text, p_actor uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.fee_cancel_run(p_run_id uuid, p_reason text, p_actor uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.fee_cancel_run(p_run_id uuid, p_reason text, p_actor uuid) TO service_role;

--
-- Name: FUNCTION fee_generate(p_execute boolean, p_plan_id uuid, p_head_id uuid, p_amount numeric, p_description text, p_scope_type text, p_scope_value text, p_quota text, p_semester integer, p_academic_year text, p_due_date date, p_include_yearly boolean, p_include_one_time boolean, p_actor uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.fee_generate(p_execute boolean, p_plan_id uuid, p_head_id uuid, p_amount numeric, p_description text, p_scope_type text, p_scope_value text, p_quota text, p_semester integer, p_academic_year text, p_due_date date, p_include_yearly boolean, p_include_one_time boolean, p_actor uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.fee_generate(p_execute boolean, p_plan_id uuid, p_head_id uuid, p_amount numeric, p_description text, p_scope_type text, p_scope_value text, p_quota text, p_semester integer, p_academic_year text, p_due_date date, p_include_yearly boolean, p_include_one_time boolean, p_actor uuid) TO service_role;

--
-- Name: FUNCTION fee_payment_reverse(p_payment uuid, p_reason text, p_amount numeric); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.fee_payment_reverse(p_payment uuid, p_reason text, p_amount numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION public.fee_payment_reverse(p_payment uuid, p_reason text, p_amount numeric) TO authenticated;
GRANT ALL ON FUNCTION public.fee_payment_reverse(p_payment uuid, p_reason text, p_amount numeric) TO service_role;

--
-- Name: FUNCTION fee_plan_clone(p_plan_id uuid, p_new_name text, p_new_year text, p_actor uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.fee_plan_clone(p_plan_id uuid, p_new_name text, p_new_year text, p_actor uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.fee_plan_clone(p_plan_id uuid, p_new_name text, p_new_year text, p_actor uuid) TO service_role;

--
-- Name: FUNCTION fee_plan_items_guard(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fee_plan_items_guard() TO anon;
GRANT ALL ON FUNCTION public.fee_plan_items_guard() TO authenticated;
GRANT ALL ON FUNCTION public.fee_plan_items_guard() TO service_role;

--
-- Name: FUNCTION fee_plans_guard(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fee_plans_guard() TO anon;
GRANT ALL ON FUNCTION public.fee_plans_guard() TO authenticated;
GRANT ALL ON FUNCTION public.fee_plans_guard() TO service_role;

--
-- Name: FUNCTION fee_reminders_auto(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.fee_reminders_auto() FROM PUBLIC;
GRANT ALL ON FUNCTION public.fee_reminders_auto() TO service_role;

--
-- Name: FUNCTION fee_send_reminders(p_days_ahead integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.fee_send_reminders(p_days_ahead integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.fee_send_reminders(p_days_ahead integer) TO authenticated;
GRANT ALL ON FUNCTION public.fee_send_reminders(p_days_ahead integer) TO service_role;

--
-- Name: FUNCTION generate_student_id(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.generate_student_id() FROM PUBLIC;
GRANT ALL ON FUNCTION public.generate_student_id() TO service_role;

--
-- PostgreSQL database dump complete
--
