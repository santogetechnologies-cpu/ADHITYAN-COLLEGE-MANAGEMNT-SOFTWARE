-- Foreign keys, part 1
-- Generated from the verified schema. Run as is; do not edit. Safe to run once on an EMPTY database.
SET check_function_bodies = false;
SET search_path = public, extensions;

SET check_function_bodies = false;

--
-- Name: admission_applications admission_applications_enrolled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission_applications
    ADD CONSTRAINT admission_applications_enrolled_by_fkey FOREIGN KEY (enrolled_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

--
-- Name: admission_applications admission_applications_status_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission_applications
    ADD CONSTRAINT admission_applications_status_updated_by_fkey FOREIGN KEY (status_updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

--
-- Name: admission_applications admission_applications_student_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission_applications
    ADD CONSTRAINT admission_applications_student_record_id_fkey FOREIGN KEY (student_record_id) REFERENCES public.students(id) ON DELETE SET NULL;

--
-- Name: admission_document_verifications admission_document_verifications_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission_document_verifications
    ADD CONSTRAINT admission_document_verifications_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.admission_applications(id) ON DELETE CASCADE;

--
-- Name: admission_document_verifications admission_document_verifications_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission_document_verifications
    ADD CONSTRAINT admission_document_verifications_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

--
-- Name: admission_entrance_tests admission_entrance_tests_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission_entrance_tests
    ADD CONSTRAINT admission_entrance_tests_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.admission_applications(id) ON DELETE CASCADE;

--
-- Name: admission_entrance_tests admission_entrance_tests_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission_entrance_tests
    ADD CONSTRAINT admission_entrance_tests_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

--
-- Name: admission_fees admission_fees_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission_fees
    ADD CONSTRAINT admission_fees_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.admission_applications(id) ON DELETE CASCADE;

--
-- Name: admission_fees admission_fees_collected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission_fees
    ADD CONSTRAINT admission_fees_collected_by_fkey FOREIGN KEY (collected_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

--
-- Name: admission_fees admission_fees_receipt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission_fees
    ADD CONSTRAINT admission_fees_receipt_id_fkey FOREIGN KEY (receipt_id) REFERENCES public.fee_receipts(id) ON DELETE SET NULL;

--
-- Name: admission_merit_lists admission_merit_lists_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission_merit_lists
    ADD CONSTRAINT admission_merit_lists_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.admission_applications(id) ON DELETE CASCADE;

--
-- Name: admission_seats admission_seats_quota_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission_seats
    ADD CONSTRAINT admission_seats_quota_code_fkey FOREIGN KEY (quota_code) REFERENCES public.admission_quotas(code) ON DELETE RESTRICT;

--
-- Name: ai_chat_messages ai_chat_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_chat_messages
    ADD CONSTRAINT ai_chat_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: alumni_donations alumni_donations_alumni_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumni_donations
    ADD CONSTRAINT alumni_donations_alumni_id_fkey FOREIGN KEY (alumni_id) REFERENCES public.alumni_profiles(id) ON DELETE SET NULL;

--
-- Name: alumni_mentorships alumni_mentorships_mentor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumni_mentorships
    ADD CONSTRAINT alumni_mentorships_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES public.alumni_profiles(id) ON DELETE CASCADE;

--
-- Name: app_setting_drafts app_setting_drafts_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_setting_drafts
    ADD CONSTRAINT app_setting_drafts_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

--
-- Name: app_setting_versions app_setting_versions_published_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_setting_versions
    ADD CONSTRAINT app_setting_versions_published_by_fkey FOREIGN KEY (published_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

--
-- Name: app_settings app_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

--
-- Name: assignment_submissions assignment_submissions_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_submissions
    ADD CONSTRAINT assignment_submissions_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE CASCADE;

--
-- Name: assignment_submissions assignment_submissions_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_submissions
    ADD CONSTRAINT assignment_submissions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: assignments assignments_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

--
-- Name: attendance_shortage_warnings attendance_shortage_warnings_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_shortage_warnings
    ADD CONSTRAINT attendance_shortage_warnings_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: book_issues book_issues_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.book_issues
    ADD CONSTRAINT book_issues_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.library_books(id) ON DELETE CASCADE;

--
-- Name: book_issues book_issues_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.book_issues
    ADD CONSTRAINT book_issues_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

--
-- Name: certificates certificates_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

--
-- Name: class_attendance_sessions class_attendance_sessions_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_attendance_sessions
    ADD CONSTRAINT class_attendance_sessions_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

--
-- Name: concerns concerns_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concerns
    ADD CONSTRAINT concerns_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

--
-- Name: concerns concerns_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concerns
    ADD CONSTRAINT concerns_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

--
-- Name: daily_teaching_updates daily_teaching_updates_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_teaching_updates
    ADD CONSTRAINT daily_teaching_updates_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

--
-- Name: disciplinary_incidents disciplinary_incidents_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disciplinary_incidents
    ADD CONSTRAINT disciplinary_incidents_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

--
-- Name: exam_invigilators exam_invigilators_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_invigilators
    ADD CONSTRAINT exam_invigilators_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;

--
-- Name: exam_invigilators exam_invigilators_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_invigilators
    ADD CONSTRAINT exam_invigilators_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.exam_rooms(id) ON DELETE CASCADE;

--
-- Name: exam_invigilators exam_invigilators_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_invigilators
    ADD CONSTRAINT exam_invigilators_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: exam_registrations exam_registrations_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_registrations
    ADD CONSTRAINT exam_registrations_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;

--
-- Name: exam_registrations exam_registrations_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_registrations
    ADD CONSTRAINT exam_registrations_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: exam_results exam_results_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_results
    ADD CONSTRAINT exam_results_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;

--
-- Name: exam_results exam_results_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_results
    ADD CONSTRAINT exam_results_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

--
-- Name: exam_revaluation_requests exam_revaluation_requests_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_revaluation_requests
    ADD CONSTRAINT exam_revaluation_requests_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;

--
-- Name: exam_revaluation_requests exam_revaluation_requests_fee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_revaluation_requests
    ADD CONSTRAINT exam_revaluation_requests_fee_id_fkey FOREIGN KEY (fee_id) REFERENCES public.student_fees(id);

--
-- Name: exam_revaluation_requests exam_revaluation_requests_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_revaluation_requests
    ADD CONSTRAINT exam_revaluation_requests_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: exam_revaluation_requests exam_revaluation_requests_valuer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_revaluation_requests
    ADD CONSTRAINT exam_revaluation_requests_valuer_id_fkey FOREIGN KEY (valuer_id) REFERENCES public.profiles(id);

--
-- Name: exam_schedules exam_schedules_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_schedules
    ADD CONSTRAINT exam_schedules_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;

--
-- Name: exam_seating exam_seating_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_seating
    ADD CONSTRAINT exam_seating_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;

--
-- Name: exam_seating exam_seating_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_seating
    ADD CONSTRAINT exam_seating_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.exam_rooms(id) ON DELETE RESTRICT;

--
-- Name: exam_seating exam_seating_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_seating
    ADD CONSTRAINT exam_seating_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: exams exams_parent_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_parent_exam_id_fkey FOREIGN KEY (parent_exam_id) REFERENCES public.exams(id) ON DELETE SET NULL;

--
-- Name: fee_adjustments fee_adjustments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_adjustments
    ADD CONSTRAINT fee_adjustments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

--
-- Name: fee_adjustments fee_adjustments_student_fee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_adjustments
    ADD CONSTRAINT fee_adjustments_student_fee_id_fkey FOREIGN KEY (student_fee_id) REFERENCES public.student_fees(id) ON DELETE RESTRICT;

--
-- Name: fee_payment_reminders fee_payment_reminders_student_fee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_payment_reminders
    ADD CONSTRAINT fee_payment_reminders_student_fee_id_fkey FOREIGN KEY (student_fee_id) REFERENCES public.student_fees(id) ON DELETE CASCADE;

--
-- Name: fee_payment_reminders fee_payment_reminders_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_payment_reminders
    ADD CONSTRAINT fee_payment_reminders_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: fee_payments fee_payments_collected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_payments
    ADD CONSTRAINT fee_payments_collected_by_fkey FOREIGN KEY (collected_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

--
-- Name: fee_payments fee_payments_receipt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_payments
    ADD CONSTRAINT fee_payments_receipt_id_fkey FOREIGN KEY (receipt_id) REFERENCES public.fee_receipts(id) ON DELETE SET NULL;

--
-- Name: fee_payments fee_payments_student_fee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_payments
    ADD CONSTRAINT fee_payments_student_fee_id_fkey FOREIGN KEY (student_fee_id) REFERENCES public.student_fees(id) ON DELETE RESTRICT;

--
-- Name: fee_payments fee_payments_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_payments
    ADD CONSTRAINT fee_payments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;

--
-- Name: fee_payments fee_payments_student_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_payments
    ADD CONSTRAINT fee_payments_student_record_id_fkey FOREIGN KEY (student_record_id) REFERENCES public.students(id) ON DELETE SET NULL;

--
-- Name: fee_plan_items fee_plan_items_fee_head_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_plan_items
    ADD CONSTRAINT fee_plan_items_fee_head_id_fkey FOREIGN KEY (fee_head_id) REFERENCES public.fee_heads(id) ON DELETE RESTRICT;

--
-- Name: fee_plan_items fee_plan_items_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_plan_items
    ADD CONSTRAINT fee_plan_items_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.fee_plans(id) ON DELETE CASCADE;

--
-- Name: fee_plans fee_plans_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_plans
    ADD CONSTRAINT fee_plans_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

--
-- Name: fee_receipts fee_receipts_cashier_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_receipts
    ADD CONSTRAINT fee_receipts_cashier_user_id_fkey FOREIGN KEY (cashier_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

--
-- Name: fee_receipts fee_receipts_student_fee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_receipts
    ADD CONSTRAINT fee_receipts_student_fee_id_fkey FOREIGN KEY (student_fee_id) REFERENCES public.student_fees(id) ON DELETE SET NULL;

--
-- Name: fee_receipts fee_receipts_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_receipts
    ADD CONSTRAINT fee_receipts_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: fee_receipts fee_receipts_student_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_receipts
    ADD CONSTRAINT fee_receipts_student_record_id_fkey FOREIGN KEY (student_record_id) REFERENCES public.students(id) ON DELETE SET NULL;

--
-- Name: fee_runs fee_runs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_runs
    ADD CONSTRAINT fee_runs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

--
-- Name: fee_runs fee_runs_fee_head_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_runs
    ADD CONSTRAINT fee_runs_fee_head_id_fkey FOREIGN KEY (fee_head_id) REFERENCES public.fee_heads(id) ON DELETE RESTRICT;

--
-- Name: fee_runs fee_runs_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_runs
    ADD CONSTRAINT fee_runs_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.fee_plans(id) ON DELETE RESTRICT;

--
-- Name: feedback_submissions feedback_submissions_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_submissions
    ADD CONSTRAINT feedback_submissions_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

--
-- Name: hall_tickets fk_hall_tickets_exam; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hall_tickets
    ADD CONSTRAINT fk_hall_tickets_exam FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE SET NULL;

--
-- Name: reception_appointments fk_reception_appointments_with_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reception_appointments
    ADD CONSTRAINT fk_reception_appointments_with_user FOREIGN KEY (with_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

--
-- Name: grade_scale_bands grade_scale_bands_scale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grade_scale_bands
    ADD CONSTRAINT grade_scale_bands_scale_id_fkey FOREIGN KEY (scale_id) REFERENCES public.grade_scales(id) ON DELETE CASCADE;

--
-- PostgreSQL database dump complete
--
