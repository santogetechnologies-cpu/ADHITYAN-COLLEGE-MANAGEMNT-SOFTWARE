import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AttachmentDialog } from '@/components/shared/AttachmentDialog';
import { useToast } from '@/hooks/use-toast';

const MessageTeacher = () => {
  const navigate = useNavigate();
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachmentDialogOpen, setAttachmentDialogOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const { toast } = useToast();

  const teachers = [
    { id: '1', name: 'Mrs. Sarah Johnson', subject: 'Mathematics' },
    { id: '2', name: 'Mr. David Chen', subject: 'Science' },
    { id: '3', name: 'Ms. Emily Rodriguez', subject: 'English' },
    { id: '4', name: 'Mr. Michael Brown', subject: 'History' },
  ];

  const handleSendMessage = () => {
    if (selectedTeacher && subject && message) {
      // Handle message sending logic here
      // console.log('Message sent to:', selectedTeacher, 'Subject:', subject, 'Message:', message, 'Attachments:', attachedFiles);
      
      toast({
        title: "Message sent successfully",
        description: "Your message has been sent to the teacher.",
      });
      
      navigate('/dashboard');
    } else {
      toast({
        title: "Please complete all required fields",
        description: "Make sure you've selected a teacher and entered a subject and message.",
        variant: "destructive",
      });
    }
  };

  const handleAttachmentsAdded = (files: File[]) => {
    setAttachedFiles(prev => [...prev, ...files]);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/dashboard')}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Message Teacher</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Send Message to Teacher</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="teacher">Select Teacher</Label>
              <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.name} - {teacher.subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="Enter message subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Type your message here..."
                className="min-h-[120px]"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setAttachmentDialogOpen(true)}
                >
                  <Paperclip className="h-4 w-4 mr-2" />
                  Attach File ({attachedFiles.length})
                </Button>
              </div>
              
              {attachedFiles.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  {attachedFiles.length} file(s) attached: {attachedFiles.map(f => f.name).join(', ')}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleSendMessage} className="flex-1">
                <Send className="h-4 w-4 mr-2" />
                Send Message
              </Button>
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                Cancel
              </Button>
            </div>
          </CardContent>
          </Card>
        </main>

        <AttachmentDialog
          open={attachmentDialogOpen}
          onOpenChange={setAttachmentDialogOpen}
          onAttachmentsAdded={handleAttachmentsAdded}
          title="Attach Files"
          description="Upload files to attach to your message"
          acceptedTypes={['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.txt']}
          maxFiles={5}
          maxSizePerFile={10}
        />
      </div>
    );
  };

export default MessageTeacher;