import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ClassSubject {
  class: string;
  subjects: { name: string; teacher: string }[];
}

interface FeedbackForm {
  id: string;
  class: string;
  subject: string;
  teacher: string;
  message: string;
  timestamp: Date;
}

export function FeedbackSystem() {
  const { toast } = useToast();
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');

  // Mock data - in real app, this would come from API
  const classSubjects: ClassSubject[] = [
    {
      class: 'Class 9A',
      subjects: [
        { name: 'Mathematics', teacher: 'Mr. Sharma' },
        { name: 'Physics', teacher: 'Ms. Patel' },
        { name: 'Chemistry', teacher: 'Dr. Kumar' },
        { name: 'English', teacher: 'Mrs. Singh' }
      ]
    },
    {
      class: 'Class 9B',
      subjects: [
        { name: 'Mathematics', teacher: 'Mr. Gupta' },
        { name: 'Physics', teacher: 'Ms. Patel' },
        { name: 'Biology', teacher: 'Dr. Mehta' },
        { name: 'English', teacher: 'Mrs. Singh' }
      ]
    },
    {
      class: 'Class 10A',
      subjects: [
        { name: 'Mathematics', teacher: 'Mr. Sharma' },
        { name: 'Physics', teacher: 'Dr. Verma' },
        { name: 'Chemistry', teacher: 'Dr. Kumar' },
        { name: 'Social Science', teacher: 'Ms. Joshi' }
      ]
    }
  ];

  const selectedClassData = classSubjects.find(cs => cs.class === selectedClass);
  const selectedSubjectData = selectedClassData?.subjects.find(s => s.name === selectedSubject);

  const handleSendFeedback = () => {
    if (!selectedClass || !selectedSubject || !feedbackMessage.trim()) {
      toast({
        title: "Incomplete Form",
        description: "Please select class, subject and enter feedback message.",
        variant: "destructive"
      });
      return;
    }

    const feedbackForm: FeedbackForm = {
      id: Date.now().toString(),
      class: selectedClass,
      subject: selectedSubject,
      teacher: selectedSubjectData!.teacher,
      message: feedbackMessage,
      timestamp: new Date()
    };

    // Save to localStorage to be picked up by mentor chat
    const existingFeedback = JSON.parse(localStorage.getItem('feedbackForms') || '[]');
    localStorage.setItem('feedbackForms', JSON.stringify([...existingFeedback, feedbackForm]));

    toast({
      title: "Feedback Sent",
      description: `Feedback sent to ${selectedSubjectData!.teacher} for ${selectedSubject} in ${selectedClass}`,
    });

    // Reset form
    setSelectedClass('');
    setSelectedSubject('');
    setFeedbackMessage('');
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <CardTitle>Class Feedback System</CardTitle>
        </div>
        <CardDescription>
          Send feedback forms to teachers through mentor chat
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Select Class</Label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a class" />
              </SelectTrigger>
              <SelectContent>
                {classSubjects.map((cs) => (
                  <SelectItem key={cs.class} value={cs.class}>
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4" />
                      <span>{cs.class}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedClassData && (
            <div className="space-y-2">
              <Label>Select Subject & Teacher</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose subject" />
                </SelectTrigger>
                <SelectContent>
                  {selectedClassData.subjects.map((subject) => (
                    <SelectItem key={subject.name} value={subject.name}>
                      <div className="flex flex-col">
                        <span className="font-medium">{subject.name}</span>
                        <span className="text-sm text-muted-foreground">{subject.teacher}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedSubjectData && (
            <div className="bg-muted p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{selectedClass} - {selectedSubject}</p>
                  <p className="text-sm text-muted-foreground">Teacher: {selectedSubjectData.teacher}</p>
                </div>
                <Badge variant="secondary">Selected</Badge>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="feedback">Feedback Message</Label>
            <Textarea
              id="feedback"
              placeholder="Enter your feedback message that will be sent to the teacher through mentor chat..."
              value={feedbackMessage}
              onChange={(e) => setFeedbackMessage(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <Button 
          onClick={handleSendFeedback}
          className="w-full"
          disabled={!selectedClass || !selectedSubject || !feedbackMessage.trim()}
        >
          <Send className="w-4 h-4 mr-2" />
          Send Feedback to Mentor Chat
        </Button>

        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <p className="font-medium">How it works:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Select the class and subject</li>
            <li>Write your feedback message</li>
            <li>The feedback form will appear in the teacher's mentor chat</li>
            <li>Teacher can fill and respond to the feedback</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}