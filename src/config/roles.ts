import { UserRole } from '@/context/AuthContext';

export interface RoleNavItem {
  label: string;
  path: string;
  description?: string;
}

export interface RoleConfig {
  role: UserRole;
  label: string;
  home: string;
  allowedRoutes: string[];
  navItems: RoleNavItem[];
}

export const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  admin: {
    role: 'admin',
    label: 'Institutional Administrator',
    home: '/admin',
    allowedRoutes: ['/student-lifecycle', '/integrations', '/announcements', '/student-leave', '/data-centre', '/admin', '/dashboard', '/exam-management', '/library-management', '/admission-management', '/alumni-management', '/medical-management', '/student-promotion', '/audit-log', '/certificate-generation', '/sports-management', '/disciplinary-management', '/store', '/report-concern', '/admin/account-provisioning', '/account-provisioning'],
    navItems: [
      { label: 'Admin Overview', path: '/admin' },
      { label: 'User Directory', path: '/admin/users' },
      { label: 'Departments & Courses', path: '/admin/departments' },
      { label: 'Timetable Matrix', path: '/admin/timetable' },
      { label: 'NAAC Accreditation', path: '/admin/naac' },
      { label: 'Campus Store', path: '/store' },
    ],
  },
  principal: {
    role: 'principal',
    label: 'Principal / Dean',
    home: '/dashboard/principal',
    allowedRoutes: ['/student-lifecycle', '/announcements', '/student-leave', '/data-centre', '/dashboard', '/principal', '/admission-management', '/dashboard/principal', '/admin/departments', '/admin/timetable', '/admin/teachers', '/admin/naac', '/student-promotion', '/audit-log', '/disciplinary-management', '/certificate-generation', '/exam-management', '/report-concern', '/admin/account-provisioning', '/account-provisioning'],
    navItems: [
      { label: 'Executive Dashboard', path: '/dashboard/principal' },
      { label: 'Departments', path: '/admin/departments' },
      { label: 'Timetable', path: '/admin/timetable' },
      { label: 'Admissions', path: '/admission-management' },
      { label: 'Certificates', path: '/certificate-generation' },
      { label: 'Disciplinary Council', path: '/disciplinary-management' },
      { label: 'NAAC Review', path: '/admin/naac' },
    ],
  },
  teacher: {
    role: 'teacher',
    label: 'Faculty Member',
    home: '/dashboard/teacher',
    allowedRoutes: ['/student-leave', '/data-centre', '/dashboard', '/teacher', '/dashboard/teacher', '/teachers/create-assignment', '/teachers/message-parents', '/teachers/generate-report', '/teachers/daily-update', '/exam-management', '/report-concern'],
    navItems: [
      { label: 'Faculty Hub', path: '/dashboard/teacher' },
      { label: 'Create Assignment', path: '/teachers/create-assignment' },
      { label: 'Daily Lesson Update', path: '/teachers/daily-update' },
      { label: 'Progress Reports', path: '/teachers/generate-report' },
      { label: 'Message Guardians', path: '/teachers/message-parents' },
    ],
  },
  student: {
    role: 'student',
    label: 'Student',
    home: '/dashboard/student',
    allowedRoutes: ['/dashboard', '/student', '/dashboard/student', '/track-bus', '/achievements', '/store', '/message-teacher', '/report-concern', '/exam-management', '/library-management'],
    navItems: [
      { label: 'Student Portal', path: '/dashboard/student' },
      { label: 'Track Bus', path: '/track-bus' },
      { label: 'Campus Store', path: '/store' },
      { label: 'Achievements', path: '/achievements' },
      { label: 'Message Faculty', path: '/message-teacher' },
      { label: 'Report Concern', path: '/report-concern' },
    ],
  },
  parent: {
    role: 'parent',
    label: 'Parent / Guardian',
    home: '/dashboard/parent',
    allowedRoutes: ['/dashboard', '/parent', '/dashboard/parent', '/track-bus', '/report-concern', '/store'],
    navItems: [
      { label: 'Parent Portal', path: '/dashboard/parent' },
      { label: 'Track Ward Transit', path: '/track-bus' },
      { label: 'Report Concern', path: '/report-concern' },
      { label: 'Store Uniforms', path: '/store' },
    ],
  },
  finance_manager: {
    role: 'finance_manager',
    label: 'Finance Manager',
    home: '/dashboard/finance_manager',
    allowedRoutes: ['/data-centre', '/dashboard', '/finance', '/accounts'],
    navItems: [
      { label: 'Finance Hub', path: '/dashboard/finance_manager' },
      { label: 'Fees & Fee Setup', path: '/finance' },
      { label: 'Accounting Ledger', path: '/accounts' },
    ],
  },
  financier: {
    role: 'financier',
    label: 'Financier & Cashier',
    home: '/dashboard/financier',
    allowedRoutes: ['/data-centre', '/dashboard', '/finance', '/dashboard/financier'],
    navItems: [
      { label: 'Cashier Desk', path: '/dashboard/financier' },
      { label: 'Fee Transactions', path: '/finance' },
    ],
  },
  accountant: {
    role: 'accountant',
    label: 'Accounts Officer',
    home: '/dashboard/accountant',
    allowedRoutes: ['/data-centre', '/dashboard', '/accounts', '/dashboard/accountant'],
    navItems: [
      { label: 'Accounts Dashboard', path: '/dashboard/accountant' },
      { label: 'Institutional Ledger', path: '/accounts' },
    ],
  },
  store_manager: {
    role: 'store_manager',
    label: 'Store Manager',
    home: '/dashboard/store_manager',
    allowedRoutes: ['/dashboard', '/admin/store', '/admin/store-manager', '/store'],
    navItems: [
      { label: 'Store Management', path: '/dashboard/store_manager' },
      { label: 'Product Catalog', path: '/store' },
    ],
  },
  storekeeper: {
    role: 'storekeeper',
    label: 'Storekeeper',
    home: '/dashboard/storekeeper',
    allowedRoutes: ['/dashboard', '/admin/storekeeper', '/dashboard/storekeeper', '/store'],
    navItems: [
      { label: 'Store Dispatch', path: '/dashboard/storekeeper' },
      { label: 'Counter Stock', path: '/store' },
    ],
  },
  transport_driver: {
    role: 'transport_driver',
    label: 'Chief Transit Officer',
    home: '/dashboard/transport_driver',
    allowedRoutes: ['/dashboard', '/admin/transport', '/admin/transport-driver', '/track-bus'],
    navItems: [
      { label: 'Transport Hub', path: '/dashboard/transport_driver' },
      { label: 'Fleet Telematics', path: '/track-bus' },
    ],
  },
  driver: {
    role: 'driver',
    label: 'Transport Driver',
    home: '/dashboard/driver',
    allowedRoutes: ['/dashboard', '/dashboard/driver', '/track-bus'],
    navItems: [
      { label: 'Driver Desk', path: '/dashboard/driver' },
      { label: 'Active Route Bus', path: '/track-bus' },
    ],
  },
  receptionist: {
    role: 'receptionist',
    label: 'Front Desk Receptionist',
    home: '/dashboard/receptionist',
    allowedRoutes: ['/data-centre', '/dashboard', '/dashboard/receptionist', '/admission-management', '/account-provisioning'],
    navItems: [
      { label: 'Front Desk', path: '/dashboard/receptionist' },
      { label: 'Admissions', path: '/admission-management' },
      { label: 'Student & Parent Accounts', path: '/account-provisioning' },
    ],
  },
  naac_coordinator: {
    role: 'naac_coordinator',
    label: 'NAAC Coordinator',
    home: '/admin/naac',
    allowedRoutes: ['/admin/naac', '/dashboard'],
    navItems: [
      { label: 'NAAC Portal', path: '/admin/naac' },
    ],
  },
  hr_manager: {
    role: 'hr_manager',
    label: 'HR Manager',
    home: '/dashboard/hr_manager',
    allowedRoutes: ['/data-centre', '/dashboard', '/dashboard/hr_manager'],
    navItems: [
      { label: 'HR Workspace', path: '/dashboard/hr_manager' },
    ],
  },
  coe: {
    role: 'coe',
    label: 'Controller of Examinations',
    home: '/exam-management',
    allowedRoutes: ['/dashboard', '/exam-management'],
    navItems: [
      { label: 'Exam Console', path: '/exam-management' },
    ],
  },
  hod: {
    role: 'hod',
    label: 'Head of Department',
    home: '/dashboard/teacher',
    allowedRoutes: ['/student-leave', '/data-centre', '/dashboard', '/teachers/create-assignment', '/teachers/daily-update', '/teachers/generate-report'],
    navItems: [
      { label: 'Department Desk', path: '/dashboard/teacher' },
    ],
  },
  librarian: {
    role: 'librarian',
    label: 'Librarian',
    home: '/dashboard/librarian',
    allowedRoutes: ['/dashboard', '/library-management', '/dashboard/librarian'],
    navItems: [
      { label: 'Library Desk', path: '/dashboard/librarian' },
      { label: 'Catalog & Circulation', path: '/library-management' },
    ],
  },
  hostel_warden: {
    role: 'hostel_warden',
    label: 'Hostel Warden',
    home: '/dashboard/hostel_warden',
    allowedRoutes: ['/dashboard', '/dashboard/hostel_warden'],
    navItems: [
      { label: 'Warden Desk', path: '/dashboard/hostel_warden' },
    ],
  },
  placement_officer: {
    role: 'placement_officer',
    label: 'Placement Officer',
    home: '/dashboard/placement_officer',
    allowedRoutes: ['/dashboard', '/dashboard/placement_officer'],
    navItems: [
      { label: 'Placement Cell', path: '/dashboard/placement_officer' },
    ],
  },
};

export function isRouteAllowed(role: UserRole, pathname: string): boolean {
  if (role === 'admin') return true; // Admins have global access
  const config = ROLE_CONFIGS[role];
  if (!config) return false;
  return config.allowedRoutes.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'));
}

