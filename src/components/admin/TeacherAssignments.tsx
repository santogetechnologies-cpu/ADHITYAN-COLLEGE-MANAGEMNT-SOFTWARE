import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { db } from '@/services/supabase/database';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { OFFICIAL_COURSES } from '@/constants/courses';
import { getAllAcademicClasses, matchesStudentClass } from '@/config/academicClassRegistry';
import { 
  Users, 
  Search, 
  Plus, 
  UserCheck, 
  BookOpen, 
  Trash2,
  Loader2
} from 'lucide-react';

interface TeacherAssignment {
  classId: string;
  className: string;
  subject: string;
  role: 'class_teacher' | 'subject_teacher';
  students: number;
}

interface Teacher {
  id: string;
  name: string;
  email: string;
  subjects: string[];
  classes: TeacherAssignment[];
  totalStudents: number;
}

interface ClassItem {
  id: string;
  name: string;
  totalStudents: number;
  classTeacher?: string;
  subjects: { subject: string; teacher?: string }[];
}

export default function TeacherAssignments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);

  // Dialog Form states
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedRole, setSelectedRole] = useState<'class_teacher' | 'subject_teacher'>('subject_teacher');

  const availableSubjects = [
    'Clinical Pathology & Hematology',
    'Dialysis Principles & Water Treatment',
    'Radiographic Techniques & Imaging',
    'Cardiac Anatomy & Physiology',
    'Operation Theatre & Sterilization',
    'Hospital Operations & Healthcare Administration',
    'Logistics, Warehousing & Supply Chain',
    'Front Office & Hospitality Management',
    'Health Informatics & Medical Records',
    'Pharmacology & Patient Safety',
    'Clinical Biochemistry',
    'Microbiology & Infection Control',
    'Anatomy & Physiology'
  ];

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [profiles, timetables, students] = await Promise.all([
        db.getAllProfiles(),
        db.getTimetables(),
        db.getStudentsByClass(),
      ]);

      const teacherProfiles = profiles.filter(p => p.role === 'teacher');
      const academicClasses = getAllAcademicClasses();
      const defaultCollegeClasses = academicClasses.map(c => c.displayName);

      // Gather distinct class names across official catalog, timetables, profiles, and students
      const allClassNames = Array.from(new Set([
        ...defaultCollegeClasses,
        ...timetables.map(t => t.class_name).filter(Boolean),
        ...teacherProfiles.flatMap(tp => Array.isArray(tp.preferences?.assigned_classes) ? tp.preferences.assigned_classes : (tp.class_name ? [tp.class_name] : [])).filter(Boolean),
        ...students.map(s => s.class_name).filter(Boolean),
      ])) as string[];

      // Construct teacher models with real data (no dummy fallback counts)
      const teacherModels: Teacher[] = teacherProfiles.map(tp => {
        const slots = timetables.filter(t => 
          (t.teacher_name && t.teacher_name.toLowerCase() === tp.name.toLowerCase()) ||
          t.teacher_id === tp.id
        );

        const profileClasses: string[] = Array.isArray(tp.preferences?.assigned_classes)
          ? tp.preferences.assigned_classes
          : (tp.class_name ? tp.class_name.split(',').map((s: string) => s.trim()).filter(Boolean) : []);

        const slotClasses = slots.map(s => s.class_name).filter(Boolean);
        const distinctClasses = Array.from(new Set([...profileClasses, ...slotClasses]));

        const assignedClasses: TeacherAssignment[] = [];
        distinctClasses.forEach((cName, idx) => {
          const matchingSlots = slots.filter(s => s.class_name === cName);
          const stuCount = students.filter(s => matchesStudentClass(cName, s)).length;
          if (matchingSlots.length > 0) {
            matchingSlots.forEach((slot, sIdx) => {
              assignedClasses.push({
                classId: `cls-${tp.id}-${idx}-${sIdx}`,
                className: cName,
                subject: slot.subject || tp.department || 'Paramedical Sciences',
                role: idx === 0 && sIdx === 0 ? 'class_teacher' : 'subject_teacher',
                students: stuCount,
              });
            });
          } else {
            assignedClasses.push({
              classId: `cls-${tp.id}-${idx}`,
              className: cName,
              subject: tp.department || 'Core Paramedical Curriculum',
              role: idx === 0 ? 'class_teacher' : 'subject_teacher',
              students: stuCount,
            });
          }
        });

        const distinctSubjects = Array.from(new Set([
          tp.department,
          ...slots.map(s => s.subject).filter(Boolean)
        ])).filter(Boolean) as string[];

        // Calculate actual unique students enrolled in any of this teacher's classes
        const totalUniqueStudents = students.filter(s => 
          distinctClasses.some(cName => matchesStudentClass(cName, s))
        ).length;

        return {
          id: tp.id,
          name: tp.name || 'Faculty Member',
          email: tp.email || 'N/A',
          subjects: distinctSubjects.length > 0 ? distinctSubjects : ['Faculty Member'],
          classes: assignedClasses,
          totalStudents: totalUniqueStudents,
        };
      });

      // Construct class models with real student counts and assigned teachers
      const classModels: ClassItem[] = allClassNames.map((cName, idx) => {
        const cSlots = timetables.filter(t => t.class_name === cName);
        const stuCount = students.filter(s => matchesStudentClass(cName, s)).length;

        const assignedTeachers = teacherProfiles.filter(tp => {
          const pClasses = Array.isArray(tp.preferences?.assigned_classes) ? tp.preferences.assigned_classes : (tp.class_name ? [tp.class_name] : []);
          return pClasses.some(pc => pc === cName || matchesStudentClass(cName, { class_name: pc })) ||
                 cSlots.some(s => s.teacher_id === tp.id || (s.teacher_name && s.teacher_name.toLowerCase() === tp.name.toLowerCase()));
        });
        const leadTeacher = cSlots[0]?.teacher_name || (assignedTeachers[0]?.name ?? 'Unassigned');

        const distinctSubjectNames = Array.from(new Set(cSlots.map(s => s.subject).filter(Boolean)));
        let subjects = distinctSubjectNames.map(sub => {
          const slot = cSlots.find(s => s.subject === sub);
          return {
            subject: sub,
            teacher: slot?.teacher_name || leadTeacher,
          };
        });

        if (subjects.length === 0 && assignedTeachers.length > 0) {
          subjects = [{
            subject: 'Core Paramedical Curriculum',
            teacher: leadTeacher !== 'Unassigned' ? leadTeacher : assignedTeachers[0]?.name
          }];
        }

        return {
          id: `class-${idx}`,
          name: cName,
          totalStudents: stuCount,
          classTeacher: leadTeacher !== 'Unassigned' ? leadTeacher : undefined,
          subjects,
        };
      });

      setTeachers(teacherModels);
      setClasses(classModels);

      if (teacherModels.length > 0 && !selectedTeacherId) {
        setSelectedTeacherId(teacherModels[0].id);
      }
      if (classModels.length > 0 && !selectedClassId) {
        setSelectedClassId(classModels[0].name);
      }
    } catch (err) {
      console.warn('Teacher assignments load warning:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTeacherId, selectedClassId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time synchronization
  useRealtimeSubscription({ table: 'profiles', onChange: loadData, onReconnect: loadData });
  useRealtimeSubscription({ table: 'timetables', onChange: loadData, onReconnect: loadData });

  const filteredTeachers = teachers.filter(teacher =>
    teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.subjects.some(subject => subject.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAssignTeacher = async () => {
    if (!selectedTeacherId || !selectedClassId || !selectedSubject) {
      toast({
        title: "Validation Error",
        description: "Please select a teacher, class, and subject.",
        variant: "destructive"
      });
      return;
    }

    const teacher = teachers.find(t => t.id === selectedTeacherId);
    if (!teacher) return;

    setIsSubmitting(true);
    try {
      const ok = await db.assignClassToTeacher(
        selectedTeacherId,
        selectedClassId,
        selectedSubject,
        selectedRole
      );

      if (!ok) {
        throw new Error("Failed to persist teacher assignment to database.");
      }

      toast({
        title: "Teacher Assigned",
        description: `${teacher.name} has been assigned to teach ${selectedSubject} for ${selectedClassId}.`
      });

      setIsAssignDialogOpen(false);
      loadData();
    } catch (err: any) {
      toast({
        title: "Assignment Failed",
        description: err.message || "Failed to persist teacher assignment to database.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveAssignment = async (teacherId: string, className: string, subject: string) => {
    try {
      const ok = await db.unassignClassFromTeacher(teacherId, className, subject);
      if (ok) {
        toast({
          title: "Assignment Removed",
          description: `Teaching assignment for ${className} has been unassigned.`
        });
      } else {
        toast({
          title: "Update Notice",
          description: "Assignment removal processed.",
        });
      }
      loadData();
    } catch (err: any) {
      toast({
        title: "Notice",
        description: err.message || "Assignment updated.",
      });
      loadData();
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Teacher Assignments</h1>
        </div>
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Assignment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Assign Teacher to Class</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="teacher">Select Teacher</Label>
                <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map(teacher => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.name} ({teacher.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="class">Select Class</Label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose class" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64 overflow-y-auto">
                    {classes.map(cls => (
                      <SelectItem key={cls.id} value={cls.name}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSubjects.map(subject => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={selectedRole} onValueChange={(val: any) => setSelectedRole(val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="class_teacher">Class Teacher</SelectItem>
                    <SelectItem value="subject_teacher">Subject Teacher</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAssignTeacher} className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  'Assign Teacher'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="teachers" className="space-y-6">
        <TabsList>
          <TabsTrigger value="teachers">Teachers View ({teachers.length})</TabsTrigger>
          <TabsTrigger value="classes">Classes View ({classes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="teachers" className="space-y-6">
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search teachers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTeachers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground text-sm">
                No teacher accounts found in database. Create teacher profiles in User Management to manage assignments.
              </CardContent>
            </Card>
          ) : (
            <div className="grid lg:grid-cols-2 gap-6">
              {filteredTeachers.map((teacher) => (
                <Card key={teacher.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{teacher.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{teacher.email}</p>
                      </div>
                      <Badge variant="secondary">
                        {teacher.totalStudents} Students
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {teacher.subjects.map((subject, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {subject}
                        </Badge>
                      ))}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Label className="text-sm font-medium">Assigned Classes:</Label>
                    {teacher.classes.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">No classes assigned yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {teacher.classes.map((cls, index) => (
                          <div key={index} className="flex items-center justify-between p-2 border rounded-lg">
                            <div className="flex items-center space-x-2">
                              {cls.role === 'class_teacher' ? (
                                <UserCheck className="w-4 h-4 text-primary" />
                              ) : (
                                <BookOpen className="w-4 h-4 text-muted-foreground" />
                              )}
                              <div>
                                <span className="font-medium text-sm">{cls.className}</span>
                                <span className="text-xs text-muted-foreground ml-2">({cls.subject})</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant={cls.role === 'class_teacher' ? 'default' : 'secondary'} className="text-xs">
                                {cls.role === 'class_teacher' ? 'Class Teacher' : 'Subject'}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveAssignment(teacher.id, cls.className, cls.subject)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="classes" className="space-y-6">
          {isLoading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : classes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground text-sm">
                No classes defined yet. Add sections in Department Management to configure class timetables.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {classes.map((cls) => (
                <Card key={cls.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{cls.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {cls.classTeacher ? `Class Teacher: ${cls.classTeacher}` : 'No class teacher assigned'}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {cls.totalStudents} Students
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Subject</TableHead>
                          <TableHead>Assigned Teacher</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cls.subjects.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-4">
                              No subjects scheduled for this cohort. Click New Assignment to assign faculty.
                            </TableCell>
                          </TableRow>
                        ) : (
                          cls.subjects.map((sub, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{sub.subject}</TableCell>
                              <TableCell>{sub.teacher || 'Unassigned'}</TableCell>
                              <TableCell>
                                <Badge variant={sub.teacher && sub.teacher !== 'Unassigned' ? 'default' : 'destructive'} className="text-xs">
                                  {sub.teacher && sub.teacher !== 'Unassigned' ? 'Assigned' : 'Vacant'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
