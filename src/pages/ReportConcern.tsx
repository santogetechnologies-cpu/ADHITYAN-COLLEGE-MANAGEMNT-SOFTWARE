import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, AlertTriangle, Upload, Loader2, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AttachmentDialog } from '@/components/shared/AttachmentDialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { storageService } from '@/services/supabase/storage';
import { db } from '@/services/supabase/database';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { Concern, Profile } from '@/types/database.types';
import { ROLE_CONFIGS } from '@/config/roles';

const ReportConcern = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [concernType, setConcernType] = useState('');
  const [priority, setPriority] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [attachmentDialogOpen, setAttachmentDialogOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pastConcerns, setPastConcerns] = useState<Concern[]>([]);
  const [loadingConcerns, setLoadingConcerns] = useState(true);
  const { toast } = useToast();

  // Parent & Child Context
  const [linkedChildren, setLinkedChildren] = useState<Profile[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');

  // 1. If Parent, load linked children
  useEffect(() => {
    async function loadChildren() {
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
    loadChildren();
  }, [user?.id, user?.role]);

  // 2. Load Past Concerns (for current user and linked children)
  const loadPastConcerns = useCallback(async () => {
    if (!user?.id) {
      setLoadingConcerns(false);
      return;
    }
    try {
      const childIds = linkedChildren.map(c => c.id);
      const data = await db.getStudentConcerns(user.id, childIds);
      setPastConcerns(data || []);
    } catch (err) {
      console.warn('Failed to load student concerns:', err);
      setPastConcerns([]);
    } finally {
      setLoadingConcerns(false);
    }
  }, [user?.id, linkedChildren]);

  useEffect(() => {
    loadPastConcerns();
  }, [loadPastConcerns]);

  // Real-time synchronization for complaint status updates
  useRealtimeSubscription({
    table: 'concerns',
    onChange: loadPastConcerns,
    onReconnect: loadPastConcerns,
  });

  const concernTypes = [
    { value: 'academic', label: 'Academic Issue' },
    { value: 'bullying', label: 'Bullying/Harassment' },
    { value: 'safety', label: 'Safety Concern' },
    { value: 'transportation', label: 'Transportation' },
    { value: 'facility', label: 'Facility/Infrastructure' },
    { value: 'teacher', label: 'Teacher/Staff Concern' },
    { value: 'other', label: 'Other' }
  ];

  const priorities = [
    { value: 'low', label: 'Low - General inquiry' },
    { value: 'medium', label: 'Medium - Needs attention' },
    { value: 'high', label: 'High - Urgent response needed' },
    { value: 'critical', label: 'Critical - Immediate action required' }
  ];

  const handleSubmitConcern = async () => {
    if (!concernType || !priority || !subject.trim() || !description.trim()) {
      toast({
        title: "Please complete all required fields",
        description: "Make sure you've filled in all required information.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload attached files to Supabase Storage if any
      const uploadedUrls: string[] = [];
      for (const file of attachedFiles) {
        const { url } = await storageService.uploadFile('attachments', user?.id || 'anonymous', file);
        if (url) uploadedUrls.push(url);
      }

      // 2. Resolve student_id: For student, it's user.id. For parent, it's the selected child
      const targetStudentId = isAnonymous 
        ? undefined 
        : (user?.role === 'parent' ? (selectedChildId || undefined) : user?.id);

      const targetUserName = isAnonymous 
        ? 'Anonymous' 
        : (user?.name || (user?.role === 'parent' ? 'Parent' : 'Student'));

      // 3. Save to Supabase concerns table
      await db.createConcern({
        student_id: targetStudentId,
        user_id: isAnonymous ? undefined : user?.id,
        user_name: targetUserName,
        concern_type: concernType,
        priority: priority as any,
        subject: subject.trim(),
        description: description.trim(),
        is_anonymous: isAnonymous,
        status: 'Pending',
        attachments: uploadedUrls,
      });

      // 4. Dispatch real-time notifications to administrators
      try {
        const admins = (await db.getAllProfiles()).filter(p => p.role === 'principal' || p.role === 'admin');
        for (const adm of admins) {
          await db.createNotification({
            user_id: adm.id,
            title: `Concern Submitted: ${subject.trim()}`,
            message: `${targetUserName} submitted a ${priority} priority concern.`,
            type: 'warning',
            priority: priority === 'critical' ? 'high' : 'medium',
            is_read: false
          });
        }
      } catch (notifErr) {
        console.warn('Realtime admin notification fallback:', notifErr);
      }

      toast({
        title: "Concern submitted successfully",
        description: "Your concern has been securely saved and will be reviewed by college administration.",
      });

      // Reset form fields
      setConcernType('');
      setPriority('');
      setSubject('');
      setDescription('');
      setIsAnonymous(false);
      setAttachedFiles([]);

      await loadPastConcerns();
    } catch (err: any) {
      toast({
        title: "Submission Error",
        description: err.message || "Failed to submit concern. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAttachmentsAdded = (files: File[]) => {
    setAttachedFiles(prev => [...prev, ...files]);
  };

  const getPriorityColor = (value: string) => {
    switch (value) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'resolved':
        return <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-300">Resolved</Badge>;
      case 'under review':
      case 'investigating':
        return <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-300">Under Review</Badge>;
      default:
        return <Badge variant="outline" className="text-amber-600 border-amber-300">Pending Review</Badge>;
    }
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
              <h1 className="text-2xl font-bold text-foreground">Report Concern</h1>
              <p className="text-xs text-muted-foreground">Adithyan College Grievance Redressal</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Your concern will be reviewed by college administration. For emergencies, please contact the campus security or college office directly at (555) 123-4567.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Submit a Concern</CardTitle>
              <CardDescription>
                Submit academic, facility, safety, or personal concerns directly to administration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Linked Child Selection for Parent */}
              {user?.role === 'parent' && linkedChildren.length > 0 && !isAnonymous && (
                <div className="space-y-2">
                  <Label htmlFor="child-select">Pertaining to Student (Optional)</Label>
                  <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                    <SelectTrigger id="child-select">
                      <SelectValue placeholder="Select child or leave general" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">General / Institution-wide</SelectItem>
                      {linkedChildren.map(child => (
                        <SelectItem key={child.id} value={child.id}>
                          {child.name} ({child.class_name || 'Class'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="concern-type">Type of Concern</Label>
                  <Select value={concernType} onValueChange={setConcernType}>
                    <SelectTrigger id="concern-type">
                      <SelectValue placeholder="Select concern type" />
                    </SelectTrigger>
                    <SelectContent>
                      {concernTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority Level</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger id="priority">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {priorities.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          <span className={getPriorityColor(p.value)}>
                            {p.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="Brief summary of your concern"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Detailed Description</Label>
                <Textarea
                  id="description"
                  placeholder="Please provide a detailed description of your concern, including any relevant dates, times, and people involved..."
                  className="min-h-[150px]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="anonymous" 
                    checked={isAnonymous}
                    onCheckedChange={(checked) => setIsAnonymous(checked === true)}
                  />
                  <Label htmlFor="anonymous" className="text-sm">
                    Submit anonymously (your identity will not be shared)
                  </Label>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm"
                      onClick={() => setAttachmentDialogOpen(true)}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Attach Evidence ({attachedFiles.length})
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Optional: Photos, documents, or supporting files
                    </span>
                  </div>
                  
                  {attachedFiles.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {attachedFiles.length} file(s) attached: {attachedFiles.map(f => f.name).join(', ')}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={handleSubmitConcern} className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Concern
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleBack} disabled={isSubmitting}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Your Submitted Complaints & Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Your Submitted Concerns</span>
                <Badge variant="outline">{pastConcerns.length}</Badge>
              </CardTitle>
              <CardDescription>
                Track live status updates and administrative resolutions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingConcerns ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : pastConcerns.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  You have not submitted any concerns yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {pastConcerns.map((c) => (
                    <div key={c.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">{c.subject}</span>
                        {getStatusBadge(c.status)}
                      </div>
                      <p className="text-xs text-muted-foreground">{c.description}</p>
                      <div className="flex items-center justify-between pt-1 border-t text-xs text-muted-foreground">
                        <span className="capitalize">Type: {c.concern_type} • Priority: {c.priority}</span>
                        <span>{new Date(c.created_at || Date.now()).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <AttachmentDialog
        open={attachmentDialogOpen}
        onOpenChange={setAttachmentDialogOpen}
        onAttachmentsAdded={handleAttachmentsAdded}
        title="Attach Evidence"
        description="Upload photos, documents, or other files that support your concern"
        acceptedTypes={['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif', '.txt', '.mp4', '.mov']}
        maxFiles={10}
        maxSizePerFile={25}
      />
    </div>
  );
};

export default ReportConcern;
