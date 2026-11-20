import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useCollege } from '@/context/CollegeContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  Shield, 
  Layers, 
  PlusCircle, 
  FileText, 
  Settings, 
  Sliders, 
  ClipboardList, 
  LogOut, 
  Home, 
  CheckCircle2, 
  AlertTriangle,
  ChevronDown,
  ExternalLink,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function PlatformAdminLayout() {
  const { user, logout } = useAuth();
  const { currentCollege, collegesList, switchCollege, isPlatformSuperAdmin } = useCollege();
  const navigate = useNavigate();
  const location = useLocation();

  const handleCollegeSwitch = async (collegeId: string) => {
    await switchCollege(collegeId);
  };

  const navLinks = [
    { to: '/platform-admin', label: 'Platform Overview', icon: Home, end: true },
    { to: '/platform-admin/colleges', label: 'Colleges Directory', icon: Building2 },
    { to: '/platform-admin/provision', label: 'Provision College', icon: PlusCircle },
    { to: '/platform-admin/templates', label: 'Config Templates', icon: Layers },
    { to: '/platform-admin/audit-logs', label: 'Platform Audit Logs', icon: ClipboardList },
    { to: '/platform-admin/settings', label: 'Platform Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      
      {/* 1. Global Platform Super Admin Navbar */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-md">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Platform Identity */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-white shadow-md">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-white">
                  Adithyan Platform Core
                </span>
                <Badge variant="outline" className="border-indigo-500/60 text-indigo-300 bg-indigo-950/60 text-[10px] font-semibold">
                  Multi-College Super Admin
                </Badge>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                Global Tenant Isolation & Institutional Governance Infrastructure
              </p>
            </div>
          </div>

          {/* College Switcher Dropdown (Super Admin Global Lens) */}
          <div className="flex items-center space-x-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-9 px-3 text-xs font-semibold bg-slate-800/90 hover:bg-slate-800 text-white border-slate-700 shadow-xs flex items-center space-x-2"
                >
                  <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="truncate max-w-[140px] sm:max-w-[200px]">
                    {currentCollege.name}
                  </span>
                  <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-slate-700 text-slate-300">
                    {currentCollege.code}
                  </Badge>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 p-2 bg-white rounded-xl shadow-xl border-slate-200">
                <DropdownMenuLabel className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-2 py-1">
                  Registered Colleges ({collegesList.length})
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {collegesList.map((col) => (
                  <DropdownMenuItem
                    key={col.id}
                    onClick={() => handleCollegeSwitch(col.id)}
                    className={`cursor-pointer text-xs p-2 rounded-lg flex items-center justify-between ${
                      col.id === currentCollege.id ? 'bg-indigo-50 text-indigo-700 font-bold' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="truncate">
                      <p className="font-semibold truncate">{col.name}</p>
                      <span className="text-[10px] text-muted-foreground">{col.code} • {col.institution_type}</span>
                    </div>
                    <Badge variant={col.status === 'active' ? 'default' : 'secondary'} className="text-[9px] ml-2 shrink-0">
                      {col.status}
                    </Badge>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => navigate('/platform-admin/provision')}
                  className="cursor-pointer text-xs p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 font-semibold flex items-center"
                >
                  <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                  <span>Onboard New College...</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Quick Button to Launch Workspace for current college */}
            <Button
              size="sm"
              onClick={() => navigate(`/platform-admin/workspace/${currentCollege.id}`)}
              className="h-9 px-3 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs hidden md:flex items-center space-x-1.5"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Configure College</span>
            </Button>

            {/* User Profile / Logout */}
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="h-9 w-9 p-0 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 2. Platform Navigation Bar */}
        <div className="bg-slate-950/60 border-t border-slate-800/80 px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-7xl mx-auto flex items-center space-x-1 overflow-x-auto py-1 text-xs">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-lg font-medium transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                      isActive
                        ? 'bg-indigo-600/90 text-white font-bold shadow-xs'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{link.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      </header>

      {/* 3. Main Platform Viewport */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}

export default PlatformAdminLayout;
