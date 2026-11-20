import { supabase } from '@/lib/supabase';
import { handleSupabaseError } from './api/errors';

/**
 * Examination service, aligned with the real tables (migrations 001/011/022/045):
 *   exams(name, term, academic_year, start_date, end_date, status, course, semester, exam_category,
 *         is_published, timetable_published, hall_ticket_published, results_published)
 *   exam_schedules(exam_id!, subject, class_name, exam_date, start_time, end_time, room, max_marks, passing_marks, subject_code)
 *   exam_results(exam_id, student_id, student_name, class_name, subject, marks_obtained, max_marks, grade, result_status,
 *                is_published, published_at)
 * The previous version read `exams.title` / `total_marks` (do not exist), inserted schedules without the required
 * `exam_id`, saved marks without student_name/class_name, relied on a unique constraint that did not exist, and
 * "published" by writing status = 'published' (rejected by the CHECK constraint).
 * Marks entry and publishing now go through server functions that validate everything and write all-or-nothing.
 */

export interface ExamItem {
  id: string;
  title: string;
  academic_year?: string;
  term?: string;
  exam_type?: string;
  course?: string | null;
  semester?: string | null;
  start_date?: string;
  end_date?: string;
  status?: string;
  /** results visible to students and parents */
  is_published?: boolean;
  timetable_published?: boolean;
  hall_ticket_published?: boolean;
}

export interface ExamScheduleItem {
  id: string;
  exam_id?: string;
  subject: string;
  subject_code?: string | null;
  class_name?: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  room?: string;
  max_marks?: number;
  passing_marks?: number;
  credits?: number | null;
}

export interface ExamResultItem {
  id: string;
  exam_id: string;
  student_id: string;
  student_name?: string;
  roll_number?: string;
  class_name?: string;
  subject: string;
  marks_obtained: number;
  total_marks: number;
  grade?: string;
  remarks?: string;
  result_status?: string;
  is_published?: boolean;
  created_at?: string;
}

export interface ExamAnalyticsSummary {
  totalAppeared: number;
  absent: number;
  passCount: number;
  passPercentage: number;
  averageMarks: number;
  bySubject: Array<{ subject: string; appeared: number; pass_percentage: number; average_percentage: number }>;
  topPerformers: Array<{ id: string; student_name: string; class_name: string; subject: string; marks_obtained: number; total_marks: number; grade: string }>;
}

/** Surfaces a server-side validation payload ({errors:[{student,error}]}) as one readable message. */
function rpcFailure(data: any, fallback: string): Error {
  const detail = Array.isArray(data?.errors) && data.errors.length
    ? ' ' + data.errors.slice(0, 5).map((e: any) => `${e.student ? e.student + ': ' : 'Row ' + e.row + ': '}${e.error}`).join(' ')
    : '';
  return Object.assign(new Error((data?.error || fallback) + detail), { code: data?.code, errors: data?.errors });
}

export interface HallTicketRow {
  id: string; exam_id: string | null; student_id: string; student_name: string; register_number: string; class_name: string; department: string;
  exam_title: string | null; academic_year: string | null; semester: string | null; hall_number: string | null; seat_number: string | null; exam_center: string | null;
  attendance_pct: number | null; has_fee_dues: boolean; is_detained: boolean; detention_reason: string | null; status: string;
  qr_code_token: string; coe_signature_hash: string | null; issued_date: string | null; override_reason: string | null;
}

export const examService = {
  async listExams(): Promise<ExamItem[]> {
    try {
      const { data, error } = await supabase.from('exams').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((e: any) => ({
        id: e.id,
        title: e.name,
        academic_year: e.academic_year,
        term: e.term,
        exam_type: e.exam_category || undefined,
        course: e.course,
        semester: e.semester,
        start_date: e.start_date,
        end_date: e.end_date,
        status: e.status,
        is_published: e.results_published === true,
        timetable_published: e.timetable_published === true,
        hall_ticket_published: e.hall_ticket_published === true,
      }));
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to fetch examinations');
    }
  },

  async createExam(input: { name: string; term: string; academic_year: string; start_date: string; end_date: string; course?: string; semester?: string; exam_category?: string }): Promise<ExamItem> {
    try {
      if (!input.name.trim() || !input.term.trim() || !input.academic_year.trim()) throw new Error('Name, term and academic year are required.');
      if (input.end_date < input.start_date) throw new Error('The end date cannot be before the start date.');
      const { data, error } = await (supabase as any).from('exams').insert({
        name: input.name.trim(), term: input.term.trim(), academic_year: input.academic_year.trim(),
        start_date: input.start_date, end_date: input.end_date, status: 'Scheduled',
        course: input.course || null, semester: input.semester || null, exam_category: input.exam_category || null,
      }).select().single();
      if (error) throw error;
      return { id: data.id, title: data.name, academic_year: data.academic_year, term: data.term, start_date: data.start_date, end_date: data.end_date, status: data.status };
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to create the examination');
    }
  },

  async listSchedules(examId?: string): Promise<ExamScheduleItem[]> {
    try {
      let q = supabase.from('exam_schedules').select('*').order('exam_date', { ascending: true });
      if (examId) q = q.eq('exam_id', examId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as ExamScheduleItem[];
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to fetch exam schedules');
    }
  },

  async createSchedule(input: Omit<ExamScheduleItem, 'id'> & { exam_id: string }): Promise<ExamScheduleItem> {
    try {
      if (!input.exam_id) throw new Error('Choose the examination this paper belongs to.');
      if (input.end_time <= input.start_time) throw new Error('The end time must be after the start time.');
      // Clash check: same room, or same class, at an overlapping time on the same date
      const { data: existingRows, error: checkError } = await supabase.from('exam_schedules').select('*').eq('exam_date', input.exam_date);
      if (checkError) throw checkError;
      const existing = (existingRows || []) as any[];
      const overlaps = (a: any) => a.start_time < input.end_time && input.start_time < a.end_time;
      const clash = existing.find((s: any) =>
        overlaps(s) && ((input.room && s.room && s.room.toLowerCase() === input.room.toLowerCase()) ||
                        (input.class_name && s.class_name && s.class_name.toLowerCase() === input.class_name.toLowerCase())));
      if (clash) {
        const what = clash.room && input.room && clash.room.toLowerCase() === input.room.toLowerCase() ? `Room "${input.room}"` : `Class "${input.class_name}"`;
        throw new Error(`Schedule conflict: ${what} already has a paper on ${input.exam_date} between ${clash.start_time} and ${clash.end_time}.`);
      }
      const max = input.max_marks ?? 100;
      const { data, error } = await (supabase as any).from('exam_schedules').insert({
        exam_id: input.exam_id, subject: input.subject, subject_code: input.subject_code || null, class_name: input.class_name,
        exam_date: input.exam_date, start_time: input.start_time, end_time: input.end_time, room: input.room || 'TBA',
        max_marks: max, passing_marks: input.passing_marks ?? Math.ceil(max * 0.4), credits: input.credits ?? null,
      }).select().single();
      if (error) throw error;
      return data;
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to schedule examination');
    }
  },

  async deleteSchedule(id: string): Promise<void> {
    try {
      const { error } = await supabase.from('exam_schedules').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to remove examination schedule');
    }
  },

  async listResults(examId?: string): Promise<ExamResultItem[]> {
    try {
      let query = supabase.from('exam_results').select('*').order('marks_obtained', { ascending: false });
      if (examId) query = query.eq('exam_id', examId);
      const { data, error } = await query;
      if (error) throw error;
      const rows = data || [];
      const ids = Array.from(new Set(rows.map((r: any) => r.student_id).filter(Boolean)));
      const { data: profs } = ids.length
        ? await supabase.from('profiles').select('id, roll_number, student_id').in('id', ids as string[])
        : { data: [] as any[] };
      const codeOf = new Map(((profs || []) as any[]).map((p) => [p.id, p.student_id || p.roll_number]));
      return rows.map((r: any) => ({
        id: r.id, exam_id: r.exam_id, student_id: r.student_id,
        student_name: r.student_name, roll_number: codeOf.get(r.student_id) || '—', class_name: r.class_name,
        subject: r.subject, marks_obtained: Number(r.marks_obtained), total_marks: Number(r.max_marks) || 100,
        grade: r.grade || '—', result_status: r.result_status || undefined, remarks: r.remarks || r.result_status || '',
        is_published: r.is_published === true, created_at: r.created_at,
      }));
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to fetch examination results');
    }
  },

  /**
   * Saves marks for one or more exams, each batch all-or-nothing. A row is {exam_id, student_id, subject, marks_obtained, total_marks?, absent?}.
   * Throws with a readable list when any row is rejected (nothing is written in that case).
   */
  async saveResults(results: Array<{ exam_id: string; student_id: string; subject: string; marks_obtained: number; total_marks?: number; absent?: boolean }>): Promise<{ saved: number }> {
    try {
      const byExam = new Map<string, any[]>();
      for (const r of results) {
        if (!byExam.has(r.exam_id)) byExam.set(r.exam_id, []);
        byExam.get(r.exam_id)!.push({ student_id: r.student_id, subject: r.subject, marks: r.marks_obtained, max_marks: r.total_marks, absent: r.absent === true });
      }
      let saved = 0;
      for (const [examId, rows] of byExam) {
        const { data, error } = await (supabase as any).rpc('exam_save_marks', { p_exam_id: examId, p_rows: rows });
        if (error) throw error;
        if (!data?.success) throw rpcFailure(data, 'Marks were not saved.');
        saved += data.saved;
      }
      return { saved };
    } catch (error: any) {
      if (error?.code && error?.errors) throw error;        // already a readable validation failure
      throw handleSupabaseError(error, 'Failed to save examination grades');
    }
  },

  /** Publishes (or withdraws, with a reason) the results of an exam. Only COE / principal / admin. */
  async publishExam(examId: string, isPublished: boolean, reason?: string): Promise<void> {
    try {
      const { data, error } = await (supabase as any).rpc('exam_publish_results', { p_exam_id: examId, p_publish: isPublished, p_reason: reason ?? null });
      if (error) throw error;
      if (!data?.success) throw rpcFailure(data, `Failed to ${isPublished ? 'publish' : 'withdraw'} results`);
    } catch (error: any) {
      if (error?.code && !error?.details) throw error;
      throw handleSupabaseError(error, `Failed to ${isPublished ? 'publish' : 'withdraw'} examination results`);
    }
  },

  // ---- Hall tickets (migration 046) ----
  async listHallTickets(examId: string): Promise<HallTicketRow[]> {
    try {
      const { data, error } = await supabase.from('hall_tickets').select('*').eq('exam_id', examId).order('class_name').order('student_name');
      if (error) throw error;
      return (data || []) as unknown as HallTicketRow[];
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to fetch hall tickets');
    }
  },

  async generateHallTickets(examId: string, className?: string): Promise<{ issued: number; withheld: number; kept_released: number; withheld_list: Array<{ student: string; class: string; reason: string }>; rules: { min_attendance: number; fee_clearance_required: boolean } }> {
    const { data, error } = await (supabase as any).rpc('exam_generate_hall_tickets', { p_exam_id: examId, p_class_name: className ?? null });
    if (error) throw handleSupabaseError(error, 'Failed to generate hall tickets');
    if (!data?.success) throw rpcFailure(data, 'Failed to generate hall tickets');
    return data;
  },

  async releaseHallTicket(ticketId: string, reason: string): Promise<void> {
    const { data, error } = await (supabase as any).rpc('exam_release_hall_ticket', { p_ticket_id: ticketId, p_reason: reason });
    if (error) throw handleSupabaseError(error, 'Failed to release the hall ticket');
    if (!data?.success) throw rpcFailure(data, 'Failed to release the hall ticket');
  },

  async setHallTicketsVisible(examId: string, visible: boolean): Promise<void> {
    const { data, error } = await (supabase as any).rpc('exam_set_hall_tickets_visible', { p_exam_id: examId, p_visible: visible });
    if (error) throw handleSupabaseError(error, 'Failed to update hall ticket visibility');
    if (!data?.success) throw rpcFailure(data, 'Failed to update hall ticket visibility');
  },

  async getAnalytics(examId?: string): Promise<ExamAnalyticsSummary> {
    try {
      const { data, error } = await (supabase as any).rpc('exam_analytics', { p_exam_id: examId ?? null });
      if (error) throw error;
      const a = data || {};
      return {
        totalAppeared: a.appeared ?? 0,
        absent: a.absent ?? 0,
        passCount: a.passed ?? 0,
        passPercentage: a.pass_percentage ?? 0,
        averageMarks: a.average_percentage ?? 0,
        bySubject: a.by_subject ?? [],
        topPerformers: (a.top ?? []).map((t: any, i: number) => ({
          id: `${i}-${t.student_name}-${t.subject}`, student_name: t.student_name, class_name: t.class_name, subject: t.subject,
          marks_obtained: Number(t.marks), total_marks: Number(t.max) || 100, grade: t.grade,
        })),
      };
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to calculate exam analytics');
    }
  },
};

export default examService;
