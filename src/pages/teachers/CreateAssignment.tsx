import { useState, useEffect } from 'react';
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
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/supabase/database';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Calendar as CalendarIcon, 
  Clock, 
  Users, 
  FileText,
  Upload,
  Plus,
  X,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { FileUpload } from '@/components/ui/file-upload';
import { askConfirm, askText } from '@/lib/dialogs';

export default function CreateAssignment() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Dialysis Principles');
  const [assignmentType, setAssignmentType] = useState<'assignment' | 'homework' | 'project'>('homework');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<Date>(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000));
  const [dueTime, setDueTime] = useState('23:59');
  const [selectedClasses, setSelectedClasses] = useState<string[]>(['dt-sem1', 'sem-1']);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const [availableClasses, setAvailableClasses] = useState<{ id: string; name: string; subject: string }[]>([]);

  const handleBack = () => {
    if (window.history.state?.idx > 0) {
      navigate(-1);
    } else {
      navigate('/dashboard/teacher', { replace: true });
    }
  };

  useEffect(() => {
    async function loadDynamicClasses() {
      if (!user?.id) return;
      try {
        const assignmentData = await db.getTeacherAssignedClassesAndSubjects(user.id, user.name);
        const classList = assignmentData.assignedClasses;

        if (classList.length > 0) {
          const mapped = classList.map((c, i) => ({
            id: `cls-${i}`,
            name: c,
            subject: assignmentData.assignedSubjects[0] || user.department || 'Curriculum',
          }));
          setAvailableClasses(mapped);
          setSelectedClasses([mapped[0].id]);
          if (assignmentData.assignedSubjects.length > 0) {
            setSubject(assignmentData.assignedSubjects[0]);
          }
        } else {
          setAvailableClasses([]);
          setSelectedClasses([]);
        }
      } catch (err) {
        console.warn('Load dynamic classes notice:', err);
      }
    }
    loadDynamicClasses();
  }, [user]);

  const handleClassToggle = (classId: string) => {
    setSelectedClasses(prev => 
      prev.includes(classId) 
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  };

  const addAttachment = async () => {
    const name = await askText('Enter the attachment title or link', { title: 'Add attachment', required: true, confirmLabel: 'Add' });
    if (name) {
      setAttachments(prev => [...prev, name]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter an assignment title.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedClassNames = selectedClasses.map(id => availableClasses.find(c => c.id === id)?.name || id);
      
      const dueDateTime = dueDate ? new Date(dueDate) : new Date();
      const [hours, minutes] = dueTime.split(':').map(Number);
      if (!isNaN(hours) && !isNaN(minutes)) {
        dueDateTime.setHours(hours, minutes, 0, 0);
      }

      await db.createAssignment({
        title: title.trim(),
        subject: subject.charAt(0).toUpperCase() + subject.slice(1),
        description: description.trim(),
        type: assignmentType,
        priority: 'high',
        due_date: dueDateTime.toISOString(),
        classes: selectedClassNames,
        teacher_id: user?.id,
        teacher_name: user?.name || 'Faculty Member',
        attachments,
      });

      // Dispatch real-time notifications to enrolled students
      try {
        const students = (await db.getAllProfiles()).filter(p => p.role === 'student');
        const relevantStudents = students.filter(s => s.class_name && selectedClassNames.includes(s.class_name));
        for (const stu of (relevantStudents.length > 0 ? relevantStudents : students.slice(0, 10))) {
          await db.createNotification({
            user_id: stu.id,
            title: `New Assignment: ${title.trim()}`,
            message: `${subject.toUpperCase()} assignment due on ${dueDateTime.toLocaleDateString()}`,
            type: 'info',
            priority: 'high',
            is_read: false
          });
        }
      } catch (nErr) {
        console.warn('Realtime student notification fallback:', nErr);
      }

      toast({
        title: "Assignment Created",
        description: "Assignment has been successfully saved to Supabase and assigned to selected classes.",
      });

      handleBack();
    } catch (err) {
      toast({
        title: "Creation Failed",
        description: "Could not create assignment in Supabase.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
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
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Select value={subject} onValueChange={setSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Dialysis Principles">Dialysis Principles & Clinical Techniques</SelectItem>
                      <SelectItem value="Clinical Pathology">Clinical Pathology & Hematology</SelectItem>
                      <SelectItem value="Medical Imaging">Radiography & Medical Imaging</SelectItem>
                      <SelectItem value="Cardiac Physiology">Cardiac Anatomy & Physiology</SelectItem>
                      <SelectItem value="OT Procedures">Operation Theatre Techniques & Sterilization</SelectItem>
                      <SelectItem value="Healthcare Systems">Hospital Systems & Quality Management</SelectItem>
                      <SelectItem value="Clinical Biochemistry">Clinical Biochemistry</SelectItem>
                      <SelectItem value="Microbiology">Medical Microbiology & Immunology</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="type">Assignment Type</Label>
                  <Select value={assignmentType} onValueChange={(val: any) => setAssignmentType(val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="homework">Homework</SelectItem>
                      <SelectItem value="assignment">Assignment</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description" 
                    placeholder="Enter assignment description and instructions"
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
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
              <CardContent className="space-y-4">
                <FileUpload
                  bucket="attachments"
                  folder="assignments"
                  autoUpload={true}
                  maxFiles={3}
                  onUploadComplete={(items) => {
                    const urls = items.map(i => i.publicUrl);
                    setAttachments(prev => Array.from(new Set([...prev, ...urls])));
                  }}
                />
                {attachments.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <Label className="text-xs font-semibold">Attached Files & Links</Label>
                    <div className="space-y-2">
                      {attachments.map((attachment, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded-lg text-xs bg-muted/30">
                          <span className="truncate max-w-[280px]">{attachment}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => removeAttachment(index)}
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                        onSelect={(date) => date && setDueDate(date)}
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
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
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
                  {availableClasses.map((cls) => (
                    <div key={cls.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={cls.id}
                        checked={selectedClasses.includes(cls.id)}
                        onCheckedChange={() => handleClassToggle(cls.id)}
                      />
                      <Label htmlFor={cls.id} className="flex-1 text-sm cursor-pointer">
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
                          const cls = availableClasses.find(c => c.id === classId);
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
          <Button variant="outline" type="button" onClick={handleBack}>
            Cancel
          </Button>
          <Button type="submit" className="min-w-32" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Assignment'
            )}
          </Button>
        </div>
      </form>
      </main>
    </div>
  );
}
