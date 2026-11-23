import { supabase } from '@/lib/supabase';

const sb: any = supabase;
const ok = (data: any, error: any, fallback: string) => {
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || fallback);
  return data;
};

export interface GradeBand { min_pct: number; grade: string; grade_point: number }
export interface StudentGpa { cgpa: number | null; credits: number; arrears: number; scale_max: number; terms: Array<{ exam_id: string; exam: string; credits: number; sgpa: number | null }> }
export interface GpaReportRow { student_id: string; student: string; class: string; subjects: number; failed: number; sgpa: number | null }

export const gpaService = {
  async studentGpa(studentId: string): Promise<StudentGpa> {
    const { data, error } = await sb.rpc('student_gpa', { p_student: studentId });
    return ok(data, error, 'Could not compute GPA');
  },
  async classReport(examId: string): Promise<GpaReportRow[]> {
    const { data, error } = await sb.rpc('exam_gpa_report', { p_exam: examId });
    return ok(data, error, 'Could not build the report').rows;
  },
  async bands(): Promise<GradeBand[]> {
    const { data: scale } = await sb.from('grade_scales').select('id').eq('is_default', true).maybeSingle();
    if (!scale) return [];
    const { data, error } = await sb.from('grade_scale_bands').select('min_pct, grade, grade_point').eq('scale_id', scale.id).order('min_pct', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map((b: any) => ({ min_pct: Number(b.min_pct), grade: b.grade, grade_point: Number(b.grade_point) }));
  },
  async saveBands(bands: GradeBand[]): Promise<void> {
    const { data, error } = await sb.rpc('grade_scale_save', { p_bands: bands });
    ok(data, error, 'The grade scale was not saved');
  },
};
