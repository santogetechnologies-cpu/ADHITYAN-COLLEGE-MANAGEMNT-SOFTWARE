import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { ComprehensiveAdmissionDialog } from '@/components/admission/ComprehensiveAdmissionDialog';
import { ApplicationDetailsDialog } from '@/components/admission/ApplicationDetailsDialog';
import { FileText, User, Eye, Loader2, UserPlus, Search, Sparkles, CheckCircle2 } from 'lucide-react';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { db } from '@/services/supabase/database';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { actionsFor, PENDING_STATUSES, AWAITING_ENROLMENT, STATUS_STYLE, type AdmissionAction, type AdmissionStatus } from '@/lib/admissionWorkflow';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, Wallet } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FeeReceiptModal } from '@/components/shared/FeeReceiptModal';
import { askConfirm, askText } from '@/lib/dialogs';

export const ApplicationPortal = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [admissionDialogOpen, setAdmissionDialogOpen] = useState(false);

  // Search & Status Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'enrolled' | 'rejected'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // reject / cancel need a reason before they run
  const [reasonFor, setReasonFor] = useState<{ app: any; action: AdmissionAction } | null>(null);
  const [reasonText, setReasonText] = useState('');
  // admission deposit (counter payment) for an application
  const [depositFor, setDepositFor] = useState<any>(null);
  const [deposit, setDeposit] = useState({ amount: '', mode: 'Cash', reference: '' });
  const [depositBusy, setDepositBusy] = useState(false);
  const depositKeyRef = useRef<string>(crypto.randomUUID());
  const [receipt, setReceipt] = useState<any>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const loadApplications = useCallback(async () => {
    try {
      const data = await db.getAdmissionApplications();
      setApplications((data || []).map((d: any) => ({
        id: d.id,
        name: d.name,
        email: d.email,
        class: d.class_applied || d.class_name,
        status: d.status,
        date: d.submission_date || (d.created_at ? new Date(d.created_at).toISOString().split('T')[0] : '—'),
        applicationId: d.application_no,
        phone: d.phone,
        parentName: d.parent_name,
        parentPhone: d.parent_phone,
        address: d.address,
        previousSchool: d.previous_school,
        dateOfBirth: d.date_of_birth,
        remarks: d.remarks,
        documents: d.documents,
        studentId: d.status === 'Enrolled' ? d.student_id : undefined,
        plannedStudentId: d.student_id,
        route: d.admission_type,
        quota: d.quota,
      })));
      setLoadError(null);
    } catch (err: any) {
      setLoadError(err?.message || 'Could not load applications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  // Real-time synchronization for admission applications across roles
  useRealtimeSubscription({
    table: 'admission_applications',
    onChange: loadApplications,
    onReconnect: loadApplications,
  });

  /** Runs one pipeline action. Resolves true only when the server accepted it. */
  const runAction = async (app: any, action: AdmissionAction, remarks?: string): Promise<boolean> => {
    setBusyId(String(app.id));
    try {
      if (action.enroll) {
        const r = await db.enrollAdmission(String(app.id), { department: app.class, class_name: app.class });
        toast({
          title: r.already_enrolled ? 'Already enrolled' : 'Student enrolled',
          description: `${app.name} is student ${r.student_id}. Create the portal login in Admin User Management when ready.`,
        });
      } else if (action.to) {
        await db.updateAdmissionStatus(String(app.id), action.to, remarks);
        toast({ title: 'Status updated', description: `${app.name}: ${action.to}.` });
      }
      await loadApplications();
      return true;
    } catch (err: any) {
      toast({ title: `Could not ${action.label.toLowerCase()}`, description: err?.message || 'The server refused the change.', variant: 'destructive' });
      await loadApplications();
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const openDeposit = (app: any) => {
    depositKeyRef.current = crypto.randomUUID();
    setDeposit({ amount: '', mode: 'Cash', reference: '' });
    setDepositFor(app);
  };

  const submitDeposit = async () => {
    if (!depositFor || depositBusy) return;
    const amount = Number(deposit.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({ title: 'Check the deposit', description: 'Enter an amount greater than zero.', variant: 'destructive' });
      return;
    }
    if (deposit.mode !== 'Cash' && deposit.reference.trim().length < 4) {
      toast({ title: 'Reference required', description: 'Enter the transaction reference for a non-cash payment.', variant: 'destructive' });
      return;
    }
    setDepositBusy(true);
    try {
      const r = await db.recordAdmissionDeposit({
        applicationId: String(depositFor.id), amount, paymentMode: deposit.mode,
        reference: deposit.reference.trim() || undefined, idempotencyKey: depositKeyRef.current,
      });
      toast({
        title: r.duplicate ? 'Deposit already recorded' : 'Deposit recorded',
        description: r.duplicate ? 'This payment was saved earlier; nothing was charged twice.' : `₹${amount.toLocaleString('en-IN')} received from ${depositFor.name}.`,
      });
      setDepositFor(null);
      depositKeyRef.current = crypto.randomUUID();
      if (r.receipt) { setReceipt(r.receipt); setReceiptOpen(true); }
    } catch (err: any) {
      // same key is kept: retrying after a timeout cannot double-charge
      toast({ title: 'Deposit not recorded', description: err?.message || 'The server refused the deposit.', variant: 'destructive' });
    } finally {
      setDepositBusy(false);
    }
  };

  const startAction = async (app: any, action: AdmissionAction) => {
    if (action.reasonRequired) {
      setReasonText('');
      setReasonFor({ app, action });
      return;
    }
    if (action.confirm && !(await askConfirm(action.confirm, { title: action.label }))) return;
    void runAction(app, action);
  };

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      // 1. Status filter
      if (statusFilter === 'pending') {
        if (!PENDING_STATUSES.includes(app.status)) return false;
      } else if (statusFilter === 'approved') {
        if (!AWAITING_ENROLMENT.includes(app.status)) return false;
      } else if (statusFilter === 'enrolled') {
        if (app.status !== 'Enrolled') return false;
      } else if (statusFilter === 'rejected') {
        if (app.status !== 'Rejected' && app.status !== 'Cancelled') return false;
      }

      // 2. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (app.name || '').toLowerCase().includes(q);
        const matchesEmail = (app.email || '').toLowerCase().includes(q);
        const matchesPhone = (app.phone || '').includes(q);
        const matchesAppId = (app.applicationId || '').toLowerCase().includes(q);
        const matchesCourse = (app.class || '').toLowerCase().includes(q);
        const matchesParent = (app.parentName || '').toLowerCase().includes(q);
        const matchesStudentId = (app.plannedStudentId || '').toLowerCase().includes(q);
        return matchesName || matchesEmail || matchesPhone || matchesAppId || matchesCourse || matchesParent || matchesStudentId;
      }

      return true;
    });
  }, [applications, statusFilter, searchQuery]);

  const getStatusBadge = (status: string) => (
    <Badge variant="outline" className={STATUS_STYLE[status as AdmissionStatus] ?? STATUS_STYLE.Submitted}>{status}</Badge>
  );

  const count = (pred: (a: any) => boolean) => applications.filter(pred).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Application Management</h2>
          <p className="text-muted-foreground">Manage and track student admission applications</p>
        </div>
        <Button onClick={() => setAdmissionDialogOpen(true)} className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          <span>New Admission</span>
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <FileText className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">{applications.length}</p>
            <p className="text-sm text-muted-foreground">Total Applications</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <User className="h-8 w-8 mx-auto text-amber-500 mb-2" />
            <p className="text-2xl font-bold">{count(a => PENDING_STATUSES.includes(a.status))}</p>
            <p className="text-sm text-muted-foreground">Pending Review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-600 mb-2" />
            <p className="text-2xl font-bold">{count(a => AWAITING_ENROLMENT.includes(a.status))}</p>
            <p className="text-sm text-muted-foreground">Approved, awaiting enrolment</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <User className="h-8 w-8 mx-auto text-destructive mb-2" />
            <p className="text-2xl font-bold">{count(a => a.status === 'Enrolled')}</p>
            <p className="text-sm text-muted-foreground">Enrolled students</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-lg">Applications Registry</CardTitle>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search student, parent, ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 text-xs h-9"
                />
              </div>
              <div className="flex items-center gap-1 bg-muted p-1 rounded-lg text-xs">
                <Button
                  type="button"
                  size="sm"
                  variant={statusFilter === 'all' ? 'default' : 'ghost'}
                  className="h-7 text-xs px-2.5"
                  onClick={() => setStatusFilter('all')}
                >
                  All ({applications.length})
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={statusFilter === 'pending' ? 'default' : 'ghost'}
                  className="h-7 text-xs px-2.5"
                  onClick={() => setStatusFilter('pending')}
                >
                  Pending ({count(a => PENDING_STATUSES.includes(a.status))})
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={statusFilter === 'approved' ? 'default' : 'ghost'}
                  className="h-7 text-xs px-2.5"
                  onClick={() => setStatusFilter('approved')}
                >
                  Approved ({count(a => AWAITING_ENROLMENT.includes(a.status))})
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={statusFilter === 'enrolled' ? 'default' : 'ghost'}
                  className="h-7 text-xs px-2.5"
                  onClick={() => setStatusFilter('enrolled')}
                >
                  Enrolled ({count(a => a.status === 'Enrolled')})
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={statusFilter === 'rejected' ? 'default' : 'ghost'}
                  className="h-7 text-xs px-2.5"
                  onClick={() => setStatusFilter('rejected')}
                >
                  Closed ({count(a => a.status === 'Rejected' || a.status === 'Cancelled')})
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Application ID</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Program / Course</TableHead>
                <TableHead>Parent Details</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : loadError ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <p className="text-sm text-destructive flex items-center justify-center gap-1.5"><AlertTriangle className="h-4 w-4" /> {loadError}</p>
                    <Button size="sm" variant="outline" className="mt-3" onClick={() => { setLoading(true); void loadApplications(); }}>Retry</Button>
                  </TableCell>
                </TableRow>
              ) : filteredApplications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {searchQuery.trim() || statusFilter !== 'all'
                      ? 'No applications match the selected criteria.'
                      : 'No applications submitted yet.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredApplications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-mono text-xs font-semibold">{app.applicationId}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-xs">{app.name}</p>
                        <p className="text-[11px] text-muted-foreground">{app.email}</p>
                        {app.phone && <p className="text-[10px] text-muted-foreground">{app.phone}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {app.class}
                      {(app.route || app.quota) && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {app.route && <Badge variant="outline" className="text-[9px] px-1.5 py-0">{app.route}</Badge>}
                          {app.quota && <Badge variant="outline" className="text-[9px] px-1.5 py-0">{app.quota}</Badge>}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <p className="font-medium">{app.parentName || '—'}</p>
                        {app.parentPhone && <p className="text-[10px] text-muted-foreground">{app.parentPhone}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{app.date}</TableCell>
                    <TableCell>{getStatusBadge(app.status)}</TableCell>
                    <TableCell>
                      {app.studentId ? (
                        <p className="text-[11px] font-mono font-semibold text-emerald-700">{app.studentId}</p>
                      ) : (
                        <p className="text-[11px] font-mono text-muted-foreground" title="Becomes the student ID on enrolment">
                          {app.plannedStudentId || '—'} <span className="italic">(not enrolled)</span>
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-1.5">
                        {(() => {
                          const primary = actionsFor(app.status)[0];
                          return primary ? (
                            <Button
                              size="sm"
                              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 shadow-sm"
                              disabled={busyId === String(app.id)}
                              onClick={() => startAction(app, primary)}
                            >
                              {busyId === String(app.id) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                              <span>{primary.label}</span>
                            </Button>
                          ) : null;
                        })()}
                        {app.status !== 'Rejected' && app.status !== 'Cancelled' && (
                          <Button variant="outline" size="sm" className="h-8 text-xs flex items-center gap-1" onClick={() => openDeposit(app)}>
                            <Wallet className="h-3.5 w-3.5" />
                            <span>Deposit</span>
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs flex items-center gap-1"
                          onClick={() => {
                            setSelectedApplication(app);
                            setDetailsDialogOpen(true);
                          }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Review</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ApplicationDetailsDialog
        application={selectedApplication}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        onAction={runAction}
      />

      <ComprehensiveAdmissionDialog
        open={admissionDialogOpen}
        onOpenChange={setAdmissionDialogOpen}
        onSuccess={loadApplications}
      />

      <Dialog open={!!depositFor} onOpenChange={(o) => { if (!o && !depositBusy) setDepositFor(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Collect admission deposit</DialogTitle>
            <DialogDescription>{depositFor?.name} · {depositFor?.plannedStudentId}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Amount (₹) *</Label>
              <Input type="number" min="1" step="0.01" value={deposit.amount} onChange={(e) => setDeposit({ ...deposit, amount: e.target.value })} className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Payment mode</Label>
              <Select value={deposit.mode} onValueChange={(v) => setDeposit({ ...deposit, mode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash at counter</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="Bank_Transfer">Bank transfer</SelectItem>
                  <SelectItem value="Cheque">Cheque / demand draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Transaction reference{deposit.mode !== 'Cash' ? ' *' : ' (optional)'}</Label>
              <Input value={deposit.reference} onChange={(e) => setDeposit({ ...deposit, reference: e.target.value })} maxLength={64} placeholder="UPI ref, UTR, cheque no." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDepositFor(null)} disabled={depositBusy}>Cancel</Button>
            <Button onClick={submitDeposit} disabled={depositBusy} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {depositBusy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Record deposit & issue receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FeeReceiptModal receipt={receipt} open={receiptOpen} onOpenChange={setReceiptOpen} />

      <Dialog open={!!reasonFor} onOpenChange={(o) => { if (!o) setReasonFor(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{reasonFor?.action.label}: {reasonFor?.app.name}</DialogTitle>
            <DialogDescription>A reason is required and is saved in the application history.</DialogDescription>
          </DialogHeader>
          <Textarea value={reasonText} onChange={(e) => setReasonText(e.target.value)} rows={3} placeholder="Reason" maxLength={500} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReasonFor(null)}>Back</Button>
            <Button
              variant="destructive"
              disabled={!reasonText.trim() || busyId !== null}
              onClick={async () => {
                if (!reasonFor) return;
                const ok = await runAction(reasonFor.app, reasonFor.action, reasonText.trim());
                if (ok) setReasonFor(null);
              }}
            >
              {reasonFor?.action.label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
