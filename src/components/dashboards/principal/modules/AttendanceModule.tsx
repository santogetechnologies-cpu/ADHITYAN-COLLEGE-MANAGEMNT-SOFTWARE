import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  GraduationCap, 
  Search, 
  CheckCircle2, 
  XCircle,
  FileText
} from 'lucide-react';
import { Department, Profile, AttendanceShortageWarning, StaffLeaveApplication } from '@/types/database.types';

interface AttendanceModuleProps {
  students: Profile[];
  faculty: Profile[];
  departments: Department[];
  attendanceMetrics: { rate: number; totalRecords: number; presentRecords: number };
  shortageWarnings?: AttendanceShortageWarning[];
  leaves: StaffLeaveApplication[];
}

export function AttendanceModule({
  students,
  faculty,
  departments,
  attendanceMetrics,
  shortageWarnings = [],
  leaves
}: AttendanceModuleProps) {
  const [search, setSearch] = useState('');

  // Department-wise attendance calculation
  const departmentAttendance = useMemo(() => {
    return departments.map(d => {
      const dName = (d.name || '').toLowerCase();
      const enrolled = students.filter(s => {
        const pDept = (s.department || '').toLowerCase();
        const pClass = (s.class_name || '').toLowerCase();
        return pDept.includes(dName) || dName.includes(pDept) || pClass.includes(dName);
      }).length;

      // Base calculated on student ratio or overall rate
      const rate = enrolled > 0 && attendanceMetrics.totalRecords > 0 ? attendanceMetrics.rate : 0;

      return {
        id: d.id,
        name: d.name,
        code: d.code || 'PARAMED',
        enrolled,
        rate
      };
    });
  }, [departments, students, attendanceMetrics]);

  // Active leaves
  const activeStaffLeaves = useMemo(() => {
    return leaves.filter(l => l.status === 'Approved');
  }, [leaves]);

  return (
    <div className="space-y-5">
      {/* Module Title Bar */}
      <div className="pb-2 border-b border-slate-200">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-600" />
          <span>Institutional Attendance Monitoring Desk</span>
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Campus-wide attendance logs, mandatory 75% detention compliance, and faculty duty rosters
        </p>
      </div>

      {/* Top Vital Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-white border-slate-200 shadow-2xs">
          <CardHeader className="p-4 pb-2">
            <span className="text-xs font-semibold text-muted-foreground">Cumulative Student Attendance</span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-black text-slate-900">
              {attendanceMetrics.totalRecords > 0 ? `${attendanceMetrics.rate}%` : '0.0%'}
            </div>
            <Progress value={attendanceMetrics.rate} className="h-2 mt-2" />
            <p className="text-[11px] text-muted-foreground mt-2">
              {attendanceMetrics.totalRecords > 0
                ? `${attendanceMetrics.presentRecords} present out of ${attendanceMetrics.totalRecords} logged sessions`
                : 'No attendance sessions logged yet in Supabase'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-2xs">
          <CardHeader className="p-4 pb-2">
            <span className="text-xs font-semibold text-muted-foreground">Attendance Shortage Alerts</span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-black text-amber-700">
              {shortageWarnings.length}
            </div>
            <p className="text-[11px] text-amber-800 font-medium mt-2">
              Students falling below university 75% threshold
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-2xs">
          <CardHeader className="p-4 pb-2">
            <span className="text-xs font-semibold text-muted-foreground">Faculty On Duty Status</span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-black text-emerald-700">
              {faculty.length > 0 ? `${Math.max(0, faculty.length - activeStaffLeaves.length)} / ${faculty.length}` : '0 / 0'}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              {activeStaffLeaves.length > 0 ? `${activeStaffLeaves.length} on sanctioned leave` : 'All faculty active on duty'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Attendance Views */}
      <Tabs defaultValue="departments" className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-lg">
          <TabsTrigger value="departments" className="text-xs font-semibold px-3 py-1.5 data-[state=active]:bg-white">
            Department-Wise Compliance
          </TabsTrigger>
          <TabsTrigger value="shortage" className="text-xs font-semibold px-3 py-1.5 data-[state=active]:bg-white">
            Attendance Shortage Warnings ({shortageWarnings.length})
          </TabsTrigger>
          <TabsTrigger value="faculty" className="text-xs font-semibold px-3 py-1.5 data-[state=active]:bg-white">
            Faculty Duty & Leave Registry
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Department-Wise */}
        <TabsContent value="departments" className="space-y-3 mt-3">
          <Card className="bg-white border-slate-200 shadow-2xs overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-xs font-bold text-slate-700">Department</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700">Program Code</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700 text-center">Enrolled Students</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700">Attendance Compliance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departmentAttendance.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-semibold text-xs text-slate-900 py-3">{d.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground py-3 font-mono">{d.code}</TableCell>
                    <TableCell className="text-xs font-bold text-slate-900 text-center py-3">{d.enrolled}</TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center space-x-3 max-w-xs">
                        <Progress value={d.rate} className="h-2 flex-1" />
                        <span className="text-xs font-bold text-slate-900 min-w-10 text-right">{d.rate}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Tab 2: Attendance Shortage Warnings */}
        <TabsContent value="shortage" className="space-y-3 mt-3">
          <Card className="bg-white border-slate-200 shadow-2xs overflow-hidden">
            <CardHeader className="p-4 pb-2 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Attendance Shortage Roster (&lt; 75% Requirement)</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Official notices dispatched to students and parents requiring department advisor intervention
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {shortageWarnings.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                  <p className="font-semibold text-slate-800">Zero Attendance Shortages</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    No active students are currently flagged below the 75% detention threshold.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-xs font-bold text-slate-700">Student Name</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">Roll Number</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">Class / Program</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700 text-center">Attended</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700 text-center">Percentage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shortageWarnings.map((w) => (
                      <TableRow key={w.id}>
                        <TableCell className="font-semibold text-xs text-slate-900 py-2.5">{w.student_name}</TableCell>
                        <TableCell className="text-xs font-mono py-2.5">{w.roll_number}</TableCell>
                        <TableCell className="text-xs text-muted-foreground py-2.5">{w.class_name}</TableCell>
                        <TableCell className="text-xs text-center py-2.5">{w.total_attended} / {w.total_conducted}</TableCell>
                        <TableCell className="text-center py-2.5">
                          <Badge variant="destructive" className="text-[10px] font-bold">
                            {w.percentage}%
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

        {/* Tab 3: Faculty Attendance & Leave */}
        <TabsContent value="faculty" className="space-y-3 mt-3">
          <Card className="bg-white border-slate-200 shadow-2xs overflow-hidden">
            <CardHeader className="p-4 pb-2 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-emerald-600" />
                <span>Faculty Duty Status & Sanctioned Leaves</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {activeStaffLeaves.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  All teaching faculty are currently marked present on active clinical duty.
                </div>
              ) : (
                <div className="space-y-2">
                  {activeStaffLeaves.map(l => (
                    <div key={l.id} className="p-3 border rounded-lg flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{l.staff_name}</span>
                        <span className="text-[11px] text-muted-foreground block">
                          {l.department} • {l.leave_type} ({l.total_days} days) • {l.start_date} to {l.end_date}
                        </span>
                        {l.substitute_teacher_name && (
                          <span className="text-[10px] text-emerald-700 font-medium block mt-0.5">
                            Proxy Assigned: {l.substitute_teacher_name}
                          </span>
                        )}
                      </div>
                      <Badge className="text-[10px] bg-amber-100 text-amber-800 border-amber-200">
                        Sanctioned Leave
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
