import React from 'react';
import {
  Shield,
  GraduationCap,
  DollarSign,
  Package,
  Truck,
  Users,
  Award,
  Settings,
  UserPlus,
  BarChart3,
  FileText,
  Calendar,
  Stethoscope,
  BookOpen,
  FileCheck,
  Home,
  CheckCircle2,
  Clock,
  Sparkles,
  ClipboardList,
  UserCheck,
  HeartHandshake,
  Activity,
  Layers,
  Compass,
  Briefcase,
  AlertTriangle
} from 'lucide-react';
import { ADMIN_HUBS, AdminNavModule } from './adminNavigation';

export interface SmartNavModule {
  id: string;
  title: string;
  shortTitle?: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  category: 'people' | 'academics' | 'finance' | 'operations' | 'healthcare' | 'governance';
  roles: string[];
  badge?: string;
  keywords?: string[];
  department: 'overview' | 'people' | 'academics' | 'finance' | 'modules';
}

export interface SmartCategoryGroup {
  id: 'people' | 'academics' | 'finance' | 'operations' | 'healthcare' | 'governance';
  name: string;
  tagline: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  modules: SmartNavModule[];
}

export const ALL_SMART_MODULES: SmartNavModule[] = [
  // -------------------------------------------------------------
  // 1. PEOPLE
  // -------------------------------------------------------------
  {
    id: 'account-provisioning',
    title: 'Account Provisioning & Admissions',
    shortTitle: 'Account Provisioning',
    url: '/admin/account-provisioning',
    icon: UserPlus,
    description: 'Decoupled student admission, student login provisioning, and parent linking',
    category: 'people',
    department: 'people',
    roles: ['admin', 'principal', 'receptionist'],
    badge: 'Workflows',
    keywords: ['student login', 'parent account', 'bulk import', 'csv', 'admission']
  },
  {
    id: 'students',
    title: 'Student Directory & Accounts',
    shortTitle: 'Students',
    url: '/admin/users?tab=students',
    icon: GraduationCap,
    description: 'Enrolled students, manual IDs and portal login provisioning',
    category: 'people',
    department: 'people',
    roles: ['admin', 'principal'],
    badge: 'Core',
    keywords: ['student', 'enrollment', 'roll number', 'student id', 'admitted']
  },
  {
    id: 'parents',
    title: 'Parent Linking & Directory',
    shortTitle: 'Parents',
    url: '/admin/users?tab=parents',
    icon: HeartHandshake,
    description: 'Parent accounts and verified student relationship bindings',
    category: 'people',
    department: 'people',
    roles: ['admin', 'principal'],
    keywords: ['parent', 'guardian', 'father', 'mother', 'linking', 'parent student']
  },
  {
    id: 'teachers',
    title: 'Teacher & Faculty Scheduling',
    shortTitle: 'Teachers',
    url: '/admin/teachers',
    icon: Users,
    description: 'Faculty class allocations, subject assignments & workload',
    category: 'people',
    department: 'people',
    roles: ['admin', 'principal'],
    badge: 'Faculty',
    keywords: ['teacher', 'faculty', 'professor', 'subject allocation', 'workload']
  },
  {
    id: 'staff-governance',
    title: 'Staff Accounts & Roles',
    shortTitle: 'Staff Governance',
    url: '/admin/users?tab=staff',
    icon: Briefcase,
    description: 'Institutional staff management across all 11 non-student roles',
    category: 'people',
    department: 'people',
    roles: ['admin'],
    keywords: ['staff', 'employee', 'hr', 'librarian', 'store manager', 'warden', 'driver']
  },
  {
    id: 'user-management',
    title: 'Master User Management',
    shortTitle: 'User Accounts',
    url: '/admin/users',
    icon: UserPlus,
    description: 'Central identity governance, password resets & account access',
    category: 'people',
    department: 'people',
    roles: ['admin'],
    badge: 'Security',
    keywords: ['users', 'roles', 'credentials', 'password reset', 'authentication', 'security']
  },
  {
    id: 'reception-desk',
    title: 'Reception & Front Desk',
    shortTitle: 'Reception Desk',
    url: '/admin/receptionist',
    icon: ClipboardList,
    description: 'Front desk intake, visitor logs and counter inquiries',
    category: 'people',
    department: 'people',
    roles: ['admin', 'receptionist', 'principal'],
    keywords: ['reception', 'visitor', 'front desk', 'inquiry', 'counter']
  },

  // -------------------------------------------------------------
  // 2. ACADEMICS
  // -------------------------------------------------------------
  {
    id: 'courses-depts',
    title: 'Courses & Departments',
    shortTitle: 'Departments',
    url: '/admin/departments',
    icon: Layers,
    description: '9 Paramedical degree programs, laboratories and curriculum sections',
    category: 'academics',
    department: 'academics',
    roles: ['admin', 'principal'],
    badge: '9 Programs',
    keywords: ['course', 'curriculum', 'department', 'paramedical', 'b.voc', 'mlt', 'otat']
  },
  {
    id: 'class-timetable',
    title: 'Weekly Class Timetable',
    shortTitle: 'Class Timetable',
    url: '/admin/timetable',
    icon: Calendar,
    description: 'Interactive weekly scheduling with automatic clash prevention',
    category: 'academics',
    department: 'academics',
    roles: ['admin', 'principal'],
    badge: 'Clash-Free',
    keywords: ['timetable', 'schedule', 'periods', 'routine', 'classes', 'weekly']
  },
  {
    id: 'exam-desk',
    title: 'Examination Desk',
    shortTitle: 'Examinations',
    url: '/exam-management',
    icon: FileText,
    description: 'Internal & semester exams, schedules, hall tickets and marksheets',
    category: 'academics',
    department: 'academics',
    roles: ['admin', 'principal', 'teacher'],
    badge: 'Exams',
    keywords: ['exam', 'test', 'marks', 'hall ticket', 'results', 'evaluation']
  },
  {
    id: 'principal-desk',
    title: 'Principal Academic Leadership',
    shortTitle: 'Principal Desk',
    url: '/admin/principal',
    icon: GraduationCap,
    description: 'Curriculum oversight, faculty review and institutional metrics',
    category: 'academics',
    department: 'academics',
    roles: ['admin', 'principal'],
    keywords: ['principal', 'leadership', 'academic director', 'metrics']
  },
  {
    id: 'academic-events',
    title: 'College Events & Seminars',
    shortTitle: 'Events & CME',
    url: '/admin/events',
    icon: Calendar,
    description: 'Academic symposiums, medical conferences, workshops and holidays',
    category: 'academics',
    department: 'academics',
    roles: ['admin', 'principal'],
    keywords: ['events', 'seminar', 'conference', 'workshop', 'holiday', 'cme']
  },

  // -------------------------------------------------------------
  // 3. FINANCE
  // -------------------------------------------------------------
  {
    id: 'fee-management',
    title: 'Tuition Fee Management',
    shortTitle: 'Fee Management',
    url: '/admin/finance',
    icon: DollarSign,
    description: 'Course tuition, semester installments, balance aging & revenue metrics',
    category: 'finance',
    department: 'finance',
    roles: ['admin', 'finance_manager', 'financier'],
    badge: 'Revenue',
    keywords: ['fee', 'tuition', 'due amount', 'balance', 'installments', 'receipt']
  },
  {
    id: 'finance-manager',
    title: 'Finance Manager Executive',
    shortTitle: 'Executive Finance',
    url: '/admin/finance-manager',
    icon: DollarSign,
    description: 'Fee structures, concession approvals & daily cashier reconciliation',
    category: 'finance',
    department: 'finance',
    roles: ['admin', 'finance_manager'],
    keywords: ['finance manager', 'collections', 'cashier', 'reconciliation', 'ledger']
  },
  {
    id: 'accounts-desk',
    title: 'Accounts Officer Desk',
    shortTitle: 'Accounts Desk',
    url: '/admin/accounts',
    icon: DollarSign,
    description: 'Double-entry bookkeeping, operational cashbook and payment vouchers',
    category: 'finance',
    department: 'finance',
    roles: ['admin', 'accountant', 'finance_manager'],
    keywords: ['accounts', 'bookkeeping', 'cashbook', 'vouchers', 'audit']
  },
  {
    id: 'financial-reports',
    title: 'Financial & Audit Reports',
    shortTitle: 'Finance Reports',
    url: '/admin/reports?tab=finance',
    icon: FileText,
    description: 'Semester-wise collections, dues ledger and financial statements',
    category: 'finance',
    department: 'finance',
    roles: ['admin', 'finance_manager', 'principal'],
    keywords: ['financial statement', 'collection report', 'ledger', 'balance sheet']
  },

  // -------------------------------------------------------------
  // 4. INSTITUTIONAL OPERATIONS
  // -------------------------------------------------------------
  {
    id: 'admissions-desk',
    title: 'Admission Desk & Intake',
    shortTitle: 'Admissions Desk',
    url: '/admission-management',
    icon: UserPlus,
    description: 'Applicant registrations, eligibility verification & counter receipts',
    category: 'operations',
    department: 'modules',
    roles: ['admin', 'principal', 'receptionist'],
    badge: 'Admissions',
    keywords: ['admissions', 'application', 'intake', 'candidate', 'enrollment']
  },
  {
    id: 'store-inventory',
    title: 'Central Store & Inventory',
    shortTitle: 'Store & Inventory',
    url: '/admin/store',
    icon: Package,
    description: 'Lab reagents, medical consumables, scrubs, uniforms and campus assets',
    category: 'operations',
    department: 'modules',
    roles: ['admin', 'store_manager', 'storekeeper'],
    keywords: ['store', 'inventory', 'reagents', 'consumables', 'scrubs', 'uniforms', 'stock']
  },
  {
    id: 'storekeeper-desk',
    title: 'Storekeeper Requisitions',
    shortTitle: 'Storekeeper Desk',
    url: '/admin/storekeeper',
    icon: Package,
    description: 'Stock inward logs, dispensary distribution and department indents',
    category: 'operations',
    department: 'modules',
    roles: ['admin', 'storekeeper', 'store_manager'],
    keywords: ['storekeeper', 'indent', 'requisition', 'distribution', 'stock inward']
  },
  {
    id: 'store-executive',
    title: 'Store Manager Executive',
    shortTitle: 'Store Manager',
    url: '/admin/store-manager',
    icon: Package,
    description: 'Vendor RFQs, procurement orders, reorder thresholds & supply audit',
    category: 'operations',
    department: 'modules',
    roles: ['admin', 'store_manager'],
    keywords: ['procurement', 'vendor', 'purchase order', 'reorder level']
  },
  {
    id: 'direct-store',
    title: 'Direct Campus Store Catalog',
    shortTitle: 'Store Catalog',
    url: '/store',
    icon: Package,
    description: 'Uniforms, medical kits, stationery and student supplies catalog',
    category: 'operations',
    department: 'modules',
    roles: ['admin', 'store_manager', 'storekeeper', 'principal'],
    keywords: ['campus store', 'catalog', 'medical kit', 'stationery', 'books']
  },
  {
    id: 'transport-management',
    title: 'Fleet & Transport Logistics',
    shortTitle: 'Transport Fleet',
    url: '/admin/transport',
    icon: Truck,
    description: 'College bus routes, pickup stops, vehicle fitness & transit maintenance',
    category: 'operations',
    department: 'modules',
    roles: ['admin', 'transport_driver', 'driver', 'principal'],
    badge: 'Fleet',
    keywords: ['transport', 'bus', 'vehicle', 'routes', 'stops', 'driver']
  },
  {
    id: 'transport-driver',
    title: 'Transport Driver Live Operations',
    shortTitle: 'Driver Operations',
    url: '/admin/transport-driver',
    icon: Truck,
    description: 'Daily trip logs, student boarding verification and transit tracker',
    category: 'operations',
    department: 'modules',
    roles: ['admin', 'transport_driver', 'driver'],
    keywords: ['trip log', 'bus driver', 'boarding', 'transit tracker']
  },
  {
    id: 'bus-tracking',
    title: 'Live Bus GPS Tracking',
    shortTitle: 'Bus Tracking',
    url: '/track-bus',
    icon: Truck,
    description: 'Real-time vehicle location, route stops and arrival timings',
    category: 'operations',
    department: 'modules',
    roles: ['admin', 'transport_driver', 'principal'],
    keywords: ['gps', 'bus tracking', 'transit', 'arrival']
  },
  {
    id: 'library-management',
    title: 'Paramedical Central Library',
    shortTitle: 'Library Desk',
    url: '/library-management',
    icon: BookOpen,
    description: 'Medical textbooks, anatomy journals, barcode issues and returns',
    category: 'operations',
    department: 'modules',
    roles: ['admin', 'librarian', 'principal'],
    badge: 'Library',
    keywords: ['library', 'books', 'journals', 'lending', 'textbooks', 'circulation']
  },
  {
    id: 'sports-athletics',
    title: 'Sports & Extracurriculars',
    shortTitle: 'Sports & Athletics',
    url: '/sports-management',
    icon: Award,
    description: 'Athletic teams, inter-college tournaments and annual sports meet',
    category: 'operations',
    department: 'modules',
    roles: ['admin', 'principal'],
    keywords: ['sports', 'athletics', 'tournaments', 'games', 'cultural']
  },

  // -------------------------------------------------------------
  // 5. HEALTHCARE & CLINICAL
  // -------------------------------------------------------------
  {
    id: 'medical-management',
    title: 'Medical Centre & Infirmary',
    shortTitle: 'Medical Desk',
    url: '/medical-management',
    icon: Stethoscope,
    description: 'Student clinical records, health checkups and emergency campus care',
    category: 'healthcare',
    department: 'modules',
    roles: ['admin', 'principal'],
    badge: 'Clinical',
    keywords: ['medical', 'infirmary', 'clinical', 'doctor', 'first aid', 'emergency', 'health']
  },
  {
    id: 'hospital-postings',
    title: 'Clinical & Hospital Training',
    shortTitle: 'Hospital Postings',
    url: '/medical-management?tab=clinical',
    icon: Activity,
    description: 'Hospital ward rotations, internship postings and clinical logbooks',
    category: 'healthcare',
    department: 'modules',
    roles: ['admin', 'principal', 'teacher'],
    keywords: ['hospital', 'rotations', 'internship', 'clinical training', 'posting']
  },

  // -------------------------------------------------------------
  // 6. GOVERNANCE
  // -------------------------------------------------------------
  {
    id: 'naac-accreditation',
    title: 'NAAC Accreditation Suite',
    shortTitle: 'NAAC Suite',
    url: '/admin/naac',
    icon: Award,
    description: 'Criteria 1-7 documentation, qualitative metrics & SSR institutional file',
    category: 'governance',
    department: 'modules',
    roles: ['admin', 'naac_coordinator', 'principal'],
    badge: 'NAAC A+',
    keywords: ['naac', 'accreditation', 'ssr', 'criteria', 'quality', 'compliance']
  },
  {
    id: 'certificates',
    title: 'Official Certificate Generation',
    shortTitle: 'Certificates',
    url: '/certificate-generation',
    icon: FileCheck,
    description: 'Bonafide, Transfer (TC), Conduct, Course Completion and Hall Tickets',
    category: 'governance',
    department: 'modules',
    roles: ['admin', 'principal'],
    keywords: ['certificate', 'bonafide', 'transfer certificate', 'tc', 'conduct']
  },
  {
    id: 'disciplinary',
    title: 'Discipline & Grievance Council',
    shortTitle: 'Discipline Desk',
    url: '/disciplinary-management',
    icon: Shield,
    description: 'Incident inquiries, anti-ragging compliance and grievance records',
    category: 'governance',
    department: 'modules',
    roles: ['admin', 'principal', 'teacher'],
    keywords: ['discipline', 'grievance', 'anti ragging', 'inquiry', 'concern']
  },
  {
    id: 'student-lifecycle',
    title: 'Discontinuation & Transfers',
    shortTitle: 'Lifecycle',
    url: '/student-lifecycle',
    icon: UserPlus,
    description: 'Record a student leaving, returning or moving class',
    category: 'governance',
    department: 'modules',
    roles: ['admin','principal'],
    keywords: ['discontinue','withdraw','transfer','dropout','tc','reinstate']
  },
  {
    id: 'student-leave',
    title: 'Student Leave Requests',
    shortTitle: 'Student Leave',
    url: '/student-leave',
    icon: Calendar,
    description: 'Approve or reject student leave',
    category: 'governance',
    department: 'modules',
    roles: ['admin','principal','hod','teacher'],
    keywords: ['leave','absence','permission']
  },
  {
    id: 'announcements',
    title: 'Announcements',
    shortTitle: 'Announcements',
    url: '/announcements',
    icon: FileText,
    description: 'Publish notices that notify students, parents and staff',
    category: 'governance',
    department: 'modules',
    roles: ['admin','principal'],
    keywords: ['notice','circular','broadcast','announce']
  },
  {
    id: 'data-centre',
    title: 'Search & Export',
    shortTitle: 'Search & Export',
    url: '/data-centre',
    icon: FileText,
    description: 'Find anyone, download lists as CSV',
    category: 'governance',
    department: 'modules',
    roles: ['admin','principal'],
    keywords: ['search','export','csv','download']
  },
  {
    id: 'integrations',
    title: 'Integrations',
    shortTitle: 'Integrations',
    url: '/integrations',
    icon: FileText,
    description: 'Connect payment gateway, e-mail, SMS and WhatsApp',
    category: 'governance',
    department: 'modules',
    roles: ['admin'],
    keywords: ['razorpay','payment','gateway','email','resend','sms','whatsapp','twilio','api key']
  },
  {
    id: 'student-promotion',
    title: 'Year-End Promotion & Graduation',
    shortTitle: 'Promotion',
    url: '/student-promotion',
    icon: GraduationCap,
    description: 'Promote classes to the next semester or graduate the final batch, with undo',
    category: 'governance',
    department: 'modules',
    roles: ['admin', 'principal'],
    keywords: ['promotion', 'promote', 'graduate', 'semester', 'year end', 'rollover']
  },
  {
    id: 'audit-log',
    title: 'Audit Log',
    shortTitle: 'Audit Log',
    url: '/audit-log',
    icon: FileText,
    description: 'Searchable record of who changed what, and when',
    category: 'governance',
    department: 'modules',
    roles: ['admin', 'principal'],
    keywords: ['audit', 'log', 'history', 'changes', 'security']
  },
  {
    id: 'alumni-network',
    title: 'Paramedical Alumni Network',
    shortTitle: 'Alumni Network',
    url: '/alumni-management',
    icon: GraduationCap,
    description: 'Graduate registry, hospital placements and guest lecture alumni',
    category: 'governance',
    department: 'modules',
    roles: ['admin', 'principal'],
    keywords: ['alumni', 'graduates', 'placements', 'network']
  },
  {
    id: 'reports-center',
    title: 'Institutional Reports Center',
    shortTitle: 'Reports Center',
    url: '/admin/reports',
    icon: FileText,
    description: 'Academic audit sheets, enrollment breakdown and compliance dossiers',
    category: 'governance',
    department: 'modules',
    roles: ['admin', 'principal'],
    keywords: ['reports', 'audit', 'compliance', 'statistics', 'dossier']
  },
  {
    id: 'system-analytics',
    title: 'Executive System Analytics',
    shortTitle: 'Analytics',
    url: '/admin/analytics',
    icon: BarChart3,
    description: 'Enrollment trajectory, revenue growth and institutional KPI gauges',
    category: 'governance',
    department: 'modules',
    roles: ['admin', 'principal'],
    keywords: ['analytics', 'charts', 'kpi', 'performance', 'metrics']
  },
  {
    id: 'system-settings',
    title: 'College System Settings',
    shortTitle: 'System Settings',
    url: '/admin/settings',
    icon: Settings,
    description: 'Institutional profile, academic year, branding and security policies',
    category: 'governance',
    department: 'modules',
    roles: ['admin'],
    keywords: ['settings', 'config', 'security', 'academic year', 'college info']
  }
];

export const SMART_CATEGORIES: SmartCategoryGroup[] = [
  {
    id: 'people',
    name: 'People & Identities',
    tagline: 'Students, Parents, Faculty & Staff',
    icon: Users,
    accentColor: 'blue',
    modules: ALL_SMART_MODULES.filter(m => m.category === 'people')
  },
  {
    id: 'academics',
    name: 'Academics & Faculty',
    tagline: 'Programs, Timetables & Examinations',
    icon: GraduationCap,
    accentColor: 'indigo',
    modules: ALL_SMART_MODULES.filter(m => m.category === 'academics')
  },
  {
    id: 'finance',
    name: 'Financial Governance',
    tagline: 'Tuition Fees, Collections & Ledger',
    icon: DollarSign,
    accentColor: 'emerald',
    modules: ALL_SMART_MODULES.filter(m => m.category === 'finance')
  },
  {
    id: 'operations',
    name: 'Institutional Operations',
    tagline: 'Admissions, Store, Fleet & Library',
    icon: Package,
    accentColor: 'amber',
    modules: ALL_SMART_MODULES.filter(m => m.category === 'operations')
  },
  {
    id: 'healthcare',
    name: 'Healthcare & Clinical',
    tagline: 'Infirmary, Rotations & Health Logs',
    icon: Stethoscope,
    accentColor: 'rose',
    modules: ALL_SMART_MODULES.filter(m => m.category === 'healthcare')
  },
  {
    id: 'governance',
    name: 'Governance & Compliance',
    tagline: 'NAAC, Policies, Certificates & Reports',
    icon: Shield,
    accentColor: 'slate',
    modules: ALL_SMART_MODULES.filter(m => m.category === 'governance')
  }
];

// Helper: Determine which primary top-level department a pathname belongs to
export function getActiveDepartment(pathname: string): 'overview' | 'people' | 'academics' | 'finance' | 'modules' {
  if (pathname === '/admin' || pathname === '/admin/') {
    return 'overview';
  }
  if (
    pathname.includes('/admin/users') ||
    pathname.includes('/admin/teachers') ||
    pathname.includes('/admin/receptionist')
  ) {
    return 'people';
  }
  if (
    pathname.includes('/admin/departments') ||
    pathname.includes('/admin/timetable') ||
    pathname.includes('/admin/principal') ||
    pathname.includes('/admin/events') ||
    pathname.includes('/exam-management')
  ) {
    return 'academics';
  }
  if (
    pathname.includes('/admin/finance') ||
    pathname.includes('/admin/accounts') ||
    pathname.includes('/admin/finance-manager')
  ) {
    return 'finance';
  }
  return 'modules';
}

// Helper: Get breadcrumbs for a given pathname
export interface BreadcrumbItem {
  label: string;
  url?: string;
}

export function getBreadcrumbsForPath(pathname: string): BreadcrumbItem[] {
  const crumbs: BreadcrumbItem[] = [
    { label: 'Command Center', url: '/admin' }
  ];

  if (pathname === '/admin' || pathname === '/admin/') {
    crumbs.push({ label: 'Institutional Overview' });
    return crumbs;
  }

  // Find exact module
  const matched = ALL_SMART_MODULES.find(m => {
    if (m.url.includes('?')) {
      return pathname.startsWith(m.url.split('?')[0]);
    }
    return pathname === m.url || pathname.startsWith(m.url + '/');
  });

  if (matched) {
    const cat = SMART_CATEGORIES.find(c => c.id === matched.category);
    if (cat) {
      crumbs.push({ label: cat.name });
    }
    crumbs.push({ label: matched.title, url: matched.url });
  } else {
    // Dynamic fallback
    const parts = pathname.replace(/^\//, '').split('/');
    parts.forEach((p, idx) => {
      const formatted = p.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      const isLast = idx === parts.length - 1;
      crumbs.push({
        label: formatted,
        url: isLast ? undefined : `/${parts.slice(0, idx + 1).join('/')}`
      });
    });
  }

  return crumbs;
}

// Favourites & Recents LocalStorage Keys
export const RECENT_MODULES_STORAGE_KEY = 'adithyan_recent_admin_pages';
export const FAVOURITE_MODULES_STORAGE_KEY = 'adithyan_fav_admin_pages';
export const LAST_VISITED_MODULE_KEY = 'adithyan_last_admin_module';

export function getStoredRecentModules(): SmartNavModule[] {
  try {
    const raw = localStorage.getItem(RECENT_MODULES_STORAGE_KEY);
    if (!raw) return [];
    const ids: string[] = JSON.parse(raw);
    return ids
      .map(id => ALL_SMART_MODULES.find(m => m.id === id))
      .filter((m): m is SmartNavModule => !!m);
  } catch {
    return [];
  }
}

export function recordRecentModule(pathname: string): void {
  try {
    const matched = ALL_SMART_MODULES.find(m => {
      if (m.url.includes('?')) return pathname.startsWith(m.url.split('?')[0]);
      return pathname === m.url;
    });
    if (!matched) return;

    localStorage.setItem(LAST_VISITED_MODULE_KEY, matched.id);

    const existing = getStoredRecentModules().map(m => m.id);
    const updated = [matched.id, ...existing.filter(id => id !== matched.id)].slice(0, 6);
    localStorage.setItem(RECENT_MODULES_STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}

export function getStoredFavourites(): string[] {
  try {
    const raw = localStorage.getItem(FAVOURITE_MODULES_STORAGE_KEY);
    if (!raw) {
      // Default initial bookmarks
      return ['students', 'class-timetable', 'fee-management', 'exam-desk', 'admissions-desk'];
    }
    return JSON.parse(raw);
  } catch {
    return ['students', 'class-timetable', 'fee-management', 'exam-desk', 'admissions-desk'];
  }
}

export function toggleStoredFavourite(moduleId: string): string[] {
  try {
    const current = getStoredFavourites();
    const updated = current.includes(moduleId)
      ? current.filter(id => id !== moduleId)
      : [...current, moduleId];
    localStorage.setItem(FAVOURITE_MODULES_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

