import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, BookOpen, CheckCircle2, AlertCircle, Loader2, MessageSquare } from 'lucide-react';
import { db } from '@/services/supabase/database';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { ExamResult } from '@/types/database.types';

interface ParentResultsViewProps {
  studentId: string;
  studentName: string;
}

export function ParentResultsView({ studentId, studentName }: ParentResultsViewProps) {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<ExamResult[]>([]);

  const loadResults = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const data = await db.getExamResults(studentId);
      setResults(data || []);
    } catch (err) {
      console.warn('Failed to load student results:', err);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  useRealtimeSubscription({ table: 'exam_results', onChange: loadResults, onReconnect: loadResults });

  const avgScore = results.length > 0 
    ? Math.round(results.reduce((sum, r) => sum + (r.percentage || 0), 0) / results.length)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Academic Results & Grades</h2>
          <p className="text-muted-foreground text-sm">
            Official published examination marks for {studentName}
          </p>
        </div>
        {avgScore !== null && (
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-600 text-white font-mono text-xs py-1 px-3">
              Average Score: {avgScore}%
            </Badge>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading examination records...
        </div>
      ) : results.length === 0 ? (
        <Card className="rounded-2xl border-border p-8 text-center text-muted-foreground">
          <BookOpen className="w-10 h-10 mx-auto text-muted-foreground mb-3 opacity-60" />
          <h3 className="font-semibold text-foreground">No Published Exam Results</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Exam results will appear here once officially recorded and published by assigned faculty.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {results.map((res) => {
            const score = res.marks_obtained ?? (res as any).marks ?? 0;
            const max = res.max_marks ?? res.total_marks ?? (res as any).total ?? 100;
            const pct = res.percentage ?? (max > 0 ? Math.round((score / max) * 100) : 0);
            const grade = res.grade || (pct >= 90 ? 'O' : pct >= 80 ? 'A+' : pct >= 70 ? 'A' : pct >= 60 ? 'B+' : pct >= 50 ? 'B' : 'F');
            const isPass = pct >= 50;
            const remarks = res.remarks || (res as any).comments;

            return (
              <Card key={res.id} className="rounded-2xl border-border shadow-xs hover:shadow-md transition-shadow">
                <CardHeader className="pb-3 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                      <Award className="w-4 h-4 text-[#1D61E7]" />
                      {res.subject}
                    </CardTitle>
                    <Badge 
                      className={
                        grade === 'O' || grade?.startsWith('A') 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : isPass
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }
                    >
                      Grade {grade}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    {res.exam_name || 'Academic Assessment'} • {res.exam_date || 'Published Evaluation'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-3 text-xs">
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border/40 text-center">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Marks Obtained</span>
                      <span className="font-bold text-foreground text-sm">{score}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Maximum Marks</span>
                      <span className="font-medium text-muted-foreground text-sm">{max}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Percentage</span>
                      <span className="font-bold text-[#1D61E7] text-sm">{pct}%</span>
                    </div>
                  </div>

                  {remarks && (
                    <div className="p-2.5 rounded-xl bg-muted/40 text-foreground flex items-start gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-[11px] font-semibold text-muted-foreground">Teacher Evaluation Note:</strong>
                        <span className="italic">{remarks}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                    <span>
                      Status: {isPass ? (
                        <strong className="text-emerald-600 font-semibold">PASS (Eligible)</strong>
                      ) : (
                        <strong className="text-rose-600 font-semibold">RE-APPEAR REQUIRED</strong>
                      )}
                    </span>
                    <span>Evaluated by Assigned Faculty</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
