import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCollege } from '@/context/CollegeContext';
import { multiCollegeService } from '@/services/multiCollegeService';
import { College, CollegeStatus } from '@/types/multiCollege.types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Building2, 
  Search, 
  PlusCircle, 
  Sliders, 
  Edit3, 
  Power, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink, 
  ShieldCheck, 
  Clock, 
  Filter,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

export function CollegeManagement() {
  const navigate = useNavigate();
  const { collegesList, currentCollege, switchCollege, reloadCollegeData } = useCollege();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  // Edit Dialog State
  const [editingCollege, setEditingCollege] = useState<College | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Status Dialog State
  const [statusTargetCollege, setStatusTargetCollege] = useState<College | null>(null);
  const [newStatusValue, setNewStatusValue] = useState<CollegeStatus>('active');
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  // Filtered colleges
  const filtered = collegesList.filter((col) => {
    const matchesSearch = !searchTerm || 
      col.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      col.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      col.contact_email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || col.status === statusFilter;
    const matchesType = typeFilter === 'all' || col.institution_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleOpenEdit = (college: College) => {
    setEditingCollege(college);
    setEditName(college.name);
    setEditEmail(college.contact_email);
    setEditPhone(college.contact_phone || '');
    setEditAddress(college.address || '');
    setEditWebsite(college.website || '');
  };

  const handleSaveEdit = async () => {
    if (!editingCollege) return;
    setIsUpdating(true);
    try {
      const res = await multiCollegeService.updateCollege(
        editingCollege.id,
        {
          name: editName,
          contact_email: editEmail,
          contact_phone: editPhone,
          address: editAddress,
          website: editWebsite
        },
        'superadmin@platform.adithyan.edu'
      );

      if (res.success) {
        await reloadCollegeData();
        toast.success(`Updated metadata for ${editingCollege.code}.`);
        setEditingCollege(null);
      } else {
        toast.error(res.error || 'Failed to update college.');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOpenStatusDialog = (college: College, targetStatus: CollegeStatus) => {
    setStatusTargetCollege(college);
    setNewStatusValue(targetStatus);
  };

  const handleConfirmStatusChange = async () => {
    if (!statusTargetCollege) return;
    setIsTogglingStatus(true);
    try {
      const res = await multiCollegeService.setCollegeStatus(
        statusTargetCollege.id,
        newStatusValue,
        'superadmin@platform.adithyan.edu'
      );

      if (res.success) {
        await reloadCollegeData();
        toast.success(`College "${statusTargetCollege.code}" status set to ${newStatusValue}.`);
        setStatusTargetCollege(null);
      } else {
        toast.error(res.error || 'Failed to change status.');
      }
    } finally {
      setIsTogglingStatus(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Quick Provision Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              Colleges Directory & Tenant Governance
            </h1>
            <Badge variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50 text-xs font-semibold">
              {collegesList.length} Registered
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage institutional tenants globally: view operational status, launch isolated workspaces, and configure permissions.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            onClick={() => navigate('/platform-admin/provision')}
            className="h-8 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
            Provision New College
          </Button>
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by college name, unique code, or admin email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 pl-9 text-xs"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 text-xs border border-slate-200 rounded-md px-2.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 text-xs border border-slate-200 rounded-md px-2.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Types</option>
            <option value="Paramedical">Paramedical</option>
            <option value="Medical">Medical</option>
            <option value="Engineering">Engineering</option>
            <option value="Multi-Disciplinary">Multi-Disciplinary</option>
          </select>
        </div>
      </div>

      {/* 3. Colleges Table */}
      <Card className="border-slate-200 shadow-2xs">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="text-[11px] bg-slate-50/75">
                <TableHead className="w-[280px]">College / Tenant</TableHead>
                <TableHead className="w-[140px]">Institution Type</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[180px]">Admin Account</TableHead>
                <TableHead className="w-[100px]">Version</TableHead>
                <TableHead className="text-right w-[200px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-xs text-muted-foreground">
                    <Building2 className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                    No colleges match the current search or filter criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((col) => {
                  const isCurrent = col.id === currentCollege.id;
                  return (
                    <TableRow key={col.id} className="text-xs hover:bg-slate-50/50">
                      
                      {/* Name & Code */}
                      <TableCell>
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-xs text-indigo-700 shrink-0">
                            {col.code.slice(0, 3)}
                          </div>
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <p className="font-bold text-slate-900 text-xs">{col.name}</p>
                              {isCurrent && (
                                <Badge className="text-[9px] bg-indigo-100 text-indigo-700 hover:bg-indigo-200 font-semibold border-indigo-200">
                                  Current Context
                                </Badge>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-indigo-600 font-medium">{col.code}</span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Institution Type */}
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-700">
                          {col.institution_type}
                        </Badge>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge 
                          variant={col.status === 'active' ? 'default' : col.status === 'suspended' ? 'destructive' : 'secondary'}
                          className="text-[10px] uppercase font-semibold"
                        >
                          {col.status}
                        </Badge>
                      </TableCell>

                      {/* Admin Account */}
                      <TableCell>
                        <span className="text-slate-700 text-xs truncate max-w-[170px] block">
                          {col.admin_email || col.contact_email}
                        </span>
                      </TableCell>

                      {/* Version */}
                      <TableCell className="font-mono text-[11px] text-slate-600">
                        {col.current_version}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          
                          {/* Launch Workspace */}
                          <Button
                            size="sm"
                            onClick={() => {
                              switchCollege(col.id);
                              navigate(`/platform-admin/workspace/${col.id}`);
                            }}
                            className="h-7 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs px-2.5"
                            title="Configure this college's software"
                          >
                            <Sliders className="w-3 h-3 mr-1" />
                            Workspace
                          </Button>

                          {/* Edit Meta */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(col)}
                            className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900"
                            title="Edit College Details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </Button>

                          {/* Status Action: Suspend or Reactivate */}
                          {col.status === 'active' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenStatusDialog(col, 'suspended')}
                              className="h-7 text-xs text-amber-600 hover:bg-amber-50 px-2"
                              title="Suspend College Access"
                            >
                              Suspend
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenStatusDialog(col, 'active')}
                              className="h-7 text-xs text-emerald-600 hover:bg-emerald-50 px-2 font-semibold"
                              title="Reactivate College Access"
                            >
                              Activate
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 4. Edit College Metadata Dialog */}
      <Dialog open={!!editingCollege} onOpenChange={(open) => !open && setEditingCollege(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-base font-bold">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>Edit College Metadata ({editingCollege?.code})</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Update institutional contact details and official campus address.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Official College Name:</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Contact Email:</label>
              <Input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Phone Number:</label>
              <Input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Campus Address:</label>
              <Input
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Website URL:</label>
              <Input
                value={editWebsite}
                onChange={(e) => setEditWebsite(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingCollege(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveEdit}
              disabled={isUpdating}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              Save Updates
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. Status Confirmation Dialog (Suspend / Reactivate) */}
      <Dialog open={!!statusTargetCollege} onOpenChange={(open) => !open && setStatusTargetCollege(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-base font-bold">
              {newStatusValue === 'suspended' ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Suspend College Environment</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Reactivate College Environment</span>
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Target: <span className="font-semibold text-slate-900">{statusTargetCollege?.name} ({statusTargetCollege?.code})</span>
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1.5">
            {newStatusValue === 'suspended' ? (
              <p>
                Suspending will immediately prevent students, faculty, and administrators of <span className="font-semibold">{statusTargetCollege?.name}</span> from accessing their portals. All college data, records, and configurations will be securely preserved.
              </p>
            ) : (
              <p>
                Reactivating will restore normal login access and full portal operations for all authorized users of this college.
              </p>
            )}
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatusTargetCollege(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmStatusChange}
              disabled={isTogglingStatus}
              className={`text-xs font-semibold text-white ${
                newStatusValue === 'suspended' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              Confirm Status Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default CollegeManagement;
