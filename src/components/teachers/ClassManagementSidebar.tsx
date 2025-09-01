import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  GraduationCap
} from 'lucide-react';

interface ClassManagementSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function ClassManagementSidebar({ isOpen, onToggle }: ClassManagementSidebarProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const classData = {
    className: 'Grade 10-A',
    totalStudents: 32,
    presentToday: 30,
    absentToday: 2,
    healthCheckIns: 28
  };

  const studentList = [
    { id: 1, name: 'Alex Chen', status: 'present', health: 'good', lastUpdate: '9:00 AM' },
    { id: 2, name: 'Sarah Johnson', status: 'present', health: 'concerns', lastUpdate: '9:05 AM' },
    { id: 3, name: 'Mike Rodriguez', status: 'absent', health: 'good', lastUpdate: 'Yesterday' },
    { id: 4, name: 'Emma Davis', status: 'present', health: 'good', lastUpdate: '9:10 AM' },
  ];

  const healthAlerts = [
    { student: 'Sarah Johnson', issue: 'Reported headache and fatigue', time: '9:05 AM', severity: 'medium' },
    { student: 'David Brown', issue: 'Anxiety about upcoming test', time: 'Yesterday', severity: 'low' }
  ];

  const subjectClasses = [
    { class: 'Grade 9-B', subject: 'Mathematics', students: 28, present: 26 },
    { class: 'Grade 11-A', subject: 'Mathematics', students: 30, present: 29 },
  ];

  const timetable = [
    { time: '9:00 AM', subject: 'Mathematics', class: 'Grade 10-A', room: 'Room 201' },
    { time: '11:00 AM', subject: 'Mathematics', class: 'Grade 9-B', room: 'Room 105' },
    { time: '2:00 PM', subject: 'Advanced Math', class: 'Grade 11-A', room: 'Room 301' },
  ];

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
            {/* My Class Overview */}
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>My Class: {classData.className}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="text-center p-3 bg-primary/5 rounded-lg">
                    <div className="text-xl font-bold text-primary">{classData.totalStudents}</div>
                    <div className="text-xs text-muted-foreground">Total Students</div>
                  </div>
                  <div className="text-center p-3 bg-success/5 rounded-lg">
                    <div className="text-xl font-bold text-success">{classData.presentToday}</div>
                    <div className="text-xs text-muted-foreground">Present Today</div>
                  </div>
                  <div className="text-center p-3 bg-destructive/5 rounded-lg">
                    <div className="text-xl font-bold text-destructive">{classData.absentToday}</div>
                    <div className="text-xs text-muted-foreground">Absent Today</div>
                  </div>
                  <div className="text-center p-3 bg-accent/5 rounded-lg">
                    <div className="text-xl font-bold text-accent">{classData.healthCheckIns}</div>
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
                    {studentList.map((student) => (
                      <div key={student.id} className="flex items-center justify-between p-2 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{student.name}</div>
                          <div className="text-xs text-muted-foreground">{student.lastUpdate}</div>
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
                    <Button variant="outline" size="sm" className="w-full mt-2">
                      Update Attendance
                    </Button>
                  </TabsContent>

                  <TabsContent value="health" className="space-y-2">
                    {healthAlerts.map((alert, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-medium text-sm">{alert.student}</div>
                          <Badge 
                            variant={alert.severity === 'medium' ? 'secondary' : 'outline'}
                            className="text-xs"
                          >
                            {alert.severity}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">{alert.issue}</p>
                        <p className="text-xs text-muted-foreground">{alert.time}</p>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="w-full">
                      View All Health Reports
                    </Button>
                  </TabsContent>

                  <TabsContent value="subjects" className="space-y-2">
                    {subjectClasses.map((cls, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <div className="font-medium text-sm">{cls.class}</div>
                            <div className="text-xs text-muted-foreground">{cls.subject}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">{cls.present}/{cls.students}</div>
                            <div className="text-xs text-muted-foreground">Present</div>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="w-full mt-2">
                          View Details
                        </Button>
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="schedule" className="space-y-2">
                    {timetable.map((slot, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">{slot.time}</div>
                            <div className="text-xs text-muted-foreground">{slot.subject}</div>
                            <div className="text-xs text-muted-foreground">{slot.class} • {slot.room}</div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            Today
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </div>
    </>
  );
}