import { supabase } from '@/lib/supabase';

export const ADMISSION_BUCKET = 'admission-documents';
const PREFIX = `private:${ADMISSION_BUCKET}/`;

/** Uploads an admission document to the private bucket and returns the reference to store on the application (not a public URL). */
export async function uploadAdmissionDocument(file: File, folder: string): Promise<string> {
  if (file.size > 10 * 1024 * 1024) throw new Error('The file is larger than 10 MB.');
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${folder.replace(/[^\w-]/g, '_')}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(ADMISSION_BUCKET).upload(path, file, { upsert: false, contentType: file.type || undefined });
  if (error) throw new Error(error.message);
  return PREFIX + path;
}

/** Turns a stored reference into something a browser can open. Legacy public URLs and data URLs are returned unchanged. */
export async function resolveDocumentUrl(ref: string): Promise<string> {
  if (!ref || !ref.startsWith(PREFIX)) return ref;
  const { data, error } = await supabase.storage.from(ADMISSION_BUCKET).createSignedUrl(ref.slice(PREFIX.length), 300);
  if (error || !data?.signedUrl) throw new Error(error?.message || 'The document is not available.');
  return data.signedUrl;
}
