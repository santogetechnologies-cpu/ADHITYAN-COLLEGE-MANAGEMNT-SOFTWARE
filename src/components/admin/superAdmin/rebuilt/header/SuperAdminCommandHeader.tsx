import React from 'react';
import { 
  Building2, 
  ShieldCheck, 
  Save, 
  Send, 
  RotateCcw, 
  History, 
  Database, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { College } from '@/types/institution.types';

interface SuperAdminCommandHeaderProps {
  activeCollege: College;
  activeVersion: string;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  onSaveDraft: () => void;
  onPublishLive: () => void;
  onOpenRollbackDialog: () => void;
}

export function SuperAdminCommandHeader({
  activeCollege,
  activeVersion,
  hasUnsavedChanges,
  isSaving,
  onSaveDraft,
  onPublishLive,
  onOpenRollbackDialog
}: SuperAdminCommandHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Left: Branding & College Selector */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-100 font-bold">
            <ShieldCheck className="w-5 h-5 text-indigo-100" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-900 tracking-tight text-base sm:text-lg">
                Super Admin Command Center
              </span>
              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-semibold">
                {activeVersion || 'v2.1.0'}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-2 text-xs text-slate-500">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Institution:</span>
              <span className="font-medium text-slate-700">{activeCollege.name}</span>
            </div>
          </div>
        </div>

        {/* Center / Status telemetry */}
        <div className="hidden md:flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-medium text-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Supabase Gateway Active</span>
          </div>

          {hasUnsavedChanges ? (
            <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-[11px] font-medium text-amber-800">
              <AlertCircle className="w-3 h-3 text-amber-600" />
              <span>Unsaved Draft Edits</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-600">
              <CheckCircle2 className="w-3 h-3 text-slate-500" />
              <span>Synchronized with Live</span>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenRollbackDialog}
            className="h-8 text-xs text-slate-700 hover:bg-slate-100"
            title="View Release Snapshots & Rollback"
          >
            <History className="w-3.5 h-3.5 mr-1 text-slate-500" />
            <span className="hidden sm:inline">History & Rollback</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onSaveDraft}
            disabled={isSaving || !hasUnsavedChanges}
            className="h-8 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
          >
            <Save className="w-3.5 h-3.5 mr-1" />
            <span>Save Draft</span>
          </Button>

          <Button
            size="sm"
            onClick={onPublishLive}
            disabled={isSaving}
            className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs font-medium"
          >
            <Send className="w-3.5 h-3.5 mr-1" />
            <span>Publish Live</span>
          </Button>
        </div>

      </div>
    </header>
  );
}
