-- Table and function privileges, part 2 of 4
-- Generated from the verified schema. Run as is; do not edit. Safe to run once on an EMPTY database.
SET check_function_bodies = false;
SET search_path = public, extensions;

SET check_function_bodies = false;

--
-- Name: FUNCTION get_academic_year_for_date(p_date date); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.get_academic_year_for_date(p_date date) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_academic_year_for_date(p_date date) TO authenticated;
GRANT ALL ON FUNCTION public.get_academic_year_for_date(p_date date) TO service_role;

--
-- Name: FUNCTION get_current_user_role(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.get_current_user_role() FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_current_user_role() TO authenticated;
GRANT ALL ON FUNCTION public.get_current_user_role() TO service_role;

--
-- Name: FUNCTION get_first_login_status(p_identifier text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.get_first_login_status(p_identifier text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_first_login_status(p_identifier text) TO anon;
GRANT ALL ON FUNCTION public.get_first_login_status(p_identifier text) TO authenticated;
GRANT ALL ON FUNCTION public.get_first_login_status(p_identifier text) TO service_role;

--
-- Name: FUNCTION global_search(p_query text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.global_search(p_query text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.global_search(p_query text) TO authenticated;
GRANT ALL ON FUNCTION public.global_search(p_query text) TO service_role;

--
-- Name: FUNCTION grade_point_for(p_pct numeric, p_pass boolean); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.grade_point_for(p_pct numeric, p_pass boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.grade_point_for(p_pct numeric, p_pass boolean) TO authenticated;
GRANT ALL ON FUNCTION public.grade_point_for(p_pct numeric, p_pass boolean) TO service_role;

--
-- Name: FUNCTION grade_scale_save(p_bands jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.grade_scale_save(p_bands jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.grade_scale_save(p_bands jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.grade_scale_save(p_bands jsonb) TO service_role;

--
-- Name: FUNCTION hostel_allot(p_student uuid, p_room uuid, p_remarks text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.hostel_allot(p_student uuid, p_room uuid, p_remarks text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.hostel_allot(p_student uuid, p_room uuid, p_remarks text) TO authenticated;
GRANT ALL ON FUNCTION public.hostel_allot(p_student uuid, p_room uuid, p_remarks text) TO service_role;

--
-- Name: FUNCTION hostel_occupancy(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.hostel_occupancy() FROM PUBLIC;
GRANT ALL ON FUNCTION public.hostel_occupancy() TO authenticated;
GRANT ALL ON FUNCTION public.hostel_occupancy() TO service_role;

--
-- Name: FUNCTION hostel_outpass_guard(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.hostel_outpass_guard() TO anon;
GRANT ALL ON FUNCTION public.hostel_outpass_guard() TO authenticated;
GRANT ALL ON FUNCTION public.hostel_outpass_guard() TO service_role;

--
-- Name: FUNCTION hostel_room_save(p_id uuid, p_block text, p_floor integer, p_room text, p_capacity integer, p_type text, p_fee numeric, p_status text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.hostel_room_save(p_id uuid, p_block text, p_floor integer, p_room text, p_capacity integer, p_type text, p_fee numeric, p_status text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.hostel_room_save(p_id uuid, p_block text, p_floor integer, p_room text, p_capacity integer, p_type text, p_fee numeric, p_status text) TO authenticated;
GRANT ALL ON FUNCTION public.hostel_room_save(p_id uuid, p_block text, p_floor integer, p_room text, p_capacity integer, p_type text, p_fee numeric, p_status text) TO service_role;

--
-- Name: FUNCTION hostel_transfer(p_student uuid, p_room uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.hostel_transfer(p_student uuid, p_room uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.hostel_transfer(p_student uuid, p_room uuid) TO authenticated;
GRANT ALL ON FUNCTION public.hostel_transfer(p_student uuid, p_room uuid) TO service_role;

--
-- Name: FUNCTION hostel_vacate(p_allotment uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.hostel_vacate(p_allotment uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.hostel_vacate(p_allotment uuid) TO authenticated;
GRANT ALL ON FUNCTION public.hostel_vacate(p_allotment uuid) TO service_role;

--
-- Name: FUNCTION integration_overview(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.integration_overview() FROM PUBLIC;
GRANT ALL ON FUNCTION public.integration_overview() TO authenticated;
GRANT ALL ON FUNCTION public.integration_overview() TO service_role;

--
-- Name: FUNCTION inventory_cancel_order(p_order uuid, p_reason text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.inventory_cancel_order(p_order uuid, p_reason text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.inventory_cancel_order(p_order uuid, p_reason text) TO authenticated;
GRANT ALL ON FUNCTION public.inventory_cancel_order(p_order uuid, p_reason text) TO service_role;

--
-- Name: FUNCTION inventory_issue(p_item_name text, p_qty integer, p_recipient text, p_department text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.inventory_issue(p_item_name text, p_qty integer, p_recipient text, p_department text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.inventory_issue(p_item_name text, p_qty integer, p_recipient text, p_department text) TO authenticated;
GRANT ALL ON FUNCTION public.inventory_issue(p_item_name text, p_qty integer, p_recipient text, p_department text) TO service_role;

--
-- Name: FUNCTION inventory_order(p_item_name text, p_qty integer, p_supplier text, p_department text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.inventory_order(p_item_name text, p_qty integer, p_supplier text, p_department text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.inventory_order(p_item_name text, p_qty integer, p_supplier text, p_department text) TO authenticated;
GRANT ALL ON FUNCTION public.inventory_order(p_item_name text, p_qty integer, p_supplier text, p_department text) TO service_role;

--
-- Name: FUNCTION inventory_receive(p_order uuid, p_qty integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.inventory_receive(p_order uuid, p_qty integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.inventory_receive(p_order uuid, p_qty integer) TO authenticated;
GRANT ALL ON FUNCTION public.inventory_receive(p_order uuid, p_qty integer) TO service_role;

--
-- Name: FUNCTION inventory_return(p_item_name text, p_qty integer, p_recipient text, p_reason text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.inventory_return(p_item_name text, p_qty integer, p_recipient text, p_reason text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.inventory_return(p_item_name text, p_qty integer, p_recipient text, p_reason text) TO authenticated;
GRANT ALL ON FUNCTION public.inventory_return(p_item_name text, p_qty integer, p_recipient text, p_reason text) TO service_role;

--
-- Name: FUNCTION is_my_vehicle(p_vehicle uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.is_my_vehicle(p_vehicle uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_my_vehicle(p_vehicle uuid) TO authenticated;
GRANT ALL ON FUNCTION public.is_my_vehicle(p_vehicle uuid) TO service_role;

--
-- Name: FUNCTION is_parent_of(p_student_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.is_parent_of(p_student_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_parent_of(p_student_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.is_parent_of(p_student_id uuid) TO service_role;

--
-- Name: FUNCTION is_teacher_assigned_to_class(p_teacher_id uuid, p_class_name text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.is_teacher_assigned_to_class(p_teacher_id uuid, p_class_name text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_teacher_assigned_to_class(p_teacher_id uuid, p_class_name text) TO authenticated;
GRANT ALL ON FUNCTION public.is_teacher_assigned_to_class(p_teacher_id uuid, p_class_name text) TO service_role;

--
-- Name: FUNCTION is_teacher_assigned_to_class_and_subject(p_teacher_id uuid, p_class_name text, p_subject_code text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.is_teacher_assigned_to_class_and_subject(p_teacher_id uuid, p_class_name text, p_subject_code text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_teacher_assigned_to_class_and_subject(p_teacher_id uuid, p_class_name text, p_subject_code text) TO authenticated;
GRANT ALL ON FUNCTION public.is_teacher_assigned_to_class_and_subject(p_teacher_id uuid, p_class_name text, p_subject_code text) TO service_role;

--
-- Name: FUNCTION issue_library_book(p_book_id uuid, p_student_id uuid, p_due_date date); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.issue_library_book(p_book_id uuid, p_student_id uuid, p_due_date date) FROM PUBLIC;
GRANT ALL ON FUNCTION public.issue_library_book(p_book_id uuid, p_student_id uuid, p_due_date date) TO authenticated;
GRANT ALL ON FUNCTION public.issue_library_book(p_book_id uuid, p_student_id uuid, p_due_date date) TO service_role;

--
-- Name: FUNCTION jsonb_merge_deep(a jsonb, b jsonb); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.jsonb_merge_deep(a jsonb, b jsonb) TO anon;
GRANT ALL ON FUNCTION public.jsonb_merge_deep(a jsonb, b jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.jsonb_merge_deep(a jsonb, b jsonb) TO service_role;

--
-- Name: FUNCTION naac_metrics_after(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.naac_metrics_after() TO anon;
GRANT ALL ON FUNCTION public.naac_metrics_after() TO authenticated;
GRANT ALL ON FUNCTION public.naac_metrics_after() TO service_role;

--
-- Name: FUNCTION naac_recompute_progress(p_criterion integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.naac_recompute_progress(p_criterion integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.naac_recompute_progress(p_criterion integer) TO service_role;

--
-- Name: FUNCTION notification_channel_status(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.notification_channel_status() FROM PUBLIC;
GRANT ALL ON FUNCTION public.notification_channel_status() TO authenticated;
GRANT ALL ON FUNCTION public.notification_channel_status() TO service_role;

--
-- Name: FUNCTION notification_settings_set(p_email boolean, p_sms boolean, p_auto_reminders boolean, p_reminder_days integer, p_whatsapp boolean); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.notification_settings_set(p_email boolean, p_sms boolean, p_auto_reminders boolean, p_reminder_days integer, p_whatsapp boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.notification_settings_set(p_email boolean, p_sms boolean, p_auto_reminders boolean, p_reminder_days integer, p_whatsapp boolean) TO authenticated;
GRANT ALL ON FUNCTION public.notification_settings_set(p_email boolean, p_sms boolean, p_auto_reminders boolean, p_reminder_days integer, p_whatsapp boolean) TO service_role;

--
-- Name: FUNCTION notifications_enqueue(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.notifications_enqueue() FROM PUBLIC;
GRANT ALL ON FUNCTION public.notifications_enqueue() TO service_role;

--
-- Name: FUNCTION notify_certificate_status(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.notify_certificate_status() FROM PUBLIC;
GRANT ALL ON FUNCTION public.notify_certificate_status() TO authenticated;
GRANT ALL ON FUNCTION public.notify_certificate_status() TO service_role;

--
-- Name: FUNCTION notify_fee_payment(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.notify_fee_payment() FROM PUBLIC;
GRANT ALL ON FUNCTION public.notify_fee_payment() TO authenticated;
GRANT ALL ON FUNCTION public.notify_fee_payment() TO service_role;

--
-- Name: FUNCTION notify_new_admission(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.notify_new_admission() FROM PUBLIC;
GRANT ALL ON FUNCTION public.notify_new_admission() TO authenticated;
GRANT ALL ON FUNCTION public.notify_new_admission() TO service_role;

--
-- Name: FUNCTION notify_new_assignment(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.notify_new_assignment() FROM PUBLIC;
GRANT ALL ON FUNCTION public.notify_new_assignment() TO authenticated;
GRANT ALL ON FUNCTION public.notify_new_assignment() TO service_role;

--
-- Name: FUNCTION notify_new_concern(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.notify_new_concern() FROM PUBLIC;
GRANT ALL ON FUNCTION public.notify_new_concern() TO authenticated;
GRANT ALL ON FUNCTION public.notify_new_concern() TO service_role;

--
-- Name: FUNCTION notify_roles(p_roles text[], p_title text, p_message text, p_type text, p_priority text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.notify_roles(p_roles text[], p_title text, p_message text, p_type text, p_priority text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.notify_roles(p_roles text[], p_title text, p_message text, p_type text, p_priority text) TO authenticated;
GRANT ALL ON FUNCTION public.notify_roles(p_roles text[], p_title text, p_message text, p_type text, p_priority text) TO service_role;

--
-- Name: FUNCTION notify_store_order(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.notify_store_order() FROM PUBLIC;
GRANT ALL ON FUNCTION public.notify_store_order() TO authenticated;
GRANT ALL ON FUNCTION public.notify_store_order() TO service_role;

--
-- Name: FUNCTION notify_users(p_user_ids uuid[], p_title text, p_message text, p_type text, p_priority text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.notify_users(p_user_ids uuid[], p_title text, p_message text, p_type text, p_priority text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.notify_users(p_user_ids uuid[], p_title text, p_message text, p_type text, p_priority text) TO authenticated;
GRANT ALL ON FUNCTION public.notify_users(p_user_ids uuid[], p_title text, p_message text, p_type text, p_priority text) TO service_role;

--
-- Name: TABLE notification_outbox; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.notification_outbox TO service_role;
GRANT SELECT ON TABLE public.notification_outbox TO authenticated;

--
-- Name: FUNCTION outbox_claim(p_limit integer, p_channels text[]); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.outbox_claim(p_limit integer, p_channels text[]) FROM PUBLIC;
GRANT ALL ON FUNCTION public.outbox_claim(p_limit integer, p_channels text[]) TO service_role;

--
-- Name: FUNCTION outbox_complete(p_id uuid, p_ok boolean, p_error text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.outbox_complete(p_id uuid, p_ok boolean, p_error text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.outbox_complete(p_id uuid, p_ok boolean, p_error text) TO service_role;

--
-- Name: FUNCTION outbox_retry_failed(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.outbox_retry_failed() FROM PUBLIC;
GRANT ALL ON FUNCTION public.outbox_retry_failed() TO authenticated;
GRANT ALL ON FUNCTION public.outbox_retry_failed() TO service_role;

--
-- Name: FUNCTION payment_flags_set(p_online boolean, p_exam_fee_clearance boolean); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.payment_flags_set(p_online boolean, p_exam_fee_clearance boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.payment_flags_set(p_online boolean, p_exam_fee_clearance boolean) TO authenticated;
GRANT ALL ON FUNCTION public.payment_flags_set(p_online boolean, p_exam_fee_clearance boolean) TO service_role;

--
-- Name: FUNCTION payment_order_attach(p_order uuid, p_gateway_order_id text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.payment_order_attach(p_order uuid, p_gateway_order_id text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.payment_order_attach(p_order uuid, p_gateway_order_id text) TO service_role;

--
-- Name: FUNCTION payment_order_create(p_actor uuid, p_items jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.payment_order_create(p_actor uuid, p_items jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.payment_order_create(p_actor uuid, p_items jsonb) TO service_role;

--
-- Name: FUNCTION payment_order_create_store(p_actor uuid, p_store_order uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.payment_order_create_store(p_actor uuid, p_store_order uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.payment_order_create_store(p_actor uuid, p_store_order uuid) TO service_role;

--
-- Name: FUNCTION payment_order_fail(p_gateway_order_id text, p_reason text, p_event_id text, p_payload jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.payment_order_fail(p_gateway_order_id text, p_reason text, p_event_id text, p_payload jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.payment_order_fail(p_gateway_order_id text, p_reason text, p_event_id text, p_payload jsonb) TO service_role;

--
-- Name: FUNCTION payment_order_refund_apply(p_order uuid, p_reason text, p_actor uuid, p_gateway_refund_id text, p_items jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.payment_order_refund_apply(p_order uuid, p_reason text, p_actor uuid, p_gateway_refund_id text, p_items jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.payment_order_refund_apply(p_order uuid, p_reason text, p_actor uuid, p_gateway_refund_id text, p_items jsonb) TO service_role;

--
-- Name: FUNCTION payment_order_refund_check(p_order uuid, p_items jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.payment_order_refund_check(p_order uuid, p_items jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.payment_order_refund_check(p_order uuid, p_items jsonb) TO service_role;

--
-- Name: FUNCTION payment_order_settle(p_gateway_order_id text, p_gateway_payment_id text, p_amount_paise bigint, p_event_id text, p_event_type text, p_payload jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.payment_order_settle(p_gateway_order_id text, p_gateway_payment_id text, p_amount_paise bigint, p_event_id text, p_event_type text, p_payload jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.payment_order_settle(p_gateway_order_id text, p_gateway_payment_id text, p_amount_paise bigint, p_event_id text, p_event_type text, p_payload jsonb) TO service_role;

--
-- Name: FUNCTION payment_reconciliation(p_from date, p_to date); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.payment_reconciliation(p_from date, p_to date) FROM PUBLIC;
GRANT ALL ON FUNCTION public.payment_reconciliation(p_from date, p_to date) TO authenticated;
GRANT ALL ON FUNCTION public.payment_reconciliation(p_from date, p_to date) TO service_role;

--
-- Name: FUNCTION payment_settlement_import(p_rows jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.payment_settlement_import(p_rows jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.payment_settlement_import(p_rows jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.payment_settlement_import(p_rows jsonb) TO service_role;

--
-- Name: FUNCTION payroll_configure(p_epf_rate numeric, p_epf_ceiling numeric, p_esi_rate numeric, p_esi_limit numeric, p_pt numeric, p_lop_types text[]); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.payroll_configure(p_epf_rate numeric, p_epf_ceiling numeric, p_esi_rate numeric, p_esi_limit numeric, p_pt numeric, p_lop_types text[]) FROM PUBLIC;
GRANT ALL ON FUNCTION public.payroll_configure(p_epf_rate numeric, p_epf_ceiling numeric, p_esi_rate numeric, p_esi_limit numeric, p_pt numeric, p_lop_types text[]) TO authenticated;
GRANT ALL ON FUNCTION public.payroll_configure(p_epf_rate numeric, p_epf_ceiling numeric, p_esi_rate numeric, p_esi_limit numeric, p_pt numeric, p_lop_types text[]) TO service_role;

--
-- Name: FUNCTION payroll_run_approve(p_run uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.payroll_run_approve(p_run uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.payroll_run_approve(p_run uuid) TO authenticated;
GRANT ALL ON FUNCTION public.payroll_run_approve(p_run uuid) TO service_role;

--
-- Name: FUNCTION payroll_run_cancel(p_run uuid, p_reason text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.payroll_run_cancel(p_run uuid, p_reason text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.payroll_run_cancel(p_run uuid, p_reason text) TO authenticated;
GRANT ALL ON FUNCTION public.payroll_run_cancel(p_run uuid, p_reason text) TO service_role;

--
-- Name: FUNCTION payroll_run_create(p_month text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.payroll_run_create(p_month text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.payroll_run_create(p_month text) TO authenticated;
GRANT ALL ON FUNCTION public.payroll_run_create(p_month text) TO service_role;

--
-- Name: FUNCTION payroll_run_disburse(p_run uuid, p_reference text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.payroll_run_disburse(p_run uuid, p_reference text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.payroll_run_disburse(p_run uuid, p_reference text) TO authenticated;
GRANT ALL ON FUNCTION public.payroll_run_disburse(p_run uuid, p_reference text) TO service_role;

--
-- Name: FUNCTION place_store_order(p_user_id uuid, p_user_name text, p_items jsonb, p_total_amount numeric); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.place_store_order(p_user_id uuid, p_user_name text, p_items jsonb, p_total_amount numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION public.place_store_order(p_user_id uuid, p_user_name text, p_items jsonb, p_total_amount numeric) TO service_role;

--
-- Name: FUNCTION placement_app_guard(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.placement_app_guard() TO anon;
GRANT ALL ON FUNCTION public.placement_app_guard() TO authenticated;
GRANT ALL ON FUNCTION public.placement_app_guard() TO service_role;

--
-- Name: FUNCTION placement_apply(p_drive uuid, p_cgpa numeric); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.placement_apply(p_drive uuid, p_cgpa numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION public.placement_apply(p_drive uuid, p_cgpa numeric) TO authenticated;
GRANT ALL ON FUNCTION public.placement_apply(p_drive uuid, p_cgpa numeric) TO service_role;

--
-- Name: FUNCTION prevent_audit_log_modification(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.prevent_audit_log_modification() TO anon;
GRANT ALL ON FUNCTION public.prevent_audit_log_modification() TO authenticated;
GRANT ALL ON FUNCTION public.prevent_audit_log_modification() TO service_role;

--
-- Name: FUNCTION prevent_audit_log_truncate(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.prevent_audit_log_truncate() TO anon;
GRANT ALL ON FUNCTION public.prevent_audit_log_truncate() TO authenticated;
GRANT ALL ON FUNCTION public.prevent_audit_log_truncate() TO service_role;

--
-- Name: FUNCTION promotion_history(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.promotion_history() FROM PUBLIC;
GRANT ALL ON FUNCTION public.promotion_history() TO authenticated;
GRANT ALL ON FUNCTION public.promotion_history() TO service_role;

--
-- Name: FUNCTION promotion_preview(p_department text, p_class text, p_semester integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.promotion_preview(p_department text, p_class text, p_semester integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.promotion_preview(p_department text, p_class text, p_semester integer) TO authenticated;
GRANT ALL ON FUNCTION public.promotion_preview(p_department text, p_class text, p_semester integer) TO service_role;

--
-- Name: FUNCTION protect_attendance_record_immutable_columns(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.protect_attendance_record_immutable_columns() FROM PUBLIC;
GRANT ALL ON FUNCTION public.protect_attendance_record_immutable_columns() TO service_role;

--
-- Name: FUNCTION protect_attendance_session_immutable_columns(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.protect_attendance_session_immutable_columns() FROM PUBLIC;
GRANT ALL ON FUNCTION public.protect_attendance_session_immutable_columns() TO service_role;

--
-- Name: FUNCTION protect_profile_sensitive_columns(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.protect_profile_sensitive_columns() FROM PUBLIC;
GRANT ALL ON FUNCTION public.protect_profile_sensitive_columns() TO service_role;

--
-- Name: FUNCTION purge_auth_rate_limits(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.purge_auth_rate_limits() FROM PUBLIC;
GRANT ALL ON FUNCTION public.purge_auth_rate_limits() TO service_role;

--
-- Name: FUNCTION record_admission_deposit(p_application_id uuid, p_amount numeric, p_payment_mode text, p_reference text, p_idempotency_key text, p_actor uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.record_admission_deposit(p_application_id uuid, p_amount numeric, p_payment_mode text, p_reference text, p_idempotency_key text, p_actor uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.record_admission_deposit(p_application_id uuid, p_amount numeric, p_payment_mode text, p_reference text, p_idempotency_key text, p_actor uuid) TO service_role;

--
-- Name: FUNCTION record_fee_payment(p_student_fee_id uuid, p_amount numeric, p_payment_mode text, p_reference text, p_idempotency_key text, p_collected_by uuid, p_remarks text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.record_fee_payment(p_student_fee_id uuid, p_amount numeric, p_payment_mode text, p_reference text, p_idempotency_key text, p_collected_by uuid, p_remarks text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.record_fee_payment(p_student_fee_id uuid, p_amount numeric, p_payment_mode text, p_reference text, p_idempotency_key text, p_collected_by uuid, p_remarks text) TO service_role;

--
-- Name: FUNCTION renew_library_book(p_issue_id uuid, p_days integer, p_max_renewals integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.renew_library_book(p_issue_id uuid, p_days integer, p_max_renewals integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.renew_library_book(p_issue_id uuid, p_days integer, p_max_renewals integer) TO authenticated;
GRANT ALL ON FUNCTION public.renew_library_book(p_issue_id uuid, p_days integer, p_max_renewals integer) TO service_role;

--
-- Name: FUNCTION resolve_login_id(p_login_id text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.resolve_login_id(p_login_id text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.resolve_login_id(p_login_id text) TO anon;
GRANT ALL ON FUNCTION public.resolve_login_id(p_login_id text) TO authenticated;
GRANT ALL ON FUNCTION public.resolve_login_id(p_login_id text) TO service_role;

--
-- Name: FUNCTION return_library_book(p_issue_id uuid, p_fine_amount numeric); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.return_library_book(p_issue_id uuid, p_fine_amount numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION public.return_library_book(p_issue_id uuid, p_fine_amount numeric) TO authenticated;
GRANT ALL ON FUNCTION public.return_library_book(p_issue_id uuid, p_fine_amount numeric) TO service_role;

--
-- Name: FUNCTION rides_vehicle(p_vehicle uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.rides_vehicle(p_vehicle uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.rides_vehicle(p_vehicle uuid) TO authenticated;
GRANT ALL ON FUNCTION public.rides_vehicle(p_vehicle uuid) TO service_role;

--
-- Name: FUNCTION safe_cast_uuid(p_text text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.safe_cast_uuid(p_text text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.safe_cast_uuid(p_text text) TO authenticated;
GRANT ALL ON FUNCTION public.safe_cast_uuid(p_text text) TO service_role;

--
-- Name: FUNCTION scholarship_app_guard(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.scholarship_app_guard() TO anon;
GRANT ALL ON FUNCTION public.scholarship_app_guard() TO authenticated;
GRANT ALL ON FUNCTION public.scholarship_app_guard() TO service_role;

--
-- Name: FUNCTION scholarship_decide(p_id uuid, p_decision text, p_amount numeric, p_student_fee_id uuid, p_reason text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.scholarship_decide(p_id uuid, p_decision text, p_amount numeric, p_student_fee_id uuid, p_reason text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.scholarship_decide(p_id uuid, p_decision text, p_amount numeric, p_student_fee_id uuid, p_reason text) TO authenticated;
GRANT ALL ON FUNCTION public.scholarship_decide(p_id uuid, p_decision text, p_amount numeric, p_student_fee_id uuid, p_reason text) TO service_role;

--
-- PostgreSQL database dump complete
--
