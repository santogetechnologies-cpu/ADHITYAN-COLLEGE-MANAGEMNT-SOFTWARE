import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Send, 
  Paperclip, 
  Loader2, 
  MessageCircle, 
  Clock, 
  CheckCheck, 
  FileText,
  User,
  GraduationCap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AttachmentDialog } from '@/components/shared/AttachmentDialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { storageService } from '@/services/supabase/storage';
import { db } from '@/services/supabase/database';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { TeacherMessage, Profile } from '@/types/database.types';
import { ROLE_CONFIGS } from '@/config/roles';

interface TeacherItem {
  id: string;
  name: string;
  subject: string;
}

const MessageTeacher = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachmentDialogOpen, setAttachmentDialogOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);

  // Parent & Child Context
  const [linkedChildren, setLinkedChildren] = useState<Profile[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');

  // Real Message History
  const [messageHistory, setMessageHistory] = useState<TeacherMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // 1. Load Linked Children if Parent
  useEffect(() => {
    async function loadParentContext() {
      if (!user?.id) return;
      if (user.role === 'parent') {
        const links = await db.getLinkedStudentsForParent(user.id);
        const children = links.map(l => l.student).filter(Boolean) as Profile[];
        setLinkedChildren(children);
        if (children.length > 0) {
          setSelectedChildId(children[0].id);
        }
      }
    }
    loadParentContext();
  }, [user?.id, user?.role]);

  // 2. Fetch Actual Teachers for Student / Child's Class
  const loadTeachers = useCallback(async () => {
    setLoadingTeachers(true);
    try {
      let targetClassName = user?.class_name;
      if (user?.role === 'parent' && selectedChildId) {
        const child = linkedChildren.find(c => c.id === selectedChildId);
        if (child) targetClassName = child.class_name;
      }

      const allProfiles = await db.getAllProfiles();
      const teacherProfiles = allProfiles.filter(p => p.role === 'teacher');

      let resolvedTeachers: TeacherItem[] = [];

      // If class is known, look up teachers mapped to class timetable slots
      if (targetClassName) {
        const slots = await db.getTimetables(targetClassName);
        const teacherMap = new Map<string, string>();
        slots.forEach(slot => {
          if (slot.teacher_id && slot.teacher_name) {
            teacherMap.set(slot.teacher_id, slot.subject || 'Faculty');
          }
        });

        resolvedTeachers = teacherProfiles.map(t => ({
          id: t.id,
          name: t.name,
          subject: teacherMap.get(t.id) || t.department || 'Academic Faculty',
        }));
      } else {
        resolvedTeachers = teacherProfiles.map(t => ({
          id: t.id,
          name: t.name,
          subject: t.department || 'Academic Faculty',
        }));
      }

      setTeachers(resolvedTeachers);
      if (resolvedTeachers.length > 0 && !selectedTeacherId) {
        setSelectedTeacherId(resolvedTeachers[0].id);
      }
    } catch (err) {
      console.warn('Failed to load teachers:', err);
      setTeachers([]);
    } finally {
      setLoadingTeachers(false);
    }
  }, [user, selectedChildId, linkedChildren, selectedTeacherId]);

  useEffect(() => {
    loadTeachers();
  }, [loadTeachers]);

  // 3. Load Real Message History & Replies
  const loadMessageHistory = useCallback(async () => {
    if (!user?.id) return;
    try {
      const messages = await db.getTeacherMessages(user.id);
      setMessageHistory(messages);
    } catch (err) {
      console.warn('Failed to load teacher messages history:', err);
      setMessageHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadMessageHistory();
  }, [loadMessageHistory]);

  // Real-time synchronization for new messages & replies
  useRealtimeSubscription({
    table: 'teacher_messages',
    onChange: loadMessageHistory,
    onReconnect: loadMessageHistory,
  });

  // Handle Send Message
  const handleSendMessage = async () => {
    if (!selectedTeacherId || !subject.trim() || !message.trim()) {
      toast({
        title: "Please complete all required fields",
        description: "Make sure you've selected a teacher and entered a subject and message.",
        variant: "destructive",
      });
      return;
    }

    const teacher = teachers.find(t => t.id === selectedTeacherId);
    if (!teacher || !user) return;

    setIsSending(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of attachedFiles) {
        const { url } = await storageService.uploadFile('attachments', user.id, file);
        if (url) uploadedUrls.push(url);
      }

      const activeChild = linkedChildren.find(c => c.id === selectedChildId);
      const childPrefix = activeChild ? `[Regarding ${activeChild.name} - ${activeChild.class_name || ''}] ` : '';

      const success = await db.sendMessageToTeacher({
        sender_id: user.id,
        sender_name: user.name,
        sender_email: user.email,
        teacher_id: teacher.id,
        teacher_name: teacher.name,
        subject: `${childPrefix}${subject.trim()}`,
        message: message.trim(),
        attachments: uploadedUrls,
      });

      if (!success) {
        throw new Error('Failed to deliver message via database.');
      }

      // Real-time notification dispatch to recipient
      await db.createNotification({
        user_id: teacher.id,
        title: `Message from ${user.name}: ${subject.trim()}`,
        message: `${message.trim().slice(0, 100)}`,
        type: 'info',
        priority: 'high',
        is_read: false
      });

      toast({
        title: "Message sent successfully",
        description: `Your message has been delivered to ${teacher.name}.`,
      });

      // Clear form
      setSubject('');
      setMessage('');
      setAttachedFiles([]);
      await loadMessageHistory();
    } catch (err: any) {
      toast({
        title: "Error Sending Message",
        description: err.message || "Could not send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleAttachmentsAdded = (files: File[]) => {
    setAttachedFiles(prev => [...prev, ...files]);
  };

  const handleBack = () => {
    if (window.history.state?.idx > 0) {
      navigate(-1);
    } else {
      const userHome = user ? (ROLE_CONFIGS[user.role]?.home || `/dashboard/${user.role}`) : '/';
      navigate(userHome, { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleBack}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Message Teacher</h1>
              <p className="text-xs text-muted-foreground">Direct faculty communication portal</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl space-y-8">
        {/* Child Selector for Parents with Multiple Children */}
        {user?.role === 'parent' && linkedChildren.length > 1 && (
          <Card className="border-secondary/40 shadow-sm">
            <CardContent className="pt-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <GraduationCap className="w-5 h-5 text-primary" />
                <Label className="font-semibold text-sm">Select Student for Inquiry:</Label>
              </div>
              <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                <SelectTrigger className="w-60">
                  <SelectValue placeholder="Choose Child" />
                </SelectTrigger>
                <SelectContent>
                  {linkedChildren.map(child => (
                    <SelectItem key={child.id} value={child.id}>
                      {child.name} ({child.class_name || 'Class'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* Compose Form */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Send Message to Teacher</CardTitle>
            <CardDescription>
              {user?.role === 'parent' 
                ? 'Send a secure direct message to your child’s instructors.' 
                : 'Send a message to your course faculty.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="teacher">Select Teacher</Label>
              {loadingTeachers ? (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground p-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading instructors...</span>
                </div>
              ) : teachers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No faculty profiles found.</p>
              ) : (
                <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                  <SelectTrigger id="teacher">
                    <SelectValue placeholder="Choose a teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.name} — {teacher.subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="Enter message subject (e.g., Academic progress inquiry, Absence notice)"
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
                  type="button"
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
              <Button onClick={handleSendMessage} className="flex-1" disabled={isSending || teachers.length === 0}>
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleBack} disabled={isSending}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Real Message History & Conversation Feed */}
        <Card className="shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                <CardTitle>Message History & Replies</CardTitle>
              </div>
              <Badge variant="outline">{messageHistory.length} Messages</Badge>
            </div>
            <CardDescription>
              Live correspondence between you and faculty members.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : messageHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No previous messages found. When you message a teacher or receive a reply, it will appear here in real time.
              </div>
            ) : (
              <div className="space-y-4">
                {messageHistory.map((msg) => {
                  const isSentByMe = msg.sender_id === user?.id;
                  return (
                    <div 
                      key={msg.id} 
                      className={`p-4 border rounded-lg space-y-2 transition-colors ${
                        isSentByMe ? 'bg-card' : 'bg-primary/5 border-primary/20'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-sm">
                              {isSentByMe ? `To: ${msg.teacher_name}` : `From: ${msg.sender_name}`}
                            </span>
                            <Badge variant={isSentByMe ? "outline" : "default"} className="text-xs">
                              {isSentByMe ? "Sent" : "Received Reply"}
                            </Badge>
                          </div>
                          <h4 className="font-medium text-sm text-foreground mt-1">{msg.subject}</h4>
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{msg.created_at ? new Date(msg.created_at).toLocaleString() : 'Recent'}</span>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{msg.message}</p>

                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="pt-2 flex flex-wrap gap-2">
                          {msg.attachments.map((url, i) => (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center text-xs bg-muted px-2.5 py-1 rounded hover:bg-muted/80 text-primary"
                            >
                              <FileText className="w-3 h-3 mr-1" />
                              Attachment {i + 1}
                            </a>
                          ))}
                        </div>
                      )}

                      <div className="flex justify-end pt-1">
                        <span className="text-[11px] text-muted-foreground flex items-center">
                          <CheckCheck className={`w-3.5 h-3.5 mr-1 ${msg.is_read ? 'text-primary' : 'text-muted-foreground'}`} />
                          {msg.is_read ? 'Read by recipient' : 'Delivered'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
