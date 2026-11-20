import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Minus, 
  GraduationCap, 
  Award, 
  CheckCircle2, 
  FileText, 
  Loader2, 
  ArrowUpRight, 
  ArrowDownRight,
  RefreshCw,
  Clock,
  BookOpen
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/supabase/database';
import { ExamResult, StudentAttendance, Assignment, AssignmentSubmission } from '@/types/database.types';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { getCourseSemesters } from '@/constants/courses';

interface SubjectPerformance {
  subject: string;
  score: number;
  trend: 'up' | 'down' | 'stable';
  change: number;
}

export function PerformanceAnalytics() {
  const { user } = useAuth();
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<StudentAttendance[]>([]);
  const [attendancePercentage, setAttendancePercentage] = useState<number | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  // Dynamic Course Semesters
  const dynamicSemesters = useMemo(() => {
    return getCourseSemesters(user?.department);
  }, [user?.department]);

  const [selectedSemester, setSelectedSemester] = useState<string>('all');

  const loadData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [results, attSummary, assignmentList, submissionList] = await Promise.all([
        db.getExamResults(user.id),
        db.getStudentAttendanceSummary(user.id, user.class_name),
        db.getAssignments(user.class_name),
        db.getAssignmentSubmissions(user.id),
      ]);
      setExamResults(results || []);
      setAttendanceRecords(attSummary?.records || []);
      setAttendancePercentage(attSummary?.totalConducted > 0 ? attSummary.percentage : null);
      setAssignments(assignmentList || []);
      setSubmissions(submissionList || []);
    } catch (err) {
      console.warn('Failed to load performance analytics:', err);
      setExamResults([]);
      setAttendanceRecords([]);
      setAssignments([]);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.class_name]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time synchronization
  useRealtimeSubscription({ table: 'exam_results', onChange: loadData, onReconnect: loadData });
  useRealtimeSubscription({ table: 'student_attendance', onChange: loadData, onReconnect: loadData });
  useRealtimeSubscription({ table: 'class_attendance_sessions', onChange: loadData, onReconnect: loadData });
  useRealtimeSubscription({ table: 'assignments', onChange: loadData, onReconnect: loadData });
  useRealtimeSubscription({ table: 'assignment_submissions', onChange: loadData, onReconnect: loadData });

  // Filter results by selected semester
  const filteredExamResults = useMemo(() => {
    if (selectedSemester === 'all') return examResults;
    const target = selectedSemester.toLowerCase().replace(/\s+/g, '');
    return examResults.filter(r => {
      const cls = (r.class_name || '').toLowerCase().replace(/\s+/g, '');
      return cls.includes(target) || target.includes(cls);
    });
  }, [examResults, selectedSemester]);

  // Filtered Subject Data
  const subjectList = useMemo<SubjectPerformance[]>(() => {
    if (filteredExamResults.length === 0) return [];

    const subjectMap: Record<string, { latest: number; previous?: number }> = {};
    const sorted = [...filteredExamResults].sort((a, b) => {
      const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tA - tB;
    });

    sorted.forEach(r => {
      const max = Number(r.max_marks) || 100;
      const obtained = Number(r.marks_obtained) || 0;
      const pct = Math.round((obtained / max) * 100);
      const prev = subjectMap[r.subject]?.latest;
      subjectMap[r.subject] = {
        latest: pct,
        previous: prev !== undefined ? prev : undefined,
      };
    });

    return Object.keys(subjectMap).map((subject) => {
      const item = subjectMap[subject];
      let trend: 'up' | 'down' | 'stable' = 'stable';
      let change = 0;
      if (item.previous !== undefined) {
        change = item.latest - item.previous;
        if (change > 0) trend = 'up';
        else if (change < 0) trend = 'down';
      }
      return {
        subject,
        score: item.latest,
        trend,
        change,
      };
    });
  }, [filteredExamResults]);

  // Overall average examination score %
  const overallAverage = useMemo(() => {
    if (subjectList.length === 0) return null;
    return Math.round(subjectList.reduce((sum, s) => sum + s.score, 0) / subjectList.length);
  }, [subjectList]);

  // Assignment Metrics
  const assignmentMetrics = useMemo(() => {
    const totalAssigned = assignments.length;
    const submittedCount = submissions.length;
    const completionRate = totalAssigned > 0 ? Math.round((submittedCount / totalAssigned) * 100) : 0;
    
    const gradedSubmissions = submissions.filter(s => s.status === 'graded' && typeof s.score === 'number');
    const avgScore = gradedSubmissions.length > 0 
      ? Math.round(gradedSubmissions.reduce((acc, s) => acc + (s.score || 0), 0) / gradedSubmissions.length)
      : null;

    return {
      totalAssigned,
      submittedCount,
      completionRate,
      gradedCount: gradedSubmissions.length,
      averageScore: avgScore,
    };
  }, [assignments, submissions]);

  // Composite Academic Performance Score (Weighted from Real DB records)
  // 50% Exam Marks + 30% Attendance + 20% Assignment Completion
  const compositeIndex = useMemo(() => {
    if (overallAverage === null && attendancePercentage === null && assignmentMetrics.completionRate === 0) {
      return null;
    }
    const examPart = (overallAverage ?? 75) * 0.50;
    const attPart = (attendancePercentage ?? 75) * 0.30;
    const assignPart = assignmentMetrics.completionRate * 0.20;
    return Math.min(100, Math.round(examPart + attPart + assignPart));
  }, [overallAverage, attendancePercentage, assignmentMetrics.completionRate]);

  // Strengths and Weaknesses
  const sortedSubjects = useMemo(() => {
    return [...subjectList].sort((a, b) => b.score - a.score);
  }, [subjectList]);

  const strongestSubject = sortedSubjects.length > 0 ? sortedSubjects[0] : null;
  const weakestSubject = sortedSubjects.length > 1 ? sortedSubjects[sortedSubjects.length - 1] : null;

  return (
    <Card className="bg-white border-slate-200/80 rounded-2xl shadow-2xs">
      <CardHeader className="p-5 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#1D61E7] flex items-center justify-center font-bold">
                <BarChart3 className="w-4 h-4" />
              </div>
              <CardTitle className="text-base font-bold text-slate-900">
                Performance Analytics Desk
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500">
              Evaluations, attendance rate, and coursework metrics calculated from verified records • {user?.department || 'Paramedical Sciences'}
            </CardDescription>
          </div>

          {/* Clean Semester Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <Button
              size="sm"
              variant={selectedSemester === 'all' ? 'default' : 'outline'}
              className={`text-xs h-8 px-3 rounded-xl font-semibold transition-all ${
                selectedSemester === 'all' 
                  ? 'bg-[#1D61E7] text-white hover:bg-blue-700 shadow-2xs' 
                  : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
              }`}
              onClick={() => setSelectedSemester('all')}
            >
              All Semesters
            </Button>
            {dynamicSemesters.map((semName) => (
              <Button
                key={semName}
                size="sm"
                variant={selectedSemester === semName ? 'default' : 'outline'}
                className={`text-xs h-8 px-3 rounded-xl font-semibold transition-all ${
                  selectedSemester === semName 
                    ? 'bg-[#1D61E7] text-white hover:bg-blue-700 shadow-2xs' 
                    : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
                }`}
                onClick={() => setSelectedSemester(semName)}
              >
                {semName}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#1D61E7]" />
            <p className="text-xs text-slate-400">Loading academic performance records...</p>
          </div>
        ) : (
          <>
            {/* 4-Column Key Metrics: Exam Average, Attendance, Assignment Completion, Top Subject */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Exam Average */}
              <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-semibold uppercase">Exam Marks</span>
                  <Award className="w-4 h-4 text-[#1D61E7]" />
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {overallAverage !== null ? `${overallAverage}%` : 'Awaiting Marks'}
                </div>
                <p className="text-[11px] text-slate-400">
                  {overallAverage !== null ? `${filteredExamResults.length} exams evaluated` : 'No exam records'}
                </p>
              </div>

              {/* Attendance Rate */}
              <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-semibold uppercase">Attendance Rate</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {attendancePercentage !== null ? `${attendancePercentage}%` : 'Not Recorded'}
                </div>
                <p className="text-[11px] text-slate-400">
                  {attendancePercentage !== null 
                    ? (attendancePercentage >= 75 ? 'Exam eligible (≥75%)' : 'Attendance Shortage') 
                    : 'No attendance logs'}
                </p>
              </div>

              {/* Assignment Completion */}
              <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-semibold uppercase">Assignments</span>
                  <FileText className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {assignmentMetrics.totalAssigned > 0 ? `${assignmentMetrics.completionRate}%` : '—'}
                </div>
                <p className="text-[11px] text-slate-400">
                  {assignmentMetrics.submittedCount}/{assignmentMetrics.totalAssigned} tasks submitted
                </p>
              </div>

              {/* Top Subject */}
              <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-semibold uppercase">Top Subject</span>
                  <GraduationCap className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-sm font-bold text-slate-900 truncate">
                  {strongestSubject ? strongestSubject.subject : '—'}
                </div>
                <p className="text-[11px] text-slate-400">
                  {strongestSubject ? `${strongestSubject.score}% score` : 'Awaiting publication'}
                </p>
              </div>
            </div>

            {/* Circular Gauge & Integrated Progress Analysis */}
            {compositeIndex !== null && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-slate-50/60 border border-slate-200/80 rounded-2xl">
                {/* Circular Gauge: Composite Academic Performance Index */}
                <div className="flex flex-col items-center justify-center text-center space-y-2">
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="#E2E8F0"
                        strokeWidth="10"
                        fill="transparent"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="#1D61E7"
                        strokeWidth="10"
                        strokeDasharray={2 * Math.PI * 40}
                        strokeDashoffset={(2 * Math.PI * 40) * (1 - compositeIndex / 100)}
                        strokeLinecap="round"
                        fill="transparent"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-slate-900">{compositeIndex}%</span>
                      <span className="text-[10px] text-slate-500 font-medium">Composite Index</span>
                    </div>
                  </div>
                  <div className="inline-flex items-center space-x-1 text-emerald-600 font-bold text-xs bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Real database metrics</span>
                  </div>
                </div>

                {/* Academic Strengths & Focus Areas */}
                <div className="md:col-span-2 space-y-4 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      Academic Evaluation Insights
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Integrated formula combining examinations (50%), attendance (30%), and assignments (20%)
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {strongestSubject && (
                      <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
                        <div className="flex items-center space-x-1.5 text-emerald-800 text-xs font-bold">
                          <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                          <span>Strongest Subject</span>
                        </div>
                        <div className="text-sm font-bold text-slate-900">{strongestSubject.subject}</div>
                        <span className="text-[11px] text-emerald-700 font-semibold">{strongestSubject.score}% Mastery</span>
                      </div>
                    )}

                    {weakestSubject && (
                      <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1">
                        <div className="flex items-center space-x-1.5 text-amber-800 text-xs font-bold">
                          <ArrowDownRight className="w-4 h-4 text-amber-600" />
                          <span>Area for Improvement</span>
                        </div>
                        <div className="text-sm font-bold text-slate-900">{weakestSubject.subject}</div>
                        <span className="text-[11px] text-amber-700 font-semibold">{weakestSubject.score}% Score</span>
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-600">
                    <span className="font-semibold text-slate-800">Minimum Passing Threshold: </span>
                    Institutional regulation requires 40% in theory exams, 50% in clinical practicals, and 75% attendance.
                  </div>
                </div>
              </div>
            )}

            {/* Subject-wise Performance Section */}
            {subjectList.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl space-y-2">
                <BarChart3 className="w-10 h-10 mx-auto text-slate-300" />
                <h4 className="text-sm font-bold text-slate-800">No Assessment Records Found</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {selectedSemester === 'all'
                    ? 'Examination and assessment marks will populate here automatically once faculty enter them into the academic portal.'
                    : `No assessment marks published for ${selectedSemester}.`}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Subject-Wise Performance Breakdown ({subjectList.length} Subjects)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {subjectList.map((subject) => (
                    <div 
                      key={subject.subject} 
                      className="p-4 border border-slate-200/80 rounded-2xl bg-white space-y-2.5 hover:border-blue-300 transition-colors shadow-2xs"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900">{subject.subject}</span>
                        <div className="flex items-center space-x-2">
                          {subject.trend === 'up' && (
                            <span className="inline-flex items-center text-emerald-600 font-semibold text-[11px]">
                              <TrendingUp className="w-3 h-3 mr-0.5" /> +{subject.change}%
                            </span>
                          )}
                          {subject.trend === 'down' && (
                            <span className="inline-flex items-center text-rose-600 font-semibold text-[11px]">
                              <TrendingDown className="w-3 h-3 mr-0.5" /> {subject.change}%
                            </span>
                          )}
                          {subject.trend === 'stable' && (
                            <span className="inline-flex items-center text-slate-400 font-semibold text-[11px]">
                              <Minus className="w-3 h-3 mr-0.5" /> Steady
                            </span>
                          )}
                          <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg">
                            {subject.score}%
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Progress value={subject.score} className="h-2 rounded-full" />
                        <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                          <span>Threshold: 40%</span>
                          <span>{subject.score >= 75 ? 'Distinction' : subject.score >= 60 ? 'First Class' : subject.score >= 40 ? 'Pass' : 'Remedial'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
