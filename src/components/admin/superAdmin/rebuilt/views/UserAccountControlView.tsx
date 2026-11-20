import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminUserService, AdminManagedUser } from '@/services/adminUserService';
import { UserRole } from '@/context/AuthContext';
import { 
  Users, 
  Search, 
  UserCheck, 
  UserX, 
  Key, 
  ShieldAlert, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Edit3, 
  Filter,
  CheckCircle2,
  Lock,
  FileSpreadsheet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

export function UserAccountControlView() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');

  // Password Reset Dialog
  const [resetUser, setResetUser] = useState<AdminManagedUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // New User Dialog
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student' as UserRole,
    department: 'Cardiac Technology'
  });

  useEffect(() => {
    loadUsers();
  }, [selectedRoleFilter]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await adminUserService.listUsers(
        selectedRoleFilter === 'all' ? undefined : selectedRoleFilter,
        search
      );
      setUsers(data);
    } catch {
      toast.error('Failed to load user accounts from database');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers();
  };

  const handleChangeRole = async (user: AdminManagedUser, newRole: UserRole) => {
    try {
      await adminUserService.updateUser(user.id, { role: newRole });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
      toast.success(`Role for ${user.name} changed to ${newRole}`);
    } catch (err: any) {
      toast.error(`Failed to change role: ${err.message || 'Error'}`);
    }
  };

  const handleToggleStatus = async (user: AdminManagedUser) => {
    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      await adminUserService.setUserActiveStatus(user.id, nextStatus === 'active');
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: nextStatus } : u));
      toast.success(`Account status for ${user.name} updated to ${nextStatus}`);
    } catch (err: any) {
      toast.error(`Status change failed: ${err.message || 'Error'}`);
    }
  };

  const handleExecutePasswordReset = async () => {
    if (!resetUser || !newPassword.trim()) {
      toast.error('Password cannot be empty');
      return;
    }
    setIsResetting(true);
    try {
      await adminUserService.resetUserPassword(resetUser.id, newPassword.trim());
      toast.success(`Password for ${resetUser.email} has been reset`);
      setResetUser(null);
      setNewPassword('');
    } catch (err: any) {
      toast.error(`Password reset failed: ${err.message || 'Error'}`);
    } finally {
      setIsResetting(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name || !createForm.email || !createForm.password) {
      toast.error('All fields are required');
      return;
    }
    try {
      await adminUserService.createUser({
        name: createForm.name,
        email: createForm.email,
        password: createForm.password,
        role: createForm.role,
        department: createForm.department
      });
      toast.success(`User account created for ${createForm.name}`);
      setIsCreateOpen(false);
      setCreateForm({ name: '', email: '', password: '', role: 'student', department: 'Cardiac Technology' });
      loadUsers();
    } catch (err: any) {
      toast.error(`Account creation failed: ${err.message || 'Error'}`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Directory Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center">
              <Users className="w-5 h-5 mr-2 text-indigo-600" />
              Institutional User Directory & Account Governance
            </h2>
            <p className="text-xs text-slate-500">
              Direct connection to Supabase user profiles. Manage role assignments, account status, credential resets, and access restrictions.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/admin/account-provisioning')}
              className="h-8 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-medium"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-indigo-600" /> Bulk Provisioning & Linking
            </Button>
            <Button
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Provision Account
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadUsers}
              className="h-8 text-xs text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Search & Filters */}
        <form onSubmit={handleSearchSubmit} className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search by name, email, roll number, or student ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs bg-slate-50 border-slate-200 w-full"
              />
            </div>
            <Button type="submit" size="sm" variant="secondary" className="h-8 text-xs">
              Search
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-slate-500">Filter Role:</span>
            <Select value={selectedRoleFilter} onValueChange={setSelectedRoleFilter}>
              <SelectTrigger className="h-8 text-xs w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles ({users.length})</SelectItem>
                <SelectItem value="admin">Administrators</SelectItem>
                <SelectItem value="principal">Principals</SelectItem>
                <SelectItem value="teacher">Teachers & Faculty</SelectItem>
                <SelectItem value="student">Students</SelectItem>
                <SelectItem value="parent">Parents</SelectItem>
                <SelectItem value="finance_manager">Finance Managers</SelectItem>
                <SelectItem value="receptionist">Receptionists</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </form>
      </div>

      {/* 2. User Directory Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px]">
              <tr>
                <th className="p-3">User & Contact</th>
                <th className="p-3">Assigned Role</th>
                <th className="p-3">Department / Class</th>
                <th className="p-3">Account Status</th>
                <th className="p-3">Ident (Roll / ID)</th>
                <th className="p-3 text-right">Administrative Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Loading institutional accounts from database...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No matching user accounts found.
                  </td>
                </tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/80">
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{u.name}</div>
                      <div className="text-[11px] text-slate-400">{u.email}</div>
                    </td>

                    <td className="p-3">
                      <Select
                        value={u.role}
                        onValueChange={(val: UserRole) => handleChangeRole(u, val)}
                      >
                        <SelectTrigger className="h-7 text-xs w-36 font-semibold bg-slate-50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="teacher">Teacher</SelectItem>
                          <SelectItem value="parent">Parent</SelectItem>
                          <SelectItem value="admin">Administrator</SelectItem>
                          <SelectItem value="principal">Principal</SelectItem>
                          <SelectItem value="finance_manager">Finance Manager</SelectItem>
                          <SelectItem value="receptionist">Receptionist</SelectItem>
                          <SelectItem value="store_manager">Store Manager</SelectItem>
                          <SelectItem value="transport_driver">Transport Driver</SelectItem>
                          <SelectItem value="hr_manager">HR Manager</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>

                    <td className="p-3 text-slate-600">
                      {u.department || u.class_name || 'General / Unassigned'}
                    </td>

                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(u)}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                          u.status === 'active'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                        }`}
                      >
                        {u.status === 'active' ? (
                          <>
                            <UserCheck className="w-3 h-3 mr-1 text-emerald-600" /> Active
                          </>
                        ) : (
                          <>
                            <UserX className="w-3 h-3 mr-1 text-rose-600" /> Suspended
                          </>
                        )}
                      </button>
                    </td>

                    <td className="p-3 font-mono text-[11px] text-slate-600">
                      {u.roll_number || u.student_id || '—'}
                    </td>

                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setResetUser(u)}
                          className="h-7 text-xs px-2 text-slate-700 hover:bg-slate-100"
                          title="Reset Password"
                        >
                          <Key className="w-3 h-3 mr-1 text-amber-600" />
                          <span>Reset</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Password Reset Modal */}
      {resetUser && (
        <Dialog open={!!resetUser} onOpenChange={(open) => { if (!open) setResetUser(null); }}>
          <DialogContent className="max-w-md p-6">
            <DialogHeader>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-slate-900">
                    Reset User Password
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Enforces new credential for {resetUser.name} ({resetUser.email}).
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="py-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">New Temporary Password</label>
                <Input
                  type="password"
                  placeholder="Enter strong password (min 6 chars)..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={() => setResetUser(null)} className="text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleExecutePasswordReset}
                disabled={isResetting || !newPassword.trim()}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
              >
                {isResetting ? 'Applying...' : 'Enforce New Password'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Provision Account Modal */}
      {isCreateOpen && (
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-md p-6">
            <form onSubmit={handleCreateUser}>
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-slate-900">
                  Provision Institutional Account
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Create a verified Supabase auth credential and profile.
                </DialogDescription>
              </DialogHeader>

              <div className="py-4 space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Full Legal Name</label>
                  <Input
                    placeholder="e.g. Dr. Ramesh Kumar"
                    value={createForm.name}
                    onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                    className="h-8 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Institutional Email</label>
                  <Input
                    type="email"
                    placeholder="e.g. ramesh@adithyan.edu.in"
                    value={createForm.email}
                    onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                    className="h-8 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Temporary Password</label>
                  <Input
                    type="password"
                    placeholder="Minimum 6 characters..."
                    value={createForm.password}
                    onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                    className="h-8 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Role Assignment</label>
                  <Select
                    value={createForm.role}
                    onValueChange={(val: UserRole) => setCreateForm({ ...createForm, role: val })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="teacher">Teacher</SelectItem>
                      <SelectItem value="principal">Principal</SelectItem>
                      <SelectItem value="finance_manager">Finance Manager</SelectItem>
                      <SelectItem value="receptionist">Receptionist</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsCreateOpen(false)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold">
                  Provision User
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
