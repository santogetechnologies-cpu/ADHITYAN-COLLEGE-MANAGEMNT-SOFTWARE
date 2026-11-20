import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { db } from '@/services/supabase/database';
import { studentParentAuthService } from '@/services/studentParentAuthService';
import { 
  PrincipalSidebar, 
  PrincipalView 
} from './principal/PrincipalSidebar';

// 13 Principal Modules
import { OverviewModule } from './principal/modules/OverviewModule';
import { DepartmentsModule } from './principal/modules/DepartmentsModule';
import { StudentsModule } from './principal/modules/StudentsModule';
import { FacultyModule } from './principal/modules/FacultyModule';
import { AttendanceModule } from './principal/modules/AttendanceModule';
import { AcademicsModule } from './principal/modules/AcademicsModule';
import { ExaminationsModule } from './principal/modules/ExaminationsModule';
import { AdmissionsModule } from './principal/modules/AdmissionsModule';
import { ReportsModule } from './principal/modules/ReportsModule';
import { ApprovalsModule } from './principal/modules/ApprovalsModule';
import { EventsModule } from './principal/modules/EventsModule';
import { AnnouncementsModule } from './principal/modules/AnnouncementsModule';
import { SettingsModule } from './principal/modules/SettingsModule';

import { 
  Profile, 
  Department, 
  AdmissionApplication, 
  StaffLeaveApplication, 
  ScholarshipApplication, 
  Certificate, 
  InstitutionalBroadcast, 
  CalendarEvent,
  DailyTeachingUpdate,
  Exam,
  ExamSchedule,
  ExamResult,
  AttendanceShortageWarning,
  DisciplinaryIncident
} from '@/types/database.types';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Menu, 
  RefreshCw, 
  Megaphone, 
  Send, 
  Calendar, 
  Building2, 
  Loader2, 
  ShieldCheck 
} from 'lucide-react';

export default function PrincipalDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active View sync with query param `?view=...`
  const currentView: PrincipalView = (searchParams.get('view') as PrincipalView) || 'dashboard';
  const handleSelectView = (view: PrincipalView) => {
    setSearchParams({ view });
  };

  // Mobile sidebar drawer state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Data States
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [admissions, setAdmissions] = useState<AdmissionApplication[]>([]);
  const [staffLeaves, setStaffLeaves] = useState<StaffLeaveApplication[]>([]);
  const [scholarships, setScholarships] = useState<ScholarshipApplication[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [broadcasts, setBroadcasts] = useState<InstitutionalBroadcast[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [dailyUpdates, setDailyUpdates] = useState<DailyTeachingUpdate[]>([]);
  const [timetables, setTimetables] = useState<any[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [examSchedules, setExamSchedules] = useState<ExamSchedule[]>([]);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [attendanceShortages, setAttendanceShortages] = useState<AttendanceShortageWarning[]>([]);
  const [disciplinaryIncidents, setDisciplinaryIncidents] = useState<DisciplinaryIncident[]>([]);
  const [attendanceMetrics, setAttendanceMetrics] = useState({ rate: 0, totalRecords: 0, presentRecords: 0 });

  // Top level quick broadcast modal
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [publishingBroadcast, setPublishingBroadcast] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    message: '',
    category: 'Circular' as InstitutionalBroadcast['category'],
    target_audience: 'All' as InstitutionalBroadcast['target_audience'],
    priority: 'Normal' as InstitutionalBroadcast['priority'],
  });

  // Load all institutional data from Supabase backend
  const loadData = useCallback(async () => {
    try {
      const [
        allProfiles,
        deptsData,
        admitData,
        leavesData,
        scholarData,
        certsData,
        bcastsData,
        eventsData,
        updatesData,
        timetableData,
        examsData,
        schedulesData,
        resultsData,
        shortageData,
        discData,
        attData
      ] = await Promise.all([
        db.getAllProfiles(),
        db.getDepartments(),
        db.getAdmissionApplications(),
        db.getStaffLeaveApplications(),
        db.getScholarshipApplications(),
        db.getCertificates(),
        db.getInstitutionalBroadcasts(),
        db.getCalendarEvents(),
        db.getDailyTeachingUpdates(),
        db.getTimetables(),
        db.getExams(),
        db.getExamSchedules(),
        db.getExamResults(),
        db.getAttendanceShortageWarnings(),
        db.getDisciplinaryIncidents(),
        db.getInstitutionalAttendanceMetrics()
      ]);

      setProfiles(allProfiles || []);
      setDepartments(deptsData || []);
      setAdmissions(admitData || []);
      setStaffLeaves(leavesData || []);
      setScholarships(scholarData || []);
      setCertificates(certsData || []);
      setBroadcasts(bcastsData || []);
      setCalendarEvents(eventsData || []);
      setDailyUpdates(updatesData || []);
      setTimetables(timetableData || []);
      setExams(examsData || []);
      setExamSchedules(schedulesData || []);
      setExamResults(resultsData || []);
      setAttendanceShortages(shortageData || []);
      setDisciplinaryIncidents(discData || []);
      setAttendanceMetrics(attData || { rate: 0, totalRecords: 0, presentRecords: 0 });
    } catch (err) {
      console.error('Failed to load Principal portal institutional data:', err);
      toast({
        title: "Sync Warning",
        description: "Could not refresh some institutional data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Real-time synchronization
  useRealtimeSubscription({ table: 'institutional_broadcasts', onChange: loadData, onReconnect: loadData });
  useRealtimeSubscription({ table: 'staff_leave_applications', onChange: loadData, onReconnect: loadData });
  useRealtimeSubscription({ table: 'scholarship_applications', onChange: loadData, onReconnect: loadData });
  useRealtimeSubscription({ table: 'admission_applications', onChange: loadData, onReconnect: loadData });
  useRealtimeSubscription({ table: 'certificates', onChange: loadData, onReconnect: loadData });
  useRealtimeSubscription({ table: 'calendar_events', onChange: loadData, onReconnect: loadData });
  useRealtimeSubscription({ table: 'departments', onChange: loadData, onReconnect: loadData });
  useRealtimeSubscription({ table: 'student_attendance', onChange: loadData, onReconnect: loadData });

  // Filtered profiles
  const studentProfiles = useMemo(() => profiles.filter(p => p.role === 'student'), [profiles]);
  const facultyProfiles = useMemo(() => profiles.filter(p => p.role === 'teacher' || p.role === 'hod'), [profiles]);
  const principalProfile = useMemo(() => profiles.find(p => p.role === 'principal') || null, [profiles]);

  // Counts for sidebar badges
  const pendingLeavesCount = useMemo(() => staffLeaves.filter(l => l.status === 'Pending_Principal' || l.status === 'Pending_HOD').length, [staffLeaves]);
  const pendingScholarshipsCount = useMemo(() => scholarships.filter(s => s.status === 'Submitted' || s.status === 'Recommended_HOD' || s.status === 'Verified_Accounts').length, [scholarships]);
  const pendingAdmissionsCount = useMemo(() => admissions.filter(a => a.status === 'Submitted' || a.status === 'Under Review').length, [admissions]);
  const pendingCertsCount = useMemo(() => certificates.filter(c => c.status === 'Pending').length, [certificates]);

  const totalPendingApprovals = pendingLeavesCount + pendingScholarshipsCount + pendingAdmissionsCount + pendingCertsCount;

  // ---------------------------------------------------------------------------
  // PRINCIPAL ACTIONS
  // ---------------------------------------------------------------------------

  // 1. Staff Leaves
  const handleApproveLeave = async (id: string) => {
    setActionLoadingId(id);
    try {
      const ok = await db.updateStaffLeaveStatus(id, 'Approved', principalProfile?.id);
      if (ok) {
        setStaffLeaves(prev => prev.map(l => l.id === id ? { ...l, status: 'Approved', approved_by: principalProfile?.id } : l));
        toast({
          title: "Leave Sanctioned",
          description: "Faculty leave approved with Principal authorization."
        });
      } else {
        throw new Error("Could not update leave in database.");
      }
    } catch (err: any) {
      toast({
        title: "Action Failed",
        description: err.message || "Failed to sanction leave.",
        variant: "destructive"
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectLeave = async (id: string, reason: string) => {
    setActionLoadingId(id);
    try {
      const ok = await db.updateStaffLeaveStatus(id, 'Rejected', principalProfile?.id, reason);
      if (ok) {
        setStaffLeaves(prev => prev.map(l => l.id === id ? { ...l, status: 'Rejected', rejection_reason: reason } : l));
        toast({
          title: "Leave Declined",
          description: "Faculty leave request marked as Rejected."
        });
      } else {
        throw new Error("Could not update leave status in database.");
      }
    } catch (err: any) {
      toast({
        title: "Action Failed",
        description: err.message || "Failed to decline leave.",
        variant: "destructive"
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // 2. Scholarships
  const handleApproveScholarshipDirect = async (id: string) => {
    setActionLoadingId(id);
    try {
      const target = scholarships.find(s => s.id === id);
      const grantAmount = target?.requested_amount || 0;
      const ok = await db.updateScholarshipStatus(id, 'Approved', grantAmount, principalProfile?.id);
      if (ok) {
        setScholarships(prev => prev.map(s => s.id === id ? { ...s, status: 'Approved', sanctioned_amount: grantAmount } : s));
        toast({
          title: "Aid Sanctioned",
          description: `Full concession sanctioned: ₹${grantAmount.toLocaleString()}`
        });
      }
    } catch (err: any) {
      toast({
        title: "Action Failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleGrantScholarship = async (id: string, amount: number) => {
    setActionLoadingId(id);
    try {
      const ok = await db.updateScholarshipStatus(id, 'Approved', amount, principalProfile?.id);
      if (ok) {
        setScholarships(prev => prev.map(s => s.id === id ? { ...s, status: 'Approved', sanctioned_amount: amount } : s));
        toast({
          title: "Aid Sanctioned",
          description: `Sanctioned amount: ₹${amount.toLocaleString()}`
        });
      }
    } catch (err: any) {
      toast({
        title: "Action Failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectScholarship = async (id: string) => {
    setActionLoadingId(id);
    try {
      const reason = window.prompt('Reason for declining this scholarship (required):');
      if (!reason || reason.trim().length < 3) { setActionLoadingId(null); return; }
      const ok = await db.updateScholarshipStatus(id, 'Rejected', 0, principalProfile?.id, reason.trim());
      if (ok) {
        setScholarships(prev => prev.map(s => s.id === id ? { ...s, status: 'Rejected' } : s));
        toast({
          title: "Scholarship Declined",
          description: "Request status updated to Rejected."
        });
      }
    } catch (err: any) {
      toast({
        title: "Action Failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // 3. Admission Applications
  const handleApproveAdmission = async (app: AdmissionApplication) => {
    setActionLoadingId(app.id);
    try {
      // Approval is one step of the admission lifecycle. The offer, deposit and enrolment (which creates the student record and
      // login) are done in Admission Management, where seats, quota and documents are checked.
      await db.updateAdmissionStatus(app.id, 'Approved', 'Approved by Principal');
      toast({
        title: "Application approved",
        description: "Continue with the offer and enrolment in Admission Management.",
      });
      await loadData();
    } catch (err: any) {
      toast({
        title: "Approval failed",
        description: err.message || "Could not approve the application.",
        variant: "destructive",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectAdmission = async (id: string, reason?: string) => {
    setActionLoadingId(id);
    try {
      await db.updateAdmissionStatus(id, 'Rejected', reason || 'Declined by Principal.');
      setAdmissions(prev => prev.map(a => a.id === id ? { ...a, status: 'Rejected', remarks: reason } : a));
      toast({
        title: "Admission Declined",
        description: "Application status updated to Rejected."
      });
    } catch (err: any) {
      toast({
        title: "Action Failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // 4. Certificates
  const handleApproveCertificate = async (id: string) => {
    setActionLoadingId(id);
    try {
      const ok = await db.updateCertificateStatus(id, 'Issued');
      if (ok) {
        setCertificates(prev => prev.map(c => c.id === id ? { ...c, status: 'Issued' } : c));
        toast({
          title: "Certificate Issued",
          description: "Digitally authorized with Principal signature."
        });
      }
    } catch (err: any) {
      toast({
        title: "Action Failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectCertificate = async (id: string) => {
    setActionLoadingId(id);
    try {
      const reason = window.prompt('Reason for declining this certificate (required):');
      if (!reason || reason.trim().length < 3) { setActionLoadingId(null); return; }
      const ok = await db.updateCertificateStatus(id, 'Rejected', reason.trim());
      if (ok) {
        setCertificates(prev => prev.map(c => c.id === id ? { ...c, status: 'Rejected' } : c));
        toast({
          title: "Certificate Declined",
          description: "Status updated to Rejected."
        });
      }
    } catch (err: any) {
      toast({
        title: "Action Failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // 5. Broadcast Circulars
  const handlePublishBroadcast = async (data: {
    title: string;
    message: string;
    category: InstitutionalBroadcast['category'];
    target_audience: InstitutionalBroadcast['target_audience'];
    priority: InstitutionalBroadcast['priority'];
  }): Promise<boolean> => {
    setPublishingBroadcast(true);
    try {
      const author = principalProfile?.name || user?.name || 'Principal';
      const created = await db.createInstitutionalBroadcast({
        title: data.title,
        message: data.message,
        category: data.category,
        priority: data.priority,
        target_audience: data.target_audience,
        author_name: author,
        author_id: principalProfile?.id
      });

      if (created) {
        setBroadcasts(prev => [created, ...prev]);
        toast({
          title: "Circular Dispatched",
          description: `Dispatched to ${data.target_audience} across all college portals.`
        });
        return true;
      }
      return false;
    } catch (err: any) {
      toast({
        title: "Dispatch Failed",
        description: err.message || "Could not publish circular.",
        variant: "destructive"
      });
      return false;
    } finally {
      setPublishingBroadcast(false);
    }
  };

  // Top level quick broadcast submit handler
  const handleQuickBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastForm.title.trim() || !broadcastForm.message.trim()) return;

    const ok = await handlePublishBroadcast(broadcastForm);
    if (ok) {
      setBroadcastModalOpen(false);
      setBroadcastForm({
        title: '',
        message: '',
        category: 'Circular',
        target_audience: 'All',
        priority: 'Normal'
      });
    }
  };

  // 6. Calendar Events
  const handleAddEvent = async (eventData: Omit<CalendarEvent, 'id' | 'created_at'>): Promise<boolean> => {
    try {
      const created = await db.createCalendarEvent(eventData);
      if (created) {
        setCalendarEvents(prev => [...prev, created]);
        toast({
          title: "Event Scheduled",
          description: `Added "${eventData.title}" to institutional calendar.`
        });
        return true;
      }
      return false;
    } catch (err: any) {
      toast({
        title: "Schedule Failed",
        description: err.message || "Could not add event.",
        variant: "destructive"
      });
      return false;
    }
  };

  const handleDeleteEvent = async (id: string): Promise<boolean> => {
    try {
      const ok = await db.deleteCalendarEvent(id);
      if (ok) {
        setCalendarEvents(prev => prev.filter(e => e.id !== id));
        toast({
          title: "Event Removed",
          description: "Calendar entry deleted."
        });
        return true;
      }
      return false;
    } catch (err: any) {
      toast({
        title: "Action Failed",
        description: err.message || "Could not remove event.",
        variant: "destructive"
      });
      return false;
    }
  };

  // ---------------------------------------------------------------------------
  // MODULE RENDERER (13 MODULES)
  // ---------------------------------------------------------------------------
  const renderModule = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <OverviewModule
            onNavigate={handleSelectView}
            students={studentProfiles}
            faculty={facultyProfiles}
            departments={departments}
            admissions={admissions}
            leaves={staffLeaves}
            scholarships={scholarships}
            certificates={certificates}
            broadcasts={broadcasts}
            events={calendarEvents}
            attendanceMetrics={attendanceMetrics}
            onOpenBroadcastModal={() => setBroadcastModalOpen(true)}
          />
        );

      case 'departments':
        return (
          <DepartmentsModule
            departments={departments}
            students={studentProfiles}
            faculty={facultyProfiles}
          />
        );

      case 'students':
        return (
          <StudentsModule
            students={studentProfiles}
            departments={departments}
            certificates={certificates}
            disciplinaryIncidents={disciplinaryIncidents}
          />
        );

      case 'faculty':
        return (
          <FacultyModule
            faculty={facultyProfiles}
            departments={departments}
            leaves={staffLeaves}
          />
        );

      case 'attendance':
        return (
          <AttendanceModule
            students={studentProfiles}
            faculty={facultyProfiles}
            departments={departments}
            attendanceMetrics={attendanceMetrics}
            shortageWarnings={attendanceShortages}
            leaves={staffLeaves}
          />
        );

      case 'academics':
        return (
          <AcademicsModule
            departments={departments}
            calendarEvents={calendarEvents}
            dailyUpdates={dailyUpdates}
            timetableSlots={timetables}
          />
        );

      case 'examinations':
        return (
          <ExaminationsModule
            exams={exams}
            schedules={examSchedules}
            results={examResults}
            departments={departments}
          />
        );

      case 'admissions':
        return (
          <AdmissionsModule
            admissions={admissions}
            departments={departments}
            onApproveAdmission={handleApproveAdmission}
            onRejectAdmission={handleRejectAdmission}
            actionLoadingId={actionLoadingId}
          />
        );

      case 'reports':
        return (
          <ReportsModule
            students={studentProfiles}
            faculty={facultyProfiles}
            departments={departments}
            admissions={admissions}
            leaves={staffLeaves}
            scholarships={scholarships}
            examResults={examResults}
            attendanceMetrics={attendanceMetrics}
          />
        );

      case 'approvals':
        return (
          <ApprovalsModule
            leaves={staffLeaves}
            scholarships={scholarships}
            admissions={admissions}
            certificates={certificates}
            actionLoadingId={actionLoadingId}
            onApproveLeave={handleApproveLeave}
            onRejectLeave={handleRejectLeave}
            onApproveScholarshipDirect={handleApproveScholarshipDirect}
            onGrantScholarship={handleGrantScholarship}
            onRejectScholarship={handleRejectScholarship}
            onApproveAdmission={handleApproveAdmission}
            onRejectAdmission={handleRejectAdmission}
            onApproveCertificate={handleApproveCertificate}
            onRejectCertificate={handleRejectCertificate}
          />
        );

      case 'events':
        return (
          <EventsModule
            events={calendarEvents}
            onAddEvent={handleAddEvent}
            onDeleteEvent={handleDeleteEvent}
          />
        );

      case 'announcements':
        return (
          <AnnouncementsModule
            broadcasts={broadcasts}
            onPublishBroadcast={handlePublishBroadcast}
            publishing={publishingBroadcast}
          />
        );

      case 'settings':
        return (
          <SettingsModule
            principalProfile={principalProfile}
          />
        );

      default:
        return (
          <OverviewModule
            onNavigate={handleSelectView}
            students={studentProfiles}
            faculty={facultyProfiles}
            departments={departments}
            admissions={admissions}
            leaves={staffLeaves}
            scholarships={scholarships}
            certificates={certificates}
            broadcasts={broadcasts}
            events={calendarEvents}
            attendanceMetrics={attendanceMetrics}
            onOpenBroadcastModal={() => setBroadcastModalOpen(true)}
          />
        );
    }
  };

  const currentDateFormatted = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }, []);

  return (
    <div className="min-h-screen bg-slate-50/60 flex">
      {/* -------------------------------------------------------------------- */}
      {/* 1. DEDICATED PRINCIPAL SIDEBAR (EXACTLY 13 MODULES)                  */}
      {/* -------------------------------------------------------------------- */}
      <PrincipalSidebar
        currentView={currentView}
        onSelectView={handleSelectView}
        onLogout={logout}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
        counts={{
          students: studentProfiles.length,
          faculty: facultyProfiles.length,
          departments: departments.length,
          pendingApprovals: totalPendingApprovals,
          pendingAdmissions: pendingAdmissionsCount
        }}
        principalName={principalProfile?.name || user?.name || 'Principal'}
      />

      {/* -------------------------------------------------------------------- */}
      {/* 2. MAIN EXECUTIVE CONTENT WORKSPACE                                  */}
      {/* -------------------------------------------------------------------- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Executive Header Bar */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              aria-label="Open Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-slate-900">
                  Adithyan College of Paramedical Sciences
                </span>
                <Badge variant="outline" className="hidden sm:inline-flex text-[10px] font-semibold border-blue-200 text-blue-700 bg-blue-50">
                  Principal & Dean
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                Executive Governance • Academic Sanctions • Regulatory Compliance
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="hidden md:flex items-center space-x-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{currentDateFormatted}</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={refreshing || loading}
              className="h-8 text-xs font-medium"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sync Data</span>
            </Button>

            <Button
              size="sm"
              onClick={() => setBroadcastModalOpen(true)}
              className="h-8 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
            >
              <Megaphone className="w-3.5 h-3.5 mr-1.5" />
              <span className="hidden sm:inline">Dispatch Circular</span>
              <span className="sm:hidden">Circular</span>
            </Button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {loading ? (
            <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-xs font-medium text-slate-600">
                Synchronizing institutional databases...
              </p>
            </div>
          ) : (
            renderModule()
          )}
        </main>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* 3. QUICK DISPATCH CIRCULAR MODAL                                     */}
      {/* -------------------------------------------------------------------- */}
      <Dialog open={broadcastModalOpen} onOpenChange={setBroadcastModalOpen}>
        <DialogContent className="max-w-md bg-white p-5 rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Megaphone className="w-4 h-4 text-primary" />
              <span>Dispatch Institutional Campus Circular</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Official announcement dispatched across Student, Parent, and Faculty portals.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleQuickBroadcastSubmit} className="space-y-3 pt-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Circular Headline *</label>
              <Input
                required
                placeholder="e.g. Schedule for University Paramedical Practical Examinations"
                value={broadcastForm.title}
                onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Priority Level</label>
                <select
                  value={broadcastForm.priority}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, priority: e.target.value as any })}
                  className="w-full h-8 px-2 text-xs border border-slate-200 rounded-md bg-white"
                >
                  <option value="Normal">Normal Notice</option>
                  <option value="High">Important Advisory</option>
                  <option value="Urgent">Emergency Alert</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Target Audience</label>
                <select
                  value={broadcastForm.target_audience}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, target_audience: e.target.value as any })}
                  className="w-full h-8 px-2 text-xs border border-slate-200 rounded-md bg-white"
                >
                  <option value="All">All Campus Portals</option>
                  <option value="Students">Students Only</option>
                  <option value="Faculty">Faculty & Staff</option>
                  <option value="Parents">Parents Only</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Circular Message *</label>
              <Textarea
                rows={3}
                required
                placeholder="Type circular details and instructions..."
                value={broadcastForm.message}
                onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                className="w-full p-2 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setBroadcastModalOpen(false)} className="h-8 text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={publishingBroadcast} className="h-8 text-xs bg-primary text-primary-foreground font-semibold">
                {publishingBroadcast ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                Dispatch Circular
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
