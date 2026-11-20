import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  UserCheck, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2, 
  Eye, 
  Calendar, 
  Phone, 
  Mail, 
  Building2, 
  School, 
  FileText,
  Filter
} from 'lucide-react';
import { AdmissionApplication, Department } from '@/types/database.types';
import { CustomFieldsViewer } from '@/components/customizer/CustomFieldsViewer';

interface AdmissionsModuleProps {
  admissions: AdmissionApplication[];
  departments: Department[];
  onApproveAdmission: (app: AdmissionApplication) => void;
  onRejectAdmission: (id: string, reason?: string) => void;
  actionLoadingId: string | null;
}

export function AdmissionsModule({
  admissions,
  departments,
  onApproveAdmission,
  onRejectAdmission,
  actionLoadingId
}: AdmissionsModuleProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [selectedApp, setSelectedApp] = useState<AdmissionApplication | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectAppId, setRejectAppId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Statistics
  const stats = useMemo(() => {
    const total = admissions.length;
    const pending = admissions.filter(a => a.status === 'Submitted' || a.status === 'Under Review').length;
    const approved = admissions.filter(a => a.status === 'Approved').length;
    const rejected = admissions.filter(a => a.status === 'Rejected').length;
    return { total, pending, approved, rejected };
  }, [admissions]);

  // Filtered List
  const filteredAdmissions = useMemo(() => {
    return admissions.filter(app => {
      const applicantName = (app.applicant_name || app.name || '').toLowerCase();
      const email = (app.email || '').toLowerCase();
      const phone = (app.phone || '').toLowerCase();
      const appNo = (app.application_number || app.application_no || '').toLowerCase();
      const search = searchTerm.toLowerCase();

      const matchesSearch = !searchTerm || 
        applicantName.includes(search) || 
        email.includes(search) || 
        phone.includes(search) || 
        appNo.includes(search);

      const program = (app.class_name || app.class_applied || '').toLowerCase();
      const matchesDept = deptFilter === 'all' || program.includes(deptFilter.toLowerCase());

      const status = app.status;
      let matchesStatus = true;
      if (statusFilter === 'pending') {
        matchesStatus = status === 'Submitted' || status === 'Under Review';
      } else if (statusFilter === 'approved') {
        matchesStatus = status === 'Approved';
      } else if (statusFilter === 'rejected') {
        matchesStatus = status === 'Rejected';
      }

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [admissions, searchTerm, deptFilter, statusFilter]);

  const handleOpenReject = (id: string) => {
    setRejectAppId(id);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = () => {
    if (rejectAppId) {
      onRejectAdmission(rejectAppId, rejectionReason);
      setRejectModalOpen(false);
      setRejectAppId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & KPI Metrics */}
      <div>
        <div className="flex items-center space-x-2">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Admissions Governance & Sanction Desk
          </h2>
          <Badge variant="outline" className="text-xs border-indigo-200 text-indigo-700 bg-indigo-50">
            Paramedical Admissions
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Review candidate eligibility, grant institutional sanction, and auto-provision student & parent records.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Applications</p>
                <p className="text-xl font-bold text-slate-900 mt-0.5">{stats.total}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/20 shadow-2xs">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-amber-700 uppercase tracking-wider">Pending Sanction</p>
                <p className="text-xl font-bold text-amber-700 mt-0.5">{stats.pending}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-emerald-700 uppercase tracking-wider">Sanctioned & Enrolled</p>
                <p className="text-xl font-bold text-emerald-700 mt-0.5">{stats.approved}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Declined</p>
                <p className="text-xl font-bold text-rose-600 mt-0.5">{stats.rejected}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. Search & Filters */}
      <Card className="border-slate-200 shadow-2xs">
        <CardContent className="p-3.5">
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search by candidate name, application ID, email, or mobile..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs w-full"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="h-8 px-2.5 text-xs border border-slate-200 rounded-md bg-white text-slate-700"
              >
                <option value="all">All Departments / Programs</option>
                {departments.map(d => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>

              <div className="flex rounded-md border border-slate-200 p-0.5 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2 py-1 text-[11px] font-medium rounded-sm transition-colors ${
                    statusFilter === 'all' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({stats.total})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('pending')}
                  className={`px-2 py-1 text-[11px] font-medium rounded-sm transition-colors ${
                    statusFilter === 'pending' ? 'bg-white shadow-xs text-amber-700' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pending ({stats.pending})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('approved')}
                  className={`px-2 py-1 text-[11px] font-medium rounded-sm transition-colors ${
                    statusFilter === 'approved' ? 'bg-white shadow-xs text-emerald-700' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sanctioned ({stats.approved})
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Applications Table */}
      <Card className="border-slate-200 shadow-2xs">
        <CardHeader className="py-3 px-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">
              Paramedical Admission Applications
            </CardTitle>
            <CardDescription className="text-xs">
              Showing {filteredAdmissions.length} of {admissions.length} applicant records
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredAdmissions.length === 0 ? (
            <div className="p-8 text-center">
              <UserCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">No Admission Records Found</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {searchTerm || statusFilter !== 'all' || deptFilter !== 'all' 
                  ? 'Try adjusting your search keywords or filter criteria.' 
                  : 'New admission applications will be listed here in real-time.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/75 hover:bg-slate-50/75 text-[11px]">
                    <TableHead className="font-semibold text-slate-700">Candidate / ID</TableHead>
                    <TableHead className="font-semibold text-slate-700">Applied Program</TableHead>
                    <TableHead className="font-semibold text-slate-700">Parent / Guardian</TableHead>
                    <TableHead className="font-semibold text-slate-700">Contact</TableHead>
                    <TableHead className="font-semibold text-slate-700">Status</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-right">Principal Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAdmissions.map((app) => {
                    const applicantName = app.applicant_name || app.name || 'Unnamed Applicant';
                    const appNo = app.application_number || app.application_no || `APP-${app.id.slice(0, 6).toUpperCase()}`;
                    const program = app.class_name || app.class_applied || 'Paramedical Sciences';
                    const isPending = app.status === 'Submitted' || app.status === 'Under Review';
                    const isLoading = actionLoadingId === app.id;

                    return (
                      <TableRow key={app.id} className="text-xs hover:bg-slate-50/50">
                        <TableCell>
                          <div>
                            <span className="font-semibold text-slate-900 block">{applicantName}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{appNo}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="text-slate-700 font-medium">{program}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-slate-700">{app.parent_name || '—'}</span>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5 text-[11px]">
                            {app.phone && (
                              <div className="flex items-center space-x-1 text-slate-600">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{app.phone}</span>
                              </div>
                            )}
                            {app.email && (
                              <div className="flex items-center space-x-1 text-slate-600">
                                <Mail className="w-3 h-3 text-slate-400" />
                                <span className="truncate max-w-[150px]">{app.email}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={`text-[10px] font-semibold ${
                              app.status === 'Approved'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : app.status === 'Rejected'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {app.status === 'Approved' ? 'Sanctioned' : app.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-[11px]"
                              onClick={() => setSelectedApp(app)}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Dossier
                            </Button>

                            {isPending && (
                              <>
                                <Button
                                  size="sm"
                                  className="h-7 px-2.5 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                                  disabled={isLoading}
                                  onClick={() => onApproveAdmission(app)}
                                >
                                  {isLoading ? (
                                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                  ) : (
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                  )}
                                  Sanction
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 text-[11px] text-rose-600 border-rose-200 hover:bg-rose-50"
                                  disabled={isLoading}
                                  onClick={() => handleOpenReject(app.id)}
                                >
                                  <XCircle className="w-3 h-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Candidate Dossier Dialog */}
      <Dialog open={!!selectedApp} onOpenChange={(open) => !open && setSelectedApp(null)}>
        {selectedApp && (
          <DialogContent className="max-w-md bg-white p-5 rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-primary" />
                <span>Candidate Admission Dossier</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Application #{selectedApp.application_number || selectedApp.application_no || selectedApp.id.slice(0, 8)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg space-y-2 border border-slate-100">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-900 text-sm">
                    {selectedApp.applicant_name || selectedApp.name}
                  </span>
                  <Badge 
                    variant="outline" 
                    className={`text-[10px] ${
                      selectedApp.status === 'Approved'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : selectedApp.status === 'Rejected'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {selectedApp.status}
                  </Badge>
                </div>
                <p className="text-slate-600">
                  <span className="font-medium text-slate-700">Program Applied:</span> {selectedApp.class_name || selectedApp.class_applied || 'Paramedical Sciences'}
                </p>
                {selectedApp.date_of_birth && (
                  <p className="text-slate-600">
                    <span className="font-medium text-slate-700">Date of Birth:</span> {new Date(selectedApp.date_of_birth).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-lg border border-slate-100">
                  <span className="text-muted-foreground block">Email Address</span>
                  <span className="font-medium text-slate-800 break-all">{selectedApp.email}</span>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-100">
                  <span className="text-muted-foreground block">Candidate Phone</span>
                  <span className="font-medium text-slate-800">{selectedApp.phone}</span>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-100">
                  <span className="text-muted-foreground block">Parent / Guardian</span>
                  <span className="font-medium text-slate-800">{selectedApp.parent_name || '—'}</span>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-100">
                  <span className="text-muted-foreground block">Guardian Phone</span>
                  <span className="font-medium text-slate-800">{selectedApp.parent_phone || '—'}</span>
                </div>
              </div>

              {selectedApp.previous_school && (
                <div className="p-2.5 rounded-lg border border-slate-100 text-[11px]">
                  <span className="text-muted-foreground block">Previous Institution & Board</span>
                  <span className="font-medium text-slate-800">{selectedApp.previous_school}</span>
                </div>
              )}

              {selectedApp.address && (
                <div className="p-2.5 rounded-lg border border-slate-100 text-[11px]">
                  <span className="text-muted-foreground block">Residential Address</span>
                  <span className="font-medium text-slate-800">{selectedApp.address}</span>
                </div>
              )}

              {selectedApp.remarks && (
                <div className="p-2.5 rounded-lg bg-amber-50/50 border border-amber-100 text-[11px]">
                  <span className="text-amber-700 font-semibold block">Administrative Remarks</span>
                  <span className="text-slate-700">{selectedApp.remarks}</span>
                </div>
              )}

              {/* Dynamic Custom Institutional Attributes */}
              <CustomFieldsViewer
                customFields={(selectedApp as any).custom_fields}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedApp(null)} className="h-8 text-xs">
                Close Dossier
              </Button>
              {(selectedApp.status === 'Submitted' || selectedApp.status === 'Under Review') && (
                <Button
                  size="sm"
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                  disabled={actionLoadingId === selectedApp.id}
                  onClick={() => {
                    const toApprove = selectedApp;
                    setSelectedApp(null);
                    onApproveAdmission(toApprove);
                  }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Sanction & Enroll
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* 5. Reject Admission Dialog */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="max-w-sm bg-white p-5 rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900">
              Decline Admission Application
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Please enter official grounds for declining this application.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Input
              placeholder="e.g. Ineligible qualifying marks / quota unavailable"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setRejectModalOpen(false)} className="h-8 text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="h-8 text-xs"
              onClick={handleConfirmReject}
            >
              Decline Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
