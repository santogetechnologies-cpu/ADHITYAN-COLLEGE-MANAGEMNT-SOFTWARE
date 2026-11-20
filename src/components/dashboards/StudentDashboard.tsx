import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/supabase/database';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useToast } from '@/hooks/use-toast';
import { getIndiaTimeInfo, IndiaTimeInfo } from '@/lib/indiaTime';

// Layout Chrome
import { CampusProDesktopSidebar } from '@/components/student/CampusProDesktopSidebar';
import { CampusProDesktopHeader } from '@/components/student/CampusProDesktopHeader';
import { CampusProMobileHeader } from '@/components/student/CampusProMobileHeader';
import { CampusProMobileNav } from '@/components/student/CampusProMobileNav';

// Views
import { CampusProDashboardView } from '@/components/student/CampusProDashboardView';
import { AILearningVenture } from '@/components/student/AILearningVenture';
import { AssignmentsHomework } from '@/components/assignments/AssignmentsHomework';
import { PerformanceAnalytics } from '@/components/performance/PerformanceAnalytics';
import { StudentAttendanceTab } from '@/components/student/StudentAttendanceTab';
import { StudentClassTimetableTab } from '@/components/student/StudentClassTimetableTab';
import { StudentExams } from '@/components/student/StudentExams';
import { StudentFeesTab } from '@/components/student/StudentFeesTab';
import { StudentStoreTab } from '@/components/student/StudentStoreTab';
import { StudentPlacementTab } from '@/components/student/StudentPlacementTab';
import { StudentBusTab } from '@/components/student/StudentBusTab';
import { StudentComplaintsTab } from '@/components/student/StudentComplaintsTab';
import { StudentSettingsTab } from '@/components/student/StudentSettingsTab';

// Types
import { ExamSchedule, Assignment, StudentAttendance, TimetableSlot } from '@/types/database.types';

export function StudentDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Navigation View State synchronized with URL query params (?tab=...)
  // This enables natural browser Back, Forward, direct URLs, and retains tab state on refresh
  const rawView = searchParams.get('tab') || searchParams.get('view') || 'dashboard';

  const validViews = useMemo(() => new Set([
    'dashboard', 'attendance', 'timetable', 'class-timetable', 
    'learning', 'assignments', 'performance', 'morning-checkin', 
    'evening-checkin', 'exams', 'fees', 'store', 'transport', 
    'placement', 'complaints', 'settings'
  ]), []);

  const currentView = validViews.has(rawView) ? rawView : 'dashboard';

  const setCurrentView = useCallback((newView: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (!newView || newView === 'dashboard') {
        next.delete('tab');
        next.delete('view');
      } else {
        next.set('tab', newView);
        next.delete('view');
      }
      return next;
    }, { replace: false });
  }, [setSearchParams]);

  const [searchQuery, setSearchQuery] = useState<string>('');

  // Real-time IST Session State
  const [timeInfo, setTimeInfo] = useState<IndiaTimeInfo>(() => getIndiaTimeInfo());
  const [sessionCheckedIn, setSessionCheckedIn] = useState<boolean>(false);
  const [sessionCheckInTime, setSessionCheckInTime] = useState<string | null>(null);
  const [submittedMood, setSubmittedMood] = useState<string | null>(null);

  // Dashboard Aggregates (Real Database Values)
  const [overallGrade, setOverallGrade] = useState<number | null>(null);
  const [attendanceRate, setAttendanceRate] = useState<number | null>(null);
  const [pendingAssignmentsCount, setPendingAssignmentsCount] = useState<number>(0);
  const [upcomingExams, setUpcomingExams] = useState<Array<ExamSchedule & { daysLeft: number }>>([]);
  const [pendingFees, setPendingFees] = useState<number>(0);
  const [recentAnnouncements, setRecentAnnouncements] = useState<Array<{ id: string; title: string; message: string; time: string }>>([]);
  const [subjectScores, setSubjectScores] = useState<Array<{ subject: string; score: number; height: string }>>([]);
  const [busInfo, setBusInfo] = useState<{ busNumber: string; driverName: string; routeName: string; status: string }>({
    busNumber: 'TN-38-AD-1001 (Bus #01)',
    driverName: 'College Transport Driver',
    routeName: 'Coimbatore Junction to Campus',
    status: 'active'
  });

  // Student Identity from Database Profile
  const studentName = useMemo(() => user?.name || 'Student', [user?.name]);
  const studentRoll = useMemo(() => user?.roll_number || 'ID Pending', [user?.roll_number]);
  const studentDepartment = useMemo(() => user?.department || 'Paramedical Sciences', [user?.department]);
  const studentClass = useMemo(() => user?.class_name || 'Current Term', [user?.class_name]);
  const avatarUrl = useMemo(() => user?.avatar_url || user?.avatar || '', [user?.avatar_url, user?.avatar]);

  // Periodic IST Time Refresh (every 60 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeInfo(getIndiaTimeInfo());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const loadDashboardData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [results, attendance, assignments, submissions, schedules, checkins, feesList, notifications, transportRes] = await Promise.all([
        db.getExamResults(user.id),
        db.getStudentAttendance(user.id),
        db.getAssignments(user.class_name),
        db.getAssignmentSubmissions(user.id),
        db.getExamSchedules({ className: user.class_name }),
        db.getTodayWellnessCheckin(user.id),
        db.getStudentFees(user.id),
        db.getNotifications(user.id),
        db.getStudentTransportAssignment(user.id),
      ]);

      if (transportRes && transportRes.vehicle) {
        setBusInfo({
          busNumber: transportRes.vehicle.vehicle_number,
          driverName: transportRes.vehicle.driver_name || 'College Transport Driver',
          routeName: transportRes.vehicle.route_name || 'Campus Transit Route',
          status: transportRes.vehicle.status || 'active',
        });
      }

      // 1. Overall grade % from verified examination results
      if (results && results.length > 0) {
        const totalPct = results.reduce((acc, r) => {
          const max = Number(r.max_marks) || 100;
          const obtained = Number(r.marks_obtained) || 0;
          return acc + (obtained / max) * 100;
        }, 0);
        setOverallGrade(Math.round(totalPct / results.length));

        // Subject-wise bar breakdown
        const subjectMap: Record<string, number> = {};
        results.forEach(r => {
          const max = Number(r.max_marks) || 100;
          const obtained = Number(r.marks_obtained) || 0;
          subjectMap[r.subject] = Math.round((obtained / max) * 100);
        });
        const mappedScores = Object.entries(subjectMap).slice(0, 5).map(([subj, score]) => ({
          subject: subj.length > 12 ? `${subj.slice(0, 10)}...` : subj,
          score,
          height: `${Math.max(15, Math.min(100, score))}%`,
        }));
        setSubjectScores(mappedScores);
      } else {
        setOverallGrade(null);
        setSubjectScores([]);
      }

      // 2. Attendance rate % calculated against total conducted sessions
      // (Total Present Sessions / Total Conducted Sessions) * 100
      // Never shows 100% just because the student attended one class
      const attSummary = await db.getStudentAttendanceSummary(user.id, user.class_name);
      if (attSummary && attSummary.totalConducted > 0) {
        setAttendanceRate(attSummary.percentage);
      } else {
        setAttendanceRate(null);
      }

      // 3. Pending assignments count
      const submittedIds = new Set((submissions || []).map(s => s.assignment_id));
      const now = new Date();
      const activePending = (assignments || []).filter(a => 
        !submittedIds.has(a.id) && new Date(a.due_date) >= now
      );
      setPendingAssignmentsCount(activePending.length);

      // 4. Upcoming exams with days left
      const nowMs = Date.now();
      const mappedExams = (schedules || [])
        .map(s => {
          const examTime = new Date(s.exam_date).getTime();
          const daysLeft = Math.ceil((examTime - nowMs) / (1000 * 3600 * 24));
          return { ...s, daysLeft: isNaN(daysLeft) ? 0 : daysLeft };
        })
        .filter(e => e.daysLeft >= 0)
        .sort((a, b) => a.daysLeft - b.daysLeft)
        .slice(0, 5);
      setUpcomingExams(mappedExams);

      // 5. Time-based Student Mood Check-in status (Completely Separate from Attendance)
      const currentSession = timeInfo.session; // 'morning' | 'afternoon' | 'evening'
      const todayMoods = await db.getTodayStudentMoodCheckin(user.id);
      const activeMoodRecord = todayMoods[currentSession];

      if (activeMoodRecord) {
        setSessionCheckedIn(true);
        setSubmittedMood(activeMoodRecord.mood);
        const d = activeMoodRecord.created_at ? new Date(activeMoodRecord.created_at) : new Date();
        setSessionCheckInTime(d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
      } else {
        setSessionCheckedIn(false);
        setSubmittedMood(null);
        setSessionCheckInTime(null);
      }

      // 6. Real Pending Fees
      if (feesList && feesList.length > 0) {
        const pending = feesList.reduce((acc, f) => acc + Number(f.total_due || 0), 0);
        setPendingFees(pending);
      } else {
        setPendingFees(0);
      }

      // 7. Recent Notifications / Announcements
      if (notifications && notifications.length > 0) {
        setRecentAnnouncements(notifications.slice(0, 4).map(n => ({
          id: n.id,
          title: n.title,
          message: n.message,
          time: new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        })));
      } else {
        setRecentAnnouncements([]);
      }
    } catch (err) {
      console.warn('StudentDashboard aggregate error:', err);
    }
  }, [user?.id, user?.class_name, timeInfo.session]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Real-time synchronization
  useRealtimeSubscription({ table: 'exam_results', onChange: loadDashboardData });
  useRealtimeSubscription({ table: 'student_attendance', onChange: loadDashboardData });
  useRealtimeSubscription({ table: 'class_attendance_sessions', onChange: loadDashboardData });
  useRealtimeSubscription({ table: 'assignments', onChange: loadDashboardData });
  useRealtimeSubscription({ table: 'assignment_submissions', onChange: loadDashboardData });
  useRealtimeSubscription({ table: 'exam_schedules', onChange: loadDashboardData });
  useRealtimeSubscription({ table: 'student_mood_checkins', onChange: loadDashboardData });
  useRealtimeSubscription({ table: 'wellness_checkins', onChange: loadDashboardData });
  useRealtimeSubscription({ table: 'student_fees', onChange: loadDashboardData });
  useRealtimeSubscription({ table: 'notifications', onChange: loadDashboardData });

  // Quick mood check-in submit for current session (NOT ATTENDANCE)
  const handleQuickSessionCheckin = async (mood: string, note?: string) => {
    if (!user?.id) return;
    if (sessionCheckedIn) {
      toast({
        title: 'Already Logged',
        description: `You have already logged your mood for the ${timeInfo.session} session today.`,
      });
      return;
    }
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await db.submitStudentMoodCheckin({
        userId: user.id,
        studentId: user.student_id || user.roll_number,
        session: timeInfo.session,
        mood: mood as any,
        notes: note || undefined,
        date: todayStr,
      });

      if (res) {
        toast({
          title: `Mood Recorded: ${mood}`,
          description: `Your ${timeInfo.session} wellbeing check-in has been logged in Supabase.`,
        });
        setSessionCheckedIn(true);
        setSubmittedMood(mood);
        setSessionCheckInTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
      }
    } catch (err: any) {
      toast({
        title: 'Mood Check-in Error',
        description: err.message || 'Unable to record mood check-in.',
        variant: 'destructive',
      });
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div 
      className="min-h-screen flex flex-col lg:flex-row antialiased text-slate-800 relative bg-[#F4F8FE] bg-cover bg-top lg:bg-left-top bg-no-repeat bg-fixed"
      style={{
        backgroundImage: `url('/lovable-uploads/Academic%20Blue%20Campus%20Portal%20Background.png')`,
      }}
    >
      {/* =========================================================================
          DESKTOP SIDEBAR (Visible on lg: 1024px and up)
      ========================================================================= */}
      <div className="hidden lg:block shrink-0">
        <CampusProDesktopSidebar
          currentView={currentView}
          onSelectView={setCurrentView}
          onLogout={handleLogout}
          pendingAssignmentsCount={pendingAssignmentsCount}
        />
      </div>

      {/* =========================================================================
          MAIN APPLICATION VIEW AREA
      ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Desktop Top Header (Visible on lg: 1024px and up) */}
        <div className="hidden lg:block">
          <CampusProDesktopHeader
            studentName={studentName}
            studentRole="Student"
            avatarUrl={avatarUrl}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onNavigate={setCurrentView}
            onOpenSettings={() => setCurrentView('settings')}
            onLogout={handleLogout}
          />
        </div>

        {/* Mobile Top Header (Visible on < 1024px) */}
        <div className="lg:hidden">
          <CampusProMobileHeader
            currentView={currentView}
            onBackToHome={() => {
              if (window.history.state?.idx > 0) {
                navigate(-1);
              } else {
                setCurrentView('dashboard');
              }
            }}
          />
        </div>

        {/* Dynamic View Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 max-w-7xl w-full mx-auto">
          {/* 1. Dashboard Overview */}
          {currentView === 'dashboard' && (
            <CampusProDashboardView
              studentName={studentName}
              studentRoll={studentRoll}
              studentDepartment={studentDepartment}
              studentClass={studentClass}
              avatarUrl={avatarUrl}
              overallGrade={overallGrade}
              attendanceRate={attendanceRate}
              pendingAssignmentsCount={pendingAssignmentsCount}
              upcomingExams={upcomingExams}
              pendingFees={pendingFees}
              timeInfo={timeInfo}
              sessionCheckedIn={sessionCheckedIn}
              sessionCheckInTime={sessionCheckInTime}
              submittedMood={submittedMood}
              subjectScores={subjectScores}
              recentAnnouncements={recentAnnouncements}
              busInfo={busInfo}
              onNavigate={setCurrentView}
              onSubmitSessionMood={handleQuickSessionCheckin}
            />
          )}

          {/* 2. Unified Read-Only Academic Attendance */}
          {currentView === 'attendance' && (
            <StudentAttendanceTab />
          )}

          {/* 2b. Weekly Class Timetable (Separate from Examination Timetable) */}
          {(currentView === 'timetable' || currentView === 'class-timetable') && (
            <StudentClassTimetableTab />
          )}

          {/* 3. AI Assistant */}
          {currentView === 'learning' && (
            <AILearningVenture />
          )}

          {/* 4. Assignments & Homework */}
          {currentView === 'assignments' && (
            <AssignmentsHomework />
          )}

          {/* 5. Performance Analytics */}
          {currentView === 'performance' && (
            <PerformanceAnalytics />
          )}

          {/* 6. Legacy Check-in Tab Aliases (Direct to Attendance Tab) */}
          {currentView === 'morning-checkin' && (
            <StudentAttendanceTab />
          )}
          {currentView === 'evening-checkin' && (
            <StudentAttendanceTab />
          )}

          {/* 7. Upcoming Exams & Semester Marks */}
          {currentView === 'exams' && (
            <StudentExams />
          )}

          {/* 8. Fees, Receipts & Scholarships */}
          {currentView === 'fees' && (
            <StudentFeesTab />
          )}

          {/* 9. Campus Store */}
          {currentView === 'store' && (
            <StudentStoreTab />
          )}

          {/* 10. Bus Tracking */}
          {currentView === 'transport' && (
            <StudentBusTab />
          )}

          {currentView === 'placement' && (
            <StudentPlacementTab />
          )}

          {/* 11. Raise Complaints */}
          {currentView === 'complaints' && (
            <StudentComplaintsTab />
          )}

          {/* 12. Settings & Student Profile */}
          {currentView === 'settings' && (
            <StudentSettingsTab onLogout={handleLogout} />
          )}
        </main>
      </div>

      {/* =========================================================================
          MOBILE BOTTOM NAVIGATION (Visible on < 1024px)
      ========================================================================= */}
      <CampusProMobileNav
        currentView={currentView}
        onSelectView={setCurrentView}
        onLogout={handleLogout}
        pendingAssignmentsCount={pendingAssignmentsCount}
      />
    </div>
  );
}
