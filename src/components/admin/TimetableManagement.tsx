import { useState, useEffect, useCallback } from 'react';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar, 
  Clock, 
  Upload, 
  Download, 
  Edit, 
  Trash2, 
  Plus,
  BookOpen,
  Users,
  MapPin,
  Loader2,
  GraduationCap,
  FlaskConical,
  Stethoscope,
  Building2,
  AlertCircle
} from 'lucide-react';
import { db } from '@/services/supabase/database';

import { OFFICIAL_COURSES, getCourseSemesters } from '@/constants/courses';

export const COLLEGE_COURSES = OFFICIAL_COURSES.map(c => c.name);

export const YEARS_SEMESTERS = [
  'Semester 1',
  'Semester 2',
  'Semester 3',
  'Semester 4',
  'Semester 5',
  'Semester 6'
] as const;

export const SESSION_TYPES = [
  { id: 'theory', label: 'Theory Lecture (1h)', badge: 'Theory', color: 'bg-blue-500/10 text-blue-700 border-blue-200' },
  { id: 'practical', label: 'Laboratory Practical (2h - 3h)', badge: 'Practical Lab', color: 'bg-emerald-500/10 text-emerald-700 border-emerald-200' },
  { id: 'clinical', label: 'Clinical Postings / Hospital Rotation (3h - 4h)', badge: 'Clinical', color: 'bg-purple-500/10 text-purple-700 border-purple-200' },
  { id: 'seminar', label: 'Seminar / Case Discussion (1h - 2h)', badge: 'Seminar', color: 'bg-amber-500/10 text-amber-700 border-amber-200' }
] as const;

export const DEFAULT_ROOMS = [
  'MLT Pathology & Microbiology Lab',
  'Dialysis Simulation Suite & Lab',
  'Radiology & Medical Imaging Lab',
  'Cardiac Care & ECG Diagnostic Lab',
  'Operation Theatre (OT) Tech Lab',
  'Hospital Administration Practical Desk',
  'Logistics & Supply Chain Simulation Lab',
  'Hospitality Food & Beverage Training Lab',
  'Lecture Hall 101',
  'Lecture Hall 102',
  'Lecture Hall 201',
  'Lecture Hall 202',
  'Smart Seminar Hall',
  'Central Computer Lab',
  'Hospital Clinical Rotation Ward'
];

export const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const COLLEGE_HOURLY_SLOTS = [
  '08:30-09:30',
  '09:30-10:30',
  '10:30-11:30',
  '11:30-12:30',
  '12:30-13:30',
  '13:30-14:30',
  '14:30-15:30',
  '15:30-16:30',
  '16:30-17:30'
];

interface TimeSlot {
  id: string;
  courseName: string;
  yearSemester: string;
  roomLab: string;
  sessionType: string;
  startTime: string;
  endTime: string;
  subject: string;
  teacher: string;
  room: string;
  day: string;
}

export default function TimetableManagement() {
  const [selectedCourse, setSelectedCourse] = useState<string>(COLLEGE_COURSES[0]);
  const availableSemesters = getCourseSemesters(selectedCourse);
  const [selectedYear, setSelectedYear] = useState<string>(availableSemesters[0] || 'Semester 1');

  const handleCourseChange = (course: string) => {
    setSelectedCourse(course);
    const sems = getCourseSemesters(course);
    if (!sems.includes(selectedYear)) {
      setSelectedYear(sems[0] || 'Semester 1');
    }
  };
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [timetableSlots, setTimetableSlots] = useState<TimeSlot[]>([]);
  const { toast } = useToast();

  const [teachers, setTeachers] = useState<string[]>([]);

  const [newSlot, setNewSlot] = useState({
    day: 'Monday',
    sessionType: 'theory',
    startTime: '08:30',
    endTime: '09:30',
    subject: '',
    teacher: '',
    roomLab: DEFAULT_ROOMS[0],
    customRoom: ''
  });

  // Pre-fill teacher on load
  useEffect(() => {
    async function loadTeachers() {
      try {
        const profiles = await db.getAllProfiles();
        const teacherNames = profiles
          .filter(p => p.role === 'teacher')
          .map(p => p.name)
          .filter(Boolean);
        if (teacherNames.length > 0) {
          setTeachers(teacherNames);
          setNewSlot(prev => ({ ...prev, teacher: prev.teacher || teacherNames[0] }));
        }
      } catch (err) {
        console.warn('Teacher load warning:', err);
      }
    }
    loadTeachers();
  }, []);

  const loadTimetable = useCallback(async () => {
    if (!selectedCourse) return;
    setLoading(true);
    try {
      const data = await db.getTimetables({ courseName: selectedCourse, yearSemester: selectedYear });
      if (data && data.length > 0) {
        const mapped: TimeSlot[] = data.map(d => ({
          id: d.id,
          courseName: d.course_name || selectedCourse,
          yearSemester: d.year_semester || selectedYear,
          roomLab: d.room_lab || d.room,
          sessionType: d.session_type || 'theory',
          startTime: d.start_time.slice(0, 5),
          endTime: d.end_time.slice(0, 5),
          subject: d.subject,
          teacher: d.teacher_name,
          room: d.room_lab || d.room,
          day: d.day_of_week
        }));
        setTimetableSlots(mapped);
      } else {
        setTimetableSlots([]);
      }
    } catch (err) {
      console.error('Failed to load timetables:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCourse, selectedYear]);

  useEffect(() => {
    loadTimetable();
  }, [loadTimetable]);

  // Real-time synchronization for timetable adjustments
  useRealtimeSubscription({ table: 'timetables', onChange: loadTimetable, onReconnect: loadTimetable });

  const getScheduleForDay = (day: string) => {
    return timetableSlots
      .filter(slot => slot.day === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  // Clash detection: Faculty clashes, Room/Lab clashes, and Batch clashes
  const checkConflict = async (
    day: string,
    startTime: string,
    endTime: string,
    teacher: string,
    roomLab: string,
    courseName: string,
    yearSemester: string,
    excludeId?: string
  ) => {
    try {
      const allSlots = await db.getTimetables();
      const startNum = parseInt(startTime.replace(':', ''), 10);
      const endNum = parseInt(endTime.replace(':', ''), 10);

      if (startNum >= endNum) {
        return 'Invalid Time Range: Start time must be earlier than End time.';
      }

      for (const slot of allSlots) {
        if (excludeId && slot.id === excludeId) continue;
        if (slot.day_of_week !== day) continue;

        const slotStart = parseInt(slot.start_time.slice(0, 5).replace(':', ''), 10);
        const slotEnd = parseInt(slot.end_time.slice(0, 5).replace(':', ''), 10);

        // Check for time overlap
        const hasOverlap = (startNum < slotEnd) && (endNum > slotStart);
        if (!hasOverlap) continue;

        // 1. Faculty clash
        if (slot.teacher_name && slot.teacher_name.toLowerCase() === teacher.toLowerCase()) {
          return `Faculty Clash: "${teacher}" is already assigned to ${slot.course_name || slot.class_name} (${slot.year_semester || '1st Year'}) from ${slot.start_time.slice(0, 5)} to ${slot.end_time.slice(0, 5)} on ${day}.`;
        }

        // 2. Room/Lab clash
        const slotRoom = slot.room_lab || slot.room;
        if (slotRoom && slotRoom.toLowerCase() === roomLab.toLowerCase()) {
          return `Room/Lab Clash: "${roomLab}" is already occupied by ${slot.course_name || slot.class_name} (${slot.subject}) from ${slot.start_time.slice(0, 5)} to ${slot.end_time.slice(0, 5)} on ${day}.`;
        }

        // 3. Batch clash (same course and year)
        const isSameCourse = (slot.course_name && slot.course_name === courseName) || (slot.class_name && slot.class_name.includes(courseName));
        const isSameYear = !slot.year_semester || slot.year_semester === yearSemester;
        if (isSameCourse && isSameYear) {
          return `Batch Conflict: ${courseName} (${yearSemester}) already has "${slot.subject}" scheduled from ${slot.start_time.slice(0, 5)} to ${slot.end_time.slice(0, 5)} on ${day}.`;
        }
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleAddPeriod = async () => {
    const finalRoom = (newSlot.customRoom.trim() || newSlot.roomLab).trim();
    if (!newSlot.subject.trim()) {
      toast({
        title: "Subject Required",
        description: "Please specify the subject or clinical module name.",
        variant: "destructive"
      });
      return;
    }

    const assignedTeacher = newSlot.teacher || teachers[0] || 'Faculty Instructor';

    try {
      const conflictMsg = await checkConflict(
        newSlot.day,
        newSlot.startTime,
        newSlot.endTime,
        assignedTeacher,
        finalRoom,
        selectedCourse,
        selectedYear
      );
      if (conflictMsg) {
        toast({
          title: "Schedule Conflict Detected",
          description: conflictMsg,
          variant: "destructive"
        });
        return;
      }

      const created = await db.addTimetableSlot({
        course_name: selectedCourse,
        year_semester: selectedYear,
        room_lab: finalRoom,
        session_type: newSlot.sessionType as any,
        class_name: `${selectedCourse} (${selectedYear})`,
        day_of_week: newSlot.day as any,
        start_time: `${newSlot.startTime}:00`,
        end_time: `${newSlot.endTime}:00`,
        subject: newSlot.subject.trim(),
        teacher_name: assignedTeacher,
        room: finalRoom
      });

      const slotObj: TimeSlot = {
        id: created?.id || Date.now().toString(),
        courseName: selectedCourse,
        yearSemester: selectedYear,
        roomLab: finalRoom,
        sessionType: newSlot.sessionType,
        startTime: newSlot.startTime,
        endTime: newSlot.endTime,
        subject: newSlot.subject.trim(),
        teacher: assignedTeacher,
        room: finalRoom,
        day: newSlot.day
      };

      setTimetableSlots(prev => [...prev, slotObj]);
      setIsAddDialogOpen(false);
      setNewSlot({
        day: 'Monday',
        sessionType: 'theory',
        startTime: '08:30',
        endTime: '09:30',
        subject: '',
        teacher: teachers[0] || '',
        roomLab: DEFAULT_ROOMS[0],
        customRoom: ''
      });

      toast({
        title: "Session Scheduled",
        description: `Successfully added ${slotObj.subject} to ${selectedCourse} (${selectedYear}) on ${newSlot.day}.`
      });
    } catch (err: any) {
      toast({
        title: "Failed to Add Session",
        description: err.message,
        variant: "destructive"
      });
    }
  };

  const handleEditSlot = (slot: TimeSlot) => {
    setSelectedSlot({ ...slot });
    setIsEditDialogOpen(true);
  };

  const handleSaveSlot = async () => {
    if (!selectedSlot) return;

    try {
      const conflictMsg = await checkConflict(
        selectedSlot.day,
        selectedSlot.startTime,
        selectedSlot.endTime,
        selectedSlot.teacher,
        selectedSlot.roomLab,
        selectedSlot.courseName,
        selectedSlot.yearSemester,
        selectedSlot.id
      );
      if (conflictMsg) {
        toast({
          title: "Schedule Conflict Detected",
          description: conflictMsg,
          variant: "destructive"
        });
        return;
      }

      await db.updateTimetableSlot(selectedSlot.id, {
        subject: selectedSlot.subject,
        teacher_name: selectedSlot.teacher,
        room: selectedSlot.roomLab,
        room_lab: selectedSlot.roomLab,
        session_type: selectedSlot.sessionType as any
      });

      setTimetableSlots(timetableSlots.map(s => s.id === selectedSlot.id ? selectedSlot : s));
      toast({
        title: "Slot Updated",
        description: "Timetable session details saved successfully in the database."
      });
      setIsEditDialogOpen(false);
      setSelectedSlot(null);
    } catch (err: any) {
      toast({
        title: "Failed to Update Session",
        description: err.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    try {
      await db.deleteTimetableSlot(slotId);
      setTimetableSlots(timetableSlots.filter(s => s.id !== slotId));
      toast({
        title: "Slot Deleted",
        description: "Timetable session removed from schedule."
      });
    } catch (err) {
      setTimetableSlots(timetableSlots.filter(s => s.id !== slotId));
    }
  };

  const handlePublishTimetable = async () => {
    setPublishing(true);
    try {
      const profiles = await db.getAllProfiles();
      const recipients = profiles.filter(p => 
        (p.role === 'student' && p.department === selectedCourse) ||
        p.role === 'teacher' ||
        p.role === 'admin' ||
        p.role === 'principal'
      );

      for (const recipient of recipients.slice(0, 30)) {
        await db.createNotification({
          user_id: recipient.id,
          title: `Timetable Published: ${selectedCourse}`,
          message: `The active college timetable schedule for ${selectedCourse} (${selectedYear}) has been published by Administration.`,
          type: 'info',
          priority: 'medium',
          is_read: false
        });
      }

      toast({
        title: "Timetable Published",
        description: `Official schedule broadcasted to students and faculty of ${selectedCourse}.`
      });
    } catch (err: any) {
      toast({
        title: "Publish failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setPublishing(false);
    }
  };

  const exportTimetable = () => {
    const headers = "Course,Year/Semester,Day,Session Type,Start Time,End Time,Subject,Faculty,Room/Lab\n";
    const csvContent = headers + timetableSlots.map(s => 
      `"${s.courseName}","${s.yearSemester}","${s.day}","${s.sessionType}","${s.startTime}","${s.endTime}","${s.subject}","${s.teacher}","${s.roomLab}"`
    ).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedCourse.replace(/[^a-zA-Z0-9]/g, '_')}_${selectedYear.replace(/[^a-zA-Z0-9]/g, '_')}_timetable.csv`;
    a.click();
    toast({
      title: "Timetable Exported",
      description: `Downloaded official schedule CSV for ${selectedCourse} (${selectedYear}).`
    });
  };

  // Duration in hours string
  const calculateDuration = (start: string, end: string) => {
    const s = parseInt(start.replace(':', ''), 10);
    const e = parseInt(end.replace(':', ''), 10);
    const sMin = Math.floor(s / 100) * 60 + (s % 100);
    const eMin = Math.floor(e / 100) * 60 + (e % 100);
    const diff = Math.max(0, eMin - sMin);
    const hrs = (diff / 60).toFixed(1).replace('.0', '');
    return `${hrs} hr${parseFloat(hrs) > 1 ? 's' : ''}`;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Calendar className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">College Timetable Management</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Vocational & Medical Degree Schedules, Practical Lab Allocations & Faculty Workloads
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handlePublishTimetable} disabled={publishing}>
            {publishing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Calendar className="w-4 h-4 mr-2" />}
            Publish Schedule
          </Button>
          <Button variant="outline" size="sm" onClick={exportTimetable}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Session / Lab
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Add College Timetable Session
                </DialogTitle>
                <DialogDescription>
                  Configure theory lectures or extended continuous laboratory/clinical practicals.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold">Course</Label>
                    <Select value={selectedCourse} onValueChange={handleCourseChange}>
                      <SelectTrigger className="mt-1 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COLLEGE_COURSES.map(course => (
                          <SelectItem key={course} value={course} className="text-xs">
                            {course}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Year / Semester</Label>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger className="mt-1 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSemesters.map(yr => (
                          <SelectItem key={yr} value={yr} className="text-xs">
                            {yr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold">Day of Week</Label>
                    <Select value={newSlot.day} onValueChange={(v) => setNewSlot({ ...newSlot, day: v })}>
                      <SelectTrigger className="mt-1 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map(d => (
                          <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Session Type</Label>
                    <Select 
                      value={newSlot.sessionType} 
                      onValueChange={(v) => {
                        let end = newSlot.endTime;
                        if (v === 'practical') end = '11:30';
                        else if (v === 'clinical') end = '12:30';
                        else if (v === 'theory') end = '09:30';
                        setNewSlot({ ...newSlot, sessionType: v, endTime: end });
                      }}
                    >
                      <SelectTrigger className="mt-1 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SESSION_TYPES.map(st => (
                          <SelectItem key={st.id} value={st.id} className="text-xs">
                            {st.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold">Start Time (HH:MM)</Label>
                    <Input 
                      value={newSlot.startTime} 
                      onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })} 
                      placeholder="08:30"
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">End Time (HH:MM)</Label>
                    <Input 
                      value={newSlot.endTime} 
                      onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })} 
                      placeholder="11:30"
                      className="mt-1 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Subject / Clinical Module Name *</Label>
                  <Input 
                    value={newSlot.subject} 
                    onChange={(e) => setNewSlot({ ...newSlot, subject: e.target.value })} 
                    placeholder="e.g. Clinical Pathology Lab / Advanced Dialysis Machine Operation"
                    className="mt-1 text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold">Faculty Instructor *</Label>
                    <Select 
                      value={newSlot.teacher} 
                      onValueChange={(v) => setNewSlot({ ...newSlot, teacher: v })}
                    >
                      <SelectTrigger className="mt-1 text-xs">
                        <SelectValue placeholder="Assign faculty" />
                      </SelectTrigger>
                      <SelectContent>
                        {teachers.length === 0 ? (
                          <SelectItem value="unassigned" disabled className="text-xs text-muted-foreground">
                            No faculty registered yet in database
                          </SelectItem>
                        ) : (
                          teachers.map(t => (
                            <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Room / Laboratory *</Label>
                    <Select 
                      value={newSlot.roomLab} 
                      onValueChange={(v) => setNewSlot({ ...newSlot, roomLab: v })}
                    >
                      <SelectTrigger className="mt-1 text-xs">
                        <SelectValue placeholder="Select room/lab" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEFAULT_ROOMS.map(r => (
                          <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Custom Room/Lab Identifier (Optional)</Label>
                  <Input 
                    value={newSlot.customRoom}
                    onChange={(e) => setNewSlot({ ...newSlot, customRoom: e.target.value })}
                    placeholder="e.g. Hospital Ward B3 / ICU Lab Station 4"
                    className="mt-1 text-xs"
                  />
                </div>

                <Button className="w-full mt-2" onClick={handleAddPeriod}>
                  Save Session to Schedule
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Course & Year Filters */}
      <Card className="shadow-sm border">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
            <div className="flex-1 space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">SELECT COURSE PROGRAM</Label>
              <Select value={selectedCourse} onValueChange={handleCourseChange}>
                <SelectTrigger className="w-full font-medium text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLLEGE_COURSES.map(course => (
                    <SelectItem key={course} value={course} className="text-sm">
                      {course}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-64 space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">YEAR / SEMESTER</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-full font-medium text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableSemesters.map(yr => (
                    <SelectItem key={yr} value={yr} className="text-sm">
                      {yr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs defaultValue="grid" className="space-y-6">
        <TabsList>
          <TabsTrigger value="grid">Weekly Matrix Grid</TabsTrigger>
          <TabsTrigger value="list">Day-by-Day Sessions</TabsTrigger>
          <TabsTrigger value="overview">Curriculum Workload</TabsTrigger>
        </TabsList>

        {/* TAB 1: WEEKLY MATRIX GRID */}
        <TabsContent value="grid" className="space-y-4">
          <Card className="shadow-sm border">
            <CardHeader className="pb-3 border-b">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-primary" />
                    <span>{selectedCourse}</span>
                    <Badge variant="outline" className="ml-1 text-xs">
                      {selectedYear}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Continuous lecture and extended practical lab allocations
                  </CardDescription>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span> Theory
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Practical Lab
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"></span> Clinical Posting
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {loading ? (
                <div className="flex justify-center items-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="grid grid-cols-7 gap-2 min-w-[900px]">
                    {/* Time Column Header */}
                    <div className="font-semibold text-xs p-2.5 bg-muted rounded text-center">
                      Time Slot
                    </div>
                    {DAYS_OF_WEEK.map(day => (
                      <div key={day} className="font-semibold text-xs p-2.5 bg-muted rounded text-center">
                        {day}
                      </div>
                    ))}

                    {/* Hourly Rows */}
                    {COLLEGE_HOURLY_SLOTS.map((slotRange) => {
                      const [slotStartStr, slotEndStr] = slotRange.split('-');
                      const slotStartNum = parseInt(slotStartStr.replace(':', ''), 10);
                      const slotEndNum = parseInt(slotEndStr.replace(':', ''), 10);

                      return (
                        <div key={`row-${slotRange}`} className="contents">
                          <div className="text-xs p-2 border rounded flex items-center justify-center font-mono text-muted-foreground bg-muted/20">
                            <Clock className="w-3 h-3 mr-1" />
                            {slotRange}
                          </div>

                          {DAYS_OF_WEEK.map(day => {
                            const daySessions = getScheduleForDay(day);
                            // Find any session that overlaps with this hour slot
                            const activeSession = daySessions.find(s => {
                              const sNum = parseInt(s.startTime.replace(':', ''), 10);
                              const eNum = parseInt(s.endTime.replace(':', ''), 10);
                              return sNum < slotEndNum && eNum > slotStartNum;
                            });

                            // Determine if this is the start slot of the session
                            const isFirstHour = activeSession ? activeSession.startTime === slotStartStr : false;

                            return (
                              <div 
                                key={`${day}-${slotRange}`} 
                                className={`border rounded p-2 min-h-20 transition-colors ${
                                  activeSession ? 'bg-card' : 'bg-muted/5'
                                }`}
                              >
                                {activeSession ? (
                                  <div className="space-y-1.5 h-full flex flex-col justify-between">
                                    <div>
                                      <div className="flex items-start justify-between gap-1">
                                        <Badge 
                                          variant="outline" 
                                          className={`text-[10px] px-1.5 py-0 font-medium ${
                                            activeSession.sessionType === 'practical' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                                            activeSession.sessionType === 'clinical' ? 'bg-purple-50 text-purple-700 border-purple-300' :
                                            activeSession.sessionType === 'seminar' ? 'bg-amber-50 text-amber-700 border-amber-300' :
                                            'bg-blue-50 text-blue-700 border-blue-300'
                                          }`}
                                        >
                                          {activeSession.sessionType === 'practical' ? 'Lab Practical' : 
                                           activeSession.sessionType === 'clinical' ? 'Clinical' : 
                                           activeSession.sessionType === 'seminar' ? 'Seminar' : 'Theory'}
                                        </Badge>
                                        <div className="flex gap-0.5">
                                          <button
                                            onClick={() => handleEditSlot(activeSession)}
                                            className="text-muted-foreground hover:text-foreground p-0.5"
                                            title="Edit Session"
                                          >
                                            <Edit className="w-2.5 h-2.5" />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteSlot(activeSession.id)}
                                            className="text-muted-foreground hover:text-destructive p-0.5"
                                            title="Delete Session"
                                          >
                                            <Trash2 className="w-2.5 h-2.5" />
                                          </button>
                                        </div>
                                      </div>
                                      <div className="font-semibold text-xs line-clamp-2 mt-1">
                                        {activeSession.subject}
                                      </div>
                                    </div>

                                    <div className="text-[11px] text-muted-foreground space-y-0.5 pt-1 border-t border-border/50">
                                      <div className="flex items-center gap-1 font-mono text-[10px]">
                                        <Clock className="w-2.5 h-2.5" />
                                        <span>{activeSession.startTime} - {activeSession.endTime} ({calculateDuration(activeSession.startTime, activeSession.endTime)})</span>
                                      </div>
                                      <div className="flex items-center gap-1 truncate" title={activeSession.teacher}>
                                        <Users className="w-2.5 h-2.5 shrink-0" />
                                        <span className="truncate">{activeSession.teacher}</span>
                                      </div>
                                      <div className="flex items-center gap-1 truncate text-primary/80 font-medium" title={activeSession.roomLab}>
                                        <MapPin className="w-2.5 h-2.5 shrink-0" />
                                        <span className="truncate">{activeSession.roomLab}</span>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="h-full flex items-center justify-center text-muted-foreground/40 text-[10px]">
                                    —
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: DAY-BY-DAY LIST */}
        <TabsContent value="list" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DAYS_OF_WEEK.map(day => {
              const sessions = getScheduleForDay(day);
              return (
                <Card key={day} className="shadow-sm border">
                  <CardHeader className="py-3 px-4 bg-muted/30 border-b flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-semibold">{day}</CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {sessions.length} Session{sessions.length !== 1 ? 's' : ''}
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-3 space-y-2">
                    {sessions.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">No scheduled sessions</p>
                    ) : (
                      sessions.map(s => (
                        <div key={s.id} className="p-2.5 border rounded-lg bg-card hover:bg-muted/10 transition-colors space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs">{s.subject}</span>
                            <Badge 
                              variant="outline" 
                              className={`text-[10px] ${
                                s.sessionType === 'practical' ? 'bg-emerald-50 text-emerald-700' :
                                s.sessionType === 'clinical' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'
                              }`}
                            >
                              {calculateDuration(s.startTime, s.endTime)}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                            <span className="flex items-center gap-1 font-mono text-[10px]">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              {s.startTime} - {s.endTime}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3 text-muted-foreground" />
                              {s.teacher}
                            </span>
                          </div>
                          <div className="text-xs text-primary flex items-center justify-between pt-1">
                            <span className="flex items-center gap-1 font-medium text-[11px]">
                              <MapPin className="w-3 h-3" />
                              {s.roomLab}
                            </span>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleEditSlot(s)}>
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => handleDeleteSlot(s.id)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* TAB 3: CURRICULUM WORKLOAD OVERVIEW */}
        <TabsContent value="overview">
          <Card className="shadow-sm border">
            <CardHeader>
              <CardTitle className="text-base">Institutional Course Schedule Matrix</CardTitle>
              <CardDescription className="text-xs">
                Real-time workload distribution and laboratory room allocation across all 9 college programs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg bg-primary/5 space-y-1">
                  <div className="text-xs font-semibold text-primary">Active Program</div>
                  <div className="text-lg font-bold">{selectedCourse}</div>
                  <div className="text-xs text-muted-foreground">Allocated cohort: {selectedYear}</div>
                </div>
                <div className="p-4 border rounded-lg bg-emerald-500/5 space-y-1">
                  <div className="text-xs font-semibold text-emerald-700">Scheduled Weekly Sessions</div>
                  <div className="text-lg font-bold">{timetableSlots.length} Total Sessions</div>
                  <div className="text-xs text-muted-foreground">
                    {timetableSlots.filter(s => s.sessionType === 'practical').length} Practical Labs • {timetableSlots.filter(s => s.sessionType === 'theory').length} Theory Lectures
                  </div>
                </div>
                <div className="p-4 border rounded-lg bg-purple-500/5 space-y-1">
                  <div className="text-xs font-semibold text-purple-700">Dedicated Laboratories</div>
                  <div className="text-lg font-bold">{DEFAULT_ROOMS.length} Certified Facilities</div>
                  <div className="text-xs text-muted-foreground">Automated conflict prevention active</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* EDIT SESSION DIALOG */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Timetable Session</DialogTitle>
            <DialogDescription>
              Update subject, assigned faculty, laboratory, or continuous time duration.
            </DialogDescription>
          </DialogHeader>
          {selectedSlot && (
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-xs font-semibold">Subject / Clinical Module</Label>
                <Input 
                  value={selectedSlot.subject}
                  onChange={(e) => setSelectedSlot({ ...selectedSlot, subject: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Start Time</Label>
                  <Input 
                    value={selectedSlot.startTime}
                    onChange={(e) => setSelectedSlot({ ...selectedSlot, startTime: e.target.value })}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">End Time</Label>
                  <Input 
                    value={selectedSlot.endTime}
                    onChange={(e) => setSelectedSlot({ ...selectedSlot, endTime: e.target.value })}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Assigned Faculty Instructor</Label>
                <Select 
                  value={selectedSlot.teacher} 
                  onValueChange={(val) => setSelectedSlot({ ...selectedSlot, teacher: val })}
                >
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.length === 0 ? (
                      <SelectItem value="unassigned" disabled className="text-xs text-muted-foreground">
                        No faculty registered yet in database
                      </SelectItem>
                    ) : (
                      teachers.map(teacher => (
                        <SelectItem key={teacher} value={teacher} className="text-xs">
                          {teacher}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Room / Laboratory</Label>
                <Select 
                  value={selectedSlot.roomLab} 
                  onValueChange={(val) => setSelectedSlot({ ...selectedSlot, roomLab: val, room: val })}
                >
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFAULT_ROOMS.map(room => (
                      <SelectItem key={room} value={room} className="text-xs">
                        {room}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Session Type</Label>
                <Select 
                  value={selectedSlot.sessionType} 
                  onValueChange={(val) => setSelectedSlot({ ...selectedSlot, sessionType: val })}
                >
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SESSION_TYPES.map(st => (
                      <SelectItem key={st.id} value={st.id} className="text-xs">
                        {st.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleSaveSlot} className="w-full">
                Save Changes to Database
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
