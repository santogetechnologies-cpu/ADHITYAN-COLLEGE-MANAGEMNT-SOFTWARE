import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useCollege } from '@/context/CollegeContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Building2,
  ChevronDown,
  Plus,
  Database,
  Palette,
  ShieldAlert,
  FileText,
  CheckCircle2,
  ExternalLink,
  LogOut,
  Layers,
  Sparkles,
  Server
} from 'lucide-react';
import { CreateCollegeDialog } from '../dialogs/CreateCollegeDialog';

export type SuperAdminMode = 'data' | 'customizer' | 'permissions' | 'audit';

interface SuperAdminMasterHeaderProps {
  activeMode: SuperAdminMode;
  onModeChange: (mode: SuperAdminMode) => void;
  selectedRoleKey?: string | null;
}

export function SuperAdminMasterHeader({
  activeMode,
  onModeChange,
  selectedRoleKey
}: SuperAdminMasterHeaderProps) {
  const { user, signOut } = useAuth();
  const { currentCollege, collegesList, switchCollege, isPlatformSuperAdmin } = useCollege();
  const navigate = useNavigate();
  const [createCollegeOpen, setCreateCollegeOpen] = useState(false);

  const handleCollegeSelect = async (collegeId: string) => {
    if (collegeId === currentCollege.id) return;
    await switchCollege(collegeId);
  };

  const modes: { id: SuperAdminMode; label: string; icon: React.ElementType; description: string }[] = [
    {
      id: 'data',
      label: 'Central Data Management',
      icon: Database,
      description: 'Manage Courses, College Settings, Students, Fees & Admissions'
    },
    {
      id: 'customizer',
      label: 'Live Role Portals & Visual Customizer',
      icon: Palette,
      description: 'Select Role & Customize live on the actual portal with [✏️] and [+]'
    },
    {
      id: 'permissions',
      label: 'Role Capabilities & Permissions',
      icon: ShieldAlert,
      description: 'Granular CRUD rules, data scopes, and business rule controls'
    },
    {
      id: 'audit',
      label: 'Platform Audit Logs',
      icon: FileText,
      description: 'System actions, change histories, and multi-tenant security logs'
    }
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-xl select-none">
        {/* Tier 1: Platform Brand + Sticky College Selector + Status */}
        <div className="px-4 py-2.5 flex items-center justify-between gap-4 border-b border-slate-800/80">
          
          {/* Brand & Platform Super Admin Badge */}
          <div className="flex items-center space-x-3 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-md shadow-indigo-950">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-black text-sm tracking-tight text-white">ADITHYAN ERP</span>
                <Badge variant="outline" className="bg-indigo-500/20 text-indigo-300 border-indigo-500/40 text-[10px] uppercase font-bold py-0 h-4">
                  Platform Super Admin
                </Badge>
              </div>
              <p className="text-[11px] text-slate-400">Multi-College Command & Control Console</p>
            </div>
          </div>

          {/* Sticky College Selector Dropdown (Tenant Isolation Control) */}
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-semibold text-slate-400 hidden md:inline">ACTIVE COLLEGE:</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="bg-slate-800/90 border-slate-700 hover:bg-slate-700/80 text-white h-9 px-3 text-xs font-semibold flex items-center space-x-2.5 shadow-sm transition-all focus:ring-1 focus:ring-indigo-500"
                >
                  <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div className="flex flex-col text-left">
                    <span className="max-w-[220px] sm:max-w-[320px] truncate text-xs font-bold leading-tight">
                      {currentCollege.name}
                    </span>
                    <span className="text-[10px] text-slate-400 leading-none">
                      {currentCollege.code} • {currentCollege.institution_type || 'Paramedical'}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-80 bg-slate-900 border-slate-800 text-slate-200 p-1.5 shadow-2xl">
                <DropdownMenuLabel className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                  Select College Environment
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-800" />
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {collegesList.map((col) => {
                    const isSelected = col.id === currentCollege.id;
                    return (
                      <DropdownMenuItem
                        key={col.id}
                        onClick={() => handleCollegeSelect(col.id)}
                        className={`cursor-pointer rounded-md p-2 flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/30 font-semibold'
                            : 'hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <Building2 className={`w-4 h-4 ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`} />
                          <div>
                            <div className="text-xs font-medium leading-snug">{col.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{col.code}</div>
                          </div>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                </div>
                {isPlatformSuperAdmin && (
                  <>
                    <DropdownMenuSeparator className="bg-slate-800 my-1" />
                    <DropdownMenuItem
                      onClick={() => setCreateCollegeOpen(true)}
                      className="cursor-pointer text-indigo-400 hover:text-indigo-300 hover:bg-slate-800/80 font-semibold text-xs p-2 rounded-md flex items-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Register New College Tenant</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {isPlatformSuperAdmin && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCreateCollegeOpen(true)}
                className="bg-indigo-600/20 border-indigo-500/40 text-indigo-300 hover:bg-indigo-600/40 hover:text-white h-9 px-2.5 text-xs font-semibold hidden lg:flex items-center space-x-1"
                title="Provision New College"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New College</span>
              </Button>
            )}
          </div>

          {/* Right Status & Actions */}
          <div className="flex items-center space-x-3 shrink-0">
            <div className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Database Connected</span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="text-slate-300 hover:text-white hover:bg-slate-800 h-8 px-2.5 text-xs font-semibold"
              title="Return to standard dashboard view"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1" />
              <span className="hidden sm:inline">Open Portal</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut()}
              className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 h-8 px-2 text-xs font-semibold"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Tier 2: Operational Mode Switcher Strip */}
        <div className="px-4 py-1.5 flex items-center space-x-1 overflow-x-auto bg-slate-950/70 border-t border-slate-800/40 scrollbar-none">
          {modes.map((mode) => {
            const isActive = activeMode === mode.id;
            const Icon = mode.icon;
            return (
              <button
                key={mode.id}
                onClick={() => onModeChange(mode.id)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-900/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
                title={mode.description}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{mode.label}</span>
                {mode.id === 'customizer' && selectedRoleKey && (
                  <Badge variant="secondary" className="bg-slate-900/60 text-slate-200 text-[10px] py-0 px-1.5 h-4 ml-1">
                    {selectedRoleKey}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* College Provisioning Modal */}
      <CreateCollegeDialog
        open={createCollegeOpen}
        onOpenChange={setCreateCollegeOpen}
      />
    </>
  );
}
