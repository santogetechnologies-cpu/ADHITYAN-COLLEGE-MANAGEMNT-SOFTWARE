import React from 'react';
import { INSTITUTIONAL_13_ROLES } from './RoleSelectionHub';
import { College } from '@/types/multiCollege.types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  ArrowLeft, 
  ChevronDown, 
  Plus, 
  Layers, 
  Compass, 
  Sliders, 
  KeyRound, 
  Save, 
  UploadCloud, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  Grid
} from 'lucide-react';

interface LiveCustomizerToolbarProps {
  college: College;
  selectedRoleKey: string;
  isLiveEditMode: boolean;
  onToggleLiveEditMode: (active: boolean) => void;
  onSelectRole: (roleKey: string) => void;
  onBackToHub: () => void;
  onOpenWidgetSelector: () => void;
  onOpenAddPage: () => void;
  onOpenNavDrawer: () => void;
  onOpenSectionsModal: () => void;
  onOpenBackendPermissions: () => void;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  onSaveDraft: () => void;
  onPublish: () => void;
}

export function LiveCustomizerToolbar({
  college,
  selectedRoleKey,
  isLiveEditMode,
  onToggleLiveEditMode,
  onSelectRole,
  onBackToHub,
  onOpenWidgetSelector,
  onOpenAddPage,
  onOpenNavDrawer,
  onOpenSectionsModal,
  onOpenBackendPermissions,
  hasUnsavedChanges,
  isSaving,
  onSaveDraft,
  onPublish
}: LiveCustomizerToolbarProps) {
  const currentRoleMeta = INSTITUTIONAL_13_ROLES.find(r => r.key === selectedRoleKey) || INSTITUTIONAL_13_ROLES[0];
  const CurrentIcon = currentRoleMeta.icon;

  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white shadow-lg transition-all">
      <div className="w-full px-4 py-2.5 flex items-center justify-between gap-3">
        
        {/* Left: Back + Role Switcher */}
        <div className="flex items-center space-x-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBackToHub}
            className="text-slate-300 hover:text-white hover:bg-slate-800 h-8 px-2.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">Back to Roles</span>
          </Button>

          <div className="h-4 w-px bg-slate-700 mx-1 hidden sm:block" />

          {/* Quick Role Switcher Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700 hover:text-white h-8 text-xs font-semibold flex items-center space-x-2"
              >
                <div className={`w-4 h-4 rounded-md ${currentRoleMeta.colorScheme.iconBg} flex items-center justify-center text-[10px]`}>
                  <CurrentIcon className="w-3 h-3" />
                </div>
                <span className="max-w-[140px] truncate">{currentRoleMeta.name}</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 max-h-96 overflow-y-auto bg-slate-900 border-slate-800 text-slate-200">
              <DropdownMenuLabel className="text-xs text-slate-400 font-mono">
                Switch Role Portal
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-800" />
              {INSTITUTIONAL_13_ROLES.map((role) => {
                const Icon = role.icon;
                const isSelected = role.key === selectedRoleKey;
                return (
                  <DropdownMenuItem
                    key={role.key}
                    onClick={() => onSelectRole(role.key)}
                    className={`text-xs cursor-pointer flex items-center justify-between py-2 ${
                      isSelected ? 'bg-indigo-950 text-indigo-300 font-bold' : 'hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <div className={`w-5 h-5 rounded-md ${role.colorScheme.iconBg} flex items-center justify-center text-[10px]`}>
                        <Icon className="w-3 h-3" />
                      </div>
                      <span>{role.name}</span>
                    </div>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          <Badge variant="outline" className="border-slate-700 text-slate-400 text-[10px] hidden xl:inline-flex bg-slate-800/50">
            {college.code}
          </Badge>
        </div>

        {/* Center: Live Edit Mode Toggle & Quick Customization Actions */}
        <div className="flex items-center space-x-2">
          {/* Edit Mode Toggle */}
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-lg border transition-all ${
            isLiveEditMode 
              ? 'bg-indigo-950/80 border-indigo-500/80 text-indigo-200 ring-2 ring-indigo-500/20' 
              : 'bg-slate-800/80 border-slate-700 text-slate-400'
          }`}>
            <span className="flex items-center text-xs font-semibold select-none cursor-pointer" onClick={() => onToggleLiveEditMode(!isLiveEditMode)}>
              {isLiveEditMode ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-1.5" />
                  Live Edit Mode: <strong className="text-emerald-300 ml-1">ON</strong>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                  Preview: <span className="text-slate-300 ml-1">End-User Mode</span>
                </>
              )}
            </span>
            <Switch 
              checked={isLiveEditMode} 
              onCheckedChange={onToggleLiveEditMode}
              className="data-[state=checked]:bg-emerald-500"
            />
          </div>

          {/* Quick Customization Toolbar Buttons */}
          <div className="hidden lg:flex items-center space-x-1 border-l border-slate-800 pl-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={onOpenWidgetSelector}
              className="h-8 text-xs text-slate-200 hover:text-white hover:bg-slate-800 px-2.5"
            >
              <Grid className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
              + Add Widget
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={onOpenAddPage}
              className="h-8 text-xs text-slate-200 hover:text-white hover:bg-slate-800 px-2.5"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
              + Add Page
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={onOpenNavDrawer}
              className="h-8 text-xs text-slate-200 hover:text-white hover:bg-slate-800 px-2.5"
            >
              <Compass className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
              Sidebar & Nav
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={onOpenSectionsModal}
              className="h-8 text-xs text-slate-200 hover:text-white hover:bg-slate-800 px-2.5"
            >
              <Sliders className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
              Sections & Layout
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={onOpenBackendPermissions}
              className="h-8 text-xs text-slate-200 hover:text-white hover:bg-slate-800 px-2.5"
            >
              <KeyRound className="w-3.5 h-3.5 mr-1.5 text-rose-400" />
              Backend & Permissions
            </Button>
          </div>
        </div>

        {/* Right: Save Draft & Publish */}
        <div className="flex items-center space-x-2 shrink-0">
          {hasUnsavedChanges ? (
            <Badge variant="outline" className="border-amber-500/70 text-amber-300 bg-amber-950/40 text-[10px] hidden sm:inline-flex">
              ● Unsaved Changes
            </Badge>
          ) : (
            <Badge variant="outline" className="border-emerald-500/70 text-emerald-300 bg-emerald-950/40 text-[10px] hidden sm:inline-flex">
              ✓ Published Live
            </Badge>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onSaveDraft}
            disabled={isSaving}
            className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white h-8 text-xs"
          >
            <Save className="w-3.5 h-3.5 mr-1 text-slate-400" />
            <span className="hidden sm:inline">Save Draft</span>
          </Button>

          <Button
            size="sm"
            onClick={onPublish}
            disabled={isSaving}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold h-8 text-xs shadow-md shadow-indigo-950/40"
          >
            <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
            Publish Role
          </Button>
        </div>

      </div>
    </header>
  );
}
