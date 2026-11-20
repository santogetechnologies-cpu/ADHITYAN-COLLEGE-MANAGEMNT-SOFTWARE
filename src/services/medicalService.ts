import { supabase } from '@/lib/supabase';

const sb: any = supabase;
const fail = (e: any): never => { throw new Error(e?.message || 'Request failed'); };

export interface HealthRecordRow { id: string; name: string; role: string; class_name: string | null; roll_no: string | null; blood_group: string | null; allergies: string[]; medical_conditions: string[]; emergency_contact_name: string | null; emergency_contact_phone: string | null; vaccination_status: string; notes: string | null; updated_at: string }
export interface VisitRow { id: string; patient_name: string; patient_role: string; student_ref: string | null; class_name: string | null; visit_date: string; symptoms: string; treatment: string | null; attending_staff: string; follow_up_date: string | null; status: string }
export interface ContactRow { id: string; label: string; phone: string; note: string | null; sort_order: number }
export interface AlertRow { id: string; title: string; message: string; severity: string; active: boolean; created_at: string }

export const medicalService = {
  async records(): Promise<HealthRecordRow[]> { const { data, error } = await sb.from('health_records').select('*').order('name'); if (error) fail(error); return data || []; },
  async saveRecord(r: Partial<HealthRecordRow> & { name: string }): Promise<void> {
    const row = { ...r, updated_at: new Date().toISOString() };
    const { error } = r.id ? await sb.from('health_records').update(row).eq('id', r.id) : await sb.from('health_records').insert(row);
    if (error) fail(error.code === '23505' ? { message: 'A health record already exists for that student ID.' } : error);
  },
  async visits(): Promise<VisitRow[]> { const { data, error } = await sb.from('infirmary_visits').select('*').order('visit_date', { ascending: false }); if (error) fail(error); return data || []; },
  async logVisit(v: Partial<VisitRow> & { patient_name: string; symptoms: string; attending_staff: string }): Promise<void> {
    const { error } = await sb.from('infirmary_visits').insert(v); if (error) fail(error);
  },
  async setVisitStatus(id: string, status: string): Promise<void> { const { error } = await sb.from('infirmary_visits').update({ status }).eq('id', id); if (error) fail(error); },
  async contacts(): Promise<ContactRow[]> { const { data, error } = await sb.from('medical_emergency_contacts').select('*').order('sort_order').order('label'); if (error) fail(error); return data || []; },
  async saveContact(c: { label: string; phone: string; note?: string }): Promise<void> { const { error } = await sb.from('medical_emergency_contacts').insert(c); if (error) fail(error); },
  async deleteContact(id: string): Promise<void> { const { error } = await sb.from('medical_emergency_contacts').delete().eq('id', id); if (error) fail(error); },
  async alerts(): Promise<AlertRow[]> { const { data, error } = await sb.from('wellness_alerts').select('*').order('created_at', { ascending: false }); if (error) fail(error); return data || []; },
  async saveAlert(a: { title: string; message: string; severity: string }): Promise<void> { const { error } = await sb.from('wellness_alerts').insert(a); if (error) fail(error); },
  async setAlertActive(id: string, active: boolean): Promise<void> { const { error } = await sb.from('wellness_alerts').update({ active }).eq('id', id); if (error) fail(error); },
};
