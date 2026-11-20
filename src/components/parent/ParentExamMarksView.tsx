import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, BookOpen, CheckCircle2, AlertCircle, Loader2, MessageSquare } from 'lucide-react';
import { db } from '@/services/supabase/database';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { ExamResult } from '@/types/database.types';

interface ParentExamMarksViewProps {
  studentId: string;
  studentName: string;
}

export function ParentExamMarksView({ studentId, studentName }: ParentExamMarksViewProps) {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<ExamResult[]>([]);

  const loadMarks = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const data = await db.getExamResults(studentId);
      setResults(data || []);
    } catch (err) {
      console.warn('Failed to load marks:', err);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadMarks();
  }, [loadMarks]);

  useRealtimeSubscription({ table: 'exam_results', onChange: loadMarks, onReconnect: loadMarks });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Examination Marks & Marksheet</h2>
        <p className="text-muted-foreground text-sm">
          Authenticated marks entered by assigned faculty and published for {studentName}
        </p>
      </div>

      <Card className="rounded-2xl border-border shadow-xs">
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Award className="w-4 h-4 text-[#1D61E7]" />
            Continuous Evaluation & Semester Marksheet
          </CardTitle>
          <CardDescription className="text-xs">
            Internal assessments, model practicals, and university examinations
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-10 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading student marks...
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No examination marks have been published for this term yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-border text-muted-foreground font-semibold">
                  <tr>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Exam Session</th>
                    <th className="py-3 px-4 text-center">Score / Max</th>
                    <th className="py-3 px-4 text-center">Percentage</th>
                    <th className="py-3 px-4 text-center">Grade</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Faculty Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {results.map((r) => {
                    const score = r.marks_obtained ?? (r as any).marks ?? 0;
                    const max = r.max_marks ?? r.total_marks ?? (r as any).total ?? 100;
                    const pct = r.percentage ?? (max > 0 ? Math.round((score / max) * 100) : 0);
                    const grade = r.grade || (pct >= 90 ? 'O' : pct >= 80 ? 'A+' : pct >= 70 ? 'A' : pct >= 60 ? 'B+' : pct >= 50 ? 'B' : 'F');
                    const isPass = pct >= 50;
                    const remarks = r.remarks || (r as any).comments;

                    return (
                      <tr key={r.id} className="hover:bg-accent/40 transition-colors">
                        <td className="py-3 px-4 font-bold text-foreground">{r.subject}</td>
                        <td className="py-3 px-4 text-muted-foreground">{r.exam_name || 'Assessment Exam'}</td>
                        <td className="py-3 px-4 text-center font-mono font-medium">
                          {score} / {max}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-[#1D61E7]">
                          {pct}%
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge 
                            variant="outline" 
                            className={`font-mono text-xs ${
                              grade === 'O' || grade?.startsWith('A') 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : isPass 
                                ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {grade}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isPass ? (
                            <span className="inline-flex items-center text-emerald-600 font-semibold gap-1 text-[11px]">
                              <CheckCircle2 className="w-3 h-3" /> Pass
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-rose-600 font-semibold gap-1 text-[11px]">
                              <AlertCircle className="w-3 h-3" /> Re-appear
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground italic text-[11px]">
                          {remarks ? `"${remarks}"` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
