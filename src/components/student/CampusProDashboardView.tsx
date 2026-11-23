import { useState, useMemo } from 'react';
import { 
  Users, 
  FileText, 
  Calendar, 
  TrendingUp, 
  ArrowRight, 
  ChevronRight, 
  Clock, 
  Bus, 
  Sparkles, 
  Zap, 
  GraduationCap, 
  Building2, 
  CheckCircle2, 
  Smile, 
  Meh, 
  Frown, 
  AlertCircle, 
  ShoppingBag, 
  BarChart3,
  Check,
  Award,
  Sun
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Assignment, ExamSchedule, TimetableSlot } from '@/types/database.types';
import { EditableText } from '@/components/customizer/EditableText';
import { EditableZone } from '@/components/customizer/EditableZone';
import { IndiaTimeInfo } from '@/lib/indiaTime';
import { getCourseSemesters } from '@/constants/courses';
import { InstitutionName } from '@/lib/institution';

interface DashboardViewProps {
  studentName: string;
  studentRoll?: string;
  studentDepartment?: string;
  studentClass?: string;
  avatarUrl?: string;
  overallGrade: number | null;
  attendanceRate: number | null;
  pendingAssignmentsCount: number;
  upcomingExams: Array<ExamSchedule & { daysLeft: number }>;
  pendingFees?: number;
  timeInfo?: IndiaTimeInfo;
  sessionCheckedIn?: boolean;
  sessionCheckInTime?: string | null;
  submittedMood?: string | null;
  subjectScores?: Array<{ subject: string; score: number; height: string }>;
  recentAnnouncements?: Array<{ id: string; title: string; message: string; time: string }>;
  busInfo?: { busNumber: string; driverName: string; routeName: string; status: string };
  onNavigate: (view: string) => void;
  onSubmitSessionMood?: (mood: string, note?: string) => Promise<void>;
  onSubmitMorningMood?: (mood: string, note?: string) => Promise<void>;
  morningCompleted?: boolean;
}

export function CampusProDashboardView({
  studentName,
  studentRoll = 'ID Pending',
  studentDepartment = 'Paramedical Sciences',
  studentClass = 'Current Term',
  avatarUrl,
  overallGrade,
  attendanceRate,
  pendingAssignmentsCount,
  upcomingExams,
  pendingFees = 0,
  timeInfo,
  sessionCheckedIn = false,
  sessionCheckInTime = null,
  submittedMood = null,
  subjectScores = [],
  recentAnnouncements = [],
  busInfo = {
    busNumber: 'TN-38-AD-1001 (Bus #01)',
    driverName: 'College Transport Driver',
    routeName: 'Coimbatore Junction to Campus',
    status: 'active'
  },
  onNavigate,
  onSubmitSessionMood,
  onSubmitMorningMood,
  morningCompleted = false,
}: DashboardViewProps) {
  // Session check-in widget state
  const [selectedMood, setSelectedMood] = useState<string>('Happy');
  const [noteText, setNoteText] = useState<string>('');
  const [isSubmittingCheckin, setIsSubmittingCheckin] = useState(false);

  const displayAttendance = attendanceRate !== null ? `${attendanceRate}%` : 'Not Recorded';
  const displayGrade = overallGrade !== null ? `${overallGrade}%` : 'Awaiting Marks';

  const isCheckedIn = sessionCheckedIn || morningCompleted;
  const [avatarLoadError, setAvatarLoadError] = useState(false);

  const studentInitials = useMemo(() => {
    if (!studentName) return 'ST';
    const parts = studentName.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return studentName.slice(0, 2).toUpperCase();
  }, [studentName]);

  const dynamicSemesters = useMemo(() => {
    return getCourseSemesters(studentDepartment);
  }, [studentDepartment]);

  // Standard Institutional Mood Options: Happy, Good, Normal, Tired, Stressed, Unwell
  const moods = [
    { id: 'Happy', label: 'Happy', emoji: '😊' },
    { id: 'Good', label: 'Good', emoji: '🙂' },
    { id: 'Normal', label: 'Normal', emoji: '😐' },
    { id: 'Tired', label: 'Tired', emoji: '😴' },
    { id: 'Stressed', label: 'Stressed', emoji: '😰' },
    { id: 'Unwell', label: 'Unwell', emoji: '🤒' },
  ];

  const handleQuickCheckinSubmit = async () => {
    if (onSubmitSessionMood) {
      setIsSubmittingCheckin(true);
      try {
        await onSubmitSessionMood(selectedMood, noteText);
      } finally {
        setIsSubmittingCheckin(false);
      }
    } else if (onSubmitMorningMood) {
      setIsSubmittingCheckin(true);
      try {
        await onSubmitMorningMood(selectedMood, noteText);
      } finally {
        setIsSubmittingCheckin(false);
      }
    } else {
      onNavigate('attendance');
    }
  };

  return (
    <div className="space-y-6">
      {/* =========================================================================
          HERO BANNER (Adaptive: Desktop Panorama vs Mobile Card)
      ========================================================================= */}
      {/* Desktop & Tablet Panorama Hero Banner */}
      <div className="hidden sm:block relative rounded-2xl overflow-hidden bg-gradient-to-r from-[#0F3774] via-[#164FA8] to-[#1D61E7] p-6 lg:p-7 text-white shadow-sm">
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center space-x-5 max-w-xl">
            {/* Student Avatar with Clean Initials Fallback */}
            <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white/20 shrink-0 bg-white/10 shadow-md flex items-center justify-center">
              {avatarUrl && !avatarLoadError ? (
                <img 
                  src={avatarUrl} 
                  alt={studentName} 
                  className="w-full h-full object-cover"
                  onError={() => setAvatarLoadError(true)}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-[#071E47] to-[#1D61E7] text-white font-extrabold text-2xl flex items-center justify-center uppercase select-none">
                  {studentInitials}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <EditableText
                id="student_welcome_title"
                defaultText="Welcome back, {studentName}!"
                variables={{ studentName }}
                as="h1"
                className="text-2xl lg:text-3xl font-bold tracking-tight text-white"
              />
              <EditableText
                id="student_welcome_subtitle"
                defaultText="Keep learning, achieve more, and build your future."
                as="p"
                className="text-white/80 text-xs sm:text-sm block"
              />

              {/* Badges / Pill Tags */}
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-white/90">
                <span className="flex items-center space-x-1.5">
                  <GraduationCap className="w-4 h-4 text-blue-200" />
                  <strong className="font-semibold">{studentRoll}</strong>
                </span>
                <span className="text-white/40">|</span>
                <span className="flex items-center space-x-1.5">
                  <Building2 className="w-4 h-4 text-blue-200" />
                  <span>{studentDepartment}</span>
                </span>
                <span className="text-white/40">|</span>
                <span className="flex items-center space-x-1.5">
                  <Calendar className="w-4 h-4 text-blue-200" />
                  <span>{studentClass}</span>
                </span>
                <span className="text-white/40">|</span>
                <button
                  onClick={() => onNavigate('timetable')}
                  className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-white/20 hover:bg-white/30 transition-colors text-white font-bold cursor-pointer border border-white/25 shadow-2xs"
                >
                  <Clock className="w-3.5 h-3.5 text-blue-200" />
                  <span>Class Timetable →</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Side Campus Architectural Visual & Motto */}
          <div className="hidden lg:flex flex-col items-end justify-between self-stretch shrink-0 pl-6">
            <div className="w-64 h-24 rounded-xl overflow-hidden opacity-90 relative">
              <img 
                src="/assets/campus-building.svg" 
                alt="Adhithyan College" 
                className="w-full h-full object-cover object-center rounded-xl"
              />
              <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#164FA8]/60" />
            </div>
            <div className="text-xs italic tracking-wider font-medium text-blue-100/90 pt-1">
              Dream • Learn • Excel
            </div>
          </div>
        </div>
      </div>

      {/* Contextual Injected Content Zone below Hero */}
      <EditableZone zoneId="student_hero_bottom" className="my-3" />

      {/* Mobile Stacked Hero Card */}
      <div className="sm:hidden space-y-3">
        {/* Mobile Student Profile Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center space-x-3.5">
          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-slate-200 shrink-0 bg-slate-100 flex items-center justify-center">
            {avatarUrl && !avatarLoadError ? (
              <img 
                src={avatarUrl} 
                alt={studentName} 
                className="w-full h-full object-cover"
                onError={() => setAvatarLoadError(true)}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-[#0F3774] to-[#1D61E7] text-white font-bold text-sm flex items-center justify-center uppercase select-none">
                {studentInitials}
              </div>
            )}
          </div>
          <div className="space-y-0.5 min-w-0 flex-1">
            <EditableText
              id="student_welcome_mobile_title"
              defaultText="Welcome back, {studentName}!"
              variables={{ studentName }}
              as="h2"
              className="text-base font-bold text-slate-900 truncate"
            />
            <div className="text-[11px] text-slate-500 truncate">
              {studentRoll} • {studentDepartment} • {studentClass}
            </div>
          </div>
        </div>

        {/* Mobile Campus Banner with Motto */}
        <div className="relative rounded-2xl overflow-hidden h-28 shadow-2xs border border-slate-200/60">
          <img 
            src="/assets/campus-building.svg" 
            alt="Campus" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent flex items-end p-3.5">
            <span className="text-xs font-bold text-white tracking-widest uppercase">
              Learn • Grow • Excel
            </span>
          </div>
        </div>
      </div>

      {/* Pending Fees Alert Banner if applicable */}
      {pendingFees > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-lg shrink-0">
              ₹
            </div>
            <div>
              <p className="text-xs font-bold text-amber-900">Tuition Fee Due Notice</p>
              <p className="text-[11px] text-amber-700">
                You have a pending fee balance of <strong className="font-bold">₹{pendingFees.toLocaleString('en-IN')}</strong> for the current academic term.
              </p>
            </div>
          </div>
          <Button 
            size="sm" 
            onClick={() => onNavigate('fees')} 
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs rounded-xl font-semibold shrink-0"
          >
            View Fee Statement →
          </Button>
        </div>
      )}

      {/* =========================================================================
          ROW 1: KEY METRIC CARDS
      ========================================================================= */}
      {/* Mobile Stat Pills & Action Blocks (Matches Mobile Board) */}
      <div className="sm:hidden space-y-4">
        {/* 3 Stat Cards in a row */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs text-center space-y-1">
            <div className="w-8 h-8 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="text-base font-bold text-slate-900 leading-none">{displayAttendance}</div>
            <div className="text-[10px] text-slate-500 font-medium">Attendance</div>
          </div>

          <div 
            onClick={() => onNavigate('assignments')}
            className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs text-center space-y-1 cursor-pointer"
          >
            <div className="w-8 h-8 mx-auto rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div className="text-base font-bold text-slate-900 leading-none">{pendingAssignmentsCount}</div>
            <div className="text-[10px] text-slate-500 font-medium">Pending Tasks</div>
          </div>

          <div 
            onClick={() => onNavigate('exams')}
            className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs text-center space-y-1 cursor-pointer"
          >
            <div className="w-8 h-8 mx-auto rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="text-base font-bold text-slate-900 leading-none">{upcomingExams.length}</div>
            <div className="text-[10px] text-slate-500 font-medium">Upcoming Exams</div>
          </div>
        </div>

        {/* Mobile Today's Mood Check-in Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
              <Smile className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">Student Mood Check-in</h3>
              <p className="text-[11px] text-slate-500">
                {isCheckedIn
                  ? `Logged: ${submittedMood || 'Completed'} for ${timeInfo?.session || 'today'}`
                  : `How are you feeling this ${timeInfo?.session || 'session'}?`}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => {
              const el = document.getElementById('mood-checkin-widget');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className={`h-8 text-xs font-semibold rounded-xl ${isCheckedIn ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#1D61E7] hover:bg-blue-700'}`}
          >
            {isCheckedIn ? 'Logged ✓' : 'Share Mood'}
          </Button>
        </div>

        {/* Mobile Quick Access Grid (From Mobile UI Board) */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-900">Quick Access</h3>
          <div className="grid grid-cols-5 gap-1.5 text-center">
            <button
              onClick={() => onNavigate('timetable')}
              className="p-2.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl shadow-2xs flex flex-col items-center space-y-1.5"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-2xs">
                <Calendar className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-[#1D61E7]">Timetable</span>
            </button>

            <button
              onClick={() => onNavigate('learning')}
              className="p-2.5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs flex flex-col items-center space-y-1.5"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-slate-700">AI Tutor</span>
            </button>

            <button
              onClick={() => onNavigate('assignments')}
              className="p-2.5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs flex flex-col items-center space-y-1.5"
            >
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-slate-700">Tasks</span>
            </button>

            <button
              onClick={() => onNavigate('performance')}
              className="p-2.5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs flex flex-col items-center space-y-1.5"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <BarChart3 className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-slate-700">Analytics</span>
            </button>

            <button
              onClick={() => onNavigate('store')}
              className="p-2.5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs flex flex-col items-center space-y-1.5"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-slate-700">Store</span>
            </button>
          </div>
        </div>
      </div>

      {/* Contextual Injected Content Zone above Stats */}
      <EditableZone zoneId="student_stats_top" className="my-3" />
      <div className="hidden sm:grid sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Attendance Card */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3 hover:border-blue-300 transition-colors">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block truncate">
                Attendance
              </span>
              <div className="flex items-center space-x-2">
                <span className="text-xl sm:text-2xl font-bold text-slate-900">
                  {displayAttendance}
                </span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">
                  ↑ +2%
                </span>
              </div>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-[#1D61E7] h-full rounded-full transition-all"
              style={{ width: displayAttendance }}
            />
          </div>
        </div>

        {/* Pending Assignments Card */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3 hover:border-purple-300 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block truncate">
                  Pending Work
                </span>
                <span className="text-xl sm:text-2xl font-bold text-slate-900">
                  {pendingAssignmentsCount}
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => onNavigate('assignments')}
            className="text-[11px] font-bold text-[#1D61E7] hover:underline flex items-center pt-0.5"
          >
            <span>View All</span>
            <ArrowRight className="w-3 h-3 ml-1" />
          </button>
        </div>

        {/* Upcoming Exams Card */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3 hover:border-amber-300 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block truncate">
                  Upcoming Exams
                </span>
                <span className="text-xl sm:text-2xl font-bold text-slate-900">
                  {upcomingExams.length}
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => onNavigate('exams')}
            className="text-[11px] font-bold text-[#1D61E7] hover:underline flex items-center pt-0.5"
          >
            <span>View All</span>
            <ArrowRight className="w-3 h-3 ml-1" />
          </button>
        </div>

        {/* Overall Performance Card */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3 hover:border-emerald-300 transition-colors">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block truncate">
                Overall Progress
              </span>
              <span className="text-xl sm:text-2xl font-bold text-slate-900">
                {displayGrade}
              </span>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all"
              style={{ width: displayGrade }}
            />
          </div>
        </div>
      </div>

      {/* Contextual Injected Content Zone above Timetable */}
      <EditableZone zoneId="student_timetable_top" className="my-3" />
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-[#1D61E7] flex items-center justify-center font-bold shrink-0 shadow-2xs">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-slate-900">
                Weekly Class Timetable
              </h3>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold">
                Mon — Sat Working Days
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              Access your daily lecture slots, laboratory practicals, faculty instructors, and assigned rooms.
            </p>
          </div>
        </div>

        <Button
          onClick={() => onNavigate('timetable')}
          className="h-10 px-5 text-xs font-bold rounded-xl bg-[#1D61E7] hover:bg-blue-700 text-white shrink-0 shadow-2xs"
        >
          <Calendar className="w-4 h-4 mr-1.5" />
          Open Class Timetable →
        </Button>
      </div>

      {/* =========================================================================
          MIDDLE ROW: AI LEARNING, MORNING CHECKIN, UPCOMING EXAMS, QUICK ACCESS
      ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Card 1: AI Assistant */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-[#1D61E7]" />
                <h3 className="text-sm font-bold text-slate-900">AI Assistant</h3>
              </div>
              <Badge className="bg-blue-50 text-[#1D61E7] border-blue-200 text-[10px] font-bold px-2 py-0.5">
                ★ 24/7 Tutor
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 items-center my-3">
              <div className="w-full h-24 rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center p-1">
                <img 
                  src="/assets/ai-learning-laptop.svg" 
                  alt="AI Assistant" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs text-slate-600 leading-snug">
                  Ask paramedical questions, clarify doubts, and learn interactively.
                </p>
                <Button 
                  size="sm" 
                  className="w-full text-xs h-8 bg-[#1D61E7] hover:bg-blue-700 font-semibold rounded-xl"
                  onClick={() => onNavigate('learning')}
                >
                  Open AI Assistant →
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-slate-100">
            <div className="flex justify-between text-[11px] text-slate-500 font-medium">
              <span>Paramedical Academic Tutor</span>
              <span className="text-emerald-600 font-semibold">Active</span>
            </div>
          </div>
        </div>

        {/* Card 2: Student Mood Check-in Widget (Completely Separate from Attendance) */}
        <div id="mood-checkin-widget" className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Smile className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900">Mood Check-in</h3>
              </div>
              <span className="text-[10px] bg-blue-50 text-[#1D61E7] border border-blue-200 font-semibold px-2 py-0.5 rounded-full capitalize">
                {timeInfo?.session || 'Current'} Session
              </span>
            </div>

            <p className="text-xs font-medium text-slate-600 mb-2.5">
              {isCheckedIn ? 'Your wellbeing status for this session:' : 'How are you feeling this session?'}
            </p>

            {/* 6 Institutional Mood Buttons */}
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              {moods.map((m) => {
                const isSelected = selectedMood === m.id || (isCheckedIn && submittedMood === m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMood(m.id)}
                    disabled={isCheckedIn}
                    className={`flex flex-col items-center justify-center p-1.5 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'bg-blue-50 border-[#1D61E7] text-[#1D61E7] font-bold shadow-2xs ring-1 ring-[#1D61E7]/30'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span className="text-base leading-none mb-1">{m.emoji}</span>
                    <span className="text-[10px] leading-tight font-medium">{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Optional Note Field */}
            <Input
              placeholder="✎ Add reflection or note (optional)..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              disabled={isCheckedIn}
              className="text-xs h-8 bg-slate-50 border-slate-200/80 rounded-xl"
            />
          </div>

          <div className="pt-3 space-y-1.5">
            {isCheckedIn ? (
              <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex flex-col items-center justify-center space-y-0.5">
                <div className="flex items-center space-x-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Logged: {submittedMood || selectedMood}</span>
                </div>
                {sessionCheckInTime && (
                  <span className="text-[10px] text-emerald-600 font-normal">
                    Recorded at {sessionCheckInTime}
                  </span>
                )}
              </div>
            ) : (
              <Button
                size="sm"
                className="w-full text-xs h-8 bg-[#1D61E7] hover:bg-blue-700 font-semibold rounded-xl"
                onClick={handleQuickCheckinSubmit}
                disabled={isSubmittingCheckin}
              >
                {isSubmittingCheckin ? 'Submitting Mood...' : `Submit Mood (${timeInfo?.session || 'Now'})`}
              </Button>
            )}

            <p className="text-[9px] text-slate-400 text-center leading-tight">
              Personal wellbeing tracker only. Does not modify academic attendance.
            </p>
          </div>
        </div>

        {/* Card 3: Upcoming Exams Schedule */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-[#1D61E7]" />
                <h3 className="text-sm font-bold text-slate-900">Upcoming Exams</h3>
              </div>
              <button
                onClick={() => onNavigate('exams')}
                className="text-[11px] font-bold text-[#1D61E7] hover:underline"
              >
                View All →
              </button>
            </div>

            <div className="space-y-2.5">
              {upcomingExams.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  No exams currently scheduled.
                </div>
              ) : (
                upcomingExams.slice(0, 2).map((exam) => (
                  <div 
                    key={exam.id}
                    onClick={() => onNavigate('exams')}
                    className="p-3 rounded-xl border border-slate-200/70 hover:border-blue-300 transition-colors cursor-pointer flex items-center justify-between relative pl-3.5"
                  >
                    <div className="absolute left-0 top-2 bottom-2 w-1 bg-[#1D61E7] rounded-r" />
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">{exam.subject}</h4>
                      <p className="text-[11px] text-slate-500">
                        {new Date(exam.exam_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} • {exam.start_time?.slice(0, 5) || '09:30 AM'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Badge className="bg-blue-50 text-[#1D61E7] border-blue-200 text-[10px] font-semibold">
                        Upcoming
                      </Badge>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3">
            <button
              onClick={() => onNavigate('exams')}
              className="text-xs text-slate-500 hover:text-slate-900 font-medium w-full text-center"
            >
              Check Exam Guidelines →
            </button>
          </div>
        </div>

        {/* Card 4: Quick Access (Dark Blue Header as shown in reference) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col justify-between hover:shadow-xs transition-shadow">
          <div>
            <div className="bg-[#0F2F68] p-4 text-white flex items-center space-x-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <h3 className="text-sm font-bold">Quick Access</h3>
            </div>

            <div className="divide-y divide-slate-100">
              <button
                onClick={() => onNavigate('timetable')}
                className="w-full p-3 text-left flex items-center justify-between hover:bg-blue-50/50 transition-colors text-xs font-semibold text-slate-700 bg-blue-50/20"
              >
                <div className="flex items-center space-x-2.5">
                  <Calendar className="w-4 h-4 text-[#1D61E7]" />
                  <span className="font-bold text-[#1D61E7]">Class Timetable</span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#1D61E7]" />
              </button>

              <button
                onClick={() => onNavigate('assignments')}
                className="w-full p-3 text-left flex items-center justify-between hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-700"
              >
                <div className="flex items-center space-x-2.5">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span>View Assignments</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => onNavigate('performance')}
                className="w-full p-3 text-left flex items-center justify-between hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-700"
              >
                <div className="flex items-center space-x-2.5">
                  <BarChart3 className="w-4 h-4 text-slate-500" />
                  <span>Check Performance</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => onNavigate('transport')}
                className="w-full p-3 text-left flex items-center justify-between hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-700"
              >
                <div className="flex items-center space-x-2.5">
                  <Bus className="w-4 h-4 text-slate-500" />
                  <span>Track Bus</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => onNavigate('store')}
                className="w-full p-3 text-left flex items-center justify-between hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-700"
              >
                <div className="flex items-center space-x-2.5">
                  <ShoppingBag className="w-4 h-4 text-slate-500" />
                  <span>Visit Store</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => onNavigate('complaints')}
                className="w-full p-3 text-left flex items-center justify-between hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-700"
              >
                <div className="flex items-center space-x-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                  <span>Raise Complaint</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contextual Injected Content Zone above Analytics */}
      <EditableZone zoneId="student_analytics_top" className="my-3" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Card 1: Performance Analytics (Real Bar Chart) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4 hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-[#1D61E7]" />
              <h3 className="text-sm font-bold text-slate-900">Performance Analytics</h3>
            </div>
            <button
              onClick={() => onNavigate('performance')}
              className="text-[11px] font-bold text-[#1D61E7] hover:underline"
            >
              View Details →
            </button>
          </div>

          {/* Bar Chart Visualization */}
          {subjectScores && subjectScores.length > 0 ? (
            <div className="h-40 flex items-end justify-between px-3 pt-4 border-b border-slate-100">
              {subjectScores.map((col, idx) => (
                <div key={idx} className="flex flex-col items-center space-y-2 h-full justify-end group">
                  <span className="text-[10px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    {col.score}%
                  </span>
                  <div 
                    className="w-8 sm:w-10 rounded-t-lg bg-gradient-to-t from-[#1D61E7] to-[#3B82F6] hover:brightness-110 transition-all shadow-xs"
                    style={{ height: col.height }}
                  />
                  <span className="text-[11px] font-medium text-slate-500 pt-1 truncate max-w-[60px]" title={col.subject}>
                    {col.subject}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-40 flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <Award className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-700">No Exam Marks Published Yet</p>
              <p className="text-[11px] text-slate-400 max-w-xs mt-0.5">
                Marks for your enrolled semester will appear here once published by faculty.
              </p>
            </div>
          )}
        </div>

        {/* Card 2: Recent Activity / Announcements */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4 hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-[#1D61E7]" />
              <h3 className="text-sm font-bold text-slate-900">Recent Notices & Activity</h3>
            </div>
            <button
              onClick={() => onNavigate('assignments')}
              className="text-[11px] font-bold text-[#1D61E7] hover:underline"
            >
              View All →
            </button>
          </div>

          <div className="space-y-4 relative pl-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-blue-100">
            {recentAnnouncements && recentAnnouncements.length > 0 ? (
              recentAnnouncements.slice(0, 3).map((item) => (
                <div key={item.id} className="relative text-xs space-y-0.5">
                  <div className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-[#1D61E7] border-2 border-white ring-2 ring-blue-100" />
                  <div className="flex justify-between font-semibold text-slate-800">
                    <span className="truncate pr-2">{item.title}</span>
                    <span className="text-[10px] text-slate-400 font-normal shrink-0">{item.time}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-1">{item.message}</p>
                </div>
              ))
            ) : (
              <>
                <div className="relative text-xs space-y-0.5">
                  <div className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-[#1D61E7] border-2 border-white ring-2 ring-blue-100" />
                  <div className="flex justify-between font-semibold text-slate-800">
                    <span>Academic Portal Active</span>
                    <span className="text-[11px] text-slate-400 font-normal">Today</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Welcome to <InstitutionName /></p>
                </div>
                <div className="relative text-xs space-y-0.5">
                  <div className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-[#1D61E7] border-2 border-white ring-2 ring-blue-100" />
                  <div className="flex justify-between font-semibold text-slate-800">
                    <span>Academic Attendance Ledger</span>
                    <span className="text-[11px] text-slate-400 font-normal">Active</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Faculty-verified attendance record</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Card 3: Bus Information */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4 hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bus className="w-4 h-4 text-[#1D61E7]" />
              <h3 className="text-sm font-bold text-slate-900">Bus Information</h3>
            </div>
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
              Active
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 items-center">
            <div className="w-full h-24 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center p-1">
              <img 
                src="/assets/student-bus.svg" 
                alt="Bus Transit" 
                className="w-full h-full object-contain"
              />
            </div>

            <div className="space-y-1 text-xs text-slate-600">
              <div className="truncate"><strong className="text-slate-900">Bus No:</strong> {busInfo.busNumber}</div>
              <div className="truncate"><strong className="text-slate-900">Driver:</strong> {busInfo.driverName}</div>
              <div className="truncate"><strong className="text-slate-900">Route:</strong> {busInfo.routeName}</div>
              <div className="pt-1">
                <Button
                  size="sm"
                  className="w-full text-xs h-8 bg-blue-50 text-[#1D61E7] hover:bg-blue-100 border border-blue-200 font-semibold rounded-xl"
                  onClick={() => onNavigate('transport')}
                >
                  Track Bus →
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contextual Injected Content Zone below Hero */}
      <EditableZone zoneId="student_hero_bottom" className="my-3" />

      {/* Contextual Injected Content Zone at Bottom */}
      <EditableZone zoneId="student_dashboard_bottom" className="mt-6" />

      {/* Footer */}
      <footer className="pt-6 border-t border-slate-200/70 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 space-y-2 sm:space-y-0">
        <div>© <InstitutionName />. All rights reserved.</div>
        <div className="flex items-center space-x-4 font-medium text-slate-500">
          <button onClick={() => onNavigate('complaints')} className="hover:underline">Help</button>
          <span>|</span>
          <button onClick={() => onNavigate('complaints')} className="hover:underline">Support</button>
          <span>|</span>
          <button onClick={() => onNavigate('settings')} className="hover:underline">Contact</button>
        </div>
      </footer>
    </div>
  );
}
