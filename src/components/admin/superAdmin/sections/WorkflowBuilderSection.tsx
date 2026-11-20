import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  GitBranch, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Users, 
  ShieldCheck, 
  Save, 
  Loader2,
  FileCheck,
  AlertCircle
} from 'lucide-react';
import { WorkflowBuilderConfig } from '@/types/superAdmin.types';
import { DEFAULT_WORKFLOWS } from '@/services/superAdminDefaults';

interface WorkflowBuilderSectionProps {
  workflows?: Record<string, WorkflowBuilderConfig>;
  onSaveWorkflowDraft?: (wfId: string, updatedWf: WorkflowBuilderConfig) => Promise<boolean>;
}

export function WorkflowBuilderSection({
  workflows = DEFAULT_WORKFLOWS,
  onSaveWorkflowDraft
}: WorkflowBuilderSectionProps) {
  const [currentWorkflows, setCurrentWorkflows] = useState<Record<string, WorkflowBuilderConfig>>(workflows);
  const [saving, setSaving] = useState(false);

  const toggleWorkflow = (wfId: string) => {
    const target = currentWorkflows[wfId];
    if (!target) return;
    setCurrentWorkflows({
      ...currentWorkflows,
      [wfId]: { ...target, enabled: !target.enabled }
    });
  };

  const handleSave = async (wfId: string) => {
    if (!onSaveWorkflowDraft) return;
    setSaving(true);
    try {
      await onSaveWorkflowDraft(wfId, currentWorkflows[wfId]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Functional Institutional Workflow Engine
            </h2>
            <Badge variant="outline" className="text-xs border-indigo-200 text-indigo-700 bg-indigo-50">
              Stage Transitions
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure multi-stage approval sequences, authorized sanction roles, and automated notifications for real ERP processes.
          </p>
        </div>
      </div>

      {/* 2. Workflows List */}
      <div className="space-y-4">
        {Object.values(currentWorkflows).map((wf) => (
          <Card key={wf.workflowId} className="border-slate-200 shadow-2xs">
            <CardHeader className="py-3 px-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <GitBranch className="w-4 h-4 text-primary" />
                  <CardTitle className="text-sm font-bold text-slate-900">{wf.name}</CardTitle>
                  <Badge variant="outline" className={`text-[10px] ${wf.enabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                    {wf.enabled ? 'Active Pipeline' : 'Paused'}
                  </Badge>
                </div>
                <CardDescription className="text-xs text-slate-600 mt-1">
                  {wf.description} • Target Entity: <span className="font-mono text-slate-800">{wf.targetEntity}</span>
                </CardDescription>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleWorkflow(wf.workflowId)}
                  className="h-7 text-[11px] font-semibold"
                >
                  {wf.enabled ? 'Deactivate' : 'Activate'}
                </Button>
                {onSaveWorkflowDraft && (
                  <Button
                    size="sm"
                    disabled={saving}
                    onClick={() => handleSave(wf.workflowId)}
                    className="h-7 text-[11px] font-semibold bg-primary text-primary-foreground"
                  >
                    Save Draft
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-4">
              <div className="space-y-3">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Sequential Approval & Execution Stages
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {wf.stages.map((stage, idx) => (
                    <div key={stage.stageId} className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2 relative">
                      <div className="flex items-center justify-between">
                        <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground font-bold text-[10px] flex items-center justify-center">
                          {stage.order}
                        </span>
                        <Badge variant="outline" className="text-[9px] uppercase font-mono bg-white">
                          Role: {stage.assignedRole}
                        </Badge>
                      </div>

                      <div>
                        <span className="font-bold text-xs text-slate-900 block">{stage.name}</span>
                        <span className="text-[10px] text-muted-foreground block capitalize mt-0.5">
                          Action: {stage.actionRequired.replace('_', ' & ')}
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-600 border-t border-slate-200 pt-1.5 flex items-center justify-between">
                        <span>Auto-Notify:</span>
                        <span className="font-medium text-slate-800">{stage.notifyRoles.join(', ')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
