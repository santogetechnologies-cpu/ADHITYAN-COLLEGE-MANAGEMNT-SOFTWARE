import { supabase } from '@/lib/supabase';
import { handleSupabaseError } from './api/errors';

export interface ReceptionVisitorItem {
  id: string;
  visitor_name: string;
  phone?: string;
  purpose: string;
  host_name?: string;
  check_in_time: string;
  check_out_time?: string | null;
  status: 'checked_in' | 'checked_out';
}

export interface ReceptionEnquiryItem {
  id: string;
  caller_name: string;
  phone?: string;
  enquiry_type: string;
  details: string;
  status: 'pending' | 'resolved' | 'escalated';
  created_at: string;
}

export const receptionService = {
  async listVisitors(statusFilter?: string): Promise<ReceptionVisitorItem[]> {
    try {
      let query = supabase
        .from('reception_visitors')
        .select('*')
        .order('check_in_time', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((v: any) => ({
        id: v.id,
        visitor_name: v.visitor_name,
        phone: v.phone,
        purpose: v.purpose || 'Official Visit',
        host_name: v.host_name || 'Administration',
        check_in_time: v.check_in_time || v.created_at,
        check_out_time: v.check_out_time,
        status: (v.check_out_time ? 'checked_out' : 'checked_in') as any,
      }));
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to fetch visitor logs');
    }
  },

  async checkInVisitor(input: { visitor_name: string; phone?: string; purpose: string; host_name?: string }): Promise<ReceptionVisitorItem> {
    try {
      const { data, error } = await supabase
        .from('reception_visitors')
        .insert({
          visitor_name: input.visitor_name.trim(),
          phone: input.phone,
          purpose: input.purpose.trim(),
          host_name: input.host_name,
          check_in_time: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return {
        ...data,
        status: 'checked_in',
      };
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to check in visitor');
    }
  },

  async checkOutVisitor(visitorId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('reception_visitors')
        .update({
          check_out_time: new Date().toISOString(),
        })
        .eq('id', visitorId);

      if (error) throw error;
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to check out visitor');
    }
  },

  async listEnquiries(): Promise<ReceptionEnquiryItem[]> {
    try {
      const { data, error } = await supabase
        .from('reception_enquiries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map((e: any) => ({
        id: e.id,
        caller_name: e.caller_name,
        phone: e.phone,
        enquiry_type: e.enquiry_type || 'General Admission',
        details: e.details,
        status: (e.status as any) || 'pending',
        created_at: e.created_at,
      }));
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to load reception enquiries');
    }
  },
};

export default receptionService;

