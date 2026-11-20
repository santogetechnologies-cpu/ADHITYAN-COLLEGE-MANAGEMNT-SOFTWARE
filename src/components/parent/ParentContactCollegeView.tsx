import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Phone, 
  Mail, 
  Building2, 
  Send, 
  CheckCircle2, 
  MessageSquare, 
  Clock, 
  User, 
  Loader2,
  Calendar,
  Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/services/supabase/database';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { TeacherMessage } from '@/types/database.types';

interface ParentContactCollegeViewProps {
  parentName: string;
  studentName: string;
  studentId?: string;
  className?: string;
  parentId?: string;
}

export function ParentContactCollegeView({
  parentName,
  studentName,
  studentId,
  className,
  parentId,
}: ParentContactCollegeViewProps) {
  const { toast } = useToast();
  const [activeMode, setActiveMode] = useState<'teacher' | 'admin'>('teacher');
  const [submitting, setSubmitting] = useState(false);

  // Teacher message fields
  const [teachers, setTeachers] = useState<Array<{ id: string; name: string; subject?: string }>>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [teacherSubject, setTeacherSubject] = useState('');
  const [teacherMessage, setTeacherMessage] = useState('');

  // Admin concern fields
  const [adminSubject, setAdminSubject] = useState('');
  const [adminMessage, setAdminMessage] = useState('');

  // Conversation history
  const [conversations, setConversations] = useState<TeacherMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // 1. Load Teachers assigned to student's class
  const loadAssignedTeachers = useCallback(async () => {
    try {
      const slots = await db.getTimetables(className || 'Semester 1');
      const uniqueTeachers = new Map<string, { id: string; name: string; subject?: string }>();
      
      slots.forEach(s => {
        if (s.teacher_name && s.teacher_name !== 'Unassigned') {
          const key = s.teacher_id || s.teacher_name;
          if (!uniqueTeachers.has(key)) {
            uniqueTeachers.set(key, {
              id: s.teacher_id || key,
              name: s.teacher_name,
              subject: s.subject,
            });
          }
        }
      });

      const list = Array.from(uniqueTeachers.values());
      if (list.length > 0) {
        setTeachers(list);
        setSelectedTeacherId(list[0].id);
      } else {
        // Fallback: list faculty profiles
        const allTeachers = await db.getTeachers();
        const facultyList = allTeachers.map(t => ({
          id: t.id,
          name: t.name || 'Faculty Member',
          subject: t.department || 'Paramedical Sciences',
        }));
        setTeachers(facultyList);
        if (facultyList.length > 0) setSelectedTeacherId(facultyList[0].id);
      }
    } catch (err) {
      console.warn('Failed to load teachers for parent contact:', err);
    }
  }, [className]);

  // 2. Load Parent Message History
  const loadMessageHistory = useCallback(async () => {
    if (!parentId) return;
    setLoadingHistory(true);
    try {
      const msgs = await db.getTeacherMessages(parentId);
      setConversations(msgs || []);
    } catch (err) {
      console.warn('Failed to load parent message history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [parentId]);

  useEffect(() => {
    loadAssignedTeachers();
    loadMessageHistory();
  }, [loadAssignedTeachers, loadMessageHistory]);

  useRealtimeSubscription({ table: 'teacher_messages', onChange: loadMessageHistory, onReconnect: loadMessageHistory });

  // Handle Teacher Message Submit
  const handleSendTeacherMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherSubject.trim() || !teacherMessage.trim() || !selectedTeacherId) {
      toast({ title: 'Missing Information', description: 'Please select a teacher and enter your message.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const chosenTeacher = teachers.find(t => t.id === selectedTeacherId);
      const recipientName = chosenTeacher?.name || 'Faculty Teacher';

      await db.sendMessageToTeacher({
        sender_id: parentId || 'unknown_parent',
        sender_name: `${parentName} (Parent of ${studentName})`,
        sender_email: '',
        teacher_id: selectedTeacherId,
        teacher_name: recipientName,
        subject: `[Parent Inquiry - ${studentName}] ${teacherSubject.trim()}`,
        message: teacherMessage.trim(),
      });

      // Dispatch realtime notification to teacher
      try {
        await db.createNotification({
          user_id: selectedTeacherId,
          title: `New Parent Message: ${studentName}`,
          message: `${parentName} sent an inquiry: "${teacherSubject.trim()}".`,
          type: 'info',
          priority: 'high',
          is_read: false,
        });
      } catch (notifErr) {
        console.warn('Teacher notif note:', notifErr);
      }

      toast({
        title: 'Message Sent to Teacher',
        description: `Your note has been delivered to ${recipientName}'s inbox.`,
      });

      setTeacherSubject('');
      setTeacherMessage('');
      await loadMessageHistory();
    } catch (err: any) {
      toast({
        title: 'Failed to Send',
        description: err.message || 'Could not dispatch message.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Admin Concern Submit
  const handleSendAdminConcern = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminSubject.trim() || !adminMessage.trim()) {
      toast({ title: 'Validation Error', description: 'Please enter a subject and message.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      await db.createConcern({
        student_name: studentName,
        subject: `Parent Inquiry: ${adminSubject.trim()}`,
        description: `From Parent: ${parentName} regarding ward: ${studentName}.\n\n${adminMessage.trim()}`,
        category: 'Parent Query',
        priority: 'medium',
        status: 'Pending',
      });

      toast({
        title: 'Inquiry Submitted',
        description: 'Your inquiry has been routed to the Dean of Academic Affairs and HOD.',
      });

      setAdminSubject('');
      setAdminMessage('');
    } catch (err: any) {
      toast({
        title: 'Submission Failed',
        description: err.message || 'Could not dispatch message.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Teacher & College Communication</h2>
        <p className="text-muted-foreground text-sm">
          Direct messaging with your child's assigned teachers and official administrative offices
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Composer Form */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="rounded-2xl border-border shadow-xs">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Send className="w-4 h-4 text-[#1D61E7]" />
                  Dispatch Communication
                </CardTitle>
                <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveMode('teacher')}
                    className={`px-3 py-1 rounded-md font-medium transition-all ${
                      activeMode === 'teacher' ? 'bg-white dark:bg-slate-800 text-[#1D61E7] shadow-xs' : 'text-muted-foreground'
                    }`}
                  >
                    Assigned Faculty
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMode('admin')}
                    className={`px-3 py-1 rounded-md font-medium transition-all ${
                      activeMode === 'admin' ? 'bg-white dark:bg-slate-800 text-[#1D61E7] shadow-xs' : 'text-muted-foreground'
                    }`}
                  >
                    Dean / Admin Desk
                  </button>
                </div>
              </div>
              <CardDescription className="text-xs">
                {activeMode === 'teacher' 
                  ? `Send direct academic queries to ${studentName}'s subject teachers`
                  : 'Submit official institutional inquiries to the Dean or Reception'}
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5">
              {activeMode === 'teacher' ? (
                <form onSubmit={handleSendTeacherMessage} className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <Label htmlFor="teacher-select">Select Assigned Teacher</Label>
                    <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                      <SelectTrigger id="teacher-select">
                        <SelectValue placeholder="Choose teacher" />
                      </SelectTrigger>
                      <SelectContent>
                        {teachers.map(t => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name} {t.subject ? `(${t.subject})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="t-subject">Subject</Label>
                    <Input
                      id="t-subject"
                      value={teacherSubject}
                      onChange={(e) => setTeacherSubject(e.target.value)}
                      placeholder="e.g. Query regarding recent practical assessment"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="t-message">Message Details</Label>
                    <Textarea
                      id="t-message"
                      value={teacherMessage}
                      onChange={(e) => setTeacherMessage(e.target.value)}
                      placeholder="Write your academic query or progress note for the teacher..."
                      rows={4}
                      required
                    />
                  </div>

                  <Button type="submit" disabled={submitting} className="w-full bg-[#1D61E7] hover:bg-blue-700 text-white font-semibold">
                    {submitting ? 'Dispatching Message...' : 'Send Message to Assigned Teacher'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleSendAdminConcern} className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <Label htmlFor="a-subject">Inquiry Subject</Label>
                    <Input
                      id="a-subject"
                      value={adminSubject}
                      onChange={(e) => setAdminSubject(e.target.value)}
                      placeholder="e.g. Semester Exam Fee receipt or Bus Route inquiry"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="a-message">Inquiry Details</Label>
                    <Textarea
                      id="a-message"
                      value={adminMessage}
                      onChange={(e) => setAdminMessage(e.target.value)}
                      placeholder="Provide details regarding your institutional inquiry..."
                      rows={4}
                      required
                    />
                  </div>

                  <Button type="submit" disabled={submitting} className="w-full bg-[#1D61E7] hover:bg-blue-700 text-white font-semibold">
                    {submitting ? 'Submitting to College Desk...' : 'Submit to Administrative Office'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Conversation History */}
          <Card className="rounded-2xl border-border shadow-xs">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#1D61E7]" />
                Recent Message History ({conversations.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Conversation threads and faculty responses
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-6 text-muted-foreground text-xs">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading message history...
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-xs">
                  No previous messages recorded. Send an inquiry above to initiate communication with faculty.
                </div>
              ) : (
                <div className="space-y-3">
                  {conversations.slice(0, 5).map(msg => (
                    <div key={msg.id} className="p-3.5 rounded-xl border border-border/60 bg-slate-50/50 dark:bg-slate-900/50 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-primary" />
                          {msg.sender_id === parentId ? `To: ${msg.teacher_name}` : `From: ${msg.sender_name}`}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {msg.created_at ? new Date(msg.created_at).toLocaleDateString() : 'Recent'}
                        </span>
                      </div>
                      <div className="font-semibold text-primary text-[11px]">{msg.subject}</div>
                      <p className="text-muted-foreground leading-relaxed">{msg.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Contact Directory */}
        <div className="space-y-4">
          <Card className="rounded-2xl border-border shadow-xs">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#1D61E7]" />
                Institutional Directory
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border/50 space-y-1">
                <div className="font-semibold text-foreground">Office of the Principal / Dean</div>
                <div className="text-muted-foreground flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-primary" /> +91 422 245 8001
                </div>
                <div className="text-muted-foreground flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-primary" /> principal@adithyan.edu.in
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border/50 space-y-1">
                <div className="font-semibold text-foreground">Department Office</div>
                <div className="text-muted-foreground flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-primary" /> +91 422 245 8015
                </div>
                <div className="text-muted-foreground flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-primary" /> hod.paramedical@adithyan.edu.in
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border/50 space-y-1">
                <div className="font-semibold text-foreground">Receptionist Desk</div>
                <div className="text-muted-foreground flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-primary" /> +91 98765 43210
                </div>
                <div className="text-muted-foreground flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-primary" /> admissions@adithyan.edu.in
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
