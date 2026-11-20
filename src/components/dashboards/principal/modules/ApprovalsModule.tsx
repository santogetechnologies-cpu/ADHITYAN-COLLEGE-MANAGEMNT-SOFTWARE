import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2, 
  GraduationCap, 
  DollarSign, 
  UserCheck, 
  Award, 
  Building2,
  Calendar,
  Eye,
  FileText
} from 'lucide-react';
import { 
  StaffLeaveApplication, 
  ScholarshipApplication, 
  AdmissionApplication, 
  Certificate 
} from '@/types/database.types';

interface ApprovalsModuleProps {
  leaves: StaffLeaveApplication[];
  scholarships: ScholarshipApplication[];
  admissions: AdmissionApplication[];
  certificates: Certificate[];
  actionLoadingId: string | null;
  onApproveLeave: (id: string) => void;
  onRejectLeave: (id: string, reason: string) => void;
  onApproveScholarshipDirect: (id: string) => void;
  onGrantScholarship: (id: string, amount: number) => void;
  onRejectScholarship: (id: string) => void;
  onApproveAdmission: (app: AdmissionApplication) => void;
  onRejectAdmission: (id: string, reason?: string) => void;
  onApproveCertificate: (id: string) => void;
  onRejectCertificate: (id: string) => void;
}

export function ApprovalsModule({
  leaves,
  scholarships,
  admissions,
  certificates,
  actionLoadingId,
  onApproveLeave,
  onRejectLeave,
  onApproveScholarshipDirect,
  onGrantScholarship,
  onRejectScholarship,
  onApproveAdmission,
  onRejectAdmission,
  onApproveCertificate,
  onRejectCertificate,
}: ApprovalsModuleProps) {
  const [activeTab, setActiveTab] = useState<'leaves' | 'scholarships' | 'admissions' | 'certificates'>('leaves');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'all'>('pending');

  // Leave Rejection Modal
  const [rejectLeaveOpen, setRejectLeaveOpen] = useState(false);
  const [selectedLeaveId, setSelectedLeaveId] = useState<string | null>(null);
  const [leaveRejectionReason, setLeaveRejectionReason] = useState('');

  // Scholarship Grant Modal
  const [sanctionModalOpen, setSanctionModalOpen] = useState(false);
  const [selectedScholarship, setSelectedScholarship] = useState<ScholarshipApplication | null>(null);
  const [sanctionAmount, setSanctionAmount] = useState<number>(0);

  // Admission Reject Modal
  const [rejectAdmissionOpen, setRejectAdmissionOpen] = useState(false);
  const [selectedAdmissionId, setSelectedAdmissionId] = useState<string | null>(null);
  const [admissionRejectReason, setAdmissionRejectReason] = useState('');

  // Pending counts
  const pendingLeaves = useMemo(() => leaves.filter(l => l.status === 'Pending_Principal' || l.status === 'Pending_HOD'), [leaves]);
  const pendingScholarships = useMemo(() => scholarships.filter(s => s.status === 'Submitted' || s.status === 'Recommended_HOD' || s.status === 'Verified_Accounts'), [scholarships]);
  const pendingAdmissions = useMemo(() => admissions.filter(a => a.status === 'Submitted' || a.status === 'Under Review'), [admissions]);
  const pendingCertificates = useMemo(() => certificates.filter(c => c.status === 'Pending'), [certificates]);

  const totalPending = pendingLeaves.length + pendingScholarships.length + pendingAdmissions.length + pendingCertificates.length;

  const handleOpenRejectLeave = (id: string) => {
    setSelectedLeaveId(id);
    setLeaveRejectionReason('');
    setRejectLeaveOpen(true);
  };

  const handleConfirmRejectLeave = () => {
    if (selectedLeaveId) {
      onRejectLeave(selectedLeaveId, leaveRejectionReason);
      setRejectLeaveOpen(false);
      setSelectedLeaveId(null);
    }
  };

  const handleOpenSanctionScholarship = (sch: ScholarshipApplication) => {
    setSelectedScholarship(sch);
    setSanctionAmount(sch.requested_amount || 0);
    setSanctionModalOpen(true);
  };

  const handleConfirmSanctionScholarship = () => {
    if (selectedScholarship) {
      onGrantScholarship(selectedScholarship.id, sanctionAmount);
      setSanctionModalOpen(false);
      setSelectedScholarship(null);
    }
  };

  const handleOpenRejectAdmission = (id: string) => {
    setSelectedAdmissionId(id);
    setAdmissionRejectReason('');
    setRejectAdmissionOpen(true);
  };

  const handleConfirmRejectAdmission = () => {
    if (selectedAdmissionId) {
      onRejectAdmission(selectedAdmissionId, admissionRejectReason);
      setRejectAdmissionOpen(false);
      setSelectedAdmissionId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Principal Approvals Command Desk
            </h2>
            <Badge 
              variant="outline" 
              className={`text-xs ${totalPending > 0 ? 'border-amber-200 text-amber-700 bg-amber-50' : 'border-emerald-200 text-emerald-700 bg-emerald-50'}`}
            >
              {totalPending} Pending Approvals
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Centralized institutional sanction queue for faculty leaves, scholarships, candidate admissions, and certificates.
          </p>
        </div>

        <div className="flex rounded-md border border-slate-200 p-0.5 bg-slate-50">
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${
              statusFilter === 'pending' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending ({totalPending})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${
              statusFilter === 'all' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Historical
          </button>
        </div>
      </div>

      {/* 2. Approvals Tabs */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 h-9 bg-slate-100 p-0.5 rounded-lg">
          <TabsTrigger value="leaves" className="text-xs data-[state=active]:bg-white flex items-center justify-center space-x-1.5">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Faculty Leaves</span>
            {pendingLeaves.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                {pendingLeaves.length}
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger value="scholarships" className="text-xs data-[state=active]:bg-white flex items-center justify-center space-x-1.5">
            <DollarSign className="w-3.5 h-3.5" />
            <span>Scholarships</span>
            {pendingScholarships.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                {pendingScholarships.length}
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger value="admissions" className="text-xs data-[state=active]:bg-white flex items-center justify-center space-x-1.5">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Admissions</span>
            {pendingAdmissions.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">
                {pendingAdmissions.length}
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger value="certificates" className="text-xs data-[state=active]:bg-white flex items-center justify-center space-x-1.5">
            <Award className="w-3.5 h-3.5" />
            <span>Certificates</span>
            {pendingCertificates.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">
                {pendingCertificates.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: FACULTY LEAVES */}
        <TabsContent value="leaves" className="mt-4">
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="py-3 px-4 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900">Faculty Leave Applications</CardTitle>
              <CardDescription className="text-xs">
                Requires Principal sanction before leaves take effect on teaching timetables.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {(() => {
                const list = statusFilter === 'pending' ? pendingLeaves : leaves;
                if (list.length === 0) {
                  return (
                    <div className="p-8 text-center">
                      <GraduationCap className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-700">No Faculty Leave Applications</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {statusFilter === 'pending' ? 'All pending faculty leave requests are currently cleared.' : 'No historical leave applications recorded.'}
                      </p>
                    </div>
                  );
                }
                return (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/75 text-[11px]">
                          <TableHead className="font-semibold text-slate-700">Faculty / Department</TableHead>
                          <TableHead className="font-semibold text-slate-700">Leave Type</TableHead>
                          <TableHead className="font-semibold text-slate-700">Duration</TableHead>
                          <TableHead className="font-semibold text-slate-700">Reason</TableHead>
                          <TableHead className="font-semibold text-slate-700">Status</TableHead>
                          <TableHead className="font-semibold text-slate-700 text-right">Principal Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {list.map(l => {
                          const isPending = l.status === 'Pending_Principal' || l.status === 'Pending_HOD';
                          const isLoading = actionLoadingId === l.id;
                          return (
                            <TableRow key={l.id} className="text-xs">
                              <TableCell>
                                <span className="font-semibold text-slate-900 block">{l.staff_name}</span>
                                <span className="text-[10px] text-muted-foreground">{l.department}</span>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px] bg-slate-50">{l.leave_type}</Badge>
                              </TableCell>
                              <TableCell>
                                <span className="font-medium text-slate-700 block">{l.total_days} Day(s)</span>
                                <span className="text-[10px] text-muted-foreground">{l.start_date} to {l.end_date}</span>
                              </TableCell>
                              <TableCell>
                                <span className="text-slate-600 line-clamp-1 max-w-[200px]">{l.reason}</span>
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant="outline" 
                                  className={`text-[10px] ${
                                    l.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    l.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                    'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}
                                >
                                  {l.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {isPending ? (
                                  <div className="flex items-center justify-end space-x-1.5">
                                    <Button
                                      size="sm"
                                      className="h-7 px-2.5 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                                      disabled={isLoading}
                                      onClick={() => onApproveLeave(l.id)}
                                    >
                                      {isLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                                      Approve
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 px-2 text-[11px] text-rose-600 border-rose-200 hover:bg-rose-50"
                                      disabled={isLoading}
                                      onClick={() => handleOpenRejectLeave(l.id)}
                                    >
                                      <XCircle className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-muted-foreground italic">Processed</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: SCHOLARSHIPS */}
        <TabsContent value="scholarships" className="mt-4">
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="py-3 px-4 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900">Scholarship & Fee Concession Applications</CardTitle>
              <CardDescription className="text-xs">
                Authorizes financial fee concessions and institution aid disbursements.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {(() => {
                const list = statusFilter === 'pending' ? pendingScholarships : scholarships;
                if (list.length === 0) {
                  return (
                    <div className="p-8 text-center">
                      <DollarSign className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-700">No Scholarship Applications</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {statusFilter === 'pending' ? 'All scholarship and fee concession claims are reviewed.' : 'No scholarship records in database.'}
                      </p>
                    </div>
                  );
                }
                return (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/75 text-[11px]">
                          <TableHead className="font-semibold text-slate-700">Student / Dept</TableHead>
                          <TableHead className="font-semibold text-slate-700">Scheme Name</TableHead>
                          <TableHead className="font-semibold text-slate-700">Requested / Sanctioned</TableHead>
                          <TableHead className="font-semibold text-slate-700">Status</TableHead>
                          <TableHead className="font-semibold text-slate-700 text-right">Principal Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {list.map(s => {
                          const isPending = s.status === 'Submitted' || s.status === 'Recommended_HOD' || s.status === 'Verified_Accounts';
                          const isLoading = actionLoadingId === s.id;
                          return (
                            <TableRow key={s.id} className="text-xs">
                              <TableCell>
                                <span className="font-semibold text-slate-900 block">{s.student_name}</span>
                                <span className="text-[10px] text-muted-foreground">{s.department} • {s.roll_number || s.student_id}</span>
                              </TableCell>
                              <TableCell>
                                <span className="font-medium text-slate-800">{s.scholarship_name}</span>
                              </TableCell>
                              <TableCell>
                                <span className="font-semibold text-slate-900 block">₹{Number(s.requested_amount || 0).toLocaleString()}</span>
                                {s.sanctioned_amount > 0 && (
                                  <span className="text-[10px] text-emerald-600">Sanctioned: ₹{Number(s.sanctioned_amount).toLocaleString()}</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant="outline" 
                                  className={`text-[10px] ${
                                    s.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    s.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                    'bg-blue-50 text-blue-700 border-blue-200'
                                  }`}
                                >
                                  {s.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {isPending ? (
                                  <div className="flex items-center justify-end space-x-1.5">
                                    <Button
                                      size="sm"
                                      className="h-7 px-2.5 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                                      disabled={isLoading}
                                      onClick={() => handleOpenSanctionScholarship(s)}
                                    >
                                      {isLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <DollarSign className="w-3 h-3 mr-1" />}
                                      Grant Aid
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 px-2 text-[11px] text-rose-600 border-rose-200 hover:bg-rose-50"
                                      disabled={isLoading}
                                      onClick={() => onRejectScholarship(s.id)}
                                    >
                                      <XCircle className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-muted-foreground italic">Processed</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: ADMISSIONS */}
        <TabsContent value="admissions" className="mt-4">
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="py-3 px-4 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900">Paramedical Candidate Sanctions</CardTitle>
              <CardDescription className="text-xs">
                Authorizes final admission and triggers student profile & credentials generation.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {(() => {
                const list = statusFilter === 'pending' ? pendingAdmissions : admissions;
                if (list.length === 0) {
                  return (
                    <div className="p-8 text-center">
                      <UserCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-700">No Admission Applications</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {statusFilter === 'pending' ? 'All pending candidate admissions are sanctioned.' : 'No admission records found.'}
                      </p>
                    </div>
                  );
                }
                return (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/75 text-[11px]">
                          <TableHead className="font-semibold text-slate-700">Candidate / ID</TableHead>
                          <TableHead className="font-semibold text-slate-700">Applied Program</TableHead>
                          <TableHead className="font-semibold text-slate-700">Parent / Mobile</TableHead>
                          <TableHead className="font-semibold text-slate-700">Status</TableHead>
                          <TableHead className="font-semibold text-slate-700 text-right">Principal Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {list.map(a => {
                          const isPending = a.status === 'Submitted' || a.status === 'Under Review';
                          const isLoading = actionLoadingId === a.id;
                          return (
                            <TableRow key={a.id} className="text-xs">
                              <TableCell>
                                <span className="font-semibold text-slate-900 block">{a.applicant_name || a.name}</span>
                                <span className="text-[10px] text-muted-foreground">{a.application_number || a.application_no || a.id.slice(0, 8)}</span>
                              </TableCell>
                              <TableCell>
                                <span className="font-medium text-slate-800">{a.class_name || a.class_applied || 'Paramedical Sciences'}</span>
                              </TableCell>
                              <TableCell>
                                <span className="text-slate-800 block">{a.parent_name || '—'}</span>
                                <span className="text-[10px] text-muted-foreground">{a.phone}</span>
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant="outline" 
                                  className={`text-[10px] ${
                                    a.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    a.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                    'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  }`}
                                >
                                  {a.status === 'Approved' ? 'Sanctioned' : a.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {isPending ? (
                                  <div className="flex items-center justify-end space-x-1.5">
                                    <Button
                                      size="sm"
                                      className="h-7 px-2.5 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                                      disabled={isLoading}
                                      onClick={() => onApproveAdmission(a)}
                                    >
                                      {isLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                                      Sanction
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 px-2 text-[11px] text-rose-600 border-rose-200 hover:bg-rose-50"
                                      disabled={isLoading}
                                      onClick={() => handleOpenRejectAdmission(a.id)}
                                    >
                                      <XCircle className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-muted-foreground italic">Processed</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: CERTIFICATES */}
        <TabsContent value="certificates" className="mt-4">
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="py-3 px-4 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900">Student Institutional Certificates</CardTitle>
              <CardDescription className="text-xs">
                Authorizes Bonafide, Study, Character, and Course Completion certificates.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {(() => {
                const list = statusFilter === 'pending' ? pendingCertificates : certificates;
                if (list.length === 0) {
                  return (
                    <div className="p-8 text-center">
                      <Award className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-700">No Certificate Applications</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {statusFilter === 'pending' ? 'All student certificate requests are cleared.' : 'No certificates recorded.'}
                      </p>
                    </div>
                  );
                }
                return (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/75 text-[11px]">
                          <TableHead className="font-semibold text-slate-700">Student</TableHead>
                          <TableHead className="font-semibold text-slate-700">Certificate Type</TableHead>
                          <TableHead className="font-semibold text-slate-700">Purpose</TableHead>
                          <TableHead className="font-semibold text-slate-700">Issue Date</TableHead>
                          <TableHead className="font-semibold text-slate-700">Status</TableHead>
                          <TableHead className="font-semibold text-slate-700 text-right">Principal Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {list.map(c => {
                          const isPending = c.status === 'Pending';
                          const isLoading = actionLoadingId === c.id;
                          return (
                            <TableRow key={c.id} className="text-xs">
                              <TableCell>
                                <span className="font-semibold text-slate-900 block">{c.student_name}</span>
                                <span className="text-[10px] text-muted-foreground">{c.roll_number || c.student_id}</span>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px] bg-slate-50 font-medium">
                                  {c.certificate_type}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span className="text-slate-600 line-clamp-1 max-w-[200px]">{c.purpose || 'Institutional Verification'}</span>
                              </TableCell>
                              <TableCell>
                                <span className="text-slate-700">{c.issue_date || 'Immediate'}</span>
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant="outline" 
                                  className={`text-[10px] ${
                                    c.status === 'Approved' || c.status === 'Issued' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    c.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                    'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}
                                >
                                  {c.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {isPending ? (
                                  <div className="flex items-center justify-end space-x-1.5">
                                    <Button
                                      size="sm"
                                      className="h-7 px-2.5 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                                      disabled={isLoading}
                                      onClick={() => onApproveCertificate(c.id)}
                                    >
                                      {isLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                                      Sign & Authorize
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 px-2 text-[11px] text-rose-600 border-rose-200 hover:bg-rose-50"
                                      disabled={isLoading}
                                      onClick={() => onRejectCertificate(c.id)}
                                    >
                                      <XCircle className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-muted-foreground italic">Processed</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL 1: Reject Leave */}
      <Dialog open={rejectLeaveOpen} onOpenChange={setRejectLeaveOpen}>
        <DialogContent className="max-w-sm bg-white p-5 rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900">Decline Faculty Leave</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Provide formal reason for declining this leave application.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              rows={3}
              placeholder="e.g. Inadequate substitute arrangement during scheduled clinical rotations"
              value={leaveRejectionReason}
              onChange={(e) => setLeaveRejectionReason(e.target.value)}
              className="text-xs"
            />
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setRejectLeaveOpen(false)} className="h-8 text-xs">
              Cancel
            </Button>
            <Button size="sm" variant="destructive" onClick={handleConfirmRejectLeave} className="h-8 text-xs">
              Decline Leave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Sanction Scholarship */}
      <Dialog open={sanctionModalOpen} onOpenChange={setSanctionModalOpen}>
        {selectedScholarship && (
          <DialogContent className="max-w-sm bg-white p-5 rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-slate-900">Sanction Institutional Aid</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Sanction concession for {selectedScholarship.student_name} ({selectedScholarship.department}).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-muted-foreground block text-[11px]">Requested Amount:</span>
                <span className="font-bold text-sm text-slate-900">₹{Number(selectedScholarship.requested_amount || 0).toLocaleString()}</span>
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Authorized Sanction Amount (₹) *</label>
                <Input
                  type="number"
                  min={1}
                  max={selectedScholarship.requested_amount || 100000}
                  value={sanctionAmount}
                  onChange={(e) => setSanctionAmount(Number(e.target.value))}
                  className="h-8 text-xs font-semibold"
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button variant="outline" size="sm" onClick={() => setSanctionModalOpen(false)} className="h-8 text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={handleConfirmSanctionScholarship} className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                Authorize Sanction
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* MODAL 3: Reject Admission */}
      <Dialog open={rejectAdmissionOpen} onOpenChange={setRejectAdmissionOpen}>
        <DialogContent className="max-w-sm bg-white p-5 rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900">Decline Candidate Admission</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Official grounds for declining admission.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder="e.g. Minimum qualifying prerequisite not satisfied"
              value={admissionRejectReason}
              onChange={(e) => setAdmissionRejectReason(e.target.value)}
              className="text-xs h-9"
            />
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setRejectAdmissionOpen(false)} className="h-8 text-xs">
              Cancel
            </Button>
            <Button size="sm" variant="destructive" onClick={handleConfirmRejectAdmission} className="h-8 text-xs">
              Decline Admission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
