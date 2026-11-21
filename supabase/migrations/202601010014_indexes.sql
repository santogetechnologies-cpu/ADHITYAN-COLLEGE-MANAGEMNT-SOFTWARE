-- Indexes
-- Generated from the verified schema. Run as is; do not edit. Safe to run once on an EMPTY database.
SET check_function_bodies = false;
SET search_path = public, extensions;

SET check_function_bodies = false;

SET default_tablespace = '';

--
-- Name: assignment_submission_one_per_student; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX assignment_submission_one_per_student ON public.assignment_submissions USING btree (assignment_id, student_id) WHERE (student_id IS NOT NULL);

--
-- Name: grade_scales_one_default; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX grade_scales_one_default ON public.grade_scales USING btree (is_default) WHERE is_default;

--
-- Name: health_records_roll_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX health_records_roll_uidx ON public.health_records USING btree (lower(roll_no)) WHERE ((roll_no IS NOT NULL) AND (roll_no <> ''::text));

--
-- Name: hostel_allotments_one_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX hostel_allotments_one_active ON public.hostel_allotments USING btree (student_id) WHERE (status = 'Active'::text);

--
-- Name: hostel_allotments_room; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX hostel_allotments_room ON public.hostel_allotments USING btree (room_id) WHERE (status = 'Active'::text);

--
-- Name: idx_admission_applications_course; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admission_applications_course ON public.admission_applications USING btree (class_name, academic_year);

--
-- Name: idx_admission_applications_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admission_applications_status ON public.admission_applications USING btree (status);

--
-- Name: idx_admission_docs_application; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admission_docs_application ON public.admission_document_verifications USING btree (application_id);

--
-- Name: idx_admission_merit_course; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admission_merit_course ON public.admission_merit_lists USING btree (course_name, academic_year);

--
-- Name: idx_ai_chat_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_chat_user_created ON public.ai_chat_messages USING btree (user_id, created_at);

--
-- Name: idx_app_setting_versions_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_setting_versions_key ON public.app_setting_versions USING btree (key, version DESC);

--
-- Name: idx_assignments_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignments_due ON public.assignments USING btree (due_date);

--
-- Name: idx_class_attendance_session_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_class_attendance_session_unique ON public.class_attendance_sessions USING btree (lower(TRIM(BOTH FROM class_name)), session_date, period_number, lower(TRIM(BOTH FROM subject_code)), lower(TRIM(BOTH FROM batch)));

--
-- Name: idx_concerns_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_concerns_status ON public.concerns USING btree (status);

--
-- Name: idx_exam_results_exam; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exam_results_exam ON public.exam_results USING btree (exam_id);

--
-- Name: idx_exam_schedules_exam; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exam_schedules_exam ON public.exam_schedules USING btree (exam_id);

--
-- Name: idx_fee_adjustments_fee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fee_adjustments_fee ON public.fee_adjustments USING btree (student_fee_id);

--
-- Name: idx_fee_payments_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fee_payments_student ON public.fee_payments USING btree (student_id, paid_at DESC);

--
-- Name: idx_fee_plan_items_plan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fee_plan_items_plan ON public.fee_plan_items USING btree (plan_id);

--
-- Name: idx_fee_runs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fee_runs_created ON public.fee_runs USING btree (created_at DESC);

--
-- Name: idx_learning_content_dept_class; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_learning_content_dept_class ON public.learning_content USING btree (department, class_name);

--
-- Name: idx_learning_content_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_learning_content_subject ON public.learning_content USING btree (subject);

--
-- Name: idx_learning_progress_content; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_learning_progress_content ON public.student_learning_progress USING btree (content_id);

--
-- Name: idx_learning_progress_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_learning_progress_student ON public.student_learning_progress USING btree (student_id);

--
-- Name: idx_naac_criterion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_naac_criterion ON public.naac_documents USING btree (criterion_number);

--
-- Name: idx_notifications_user_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_read ON public.notifications USING btree (user_id, is_read);

--
-- Name: idx_parent_student_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_parent_student_parent ON public.parent_student_links USING btree (parent_id);

--
-- Name: idx_parent_student_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_parent_student_student ON public.parent_student_links USING btree (student_id);

--
-- Name: idx_profiles_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_email ON public.profiles USING btree (email);

--
-- Name: idx_profiles_login_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_profiles_login_id_unique ON public.profiles USING btree (lower(TRIM(BOTH FROM login_id))) WHERE ((login_id IS NOT NULL) AND (TRIM(BOTH FROM login_id) <> ''::text));

--
-- Name: idx_profiles_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_role ON public.profiles USING btree (role);

--
-- Name: idx_profiles_roll_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_roll_number ON public.profiles USING btree (roll_number);

--
-- Name: idx_profiles_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_student_id ON public.profiles USING btree (student_id);

--
-- Name: idx_sections_dept; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sections_dept ON public.sections USING btree (department_id);

--
-- Name: idx_student_att_semester; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_att_semester ON public.student_attendance USING btree (student_id, semester);

--
-- Name: idx_student_att_student_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_att_student_date ON public.student_attendance USING btree (student_id, date);

--
-- Name: idx_student_attendance_student_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_attendance_student_date ON public.student_attendance USING btree (student_id, date);

--
-- Name: idx_student_fees_record; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_fees_record ON public.student_fees USING btree (student_record_id);

--
-- Name: idx_student_fees_run; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_fees_run ON public.student_fees USING btree (run_id);

--
-- Name: idx_student_mood_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_mood_user_date ON public.student_mood_checkins USING btree (user_id, date);

--
-- Name: idx_students_department; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_students_department ON public.students USING btree (department);

--
-- Name: idx_students_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_students_name ON public.students USING btree (name);

--
-- Name: idx_students_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_students_scope ON public.students USING btree (status, department, class_name, current_semester);

--
-- Name: idx_students_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_students_status ON public.students USING btree (status);

--
-- Name: idx_students_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_students_user_id ON public.students USING btree (user_id);

--
-- Name: idx_submissions_assignment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submissions_assignment ON public.assignment_submissions USING btree (assignment_id);

--
-- Name: idx_submissions_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submissions_student ON public.assignment_submissions USING btree (student_id);

--
-- Name: idx_teacher_messages_sender; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teacher_messages_sender ON public.teacher_messages USING btree (sender_id);

--
-- Name: idx_teacher_messages_teacher; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teacher_messages_teacher ON public.teacher_messages USING btree (teacher_id);

--
-- Name: idx_teaching_updates_class; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teaching_updates_class ON public.daily_teaching_updates USING btree (class_name);

--
-- Name: idx_teaching_updates_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teaching_updates_date ON public.daily_teaching_updates USING btree (date);

--
-- Name: idx_timetables_class_day; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timetables_class_day ON public.timetables USING btree (class_name, day_of_week);

--
-- Name: idx_wellness_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wellness_user_date ON public.wellness_checkins USING btree (user_id, date);

--
-- Name: idx_wellness_user_date_type; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_wellness_user_date_type ON public.wellness_checkins USING btree (user_id, date, checkin_type);

--
-- Name: inventory_items_name_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX inventory_items_name_uidx ON public.inventory_items USING btree (lower(name));

--
-- Name: notification_outbox_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notification_outbox_pending ON public.notification_outbox USING btree (created_at) WHERE (status = ANY (ARRAY['pending'::text, 'sending'::text]));

--
-- Name: payment_refunds_gateway_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX payment_refunds_gateway_uidx ON public.payment_refunds USING btree (gateway_refund_id) WHERE (gateway_refund_id IS NOT NULL);

--
-- Name: placement_apps_one_per_drive; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX placement_apps_one_per_drive ON public.placement_applications USING btree (drive_id, student_id) WHERE (student_id IS NOT NULL);

--
-- Name: staff_payroll_runs_month_active_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX staff_payroll_runs_month_active_uidx ON public.staff_payroll_runs USING btree (month_year) WHERE (status <> 'Cancelled'::text);

--
-- Name: student_leave_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX student_leave_student ON public.student_leave_requests USING btree (student_id, from_date DESC);

--
-- Name: student_lifecycle_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX student_lifecycle_student ON public.student_lifecycle_events USING btree (student_record_id, created_at DESC);

--
-- Name: student_promotions_batch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX student_promotions_batch ON public.student_promotions USING btree (batch_id);

--
-- Name: transport_assignments_one_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX transport_assignments_one_active ON public.transport_assignments USING btree (student_id) WHERE (status = 'Active'::text);

--
-- Name: transport_assignments_vehicle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX transport_assignments_vehicle ON public.transport_assignments USING btree (vehicle_id) WHERE (status = 'Active'::text);

--
-- Name: uq_admission_applications_student_record; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_admission_applications_student_record ON public.admission_applications USING btree (student_record_id) WHERE (student_record_id IS NOT NULL);

--
-- Name: uq_admission_entrance_application; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_admission_entrance_application ON public.admission_entrance_tests USING btree (application_id) WHERE (application_id IS NOT NULL);

--
-- Name: uq_admission_fees_idempotency; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_admission_fees_idempotency ON public.admission_fees USING btree (idempotency_key) WHERE (idempotency_key IS NOT NULL);

--
-- Name: uq_admission_form_fields; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_admission_form_fields ON public.admission_form_fields USING btree (field_key, COALESCE(course_name, ''::text));

--
-- Name: uq_admission_merit_application_course; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_admission_merit_application_course ON public.admission_merit_lists USING btree (application_id, course_name, academic_year) WHERE (application_id IS NOT NULL);

--
-- Name: uq_admission_required_documents; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_admission_required_documents ON public.admission_required_documents USING btree (COALESCE(course_name, ''::text), lower(doc_type));

--
-- Name: uq_exam_results_exam_student_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_exam_results_exam_student_subject ON public.exam_results USING btree (exam_id, student_id, subject) WHERE (student_id IS NOT NULL);

--
-- Name: uq_fee_payments_txn_ref; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_fee_payments_txn_ref ON public.fee_payments USING btree (transaction_reference) WHERE ((transaction_reference IS NOT NULL) AND (status <> 'Failed'::text));

--
-- Name: uq_hall_tickets_exam_student; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_hall_tickets_exam_student ON public.hall_tickets USING btree (exam_id, student_id) WHERE ((exam_id IS NOT NULL) AND (student_id IS NOT NULL));

--
-- Name: uq_student_fees_charge; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_student_fees_charge ON public.student_fees USING btree (student_record_id, charge_key) WHERE ((charge_key IS NOT NULL) AND (status <> 'cancelled'::text));

--
-- Name: uq_super_admin_releases_version; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_super_admin_releases_version ON public.super_admin_releases USING btree (version);

--
-- PostgreSQL database dump complete
--
