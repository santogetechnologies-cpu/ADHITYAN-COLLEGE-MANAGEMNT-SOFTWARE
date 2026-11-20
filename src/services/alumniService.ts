import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export interface DonationRow { id: string; alumni_id: string | null; donor_name: string; amount: number; cause: string; transaction_id: string | null; payment_mode: string | null; status: string; donated_at: string }
export interface MentorshipRow { id: string; mentor_id: string; mentee_name: string; domain: string; start_date: string; duration_months: number | null; status: string; notes: string | null; mentor?: { first_name: string; last_name: string; company: string | null } | null }

export const alumniService = {
  async listDonations(): Promise<DonationRow[]> {
    const { data, error } = await sb.from('alumni_donations').select('*').order('donated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map((d: any) => ({ ...d, amount: Number(d.amount) }));
  },
  async recordDonation(d: { donor_name: string; amount: number; cause: string; alumni_id?: string | null; payment_mode?: string; transaction_id?: string; status?: string }): Promise<void> {
    const { error } = await sb.from('alumni_donations').insert({ ...d, alumni_id: d.alumni_id || null });
    if (error) throw new Error(error.message);
  },
  async setDonationStatus(id: string, status: string): Promise<void> {
    const { error } = await sb.from('alumni_donations').update({ status }).eq('id', id);
    if (error) throw new Error(error.message);
  },
  async listMentorships(): Promise<MentorshipRow[]> {
    const { data, error } = await sb.from('alumni_mentorships').select('*, mentor:alumni_profiles(first_name,last_name,company)').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },
  async createMentorship(m: { mentor_id: string; mentee_name: string; domain: string; duration_months?: number | null; notes?: string }): Promise<void> {
    const { error } = await sb.from('alumni_mentorships').insert(m);
    if (error) throw new Error(error.message);
  },
  async setMentorshipStatus(id: string, status: string): Promise<void> {
    const { error } = await sb.from('alumni_mentorships').update({ status }).eq('id', id);
    if (error) throw new Error(error.message);
  },
  async setEventStatus(id: string, status: string): Promise<void> {
    const { error } = await sb.from('alumni_events').update({ status }).eq('id', id);
    if (error) throw new Error(error.message);
  },
};
