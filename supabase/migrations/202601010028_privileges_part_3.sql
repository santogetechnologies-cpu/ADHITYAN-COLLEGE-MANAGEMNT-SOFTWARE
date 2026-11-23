-- Table and function privileges, part 3 of 4
-- Generated from the verified schema. Run as is; do not edit. Safe to run once on an EMPTY database.
SET check_function_bodies = false;
SET search_path = public, extensions;

SET check_function_bodies = false;

--
-- Name: FUNCTION search_students_by_id_or_name(search_term text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.search_students_by_id_or_name(search_term text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.search_students_by_id_or_name(search_term text) TO authenticated;
GRANT ALL ON FUNCTION public.search_students_by_id_or_name(search_term text) TO service_role;

--
-- Name: FUNCTION set_exam_result_student_name(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.set_exam_result_student_name() FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_exam_result_student_name() TO service_role;

--
-- Name: FUNCTION set_super_admin_configs_updated_at(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.set_super_admin_configs_updated_at() FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_super_admin_configs_updated_at() TO service_role;

--
-- Name: FUNCTION shortage_ack_guard(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.shortage_ack_guard() TO anon;
GRANT ALL ON FUNCTION public.shortage_ack_guard() TO authenticated;
GRANT ALL ON FUNCTION public.shortage_ack_guard() TO service_role;

--
-- Name: FUNCTION staff_leave_decide(p_id uuid, p_decision text, p_reason text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.staff_leave_decide(p_id uuid, p_decision text, p_reason text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.staff_leave_decide(p_id uuid, p_decision text, p_reason text) TO authenticated;
GRANT ALL ON FUNCTION public.staff_leave_decide(p_id uuid, p_decision text, p_reason text) TO service_role;

--
-- Name: FUNCTION store_order_set_status(p_order uuid, p_status text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.store_order_set_status(p_order uuid, p_status text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.store_order_set_status(p_order uuid, p_status text) TO authenticated;
GRANT ALL ON FUNCTION public.store_order_set_status(p_order uuid, p_status text) TO service_role;

--
-- Name: FUNCTION student_discontinue(p_student uuid, p_type text, p_reason text, p_effective date, p_force boolean); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.student_discontinue(p_student uuid, p_type text, p_reason text, p_effective date, p_force boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.student_discontinue(p_student uuid, p_type text, p_reason text, p_effective date, p_force boolean) TO authenticated;
GRANT ALL ON FUNCTION public.student_discontinue(p_student uuid, p_type text, p_reason text, p_effective date, p_force boolean) TO service_role;

--
-- Name: FUNCTION student_fees_fill_code(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.student_fees_fill_code() TO anon;
GRANT ALL ON FUNCTION public.student_fees_fill_code() TO authenticated;
GRANT ALL ON FUNCTION public.student_fees_fill_code() TO service_role;

--
-- Name: FUNCTION student_gpa(p_student uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.student_gpa(p_student uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.student_gpa(p_student uuid) TO authenticated;
GRANT ALL ON FUNCTION public.student_gpa(p_student uuid) TO service_role;

--
-- Name: FUNCTION student_leave_apply(p_type text, p_from date, p_to date, p_reason text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.student_leave_apply(p_type text, p_from date, p_to date, p_reason text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.student_leave_apply(p_type text, p_from date, p_to date, p_reason text) TO authenticated;
GRANT ALL ON FUNCTION public.student_leave_apply(p_type text, p_from date, p_to date, p_reason text) TO service_role;

--
-- Name: FUNCTION student_leave_cancel(p_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.student_leave_cancel(p_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.student_leave_cancel(p_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.student_leave_cancel(p_id uuid) TO service_role;

--
-- Name: FUNCTION student_leave_decide(p_id uuid, p_decision text, p_note text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.student_leave_decide(p_id uuid, p_decision text, p_note text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.student_leave_decide(p_id uuid, p_decision text, p_note text) TO authenticated;
GRANT ALL ON FUNCTION public.student_leave_decide(p_id uuid, p_decision text, p_note text) TO service_role;

--
-- Name: FUNCTION student_lifecycle_history(p_student uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.student_lifecycle_history(p_student uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.student_lifecycle_history(p_student uuid) TO authenticated;
GRANT ALL ON FUNCTION public.student_lifecycle_history(p_student uuid) TO service_role;

--
-- Name: FUNCTION student_reinstate(p_student uuid, p_reason text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.student_reinstate(p_student uuid, p_reason text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.student_reinstate(p_student uuid, p_reason text) TO authenticated;
GRANT ALL ON FUNCTION public.student_reinstate(p_student uuid, p_reason text) TO service_role;

--
-- Name: FUNCTION student_transfer(p_student uuid, p_department text, p_class text, p_reason text, p_semester integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.student_transfer(p_student uuid, p_department text, p_class text, p_reason text, p_semester integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.student_transfer(p_student uuid, p_department text, p_class text, p_reason text, p_semester integer) TO authenticated;
GRANT ALL ON FUNCTION public.student_transfer(p_student uuid, p_department text, p_class text, p_reason text, p_semester integer) TO service_role;

--
-- Name: FUNCTION students_promote(p_student_ids uuid[], p_action text, p_max_semester integer, p_academic_year text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.students_promote(p_student_ids uuid[], p_action text, p_max_semester integer, p_academic_year text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.students_promote(p_student_ids uuid[], p_action text, p_max_semester integer, p_academic_year text) TO authenticated;
GRANT ALL ON FUNCTION public.students_promote(p_student_ids uuid[], p_action text, p_max_semester integer, p_academic_year text) TO service_role;

--
-- Name: FUNCTION students_promotion_undo(p_batch uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.students_promotion_undo(p_batch uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.students_promotion_undo(p_batch uuid) TO authenticated;
GRANT ALL ON FUNCTION public.students_promotion_undo(p_batch uuid) TO service_role;

--
-- Name: FUNCTION sync_mood_student_id(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sync_mood_student_id() FROM PUBLIC;
GRANT ALL ON FUNCTION public.sync_mood_student_id() TO service_role;

--
-- Name: FUNCTION sync_staff_leave_balance_transition(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sync_staff_leave_balance_transition() FROM PUBLIC;
GRANT ALL ON FUNCTION public.sync_staff_leave_balance_transition() TO service_role;

--
-- Name: FUNCTION sync_student_profile(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sync_student_profile() FROM PUBLIC;
GRANT ALL ON FUNCTION public.sync_student_profile() TO service_role;

--
-- Name: FUNCTION sync_student_profile_after(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sync_student_profile_after() FROM PUBLIC;
GRANT ALL ON FUNCTION public.sync_student_profile_after() TO service_role;

--
-- Name: FUNCTION transport_assign(p_student uuid, p_vehicle uuid, p_stop text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.transport_assign(p_student uuid, p_vehicle uuid, p_stop text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.transport_assign(p_student uuid, p_vehicle uuid, p_stop text) TO authenticated;
GRANT ALL ON FUNCTION public.transport_assign(p_student uuid, p_vehicle uuid, p_stop text) TO service_role;

--
-- Name: FUNCTION transport_generate_day_logs(p_vehicle uuid, p_date date); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.transport_generate_day_logs(p_vehicle uuid, p_date date) FROM PUBLIC;
GRANT ALL ON FUNCTION public.transport_generate_day_logs(p_vehicle uuid, p_date date) TO authenticated;
GRANT ALL ON FUNCTION public.transport_generate_day_logs(p_vehicle uuid, p_date date) TO service_role;

--
-- Name: FUNCTION transport_overview(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.transport_overview() FROM PUBLIC;
GRANT ALL ON FUNCTION public.transport_overview() TO authenticated;
GRANT ALL ON FUNCTION public.transport_overview() TO service_role;

--
-- Name: FUNCTION transport_unassign(p_student uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.transport_unassign(p_student uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.transport_unassign(p_student uuid) TO authenticated;
GRANT ALL ON FUNCTION public.transport_unassign(p_student uuid) TO service_role;

--
-- Name: FUNCTION transport_vehicle_driver_guard(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.transport_vehicle_driver_guard() TO anon;
GRANT ALL ON FUNCTION public.transport_vehicle_driver_guard() TO authenticated;
GRANT ALL ON FUNCTION public.transport_vehicle_driver_guard() TO service_role;

--
-- Name: FUNCTION update_updated_at_column(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_updated_at_column() TO anon;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO service_role;

--
-- Name: FUNCTION validate_staff_leave_application(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.validate_staff_leave_application() FROM PUBLIC;
GRANT ALL ON FUNCTION public.validate_staff_leave_application() TO service_role;

--
-- Name: TABLE admission_applications; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.admission_applications TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.admission_applications TO authenticated;
GRANT ALL ON TABLE public.admission_applications TO service_role;

--
-- Name: TABLE admission_document_verifications; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.admission_document_verifications TO authenticated;
GRANT ALL ON TABLE public.admission_document_verifications TO service_role;

--
-- Name: TABLE admission_entrance_tests; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.admission_entrance_tests TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.admission_entrance_tests TO authenticated;
GRANT ALL ON TABLE public.admission_entrance_tests TO service_role;

--
-- Name: TABLE admission_fees; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.admission_fees TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.admission_fees TO authenticated;
GRANT ALL ON TABLE public.admission_fees TO service_role;

--
-- Name: TABLE admission_form_fields; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.admission_form_fields TO authenticated;
GRANT ALL ON TABLE public.admission_form_fields TO service_role;

--
-- Name: TABLE admission_merit_lists; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.admission_merit_lists TO authenticated;
GRANT ALL ON TABLE public.admission_merit_lists TO service_role;

--
-- Name: TABLE admission_quotas; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.admission_quotas TO authenticated;
GRANT ALL ON TABLE public.admission_quotas TO service_role;

--
-- Name: TABLE admission_required_documents; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.admission_required_documents TO authenticated;
GRANT ALL ON TABLE public.admission_required_documents TO service_role;

--
-- Name: TABLE admission_routes; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.admission_routes TO authenticated;
GRANT ALL ON TABLE public.admission_routes TO service_role;

--
-- Name: TABLE admission_seats; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.admission_seats TO authenticated;
GRANT ALL ON TABLE public.admission_seats TO service_role;

--
-- Name: TABLE ai_chat_messages; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ai_chat_messages TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ai_chat_messages TO authenticated;
GRANT ALL ON TABLE public.ai_chat_messages TO service_role;

--
-- Name: TABLE alumni_donations; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.alumni_donations TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.alumni_donations TO authenticated;
GRANT ALL ON TABLE public.alumni_donations TO service_role;

--
-- Name: TABLE alumni_events; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.alumni_events TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.alumni_events TO authenticated;
GRANT ALL ON TABLE public.alumni_events TO service_role;

--
-- Name: TABLE alumni_mentorships; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.alumni_mentorships TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.alumni_mentorships TO authenticated;
GRANT ALL ON TABLE public.alumni_mentorships TO service_role;

--
-- Name: TABLE alumni_profiles; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.alumni_profiles TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.alumni_profiles TO authenticated;
GRANT ALL ON TABLE public.alumni_profiles TO service_role;

--
-- Name: TABLE app_setting_drafts; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.app_setting_drafts TO service_role;
GRANT SELECT ON TABLE public.app_setting_drafts TO authenticated;

--
-- Name: TABLE app_setting_versions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.app_setting_versions TO service_role;
GRANT SELECT ON TABLE public.app_setting_versions TO authenticated;

--
-- Name: TABLE app_settings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.app_settings TO service_role;
GRANT SELECT ON TABLE public.app_settings TO authenticated;

--
-- Name: TABLE assignment_submissions; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.assignment_submissions TO anon;
GRANT SELECT,INSERT,UPDATE ON TABLE public.assignment_submissions TO authenticated;
GRANT ALL ON TABLE public.assignment_submissions TO service_role;

--
-- Name: TABLE assignments; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.assignments TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.assignments TO authenticated;
GRANT ALL ON TABLE public.assignments TO service_role;

--
-- Name: TABLE attendance_shortage_warnings; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.attendance_shortage_warnings TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.attendance_shortage_warnings TO authenticated;
GRANT ALL ON TABLE public.attendance_shortage_warnings TO service_role;

--
-- Name: TABLE audit_logs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.audit_logs TO service_role;
GRANT SELECT,INSERT ON TABLE public.audit_logs TO authenticated;

--
-- Name: TABLE auth_rate_limits; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.auth_rate_limits TO service_role;

--
-- Name: TABLE book_issues; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.book_issues TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.book_issues TO authenticated;
GRANT ALL ON TABLE public.book_issues TO service_role;

--
-- Name: TABLE calendar_events; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.calendar_events TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.calendar_events TO authenticated;
GRANT ALL ON TABLE public.calendar_events TO service_role;

--
-- Name: SEQUENCE certificate_number_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.certificate_number_seq TO anon;
GRANT ALL ON SEQUENCE public.certificate_number_seq TO authenticated;
GRANT ALL ON SEQUENCE public.certificate_number_seq TO service_role;

--
-- Name: TABLE class_attendance_sessions; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.class_attendance_sessions TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.class_attendance_sessions TO authenticated;
GRANT ALL ON TABLE public.class_attendance_sessions TO service_role;

--
-- Name: TABLE concerns; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.concerns TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.concerns TO authenticated;
GRANT ALL ON TABLE public.concerns TO service_role;

--
-- Name: TABLE courses; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.courses TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.courses TO authenticated;
GRANT ALL ON TABLE public.courses TO service_role;

--
-- Name: TABLE daily_teaching_updates; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.daily_teaching_updates TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.daily_teaching_updates TO authenticated;
GRANT ALL ON TABLE public.daily_teaching_updates TO service_role;

--
-- Name: TABLE departments; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.departments TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.departments TO authenticated;
GRANT ALL ON TABLE public.departments TO service_role;

--
-- Name: TABLE digital_library_resources; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.digital_library_resources TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.digital_library_resources TO authenticated;
GRANT ALL ON TABLE public.digital_library_resources TO service_role;

--
-- Name: TABLE disciplinary_incidents; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT ON TABLE public.disciplinary_incidents TO anon;
GRANT SELECT,INSERT ON TABLE public.disciplinary_incidents TO authenticated;
GRANT ALL ON TABLE public.disciplinary_incidents TO service_role;

--
-- Name: TABLE exam_invigilators; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.exam_invigilators TO anon;
GRANT SELECT ON TABLE public.exam_invigilators TO authenticated;
GRANT ALL ON TABLE public.exam_invigilators TO service_role;

--
-- Name: TABLE exam_registrations; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.exam_registrations TO anon;
GRANT SELECT ON TABLE public.exam_registrations TO authenticated;
GRANT ALL ON TABLE public.exam_registrations TO service_role;

--
-- Name: TABLE exam_result_history; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.exam_result_history TO anon;
GRANT SELECT ON TABLE public.exam_result_history TO authenticated;
GRANT ALL ON TABLE public.exam_result_history TO service_role;

--
-- Name: TABLE exam_results; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.exam_results TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.exam_results TO authenticated;
GRANT ALL ON TABLE public.exam_results TO service_role;

--
-- Name: TABLE exam_revaluation_requests; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.exam_revaluation_requests TO anon;
GRANT SELECT ON TABLE public.exam_revaluation_requests TO authenticated;
GRANT ALL ON TABLE public.exam_revaluation_requests TO service_role;

--
-- Name: TABLE exam_rooms; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.exam_rooms TO anon;
GRANT SELECT ON TABLE public.exam_rooms TO authenticated;
GRANT ALL ON TABLE public.exam_rooms TO service_role;

--
-- Name: TABLE exam_schedules; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.exam_schedules TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.exam_schedules TO authenticated;
GRANT ALL ON TABLE public.exam_schedules TO service_role;

--
-- Name: TABLE exam_seating; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.exam_seating TO anon;
GRANT SELECT ON TABLE public.exam_seating TO authenticated;
GRANT ALL ON TABLE public.exam_seating TO service_role;

--
-- Name: TABLE exams; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.exams TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.exams TO authenticated;
GRANT ALL ON TABLE public.exams TO service_role;

--
-- Name: TABLE fee_adjustments; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.fee_adjustments TO authenticated;
GRANT ALL ON TABLE public.fee_adjustments TO service_role;

--
-- Name: TABLE fee_heads; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.fee_heads TO authenticated;
GRANT ALL ON TABLE public.fee_heads TO service_role;

--
-- Name: TABLE fee_payment_reminders; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.fee_payment_reminders TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.fee_payment_reminders TO authenticated;
GRANT ALL ON TABLE public.fee_payment_reminders TO service_role;

--
-- Name: TABLE fee_payments; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.fee_payments TO authenticated;
GRANT ALL ON TABLE public.fee_payments TO service_role;

--
-- Name: TABLE fee_plan_items; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.fee_plan_items TO authenticated;
GRANT ALL ON TABLE public.fee_plan_items TO service_role;

--
-- Name: TABLE fee_plans; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.fee_plans TO authenticated;
GRANT ALL ON TABLE public.fee_plans TO service_role;

--
-- PostgreSQL database dump complete
--
