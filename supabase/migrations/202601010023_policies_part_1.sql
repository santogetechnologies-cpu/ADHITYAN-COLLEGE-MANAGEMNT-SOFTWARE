-- Row level security policies, part 1 of 3
-- Generated from the verified schema. Run as is; do not edit. Safe to run once on an EMPTY database.
SET check_function_bodies = false;
SET search_path = public, extensions;

SET check_function_bodies = false;

--
-- Name: admission_applications Admins and receptionists can manage admissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and receptionists can manage admissions" ON public.admission_applications TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'receptionist'::text])));

--
-- Name: calendar_events Admins and teachers can manage events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and teachers can manage events" ON public.calendar_events TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'teacher'::text])));

--
-- Name: feedback_submissions Admins and teachers can view feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and teachers can view feedback" ON public.feedback_submissions FOR SELECT TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'teacher'::text])));

--
-- Name: alumni_events Admins can manage alumni events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage alumni events" ON public.alumni_events TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text])));

--
-- Name: alumni_profiles Admins can manage alumni profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage alumni profiles" ON public.alumni_profiles TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text])));

--
-- Name: departments Admins can manage departments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage departments" ON public.departments TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text])));

--
-- Name: parent_student_links Admins can manage parent_student_links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage parent_student_links" ON public.parent_student_links TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text])));

--
-- Name: sections Admins can manage sections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage sections" ON public.sections TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text])));

--
-- Name: concerns Admins can update concerns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update concerns" ON public.concerns FOR UPDATE TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text])));

--
-- Name: alumni_donations Admins can view donations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view donations" ON public.alumni_donations TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'financier'::text, 'finance_manager'::text])));

--
-- Name: admission_fees Admissions and finance staff can manage admission fees; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admissions and finance staff can manage admission fees" ON public.admission_fees TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'financier'::text, 'finance_manager'::text, 'accountant'::text])));

--
-- Name: admission_entrance_tests Admissions staff can manage entrance tests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admissions staff can manage entrance tests" ON public.admission_entrance_tests TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'receptionist'::text])));

--
-- Name: profiles Allow insert on user registration; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow insert on user registration" ON public.profiles FOR INSERT TO authenticated WITH CHECK (((id = auth.uid()) OR (public.get_current_user_role() = 'admin'::text)));

--
-- Name: profiles Allow users to update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow users to update own profile" ON public.profiles FOR UPDATE TO authenticated USING (((id = auth.uid()) OR (public.get_current_user_role() = 'admin'::text))) WITH CHECK (((id = auth.uid()) OR (public.get_current_user_role() = 'admin'::text)));

--
-- Name: profiles Allow users to view own profile or admins/staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow users to view own profile or admins/staff" ON public.profiles FOR SELECT TO authenticated USING (((id = auth.uid()) OR (public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'teacher'::text]))));

--
-- Name: feedback_submissions Authenticated can insert feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can insert feedback" ON public.feedback_submissions FOR INSERT TO authenticated WITH CHECK (true);

--
-- Name: daily_teaching_updates Authenticated can read teaching updates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can read teaching updates" ON public.daily_teaching_updates FOR SELECT TO authenticated USING (true);

--
-- Name: teacher_messages Authenticated can send messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can send messages" ON public.teacher_messages FOR INSERT TO authenticated WITH CHECK ((sender_id = auth.uid()));

--
-- Name: alumni_events Authenticated can view alumni events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can view alumni events" ON public.alumni_events FOR SELECT TO authenticated USING (true);

--
-- Name: book_issues Authenticated can view book issues; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can view book issues" ON public.book_issues FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR (public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'teacher'::text, 'librarian'::text])) OR ((public.get_current_user_role() = 'parent'::text) AND public.is_parent_of(user_id))));

--
-- Name: library_books Authenticated can view books; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can view books" ON public.library_books FOR SELECT TO authenticated USING (true);

--
-- Name: departments Authenticated can view departments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can view departments" ON public.departments FOR SELECT TO authenticated USING (true);

--
-- Name: digital_library_resources Authenticated can view digital library resources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can view digital library resources" ON public.digital_library_resources FOR SELECT TO authenticated USING (true);

--
-- Name: calendar_events Authenticated can view events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can view events" ON public.calendar_events FOR SELECT TO authenticated USING (true);

--
-- Name: sections Authenticated can view sections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can view sections" ON public.sections FOR SELECT TO authenticated USING (true);

--
-- Name: sports_events Authenticated can view sports events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can view sports events" ON public.sports_events FOR SELECT TO authenticated USING (true);

--
-- Name: sports_teams Authenticated can view sports teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can view sports teams" ON public.sports_teams FOR SELECT TO authenticated USING (true);

--
-- Name: timetables Authenticated can view timetables; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can view timetables" ON public.timetables FOR SELECT TO authenticated USING (true);

--
-- Name: finance_transactions Finance officers and admins can manage finance transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Finance officers and admins can manage finance transactions" ON public.finance_transactions TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['financier'::text, 'finance_manager'::text, 'accountant'::text, 'admin'::text, 'principal'::text])));

--
-- Name: student_fees Finance officers can manage fee records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Finance officers can manage fee records" ON public.student_fees TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['financier'::text, 'finance_manager'::text, 'accountant'::text, 'admin'::text, 'principal'::text])));

--
-- Name: parent_student_links Parents can view own parent_student_links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Parents can view own parent_student_links" ON public.parent_student_links FOR SELECT TO authenticated USING (((parent_id = auth.uid()) OR (student_id = auth.uid()) OR (public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'teacher'::text]))));

--
-- Name: departments Public can view departments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view departments" ON public.departments FOR SELECT USING (true);

--
-- Name: sections Public can view sections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view sections" ON public.sections FOR SELECT USING (true);

--
-- Name: book_issues Staff can manage book issues; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage book issues" ON public.book_issues TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'teacher'::text, 'librarian'::text]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'teacher'::text, 'librarian'::text])));

--
-- Name: library_books Staff can manage books; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage books" ON public.library_books TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'teacher'::text, 'librarian'::text]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'teacher'::text, 'librarian'::text])));

--
-- Name: digital_library_resources Staff can manage digital library resources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage digital library resources" ON public.digital_library_resources TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'teacher'::text])));

--
-- Name: reception_appointments Staff can manage reception appointments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage reception appointments" ON public.reception_appointments TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['receptionist'::text, 'admin'::text, 'principal'::text])));

--
-- Name: reception_enquiries Staff can manage reception enquiries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage reception enquiries" ON public.reception_enquiries TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['receptionist'::text, 'admin'::text, 'principal'::text])));

--
-- Name: reception_visitors Staff can manage reception visitors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage reception visitors" ON public.reception_visitors TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['receptionist'::text, 'admin'::text, 'principal'::text])));

--
-- Name: sports_events Staff can manage sports events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage sports events" ON public.sports_events TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'teacher'::text])));

--
-- Name: sports_teams Staff can manage sports teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage sports teams" ON public.sports_teams TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'teacher'::text])));

--
-- Name: timetables Staff can manage timetables; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage timetables" ON public.timetables TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'teacher'::text])));

--
-- Name: store_products Storekeepers and admins can manage products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Storekeepers and admins can manage products" ON public.store_products TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['storekeeper'::text, 'store_manager'::text, 'admin'::text])));

--
-- Name: inventory_items Storekeepers can manage inventory items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Storekeepers can manage inventory items" ON public.inventory_items TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['storekeeper'::text, 'store_manager'::text, 'admin'::text])));

--
-- Name: student_attendance Students and parents can view attendance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students and parents can view attendance" ON public.student_attendance FOR SELECT TO authenticated USING (((student_id = auth.uid()) OR public.is_parent_of(student_id) OR (public.get_current_user_role() = ANY (ARRAY['teacher'::text, 'admin'::text, 'principal'::text]))));

--
-- Name: student_achievements Students and parents view achievements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students and parents view achievements" ON public.student_achievements FOR SELECT TO authenticated USING (((student_id = auth.uid()) OR public.is_parent_of(student_id) OR (public.get_current_user_role() = ANY (ARRAY['teacher'::text, 'admin'::text, 'principal'::text]))));

--
-- Name: student_goals Students and parents view goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students and parents view goals" ON public.student_goals FOR SELECT TO authenticated USING (((student_id = auth.uid()) OR public.is_parent_of(student_id) OR (public.get_current_user_role() = ANY (ARRAY['teacher'::text, 'admin'::text, 'principal'::text]))));

--
-- Name: student_fees Students and parents view student fees; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students and parents view student fees" ON public.student_fees FOR SELECT TO authenticated USING (((student_id = auth.uid()) OR public.is_parent_of(student_id) OR (public.get_current_user_role() = ANY (ARRAY['admin'::text, 'financier'::text, 'finance_manager'::text, 'accountant'::text, 'principal'::text]))));

--
-- Name: wellness_checkins Students and parents view wellness checkins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students and parents view wellness checkins" ON public.wellness_checkins FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.is_parent_of(user_id) OR (public.get_current_user_role() = ANY (ARRAY['teacher'::text, 'admin'::text, 'principal'::text]))));

--
-- Name: learning_content Students and teachers can view published learning content; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students and teachers can view published learning content" ON public.learning_content FOR SELECT TO authenticated USING (((is_published = true) AND ((department IS NULL) OR (department = ( SELECT profiles.department
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) OR (class_name IS NULL) OR (class_name = ( SELECT profiles.class_name
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) OR (public.get_current_user_role() = ANY (ARRAY['teacher'::text, 'admin'::text, 'principal'::text])))));

--
-- Name: student_learning_progress Students can manage own learning progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can manage own learning progress" ON public.student_learning_progress TO authenticated USING (((student_id = auth.uid()) OR (public.get_current_user_role() = ANY (ARRAY['teacher'::text, 'admin'::text, 'principal'::text])))) WITH CHECK (((student_id = auth.uid()) OR (public.get_current_user_role() = ANY (ARRAY['teacher'::text, 'admin'::text, 'principal'::text]))));

--
-- Name: student_mood_checkins Students can submit own mood checkin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can submit own mood checkin" ON public.student_mood_checkins FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));

--
-- Name: student_mood_checkins Students can update own mood checkin for today; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can update own mood checkin for today" ON public.student_mood_checkins FOR UPDATE TO authenticated USING (((user_id = auth.uid()) AND (date = CURRENT_DATE))) WITH CHECK (((user_id = auth.uid()) AND (date = CURRENT_DATE)));

--
-- Name: student_achievements Students can view and manage their achievements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can view and manage their achievements" ON public.student_achievements TO authenticated USING (((student_id = auth.uid()) OR (public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'teacher'::text, 'parent'::text]))));

--
-- Name: student_goals Students can view and manage their goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can view and manage their goals" ON public.student_goals TO authenticated USING (((student_id = auth.uid()) OR (public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'teacher'::text, 'parent'::text]))));

--
-- Name: assignments Students can view class assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can view class assignments" ON public.assignments FOR SELECT TO authenticated USING (((public.get_current_user_role() = ANY (ARRAY['teacher'::text, 'admin'::text, 'principal'::text])) OR (( SELECT profiles.class_name
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = ANY (classes)) OR (classes = '{}'::text[]) OR (classes IS NULL)));

--
-- Name: student_mood_checkins Students can view own mood checkins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can view own mood checkins" ON public.student_mood_checkins FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR (public.get_current_user_role() = ANY (ARRAY['teacher'::text, 'hod'::text, 'admin'::text, 'principal'::text]))));

--
-- Name: student_fees Students view own fees; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students view own fees" ON public.student_fees FOR SELECT TO authenticated USING (((student_id = auth.uid()) OR (public.get_current_user_role() = ANY (ARRAY['admin'::text, 'finance_manager'::text, 'principal'::text]))));

--
-- Name: student_attendance Teachers and admins can manage attendance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers and admins can manage attendance" ON public.student_attendance TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['teacher'::text, 'admin'::text, 'principal'::text]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['teacher'::text, 'admin'::text, 'principal'::text])));

--
-- Name: learning_content Teachers and admins can manage learning content; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers and admins can manage learning content" ON public.learning_content TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['teacher'::text, 'admin'::text, 'principal'::text]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['teacher'::text, 'admin'::text, 'principal'::text])));

--
-- Name: daily_teaching_updates Teachers can create and update teaching updates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can create and update teaching updates" ON public.daily_teaching_updates TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['teacher'::text, 'admin'::text])));

--
-- Name: teacher_messages Teachers can mark messages as read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can mark messages as read" ON public.teacher_messages FOR UPDATE TO authenticated USING (((teacher_id = auth.uid()) OR (sender_id = auth.uid())));

--
-- Name: concerns Users and parents view concerns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users and parents view concerns" ON public.concerns FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR (student_id = auth.uid()) OR ((student_id IS NOT NULL) AND public.is_parent_of(student_id)) OR (public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text]))));

--
-- Name: wellness_checkins Users can insert own wellness checkin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own wellness checkin" ON public.wellness_checkins FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));

--
-- Name: ai_chat_messages Users can manage own ai chat messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own ai chat messages" ON public.ai_chat_messages TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));

--
-- Name: concerns Users can submit own concerns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can submit own concerns" ON public.concerns FOR INSERT TO authenticated WITH CHECK ((((student_id IS NOT NULL) AND ((student_id = auth.uid()) OR public.is_parent_of(student_id))) OR ((user_id IS NOT NULL) AND (user_id = auth.uid())) OR (is_anonymous = true)));

--
-- Name: student_fees Users can view own fee records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own fee records" ON public.student_fees FOR SELECT TO authenticated USING (((student_id = auth.uid()) OR (public.get_current_user_role() = ANY (ARRAY['financier'::text, 'finance_manager'::text, 'accountant'::text, 'admin'::text, 'principal'::text, 'parent'::text]))));

--
-- Name: store_orders Users can view own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own orders" ON public.store_orders FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR (public.get_current_user_role() = ANY (ARRAY['storekeeper'::text, 'store_manager'::text, 'admin'::text]))));

--
-- Name: wellness_checkins Users can view own wellness checkins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own wellness checkins" ON public.wellness_checkins FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR (public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'teacher'::text]))));

--
-- Name: teacher_messages Users can view their sent or received messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their sent or received messages" ON public.teacher_messages FOR SELECT TO authenticated USING (((sender_id = auth.uid()) OR (teacher_id = auth.uid()) OR (public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text]))));

--
-- Name: admission_document_verifications admission_document_verifications_staff_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admission_document_verifications_staff_all ON public.admission_document_verifications TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'receptionist'::text]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'receptionist'::text])));

--
-- Name: admission_form_fields admission_form_fields_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admission_form_fields_read ON public.admission_form_fields FOR SELECT TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'receptionist'::text, 'coe'::text, 'hod'::text])));

--
-- Name: admission_form_fields admission_form_fields_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admission_form_fields_write ON public.admission_form_fields TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text])));

--
-- Name: admission_merit_lists admission_merit_lists_staff_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admission_merit_lists_staff_all ON public.admission_merit_lists TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'receptionist'::text]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'receptionist'::text])));

--
-- Name: admission_quotas admission_quotas_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admission_quotas_read ON public.admission_quotas FOR SELECT TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'receptionist'::text, 'coe'::text, 'hod'::text])));

--
-- Name: admission_quotas admission_quotas_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admission_quotas_write ON public.admission_quotas TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text])));

--
-- Name: admission_required_documents admission_required_documents_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admission_required_documents_read ON public.admission_required_documents FOR SELECT TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'receptionist'::text, 'coe'::text, 'hod'::text])));

--
-- Name: admission_required_documents admission_required_documents_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admission_required_documents_write ON public.admission_required_documents TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text])));

--
-- Name: admission_routes admission_routes_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admission_routes_read ON public.admission_routes FOR SELECT TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'receptionist'::text, 'coe'::text, 'hod'::text])));

--
-- Name: admission_routes admission_routes_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admission_routes_write ON public.admission_routes TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text])));

--
-- Name: admission_seats admission_seats_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admission_seats_read ON public.admission_seats FOR SELECT TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'receptionist'::text, 'coe'::text, 'hod'::text])));

--
-- Name: admission_seats admission_seats_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admission_seats_write ON public.admission_seats TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text])));

--
-- Name: alumni_mentorships alumni_mentorships_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY alumni_mentorships_staff ON public.alumni_mentorships TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'placement_officer'::text]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'placement_officer'::text])));

--
-- PostgreSQL database dump complete
--
