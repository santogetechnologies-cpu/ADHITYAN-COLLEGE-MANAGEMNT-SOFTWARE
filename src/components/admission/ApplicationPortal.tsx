import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { ComprehensiveAdmissionDialog } from '@/components/admission/ComprehensiveAdmissionDialog';
import { ApplicationDetailsDialog } from '@/components/admission/ApplicationDetailsDialog';
import { FileText, User, Eye, Loader2, UserPlus, Search, Sparkles, CheckCircle2 } from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '@/services/supabase/database';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { studentParentAuthService, AdmissionConfirmationResult } from '@/services/studentParentAuthService';
import { AdmissionSuccessDialog } from '@/components/admission/AdmissionSuccessDialog';

export const ApplicationPortal = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [admissionDialogOpen, setAdmissionDialogOpen] = useState(false);

  // Search & Status Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [quickApprovingId, setQuickApprovingId] = useState<string | null>(null);
  const [confirmedResult, setConfirmedResult] = useState<AdmissionConfirmationResult | null>(null);

  const loadApplications = useCallback(async () => {
    try {
      const data = await db.getAdmissionApplications();
      if (data && data.length > 0) {
        const mapped = data.map((d: any) => ({
          id: d.id,
          name: d.name,
          email: d.email,
          class: d.class_applied || d.class_name,
          status: d.status,
          date: d.created_at ? new Date(d.created_at).toISOString().split('T')[0] : '2024-03-10',
          applicationId: d.application_no || `APP${d.id.slice(0, 6)}`,
          phone: d.phone,
          parentName: d.parent_name,
          parentPhone: d.parent_phone,
          address: d.address,
          previousSchool: d.previous_school,
          dateOfBirth: d.date_of_birth,
          remarks: d.remarks,
          studentId: d.student_id,
          parentId: d.parent_id
        }));
        setApplications(mapped);
      } else {
        setApplications([]);
      }
    } catch (err) {
      console.error('Failed to load applications:', err);
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

  const handleApplicationAdded = (newApplication: any) => {
    setApplications(prev => [newApplication, ...prev]);
  };

  const handleQuickApprove = async (app: any) => {
    setQuickApprovingId(app.id);
    try {
      await db.updateAdmissionStatus(String(app.id), 'Approved', 'Approved by Academic Review');
      setApplications(prev => prev.map(a => 
        String(a.id) === String(app.id) 
          ? { ...a, status: 'Approved' } 
          : a
      ));
      toast({
        title: "Admission Approved",
        description: `Application for ${app.name} has been approved. Student portal login credentials can now be provisioned in Admin User Management.`,
      });
      loadApplications();
    } catch (err: any) {
      toast({
        title: "Approval Failed",
        description: err.message || "Failed to approve admission.",
        variant: "destructive",
      });
    } finally {
      setQuickApprovingId(null);
    }
  };

  const handleStatusUpdate = async (applicationId: any, status: string, remarks?: string) => {
    try {
      await db.updateAdmissionStatus(String(applicationId), status as any, remarks);
      setApplications(prev => prev.map(app => 
        String(app.id) === String(applicationId) 
          ? { ...app, status, remarks }
          : app
      ));
      toast({
        title: "Status Updated",
        description: `Application status changed to ${status}`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update application status",
        variant: "destructive"
      });
    }
  };

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      // 1. Status filter
      if (statusFilter === 'pending') {
        if (app.status !== 'Submitted' && app.status !== 'Under Review') return false;
      } else if (statusFilter === 'approved') {
        if (app.status !== 'Approved') return false;
      } else if (statusFilter === 'rejected') {
        if (app.status !== 'Rejected') return false;
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
        const matchesStudentId = (app.studentId || '').toLowerCase().includes(q);
        const matchesParentId = (app.parentId || '').toLowerCase().includes(q);
        return matchesName || matchesEmail || matchesPhone || matchesAppId || matchesCourse || matchesParent || matchesStudentId || matchesParentId;
      }

      return true;
    });
  }, [applications, statusFilter, searchQuery]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Submitted':
        return <Badge variant="secondary">Submitted</Badge>;
      case 'Under Review':
        return <Badge variant="default">Under Review</Badge>;
      case 'Approved':
        return <Badge variant="default" className="bg-success text-success-foreground">Approved</Badge>;
      case 'Rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'Waitlisted':
        return <Badge variant="outline">Waitlisted</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

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
            <p className="text-2xl font-bold">{applications.filter(a => a.status === 'Submitted' || a.status === 'Under Review').length}</p>
            <p className="text-sm text-muted-foreground">Pending Review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-600 mb-2" />
            <p className="text-2xl font-bold">{applications.filter(a => a.status === 'Approved').length}</p>
            <p className="text-sm text-muted-foreground">Approved & Provisioned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <User className="h-8 w-8 mx-auto text-destructive mb-2" />
            <p className="text-2xl font-bold">{applications.filter(a => a.status === 'Rejected').length}</p>
            <p className="text-sm text-muted-foreground">Rejected</p>
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
                  Pending ({applications.filter(a => a.status === 'Submitted' || a.status === 'Under Review').length})
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={statusFilter === 'approved' ? 'default' : 'ghost'}
                  className="h-7 text-xs px-2.5"
                  onClick={() => setStatusFilter('approved')}
                >
                  Approved ({applications.filter(a => a.status === 'Approved').length})
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={statusFilter === 'rejected' ? 'default' : 'ghost'}
                  className="h-7 text-xs px-2.5"
                  onClick={() => setStatusFilter('rejected')}
                >
                  Rejected ({applications.filter(a => a.status === 'Rejected').length})
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
                <TableHead>System IDs</TableHead>
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
                    <TableCell className="text-xs font-medium">{app.class}</TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <p className="font-medium">{app.parentName || '—'}</p>
                        {app.parentPhone && <p className="text-[10px] text-muted-foreground">{app.parentPhone}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{app.date}</TableCell>
                    <TableCell>{getStatusBadge(app.status)}</TableCell>
                    <TableCell>
                      {app.studentId || app.parentId ? (
                        <div className="text-[11px] font-mono space-y-0.5">
                          {app.studentId && <p className="text-emerald-700 font-semibold">{app.studentId}</p>}
                          {app.parentId && <p className="text-blue-700">{app.parentId}</p>}
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">Pending Approval</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-1.5">
                        {(app.status === 'Submitted' || app.status === 'Under Review') && (
                          <Button
                            size="sm"
                            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 shadow-sm"
                            disabled={quickApprovingId === app.id}
                            onClick={() => handleQuickApprove(app)}
                          >
                            {quickApprovingId === app.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                            <span>Approve Admission</span>
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
        onStatusUpdate={handleStatusUpdate}
      />

      <ComprehensiveAdmissionDialog
        open={admissionDialogOpen}
        onOpenChange={setAdmissionDialogOpen}
        onSuccess={loadApplications}
      />

      <AdmissionSuccessDialog
        open={!!confirmedResult}
        onOpenChange={(open) => !open && setConfirmedResult(null)}
        result={confirmedResult}
      />
    </div>
  );
};
