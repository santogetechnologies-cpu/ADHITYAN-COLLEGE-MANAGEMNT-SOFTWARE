import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Send, Eye, Download, Mail, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export const ResultPublishing = () => {
  const [publishDate, setPublishDate] = useState<Date>();
  const [examResults] = useState([
    {
      id: 1,
      examName: 'Mid Term Examination',
      class: 'Class 10',
      subject: 'Mathematics',
      totalStudents: 45,
      graded: 45,
      status: 'Ready to Publish',
      publishedDate: null
    },
    {
      id: 2,
      examName: 'Final Examination',
      class: 'Class 12',
      subject: 'Physics',
      totalStudents: 38,
      graded: 38,
      status: 'Published',
      publishedDate: '2024-03-10'
    }
  ]);

  const [studentResults] = useState([
    {
      id: 1,
      rollNo: 'ST001',
      name: 'John Smith',
      class: 'Class 10',
      subject: 'Mathematics',
      totalMarks: 100,
      obtainedMarks: 85,
      percentage: 85,
      grade: 'A',
      rank: 3,
      status: 'Passed'
    },
    {
      id: 2,
      rollNo: 'ST002',
      name: 'Emma Johnson',
      class: 'Class 10',
      subject: 'Mathematics',
      totalMarks: 100,
      obtainedMarks: 92,
      percentage: 92,
      grade: 'A+',
      rank: 1,
      status: 'Passed'
    },
    {
      id: 3,
      rollNo: 'ST003',
      name: 'Michael Brown',
      class: 'Class 10',
      subject: 'Mathematics',
      totalMarks: 100,
      obtainedMarks: 76,
      percentage: 76,
      grade: 'B+',
      rank: 8,
      status: 'Passed'
    }
  ]);

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+':
        return 'text-green-600 bg-green-50';
      case 'A':
        return 'text-blue-600 bg-blue-50';
      case 'B+':
        return 'text-yellow-600 bg-yellow-50';
      case 'B':
        return 'text-orange-600 bg-orange-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Result Publishing</h2>
        <p className="text-muted-foreground">Publish and manage examination results</p>
      </div>

      <Tabs defaultValue="publish" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="publish">Publish Results</TabsTrigger>
          <TabsTrigger value="view">View Results</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="publish" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Exam Results Ready for Publishing</CardTitle>
              <CardDescription>Review and publish completed examination results</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exam Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Graded</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {examResults.map((exam) => (
                    <TableRow key={exam.id}>
                      <TableCell className="font-medium">{exam.examName}</TableCell>
                      <TableCell>{exam.class}</TableCell>
                      <TableCell>{exam.subject}</TableCell>
                      <TableCell>{exam.totalStudents}</TableCell>
                      <TableCell>{exam.graded}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={exam.status === 'Published' ? 'default' : 'secondary'}
                        >
                          {exam.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {exam.status === 'Ready to Publish' ? (
                            <Button size="sm" className="flex items-center gap-1">
                              <Send className="h-3 w-3" />
                              Publish
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Publishing Settings</CardTitle>
              <CardDescription>Configure how and when results are published</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Publish Date & Time</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !publishDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {publishDate ? format(publishDate, "PPP") : <span>Select date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={publishDate}
                          onSelect={setPublishDate}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="publishTime">Time</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="09:00">09:00 AM</SelectItem>
                        <SelectItem value="12:00">12:00 PM</SelectItem>
                        <SelectItem value="15:00">03:00 PM</SelectItem>
                        <SelectItem value="17:00">05:00 PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="emailNotification">Email Notifications</Label>
                    <Switch id="emailNotification" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="smsNotification">SMS Notifications</Label>
                    <Switch id="smsNotification" />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="parentPortal">Parent Portal Access</Label>
                    <Switch id="parentPortal" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="studentPortal">Student Portal Access</Label>
                    <Switch id="studentPortal" defaultChecked />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button className="w-full">
                  Configure & Schedule Publishing
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="view" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-4">
              <Select>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="class-9">Class 9</SelectItem>
                  <SelectItem value="class-10">Class 10</SelectItem>
                  <SelectItem value="class-11">Class 11</SelectItem>
                  <SelectItem value="class-12">Class 12</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mathematics">Mathematics</SelectItem>
                  <SelectItem value="physics">Physics</SelectItem>
                  <SelectItem value="chemistry">Chemistry</SelectItem>
                  <SelectItem value="biology">Biology</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Results
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Student Results - Mathematics (Class 10)</CardTitle>
              <CardDescription>Published on March 10, 2024</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Roll No</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Obtained Marks</TableHead>
                    <TableHead>Total Marks</TableHead>
                    <TableHead>Percentage</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentResults.map((result) => (
                    <TableRow key={result.id}>
                      <TableCell className="font-bold">#{result.rank}</TableCell>
                      <TableCell>{result.rollNo}</TableCell>
                      <TableCell className="font-medium">{result.name}</TableCell>
                      <TableCell>{result.obtainedMarks}</TableCell>
                      <TableCell>{result.totalMarks}</TableCell>
                      <TableCell>{result.percentage}%</TableCell>
                      <TableCell>
                        <Badge className={getGradeColor(result.grade)}>
                          {result.grade}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={result.status === 'Passed' ? 'default' : 'destructive'}>
                          {result.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Management</CardTitle>
              <CardDescription>Send result notifications to students and parents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Email Notifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Recipients</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select recipients" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="students">Students Only</SelectItem>
                          <SelectItem value="parents">Parents Only</SelectItem>
                          <SelectItem value="both">Students & Parents</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button className="w-full">
                      Send Email Notifications
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      SMS Notifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Message Template</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select template" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="result-published">Result Published</SelectItem>
                          <SelectItem value="result-available">Result Available</SelectItem>
                          <SelectItem value="custom">Custom Message</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button className="w-full">
                      Send SMS Notifications
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Notification History</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Recipients</TableHead>
                        <TableHead>Subject/Message</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>Mar 10, 2024</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>45 Students, 45 Parents</TableCell>
                        <TableCell>Mathematics Results Published</TableCell>
                        <TableCell>
                          <Badge variant="default">Sent</Badge>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Mar 08, 2024</TableCell>
                        <TableCell>SMS</TableCell>
                        <TableCell>45 Parents</TableCell>
                        <TableCell>Results available on portal</TableCell>
                        <TableCell>
                          <Badge variant="default">Sent</Badge>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};