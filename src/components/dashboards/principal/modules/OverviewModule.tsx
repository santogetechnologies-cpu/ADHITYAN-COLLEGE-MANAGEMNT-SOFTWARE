import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  GraduationCap, 
  Building2, 
  Clock, 
  TrendingUp, 
  ShieldCheck, 
  UserCheck, 
  Calendar, 
  Megaphone,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  BookOpen,
  Award
} from 'lucide-react';
import { PrincipalView } from '../PrincipalSidebar';
import { 
  Department, 
  Profile, 
  AdmissionApplication, 
  StaffLeaveApplication, 
  ScholarshipApplication,
  Certificate,
  InstitutionalBroadcast,
  CalendarEvent
} from '@/types/database.types';

interface OverviewModuleProps {
  onNavigate: (view: PrincipalView) => void;
  students: Profile[];
  faculty: Profile[];
  departments: Department[];
  admissions: AdmissionApplication[];
  leaves: StaffLeaveApplication[];
  scholarships: ScholarshipApplication[];
  certificates: Certificate[];
  broadcasts: InstitutionalBroadcast[];
  events: CalendarEvent[];
  attendanceMetrics: { rate: number; totalRecords: number; presentRecords: number };
  onOpenBroadcastModal: () => void;
}

export function OverviewModule({
  onNavigate,
  students,
  faculty,
  departments,
  admissions,
  leaves,
  scholarships,
  certificates,
  broadcasts,
  events,
  attendanceMetrics,
  onOpenBroadcastModal
}: OverviewModuleProps) {
  const pendingLeaves = leaves.filter(l => l.status === 'Pending_HOD' || l.status === 'Pending_Principal' || l.status === 'Submitted');
  const pendingScholarships = scholarships.filter(s => s.status === 'Submitted' || s.status === 'Recommended_HOD');
  const pendingAdmissions = admissions.filter(a => a.status === 'Submitted' || a.status === 'Under Review');
  const pendingCertificates = certificates.filter(c => c.status === 'Pending');
  const totalPendingApprovals = pendingLeaves.length + pendingScholarships.length + pendingAdmissions.length + pendingCertificates.length;

  const approvedAdmissionsCount = admissions.filter(a => a.status === 'Approved').length;

  return (
    <div className="space-y-6">
      {/* -------------------------------------------------------------------- */}
      {/* 1. SUMMARY STATISTICS (8 CORE KPI METRICS)                           */}
      {/* -------------------------------------------------------------------- */}
      <div>
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
          Institutional Vital Metrics
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3">
          {/* 1. Total Students */}
          <Card 
            onClick={() => onNavigate('students')}
            className="bg-white border-slate-200/90 shadow-2xs hover:border-primary/50 transition-colors cursor-pointer"
          >
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Total Students</span>
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1">{students.length}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Enrolled Paramedical</p>
            </CardContent>
          </Card>

          {/* 2. Total Faculty & Staff */}
          <Card 
            onClick={() => onNavigate('faculty')}
            className="bg-white border-slate-200/90 shadow-2xs hover:border-primary/50 transition-colors cursor-pointer"
          >
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Faculty & Staff</span>
                <GraduationCap className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1">{faculty.length}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Teaching & Clinical</p>
            </CardContent>
          </Card>

          {/* 3. Total Departments */}
          <Card 
            onClick={() => onNavigate('departments')}
            className="bg-white border-slate-200/90 shadow-2xs hover:border-primary/50 transition-colors cursor-pointer"
          >
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Departments</span>
                <Building2 className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1">{departments.length}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Academic Programs</p>
            </CardContent>
          </Card>

          {/* 4. Student Attendance */}
          <Card 
            onClick={() => onNavigate('attendance')}
            className="bg-white border-slate-200/90 shadow-2xs hover:border-primary/50 transition-colors cursor-pointer"
          >
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Student Attendance</span>
                <Clock className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {attendanceMetrics.totalRecords > 0 ? `${attendanceMetrics.rate}%` : '0.0%'}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {attendanceMetrics.totalRecords > 0 ? `${attendanceMetrics.presentRecords} of ${attendanceMetrics.totalRecords} sessions` : 'No sessions logged'}
              </p>
            </CardContent>
          </Card>

          {/* 5. Faculty Attendance */}
          <Card 
            onClick={() => onNavigate('attendance')}
            className="bg-white border-slate-200/90 shadow-2xs hover:border-primary/50 transition-colors cursor-pointer"
          >
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Faculty On Duty</span>
                <TrendingUp className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {faculty.length > 0 ? `${Math.max(0, faculty.length - pendingLeaves.length)} / ${faculty.length}` : '0 / 0'}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {pendingLeaves.length > 0 ? `${pendingLeaves.length} on leave review` : 'All faculty active'}
              </p>
            </CardContent>
          </Card>

          {/* 6. Pending Approvals */}
          <Card 
            onClick={() => onNavigate('approvals')}
            className="bg-white border-slate-200/90 shadow-2xs hover:border-primary/50 transition-colors cursor-pointer"
          >
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Pending Approvals</span>
                <ShieldCheck className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-amber-700 mt-1">{totalPendingApprovals}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Requires executive sanction</p>
            </CardContent>
          </Card>

          {/* 7. Current Admissions */}
          <Card 
            onClick={() => onNavigate('admissions')}
            className="bg-white border-slate-200/90 shadow-2xs hover:border-primary/50 transition-colors cursor-pointer"
          >
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Admissions</span>
                <UserCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1">{admissions.length}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {approvedAdmissionsCount} approved candidates
              </p>
            </CardContent>
          </Card>

          {/* 8. Upcoming Events */}
          <Card 
            onClick={() => onNavigate('events')}
            className="bg-white border-slate-200/90 shadow-2xs hover:border-primary/50 transition-colors cursor-pointer"
          >
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Upcoming Events</span>
                <Calendar className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1">{events.length}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Academic & clinical</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* 2. MAIN DASHBOARD CONTENT GRIDS                                      */}
      {/* -------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Left Column (2 Cols wide on desktop) */}
        <div className="lg:col-span-2 space-y-5">
          
          {/* Department Performance Overview */}
          <Card className="bg-white border-slate-200 shadow-2xs">
            <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between border-b border-slate-100">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  Department Distribution & Student Allocation
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Active programs registered in central database
                </CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onNavigate('departments')}
                className="h-7 text-xs text-primary"
              >
                View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="p-4">
              {departments.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No academic departments registered.
                </div>
              ) : (
                <div className="space-y-3">
                  {departments.slice(0, 5).map((dept) => {
                    const deptName = (dept.name || '').toLowerCase();
                    const enrolled = students.filter(s => {
                      const d = (s.department || '').toLowerCase();
                      const c = (s.class_name || '').toLowerCase();
                      return d.includes(deptName) || deptName.includes(d) || c.includes(deptName);
                    }).length;
                    const assignedFaculty = faculty.filter(f => {
                      const d = (f.department || '').toLowerCase();
                      const c = (f.assigned_classes || []).map((x: string) => x.toLowerCase());
                      return d.includes(deptName) || deptName.includes(d) || c.some((x: string) => x.includes(deptName));
                    }).length;

                    return (
                      <div key={dept.id} className="p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors flex items-center justify-between text-xs">
                        <div className="min-w-0 pr-3">
                          <p className="font-semibold text-slate-900 truncate">{dept.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            Code: <span className="font-mono text-slate-700">{dept.code || 'PARAMED'}</span> • Duration: {dept.duration} {dept.duration > 1 ? 'Years' : 'Year'}
                          </p>
                        </div>
                        <div className="flex items-center space-x-3 shrink-0 text-right">
                          <div>
                            <span className="block text-[10px] text-muted-foreground uppercase">Students</span>
                            <span className="font-bold text-slate-900">{enrolled}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-muted-foreground uppercase">Faculty</span>
                            <span className="font-bold text-slate-900">{assignedFaculty}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Approval Summary */}
          <Card className="bg-white border-slate-200 shadow-2xs">
            <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <CardTitle className="text-sm font-bold text-slate-900">
                  Pending Approvals Queue ({totalPendingApprovals})
                </CardTitle>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onNavigate('approvals')}
                className="h-7 text-xs text-primary"
              >
                Approvals Desk <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div 
                  onClick={() => onNavigate('approvals')}
                  className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 cursor-pointer hover:bg-amber-100/50 transition-colors"
                >
                  <span className="text-[11px] font-medium text-amber-800 block">Faculty Leaves</span>
                  <span className="text-xl font-bold text-amber-900">{pendingLeaves.length}</span>
                </div>
                <div 
                  onClick={() => onNavigate('approvals')}
                  className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/60 cursor-pointer hover:bg-emerald-100/50 transition-colors"
                >
                  <span className="text-[11px] font-medium text-emerald-800 block">Scholarships</span>
                  <span className="text-xl font-bold text-emerald-900">{pendingScholarships.length}</span>
                </div>
                <div 
                  onClick={() => onNavigate('approvals')}
                  className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/60 cursor-pointer hover:bg-blue-100/50 transition-colors"
                >
                  <span className="text-[11px] font-medium text-blue-800 block">Admissions</span>
                  <span className="text-xl font-bold text-blue-900">{pendingAdmissions.length}</span>
                </div>
                <div 
                  onClick={() => onNavigate('approvals')}
                  className="p-3 bg-purple-50/60 rounded-xl border border-purple-200/60 cursor-pointer hover:bg-purple-100/50 transition-colors"
                >
                  <span className="text-[11px] font-medium text-purple-800 block">Certificates</span>
                  <span className="text-xl font-bold text-purple-900">{pendingCertificates.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Campus Announcements */}
          <Card className="bg-white border-slate-200 shadow-2xs">
            <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Megaphone className="w-4 h-4 text-blue-600" />
                <CardTitle className="text-sm font-bold text-slate-900">
                  Recent Official Announcements
                </CardTitle>
              </div>
              <div className="flex items-center space-x-2">
                <Button 
                  size="sm" 
                  onClick={onOpenBroadcastModal}
                  className="h-7 text-xs bg-primary text-primary-foreground font-medium"
                >
                  New Notice
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onNavigate('announcements')}
                  className="h-7 text-xs text-primary"
                >
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 divide-y divide-slate-100">
              {broadcasts.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No official campus announcements published yet.
                </div>
              ) : (
                broadcasts.slice(0, 3).map((b) => (
                  <div key={b.id} className="py-2.5 first:pt-0 last:pb-0 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">{b.title}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium">
                        {b.target_audience}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 leading-relaxed">
                      {b.message}
                    </p>
                    <span className="text-[10px] text-muted-foreground block mt-1">
                      {new Date(b.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1 Col wide on desktop) */}
        <div className="space-y-5">
          
          {/* Institutional Attendance Summary */}
          <Card className="bg-white border-slate-200 shadow-2xs">
            <CardHeader className="p-4 pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900">
                Attendance Compliance
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Mandatory university 75% examination threshold
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>Cumulative Student Attendance</span>
                  <span className="text-slate-900 font-bold">{attendanceMetrics.rate}%</span>
                </div>
                <Progress value={attendanceMetrics.rate} className="h-2" />
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 text-[11px] text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span>Conducted Sessions:</span>
                  <strong>{attendanceMetrics.totalRecords}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Present Marks:</span>
                  <strong className="text-emerald-700">{attendanceMetrics.presentRecords}</strong>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onNavigate('attendance')}
                className="w-full h-8 text-xs font-medium"
              >
                Inspect Attendance Desk
              </Button>
            </CardContent>
          </Card>

          {/* Upcoming College Events */}
          <Card className="bg-white border-slate-200 shadow-2xs">
            <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-rose-600" />
                <span>Upcoming Calendar</span>
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onNavigate('events')}
                className="h-7 text-xs text-primary"
              >
                Full Calendar
              </Button>
            </CardHeader>
            <CardContent className="p-4">
              {events.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No upcoming events scheduled.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {events.slice(0, 4).map((e) => (
                    <div key={e.id} className="p-2 rounded-lg border border-slate-100 text-xs flex items-start gap-2.5">
                      <div className="p-1.5 rounded-md bg-rose-50 text-rose-700 font-bold text-center min-w-9">
                        <span className="block text-[9px] uppercase">{new Date(e.date).toLocaleDateString('en-IN', { month: 'short' })}</span>
                        <span className="text-xs">{new Date(e.date).getDate()}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 truncate">{e.title}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {e.time || 'All Day'} • {e.location || 'Campus'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Important Alerts & Directives */}
          <Card className="bg-white border-slate-200 shadow-2xs">
            <CardHeader className="p-4 pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Institutional Directives</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 text-xs space-y-2">
              <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200/60 text-amber-900">
                <p className="font-semibold text-[11px]">Academic Schedule Compliance</p>
                <p className="text-[10px] text-amber-800 mt-0.5 leading-relaxed">
                  All clinical faculty must submit end-of-week lesson updates through the Teacher Portal for accreditation records.
                </p>
              </div>
              <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-200/60 text-blue-900">
                <p className="font-semibold text-[11px]">Admissions Verification</p>
                <p className="text-[10px] text-blue-800 mt-0.5 leading-relaxed">
                  Review and sanction pending candidate submissions to automatically provision student & parent login credentials.
                </p>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
