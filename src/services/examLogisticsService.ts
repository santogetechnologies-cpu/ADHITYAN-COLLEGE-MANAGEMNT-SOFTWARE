import { supabase } from '@/lib/supabase';

const sb: any = supabase;
const rpc = async (fn: string, args: Record<string, unknown>) => {
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'The server refused the request.');
  return data;
};

export interface ExamRoom { id: string; name: string; block: string | null; capacity: number; active: boolean }
export interface SeatRow { id: string; exam_date: string; start_time: string; student_id: string; class_name: string | null; subject: string | null; room_id: string; seat_no: number; student_name: string | null; roll_number: string | null }
export interface Invigilator { id: string; exam_date: string; start_time: string; room_id: string; teacher_id: string; teacher_name: string | null }

export interface RevalRequest { id: string; exam_id: string; student_id: string; student_name: string | null; class_name: string | null; subject: string; original_marks: number; max_marks: number; reason: string; status: string; revised_marks: number | null; decision_note: string | null; requested_at: string }

export const examLogisticsService = {
  setRevaluation: (examId: string, open: boolean, deadline: string | null) => rpc('exam_revaluation_set', { p_exam: examId, p_open: open, p_deadline: deadline }),
  requestRevaluation: (examId: string, subject: string, reason: string) => rpc('exam_revaluation_request', { p_exam: examId, p_subject: subject, p_reason: reason }),
  decideRevaluation: (id: string, decision: 'Revise' | 'Keep' | 'Reject', newMarks: number | null, note: string) => rpc('exam_revaluation_decide', { p_id: id, p_decision: decision, p_new_marks: newMarks, p_note: note }),
  async revaluations(examId?: string): Promise<RevalRequest[]> {
    let q = sb.from('exam_revaluation_requests').select('*').order('requested_at', { ascending: false });
    if (examId) q = q.eq('exam_id', examId);
    const { data, error } = await q; if (error) throw new Error(error.message); return data || [];
  },
  createSupplementary: (parentId: string, name: string, start: string, end: string) => rpc('exam_supplementary_create', { p_parent: parentId, p_name: name, p_start: start, p_end: end }),
  supplementaryPapers: (examId: string, firstDate: string, start: string, end: string, room: string) => rpc('exam_supplementary_papers', { p_exam: examId, p_first_date: firstDate, p_start: start, p_end: end, p_room: room }),
  setRegistration: (examId: string, required: boolean, open: boolean, deadline: string | null) => rpc('exam_registration_set', { p_exam: examId, p_required: required, p_open: open, p_deadline: deadline }),
  register: (examId: string, withdraw = false) => rpc('exam_register', { p_exam: examId, p_withdraw: withdraw }),
  registerClass: (examId: string, className: string) => rpc('exam_register_class', { p_exam: examId, p_class: className }),
  async registrations(examId: string): Promise<Array<{ student_id: string; status: string }>> {
    const { data, error } = await sb.from('exam_registrations').select('student_id, status').eq('exam_id', examId);
    if (error) throw new Error(error.message);
    return data || [];
  },
  async rooms(): Promise<ExamRoom[]> {
    const { data, error } = await sb.from('exam_rooms').select('*').order('name');
    if (error) throw new Error(error.message);
    return data || [];
  },
  saveRoom: (r: { id?: string | null; name: string; block?: string; capacity: number; active: boolean }) =>
    rpc('exam_room_save', { p_id: r.id ?? null, p_name: r.name, p_block: r.block ?? null, p_capacity: r.capacity, p_active: r.active }),
  generateSeating: (examId: string, date: string, start: string) => rpc('exam_generate_seating', { p_exam: examId, p_date: date, p_start: start }),
  async seating(examId: string): Promise<SeatRow[]> {
    const { data, error } = await sb.from('exam_seating').select('*').eq('exam_id', examId).order('exam_date').order('start_time').order('room_id').order('seat_no');
    if (error) throw new Error(error.message);
    return data || [];
  },
  async invigilators(examId: string): Promise<Invigilator[]> {
    const { data, error } = await sb.from('exam_invigilators').select('*').eq('exam_id', examId);
    if (error) throw new Error(error.message);
    return data || [];
  },
  assignInvigilator: (examId: string, date: string, start: string, roomId: string, teacherId: string) => rpc('exam_assign_invigilator', { p_exam: examId, p_date: date, p_start: start, p_room: roomId, p_teacher: teacherId }),
  removeInvigilator: (id: string) => rpc('exam_remove_invigilator', { p_id: id }),
  async teachers(): Promise<Array<{ id: string; name: string; department: string | null }>> { return (await rpc('exam_list_teachers', {})).teachers; },
};
