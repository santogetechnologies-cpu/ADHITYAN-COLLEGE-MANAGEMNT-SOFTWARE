import { supabase } from '@/lib/supabase';

const sb: any = supabase;
const BUCKET = 'naac-evidence';
const fail = (e: any): never => { throw new Error(e?.message || 'Request failed'); };

export interface NaacMetric { id: string; criterion_number: number; metric_code: string; title: string; status: 'Pending' | 'In progress' | 'Completed'; academic_year: string | null; quantitative_value: number | null; description: string | null; remarks: string | null; updated_at: string }

export const naacService = {
  async metrics(): Promise<NaacMetric[]> {
    const { data, error } = await sb.from('naac_metrics').select('*').order('metric_code');
    if (error) fail(error);
    return data || [];
  },
  async addMetric(m: { criterion_number: number; metric_code: string; title: string }): Promise<void> {
    const { error } = await sb.from('naac_metrics').insert(m);
    if (error) fail(error.code === '23505' ? { message: `Metric ${m.metric_code} already exists.` } : error);
  },
  async updateMetric(id: string, patch: Partial<Pick<NaacMetric, 'status' | 'academic_year' | 'quantitative_value' | 'description' | 'remarks' | 'title'>>): Promise<void> {
    const { error } = await sb.from('naac_metrics').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) fail(error);
  },
  async deleteMetric(id: string): Promise<void> {
    const { error } = await sb.from('naac_metrics').delete().eq('id', id);
    if (error) fail(error);
  },
  /** Uploads the real file to the private bucket and records it. Rolls the file back if the row cannot be saved. */
  async addEvidence(file: File, meta: { title: string; criterion: number; metricCode: string; evidenceType: string; tags: string[]; userId?: string }): Promise<void> {
    if (file.size > 50 * 1024 * 1024) throw new Error('File is larger than 50 MB.');
    const safe = file.name.replace(/[^\w.\-]+/g, '_');
    const path = `criterion-${meta.criterion}/${Date.now()}_${safe}`;
    const up = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false, contentType: file.type || undefined });
    if (up.error) fail(up.error);
    const { error } = await sb.from('naac_documents').insert({
      title: meta.title, filename: file.name, file_url: path, criterion_number: meta.criterion, metric_code: meta.metricCode,
      evidence_type: meta.evidenceType, file_type: file.name.split('.').pop()?.toUpperCase() || 'FILE',
      file_size: file.size >= 1048576 ? `${(file.size / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`,
      tags: meta.tags, uploaded_by: meta.userId ?? null });
    if (error) { await supabase.storage.from(BUCKET).remove([path]); fail(error); }
  },
  async signedUrl(path: string, download?: string): Promise<string> {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 120, download ? { download } : undefined);
    if (error || !data?.signedUrl) fail(error || { message: 'File is not available.' });
    return data!.signedUrl;
  },
  async deleteEvidence(id: string, path?: string | null): Promise<void> {
    const { error } = await sb.from('naac_documents').delete().eq('id', id);
    if (error) fail(error);
    if (path) await supabase.storage.from(BUCKET).remove([path]);
  },
};
