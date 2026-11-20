import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Database, 
  Download, 
  Upload, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileJson, 
  RefreshCw,
  HardDrive
} from 'lucide-react';
import { MasterSystemConfigState } from '@/types/superAdmin.types';
import { superAdminService } from '@/services/superAdminService';

interface BackupRestoreSectionProps {
  config: MasterSystemConfigState;
  onConfigReload: () => Promise<void>;
}

export function BackupRestoreSection({ config, onConfigReload }: BackupRestoreSectionProps) {
  const [backupName, setBackupName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreJsonInput, setRestoreJsonInput] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 1. Handle Backup Creation & Download
  const handleCreateAndDownloadBackup = async () => {
    const name = backupName.trim() || `Adithyan_ERP_Backup_${new Date().toISOString().slice(0, 10)}`;
    setIsCreating(true);
    setStatusMessage(null);

    try {
      const res = await superAdminService.createBackup(name, { email: 'admin@gmail.com' });
      if (res.success && res.backupPayload) {
        // Trigger browser file download
        const blob = new Blob([res.backupPayload], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${name.replace(/\s+/g, '_')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setStatusMessage({
          type: 'success',
          text: `Backup snapshot "${name}" created and downloaded successfully.`
        });
        setBackupName('');
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'Failed to generate backup snapshot.'
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Error occurred during backup creation.'
      });
    } finally {
      setIsCreating(false);
    }
  };

  // 2. Handle File Upload for Restore
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        setRestoreJsonInput(text);
        setStatusMessage({
          type: 'success',
          text: `File "${file.name}" loaded into inspector. Click "Verify & Restore Configuration" to proceed.`
        });
      } catch (err) {
        setStatusMessage({
          type: 'error',
          text: 'Failed to read the selected backup file.'
        });
      }
    };
    reader.readAsText(file);
  };

  // 3. Handle Restore Execution
  const handleExecuteRestore = async () => {
    if (!restoreJsonInput.trim()) {
      setStatusMessage({ type: 'error', text: 'Please select a backup JSON file or paste backup contents first.' });
      return;
    }

    if (!confirm('WARNING: Restoring will overwrite current system configurations with the uploaded snapshot. Are you sure you wish to continue?')) {
      return;
    }

    setIsRestoring(true);
    setStatusMessage(null);

    try {
      const res = await superAdminService.restoreFromBackupJson(
        restoreJsonInput,
        { email: 'admin@gmail.com' }
      );

      if (res.success) {
        await onConfigReload();
        setStatusMessage({
          type: 'success',
          text: 'Backup loaded as the shared DRAFT. Nothing has changed for users yet: review it and press Publish to make it live.'
        });
        setRestoreJsonInput('');
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'Backup file validation or restoration failed.'
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'An error occurred during restore execution.'
      });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              System Backup & Disaster Recovery
            </h2>
            <Badge variant="outline" className="text-xs border-indigo-200 text-indigo-700 bg-indigo-50">
              Disaster Recovery
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Create full-stack institutional configuration snapshots, export standalone JSON archives, and restore system state.
          </p>
        </div>
      </div>

      {/* Status Notification */}
      {statusMessage && (
        <div className={`p-3 rounded-lg border text-xs flex items-center space-x-2 ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* 2. Side-by-Side: Create Backup vs Restore Backup */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Create Backup Card */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded bg-indigo-50 text-indigo-600">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">Create Configuration Snapshot</CardTitle>
                <CardDescription className="text-xs">
                  Export complete configuration: 13 roles, modules, features, forms, workflows, and global policies.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Backup Snapshot Label (Optional):</label>
              <Input
                placeholder="e.g., Pre_Academic_Year_2026_Backup"
                value={backupName}
                onChange={(e) => setBackupName(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="bg-slate-50 p-3 rounded-md border border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>Active Version:</span>
                <span className="font-semibold text-slate-800">{config.activeReleaseVersion || 'v1.0.0'}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Roles:</span>
                <span className="font-semibold text-slate-800">{Object.keys(config.roles).length} roles</span>
              </div>
              <div className="flex justify-between">
                <span>Active Modules:</span>
                <span className="font-semibold text-slate-800">{config.modules.filter(m => m.enabled).length} modules</span>
              </div>
            </div>

            <Button
              onClick={handleCreateAndDownloadBackup}
              disabled={isCreating}
              className="w-full text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
            >
              {isCreating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Generating JSON Snapshot...
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Download JSON Backup Archive
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Restore Backup Card */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded bg-amber-50 text-amber-600">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">Restore From Backup</CardTitle>
                <CardDescription className="text-xs">
                  Restore institutional state from a verified JSON backup snapshot.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Upload Backup JSON File:</label>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Or Paste Raw Backup JSON:</label>
              <textarea
                rows={3}
                placeholder="Paste valid backup JSON configuration payload here..."
                value={restoreJsonInput}
                onChange={(e) => setRestoreJsonInput(e.target.value)}
                className="w-full text-[11px] font-mono border border-slate-200 rounded-md p-2 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start space-x-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Restoration will replace all current role, dashboard, navigation, and module settings with the uploaded configuration.
              </span>
            </div>

            <Button
              onClick={handleExecuteRestore}
              disabled={isRestoring || !restoreJsonInput.trim()}
              className="w-full text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
            >
              {isRestoring ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Verifying & Restoring...
                </>
              ) : (
                <>
                  <HardDrive className="w-3.5 h-3.5 mr-1.5" />
                  Verify & Restore Configuration
                </>
              )}
            </Button>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
