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
  FileCheck
} from 'lucide-react';

export interface AdminNavModule {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  url: string;
  description: string;
  roles: string[];
  badge?: string;
}

export interface AdminNavHub {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  modules: AdminNavModule[];
}

export const ADMIN_HUBS: AdminNavHub[] = [
  {
    id: 'academic',
    title: 'Academics & Faculty',
    icon: GraduationCap,
    description: 'Departments, Faculty allocations, Class timetable and Examinations',
    modules: [
      {
        title: 'Department Management',
        icon: Users,
        url: '/admin/departments',
        description: 'Manage Academic Departments & Laboratory Sections',
        roles: ['admin', 'principal'],
      },
      {
        title: 'Teacher Assignments',
        icon: Users,
        url: '/admin/teachers',
        description: 'Faculty Scheduling & Subject Allocation',
        roles: ['admin', 'principal'],
      },
      {
        title: 'Class Timetable',
        icon: Calendar,
        url: '/admin/timetable',
        description: 'Weekly Timetables & Clash Prevention',
        roles: ['admin', 'principal'],
      },
      {
        title: 'Examination Desk',
        icon: FileText,
        url: '/exam-management',
        description: 'Exams, Schedules, Hall Tickets & Marksheets',
        roles: ['admin', 'principal', 'teacher'],
        badge: 'Exams',
      },
      {
        title: 'Principal Academic Desk',
        icon: GraduationCap,
        url: '/admin/principal',
        description: 'Executive Academic Leadership & Curriculum Oversight',
        roles: ['admin', 'principal'],
      },
      {
        title: 'College Events & Seminars',
        icon: Calendar,
        url: '/admin/events',
        description: 'Manage Campus Events, CME & Conferences',
        roles: ['admin', 'principal'],
      },
    ],
  },
  {
    id: 'admissions',
    title: 'Admissions & Students',
    icon: UserPlus,
    description: 'Student Admissions, Reception Hub, Alumni & Sports',
    modules: [
      {
        title: 'Admission Management',
        icon: UserPlus,
        url: '/admission-management',
        description: 'New Student Enrollments & Parent Account Setup',
        roles: ['admin', 'admission_officer', 'principal'],
        badge: 'Core',
      },
      {
        title: 'Reception & Front Desk',
        icon: Users,
        url: '/admin/receptionist',
        description: 'Front Office, Visitor Logs & Instant Receipts',
        roles: ['admin', 'receptionist'],
      },
      {
        title: 'Year-End Promotion',
        icon: GraduationCap,
        url: '/student-promotion',
        description: 'Promote classes to the next semester or graduate the final batch',
        roles: ['admin', 'principal'],
      },
      {
        title: 'Audit Log',
        icon: FileCheck,
        url: '/audit-log',
        description: 'Tamper-proof record of who changed what, and when',
        roles: ['admin', 'principal'],
      },
      {
        title: 'Alumni Network',
        icon: GraduationCap,
        url: '/alumni-management',
        description: 'Paramedical Graduate Directory & Career Network',
        roles: ['admin', 'principal'],
      },
      {
        title: 'Sports & Extracurriculars',
        icon: Award,
        url: '/sports-management',
        description: 'Athletics, Inter-College Tournaments & Cultural',
        roles: ['admin', 'sports_coordinator', 'principal'],
      },
      {
        title: 'Disciplinary & Grievances',
        icon: Shield,
        url: '/disciplinary-management',
        description: 'Student Concerns, Inquiries & Resolutions',
        roles: ['admin', 'principal', 'teacher'],
      },
    ],
  },
  {
    id: 'finance',
    title: 'Financial Governance',
    icon: DollarSign,
    description: 'Fee Collections, Receipts, Accounts Ledger & Auditing',
    modules: [
      {
        title: 'Financial Management',
        icon: DollarSign,
        url: '/admin/finance',
        description: 'Tuition Fees, Dues Aging & Revenue Metrics',
        roles: ['admin', 'financier', 'finance_manager'],
        badge: 'Revenue',
      },
      {
        title: 'Accounts Officer Desk',
        icon: DollarSign,
        url: '/admin/accounts',
        description: 'Ledger Posting, Cashbook & Operational Vouchers',
        roles: ['admin', 'accountant', 'finance_manager'],
      },
      {
        title: 'Finance Manager Desk',
        icon: DollarSign,
        url: '/admin/finance-manager',
        description: 'Fee Structure Governance & Cashier Audit Controls',
        roles: ['admin', 'finance_manager'],
      },
    ],
  },
  {
    id: 'logistics',
    title: 'Logistics & Campus Assets',
    icon: Package,
    description: 'Store, Laboratory Consumables, Bus Fleet & Transit',
    modules: [
      {
        title: 'Store & Inventory',
        icon: Package,
        url: '/admin/store',
        description: 'Medical Consumables, Reagents & Capital Assets',
        roles: ['admin', 'store_manager', 'storekeeper'],
      },
      {
        title: 'Store Keeper Requisitions',
        icon: Package,
        url: '/admin/storekeeper',
        description: 'Stock Inward, Lab Dispensary & Requisitions',
        roles: ['admin', 'storekeeper', 'store_manager'],
      },
      {
        title: 'Store Manager Executive',
        icon: Package,
        url: '/admin/store-manager',
        description: 'Procurement, Vendor RFQs & Reorder Limits',
        roles: ['admin', 'store_manager'],
      },
      {
        title: 'Transport Management',
        icon: Truck,
        url: '/admin/transport',
        description: 'Bus Routes, Pick-up Points & Vehicle Records',
        roles: ['admin', 'driver', 'transport_driver'],
      },
      {
        title: 'Transport Driver Monitor',
        icon: Truck,
        url: '/admin/transport-driver',
        description: 'Live Trip Logs, Fuel & Student Transit Check-in',
        roles: ['admin', 'transport_driver'],
      },
      {
        title: 'Direct Store Catalog',
        icon: Package,
        url: '/store',
        description: 'College Store Uniforms & Stationary Catalog',
        roles: ['admin', 'store_manager', 'storekeeper', 'principal'],
      },
    ],
  },
  {
    id: 'healthcare',
    title: 'Healthcare & Clinical Auxiliary',
    icon: Stethoscope,
    description: 'Campus Infirmary, Medical Library & Digital Credentials',
    modules: [
      {
        title: 'Medical & Infirmary Desk',
        icon: Stethoscope,
        url: '/medical-management',
        description: 'Student Clinical Health Records & Emergency Care',
        roles: ['admin', 'medical_officer', 'principal'],
        badge: 'Health',
      },
      {
        title: 'Paramedical Library',
        icon: BookOpen,
        url: '/library-management',
        description: 'Medical Textbooks, Journals & Barcode Lending',
        roles: ['admin', 'librarian', 'principal'],
      },
      {
        title: 'Certificate Generation',
        icon: FileCheck,
        url: '/certificate-generation',
        description: 'Bonafide, Transfer, Conduct & Course Certificates',
        roles: ['admin', 'registrar', 'principal'],
      },
    ],
  },
  {
    id: 'governance',
    title: 'Governance & Compliance',
    icon: Shield,
    description: 'NAAC Accreditation, User Accounts, Reports & Settings',
    modules: [
      {
        title: 'NAAC Accreditation',
        icon: Award,
        url: '/admin/naac',
        description: 'Criteria 1-7 Evidence Locker, SSR & Metric Dashboards',
        roles: ['admin', 'naac_coordinator', 'principal'],
        badge: 'Accreditation',
      },
      {
        title: 'User Accounts & Access',
        icon: UserPlus,
        url: '/admin/users',
        description: 'Multi-Role User Provisioning & Authentication Audit',
        roles: ['admin'],
      },
      {
        title: 'Reports Center',
        icon: FileText,
        url: '/admin/reports',
        description: 'Institutional Compliance, Academic & Financial Reports',
        roles: ['admin', 'principal', 'financier'],
      },
      {
        title: 'System Analytics',
        icon: BarChart3,
        url: '/admin/analytics',
        description: 'Enrollment Trends, Collection Charts & Performance',
        roles: ['admin', 'principal'],
      },
      {
        title: 'System Settings',
        icon: Settings,
        url: '/admin/settings',
        description: 'Institution Profile, Academic Year & System Configuration',
        roles: ['admin'],
      },
    ],
  },
];

