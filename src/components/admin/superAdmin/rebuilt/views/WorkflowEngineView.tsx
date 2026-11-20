import React, { useState, useEffect } from 'react';
import { 
  workflowEngineService, 
  InstitutionalWorkflow, 
  WorkflowStage 
} from '@/services/workflowEngineService';
import { UserRole } from '@/context/AuthContext';
import { 
  GitBranch, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Trash2, 
  ArrowRight, 
  Users, 
  ShieldCheck, 
  Bell, 
  Settings2,
  FileCheck2,
  Save,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const ALL_ROLES: { key: UserRole; name: string }[] = [
  { key: 'admin', name: 'Institutional Administrator' },
  { key: 'principal', name: 'Principal / Dean' },
  { key: 'teacher', name: 'Faculty' },
  { key: 'hod', name: 'HOD' },
  { key: 'coe', name: 'Controller of Examinations' },
  { key: 'finance_manager', name: 'Finance Manager' },
  { key: 'accountant', name: 'Accountant' },
  { key: 'receptionist', name: 'Receptionist' },
  { key: 'hr_manager', name: 'HR Manager' },
  { key: 'store_manager', name: 'Store Manager' }
];

export function WorkflowEngineView() {
  const [workflows, setWorkflows] = useState<InstitutionalWorkflow[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('wf_student_admission');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    setIsLoading(true);
    try {
      const data = await workflowEngineService.getWorkflows();
      setWorkflows(data);
    } catch {
      toast.error('Failed to load workflow engine state');
    } finally {
      setIsLoading(false);
    }
  };

  const activeWorkflow = workflows.find(w => w.id === selectedWorkflowId) || workflows[0];

  const handleToggleWorkflowActive = async (checked: boolean) => {
    if (!activeWorkflow) return;
    const updated = { ...activeWorkflow, isActive: checked };
    const saved = await workflowEngineService.updateWorkflow(updated);
    if (!saved) {
      toast.error(`Could not ${checked ? 'activate' : 'deactivate'} "${activeWorkflow.name}". Nothing was changed.`);
      return;
    }
    setWorkflows(prev => prev.map(w => w.id === activeWorkflow.id ? updated : w));
    toast.success(`Workflow "${activeWorkflow.name}" is now ${checked ? 'Active' : 'Deactivated'}`);
  };

  const handleUpdateStage = async (stageId: string, updates: Partial<WorkflowStage>) => {
    if (!activeWorkflow) return;
    const nextStages = activeWorkflow.stages.map(s => s.id === stageId ? { ...s, ...updates } : s);
    const updatedWf = { ...activeWorkflow, stages: nextStages };
    setWorkflows(prev => prev.map(w => w.id === activeWorkflow.id ? updatedWf : w));
  };

  const handleAddStage = () => {
    if (!activeWorkflow) return;
    const newStage: WorkflowStage = {
      id: `stage_${Date.now()}`,
      name: 'New Approval Stage',
      order: activeWorkflow.stages.length + 1,
      responsibleRoles: ['principal', 'admin'],
      requiredApprovals: 1,
      allowedActions: ['approve', 'reject'],
      rejectionBehavior: 'terminate',
      targetStatusOnApproval: 'approved',
      targetStatusOnRejection: 'rejected',
      sendNotificationOnEntry: true,
      notificationTemplate: 'Your application has advanced to this stage.'
    };
    const updated = {
      ...activeWorkflow,
      stages: [...activeWorkflow.stages, newStage]
    };
    setWorkflows(prev => prev.map(w => w.id === activeWorkflow.id ? updated : w));
    toast.success('Added new approval stage');
  };

  const handleRemoveStage = (stageId: string) => {
    if (!activeWorkflow) return;
    if (activeWorkflow.stages.length <= 1) {
      toast.error('A workflow must have at least one stage');
      return;
    }
    const filtered = activeWorkflow.stages.filter(s => s.id !== stageId).map((s, idx) => ({ ...s, order: idx + 1 }));
    const updated = { ...activeWorkflow, stages: filtered };
    setWorkflows(prev => prev.map(w => w.id === activeWorkflow.id ? updated : w));
    toast.success('Stage removed');
  };

  const handleSaveWorkflowConfig = async () => {
    if (!activeWorkflow) return;
    setIsSaving(true);
    try {
      const saved = await workflowEngineService.updateWorkflow(activeWorkflow);
      if (!saved) throw new Error('The server did not accept the change (administrator access required).');
      toast.success(`Workflow "${activeWorkflow.name}" saved. (Definitions are stored for all administrators; approval stages are not enforced by the application yet.)`);
    } catch (err: any) {
      toast.error(`Failed to save workflow: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Workflow Selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center">
              <GitBranch className="w-5 h-5 mr-2 text-indigo-600" />
              Institutional Workflow & Multi-Stage Approval Engine
            </h2>
            <p className="text-xs text-slate-500">
              Configure responsible roles, required approval tiers, rejection behaviors, and state transitions for real ERP operations.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Select value={selectedWorkflowId} onValueChange={setSelectedWorkflowId}>
              <SelectTrigger className="h-8 text-xs font-semibold bg-indigo-50 border-indigo-200 text-indigo-900 w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {workflows.map(w => (
                  <SelectItem key={w.id} value={w.id} className="text-xs">
                    {w.name} ({w.category})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              size="sm"
              onClick={handleSaveWorkflowConfig}
              disabled={isSaving}
              className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
            >
              <Save className="w-3.5 h-3.5 mr-1" />
              <span>Save Workflow</span>
            </Button>
          </div>
        </div>

        {/* Selected Workflow Meta */}
        {activeWorkflow && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2">
              <Badge className="bg-indigo-600 text-white font-semibold">
                {activeWorkflow.name}
              </Badge>
              <Badge variant="outline" className="border-slate-300 text-slate-600">
                Entity: {activeWorkflow.entityTable}
              </Badge>
              <span className="text-slate-500">Version: v{activeWorkflow.version}.0</span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-slate-600 font-medium">Status:</span>
              <div className="flex items-center space-x-1.5">
                <Switch
                  checked={activeWorkflow.isActive}
                  onCheckedChange={handleToggleWorkflowActive}
                />
                <span className={`font-semibold ${activeWorkflow.isActive ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {activeWorkflow.isActive ? 'Active & Enforced' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Visual Multi-Stage Stepper & Inspector */}
      {activeWorkflow && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Configured Stages ({activeWorkflow.stages.length} Total)
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddStage}
              className="text-xs h-8 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Stage
            </Button>
          </div>

          <div className="space-y-4">
            {activeWorkflow.stages.map((stage, index) => (
              <div
                key={stage.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4 hover:border-slate-300 transition-all"
              >
                {/* Stage Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                      {stage.order}
                    </div>
                    <div>
                      <Input
                        value={stage.name}
                        onChange={(e) => handleUpdateStage(stage.id, { name: e.target.value })}
                        className="h-7 text-xs font-bold text-slate-900 max-w-sm"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveStage(stage.id)}
                      className="text-rose-600 hover:bg-rose-50 h-7 text-xs px-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Stage Config Matrix */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  
                  {/* Responsible Roles */}
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1.5 flex items-center">
                      <Users className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      Responsible Roles
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {ALL_ROLES.map(r => {
                        const isAssigned = stage.responsibleRoles.includes(r.key);
                        return (
                          <button
                            key={r.key}
                            type="button"
                            onClick={() => {
                              const nextRoles = isAssigned
                                ? stage.responsibleRoles.filter(role => role !== r.key)
                                : [...stage.responsibleRoles, r.key];
                              handleUpdateStage(stage.id, { responsibleRoles: nextRoles });
                            }}
                            className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                              isAssigned
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {r.name.split(' ')[0]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Required Approvals */}
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1.5 flex items-center">
                      <ShieldCheck className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      Required Sign-offs
                    </label>
                    <Select
                      value={String(stage.requiredApprovals)}
                      onValueChange={(val) => handleUpdateStage(stage.id, { requiredApprovals: parseInt(val, 10) })}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Approval (Standard)</SelectItem>
                        <SelectItem value="2">2 Approvals (Dual-Sign)</SelectItem>
                        <SelectItem value="3">3 Approvals (Executive Council)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Rejection Behavior */}
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1.5 flex items-center">
                      <AlertCircle className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      Rejection Behavior
                    </label>
                    <Select
                      value={stage.rejectionBehavior}
                      onValueChange={(val: any) => handleUpdateStage(stage.id, { rejectionBehavior: val })}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="terminate">Terminate / Reject Entirely</SelectItem>
                        <SelectItem value="return_to_previous">Return to Previous Stage</SelectItem>
                        <SelectItem value="return_to_initiator">Return to Initiator for Correction</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Target Status On Approval */}
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1.5 flex items-center">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      Status on Approval
                    </label>
                    <Input
                      value={stage.targetStatusOnApproval}
                      onChange={(e) => handleUpdateStage(stage.id, { targetStatusOnApproval: e.target.value })}
                      className="h-7 text-xs font-mono"
                    />
                  </div>

                </div>

                {/* Entry Notification */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <Bell className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-600">Send Notification Alert on Entry:</span>
                    <Switch
                      checked={stage.sendNotificationOnEntry}
                      onCheckedChange={(c) => handleUpdateStage(stage.id, { sendNotificationOnEntry: c })}
                    />
                  </div>

                  {stage.sendNotificationOnEntry && (
                    <Input
                      placeholder="Notification text..."
                      value={stage.notificationTemplate || ''}
                      onChange={(e) => handleUpdateStage(stage.id, { notificationTemplate: e.target.value })}
                      className="h-7 text-xs max-w-md"
                    />
                  )}
                </div>

              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
