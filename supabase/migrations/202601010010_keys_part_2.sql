-- Primary and unique keys, part 2
-- Generated from the verified schema. Run as is; do not edit. Safe to run once on an EMPTY database.
SET check_function_bodies = false;
SET search_path = public, extensions;

SET check_function_bodies = false;

SET default_tablespace = '';

--
-- Name: inventory_transactions inventory_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_pkey PRIMARY KEY (id);

--
-- Name: learning_content learning_content_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_content
    ADD CONSTRAINT learning_content_pkey PRIMARY KEY (id);

--
-- Name: library_books library_books_book_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.library_books
    ADD CONSTRAINT library_books_book_code_key UNIQUE (book_code);

--
-- Name: library_books library_books_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.library_books
    ADD CONSTRAINT library_books_pkey PRIMARY KEY (id);

--
-- Name: library_circulation library_circulation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.library_circulation
    ADD CONSTRAINT library_circulation_pkey PRIMARY KEY (id);

--
-- Name: medical_emergency_contacts medical_emergency_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_emergency_contacts
    ADD CONSTRAINT medical_emergency_contacts_pkey PRIMARY KEY (id);

--
-- Name: naac_criterion_progress naac_criterion_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.naac_criterion_progress
    ADD CONSTRAINT naac_criterion_progress_pkey PRIMARY KEY (criterion_number);

--
-- Name: naac_documents naac_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.naac_documents
    ADD CONSTRAINT naac_documents_pkey PRIMARY KEY (id);

--
-- Name: naac_metrics naac_metrics_metric_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.naac_metrics
    ADD CONSTRAINT naac_metrics_metric_code_key UNIQUE (metric_code);

--
-- Name: naac_metrics naac_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.naac_metrics
    ADD CONSTRAINT naac_metrics_pkey PRIMARY KEY (id);

--
-- Name: notification_outbox notification_outbox_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_outbox
    ADD CONSTRAINT notification_outbox_pkey PRIMARY KEY (id);

--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);

--
-- Name: parent_student_links parent_student_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parent_student_links
    ADD CONSTRAINT parent_student_links_pkey PRIMARY KEY (id);

--
-- Name: payment_events payment_events_gateway_event_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_events
    ADD CONSTRAINT payment_events_gateway_event_id_key UNIQUE (gateway_event_id);

--
-- Name: payment_events payment_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_events
    ADD CONSTRAINT payment_events_pkey PRIMARY KEY (id);

--
-- Name: payment_order_items payment_order_items_order_id_student_fee_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_order_items
    ADD CONSTRAINT payment_order_items_order_id_student_fee_id_key UNIQUE (order_id, student_fee_id);

--
-- Name: payment_order_items payment_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_order_items
    ADD CONSTRAINT payment_order_items_pkey PRIMARY KEY (id);

--
-- Name: payment_orders payment_orders_gateway_order_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_orders
    ADD CONSTRAINT payment_orders_gateway_order_id_key UNIQUE (gateway_order_id);

--
-- Name: payment_orders payment_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_orders
    ADD CONSTRAINT payment_orders_pkey PRIMARY KEY (id);

--
-- Name: payment_refunds payment_refunds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_refunds
    ADD CONSTRAINT payment_refunds_pkey PRIMARY KEY (id);

--
-- Name: payment_settlements payment_settlements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_settlements
    ADD CONSTRAINT payment_settlements_pkey PRIMARY KEY (id);

--
-- Name: payment_settlements payment_settlements_settlement_id_gateway_payment_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_settlements
    ADD CONSTRAINT payment_settlements_settlement_id_gateway_payment_id_key UNIQUE (settlement_id, gateway_payment_id);

--
-- Name: payroll_settings payroll_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_settings
    ADD CONSTRAINT payroll_settings_pkey PRIMARY KEY (id);

--
-- Name: placement_applications placement_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.placement_applications
    ADD CONSTRAINT placement_applications_pkey PRIMARY KEY (id);

--
-- Name: placement_drives placement_drives_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.placement_drives
    ADD CONSTRAINT placement_drives_pkey PRIMARY KEY (id);

--
-- Name: profiles profiles_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_email_key UNIQUE (email);

--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

--
-- Name: reception_appointments reception_appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reception_appointments
    ADD CONSTRAINT reception_appointments_pkey PRIMARY KEY (id);

--
-- Name: reception_enquiries reception_enquiries_enquiry_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reception_enquiries
    ADD CONSTRAINT reception_enquiries_enquiry_code_key UNIQUE (enquiry_code);

--
-- Name: reception_enquiries reception_enquiries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reception_enquiries
    ADD CONSTRAINT reception_enquiries_pkey PRIMARY KEY (id);

--
-- Name: reception_visitors reception_visitors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reception_visitors
    ADD CONSTRAINT reception_visitors_pkey PRIMARY KEY (id);

--
-- Name: scholarship_applications scholarship_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scholarship_applications
    ADD CONSTRAINT scholarship_applications_pkey PRIMARY KEY (id);

--
-- Name: scholarships_master scholarships_master_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scholarships_master
    ADD CONSTRAINT scholarships_master_code_key UNIQUE (code);

--
-- Name: scholarships_master scholarships_master_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scholarships_master
    ADD CONSTRAINT scholarships_master_pkey PRIMARY KEY (id);

--
-- Name: sections sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sections
    ADD CONSTRAINT sections_pkey PRIMARY KEY (id);

--
-- Name: sports_events sports_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sports_events
    ADD CONSTRAINT sports_events_pkey PRIMARY KEY (id);

--
-- Name: sports_teams sports_teams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sports_teams
    ADD CONSTRAINT sports_teams_pkey PRIMARY KEY (id);

--
-- Name: staff_leave_applications staff_leave_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_leave_applications
    ADD CONSTRAINT staff_leave_applications_pkey PRIMARY KEY (id);

--
-- Name: staff_leave_balances staff_leave_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_leave_balances
    ADD CONSTRAINT staff_leave_balances_pkey PRIMARY KEY (id);

--
-- Name: staff_leave_balances staff_leave_balances_user_id_academic_year_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_leave_balances
    ADD CONSTRAINT staff_leave_balances_user_id_academic_year_key UNIQUE (user_id, academic_year);

--
-- Name: staff_payroll_items staff_payroll_items_payslip_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_payroll_items
    ADD CONSTRAINT staff_payroll_items_payslip_number_key UNIQUE (payslip_number);

--
-- Name: staff_payroll_items staff_payroll_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_payroll_items
    ADD CONSTRAINT staff_payroll_items_pkey PRIMARY KEY (id);

--
-- Name: staff_payroll_runs staff_payroll_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_payroll_runs
    ADD CONSTRAINT staff_payroll_runs_pkey PRIMARY KEY (id);

--
-- Name: staff_service_records staff_service_records_employee_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_service_records
    ADD CONSTRAINT staff_service_records_employee_code_key UNIQUE (employee_code);

--
-- Name: staff_service_records staff_service_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_service_records
    ADD CONSTRAINT staff_service_records_pkey PRIMARY KEY (id);

--
-- Name: store_orders store_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_orders
    ADD CONSTRAINT store_orders_pkey PRIMARY KEY (id);

--
-- Name: store_products store_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_products
    ADD CONSTRAINT store_products_pkey PRIMARY KEY (id);

--
-- Name: student_achievements student_achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_achievements
    ADD CONSTRAINT student_achievements_pkey PRIMARY KEY (id);

--
-- Name: student_attendance student_attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_attendance
    ADD CONSTRAINT student_attendance_pkey PRIMARY KEY (id);

--
-- Name: student_attendance_records student_attendance_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_attendance_records
    ADD CONSTRAINT student_attendance_records_pkey PRIMARY KEY (id);

--
-- Name: student_fees student_fees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_fees
    ADD CONSTRAINT student_fees_pkey PRIMARY KEY (id);

--
-- Name: student_goals student_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_goals
    ADD CONSTRAINT student_goals_pkey PRIMARY KEY (id);

--
-- Name: student_learning_progress student_learning_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_learning_progress
    ADD CONSTRAINT student_learning_progress_pkey PRIMARY KEY (id);

--
-- Name: student_leave_requests student_leave_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_leave_requests
    ADD CONSTRAINT student_leave_requests_pkey PRIMARY KEY (id);

--
-- Name: student_lifecycle_events student_lifecycle_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_lifecycle_events
    ADD CONSTRAINT student_lifecycle_events_pkey PRIMARY KEY (id);

--
-- Name: student_mood_checkins student_mood_checkins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_mood_checkins
    ADD CONSTRAINT student_mood_checkins_pkey PRIMARY KEY (id);

--
-- Name: student_promotions student_promotions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_promotions
    ADD CONSTRAINT student_promotions_pkey PRIMARY KEY (id);

--
-- Name: student_transport_logs student_transport_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_transport_logs
    ADD CONSTRAINT student_transport_logs_pkey PRIMARY KEY (id);

--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);

--
-- Name: students students_student_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_student_id_key UNIQUE (student_id);

--
-- Name: students students_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_user_id_key UNIQUE (user_id);

--
-- Name: super_admin_audit_logs super_admin_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.super_admin_audit_logs
    ADD CONSTRAINT super_admin_audit_logs_pkey PRIMARY KEY (id);

--
-- Name: super_admin_configs super_admin_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.super_admin_configs
    ADD CONSTRAINT super_admin_configs_pkey PRIMARY KEY (id);

--
-- Name: super_admin_releases super_admin_releases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.super_admin_releases
    ADD CONSTRAINT super_admin_releases_pkey PRIMARY KEY (id);

--
-- Name: teacher_messages teacher_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_messages
    ADD CONSTRAINT teacher_messages_pkey PRIMARY KEY (id);

--
-- Name: timetables timetables_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetables
    ADD CONSTRAINT timetables_pkey PRIMARY KEY (id);

--
-- Name: transport_assignments transport_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_assignments
    ADD CONSTRAINT transport_assignments_pkey PRIMARY KEY (id);

--
-- Name: transport_stops transport_stops_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_stops
    ADD CONSTRAINT transport_stops_pkey PRIMARY KEY (id);

--
-- Name: transport_vehicles transport_vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_vehicles
    ADD CONSTRAINT transport_vehicles_pkey PRIMARY KEY (id);

--
-- Name: transport_vehicles transport_vehicles_vehicle_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_vehicles
    ADD CONSTRAINT transport_vehicles_vehicle_number_key UNIQUE (vehicle_number);

--
-- Name: sections unique_dept_section; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sections
    ADD CONSTRAINT unique_dept_section UNIQUE (department_id, name);

--
-- Name: parent_student_links unique_parent_student; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parent_student_links
    ADD CONSTRAINT unique_parent_student UNIQUE (parent_id, student_id);

--
-- Name: admission_seats uq_admission_seats; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission_seats
    ADD CONSTRAINT uq_admission_seats UNIQUE (course_name, academic_year, quota_code);

--
-- Name: app_setting_versions uq_app_setting_versions; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_setting_versions
    ADD CONSTRAINT uq_app_setting_versions UNIQUE (key, version);

--
-- Name: fee_payments uq_fee_payments_idempotency; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_payments
    ADD CONSTRAINT uq_fee_payments_idempotency UNIQUE (idempotency_key);

--
-- Name: fee_plan_items uq_fee_plan_item; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_plan_items
    ADD CONSTRAINT uq_fee_plan_item UNIQUE (plan_id, fee_head_id, billing_cycle);

--
-- Name: fee_plans uq_fee_plans_name_year; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_plans
    ADD CONSTRAINT uq_fee_plans_name_year UNIQUE (name, academic_year);

--
-- Name: student_learning_progress uq_student_content_progress; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_learning_progress
    ADD CONSTRAINT uq_student_content_progress UNIQUE (student_id, content_id);

--
-- Name: student_mood_checkins uq_student_mood_per_session_day; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_mood_checkins
    ADD CONSTRAINT uq_student_mood_per_session_day UNIQUE (user_id, date, session);

--
-- Name: super_admin_configs uq_super_admin_configs_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.super_admin_configs
    ADD CONSTRAINT uq_super_admin_configs_key UNIQUE (category, key);

--
-- Name: wellness_checkins uq_wellness_user_date_type; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wellness_checkins
    ADD CONSTRAINT uq_wellness_user_date_type UNIQUE (user_id, date, checkin_type);

--
-- Name: vehicle_maintenance vehicle_maintenance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_maintenance
    ADD CONSTRAINT vehicle_maintenance_pkey PRIMARY KEY (id);

--
-- Name: wellness_alerts wellness_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wellness_alerts
    ADD CONSTRAINT wellness_alerts_pkey PRIMARY KEY (id);

--
-- Name: wellness_checkins wellness_checkins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wellness_checkins
    ADD CONSTRAINT wellness_checkins_pkey PRIMARY KEY (id);

--
-- PostgreSQL database dump complete
--
