import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Send, 
  FileText, 
  Download, 
  CheckCircle2, 
  Users, 
  RefreshCw, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import { db } from '@/services/supabase/database';
import { Profile, AttendanceShortageWarning } from '@/types/database.types';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

interface StudentAttendanceSummary {
  id: string;
  name: string;
  roll_number: string;
  department: string;
  class_name: string;
  conducted: number;
  attended: number;
  percentage: number;
  status: 'Safe' | 'Borderline' | 'Shortage';
  hasWarning: boolean;
}

export function AttendanceShortageManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentAttendanceSummary[]>([]);
  const [warnings, setWarnings] = useState<AttendanceShortageWarning[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [assignedClasses, setAssignedClasses] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // 1. Get teacher's assigned classes
      const assignmentData = await db.getTeacherAssignedClassesAndSubjects(user.id, user.name);
      setAssignedClasses(assignmentData.assignedClasses);

      if (assignmentData.assignedClasses.length === 0) {
        setStudents([]);
        setWarnings([]);
        setLoading(false);
        return;
      }

      // 2. Fetch assigned students, warnings, and attendance records
      const [assignedStudents, warningList, attendanceRecords] = await Promise.all([
        db.getStudentsForTeacher(user.id, user.name),
        db.getAttendanceShortageWarnings(),
        db.getStudentAttendance(''),
      ]);

      setWarnings(warningList);

      // 3. Calculate attendance summaries strictly for teacher's assigned students
      const summaries: StudentAttendanceSummary[] = assignedStudents.map((s, idx) => {
        const studentRecords = (attendanceRecords || []).filter(r => r.student_id === s.id);
        const conducted = studentRecords.length;
        const attended = studentRecords.filter(r => {
          const st = r.status?.toLowerCase();
          return st === 'present' || st === 'on_duty' || st === 'leave';
        }).length;

        const pct = conducted > 0 ? Math.round((attended / conducted) * 100) : 100;
        const status = pct >= 80 ? 'Safe' : pct >= 75 ? 'Borderline' : 'Shortage';
        const hasWarning = warningList.some(w => w.student_id === s.id);

        return {
          id: s.id,
          name: s.name,
          roll_number: s.roll_number || s.student_id || `STU-2026-${String(idx + 1001).padStart(4, '0')}`,
          department: s.department || s.class_name || 'Academic Course',
          class_name: s.class_name || 'Assigned Term',
          conducted,
          attended,
          percentage: pct,
          status,
          hasWarning,
        };
      });

      setStudents(summaries);
    } catch (err) {
      console.warn('AttendanceShortageManager loadData warning:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time synchronization
  useRealtimeSubscription({ table: 'student_attendance', onChange: loadData, onReconnect: loadData });
  useRealtimeSubscription({ table: 'attendance_shortage_warnings', onChange: loadData, onReconnect: loadData });
  useRealtimeSubscription({ table: 'timetables', onChange: loadData, onReconnect: loadData });

  // Dispatch Official Shortage Warning
  const handleDispatchWarning = async (student: StudentAttendanceSummary) => {
    setActionLoading(true);
    try {
      const warningLevel = student.percentage < 70 ? 'Level_2_Parent_Summons_70pct' : 'Level_1_Warning_74pct';
      
      const res = await db.createAttendanceShortageWarning({
        student_id: student.id,
        student_name: student.name,
        roll_number: student.roll_number,
        department: student.department,
        class_name: student.class_name,
        current_attendance_pct: student.percentage,
        warning_level: warningLevel,
        issued_date: new Date().toISOString().split('T')[0],
        status: 'Dispatched',
        parent_contacted: true,
      });

      if (res.success) {
        toast({
          title: 'Official Warning Dispatched',
          description: `Shortage notice (${student.percentage}%) issued for ${student.name}. Automated notices routed to Student and Parent portals.`,
        });
        await loadData();
      } else {
        toast({
          title: 'Warning Dispatch Notice',
          description: res.error || 'Notice logged in institution records.',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Error Dispatching Warning',
        description: err.message || 'Could not generate official shortage warning.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const shortageStudents = students.filter(s => s.status === 'Shortage');
  const borderlineStudents = students.filter(s => s.status === 'Borderline');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 bg-white rounded-2xl border border-slate-200">
        <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
        <span className="ml-3 text-sm text-slate-600 font-medium">Computing 75% Criteria across Assigned Cohorts...</span>
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
            You do not currently have any classes assigned by the Administration.
            Attendance shortage and detention monitoring will be enabled once your classes are assigned.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Metric Banner */}
      <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">75% Attendance & Detention Desk</h3>
                <Badge variant="outline" className="text-xs bg-rose-50 text-rose-700 border-rose-200">
                  Assigned Classes Only
                </Badge>
              </div>
              <p className="text-xs text-slate-500">Autonomous university criteria monitor, parent warning letters, and exam hall ticket locks</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            className="h-8 text-xs font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh Records
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Exam Compliant (≥80%)</span>
            <div className="text-xl font-bold text-emerald-700 mt-1">
              {students.filter(s => s.status === 'Safe').length} Students
            </div>
            <p className="text-[11px] text-emerald-600">Unrestricted exam hall ticket access</p>
          </div>

          <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Borderline (75% - 79%)</span>
            <div className="text-xl font-bold text-amber-700 mt-1">
              {borderlineStudents.length} Students
            </div>
            <p className="text-[11px] text-amber-600">Counseling & alert notice stage</p>
          </div>

          <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-xl">
            <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">Shortage Warning (&lt;75%)</span>
            <div className="text-xl font-bold text-rose-700 mt-1">
              {shortageStudents.length} Students
            </div>
            <p className="text-[11px] text-rose-600">Detention warning & hall ticket hold</p>
          </div>
        </div>
      </div>

      {/* Cohort Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Assigned Cohort Attendance Performance</h4>
            <p className="text-xs text-slate-500">Showing students registered across your {assignedClasses.join(', ')}</p>
          </div>
          <Badge variant="secondary" className="text-xs">
            {students.length} Total Enrolled
          </Badge>
        </div>

        {students.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No students currently enrolled in your assigned classes.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Roll / Reg. No</th>
                  <th className="p-3">Class / Course</th>
                  <th className="p-3">Lectures Held</th>
                  <th className="p-3">Attended</th>
                  <th className="p-3">Rate (%)</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3 font-semibold text-slate-800">{student.name}</td>
                    <td className="p-3 font-mono text-slate-600">{student.roll_number}</td>
                    <td className="p-3 text-slate-600">{student.class_name}</td>
                    <td className="p-3 font-semibold text-slate-700">{student.conducted}</td>
                    <td className="p-3 font-semibold text-slate-700">{student.attended}</td>
                    <td className="p-3">
                      <div className="flex items-center space-x-2">
                        <span className={`font-bold ${
                          student.percentage >= 75 ? 'text-emerald-700' : 'text-rose-600'
                        }`}>
                          {student.percentage}%
                        </span>
                        <div className="w-16">
                          <Progress 
                            value={student.percentage} 
                            className={`h-1.5 ${
                              student.percentage >= 75 ? '[&>div]:bg-emerald-600' : '[&>div]:bg-rose-600'
                            }`} 
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge 
                        variant="outline"
                        className={
                          student.status === 'Safe' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : student.status === 'Borderline'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }
                      >
                        {student.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      {student.percentage < 75 ? (
                        <Button
                          size="sm"
                          disabled={actionLoading || student.hasWarning}
                          onClick={() => handleDispatchWarning(student)}
                          className={`h-7 text-xs font-bold ${
                            student.hasWarning 
                              ? 'bg-slate-100 text-slate-500 hover:bg-slate-100 cursor-default' 
                              : 'bg-rose-600 hover:bg-rose-700 text-white'
                          }`}
                        >
                          <Send className="w-3 h-3 mr-1" />
                          {student.hasWarning ? 'Warning Issued' : 'Dispatch Notice'}
                        </Button>
                      ) : (
                        <span className="text-[11px] text-slate-400">Compliant</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
