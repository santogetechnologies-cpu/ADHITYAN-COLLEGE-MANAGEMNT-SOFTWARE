import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Users, 
  DollarSign, 
  Calendar, 
  Briefcase, 
  GraduationCap, 
  UserPlus, 
  RefreshCw, 
  Search, 
  CheckCircle2, 
  ShieldCheck, 
  FileText,
  Building,
  CreditCard,
  Mail,
  Phone
} from 'lucide-react';
import { db } from '@/services/supabase/database';
import { supabase } from '@/lib/supabase';
import { StaffServiceRecord } from '@/types/database.types';
import { useAuth } from '@/context/AuthContext';
import { StaffPayrollEngine } from '../hr/StaffPayrollEngine';
import { StaffLeaveManager } from '../hr/StaffLeaveManager';
import { toast } from 'sonner';
import { InstitutionName } from '@/lib/institution';

export default function HRManagerDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'directory' | 'payroll' | 'leaves'>('payroll');
  const [staffRecords, setStaffRecords] = useState<StaffServiceRecord[]>([]);
  const [availableStaffProfiles, setAvailableStaffProfiles] = useState<Array<{ id: string; name: string; email: string; role: string; department?: string }>>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [addStaffOpen, setAddStaffOpen] = useState(false);
  const [savingStaff, setSavingStaff] = useState(false);

  // New staff registration form state
  const [newStaff, setNewStaff] = useState({
    employee_code: '',
    department: '',
    designation: '',
    qualification: '',
    date_of_joining: new Date().toISOString().split('T')[0],
    pan_number: '',
    pf_uan_number: '',
    bank_name: '',
    bank_account_no: '',
    bank_ifsc: '',
    basic_pay: 0,
    da_pct: 0,
    hra_pct: 0,
    special_allowance: 0,
    monthly_tds: 0,
    other_deductions: 0,
    epf_opt_out: false,
    status: 'Active' as const
  });

  const [leavesToday, setLeavesToday] = useState(0);
  const [latestRun, setLatestRun] = useState<{ month_year: string; status: string; total_net_disbursed: number } | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      db.getStaffLeaveApplications().then((ls: any[]) => { const t = new Date().toISOString().slice(0, 10); setLeavesToday(ls.filter((l: any) => l.status === 'Approved' && l.start_date <= t && l.end_date >= t).length); }).catch(() => setLeavesToday(0));
      db.getStaffPayrollRuns().then((r) => setLatestRun(r.find((x) => x.status !== 'Cancelled') ?? null)).catch(() => setLatestRun(null));
      const [records, profilesRes] = await Promise.all([
        db.getStaffServiceRecords(),
        supabase
          .from('profiles')
          .select('id, name, email, role, department')
          .not('role', 'in', '("student","parent")')
      ]);
      setStaffRecords(records || []);
      const staffList = profilesRes.data || [];
      setAvailableStaffProfiles(staffList);
      if (staffList.length > 0) {
        setSelectedUserId(prev => prev || staffList[0].id);
      }
    } catch (err) {
      console.warn('Failed to load HR staff records:', err);
      setStaffRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const teachingCount = availableStaffProfiles.filter(p => p.role === 'teacher' || p.role === 'hod').length;
  const nonTeachingCount = availableStaffProfiles.filter(p => !['teacher', 'hod'].includes(p.role)).length;
  const onLeaveToday = leavesToday;

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingStaff(true);
      const targetUserId = selectedUserId || availableStaffProfiles[0]?.id;
      if (!targetUserId) {
        toast.error('No valid staff user profile found. Please create a staff user account first.');
        return;
      }

      const res = await db.upsertStaffServiceRecord({
        ...newStaff,
        user_id: targetUserId
      });

      if (res) {
        setStaffRecords(prev => [res, ...prev]);
        toast.success(`Service record created for ${newStaff.employee_code}`);
        setNewStaff({
          employee_code: '',
          department: '',
          designation: '',
          qualification: '',
          date_of_joining: new Date().toISOString().split('T')[0],
          pan_number: '',
          pf_uan_number: '',
          bank_name: '',
          bank_account_no: '',
          bank_ifsc: '',
          basic_pay: 0,
          da_pct: 0,
          hra_pct: 0,
          special_allowance: 0,
          monthly_tds: 0,
          other_deductions: 0,
          epf_opt_out: false,
          status: 'Active' as const
        });
      }
      if (!res) { toast.error('The service record could not be saved. Check the details and your permissions.'); return; }
      setAddStaffOpen(false);
    } catch (err: any) {
      console.error('Error creating staff service record:', err);
      toast.error(err?.message || 'Failed to create staff service record');
    } finally {
      setSavingStaff(false);
    }
  };

  const filteredStaff = useMemo(() => {
    return staffRecords.filter(r => {
      const matchDept = deptFilter === 'All' || r.department === deptFilter;
      const matchSearch = !searchQuery ||
        r.employee_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.designation.toLowerCase().includes(searchQuery.toLowerCase());
      return matchDept && matchSearch;
    });
  }, [staffRecords, deptFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-[#F4F8FE] text-slate-800 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Directorate Header */}
      <div className="bg-white p-5 border border-slate-200/80 rounded-2xl shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#071E47] text-white flex items-center justify-center font-bold text-sm">
            HR
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Directorate of Human Resources & Staff Administration
              </h1>
              <Badge className="bg-blue-100 text-blue-800 text-[10px] font-bold border-blue-200">
                Institutional HRMS
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              <InstitutionName /> | Logged in as: <span className="font-semibold text-slate-700">{user?.name || 'Director of HR'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
          <Button variant="outline" size="sm" onClick={loadData} className="h-9 text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setAddStaffOpen(true)}
            className="h-9 text-xs font-semibold bg-[#1D61E7] hover:bg-blue-700 text-white shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Onboard New Staff
          </Button>
        </div>
      </div>

      {/* Institutional HR KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-slate-200/80 shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium uppercase tracking-wider">Total Teaching Faculty</span>
              <GraduationCap className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-black text-slate-900">{teachingCount}</div>
            <span className="text-[11px] text-slate-500">Teacher accounts</span>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200/80 shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium uppercase tracking-wider">Non-Teaching Staff</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{nonTeachingCount}</div>
            <span className="text-[11px] text-slate-500">Other staff accounts</span>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200/80 shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium uppercase tracking-wider">Monthly Payroll Bill</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{latestRun ? `₹ ${Number(latestRun.total_net_disbursed).toLocaleString('en-IN')}` : '—'}</div>
            <span className="text-[11px] text-slate-500">{latestRun ? `${latestRun.month_year} net (${latestRun.status})` : 'No payroll run yet'}</span>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200/80 shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium uppercase tracking-wider">Staff On Leave Today</span>
              <Calendar className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-700">{onLeaveToday}</div>
            <span className="text-[11px] text-slate-500">Approved leave covering today</span>
          </CardContent>
        </Card>
      </div>

      {/* Main Module Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="bg-white border border-slate-200/80 p-1 rounded-xl mb-4 shadow-2xs">
          <TabsTrigger value="payroll" className="text-xs font-semibold px-4 py-2">
            <DollarSign className="w-3.5 h-3.5 mr-1.5" />
            Payroll Engine & Payslips
          </TabsTrigger>
          <TabsTrigger value="leaves" className="text-xs font-semibold px-4 py-2">
            <Calendar className="w-3.5 h-3.5 mr-1.5" />
            Leave Desk & Substitute Faculty
          </TabsTrigger>
          <TabsTrigger value="directory" className="text-xs font-semibold px-4 py-2">
            <Users className="w-3.5 h-3.5 mr-1.5" />
            Staff Directory & Service Register ({staffRecords.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: PAYROLL ENGINE */}
        <TabsContent value="payroll">
          <StaffPayrollEngine />
        </TabsContent>

        {/* TAB 2: LEAVE DESK */}
        <TabsContent value="leaves">
          <StaffLeaveManager />
        </TabsContent>

        {/* TAB 3: STAFF DIRECTORY */}
        <TabsContent value="directory" className="space-y-4">
          <Card className="bg-white border-slate-200/80 shadow-2xs">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Institutional Staff Service Register
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Service records, salary structures, PF/PAN identifiers, and employment statuses.
                </CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  <option value="All">All Departments</option>
                  <option value="Medical Laboratory Technology">Medical Laboratory Technology</option>
                  <option value="Dialysis Technology">Dialysis Technology</option>
                  <option value="Radiology & Imaging Technology">Radiology & Imaging Technology</option>
                  <option value="Operation Theatre & Anaesthesia">Operation Theatre & Anaesthesia</option>
                  <option value="Cardiac Care Technology">Cardiac Care Technology</option>
                  <option value="Physician Assistant">Physician Assistant</option>
                  <option value="Human Resources & Admin">Human Resources & Admin</option>
                  <option value="Campus Finance & Accounts">Campus Finance & Accounts</option>
                </select>

                <div className="relative w-56">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search code / role..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-8 text-xs bg-slate-50/50"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="p-3">Employee Code</th>
                      <th className="p-3">Designation & Dept</th>
                      <th className="p-3">Qualification</th>
                      <th className="p-3">Joining Date</th>
                      <th className="p-3">PAN & UAN</th>
                      <th className="p-3">Bank Details</th>
                      <th className="p-3 text-right">Basic Pay</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStaff.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3 font-mono font-bold text-slate-900">
                          {r.employee_code}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{r.designation}</div>
                          <div className="text-[11px] text-slate-500">{r.department}</div>
                        </td>
                        <td className="p-3 text-slate-700 font-medium">
                          {r.qualification || 'M.Tech'}
                        </td>
                        <td className="p-3 text-slate-600 font-mono text-[11px]">
                          {r.date_of_joining}
                        </td>
                        <td className="p-3 text-slate-600 font-mono text-[10px]">
                          <div>PAN: {r.pan_number || 'N/A'}</div>
                          <div>UAN: {r.pf_uan_number || 'N/A'}</div>
                        </td>
                        <td className="p-3 text-slate-600 text-[11px]">
                          <div className="font-semibold text-slate-800">{r.bank_name || 'SBI'}</div>
                          <div className="text-[10px] font-mono">{r.bank_account_no || '**** 4819'}</div>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                          ₹ {(r.basic_pay || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-center">
                          <Badge
                            className={`text-[10px] font-semibold ${
                              r.status === 'Active'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : 'bg-amber-100 text-amber-800 border-amber-200'
                            }`}
                          >
                            {r.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Onboard New Staff Modal */}
      <Dialog open={addStaffOpen} onOpenChange={setAddStaffOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto bg-white p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <UserPlus className="w-4 h-4 text-primary" />
              <span>Onboard New Staff Member & Service Record</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveStaff} className="space-y-3 pt-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Link Staff Account (Identity Profile)</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white"
                required
              >
                {availableStaffProfiles.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.role.toUpperCase()} - {p.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Employee Code</label>
                <Input
                  required
                  value={newStaff.employee_code}
                  onChange={(e) => setNewStaff({ ...newStaff, employee_code: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Designation</label>
                <Input
                  required
                  placeholder="e.g. Assistant Professor"
                  value={newStaff.designation}
                  onChange={(e) => setNewStaff({ ...newStaff, designation: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Department</label>
                <select
                  value={newStaff.department}
                  onChange={(e) => setNewStaff({ ...newStaff, department: e.target.value })}
                  className="w-full h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  <option value="Medical Laboratory Technology">Medical Laboratory Technology</option>
                  <option value="Dialysis Technology">Dialysis Technology</option>
                  <option value="Radiology & Imaging Technology">Radiology & Imaging Technology</option>
                  <option value="Operation Theatre & Anaesthesia">Operation Theatre & Anaesthesia</option>
                  <option value="Cardiac Care Technology">Cardiac Care Technology</option>
                  <option value="Physician Assistant">Physician Assistant</option>
                  <option value="Human Resources & Admin">Human Resources & Admin</option>
                  <option value="Campus Finance & Accounts">Campus Finance & Accounts</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Highest Qualification</label>
                <Input
                  required
                  placeholder="e.g. Ph.D., M.Tech"
                  value={newStaff.qualification}
                  onChange={(e) => setNewStaff({ ...newStaff, qualification: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Monthly Basic Pay (₹)</label>
                <Input
                  type="number"
                  required
                  value={newStaff.basic_pay}
                  onChange={(e) => setNewStaff({ ...newStaff, basic_pay: Number(e.target.value) })}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Special Allowance (₹)</label>
                <Input
                  type="number"
                  value={newStaff.special_allowance}
                  onChange={(e) => setNewStaff({ ...newStaff, special_allowance: Number(e.target.value) })}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Monthly income tax (TDS, ₹)</label>
                <Input type="number" min={0} value={newStaff.monthly_tds} onChange={(e) => setNewStaff({ ...newStaff, monthly_tds: Math.max(0, Number(e.target.value)) })} className="h-8 text-xs font-mono" />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Other monthly deductions (₹)</label>
                <Input type="number" min={0} value={newStaff.other_deductions} onChange={(e) => setNewStaff({ ...newStaff, other_deductions: Math.max(0, Number(e.target.value)) })} className="h-8 text-xs font-mono" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">PAN Number</label>
                <Input
                  placeholder="e.g. ABCDE1234F"
                  value={newStaff.pan_number}
                  onChange={(e) => setNewStaff({ ...newStaff, pan_number: e.target.value.toUpperCase() })}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">PF UAN Number</label>
                <Input
                  placeholder="e.g. 100847291823"
                  value={newStaff.pf_uan_number}
                  onChange={(e) => setNewStaff({ ...newStaff, pf_uan_number: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Bank Name</label>
                <Input
                  value={newStaff.bank_name}
                  onChange={(e) => setNewStaff({ ...newStaff, bank_name: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Bank Account No.</label>
                <Input
                  placeholder="e.g. 984729184918"
                  value={newStaff.bank_account_no}
                  onChange={(e) => setNewStaff({ ...newStaff, bank_account_no: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setAddStaffOpen(false)} className="h-8 text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={savingStaff} className="h-8 text-xs bg-[#1D61E7] text-white">
                {savingStaff ? 'Saving...' : 'Register Service Record'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

