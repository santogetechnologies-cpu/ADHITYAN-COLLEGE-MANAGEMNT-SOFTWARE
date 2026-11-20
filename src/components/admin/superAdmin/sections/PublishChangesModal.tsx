import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { 
  UploadCloud, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Clock, 
  Loader2, 
  Sparkles,
  Info
} from 'lucide-react';
import { MasterSystemConfigState } from '@/types/superAdmin.types';
import { superAdminService } from '@/services/superAdminService';

interface PublishChangesModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: MasterSystemConfigState;
  hasDrafts: boolean;
  onPublishSuccess: (releaseVersion: string) => void;
}

export function PublishChangesModal({
  isOpen,
  onClose,
  config,
  hasDrafts,
  onPublishSuccess
}: PublishChangesModalProps) {
  const [changeSummary, setChangeSummary] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Run validation
  const validation = superAdminService.validateConfiguration(config);

  const handlePublish = async () => {
    if (!validation.isValid) {
      setErrorMessage(`Cannot publish invalid configuration: ${validation.errors.join('; ')}`);
      return;
    }

    if (!changeSummary.trim()) {
      setErrorMessage('Please provide a short description or change summary for this release.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await superAdminService.publishConfiguration(
        { email: 'admin@gmail.com' },
        changeSummary
      );

      if (res.success && res.release) {
        onPublishSuccess(res.release.release_version);
        onClose();
      } else {
        setErrorMessage(res.error || 'Failed to publish configuration.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred while publishing.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-lg">
            <UploadCloud className="w-5 h-5 text-indigo-600" />
            <span>Publish Live System Configuration</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Review and deploy all active configuration drafts across all 13 ERP portals.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Pre-flight Validation Banner */}
          {validation.isValid ? (
            <div className="flex items-start space-x-2.5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Pre-Flight Validation Passed</span>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Super Admin role is protected, attendance policy ({config.globalSettings.attendancePolicyThreshold}%) is within bounds, and all core system modules are active.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start space-x-2.5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Pre-Flight Validation Failed</span>
                <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[11px]">
                  {validation.errors.map((e, idx) => (
                    <li key={idx}>{e}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Change Scope Summary */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-2">
            <h4 className="font-semibold text-slate-800 flex items-center justify-between">
              <span>Configuration Scope & Target Release</span>
              <Badge variant="outline" className="text-[10px] bg-indigo-50 border-indigo-200 text-indigo-700">
                Next Version
              </Badge>
            </h4>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
              <div>• Academic Year: <span className="font-semibold text-slate-800">{config.globalSettings.academicYear}</span></div>
              <div>• Active Roles: <span className="font-semibold text-slate-800">{Object.keys(config.roles).length} configured</span></div>
              <div>• Core Modules: <span className="font-semibold text-slate-800">{config.modules.filter(m => m.enabled).length} enabled</span></div>
              <div>• Granular Features: <span className="font-semibold text-slate-800">{config.features.filter(f => f.enabled).length} enabled</span></div>
            </div>
          </div>

          {/* Change Summary Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-800 flex items-center justify-between">
              <span>Release Change Notes / Description <span className="text-rose-500">*</span></span>
              <span className="text-[10px] text-muted-foreground">Recorded in Supabase audit_logs</span>
            </label>
            <Textarea
              placeholder="e.g., Updated semester attendance threshold to 75%, customized Principal dashboard KPIs, and activated NAAC Review module."
              value={changeSummary}
              onChange={(e) => setChangeSummary(e.target.value)}
              className="text-xs min-h-[80px]"
            />
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded border border-rose-200 font-medium">
              {errorMessage}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs"
          >
            Cancel
          </Button>

          <Button
            size="sm"
            onClick={handlePublish}
            disabled={isSubmitting || !validation.isValid}
            className="text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Publishing to Live Portals...
              </>
            ) : (
              <>
                <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
                Confirm & Deploy Live Release
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
