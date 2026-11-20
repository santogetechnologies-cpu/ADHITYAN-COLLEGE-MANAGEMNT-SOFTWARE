import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  RefreshCw, 
  GraduationCap, 
  BookOpen, 
  UserCheck,
  ShieldCheck,
  BarChart3,
  CalendarDays
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/supabase/database';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { StudentAttendance } from '@/types/database.types';

export function StudentAttendanceTab() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [attendanceRecords, setAttendanceRecords] = useState<StudentAttendance[]>([]);
  const [summaryData, setSummaryData] = useState<{
    totalConducted: number;
    totalPresent: number;
    totalAbsent: number;
    totalLate: number;
    totalLeave: number;
    percentage: number;
    isEligible: boolean;
    subjectSummary: Array<{
      subject: string;
      conducted: number;
      present: number;
      absent: number;
      late: number;
      leave: number;
      percentage: number;
      isEligible: boolean;
    }>;
    monthlySummary: Array<{
      month: string;
      monthLabel: string;
      conducted: number;
      present: number;
      absent: number;
      percentage: number;
    }>;
  }>({
    totalConducted: 0,
    totalPresent: 0,
    totalAbsent: 0,
    totalLate: 0,
    totalLeave: 0,
    percentage: 0,
    isEligible: false,
    subjectSummary: [],
    monthlySummary: [],
  });

  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'absent' | 'late' | 'leave'>('all');
  const [activeSubTab, setActiveSubTab] = useState<'history' | 'subjects' | 'monthly'>('history');

  const studentName = user?.name || 'Student';
  const studentDepartment = user?.department || 'Paramedical Sciences';
  const studentClass = user?.class_name || 'Current Term';
  const studentRoll = user?.roll_number || user?.student_id || 'ID Pending';

  // Load Verified Real Attendance Summary
  // Uses total conducted class sessions to compute accurate percentage:
  // (Total Present Sessions / Total Conducted Sessions) * 100
  // Never displays 100% just because a student has attended 1 session
  const loadAttendance = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const summary = await db.getStudentAttendanceSummary(user.id, user.class_name);
      setAttendanceRecords(summary.records || []);
      setSummaryData({
        totalConducted: summary.totalConducted,
        totalPresent: summary.totalPresent,
        totalAbsent: summary.totalAbsent,
        totalLate: summary.totalLate,
        totalLeave: summary.totalLeave,
        percentage: summary.percentage,
        isEligible: summary.isEligible,
        subjectSummary: summary.subjectSummary || [],
        monthlySummary: summary.monthlySummary || [],
      });
    } catch (err) {
      console.error('Failed to load student attendance:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.class_name]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  // Real-time synchronization on both student attendance records and teacher class sessions
  useRealtimeSubscription({
    table: 'student_attendance',
    onChange: loadAttendance,
    onReconnect: loadAttendance,
  });

  useRealtimeSubscription({
    table: 'class_attendance_sessions',
    onChange: loadAttendance,
    onReconnect: loadAttendance,
  });

  // Filtered Records for Ledger Table
  const filteredRecords = useMemo(() => {
    let list = [...attendanceRecords].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (statusFilter === 'all') return list;
    if (statusFilter === 'present') return list.filter(r => (r.status || '').toLowerCase() === 'present');
    if (statusFilter === 'absent') return list.filter(r => (r.status || '').toLowerCase() === 'absent');
    if (statusFilter === 'late') return list.filter(r => (r.status || '').toLowerCase() === 'late');
    if (statusFilter === 'leave') return list.filter(r => ['leave', 'excused'].includes((r.status || '').toLowerCase()));
    return list;
  }, [attendanceRecords, statusFilter]);

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'present':
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold text-xs flex items-center space-x-1 w-fit">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Present</span>
          </Badge>
        );
      case 'absent':
        return (
          <Badge className="bg-rose-50 text-rose-700 border-rose-200 font-semibold text-xs flex items-center space-x-1 w-fit">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Absent</span>
          </Badge>
        );
      case 'leave':
      case 'excused':
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-semibold text-xs flex items-center space-x-1 w-fit">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Leave (Excused)</span>
          </Badge>
        );
      case 'late':
        return (
          <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-semibold text-xs flex items-center space-x-1 w-fit">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>Late (Half Credit)</span>
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs capitalize">
            {status}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* 1. Header Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#1D61E7] flex items-center justify-center font-bold">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Academic Attendance Desk
                </h1>
                <Badge className="bg-blue-50 text-[#1D61E7] border-blue-200 text-[10px] font-semibold">
                  Official Record
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Synchronized daily attendance ledger updated by course instructors and faculty
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-600">
            <span className="flex items-center">
              <GraduationCap className="w-3.5 h-3.5 mr-1 text-[#1D61E7]" />
              {studentDepartment}
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center">
              <BookOpen className="w-3.5 h-3.5 mr-1 text-[#1D61E7]" />
              {studentClass}
            </span>
            <span className="text-slate-300">•</span>
            <span className="font-mono text-slate-500">Roll: {studentRoll}</span>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadAttendance}
          disabled={loading}
          className="h-9 px-3 text-xs font-semibold rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 self-start sm:self-center"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin text-[#1D61E7]' : 'text-slate-500'}`} />
          Refresh
        </Button>
      </div>

      {/* 2. Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance Rate */}
        <Card className="bg-white border-slate-200/80 rounded-2xl shadow-2xs">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Overall Attendance
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-slate-900">
                {summaryData.totalConducted > 0 ? `${summaryData.percentage}%` : '—'}
              </span>
              {summaryData.totalConducted > 0 && (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  summaryData.percentage >= 75 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {summaryData.percentage >= 75 ? 'Eligible for Exams' : 'Attendance Shortage'}
                </span>
              )}
            </div>
            <Progress 
              value={summaryData.percentage} 
              className="h-2 rounded-full" 
            />
            <p className="text-[11px] text-slate-400">
              Calculation: (Present + Late×0.5) / Total Conducted ({summaryData.totalConducted})
            </p>
          </CardContent>
        </Card>

        {/* Classes Conducted */}
        <Card className="bg-white border-slate-200/80 rounded-2xl shadow-2xs">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Total Classes Conducted
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                <CalendarIcon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-900">
              {summaryData.totalConducted}
            </div>
            <p className="text-[11px] text-slate-400">
              Faculty lecture & clinical sessions held
            </p>
          </CardContent>
        </Card>

        {/* Classes Attended */}
        <Card className="bg-white border-slate-200/80 rounded-2xl shadow-2xs">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Classes Attended
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-emerald-600">
              {summaryData.totalPresent}
            </div>
            <p className="text-[11px] text-slate-400">
              Verified Present ({summaryData.totalLate} late logins)
            </p>
          </CardContent>
        </Card>

        {/* Classes Missed */}
        <Card className="bg-white border-slate-200/80 rounded-2xl shadow-2xs">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Classes Missed
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-rose-600">
              {summaryData.totalAbsent + summaryData.totalLeave}
            </div>
            <p className="text-[11px] text-slate-400">
              {summaryData.totalAbsent} absent • {summaryData.totalLeave} excused leaves
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Sub-Tab Navigation: History vs Subject Breakdown vs Monthly Summary */}
      <Tabs value={activeSubTab} onValueChange={(v: any) => setActiveSubTab(v)} className="space-y-4">
        <TabsList className="bg-white p-1 border border-slate-200 rounded-xl shadow-2xs h-10">
          <TabsTrigger value="history" className="text-xs font-semibold rounded-lg data-[state=active]:bg-[#1D61E7] data-[state=active]:text-white">
            <Clock className="w-3.5 h-3.5 mr-1.5" />
            Attendance History ({attendanceRecords.length})
          </TabsTrigger>
          <TabsTrigger value="subjects" className="text-xs font-semibold rounded-lg data-[state=active]:bg-[#1D61E7] data-[state=active]:text-white">
            <BookOpen className="w-3.5 h-3.5 mr-1.5" />
            Subject-Wise Breakdown ({summaryData.subjectSummary.length})
          </TabsTrigger>
          <TabsTrigger value="monthly" className="text-xs font-semibold rounded-lg data-[state=active]:bg-[#1D61E7] data-[state=active]:text-white">
            <CalendarDays className="w-3.5 h-3.5 mr-1.5" />
            Monthly Report ({summaryData.monthlySummary.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: ATTENDANCE HISTORY LEDGER */}
        <TabsContent value="history" className="space-y-4">
          <Card className="bg-white border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
            <CardHeader className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Chronological Attendance Ledger
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Verified log of subject classes, clinical postings, and lecture sessions
                </CardDescription>
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-center overflow-x-auto">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    statusFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  All ({attendanceRecords.length})
                </button>
                <button
                  onClick={() => setStatusFilter('present')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    statusFilter === 'present'
                      ? 'bg-white text-emerald-700 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Present ({summaryData.totalPresent})
                </button>
                <button
                  onClick={() => setStatusFilter('absent')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    statusFilter === 'absent'
                      ? 'bg-white text-rose-700 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Absent ({summaryData.totalAbsent})
                </button>
                <button
                  onClick={() => setStatusFilter('late')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    statusFilter === 'late'
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Late ({summaryData.totalLate})
                </button>
                <button
                  onClick={() => setStatusFilter('leave')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    statusFilter === 'leave'
                      ? 'bg-white text-amber-700 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Leave ({summaryData.totalLeave})
                </button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {filteredRecords.length === 0 ? (
                <div className="text-center py-16 px-4 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                    <CalendarIcon className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-800">
                      {statusFilter === 'all' ? 'No Attendance Records Found' : `No ${statusFilter} records found`}
                    </h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      {statusFilter === 'all'
                        ? 'Attendance entries updated by your faculty during daily lecture sessions will appear here.'
                        : `There are currently no attendance entries categorized under "${statusFilter}".`}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80 border-b border-slate-200">
                        <TableHead className="w-32 font-bold text-[11px] text-slate-700 uppercase">Date</TableHead>
                        <TableHead className="font-bold text-[11px] text-slate-700 uppercase">Subject / Course Module</TableHead>
                        <TableHead className="w-36 font-bold text-[11px] text-slate-700 uppercase">Status</TableHead>
                        <TableHead className="font-bold text-[11px] text-slate-700 uppercase">Faculty / Teacher</TableHead>
                        <TableHead className="font-bold text-[11px] text-slate-700 uppercase">Remarks / Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecords.map((record) => (
                        <TableRow key={record.id} className="hover:bg-slate-50/60 transition-colors">
                          <TableCell className="font-mono text-xs font-semibold text-slate-900">
                            {new Date(record.date).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-xs text-slate-900">
                              {record.subject || studentDepartment}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {record.class_name || studentClass}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(record.status)}
                          </TableCell>
                          <TableCell className="text-xs text-slate-700">
                            <div className="flex items-center space-x-1.5">
                              <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{record.recorded_by || 'Department Faculty'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-slate-500 max-w-xs truncate">
                            {record.remarks || 'Regular Lecture & Clinical Session'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: SUBJECT-WISE ATTENDANCE BREAKDOWN */}
        <TabsContent value="subjects" className="space-y-4">
          <Card className="bg-white border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
            <CardHeader className="p-5 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900">
                Subject-Wise Attendance Breakdown
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Individual attendance compliance tracking per curriculum subject
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              {summaryData.subjectSummary.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No subject-wise sessions recorded yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {summaryData.subjectSummary.map((subj) => (
                    <div 
                      key={subj.subject}
                      className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-bold text-slate-900">{subj.subject}</h4>
                          <p className="text-[11px] text-slate-500">
                            {subj.present} present • {subj.absent} absent • {subj.late} late
                          </p>
                        </div>
                        <Badge 
                          className={`text-[10px] font-bold ${
                            subj.isEligible 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {subj.isEligible ? 'Eligible' : 'Shortage'}
                        </Badge>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-600">Rate ({subj.present}/{subj.conducted})</span>
                          <span className={subj.percentage >= 75 ? 'text-emerald-700' : 'text-rose-700'}>
                            {subj.percentage}%
                          </span>
                        </div>
                        <Progress value={subj.percentage} className="h-2 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: MONTHLY SUMMARY REPORT */}
        <TabsContent value="monthly" className="space-y-4">
          <Card className="bg-white border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
            <CardHeader className="p-5 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900">
                Monthly Attendance Overview
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Historical monthly performance and semester progression
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {summaryData.monthlySummary.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No monthly logs available yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 border-b border-slate-200">
                      <TableHead className="font-bold text-[11px] text-slate-700 uppercase">Month</TableHead>
                      <TableHead className="font-bold text-[11px] text-slate-700 uppercase">Sessions Conducted</TableHead>
                      <TableHead className="font-bold text-[11px] text-slate-700 uppercase">Attended</TableHead>
                      <TableHead className="font-bold text-[11px] text-slate-700 uppercase">Missed</TableHead>
                      <TableHead className="font-bold text-[11px] text-slate-700 uppercase">Monthly Rate</TableHead>
                      <TableHead className="font-bold text-[11px] text-slate-700 uppercase">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summaryData.monthlySummary.map((m) => (
                      <TableRow key={m.month} className="hover:bg-slate-50/60">
                        <TableCell className="font-bold text-xs text-slate-900">
                          {m.monthLabel}
                        </TableCell>
                        <TableCell className="text-xs text-slate-700">{m.conducted}</TableCell>
                        <TableCell className="text-xs text-emerald-600 font-semibold">{m.present}</TableCell>
                        <TableCell className="text-xs text-rose-600 font-semibold">{m.absent}</TableCell>
                        <TableCell className="text-xs font-bold text-slate-900">{m.percentage}%</TableCell>
                        <TableCell>
                          <Badge className={`text-[10px] ${m.percentage >= 75 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                            {m.percentage >= 75 ? 'Compliant' : 'Shortage'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
