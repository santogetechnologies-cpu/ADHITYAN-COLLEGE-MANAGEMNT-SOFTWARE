import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  BookOpen, 
  Calendar as CalendarIcon, 
  Clock, 
  Users, 
  FileText,
  Upload,
  Plus,
  X
} from 'lucide-react';
import { format } from 'date-fns';

export default function CreateAssignment() {
  const [dueDate, setDueDate] = useState<Date>();
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<string[]>([]);
  const { toast } = useToast();

  const classes = [
    { id: '10a', name: 'Grade 10-A', subject: 'Mathematics' },
    { id: '10b', name: 'Grade 10-B', subject: 'Mathematics' },
    { id: '9b', name: 'Grade 9-B', subject: 'Mathematics' },
    { id: '11a', name: 'Grade 11-A', subject: 'Advanced Math' },
  ];

  const handleClassToggle = (classId: string) => {
    setSelectedClasses(prev => 
      prev.includes(classId) 
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  };

  const addAttachment = () => {
    setAttachments(prev => [...prev, `Attachment ${prev.length + 1}`]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Assignment Created",
      description: "Assignment has been successfully created and assigned to selected classes.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation showBackButton={true} backUrl="/dashboard" backLabel="Back to Dashboard" />
      <main className="container max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center space-x-2 mb-6">
          <BookOpen className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Create Assignment</h1>
        </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Assignment Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Assignment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Assignment Title</Label>
                  <Input 
                    id="title" 
                    placeholder="Enter assignment title"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mathematics">Mathematics</SelectItem>
                      <SelectItem value="physics">Physics</SelectItem>
                      <SelectItem value="chemistry">Chemistry</SelectItem>
                      <SelectItem value="english">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="type">Assignment Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="homework">Homework</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                      <SelectItem value="quiz">Quiz</SelectItem>
                      <SelectItem value="test">Test</SelectItem>
                      <SelectItem value="lab">Lab Work</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description" 
                    placeholder="Enter assignment description and instructions"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="totalMarks">Total Marks</Label>
                    <Input 
                      id="totalMarks" 
                      type="number" 
                      placeholder="100"
                    />
                  </div>
                  <div>
                    <Label htmlFor="weightage">Weightage (%)</Label>
                    <Input 
                      id="weightage" 
                      type="number" 
                      placeholder="10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Upload className="w-4 h-4" />
                  <span>Attachments</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {attachments.map((attachment, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded-lg">
                      <span className="text-sm">{attachment}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addAttachment}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Attachment
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CalendarIcon className="w-4 h-4" />
                  <span>Due Date & Time</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Due Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dueDate}
                        onSelect={setDueDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="dueTime">Due Time</Label>
                  <Input 
                    id="dueTime" 
                    type="time" 
                    defaultValue="23:59"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox id="allowLateSubmission" />
                  <Label htmlFor="allowLateSubmission" className="text-sm">
                    Allow late submissions
                  </Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>Assign to Classes</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {classes.map((cls) => (
                    <div key={cls.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={cls.id}
                        checked={selectedClasses.includes(cls.id)}
                        onCheckedChange={() => handleClassToggle(cls.id)}
                      />
                      <Label htmlFor={cls.id} className="flex-1 text-sm">
                        <div>{cls.name}</div>
                        <div className="text-xs text-muted-foreground">{cls.subject}</div>
                      </Label>
                    </div>
                  ))}
                </div>
                
                {selectedClasses.length > 0 && (
                  <>
                    <Separator className="my-3" />
                    <div>
                      <Label className="text-sm font-medium">Selected Classes:</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedClasses.map(classId => {
                          const cls = classes.find(c => c.id === classId);
                          return (
                            <Badge key={classId} variant="secondary" className="text-xs">
                              {cls?.name}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Submission Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox id="enablePlagiarism" />
                  <Label htmlFor="enablePlagiarism" className="text-sm">
                    Enable plagiarism check
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox id="autoGrade" />
                  <Label htmlFor="autoGrade" className="text-sm">
                    Auto-grade submissions
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox id="sendNotifications" defaultChecked />
                  <Label htmlFor="sendNotifications" className="text-sm">
                    Send notifications to students
                  </Label>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <Button variant="outline" type="button">
            Save as Draft
          </Button>
          <Button type="submit" className="min-w-32">
            Create Assignment
          </Button>
        </div>
      </form>
      </main>
    </div>
  );
}