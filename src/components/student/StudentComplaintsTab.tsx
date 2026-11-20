import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  AlertTriangle, 
  Send, 
  Clock, 
  CheckCircle2, 
  FileText, 
  MessageSquare, 
  Loader2, 
  RefreshCw,
  ShieldAlert,
  Hash
} from 'lucide-react';
import { db } from '@/services/supabase/database';
import { useAuth } from '@/context/AuthContext';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { Concern } from '@/types/database.types';
import { useToast } from '@/hooks/use-toast';
import { DynamicFormFields } from '@/components/customizer/DynamicFormFields';
import { CustomFieldsViewer } from '@/components/customizer/CustomFieldsViewer';
import { EditableText } from '@/components/customizer/EditableText';

const CATEGORIES = [
  'Academic Curriculum & Lectures',
  'Examination & Evaluation',
  'Laboratory & Equipment',
  'Library & Digital Resources',
  'Campus Infrastructure & Maintenance',
  'Transport & Bus Service',
  'Hostel & Dining Facilities',
  'Administrative & Accounts',
  'Other Campus Inquiry',
];

export function StudentComplaintsTab() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [concerns, setConcerns] = useState<Concern[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [category, setCategory] = useState<string>('Academic Curriculum & Lectures');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [subject, setSubject] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [customFields, setCustomFields] = useState<Record<string, any>>({});

  const loadConcerns = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const data = await db.getStudentConcerns(user.id);
      setConcerns(data || []);
    } catch (err) {
      console.warn('Failed to load concerns:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadConcerns();
  }, [loadConcerns]);

  useRealtimeSubscription({
    table: 'concerns',
    onChange: loadConcerns,
    onReconnect: loadConcerns,
  });

  const handleSubmitConcern = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    if (!subject.trim() || !description.trim()) {
      toast({
        title: 'Incomplete Submission',
        description: 'Please provide both a subject and a clear explanation of your concern.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const referenceId = `CMP-${Date.now().toString().slice(-6)}`;
      const payload: any = {
        student_id: user.id,
        user_id: user.id,
        student_name: user.name || 'Student',
        class_name: user.class_name || undefined,
        category,
        priority,
        subject: subject.trim(),
        description: description.trim(),
        status: 'Pending',
        is_anonymous: false,
        custom_fields: customFields,
      };

      const result = await db.createConcern(payload);
      if (result) {
        toast({
          title: 'Grievance Registered',
          description: `Your ticket has been assigned reference #${referenceId}. The administration will review it promptly.`,
        });
        setSubject('');
        setDescription('');
        setPriority('medium');
        setCustomFields({});
        loadConcerns();
      } else {
        throw new Error('Database insertion rejected.');
      }
    } catch (err: any) {
      toast({
        title: 'Submission Failed',
        description: err.message || 'Unable to lodge grievance ticket.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'resolved':
      case 'closed':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 text-xs">Resolved</Badge>;
      case 'in progress':
      case 'in_progress':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-300 text-xs">In Progress</Badge>;
      default:
        return <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-xs">Pending Review</Badge>;
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p?.toLowerCase()) {
      case 'urgent':
      case 'high':
        return <Badge variant="destructive" className="text-[10px]">Urgent</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="text-[10px]">Medium</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">Standard</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 border border-border rounded-xl">
        <div className="flex items-center space-x-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <div>
            <EditableText
              id="student_complaints_title"
              defaultText="Student Grievance & Concerns Portal"
              as="h2"
              className="text-xl font-bold text-foreground"
            />
            <EditableText
              id="student_complaints_subtitle"
              defaultText="Direct and confidential communication channel to university administration and grievance officers"
              as="p"
              className="text-xs text-muted-foreground"
            />
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadConcerns} className="h-8">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh Tickets
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form: Lodge Complaint */}
        <div className="lg:col-span-1">
          <Card className="bg-white border-border shadow-xs sticky top-4">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base font-bold text-foreground">
                Lodge Formal Concern
              </CardTitle>
              <CardDescription className="text-xs">
                Tickets are assigned directly to the administrative coordinator
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmitConcern}>
              <CardContent className="p-4 space-y-4 text-xs">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-foreground">Concern Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="text-xs h-9 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat} className="text-xs">
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-foreground">Priority Level</Label>
                  <Select value={priority} onValueChange={(val: any) => setPriority(val)}>
                    <SelectTrigger className="text-xs h-9 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="low" className="text-xs">Standard (General question or feedback)</SelectItem>
                      <SelectItem value="medium" className="text-xs">Medium (Requires attention within 3 days)</SelectItem>
                      <SelectItem value="high" className="text-xs">High (Impacting academic learning)</SelectItem>
                      <SelectItem value="urgent" className="text-xs">Urgent (Safety, health, or critical barrier)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-foreground">Subject Line *</Label>
                  <Input
                    placeholder="Brief summary of the issue..."
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="text-xs h-9 bg-white"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-foreground">Detailed Description *</Label>
                  <Textarea
                    placeholder="Provide specific dates, room numbers, subjects, or individuals involved to expedite resolution..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-[120px] text-xs resize-none bg-white"
                    required
                  />
                </div>

                {/* Dynamic Form Customizer for Grievances */}
                <DynamicFormFields
                  formId="student_complaints"
                  values={customFields}
                  onChange={(k, v) => setCustomFields(prev => ({ ...prev, [k]: v }))}
                />
              </CardContent>

              <CardFooter className="pt-2 border-t border-border bg-slate-50/50">
                <Button 
                  type="submit" 
                  size="sm" 
                  className="w-full text-xs h-9"
                  disabled={submitting || !subject.trim() || !description.trim()}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Transmitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 mr-1.5" /> Submit Concern Ticket
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>

        {/* Complaints History List */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="bg-white border-border shadow-xs">
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-foreground">
                  Your Grievance History ({concerns.length})
                </CardTitle>
                <Badge variant="outline" className="text-xs font-semibold">
                  Personal & Confidential
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Real-time tracking of submitted administrative concerns and official responses
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground">Loading submitted grievances...</p>
                </div>
              ) : concerns.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <ShieldAlert className="w-12 h-12 mx-auto text-muted-foreground/30" />
                  <h4 className="text-sm font-semibold text-foreground">No Grievance Tickets Lodged</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    You have not submitted any administrative or academic concerns. Use the form on the left if you require assistance.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {concerns.map((concern) => (
                    <div
                      key={concern.id}
                      className="p-4 sm:p-5 border border-border rounded-xl bg-white space-y-3 hover:border-primary/40 transition-colors shadow-2xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-border pb-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="text-[10px] font-mono">
                              #{concern.id.slice(0, 8).toUpperCase()}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px]">
                              {concern.category || 'General'}
                            </Badge>
                            {getPriorityBadge(concern.priority)}
                            {getStatusBadge(concern.status)}
                          </div>
                          <h4 className="font-bold text-sm text-foreground pt-1">
                            {concern.subject}
                          </h4>
                        </div>

                        <div className="text-[11px] text-muted-foreground flex items-center space-x-1 shrink-0">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{concern.created_at ? new Date(concern.created_at).toLocaleDateString() : '—'}</span>
                        </div>
                      </div>

                      <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">
                        {concern.description}
                      </p>

                      {/* Submitted Custom Attributes */}
                      <CustomFieldsViewer 
                        customFields={(concern as any).custom_fields} 
                        layout="inline" 
                        className="mt-2" 
                      />

                      {/* Admin response block if available */}
                      {(concern.admin_response || concern.resolution_notes) ? (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs space-y-1">
                          <div className="font-semibold text-emerald-900 flex items-center">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                            Official Administrative Resolution
                          </div>
                          <p className="text-emerald-800 leading-relaxed pl-5">
                            {concern.admin_response || concern.resolution_notes}
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1.5 text-[11px] text-muted-foreground pt-1">
                          <Clock className="w-3 h-3 text-amber-500" />
                          <span>Under formal review by department grievance committee.</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

