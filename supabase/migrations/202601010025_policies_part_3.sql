-- Row level security policies, part 3 of 3
-- Generated from the verified schema. Run as is; do not edit. Safe to run once on an EMPTY database.
SET check_function_bodies = false;
SET search_path = public, extensions;

SET check_function_bodies = false;

--
-- Name: staff_leave_applications leave_apps_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leave_apps_delete ON public.staff_leave_applications FOR DELETE TO authenticated USING (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'hr_manager'::text])) OR ((user_id = auth.uid()) AND (status = ANY (ARRAY['Pending_HOD'::text, 'Pending_Principal'::text, 'Pending'::text])))));

--
-- Name: staff_leave_applications leave_apps_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leave_apps_insert ON public.staff_leave_applications FOR INSERT TO authenticated WITH CHECK (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'hr_manager'::text])) OR ((user_id = auth.uid()) AND (status = ANY (ARRAY['Pending_HOD'::text, 'Pending_Principal'::text, 'Pending'::text])))));

--
-- Name: staff_leave_applications leave_apps_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leave_apps_select ON public.staff_leave_applications FOR SELECT TO authenticated USING (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'hr_manager'::text, 'hod'::text])) OR (user_id = auth.uid())));

--
-- Name: staff_leave_applications leave_apps_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leave_apps_update ON public.staff_leave_applications FOR UPDATE TO authenticated USING (((user_id = auth.uid()) AND (status = ANY (ARRAY['Pending_HOD'::text, 'Pending_Principal'::text, 'Pending'::text])))) WITH CHECK (((user_id = auth.uid()) AND (status = ANY (ARRAY['Pending_HOD'::text, 'Pending_Principal'::text, 'Pending'::text]))));

--
-- Name: staff_leave_balances leave_balances_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leave_balances_delete ON public.staff_leave_balances FOR DELETE TO authenticated USING ((public.get_current_user_role() = 'admin'::text));

--
-- Name: staff_leave_balances leave_balances_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leave_balances_insert ON public.staff_leave_balances FOR INSERT TO authenticated WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'hr_manager'::text])));

--
-- Name: staff_leave_balances leave_balances_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leave_balances_select ON public.staff_leave_balances FOR SELECT TO authenticated USING (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'hr_manager'::text, 'hod'::text])) OR (user_id = auth.uid())));

--
-- Name: staff_leave_balances leave_balances_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leave_balances_update ON public.staff_leave_balances FOR UPDATE TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'hr_manager'::text]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'hr_manager'::text])));

--
-- Name: library_circulation library_circ_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY library_circ_delete ON public.library_circulation FOR DELETE TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'librarian'::text])));

--
-- Name: library_circulation library_circ_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY library_circ_insert ON public.library_circulation FOR INSERT TO authenticated WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'librarian'::text])));

--
-- Name: library_circulation library_circ_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY library_circ_select ON public.library_circulation FOR SELECT TO authenticated USING (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'librarian'::text])) OR (user_id = auth.uid()) OR public.is_parent_of(user_id)));

--
-- Name: library_circulation library_circ_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY library_circ_update ON public.library_circulation FOR UPDATE TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'librarian'::text]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'librarian'::text])));

--
-- Name: vehicle_maintenance maintenance_manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY maintenance_manage ON public.vehicle_maintenance TO authenticated USING (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text])) OR ((public.get_current_user_role() = ANY (ARRAY['driver'::text, 'transport_driver'::text])) AND public.is_my_vehicle(vehicle_id)))) WITH CHECK (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text])) OR ((public.get_current_user_role() = ANY (ARRAY['driver'::text, 'transport_driver'::text])) AND public.is_my_vehicle(vehicle_id))));

--
-- Name: medical_emergency_contacts med_contacts_manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY med_contacts_manage ON public.medical_emergency_contacts TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text])));

--
-- Name: medical_emergency_contacts med_contacts_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY med_contacts_read ON public.medical_emergency_contacts FOR SELECT TO authenticated USING (true);

--
-- Name: naac_documents naac_documents_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY naac_documents_delete ON public.naac_documents FOR DELETE TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'naac_coordinator'::text])));

--
-- Name: naac_documents naac_documents_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY naac_documents_insert ON public.naac_documents FOR INSERT TO authenticated WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'naac_coordinator'::text, 'hod'::text, 'teacher'::text])));

--
-- Name: naac_documents naac_documents_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY naac_documents_read ON public.naac_documents FOR SELECT TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'naac_coordinator'::text, 'hod'::text, 'teacher'::text])));

--
-- Name: naac_metrics naac_metrics_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY naac_metrics_read ON public.naac_metrics FOR SELECT TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'naac_coordinator'::text, 'hod'::text, 'teacher'::text])));

--
-- Name: naac_metrics naac_metrics_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY naac_metrics_write ON public.naac_metrics TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'naac_coordinator'::text]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'naac_coordinator'::text])));

--
-- Name: naac_criterion_progress naac_progress_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY naac_progress_read ON public.naac_criterion_progress FOR SELECT TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'naac_coordinator'::text, 'hod'::text, 'teacher'::text])));

--
-- Name: notification_outbox notification_outbox_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notification_outbox_select ON public.notification_outbox FOR SELECT TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text])));

--
-- Name: notifications notifications_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_delete_own ON public.notifications FOR DELETE TO authenticated USING ((user_id = auth.uid()));

--
-- Name: notifications notifications_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_insert_own ON public.notifications FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));

--
-- Name: notifications notifications_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_select ON public.notifications FOR SELECT TO authenticated USING ((user_id = auth.uid()));

--
-- Name: notifications notifications_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_update_own ON public.notifications FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));

--
-- Name: payment_order_items payment_items_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payment_items_select ON public.payment_order_items FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.payment_orders o
  WHERE (o.id = payment_order_items.order_id))));

--
-- Name: payment_orders payment_orders_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payment_orders_select ON public.payment_orders FOR SELECT TO authenticated USING (((created_by = auth.uid()) OR (student_id = auth.uid()) OR public.is_parent_of(student_id) OR (public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'finance_manager'::text, 'accountant'::text, 'financier'::text]))));

--
-- Name: payment_refunds payment_refunds_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payment_refunds_select ON public.payment_refunds FOR SELECT TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'finance_manager'::text, 'accountant'::text, 'financier'::text])));

--
-- Name: payment_settlements payment_settlements_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payment_settlements_select ON public.payment_settlements FOR SELECT TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'finance_manager'::text, 'accountant'::text, 'financier'::text])));

--
-- Name: staff_payroll_items payroll_items_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payroll_items_select ON public.staff_payroll_items FOR SELECT TO authenticated USING (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'finance_manager'::text, 'accountant'::text, 'hr_manager'::text])) OR (user_id = auth.uid())));

--
-- Name: staff_payroll_runs payroll_runs_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payroll_runs_select ON public.staff_payroll_runs FOR SELECT TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'finance_manager'::text, 'accountant'::text, 'hr_manager'::text])));

--
-- Name: payroll_settings payroll_settings_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payroll_settings_read ON public.payroll_settings FOR SELECT TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'hr_manager'::text, 'finance_manager'::text, 'accountant'::text])));

--
-- Name: placement_applications placement_apps_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY placement_apps_delete ON public.placement_applications FOR DELETE TO authenticated USING (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'placement_officer'::text])) OR ((student_id = auth.uid()) AND (status = 'Applied'::text))));

--
-- Name: placement_applications placement_apps_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY placement_apps_insert ON public.placement_applications FOR INSERT TO authenticated WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'placement_officer'::text])));

--
-- Name: placement_applications placement_apps_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY placement_apps_select ON public.placement_applications FOR SELECT TO authenticated USING (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'placement_officer'::text])) OR (student_id = auth.uid()) OR public.is_parent_of(student_id)));

--
-- Name: placement_applications placement_apps_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY placement_apps_update ON public.placement_applications FOR UPDATE TO authenticated USING (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'placement_officer'::text])) OR ((student_id = auth.uid()) AND (status = 'Applied'::text)))) WITH CHECK (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'placement_officer'::text])) OR ((student_id = auth.uid()) AND (status = ANY (ARRAY['Applied'::text, 'Withdrawn'::text])))));

--
-- Name: placement_drives placement_drives_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY placement_drives_delete ON public.placement_drives FOR DELETE TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'placement_officer'::text])));

--
-- Name: placement_drives placement_drives_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY placement_drives_insert ON public.placement_drives FOR INSERT TO authenticated WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'placement_officer'::text])));

--
-- Name: placement_drives placement_drives_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY placement_drives_select ON public.placement_drives FOR SELECT TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'placement_officer'::text, 'hod'::text, 'teacher'::text, 'student'::text, 'parent'::text])));

--
-- Name: placement_drives placement_drives_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY placement_drives_update ON public.placement_drives FOR UPDATE TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'placement_officer'::text]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'placement_officer'::text])));

--
-- Name: profiles profiles_hr_staff_directory; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_hr_staff_directory ON public.profiles FOR SELECT TO authenticated USING (((public.get_current_user_role() = 'hr_manager'::text) AND (role <> ALL (ARRAY['student'::text, 'parent'::text]))));

--
-- Name: exam_result_history result_history_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY result_history_select ON public.exam_result_history FOR SELECT TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'coe'::text])));

--
-- Name: exam_revaluation_requests reval_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reval_select ON public.exam_revaluation_requests FOR SELECT TO authenticated USING (((student_id = auth.uid()) OR public.is_parent_of(student_id) OR (public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'coe'::text, 'hod'::text]))));

--
-- Name: scholarship_applications scholarship_apps_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY scholarship_apps_delete ON public.scholarship_applications FOR DELETE TO authenticated USING (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'finance_manager'::text])) OR ((student_id = auth.uid()) AND (status = ANY (ARRAY['Draft'::text, 'Submitted'::text, 'Pending'::text])))));

--
-- Name: scholarship_applications scholarship_apps_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY scholarship_apps_insert ON public.scholarship_applications FOR INSERT TO authenticated WITH CHECK (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'finance_manager'::text])) OR ((public.get_current_user_role() = 'student'::text) AND (student_id = auth.uid()) AND (status = ANY (ARRAY['Draft'::text, 'Submitted'::text, 'Pending'::text])))));

--
-- Name: scholarship_applications scholarship_apps_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY scholarship_apps_select ON public.scholarship_applications FOR SELECT TO authenticated USING (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'finance_manager'::text, 'hr_manager'::text])) OR (student_id = auth.uid()) OR public.is_parent_of(student_id)));

--
-- Name: scholarship_applications scholarship_apps_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY scholarship_apps_update ON public.scholarship_applications FOR UPDATE TO authenticated USING (((student_id = auth.uid()) AND (status = ANY (ARRAY['Draft'::text, 'Submitted'::text, 'Pending'::text])))) WITH CHECK (((student_id = auth.uid()) AND (status = ANY (ARRAY['Draft'::text, 'Submitted'::text, 'Pending'::text]))));

--
-- Name: scholarships_master scholarships_master_manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY scholarships_master_manage ON public.scholarships_master TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'finance_manager'::text]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'finance_manager'::text])));

--
-- Name: scholarships_master scholarships_master_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY scholarships_master_read ON public.scholarships_master FOR SELECT TO authenticated USING (true);

--
-- Name: attendance_shortage_warnings shortage_warnings_parent_ack; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY shortage_warnings_parent_ack ON public.attendance_shortage_warnings FOR UPDATE TO authenticated USING (public.is_parent_of(student_id)) WITH CHECK (public.is_parent_of(student_id));

--
-- Name: attendance_shortage_warnings shortage_warnings_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY shortage_warnings_select ON public.attendance_shortage_warnings FOR SELECT TO authenticated USING (((student_id = auth.uid()) OR public.is_parent_of(student_id) OR (public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'hod'::text, 'teacher'::text, 'coe'::text]))));

--
-- Name: attendance_shortage_warnings shortage_warnings_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY shortage_warnings_write ON public.attendance_shortage_warnings TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'hod'::text, 'teacher'::text]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'hod'::text, 'teacher'::text])));

--
-- Name: staff_service_records staff_records_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY staff_records_select ON public.staff_service_records FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR (public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'hr_manager'::text, 'finance_manager'::text, 'accountant'::text]))));

--
-- Name: staff_service_records staff_records_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY staff_records_write ON public.staff_service_records TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'hr_manager'::text]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'hr_manager'::text])));

--
-- Name: transport_stops stops_manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stops_manage ON public.transport_stops TO authenticated USING (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text])) OR ((public.get_current_user_role() = ANY (ARRAY['driver'::text, 'transport_driver'::text])) AND public.is_my_vehicle(vehicle_id)))) WITH CHECK (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text])) OR ((public.get_current_user_role() = ANY (ARRAY['driver'::text, 'transport_driver'::text])) AND public.is_my_vehicle(vehicle_id))));

--
-- Name: transport_stops stops_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stops_select ON public.transport_stops FOR SELECT TO authenticated USING (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'receptionist'::text])) OR public.is_my_vehicle(vehicle_id) OR public.rides_vehicle(vehicle_id)));

--
-- Name: store_products store_products_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY store_products_read ON public.store_products FOR SELECT TO authenticated USING (true);

--
-- Name: student_leave_requests student_leave_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY student_leave_select ON public.student_leave_requests FOR SELECT TO authenticated USING (((student_id = auth.uid()) OR public.is_parent_of(student_id) OR (public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'hod'::text, 'hostel_warden'::text])) OR ((public.get_current_user_role() = 'teacher'::text) AND public.is_teacher_assigned_to_class(auth.uid(), ( SELECT p.class_name
   FROM public.profiles p
  WHERE (p.id = student_leave_requests.student_id))))));

--
-- Name: student_lifecycle_events student_lifecycle_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY student_lifecycle_select ON public.student_lifecycle_events FOR SELECT TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'hod'::text, 'coe'::text])));

--
-- Name: student_promotions student_promotions_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY student_promotions_select ON public.student_promotions FOR SELECT TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'hod'::text, 'coe'::text])));

--
-- Name: students students_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY students_select ON public.students FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR (public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'hod'::text, 'coe'::text, 'teacher'::text, 'receptionist'::text, 'finance_manager'::text, 'financier'::text, 'accountant'::text, 'librarian'::text, 'hostel_warden'::text, 'placement_officer'::text, 'transport_driver'::text, 'driver'::text, 'store_manager'::text, 'storekeeper'::text])) OR (EXISTS ( SELECT 1
   FROM public.parent_student_links l
  WHERE ((l.parent_id = auth.uid()) AND (l.student_id = students.user_id) AND COALESCE(l.verified, false))))));

--
-- Name: students students_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY students_update ON public.students FOR UPDATE TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'receptionist'::text]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'receptionist'::text])));

--
-- Name: students students_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY students_write ON public.students FOR INSERT TO authenticated WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'receptionist'::text])));

--
-- Name: assignment_submissions submissions_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY submissions_insert ON public.assignment_submissions FOR INSERT TO authenticated WITH CHECK (((student_id = auth.uid()) AND (public.get_current_user_role() = 'student'::text)));

--
-- Name: assignment_submissions submissions_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY submissions_select ON public.assignment_submissions FOR SELECT TO authenticated USING (((student_id = auth.uid()) OR public.is_parent_of(student_id) OR (public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text])) OR ((public.get_current_user_role() = 'teacher'::text) AND (EXISTS ( SELECT 1
   FROM public.assignments a
  WHERE ((a.id = assignment_submissions.assignment_id) AND (a.teacher_id = auth.uid())))))));

--
-- Name: assignment_submissions submissions_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY submissions_update ON public.assignment_submissions FOR UPDATE TO authenticated USING (((student_id = auth.uid()) AND (status = ANY (ARRAY['submitted'::text, 'late'::text, 'pending'::text])))) WITH CHECK ((student_id = auth.uid()));

--
-- Name: super_admin_audit_logs super_admin_audit_logs_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY super_admin_audit_logs_insert ON public.super_admin_audit_logs FOR INSERT TO authenticated WITH CHECK ((public.get_current_user_role() = 'admin'::text));

--
-- Name: super_admin_audit_logs super_admin_audit_logs_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY super_admin_audit_logs_select ON public.super_admin_audit_logs FOR SELECT TO authenticated USING ((public.get_current_user_role() = 'admin'::text));

--
-- Name: super_admin_configs super_admin_configs_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY super_admin_configs_delete ON public.super_admin_configs FOR DELETE TO authenticated USING ((public.get_current_user_role() = 'admin'::text));

--
-- Name: super_admin_configs super_admin_configs_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY super_admin_configs_insert ON public.super_admin_configs FOR INSERT TO authenticated WITH CHECK ((public.get_current_user_role() = 'admin'::text));

--
-- Name: super_admin_configs super_admin_configs_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY super_admin_configs_select ON public.super_admin_configs FOR SELECT TO authenticated USING ((public.get_current_user_role() = 'admin'::text));

--
-- Name: super_admin_configs super_admin_configs_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY super_admin_configs_update ON public.super_admin_configs FOR UPDATE TO authenticated USING ((public.get_current_user_role() = 'admin'::text)) WITH CHECK ((public.get_current_user_role() = 'admin'::text));

--
-- Name: super_admin_releases super_admin_releases_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY super_admin_releases_insert ON public.super_admin_releases FOR INSERT TO authenticated WITH CHECK ((public.get_current_user_role() = 'admin'::text));

--
-- Name: super_admin_releases super_admin_releases_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY super_admin_releases_select ON public.super_admin_releases FOR SELECT TO authenticated USING ((public.get_current_user_role() = 'admin'::text));

--
-- Name: transport_assignments transport_assignments_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY transport_assignments_select ON public.transport_assignments FOR SELECT TO authenticated USING (((student_id = auth.uid()) OR public.is_parent_of(student_id) OR (public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'receptionist'::text])) OR ((public.get_current_user_role() = ANY (ARRAY['driver'::text, 'transport_driver'::text])) AND public.is_my_vehicle(vehicle_id))));

--
-- Name: student_transport_logs transport_logs_manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY transport_logs_manage ON public.student_transport_logs TO authenticated USING (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text])) OR ((public.get_current_user_role() = ANY (ARRAY['driver'::text, 'transport_driver'::text])) AND public.is_my_vehicle(vehicle_id)))) WITH CHECK (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text])) OR ((public.get_current_user_role() = ANY (ARRAY['driver'::text, 'transport_driver'::text])) AND public.is_my_vehicle(vehicle_id))));

--
-- Name: student_transport_logs transport_logs_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY transport_logs_select ON public.student_transport_logs FOR SELECT TO authenticated USING (((student_id = auth.uid()) OR public.is_parent_of(student_id) OR (public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text])) OR public.is_my_vehicle(vehicle_id)));

--
-- Name: transport_vehicles vehicles_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vehicles_admin ON public.transport_vehicles TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text])));

--
-- Name: transport_vehicles vehicles_driver_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vehicles_driver_update ON public.transport_vehicles FOR UPDATE TO authenticated USING (((public.get_current_user_role() = ANY (ARRAY['driver'::text, 'transport_driver'::text])) AND (driver_id = auth.uid()))) WITH CHECK (((public.get_current_user_role() = ANY (ARRAY['driver'::text, 'transport_driver'::text])) AND (driver_id = auth.uid())));

--
-- Name: transport_vehicles vehicles_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vehicles_select ON public.transport_vehicles FOR SELECT TO authenticated USING (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'receptionist'::text])) OR (driver_id = auth.uid()) OR public.rides_vehicle(id)));

--
-- Name: wellness_alerts wellness_alerts_manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wellness_alerts_manage ON public.wellness_alerts TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'hostel_warden'::text]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'hostel_warden'::text])));

--
-- Name: wellness_alerts wellness_alerts_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wellness_alerts_read ON public.wellness_alerts FOR SELECT TO authenticated USING ((active OR (public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'hostel_warden'::text]))));

--
-- PostgreSQL database dump complete
--
