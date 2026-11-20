import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { History, RotateCcw, Check, Clock, User, FileText, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface RollbackVersionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRollbackSelected: (snapshotData: any, versionTag: string) => Promise<void>;
}

interface ReleaseItem {
  id: string;
  version: string;
  summary: string;
  author: string;
  createdAt: string;
  snapshot: any;
}

export function RollbackVersionDialog({
  open,
  onOpenChange,
  onRollbackSelected
}: RollbackVersionDialogProps) {
  const [releases, setReleases] = useState<ReleaseItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState<ReleaseItem | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    if (open) {
      loadHistory();
    }
  }, [open]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('action', 'publish_configuration')
        .order('created_at', { ascending: false })
        .limit(15);

      if (error) {
        console.warn('Could not query releases from audit_logs:', error);
      }

      if (data && data.length > 0) {
        const mapped: ReleaseItem[] = data.map((row: any) => ({
          id: row.id,
          version: row.new_values?.version || 'v1.0.0',
          summary: row.new_values?.notes || 'Configuration snapshot publish',
          author: row.user_email || 'admin@adithyan.edu.in',
          createdAt: row.created_at,
          snapshot: row.new_values?.snapshot || {}
        }));
        setReleases(mapped);
        if (mapped.length > 0) setSelectedRelease(mapped[0]);
      } else {
        // Fallback default snapshot
        const fallback: ReleaseItem = {
          id: 'initial_baseline',
          version: 'v1.0.0-baseline',
          summary: 'Institutional default baseline configuration',
          author: 'system@adithyan.edu.in',
          createdAt: new Date().toISOString(),
          snapshot: {}
        };
        setReleases([fallback]);
        setSelectedRelease(fallback);
      }
    } catch (err: any) {
      toast.error('Failed to load version history');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteRollback = async () => {
    if (!selectedRelease) return;
    setIsRestoring(true);
    try {
      await onRollbackSelected(selectedRelease.snapshot, selectedRelease.version);
      toast.success(`Successfully rolled back to version ${selectedRelease.version}`);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(`Rollback failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Configuration Releases & Snapshot Rollback
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Restore the entire ERP roles, modules, permissions, and layout state to any previous release.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-3 space-y-2">
          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-500">Loading version snapshots from audit log...</div>
          ) : releases.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">No previous published releases found.</div>
          ) : (
            releases.map((rel) => {
              const isSelected = selectedRelease?.id === rel.id;
              return (
                <div
                  key={rel.id}
                  onClick={() => setSelectedRelease(rel)}
                  className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-2xs' 
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-2">
                      <Badge className="bg-slate-800 text-white font-mono text-[10px]">
                        {rel.version}
                      </Badge>
                      <span className="font-semibold text-slate-900">{rel.summary}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {new Date(rel.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center">
                      <User className="w-3 h-3 mr-1 text-slate-400" />
                      Published by: {rel.author}
                    </span>
                    {isSelected && (
                      <span className="text-indigo-600 font-semibold flex items-center">
                        <Check className="w-3 h-3 mr-1" /> Selected for Rollback
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-between sm:justify-between">
          <div className="text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200 flex items-center">
            <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600 shrink-0" />
            <span>Restoring will overwrite current draft changes.</span>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!selectedRelease || isRestoring}
              onClick={handleExecuteRollback}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              {isRestoring ? 'Restoring...' : 'Restore Selected Release'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
