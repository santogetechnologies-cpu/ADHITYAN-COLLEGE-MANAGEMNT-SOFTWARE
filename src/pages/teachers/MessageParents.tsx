import { useState, useEffect } from 'react';
import { db } from '@/services/supabase/database';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/services/supabase/client';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { askConfirm, askText } from '@/lib/dialogs';
import { 
  MessageCircle, 
  Send, 
  Users, 
  Search,
  Clock,
  CheckCircle,
  Loader2
} from 'lucide-react';

interface ParentContact {
  id: string;
  name: string;
  email: string;
  phone: string;
  student: string;
  class: string;
  lastContact: string;
}

interface MessageItem {
  id: string;
  recipient: string;
  subject: string;
  preview: string;
  sentTime: string;
  status: 'sent' | 'delivered' | 'read';
  priority: 'low' | 'medium' | 'high';
}

export default function MessageParents() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [parents, setParents] = useState<ParentContact[]>([]);
  const [recentMessages, setRecentMessages] = useState<MessageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const [selectedParents, setSelectedParents] = useState<string[]>([]);
  const [messageType, setMessageType] = useState('individual');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [subject, setSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('compose');

  const messageTemplates = [
    { id: '1', name: 'Progress Update', subject: 'Student Progress Update', content: 'Dear Parent,\n\nI hope this message finds you well. I wanted to provide you with an update on your child\'s academic progress and participation in our class. They have been engaging actively and demonstrating consistent dedication.' },
    { id: '2', name: 'Homework Reminder', subject: 'Homework & Assignment Reminder', content: 'Dear Parent,\n\nThis is a gentle reminder regarding upcoming homework submissions due this week. Please check your child\'s portal dashboard for details and encourage them to submit on time.' },
    { id: '3', name: 'Behavioral Concern', subject: 'Academic & Classroom Discussion', content: 'Dear Parent,\n\nI would appreciate the opportunity to schedule a brief discussion regarding recent classroom participation and learning progress. Please let me know your preferred time to connect.' },
    { id: '4', name: 'Celebration', subject: 'Commendation & Academic Achievement', content: 'Dear Parent,\n\nI am thrilled to share that your child has achieved exceptional performance in recent coursework! Thank you for your continued support and partnership in their learning journey.' },
  ];

  const fetchParentsAndMessages = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const [parentData, msgData] = await Promise.all([
        db.getParentsForTeacher(user.id),
        db.getTeacherMessages(user.id),
      ]);

      if (parentData && parentData.length > 0) {
        setParents(parentData.map(p => ({
          id: p.id,
          name: p.name || 'Parent',
          email: p.email || 'N/A',
          phone: p.phone || 'N/A',
          student: p.student_name || 'Enrolled Student',
          class: p.student_class || 'Class',
          lastContact: 'Recent',
        })));
      } else {
        setParents([]);
      }

      if (msgData && msgData.length > 0) {
        setRecentMessages(msgData.map(m => ({
          id: m.id,
          recipient: m.teacher_name || 'Parent',
          subject: m.subject || 'Message',
          preview: m.message || '',
          sentTime: m.created_at ? new Date(m.created_at).toLocaleDateString() : 'Recent',
          status: m.is_read ? 'read' : 'sent',
          priority: 'medium',
        })));
      } else {
        setRecentMessages([]);
      }
    } catch (err) {
      console.warn('Load parent messaging notice:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchParentsAndMessages();

    // Subscribe to realtime teacher_messages
    const channel = supabase
      .channel('teacher_parent_messages_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teacher_messages' },
        () => {
          fetchParentsAndMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const filteredParents = parents.filter(parent =>
    parent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parent.student.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parent.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleParentToggle = (parentId: string) => {
    setSelectedParents(prev =>
      prev.includes(parentId)
        ? prev.filter(id => id !== parentId)
        : [...prev, parentId]
    );
  };

  const handleUseTemplate = (template: typeof messageTemplates[0]) => {
    setSubject(template.subject);
    setMessageBody(template.content);
    setActiveTab('compose');
    toast({
      title: "Template Applied",
      description: `Loaded "${template.name}" into message composer.`,
    });
  };

  const handleSaveDraft = () => {
    if (!subject && !messageBody) {
      toast({
        title: "Draft Empty",
        description: "Please enter some content before saving a draft.",
        variant: "destructive"
      });
      return;
    }
    localStorage.setItem('teacher_msg_draft', JSON.stringify({ subject, messageBody, selectedParents }));
    toast({
      title: "Draft Saved",
      description: "Message draft saved locally.",
    });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (selectedParents.length === 0) {
      toast({
        title: "No Recipients Selected",
        description: "Please select at least one parent to send the message to.",
        variant: "destructive",
      });
      return;
    }

    if (!subject.trim() || !messageBody.trim()) {
      toast({
        title: "Incomplete Message",
        description: "Please enter both subject and message body.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    let successCount = 0;

    try {
      for (const parentId of selectedParents) {
        const parentObj = parents.find(p => p.id === parentId);
        const recipientName = parentObj ? parentObj.name : 'Parent';

        const success = await db.sendMessageToTeacher({
          sender_id: user.id,
          sender_name: user.name || 'Faculty Member',
          sender_email: user.email,
          teacher_id: parentId, // stores parent recipient ID
          teacher_name: recipientName,
          subject: subject.trim(),
          message: messageBody.trim(),
        });

        if (success) {
          successCount++;
          // Dispatch realtime notification to the recipient
          try {
            await db.createNotification({
              user_id: parentId,
              title: `Teacher Message: ${subject.trim()}`,
              message: `${user.name || 'Teacher'}: ${messageBody.trim().substring(0, 80)}...`,
              type: 'info',
              priority: priority,
              is_read: false
            });
          } catch (notifErr) {
            console.warn('Parent notification dispatch notice:', notifErr);
          }
        }
      }

      toast({
        title: "Message Sent",
        description: `Message successfully sent to ${successCount} parent(s).`,
      });

      setSubject('');
      setMessageBody('');
      setSelectedParents([]);
      localStorage.removeItem('teacher_msg_draft');
      fetchParentsAndMessages();
    } catch (err: any) {
      toast({
        title: "Send Failed",
        description: err.message || "Could not dispatch message to parents.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'read': return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case 'delivered': return <CheckCircle className="w-4 h-4 text-primary" />;
      case 'sent': return <Clock className="w-4 h-4 text-muted-foreground" />;
      default: return null;
    }
  };

  const getPriorityColor = (prio: string) => {
    switch (prio) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation showBackButton={true} backUrl="/dashboard" backLabel="Back to Dashboard" />
      <main className="container max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center space-x-2 mb-6">
          <MessageCircle className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Message Parents</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="compose">Compose Message</TabsTrigger>
            <TabsTrigger value="history">Message History ({recentMessages.length})</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Message Composition */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Compose Message</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSendMessage} className="space-y-4">
                      <div>
                        <Label htmlFor="messageType">Message Type</Label>
                        <Select value={messageType} onValueChange={setMessageType}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="individual">Individual Message</SelectItem>
                            <SelectItem value="class">Class Announcement</SelectItem>
                            <SelectItem value="custom">Custom Recipients</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="priority">Priority</Label>
                        <Select value={priority} onValueChange={(val: any) => setPriority(val)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="subject">Subject</Label>
                        <Input 
                          id="subject" 
                          placeholder="Enter message subject"
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="message">Message</Label>
                        <Textarea 
                          id="message" 
                          placeholder="Type your message here..."
                          rows={8}
                          value={messageBody}
                          onChange={(e) => setMessageBody(e.target.value)}
                          required
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox id="sendSMS" />
                        <Label htmlFor="sendSMS" className="text-sm">
                          Also send as SMS
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox id="requestRead" defaultChecked />
                        <Label htmlFor="requestRead" className="text-sm">
                          Request read receipt
                        </Label>
                      </div>

                      <div className="flex justify-end space-x-4">
                        <Button variant="outline" type="button" onClick={handleSaveDraft}>
                          Save Draft
                        </Button>
                        <Button type="submit" disabled={isSending || selectedParents.length === 0}>
                          {isSending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              Send Message ({selectedParents.length})
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Parent Selection */}
              <div>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center space-x-2">
                        <Users className="w-4 h-4" />
                        <span>Select Parents</span>
                      </CardTitle>
                      <Badge variant="secondary">
                        {selectedParents.length} selected
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Search parents..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>

                      <ScrollArea className="h-80">
                        {isLoading ? (
                          <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Loading parents...
                          </div>
                        ) : filteredParents.length === 0 ? (
                          <div className="text-center py-8 text-xs text-muted-foreground p-3">
                            No registered parent accounts found in database. Parents can be provisioned by Institutional Administration.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {filteredParents.map((parent) => (
                              <div key={parent.id} className="flex items-start space-x-2 p-2 border rounded-lg">
                                <Checkbox
                                  id={parent.id}
                                  checked={selectedParents.includes(parent.id)}
                                  onCheckedChange={() => handleParentToggle(parent.id)}
                                />
                                <div className="flex-1 min-w-0">
                                  <Label htmlFor={parent.id} className="text-sm font-medium cursor-pointer">
                                    {parent.name}
                                  </Label>
                                  <div className="text-xs text-muted-foreground">
                                    <div>Student: {parent.student}</div>
                                    <div>Class: {parent.class}</div>
                                    <div>Last contact: {parent.lastContact}</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>

                      <div className="flex justify-between">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedParents(filteredParents.map(p => p.id))}
                        >
                          Select All
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedParents([])}
                        >
                          Clear All
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Messages</CardTitle>
              </CardHeader>
              <CardContent>
                {recentMessages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No sent messages found. Messages sent to parents will appear here in real-time.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recentMessages.map((message) => (
                      <div key={message.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium">{message.subject}</h4>
                            <Badge variant={getPriorityColor(message.priority) as any} className="text-xs">
                              {message.priority}
                            </Badge>
                            {getStatusIcon(message.status)}
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">To: {message.recipient}</p>
                          <p className="text-sm text-muted-foreground">{message.preview}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">{message.sentTime}</div>
                          <Badge variant="outline" className="text-xs mt-1">
                            {message.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Message Templates</CardTitle>
                  <Button variant="outline" size="sm" onClick={async () => {
                    const customTitle = await askText('Give the template a name', { title: 'New template (1 of 3)', required: true });
                    if (!customTitle) return;
                    const customSub = await askText('Subject line', { title: 'New template (2 of 3)', required: true });
                    if (!customSub) return;
                    const customBody = await askText('Message text', { title: 'New template (3 of 3)', required: true, multiline: true });
                    if (customTitle && customSub && customBody) {
                      setSubject(customSub);
                      setMessageBody(customBody);
                      setActiveTab('compose');
                    }
                  }}>
                    Create Template
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {messageTemplates.map((template) => (
                    <Card key={template.id}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div>
                            <Label className="text-sm font-medium">Subject:</Label>
                            <p className="text-sm text-muted-foreground">{template.subject}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Preview:</Label>
                            <p className="text-sm text-muted-foreground line-clamp-3">
                              {template.content.substring(0, 100)}...
                            </p>
                          </div>
                          <div className="flex space-x-2 mt-3">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => handleUseTemplate(template)}
                            >
                              Use Template
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setSubject(template.subject);
                                setMessageBody(template.content);
                                setActiveTab('compose');
                              }}
                            >
                              Edit
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
