import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  Edit, 
  Trash2, 
  Plus,
  Search,
  UserCheck,
  Calendar
} from 'lucide-react';

interface Teacher {
  id: string;
  name: string;
  email: string;
  subjects: string[];
  classes: ClassAssignment[];
  totalStudents: number;
}

interface ClassAssignment {
  classId: string;
  className: string;
  subject: string;
  role: 'class_teacher' | 'subject_teacher';
  students: number;
}

interface Class {
  id: string;
  name: string;
  totalStudents: number;
  classTeacher?: string;
  subjects: { subject: string; teacher?: string }[];
}

export default function TeacherAssignments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const { toast } = useToast();

  const teachers: Teacher[] = [
    {
      id: '1',
      name: 'Dr. Michael Rodriguez',
      email: 'michael.rodriguez@school.edu',
      subjects: ['Mathematics', 'Physics'],
      classes: [
        { classId: '10a', className: 'Grade 10-A', subject: 'Mathematics', role: 'class_teacher', students: 32 },
        { classId: '9b', className: 'Grade 9-B', subject: 'Mathematics', role: 'subject_teacher', students: 28 },
      ],
      totalStudents: 60
    },
    {
      id: '2',
      name: 'Mrs. Sarah Johnson',
      email: 'sarah.johnson@school.edu',
      subjects: ['English', 'Literature'],
      classes: [
        { classId: '11a', className: 'Grade 11-A', subject: 'English', role: 'class_teacher', students: 30 },
        { classId: '10b', className: 'Grade 10-B', subject: 'English', role: 'subject_teacher', students: 29 },
      ],
      totalStudents: 59
    },
    {
      id: '3',
      name: 'Mr. David Chen',
      email: 'david.chen@school.edu',
      subjects: ['Chemistry', 'Biology'],
      classes: [
        { classId: '12a', className: 'Grade 12-A', subject: 'Chemistry', role: 'subject_teacher', students: 25 },
      ],
      totalStudents: 25
    }
  ];

  const classes: Class[] = [
    {
      id: '10a',
      name: 'Grade 10-A',
      totalStudents: 32,
      classTeacher: 'Dr. Michael Rodriguez',
      subjects: [
        { subject: 'Mathematics', teacher: 'Dr. Michael Rodriguez' },
        { subject: 'English', teacher: 'Mrs. Sarah Johnson' },
        { subject: 'Physics', teacher: 'Dr. Michael Rodriguez' },
        { subject: 'Chemistry' },
        { subject: 'Biology' }
      ]
    },
    {
      id: '10b',
      name: 'Grade 10-B',
      totalStudents: 29,
      subjects: [
        { subject: 'Mathematics' },
        { subject: 'English', teacher: 'Mrs. Sarah Johnson' },
        { subject: 'Physics' },
        { subject: 'Chemistry' },
        { subject: 'Biology' }
      ]
    },
    {
      id: '11a',
      name: 'Grade 11-A',
      totalStudents: 30,
      classTeacher: 'Mrs. Sarah Johnson',
      subjects: [
        { subject: 'Mathematics' },
        { subject: 'English', teacher: 'Mrs. Sarah Johnson' },
        { subject: 'Physics' },
        { subject: 'Chemistry' },
        { subject: 'Biology' }
      ]
    }
  ];

  const availableSubjects = ['Mathematics', 'English', 'Physics', 'Chemistry', 'Biology', 'History', 'Geography'];

  const filteredTeachers = teachers.filter(teacher =>
    teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.subjects.some(subject => subject.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAssignTeacher = () => {
    toast({
      title: "Teacher Assigned",
      description: "Teacher has been successfully assigned to the class."
    });
    setIsAssignDialogOpen(false);
  };

  const handleRemoveAssignment = (teacherId: string, classId: string) => {
    toast({
      title: "Assignment Removed",
      description: "Teacher assignment has been removed from the class."
    });
  };

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
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
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map(teacher => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="class">Select Class</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map(cls => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Select>
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
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="class_teacher">Class Teacher</SelectItem>
                    <SelectItem value="subject_teacher">Subject Teacher</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAssignTeacher} className="w-full">
                Assign Teacher
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="teachers" className="space-y-6">
        <TabsList>
          <TabsTrigger value="teachers">Teachers View</TabsTrigger>
          <TabsTrigger value="classes">Classes View</TabsTrigger>
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

          {/* Teachers List */}
          <div className="grid lg:grid-cols-2 gap-6">
            {filteredTeachers.map((teacher) => (
              <Card key={teacher.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <GraduationCap className="w-5 h-5" />
                        <span>{teacher.name}</span>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{teacher.email}</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Subjects</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {teacher.subjects.map((subject) => (
                          <Badge key={subject} variant="secondary" className="text-xs">
                            {subject}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium mb-2 block">Class Assignments</Label>
                      <div className="space-y-2">
                        {teacher.classes.map((assignment) => (
                          <div key={`${assignment.classId}-${assignment.subject}`} 
                               className="flex items-center justify-between p-2 bg-muted rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-sm">{assignment.className}</span>
                                <Badge 
                                  variant={assignment.role === 'class_teacher' ? 'default' : 'outline'}
                                  className="text-xs"
                                >
                                  {assignment.role === 'class_teacher' ? 'Class Teacher' : 'Subject Teacher'}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {assignment.subject} • {assignment.students} students
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveAssignment(teacher.id, assignment.classId)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t">
                      <div className="flex justify-between text-sm">
                        <span>Total Students:</span>
                        <span className="font-medium">{teacher.totalStudents}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="classes" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {classes.map((cls) => (
              <Card key={cls.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <BookOpen className="w-5 h-5" />
                        <span>{cls.name}</span>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{cls.totalStudents} students</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Class Teacher</Label>
                      <div className="mt-1">
                        {cls.classTeacher ? (
                          <Badge variant="default" className="text-xs">
                            <UserCheck className="w-3 h-3 mr-1" />
                            {cls.classTeacher}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Not Assigned
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium mb-2 block">Subject Teachers</Label>
                      <div className="space-y-2">
                        {cls.subjects.map((subject) => (
                          <div key={subject.subject} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                            <div className="flex-1">
                              <div className="font-medium text-sm">{subject.subject}</div>
                            </div>
                            <div>
                              {subject.teacher ? (
                                <Badge variant="secondary" className="text-xs">
                                  {subject.teacher}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  Unassigned
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}