import React, { useState, useEffect } from 'react';
import { UserRole } from '@/context/AuthContext';
import { 
  MasterSystemConfigState, 
  RoleCustomConfig, 
  WidgetPlacement, 
  RoleNavItem, 
  RolePageConfig 
} from '@/types/superAdmin.types';
import { DEFAULT_WIDGET_CATALOG } from '@/services/superAdminDefaults';
import { 
  Users, 
  Shield, 
  Layout, 
  Menu, 
  Grid, 
  KeyRound, 
  Sliders, 
  FileSpreadsheet, 
  Table, 
  Plus, 
  Trash2, 
  Edit3, 
  Eye, 
  EyeOff, 
  ArrowUp, 
  ArrowDown, 
  Check, 
  Lock, 
  Search, 
  AlertCircle,
  FileCheck,
  CheckCircle2,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface RoleControlCenterViewProps {
  masterConfig: MasterSystemConfigState;
  onUpdateRoleConfig: (roleKey: string, updatedRole: RoleCustomConfig) => void;
  onUpdateRoleNav: (roleKey: string, navItems: RoleNavItem[]) => void;
  onUpdateRoleDashboard: (roleKey: string, widgets: WidgetPlacement[]) => void;
  onUpdateRolePage: (roleKey: string, pageConfig: RolePageConfig) => void;
}

const ALL_SYSTEM_ROLES: { key: UserRole; name: string; category: string }[] = [
  { key: 'admin', name: 'Institutional Administrator', category: 'Administration' },
  { key: 'principal', name: 'Principal / Dean', category: 'Administration' },
  { key: 'teacher', name: 'Faculty & Teacher', category: 'Academic' },
  { key: 'hod', name: 'Head of Department (HOD)', category: 'Academic' },
  { key: 'student', name: 'Enrolled Student', category: 'Student & Parent' },
  { key: 'parent', name: 'Parent / Guardian', category: 'Student & Parent' },
  { key: 'finance_manager', name: 'Finance Manager', category: 'Finance' },
  { key: 'accountant', name: 'Accountant', category: 'Finance' },
  { key: 'receptionist', name: 'Front Desk Receptionist', category: 'Operations' },
  { key: 'store_manager', name: 'Store & Inventory Keeper', category: 'Operations' },
  { key: 'transport_driver', name: 'Transport Driver', category: 'Operations' },
  { key: 'hr_manager', name: 'HR Manager', category: 'Operations' },
  { key: 'librarian', name: 'Chief Librarian', category: 'Academic' },
  { key: 'hostel_warden', name: 'Hostel Warden', category: 'Student Affairs' },
  { key: 'placement_officer', name: 'Career & Placement Officer', category: 'Student Affairs' },
  { key: 'coe', name: 'Controller of Examinations', category: 'Academic' }
];

const STANDARD_ROUTES_CATALOG = [
  { path: '/dashboard', label: 'Primary Dashboard Core', module: 'dashboard', description: 'Institutional home dashboard' },
  { path: '/principal', label: 'Principal Command Center', module: 'administration', description: 'Academic & governance overview' },
  { path: '/exam-management', label: 'Examination Management', module: 'examinations', description: 'Schedules, marks entry, hall tickets' },
  { path: '/library-management', label: 'Digital & Physical Library', module: 'library', description: 'Circulation, book catalog, e-resources' },
  { path: '/admission-management', label: 'Admissions & Scrutiny', module: 'admissions', description: 'Application intake, merit ranks, verification' },
  { path: '/store', label: 'Campus Uniform & Store', module: 'store', description: 'Inventory requisition and orders' },
  { path: '/teachers/create-assignment', label: 'Assignments Distribution', module: 'academics', description: 'Coursework submission portal' },
  { path: '/teachers/message-parents', label: 'Parent-Teacher Messaging', module: 'communication', description: 'Direct communication link' },
  { path: '/teachers/daily-update', label: 'Daily Lesson Progression', module: 'academics', description: 'Lecture unit logging' },
  { path: '/admin/timetable', label: 'Timetable Matrix', module: 'timetable', description: 'Class and faculty schedules' },
  { path: '/admin/departments', label: 'Departments & Courses', module: 'departments', description: 'Academic program structures' },
  { path: '/track-bus', label: 'Transport Fleet Tracking', module: 'transport', description: 'Vehicle telemetry and routes' },
  { path: '/disciplinary-management', label: 'Student Disciplinary Records', module: 'disciplinary', description: 'Conduct notices and hearings' },
  { path: '/certificate-generation', label: 'Certificate Verification', module: 'compliance', description: 'Transfer & degree certificates' },
  { path: '/admin/naac', label: 'NAAC Accreditation Suite', module: 'naac', description: 'Criteria 1-7 SSR data repository' }
];

const CRUD_ENTITIES = [
  'students',
  'admissions',
  'attendance',
  'fees',
  'examinations',
  'courses',
  'departments',
  'staff',
  'inventory',
  'transport',
  'library',
  'naac'
];

const CRUD_ACTIONS = [
  'view',
  'create',
  'edit',
  'delete',
  'export',
  'import',
  'approve',
  'reject',
  'assign',
  'manage'
] as const;

export function RoleControlCenterView({
  masterConfig,
  onUpdateRoleConfig,
  onUpdateRoleNav,
  onUpdateRoleDashboard,
  onUpdateRolePage
}: RoleControlCenterViewProps) {
  const [selectedRoleKey, setSelectedRoleKey] = useState<UserRole>('student');
  const [activeSubTab, setActiveSubTab] = useState('pages');
  const [roleSearch, setRoleSearch] = useState('');

  // Selected role configuration
  const currentRoleConfig: RoleCustomConfig = masterConfig.roles[selectedRoleKey] || {
    role: selectedRoleKey,
    label: ALL_SYSTEM_ROLES.find(r => r.key === selectedRoleKey)?.name || selectedRoleKey,
    description: `Standard institutional configuration for ${selectedRoleKey}`,
    home: `/dashboard/${selectedRoleKey}`,
    category: (ALL_SYSTEM_ROLES.find(r => r.key === selectedRoleKey)?.category as any) || 'Operations',
    status: 'active',
    allowedModules: ['dashboard', 'academics', 'communication'],
    allowedRoutes: ['/dashboard'],
    permissions: [],
    features: [],
    visibleWidgets: []
  };

  const navItems = masterConfig.navigation[selectedRoleKey]?.items || [];
  const widgets = masterConfig.dashboards[selectedRoleKey]?.widgets || [];

  // 1. Page Access Toggle
  const toggleRouteAccess = (routePath: string, enabled: boolean) => {
    const currentRoutes = currentRoleConfig.allowedRoutes || [];
    const nextRoutes = enabled
      ? Array.from(new Set([...currentRoutes, routePath]))
      : currentRoutes.filter(p => p !== routePath);

    onUpdateRoleConfig(selectedRoleKey, {
      ...currentRoleConfig,
      allowedRoutes: nextRoutes
    });
  };

  // 2. Navigation Item Updates
  const toggleNavItemVisibility = (id: string) => {
    const nextNav = navItems.map(item => item.id === id ? { ...item, visible: !item.visible } : item);
    onUpdateRoleNav(selectedRoleKey, nextNav);
  };

  const moveNavItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= navItems.length) return;
    const nextNav = [...navItems];
    const temp = nextNav[index];
    nextNav[index] = nextNav[targetIndex];
    nextNav[targetIndex] = temp;
    nextNav.forEach((item, idx) => { item.order = idx; });
    onUpdateRoleNav(selectedRoleKey, nextNav);
  };

  // 3. Widget Toggle & Span
  const toggleWidget = (widgetId: string) => {
    const existing = widgets.find(w => w.widgetId === widgetId);
    if (existing) {
      onUpdateRoleDashboard(selectedRoleKey, widgets.filter(w => w.widgetId !== widgetId));
    } else {
      const def = DEFAULT_WIDGET_CATALOG.find(w => w.id === widgetId);
      const newPlacement: WidgetPlacement = {
        instanceId: `inst_${widgetId}_${Date.now()}`,
        widgetId,
        title: def?.title || widgetId,
        colSpan: def?.defaultColSpan || 1,
        order: widgets.length,
        displayFormat: 'card'
      };
      onUpdateRoleDashboard(selectedRoleKey, [...widgets, newPlacement]);
    }
  };

  const changeWidgetColSpan = (instanceId: string, colSpan: 1 | 2 | 3 | 4) => {
    const nextWidgets = widgets.map(w => w.instanceId === instanceId ? { ...w, colSpan } : w);
    onUpdateRoleDashboard(selectedRoleKey, nextWidgets);
  };

  // 4. CRUD Permissions
  const hasCrudPermission = (entity: string, action: string) => {
    const perms = currentRoleConfig.permissions || [];
    return perms.includes(`${entity}:${action}`) || perms.includes(`${entity}:manage`) || perms.includes('*');
  };

  const toggleCrudPermission = (entity: string, action: string) => {
    const targetPerm = `${entity}:${action}`;
    const perms = currentRoleConfig.permissions || [];
    const hasIt = perms.includes(targetPerm);
    const nextPerms = hasIt ? perms.filter(p => p !== targetPerm) : [...perms, targetPerm];
    onUpdateRoleConfig(selectedRoleKey, {
      ...currentRoleConfig,
      permissions: nextPerms
    });
  };

  // 5. Actions & Buttons Control
  const sensitiveActions = [
    { key: 'approve_admission', label: 'Approve Admission Applications', entity: 'admissions' },
    { key: 'waive_fees', label: 'Grant Fee Concessions & Waivers', entity: 'fees' },
    { key: 'publish_marks', label: 'Publish Final Exam Marks', entity: 'examinations' },
    { key: 'reset_passwords', label: 'Reset User Account Passwords', entity: 'staff' },
    { key: 'purge_records', label: 'Purge / Archive Institutional Data', entity: 'system' },
    { key: 'export_financials', label: 'Export Sensitive Ledger & Tax Reports', entity: 'fees' }
  ];

  const toggleSensitiveAction = (actionKey: string) => {
    const features = currentRoleConfig.features || [];
    const hasAction = features.includes(actionKey);
    const nextFeatures = hasAction ? features.filter(f => f !== actionKey) : [...features, actionKey];
    onUpdateRoleConfig(selectedRoleKey, {
      ...currentRoleConfig,
      features: nextFeatures
    });
  };

  // 6. Form Fields Configuration State
  const [formFieldsConfig, setFormFieldsConfig] = useState<Record<string, { hidden: boolean; required: boolean; readOnly: boolean }>>({
    'student.aadhar_number': { hidden: false, required: true, readOnly: false },
    'student.blood_group': { hidden: false, required: false, readOnly: false },
    'student.annual_family_income': { hidden: false, required: false, readOnly: false },
    'student.previous_school_percentage': { hidden: false, required: true, readOnly: false },
    'fee.discount_reason': { hidden: false, required: true, readOnly: false },
    'course.minimum_eligibility_marks': { hidden: false, required: true, readOnly: false },
  });

  const updateFormFieldRule = (fieldKey: string, rule: 'hidden' | 'required' | 'readOnly', value: boolean) => {
    setFormFieldsConfig(prev => ({
      ...prev,
      [fieldKey]: {
        ...(prev[fieldKey] || { hidden: false, required: false, readOnly: false }),
        [rule]: value
      }
    }));
    toast.success(`Form field rule updated for ${fieldKey}`);
  };

  // 7. Table Columns Configuration State
  const [tableColumnsConfig, setTableColumnsConfig] = useState<Record<string, { visible: boolean; masked: boolean }>>({
    'students_table.phone': { visible: true, masked: false },
    'students_table.aadhar': { visible: true, masked: true },
    'students_table.fees_due': { visible: true, masked: false },
    'fees_table.payer_account': { visible: true, masked: true },
    'staff_table.salary_tier': { visible: false, masked: true }
  });

  const updateTableColumnRule = (colKey: string, rule: 'visible' | 'masked', value: boolean) => {
    setTableColumnsConfig(prev => ({
      ...prev,
      [colKey]: {
        ...(prev[colKey] || { visible: true, masked: false }),
        [rule]: value
      }
    }));
    toast.success(`Table column access rule updated for ${colKey}`);
  };

  const filteredRoles = ALL_SYSTEM_ROLES.filter(r => 
    r.name.toLowerCase().includes(roleSearch.toLowerCase()) ||
    r.key.toLowerCase().includes(roleSearch.toLowerCase()) ||
    r.category.toLowerCase().includes(roleSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* 1. Dynamic Role Selector Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center">
              <Users className="w-5 h-5 mr-2 text-indigo-600" />
              Role Control & Deep Customization Center
            </h2>
            <p className="text-xs text-slate-500">
              Select any role in the ERP to configure its pages, sidebar, dashboard, granular CRUD rules, forms, and data tables.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="relative w-48 sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Find role..."
                value={roleSearch}
                onChange={e => setRoleSearch(e.target.value)}
                className="pl-8 h-8 text-xs bg-slate-50 border-slate-200"
              />
            </div>

            <Select value={selectedRoleKey} onValueChange={(val: any) => setSelectedRoleKey(val)}>
              <SelectTrigger className="h-8 text-xs font-semibold bg-indigo-50 border-indigo-200 text-indigo-900 w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {filteredRoles.map(r => (
                  <SelectItem key={r.key} value={r.key} className="text-xs">
                    {r.name} ({r.category})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Selected Role Meta Bar */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <Badge className="bg-indigo-600 text-white font-semibold">
              {currentRoleConfig.label}
            </Badge>
            <Badge variant="outline" className="border-slate-300 text-slate-600">
              {currentRoleConfig.category}
            </Badge>
            <span className="text-slate-400">|</span>
            <span className="text-slate-500">Default Home: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">{currentRoleConfig.home}</code></span>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-slate-600 font-medium">Role Status:</span>
            <div className="flex items-center space-x-1.5">
              <Switch
                checked={currentRoleConfig.status === 'active'}
                onCheckedChange={(checked) => {
                  onUpdateRoleConfig(selectedRoleKey, {
                    ...currentRoleConfig,
                    status: checked ? 'active' : 'restricted'
                  });
                  toast.success(`Role status set to ${checked ? 'Active' : 'Restricted'}`);
                }}
              />
              <span className={`font-semibold ${currentRoleConfig.status === 'active' ? 'text-emerald-700' : 'text-rose-700'}`}>
                {currentRoleConfig.status === 'active' ? 'Active in ERP' : 'Restricted'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Seven Customization Sub-Tabs */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="grid grid-cols-4 sm:grid-cols-7 w-full bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="pages" className="text-xs font-medium">
            <Layout className="w-3.5 h-3.5 mr-1" />
            <span>Pages & Routes</span>
          </TabsTrigger>
          <TabsTrigger value="nav" className="text-xs font-medium">
            <Menu className="w-3.5 h-3.5 mr-1" />
            <span>Navigation</span>
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="text-xs font-medium">
            <Grid className="w-3.5 h-3.5 mr-1" />
            <span>Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="crud" className="text-xs font-medium">
            <KeyRound className="w-3.5 h-3.5 mr-1" />
            <span>CRUD Matrix</span>
          </TabsTrigger>
          <TabsTrigger value="actions" className="text-xs font-medium">
            <Sliders className="w-3.5 h-3.5 mr-1" />
            <span>Buttons & Actions</span>
          </TabsTrigger>
          <TabsTrigger value="forms" className="text-xs font-medium">
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1" />
            <span>Forms & Fields</span>
          </TabsTrigger>
          <TabsTrigger value="tables" className="text-xs font-medium">
            <Table className="w-3.5 h-3.5 mr-1" />
            <span>Tables & Data</span>
          </TabsTrigger>
        </TabsList>

        {/* SUB-TAB 1: PAGES & ROUTES */}
        <TabsContent value="pages" className="mt-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Institutional Page & Route Access</h3>
                <p className="text-xs text-slate-500">Enable or disable direct page route access for {currentRoleConfig.label}. Unauthorized routes are blocked by ProtectedRoute.</p>
              </div>
              <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs">
                {currentRoleConfig.allowedRoutes?.length || 0} Routes Allowed
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {STANDARD_ROUTES_CATALOG.map((route) => {
                const isAllowed = currentRoleConfig.allowedRoutes?.includes(route.path);
                return (
                  <div key={route.path} className={`p-3 rounded-lg border flex items-center justify-between ${isAllowed ? 'border-indigo-200 bg-indigo-50/20' : 'border-slate-200 bg-slate-50/50'}`}>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-xs text-slate-900">{route.label}</span>
                        <Badge variant="outline" className="text-[10px] text-slate-500">{route.module}</Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">{route.path}</p>
                    </div>
                    <Switch
                      checked={isAllowed}
                      onCheckedChange={(checked) => toggleRouteAccess(route.path, checked)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* SUB-TAB 2: NAVIGATION & SIDEBAR */}
        <TabsContent value="nav" className="mt-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Sidebar Menu & Navigation Hierarchy</h3>
                <p className="text-xs text-slate-500">Reorder menu items, toggle visibility, and rename labels for {currentRoleConfig.label}.</p>
              </div>
              <span className="text-xs text-slate-500">{navItems.length} Sidebar Items</span>
            </div>

            {navItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">No custom navigation items defined yet. Using standard role defaults.</div>
            ) : (
              <div className="space-y-2">
                {navItems.map((item, idx) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300">
                    <div className="flex items-center space-x-3">
                      <div className="flex flex-col space-y-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveNavItem(idx, 'up')}
                          className="p-0.5 hover:bg-slate-100 rounded disabled:opacity-30"
                        >
                          <ArrowUp className="w-3 h-3 text-slate-600" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === navItems.length - 1}
                          onClick={() => moveNavItem(idx, 'down')}
                          className="p-0.5 hover:bg-slate-100 rounded disabled:opacity-30"
                        >
                          <ArrowDown className="w-3 h-3 text-slate-600" />
                        </button>
                      </div>

                      <div>
                        <span className="font-semibold text-xs text-slate-900">{item.label}</span>
                        <p className="text-[10px] text-slate-400 font-mono">{item.path}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={() => toggleNavItemVisibility(item.id)}
                        className={`p-1.5 rounded text-xs flex items-center space-x-1 ${item.visible ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 bg-slate-100'}`}
                      >
                        {item.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        <span className="text-[11px]">{item.visible ? 'Visible' : 'Hidden'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* SUB-TAB 3: DASHBOARD WIDGETS */}
        <TabsContent value="dashboard" className="mt-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Dashboard Layout & Active Widgets</h3>
                <p className="text-xs text-slate-500">Configure widgets visible on {currentRoleConfig.label}'s home dashboard, along with grid column spans (1 to 4).</p>
              </div>
              <Badge className="bg-indigo-50 text-indigo-700 text-xs">{widgets.length} Active Widgets</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {DEFAULT_WIDGET_CATALOG.map((def) => {
                const active = widgets.find(w => w.widgetId === def.id);
                return (
                  <div key={def.id} className={`p-3 rounded-lg border transition-all ${active ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-200 bg-slate-50/50'}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-bold text-xs text-slate-900">{def.title}</span>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{def.description}</p>
                      </div>
                      <Switch
                        checked={!!active}
                        onCheckedChange={() => toggleWidget(def.id)}
                      />
                    </div>

                    {active && (
                      <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-slate-500">Grid Width:</span>
                        <div className="flex rounded border border-slate-200 overflow-hidden text-[10px]">
                          {([1, 2, 3, 4] as const).map(span => (
                            <button
                              key={span}
                              type="button"
                              onClick={() => changeWidgetColSpan(active.instanceId, span)}
                              className={`px-2 py-0.5 ${active.colSpan === span ? 'bg-indigo-600 text-white font-bold' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                            >
                              {span} Col
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* SUB-TAB 4: CRUD PERMISSIONS MATRIX */}
        <TabsContent value="crud" className="mt-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Entity CRUD Permission Matrix</h3>
                <p className="text-xs text-slate-500">Grant or revoke individual operations for every data model. Enforced at API and service layers.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const allPerms: string[] = [];
                  CRUD_ENTITIES.forEach(e => CRUD_ACTIONS.forEach(a => allPerms.push(`${e}:${a}`)));
                  onUpdateRoleConfig(selectedRoleKey, { ...currentRoleConfig, permissions: allPerms });
                  toast.success('Granted all permissions');
                }}
                className="text-xs h-7"
              >
                Grant Full Access
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">Entity / Module</th>
                    {CRUD_ACTIONS.map(action => (
                      <th key={action} className="p-2.5 text-center">{action}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {CRUD_ENTITIES.map(entity => (
                    <tr key={entity} className="hover:bg-slate-50/80">
                      <td className="p-2.5 font-semibold text-slate-900 capitalize flex items-center space-x-1.5">
                        <span>{entity}</span>
                      </td>
                      {CRUD_ACTIONS.map(action => {
                        const permitted = hasCrudPermission(entity, action);
                        return (
                          <td key={action} className="p-2.5 text-center">
                            <Checkbox
                              checked={permitted}
                              onCheckedChange={() => toggleCrudPermission(entity, action)}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* SUB-TAB 5: BUTTONS & SENSITIVE ACTIONS */}
        <TabsContent value="actions" className="mt-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Sensitive Actions & Button Authorizations</h3>
              <p className="text-xs text-slate-500">Configure permission to trigger high-impact institutional operations for {currentRoleConfig.label}.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sensitiveActions.map(action => {
                const enabled = currentRoleConfig.features?.includes(action.key);
                return (
                  <div key={action.key} className={`p-3 rounded-lg border flex items-center justify-between ${enabled ? 'border-emerald-300 bg-emerald-50/20' : 'border-slate-200 bg-slate-50/50'}`}>
                    <div>
                      <span className="font-semibold text-xs text-slate-900">{action.label}</span>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">key: {action.key}</p>
                    </div>
                    <Switch
                      checked={enabled}
                      onCheckedChange={() => toggleSensitiveAction(action.key)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* SUB-TAB 6: FORMS & FIELDS */}
        <TabsContent value="forms" className="mt-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Form Field Governance & Visibility</h3>
              <p className="text-xs text-slate-500">Control field states across Student Admission, Fee Collection, and Course Creation forms.</p>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
              {Object.entries(formFieldsConfig).map(([fieldKey, rules]) => (
                <div key={fieldKey} className="p-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-slate-800 font-mono">{fieldKey}</span>
                  </div>

                  <div className="flex items-center space-x-6">
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <Checkbox
                        checked={rules.hidden}
                        onCheckedChange={(c) => updateFormFieldRule(fieldKey, 'hidden', !!c)}
                      />
                      <span className="text-slate-600">Hidden</span>
                    </label>

                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <Checkbox
                        checked={rules.required}
                        onCheckedChange={(c) => updateFormFieldRule(fieldKey, 'required', !!c)}
                      />
                      <span className="text-slate-600">Required</span>
                    </label>

                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <Checkbox
                        checked={rules.readOnly}
                        onCheckedChange={(c) => updateFormFieldRule(fieldKey, 'readOnly', !!c)}
                      />
                      <span className="text-slate-600">Read-Only</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* SUB-TAB 7: TABLES & DATA VISIBILITY */}
        <TabsContent value="tables" className="mt-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Table Columns & Data Masking</h3>
              <p className="text-xs text-slate-500">Configure which columns {currentRoleConfig.label} can view, and apply data masking on sensitive identifiers.</p>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
              {Object.entries(tableColumnsConfig).map(([colKey, rules]) => (
                <div key={colKey} className="p-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-slate-800 font-mono">{colKey}</span>
                  </div>

                  <div className="flex items-center space-x-6">
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <Checkbox
                        checked={rules.visible}
                        onCheckedChange={(c) => updateTableColumnRule(colKey, 'visible', !!c)}
                      />
                      <span className="text-slate-600">Column Visible</span>
                    </label>

                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <Checkbox
                        checked={rules.masked}
                        onCheckedChange={(c) => updateTableColumnRule(colKey, 'masked', !!c)}
                      />
                      <span className="text-slate-600">Mask Sensitive Values (***)</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

      </Tabs>

    </div>
  );
}
