import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Users, 
  Save, 
  Calendar, 
  BookOpen, 
  RefreshCw, 
  Loader2,
  Lock,
  ShieldCheck,
  ShieldAlert,
  AlertCircle
} from 'lucide-react';
import { db } from '@/services/supabase/database';
import { useAuth } from '@/context/AuthContext';
import { Profile, TimetableSlot } from '@/types/database.types';
import { matchesStudentClass } from '@/config/academicClassRegistry';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

interface StudentRosterItem {
  id: string;
  name: string;
  roll_number: string;
  department: string;
  status: 'Present' | 'Absent' | 'Late' | 'On_Duty';
  remarks?: string;
}

interface PeriodAttendanceDeskProps {
  initialClassName?: string;
}

export function PeriodAttendanceDesk({ initialClassName }: PeriodAttendanceDeskProps = {}) {
  const { user } = useAuth();
  const { toast } = useToast();

  // Assigned classes and subjects from Admin timetable
  const [assignedSlots, setAssignedSlots] = useState<TimetableSlot[]>([]);
  const [assignedClasses, setAssignedClasses] = useState<string[]>([]);
  const [assignedSubjects, setAssignedSubjects] = useState<string[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);

  // Selection states
  const [className, setClassName] = useState<string>(initialClassName || '');
  const [subjectTitle, setSubjectTitle] = useState<string>('');
  const [sessionDate, setSessionDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [periodNumber, setPeriodNumber] = useState<number>(1);

  useEffect(() => {
    if (initialClassName) {
      setClassName(initialClassName);
    }
  }, [initialClassName]);

  // Attendance submission and duplicate lock states
  const [alreadySubmitted, setAlreadySubmitted] = useState<boolean>(false);
  const [submittedSessionInfo, setSubmittedSessionInfo] = useState<{
    id?: string;
    teacherName?: string;
    submittedAt?: string;
    totalPresent?: number;
    totalAbsent?: number;
  } | null>(null);

  const [roster, setRoster] = useState<StudentRosterItem[]>([]);
  const [loadingRoster, setLoadingRoster] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // 1. Load Admin-Assigned Classes & Subjects for this Teacher
  const loadTeacherAssignments = useCallback(async () => {
    if (!user?.id) return;
    setLoadingAssignments(true);
    try {
      const assignmentData = await db.getTeacherAssignedClassesAndSubjects(user.id, user.name);
      setAssignedSlots(assignmentData.assignedSlots);
      setAssignedClasses(assignmentData.assignedClasses);
      setAssignedSubjects(assignmentData.assignedSubjects);

      if (assignmentData.assignedClasses.length > 0) {
        setClassName(prev => assignmentData.assignedClasses.includes(prev) ? prev : assignmentData.assignedClasses[0]);
      }
      if (assignmentData.assignedSubjects.length > 0) {
        setSubjectTitle(prev => assignmentData.assignedSubjects.includes(prev) ? prev : assignmentData.assignedSubjects[0]);
      }
    } catch (err) {
      console.warn('loadTeacherAssignments warning:', err);
    } finally {
      setLoadingAssignments(false);
    }
  }, [user]);

  useEffect(() => {
    loadTeacherAssignments();
  }, [loadTeacherAssignments]);

  // Real-time synchronization if Admin updates timetable slots or assigned classes
  useRealtimeSubscription({
    table: 'timetables',
    onChange: loadTeacherAssignments,
    onReconnect: loadTeacherAssignments,
  });

  useRealtimeSubscription({
    table: 'profiles',
    onChange: loadTeacherAssignments,
    onReconnect: loadTeacherAssignments,
  });

  useEffect(() => {
    const handleSync = () => {
      loadTeacherAssignments();
    };
    window.addEventListener('teacher-assignments-changed', handleSync);
    return () => {
      window.removeEventListener('teacher-assignments-changed', handleSync);
    };
  }, [loadTeacherAssignments]);

  // 2. Load Attendance & Check Duplicate Submission for selected (class, date, period)
  const checkSessionAndLoadRoster = useCallback(async () => {
    if (!className) {
      setRoster([]);
      setLoadingRoster(false);
      return;
    }

    setLoadingRoster(true);
    try {
      // Check if session has already been recorded for this period
      const existing = await db.getClassAttendanceSession(className, sessionDate, periodNumber);

      if (existing.session) {
        setAlreadySubmitted(true);
        setSubmittedSessionInfo({
          id: existing.session.id,
          teacherName: existing.session.teacher_name,
          submittedAt: existing.session.created_at,
          totalPresent: existing.session.total_present,
          totalAbsent: existing.session.total_absent,
        });

        // Map existing recorded roster
        if (existing.records && existing.records.length > 0) {
          const mappedExisting: StudentRosterItem[] = existing.records.map((r: any) => ({
            id: r.student_id,
            name: r.student_name,
            roll_number: r.roll_number,
            department: className,
            status: r.status,
            remarks: r.remarks || '',
          }));
          setRoster(mappedExisting);
          setLoadingRoster(false);
          return;
        }
      } else {
        setAlreadySubmitted(false);
        setSubmittedSessionInfo(null);
      }

      // Not yet submitted: load enrolled students for this class only
      let allStudents = await db.getStudentsByClass(className);
      if ((!allStudents || allStudents.length === 0) && user?.id) {
        const teacherStudents = await db.getStudentsForTeacher(user.id, user.name);
        allStudents = teacherStudents.filter(s => matchesStudentClass(className, s));
      }

      const mappedStudents: StudentRosterItem[] = allStudents.map((s, idx) => ({
        id: s.id,
        name: s.name,
        roll_number: s.roll_number || s.student_id || `STU-${String(idx + 1001).padStart(4, '0')}`,
        department: s.department || className,
        status: 'Present',
        remarks: ''
      }));

      setRoster(mappedStudents);
    } catch (err) {
      console.warn('checkSessionAndLoadRoster notice:', err);
    } finally {
      setLoadingRoster(false);
    }
  }, [className, sessionDate, periodNumber]);

  useEffect(() => {
    checkSessionAndLoadRoster();
  }, [checkSessionAndLoadRoster]);

  // Real-time synchronization when attendance sessions are created
  useRealtimeSubscription({
    table: 'class_attendance_sessions',
    onChange: checkSessionAndLoadRoster,
    onReconnect: checkSessionAndLoadRoster,
  });

  // Bulk status update
  const handleMarkAll = (status: 'Present' | 'Absent') => {
    if (alreadySubmitted) return;
    setRoster(prev => prev.map(s => ({ ...s, status })));
  };

  const handleToggleStatus = (id: string, status: 'Present' | 'Absent' | 'Late' | 'On_Duty') => {
    if (alreadySubmitted) return;
    setRoster(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const handleRemarkChange = (id: string, remarks: string) => {
    if (alreadySubmitted) return;
    setRoster(prev => prev.map(s => s.id === id ? { ...s, remarks } : s));
  };

  const presentCount = roster.filter(s => s.status === 'Present' || s.status === 'On_Duty').length;
  const absentCount = roster.filter(s => s.status === 'Absent').length;
  const attendancePct = roster.length > 0 ? Math.round((presentCount / roster.length) * 100) : 0;

  // Submit attendance (strictly single submission)
  const handleSubmitAttendance = async () => {
    if (alreadySubmitted) {
      toast({
        title: "Duplicate Submission Blocked",
        description: "Attendance has already been recorded for this period. Duplicate entry is not permitted.",
        variant: "destructive"
      });
      return;
    }

    if (!className || !subjectTitle) {
      toast({
        title: "Missing Information",
        description: "Please select an assigned class and subject before recording roll call.",
        variant: "destructive"
      });
      return;
    }

    if (roster.length === 0) {
      toast({
        title: "No Students",
        description: "There are no students registered in this class to mark attendance.",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      const sessionData = {
        teacher_id: user?.id,
        teacher_name: user?.name || 'Class Advisor',
        class_name: className,
        department: user?.department || className,
        subject_code: subjectTitle.split(' ')[0] || 'SUBJ',
        subject_title: subjectTitle,
        session_date: sessionDate,
        period_number: periodNumber,
        total_enrolled: roster.length,
        total_present: presentCount,
        total_absent: absentCount,
        status: 'Completed' as const,
      };

      const records = roster.map(r => ({
        student_id: r.id,
        student_name: r.name,
        roll_number: r.roll_number,
        status: r.status,
        remarks: r.remarks || undefined,
      }));

      const res = await db.createClassAttendanceSession(sessionData, records);
      if (res.success) {
        toast({
          title: "Period Attendance Recorded",
          description: `Period ${periodNumber} (${subjectTitle}) logged: ${presentCount} present, ${absentCount} absent. Student and Parent portals have been updated.`,
        });
        await checkSessionAndLoadRoster();
      } else {
        toast({
          title: "Attendance Submission Failed",
          description: res.error || "Could not record attendance. Duplicate submissions are disabled.",
          variant: "destructive"
        });
      }
    } catch (err: any) {
      toast({
        title: "Error Recording Attendance",
        description: err.message || "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingAssignments) {
    return (
      <div className="flex items-center justify-center py-16 bg-white rounded-2xl border border-slate-200">
        <Loader2 className="w-8 h-8 animate-spin text-[#1D61E7]" />
        <span className="ml-3 text-sm text-slate-600 font-medium">Verifying Assigned Classes & Timetables...</span>
      </div>
    );
  }

  if (assignedClasses.length === 0) {
    return (
      <Card className="shadow-sm border-amber-200 bg-amber-50/40">
        <CardContent className="p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No Assigned Classes Available</h3>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            You do not currently have any classes or periods assigned by the College Administration or Principal.
            Attendance can only be recorded for official classes assigned to your faculty profile.
          </p>
          <p className="text-xs text-muted-foreground">
            Please contact the Academic Dean or Principal's Office to configure your timetable slots.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Session Metadata Controls */}
      <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1D61E7] flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Period-Wise Roll Call Desk</h3>
                <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                  Assigned Classes Only
                </Badge>
              </div>
              <p className="text-xs text-slate-500">Record period attendance. Updates reflect immediately on Student, Parent, and Admin portals.</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!alreadySubmitted && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleMarkAll('Present')}
                className="h-8 text-xs font-bold text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark All Present
              </Button>
            )}

            <Button
              size="sm"
              onClick={handleSubmitAttendance}
              disabled={submitting || alreadySubmitted || roster.length === 0}
              className={`h-8 text-xs font-bold rounded-xl shadow-xs transition-all ${
                alreadySubmitted 
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed hover:bg-slate-200' 
                  : 'bg-[#1D61E7] hover:bg-blue-700 text-white'
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                  Recording...
                </>
              ) : alreadySubmitted ? (
                <>
                  <Lock className="w-3.5 h-3.5 mr-1" />
                  Attendance Locked
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 mr-1" />
                  Submit Roll Call
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Lock Banner if attendance already submitted */}
        {alreadySubmitted && (
          <Alert className="border-emerald-300 bg-emerald-50/70 text-emerald-950">
            <ShieldCheck className="h-4 w-4 text-emerald-700" />
            <AlertTitle className="text-xs font-bold text-emerald-800">
              Attendance Completed for Period {periodNumber} on {sessionDate}
            </AlertTitle>
            <AlertDescription className="text-xs text-emerald-700 mt-0.5">
              Roll call was officially logged by <strong>{submittedSessionInfo?.teacherName || 'Authorized Faculty'}</strong> ({submittedSessionInfo?.totalPresent || presentCount} present, {submittedSessionInfo?.totalAbsent || absentCount} absent).
              To preserve audit compliance, duplicate submissions and unauthorized re-marking are strictly disabled.
            </AlertDescription>
          </Alert>
        )}

        {/* Filter Controls Row: Assigned Classes & Subjects Only */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <Label className="text-[11px] font-bold text-slate-500">My Assigned Class</Label>
            <Select value={className} onValueChange={setClassName}>
              <SelectTrigger className="h-8 text-xs mt-1">
                <SelectValue placeholder="Select assigned class" />
              </SelectTrigger>
              <SelectContent>
                {assignedClasses.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[11px] font-bold text-slate-500">Assigned Subject</Label>
            <Select value={subjectTitle} onValueChange={setSubjectTitle}>
              <SelectTrigger className="h-8 text-xs mt-1">
                <SelectValue placeholder="Select assigned subject" />
              </SelectTrigger>
              <SelectContent>
                {assignedSubjects.map(sub => (
                  <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[11px] font-bold text-slate-500">Period Slot</Label>
            <Select value={String(periodNumber)} onValueChange={(val) => setPeriodNumber(Number(val))}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Period 1 (09:00 - 09:55 AM)</SelectItem>
                <SelectItem value="2">Period 2 (09:55 - 10:50 AM)</SelectItem>
                <SelectItem value="3">Period 3 (11:10 - 12:05 PM)</SelectItem>
                <SelectItem value="4">Period 4 (12:05 - 01:00 PM)</SelectItem>
                <SelectItem value="5">Period 5 (01:45 - 02:40 PM)</SelectItem>
                <SelectItem value="6">Period 6 (02:40 - 03:35 PM)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[11px] font-bold text-slate-500">Session Date</Label>
            <Input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="h-8 text-xs mt-1"
            />
          </div>
        </div>

        {/* Live Attendance Counter Ticker */}
        <div className="flex flex-wrap items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs gap-2">
          <div className="flex items-center space-x-4">
            <span>Enrolled Students: <strong className="text-slate-900">{roster.length}</strong></span>
            <span className="text-emerald-700 font-bold">Present: {presentCount}</span>
            <span className="text-rose-600 font-bold">Absent: {absentCount}</span>
            <span className="text-amber-600 font-bold">
              Late/Duty: {roster.filter(s => s.status === 'Late' || s.status === 'On_Duty').length}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Attendance Rate: <strong className="text-[#1D61E7]">{attendancePct}%</strong>
            {attendancePct < 75 && (
              <span className="ml-2 text-rose-600 font-bold">(Below 75% Threshold)</span>
            )}
          </div>
        </div>
      </div>

      {/* Student Roster Table */}
      {loadingRoster ? (
        <div className="flex items-center justify-center py-12 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-6 h-6 animate-spin text-[#1D61E7]" />
          <span className="ml-2 text-xs text-slate-600">Loading student roster...</span>
        </div>
      ) : roster.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-xs space-y-2">
          <Users className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="font-semibold text-slate-700">No Enrolled Students Found</p>
          <p>No students are registered in {className}. Students admitted to this course will appear automatically.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3 w-12 text-center">#</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Roll / Reg. No</th>
                  <th className="p-3">Attendance Status</th>
                  <th className="p-3">Remarks / Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roster.map((student, idx) => (
                  <tr key={student.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="p-3 font-semibold text-slate-800">
                      {student.name}
                    </td>
                    <td className="p-3 font-mono text-slate-600">
                      {student.roll_number}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          disabled={alreadySubmitted}
                          onClick={() => handleToggleStatus(student.id, 'Present')}
                          className={`px-2 py-1 rounded-md text-[11px] font-bold transition-colors ${
                            student.status === 'Present'
                              ? 'bg-emerald-600 text-white'
                              : alreadySubmitted
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          disabled={alreadySubmitted}
                          onClick={() => handleToggleStatus(student.id, 'Absent')}
                          className={`px-2 py-1 rounded-md text-[11px] font-bold transition-colors ${
                            student.status === 'Absent'
                              ? 'bg-rose-600 text-white'
                              : alreadySubmitted
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Absent
                        </button>
                        <button
                          type="button"
                          disabled={alreadySubmitted}
                          onClick={() => handleToggleStatus(student.id, 'Late')}
                          className={`px-2 py-1 rounded-md text-[11px] font-bold transition-colors ${
                            student.status === 'Late'
                              ? 'bg-amber-600 text-white'
                              : alreadySubmitted
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Late
                        </button>
                        <button
                          type="button"
                          disabled={alreadySubmitted}
                          onClick={() => handleToggleStatus(student.id, 'On_Duty')}
                          className={`px-2 py-1 rounded-md text-[11px] font-bold transition-colors ${
                            student.status === 'On_Duty'
                              ? 'bg-blue-600 text-white'
                              : alreadySubmitted
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          On Duty
                        </button>
                      </div>
                    </td>
                    <td className="p-3">
                      <Input
                        type="text"
                        placeholder={alreadySubmitted ? 'None' : 'Add observation...'}
                        value={student.remarks || ''}
                        disabled={alreadySubmitted}
                        onChange={(e) => handleRemarkChange(student.id, e.target.value)}
                        className="h-7 text-xs max-w-xs"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
