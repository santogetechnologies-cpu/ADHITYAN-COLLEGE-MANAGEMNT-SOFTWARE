import { supabase } from '@/lib/supabase';
import { handleSupabaseError } from './api/errors';

export interface AdmissionApplicationItem {
  id: string;
  applicant_name: string;
  email: string;
  phone?: string;
  program_applied: string;
  status: 'submitted' | 'under_review' | 'shortlisted' | 'merit_listed' | 'accepted' | 'rejected';
  score?: number;
  documents?: any[];
  fee_paid?: boolean;
  notes?: string;
  created_at?: string;
}

export const admissionService = {
  async listApplications(statusFilter?: string): Promise<AdmissionApplicationItem[]> {
    try {
      let query = supabase
        .from('admission_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((a: any) => ({
        id: a.id,
        applicant_name: a.applicant_name,
        email: a.email,
        phone: a.phone,
        program_applied: a.program_applied,
        status: a.status || 'submitted',
        score: a.score,
        fee_paid: a.fee_paid || false,
        created_at: a.created_at,
      }));
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to fetch admission applications');
    }
  },

  async createApplication(input: {
    applicant_name: string;
    email: string;
    phone?: string;
    program_applied: string;
    score?: number;
  }): Promise<AdmissionApplicationItem> {
    try {
      const { data, error } = await supabase
        .from('admission_applications')
        .insert({
          applicant_name: input.applicant_name.trim(),
          email: input.email.trim().toLowerCase(),
          phone: input.phone,
          program_applied: input.program_applied,
          status: 'submitted',
          score: input.score || 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to submit admission application');
    }
  },

  async updateStatus(id: string, status: string, notes?: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('admission_applications')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      throw handleSupabaseError(error, `Failed to update application status to ${status}`);
    }
  },

  async getMeritList(): Promise<AdmissionApplicationItem[]> {
    try {
      const { data, error } = await supabase
        .from('admission_applications')
        .select('*')
        .gte('score', 60)
        .order('score', { ascending: false });

      if (error) throw error;
      return (data || []).map((a: any) => ({
        id: a.id,
        applicant_name: a.applicant_name,
        email: a.email,
        phone: a.phone,
        program_applied: a.program_applied,
        status: a.status,
        score: a.score,
        fee_paid: a.fee_paid || false,
        created_at: a.created_at,
      }));
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to generate institutional merit list');
    }
  },

  async recordFee(applicationId: string, amount: number, paymentMethod: string = 'online'): Promise<void> {
    try {
      // 1. Record fee row
      await supabase.from('admission_fees').insert({
        application_id: applicationId,
        amount,
        payment_method: paymentMethod,
        payment_status: 'paid',
        receipt_number: `ADM-REC-${Date.now().toString().slice(-6)}`,
      });

      // 2. Mark application fee_paid
      await supabase.from('admission_applications').update({
        fee_paid: true,
        status: 'accepted',
      }).eq('id', applicationId);
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to record admission fee payment');
    }
  },
};

export default admissionService;

