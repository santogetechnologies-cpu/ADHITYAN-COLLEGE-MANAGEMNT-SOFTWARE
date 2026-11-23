import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSearchParams } from 'react-router-dom';
import { 
  BookOpen, 
  Users, 
  Calendar, 
  PlusCircle, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Loader2, 
  Award, 
  ChevronLeft, 
  GraduationCap, 
  Search,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Plus,
  X
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { matchesStudentClass } from '@/config/academicClassRegistry';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/supabase/database';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useToast } from '@/hooks/use-toast';
import { Assignment, AssignmentSubmission, ExamResult, StudentAttendance, Profile } from '@/types/database.types';
import { EditableText } from '@/components/customizer/EditableText';
import { EditableZone } from '@/components/customizer/EditableZone';

// Tab components
import { PeriodAttendanceDesk } from '@/components/teachers/PeriodAttendanceDesk';
import { TeacherClassTimetableTab } from '@/components/teachers/TeacherClassTimetableTab';
import { TeacherExamsTab } from '@/components/teachers/TeacherExamsTab';
import { DailyTeachingUpdate } from '@/components/teachers/DailyTeachingUpdate';

interface ClassRoster {
  className: string;
  courseName: string;
  year: string;
  semester: string;
  section: string;
  students: Profile[];
  totalStudents: number;
}

export function TeacherDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── View State: 'classes' (grid) or 'workspace' (class workspace) ──
  const [view, setView] = useState<'classes' | 'workspace'>('classes');
  const [selectedClass, setSelectedClass] = useState<string>('');

  // Workspace Tab: students | attendance | timetable | assignments | marks | lesson-updates
  const validWorkspaceTabs = useMemo(() => new Set([
    'students', 'attendance', 'timetable', 'assignments', 'marks', 'lesson-updates'
  ]), []);

  const rawTab = searchParams.get('tab') || 'students';
  const workspaceTab = validWorkspaceTabs.has(rawTab) ? rawTab : 'students';

  const setWorkspaceTab = useCallback((tab: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    }, { replace: false });
  }, [setSearchParams]);

  const [loading, setLoading] = useState(true);
  const [assignedClassRosters, setAssignedClassRosters] = useState<ClassRoster[]>([]);
  const [attendanceRecordsList, setAttendanceRecordsList] = useState<StudentAttendance[]>([]);
  const [examResultsList, setExamResultsList] = useState<ExamResult[]>([]);
  
  // Class-specific assignments and submissions
  const [classAssignments, setClassAssignments] = useState<Assignment[]>([]);
  const [classSubmissions, setClassSubmissions] = useState<AssignmentSubmission[]>([]);
  
  // Student Roster Filter States
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterAttendanceFilter, setRosterAttendanceFilter] = useState<'all' | 'good' | 'shortage'>('all');

  // Grading Modal State
  const [gradingSubmission, setGradingSubmission] = useState<AssignmentSubmission | null>(null);
  const [gradeScore, setGradeScore] = useState<number>(0);
  const [gradeFeedback, setGradeFeedback] = useState<string>('');
  const [isGrading, setIsGrading] = useState(false);

  // New Assignment Modal State
  const [isCreateAssignmentOpen, setIsCreateAssignmentOpen] = useState(false);
  const [newAssignmentTitle, setNewAssignmentTitle] = useState('');
  const [newAssignmentSubject, setNewAssignmentSubject] = useState('');
  const [newAssignmentType, setNewAssignmentType] = useState<'assignment' | 'homework' | 'project'>('assignment');
  const [newAssignmentDueDate, setNewAssignmentDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [newAssignmentDescription, setNewAssignmentDescription] = useState('');
  const [isSubmittingAssignment, setIsSubmittingAssignment] = useState(false);

  // ── Load Teacher Data ──
  const loadTeacherDashboard = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      const [assignedRosters, examResults, attendance, allAssignments, allSubmissions] = await Promise.all([
        db.getTeacherAssignedClassRosters(user.id, user.name),
        (async () => { try { return await db.getExamResults(); } catch { return []; } })(),
        db.getStudentAttendance(''),
        db.getAssignments(),
        db.getAssignmentSubmissions(),
      ]);

      setAssignedClassRosters(assignedRosters);
      setAttendanceRecordsList(attendance || []);
      setExamResultsList(examResults || []);

      // If a class is already selected or default to the first one
      if (assignedRosters.length > 0) {
        setSelectedClass(prev => {
          if (prev && assignedRosters.some(r => r.className === prev)) {
            return prev;
          }
          return assignedRosters[0].className;
        });
      }

      // Filter assignments & submissions relevant to teacher
      setClassAssignments(allAssignments || []);
      setClassSubmissions(allSubmissions || []);
    } catch (err) {
      console.warn('loadTeacherDashboard warning:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadTeacherDashboard();
  }, [loadTeacherDashboard]);

  // Real-time synchronization
  useRealtimeSubscription({ table: 'profiles', onChange: loadTeacherDashboard });
  useRealtimeSubscription({ table: 'timetables', onChange: loadTeacherDashboard });
  useRealtimeSubscription({ table: 'assignments', onChange: loadTeacherDashboard });
  useRealtimeSubscription({ table: 'assignment_submissions', onChange: loadTeacherDashboard });
  useRealtimeSubscription({ table: 'student_attendance', onChange: loadTeacherDashboard });
  useRealtimeSubscription({ table: 'exam_results', onChange: loadTeacherDashboard });
  useRealtimeSubscription({ table: 'daily_teaching_updates', onChange: loadTeacherDashboard });

  useEffect(() => {
    const handleSync = () => loadTeacherDashboard();
    window.addEventListener('teacher-assignments-changed', handleSync);
    return () => window.removeEventListener('teacher-assignments-changed', handleSync);
  }, [loadTeacherDashboard]);

  // ── Current Selected Class Roster ──
  const currentRoster = useMemo(() => {
    return assignedClassRosters.find(r => r.className === selectedClass) || null;
  }, [assignedClassRosters, selectedClass]);

  // ── Enriched Student List for Selected Class ──
  const [minAttendance, setMinAttendance] = useState(75);
  useEffect(() => { db.getInstitutionalSettings().then((i: any) => { if (i?.min_attendance_percentage) setMinAttendance(Number(i.min_attendance_percentage)); }).catch(() => {}); }, []);

  const enrichedStudents = useMemo(() => {
    if (!currentRoster) return [];
    const todayStr = new Date().toISOString().split('T')[0];

    return currentRoster.students.map((stu: Profile) => {
      const stuAttRecords = attendanceRecordsList.filter(a => a.student_id === stu.id);
      const totalAtt = stuAttRecords.length;
      // Same rule as hall-ticket eligibility: present, late, excused and on-duty all count as attended.
      const attended = stuAttRecords.filter(a => ['present', 'late', 'excused', 'excuse', 'on_duty'].includes(String(a.status).toLowerCase())).length;
      const rate = totalAtt > 0 ? Math.round((attended / totalAtt) * 100) : 0;
      const hasShortage = totalAtt >= 2 && rate < minAttendance;
      const todayRecord = stuAttRecords.find(a => a.date === todayStr);

      const stuExams = examResultsList.filter(e => e.student_id === stu.id);
      let academicNote = 'No exam marks recorded';
      if (stuExams.length > 0) {
        const latest = stuExams[0];
        const pct = latest.max_marks ? Math.round((latest.marks_obtained / latest.max_marks) * 100) : latest.marks_obtained;
        academicNote = `${latest.subject || 'Exam'}: ${pct}%`;
      }

      return {
        ...stu,
        totalAtt,
        attRate: rate,
        hasShortage,
        todayStatus: todayRecord?.status || 'unmarked',
        academicNote,
      };
    });
  }, [currentRoster, attendanceRecordsList, examResultsList, minAttendance]);

  // Filtered Students (Search & Attendance Status)
  const filteredStudents = useMemo(() => {
    return enrichedStudents.filter(s => {
      if (rosterAttendanceFilter === 'shortage' && !s.hasShortage) return false;
      if (rosterAttendanceFilter === 'good' && s.hasShortage) return false;
      if (!rosterSearch.trim()) return true;
      const q = rosterSearch.toLowerCase();
      return (
        (s.name || '').toLowerCase().includes(q) ||
        (s.roll_number || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        (s.phone || '').includes(q)
      );
    });
  }, [enrichedStudents, rosterAttendanceFilter, rosterSearch]);

  const shortageCount = useMemo(() => enrichedStudents.filter(s => s.hasShortage).length, [enrichedStudents]);
  const regularCount = useMemo(() => enrichedStudents.filter(s => !s.hasShortage).length, [enrichedStudents]);

  // ── Class Specific Assignments & Submissions ──
  const activeClassAssignments = useMemo(() => {
    if (!selectedClass) return [];
    return classAssignments.filter((a: any) => {
      if (!a.classes || a.classes.length === 0) return true;
      return a.classes.some((c: string) => c === selectedClass || matchesStudentClass(c, { class_name: selectedClass, department: selectedClass }));
    });
  }, [classAssignments, selectedClass]);

  const classStudentIds = useMemo(() => {
    if (!currentRoster) return new Set<string>();
    return new Set(currentRoster.students.map(s => s.id));
  }, [currentRoster]);

  const activeClassSubmissions = useMemo(() => {
    if (!selectedClass || !currentRoster) return [];
    const assignmentIds = new Set(activeClassAssignments.map(a => a.id));
    return classSubmissions.filter(sub => {
      return assignmentIds.has(sub.assignment_id) || classStudentIds.has(sub.student_id);
    });
  }, [selectedClass, currentRoster, activeClassAssignments, classSubmissions, classStudentIds]);

  // ── Grade Submission Handler ──
  const handleSaveGrade = async () => {
    if (!gradingSubmission) return;
    if (!Number.isFinite(gradeScore) || gradeScore < 0 || gradeScore > 100) {
      toast({ title: 'Invalid score', description: 'Enter a score between 0 and 100.', variant: 'destructive' });
      return;
    }
    setIsGrading(true);
    try {
      await db.gradeAssignmentSubmission(gradingSubmission.id, gradeScore, gradeFeedback);
      toast({
        title: 'Submission Graded',
        description: `Recorded grade score of ${gradeScore}% for ${gradingSubmission.student_name || 'Student'}.`,
      });
      setGradingSubmission(null);
      await loadTeacherDashboard();
    } catch (err: any) {
      toast({
        title: 'Grading Failed',
        description: err.message || 'Could not update grade.',
        variant: 'destructive',
      });
    } finally {
      setIsGrading(false);
    }
  };

  // ── Create Assignment Handler ──
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssignmentTitle.trim()) {
      toast({ title: 'Title Required', description: 'Please enter an assignment title.', variant: 'destructive' });
      return;
    }

    setIsSubmittingAssignment(true);
    try {
      const subject = newAssignmentSubject.trim() || currentRoster?.courseName || '';
      if (!subject) { toast({ title: 'Subject required', description: 'Enter the subject for this assignment.', variant: 'destructive' }); setIsSubmittingAssignment(false); return; }
      const due = new Date(newAssignmentDueDate);
      due.setHours(23, 59, 59, 0);

      await db.createAssignment({
        title: newAssignmentTitle.trim(),
        subject,
        description: newAssignmentDescription.trim(),
        type: newAssignmentType,
        priority: 'high',
        due_date: due.toISOString(),
        classes: [selectedClass],
        teacher_id: user?.id,
        teacher_name: user?.name || '',
        attachments: [],
      });

      // Dispatch notifications to students of this class
      if (currentRoster && currentRoster.students.length > 0) {
        await db.notifyMany(currentRoster.students.map((st: any) => st.id), `New Assignment: ${newAssignmentTitle.trim()}`, `${subject} coursework due on ${due.toLocaleDateString()}.`, 'info', 'high');
      }

      toast({
        title: 'Assignment Posted',
        description: `Successfully published assignment for ${selectedClass}.`,
      });

      setIsCreateAssignmentOpen(false);
      setNewAssignmentTitle('');
      setNewAssignmentSubject('');
      setNewAssignmentDescription('');
      await loadTeacherDashboard();
    } catch (err: any) {
      toast({
        title: 'Assignment Creation Failed',
        description: err.message || 'Could not create assignment.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingAssignment(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 1: CLASS SELECTION GRID
  // ──────────────────────────────────────────────────────────────────────────
  if (view === 'classes') {
    return (
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <EditableText
              id="teacher_portal_title"
              defaultText="Faculty Portal"
              as="h1"
              className="text-xl font-bold text-slate-900 tracking-tight"
            />
            <p className="text-xs text-slate-500 mt-0.5">
              {user?.name || 'Faculty Member'} • {user?.department || 'Paramedical Faculty'} • {assignedClassRosters.length} {assignedClassRosters.length === 1 ? 'Class' : 'Classes'} Assigned
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadTeacherDashboard}
              disabled={loading}
              className="h-8 text-xs font-medium"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Injected Content Zone for Faculty Dashboard */}
        <EditableZone zoneId="teacher_dashboard_top" className="my-3" />

        {/* Assigned Classes Section */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
            <Loader2 className="w-7 h-7 animate-spin text-blue-600 mb-2" />
            <p className="text-sm font-medium text-slate-600">Loading your assigned classes...</p>
          </div>
        ) : assignedClassRosters.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 p-8">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <GraduationCap className="w-7 h-7 text-slate-400" />
            </div>
            <h2 className="text-base font-semibold text-slate-800">No Classes Assigned</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              The Administration has not yet linked any course classes to your faculty account. Please contact the college administration to assign your courses and sections.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">My Assigned Classes</h2>
                <p className="text-xs text-slate-500">Select a class to access its dedicated workspace</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignedClassRosters.map((roster) => (
                <div
                  key={roster.className}
                  onClick={() => {
                    setSelectedClass(roster.className);
                    setRosterSearch('');
                    setRosterAttendanceFilter('all');
                    setView('workspace');
                    setWorkspaceTab('students');
                  }}
                  className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[11px] font-bold ${
                          roster.totalStudents > 0
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-50 text-slate-500 border-slate-200'
                        }`}
                      >
                        {roster.totalStudents} {roster.totalStudents === 1 ? 'Student' : 'Students'}
                      </Badge>
                    </div>

                    <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {roster.courseName}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {roster.year}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {roster.semester}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-blue-600 font-semibold group-hover:translate-x-0.5 transition-transform">
                    <span>Open Class Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 2: DEDICATED CLASS WORKSPACE
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Workspace Top Command Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: Navigation and Class Details */}
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setView('classes');
                setSearchParams((prev) => {
                  const n = new URLSearchParams(prev);
                  n.delete('tab');
                  return n;
                });
              }}
              className="text-xs h-8 pl-2 pr-3 text-slate-700 hover:text-slate-900 border-slate-200 font-semibold"
            >
              <ChevronLeft className="w-4 h-4 mr-1 text-slate-500" />
              Back to Classes
            </Button>

            <div className="h-5 w-px bg-slate-200 hidden sm:block" />

            {currentRoster && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-slate-900">{currentRoster.courseName}</span>
                <Badge variant="outline" className="text-[10px] font-semibold bg-blue-50 text-blue-700 border-blue-200">
                  {currentRoster.year} • {currentRoster.semester}
                </Badge>
                <Badge variant="outline" className="text-[10px] font-medium text-slate-600">
                  {currentRoster.totalStudents} {currentRoster.totalStudents === 1 ? 'enrolled student' : 'enrolled students'}
                </Badge>
              </div>
            )}
          </div>

          {/* Right: Quick Class Switcher */}
          {assignedClassRosters.length > 1 && (
            <div className="flex items-center gap-2 self-start md:self-center">
              <span className="text-xs text-slate-500 whitespace-nowrap">Switch Class:</span>
              <Select
                value={selectedClass}
                onValueChange={(val) => {
                  setSelectedClass(val);
                  setRosterSearch('');
                  setRosterAttendanceFilter('all');
                }}
              >
                <SelectTrigger className="h-8 text-xs w-[240px] bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {assignedClassRosters.map((r) => (
                    <SelectItem key={r.className} value={r.className} className="text-xs">
                      {r.courseName} - {r.year} ({r.semester})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Workspace Tab Bar */}
        <div className="flex items-center gap-1 mt-4 pt-3 border-t border-slate-100 overflow-x-auto pb-1">
          {[
            { id: 'students', label: 'Students', icon: Users },
            { id: 'attendance', label: 'Attendance', icon: Clock },
            { id: 'timetable', label: 'Timetable', icon: Calendar },
            { id: 'assignments', label: 'Assignments', icon: FileText },
            { id: 'marks', label: 'Marks', icon: Award },
            { id: 'lesson-updates', label: 'Lesson Updates', icon: BookOpen },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setWorkspaceTab(id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all ${
                workspaceTab === id
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: STUDENTS                                                   */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {workspaceTab === 'students' && (
        <div className="space-y-5">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-2xs">
              <div className="text-2xl font-bold font-mono text-slate-900">{currentRoster?.totalStudents || 0}</div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">Enrolled Students</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-2xs">
              <div className="text-2xl font-bold font-mono text-emerald-700">
                {enrichedStudents.filter(s => s.todayStatus === 'present' || s.todayStatus === 'on_duty').length}
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">Present Today</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-2xs">
              <div className={`text-2xl font-bold font-mono ${shortageCount > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                {shortageCount}
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">Attendance Shortage</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-2xs">
              <div className="text-2xl font-bold font-mono text-blue-700">
                {enrichedStudents.length > 0
                  ? Math.round(enrichedStudents.reduce((acc, s) => acc + s.attRate, 0) / enrichedStudents.length)
                  : 100}%
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">Class Average</div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                placeholder="Search student name, ID, or phone..."
                className="h-9 pl-8 text-xs bg-white border-slate-200"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant={rosterAttendanceFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setRosterAttendanceFilter('all')}
                className="h-8 text-xs px-3"
              >
                All ({currentRoster?.totalStudents || 0})
              </Button>
              <Button
                size="sm"
                variant={rosterAttendanceFilter === 'good' ? 'default' : 'outline'}
                onClick={() => setRosterAttendanceFilter('good')}
                className={`h-8 text-xs px-3 ${rosterAttendanceFilter !== 'good' ? 'text-emerald-700' : ''}`}
              >
                Regular ({regularCount})
              </Button>
              <Button
                size="sm"
                variant={rosterAttendanceFilter === 'shortage' ? 'destructive' : 'outline'}
                onClick={() => setRosterAttendanceFilter('shortage')}
                className={`h-8 text-xs px-3 ${rosterAttendanceFilter !== 'shortage' ? 'text-rose-600' : ''}`}
              >
                Shortage ({shortageCount})
              </Button>
            </div>
          </div>

          {/* Student Table */}
          {filteredStudents.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-2xl py-14 text-center p-6 shadow-2xs">
              <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">
                {currentRoster?.totalStudents === 0
                  ? 'No students enrolled in this class yet.'
                  : 'No students match your search or filter.'}
              </p>
              {currentRoster?.totalStudents === 0 && (
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Enrolled students admitted through the Admission Management module will appear here automatically.
                </p>
              )}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="py-3 px-4 text-left font-bold uppercase tracking-wider text-[10px]">Student Details</th>
                      <th className="py-3 px-4 text-left font-bold uppercase tracking-wider text-[10px]">Student ID</th>
                      <th className="py-3 px-4 text-left font-bold uppercase tracking-wider text-[10px]">Attendance %</th>
                      <th className="py-3 px-4 text-left font-bold uppercase tracking-wider text-[10px]">Today's Status</th>
                      <th className="py-3 px-4 text-left font-bold uppercase tracking-wider text-[10px]">Academic Evaluation</th>
                      <th className="py-3 px-4 text-left font-bold uppercase tracking-wider text-[10px]">Contact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((stu) => (
                      <tr key={stu.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-8 w-8 border border-slate-200 shrink-0">
                              <AvatarImage src={stu.avatar_url} alt={stu.name} />
                              <AvatarFallback className="bg-blue-50 text-blue-700 text-xs font-bold">
                                {stu.name?.charAt(0) || 'S'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-bold text-slate-900">{stu.name}</div>
                              <div className="text-[10px] text-slate-400">{stu.email || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="font-mono text-[10px] font-bold bg-blue-50 text-blue-700 border-blue-200">
                            {stu.roll_number || stu.student_id || 'N/A'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          {stu.totalAtt === 0 ? (
                            <Badge variant="outline" className="text-[10px] text-slate-500">New</Badge>
                          ) : stu.hasShortage ? (
                            <Badge variant="destructive" className="text-[10px] font-mono flex items-center gap-1 w-fit">
                              <AlertTriangle className="w-3 h-3" /> {stu.attRate}% Shortage
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-mono font-bold w-fit ${
                                stu.attRate >= 85
                                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                  : 'text-blue-700 bg-blue-50 border-blue-200'
                              }`}
                            >
                              {stu.attRate >= 85 ? <CheckCircle2 className="w-3 h-3 inline mr-1" /> : null}
                              {stu.attRate}%
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {stu.todayStatus === 'present' || stu.todayStatus === 'on_duty' ? (
                            <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Present
                            </span>
                          ) : stu.todayStatus === 'absent' ? (
                            <span className="text-[11px] font-semibold text-rose-600">Absent</span>
                          ) : stu.todayStatus === 'late' ? (
                            <span className="text-[11px] font-semibold text-amber-600">Late</span>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Not marked</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-xs">{stu.academicNote}</td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{stu.phone || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: ATTENDANCE                                                 */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {workspaceTab === 'attendance' && (
        <PeriodAttendanceDesk initialClassName={selectedClass} />
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: TIMETABLE                                                  */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {workspaceTab === 'timetable' && (
        <TeacherClassTimetableTab selectedClass={selectedClass} />
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* TAB 4: ASSIGNMENTS                                                */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {workspaceTab === 'assignments' && (
        <div className="space-y-6">
          {/* Header Action Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Class Assignments & Homework</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage coursework and grade student submissions for {selectedClass}.
              </p>
            </div>
            <Button
              onClick={() => setIsCreateAssignmentOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 px-3.5"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Create Assignment
            </Button>
          </div>

          {/* Active Assignments List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Posted Assignments ({activeClassAssignments.length})
            </h3>

            {activeClassAssignments.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center shadow-2xs">
                <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-700">No Assignments Posted Yet</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Click 'Create Assignment' to assign coursework to students of {selectedClass}.
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {activeClassAssignments.map((a) => {
                  const subsForAssignment = activeClassSubmissions.filter(s => s.assignment_id === a.id);
                  const isClosed = new Date(a.due_date) < new Date();

                  return (
                    <Card key={a.id} className="border-slate-200 shadow-2xs">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <CardTitle className="text-sm font-bold text-slate-900">{a.title}</CardTitle>
                            <CardDescription className="text-xs text-blue-600 font-semibold mt-0.5">
                              {a.subject} • {a.type?.toUpperCase()}
                            </CardDescription>
                          </div>
                          <Badge variant={isClosed ? 'secondary' : 'default'} className="text-[10px]">
                            {isClosed ? 'Closed' : 'Active'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-0">
                        {a.description && (
                          <p className="text-xs text-slate-600 line-clamp-2">{a.description}</p>
                        )}
                        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                          <span>Due: {new Date(a.due_date).toLocaleDateString()}</span>
                          <span className="font-semibold text-slate-700">{subsForAssignment.length} Submissions</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Submissions Pending Grading */}
          <div className="space-y-3 pt-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              Student Submissions ({activeClassSubmissions.length})
            </h3>

            {activeClassSubmissions.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center shadow-2xs">
                <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-700">No Student Submissions Yet</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Submissions uploaded by enrolled students will appear here for grading and evaluation.
                </p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="py-3 px-4 text-left font-bold uppercase tracking-wider text-[10px]">Student</th>
                        <th className="py-3 px-4 text-left font-bold uppercase tracking-wider text-[10px]">Subject / Work</th>
                        <th className="py-3 px-4 text-left font-bold uppercase tracking-wider text-[10px]">Submitted Date</th>
                        <th className="py-3 px-4 text-left font-bold uppercase tracking-wider text-[10px]">Attachment</th>
                        <th className="py-3 px-4 text-left font-bold uppercase tracking-wider text-[10px]">Status</th>
                        <th className="py-3 px-4 text-center font-bold uppercase tracking-wider text-[10px]">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeClassSubmissions.map((sub) => (
                        <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-900">{sub.student_name || 'Student'}</td>
                          <td className="py-3 px-4 text-slate-600">{sub.subject || 'Assignment'}</td>
                          <td className="py-3 px-4 text-slate-500">
                            {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : 'Recent'}
                          </td>
                          <td className="py-3 px-4">
                            {sub.attachment_url ? (
                              <a
                                href={sub.attachment_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
                              >
                                View File <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-slate-400 italic">No file</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {sub.status === 'graded' ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                                Graded ({sub.score}%)
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                                Needs Grading
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Button
                              size="sm"
                              variant={sub.status === 'graded' ? 'outline' : 'default'}
                              className={`h-7 text-xs font-semibold ${sub.status !== 'graded' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
                              onClick={() => {
                                setGradingSubmission(sub);
                                setGradeScore(sub.score ?? 0);
                                setGradeFeedback(sub.feedback || '');
                              }}
                            >
                              {sub.status === 'graded' ? 'Update Grade' : 'Grade Work'}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* TAB 5: MARKS & EXAMS                                              */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {workspaceTab === 'marks' && (
        <TeacherExamsTab initialClassName={selectedClass} />
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* TAB 6: LESSON UPDATES                                             */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {workspaceTab === 'lesson-updates' && (
        <DailyTeachingUpdate selectedClass={selectedClass} embedded={true} />
      )}

      {/* ── Grading Dialog ── */}
      <Dialog open={!!gradingSubmission} onOpenChange={(open) => !open && setGradingSubmission(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Grade Student Submission</DialogTitle>
            <DialogDescription>
              Assign score and feedback for <strong>{gradingSubmission?.student_name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="grade-score" className="text-xs">Score (%)</Label>
              <Input
                id="grade-score"
                type="number"
                min={0}
                max={100}
                value={gradeScore}
                onChange={(e) => setGradeScore(Number(e.target.value))}
                className="text-xs font-mono font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grade-feedback" className="text-xs">Teacher Remarks & Feedback</Label>
              <Textarea
                id="grade-feedback"
                placeholder="Evaluation notes, feedback for student..."
                value={gradeFeedback}
                onChange={(e) => setGradeFeedback(e.target.value)}
                className="text-xs"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGradingSubmission(null)} disabled={isGrading}>
              Cancel
            </Button>
            <Button onClick={handleSaveGrade} disabled={isGrading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
              {isGrading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save Grade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create Assignment Dialog ── */}
      <Dialog open={isCreateAssignmentOpen} onOpenChange={setIsCreateAssignmentOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Course Assignment</DialogTitle>
            <DialogDescription>
              Post coursework to enrolled students of <strong>{selectedClass}</strong>.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateAssignment} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="asg-title" className="text-xs">Assignment Title</Label>
              <Input
                id="asg-title"
                placeholder="e.g. Clinical ECG Interpretation Case Study"
                value={newAssignmentTitle}
                onChange={(e) => setNewAssignmentTitle(e.target.value)}
                required
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="asg-subject" className="text-xs">Subject / Module</Label>
                <Input
                  id="asg-subject"
                  placeholder="e.g. Dialysis Technology"
                  value={newAssignmentSubject}
                  onChange={(e) => setNewAssignmentSubject(e.target.value)}
                  className="text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="asg-due" className="text-xs">Due Date</Label>
                <Input
                  id="asg-due"
                  type="date"
                  value={newAssignmentDueDate}
                  onChange={(e) => setNewAssignmentDueDate(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="asg-type" className="text-xs">Coursework Type</Label>
              <Select
                value={newAssignmentType}
                onValueChange={(val: any) => setNewAssignmentType(val)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assignment">Theory Assignment</SelectItem>
                  <SelectItem value="homework">Homework Problem Set</SelectItem>
                  <SelectItem value="project">Clinical Case / Practical Project</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="asg-desc" className="text-xs">Instructions & Requirements</Label>
              <Textarea
                id="asg-desc"
                placeholder="Detailed instructions for the coursework..."
                value={newAssignmentDescription}
                onChange={(e) => setNewAssignmentDescription(e.target.value)}
                rows={3}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateAssignmentOpen(false)} disabled={isSubmittingAssignment}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingAssignment} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
                {isSubmittingAssignment ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Publish Assignment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
