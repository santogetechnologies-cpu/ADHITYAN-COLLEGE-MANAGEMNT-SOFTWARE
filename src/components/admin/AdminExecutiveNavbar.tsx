import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Home,
  Users,
  GraduationCap,
  DollarSign,
  Grid,
  ChevronDown,
  Search,
  Menu,
  LogOut,
  User,
  Settings,
  FileText,
  Calendar,
  Layers,
  HeartHandshake,
  Briefcase,
  UserPlus,
  ClipboardList,
  Package,
  Truck,
  BookOpen,
  Stethoscope,
  Shield,
  Activity,
  Award,
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import {
  ALL_SMART_MODULES,
  SMART_CATEGORIES,
  SmartNavModule,
  getActiveDepartment
} from '@/config/smartAdminNavigation';
import { AdminCommandPalette } from './navigation/AdminCommandPalette';
import { AdminNotificationCenter } from './navigation/AdminNotificationCenter';
import { AdminQuickCreateMenu } from './navigation/AdminQuickCreateMenu';
import { AdminMegaMenu } from './navigation/AdminMegaMenu';
import { InstitutionName } from '@/lib/institution';

export function AdminExecutiveNavbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Global Ctrl+K / Cmd+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const canAccess = (roles: string[]) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return roles.includes(user.role);
  };

  const activeDepartment = useMemo(() => {
    return getActiveDepartment(location.pathname);
  }, [location.pathname]);

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin':
        return 'System Administrator';
      case 'principal':
        return 'Executive Principal';
      case 'finance_manager':
        return 'Finance Manager';
      case 'store_manager':
        return 'Central Store Manager';
      case 'transport_driver':
        return 'Transport Officer';
      default:
        return role ? role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Administrator';
    }
  };

  // Department Items for Dropdowns
  const peopleModules = useMemo(() => {
    return ALL_SMART_MODULES.filter(m => m.category === 'people' && canAccess(m.roles));
  }, [user]);

  const academicModules = useMemo(() => {
    return ALL_SMART_MODULES.filter(m => m.category === 'academics' && canAccess(m.roles));
  }, [user]);

  const financeModules = useMemo(() => {
    return ALL_SMART_MODULES.filter(m => m.category === 'finance' && canAccess(m.roles));
  }, [user]);

  const renderDropdownItems = (modules: SmartNavModule[]) => (
    <div className="space-y-0.5 p-1">
      {modules.map(mod => {
        const Icon = mod.icon;
        const isActive = location.pathname === mod.url || (mod.url.includes('?') && location.pathname === mod.url.split('?')[0]);
        return (
          <DropdownMenuItem
            key={mod.id}
            onClick={() => navigate(mod.url)}
            className={`cursor-pointer rounded-xl p-2 flex items-start gap-2.5 transition-colors ${
              isActive
                ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-900 dark:text-blue-100 font-semibold'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs truncate">{mod.shortTitle || mod.title}</span>
                {mod.badge && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-blue-200 text-blue-700 dark:text-blue-300">
                    {mod.badge}
                  </Badge>
                )}
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-1">{mod.description}</p>
            </div>
          </DropdownMenuItem>
        );
      })}
    </div>
  );

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/90 shadow-xs transition-all">
        <div className="w-full max-w-screen-2xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-2 sm:gap-4">

            {/* ========================================================= */}
            {/* 1. INSTITUTIONAL BRAND SECTION (Compact & Distinctive)     */}
            {/* ========================================================= */}
            <div className="flex items-center gap-3 shrink-0">
              <NavLink
                to="/admin"
                className="group flex items-center gap-2.5 transition-opacity hover:opacity-95"
              >
                <img
                  src="/lovable-uploads/8ea95178-bb37-43e2-ae4d-595e31707954.png"
                  alt="Adithyan College"
                  className="h-9 w-9 object-contain rounded-xl bg-white p-0.5 shadow-xs border border-slate-200/80"
                />
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                      <InstitutionName />
                    </span>
                    <Badge
                      variant="outline"
                      className="hidden sm:inline-flex text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0 border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300 bg-blue-50/60 dark:bg-blue-950/40"
                    >
                      ERP Console
                    </Badge>
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium hidden sm:block">
                    Institution Management
                  </span>
                </div>
              </NavLink>
            </div>

            {/* ========================================================= */}
            {/* 2. SMART DEPARTMENT NAVIGATION (Primary 5 Pillars)        */}
            {/* ========================================================= */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-2 flex-1 justify-center min-w-0 px-2">
              
              {/* 1. Overview */}
              <NavLink
                to="/admin"
                end
                className={({ isActive }) =>
                  `relative px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'text-blue-700 dark:text-blue-300 font-bold after:absolute after:bottom-[-18px] after:left-2 after:right-2 after:h-0.5 after:bg-blue-600 dark:after:bg-blue-400 after:rounded-full bg-blue-50/50 dark:bg-blue-950/30'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                  }`
                }
              >
                <Home className="h-3.5 w-3.5 opacity-80" />
                <span>Overview</span>
              </NavLink>

              {/* 2. People */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`relative px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      activeDepartment === 'people'
                        ? 'text-blue-700 dark:text-blue-300 font-bold after:absolute after:bottom-[-18px] after:left-2 after:right-2 after:h-0.5 after:bg-blue-600 dark:after:bg-blue-400 after:rounded-full bg-blue-50/50 dark:bg-blue-950/30'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Users className="h-3.5 w-3.5 opacity-80" />
                    <span>People</span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" sideOffset={14} className="w-76 p-2 rounded-2xl shadow-xl border-slate-200 dark:border-slate-800">
                  <DropdownMenuLabel className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Students, Faculty & Staff
                  </DropdownMenuLabel>
                  {renderDropdownItems(peopleModules)}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* 3. Academics */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`relative px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      activeDepartment === 'academics'
                        ? 'text-blue-700 dark:text-blue-300 font-bold after:absolute after:bottom-[-18px] after:left-2 after:right-2 after:h-0.5 after:bg-blue-600 dark:after:bg-blue-400 after:rounded-full bg-blue-50/50 dark:bg-blue-950/30'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <GraduationCap className="h-3.5 w-3.5 opacity-80" />
                    <span>Academics</span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" sideOffset={14} className="w-80 p-2 rounded-2xl shadow-xl border-slate-200 dark:border-slate-800">
                  <DropdownMenuLabel className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Paramedical Curriculum & Timetables
                  </DropdownMenuLabel>
                  {renderDropdownItems(academicModules)}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* 4. Finance */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`relative px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      activeDepartment === 'finance'
                        ? 'text-blue-700 dark:text-blue-300 font-bold after:absolute after:bottom-[-18px] after:left-2 after:right-2 after:h-0.5 after:bg-blue-600 dark:after:bg-blue-400 after:rounded-full bg-blue-50/50 dark:bg-blue-950/30'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <DollarSign className="h-3.5 w-3.5 opacity-80" />
                    <span>Finance</span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" sideOffset={14} className="w-80 p-2 rounded-2xl shadow-xl border-slate-200 dark:border-slate-800">
                  <DropdownMenuLabel className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Tuition Fees, Vouchers & Audits
                  </DropdownMenuLabel>
                  {renderDropdownItems(financeModules)}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* 5. Modules (Smart Mega Menu) */}
              <AdminMegaMenu
                triggerButton={
                  <button
                    className={`relative px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      activeDepartment === 'modules'
                        ? 'text-blue-700 dark:text-blue-300 font-bold after:absolute after:bottom-[-18px] after:left-2 after:right-2 after:h-0.5 after:bg-blue-600 dark:after:bg-blue-400 after:rounded-full bg-blue-50/50 dark:bg-blue-950/30'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Grid className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 opacity-90" />
                    <span>Modules</span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </button>
                }
              />
            </nav>

            {/* ========================================================= */}
            {/* 3. UTILITY COMMAND CENTER (Right-Side Actions)             */}
            {/* ========================================================= */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">

              {/* Global Command Search (Ctrl + K) */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchOpen(true)}
                className="h-9 px-2.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200/80 dark:border-slate-800 rounded-xl flex items-center gap-2 shadow-2xs transition-all"
                aria-label="Open Command Search"
              >
                <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="hidden md:inline font-normal">Search modules...</span>
                <kbd className="pointer-events-none hidden md:inline-flex h-4 select-none items-center gap-0.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-1.5 font-mono text-[10px] font-medium text-slate-400">
                  <span className="text-[10px]">Ctrl</span> K
                </kbd>
              </Button>

              {/* Notifications with Live Indicator */}
              <AdminNotificationCenter />

              {/* Quick Create Menu */}
              <AdminQuickCreateMenu />

              {/* Super Admin Control Center Direct Shortcut */}
              {user?.role === 'admin' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/admin/control-center')}
                  className="h-9 px-2.5 text-xs font-semibold text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 border-indigo-200 rounded-xl flex items-center gap-1.5 shadow-2xs transition-all"
                  title="Super Admin Control Center"
                >
                  <Shield className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                  <span className="hidden lg:inline">Control Center</span>
                </Button>
              )}

              {/* Admin Profile & Account Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-9 px-1.5 sm:px-2 flex items-center gap-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Avatar className="h-7 w-7 ring-1 ring-slate-200 dark:ring-slate-800 shadow-2xs">
                      <AvatarImage src={user?.avatar} alt={user?.name} />
                      <AvatarFallback className="bg-blue-600 text-white text-xs font-bold">
                        {user?.name?.charAt(0).toUpperCase() || 'A'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden xl:flex flex-col text-left leading-tight">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[120px]">
                        {user?.name || 'Administrator'}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                        {getRoleDisplayName(user?.role || 'admin')}
                      </span>
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden xl:block" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent className="w-64 p-2 rounded-2xl shadow-2xl border-slate-200 dark:border-slate-800" align="end" sideOffset={8}>
                  <DropdownMenuLabel className="font-normal p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl mb-1">
                    <div className="flex flex-col space-y-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-none">{user?.name}</p>
                      <p className="text-[11px] leading-none text-slate-400">{user?.email}</p>
                      <Badge variant="outline" className="w-fit text-[10px] mt-1.5 font-semibold text-blue-700 dark:text-blue-300 border-blue-200 bg-blue-50 dark:bg-blue-950/40">
                        {getRoleDisplayName(user?.role || '')}
                      </Badge>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={() => navigate('/dashboard')} className="cursor-pointer text-xs rounded-lg py-2">
                    <User className="mr-2 h-3.5 w-3.5 text-slate-400" />
                    <span>Personal User Dashboard</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => navigate('/admin/settings')} className="cursor-pointer text-xs rounded-lg py-2">
                    <Settings className="mr-2 h-3.5 w-3.5 text-slate-400" />
                    <span>System Settings & Profile</span>
                  </DropdownMenuItem>

                  {user?.role === 'admin' && (
                    <DropdownMenuItem 
                      onClick={() => navigate('/admin/control-center')} 
                      className="cursor-pointer text-xs rounded-lg py-2 font-semibold text-indigo-700 bg-indigo-50/60 hover:bg-indigo-100/80"
                    >
                      <Shield className="mr-2 h-3.5 w-3.5 text-indigo-600" />
                      <span>Super Admin Control Center</span>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem onClick={() => navigate('/admin/reports')} className="cursor-pointer text-xs rounded-lg py-2">
                    <FileText className="mr-2 h-3.5 w-3.5 text-slate-400" />
                    <span>Audit & Compliance Logs</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-xs rounded-lg py-2 text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/40">
                    <LogOut className="mr-2 h-3.5 w-3.5" />
                    <span>Sign Out of Console</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile Drawer Trigger (Screens < lg) */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="lg:hidden h-9 w-9 rounded-xl border-slate-200 dark:border-slate-800"
                    aria-label="Toggle Institutional Navigation"
                  >
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>

                <SheetContent side="left" className="w-[85vw] max-w-[340px] sm:max-w-[380px] p-0 flex flex-col h-full overflow-hidden bg-white dark:bg-slate-950">
                  <SheetHeader className="p-4 border-b border-slate-100 dark:border-slate-800 text-left bg-slate-50/60 dark:bg-slate-900/40">
                    <div className="flex items-center gap-2.5">
                      <img
                        src="/lovable-uploads/8ea95178-bb37-43e2-ae4d-595e31707954.png"
                        alt="Adithyan College"
                        className="h-8 w-8 object-contain rounded-lg bg-white p-0.5 shadow-2xs border border-slate-200"
                      />
                      <div>
                        <SheetTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          <InstitutionName />
                        </SheetTitle>
                        <p className="text-[11px] text-slate-400">Institutional Command Center</p>
                      </div>
                    </div>
                  </SheetHeader>

                  {/* Drawer Content */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* Primary Jump */}
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        navigate('/admin');
                      }}
                      className="w-full flex items-center gap-2.5 p-2.5 rounded-xl font-semibold text-xs bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800"
                    >
                      <Home className="h-4 w-4" />
                      <span>Console Overview</span>
                    </button>

                    {/* Department Categories */}
                    {SMART_CATEGORIES.map(category => {
                      const CatIcon = category.icon;
                      const accessibleInCat = category.modules.filter(m => canAccess(m.roles));
                      if (accessibleInCat.length === 0) return null;

                      return (
                        <div key={category.id} className="space-y-1.5">
                          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
                            <CatIcon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                            <span>{category.name}</span>
                          </div>
                          <div className="space-y-0.5">
                            {accessibleInCat.map(module => {
                              const ModuleIcon = module.icon;
                              const isCurrent = location.pathname === module.url;
                              return (
                                <button
                                  key={module.id}
                                  onClick={() => {
                                    setMobileMenuOpen(false);
                                    navigate(module.url);
                                  }}
                                  className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors ${
                                    isCurrent
                                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-semibold'
                                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <ModuleIcon className="h-3.5 w-3.5 opacity-70 shrink-0" />
                                    <span className="truncate">{module.shortTitle || module.title}</span>
                                  </div>
                                  <ChevronRight className="h-3 w-3 opacity-40 shrink-0" />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Drawer Footer */}
                  <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 flex items-center justify-between text-xs">
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        navigate('/admin/settings');
                      }}
                      className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 font-medium"
                    >
                      <Settings className="h-3.5 w-3.5" />
                      <span>Settings</span>
                    </button>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleLogout();
                      }}
                      className="flex items-center gap-1.5 text-rose-600 hover:text-rose-700 font-medium"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </SheetContent>
              </Sheet>

            </div>
          </div>
        </div>
      </header>

      {/* Global Command Palette Dialog */}
      <AdminCommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
