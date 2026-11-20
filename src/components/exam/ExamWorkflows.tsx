import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Monitor, FileText, CheckCircle, Clock, AlertCircle, Users, Calendar, Loader2 } from 'lucide-react';
import { db } from '@/services/supabase/database';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

interface ExamWorkflowItem {
  id: string | number;
  name: string;
  class: string;
  type: string;
  duration: string;
  status: string;
  participants: number;
  completed: number;
  startTime: string;
  endTime: string;
  hall?: string;
  invigilators?: string[];
}

export const ExamWorkflows = () => {
  const [loading, setLoading] = useState(true);
  const [onlineExams, setOnlineExams] = useState<ExamWorkflowItem[]>([]);
  const [offlineExams, setOfflineExams] = useState<ExamWorkflowItem[]>([]);

  const loadWorkflowData = useCallback(async () => {
    try {
      setLoading(true);
      const [schedules, profiles] = await Promise.all([
        db.getExamSchedules(),
        db.getAllProfiles()
      ]);

      const studentCount = (profiles || []).filter(p => p.role === 'student').length;

      if (schedules && schedules.length > 0) {
        const onlineList: ExamWorkflowItem[] = [];
        const offlineList: ExamWorkflowItem[] = [];

        schedules.forEach((s: any, idx: number) => {
          const isOnline = (s.room || '').toLowerCase().includes('online') || (s.subject || '').toLowerCase().includes('quiz') || (idx % 2 === 0 && (s.room || '').toLowerCase().includes('lab'));
          const item: ExamWorkflowItem = {
            id: s.id,
            name: s.subject ? `${s.subject} Examination` : 'Paramedical Term Exam',
            class: s.class_name || 'Allied Health Sciences',
            type: isOnline ? 'MCQ & Clinical Cases' : 'Practical / Theory',
            duration: '3 hours',
            status: s.status || 'Scheduled',
            participants: studentCount > 0 ? studentCount : 0,
            completed: 0,
            startTime: s.start_time || '09:00 AM',
            endTime: s.end_time || '12:00 PM',
            hall: s.room || 'Main Examination Hall',
            invigilators: ['Faculty Invigilator']
          };

          if (isOnline) {
            onlineList.push(item);
          } else {
            offlineList.push(item);
          }
        });

        setOnlineExams(onlineList);
        setOfflineExams(offlineList);
      } else {
        setOnlineExams([]);
        setOfflineExams([]);
      }
    } catch (err) {
      console.warn('Failed to load exam workflow data:', err);
      setOnlineExams([]);
      setOfflineExams([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkflowData();
  }, [loadWorkflowData]);

  useRealtimeSubscription({ table: 'exam_schedules', onChange: loadWorkflowData, onReconnect: loadWorkflowData });

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
            Online Exams ({onlineExams.length})
          </TabsTrigger>
          <TabsTrigger value="offline" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Offline Exams ({offlineExams.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="online" className="space-y-4">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : onlineExams.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground border rounded-lg">
              <Monitor className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-base font-semibold text-foreground/80">No Online Exams Scheduled</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Scheduled computer-based and digital exams will appear here with live participant tracking.
              </p>
            </div>
          ) : (
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
                          <p className="text-2xl font-bold text-emerald-600">{exam.completed}</p>
                          <p className="text-sm text-muted-foreground">Completed</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-amber-600">{Math.max(0, exam.participants - exam.completed)}</p>
                          <p className="text-sm text-muted-foreground">In Progress</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold">
                            {exam.participants > 0 ? Math.round((exam.completed / exam.participants) * 100) : 0}%
                          </p>
                          <p className="text-sm text-muted-foreground">Completion Rate</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{exam.completed}/{exam.participants}</span>
                        </div>
                        <Progress 
                          value={exam.participants > 0 ? (exam.completed / exam.participants) * 100 : 0} 
                          className="h-2" 
                        />
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
          )}
        </TabsContent>

        <TabsContent value="offline" className="space-y-4">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : offlineExams.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground border rounded-lg">
              <FileText className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-base font-semibold text-foreground/80">No Offline Exams Scheduled</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Physical examination hall schedules and invigilator rosters will appear here.
              </p>
            </div>
          ) : (
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
                          <p className="text-lg font-bold">{exam.invigilators?.length || 0}</p>
                          <p className="text-sm text-muted-foreground">Invigilators</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium">Invigilators:</p>
                        <div className="flex gap-2">
                          {(exam.invigilators || []).map((invigilator, index) => (
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
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
