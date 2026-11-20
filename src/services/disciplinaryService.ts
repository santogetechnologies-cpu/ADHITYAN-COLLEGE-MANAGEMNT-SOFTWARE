import { supabase } from '@/lib/supabase';
import { handleSupabaseError } from './api/errors';

export interface DisciplinaryIncidentItem {
  id: string;
  student_id: string;
  student_name?: string;
  incident_date: string;
  description: string;
  severity?: 'minor' | 'moderate' | 'severe';
  action_taken?: string;
  status: 'reported' | 'under_investigation' | 'resolved' | 'action_taken';
  reported_by?: string;
}

export const disciplinaryService = {
  async listIncidents(statusFilter?: string): Promise<DisciplinaryIncidentItem[]> {
    try {
      let query = supabase
        .from('disciplinary_incidents')
        .select('*')
        .order('incident_date', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      const { data: students } = await supabase.from('profiles').select('id, name');
      const studentMap = new Map((students || []).map(s => [s.id, s.name]));

      return (data || []).map((i: any) => ({
        id: i.id,
        student_id: i.student_id,
        student_name: studentMap.get(i.student_id) || 'Student Candidate',
        incident_date: i.incident_date,
        description: i.description,
        severity: i.severity || 'moderate',
        action_taken: i.action_taken,
        status: (i.status as any) || 'reported',
        reported_by: i.reported_by || 'Faculty Member',
      }));
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to fetch disciplinary incidents');
    }
  },

  async reportIncident(input: { student_id: string; description: string; severity?: string }): Promise<void> {
    try {
      const { error } = await supabase
        .from('disciplinary_incidents')
        .insert({
          student_id: input.student_id,
          description: input.description.trim(),
          severity: input.severity || 'moderate',
          incident_date: new Date().toISOString().split('T')[0],
          status: 'reported',
        });

      if (error) throw error;
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to report student incident');
    }
  },

  async takeAction(incidentId: string, actionTaken: string, status: string = 'resolved'): Promise<void> {
    try {
      const { error } = await supabase
        .from('disciplinary_incidents')
        .update({
          action_taken: actionTaken.trim(),
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', incidentId);

      if (error) throw error;
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to record disciplinary council action');
    }
  },
};

export default disciplinaryService;

