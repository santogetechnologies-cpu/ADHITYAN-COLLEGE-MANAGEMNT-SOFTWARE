-- 070: Admission documents (ID proof, mark sheets, photos) move to a PRIVATE bucket.
-- Before they were uploaded to the shared `documents` bucket, which is publicly readable by URL, and when an upload failed the
-- browser stored the whole file as a base64 data URL inside the application record.
-- Staff (admin, principal, receptionist) upload and read through short-lived signed links. Existing files in `documents` are left
-- where they are; re-upload sensitive ones through the new flow and then delete them from the old bucket.
-- Idempotent.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('admission-documents', 'admission-documents', false, 10485760, ARRAY['application/pdf','image/jpeg','image/png'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 10485760, allowed_mime_types = ARRAY['application/pdf','image/jpeg','image/png'];

DROP POLICY IF EXISTS adm_docs_read ON storage.objects;
DROP POLICY IF EXISTS adm_docs_insert ON storage.objects;
DROP POLICY IF EXISTS adm_docs_delete ON storage.objects;
CREATE POLICY adm_docs_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'admission-documents' AND public.get_current_user_role() IN ('admin','principal','receptionist'));
CREATE POLICY adm_docs_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'admission-documents' AND public.get_current_user_role() IN ('admin','principal','receptionist'));
CREATE POLICY adm_docs_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'admission-documents' AND public.get_current_user_role() IN ('admin','principal'));
