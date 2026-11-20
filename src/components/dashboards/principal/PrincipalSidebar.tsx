import React from 'react';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  GraduationCap, 
  Clock, 
  BookOpen, 
  Award, 
  UserCheck, 
  BarChart3, 
  ShieldCheck, 
  Calendar, 
  Megaphone, 
  Settings, 
  LogOut,
  X,
  Sparkles
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export type PrincipalView = 
  | 'dashboard'
  | 'departments'
  | 'students'
  | 'faculty'
  | 'attendance'
  | 'academics'
  | 'examinations'
  | 'admissions'
  | 'reports'
  | 'approvals'
  | 'events'
  | 'announcements'
  | 'settings';

interface SidebarItem {
  id: PrincipalView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

interface PrincipalSidebarProps {
  currentView: PrincipalView;
  onSelectView: (view: PrincipalView) => void;
  onLogout: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  counts: {
    students: number;
    faculty: number;
    departments: number;
    pendingApprovals: number;
    pendingAdmissions: number;
  };
  principalName?: string;
}

export function PrincipalSidebar({
  currentView,
  onSelectView,
  onLogout,
  mobileOpen,
  onMobileClose,
  counts,
  principalName = 'Executive Principal'
}: PrincipalSidebarProps) {
  const menuItems: SidebarItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'departments', label: 'Departments', icon: Building2, badge: counts.departments },
    { id: 'students', label: 'Students', icon: Users, badge: counts.students },
    { id: 'faculty', label: 'Faculty & Staff', icon: GraduationCap, badge: counts.faculty },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'academics', label: 'Academics', icon: BookOpen },
    { id: 'examinations', label: 'Examinations', icon: Award },
    { 
      id: 'admissions', 
      label: 'Admissions', 
      icon: UserCheck, 
      badge: counts.pendingAdmissions > 0 ? counts.pendingAdmissions : undefined,
      badgeVariant: 'secondary'
    },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { 
      id: 'approvals', 
      label: 'Approvals', 
      icon: ShieldCheck, 
      badge: counts.pendingApprovals > 0 ? counts.pendingApprovals : undefined,
      badgeVariant: 'destructive'
    },
    { id: 'events', label: 'Events & Calendar', icon: Calendar },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleItemClick = (id: PrincipalView) => {
    onSelectView(id);
    onMobileClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 xl:w-70 bg-[#071E47] text-slate-100 flex flex-col justify-between z-50 transition-transform duration-200 ease-in-out border-r border-blue-900/40 select-none shadow-xl shrink-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Header & Branding */}
        <div>
          <div className="p-4 flex items-center justify-between border-b border-blue-900/50">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-white p-1 flex items-center justify-center shrink-0 shadow-xs">
                <img 
                  src="/lovable-uploads/8ea95178-bb37-43e2-ae4d-595e31707954.png" 
                  alt="Adithyan College"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-white tracking-tight truncate">
                  Adithyan College
                </h2>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  <span className="text-[10px] text-blue-200 uppercase tracking-wider font-semibold">
                    Principal Portal
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                </div>
              </div>
            </div>

            {/* Mobile close button */}
            <button 
              onClick={onMobileClose}
              className="lg:hidden p-1 text-slate-400 hover:text-white rounded-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Module Navigation List */}
          <nav className="p-2.5 space-y-0.5 overflow-y-auto max-h-[calc(100vh-140px)] scrollbar-thin scrollbar-thumb-blue-800">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-[#1D61E7] text-white font-semibold shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge !== undefined && (
                    <Badge 
                      variant={item.badgeVariant || 'secondary'} 
                      className={`text-[10px] h-4.5 px-1.5 font-bold ${
                        item.badgeVariant === 'destructive'
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-blue-900/60 text-blue-200'
                      }`}
                    >
                      {item.badge}
                    </Badge>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer User Info & Logout */}
        <div className="p-3 border-t border-blue-900/50 bg-[#051636]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 border border-blue-400/40">
                PR
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {principalName}
                </p>
                <p className="text-[10px] text-blue-300 truncate">
                  Principal & Dean
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={onLogout}
              title="Sign Out"
              className="h-8 w-8 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
