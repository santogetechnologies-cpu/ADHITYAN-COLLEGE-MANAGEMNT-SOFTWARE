import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Award, 
  FileText, 
  RefreshCw, 
  Loader2, 
  Download, 
  Printer, 
  GraduationCap, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  FileCheck,
  Building2,
  Lock
} from 'lucide-react';
import { db } from '@/services/supabase/database';
import { Exam, ExamSchedule, ExamResult, HallTicket } from '@/types/database.types';
import { useAuth } from '@/context/AuthContext';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { PrintableHallTicket } from './PrintableHallTicket';
import { getCourseTotalSemesters } from '@/constants/courses';
import { useToast } from '@/hooks/use-toast';

export function StudentExams() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [exams, setExams] = useState<Exam[]>([]);
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [hallTickets, setHallTickets] = useState<HallTicket[]>([]);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedSemester, setSelectedSemester] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<'All' | 'Upcoming' | 'Completed'>('All');

  // Modals
  const [timetableModalExam, setTimetableModalExam] = useState<Exam | null>(null);
  const [hallTicketModalData, setHallTicketModalData] = useState<{ exam: Exam; ticket: HallTicket } | null>(null);
  const [marksModalExam, setMarksModalExam] = useState<Exam | null>(null);

  const timetablePrintRef = useRef<HTMLDivElement>(null);

  // Student details
  const studentCourse = user?.department || 'Paramedical Sciences';
  const studentId = user?.student_id || user?.roll_number || 'AIP-STUDENT';
  const totalSemesters = useMemo(() => getCourseTotalSemesters(studentCourse), [studentCourse]);

  const semesterFilterOptions = useMemo(() => {
    const list = ['All'];
    for (let i = 1; i <= totalSemesters; i++) {
      list.push(`Semester ${i}`);
    }
    return list;
  }, [totalSemesters]);

  // Load all examination data from database
  const loadExamDeskData = useCallback(async () => {
    try {
      setLoading(true);
      const [allExams, allSchedules, userTickets, userResults] = await Promise.all([
        db.getExams(),
        db.getExamSchedules(),
        db.getHallTickets(),
        user?.id ? db.getExamResults(user.id) : Promise.resolve([])
      ]);

      setExams(allExams || []);
      setSchedules(allSchedules || []);
      setHallTickets(userTickets || []);
      setExamResults(userResults || []);
    } catch (err) {
      console.warn('Failed to load examination records:', err);
      toast({
        title: 'Error Loading Examination Desk',
        description: 'Unable to retrieve real-time exam records from database.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, toast]);

  useEffect(() => {
    loadExamDeskData();
  }, [loadExamDeskData]);

  // Real-time synchronization on all 4 database tables
  useRealtimeSubscription({ table: 'exams', onChange: loadExamDeskData, onReconnect: loadExamDeskData });
  useRealtimeSubscription({ table: 'exam_schedules', onChange: loadExamDeskData, onReconnect: loadExamDeskData });
  useRealtimeSubscription({ table: 'hall_tickets', onChange: loadExamDeskData, onReconnect: loadExamDeskData });
  useRealtimeSubscription({ table: 'exam_results', onChange: loadExamDeskData, onReconnect: loadExamDeskData });

  // Map hall tickets to student
  const studentHallTickets = useMemo(() => {
    if (!user) return [];
    const userId = user.id?.toLowerCase();
    const sId = (user.student_id || user.roll_number || '').toLowerCase();
    const uName = (user.name || '').toLowerCase();

    return hallTickets.filter(t => {
      const tStudentId = (t.student_id || '').toLowerCase();
      const tRoll = (t.roll_number || '').toLowerCase();
      const tName = (t.student_name || '').toLowerCase();
      return (
        (userId && tStudentId === userId) ||
        (sId && tRoll === sId) ||
        (uName && tName && (tName.includes(uName) || uName.includes(tName)))
      );
    });
  }, [hallTickets, user]);

  // Process and unify examination records applicable to the student
  const applicableExams = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // If exams exist in public.exams table, use them
    const list: Exam[] = [...exams];

    // Also check if any official exams are present in hall_tickets or schedules that might not have an exams row
    const existingIds = new Set(list.map(e => e.id));
    studentHallTickets.forEach(ht => {
      if (ht.exam_id && !existingIds.has(ht.exam_id)) {
        list.push({
          id: ht.exam_id,
          name: ht.exam_title || 'University End Semester Examination',
          course: ht.department,
          semester: ht.semester,
          term: ht.semester,
          academic_year: ht.academic_year,
          start_date: ht.issued_date || new Date().toISOString().slice(0, 10),
          end_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
          status: 'Scheduled',
          is_published: true,
          timetable_published: true,
          hall_ticket_published: true,
          results_published: false
        });
        existingIds.add(ht.exam_id);
      }
    });

    // If schedules exist with no parent exam, group them under a designated course exam
    const schedulesWithoutExam = schedules.filter(s => !s.exam_id || !existingIds.has(s.exam_id));
    if (schedulesWithoutExam.length > 0 && list.length === 0) {
      const dates = schedulesWithoutExam.map(s => new Date(s.exam_date).getTime());
      const minDate = new Date(Math.min(...dates)).toISOString().slice(0, 10);
      const maxDate = new Date(Math.max(...dates)).toISOString().slice(0, 10);
      const syntheticId = 'exam-univ-active';
      list.push({
        id: syntheticId,
        name: 'University Degree Semester Examination',
        course: studentCourse,
        semester: user?.class_name?.includes('Semester') ? user.class_name : 'Semester 1',
        term: 'Annual / Semester Assessment',
        academic_year: '2026-2027',
        start_date: minDate,
        end_date: maxDate,
        status: new Date(maxDate) < today ? 'Completed' : 'Scheduled',
        is_published: true,
        timetable_published: true,
        hall_ticket_published: studentHallTickets.length > 0,
        results_published: examResults.length > 0
      });
    }

    // Filter by student course (allow general exams if course is not restricted)
    let filtered = list.filter(e => {
      if (!e.course) return true;
      const cLower = e.course.toLowerCase();
      const sLower = studentCourse.toLowerCase();
      return cLower.includes(sLower) || sLower.includes(cLower) || cLower === 'all';
    });

    // Filter by semester
    if (selectedSemester !== 'All') {
      filtered = filtered.filter(e => {
        const semStr = (e.semester || e.term || '').toLowerCase();
        return semStr.includes(selectedSemester.toLowerCase());
      });
    }

    // Filter by status
    if (selectedStatus === 'Upcoming') {
      filtered = filtered.filter(e => {
        const endDate = new Date(e.end_date);
        endDate.setHours(0, 0, 0, 0);
        return endDate >= today && e.status !== 'Results Published' && e.status !== 'Completed';
      });
    } else if (selectedStatus === 'Completed') {
      filtered = filtered.filter(e => {
        const endDate = new Date(e.end_date);
        endDate.setHours(0, 0, 0, 0);
        return endDate < today || e.status === 'Completed' || e.status === 'Results Published' || e.results_published;
      });
    }

    // Sort by start_date ascending (closest upcoming first)
    return filtered.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  }, [exams, schedules, studentHallTickets, examResults, studentCourse, user?.class_name, selectedSemester, selectedStatus]);

  // Helper to get schedules for a given exam
  const getExamSchedules = useCallback((exam: Exam): ExamSchedule[] => {
    // Match by exam_id
    let matched = schedules.filter(s => s.exam_id === exam.id);
    if (matched.length > 0) return matched;

    // Fallback: match by class/course and date range
    if (exam.course || exam.semester) {
      matched = schedules.filter(s => {
        const cMatch = !s.class_name || s.class_name.includes(exam.course || '') || (exam.course && exam.course.includes(s.class_name));
        return cMatch;
      });
    }

    if (matched.length > 0) return matched;
    return schedules;
  }, [schedules]);

  // Helper to get student's hall ticket for a given exam
  const getExamHallTicket = useCallback((exam: Exam): HallTicket | null => {
    if (studentHallTickets.length === 0) return null;

    // 1. Direct exam_id match
    const directMatch = studentHallTickets.find(t => t.exam_id === exam.id);
    if (directMatch) return directMatch;

    // 2. Title / Semester match
    const titleMatch = studentHallTickets.find(t => 
      (t.exam_title && exam.name && (t.exam_title.toLowerCase().includes(exam.name.toLowerCase()) || exam.name.toLowerCase().includes(t.exam_title.toLowerCase()))) ||
      (t.semester && exam.semester && t.semester.toLowerCase() === exam.semester.toLowerCase())
    );
    if (titleMatch) return titleMatch;

    // 3. Department match
    const deptMatch = studentHallTickets.find(t => 
      t.status === 'Generated' || t.status === 'Published'
    );
    return deptMatch || null;
  }, [studentHallTickets]);

  // Helper to get published marks for a given exam
  const getExamMarks = useCallback((exam: Exam): ExamResult[] => {
    const isPublished = exam.status === 'Results Published' || exam.status === 'published' || exam.results_published;
    if (!isPublished) return [];

    // Filter results matching this exam
    const matched = examResults.filter(r => r.exam_id === exam.id);
    if (matched.length > 0) return matched;

    // Match all student results if single exam session
    return examResults;
  }, [examResults]);

  // Handle Timetable Print
  const handlePrintTimetable = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* 1. Header Banner */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#1D61E7] flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Academic Examination & Timetable Desk
              </h1>
              <p className="text-xs text-slate-500">
                Official Controller of Examinations (CoE) Portal • Certified Read-Only
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-600">
            <span className="flex items-center">
              <GraduationCap className="w-3.5 h-3.5 mr-1 text-[#1D61E7]" />
              Course: <strong className="ml-1 text-slate-800">{studentCourse}</strong>
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center">
              <FileCheck className="w-3.5 h-3.5 mr-1 text-[#1D61E7]" />
              Student ID: <strong className="ml-1 text-slate-800 font-mono">{studentId}</strong>
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadExamDeskData}
          disabled={loading}
          className="h-9 px-3.5 text-xs font-semibold rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 self-start sm:self-center"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin text-[#1D61E7]' : 'text-slate-500'}`} />
          Refresh Records
        </Button>
      </div>

      {/* 2. Filters Bar: Semester & Status */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        {/* Semester selector */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
            Semester:
          </span>
          {semesterFilterOptions.map(sem => {
            const isActive = selectedSemester === sem;
            return (
              <button
                key={sem}
                onClick={() => setSelectedSemester(sem)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                  isActive
                    ? 'bg-[#1D61E7] text-white shadow-2xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60'
                }`}
              >
                {sem}
              </button>
            );
          })}
        </div>

        {/* Status filter */}
        <div className="flex items-center space-x-1 self-end md:self-auto shrink-0">
          {(['All', 'Upcoming', 'Completed'] as const).map(st => {
            const isActive = selectedStatus === st;
            return (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {st === 'All' ? 'All Exams' : st}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Examination Cards Section */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-14 space-y-3 bg-white border border-slate-200/80 rounded-2xl">
          <Loader2 className="w-7 h-7 animate-spin text-[#1D61E7]" />
          <p className="text-xs font-medium text-slate-500">Loading certified examination schedules and hall tickets...</p>
        </div>
      ) : applicableExams.length === 0 ? (
        <Card className="bg-white border-slate-200/80 rounded-2xl text-center py-14 shadow-2xs">
          <CardContent className="space-y-3 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1D61E7] flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No Examination Records Scheduled Yet</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Official university examinations, timetables, and hall tickets will appear here once officially scheduled and certified by authorized faculty or the Controller of Examinations.
            </p>
            <div className="pt-2">
              <Badge variant="outline" className="text-xs text-slate-500 bg-slate-50 border-slate-200">
                Course: {studentCourse}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {applicableExams.map((exam) => {
            const examSchedulesList = getExamSchedules(exam);
            const studentTicket = getExamHallTicket(exam);
            const publishedMarks = getExamMarks(exam);

            const hasTimetable = examSchedulesList.length > 0;
            const hasHallTicket = !!studentTicket && (studentTicket.status === 'Generated' || studentTicket.status === 'Published') && !studentTicket.is_detained;
            const hasPublishedMarks = publishedMarks.length > 0;

            const isCompleted = exam.status === 'Completed' || exam.status === 'Results Published' || exam.results_published;
            const isOngoing = !isCompleted && new Date(exam.start_date) <= new Date() && new Date(exam.end_date) >= new Date();

            return (
              <Card 
                key={exam.id} 
                className="bg-white border-slate-200/80 hover:border-blue-300 transition-all rounded-2xl shadow-2xs overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Card Top Strip */}
                  <CardHeader className="p-5 pb-3 bg-slate-50/60 border-b border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="text-[10px] font-bold text-[#1D61E7] bg-blue-50/70 border-blue-200">
                        {exam.exam_category || 'University Examination'}
                      </Badge>

                      <Badge 
                        className={`text-[10px] font-bold ${
                          hasPublishedMarks 
                            ? 'bg-purple-50 text-purple-700 border-purple-200' 
                            : isOngoing 
                            ? 'bg-amber-50 text-amber-800 border-amber-200' 
                            : isCompleted 
                            ? 'bg-slate-100 text-slate-700 border-slate-200' 
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {hasPublishedMarks ? 'Results Declared' : isOngoing ? 'Ongoing' : isCompleted ? 'Completed' : 'Upcoming'}
                      </Badge>
                    </div>

                    <CardTitle className="text-base font-bold text-slate-900 leading-tight">
                      {exam.name}
                    </CardTitle>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-2">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 block uppercase">Course</span>
                        <span className="font-semibold text-slate-800 truncate block">
                          {exam.course || studentCourse}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 block uppercase">Semester / Term</span>
                        <span className="font-semibold text-slate-800">
                          {exam.semester || exam.term || 'Semester 1'}
                        </span>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Card Body: Dates & Availability Indicators */}
                  <CardContent className="p-5 space-y-4 text-xs">
                    {/* Examination Dates */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center">
                          <Calendar className="w-3 h-3 mr-1 text-[#1D61E7]" /> Examination Schedule Period
                        </span>
                        <div className="font-bold text-slate-900 text-xs">
                          {new Date(exam.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          {' — '}
                          {new Date(exam.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-medium text-slate-500">
                        AY {exam.academic_year || '2026-2027'}
                      </Badge>
                    </div>

                    {/* Official Document Availability Checklist */}
                    <div className="space-y-2 pt-1 border-t border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Official Status & Documents
                      </span>
                      <div className="grid grid-cols-3 gap-2 text-[11px]">
                        {/* Timetable Indicator */}
                        <div className="p-2 rounded-lg bg-slate-50/70 border border-slate-200/60 space-y-0.5">
                          <span className="text-[10px] text-slate-400 block">Timetable</span>
                          <div className="font-semibold flex items-center">
                            {hasTimetable ? (
                              <span className="text-emerald-700 flex items-center">
                                <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                                Available ({examSchedulesList.length})
                              </span>
                            ) : (
                              <span className="text-slate-400 flex items-center">
                                <Clock className="w-3 h-3 mr-1" /> Pending
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Hall Ticket Indicator */}
                        <div className="p-2 rounded-lg bg-slate-50/70 border border-slate-200/60 space-y-0.5">
                          <span className="text-[10px] text-slate-400 block">Hall Ticket</span>
                          <div className="font-semibold flex items-center">
                            {hasHallTicket ? (
                              <span className="text-emerald-700 flex items-center">
                                <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                                Published
                              </span>
                            ) : (
                              <span className="text-amber-700 flex items-center">
                                <Clock className="w-3 h-3 mr-1 text-amber-500" />
                                Not Yet Issued
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Marks Indicator */}
                        <div className="p-2 rounded-lg bg-slate-50/70 border border-slate-200/60 space-y-0.5">
                          <span className="text-[10px] text-slate-400 block">Results / Marks</span>
                          <div className="font-semibold flex items-center">
                            {hasPublishedMarks ? (
                              <span className="text-purple-700 flex items-center">
                                <Award className="w-3 h-3 mr-1 text-purple-600" />
                                Declared
                              </span>
                            ) : (
                              <span className="text-slate-400 flex items-center">
                                <Lock className="w-3 h-3 mr-1" /> Awaited
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </div>

                {/* Card Action Buttons (View Timetable, Download Hall Ticket, View Marks) */}
                <div className="p-4 bg-slate-50/80 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Button 1: View Timetable */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setTimetableModalExam(exam)}
                    disabled={!hasTimetable}
                    className="h-9 text-xs font-semibold rounded-xl border-slate-200 hover:bg-white hover:text-[#1D61E7]"
                  >
                    <Clock className="w-3.5 h-3.5 mr-1 text-slate-500" />
                    View Timetable
                  </Button>

                  {/* Button 2: Download Hall Ticket */}
                  {hasHallTicket ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        if (studentTicket.file_url) {
                          window.open(studentTicket.file_url, '_blank');
                        } else {
                          setHallTicketModalData({ exam, ticket: studentTicket });
                        }
                      }}
                      className="h-9 text-xs font-bold bg-[#1D61E7] hover:bg-blue-700 text-white rounded-xl shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5 mr-1" />
                      Download Hall Ticket
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled
                      className="h-9 text-xs font-medium rounded-xl border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                    >
                      <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      Hall Ticket Not Yet Published
                    </Button>
                  )}

                  {/* Button 3: View Marks (only when published) */}
                  {hasPublishedMarks ? (
                    <Button
                      size="sm"
                      onClick={() => setMarksModalExam(exam)}
                      className="h-9 text-xs font-bold bg-purple-700 hover:bg-purple-800 text-white rounded-xl shadow-2xs"
                    >
                      <Award className="w-3.5 h-3.5 mr-1" />
                      View Marks
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled
                      className="h-9 text-xs font-medium rounded-xl border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                    >
                      <Lock className="w-3 h-3 mr-1 text-slate-400" />
                      Results Awaited
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          MODAL 1: OFFICIAL EXAMINATION TIMETABLE VIEW
      ========================================================================= */}
      <Dialog open={!!timetableModalExam} onOpenChange={(open) => !open && setTimetableModalExam(null)}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto bg-white p-6 rounded-2xl">
          <DialogHeader className="print:hidden">
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-[#1D61E7]" />
                <span>Official Examination Timetable</span>
              </span>
              <div className="flex items-center space-x-2">
                <Button 
                  size="sm" 
                  onClick={handlePrintTimetable}
                  className="h-8 text-xs font-bold bg-[#1D61E7] hover:bg-blue-700 text-white rounded-xl shadow-2xs"
                >
                  <Printer className="w-3.5 h-3.5 mr-1" /> Print / Save PDF
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          {timetableModalExam && (
            <div ref={timetablePrintRef} className="space-y-6 pt-2 font-sans">
              {/* Institution Official Header */}
              <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1.5">
                <div className="inline-flex items-center justify-center space-x-3">
                  <img 
                    src="/lovable-uploads/8ea95178-bb37-43e2-ae4d-595e31707954.png" 
                    alt="Adithyan College Logo" 
                    className="w-12 h-12 object-contain rounded-md"
                  />
                  <div className="text-left">
                    <h1 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight leading-none">
                      Adithyan College
                    </h1>
                    <p className="text-[11px] text-slate-600 font-semibold mt-0.5">
                      Office of the Controller of Examinations (CoE) • Directorate of Technical Education
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-black uppercase tracking-wider rounded-md">
                    {timetableModalExam.name} — Academic Timetable
                  </span>
                </div>

                {/* Candidate & Course Context Details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 text-xs text-left bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Course</span>
                    <span className="font-bold text-slate-900">{timetableModalExam.course || studentCourse}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Semester / Term</span>
                    <span className="font-bold text-slate-900">{timetableModalExam.semester || timetableModalExam.term || 'Semester 1'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Academic Year</span>
                    <span className="font-bold text-slate-900">{timetableModalExam.academic_year || '2026-2027'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Status</span>
                    <span className="font-bold text-emerald-700">Official Certified Timetable</span>
                  </div>
                </div>
              </div>

              {/* Timetable Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="p-3 w-10 text-center">#</th>
                      <th className="p-3">Subject Name</th>
                      <th className="p-3">Subject Code</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Day</th>
                      <th className="p-3">Time Slot</th>
                      <th className="p-3">Venue / Hall</th>
                      <th className="p-3 text-right">Max Marks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {getExamSchedules(timetableModalExam).map((item, idx) => {
                      const dateObj = new Date(item.exam_date);
                      const dayName = item.day_of_week || ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dateObj.getDay()];

                      return (
                        <tr key={item.id || idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3 font-mono text-center text-slate-400">{idx + 1}</td>
                          <td className="p-3 font-bold text-slate-900">{item.subject}</td>
                          <td className="p-3 font-mono text-slate-600">{item.subject_code || `SUB-${idx + 101}`}</td>
                          <td className="p-3 font-semibold text-slate-900">
                            {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="p-3 text-slate-600 font-medium">{dayName}</td>
                          <td className="p-3 font-mono text-slate-700 text-[11px]">
                            {item.start_time?.slice(0, 5)} - {item.end_time?.slice(0, 5)}
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="text-[10px] font-semibold bg-slate-50">
                              {item.room || item.room_no || 'Examination Hall B'}
                            </Badge>
                          </td>
                          <td className="p-3 text-right font-bold text-slate-900 font-mono">
                            {item.max_marks || 100}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Instructions and CoE Authentication */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-[11px] text-slate-600">
                <div className="font-bold text-slate-900">Important Candidate Guidelines:</div>
                <ul className="list-disc pl-4 space-y-0.5 text-[10px]">
                  <li>Candidates must be seated in their designated hall at least 15 minutes before the scheduled start time.</li>
                  <li>Original physical Hall Ticket along with Institutional Student ID card is mandatory for admission to the exam hall.</li>
                  <li>Programmable calculators, mobile phones, smartwatches, and unauthorized materials are strictly prohibited.</li>
                </ul>
                <div className="pt-2 flex justify-between items-center text-[10px] font-bold text-slate-500 border-t border-slate-200">
                  <span>Certified by Controller of Examinations</span>
                  <span>Adithyan Institute of Paramedical</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL 2: OFFICIAL HALL TICKET ADMIT CARD VIEW
      ========================================================================= */}
      <Dialog open={!!hallTicketModalData} onOpenChange={(open) => !open && setHallTicketModalData(null)}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto bg-white p-6 rounded-2xl">
          <DialogHeader className="print:hidden">
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <FileText className="w-5 h-5 text-[#1D61E7]" />
              <span>Official University Examination Admit Card</span>
            </DialogTitle>
          </DialogHeader>

          {hallTicketModalData && (
            <PrintableHallTicket
              studentName={hallTicketModalData.ticket.student_name || user?.name || 'Student'}
              rollNumber={hallTicketModalData.ticket.roll_number || studentId}
              registerNumber={hallTicketModalData.ticket.register_number || 'REG-PENDING'}
              department={hallTicketModalData.ticket.department || studentCourse}
              className={hallTicketModalData.ticket.class_name || user?.class_name || 'Year 1'}
              semester={hallTicketModalData.ticket.semester || hallTicketModalData.exam.semester}
              examTitle={hallTicketModalData.exam.name || hallTicketModalData.ticket.exam_title}
              examCenter={hallTicketModalData.ticket.exam_center}
              hallNumber={hallTicketModalData.ticket.hall_number}
              seatNumber={hallTicketModalData.ticket.seat_number}
              attendancePct={Number(hallTicketModalData.ticket.attendance_pct || 88)}
              isDetained={hallTicketModalData.ticket.is_detained || false}
              schedules={getExamSchedules(hallTicketModalData.exam)}
              onClose={() => setHallTicketModalData(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL 3: OFFICIAL PUBLISHED MARKS & RESULTS VIEW
      ========================================================================= */}
      <Dialog open={!!marksModalExam} onOpenChange={(open) => !open && setMarksModalExam(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white p-6 rounded-2xl">
          <DialogHeader className="print:hidden">
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Award className="w-5 h-5 text-purple-600" />
              <span>Certified Examination Marks & Evaluation Sheet</span>
            </DialogTitle>
          </DialogHeader>

          {marksModalExam && (() => {
            const resultsList = getExamMarks(marksModalExam);
            const totalObtained = resultsList.reduce((sum, r) => sum + Number(r.marks_obtained || 0), 0);
            const totalMax = resultsList.reduce((sum, r) => sum + Number(r.max_marks || 100), 0);
            const percentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;
            const allPassed = resultsList.every(r => (Number(r.marks_obtained) / Number(r.max_marks || 100)) >= 0.4);

            return (
              <div className="space-y-5 pt-2">
                {/* Header Information */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h3 className="text-sm font-bold text-slate-900">{marksModalExam.name}</h3>
                    <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[10px] font-bold w-fit">
                      CoE Certified Results
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-2 border-t border-slate-200/60">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Student Name</span>
                      <span className="font-bold text-slate-900">{user?.name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Student ID</span>
                      <span className="font-bold text-[#1D61E7] font-mono">{studentId}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Course</span>
                      <span className="font-bold text-slate-900">{studentCourse}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Semester</span>
                      <span className="font-bold text-slate-900">{marksModalExam.semester || 'Semester 1'}</span>
                    </div>
                  </div>
                </div>

                {/* Marks Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 uppercase text-[10px] font-bold">
                      <tr>
                        <th className="p-3">Subject / Paper</th>
                        <th className="p-3 text-right">Max Marks</th>
                        <th className="p-3 text-right">Marks Obtained</th>
                        <th className="p-3 text-right">Percentage</th>
                        <th className="p-3 text-center">Grade</th>
                        <th className="p-3 text-center">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {resultsList.map((res, i) => {
                        const maxM = Number(res.max_marks || 100);
                        const obtM = Number(res.marks_obtained || 0);
                        const pct = Math.round((obtM / maxM) * 100);
                        const isPass = pct >= 40;

                        return (
                          <tr key={res.id || i} className="hover:bg-slate-50/70">
                            <td className="p-3 font-bold text-slate-900">{res.subject}</td>
                            <td className="p-3 text-right font-mono text-slate-600">{maxM}</td>
                            <td className="p-3 text-right font-mono font-bold text-slate-900">{obtM}</td>
                            <td className="p-3 text-right font-mono font-semibold text-slate-700">{pct}%</td>
                            <td className="p-3 text-center">
                              <Badge variant="outline" className="font-bold text-[10px] bg-slate-50">
                                {res.grade || (pct >= 90 ? 'O' : pct >= 80 ? 'A+' : pct >= 70 ? 'A' : pct >= 60 ? 'B+' : pct >= 50 ? 'B' : pct >= 40 ? 'C' : 'F')}
                              </Badge>
                            </td>
                            <td className="p-3 text-center">
                              {isPass ? (
                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                                  PASS
                                </Badge>
                              ) : (
                                <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold">
                                  FAIL
                                </Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Aggregate Summary Box */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Marks</span>
                    <span className="text-base font-extrabold text-slate-900 font-mono">
                      {totalObtained} / {totalMax}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Percentage</span>
                    <span className="text-base font-extrabold text-[#1D61E7] font-mono">
                      {percentage}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Overall Grade</span>
                    <span className="text-base font-extrabold text-slate-900">
                      {percentage >= 90 ? 'O' : percentage >= 80 ? 'A+' : percentage >= 70 ? 'A' : percentage >= 60 ? 'B+' : percentage >= 50 ? 'B' : percentage >= 40 ? 'C' : 'F'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Final Result</span>
                    <span className={`text-base font-extrabold ${allPassed ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {allPassed ? 'PASSED' : 'ARREARS'}
                    </span>
                  </div>
                </div>

                {/* Footer Certification */}
                <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100">
                  <span>Officially certified by Office of the Controller of Examinations</span>
                  <span>Publication Date: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
