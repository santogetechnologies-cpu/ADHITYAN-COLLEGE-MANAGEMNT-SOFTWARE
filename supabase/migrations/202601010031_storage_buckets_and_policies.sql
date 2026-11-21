-- Storage buckets and their access rules.
-- Private buckets (everything except avatars) are only readable through signed links and these rules.
SET search_path = public, extensions;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('admission-documents', 'admission-documents', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png']),
  ('attachments', 'attachments', false, 20971520, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']),
  ('avatars', 'avatars', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']),
  ('documents', 'documents', false, 52428800, ARRAY['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg']),
  ('naac-evidence', 'naac-evidence', false, 52428800, NULL),
  ('staff_documents', 'staff_documents', false, NULL, NULL),
  ('student_documents', 'student_documents', false, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Fixed here: the teacher-reads-student-file rule compared the student's folder with the PROFILE name instead of the FILE name.
CREATE POLICY storage_objects_select ON storage.objects FOR SELECT TO authenticated
  USING ((((bucket_id = 'attachments'::text) AND (((storage.foldername(name))[1] = (auth.uid())::text) OR (public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text])) OR ((public.safe_cast_uuid((storage.foldername(name))[1]) IS NOT NULL) AND public.is_parent_of(public.safe_cast_uuid((storage.foldername(name))[1]))) OR ((public.get_current_user_role() = ANY (ARRAY['teacher'::text, 'hod'::text])) AND (public.safe_cast_uuid((storage.foldername(name))[1]) IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = public.safe_cast_uuid((storage.foldername(objects.name))[1])) AND (p.role = 'student'::text) AND (p.status = 'active'::text) AND public.is_teacher_assigned_to_class(auth.uid(), p.class_name))))))) OR ((bucket_id = 'documents'::text) AND ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'hr_manager'::text, 'finance_manager'::text, 'accountant'::text, 'coe'::text, 'hod'::text, 'teacher'::text])) OR ((storage.foldername(name))[1] = (auth.uid())::text))) OR ((bucket_id = 'student_documents'::text) AND ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'coe'::text])) OR ((storage.foldername(name))[1] = (auth.uid())::text) OR ((public.safe_cast_uuid((storage.foldername(name))[1]) IS NOT NULL) AND public.is_parent_of(public.safe_cast_uuid((storage.foldername(name))[1]))) OR ((public.get_current_user_role() = ANY (ARRAY['teacher'::text, 'hod'::text])) AND (public.safe_cast_uuid((storage.foldername(name))[1]) IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = public.safe_cast_uuid((storage.foldername(objects.name))[1])) AND (p.role = 'student'::text) AND (p.status = 'active'::text) AND public.is_teacher_assigned_to_class(auth.uid(), p.class_name))))))) OR ((bucket_id = 'staff_documents'::text) AND ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'hr_manager'::text])) OR ((storage.foldername(name))[1] = (auth.uid())::text)))));

CREATE POLICY storage_objects_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK ((((bucket_id = 'attachments'::text) AND (((storage.foldername(name))[1] = (auth.uid())::text) OR (public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text])))) OR ((bucket_id = 'documents'::text) AND ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'hr_manager'::text, 'finance_manager'::text])) OR ((storage.foldername(name))[1] = (auth.uid())::text))) OR ((bucket_id = 'student_documents'::text) AND ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text])) OR ((storage.foldername(name))[1] = (auth.uid())::text))) OR ((bucket_id = 'staff_documents'::text) AND ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'hr_manager'::text])) OR ((storage.foldername(name))[1] = (auth.uid())::text)))));

CREATE POLICY storage_objects_update ON storage.objects FOR UPDATE TO authenticated
  USING (((bucket_id = ANY (ARRAY['documents'::text, 'student_documents'::text, 'staff_documents'::text, 'attachments'::text])) AND (((storage.foldername(name))[1] = (auth.uid())::text) OR (public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text])))))
  WITH CHECK (((bucket_id = ANY (ARRAY['documents'::text, 'student_documents'::text, 'staff_documents'::text, 'attachments'::text])) AND (((storage.foldername(name))[1] = (auth.uid())::text) OR (public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text])))));

CREATE POLICY storage_objects_delete ON storage.objects FOR DELETE TO authenticated
  USING (((bucket_id = ANY (ARRAY['documents'::text, 'student_documents'::text, 'staff_documents'::text, 'attachments'::text])) AND (((storage.foldername(name))[1] = (auth.uid())::text) OR (public.get_current_user_role() = 'admin'::text))));

CREATE POLICY naac_evidence_read ON storage.objects FOR SELECT TO authenticated
  USING (((bucket_id = 'naac-evidence'::text) AND (public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'naac_coordinator'::text, 'hod'::text, 'teacher'::text]))));

CREATE POLICY naac_evidence_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'naac-evidence'::text) AND (public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'naac_coordinator'::text, 'hod'::text, 'teacher'::text]))));

CREATE POLICY naac_evidence_delete ON storage.objects FOR DELETE TO authenticated
  USING (((bucket_id = 'naac-evidence'::text) AND (public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'naac_coordinator'::text]))));

CREATE POLICY adm_docs_read ON storage.objects FOR SELECT TO authenticated
  USING (((bucket_id = 'admission-documents'::text) AND (public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'receptionist'::text]))));

CREATE POLICY adm_docs_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'admission-documents'::text) AND (public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text, 'receptionist'::text]))));

CREATE POLICY adm_docs_delete ON storage.objects FOR DELETE TO authenticated
  USING (((bucket_id = 'admission-documents'::text) AND (public.get_current_user_role() = ANY (ARRAY['admin'::text, 'principal'::text]))));

