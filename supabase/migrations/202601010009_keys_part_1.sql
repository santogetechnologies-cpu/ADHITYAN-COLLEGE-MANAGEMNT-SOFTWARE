-- Primary and unique keys, part 1
-- Generated from the verified schema. Run as is; do not edit. Safe to run once on an EMPTY database.
SET check_function_bodies = false;
SET search_path = public, extensions;

SET check_function_bodies = false;

SET default_tablespace = '';

--
-- Name: admission_applications admission_applications_application_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission_applications
    ADD CONSTRAINT admission_applications_application_number_key UNIQUE (application_number);

--
-- Name: admission_applications admission_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission_applications
    ADD CONSTRAINT admission_applications_pkey PRIMARY KEY (id);

--
-- Name: admission_document_verifications admission_document_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission_document_verifications
    ADD CONSTRAINT admission_document_verifications_pkey PRIMARY KEY (id);

--
-- Name: admission_entrance_tests admission_entrance_tests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission_entrance_tests
    ADD CONSTRAINT admission_entrance_tests_pkey PRIMARY KEY (id);

--
-- Name: admission_entrance_tests admission_entrance_tests_roll_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission_entrance_tests
    ADD CONSTRAINT admission_entrance_tests_roll_no_key UNIQUE (roll_no);

--
-- Name: admission_fees admission_fees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission_fees
    ADD CONSTRAINT admission_fees_pkey PRIMARY KEY (id);

--
-- Name: admission_form_fields admission_form_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission_form_fields
    ADD CONSTRAINT admission_form_fields_pkey PRIMARY KEY (id);

--
-- Name: admission_merit_lists admission_merit_lists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission_merit_lists
    ADD CONSTRAINT admission_merit_lists_pkey PRIMARY KEY (id);

--
-- Name: admission_quotas admission_quotas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission_quotas
    ADD CONSTRAINT admission_quotas_pkey PRIMARY KEY (code);

--
-- Name: admission_required_documents admission_required_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission_required_documents
    ADD CONSTRAINT admission_required_documents_pkey PRIMARY KEY (id);

--
-- Name: admission_routes admission_routes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission_routes
    ADD CONSTRAINT admission_routes_pkey PRIMARY KEY (code);

--
-- Name: admission_seats admission_seats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission_seats
    ADD CONSTRAINT admission_seats_pkey PRIMARY KEY (id);

--
-- Name: ai_chat_messages ai_chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_chat_messages
    ADD CONSTRAINT ai_chat_messages_pkey PRIMARY KEY (id);

--
-- Name: alumni_donations alumni_donations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumni_donations
    ADD CONSTRAINT alumni_donations_pkey PRIMARY KEY (id);

--
-- Name: alumni_events alumni_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumni_events
    ADD CONSTRAINT alumni_events_pkey PRIMARY KEY (id);

--
-- Name: alumni_mentorships alumni_mentorships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumni_mentorships
    ADD CONSTRAINT alumni_mentorships_pkey PRIMARY KEY (id);

--
-- Name: alumni_profiles alumni_profiles_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumni_profiles
    ADD CONSTRAINT alumni_profiles_email_key UNIQUE (email);

--
-- Name: alumni_profiles alumni_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumni_profiles
    ADD CONSTRAINT alumni_profiles_pkey PRIMARY KEY (id);

--
-- Name: app_setting_drafts app_setting_drafts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_setting_drafts
    ADD CONSTRAINT app_setting_drafts_pkey PRIMARY KEY (key);

--
-- Name: app_setting_versions app_setting_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_setting_versions
    ADD CONSTRAINT app_setting_versions_pkey PRIMARY KEY (id);

--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (key);

--
-- Name: assignment_submissions assignment_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_submissions
    ADD CONSTRAINT assignment_submissions_pkey PRIMARY KEY (id);

--
-- Name: assignments assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_pkey PRIMARY KEY (id);

--
-- Name: attendance_shortage_warnings attendance_shortage_warnings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_shortage_warnings
    ADD CONSTRAINT attendance_shortage_warnings_pkey PRIMARY KEY (id);

--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);

--
-- Name: auth_rate_limits auth_rate_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_rate_limits
    ADD CONSTRAINT auth_rate_limits_pkey PRIMARY KEY (key);

--
-- Name: book_issues book_issues_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.book_issues
    ADD CONSTRAINT book_issues_pkey PRIMARY KEY (id);

--
-- Name: calendar_events calendar_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_pkey PRIMARY KEY (id);

--
-- Name: certificates certificates_certificate_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_certificate_number_key UNIQUE (certificate_number);

--
-- Name: certificates certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_pkey PRIMARY KEY (id);

--
-- Name: class_attendance_sessions class_attendance_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_attendance_sessions
    ADD CONSTRAINT class_attendance_sessions_pkey PRIMARY KEY (id);

--
-- Name: concerns concerns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concerns
    ADD CONSTRAINT concerns_pkey PRIMARY KEY (id);

--
-- Name: courses courses_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_code_key UNIQUE (code);

--
-- Name: courses courses_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_name_key UNIQUE (name);

--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);

--
-- Name: daily_teaching_updates daily_teaching_updates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_teaching_updates
    ADD CONSTRAINT daily_teaching_updates_pkey PRIMARY KEY (id);

--
-- Name: departments departments_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_name_key UNIQUE (name);

--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);

--
-- Name: digital_library_resources digital_library_resources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.digital_library_resources
    ADD CONSTRAINT digital_library_resources_pkey PRIMARY KEY (id);

--
-- Name: disciplinary_incidents disciplinary_incidents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disciplinary_incidents
    ADD CONSTRAINT disciplinary_incidents_pkey PRIMARY KEY (id);

--
-- Name: exam_invigilators exam_invigilators_exam_id_exam_date_start_time_teacher_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_invigilators
    ADD CONSTRAINT exam_invigilators_exam_id_exam_date_start_time_teacher_id_key UNIQUE (exam_id, exam_date, start_time, teacher_id);

--
-- Name: exam_invigilators exam_invigilators_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_invigilators
    ADD CONSTRAINT exam_invigilators_pkey PRIMARY KEY (id);

--
-- Name: exam_registrations exam_registrations_exam_id_student_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_registrations
    ADD CONSTRAINT exam_registrations_exam_id_student_id_key UNIQUE (exam_id, student_id);

--
-- Name: exam_registrations exam_registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_registrations
    ADD CONSTRAINT exam_registrations_pkey PRIMARY KEY (id);

--
-- Name: exam_result_history exam_result_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_result_history
    ADD CONSTRAINT exam_result_history_pkey PRIMARY KEY (id);

--
-- Name: exam_results exam_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_results
    ADD CONSTRAINT exam_results_pkey PRIMARY KEY (id);

--
-- Name: exam_revaluation_requests exam_revaluation_requests_exam_id_student_id_subject_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_revaluation_requests
    ADD CONSTRAINT exam_revaluation_requests_exam_id_student_id_subject_key UNIQUE (exam_id, student_id, subject);

--
-- Name: exam_revaluation_requests exam_revaluation_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_revaluation_requests
    ADD CONSTRAINT exam_revaluation_requests_pkey PRIMARY KEY (id);

--
-- Name: exam_rooms exam_rooms_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_rooms
    ADD CONSTRAINT exam_rooms_name_key UNIQUE (name);

--
-- Name: exam_rooms exam_rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_rooms
    ADD CONSTRAINT exam_rooms_pkey PRIMARY KEY (id);

--
-- Name: exam_schedules exam_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_schedules
    ADD CONSTRAINT exam_schedules_pkey PRIMARY KEY (id);

--
-- Name: exam_seating exam_seating_exam_id_exam_date_start_time_room_id_seat_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_seating
    ADD CONSTRAINT exam_seating_exam_id_exam_date_start_time_room_id_seat_no_key UNIQUE (exam_id, exam_date, start_time, room_id, seat_no);

--
-- Name: exam_seating exam_seating_exam_id_exam_date_start_time_student_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_seating
    ADD CONSTRAINT exam_seating_exam_id_exam_date_start_time_student_id_key UNIQUE (exam_id, exam_date, start_time, student_id);

--
-- Name: exam_seating exam_seating_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_seating
    ADD CONSTRAINT exam_seating_pkey PRIMARY KEY (id);

--
-- Name: exams exams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_pkey PRIMARY KEY (id);

--
-- Name: fee_adjustments fee_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_adjustments
    ADD CONSTRAINT fee_adjustments_pkey PRIMARY KEY (id);

--
-- Name: fee_heads fee_heads_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_heads
    ADD CONSTRAINT fee_heads_code_key UNIQUE (code);

--
-- Name: fee_heads fee_heads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_heads
    ADD CONSTRAINT fee_heads_pkey PRIMARY KEY (id);

--
-- Name: fee_payment_reminders fee_payment_reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_payment_reminders
    ADD CONSTRAINT fee_payment_reminders_pkey PRIMARY KEY (id);

--
-- Name: fee_payments fee_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_payments
    ADD CONSTRAINT fee_payments_pkey PRIMARY KEY (id);

--
-- Name: fee_plan_items fee_plan_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_plan_items
    ADD CONSTRAINT fee_plan_items_pkey PRIMARY KEY (id);

--
-- Name: fee_plans fee_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_plans
    ADD CONSTRAINT fee_plans_pkey PRIMARY KEY (id);

--
-- Name: fee_receipts fee_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_receipts
    ADD CONSTRAINT fee_receipts_pkey PRIMARY KEY (id);

--
-- Name: fee_receipts fee_receipts_receipt_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_receipts
    ADD CONSTRAINT fee_receipts_receipt_number_key UNIQUE (receipt_number);

--
-- Name: fee_runs fee_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_runs
    ADD CONSTRAINT fee_runs_pkey PRIMARY KEY (id);

--
-- Name: fee_structures fee_structures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_structures
    ADD CONSTRAINT fee_structures_pkey PRIMARY KEY (id);

--
-- Name: feedback_submissions feedback_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_submissions
    ADD CONSTRAINT feedback_submissions_pkey PRIMARY KEY (id);

--
-- Name: finance_transactions finance_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_transactions
    ADD CONSTRAINT finance_transactions_pkey PRIMARY KEY (id);

--
-- Name: grade_scale_bands grade_scale_bands_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grade_scale_bands
    ADD CONSTRAINT grade_scale_bands_pkey PRIMARY KEY (id);

--
-- Name: grade_scale_bands grade_scale_bands_scale_id_grade_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grade_scale_bands
    ADD CONSTRAINT grade_scale_bands_scale_id_grade_key UNIQUE (scale_id, grade);

--
-- Name: grade_scale_bands grade_scale_bands_scale_id_min_pct_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grade_scale_bands
    ADD CONSTRAINT grade_scale_bands_scale_id_min_pct_key UNIQUE (scale_id, min_pct);

--
-- Name: grade_scales grade_scales_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grade_scales
    ADD CONSTRAINT grade_scales_name_key UNIQUE (name);

--
-- Name: grade_scales grade_scales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grade_scales
    ADD CONSTRAINT grade_scales_pkey PRIMARY KEY (id);

--
-- Name: hall_tickets hall_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hall_tickets
    ADD CONSTRAINT hall_tickets_pkey PRIMARY KEY (id);

--
-- Name: hall_tickets hall_tickets_qr_code_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hall_tickets
    ADD CONSTRAINT hall_tickets_qr_code_token_key UNIQUE (qr_code_token);

--
-- Name: health_records health_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_records
    ADD CONSTRAINT health_records_pkey PRIMARY KEY (id);

--
-- Name: hostel_allotments hostel_allotments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hostel_allotments
    ADD CONSTRAINT hostel_allotments_pkey PRIMARY KEY (id);

--
-- Name: hostel_out_passes hostel_out_passes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hostel_out_passes
    ADD CONSTRAINT hostel_out_passes_pkey PRIMARY KEY (id);

--
-- Name: hostel_rooms hostel_rooms_block_name_room_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hostel_rooms
    ADD CONSTRAINT hostel_rooms_block_name_room_number_key UNIQUE (block_name, room_number);

--
-- Name: hostel_rooms hostel_rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hostel_rooms
    ADD CONSTRAINT hostel_rooms_pkey PRIMARY KEY (id);

--
-- Name: infirmary_visits infirmary_visits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.infirmary_visits
    ADD CONSTRAINT infirmary_visits_pkey PRIMARY KEY (id);

--
-- Name: institutional_broadcasts institutional_broadcasts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institutional_broadcasts
    ADD CONSTRAINT institutional_broadcasts_pkey PRIMARY KEY (id);

--
-- Name: institutional_settings institutional_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institutional_settings
    ADD CONSTRAINT institutional_settings_pkey PRIMARY KEY (id);

--
-- Name: integration_settings integration_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_settings
    ADD CONSTRAINT integration_settings_pkey PRIMARY KEY (kind);

--
-- Name: inventory_items inventory_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (id);

--
-- PostgreSQL database dump complete
--
