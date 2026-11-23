-- Foreign keys, part 2
-- Generated from the verified schema. Run as is; do not edit. Safe to run once on an EMPTY database.
SET check_function_bodies = false;
SET search_path = public, extensions;

SET check_function_bodies = false;

--
-- Name: hall_tickets hall_tickets_overridden_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hall_tickets
    ADD CONSTRAINT hall_tickets_overridden_by_fkey FOREIGN KEY (overridden_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

--
-- Name: hall_tickets hall_tickets_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hall_tickets
    ADD CONSTRAINT hall_tickets_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: health_records health_records_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_records
    ADD CONSTRAINT health_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

--
-- Name: hostel_allotments hostel_allotments_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hostel_allotments
    ADD CONSTRAINT hostel_allotments_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.hostel_rooms(id) ON DELETE RESTRICT;

--
-- Name: hostel_allotments hostel_allotments_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hostel_allotments
    ADD CONSTRAINT hostel_allotments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: hostel_out_passes hostel_out_passes_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hostel_out_passes
    ADD CONSTRAINT hostel_out_passes_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: institutional_broadcasts institutional_broadcasts_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institutional_broadcasts
    ADD CONSTRAINT institutional_broadcasts_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

--
-- Name: inventory_transactions inventory_transactions_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id);

--
-- Name: library_circulation library_circulation_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.library_circulation
    ADD CONSTRAINT library_circulation_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.library_books(id) ON DELETE CASCADE;

--
-- Name: library_circulation library_circulation_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.library_circulation
    ADD CONSTRAINT library_circulation_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: naac_documents naac_documents_criterion_number_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.naac_documents
    ADD CONSTRAINT naac_documents_criterion_number_fkey FOREIGN KEY (criterion_number) REFERENCES public.naac_criterion_progress(criterion_number) ON DELETE CASCADE;

--
-- Name: naac_documents naac_documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.naac_documents
    ADD CONSTRAINT naac_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

--
-- Name: naac_metrics naac_metrics_criterion_number_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.naac_metrics
    ADD CONSTRAINT naac_metrics_criterion_number_fkey FOREIGN KEY (criterion_number) REFERENCES public.naac_criterion_progress(criterion_number) ON DELETE CASCADE;

--
-- Name: notification_outbox notification_outbox_notification_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_outbox
    ADD CONSTRAINT notification_outbox_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.notifications(id) ON DELETE SET NULL;

--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: parent_student_links parent_student_links_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parent_student_links
    ADD CONSTRAINT parent_student_links_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: parent_student_links parent_student_links_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parent_student_links
    ADD CONSTRAINT parent_student_links_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: payment_order_items payment_order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_order_items
    ADD CONSTRAINT payment_order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.payment_orders(id) ON DELETE CASCADE;

--
-- Name: payment_order_items payment_order_items_student_fee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_order_items
    ADD CONSTRAINT payment_order_items_student_fee_id_fkey FOREIGN KEY (student_fee_id) REFERENCES public.student_fees(id);

--
-- Name: payment_orders payment_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_orders
    ADD CONSTRAINT payment_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);

--
-- Name: payment_orders payment_orders_store_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_orders
    ADD CONSTRAINT payment_orders_store_order_id_fkey FOREIGN KEY (store_order_id) REFERENCES public.store_orders(id);

--
-- Name: payment_refunds payment_refunds_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_refunds
    ADD CONSTRAINT payment_refunds_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.payment_orders(id);

--
-- Name: payment_settlements payment_settlements_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_settlements
    ADD CONSTRAINT payment_settlements_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.payment_orders(id);

--
-- Name: placement_applications placement_applications_drive_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.placement_applications
    ADD CONSTRAINT placement_applications_drive_id_fkey FOREIGN KEY (drive_id) REFERENCES public.placement_drives(id) ON DELETE CASCADE;

--
-- Name: placement_applications placement_applications_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.placement_applications
    ADD CONSTRAINT placement_applications_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: scholarship_applications scholarship_applications_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scholarship_applications
    ADD CONSTRAINT scholarship_applications_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

--
-- Name: scholarship_applications scholarship_applications_scholarship_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scholarship_applications
    ADD CONSTRAINT scholarship_applications_scholarship_id_fkey FOREIGN KEY (scholarship_id) REFERENCES public.scholarships_master(id) ON DELETE CASCADE;

--
-- Name: scholarship_applications scholarship_applications_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scholarship_applications
    ADD CONSTRAINT scholarship_applications_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: sections sections_assigned_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sections
    ADD CONSTRAINT sections_assigned_teacher_id_fkey FOREIGN KEY (assigned_teacher_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

--
-- Name: sections sections_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sections
    ADD CONSTRAINT sections_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;

--
-- Name: staff_leave_applications staff_leave_applications_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_leave_applications
    ADD CONSTRAINT staff_leave_applications_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

--
-- Name: staff_leave_applications staff_leave_applications_substitute_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_leave_applications
    ADD CONSTRAINT staff_leave_applications_substitute_teacher_id_fkey FOREIGN KEY (substitute_teacher_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

--
-- Name: staff_leave_applications staff_leave_applications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_leave_applications
    ADD CONSTRAINT staff_leave_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: staff_leave_balances staff_leave_balances_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_leave_balances
    ADD CONSTRAINT staff_leave_balances_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: staff_payroll_items staff_payroll_items_payroll_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_payroll_items
    ADD CONSTRAINT staff_payroll_items_payroll_run_id_fkey FOREIGN KEY (payroll_run_id) REFERENCES public.staff_payroll_runs(id) ON DELETE CASCADE;

--
-- Name: staff_payroll_items staff_payroll_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_payroll_items
    ADD CONSTRAINT staff_payroll_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: staff_payroll_runs staff_payroll_runs_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_payroll_runs
    ADD CONSTRAINT staff_payroll_runs_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

--
-- Name: staff_service_records staff_service_records_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_service_records
    ADD CONSTRAINT staff_service_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: store_orders store_orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_orders
    ADD CONSTRAINT store_orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

--
-- Name: student_achievements student_achievements_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_achievements
    ADD CONSTRAINT student_achievements_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: student_attendance student_attendance_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_attendance
    ADD CONSTRAINT student_attendance_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

--
-- Name: student_attendance_records student_attendance_records_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_attendance_records
    ADD CONSTRAINT student_attendance_records_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.class_attendance_sessions(id) ON DELETE CASCADE;

--
-- Name: student_attendance_records student_attendance_records_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_attendance_records
    ADD CONSTRAINT student_attendance_records_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: student_attendance student_attendance_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_attendance
    ADD CONSTRAINT student_attendance_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: student_fees student_fees_fee_head_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_fees
    ADD CONSTRAINT student_fees_fee_head_id_fkey FOREIGN KEY (fee_head_id) REFERENCES public.fee_heads(id) ON DELETE SET NULL;

--
-- Name: student_fees student_fees_plan_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_fees
    ADD CONSTRAINT student_fees_plan_item_id_fkey FOREIGN KEY (plan_item_id) REFERENCES public.fee_plan_items(id) ON DELETE SET NULL;

--
-- Name: student_fees student_fees_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_fees
    ADD CONSTRAINT student_fees_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.fee_runs(id) ON DELETE SET NULL;

--
-- Name: student_fees student_fees_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_fees
    ADD CONSTRAINT student_fees_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

--
-- Name: student_fees student_fees_student_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_fees
    ADD CONSTRAINT student_fees_student_record_id_fkey FOREIGN KEY (student_record_id) REFERENCES public.students(id) ON DELETE SET NULL;

--
-- Name: student_goals student_goals_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_goals
    ADD CONSTRAINT student_goals_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: student_learning_progress student_learning_progress_content_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_learning_progress
    ADD CONSTRAINT student_learning_progress_content_id_fkey FOREIGN KEY (content_id) REFERENCES public.learning_content(id) ON DELETE CASCADE;

--
-- Name: student_learning_progress student_learning_progress_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_learning_progress
    ADD CONSTRAINT student_learning_progress_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: student_leave_requests student_leave_requests_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_leave_requests
    ADD CONSTRAINT student_leave_requests_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: student_lifecycle_events student_lifecycle_events_student_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_lifecycle_events
    ADD CONSTRAINT student_lifecycle_events_student_record_id_fkey FOREIGN KEY (student_record_id) REFERENCES public.students(id) ON DELETE CASCADE;

--
-- Name: student_mood_checkins student_mood_checkins_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_mood_checkins
    ADD CONSTRAINT student_mood_checkins_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: student_transport_logs student_transport_logs_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_transport_logs
    ADD CONSTRAINT student_transport_logs_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

--
-- Name: student_transport_logs student_transport_logs_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_transport_logs
    ADD CONSTRAINT student_transport_logs_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.transport_vehicles(id) ON DELETE CASCADE;

--
-- Name: students students_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

--
-- Name: teacher_messages teacher_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_messages
    ADD CONSTRAINT teacher_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: teacher_messages teacher_messages_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_messages
    ADD CONSTRAINT teacher_messages_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

--
-- Name: timetables timetables_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetables
    ADD CONSTRAINT timetables_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

--
-- Name: transport_assignments transport_assignments_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_assignments
    ADD CONSTRAINT transport_assignments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: transport_assignments transport_assignments_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_assignments
    ADD CONSTRAINT transport_assignments_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.transport_vehicles(id) ON DELETE CASCADE;

--
-- Name: transport_stops transport_stops_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_stops
    ADD CONSTRAINT transport_stops_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.transport_vehicles(id) ON DELETE CASCADE;

--
-- Name: transport_vehicles transport_vehicles_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_vehicles
    ADD CONSTRAINT transport_vehicles_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

--
-- Name: vehicle_maintenance vehicle_maintenance_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_maintenance
    ADD CONSTRAINT vehicle_maintenance_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.transport_vehicles(id) ON DELETE CASCADE;

--
-- Name: wellness_checkins wellness_checkins_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wellness_checkins
    ADD CONSTRAINT wellness_checkins_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- PostgreSQL database dump complete
--
