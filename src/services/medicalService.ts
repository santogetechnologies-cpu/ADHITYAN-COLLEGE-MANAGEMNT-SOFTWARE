import { supabase } from '@/lib/supabase';
import { handleSupabaseError } from './api/errors';

export interface HealthRecordItem {
  id: string;
  student_id: string;
  student_name?: string;
  blood_group?: string;
  allergies?: string[];
  chronic_conditions?: string[];
  emergency_contact?: string;
  last_checkup_date?: string;
}

export interface InfirmaryVisitItem {
  id: string;
  student_id: string;
  student_name?: string;
  visit_date: string;
  reason: string;
  symptoms?: string[];
  treatment?: string;
  medication_given?: string;
  follow_up_needed?: boolean;
}

export const medicalService = {
  async listHealthRecords(): Promise<HealthRecordItem[]> {
    try {
      const { data, error } = await supabase
        .from('health_records')
        .select('*');

      if (error) throw error;

      const { data: students } = await supabase.from('profiles').select('id, name');
      const studentMap = new Map((students || []).map(s => [s.id, s.name]));

      return (data || []).map((h: any) => ({
        id: h.id,
        student_id: h.student_id,
        student_name: studentMap.get(h.student_id) || 'Student Candidate',
        blood_group: h.blood_group || 'O+',
        allergies: h.allergies || [],
        chronic_conditions: h.chronic_conditions || [],
        emergency_contact: h.emergency_contact,
        last_checkup_date: h.last_checkup_date,
      }));
    } catch (error) {
      throw handleSupabaseError(error, 'Access Denied: You do not have authorization to view sensitive medical records.');
    }
  },

  async recordInfirmaryVisit(input: {
    student_id: string;
    reason: string;
    treatment?: string;
    medication_given?: string;
  }): Promise<void> {
    try {
      const { error } = await supabase
        .from('infirmary_visits')
        .insert({
          student_id: input.student_id,
          reason: input.reason.trim(),
          treatment: input.treatment,
          medication_given: input.medication_given,
          visit_date: new Date().toISOString(),
        });

      if (error) throw error;
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to log clinic infirmary visit');
    }
  },

  async listInfirmaryVisits(): Promise<InfirmaryVisitItem[]> {
    try {
      const { data, error } = await supabase
        .from('infirmary_visits')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const { data: students } = await supabase.from('profiles').select('id, name');
      const studentMap = new Map((students || []).map(s => [s.id, s.name]));

      return (data || []).map((v: any) => ({
        id: v.id,
        student_id: v.student_id,
        student_name: studentMap.get(v.student_id) || 'Student Candidate',
        visit_date: v.visit_date || v.created_at,
        reason: v.reason || 'Medical Consultation',
        treatment: v.treatment,
        medication_given: v.medication_given,
      }));
    } catch (error) {
      throw handleSupabaseError(error, 'Access Denied: Protected clinical records');
    }
  },
};

export default medicalService;

