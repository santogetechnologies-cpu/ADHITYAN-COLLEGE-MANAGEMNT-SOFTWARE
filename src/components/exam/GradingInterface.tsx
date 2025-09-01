import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, Clock, FileText, Save, Send } from 'lucide-react';

export const GradingInterface = () => {
  const [mcqExams] = useState([
    {
      id: 1,
      name: 'Mathematics MCQ Test',
      class: 'Class 10',
      totalQuestions: 50,
      submissions: 45,
      graded: 45,
      status: 'Auto Graded'
    },
    {
      id: 2,
      name: 'Physics Multiple Choice',
      class: 'Class 12',
      totalQuestions: 40,
      submissions: 38,
      graded: 38,
      status: 'Auto Graded'
    }
  ]);

  const [subjectiveExams] = useState([
    {
      id: 1,
      name: 'English Essay Writing',
      class: 'Class 11',
      totalStudents: 42,
      submissions: 40,
      graded: 15,
      pending: 25,
      status: 'In Progress'
    },
    {
      id: 2,
      name: 'Chemistry Descriptive',
      class: 'Class 12',
      totalStudents: 35,
      submissions: 35,
      graded: 35,
      pending: 0,
      status: 'Completed'
    }
  ]);

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentAnswers] = useState([
    {
      id: 1,
      studentName: 'John Smith',
      rollNo: 'ST001',
      question: 'Explain the process of photosynthesis and its importance in the ecosystem.',
      answer: 'Photosynthesis is the process by which green plants and some other organisms use sunlight to synthesize foods with the aid of chlorophyll. During photosynthesis, plants take in carbon dioxide from the air and water from the soil...',
      maxMarks: 10,
      givenMarks: null,
      feedback: '',
      status: 'Pending'
    },
    {
      id: 2,
      studentName: 'Emma Johnson',
      rollNo: 'ST002',
      question: 'Explain the process of photosynthesis and its importance in the ecosystem.',
      answer: 'Photosynthesis is a vital biological process where plants convert light energy into chemical energy. This process involves two main stages: light-dependent reactions and light-independent reactions (Calvin cycle)...',
      maxMarks: 10,
      givenMarks: 8,
      feedback: 'Good explanation but could include more details about the Calvin cycle.',
      status: 'Graded'
    }
  ]);

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
            MCQ (Auto Grading)
          </TabsTrigger>
          <TabsTrigger value="subjective" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Subjective (Manual Grading)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mcq" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>MCQ Exams - Auto Grading</CardTitle>
              <CardDescription>Automatically graded multiple choice examinations</CardDescription>
            </CardHeader>
            <CardContent>
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
                  {mcqExams.map((exam) => (
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
                        <Badge variant="default">
                          {exam.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          View Results
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subjective" className="space-y-4">
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
                        <p className="text-2xl font-bold text-success">{exam.graded}</p>
                        <p className="text-sm text-muted-foreground">Graded</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-warning">{exam.pending}</p>
                        <p className="text-sm text-muted-foreground">Pending</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Grading Progress</span>
                        <span>{exam.graded}/{exam.submissions}</span>
                      </div>
                      <Progress value={(exam.graded / exam.submissions) * 100} className="h-2" />
                    </div>

                    <div className="flex gap-2">
                      <Button className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Continue Grading
                      </Button>
                      <Button variant="outline">
                        View Progress
                      </Button>
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
              <CardDescription>Grade subjective answers with feedback</CardDescription>
            </CardHeader>
            <CardContent>
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
                      <Button size="sm" className="flex items-center gap-1">
                        <Save className="h-3 w-3" />
                        Save
                      </Button>
                      <Button variant="outline" size="sm" className="flex items-center gap-1">
                        <Send className="h-3 w-3" />
                        Save & Next
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};