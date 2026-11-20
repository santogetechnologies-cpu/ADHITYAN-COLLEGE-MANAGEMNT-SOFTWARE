import React, { useState } from 'react';
import { College } from '@/types/multiCollege.types';
import { RoleCustomConfig } from '@/types/superAdmin.types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  GraduationCap, 
  BookOpen, 
  Award, 
  Shield, 
  DollarSign, 
  Users, 
  PhoneCall, 
  ShoppingBag, 
  Bus, 
  UserCheck, 
  Library, 
  Home, 
  Briefcase,
  Search,
  Sliders,
  Sparkles,
  ArrowRight,
  Layers,
  CheckCircle2,
  RefreshCw,
  Building2,
  Lock,
  Grid
} from 'lucide-react';

export interface RoleMetadata {
  key: string;
  name: string;
  category: 'Academic' | 'Operations' | 'Administration' | 'Finance';
  icon: React.ElementType;
  colorScheme: {
    bg: string;
    border: string;
    badge: string;
    text: string;
    iconBg: string;
  };
  description: string;
  defaultCapabilitiesCount: number;
}

export const INSTITUTIONAL_13_ROLES: RoleMetadata[] = [
  {
    key: 'student',
    name: 'Student Portal',
    category: 'Academic',
    icon: GraduationCap,
    colorScheme: {
      bg: 'bg-indigo-50/40 hover:bg-indigo-50/80',
      border: 'border-indigo-200',
      badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      text: 'text-indigo-900',
      iconBg: 'bg-indigo-600 text-white'
    },
    description: 'Enrolled students workspace: daily timetable, attendance tracker, assignments, marks transcript, online fees, and campus services.',
    defaultCapabilitiesCount: 16
  },
  {
    key: 'teacher',
    name: 'Faculty & Teacher Portal',
    category: 'Academic',
    icon: BookOpen,
    colorScheme: {
      bg: 'bg-emerald-50/40 hover:bg-emerald-50/80',
      border: 'border-emerald-200',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      text: 'text-emerald-900',
      iconBg: 'bg-emerald-600 text-white'
    },
    description: 'Faculty instructors: assigned class rosters, lecture roll-calls, assignments distribution, exams grading, and student progress.',
    defaultCapabilitiesCount: 18
  },
  {
    key: 'principal',
    name: 'Principal & Dean Portal',
    category: 'Academic',
    icon: Award,
    colorScheme: {
      bg: 'bg-purple-50/40 hover:bg-purple-50/80',
      border: 'border-purple-200',
      badge: 'bg-purple-100 text-purple-800 border-purple-200',
      text: 'text-purple-900',
      iconBg: 'bg-purple-600 text-white'
    },
    description: 'Executive academic dean: institutional governance, faculty leave sanctions, certificate approvals, and NAAC oversight.',
    defaultCapabilitiesCount: 22
  },
  {
    key: 'admin',
    name: 'Institutional Administrator',
    category: 'Administration',
    icon: Shield,
    colorScheme: {
      bg: 'bg-rose-50/40 hover:bg-rose-50/80',
      border: 'border-rose-200',
      badge: 'bg-rose-100 text-rose-800 border-rose-200',
      text: 'text-rose-900',
      iconBg: 'bg-rose-600 text-white'
    },
    description: 'Central campus management: departments, course syllabi, timetable master, admissions, user provisioning, and audit logs.',
    defaultCapabilitiesCount: 23
  },
  {
    key: 'finance_manager',
    name: 'Finance & Accounts Manager',
    category: 'Finance',
    icon: DollarSign,
    colorScheme: {
      bg: 'bg-amber-50/40 hover:bg-amber-50/80',
      border: 'border-amber-200',
      badge: 'bg-amber-100 text-amber-800 border-amber-200',
      text: 'text-amber-900',
      iconBg: 'bg-amber-600 text-white'
    },
    description: 'Fiscal office: student fee invoicing, dues recovery, scholarships disbursement, expense ledgers, and transaction reconciliations.',
    defaultCapabilitiesCount: 17
  },
  {
    key: 'parent',
    name: 'Parent & Guardian Portal',
    category: 'Finance',
    icon: Users,
    colorScheme: {
      bg: 'bg-blue-50/40 hover:bg-blue-50/80',
      border: 'border-blue-200',
      badge: 'bg-blue-100 text-blue-800 border-blue-200',
      text: 'text-blue-900',
      iconBg: 'bg-blue-600 text-white'
    },
    description: 'Parents & guardians: ward attendance telemetry, academic report cards, fee dues payments, and teacher communication desk.',
    defaultCapabilitiesCount: 12
  },
  {
    key: 'receptionist',
    name: 'Reception & Front Desk',
    category: 'Operations',
    icon: PhoneCall,
    colorScheme: {
      bg: 'bg-cyan-50/40 hover:bg-cyan-50/80',
      border: 'border-cyan-200',
      badge: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      text: 'text-cyan-900',
      iconBg: 'bg-cyan-600 text-white'
    },
    description: 'Front office: campus visitor security passes, inquiry management, admissions desk liaison, and dispatch records.',
    defaultCapabilitiesCount: 14
  },
  {
    key: 'store_manager',
    name: 'Campus Store & Inventory',
    category: 'Operations',
    icon: ShoppingBag,
    colorScheme: {
      bg: 'bg-orange-50/40 hover:bg-orange-50/80',
      border: 'border-orange-200',
      badge: 'bg-orange-100 text-orange-800 border-orange-200',
      text: 'text-orange-900',
      iconBg: 'bg-orange-600 text-white'
    },
    description: 'Supply chain & inventory: uniform kits, laboratory equipment requisitions, stock counts, and purchase indent approvals.',
    defaultCapabilitiesCount: 15
  },
  {
    key: 'transport_driver',
    name: 'Transport & Fleet Driver',
    category: 'Operations',
    icon: Bus,
    colorScheme: {
      bg: 'bg-yellow-50/40 hover:bg-yellow-50/80',
      border: 'border-yellow-200',
      badge: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      text: 'text-yellow-900',
      iconBg: 'bg-yellow-600 text-white'
    },
    description: 'Fleet operations: GPS bus route tracking, student boarding logs, vehicle trip sheets, and maintenance alerts.',
    defaultCapabilitiesCount: 11
  },
  {
    key: 'hr_manager',
    name: 'HR & Staff Operations',
    category: 'Administration',
    icon: UserCheck,
    colorScheme: {
      bg: 'bg-teal-50/40 hover:bg-teal-50/80',
      border: 'border-teal-200',
      badge: 'bg-teal-100 text-teal-800 border-teal-200',
      text: 'text-teal-900',
      iconBg: 'bg-teal-600 text-white'
    },
    description: 'Human resources: faculty service records, leave entitlement balances, payroll disbursement, and staff appraisals.',
    defaultCapabilitiesCount: 16
  },
  {
    key: 'librarian',
    name: 'Library & Resource Center',
    category: 'Operations',
    icon: Library,
    colorScheme: {
      bg: 'bg-violet-50/40 hover:bg-violet-50/80',
      border: 'border-violet-200',
      badge: 'bg-violet-100 text-violet-800 border-violet-200',
      text: 'text-violet-900',
      iconBg: 'bg-violet-600 text-white'
    },
    description: 'Library repository: catalog search, book issue & return barcode desk, overdue fine recovery, and e-journal subscriptions.',
    defaultCapabilitiesCount: 14
  },
  {
    key: 'hostel_warden',
    name: 'Hostel & Residential Warden',
    category: 'Operations',
    icon: Home,
    colorScheme: {
      bg: 'bg-sky-50/40 hover:bg-sky-50/80',
      border: 'border-sky-200',
      badge: 'bg-sky-100 text-sky-800 border-sky-200',
      text: 'text-sky-900',
      iconBg: 'bg-sky-600 text-white'
    },
    description: 'Residential life: hostel room allotments, nightly roll-call telemetry, mess food inspection, and gate pass sanctions.',
    defaultCapabilitiesCount: 14
  },
  {
    key: 'placement_officer',
    name: 'Placement & Career Cell',
    category: 'Administration',
    icon: Briefcase,
    colorScheme: {
      bg: 'bg-lime-50/40 hover:bg-lime-50/80',
      border: 'border-lime-200',
      badge: 'bg-lime-100 text-lime-800 border-lime-200',
      text: 'text-lime-900',
      iconBg: 'bg-lime-600 text-white'
    },
    description: 'Career development: corporate campus recruitment drives, student resumes, placement mock exams, and offer letters.',
    defaultCapabilitiesCount: 15
  }
];

interface RoleSelectionHubProps {
  college: College;
  rolesConfig: Record<string, RoleCustomConfig>;
  onSelectRole: (roleKey: string) => void;
  onResetRole?: (roleKey: string) => void;
}

export function RoleSelectionHub({
  college,
  rolesConfig,
  onSelectRole,
  onResetRole
}: RoleSelectionHubProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', 'Academic', 'Administration', 'Operations', 'Finance'];

  const filteredRoles = INSTITUTIONAL_13_ROLES.filter(r => {
    const matchesSearch = 
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || r.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Badge variant="outline" className="border-indigo-400 text-indigo-300 bg-indigo-950/70 text-xs px-2.5 py-0.5">
                <Sparkles className="w-3 h-3 mr-1 text-indigo-400" />
                Live In-Portal Customization Engine
              </Badge>
              <Badge variant="outline" className="border-slate-700 text-slate-300 bg-slate-800/80 text-xs">
                {college.name}
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Super Admin Control Center
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl mt-1.5 leading-relaxed">
              Select any role below to open that role's actual live portal in customization mode. Add widgets, customize sidebar navigation, rearrange sections, configure backend capabilities, and publish changes directly into the ERP.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-white">{INSTITUTIONAL_13_ROLES.length}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Total Roles</div>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-emerald-400">{INSTITUTIONAL_13_ROLES.filter(r => rolesConfig[r.key]?.updatedAt).length}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Customised</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Search & Category Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input 
            placeholder="Search role by name, capability, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs border-slate-200 focus:border-indigo-500"
          />
        </div>

        {/* Categories */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 3. 13 Roles Interactive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredRoles.map((role) => {
          const config = rolesConfig[role.key];
          const Icon = role.icon;
          const isCustomized = config && config.updatedAt;
          const activeModulesCount = config?.allowedModules?.length ?? 0;
          const widgetsCount = config?.visibleWidgets?.length ?? 0;

          return (
            <Card 
              key={role.key}
              className={`border transition-all duration-200 hover:shadow-lg ${role.colorScheme.border} ${role.colorScheme.bg} flex flex-col justify-between group`}
            >
              <CardHeader className="p-5 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-11 h-11 rounded-xl ${role.colorScheme.iconBg} flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {role.name}
                      </CardTitle>
                      <span className="text-[11px] font-mono font-medium text-slate-500">
                        role_key: {role.key}
                      </span>
                    </div>
                  </div>

                  <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${role.colorScheme.badge}`}>
                    {role.category}
                  </Badge>
                </div>

                <CardDescription className="text-xs text-slate-600 mt-2.5 line-clamp-2 leading-relaxed">
                  {role.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 pt-0 space-y-4">
                {/* Metrics Badges */}
                <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-200/70 text-center">
                  <div className="bg-white/80 rounded-md py-1 px-1.5 border border-slate-200/60">
                    <div className="text-xs font-bold text-slate-800">{activeModulesCount}</div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider">Modules</div>
                  </div>
                  <div className="bg-white/80 rounded-md py-1 px-1.5 border border-slate-200/60">
                    <div className="text-xs font-bold text-slate-800">{widgetsCount}</div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider">Widgets</div>
                  </div>
                  <div className="bg-white/80 rounded-md py-1 px-1.5 border border-slate-200/60">
                    <div className="text-xs font-bold text-slate-800">{role.defaultCapabilitiesCount}</div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider">Capabilities</div>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center space-x-1.5">
                    <span className={`w-2 h-2 rounded-full ${isCustomized ? 'bg-indigo-500 animate-pulse' : 'bg-emerald-500'}`} />
                    <span className="text-[11px] font-medium text-slate-700">
                      {isCustomized ? 'Customized Configuration' : 'Institutional Baseline'}
                    </span>
                  </span>
                  {config?.status === 'restricted' && (
                    <Badge variant="destructive" className="text-[10px] py-0 px-1.5">
                      Restricted
                    </Badge>
                  )}
                </div>

                {/* Primary Action Button */}
                <div className="pt-1">
                  <Button
                    onClick={() => onSelectRole(role.key)}
                    className="w-full bg-slate-900 hover:bg-indigo-600 text-white text-xs font-semibold h-10 shadow-sm transition-all flex items-center justify-center space-x-2 group-hover:shadow-md"
                  >
                    <span>Open & Customize Live Portal</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
