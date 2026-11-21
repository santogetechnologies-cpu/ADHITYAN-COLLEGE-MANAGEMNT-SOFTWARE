-- Triggers
-- Generated from the verified schema. Run as is; do not edit. Safe to run once on an EMPTY database.
SET check_function_bodies = false;
SET search_path = public, extensions;

SET check_function_bodies = false;

--
-- Name: assignment_submissions assignment_submission_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER assignment_submission_guard BEFORE INSERT OR UPDATE ON public.assignment_submissions FOR EACH ROW EXECUTE FUNCTION public.assignment_submission_guard();

--
-- Name: exam_seating exam_seating_photo; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER exam_seating_photo BEFORE INSERT ON public.exam_seating FOR EACH ROW EXECUTE FUNCTION public.exam_seating_photo();

--
-- Name: hostel_out_passes hostel_outpass_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER hostel_outpass_guard BEFORE INSERT OR UPDATE ON public.hostel_out_passes FOR EACH ROW EXECUTE FUNCTION public.hostel_outpass_guard();

--
-- Name: naac_metrics naac_metrics_progress; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER naac_metrics_progress AFTER INSERT OR DELETE OR UPDATE ON public.naac_metrics FOR EACH ROW EXECUTE FUNCTION public.naac_metrics_after();

--
-- Name: notifications notifications_enqueue; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER notifications_enqueue AFTER INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.notifications_enqueue();

--
-- Name: placement_applications placement_app_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER placement_app_guard BEFORE UPDATE ON public.placement_applications FOR EACH ROW EXECUTE FUNCTION public.placement_app_guard();

--
-- Name: scholarship_applications scholarship_app_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER scholarship_app_guard BEFORE UPDATE ON public.scholarship_applications FOR EACH ROW EXECUTE FUNCTION public.scholarship_app_guard();

--
-- Name: departments set_departments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

--
-- Name: profiles set_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

--
-- Name: attendance_shortage_warnings shortage_ack_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER shortage_ack_guard BEFORE UPDATE ON public.attendance_shortage_warnings FOR EACH ROW EXECUTE FUNCTION public.shortage_ack_guard();

--
-- Name: transport_vehicles transport_vehicle_driver_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER transport_vehicle_driver_guard BEFORE UPDATE ON public.transport_vehicles FOR EACH ROW EXECUTE FUNCTION public.transport_vehicle_driver_guard();

--
-- Name: app_setting_versions trg_app_setting_versions_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_app_setting_versions_immutable BEFORE DELETE OR UPDATE ON public.app_setting_versions FOR EACH ROW EXECUTE FUNCTION public.app_setting_versions_immutable();

--
-- Name: audit_logs trg_bind_audit_log_actor; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_bind_audit_log_actor BEFORE INSERT ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public.bind_audit_log_actor();

--
-- Name: super_admin_audit_logs trg_bind_super_admin_audit_log_actor; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_bind_super_admin_audit_log_actor BEFORE INSERT ON public.super_admin_audit_logs FOR EACH ROW EXECUTE FUNCTION public.bind_super_admin_audit_log_actor();

--
-- Name: students trg_enforce_immutable_student_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_enforce_immutable_student_id BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.enforce_immutable_student_id();

--
-- Name: fee_plan_items trg_fee_plan_items_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_fee_plan_items_guard BEFORE INSERT OR DELETE OR UPDATE ON public.fee_plan_items FOR EACH ROW EXECUTE FUNCTION public.fee_plan_items_guard();

--
-- Name: fee_plans trg_fee_plans_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_fee_plans_guard BEFORE UPDATE ON public.fee_plans FOR EACH ROW EXECUTE FUNCTION public.fee_plans_guard();

--
-- Name: institutional_settings trg_institutional_settings_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_institutional_settings_updated BEFORE UPDATE ON public.institutional_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

--
-- Name: certificates trg_notify_certificate_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_certificate_status AFTER UPDATE ON public.certificates FOR EACH ROW EXECUTE FUNCTION public.notify_certificate_status();

--
-- Name: student_fees trg_notify_fee_payment; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_fee_payment AFTER INSERT OR UPDATE ON public.student_fees FOR EACH ROW EXECUTE FUNCTION public.notify_fee_payment();

--
-- Name: admission_applications trg_notify_new_admission; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_new_admission AFTER INSERT ON public.admission_applications FOR EACH ROW EXECUTE FUNCTION public.notify_new_admission();

--
-- Name: assignments trg_notify_new_assignment; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_new_assignment AFTER INSERT ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.notify_new_assignment();

--
-- Name: concerns trg_notify_new_concern; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_new_concern AFTER INSERT ON public.concerns FOR EACH ROW EXECUTE FUNCTION public.notify_new_concern();

--
-- Name: store_orders trg_notify_store_order; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_store_order AFTER INSERT ON public.store_orders FOR EACH ROW EXECUTE FUNCTION public.notify_store_order();

--
-- Name: audit_logs trg_prevent_audit_log_modification; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_prevent_audit_log_modification BEFORE DELETE OR UPDATE ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_modification();

--
-- Name: audit_logs trg_prevent_audit_log_truncate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_prevent_audit_log_truncate BEFORE TRUNCATE ON public.audit_logs FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_audit_log_truncate();

--
-- Name: super_admin_audit_logs trg_prevent_super_admin_audit_log_modification; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_prevent_super_admin_audit_log_modification BEFORE DELETE OR UPDATE ON public.super_admin_audit_logs FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_modification();

--
-- Name: super_admin_audit_logs trg_prevent_super_admin_audit_log_truncate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_prevent_super_admin_audit_log_truncate BEFORE TRUNCATE ON public.super_admin_audit_logs FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_audit_log_truncate();

--
-- Name: student_attendance_records trg_protect_attendance_record_immutable_columns; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_protect_attendance_record_immutable_columns BEFORE UPDATE ON public.student_attendance_records FOR EACH ROW EXECUTE FUNCTION public.protect_attendance_record_immutable_columns();

--
-- Name: class_attendance_sessions trg_protect_attendance_session_immutable_columns; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_protect_attendance_session_immutable_columns BEFORE UPDATE ON public.class_attendance_sessions FOR EACH ROW EXECUTE FUNCTION public.protect_attendance_session_immutable_columns();

--
-- Name: profiles trg_protect_profile_sensitive_columns; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_protect_profile_sensitive_columns BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_profile_sensitive_columns();

--
-- Name: exam_results trg_set_exam_result_student_name; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_exam_result_student_name BEFORE INSERT OR UPDATE ON public.exam_results FOR EACH ROW EXECUTE FUNCTION public.set_exam_result_student_name();

--
-- Name: student_fees trg_student_fees_fill_code; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_student_fees_fill_code BEFORE INSERT ON public.student_fees FOR EACH ROW EXECUTE FUNCTION public.student_fees_fill_code();

--
-- Name: super_admin_configs trg_super_admin_configs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_super_admin_configs_updated_at BEFORE UPDATE ON public.super_admin_configs FOR EACH ROW EXECUTE FUNCTION public.set_super_admin_configs_updated_at();

--
-- Name: student_mood_checkins trg_sync_mood_student_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sync_mood_student_id BEFORE INSERT OR UPDATE ON public.student_mood_checkins FOR EACH ROW EXECUTE FUNCTION public.sync_mood_student_id();

--
-- Name: staff_leave_applications trg_sync_staff_leave_balance; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sync_staff_leave_balance AFTER INSERT OR DELETE OR UPDATE ON public.staff_leave_applications FOR EACH ROW EXECUTE FUNCTION public.sync_staff_leave_balance_transition();

--
-- Name: profiles trg_sync_student_profile; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sync_student_profile BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.sync_student_profile();

--
-- Name: profiles trg_sync_student_profile_after; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sync_student_profile_after AFTER INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.sync_student_profile_after();

--
-- Name: staff_leave_applications trg_validate_staff_leave_application; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_staff_leave_application BEFORE INSERT OR UPDATE ON public.staff_leave_applications FOR EACH ROW EXECUTE FUNCTION public.validate_staff_leave_application();

--
-- PostgreSQL database dump complete
--
