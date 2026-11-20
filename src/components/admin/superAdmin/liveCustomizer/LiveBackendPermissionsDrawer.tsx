import React, { useState } from 'react';
import { 
  RoleCapability, 
  RoleDataAccessScope, 
  RoleCrudRule, 
  RoleBusinessRules,
  CrudAction 
} from '@/types/roleCustomization.types';
import { CAPABILITY_REGISTRY, DEFAULT_CRUD_ENTITIES } from '@/services/capabilityRegistry';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  KeyRound, 
  Shield, 
  Database, 
  Sliders, 
  Lock, 
  Check, 
  Search,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

interface LiveBackendPermissionsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roleKey?: string | null;
  enabledCapabilities: string[];
  dataScope: RoleDataAccessScope;
  crudRules: RoleCrudRule[];
  businessRules: RoleBusinessRules;
  onUpdatePermissions: (payload: {
    enabledCapabilities: string[];
    dataScope: RoleDataAccessScope;
    crudRules: RoleCrudRule[];
    businessRules: RoleBusinessRules;
  }) => void;
}

export function LiveBackendPermissionsDrawer({
  open,
  onOpenChange,
  roleKey = 'role',
  enabledCapabilities,
  dataScope,
  crudRules,
  businessRules,
  onUpdatePermissions
}: LiveBackendPermissionsDrawerProps) {
  const [activeTab, setActiveTab] = useState<'capabilities' | 'crud' | 'scope' | 'rules'>('capabilities');
  const [capSearch, setCapSearch] = useState('');
  const [localCapabilities, setLocalCapabilities] = useState<string[]>(enabledCapabilities);
  const [localScope, setLocalScope] = useState<RoleDataAccessScope>(dataScope);
  const [localCrud, setLocalCrud] = useState<RoleCrudRule[]>(crudRules);
  const [localBusinessRules, setLocalBusinessRules] = useState<RoleBusinessRules>(businessRules);

  const toggleCapability = (capId: string) => {
    setLocalCapabilities(prev => 
      prev.includes(capId) ? prev.filter(c => c !== capId) : [...prev, capId]
    );
  };

  const toggleCrudAction = (entity: string, action: CrudAction) => {
    setLocalCrud(prev => {
      const existing = prev.find(r => r.entity === entity);
      if (!existing) {
        return [...prev, { entity, allowedActions: [action] }];
      }
      const hasAction = existing.allowedActions.includes(action);
      const newActions = hasAction
        ? existing.allowedActions.filter(a => a !== action)
        : [...existing.allowedActions, action];

      return prev.map(r => r.entity === entity ? { ...r, allowedActions: newActions } : r);
    });
  };

  const safeRoleName = (roleKey || 'Role').toUpperCase();

  const handleSaveAndApply = () => {
    onUpdatePermissions({
      enabledCapabilities: localCapabilities,
      dataScope: localScope,
      crudRules: localCrud,
      businessRules: localBusinessRules
    });
    toast.success(`Backend capabilities & business rules updated for ${safeRoleName}`);
    onOpenChange(false);
  };

  const filteredCapabilities = CAPABILITY_REGISTRY.filter(c => 
    c.name.toLowerCase().includes(capSearch.toLowerCase()) ||
    c.description.toLowerCase().includes(capSearch.toLowerCase()) ||
    c.module.toLowerCase().includes(capSearch.toLowerCase()) ||
    c.backendAction.toLowerCase().includes(capSearch.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[88vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Backend Action & Permission Control: {safeRoleName}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Enforces real API action execution, data access scopes, and business rules at the gateway.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-4 w-full bg-slate-100 p-1 mb-2">
            <TabsTrigger value="capabilities" className="text-xs">
              Backend Actions ({localCapabilities.length})
            </TabsTrigger>
            <TabsTrigger value="crud" className="text-xs">
              Entity CRUD Rules
            </TabsTrigger>
            <TabsTrigger value="scope" className="text-xs">
              Data Scope
            </TabsTrigger>
            <TabsTrigger value="rules" className="text-xs">
              Business Logic
            </TabsTrigger>
          </TabsList>

          {/* 1. Backend Actions Tab */}
          <TabsContent value="capabilities" className="flex-1 overflow-y-auto space-y-3 pr-1">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input 
                placeholder="Search backend capabilities (e.g. attendance, fees, marks)..."
                value={capSearch}
                onChange={(e) => setCapSearch(e.target.value)}
                className="pl-9 h-8 text-xs"
              />
            </div>

            <div className="space-y-2">
              {filteredCapabilities.map(cap => {
                const isEnabled = localCapabilities.includes(cap.id);
                return (
                  <div 
                    key={cap.id}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      isEnabled ? 'bg-indigo-50/40 border-indigo-200' : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-slate-900">{cap.name}</span>
                        <Badge variant="outline" className="text-[9px] font-mono bg-white">
                          action: {cap.backendAction}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">{cap.description}</p>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <Switch 
                        checked={isEnabled} 
                        onCheckedChange={() => toggleCapability(cap.id)} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* 2. CRUD Rules Tab */}
          <TabsContent value="crud" className="flex-1 overflow-y-auto space-y-2 pr-1">
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="p-3">Institutional Entity</th>
                    <th className="p-3 text-center">Create</th>
                    <th className="p-3 text-center">Read / View</th>
                    <th className="p-3 text-center">Update / Edit</th>
                    <th className="p-3 text-center">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {DEFAULT_CRUD_ENTITIES.map(entity => {
                    const rule = localCrud.find(r => r.entity === entity);
                    const actions = rule?.allowedActions || [];

                    return (
                      <tr key={entity} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold capitalize text-slate-900">
                          {entity.replace(/_/g, ' ')}
                        </td>
                        {(['create', 'view', 'edit', 'delete'] as const).map(act => {
                          const checked = actions.includes(act);
                          return (
                            <td key={act} className="p-3 text-center">
                              <input 
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleCrudAction(entity, act)}
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* 3. Data Access Scope Tab */}
          <TabsContent value="scope" className="flex-1 overflow-y-auto space-y-3 pr-1">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <Label className="text-xs font-bold text-slate-900">Data Visibility Boundary</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { value: 'all_records', label: 'All Institutional Records', desc: 'Can view records across all departments, courses, and classes.' },
                  { value: 'department_only', label: 'Department Scoped Only', desc: 'Restricted strictly to the user’s designated department.' },
                  { value: 'assigned_classes_only', label: 'Assigned Classes / Rosters Only', desc: 'Restricted only to students enrolled in their assigned classes.' },
                  { value: 'own_records_only', label: 'Self / Own Records Only', desc: 'Can only view and interact with their own personal submissions.' }
                ].map(opt => (
                  <div 
                    key={opt.value}
                    onClick={() => setLocalScope(opt.value as RoleDataAccessScope)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      localScope === opt.value
                        ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{opt.label}</span>
                      {localScope === opt.value && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">{opt.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* 4. Business Logic Tab */}
          <TabsContent value="rules" className="flex-1 overflow-y-auto space-y-3 pr-1">
            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Approval Limit Threshold (₹ INR)</Label>
                <Input 
                  type="number"
                  value={localBusinessRules.approvalLimitMaxAmount || 0}
                  onChange={(e) => setLocalBusinessRules(prev => ({ ...prev, approvalLimitMaxAmount: Number(e.target.value) }))}
                  className="h-8 text-xs max-w-xs"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div>
                  <span className="font-semibold text-xs text-slate-800">Assigned Classes Attendance Only</span>
                  <p className="text-[11px] text-slate-500">Block teachers from recording attendance for classes not assigned to them.</p>
                </div>
                <Switch 
                  checked={localBusinessRules.assignedClassesAttendanceOnly ?? true}
                  onCheckedChange={(val) => setLocalBusinessRules(prev => ({ ...prev, assignedClassesAttendanceOnly: val }))}
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div>
                  <span className="font-semibold text-xs text-slate-800">Require Principal Two-Tier Approval for Financial Concessions</span>
                  <p className="text-[11px] text-slate-500">Requires Dean signoff before concessions or scholarships are booked.</p>
                </div>
                <Switch 
                  checked={localBusinessRules.requirePrincipalApprovalForLeaves ?? true}
                  onCheckedChange={(val) => setLocalBusinessRules(prev => ({ ...prev, requirePrincipalApprovalForLeaves: val }))}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            Cancel
          </Button>
          <Button size="sm" onClick={handleSaveAndApply} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
            Apply Permissions & Rules
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
