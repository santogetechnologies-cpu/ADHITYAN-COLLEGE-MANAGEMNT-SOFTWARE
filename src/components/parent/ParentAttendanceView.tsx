import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, CheckCircle2, XCircle, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { db } from '@/services/supabase/database';
import { StudentAttendance } from '@/types/database.types';

interface ParentAttendanceViewProps {
  studentId: string;
  studentName: string;
}

export function ParentAttendanceView({ studentId, studentName }: ParentAttendanceViewProps) {
  const [loading, setLoading] = useState(true);
  const [attendanceRecords, setAttendanceRecords] = useState<StudentAttendance[]>([]);

  const loadAttendance = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const data = await db.getStudentAttendance(studentId);
      setAttendanceRecords(data || []);
    } catch (err) {
      console.warn('Failed to load student attendance:', err);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const total = attendanceRecords.length;
  const presentCount = attendanceRecords.filter(r => r.status?.toLowerCase() === 'present').length;
  const lateCount = attendanceRecords.filter(r => r.status?.toLowerCase() === 'late').length;
  const absentCount = attendanceRecords.filter(r => r.status?.toLowerCase() === 'absent').length;

  const percentage = total > 0 ? Math.round(((presentCount + lateCount * 0.5) / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Attendance Records</h2>
        <p className="text-muted-foreground text-sm">
          Real-time authorized attendance records for {studentName}
        </p>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-border shadow-xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-medium">Cumulative Attendance</span>
            <div className="text-2xl font-bold text-foreground">{percentage}%</div>
            <Progress value={percentage} className="h-1.5 mt-2" />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border shadow-xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Present Sessions
            </span>
            <div className="text-2xl font-bold text-emerald-600">{presentCount}</div>
            <span className="text-[10px] text-muted-foreground">Officially attended</span>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border shadow-xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-500" /> Late Sessions
            </span>
            <div className="text-2xl font-bold text-amber-500">{lateCount}</div>
            <span className="text-[10px] text-muted-foreground">Late arrivals recorded</span>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border shadow-xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5 text-rose-500" /> Absent Sessions
            </span>
            <div className="text-2xl font-bold text-rose-500">{absentCount}</div>
            <span className="text-[10px] text-muted-foreground">Recorded leaves / absences</span>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Log Table */}
      <Card className="rounded-2xl border-border shadow-sm">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#1D61E7]" />
              Authorized Class Attendance Log
            </CardTitle>
            <Badge variant="outline" className="text-xs font-mono">
              Minimum Requirement: 75%
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Directly recorded and verified by assigned Subject Teachers
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-10 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading attendance ledger...
            </div>
          ) : attendanceRecords.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No daily session records marked for this semester yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-border text-muted-foreground font-semibold">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Session</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Faculty Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {attendanceRecords.map((r, idx) => (
                    <tr key={r.id || idx} className="hover:bg-accent/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium">{r.date}</td>
                      <td className="py-3 px-4 font-semibold text-foreground">{r.subject || 'All Classes'}</td>
                      <td className="py-3 px-4 capitalize">{r.session || 'Full Day'}</td>
                      <td className="py-3 px-4">
                        <Badge 
                          variant="outline" 
                          className={
                            r.status === 'Present'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : r.status === 'Late'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }
                        >
                          {r.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{r.remarks || 'Standard session verified'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

