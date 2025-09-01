import { useState } from 'react';
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
import { 
  MessageCircle, 
  Send, 
  Users, 
  Search,
  Filter,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

interface Parent {
  id: string;
  name: string;
  email: string;
  phone: string;
  student: string;
  class: string;
  lastContact: string;
}

interface Message {
  id: string;
  recipient: string;
  subject: string;
  preview: string;
  sentTime: string;
  status: 'sent' | 'delivered' | 'read';
  priority: 'low' | 'medium' | 'high';
}

export default function MessageParents() {
  const [selectedParents, setSelectedParents] = useState<string[]>([]);
  const [messageType, setMessageType] = useState('individual');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('compose');
  const { toast } = useToast();

  const parents: Parent[] = [
    { id: '1', name: 'Mrs. Sarah Chen', email: 'sarah.chen@email.com', phone: '+1234567890', student: 'Alex Chen', class: 'Grade 10-A', lastContact: '2 days ago' },
    { id: '2', name: 'Mr. Robert Johnson', email: 'robert.johnson@email.com', phone: '+1234567891', student: 'Sarah Johnson', class: 'Grade 10-A', lastContact: '1 week ago' },
    { id: '3', name: 'Mrs. Maria Rodriguez', email: 'maria.rodriguez@email.com', phone: '+1234567892', student: 'Mike Rodriguez', class: 'Grade 10-A', lastContact: '3 days ago' },
    { id: '4', name: 'Mr. David Davis', email: 'david.davis@email.com', phone: '+1234567893', student: 'Emma Davis', class: 'Grade 10-A', lastContact: '1 day ago' },
  ];

  const recentMessages: Message[] = [
    { id: '1', recipient: 'Mrs. Sarah Chen', subject: 'Alex\'s Progress Update', preview: 'I wanted to update you on Alex\'s excellent progress in mathematics...', sentTime: '2 hours ago', status: 'read', priority: 'medium' },
    { id: '2', recipient: 'Mr. Robert Johnson', subject: 'Homework Reminder', preview: 'This is a gentle reminder about Sarah\'s pending assignments...', sentTime: '1 day ago', status: 'delivered', priority: 'low' },
    { id: '3', recipient: 'Mrs. Maria Rodriguez', subject: 'Parent-Teacher Meeting', preview: 'I would like to schedule a meeting to discuss Mike\'s performance...', sentTime: '2 days ago', status: 'sent', priority: 'high' },
  ];

  const messageTemplates = [
    { id: '1', name: 'Progress Update', subject: 'Student Progress Update', content: 'Dear [Parent Name],\n\nI hope this message finds you well. I wanted to provide you with an update on [Student Name]\'s progress in my class...' },
    { id: '2', name: 'Homework Reminder', subject: 'Homework Reminder', content: 'Dear [Parent Name],\n\nThis is a gentle reminder that [Student Name] has pending assignments...' },
    { id: '3', name: 'Behavioral Concern', subject: 'Behavioral Discussion', content: 'Dear [Parent Name],\n\nI would like to discuss some observations about [Student Name]\'s behavior in class...' },
    { id: '4', name: 'Celebration', subject: 'Great Achievement!', content: 'Dear [Parent Name],\n\nI\'m excited to share that [Student Name] has achieved something wonderful...' },
  ];

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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Message Sent",
      description: `Message sent to ${selectedParents.length} parent(s) successfully.`,
    });
    setSelectedParents([]);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'read': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'delivered': return <CheckCircle className="w-4 h-4 text-primary" />;
      case 'sent': return <Clock className="w-4 h-4 text-muted-foreground" />;
      default: return null;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
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
          <TabsTrigger value="history">Message History</TabsTrigger>
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
                      <Select>
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
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="message">Message</Label>
                      <Textarea 
                        id="message" 
                        placeholder="Type your message here..."
                        rows={8}
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
                      <Button variant="outline" type="button">
                        Save Draft
                      </Button>
                      <Button type="submit" disabled={selectedParents.length === 0}>
                        <Send className="w-4 h-4 mr-2" />
                        Send Message ({selectedParents.length})
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
                      <div className="space-y-2">
                        {filteredParents.map((parent) => (
                          <div key={parent.id} className="flex items-start space-x-2 p-2 border rounded-lg">
                            <Checkbox
                              id={parent.id}
                              checked={selectedParents.includes(parent.id)}
                              onCheckedChange={() => handleParentToggle(parent.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <Label htmlFor={parent.id} className="text-sm font-medium">
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Message Templates</CardTitle>
                <Button variant="outline" size="sm">
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
                          <Button variant="outline" size="sm" className="flex-1">
                            Use Template
                          </Button>
                          <Button variant="ghost" size="sm">
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