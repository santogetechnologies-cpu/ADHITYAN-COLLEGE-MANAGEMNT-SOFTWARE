import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, Clock, FileText, Save, Send, Loader2, AlertCircle } from 'lucide-react';
import { db } from '@/services/supabase/database';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useToast } from '@/hooks/use-toast';

interface GradingExam {
  id: string | number;
  name: string;
  class: string;
  totalQuestions?: number;
  totalStudents?: number;
  submissions: number;
  graded: number;
  pending?: number;
  status: string;
}

interface StudentAnswerItem {
  id: string | number;
  studentName: string;
  rollNo: string;
  question: string;
  answer: string;
  maxMarks: number;
  givenMarks: number | null;
  feedback: string;
  status: 'Pending' | 'Graded';
}

export const GradingInterface = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [mcqExams, setMcqExams] = useState<GradingExam[]>([]);
  const [subjectiveExams, setSubjectiveExams] = useState<GradingExam[]>([]);
  const [studentAnswers, setStudentAnswers] = useState<StudentAnswerItem[]>([]);

  const loadGradingData = useCallback(async () => {
    try {
      setLoading(true);
      const [schedules, results] = await Promise.all([
        db.getExamSchedules(),
        db.getExamResults()
      ]);

      if (schedules && schedules.length > 0) {
        const mcqList: GradingExam[] = [];
        const subjList: GradingExam[] = [];

        schedules.forEach((s: any, idx: number) => {
          const isMcq = (s.subject || '').toLowerCase().includes('mcq') || (s.room || '').toLowerCase().includes('lab');
          const submissions = results ? results.filter((r: any) => r.exam_schedule_id === s.id).length : 0;
          const gradedCount = results ? results.filter((r: any) => r.exam_schedule_id === s.id && r.marks_obtained !== null).length : 0;

          const examItem: GradingExam = {
            id: s.id,
            name: s.subject ? `${s.subject} Evaluation` : 'Term Evaluation',
            class: s.class_name || 'Allied Health Sciences',
            totalQuestions: 50,
            totalStudents: submissions,
            submissions: submissions,
            graded: gradedCount,
            pending: Math.max(0, submissions - gradedCount),
            status: gradedCount === submissions && submissions > 0 ? 'Completed' : 'Pending Evaluation'
          };

          if (isMcq) {
            mcqList.push(examItem);
          } else {
            subjList.push(examItem);
          }
        });

        setMcqExams(mcqList);
        setSubjectiveExams(subjList);
      } else {
        setMcqExams([]);
        setSubjectiveExams([]);
      }

      if (results && results.length > 0) {
        setStudentAnswers(results.map((r: any) => ({
          id: r.id,
          studentName: r.student_name || 'Enrolled Student',
          rollNo: r.roll_number || 'ST' + String(r.id).slice(0, 4),
          question: `Clinical Assessment for ${r.subject || 'Allied Health Practice'}`,
          answer: r.remarks || 'Clinical case study submission received.',
          maxMarks: r.total_marks || 100,
          givenMarks: r.marks_obtained,
          feedback: r.remarks || '',
          status: r.marks_obtained !== null ? 'Graded' : 'Pending'
        })));
      } else {
        setStudentAnswers([]);
      }
    } catch (err) {
      console.warn('Failed to load grading data:', err);
      setMcqExams([]);
      setSubjectiveExams([]);
      setStudentAnswers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGradingData();
  }, [loadGradingData]);

  useRealtimeSubscription({ table: 'exam_results', onChange: loadGradingData, onReconnect: loadGradingData });
  useRealtimeSubscription({ table: 'exam_schedules', onChange: loadGradingData, onReconnect: loadGradingData });

  const handleSaveGrade = async (answerId: string | number, marks: number, feedback: string) => {
    try {
      await db.updateExamResult(String(answerId), {
        marks_obtained: marks,
        remarks: feedback
      });
      toast({
        title: "Grade Saved",
        description: "Student examination mark and feedback updated in live database."
      });
      loadGradingData();
    } catch (err: any) {
      toast({
        title: "Save Failed",
        description: err.message || "Failed to update examination mark.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Grading Interface</h2>
        <p className="text-muted-foreground">Auto grading for MCQ and manual grading for subjective exams</p>
      </div>

      <Tabs defaultValue="mcq" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="mcq" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            MCQ (Auto Grading) ({mcqExams.length})
          </TabsTrigger>
          <TabsTrigger value="subjective" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Subjective (Manual Grading) ({subjectiveExams.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mcq" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>MCQ Exams - Auto Grading</CardTitle>
              <CardDescription>Automatically graded multiple choice examinations</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Exam Name</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Questions</TableHead>
                      <TableHead>Submissions</TableHead>
                      <TableHead>Graded</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mcqExams.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                          <CheckCircle className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                          <p className="font-semibold text-foreground/80">No MCQ Exams Found</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Auto-graded MCQ examinations will appear here once scheduled.
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      mcqExams.map((exam) => (
                        <TableRow key={exam.id}>
                          <TableCell className="font-medium">{exam.name}</TableCell>
                          <TableCell>{exam.class}</TableCell>
                          <TableCell>{exam.totalQuestions}</TableCell>
                          <TableCell>{exam.submissions}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {exam.graded}
                              <CheckCircle className="h-4 w-4 text-success" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={exam.status === 'Completed' ? 'default' : 'secondary'}>
                              {exam.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm">
                              View Results
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subjective" className="space-y-4">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : subjectiveExams.length === 0 && studentAnswers.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground border rounded-lg">
              <FileText className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-base font-semibold text-foreground/80">No Subjective Exams Awaiting Grading</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Descriptive answer sheets and student case study submissions will appear here for faculty review.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-4">
                {subjectiveExams.map((exam) => (
                  <Card key={exam.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>{exam.name}</CardTitle>
                          <CardDescription>{exam.class}</CardDescription>
                        </div>
                        <Badge variant={exam.status === 'Completed' ? 'default' : 'secondary'}>
                          {exam.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-primary">{exam.totalStudents}</p>
                            <p className="text-sm text-muted-foreground">Total Students</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-success">{exam.submissions}</p>
                            <p className="text-sm text-muted-foreground">Submissions</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-emerald-600">{exam.graded}</p>
                            <p className="text-sm text-muted-foreground">Graded</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-amber-600">{exam.pending}</p>
                            <p className="text-sm text-muted-foreground">Pending</p>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Grading Progress</span>
                            <span>{exam.graded}/{exam.submissions}</span>
                          </div>
                          <Progress 
                            value={exam.submissions > 0 ? (exam.graded / exam.submissions) * 100 : 0} 
                            className="h-2" 
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Grading Interface */}
              <Card>
                <CardHeader>
                  <CardTitle>Manual Grading Interface</CardTitle>
                  <CardDescription>Grade subjective answers with real-time feedback</CardDescription>
                </CardHeader>
                <CardContent>
                  {studentAnswers.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      <p>No student answer sheets pending manual marks.</p>
                    </div>
                  ) : (
                    <div className="grid gap-6">
                      {studentAnswers.map((answer) => (
                        <div key={answer.id} className="border rounded-lg p-4 space-y-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-semibold">{answer.studentName}</h4>
                              <p className="text-sm text-muted-foreground">Roll No: {answer.rollNo}</p>
                            </div>
                            <Badge variant={answer.status === 'Graded' ? 'default' : 'secondary'}>
                              {answer.status}
                            </Badge>
                          </div>

                          <div className="space-y-2">
                            <Label className="font-medium">Question:</Label>
                            <p className="text-sm bg-muted p-3 rounded">{answer.question}</p>
                          </div>

                          <div className="space-y-2">
                            <Label className="font-medium">Student Answer:</Label>
                            <div className="bg-background border rounded p-3 max-h-40 overflow-y-auto">
                              <p className="text-sm">{answer.answer}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor={`marks-${answer.id}`}>
                                Marks (Max: {answer.maxMarks})
                              </Label>
                              <Input
                                id={`marks-${answer.id}`}
                                type="number"
                                max={answer.maxMarks}
                                defaultValue={answer.givenMarks || ''}
                                placeholder="Enter marks"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`feedback-${answer.id}`}>Feedback</Label>
                              <Textarea
                                id={`feedback-${answer.id}`}
                                defaultValue={answer.feedback}
                                placeholder="Provide feedback to student"
                                rows={2}
                              />
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              className="flex items-center gap-1"
                              onClick={() => {
                                const markInput = document.getElementById(`marks-${answer.id}`) as HTMLInputElement;
                                const fbInput = document.getElementById(`feedback-${answer.id}`) as HTMLTextAreaElement;
                                handleSaveGrade(answer.id, Number(markInput?.value || 0), fbInput?.value || '');
                              }}
                            >
                              <Save className="h-3 w-3" />
                              Save Grade
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
