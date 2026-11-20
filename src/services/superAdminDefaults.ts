import { 
  MasterSystemConfigState, 
  WidgetDefinition, 
  ModuleDefinition, 
  FeatureDefinition, 
  RoleCustomConfig,
  GlobalSettingsConfig,
  ThemeBrandingConfig,
  FormBuilderConfig,
  WorkflowBuilderConfig,
  NotificationRuleConfig
} from '@/types/superAdmin.types';

// ============================================================================
// DEFAULT 13+ ROLES CONFIGURATION
// ============================================================================
export const DEFAULT_ROLES_CONFIG: Record<string, RoleCustomConfig> = {
  admin: {
    role: 'admin',
    label: 'Super Administrator',
    description: 'Central institutional administrator with comprehensive control center access.',
    home: '/admin',
    category: 'Administration',
    status: 'active',
    allowedModules: ['students', 'faculty', 'academics', 'finance', 'store', 'transport', 'library', 'reception', 'admissions', 'naac', 'reports'],
    allowedRoutes: ['/admin', '/dashboard', '/exam-management', '/library-management', '/admission-management', '/alumni-management', '/medical-management', '/certificate-generation', '/sports-management', '/disciplinary-management', '/store', '/report-concern'],
    permissions: ['*'],
    features: ['*'],
    visibleWidgets: ['kpi_student_count', 'kpi_faculty_count', 'kpi_attendance_rate', 'kpi_fee_collection', 'chart_attendance_trends', 'table_recent_admissions', 'list_campus_broadcasts'],
    isSystemProtected: true,
  },
  principal: {
    role: 'principal',
    label: 'Principal & Dean',
    description: 'Executive academic head authorized for sanctions, faculty leaves, and curriculum governance.',
    home: '/dashboard/principal',
    category: 'Administration',
    status: 'active',
    allowedModules: ['students', 'faculty', 'academics', 'attendance', 'examinations', 'admissions', 'reports', 'approvals', 'events', 'announcements'],
    allowedRoutes: ['/dashboard/principal', '/admin/departments', '/admin/timetable', '/admin/teachers', '/admin/naac', '/disciplinary-management', '/certificate-generation', '/exam-management'],
    permissions: ['view_all', 'approve_leaves', 'approve_scholarships', 'sanction_admissions', 'approve_certificates', 'dispatch_circulars', 'schedule_events'],
    features: ['leave_sanction', 'scholarship_sanction', 'admission_sanction', 'certificate_signing', 'broadcast_dispatch'],
    visibleWidgets: ['kpi_student_count', 'kpi_faculty_count', 'kpi_attendance_rate', 'kpi_pending_approvals', 'chart_department_distribution', 'table_student_shortages', 'list_calendar_events'],
    isSystemProtected: true,
  },
  teacher: {
    role: 'teacher',
    label: 'Faculty & Clinical Instructor',
    description: 'Teaching staff managing assigned course rosters, timetable lessons, and student marks.',
    home: '/dashboard/teacher',
    category: 'Academic',
    status: 'active',
    allowedModules: ['academics', 'attendance', 'assignments', 'marks', 'concerns'],
    allowedRoutes: ['/dashboard/teacher', '/teachers/create-assignment', '/teachers/daily-update', '/teachers/generate-report', '/teachers/message-parents', '/exam-management'],
    permissions: ['view_assigned_students', 'mark_attendance', 'create_assignment', 'grade_submissions', 'post_daily_lesson'],
    features: ['attendance_marking', 'assignment_management', 'daily_lesson_update', 'grade_entry'],
    visibleWidgets: ['kpi_student_count', 'table_master_timetable', 'list_calendar_events', 'list_campus_broadcasts'],
  },
  student: {
    role: 'student',
    label: 'Paramedical Student',
    description: 'Enrolled student portal for timetables, attendance tracking, study content, and fees.',
    home: '/dashboard/student',
    category: 'Student & Parent',
    status: 'active',
    allowedModules: ['academics', 'attendance', 'assignments', 'store', 'transport', 'fees'],
    allowedRoutes: ['/dashboard/student', '/track-bus', '/achievements', '/store', '/message-teacher', '/report-concern'],
    permissions: ['view_own_profile', 'view_own_attendance', 'submit_assignment', 'view_timetable', 'order_store'],
    features: ['assignment_submission', 'bus_tracking', 'store_ordering', 'help_ticket'],
    visibleWidgets: ['kpi_attendance_rate', 'table_master_timetable', 'list_campus_broadcasts'],
  },
  parent: {
    role: 'parent',
    label: 'Parent & Guardian',
    description: 'Portal for monitoring linked student attendance, academic progress, and fee dues.',
    home: '/dashboard/parent',
    category: 'Student & Parent',
    status: 'active',
    allowedModules: ['student_progress', 'attendance', 'fees', 'transport'],
    allowedRoutes: ['/dashboard/parent', '/track-bus', '/report-concern', '/store'],
    permissions: ['view_ward_records', 'view_ward_attendance', 'pay_fees', 'track_transit'],
    features: ['fee_payment', 'transit_tracking', 'concern_escalation'],
    visibleWidgets: ['kpi_attendance_rate', 'list_campus_broadcasts'],
  },
  finance_manager: {
    role: 'finance_manager',
    label: 'Finance Manager',
    description: 'Manages institutional accounting ledgers, fee collections, and expense allocations.',
    home: '/dashboard/finance_manager',
    category: 'Finance',
    status: 'active',
    allowedModules: ['finance', 'fees', 'scholarships', 'reports'],
    allowedRoutes: ['/dashboard/finance_manager', '/admin/finance', '/admin/accounts'],
    permissions: ['view_financials', 'manage_fee_structures', 'generate_receipts', 'audit_ledger'],
    features: ['fee_schedule_setup', 'receipt_generation', 'financial_export'],
    visibleWidgets: ['kpi_fee_collection', 'chart_fee_collections', 'table_recent_admissions'],
  },
  financier: {
    role: 'financier',
    label: 'Financier & Cashier',
    description: 'Cash desk clerk handling on-counter tuition fees and fee clearance receipts.',
    home: '/dashboard/financier',
    category: 'Finance',
    status: 'active',
    allowedModules: ['fees', 'receipts'],
    allowedRoutes: ['/dashboard/financier', '/admin/finance'],
    permissions: ['collect_fees', 'print_receipts'],
    features: ['counter_cash_collection', 'receipt_printing'],
    visibleWidgets: ['kpi_fee_collection', 'chart_fee_collections'],
  },
  accountant: {
    role: 'accountant',
    label: 'Accounts Officer',
    description: 'Institutional bookkeeper verifying department expenses and vendor payments.',
    home: '/dashboard/accountant',
    category: 'Finance',
    status: 'active',
    allowedModules: ['finance', 'accounts'],
    allowedRoutes: ['/dashboard/accountant', '/admin/accounts'],
    permissions: ['manage_ledger', 'reconcile_accounts'],
    features: ['ledger_reconciliation', 'balance_sheet_export'],
    visibleWidgets: ['kpi_fee_collection'],
  },
  store_manager: {
    role: 'store_manager',
    label: 'Store Manager',
    description: 'Uniform, textbook, and clinical lab equipment inventory manager.',
    home: '/dashboard/store_manager',
    category: 'Operations',
    status: 'active',
    allowedModules: ['store', 'inventory'],
    allowedRoutes: ['/dashboard/store_manager', '/admin/store', '/store'],
    permissions: ['manage_products', 'manage_inventory', 'fulfill_orders'],
    features: ['inventory_replenishment', 'order_dispatch'],
    visibleWidgets: ['list_campus_broadcasts'],
  },
  storekeeper: {
    role: 'storekeeper',
    label: 'Storekeeper',
    description: 'Counter dispatch operator handing over physical uniforms and textbooks.',
    home: '/dashboard/storekeeper',
    category: 'Operations',
    status: 'active',
    allowedModules: ['store'],
    allowedRoutes: ['/dashboard/storekeeper', '/store'],
    permissions: ['dispatch_orders', 'view_stock'],
    features: ['order_handover'],
    visibleWidgets: ['list_campus_broadcasts'],
  },
  transport_driver: {
    role: 'transport_driver',
    label: 'Chief Transit Officer',
    description: 'Fleet coordinator overseeing campus buses, driver routes, and GPS telematics.',
    home: '/dashboard/transport_driver',
    category: 'Operations',
    status: 'active',
    allowedModules: ['transport'],
    allowedRoutes: ['/dashboard/transport_driver', '/admin/transport', '/track-bus'],
    permissions: ['manage_routes', 'view_telematics', 'schedule_maintenance'],
    features: ['gps_dispatch', 'route_assignment'],
    visibleWidgets: ['list_campus_broadcasts'],
  },
  driver: {
    role: 'driver',
    label: 'Transport Driver',
    description: 'Bus driver broadcasting live route GPS coordinates.',
    home: '/dashboard/driver',
    category: 'Operations',
    status: 'active',
    allowedModules: ['transport'],
    allowedRoutes: ['/dashboard/driver', '/track-bus'],
    permissions: ['broadcast_gps', 'view_assigned_route'],
    features: ['live_gps_broadcast'],
    visibleWidgets: ['list_campus_broadcasts'],
  },
  receptionist: {
    role: 'receptionist',
    label: 'Front Desk Receptionist',
    description: 'Visitor desk manager, enquiry counselor, and admissions intake facilitator.',
    home: '/dashboard/receptionist',
    category: 'Administration',
    status: 'active',
    allowedModules: ['reception', 'admissions', 'visitors'],
    allowedRoutes: ['/dashboard/receptionist', '/admission-management'],
    permissions: ['log_visitors', 'intake_admissions', 'schedule_appointments'],
    features: ['admission_intake', 'visitor_badging', 'appointment_booking'],
    visibleWidgets: ['kpi_admissions_count', 'table_recent_admissions'],
  },
  hr_manager: {
    role: 'hr_manager',
    label: 'HR Manager',
    description: 'Faculty recruitment, biometric records, and staff service files.',
    home: '/dashboard/hr_manager',
    category: 'Administration',
    status: 'active',
    allowedModules: ['faculty', 'payroll', 'leaves'],
    allowedRoutes: ['/dashboard/hr_manager'],
    permissions: ['manage_staff_records', 'review_leaves', 'view_payroll'],
    features: ['staff_onboarding', 'leave_tracking'],
    visibleWidgets: ['kpi_faculty_count', 'table_pending_leaves'],
  },
  librarian: {
    role: 'librarian',
    label: 'Chief Librarian',
    description: 'Medical & paramedical library catalog, book circulation, and e-resources.',
    home: '/dashboard/librarian',
    category: 'Specialized',
    status: 'active',
    allowedModules: ['library'],
    allowedRoutes: ['/dashboard/librarian', '/library-management'],
    permissions: ['catalog_books', 'issue_return_books', 'manage_digital_resources'],
    features: ['book_circulation', 'digital_library_upload'],
    visibleWidgets: ['list_campus_broadcasts'],
  },
  hostel_warden: {
    role: 'hostel_warden',
    label: 'Hostel Warden',
    description: 'Student hostel room allocations, night roll-calls, and campus out-passes.',
    home: '/dashboard/hostel_warden',
    category: 'Specialized',
    status: 'active',
    allowedModules: ['hostels'],
    allowedRoutes: ['/dashboard/hostel_warden'],
    permissions: ['allocate_rooms', 'approve_out_passes', 'record_rollcall'],
    features: ['out_pass_approval', 'room_allocation'],
    visibleWidgets: ['list_campus_broadcasts'],
  },
  placement_officer: {
    role: 'placement_officer',
    label: 'Placement & Internship Officer',
    description: 'Clinical posting partnerships, hospital tie-ups, and campus interviews.',
    home: '/dashboard/placement_officer',
    category: 'Specialized',
    status: 'active',
    allowedModules: ['placement'],
    allowedRoutes: ['/dashboard/placement_officer'],
    permissions: ['post_placement_drives', 'track_applications', 'partner_hospitals'],
    features: ['recruitment_drive_posting', 'candidate_shortlisting'],
    visibleWidgets: ['kpi_student_count', 'list_campus_broadcasts'],
  }
};

// ============================================================================
// DEFAULT MODULES (15 CORE MODULES)
// ============================================================================
export const DEFAULT_MODULES: ModuleDefinition[] = [
  {
    id: 'students',
    name: 'Student Directory & Accounts',
    description: 'Central student profile registry, admissions linking, and roll number directory.',
    category: 'Core',
    iconName: 'GraduationCap',
    enabled: true,
    assignedRoles: ['admin', 'principal', 'teacher', 'receptionist'],
    dependencies: [],
    routePath: '/admin/users?tab=students',
    isSystemCore: true,
  },
  {
    id: 'faculty',
    name: 'Faculty & Academic Staff',
    description: 'Teaching staff, clinical instructors, department rosters, and workloads.',
    category: 'Core',
    iconName: 'Users',
    enabled: true,
    assignedRoles: ['admin', 'principal', 'hr_manager'],
    dependencies: [],
    routePath: '/admin/teachers',
    isSystemCore: true,
  },
  {
    id: 'academics',
    name: 'Departments & Courses',
    description: 'Paramedical academic departments, duration, curriculums, and section matrices.',
    category: 'Academic',
    iconName: 'Building2',
    enabled: true,
    assignedRoles: ['admin', 'principal', 'teacher'],
    dependencies: [],
    routePath: '/admin/departments',
    isSystemCore: true,
  },
  {
    id: 'timetable',
    name: 'Master Timetable Matrix',
    description: 'Scheduled lecture hours, clinical posting shifts, and faculty assignments.',
    category: 'Academic',
    iconName: 'Clock',
    enabled: true,
    assignedRoles: ['admin', 'principal', 'teacher', 'student'],
    dependencies: ['academics', 'faculty'],
    routePath: '/admin/timetable',
  },
  {
    id: 'attendance',
    name: 'Institutional Attendance',
    description: 'Daily student attendance recording, compliance thresholds, and shortage warnings.',
    category: 'Academic',
    iconName: 'CheckCircle2',
    enabled: true,
    assignedRoles: ['admin', 'principal', 'teacher', 'student', 'parent'],
    dependencies: ['students'],
    routePath: '/dashboard/principal?view=attendance',
  },
  {
    id: 'admissions',
    name: 'Admissions Intake Desk',
    description: 'Paramedical applicant dossiers, eligibility verification, and principal sanctions.',
    category: 'Student Services',
    iconName: 'UserCheck',
    enabled: true,
    assignedRoles: ['admin', 'principal', 'receptionist'],
    dependencies: ['academics'],
    routePath: '/admission-management',
  },
  {
    id: 'examinations',
    name: 'Examinations & Results',
    description: 'University exam timetables, marks recording, and passing rate analytics.',
    category: 'Academic',
    iconName: 'Award',
    enabled: true,
    assignedRoles: ['admin', 'principal', 'teacher', 'student'],
    dependencies: ['academics', 'students'],
    routePath: '/exam-management',
  },
  {
    id: 'finance',
    name: 'Fees & Accounting Ledger',
    description: 'Student fee schedules, tuition collection, payment reminders, and expense audit.',
    category: 'Finance',
    iconName: 'DollarSign',
    enabled: true,
    assignedRoles: ['admin', 'principal', 'finance_manager', 'financier', 'accountant'],
    dependencies: ['students'],
    routePath: '/admin/finance',
  },
  {
    id: 'store',
    name: 'Campus Uniform & Book Store',
    description: 'Online student uniforms, lab aprons, textbooks, and physical counter dispatch.',
    category: 'Operations',
    iconName: 'Package',
    enabled: true,
    assignedRoles: ['admin', 'store_manager', 'storekeeper', 'student', 'parent'],
    dependencies: [],
    routePath: '/store',
  },
  {
    id: 'transport',
    name: 'Fleet Transport & GPS',
    description: 'College bus fleet, route telematics, stops, and live bus transit tracking.',
    category: 'Operations',
    iconName: 'Truck',
    enabled: true,
    assignedRoles: ['admin', 'transport_driver', 'driver', 'student', 'parent'],
    dependencies: [],
    routePath: '/track-bus',
  },
  {
    id: 'library',
    name: 'Medical Library & Catalog',
    description: 'Book lending, clinical journals, digital e-books, and circulation history.',
    category: 'Academic',
    iconName: 'BookOpen',
    enabled: true,
    assignedRoles: ['admin', 'principal', 'librarian', 'teacher', 'student'],
    dependencies: [],
    routePath: '/library-management',
  },
  {
    id: 'certificates',
    name: 'Institutional Certificates',
    description: 'Bonafide, study, conduct, and course completion certificates with digital seals.',
    category: 'Student Services',
    iconName: 'Award',
    enabled: true,
    assignedRoles: ['admin', 'principal'],
    dependencies: ['students'],
    routePath: '/certificate-generation',
  },
  {
    id: 'disciplinary',
    name: 'Disciplinary Council',
    description: 'Student incident records, grievance hearings, and regulatory council orders.',
    category: 'Administration',
    iconName: 'ShieldAlert',
    enabled: true,
    assignedRoles: ['admin', 'principal', 'teacher'],
    dependencies: ['students'],
    routePath: '/disciplinary-management',
  },
  {
    id: 'naac',
    name: 'NAAC Review & Accreditation',
    description: 'Institutional compliance criteria, SSR metrics, and documentation repository.',
    category: 'Administration',
    iconName: 'FileCheck',
    enabled: true,
    assignedRoles: ['admin', 'principal'],
    dependencies: [],
    routePath: '/admin/naac',
  },
  {
    id: 'broadcasts',
    name: 'Campus Circulars & Broadcasts',
    description: 'Official notifications disseminated to students, faculty, and parents simultaneously.',
    category: 'Core',
    iconName: 'Megaphone',
    enabled: true,
    assignedRoles: ['admin', 'principal'],
    dependencies: [],
    routePath: '/dashboard/principal?view=announcements',
    isSystemCore: true,
  },
  {
    id: 'hostel',
    name: 'Hostel & Residential Life',
    description: 'Hostel room allocations, mess billings, gate passes, and resident attendance.',
    category: 'Operations',
    iconName: 'Building',
    enabled: true,
    assignedRoles: ['admin', 'hostel_warden'],
    dependencies: ['students'],
    routePath: '/hostel-management',
  },
  {
    id: 'placements',
    name: 'Placement & Career Cell',
    description: 'Campus placement drives, corporate interviews, resume tracking, and offer letters.',
    category: 'Academic',
    iconName: 'Briefcase',
    enabled: true,
    assignedRoles: ['admin', 'placement_officer', 'student'],
    dependencies: ['students'],
    routePath: '/placement-management',
  }
];

// ============================================================================
// DEFAULT FEATURES (14 GRANULAR CONTROLS)
// ============================================================================
export const DEFAULT_FEATURES: FeatureDefinition[] = [
  {
    id: 'feat_student_import',
    name: 'Student Bulk CSV Import',
    description: 'Upload and parse batches of student admissions from institutional spreadsheets.',
    moduleId: 'students',
    enabled: true,
    assignedRoles: ['admin', 'receptionist'],
    actionKey: 'import_students'
  },
  {
    id: 'feat_attendance_marking',
    name: 'Daily Attendance Marking',
    description: 'Faculty ability to mark present, absent, or clinical duty for classes.',
    moduleId: 'attendance',
    enabled: true,
    assignedRoles: ['admin', 'teacher'],
    actionKey: 'mark_attendance'
  },
  {
    id: 'feat_assignment_creation',
    name: 'Assignment Authoring',
    description: 'Faculty publishing assignments with due dates and attachments.',
    moduleId: 'academics',
    enabled: true,
    assignedRoles: ['admin', 'teacher'],
    actionKey: 'create_assignment'
  },
  {
    id: 'feat_assignment_submission',
    name: 'Student Online Submission',
    description: 'Students uploading completed lab reports and homework assignments.',
    moduleId: 'academics',
    enabled: true,
    assignedRoles: ['student'],
    actionKey: 'submit_assignment'
  },
  {
    id: 'feat_fee_payment',
    name: 'Digital Fee Payment',
    description: 'Parents and students paying fees directly through integrated payments.',
    moduleId: 'finance',
    enabled: true,
    assignedRoles: ['admin', 'parent', 'student', 'finance_manager'],
    actionKey: 'pay_fees'
  },
  {
    id: 'feat_receipt_generation',
    name: 'Printable Fee Receipts',
    description: 'Generating formal institutional receipts with digital verification code.',
    moduleId: 'finance',
    enabled: true,
    assignedRoles: ['admin', 'finance_manager', 'financier', 'parent'],
    actionKey: 'print_receipt'
  },
  {
    id: 'feat_scholarship_sanction',
    name: 'Principal Scholarship Sanction',
    description: 'Authorizing tuition concessions and chairman trust scholarship grants.',
    moduleId: 'finance',
    enabled: true,
    assignedRoles: ['admin', 'principal'],
    actionKey: 'sanction_scholarship',
    requiresAdminSanction: true
  },
  {
    id: 'feat_leave_request',
    name: 'Faculty Leave Application',
    description: 'Teaching and clinical staff filing absence requests with substitutes.',
    moduleId: 'faculty',
    enabled: true,
    assignedRoles: ['teacher'],
    actionKey: 'request_leave'
  },
  {
    id: 'feat_leave_sanction',
    name: 'Executive Leave Sanction',
    description: 'Principal and Admin reviewing, approving, or declining faculty leaves.',
    moduleId: 'faculty',
    enabled: true,
    assignedRoles: ['admin', 'principal'],
    actionKey: 'approve_leave'
  },
  {
    id: 'feat_certificate_issuance',
    name: 'Digital Certificate Approval',
    description: 'Signing and releasing student Bonafide and Conduct certificates.',
    moduleId: 'certificates',
    enabled: true,
    assignedRoles: ['admin', 'principal'],
    actionKey: 'issue_certificate'
  },
  {
    id: 'feat_bus_tracking',
    name: 'Live GPS Telematics',
    description: 'Real-time school bus location map view for student transit.',
    moduleId: 'transport',
    enabled: true,
    assignedRoles: ['admin', 'student', 'parent', 'transport_driver', 'driver'],
    actionKey: 'track_bus'
  },
  {
    id: 'feat_broadcast_dispatch',
    name: 'Dispatch Campus Circulars',
    description: 'Publishing binding notices to all student, teacher, and parent portals.',
    moduleId: 'broadcasts',
    enabled: true,
    assignedRoles: ['admin', 'principal'],
    actionKey: 'dispatch_broadcast'
  },
  {
    id: 'feat_reports_export',
    name: 'Regulatory CSV & Print Exports',
    description: 'Exporting institutional strength and compliance tables.',
    moduleId: 'academics',
    enabled: true,
    assignedRoles: ['admin', 'principal'],
    actionKey: 'export_reports'
  },
  {
    id: 'feat_store_checkout',
    name: 'Uniform Store Ordering',
    description: 'Placing orders for medical scrubs, stethoscopes, and textbooks.',
    moduleId: 'store',
    enabled: true,
    assignedRoles: ['student', 'parent', 'admin'],
    actionKey: 'place_order'
  }
];

// ============================================================================
// DEFAULT WIDGET LIBRARY CATALOG (22 LIVE WIDGETS)
// ============================================================================
export const DEFAULT_WIDGET_CATALOG: WidgetDefinition[] = [
  {
    id: 'kpi_student_count',
    title: 'Enrolled Students',
    description: 'Real-time total count of active students enrolled across all departments.',
    category: 'kpi',
    supportedRoles: ['admin', 'principal', 'teacher', 'finance_manager', 'receptionist'],
    dataQueryKey: 'students_count',
    defaultColSpan: 1,
    supportedFormats: ['card'],
    iconName: 'GraduationCap',
    status: 'active'
  },
  {
    id: 'kpi_faculty_count',
    title: 'Faculty Strength',
    description: 'Total number of active teaching and clinical faculty members.',
    category: 'kpi',
    supportedRoles: ['admin', 'principal', 'hr_manager'],
    dataQueryKey: 'faculty_count',
    defaultColSpan: 1,
    supportedFormats: ['card'],
    iconName: 'Users',
    status: 'active'
  },
  {
    id: 'kpi_attendance_rate',
    title: 'Institutional Attendance',
    description: 'Overall cumulative student attendance rate percentage from live records.',
    category: 'kpi',
    supportedRoles: ['admin', 'principal', 'teacher', 'student', 'parent'],
    dataQueryKey: 'attendance_rate',
    defaultColSpan: 1,
    supportedFormats: ['card', 'gauge'],
    iconName: 'Clock',
    status: 'active'
  },
  {
    id: 'kpi_fee_collection',
    title: 'Tuition Fee Collection',
    description: 'Total student fee receipts recorded in active academic year.',
    category: 'kpi',
    supportedRoles: ['admin', 'principal', 'finance_manager', 'financier', 'accountant'],
    dataQueryKey: 'fee_collection',
    defaultColSpan: 1,
    supportedFormats: ['card'],
    iconName: 'DollarSign',
    status: 'active'
  },
  {
    id: 'kpi_pending_approvals',
    title: 'Pending Sanctions Queue',
    description: 'Consolidated count of pending faculty leaves, admissions, and scholarships.',
    category: 'kpi',
    supportedRoles: ['admin', 'principal'],
    dataQueryKey: 'pending_approvals',
    defaultColSpan: 1,
    supportedFormats: ['card'],
    iconName: 'ShieldAlert',
    status: 'active'
  },
  {
    id: 'kpi_departments_count',
    title: 'Academic Programs',
    description: 'Total registered B.VOC and Diploma paramedical programs.',
    category: 'kpi',
    supportedRoles: ['admin', 'principal'],
    dataQueryKey: 'departments_count',
    defaultColSpan: 1,
    supportedFormats: ['card'],
    iconName: 'Building2',
    status: 'active'
  },
  {
    id: 'kpi_admissions_count',
    title: 'Admission Inquiries',
    description: 'Total admission applications received in current cycle.',
    category: 'kpi',
    supportedRoles: ['admin', 'principal', 'receptionist'],
    dataQueryKey: 'admissions_count',
    defaultColSpan: 1,
    supportedFormats: ['card'],
    iconName: 'UserCheck',
    status: 'active'
  },
  {
    id: 'chart_attendance_trends',
    title: 'Department Attendance Compliance',
    description: 'Bar chart comparing attendance rates across paramedical departments.',
    category: 'chart',
    supportedRoles: ['admin', 'principal'],
    dataQueryKey: 'department_attendance',
    defaultColSpan: 2,
    supportedFormats: ['bar'],
    iconName: 'BarChart3',
    status: 'active'
  },
  {
    id: 'chart_department_distribution',
    title: 'Student Strength by Program',
    description: 'Departmental enrollment breakdown.',
    category: 'chart',
    supportedRoles: ['admin', 'principal'],
    dataQueryKey: 'department_students',
    defaultColSpan: 2,
    supportedFormats: ['bar', 'table'],
    iconName: 'PieChart',
    status: 'active'
  },
  {
    id: 'chart_fee_collections',
    title: 'Fee Collection Trends',
    description: 'Monthly tuition collections vs projected institutional targets.',
    category: 'chart',
    supportedRoles: ['admin', 'finance_manager'],
    dataQueryKey: 'fee_trends',
    defaultColSpan: 2,
    supportedFormats: ['line', 'bar'],
    iconName: 'TrendingUp',
    status: 'active'
  },
  {
    id: 'table_recent_admissions',
    title: 'Candidate Admissions Intake',
    description: 'List of recently submitted candidate applications awaiting sanction.',
    category: 'table',
    supportedRoles: ['admin', 'principal', 'receptionist'],
    dataQueryKey: 'recent_admissions',
    defaultColSpan: 2,
    supportedFormats: ['table'],
    iconName: 'UserCheck',
    status: 'active'
  },
  {
    id: 'table_pending_leaves',
    title: 'Faculty Leave Applications',
    description: 'Pending faculty absence requests with dates and reasons.',
    category: 'table',
    supportedRoles: ['admin', 'principal', 'hr_manager'],
    dataQueryKey: 'pending_leaves',
    defaultColSpan: 2,
    supportedFormats: ['table'],
    iconName: 'Clock',
    status: 'active'
  },
  {
    id: 'table_student_shortages',
    title: 'Attendance Shortage Alerts (< 75%)',
    description: 'Students below the regulatory 75% exam attendance threshold.',
    category: 'table',
    supportedRoles: ['admin', 'principal', 'teacher'],
    dataQueryKey: 'attendance_shortages',
    defaultColSpan: 2,
    supportedFormats: ['table'],
    iconName: 'AlertTriangle',
    status: 'active'
  },
  {
    id: 'table_master_timetable',
    title: 'Daily Class Schedule',
    description: 'Today’s scheduled class hours, subjects, and rooms.',
    category: 'table',
    supportedRoles: ['teacher', 'student'],
    dataQueryKey: 'timetable_today',
    defaultColSpan: 2,
    supportedFormats: ['table', 'list'],
    iconName: 'Clock',
    status: 'active'
  },
  {
    id: 'list_calendar_events',
    title: 'Upcoming Academic Events',
    description: 'Campus calendar assemblies, clinical posting dates, and holidays.',
    category: 'list',
    supportedRoles: ['admin', 'principal', 'teacher', 'student', 'parent'],
    dataQueryKey: 'calendar_events',
    defaultColSpan: 2,
    supportedFormats: ['list'],
    iconName: 'Calendar',
    status: 'active'
  },
  {
    id: 'list_campus_broadcasts',
    title: 'Official Campus Circulars',
    description: 'Recent circulars and notices issued by the Principal.',
    category: 'list',
    supportedRoles: ['admin', 'principal', 'teacher', 'student', 'parent'],
    dataQueryKey: 'campus_broadcasts',
    defaultColSpan: 2,
    supportedFormats: ['list'],
    iconName: 'Megaphone',
    status: 'active'
  },
  {
    id: 'action_quick_circular',
    title: 'Dispatch Circular Shortcut',
    description: 'One-click modal trigger to issue campus notices.',
    category: 'action',
    supportedRoles: ['admin', 'principal'],
    dataQueryKey: 'action_circular',
    defaultColSpan: 1,
    supportedFormats: ['card'],
    iconName: 'Megaphone',
    status: 'active'
  },
  {
    id: 'action_quick_admission',
    title: 'New Candidate Registration',
    description: 'Shortcut for front-desk reception to intake candidate.',
    category: 'action',
    supportedRoles: ['admin', 'receptionist'],
    dataQueryKey: 'action_admission',
    defaultColSpan: 1,
    supportedFormats: ['card'],
    iconName: 'UserPlus',
    status: 'active'
  }
];

// ============================================================================
// DEFAULT GLOBAL INSTITUTIONAL SETTINGS
// ============================================================================
export const DEFAULT_GLOBAL_SETTINGS: GlobalSettingsConfig = {
  institutionName: 'Adithyan College of Paramedical Sciences',
  institutionCode: 'ADITHYAN-PARAMED-2026',
  academicYear: '2026-2027',
  currentSemester: 'Odd Semester (2026)',
  contactEmail: 'admin@adithyan.edu.in',
  contactPhone: '+91 (044) 2876-4100',
  campusAddress: 'Adithyan College Campus, Coimbatore, Tamil Nadu, India',
  attendancePolicyThreshold: 75,
  passingMarksThreshold: 40,
  currencyCode: 'INR',
  currencySymbol: '₹',
  timezone: 'Asia/Kolkata',
  dateFormat: 'DD/MM/YYYY',
  maintenanceMode: false,
  enableRealtime: true
};

// ============================================================================
// DEFAULT THEME & BRANDING
// ============================================================================
export const DEFAULT_THEME_CONFIG: ThemeBrandingConfig = {
  colorPalette: 'blue',
  borderRadius: 'md',
  layoutDensity: 'normal',
  sidebarStyle: 'light',
  fontScale: 'md'
};

// ============================================================================
// DEFAULT REAL WORKFLOWS
// ============================================================================
export const DEFAULT_WORKFLOWS: Record<string, WorkflowBuilderConfig> = {
  admission_intake: {
    workflowId: 'admission_intake',
    name: 'Paramedical Candidate Admission Workflow',
    description: 'Multi-stage candidate evaluation from submission to student ID provisioning.',
    targetEntity: 'admission_applications',
    triggerEvent: 'on_application_submit',
    enabled: true,
    stages: [
      {
        stageId: 'reception_review',
        name: 'Front-Desk Eligibility Review',
        assignedRole: 'receptionist',
        order: 1,
        actionRequired: 'review_forward',
        notifyRoles: ['receptionist']
      },
      {
        stageId: 'principal_sanction',
        name: 'Principal Formal Sanction',
        assignedRole: 'principal',
        order: 2,
        actionRequired: 'approve_reject',
        notifyRoles: ['principal']
      },
      {
        stageId: 'account_provisioning',
        name: 'Student & Parent Account Provisioning',
        assignedRole: 'admin',
        order: 3,
        actionRequired: 'provision',
        notifyRoles: ['student', 'parent']
      }
    ]
  },
  faculty_leave: {
    workflowId: 'faculty_leave',
    name: 'Faculty Leave Sanction Workflow',
    description: 'Clinical instructor absence approval with department substitute verification.',
    targetEntity: 'staff_leave_applications',
    triggerEvent: 'on_leave_submit',
    enabled: true,
    stages: [
      {
        stageId: 'principal_authorization',
        name: 'Principal Executive Authorization',
        assignedRole: 'principal',
        order: 1,
        actionRequired: 'approve_reject',
        notifyRoles: ['principal', 'teacher']
      }
    ]
  },
  scholarship_aid: {
    workflowId: 'scholarship_aid',
    name: 'Student Scholarship & Fee Concession',
    description: 'Merit trust evaluation, finance verification, and principal concession sanction.',
    targetEntity: 'scholarship_applications',
    triggerEvent: 'on_scholarship_submit',
    enabled: true,
    stages: [
      {
        stageId: 'accounts_audit',
        name: 'Accounts Fee Verification',
        assignedRole: 'finance_manager',
        order: 1,
        actionRequired: 'verify',
        notifyRoles: ['finance_manager']
      },
      {
        stageId: 'principal_grant',
        name: 'Principal Sanction Grant',
        assignedRole: 'principal',
        order: 2,
        actionRequired: 'approve_reject',
        notifyRoles: ['principal', 'student']
      }
    ]
  }
};

// ============================================================================
// DEFAULT REAL FORMS
// ============================================================================
export const DEFAULT_FORMS: Record<string, FormBuilderConfig> = {
  candidate_admission: {
    formId: 'candidate_admission',
    name: 'Candidate Admission Application Form',
    description: 'Public and receptionist form to intake new paramedical student applications.',
    targetTable: 'admission_applications',
    allowedRoles: ['admin', 'receptionist'],
    fields: [
      { id: 'f1', key: 'applicant_name', label: 'Candidate Full Name', type: 'text', required: true, isSystemRequired: true, order: 1, visible: true },
      { id: 'f2', key: 'email', label: 'Candidate Email Address', type: 'email', required: true, isSystemRequired: true, order: 2, visible: true },
      { id: 'f3', key: 'phone', label: 'Mobile Contact Number', type: 'phone', required: true, isSystemRequired: true, order: 3, visible: true },
      { id: 'f4', key: 'class_name', label: 'Paramedical Program Applied', type: 'select', required: true, isSystemRequired: true, order: 4, visible: true, options: ['B.VOC Medical Lab Technology (MLT)', 'B.VOC Radiology & Medical Imaging', 'B.VOC Dialysis Technology', 'B.VOC Operation Theatre & Anaesthesia', 'B.VOC Cardiac Care Technology', 'B.VOC Optometry & Ophthalmic Technology', 'B.VOC Physician Assistant'] },
      { id: 'f5', key: 'parent_name', label: 'Parent / Guardian Full Name', type: 'text', required: true, isSystemRequired: true, order: 5, visible: true },
      { id: 'f6', key: 'parent_phone', label: 'Parent Mobile Number', type: 'phone', required: true, isSystemRequired: true, order: 6, visible: true },
      { id: 'f7', key: 'previous_school', label: 'Qualifying Institution & Board', type: 'text', required: false, order: 7, visible: true },
      { id: 'f8', key: 'address', label: 'Residential Address', type: 'textarea', required: false, order: 8, visible: true }
    ]
  },
  faculty_leave: {
    formId: 'faculty_leave',
    name: 'Faculty Leave Application Form',
    description: 'Submitted by teaching staff to request casual, medical, or duty leave.',
    targetTable: 'staff_leave_applications',
    allowedRoles: ['teacher'],
    fields: [
      { id: 'l1', key: 'leave_type', label: 'Leave Classification', type: 'select', required: true, isSystemRequired: true, order: 1, visible: true, options: ['Casual Leave', 'Medical Leave', 'On Duty (Clinical Posting)', 'Earned Leave'] },
      { id: 'l2', key: 'start_date', label: 'Commencement Date', type: 'date', required: true, isSystemRequired: true, order: 2, visible: true },
      { id: 'l3', key: 'end_date', label: 'Conclusion Date', type: 'date', required: true, isSystemRequired: true, order: 3, visible: true },
      { id: 'l4', key: 'total_days', label: 'Total Number of Days', type: 'number', required: true, isSystemRequired: true, order: 4, visible: true },
      { id: 'l5', key: 'reason', label: 'Detailed Grounds for Leave', type: 'textarea', required: true, isSystemRequired: true, order: 5, visible: true }
    ]
  }
};

// ============================================================================
// DEFAULT NOTIFICATIONS
// ============================================================================
export const DEFAULT_NOTIFICATIONS: NotificationRuleConfig[] = [
  {
    id: 'notif_new_admission',
    triggerEvent: 'admission_submitted',
    title: 'Candidate Admission Received',
    targetRoles: ['receptionist', 'principal', 'admin'],
    priority: 'Normal',
    templateSubject: 'New Admission Application: {{applicant_name}}',
    templateBody: 'Candidate {{applicant_name}} has submitted an application for {{class_name}}.',
    channels: ['in_app'],
    enabled: true
  },
  {
    id: 'notif_leave_request',
    triggerEvent: 'faculty_leave_submitted',
    title: 'Faculty Leave Application',
    targetRoles: ['principal', 'admin'],
    priority: 'Important',
    templateSubject: 'Leave Sanction Request: {{staff_name}}',
    templateBody: 'Faculty member {{staff_name}} has requested {{total_days}} days of {{leave_type}}.',
    channels: ['in_app'],
    enabled: true
  },
  {
    id: 'notif_shortage_warning',
    triggerEvent: 'attendance_below_threshold',
    title: 'Attendance Shortage Alert (< 75%)',
    targetRoles: ['student', 'parent', 'principal'],
    priority: 'Emergency',
    templateSubject: 'Regulatory Attendance Warning',
    templateBody: 'Attendance has fallen below 75%. Regulatory clearance is at risk.',
    channels: ['in_app', 'broadcast'],
    enabled: true
  }
];

// ============================================================================
// FULL INITIAL MASTER STATE
// ============================================================================
export function buildInitialMasterConfigState(): MasterSystemConfigState {
  // Build initial page configs
  const pages: Record<string, any> = {};
  const dashboards: Record<string, any> = {};
  const navigation: Record<string, any> = {};

  Object.keys(DEFAULT_ROLES_CONFIG).forEach(roleKey => {
    pages[roleKey] = {
      role: roleKey,
      layout: 'grid_dashboard',
      spacing: 'normal',
      sections: [
        { id: 'sec_banner', title: 'Welcome & Institutional Directives', type: 'banner', visible: true, order: 1 },
        { id: 'sec_stats', title: 'Key Performance Indicators', type: 'stats_grid', visible: true, order: 2, columns: 4 },
        { id: 'sec_content', title: 'Operational Workspace', type: 'main_content', visible: true, order: 3 },
        { id: 'sec_notices', title: 'Official Circulars & Calendar', type: 'notices', visible: true, order: 4 }
      ]
    };

    dashboards[roleKey] = {
      role: roleKey,
      columns: 4,
      gap: 'md',
      widgets: (DEFAULT_ROLES_CONFIG[roleKey].visibleWidgets || []).map((wId, idx) => ({
        instanceId: `inst_${roleKey}_${wId}`,
        widgetId: wId,
        colSpan: (wId.startsWith('chart') || wId.startsWith('table') || wId.startsWith('list')) ? 2 : 1,
        order: idx + 1
      }))
    };

    navigation[roleKey] = {
      role: roleKey,
      items: DEFAULT_MODULES
        .filter(m => m.assignedRoles.includes(roleKey))
        .map((m, idx) => ({
          id: m.id,
          label: m.name,
          path: m.routePath,
          iconName: m.iconName,
          order: idx + 1,
          visible: true
        })),
      groups: ['Academic', 'Services', 'Administration']
    };
  });

  return {
    roles: JSON.parse(JSON.stringify(DEFAULT_ROLES_CONFIG)),
    pages: JSON.parse(JSON.stringify(pages)),
    dashboards: JSON.parse(JSON.stringify(dashboards)),
    navigation: JSON.parse(JSON.stringify(navigation)),
    modules: JSON.parse(JSON.stringify(DEFAULT_MODULES)),
    features: JSON.parse(JSON.stringify(DEFAULT_FEATURES)),
    permissions: [],
    forms: JSON.parse(JSON.stringify(DEFAULT_FORMS)),
    workflows: JSON.parse(JSON.stringify(DEFAULT_WORKFLOWS)),
    notifications: JSON.parse(JSON.stringify(DEFAULT_NOTIFICATIONS)),
    globalSettings: JSON.parse(JSON.stringify(DEFAULT_GLOBAL_SETTINGS)),
    theme: JSON.parse(JSON.stringify(DEFAULT_THEME_CONFIG)),
    activeReleaseVersion: 'v1.0.0',
    lastUpdated: new Date().toISOString()
  };
}
