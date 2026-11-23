-- Row level security policies, part 2 of 3
-- Generated from the verified schema. Run as is; do not edit. Safe to run once on an EMPTY database.
SET check_function_bodies = false;
SET search_path = public, extensions;

SET check_function_bodies = false;

--
-- Name: alumni_profiles alumni_profiles_select_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY alumni_profiles_select_staff ON public.alumni_profiles FOR SELECT TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'placement_officer'::text, 'hod'::text])));

--
-- Name: app_setting_drafts app_setting_drafts_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY app_setting_drafts_read ON public.app_setting_drafts FOR SELECT TO authenticated USING ((public.get_current_user_role() = 'admin'::text));

--
-- Name: app_setting_versions app_setting_versions_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY app_setting_versions_read ON public.app_setting_versions FOR SELECT TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text])));

--
-- Name: app_settings app_settings_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY app_settings_read ON public.app_settings FOR SELECT TO authenticated USING (true);

--
-- Name: assignments assignments_manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY assignments_manage ON public.assignments TO authenticated USING (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text])) OR ((public.get_current_user_role() = 'teacher'::text) AND (teacher_id = auth.uid())))) WITH CHECK (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text])) OR ((public.get_current_user_role() = 'teacher'::text) AND (teacher_id = auth.uid()))));

--
-- Name: student_attendance_records att_records_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY att_records_delete ON public.student_attendance_records FOR DELETE TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'hod'::text])));

--
-- Name: student_attendance_records att_records_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY att_records_insert ON public.student_attendance_records FOR INSERT TO authenticated WITH CHECK (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'hod'::text])) OR ((public.get_current_user_role() = 'teacher'::text) AND (EXISTS ( SELECT 1
   FROM (public.class_attendance_sessions s
     JOIN public.profiles p ON ((p.id = student_attendance_records.student_id)))
  WHERE ((s.id = student_attendance_records.session_id) AND (s.teacher_id = auth.uid()) AND public.is_teacher_assigned_to_class_and_subject(auth.uid(), s.class_name, s.subject_code) AND (p.role = 'student'::text) AND (p.status = 'active'::text) AND (p.class_name = s.class_name)))))));

--
-- Name: student_attendance_records att_records_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY att_records_select ON public.student_attendance_records FOR SELECT TO authenticated USING (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'hod'::text, 'coe'::text])) OR ((public.get_current_user_role() = 'teacher'::text) AND (EXISTS ( SELECT 1
   FROM public.class_attendance_sessions s
  WHERE ((s.id = student_attendance_records.session_id) AND ((s.teacher_id = auth.uid()) OR public.is_teacher_assigned_to_class_and_subject(auth.uid(), s.class_name, s.subject_code)))))) OR ((public.get_current_user_role() = 'student'::text) AND (student_id = auth.uid())) OR ((public.get_current_user_role() = 'parent'::text) AND public.is_parent_of(student_id))));

--
-- Name: student_attendance_records att_records_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY att_records_update ON public.student_attendance_records FOR UPDATE TO authenticated USING (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'hod'::text])) OR ((public.get_current_user_role() = 'teacher'::text) AND (EXISTS ( SELECT 1
   FROM public.class_attendance_sessions s
  WHERE ((s.id = student_attendance_records.session_id) AND (s.teacher_id = auth.uid()) AND public.is_teacher_assigned_to_class_and_subject(auth.uid(), s.class_name, s.subject_code) AND (s.created_at >= (now() - '24:00:00'::interval)))))))) WITH CHECK (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'hod'::text])) OR ((public.get_current_user_role() = 'teacher'::text) AND (EXISTS ( SELECT 1
   FROM public.class_attendance_sessions s
  WHERE ((s.id = student_attendance_records.session_id) AND (s.teacher_id = auth.uid()) AND public.is_teacher_assigned_to_class_and_subject(auth.uid(), s.class_name, s.subject_code) AND (s.created_at >= (now() - '24:00:00'::interval))))))));

--
-- Name: class_attendance_sessions att_sessions_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY att_sessions_delete ON public.class_attendance_sessions FOR DELETE TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'hod'::text])));

--
-- Name: class_attendance_sessions att_sessions_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY att_sessions_insert ON public.class_attendance_sessions FOR INSERT TO authenticated WITH CHECK (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'hod'::text])) OR ((public.get_current_user_role() = 'teacher'::text) AND (teacher_id = auth.uid()) AND public.is_teacher_assigned_to_class_and_subject(auth.uid(), class_name, subject_code))));

--
-- Name: class_attendance_sessions att_sessions_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY att_sessions_select ON public.class_attendance_sessions FOR SELECT TO authenticated USING (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'hod'::text, 'coe'::text])) OR ((public.get_current_user_role() = 'teacher'::text) AND ((teacher_id = auth.uid()) OR public.is_teacher_assigned_to_class_and_subject(auth.uid(), class_name, subject_code)))));

--
-- Name: class_attendance_sessions att_sessions_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY att_sessions_update ON public.class_attendance_sessions FOR UPDATE TO authenticated USING (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'hod'::text])) OR ((public.get_current_user_role() = 'teacher'::text) AND (teacher_id = auth.uid()) AND public.is_teacher_assigned_to_class_and_subject(auth.uid(), class_name, subject_code) AND (created_at >= (now() - '24:00:00'::interval))))) WITH CHECK (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'hod'::text])) OR ((public.get_current_user_role() = 'teacher'::text) AND (teacher_id = auth.uid()) AND public.is_teacher_assigned_to_class_and_subject(auth.uid(), class_name, subject_code) AND (created_at >= (now() - '24:00:00'::interval)))));

--
-- Name: audit_logs audit_logs_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_logs_insert ON public.audit_logs FOR INSERT TO authenticated WITH CHECK ((auth.uid() IS NOT NULL));

--
-- Name: audit_logs audit_logs_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_logs_select ON public.audit_logs FOR SELECT TO authenticated USING ((public.get_current_user_role() = 'admin'::text));

--
-- Name: institutional_broadcasts broadcasts_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY broadcasts_delete ON public.institutional_broadcasts FOR DELETE TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text])));

--
-- Name: institutional_broadcasts broadcasts_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY broadcasts_insert ON public.institutional_broadcasts FOR INSERT TO authenticated WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text])));

--
-- Name: institutional_broadcasts broadcasts_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY broadcasts_select ON public.institutional_broadcasts FOR SELECT TO authenticated USING (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text])) OR ((published_at <= now()) AND (((target_class IS NULL) AND (target_department IS NULL) AND ((target_audience = 'All'::text) OR ((target_audience = 'Students'::text) AND (public.get_current_user_role() = 'student'::text)) OR ((target_audience = 'Parents'::text) AND (public.get_current_user_role() = 'parent'::text)) OR ((target_audience = 'Faculty'::text) AND (public.get_current_user_role() = ANY (ARRAY['teacher'::text, 'hod'::text]))))) OR (((target_class IS NOT NULL) OR (target_department IS NOT NULL)) AND (((public.get_current_user_role() = 'student'::text) AND (target_audience = ANY (ARRAY['All'::text, 'Students'::text])) AND (EXISTS ( SELECT 1
   FROM public.profiles me
  WHERE ((me.id = auth.uid()) AND ((institutional_broadcasts.target_class IS NULL) OR (me.class_name = institutional_broadcasts.target_class)) AND ((institutional_broadcasts.target_department IS NULL) OR (me.department = institutional_broadcasts.target_department)))))) OR ((public.get_current_user_role() = 'parent'::text) AND (target_audience = ANY (ARRAY['All'::text, 'Parents'::text])) AND public._parent_has_child_in(target_class, target_department)) OR ((public.get_current_user_role() = ANY (ARRAY['teacher'::text, 'hod'::text])) AND (target_audience = ANY (ARRAY['All'::text, 'Faculty'::text])) AND ((target_class IS NULL) OR public.is_teacher_assigned_to_class(auth.uid(), target_class)))))))));

--
-- Name: institutional_broadcasts broadcasts_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY broadcasts_update ON public.institutional_broadcasts FOR UPDATE TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text])));

--
-- Name: certificates certificates_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY certificates_select ON public.certificates FOR SELECT TO authenticated USING (((student_id = auth.uid()) OR (public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'receptionist'::text]))));

--
-- Name: disciplinary_incidents discipline_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY discipline_insert ON public.disciplinary_incidents FOR INSERT TO authenticated WITH CHECK (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'teacher'::text, 'hod'::text, 'hostel_warden'::text])) AND (status = 'Pending Review'::text) AND (action_taken IS NULL) AND (reported_by_user = auth.uid())));

--
-- Name: disciplinary_incidents discipline_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY discipline_select ON public.disciplinary_incidents FOR SELECT TO authenticated USING (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text])) OR ((public.get_current_user_role() = ANY (ARRAY['teacher'::text, 'hod'::text, 'hostel_warden'::text])) AND (reported_by_user = auth.uid()))));

--
-- Name: exam_invigilators exam_invig_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY exam_invig_select ON public.exam_invigilators FOR SELECT TO authenticated USING (((teacher_id = auth.uid()) OR (public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'coe'::text, 'hod'::text]))));

--
-- Name: exam_registrations exam_reg_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY exam_reg_select ON public.exam_registrations FOR SELECT TO authenticated USING (((student_id = auth.uid()) OR public.is_parent_of(student_id) OR (public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'coe'::text, 'hod'::text, 'teacher'::text]))));

--
-- Name: exam_results exam_results_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY exam_results_delete ON public.exam_results FOR DELETE TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'coe'::text])));

--
-- Name: exam_results exam_results_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY exam_results_insert ON public.exam_results FOR INSERT TO authenticated WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'coe'::text])));

--
-- Name: exam_results exam_results_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY exam_results_select ON public.exam_results FOR SELECT TO authenticated USING (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'coe'::text])) OR ((public.get_current_user_role() = ANY (ARRAY['teacher'::text, 'hod'::text])) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = exam_results.student_id) AND public.is_teacher_assigned_to_class(auth.uid(), p.class_name))))) OR ((is_published = true) AND ((student_id = auth.uid()) OR public.is_parent_of(student_id)))));

--
-- Name: exam_results exam_results_teacher_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY exam_results_teacher_insert ON public.exam_results FOR INSERT TO authenticated WITH CHECK (((public.get_current_user_role() = ANY (ARRAY['teacher'::text, 'hod'::text])) AND (COALESCE(is_published, false) = false) AND public.is_teacher_assigned_to_class(auth.uid(), class_name)));

--
-- Name: exam_results exam_results_teacher_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY exam_results_teacher_update ON public.exam_results FOR UPDATE TO authenticated USING (((public.get_current_user_role() = ANY (ARRAY['teacher'::text, 'hod'::text])) AND (COALESCE(is_published, false) = false) AND public.is_teacher_assigned_to_class(auth.uid(), class_name))) WITH CHECK (((public.get_current_user_role() = ANY (ARRAY['teacher'::text, 'hod'::text])) AND (COALESCE(is_published, false) = false) AND public.is_teacher_assigned_to_class(auth.uid(), class_name)));

--
-- Name: exam_results exam_results_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY exam_results_update ON public.exam_results FOR UPDATE TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'coe'::text]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'coe'::text])));

--
-- Name: exam_rooms exam_rooms_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY exam_rooms_select ON public.exam_rooms FOR SELECT TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'coe'::text, 'hod'::text, 'teacher'::text])));

--
-- Name: exam_schedules exam_schedules_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY exam_schedules_delete ON public.exam_schedules FOR DELETE TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'coe'::text])));

--
-- Name: exam_schedules exam_schedules_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY exam_schedules_insert ON public.exam_schedules FOR INSERT TO authenticated WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'coe'::text])));

--
-- Name: exam_schedules exam_schedules_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY exam_schedules_select ON public.exam_schedules FOR SELECT TO authenticated USING (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'coe'::text, 'teacher'::text, 'hod'::text])) OR (EXISTS ( SELECT 1
   FROM public.exams e
  WHERE ((e.id = exam_schedules.exam_id) AND (e.timetable_published = true))))));

--
-- Name: exam_schedules exam_schedules_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY exam_schedules_update ON public.exam_schedules FOR UPDATE TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'coe'::text]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'coe'::text])));

--
-- Name: exam_seating exam_seating_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY exam_seating_select ON public.exam_seating FOR SELECT TO authenticated USING (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'coe'::text, 'hod'::text, 'teacher'::text])) OR (((student_id = auth.uid()) OR public.is_parent_of(student_id)) AND (EXISTS ( SELECT 1
   FROM public.exams e
  WHERE ((e.id = exam_seating.exam_id) AND e.hall_ticket_published))))));

--
-- Name: exams exams_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY exams_delete ON public.exams FOR DELETE TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'coe'::text])));

--
-- Name: exams exams_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY exams_insert ON public.exams FOR INSERT TO authenticated WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'coe'::text])));

--
-- Name: exams exams_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY exams_select ON public.exams FOR SELECT TO authenticated USING (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'coe'::text, 'teacher'::text, 'hod'::text])) OR COALESCE(is_published, false) OR COALESCE(timetable_published, false) OR COALESCE(hall_ticket_published, false) OR COALESCE(results_published, false)));

--
-- Name: exams exams_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY exams_update ON public.exams FOR UPDATE TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'coe'::text]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'coe'::text])));

--
-- Name: fee_adjustments fee_adjustments_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fee_adjustments_read ON public.fee_adjustments FOR SELECT TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'finance_manager'::text, 'financier'::text, 'accountant'::text])));

--
-- Name: fee_heads fee_heads_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fee_heads_read ON public.fee_heads FOR SELECT TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'finance_manager'::text, 'financier'::text, 'accountant'::text])));

--
-- Name: fee_heads fee_heads_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fee_heads_write ON public.fee_heads TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'finance_manager'::text]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'finance_manager'::text])));

--
-- Name: fee_payments fee_payments_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fee_payments_insert ON public.fee_payments FOR INSERT TO authenticated WITH CHECK (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'finance_manager'::text, 'financier'::text])) AND (collected_by = auth.uid())));

--
-- Name: fee_payments fee_payments_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fee_payments_select ON public.fee_payments FOR SELECT TO authenticated USING (((student_id = auth.uid()) OR (public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'finance_manager'::text, 'financier'::text, 'accountant'::text])) OR ((public.get_current_user_role() = 'parent'::text) AND public.is_parent_of(student_id))));

--
-- Name: fee_plan_items fee_plan_items_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fee_plan_items_read ON public.fee_plan_items FOR SELECT TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'finance_manager'::text, 'financier'::text, 'accountant'::text])));

--
-- Name: fee_plan_items fee_plan_items_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fee_plan_items_write ON public.fee_plan_items TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'finance_manager'::text]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'finance_manager'::text])));

--
-- Name: fee_plans fee_plans_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fee_plans_read ON public.fee_plans FOR SELECT TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'finance_manager'::text, 'financier'::text, 'accountant'::text])));

--
-- Name: fee_plans fee_plans_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fee_plans_write ON public.fee_plans TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'finance_manager'::text]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'finance_manager'::text])));

--
-- Name: fee_receipts fee_receipts_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fee_receipts_delete ON public.fee_receipts FOR DELETE TO authenticated USING ((public.get_current_user_role() = 'admin'::text));

--
-- Name: fee_receipts fee_receipts_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fee_receipts_insert ON public.fee_receipts FOR INSERT TO authenticated WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'finance_manager'::text, 'accountant'::text])));

--
-- Name: fee_receipts fee_receipts_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fee_receipts_select ON public.fee_receipts FOR SELECT TO authenticated USING (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'finance_manager'::text, 'accountant'::text])) OR (student_id = auth.uid()) OR public.is_parent_of(student_id)));

--
-- Name: fee_receipts fee_receipts_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fee_receipts_update ON public.fee_receipts FOR UPDATE TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'finance_manager'::text]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'finance_manager'::text])));

--
-- Name: fee_payment_reminders fee_reminders_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fee_reminders_delete ON public.fee_payment_reminders FOR DELETE TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'finance_manager'::text])));

--
-- Name: fee_payment_reminders fee_reminders_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fee_reminders_insert ON public.fee_payment_reminders FOR INSERT TO authenticated WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'finance_manager'::text, 'accountant'::text])));

--
-- Name: fee_payment_reminders fee_reminders_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fee_reminders_select ON public.fee_payment_reminders FOR SELECT TO authenticated USING (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'finance_manager'::text, 'accountant'::text])) OR (student_id = auth.uid()) OR public.is_parent_of(student_id)));

--
-- Name: fee_payment_reminders fee_reminders_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fee_reminders_update ON public.fee_payment_reminders FOR UPDATE TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'finance_manager'::text, 'accountant'::text]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'finance_manager'::text, 'accountant'::text])));

--
-- Name: fee_runs fee_runs_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fee_runs_read ON public.fee_runs FOR SELECT TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'finance_manager'::text, 'financier'::text, 'accountant'::text])));

--
-- Name: fee_structures fee_structures_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fee_structures_delete ON public.fee_structures FOR DELETE TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'finance_manager'::text])));

--
-- Name: fee_structures fee_structures_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fee_structures_insert ON public.fee_structures FOR INSERT TO authenticated WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'finance_manager'::text])));

--
-- Name: fee_structures fee_structures_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fee_structures_select ON public.fee_structures FOR SELECT TO anon, authenticated USING (true);

--
-- Name: fee_structures fee_structures_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fee_structures_update ON public.fee_structures FOR UPDATE TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'finance_manager'::text]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'finance_manager'::text])));

--
-- Name: grade_scale_bands grade_bands_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY grade_bands_read ON public.grade_scale_bands FOR SELECT TO authenticated USING (true);

--
-- Name: grade_scales grade_scales_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY grade_scales_read ON public.grade_scales FOR SELECT TO authenticated USING (true);

--
-- Name: hall_tickets hall_tickets_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hall_tickets_delete ON public.hall_tickets FOR DELETE TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'coe'::text])));

--
-- Name: hall_tickets hall_tickets_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hall_tickets_insert ON public.hall_tickets FOR INSERT TO authenticated WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'coe'::text])));

--
-- Name: hall_tickets hall_tickets_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hall_tickets_select ON public.hall_tickets FOR SELECT TO authenticated USING (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'coe'::text, 'teacher'::text, 'hod'::text])) OR (((student_id = auth.uid()) OR public.is_parent_of(student_id)) AND ((exam_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.exams e
  WHERE ((e.id = hall_tickets.exam_id) AND e.hall_ticket_published)))))));

--
-- Name: hall_tickets hall_tickets_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hall_tickets_update ON public.hall_tickets FOR UPDATE TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'coe'::text]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'coe'::text])));

--
-- Name: health_records health_records_manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY health_records_manage ON public.health_records TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text])));

--
-- Name: health_records health_records_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY health_records_select ON public.health_records FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR (public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text]))));

--
-- Name: hostel_allotments hostel_allotments_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hostel_allotments_select ON public.hostel_allotments FOR SELECT TO authenticated USING (((student_id = auth.uid()) OR (public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'hostel_warden'::text]))));

--
-- Name: hostel_out_passes hostel_out_passes_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hostel_out_passes_delete ON public.hostel_out_passes FOR DELETE TO authenticated USING (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'hostel_warden'::text])) OR ((student_id = auth.uid()) AND (warden_status = 'Pending'::text))));

--
-- Name: hostel_out_passes hostel_out_passes_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hostel_out_passes_insert ON public.hostel_out_passes FOR INSERT TO authenticated WITH CHECK (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'hostel_warden'::text])) OR ((public.get_current_user_role() = 'student'::text) AND (student_id = auth.uid()) AND (warden_status = 'Pending'::text))));

--
-- Name: hostel_out_passes hostel_out_passes_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hostel_out_passes_select ON public.hostel_out_passes FOR SELECT TO authenticated USING (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'hostel_warden'::text])) OR (student_id = auth.uid()) OR public.is_parent_of(student_id)));

--
-- Name: hostel_out_passes hostel_out_passes_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hostel_out_passes_update ON public.hostel_out_passes FOR UPDATE TO authenticated USING (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'hostel_warden'::text])) OR ((student_id = auth.uid()) AND (warden_status = 'Pending'::text)) OR (public.is_parent_of(student_id) AND (warden_status = 'Pending'::text)))) WITH CHECK (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'hostel_warden'::text])) OR ((student_id = auth.uid()) AND (warden_status = 'Pending'::text)) OR (public.is_parent_of(student_id) AND (warden_status = 'Pending'::text))));

--
-- Name: hostel_rooms hostel_rooms_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hostel_rooms_delete ON public.hostel_rooms FOR DELETE TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'hostel_warden'::text])));

--
-- Name: hostel_rooms hostel_rooms_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hostel_rooms_insert ON public.hostel_rooms FOR INSERT TO authenticated WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'hostel_warden'::text])));

--
-- Name: hostel_rooms hostel_rooms_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hostel_rooms_select ON public.hostel_rooms FOR SELECT TO authenticated USING (true);

--
-- Name: hostel_rooms hostel_rooms_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hostel_rooms_update ON public.hostel_rooms FOR UPDATE TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'hostel_warden'::text]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'hostel_warden'::text])));

--
-- Name: infirmary_visits infirmary_visits_manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY infirmary_visits_manage ON public.infirmary_visits TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'hostel_warden'::text]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'hostel_warden'::text])));

--
-- Name: institutional_settings institutional_settings_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY institutional_settings_select ON public.institutional_settings FOR SELECT TO authenticated USING (true);

--
-- Name: institutional_settings institutional_settings_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY institutional_settings_update ON public.institutional_settings FOR UPDATE TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text])));

--
-- Name: inventory_transactions inventory_tx_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY inventory_tx_select ON public.inventory_transactions FOR SELECT TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['storekeeper'::text, 'store_manager'::text, 'admin'::text, 'principal'::text, 'finance_manager'::text, 'accountant'::text])));

--
-- PostgreSQL database dump complete
--
