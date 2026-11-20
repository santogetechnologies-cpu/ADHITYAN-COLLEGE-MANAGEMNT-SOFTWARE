import { resolveDocumentUrl } from '@/lib/privateDocs';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { actionsFor, STATUS_STYLE, type AdmissionAction, type AdmissionStatus } from '@/lib/admissionWorkflow';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText, 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  GraduationCap, 
  Eye, 
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Loader2
} from 'lucide-react';

interface ApplicationDetailsDialogProps {
  application: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Runs a pipeline action. Resolves true on success, false when the server refused (the page shows the reason). */
  onAction: (application: any, action: AdmissionAction, remarks?: string) => Promise<boolean>;
}

export const ApplicationDetailsDialog = ({ 
  application, 
  open, 
  onOpenChange, 
  onAction 
}: ApplicationDetailsDialogProps) => {
  const [remarks, setRemarks] = useState('');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ name: string; url: string } | null>(null);
  const { toast } = useToast();

  if (!application) return null;

  const run = async (action: AdmissionAction) => {
    if (action.reasonRequired && !remarks.trim()) {
      toast({ title: 'A reason is required', description: `Enter the reason in the remarks box to ${action.label.toLowerCase()}.`, variant: 'destructive' });
      return;
    }
    if (action.confirm && !window.confirm(action.confirm)) return;
    setBusyAction(action.id);
    const ok = await onAction(application, action, remarks.trim() || undefined);
    setBusyAction(null);
    if (ok) {
      setRemarks('');
      onOpenChange(false);
    }
  };

  const getStatusBadge = (status: string) => (
    <Badge variant="outline" className={`${STATUS_STYLE[status as AdmissionStatus] ?? STATUS_STYLE.Submitted} flex items-center gap-1`}>
      {status === 'Enrolled' || status === 'Approved' ? <CheckCircle2 className="w-3 h-3" /> : status === 'Rejected' || status === 'Cancelled' ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
      {status}
    </Badge>
  );

  const studentId = application.studentId || application.student_id || application.applicationId;
  const docsList: any[] = Array.isArray(application.documents) ? application.documents : [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[92vh] overflow-y-auto p-6">
          <DialogHeader className="pb-3 border-b">
            <div className="flex items-start justify-between gap-2">
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  {application.name || 'Candidate Application'}
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Application ID: <span className="font-mono font-semibold">{application.applicationId}</span> • Submitted: {application.date || 'Recent'}
                </DialogDescription>
              </div>
              <div className="shrink-0">
                {getStatusBadge(application.status)}
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-5 pt-1">
            {/* MANUAL STUDENT ID BANNER */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground block">
                  Assigned Permanent Student ID
                </span>
                <span className="font-mono text-sm font-bold text-foreground">
                  {studentId || 'Pending Staff Assignment'}
                </span>
              </div>
              <Badge variant="outline" className="text-xs bg-white dark:bg-slate-950 font-medium">
                Manual Staff Entry
              </Badge>
            </div>

            {/* Candidate & Contact Details */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">
                Candidate Information
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground block">Full Name:</span>
                  <span className="font-semibold text-foreground">{application.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Email Address:</span>
                  <span className="font-semibold text-foreground truncate block">{application.email || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Mobile Phone:</span>
                  <span className="font-semibold text-foreground">{application.phone || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Date of Birth:</span>
                  <span className="font-semibold text-foreground">{application.dateOfBirth || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Previous Institution:</span>
                  <span className="font-semibold text-foreground">{application.previousSchool || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Residential Address:</span>
                  <span className="font-semibold text-foreground truncate block">{application.address || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Parent / Guardian Information */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">
                Parent / Guardian Information
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground block">Parent Name:</span>
                  <span className="font-semibold text-foreground">{application.parentName || 'Guardian'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Parent Phone:</span>
                  <span className="font-semibold text-foreground">{application.parentPhone || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Parent Email:</span>
                  <span className="font-semibold text-foreground">{application.parentEmail || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Program / Course Applied */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">
                Applied Paramedical Program
              </h4>
              <div className="p-3 bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-blue-950 dark:text-blue-100 block">
                    {application.class || 'Paramedical Sciences'}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Paramedical & Allied Healthcare Sciences
                  </span>
                </div>
                <Badge variant="outline" className="text-[11px] border-blue-200 text-blue-700 dark:text-blue-300">
                  Batch 2026-2027
                </Badge>
              </div>
            </div>

            {/* Uploaded Documents */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">
                Uploaded Candidate Documents ({docsList.length})
              </h4>
              {docsList.length === 0 ? (
                <p className="text-xs text-muted-foreground italic p-2 bg-muted/30 rounded-lg">
                  No digital document uploads recorded with this application.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {docsList.map((doc, idx) => (
                    <div 
                      key={idx} 
                      className="p-2.5 rounded-lg border bg-card flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                        <div className="min-w-0">
                          <span className="font-semibold block truncate">{doc.type || doc.document_type || 'Certificate'}</span>
                          <span className="text-[10px] text-muted-foreground block truncate">{doc.file_name || doc.document_name || 'Attached Document'}</span>
                        </div>
                      </div>

                      {(doc.file_url || doc.document_url) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try { setPreviewDoc({ name: doc.type || 'Document Preview', url: await resolveDocumentUrl(doc.file_url || doc.document_url) }); }
                            catch (e: any) { toast({ title: 'Cannot open the document', description: e.message, variant: 'destructive' }); }
                          }}
                          className="h-7 px-2 text-[11px] shrink-0"
                        >
                          <Eye className="h-3 w-3 mr-1 text-blue-600" /> View
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Approval / Rejection Decision Section */}
            <div className="border-t pt-3 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Administrative Decision & Remarks
              </h4>

              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Remarks for the record. Required when rejecting or cancelling."
                rows={2}
                className="text-xs"
              />

              <div className="p-2.5 bg-muted/40 rounded-lg border text-[11px] text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                <span>
                  <strong>Note:</strong> Approving changes the application status. <strong>Enroll student</strong> creates the permanent student record. Portal login accounts are created separately in Admin User Management.
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-wrap gap-2 justify-between sm:justify-end pt-3 border-t">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>

            {application.status === 'Enrolled' && (
              <Badge className="bg-emerald-600 text-white py-1.5 px-3 text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Enrolled as {studentId}
              </Badge>
            )}
            {actionsFor(application.status).map((action) => (
              <Button
                key={action.id}
                type="button"
                size="sm"
                variant={action.tone === 'danger' ? 'destructive' : action.tone === 'neutral' ? 'outline' : 'default'}
                disabled={busyAction !== null}
                onClick={() => run(action)}
                className={`font-semibold text-xs ${action.tone === 'primary' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
              >
                {busyAction === action.id ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}
                {action.label}
              </Button>
            ))}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DOCUMENT PREVIEW DIALOG */}
      {previewDoc && (
        <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
          <DialogContent className="max-w-3xl max-h-[85vh] p-4 flex flex-col">
            <DialogHeader className="pb-2 border-b">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Eye className="h-4 w-4 text-blue-600" />
                {previewDoc.name}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto p-2 flex items-center justify-center min-h-[350px]">
              {previewDoc.url.startsWith('data:application/pdf') || previewDoc.url.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={previewDoc.url}
                  className="w-full h-[500px] rounded-lg border"
                  title="PDF Document Preview"
                />
              ) : (
                <img
                  src={previewDoc.url}
                  alt={previewDoc.name}
                  className="max-h-[500px] w-auto object-contain rounded-lg shadow-sm border"
                />
              )}
            </div>
            <div className="flex justify-end pt-2 border-t">
              <Button size="sm" variant="outline" onClick={() => setPreviewDoc(null)}>
                Close Preview
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
