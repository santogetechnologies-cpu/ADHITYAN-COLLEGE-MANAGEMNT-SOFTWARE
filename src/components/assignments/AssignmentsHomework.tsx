import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Calendar, 
  Clock, 
  BookOpen, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Upload, 
  ExternalLink, 
  Award, 
  Loader2, 
  RefreshCw,
  FileUp,
  X,
  FileCheck2,
  Paperclip,
  Check
} from 'lucide-react';
import { db } from '@/services/supabase/database';
import { Assignment, AssignmentSubmission } from '@/types/database.types';
import { useAuth } from '@/context/AuthContext';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useToast } from '@/hooks/use-toast';

export function AssignmentsHomework() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isTeacherOrAdmin = ['teacher', 'admin', 'principal'].includes(user?.role || '');

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, AssignmentSubmission>>({});
  const [allSubmissionsList, setAllSubmissionsList] = useState<AssignmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'submitted' | 'graded' | 'overdue' | 'all'>('pending');

  // Submit / Resubmit modal state (Student)
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissionModalOpen, setSubmissionModalOpen] = useState(false);
  const [submissionText, setSubmissionText] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string; dataUrl: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // View submission modal (Student)
  const [viewSubmissionAssignment, setViewSubmissionAssignment] = useState<Assignment | null>(null);

  // Teacher Review / Grading Modal state
  const [gradingAssignment, setGradingAssignment] = useState<Assignment | null>(null);
  const [gradingScores, setGradingScores] = useState<Record<string, number>>({});
  const [gradingFeedbacks, setGradingFeedbacks] = useState<Record<string, string>>({});
  const [savingGradeId, setSavingGradeId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [assignmentList, submissionList] = await Promise.all([
        db.getAssignments(isTeacherOrAdmin ? undefined : (user?.class_name || undefined)),
        isTeacherOrAdmin 
          ? db.getAssignmentSubmissions() 
          : (user?.id ? db.getAssignmentSubmissions(user.id) : Promise.resolve([]))
      ]);

      setAssignments(assignmentList || []);
      setAllSubmissionsList(submissionList || []);

      const subMap: Record<string, AssignmentSubmission> = {};
      (submissionList || []).forEach(sub => {
        if (!subMap[sub.assignment_id] || !isTeacherOrAdmin) {
          subMap[sub.assignment_id] = sub;
        }
      });
      setSubmissions(subMap);
    } catch (err) {
      console.error('Failed to load assignments data:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.class_name, user?.id, isTeacherOrAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useRealtimeSubscription({
    table: 'assignments',
    onChange: loadData,
    onReconnect: loadData,
  });

  useRealtimeSubscription({
    table: 'assignment_submissions',
    onChange: loadData,
    onReconnect: loadData,
  });

  const now = new Date();

  // Categorize each assignment
  const categorized = assignments.map(a => {
    const submission = submissions[a.id];
    const dueDate = new Date(a.due_date);
    const isPastDue = dueDate < now;
    
    let status: 'pending' | 'submitted' | 'graded' | 'overdue' = 'pending';

    if (submission) {
      if (submission.status === 'graded' || (submission.score !== null && submission.score !== undefined)) {
        status = 'graded';
      } else {
        status = 'submitted';
      }
    } else if (isPastDue) {
      status = 'overdue';
    } else {
      status = 'pending';
    }

    const timeDiff = dueDate.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    return {
      assignment: a,
      submission,
      status,
      daysDiff,
    };
  });

  const filteredItems = categorized.filter(item => {
    if (activeTab === 'all') return true;
    return item.status === activeTab;
  });

  // Handle file selection from local device (PDF, Image, Doc)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please select a file smaller than 15 MB.',
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const sizeStr = file.size > 1024 * 1024 
        ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
        : `${Math.round(file.size / 1024)} KB`;
      setUploadedFile({
        name: file.name,
        size: sizeStr,
        dataUrl: reader.result as string,
      });
      setAttachmentUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleOpenSubmit = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    const existing = submissions[assignment.id];
    setSubmissionText(existing?.submission_text || '');
    if (existing?.attachment_url) {
      setAttachmentUrl(existing.attachment_url);
      setUploadedFile({
        name: 'Previous Submission Document',
        size: 'Attached',
        dataUrl: existing.attachment_url,
      });
    } else {
      setAttachmentUrl('');
      setUploadedFile(null);
    }
    setSubmissionModalOpen(true);
  };

  const handleSubmitAssignment = async () => {
    if (!selectedAssignment || !user?.id) return;
    if (!submissionText.trim() && !attachmentUrl.trim() && !uploadedFile) {
      toast({
        title: 'Submission Empty',
        description: 'Please provide either written coursework text or attach a file/document.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const finalAttachment = uploadedFile?.dataUrl || attachmentUrl.trim() || undefined;

      const res = await db.submitAssignment({
        assignment_id: selectedAssignment.id,
        student_id: user.id,
        student_name: user.name || 'Student',
        subject: selectedAssignment.subject,
        submission_text: submissionText.trim(),
        attachment_url: finalAttachment,
        status: 'submitted',
      });

      if (res) {
        toast({
          title: submissions[selectedAssignment.id] ? 'Assignment Resubmitted' : 'Assignment Submitted',
          description: `Your work for "${selectedAssignment.title}" has been handed in for teacher review.`,
        });
        setSubmissions(prev => ({ ...prev, [selectedAssignment.id]: res }));
        setSubmissionModalOpen(false);
      } else {
        throw new Error('Failed to record submission.');
      }
    } catch (err: any) {
      toast({
        title: 'Submission Error',
        description: err.message || 'Unable to submit assignment.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive" className="text-[10px] font-bold">High Priority</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="text-[10px] font-semibold bg-amber-50 text-amber-700 border-amber-200">Medium Priority</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] font-semibold">Standard</Badge>;
    }
  };

  const counts = {
    pending: categorized.filter(i => i.status === 'pending').length,
    submitted: categorized.filter(i => i.status === 'submitted').length,
    graded: categorized.filter(i => i.status === 'graded').length,
    overdue: categorized.filter(i => i.status === 'overdue').length,
    all: categorized.length,
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* 1. Header Bar */}
      <Card className="bg-white border-slate-200/80 rounded-2xl shadow-2xs">
        <CardHeader className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#1D61E7] flex items-center justify-center font-bold">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <CardTitle className="text-xl font-bold text-slate-900 tracking-tight">
                    Assignments & Homework
                  </CardTitle>
                  <Badge className="bg-blue-50 text-[#1D61E7] border-blue-200 text-[10px] font-semibold">
                    Coursework Desk
                  </Badge>
                </div>
                <CardDescription className="text-xs text-slate-500">
                  Coursework assigned by professors for {user?.class_name || 'Enrolled Term'}
                </CardDescription>
              </div>
            </div>
          </div>

          {/* Action: Refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="h-9 px-3 text-xs font-semibold rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 self-start sm:self-center"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin text-[#1D61E7]' : 'text-slate-500'}`} />
            Refresh
          </Button>
        </CardHeader>

        {/* 2. Status Filter Tabs */}
        <div className="p-4 bg-slate-50/60 border-b border-slate-100">
          <Tabs 
            value={activeTab} 
            onValueChange={(val: any) => setActiveTab(val)}
            className="w-full"
          >
            <TabsList className="grid grid-cols-2 sm:grid-cols-5 h-10 bg-slate-200/60 p-1 rounded-xl text-xs">
              <TabsTrigger value="pending" className="text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-2xs">
                Pending ({counts.pending})
              </TabsTrigger>
              <TabsTrigger value="submitted" className="text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-2xs">
                Submitted ({counts.submitted})
              </TabsTrigger>
              <TabsTrigger value="graded" className="text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-2xs">
                Graded ({counts.graded})
              </TabsTrigger>
              <TabsTrigger value="overdue" className="text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-2xs">
                Overdue ({counts.overdue})
              </TabsTrigger>
              <TabsTrigger value="all" className="text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-2xs">
                All ({counts.all})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* 3. Assignment Cards Grid */}
        <CardContent className="p-6">
          {filteredItems.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-800">
                  {activeTab === 'all' ? 'No Coursework Available' : `No ${activeTab} assignments`}
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {activeTab === 'pending'
                    ? 'Great job! You have completed all active assignments scheduled for your class.'
                    : `No assignments currently categorized under "${activeTab}".`}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredItems.map(({ assignment, submission, status, daysDiff }) => {
                const isPastDue = daysDiff < 0;

                return (
                  <div
                    key={assignment.id}
                    className="p-5 rounded-2xl border border-slate-200/90 hover:border-blue-300 transition-all bg-white shadow-2xs flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Badge variant="outline" className="text-[10px] font-bold uppercase mb-1 bg-slate-50">
                            {assignment.subject}
                          </Badge>
                          <h3 className="font-bold text-sm text-slate-900 leading-snug">
                            {assignment.title}
                          </h3>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {status === 'graded' ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-bold">
                              ✓ Graded ({submission?.score ?? '100'}/100)
                            </Badge>
                          ) : status === 'submitted' ? (
                            <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-semibold">
                              Submitted
                            </Badge>
                          ) : status === 'overdue' ? (
                            <Badge variant="destructive" className="text-xs font-semibold">
                              Overdue
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs font-semibold">
                              Pending
                            </Badge>
                          )}
                          {getPriorityBadge(assignment.priority)}
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                        {assignment.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-500 border-t border-slate-100">
                        <div className="flex items-center space-x-1 text-slate-700">
                          <Calendar className="w-3.5 h-3.5 text-[#1D61E7]" />
                          <span>Due: {new Date(assignment.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>

                        <div className="flex items-center space-x-1">
                          <Clock className={`w-3.5 h-3.5 ${isPastDue ? 'text-rose-500' : 'text-slate-400'}`} />
                          <span className={isPastDue ? 'text-rose-600 font-semibold' : ''}>
                            {daysDiff === 0 ? 'Due Today' : daysDiff > 0 ? `${daysDiff} days left` : `${Math.abs(daysDiff)} days overdue`}
                          </span>
                        </div>
                      </div>

                      {/* Graded Remarks if available */}
                      {submission?.score !== null && submission?.score !== undefined && (
                        <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
                          <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                            <span>Faculty Score: {submission.score}/100</span>
                            <Award className="w-4 h-4 text-emerald-600" />
                          </div>
                          {submission.feedback && (
                            <p className="text-[11px] text-emerald-700 italic">
                              "{submission.feedback}"
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2">
                      {submission ? (
                        <div className="flex items-center space-x-2 w-full">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-8 rounded-xl flex-1 border-slate-200"
                            onClick={() => setViewSubmissionAssignment(assignment)}
                          >
                            View Submission
                          </Button>
                          {status !== 'graded' && (
                            <Button
                              size="sm"
                              className="text-xs h-8 rounded-xl bg-blue-50 text-[#1D61E7] hover:bg-blue-100 border border-blue-200 font-semibold"
                              onClick={() => handleOpenSubmit(assignment)}
                            >
                              Resubmit Work
                            </Button>
                          )}
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          className="w-full text-xs h-8 bg-[#1D61E7] hover:bg-blue-700 font-semibold rounded-xl"
                          onClick={() => handleOpenSubmit(assignment)}
                        >
                          <Upload className="w-3.5 h-3.5 mr-1.5" /> Submit Work
                        </Button>
                      )}

                      {/* Teacher Grading Action */}
                      {isTeacherOrAdmin && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="text-xs h-8 rounded-xl ml-2"
                          onClick={() => setGradingAssignment(assignment)}
                        >
                          Review & Grade
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* =========================================================================
          STUDENT SUBMIT / RESUBMIT DIALOG WITH REAL FILE UPLOADS
      ========================================================================= */}
      <Dialog open={submissionModalOpen} onOpenChange={setSubmissionModalOpen}>
        <DialogContent className="max-w-lg bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {submissions[selectedAssignment?.id || ''] ? 'Resubmit Coursework' : 'Submit Coursework'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {selectedAssignment?.title} ({selectedAssignment?.subject})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Written Solution */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">Written Response / Notes (Optional)</Label>
              <Textarea
                placeholder="Enter your answers, case notes, or clinical discussion..."
                value={submissionText}
                onChange={(e) => setSubmissionText(e.target.value)}
                className="min-h-[120px] text-xs resize-none rounded-xl bg-slate-50"
              />
            </div>

            {/* File Upload Section (PDF, Images, Word Docs) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">
                Upload File (PDF, Images, Documents)
              </Label>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                className="hidden"
              />

              {uploadedFile ? (
                <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-2.5 truncate">
                    <FileText className="w-5 h-5 text-[#1D61E7] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{uploadedFile.name}</p>
                      <p className="text-[10px] text-slate-500">{uploadedFile.size}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setUploadedFile(null);
                      setAttachmentUrl('');
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-[#1D61E7] hover:bg-blue-50/20 rounded-xl p-4 text-center cursor-pointer transition-colors space-y-1.5"
                >
                  <FileUp className="w-6 h-6 text-slate-400 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700">Click to upload file</p>
                  <p className="text-[10px] text-slate-400">Supported formats: PDF, JPG, PNG, DOC (up to 15 MB)</p>
                </div>
              )}
            </div>

            {/* Or Reference Link */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-800">Or External Document / Drive Link (Optional)</Label>
              <Input
                placeholder="https://drive.google.com/... or https://dropbox.com/..."
                value={attachmentUrl.startsWith('data:') ? '' : attachmentUrl}
                onChange={(e) => {
                  setAttachmentUrl(e.target.value);
                  if (e.target.value) setUploadedFile(null);
                }}
                className="text-xs h-9 rounded-xl bg-slate-50"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSubmissionModalOpen(false)}
              disabled={isSubmitting}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitAssignment}
              disabled={isSubmitting}
              className="rounded-xl text-xs bg-[#1D61E7] hover:bg-blue-700 font-bold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Submitting...
                </>
              ) : (
                <>Confirm & Hand In</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          VIEW SUBMISSION DIALOG
      ========================================================================= */}
      <Dialog 
        open={!!viewSubmissionAssignment} 
        onOpenChange={(open) => !open && setViewSubmissionAssignment(null)}
      >
        <DialogContent className="max-w-lg bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Your Submitted Work
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {viewSubmissionAssignment?.title} ({viewSubmissionAssignment?.subject})
            </DialogDescription>
          </DialogHeader>

          {viewSubmissionAssignment && submissions[viewSubmissionAssignment.id] && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1 border border-slate-200">
                <div className="text-[11px] font-semibold text-slate-500">Submission Timestamp</div>
                <div className="text-slate-800 font-medium">
                  {new Date(submissions[viewSubmissionAssignment.id].submitted_at || '').toLocaleString()}
                </div>
              </div>

              {submissions[viewSubmissionAssignment.id].score !== null && 
               submissions[viewSubmissionAssignment.id].score !== undefined && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                  <div className="text-[11px] font-semibold text-emerald-800">Assigned Score</div>
                  <div className="text-base font-bold text-emerald-900">
                    {submissions[viewSubmissionAssignment.id].score} / 100
                  </div>
                  {submissions[viewSubmissionAssignment.id].feedback && (
                    <p className="text-emerald-700 italic pt-1">
                      "{submissions[viewSubmissionAssignment.id].feedback}"
                    </p>
                  )}
                </div>
              )}

              {submissions[viewSubmissionAssignment.id].submission_text && (
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-slate-900">Submitted Response Text</div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed text-slate-700">
                    {submissions[viewSubmissionAssignment.id].submission_text}
                  </div>
                </div>
              )}

              {submissions[viewSubmissionAssignment.id].attachment_url && (
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-slate-900">Attached File / Document</div>
                  {submissions[viewSubmissionAssignment.id].attachment_url?.startsWith('data:') ? (
                    <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-slate-800 font-medium">
                        <FileText className="w-4 h-4 text-[#1D61E7]" />
                        <span>Submitted Document Attachment</span>
                      </div>
                      <a
                        href={submissions[viewSubmissionAssignment.id].attachment_url}
                        download={`assignment-${viewSubmissionAssignment.title.replace(/\s+/g, '_')}`}
                        className="text-xs font-bold text-[#1D61E7] hover:underline"
                      >
                        Download File
                      </a>
                    </div>
                  ) : (
                    <a
                      href={submissions[viewSubmissionAssignment.id].attachment_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center space-x-1.5 text-[#1D61E7] hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="truncate max-w-sm">
                        {submissions[viewSubmissionAssignment.id].attachment_url}
                      </span>
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              size="sm"
              onClick={() => setViewSubmissionAssignment(null)}
              className="rounded-xl text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          TEACHER GRADING DIALOG
      ========================================================================= */}
      <Dialog 
        open={!!gradingAssignment} 
        onOpenChange={(open) => !open && setGradingAssignment(null)}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Student Submissions & Grading
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {gradingAssignment?.title} ({gradingAssignment?.subject})
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-2 text-xs">
            {gradingAssignment && (() => {
              const subs = allSubmissionsList.filter(s => s.assignment_id === gradingAssignment.id);
              if (subs.length === 0) {
                return (
                  <div className="text-center py-8 text-slate-400">
                    No students have submitted coursework for this assignment yet.
                  </div>
                );
              }

              return subs.map((sub) => (
                <div key={sub.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-900 text-sm">{sub.student_name}</div>
                      <div className="text-slate-500 text-[11px]">
                        Submitted: {new Date(sub.submitted_at || '').toLocaleString()}
                      </div>
                    </div>
                    <Badge variant={sub.status === 'graded' ? 'default' : 'secondary'} className="capitalize text-xs">
                      {sub.status || 'submitted'}
                    </Badge>
                  </div>

                  {sub.submission_text && (
                    <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
                      {sub.submission_text}
                    </div>
                  )}

                  {sub.attachment_url && (
                    <div className="p-2 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 text-xs text-slate-700">
                        <Paperclip className="w-3.5 h-3.5 text-[#1D61E7]" />
                        <span>Student Attached File</span>
                      </div>
                      <a
                        href={sub.attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        download={sub.attachment_url.startsWith('data:') ? 'student-submission' : undefined}
                        className="inline-flex items-center space-x-1 text-[#1D61E7] hover:underline text-xs font-semibold"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open / Download Attachment</span>
                      </a>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200">
                    <div className="sm:col-span-1 space-y-1">
                      <Label className="text-[11px] font-medium text-slate-700">Score (0-100)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        className="h-8 text-xs rounded-lg"
                        value={gradingScores[sub.id] ?? (sub.score ?? 85)}
                        onChange={(e) => setGradingScores(prev => ({ ...prev, [sub.id]: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-[11px] font-medium text-slate-700">Feedback / Remarks</Label>
                      <Input
                        placeholder="Instructor remarks..."
                        className="h-8 text-xs rounded-lg"
                        value={gradingFeedbacks[sub.id] ?? (sub.feedback ?? '')}
                        onChange={(e) => setGradingFeedbacks(prev => ({ ...prev, [sub.id]: e.target.value }))}
                      />
                    </div>
                    <div className="sm:col-span-1 flex items-end">
                      <Button
                        size="sm"
                        className="w-full h-8 text-xs rounded-lg bg-[#1D61E7] hover:bg-blue-700 font-bold"
                        disabled={savingGradeId === sub.id}
                        onClick={async () => {
                          const sc = gradingScores[sub.id] ?? (sub.score ?? 85);
                          const fb = gradingFeedbacks[sub.id] ?? (sub.feedback ?? '');
                          if (sc < 0 || sc > 100) {
                            toast({ title: 'Invalid Score', description: 'Score must be between 0 and 100.', variant: 'destructive' });
                            return;
                          }
                          setSavingGradeId(sub.id);
                          try {
                            const success = await db.gradeAssignmentSubmission(sub.id, sc, fb);
                            if (success) {
                              toast({ title: 'Grade Saved', description: `Recorded score of ${sc}/100.` });
                              await loadData();
                            }
                          } catch (err: any) {
                            toast({ title: 'Grading Error', description: err.message, variant: 'destructive' });
                          } finally {
                            setSavingGradeId(null);
                          }
                        }}
                      >
                        {savingGradeId === sub.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Grade'}
                      </Button>
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setGradingAssignment(null)} className="rounded-xl text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
