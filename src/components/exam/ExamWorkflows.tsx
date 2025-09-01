import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Monitor, FileText, CheckCircle, Clock, AlertCircle, Users } from 'lucide-react';

export const ExamWorkflows = () => {
  const [onlineExams] = useState([
    {
      id: 1,
      name: 'Mathematics Mid Term',
      class: 'Class 10',
      type: 'MCQ',
      duration: '2 hours',
      status: 'Active',
      participants: 45,
      completed: 32,
      startTime: '09:00 AM',
      endTime: '11:00 AM'
    },
    {
      id: 2,
      name: 'Physics Final',
      class: 'Class 12',
      type: 'Mixed',
      duration: '3 hours',
      status: 'Scheduled',
      participants: 38,
      completed: 0,
      startTime: '02:00 PM',
      endTime: '05:00 PM'
    }
  ]);

  const [offlineExams] = useState([
    {
      id: 1,
      name: 'Chemistry Practical',
      class: 'Class 11',
      hall: 'Lab A',
      duration: '2 hours',
      status: 'Completed',
      participants: 30,
      invigilators: ['Dr. Smith', 'Ms. Johnson'],
      startTime: '10:00 AM',
      endTime: '12:00 PM'
    },
    {
      id: 2,
      name: 'English Literature',
      class: 'Class 10',
      hall: 'Hall B',
      duration: '3 hours',
      status: 'In Progress',
      participants: 42,
      invigilators: ['Mr. Brown', 'Ms. Davis'],
      startTime: '09:00 AM',
      endTime: '12:00 PM'
    }
  ]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Active':
      case 'In Progress':
        return <Clock className="h-4 w-4" />;
      case 'Completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'Scheduled':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Active':
      case 'In Progress':
        return 'default';
      case 'Completed':
        return 'secondary';
      case 'Scheduled':
        return 'outline';
      default:
        return 'destructive';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Exam Workflows</h2>
        <p className="text-muted-foreground">Monitor and manage online and offline examination processes</p>
      </div>

      <Tabs defaultValue="online" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="online" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Online Exams
          </TabsTrigger>
          <TabsTrigger value="offline" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Offline Exams
          </TabsTrigger>
        </TabsList>

        <TabsContent value="online" className="space-y-4">
          <div className="grid gap-4">
            {onlineExams.map((exam) => (
              <Card key={exam.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {exam.name}
                        <Badge variant={getStatusVariant(exam.status)} className="flex items-center gap-1">
                          {getStatusIcon(exam.status)}
                          {exam.status}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        {exam.class} • {exam.type} • {exam.duration}
                      </CardDescription>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-medium">{exam.startTime} - {exam.endTime}</p>
                      <p className="text-muted-foreground">Today</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">{exam.participants}</p>
                        <p className="text-sm text-muted-foreground">Total Participants</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-success">{exam.completed}</p>
                        <p className="text-sm text-muted-foreground">Completed</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-warning">{exam.participants - exam.completed}</p>
                        <p className="text-sm text-muted-foreground">In Progress</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{Math.round((exam.completed / exam.participants) * 100)}%</p>
                        <p className="text-sm text-muted-foreground">Completion Rate</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{exam.completed}/{exam.participants}</span>
                      </div>
                      <Progress value={(exam.completed / exam.participants) * 100} className="h-2" />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm">
                        <Users className="h-4 w-4 mr-2" />
                        View Participants
                      </Button>
                      <Button variant="outline" size="sm">
                        <Monitor className="h-4 w-4 mr-2" />
                        Monitor Live
                      </Button>
                      {exam.status === 'Active' && (
                        <Button variant="destructive" size="sm">
                          End Exam
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="offline" className="space-y-4">
          <div className="grid gap-4">
            {offlineExams.map((exam) => (
              <Card key={exam.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {exam.name}
                        <Badge variant={getStatusVariant(exam.status)} className="flex items-center gap-1">
                          {getStatusIcon(exam.status)}
                          {exam.status}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        {exam.class} • {exam.hall} • {exam.duration}
                      </CardDescription>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-medium">{exam.startTime} - {exam.endTime}</p>
                      <p className="text-muted-foreground">Today</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">{exam.participants}</p>
                        <p className="text-sm text-muted-foreground">Total Students</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold">{exam.hall}</p>
                        <p className="text-sm text-muted-foreground">Examination Hall</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold">{exam.invigilators.length}</p>
                        <p className="text-sm text-muted-foreground">Invigilators</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">Invigilators:</p>
                      <div className="flex gap-2">
                        {exam.invigilators.map((invigilator, index) => (
                          <Badge key={index} variant="outline">
                            {invigilator}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm">
                        <Users className="h-4 w-4 mr-2" />
                        Attendance
                      </Button>
                      <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4 mr-2" />
                        Answer Sheets
                      </Button>
                      {exam.status === 'In Progress' && (
                        <Button size="sm">
                          Mark Complete
                        </Button>
                      )}
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
};