import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Edit, Users, Clock, FileText, Settings, Download, Send } from 'lucide-react';

interface ExamDetailsDialogProps {
  children: React.ReactNode;
  examData?: {
    id: number;
    examName: string;
    class: string;
    subject: string;
    date: string;
    time: string;
    hall: string;
    status: string;
    totalStudents?: number;
    duration?: string;
  };
  mode: 'view' | 'edit';
}

export const ExamDetailsDialog = ({ children, examData, mode }: ExamDetailsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [editMode, setEditMode] = useState(mode === 'edit');

  // Mock data for students
  const [students] = useState([
    {
      id: 1,
      rollNo: 'ST001',
      name: 'John Smith',
      status: 'Enrolled',
      attendance: 'Present',
      hallTicket: 'Generated',
      seatNumber: 'A-01'
    },
    {
      id: 2,
      rollNo: 'ST002',
      name: 'Emma Johnson',
      status: 'Enrolled',
      attendance: 'Absent',
      hallTicket: 'Generated',
      seatNumber: 'A-02'
    },
    {
      id: 3,
      rollNo: 'ST003',
      name: 'Michael Brown',
      status: 'Enrolled',
      attendance: 'Present',
      hallTicket: 'Pending',
      seatNumber: 'A-03'
    }
  ]);

  const [examSettings, setExamSettings] = useState({
    allowLateEntry: false,
    lateEntryMinutes: 15,
    autoSubmit: true,
    showResults: false,
    negativeMarking: false,
    negativeMarks: 0.25,
    passingMarks: 40,
    instructions: `1. Read all questions carefully before answering.
2. Use only black or blue pen for writing.
3. Mobile phones are strictly prohibited.
4. Maintain absolute silence during the examination.
5. Any form of malpractice will result in disqualification.`
  });

  if (!examData) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {examData.examName} - {examData.subject}
          </DialogTitle>
          <DialogDescription>
            {examData.class} • {examData.date} • {examData.time}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Exam Details</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Examination Information</CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setEditMode(!editMode)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    {editMode ? 'View Mode' : 'Edit Mode'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Exam Name</Label>
                    {editMode ? (
                      <Input defaultValue={examData.examName} />
                    ) : (
                      <p className="font-medium">{examData.examName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    {editMode ? (
                      <Select defaultValue={examData.subject}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Mathematics">Mathematics</SelectItem>
                          <SelectItem value="Physics">Physics</SelectItem>
                          <SelectItem value="Chemistry">Chemistry</SelectItem>
                          <SelectItem value="Biology">Biology</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="font-medium">{examData.subject}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Class</Label>
                    {editMode ? (
                      <Select defaultValue={examData.class}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Class 9">Class 9</SelectItem>
                          <SelectItem value="Class 10">Class 10</SelectItem>
                          <SelectItem value="Class 11">Class 11</SelectItem>
                          <SelectItem value="Class 12">Class 12</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="font-medium">{examData.class}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    {editMode ? (
                      <Input type="date" defaultValue="2024-03-15" />
                    ) : (
                      <p className="font-medium">{examData.date}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Time</Label>
                    {editMode ? (
                      <Input defaultValue={examData.time} />
                    ) : (
                      <p className="font-medium">{examData.time}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Exam Hall</Label>
                    {editMode ? (
                      <Select defaultValue={examData.hall}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Hall A">Hall A</SelectItem>
                          <SelectItem value="Hall B">Hall B</SelectItem>
                          <SelectItem value="Hall C">Hall C</SelectItem>
                          <SelectItem value="Auditorium">Main Auditorium</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="font-medium">{examData.hall}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Duration</Label>
                    {editMode ? (
                      <Input defaultValue={examData.duration || "3 hours"} />
                    ) : (
                      <p className="font-medium">{examData.duration || "3 hours"}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant={examData.status === 'Confirmed' ? 'default' : 'secondary'}>
                      {examData.status}
                    </Badge>
                    {editMode && (
                      <Select defaultValue={examData.status}>
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Scheduled">Scheduled</SelectItem>
                          <SelectItem value="Confirmed">Confirmed</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                          <SelectItem value="Cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                {editMode && (
                  <div className="flex gap-2 pt-4">
                    <Button>Save Changes</Button>
                    <Button variant="outline" onClick={() => setEditMode(false)}>
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="students" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Enrolled Students ({students.length})
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Add Students
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export List
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Roll No</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Seat Number</TableHead>
                      <TableHead>Hall Ticket</TableHead>
                      <TableHead>Attendance</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.rollNo}</TableCell>
                        <TableCell>{student.name}</TableCell>
                        <TableCell>{student.seatNumber}</TableCell>
                        <TableCell>
                          <Badge variant={student.hallTicket === 'Generated' ? 'default' : 'secondary'}>
                            {student.hallTicket}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={student.attendance === 'Present' ? 'default' : 'destructive'}>
                            {student.attendance}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm">
                              Edit
                            </Button>
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Exam Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Allow Late Entry</Label>
                      <Switch 
                        checked={examSettings.allowLateEntry}
                        onCheckedChange={(checked) => 
                          setExamSettings({...examSettings, allowLateEntry: checked})
                        }
                      />
                    </div>
                    
                    {examSettings.allowLateEntry && (
                      <div className="space-y-2">
                        <Label>Late Entry Time (minutes)</Label>
                        <Input 
                          type="number" 
                          value={examSettings.lateEntryMinutes}
                          onChange={(e) => 
                            setExamSettings({...examSettings, lateEntryMinutes: parseInt(e.target.value)})
                          }
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <Label>Auto Submit</Label>
                      <Switch 
                        checked={examSettings.autoSubmit}
                        onCheckedChange={(checked) => 
                          setExamSettings({...examSettings, autoSubmit: checked})
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Show Results Immediately</Label>
                      <Switch 
                        checked={examSettings.showResults}
                        onCheckedChange={(checked) => 
                          setExamSettings({...examSettings, showResults: checked})
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Negative Marking</Label>
                      <Switch 
                        checked={examSettings.negativeMarking}
                        onCheckedChange={(checked) => 
                          setExamSettings({...examSettings, negativeMarking: checked})
                        }
                      />
                    </div>

                    {examSettings.negativeMarking && (
                      <div className="space-y-2">
                        <Label>Negative Marks per Wrong Answer</Label>
                        <Input 
                          type="number" 
                          step="0.25"
                          value={examSettings.negativeMarks}
                          onChange={(e) => 
                            setExamSettings({...examSettings, negativeMarks: parseFloat(e.target.value)})
                          }
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Passing Marks (%)</Label>
                      <Input 
                        type="number" 
                        value={examSettings.passingMarks}
                        onChange={(e) => 
                          setExamSettings({...examSettings, passingMarks: parseInt(e.target.value)})
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Exam Instructions</Label>
                  <Textarea 
                    rows={6}
                    value={examSettings.instructions}
                    onChange={(e) => 
                      setExamSettings({...examSettings, instructions: e.target.value})
                    }
                  />
                </div>

                <Button>Save Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Pre-Exam Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start">
                    <Users className="h-4 w-4 mr-2" />
                    Generate Hall Tickets
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Send className="h-4 w-4 mr-2" />
                    Send Notifications
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    Seat Arrangement
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Attendance Sheet
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Exam Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start">
                    <Clock className="h-4 w-4 mr-2" />
                    Start Exam
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Eye className="h-4 w-4 mr-2" />
                    Monitor Progress
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Users className="h-4 w-4 mr-2" />
                    Mark Attendance
                  </Button>
                  <Button className="w-full justify-start" variant="destructive">
                    <Clock className="h-4 w-4 mr-2" />
                    End Exam
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Post-Exam Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    Collect Answer Sheets
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export Results
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Send className="h-4 w-4 mr-2" />
                    Publish Results
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Reports & Analytics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    Exam Report
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Users className="h-4 w-4 mr-2" />
                    Student Performance
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Analytics Dashboard
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};