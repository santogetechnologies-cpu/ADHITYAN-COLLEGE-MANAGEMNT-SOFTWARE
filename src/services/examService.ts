import { supabase } from '@/lib/supabase';
import { handleSupabaseError } from './api/errors';

export interface ExamItem {
  id: string;
  title: string;
  academic_year?: string;
  exam_type?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  is_published?: boolean;
}

export interface ExamScheduleItem {
  id: string;
  exam_id?: string;
  subject: string;
  class_name?: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  room?: string;
  max_marks?: number;
  passing_marks?: number;
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
  created_at?: string;
}

export const examService = {
  async listExams(): Promise<ExamItem[]> {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map((e: any) => ({
        id: e.id,
        title: e.title || 'Semester Examination',
        academic_year: e.academic_year || '2025-2026',
        exam_type: e.exam_type || 'Final',
        start_date: e.start_date,
        end_date: e.end_date,
        status: e.status || 'draft',
        is_published: e.status === 'published' || e.is_published === true,
      }));
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to fetch examinations');
    }
  },

  async listSchedules(): Promise<ExamScheduleItem[]> {
    try {
      const { data, error } = await supabase
        .from('exam_schedules')
        .select('*')
        .order('exam_date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to fetch exam schedules');
    }
  },

  async createSchedule(input: Omit<ExamScheduleItem, 'id'>): Promise<ExamScheduleItem> {
    try {
      // 1. Clash Check: verify no other schedule shares the same room or class on the same date and overlapping time
      const { data: existing, error: checkError } = await supabase
        .from('exam_schedules')
        .select('*')
        .eq('exam_date', input.exam_date);

      if (checkError) throw checkError;

      const conflict = (existing || []).find((s: any) => {
        const roomMatch = input.room && s.room && s.room.toLowerCase() === input.room.toLowerCase();
        const classMatch = input.class_name && s.class_name && s.class_name.toLowerCase() === input.class_name.toLowerCase();
        return (roomMatch || classMatch) && (s.start_time === input.start_time);
      });

      if (conflict) {
        throw new Error(
          `Schedule Conflict Detected: ${conflict.room === input.room ? `Room "${input.room}"` : `Class "${input.class_name}"`} is already scheduled on ${input.exam_date} at ${input.start_time}.`
        );
      }

      const { data, error } = await supabase
        .from('exam_schedules')
        .insert({
          subject: input.subject,
          class_name: input.class_name,
          exam_date: input.exam_date,
          start_time: input.start_time,
          end_time: input.end_time,
          room: input.room,
          max_marks: input.max_marks || 100,
          passing_marks: input.passing_marks || 35,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to schedule examination');
    }
  },

  async deleteSchedule(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('exam_schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to remove examination schedule');
    }
  },

  async listResults(examId?: string): Promise<ExamResultItem[]> {
    try {
      let query = supabase
        .from('exam_results')
        .select('*')
        .order('marks_obtained', { ascending: false });

      if (examId) {
        query = query.eq('exam_id', examId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Enrich with student profiles
      const { data: students } = await supabase
        .from('profiles')
        .select('id, name, roll_number, class_name')
        .eq('role', 'student');

      const studentMap = new Map((students || []).map((s: any) => [s.id, s]));

      return (data || []).map((r: any) => {
        const student = studentMap.get(r.student_id);
        const marks = Number(r.marks_obtained) || 0;
        const total = Number(r.total_marks) || 100;
        const pct = (marks / total) * 100;
        let grade = 'F';
        if (pct >= 90) grade = 'A+';
        else if (pct >= 80) grade = 'A';
        else if (pct >= 70) grade = 'B+';
        else if (pct >= 60) grade = 'B';
        else if (pct >= 50) grade = 'C';
        else if (pct >= 35) grade = 'D';

        return {
          id: r.id,
          exam_id: r.exam_id,
          student_id: r.student_id,
          student_name: student?.name || 'Student Candidate',
          roll_number: student?.roll_number || r.student_id.slice(0, 8),
          class_name: student?.class_name || 'Vocational Degree',
          subject: r.subject,
          marks_obtained: marks,
          total_marks: total,
          grade,
          remarks: marks >= 35 ? 'Passed' : 'Needs Improvement',
          created_at: r.created_at,
        };
      });
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to fetch examination results');
    }
  },

  async saveResults(results: Array<{ exam_id: string; student_id: string; subject: string; marks_obtained: number; total_marks: number }>): Promise<void> {
    try {
      for (const res of results) {
        if (res.marks_obtained > res.total_marks) {
          throw new Error(`Marks obtained (${res.marks_obtained}) cannot exceed maximum marks (${res.total_marks}).`);
        }
        if (res.marks_obtained < 0) {
          throw new Error('Marks obtained cannot be negative.');
        }

        const { error } = await supabase
          .from('exam_results')
          .upsert(res, { onConflict: 'exam_id,student_id,subject' });

        if (error) throw error;
      }
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to save examination grades');
    }
  },

  async publishExam(examId: string, isPublished: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from('exams')
        .update({
          status: isPublished ? 'published' : 'draft',
          updated_at: new Date().toISOString(),
        })
        .eq('id', examId);

      if (error) throw error;
    } catch (error) {
      throw handleSupabaseError(error, `Failed to ${isPublished ? 'publish' : 'unpublish'} examination`);
    }
  },

  async getAnalytics() {
    try {
      const results = await this.listResults();
      if (results.length === 0) {
        return {
          totalAppeared: 0,
          passCount: 0,
          passPercentage: 0,
          averageMarks: 0,
          topPerformers: [],
        };
      }

      const totalAppeared = results.length;
      const passCount = results.filter(r => r.marks_obtained >= 35).length;
      const passPercentage = Math.round((passCount / totalAppeared) * 100);
      const sumMarks = results.reduce((acc, r) => acc + (r.marks_obtained / r.total_marks) * 100, 0);
      const averageMarks = Math.round(sumMarks / totalAppeared);

      const topPerformers = [...results]
        .sort((a, b) => (b.marks_obtained / b.total_marks) - (a.marks_obtained / a.total_marks))
        .slice(0, 5);

      return {
        totalAppeared,
        passCount,
        passPercentage,
        averageMarks,
        topPerformers,
      };
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to calculate exam analytics');
    }
  },
};

export default examService;

