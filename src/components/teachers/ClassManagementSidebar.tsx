import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  Heart, 
  Calendar, 
  BookOpen,
  TrendingUp,
  UserCheck,
  UserX,
  AlertTriangle,
  Clock,
  ChevronRight,
  GraduationCap,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/supabase/database';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { Profile, TimetableSlot, StudentAttendance, WellnessCheckin } from '@/types/database.types';
import { matchesStudentClass } from '@/config/academicClassRegistry';

interface ClassManagementSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface StudentAttendanceItem {
  id: string;
  name: string;
  studentId?: string;
  rollNumber?: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  health: 'good' | 'concerns';
  lastUpdate: string;
}

export function ClassManagementSidebar({ isOpen, onToggle }: ClassManagementSidebarProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [isUpdatingAttendance, setIsUpdatingAttendance] = useState(false);
  const [loading, setLoading] = useState(true);

  // Classes & Selection
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');

  // Class Roster & Attendance
  const [students, setStudents] = useState<StudentAttendanceItem[]>([]);
  const [todayWellness, setTodayWellness] = useState<WellnessCheckin[]>([]);
  const [timetables, setTimetables] = useState<TimetableSlot[]>([]);

  // 1. Load Teacher's Classes & Timetables
  const loadTeacherClasses = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { assignedClasses, assignedSlots } = await db.getTeacherAssignedClassesAndSubjects(user.id, user.name);
      setTimetables(assignedSlots);

      if (assignedClasses.length > 0) {
        setAvailableClasses(assignedClasses);
        setSelectedClass(prev => assignedClasses.includes(prev) ? prev : assignedClasses[0]);
      } else {
        setAvailableClasses([]);
        setSelectedClass('');
      }
    } catch (err) {
      console.warn('ClassManagementSidebar loadClasses notice:', err);
      setAvailableClasses([]);
      setSelectedClass('');
    }
  }, [user]);

  useEffect(() => {
    loadTeacherClasses();
  }, [loadTeacherClasses]);

  useEffect(() => {
    const handleSync = () => {
      loadTeacherClasses();
    };
    window.addEventListener('teacher-assignments-changed', handleSync);
    return () => {
      window.removeEventListener('teacher-assignments-changed', handleSync);
    };
  }, [loadTeacherClasses]);

  // 2. Load Class Roster, Attendance & Health
  const loadClassDetails = useCallback(async () => {
    if (!selectedClass || !user?.id) {
      setStudents([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      const today = new Date().toISOString().split('T')[0];

      // Fetch teacher's assigned students matching this specific class
      const [teacherStudents, allAttendance, wellnessList] = await Promise.all([
        db.getStudentsForTeacher(user.id, user.name),
        db.getStudentAttendance(''),
        db.getTodayWellnessCheckins(),
      ]);

      const classStudents = teacherStudents.filter(s => matchesStudentClass(selectedClass, s));

      setTodayWellness(wellnessList || []);

      // Map today's attendance records by student_id
      const attMap = new Map<string, string>();
      (allAttendance || [])
        .filter(a => a.date === today)
        .forEach(a => attMap.set(a.student_id, a.status));

      // Wellness map
      const wellnessUserIds = new Set((wellnessList || []).map(w => w.user_id));

      const roster: StudentAttendanceItem[] = classStudents.map(s => {
        const recordedStatus = attMap.get(s.id) as any;
        return {
          id: s.id,
          name: s.name,
          studentId: s.student_id || s.roll_number,
          rollNumber: s.roll_number,
          status: recordedStatus || 'present',
          health: wellnessUserIds.has(s.id) ? 'good' : 'concerns',
          lastUpdate: recordedStatus ? 'Marked' : 'Pending',
        };
      });

      setStudents(roster);
    } catch (err) {
      console.warn('Failed to load class roster:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedClass]);

  useEffect(() => {
    loadClassDetails();
  }, [loadClassDetails]);

  // Real-time synchronization
  useRealtimeSubscription({ table: 'student_attendance', onChange: loadClassDetails, onReconnect: loadClassDetails });
  useRealtimeSubscription({ table: 'timetables', onChange: loadTeacherClasses, onReconnect: loadTeacherClasses });
  useRealtimeSubscription({ table: 'wellness_checkins', onChange: loadClassDetails, onReconnect: loadClassDetails });

  // Toggle student status locally before saving
  const handleToggleStudent = (studentId: string) => {
    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        const nextStatus = s.status === 'present' ? 'absent' : 'present';
        return { ...s, status: nextStatus, lastUpdate: 'Modified' };
      }
      return s;
    }));
  };

  // Save Today's Attendance to Supabase
  const handleUpdateAttendance = async () => {
    setIsUpdatingAttendance(true);
    const today = new Date().toISOString().split('T')[0];

    try {
      const recordsToInsert = students
        .map(s => ({
          student_id: s.id,
          institutional_student_id: s.studentId || s.rollNumber,
          date: today,
          status: s.status,
          course: user?.department || 'Paramedical Sciences',
          semester: selectedClass,
          recorded_by: user?.id,
          subject: user?.department || 'Class Register',
        }));

      if (recordsToInsert.length > 0) {
        await db.recordBulkAttendance(recordsToInsert);
      }

      toast({
        title: "Attendance Saved",
        description: `Today's attendance for ${selectedClass} verified & persisted to official college register.`,
      });

      await loadClassDetails();
    } catch (err: any) {
      toast({
        title: "Failed to Update Attendance",
        description: err.message || "Could not save attendance to database.",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingAttendance(false);
    }
  };

  const presentCount = students.filter(s => s.status === 'present').length;
  const absentCount = students.filter(s => s.status === 'absent').length;

  if (!isOpen) {
    return (
      <div className="fixed right-4 top-20 z-50">
        <Button 
          onClick={onToggle}
          className="rounded-full p-3 shadow-lg"
          variant="default"
        >
          <Users className="w-5 h-5" />
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onToggle}
      />
      
      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-96 bg-background border-l shadow-xl z-50">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Class Management</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onToggle}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <ScrollArea className="h-[calc(100vh-64px)]">
          <div className="p-4">
            {availableClasses.length === 0 ? (
              <div className="text-center p-6 border rounded-lg bg-muted/20">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
                <h3 className="font-semibold text-sm mb-1">No Assigned Classes</h3>
                <p className="text-xs text-muted-foreground">
                  Your academic classes and subjects are configured by the Administrator or Principal via the Academic Timetable.
                </p>
              </div>
            ) : (
              <>
                {/* Class Selector */}
                {availableClasses.length > 1 && (
                  <div className="mb-4">
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                      <SelectTrigger className="w-full text-xs">
                        <SelectValue placeholder="Select Class" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableClasses.map(cls => (
                          <SelectItem key={cls} value={cls}>
                            {cls}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

            {/* My Class Overview */}
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>My Class: {selectedClass}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="text-center p-3 bg-primary/5 rounded-lg">
                    <div className="text-xl font-bold text-primary">{students.length}</div>
                    <div className="text-xs text-muted-foreground">Total Students</div>
                  </div>
                  <div className="text-center p-3 bg-success/5 rounded-lg">
                    <div className="text-xl font-bold text-success">{presentCount}</div>
                    <div className="text-xs text-muted-foreground">Present Today</div>
                  </div>
                  <div className="text-center p-3 bg-destructive/5 rounded-lg">
                    <div className="text-xl font-bold text-destructive">{absentCount}</div>
                    <div className="text-xs text-muted-foreground">Absent Today</div>
                  </div>
                  <div className="text-center p-3 bg-accent/5 rounded-lg">
                    <div className="text-xl font-bold text-accent">{todayWellness.length}</div>
                    <div className="text-xs text-muted-foreground">Health Check-ins</div>
                  </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-4 mb-3">
                    <TabsTrigger value="overview" className="text-xs">Students</TabsTrigger>
                    <TabsTrigger value="health" className="text-xs">Health</TabsTrigger>
                    <TabsTrigger value="subjects" className="text-xs">Subjects</TabsTrigger>
                    <TabsTrigger value="schedule" className="text-xs">Schedule</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-2">
                    {loading ? (
                      <div className="flex justify-center p-6">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : students.length === 0 ? (
                      <div className="text-center py-6 text-xs text-muted-foreground border rounded-lg p-3">
                        No enrolled students found for {selectedClass}. Enroll students or assign classes via Administration.
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                          {students.map((student) => (
                            <div 
                              key={student.id} 
                              className="flex items-center justify-between p-2 border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors"
                              onClick={() => handleToggleStudent(student.id)}
                            >
                              <div className="flex-1">
                                <div className="font-medium text-sm flex items-center gap-1.5">
                                  <span>{student.name}</span>
                                  {student.studentId && (
                                    <Badge variant="outline" className="font-mono text-[9px] py-0 px-1 bg-primary/5 text-primary border-primary/20">
                                      {student.studentId}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {student.studentId ? `ID: ${student.studentId} • ` : (student.rollNumber ? `Roll: ${student.rollNumber} • ` : '')}{student.lastUpdate}
                                </div>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Badge 
                                  variant={student.status === 'present' ? 'default' : 'destructive'}
                                  className="text-xs"
                                >
                                  {student.status === 'present' ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full mt-2"
                          onClick={handleUpdateAttendance}
                          disabled={isUpdatingAttendance || students.length === 0}
                        >
                          {isUpdatingAttendance ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                          Save Today's Attendance
                        </Button>
                      </>
                    )}
                  </TabsContent>

                  <TabsContent value="health" className="space-y-2">
                    {todayWellness.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-6">
                        No health alerts or medical issues flagged for this class cohort today.
                      </p>
                    ) : (
                      todayWellness.slice(0, 4).map((w, index) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <div className="font-medium text-sm">Wellness Check-in</div>
                            <Badge variant="outline" className="text-xs capitalize">
                              {w.checkin_type || 'morning'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">
                            {w.options && w.options.length > 0 ? w.options.join(' • ') : 'Standard wellness report'}
                          </p>
                          <p className="text-xs text-muted-foreground">{new Date(w.date).toLocaleDateString()}</p>
                        </div>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="subjects" className="space-y-2">
                    {availableClasses.map((cls, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <div className="font-medium text-sm">{cls}</div>
                            <div className="text-xs text-muted-foreground">{user?.department || 'Curriculum'}</div>
                          </div>
                          <div className="text-right">
                            <Badge variant="secondary" className="text-xs">Active Cohort</Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="schedule" className="space-y-2">
                    {timetables.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-6">
                        No timetable lecture periods configured in database.
                      </p>
                    ) : (
                      timetables.slice(0, 5).map((slot, index) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-sm">{slot.start_time} - {slot.end_time}</div>
                              <div className="text-xs text-muted-foreground">{slot.subject} ({slot.day_of_week})</div>
                              <div className="text-xs text-muted-foreground">{slot.class_name} • {slot.room}</div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              <Clock className="w-3 h-3 mr-1" />
                              Scheduled
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
            </>
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  );
}
