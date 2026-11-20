import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  UserCheck, 
  Plus, 
  RefreshCw, 
  Search,
  FileText,
  UserX
} from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@/services/supabase/database';
import { StaffLeaveApplication, Profile } from '@/types/database.types';
import { useAuth } from '@/context/AuthContext';

const IS_UUID = (v?: string | null): v is string => !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export function StaffLeaveManager() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<StaffLeaveApplication[]>([]);
  const [staffProfiles, setStaffProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New leave form state
  const [formData, setFormData] = useState({
    staff_profile_id: '',
    staff_name: '',
    department: 'Medical Laboratory Technology',
    leave_type: 'Casual Leave (CL)',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    total_days: 1,
    reason: '',
    substitute_teacher_name: '',
  });

  const loadLeaves = useCallback(async () => {
    try {
      setLoading(true);
      const [leavesData, profilesData] = await Promise.all([
        db.getStaffLeaveApplications(),
        db.getAllProfiles().catch(() => [])
      ]);
      setLeaves(leavesData || []);
      const staffOnly = (profilesData || []).filter(p => p.role !== 'student' && p.role !== 'parent');
      setStaffProfiles(staffOnly);
    } catch (err) {
      console.warn('Failed to load staff leaves:', err);
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeaves();
  }, [loadLeaves]);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const approverId = IS_UUID(user?.id) ? user.id : undefined;
      let reason: string | undefined;
      if (newStatus === 'Rejected') {
        reason = window.prompt('Reason for rejecting this leave (required):') ?? undefined;
        if (!reason || reason.trim().length < 3) return;
      }
      await db.updateStaffLeaveStatus(id, newStatus, approverId, reason?.trim());
      toast.success(newStatus === 'Rejected' ? 'Leave rejected' : 'Leave approved');
      await loadLeaves();
    } catch (err: any) {
      toast.error(err?.message || 'The leave could not be updated.');
      await loadLeaves();
    }
  };

  const handleCreateLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const targetUserId = IS_UUID(formData.staff_profile_id)
        ? formData.staff_profile_id
        : (IS_UUID(user?.id) ? user.id : undefined);
      const approverId = IS_UUID(user?.id) ? user.id : undefined;

      const newLeave: Partial<StaffLeaveApplication> = {
        staff_name: formData.staff_name,
        department: formData.department,
        leave_type: formData.leave_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        total_days: Number(formData.total_days) || 1,
        reason: formData.reason,
        substitute_teacher_name: formData.substitute_teacher_name,
        status: 'Approved',
        approved_by: approverId,
        user_id: targetUserId
      };

      const days = Number(formData.total_days);
      const span = Math.floor((new Date(formData.end_date).getTime() - new Date(formData.start_date).getTime()) / 86400000) + 1;
      if (!(span >= 1) || !(days >= 1) || days > span) {
        toast.error(`Days must be between 1 and ${Math.max(span, 1)} for these dates.`);
        return;
      }
      const result = await db.submitStaffLeaveApplication(newLeave);
      if (!result) { toast.error('The leave could not be recorded (check the balance and your permissions).'); return; }
      setLeaves(prev => [result, ...prev]);
      toast.success('Leave recorded');
      setDialogOpen(false);
      setFormData({
        staff_profile_id: '',
        staff_name: '',
        department: 'Medical Laboratory Technology',
        leave_type: 'Casual Leave (CL)',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        total_days: 1,
        reason: '',
        substitute_teacher_name: '',
      });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to record leave');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredLeaves = useMemo(() => {
    return leaves.filter(l => {
      const matchStatus = statusFilter === 'All' || l.status === statusFilter;
      const matchSearch = !searchQuery || 
        l.staff_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.leave_type.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [leaves, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 border border-slate-200/80 rounded-2xl shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Staff Leave & Substitute Faculty Desk</h2>
            <Badge variant="outline" className="text-xs font-semibold bg-blue-50 text-blue-700 border-blue-200">
              Zero Lecture Leakage Guarantee
            </Badge>
          </div>
          <p className="text-xs text-slate-500">
            Track Casual (CL), Medical (ML), Earned (EL), and On-Duty (OD) applications with designated lecture proxies.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={loadLeaves} className="h-9 text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="h-9 text-xs font-semibold bg-[#1D61E7] hover:bg-blue-700 text-white shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Record Leave Application
          </Button>
        </div>
      </div>

      {/* Leave Quotas Overview Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 bg-white border border-slate-200 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Casual Leave (CL)</span>
          <div className="text-base font-bold text-slate-900">12 Days / Year</div>
          <span className="text-[10px] text-slate-400">Max 2 consecutive</span>
        </div>
        <div className="p-3 bg-white border border-slate-200 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Medical Leave (ML)</span>
          <div className="text-base font-bold text-emerald-700">10 Days / Year</div>
          <span className="text-[10px] text-slate-400">Physician note required</span>
        </div>
        <div className="p-3 bg-white border border-slate-200 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Earned Leave (EL)</span>
          <div className="text-base font-bold text-blue-700">15 Days / Year</div>
          <span className="text-[10px] text-slate-400">Accumulative</span>
        </div>
        <div className="p-3 bg-white border border-slate-200 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">On Duty (OD)</span>
          <div className="text-base font-bold text-amber-700">15 Days / Year</div>
          <span className="text-[10px] text-slate-400">Valuation / Seminars</span>
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="bg-white border-slate-200/80 shadow-2xs">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              {['All', 'Pending_HOD', 'Approved', 'Rejected'].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    statusFilter === status
                      ? 'bg-[#1D61E7] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {status === 'Pending_HOD' ? 'Pending' : status}
                </button>
              ))}
            </div>
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search faculty / dept / leave type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-xs bg-slate-50/50"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="p-3">Faculty / Staff Member</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Leave Type</th>
                  <th className="p-3">Date Range</th>
                  <th className="p-3">Days</th>
                  <th className="p-3">Substitute Teacher</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeaves.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{l.staff_name}</div>
                      <div className="text-[10px] text-slate-500 line-clamp-1">{l.reason}</div>
                    </td>
                    <td className="p-3 text-slate-600">{l.department}</td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-[10px] font-semibold bg-slate-50 text-slate-700">
                        {l.leave_type}
                      </Badge>
                    </td>
                    <td className="p-3 font-mono text-slate-600 text-[11px]">
                      {l.start_date} to {l.end_date}
                    </td>
                    <td className="p-3 font-bold text-slate-800">
                      {l.total_days} {l.total_days === 1 ? 'day' : 'days'}
                    </td>
                    <td className="p-3 text-slate-700">
                      {l.substitute_teacher_name ? (
                        <div className="flex items-center text-emerald-700 font-medium text-[11px]">
                          <UserCheck className="w-3.5 h-3.5 mr-1 text-emerald-600 shrink-0" />
                          <span className="line-clamp-1">{l.substitute_teacher_name}</span>
                        </div>
                      ) : (
                        <span className="text-amber-600 text-[11px]">No proxy assigned</span>
                      )}
                    </td>
                    <td className="p-3">
                      <Badge
                        className={`text-[10px] font-semibold ${
                          l.status === 'Approved'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : l.status === 'Rejected'
                            ? 'bg-rose-100 text-rose-800 border-rose-200'
                            : 'bg-amber-100 text-amber-800 border-amber-200'
                        }`}
                      >
                        {l.status === 'Pending_HOD' ? 'Pending Approval' : l.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      {l.status === 'Pending_HOD' ? (
                        <div className="flex items-center justify-end space-x-1.5">
                          <Button
                            size="sm"
                            onClick={() => handleUpdateStatus(l.id, 'Approved')}
                            className="h-7 px-2.5 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateStatus(l.id, 'Rejected')}
                            className="h-7 px-2 text-[11px] text-rose-600 hover:bg-rose-50 border-rose-200 font-semibold"
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">
                          {l.approved_by ? `By ${l.approved_by}` : 'Processed'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Record Leave Application Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md bg-white p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span>Record Faculty Leave Application</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateLeave} className="space-y-3 pt-2 text-xs">
            {staffProfiles.length > 0 && (
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Quick Select Staff Member (Optional)</label>
                <select
                  value={formData.staff_profile_id}
                  onChange={(e) => {
                    const prof = staffProfiles.find(p => p.id === e.target.value);
                    if (prof) {
                      setFormData(prev => ({
                        ...prev,
                        staff_profile_id: prof.id,
                        staff_name: prof.name || prof.email,
                        department: prof.department || prev.department
                      }));
                    } else {
                      setFormData(prev => ({ ...prev, staff_profile_id: '' }));
                    }
                  }}
                  className="w-full h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  <option value="">-- Choose registered faculty / staff member --</option>
                  {staffProfiles.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name || p.email} ({p.role.toUpperCase()} - {p.department || 'General'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Staff / Faculty Name *</label>
              <Input
                required
                placeholder="e.g. Dr. Ramesh Kumar"
                value={formData.staff_name}
                onChange={(e) => setFormData({ ...formData, staff_name: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Department</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white"
              >
                <option value="Medical Laboratory Technology">Medical Laboratory Technology</option>
                <option value="Dialysis Technology">Dialysis Technology</option>
                <option value="Radiology & Imaging Technology">Radiology & Imaging Technology</option>
                <option value="Operation Theatre & Anaesthesia">Operation Theatre & Anaesthesia</option>
                <option value="Cardiac Care Technology">Cardiac Care Technology</option>
                <option value="Physician Assistant">Physician Assistant</option>
                <option value="Administration & Finance">Administration & Finance</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Leave Type</label>
                <select
                  value={formData.leave_type}
                  onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                  className="w-full h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  <option value="Casual Leave (CL)">Casual Leave (CL)</option>
                  <option value="Medical Leave (ML)">Medical Leave (ML)</option>
                  <option value="Earned Leave (EL)">Earned Leave (EL)</option>
                  <option value="On Duty (OD)">On Duty (OD)</option>
                  <option value="Loss of Pay (LOP)">Loss of Pay (LOP)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Total Days</label>
                <Input
                  type="number"
                  min="0.5"
                  step="0.5"
                  required
                  value={formData.total_days}
                  onChange={(e) => setFormData({ ...formData, total_days: Number(e.target.value) })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Start Date</label>
                <Input
                  type="date"
                  required
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">End Date</label>
                <Input
                  type="date"
                  required
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Substitute Faculty Assignment</label>
              <Input
                placeholder="e.g. Prof. Priya Sundaram (LH-101 periods covered)"
                value={formData.substitute_teacher_name}
                onChange={(e) => setFormData({ ...formData, substitute_teacher_name: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Reason for Leave</label>
              <textarea
                rows={2}
                required
                placeholder="Enter justification..."
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-white"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)} className="h-8 text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submitting} className="h-8 text-xs bg-[#1D61E7] text-white">
                {submitting ? 'Recording...' : 'Approve & Sanction'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

