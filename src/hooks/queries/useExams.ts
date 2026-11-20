import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { examService, ExamScheduleItem, ExamResultItem } from '@/services/examService';

export function useExams() {
  return useQuery({
    queryKey: ['exams'],
    queryFn: () => examService.listExams(),
  });
}

export function useExamSchedules() {
  return useQuery({
    queryKey: ['exam-schedules'],
    queryFn: () => examService.listSchedules(),
  });
}

export function useExamResults(examId?: string) {
  return useQuery({
    queryKey: ['exam-results', examId],
    queryFn: () => examService.listResults(examId),
  });
}

export function useExamAnalytics() {
  return useQuery({
    queryKey: ['exam-analytics'],
    queryFn: () => examService.getAnalytics(),
  });
}

export function useCreateExamSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (schedule: Omit<ExamScheduleItem, 'id'>) => examService.createSchedule(schedule),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exam-schedules'] });
      qc.invalidateQueries({ queryKey: ['exams'] });
    },
  });
}

export function useDeleteExamSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => examService.deleteSchedule(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exam-schedules'] });
    },
  });
}

export function useSaveExamResults() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (results: Array<{ exam_id: string; student_id: string; subject: string; marks_obtained: number; total_marks: number }>) =>
      examService.saveResults(results),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exam-results'] });
      qc.invalidateQueries({ queryKey: ['exam-analytics'] });
    },
  });
}

export function usePublishExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ examId, isPublished }: { examId: string; isPublished: boolean }) =>
      examService.publishExam(examId, isPublished),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exams'] });
      qc.invalidateQueries({ queryKey: ['exam-results'] });
    },
  });
}

