import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, Edit, Trash2, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { ExamDetailsDialog } from './ExamDetailsDialog';
import { HallTicketDialog } from './HallTicketDialog';

export const ExamScheduling = () => {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [newExamDialogOpen, setNewExamDialogOpen] = useState(false);
  const [examSchedules, setExamSchedules] = useState([
    {
      id: 1,
      examName: 'Mid Term Examination',
      class: 'Class 10',
      subject: 'Mathematics',
      date: '2024-03-15',
      time: '09:00 AM - 12:00 PM',
      hall: 'Hall A',
      status: 'Scheduled',
      duration: '3 hours',
      totalStudents: 45
    },
    {
      id: 2,
      examName: 'Final Examination',
      class: 'Class 12',
      subject: 'Physics',
      date: '2024-03-20',
      time: '02:00 PM - 05:00 PM',
      hall: 'Hall B',
      status: 'Confirmed',
      duration: '3 hours',
      totalStudents: 38
    }
  ]);

  const [newExam, setNewExam] = useState({
    examName: '',
    class: '',
    subject: '',
    hall: '',
    time: '',
    date: null as Date | null
  });

  const handleCreateExam = () => {
    if (!newExam.examName || !newExam.class || !newExam.subject || !newExam.date) {
      return;
    }

    const exam = {
      id: Date.now(),
      examName: newExam.examName,
      class: newExam.class,
      subject: newExam.subject,
      date: format(newExam.date, 'yyyy-MM-dd'),
      time: newExam.time || '09:00 AM - 12:00 PM',
      hall: newExam.hall || 'Hall A',
      status: 'Scheduled',
      duration: '3 hours',
      totalStudents: 0
    };

    setExamSchedules([...examSchedules, exam]);
    setNewExamDialogOpen(false);
    setNewExam({
      examName: '',
      class: '',
      subject: '',
      hall: '',
      time: '',
      date: null
    });
  };

  const deleteExam = (examId: number) => {
    setExamSchedules(examSchedules.filter(exam => exam.id !== examId));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Exam Scheduling</h2>
          <p className="text-muted-foreground">Schedule exams for different classes and departments</p>
        </div>
        <Dialog open={newExamDialogOpen} onOpenChange={setNewExamDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Schedule New Exam
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Schedule New Exam</DialogTitle>
              <DialogDescription>Create a new examination schedule</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="examName">Exam Name</Label>
                  <Input 
                    id="examName" 
                    placeholder="Mid Term Exam"
                    value={newExam.examName}
                    onChange={(e) => setNewExam({...newExam, examName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="class">Class</Label>
                  <Select value={newExam.class} onValueChange={(value) => setNewExam({...newExam, class: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Class 9">Class 9</SelectItem>
                      <SelectItem value="Class 10">Class 10</SelectItem>
                      <SelectItem value="Class 11">Class 11</SelectItem>
                      <SelectItem value="Class 12">Class 12</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Select value={newExam.subject} onValueChange={(value) => setNewExam({...newExam, subject: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mathematics">Mathematics</SelectItem>
                      <SelectItem value="Physics">Physics</SelectItem>
                      <SelectItem value="Chemistry">Chemistry</SelectItem>
                      <SelectItem value="Biology">Biology</SelectItem>
                      <SelectItem value="English">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hall">Exam Hall</Label>
                  <Select value={newExam.hall} onValueChange={(value) => setNewExam({...newExam, hall: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select hall" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Hall A">Hall A</SelectItem>
                      <SelectItem value="Hall B">Hall B</SelectItem>
                      <SelectItem value="Hall C">Hall C</SelectItem>
                      <SelectItem value="Main Auditorium">Main Auditorium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Exam Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !newExam.date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newExam.date ? format(newExam.date, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={newExam.date}
                        onSelect={(date) => setNewExam({...newExam, date})}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Time Slot</Label>
                  <Select value={newExam.time} onValueChange={(value) => setNewExam({...newExam, time: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="09:00 AM - 12:00 PM">09:00 AM - 12:00 PM</SelectItem>
                      <SelectItem value="02:00 PM - 05:00 PM">02:00 PM - 05:00 PM</SelectItem>
                      <SelectItem value="06:00 PM - 09:00 PM">06:00 PM - 09:00 PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button className="w-full" onClick={handleCreateExam}>
                Schedule Exam
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {examSchedules.map((exam) => (
          <Card key={exam.id}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-lg">{exam.examName}</h3>
                    <Badge variant={exam.status === 'Confirmed' ? 'default' : 'secondary'}>
                      {exam.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Class:</span>
                      <p className="font-medium">{exam.class}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Subject:</span>
                      <p className="font-medium">{exam.subject}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Date & Time:</span>
                      <p className="font-medium">{exam.date}</p>
                      <p className="text-xs text-muted-foreground">{exam.time}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Hall:</span>
                      <p className="font-medium">{exam.hall}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <ExamDetailsDialog examData={exam} mode="view">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </ExamDetailsDialog>
                  
                  <ExamDetailsDialog examData={exam} mode="edit">
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </ExamDetailsDialog>

                  <HallTicketDialog examData={exam}>
                    <Button variant="outline" size="sm">
                      Hall Tickets
                    </Button>
                  </HallTicketDialog>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => deleteExam(exam.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};