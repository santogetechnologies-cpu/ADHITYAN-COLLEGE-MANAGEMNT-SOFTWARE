import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, BarChart3, Award, CheckCircle2, BookOpen, AlertCircle, Loader2 } from 'lucide-react';
import { db } from '@/services/supabase/database';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { ExamResult } from '@/types/database.types';

interface ParentPerformanceAnalyticsViewProps {
  studentId?: string;
  studentName: string;
  attendanceRate: number;
  averageGrade?: number;
}

export function ParentPerformanceAnalyticsView({
  studentId,
  studentName,
  attendanceRate = 0,
  averageGrade,
}: ParentPerformanceAnalyticsViewProps) {
  const [loading, setLoading] = useState(true);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);

  const loadStudentResults = useCallback(async () => {
    if (!studentId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await db.getExamResults(studentId);
      setExamResults(data || []);
    } catch (err) {
      console.warn('Failed to load performance results:', err);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadStudentResults();
  }, [loadStudentResults]);

  useRealtimeSubscription({ table: 'exam_results', onChange: loadStudentResults, onReconnect: loadStudentResults });

  // Compute live average grade if not supplied
  const computedAverage = examResults.length > 0
    ? Math.round(examResults.reduce((sum, r) => sum + (r.percentage || (r.marks_obtained && r.max_marks ? Math.round((r.marks_obtained / r.max_marks) * 100) : 0)), 0) / examResults.length)
    : (averageGrade ?? 0);

  // Group by subject and get latest score per subject
  const subjectMap = new Map<string, { score: number; grade: string }>();
  examResults.forEach(r => {
    const score = r.percentage ?? (r.marks_obtained && r.max_marks ? Math.round((r.marks_obtained / r.max_marks) * 100) : (r.marks_obtained || 0));
    const grade = r.grade || (score >= 90 ? 'O' : score >= 80 ? 'A+' : score >= 70 ? 'A' : score >= 60 ? 'B+' : score >= 50 ? 'B' : 'F');
    subjectMap.set(r.subject, { score, grade });
  });

  const subjects = Array.from(subjectMap.entries()).map(([name, val]) => ({
    name,
    score: val.score,
    grade: val.grade,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Performance Analytics & Insights</h2>
        <p className="text-muted-foreground text-sm">
          Comparative academic telemetry and learning trajectory for {studentName}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Core Indicators */}
        <Card className="rounded-2xl border-border shadow-xs">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#1D61E7]" />
              Core Performance Indicators
            </CardTitle>
            <CardDescription className="text-xs">
              Attendance correlation with academic evaluation
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-5 text-xs">
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="font-semibold text-foreground">Overall Attendance Discipline</span>
                <span className={`font-bold ${attendanceRate >= 75 ? 'text-[#1D61E7]' : 'text-rose-600'}`}>
                  {attendanceRate}%
                </span>
              </div>
              <Progress value={attendanceRate} className="h-2 bg-slate-100 dark:bg-slate-800" />
              <p className={`text-[11px] mt-1 ${attendanceRate >= 75 ? 'text-muted-foreground' : 'text-rose-600 font-semibold'}`}>
                {attendanceRate >= 75 
                  ? 'Complies with mandatory university 75% examination eligibility requirement.' 
                  : 'ALERT: Below institutional 75% threshold. At risk of examination hall ticket detention.'}
              </p>
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <span className="font-semibold text-foreground">Examination Average Benchmark</span>
                <span className="font-bold text-emerald-600">{computedAverage}%</span>
              </div>
              <Progress value={computedAverage} className="h-2 bg-slate-100 dark:bg-slate-800" />
              <p className="text-[11px] text-muted-foreground mt-1">
                {computedAverage >= 70 ? 'Consistent first-class performance across curriculum modules.' : 'Standard academic progression.'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Learning Trajectory */}
        <Card className="rounded-2xl border-border shadow-xs">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              Academic Status Trajectory
            </CardTitle>
            <CardDescription className="text-xs">
              Continuous assessment tracking from teacher records
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-3 text-xs">
            <div className={`p-3.5 rounded-xl border space-y-1 ${
              attendanceRate >= 75 
                ? 'bg-emerald-50/70 border-emerald-100 text-emerald-900' 
                : 'bg-rose-50/70 border-rose-100 text-rose-900'
            }`}>
              <div className="flex items-center gap-1.5 font-semibold">
                {attendanceRate >= 75 ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Academic Standing: Good Standing
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" /> Attendance Shortage Alert
                  </>
                )}
              </div>
              <p className="text-[11px] leading-relaxed">
                {attendanceRate >= 75
                  ? `${studentName} is in regular academic standing with compliant classroom and laboratory attendance.`
                  : `${studentName} currently has an attendance of ${attendanceRate}%, which is below the mandatory 75% requirement.`}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-blue-900">
                <Award className="w-4 h-4 text-[#1D61E7] shrink-0" /> Evaluation Records
              </div>
              <p className="text-blue-800 text-[11px]">
                {examResults.length > 0 
                  ? `${examResults.length} officially published assessment records on file for current academic term.`
                  : 'Awaiting first continuous internal assessment results publication.'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subject-Wise Competency */}
      <Card className="rounded-2xl border-border shadow-xs">
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#1D61E7]" />
            Subject-Wise Competency Breakdown
          </CardTitle>
          <CardDescription className="text-xs">
            Directly derived from published teacher exam evaluations
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5">
          {loading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground text-xs">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading subject competencies...
            </div>
          ) : subjects.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-xs">
              No subject examination marks published yet for competency breakdown.
            </div>
          ) : (
            <div className="space-y-4">
              {subjects.map((sub, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-foreground">{sub.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-[#1D61E7]">{sub.score}%</span>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        Grade {sub.grade}
                      </Badge>
                    </div>
                  </div>
                  <Progress value={sub.score} className="h-1.5 bg-slate-100 dark:bg-slate-800" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
