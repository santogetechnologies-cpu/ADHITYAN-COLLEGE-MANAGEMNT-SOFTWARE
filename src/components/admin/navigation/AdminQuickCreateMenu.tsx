import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Plus,
  UserPlus,
  Calendar,
  DollarSign,
  FileCheck,
  Stethoscope,
  Sparkles,
  Users
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function AdminQuickCreateMenu() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const canAccess = (roles: string[]) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return roles.includes(user.role);
  };

  const createActions = [
    {
      title: 'New Student Admission',
      desc: 'Candidate registration & counter intake',
      icon: UserPlus,
      url: '/admission-management',
      roles: ['admin', 'principal', 'receptionist']
    },
    {
      title: 'Provision Portal Login',
      desc: 'Assign credentials to approved student or parent',
      icon: Users,
      url: '/admin/users',
      roles: ['admin']
    },
    {
      title: 'Schedule Timetable Slot',
      desc: 'Add faculty period with clash detection',
      icon: Calendar,
      url: '/admin/timetable',
      roles: ['admin', 'principal']
    },
    {
      title: 'Record Fee Payment',
      desc: 'Issue counter fee receipt & update dues',
      icon: DollarSign,
      url: '/admin/finance',
      roles: ['admin', 'finance_manager', 'financier']
    },
    {
      title: 'Issue Official Certificate',
      desc: 'Bonafide, Transfer (TC) or Conduct document',
      icon: FileCheck,
      url: '/certificate-generation',
      roles: ['admin', 'principal']
    },
    {
      title: 'Log Health Incident',
      desc: 'Clinical checkup or campus infirmary record',
      icon: Stethoscope,
      url: '/medical-management',
      roles: ['admin', 'principal']
    }
  ].filter(action => canAccess(action.roles));

  if (createActions.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          className="h-9 px-3 gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-all"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Quick Create</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-72 p-2 shadow-2xl border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950 animate-in fade-in-80 zoom-in-95 duration-100"
      >
        <DropdownMenuLabel className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-blue-500" />
          <span>Quick Administrative Actions</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1" />

        <div className="space-y-1">
          {createActions.map(action => {
            const Icon = action.icon;
            return (
              <DropdownMenuItem
                key={action.title}
                onClick={() => navigate(action.url)}
                className="p-2 cursor-pointer rounded-xl flex items-start gap-2.5 focus:bg-slate-100 dark:focus:bg-slate-900 transition-colors"
              >
                <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {action.title}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                    {action.desc}
                  </p>
                </div>
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

