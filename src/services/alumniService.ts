import { supabase } from '@/lib/supabase';
import { handleSupabaseError } from './api/errors';

export interface AlumniProfileItem {
  id: string;
  name: string;
  graduation_year: number;
  degree: string;
  current_company?: string;
  designation?: string;
  email?: string;
  phone?: string;
  linkedin_url?: string;
}

export interface AlumniEventItem {
  id: string;
  event_name: string;
  event_date: string;
  location?: string;
  description?: string;
  registered_count?: number;
}

export interface AlumniDonationItem {
  id: string;
  alumni_id?: string;
  donor_name?: string;
  amount: number;
  purpose?: string;
  created_at: string;
}

export const alumniService = {
  async listProfiles(): Promise<AlumniProfileItem[]> {
    try {
      const { data, error } = await supabase
        .from('alumni_profiles')
        .select('*')
        .order('graduation_year', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to fetch alumni directory');
    }
  },

  async createProfile(input: Omit<AlumniProfileItem, 'id'>): Promise<AlumniProfileItem> {
    try {
      const { data, error } = await supabase
        .from('alumni_profiles')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to add alumni member');
    }
  },

  async listEvents(): Promise<AlumniEventItem[]> {
    try {
      const { data, error } = await supabase
        .from('alumni_events')
        .select('*')
        .order('event_date', { ascending: true });

      if (error) throw error;
      return (data || []).map((e: any) => ({
        id: e.id,
        event_name: e.event_name,
        event_date: e.event_date,
        location: e.location || 'Campus Auditorium',
        description: e.description,
        registered_count: e.registered_count || 0,
      }));
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to load alumni events');
    }
  },

  async recordDonation(input: { donor_name: string; amount: number; purpose?: string }): Promise<void> {
    try {
      const { error } = await supabase
        .from('alumni_donations')
        .insert({
          amount: input.amount,
          purpose: input.purpose || 'Scholarship & Lab Development Fund',
        });

      if (error) throw error;
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to record alumni contribution');
    }
  },
};

export default alumniService;

