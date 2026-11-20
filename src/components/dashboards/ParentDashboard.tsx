import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  User, 
  TrendingUp, 
  Calendar, 
  Heart, 
  MessageCircle, 
  CreditCard, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  BookOpen, 
  Award, 
  Loader2, 
  Users, 
  Receipt, 
  Bell, 
  FileText, 
  Sparkles, 
  Phone, 
  KeyRound, 
  ChevronRight, 
  GraduationCap,
  Bus,
  MapPin,
  Navigation
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/supabase/database';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { Profile, StudentFee, FeeReceipt, ExamResult, TimetableSlot, ExamSchedule, Assignment } from '@/types/database.types';

// Sub-components
import { ParentChildSwitcher, LinkedChildItem } from '@/components/parent/ParentChildSwitcher';
import { ParentMyChildrenView } from '@/components/parent/ParentMyChildrenView';
import { ParentStudentProfileView } from '@/components/parent/ParentStudentProfileView';
import { ParentAttendanceView } from '@/components/parent/ParentAttendanceView';
import { ParentResultsView } from '@/components/parent/ParentResultsView';
import { ParentPerformanceAnalyticsView } from '@/components/parent/ParentPerformanceAnalyticsView';
import { ParentClassTimetableView } from '@/components/parent/ParentClassTimetableView';
import { ParentExamTimetableView } from '@/components/parent/ParentExamTimetableView';
import { ParentHallTicketsView } from '@/components/parent/ParentHallTicketsView';
import { ParentExamMarksView } from '@/components/parent/ParentExamMarksView';
import { ParentFeesView } from '@/components/parent/ParentFeesView';
import { ParentAssignmentsView } from '@/components/parent/ParentAssignmentsView';
import { ParentAnnouncementsView } from '@/components/parent/ParentAnnouncementsView';
import { ParentNotificationsView } from '@/components/parent/ParentNotificationsView';
import { ParentContactCollegeView } from '@/components/parent/ParentContactCollegeView';
import { ParentSettingsView } from '@/components/parent/ParentSettingsView';

export function ParentDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Navigation tab state (16 comprehensive views)
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Multi-child state
  const [loading, setLoading] = useState(true);
  const [linkedChildren, setLinkedChildren] = useState<LinkedChildItem[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');

  // Child metrics state (synced with active child)
  const [attendanceRate, setAttendanceRate] = useState<number>(88);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [pendingFeeAmount, setPendingFeeAmount] = useState<number>(0);
  const [upcomingExamsCount, setUpcomingExamsCount] = useState<number>(0);
  const [pendingAssignmentsCount, setPendingAssignmentsCount] = useState<number>(0);

  // Load all verified linked children for authenticated parent
  const loadLinkedChildren = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await db.getParentStudentLinks(user.id);
      if (data && data.length > 0) {
        const mapped: LinkedChildItem[] = data.map((d: any) => ({
          linkId: d.id,
          relationship: d.relationship || 'Child',
          student: d.student,
        }));
        setLinkedChildren(mapped);
        
        // Preserve selected child or select first child by default
        setSelectedChildId((prev) => {
          if (prev && mapped.some(c => c.student.id === prev)) {
            return prev;
          }
          return mapped[0].student.id;
        });
      } else {
        setLinkedChildren([]);
        setSelectedChildId('');
      }
    } catch (err) {
      console.warn('Failed to load parent-student links:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadLinkedChildren();
  }, [loadLinkedChildren]);

  // Active child profile object
  const activeChild = useMemo(() => {
    return linkedChildren.find(c => c.student.id === selectedChildId)?.student || linkedChildren[0]?.student;
  }, [linkedChildren, selectedChildId]);

  const activeRelationship = useMemo(() => {
    return linkedChildren.find(c => c.student.id === selectedChildId)?.relationship || 'Child';
  }, [linkedChildren, selectedChildId]);

  // Load child-specific telemetry whenever active child changes
  const loadActiveChildData = useCallback(async () => {
    if (!activeChild?.id) return;

    try {
      const [attendance, results, fees, schedules, assignments] = await Promise.all([
        db.getStudentAttendance(activeChild.id),
        db.getExamResults(activeChild.id),
        db.getStudentFees(activeChild.id),
        db.getExamSchedules({ className: activeChild.class_name || 'Semester 1' }),
        db.getAssignments(activeChild.class_name || 'Semester 1'),
      ]);

      // Calculate attendance rate
      if (attendance && attendance.length > 0) {
        const pres = attendance.filter(a => a.status?.toLowerCase() === 'present').length;
        const lates = attendance.filter(a => a.status?.toLowerCase() === 'late').length;
        setAttendanceRate(Math.round(((pres + lates * 0.5) / attendance.length) * 100));
      } else {
        setAttendanceRate(0);
      }

      setExamResults(results || []);
      const totalF = (fees || []).reduce((sum, f) => sum + Number((f as any).total_due ?? (f as any).amount ?? 0), 0);
      setPendingFeeAmount(totalF > 0 ? totalF : 0);
      setUpcomingExamsCount((schedules || []).length);
      setPendingAssignmentsCount((assignments || []).length);
    } catch (err) {
      console.warn('Failed to load active child metrics:', err);
    }
  }, [activeChild?.id, activeChild?.class_name]);

  useEffect(() => {
    loadActiveChildData();
  }, [loadActiveChildData]);

  // Real-time subscriptions
  useRealtimeSubscription({ table: 'parent_student_links', onChange: loadLinkedChildren, onReconnect: loadLinkedChildren });
  useRealtimeSubscription({ table: 'student_attendance', onChange: loadActiveChildData, onReconnect: loadActiveChildData });
  useRealtimeSubscription({ table: 'exam_results', onChange: loadActiveChildData, onReconnect: loadActiveChildData });
  useRealtimeSubscription({ table: 'student_fees', onChange: loadActiveChildData, onReconnect: loadActiveChildData });
  useRealtimeSubscription({ table: 'assignments', onChange: loadActiveChildData, onReconnect: loadActiveChildData });

  // NAVIGATION ITEMS CONFIGURATION
  const NAV_TABS = [
    { id: 'dashboard', label: 'Parent Dashboard', icon: Sparkles },
    { id: 'my_children', label: `My Children (${linkedChildren.length})`, icon: Users },
    { id: 'profile', label: 'Ward Profile', icon: User },
    { id: 'attendance', label: 'Attendance Log', icon: Calendar },
    { id: 'results', label: 'Academic Results', icon: Award },
    { id: 'analytics', label: 'Performance Analytics', icon: TrendingUp },
    { id: 'timetable', label: 'Class Timetable', icon: Clock },
    { id: 'exams', label: 'Exam Schedules', icon: FileText },
    { id: 'hall_tickets', label: 'Hall Tickets', icon: Receipt },
    { id: 'marks', label: 'Examination Marks', icon: BookOpen },
    { id: 'fees', label: 'Fees & Receipts', icon: CreditCard },
    { id: 'transit', label: 'Ward Transit & Bus', icon: Bus },
    { id: 'assignments', label: 'Assignments', icon: BookOpen },
    { id: 'announcements', label: 'Announcements', icon: Bell },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'contact', label: 'Contact College', icon: Phone },
    { id: 'settings', label: 'Change Password', icon: KeyRound },
  ];

  // STATE: NO CHILDREN LINKED
  if (!loading && linkedChildren.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white rounded-3xl p-6 sm:p-8 shadow-md">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-white/15 border-2 border-white/30 flex items-center justify-center shadow-lg shrink-0">
              <Users className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Welcome, {user?.name || 'Parent'}</h1>
              <p className="opacity-90 text-sm font-mono pt-0.5">Parent ID: {user?.login_id || 'PAR-2026-0001'}</p>
            </div>
          </div>
        </div>

        <Card className="rounded-2xl border-border shadow-sm">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              <CardTitle>No Linked Student Account Found</CardTitle>
            </div>
            <CardDescription>
              Your parent account is verified, but currently has no enrolled student records linked to your Parent ID.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <p className="text-muted-foreground leading-relaxed">
              In accordance with institutional security policies, student and parent accounts are linked exclusively by authorized Administrators and Receptionists during admission confirmation.
            </p>
            <p className="text-muted-foreground">
              Please contact the College Reception Desk with your <strong>Parent ID: {user?.login_id || 'PAR-2026-0001'}</strong> and your child's <strong>Student ID</strong> to link your accounts.
            </p>
            <div className="pt-2">
              <Button onClick={() => setActiveTab('contact')} variant="outline" className="border-blue-300 text-blue-700">
                <Phone className="w-4 h-4 mr-2" /> Contact Reception Desk
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* PARENT PORTAL HEADER WITH DEDICATED CHILD SWITCHER */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white rounded-3xl p-5 sm:p-6 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/30 flex items-center justify-center shrink-0 shadow-inner">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold">Welcome, {user?.name || 'Parent'}</h1>
                <Badge className="bg-white/20 text-white border-white/30 text-[10px] font-mono">
                  {user?.login_id || 'PAR-2026-0001'}
                </Badge>
              </div>
              <p className="text-xs text-white/80 pt-0.5">
                Monitoring Ward: <strong className="text-white underline">{activeChild?.name}</strong> ({activeChild?.student_id || activeChild?.roll_number || 'STU-ID'})
              </p>
            </div>
          </div>

          {/* Child Switcher Component */}
          <div className="self-start lg:self-auto">
            <ParentChildSwitcher
              childrenList={linkedChildren}
              selectedChildId={selectedChildId}
              onSelectChild={(childId) => {
                setSelectedChildId(childId);
                toast({
                  title: 'Ward Switched',
                  description: `Switched portal view to ${linkedChildren.find(c => c.student.id === childId)?.student.name}.`,
                });
              }}
            />
          </div>
        </div>
      </div>

      {/* HORIZONTAL PAGE NAVIGATION TABS */}
      <div className="overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900/60 rounded-2xl border border-border w-max min-w-full">
          {NAV_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <Button
                key={tab.id}
                size="sm"
                variant={isActive ? 'default' : 'ghost'}
                onClick={() => setActiveTab(tab.id)}
                className={`text-xs h-8 px-3 rounded-xl font-medium shrink-0 transition-smooth ${
                  isActive ? 'bg-[#1D61E7] text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-3.5 h-3.5 mr-1.5" />
                {tab.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* TAB CONTENT RENDERING */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Active Ward Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-blue-50/70 border border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/50">
            <div className="flex items-center gap-3">
              <img
                src={activeChild?.avatar_url || activeChild?.avatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"}
                alt={activeChild?.name}
                className="w-12 h-12 rounded-xl object-cover border-2 border-white shadow-xs"
              />
              <div>
                <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                  <span>{activeChild?.name}</span>
                  <Badge className="bg-[#1D61E7] text-white text-[10px] font-mono">
                    {activeChild?.student_id || activeChild?.roll_number || 'STU-ID'}
                  </Badge>
                </h3>
                <p className="text-xs text-muted-foreground pt-0.5">
                  {activeChild?.department} • {activeChild?.class_name || 'Semester 1'} ({activeRelationship})
                </p>
              </div>
            </div>

            {linkedChildren.length > 1 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setActiveTab('my_children')}
                className="text-xs border-blue-200 text-blue-700 hover:bg-blue-100"
              >
                <Users className="w-3.5 h-3.5 mr-1.5" /> View All {linkedChildren.length} Children
              </Button>
            )}
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card 
              className="rounded-2xl border-border shadow-xs hover:border-blue-300 transition-colors cursor-pointer"
              onClick={() => setActiveTab('attendance')}
            >
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-muted-foreground font-medium flex items-center justify-between">
                  <span>Attendance</span>
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                </span>
                <div className="text-2xl font-bold text-foreground">{attendanceRate}%</div>
                <Progress value={attendanceRate} className="h-1.5 mt-1" />
              </CardContent>
            </Card>

            <Card 
              className="rounded-2xl border-border shadow-xs hover:border-emerald-300 transition-colors cursor-pointer"
              onClick={() => setActiveTab('results')}
            >
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-muted-foreground font-medium flex items-center justify-between">
                  <span>Exam Results</span>
                  <Award className="w-3.5 h-3.5 text-emerald-600" />
                </span>
                <div className="text-2xl font-bold text-emerald-600">{examResults.length} Published</div>
                <span className="text-[10px] text-muted-foreground">Semester transcript ready</span>
              </CardContent>
            </Card>

            <Card 
              className="rounded-2xl border-border shadow-xs hover:border-purple-300 transition-colors cursor-pointer"
              onClick={() => setActiveTab('exams')}
            >
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-muted-foreground font-medium flex items-center justify-between">
                  <span>Upcoming Exams</span>
                  <FileText className="w-3.5 h-3.5 text-purple-600" />
                </span>
                <div className="text-2xl font-bold text-purple-600">{upcomingExamsCount} Sessions</div>
                <span className="text-[10px] text-muted-foreground">Official schedule confirmed</span>
              </CardContent>
            </Card>

            <Card 
              className="rounded-2xl border-border shadow-xs hover:border-amber-300 transition-colors cursor-pointer"
              onClick={() => setActiveTab('fees')}
            >
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-muted-foreground font-medium flex items-center justify-between">
                  <span>Academic Fees</span>
                  <CreditCard className="w-3.5 h-3.5 text-amber-500" />
                </span>
                <div className="text-2xl font-bold text-foreground font-mono">
                  {pendingFeeAmount === 0 ? 'Settled' : `₹${pendingFeeAmount.toLocaleString('en-IN')}`}
                </div>
                <span className="text-[10px] text-muted-foreground">Receipts available online</span>
              </CardContent>
            </Card>
          </div>

          {/* Quick Action Navigation Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            <Button
              variant="outline"
              className="h-auto p-3.5 flex flex-col items-center gap-2 rounded-2xl hover:bg-accent border-border"
              onClick={() => setActiveTab('timetable')}
            >
              <Clock className="w-5 h-5 text-[#1D61E7]" />
              <span className="font-semibold text-xs">Class Timetable</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-3.5 flex flex-col items-center gap-2 rounded-2xl hover:bg-accent border-border"
              onClick={() => setActiveTab('hall_tickets')}
            >
              <Receipt className="w-5 h-5 text-purple-600" />
              <span className="font-semibold text-xs">Hall Ticket</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-3.5 flex flex-col items-center gap-2 rounded-2xl hover:bg-accent border-border"
              onClick={() => setActiveTab('assignments')}
            >
              <BookOpen className="w-5 h-5 text-emerald-600" />
              <span className="font-semibold text-xs">Assignments</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-3.5 flex flex-col items-center gap-2 rounded-2xl hover:bg-accent border-border"
              onClick={() => setActiveTab('contact')}
            >
              <Phone className="w-5 h-5 text-amber-500" />
              <span className="font-semibold text-xs">Contact HOD</span>
            </Button>
          </div>
        </div>
      )}

      {activeTab === 'my_children' && (
        <ParentMyChildrenView
          childrenList={linkedChildren}
          selectedChildId={selectedChildId}
          onSelectChild={setSelectedChildId}
          onNavigateTab={setActiveTab}
        />
      )}

      {activeTab === 'profile' && activeChild && (
        <ParentStudentProfileView
          student={activeChild}
          parentUser={user}
          relationship={activeRelationship}
        />
      )}

      {activeTab === 'attendance' && activeChild && (
        <ParentAttendanceView
          studentId={activeChild.id}
          studentName={activeChild.name}
        />
      )}

      {activeTab === 'results' && activeChild && (
        <ParentResultsView
          studentId={activeChild.id}
          studentName={activeChild.name}
        />
      )}

      {activeTab === 'analytics' && activeChild && (
        <ParentPerformanceAnalyticsView
          studentId={activeChild.id}
          studentName={activeChild.name}
          attendanceRate={attendanceRate}
        />
      )}

      {activeTab === 'timetable' && activeChild && (
        <ParentClassTimetableView
          className={activeChild.class_name || 'Semester 1'}
          department={activeChild.department || 'Paramedical Sciences'}
          studentName={activeChild.name}
        />
      )}

      {activeTab === 'exams' && activeChild && (
        <ParentExamTimetableView
          className={activeChild.class_name || 'Semester 1'}
          department={activeChild.department || 'Paramedical Sciences'}
          studentName={activeChild.name}
        />
      )}

      {activeTab === 'hall_tickets' && activeChild && (
        <ParentHallTicketsView student={activeChild} />
      )}

      {activeTab === 'marks' && activeChild && (
        <ParentExamMarksView
          studentId={activeChild.id}
          studentName={activeChild.name}
        />
      )}

      {activeTab === 'fees' && activeChild && (
        <ParentFeesView student={activeChild} />
      )}

      {activeTab === 'transit' && activeChild && (
        <Card className="border">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bus className="h-5 w-5 text-primary" />
                Campus Bus & Transit — {activeChild.name}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Real-time transport telematics, driver verification, and route stops
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => window.location.href = '/track-bus'}>
              <Navigation className="h-4 w-4 mr-1.5" />
              Full Screen Map
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-muted/40 rounded-lg">
                <span className="text-xs text-muted-foreground block">Assigned Fleet Vehicle</span>
                <span className="font-bold text-sm text-foreground">TN-38-AD-1001 (Bus #01)</span>
                <span className="text-xs text-emerald-600 block mt-0.5">● Active on Schedule</span>
              </div>
              <div className="p-3 bg-muted/40 rounded-lg">
                <span className="text-xs text-muted-foreground block">Current Location / Stop</span>
                <span className="font-semibold text-sm text-foreground">Gandhipuram Central Bus Bay</span>
                <span className="text-xs text-muted-foreground block mt-0.5">ETA: 8 mins to next stop</span>
              </div>
              <div className="p-3 bg-muted/40 rounded-lg">
                <span className="text-xs text-muted-foreground block">Driver Contact</span>
                <span className="font-semibold text-sm text-foreground">College Transport Driver</span>
                <a href="tel:+919876543218" className="text-xs text-primary font-medium hover:underline block mt-0.5">
                  📞 +91 98765 43218
                </a>
              </div>
            </div>

            <div className="border rounded-lg p-4 bg-card">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Transit Stops Timeline
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded bg-muted/30">
                  <span className="font-medium">1. Coimbatore Railway Junction</span>
                  <Badge variant="outline" className="text-emerald-700 bg-emerald-50">Completed (07:15 AM)</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-muted/30">
                  <span className="font-medium">2. Gandhipuram Central Bus Stand</span>
                  <Badge variant="outline" className="text-emerald-700 bg-emerald-50">Completed (07:30 AM)</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-muted/30">
                  <span className="font-medium">3. Lakshmi Mills Junction</span>
                  <Badge variant="outline" className="text-emerald-700 bg-emerald-50">Completed (07:45 AM)</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-blue-50/70 border border-blue-200 dark:bg-blue-950/40">
                  <span className="font-semibold text-primary">4. Peelamedu Hope College Stop</span>
                  <Badge className="bg-primary text-white">Current Stop (08:00 AM)</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-muted/30">
                  <span className="font-medium">5. Adithyan Paramedical Campus Bay</span>
                  <Badge variant="outline">Upcoming (08:25 AM)</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'assignments' && activeChild && (
        <ParentAssignmentsView
          className={activeChild.class_name || 'Semester 1'}
          studentId={activeChild.id}
          studentName={activeChild.name}
        />
      )}

      {activeTab === 'announcements' && (
        <ParentAnnouncementsView />
      )}

      {activeTab === 'notifications' && user && (
        <ParentNotificationsView userId={user.id} />
      )}

      {activeTab === 'contact' && activeChild && (
        <ParentContactCollegeView
          parentName={user?.name || 'Parent'}
          studentName={activeChild.name}
          studentId={activeChild.id}
          className={activeChild.class_name || 'Semester 1'}
          parentId={user?.id}
        />
      )}

      {activeTab === 'settings' && (
        <ParentSettingsView />
      )}
    </div>
  );
}
