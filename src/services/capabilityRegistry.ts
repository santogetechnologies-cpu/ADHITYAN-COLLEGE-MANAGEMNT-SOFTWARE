import { 
  RoleCapability, 
  RoleCustomizationState, 
  RoleDataAccessScope, 
  RoleCrudRule, 
  RoleBusinessRules,
  WorkflowStageParticipation
} from '../types/roleCustomization.types';
import { 
  DashboardLayoutConfig, 
  RolePageConfig, 
  RoleNavigationConfig, 
  ModuleDefinition 
} from '../types/superAdmin.types';
import { 
  DEFAULT_ROLES_CONFIG, 
  DEFAULT_MODULES, 
  buildInitialMasterConfigState 
} from './superAdminDefaults';

export const CAPABILITY_REGISTRY: RoleCapability[] = [
  // 1. Attendance Module Capabilities
  {
    id: 'teacher.attendance.mark',
    name: 'Record Class Attendance',
    description: 'Mark daily attendance, clinical roll-calls, and lecture participation.',
    module: 'attendance',
    backendAction: 'record_attendance',
    category: 'Academic Operations',
    defaultDataScope: 'assigned_only',
    requiredPermission: 'attendance:write',
    supportedCrud: ['create', 'edit', 'view'],
    businessRuleKeys: ['assignedClassesAttendanceOnly']
  },
  {
    id: 'teacher.attendance.view',
    name: 'View Attendance Records',
    description: 'Inspect class attendance history and telemetry.',
    module: 'attendance',
    backendAction: 'get_student_attendance_summary',
    category: 'Academic Operations',
    defaultDataScope: 'assigned_only',
    requiredPermission: 'attendance:read',
    supportedCrud: ['view', 'export'],
    businessRuleKeys: ['assignedClassesAttendanceOnly']
  },

  // 2. Academics & Assignments
  {
    id: 'teacher.assignments.create',
    name: 'Create & Distribute Assignments',
    description: 'Publish assignments, practical clinical exercises, and homework to students.',
    module: 'academics',
    backendAction: 'create_assignment',
    category: 'Academic Operations',
    defaultDataScope: 'assigned_only',
    requiredPermission: 'assignments:write',
    supportedCrud: ['create', 'edit', 'delete', 'view'],
    businessRuleKeys: ['assignedClassesAttendanceOnly']
  },
  {
    id: 'teacher.marks.enter',
    name: 'Submit Examination & Clinical Marks',
    description: 'Enter internal marks, viva scores, and semester grade sheets.',
    module: 'examinations',
    backendAction: 'submit_marks',
    category: 'Academic Operations',
    defaultDataScope: 'assigned_only',
    requiredPermission: 'examinations:write',
    supportedCrud: ['create', 'edit', 'view'],
    businessRuleKeys: ['assignedSubjectsMarksOnly', 'marksSubmissionDeadlineDays']
  },
  {
    id: 'teacher.lessons.update',
    name: 'Post Daily Lesson Updates',
    description: 'Log syllabus progression, unit coverage, and notes for student portals.',
    module: 'academics',
    backendAction: 'create_daily_teaching_update',
    category: 'Academic Operations',
    defaultDataScope: 'assigned_only',
    requiredPermission: 'academics:write',
    supportedCrud: ['create', 'view'],
    businessRuleKeys: ['assignedClassesAttendanceOnly']
  },
  {
    id: 'student.assignments.submit',
    name: 'Submit Assignment Solutions',
    description: 'Upload coursework attachments and practical solutions for teacher grading.',
    module: 'academics',
    backendAction: 'submit_assignment',
    category: 'Academic Operations',
    defaultDataScope: 'own_records',
    requiredPermission: 'assignments:submit',
    supportedCrud: ['create', 'view'],
    businessRuleKeys: []
  },

  // 3. Admissions & Student Directory
  {
    id: 'receptionist.admissions.create',
    name: 'Register Admission Application',
    description: 'Intake new prospective student applications, merit data, and personal details.',
    module: 'admissions',
    backendAction: 'create_admission_application',
    category: 'Data Management',
    defaultDataScope: 'all_college',
    requiredPermission: 'admissions:write',
    supportedCrud: ['create', 'edit', 'view'],
    businessRuleKeys: []
  },
  {
    id: 'receptionist.admissions.verify_docs',
    name: 'Verify Admission Credentials',
    description: 'Inspect certificates, mark sheets, and transfer documents during admission scrutiny.',
    module: 'admissions',
    backendAction: 'verify_admission_documents',
    category: 'Data Management',
    defaultDataScope: 'all_college',
    requiredPermission: 'admissions:verify',
    supportedCrud: ['edit', 'approve', 'view'],
    businessRuleKeys: []
  },
  {
    id: 'admin.admissions.provision_student',
    name: 'Provision Student ERP Account',
    description: 'Allocate permanent STU-ID, generate initial login, and enroll in target class.',
    module: 'admissions',
    backendAction: 'provision_student_account',
    category: 'Administrative Governance',
    defaultDataScope: 'all_college',
    requiredPermission: 'users:manage',
    supportedCrud: ['create', 'approve', 'view'],
    businessRuleKeys: ['allowStudentProvisioning']
  },
  {
    id: 'admin.parents.link',
    name: 'Link Guardian to Student',
    description: 'Bind parent user account to enrolled student record for parent portal access.',
    module: 'admissions',
    backendAction: 'link_parent_student',
    category: 'Administrative Governance',
    defaultDataScope: 'all_college',
    requiredPermission: 'users:manage',
    supportedCrud: ['create', 'edit', 'delete', 'view'],
    businessRuleKeys: []
  },

  // 4. Finance & Payments
  {
    id: 'finance.payments.collect',
    name: 'Collect Student Fee Payments',
    description: 'Record tuition fee receipts, online transfers, cash tokens, and challans.',
    module: 'finance',
    backendAction: 'collect_fee_payment',
    category: 'Financial Transactions',
    defaultDataScope: 'all_college',
    requiredPermission: 'finance:write',
    supportedCrud: ['create', 'view'],
    businessRuleKeys: ['allowFeeCollection', 'restrictFinanceAccess']
  },
  {
    id: 'finance.receipts.generate',
    name: 'Issue Official Fee Receipts',
    description: 'Generate numbered institutional receipts with GSTIN and seal.',
    module: 'finance',
    backendAction: 'generate_fee_receipt',
    category: 'Financial Transactions',
    defaultDataScope: 'all_college',
    requiredPermission: 'finance:read',
    supportedCrud: ['view', 'export'],
    businessRuleKeys: ['allowReceiptGeneration']
  },
  {
    id: 'finance.discounts.approve',
    name: 'Sanction Fee Concessions',
    description: 'Approve merit, management, or sports scholarships and fee waivers.',
    module: 'finance',
    backendAction: 'approve_fee_concession',
    category: 'Financial Transactions',
    defaultDataScope: 'all_college',
    requiredPermission: 'finance:approve',
    supportedCrud: ['approve', 'reject', 'view'],
    businessRuleKeys: ['allowDiscountApproval']
  },

  // 5. Faculty Class Allocations & User Governance
  {
    id: 'admin.teachers.assign_class',
    name: 'Assign Faculty to Classes',
    description: 'Map professor to specific course, academic year, semester, and section.',
    module: 'faculty',
    backendAction: 'assign_teacher_to_class',
    category: 'Administrative Governance',
    defaultDataScope: 'all_college',
    requiredPermission: 'faculty:manage',
    supportedCrud: ['create', 'edit', 'delete', 'view'],
    businessRuleKeys: []
  },
  {
    id: 'admin.users.manage',
    name: 'Manage User Accounts & Passwords',
    description: 'Create, update, toggle status, and reset passwords for college staff.',
    module: 'faculty',
    backendAction: 'set_active_status',
    category: 'Administrative Governance',
    defaultDataScope: 'all_college',
    requiredPermission: 'users:manage',
    supportedCrud: ['create', 'edit', 'delete', 'view'],
    businessRuleKeys: []
  },

  // 6. Certificates & Documents
  {
    id: 'admin.certificates.generate',
    name: 'Generate Institutional Certificates',
    description: 'Issue bonafide certificates, NOCs, course completion, and conduct letters.',
    module: 'certificates',
    backendAction: 'generate_certificate',
    category: 'Compliance & Documents',
    defaultDataScope: 'all_college',
    requiredPermission: 'certificates:write',
    supportedCrud: ['create', 'view', 'export'],
    businessRuleKeys: ['allowCertificateGeneration']
  },
  {
    id: 'principal.certificates.approve',
    name: 'Executive Certificate Approval',
    description: 'Authorize high-stakes official documents, university migration, and transcripts.',
    module: 'certificates',
    backendAction: 'approve_certificate',
    category: 'Compliance & Documents',
    defaultDataScope: 'all_college',
    requiredPermission: 'certificates:approve',
    supportedCrud: ['approve', 'reject', 'view'],
    businessRuleKeys: []
  },

  // 7. NAAC Accreditation & Evidence
  {
    id: 'naac.criteria.update',
    name: 'Update NAAC SSR Criteria',
    description: 'Enter quantitative metric responses and criterion benchmarks.',
    module: 'naac',
    backendAction: 'update_naac_metric',
    category: 'Compliance & Documents',
    defaultDataScope: 'all_college',
    requiredPermission: 'naac:write',
    supportedCrud: ['edit', 'view'],
    businessRuleKeys: []
  },
  {
    id: 'naac.repository.upload',
    name: 'Upload Compliance Documents',
    description: 'Store audited statements, syllabus copies, and feedback evidence in NAAC repository.',
    module: 'naac',
    backendAction: 'upload_naac_evidence',
    category: 'Compliance & Documents',
    defaultDataScope: 'all_college',
    requiredPermission: 'naac:write',
    supportedCrud: ['create', 'view', 'delete'],
    businessRuleKeys: []
  },

  // 8. Disciplinary Council
  {
    id: 'disciplinary.incidents.report',
    name: 'Report Student Misconduct Incident',
    description: 'File disciplinary citation regarding code of conduct, dress code, or attendance breach.',
    module: 'disciplinary',
    backendAction: 'report_disciplinary_incident',
    category: 'Administrative Governance',
    defaultDataScope: 'all_college',
    requiredPermission: 'disciplinary:write',
    supportedCrud: ['create', 'view'],
    businessRuleKeys: []
  },
  {
    id: 'principal.disciplinary.resolve',
    name: 'Resolve Disciplinary Hearing',
    description: 'Adjudicate committee findings, issue warnings, suspension, or counseling mandate.',
    module: 'disciplinary',
    backendAction: 'resolve_disciplinary_case',
    category: 'Administrative Governance',
    defaultDataScope: 'all_college',
    requiredPermission: 'disciplinary:resolve',
    supportedCrud: ['edit', 'approve', 'view'],
    businessRuleKeys: []
  },

  // 9. Infirmary & Medical Center
  {
    id: 'medical.records.create',
    name: 'Record Clinical Health Visit',
    description: 'Log campus clinic consultations, vitals, first aid, and hospital referrals.',
    module: 'medical',
    backendAction: 'create_medical_record',
    category: 'Data Management',
    defaultDataScope: 'all_college',
    requiredPermission: 'medical:write',
    supportedCrud: ['create', 'edit', 'view'],
    businessRuleKeys: []
  },

  // 10. Official Circulars & Broadcasts
  {
    id: 'admin.broadcasts.send',
    name: 'Disseminate Official Circulars',
    description: 'Broadcast alerts and circulars to students, faculty, and guardians simultaneously.',
    module: 'broadcasts',
    backendAction: 'send_institutional_broadcast',
    category: 'Administrative Governance',
    defaultDataScope: 'all_college',
    requiredPermission: 'broadcasts:send',
    supportedCrud: ['create', 'view'],
    businessRuleKeys: []
  }
];

export const DEFAULT_CRUD_ENTITIES = [
  'Students',
  'Faculty Directory',
  'Academics & Timetables',
  'Attendance Logs',
  'Examinations & Marks',
  'Fees & Collections',
  'Admissions',
  'Certificates',
  'Medical Health Records',
  'Disciplinary Cases',
  'NAAC Repository',
  'Hostel & Rooms',
  'Transport Logistics'
];

export function getDefaultCapabilitiesForRole(roleKey: string): string[] {
  switch (roleKey) {
    case 'admin':
    case 'platform_super_admin':
      return CAPABILITY_REGISTRY.map(c => c.id);

    case 'principal':
      return [
        'teacher.attendance.view',
        'teacher.marks.enter',
        'principal.certificates.approve',
        'principal.disciplinary.resolve',
        'naac.criteria.update',
        'naac.repository.upload',
        'finance.receipts.generate',
        'medical.records.create',
        'admin.broadcasts.send'
      ];

    case 'teacher':
    case 'faculty':
    case 'hod':
      return [
        'teacher.attendance.mark',
        'teacher.attendance.view',
        'teacher.assignments.create',
        'teacher.marks.enter',
        'teacher.lessons.update',
        'disciplinary.incidents.report'
      ];

    case 'student':
      return [
        'student.assignments.submit'
      ];

    case 'finance_manager':
      return [
        'finance.payments.collect',
        'finance.receipts.generate',
        'finance.discounts.approve'
      ];

    case 'receptionist':
      return [
        'receptionist.admissions.create',
        'receptionist.admissions.verify_docs',
        'admin.parents.link'
      ];

    default:
      return [];
  }
}

export function buildDefaultRoleCustomization(
  collegeId: string,
  roleKey: string
): RoleCustomizationState {
  const masterDefaults = buildInitialMasterConfigState();
  const baseRole = masterDefaults.roles[roleKey] || {
    role: roleKey as any,
    label: roleKey.charAt(0).toUpperCase() + roleKey.slice(1),
    category: 'Academic',
    description: `Configured institutional role for ${roleKey}.`,
    status: 'active',
    allowedModules: ['students', 'academics', 'attendance'],
    visibleWidgets: ['widget_student_stats', 'widget_attendance_chart'],
    isSystemProtected: roleKey === 'admin'
  };

  const enabledCapIds = getDefaultCapabilitiesForRole(roleKey);
  const backendActions: Record<string, boolean> = {};

  // Build backend actions map: true if capability is in enabled list, false otherwise
  CAPABILITY_REGISTRY.forEach(cap => {
    backendActions[cap.backendAction] = enabledCapIds.includes(cap.id);
  });

  // Default CRUD rules
  const crud: Record<string, RoleCrudRule> = {};
  DEFAULT_CRUD_ENTITIES.forEach(entity => {
    const isTeacher = roleKey === 'teacher' || roleKey === 'hod';
    const isFinance = roleKey === 'finance_manager';
    const isAdmin = roleKey === 'admin' || roleKey === 'platform_super_admin';
    const isPrincipal = roleKey === 'principal';

    if (isAdmin) {
      crud[entity] = { view: true, create: true, edit: true, delete: true, approve: true, export: true };
    } else if (isPrincipal) {
      crud[entity] = { view: true, create: false, edit: true, delete: false, approve: true, export: true };
    } else if (isTeacher) {
      const isAcademic = entity.includes('Academic') || entity.includes('Attendance') || entity.includes('Examination');
      crud[entity] = { 
        view: true, 
        create: isAcademic, 
        edit: isAcademic, 
        delete: false, 
        approve: false, 
        export: isAcademic 
      };
    } else if (isFinance) {
      const isFee = entity.includes('Fee');
      crud[entity] = { view: isFee, create: isFee, edit: isFee, delete: false, approve: isFee, export: isFee };
    } else {
      crud[entity] = { view: true, create: false, edit: false, delete: false, approve: false, export: false };
    }
  });

  // Default Data Access Scope
  const dataAccess: RoleDataAccessScope = {
    studentsScope: (roleKey === 'teacher' || roleKey === 'hod') ? 'assigned_only' : 'all',
    facultyScope: (roleKey === 'teacher' || roleKey === 'student') ? 'department_only' : 'all',
    financeScope: (roleKey === 'finance_manager' || roleKey === 'admin') ? 'all' : (roleKey === 'principal' ? 'summary_only' : 'none'),
    academicsScope: (roleKey === 'teacher' || roleKey === 'hod') ? 'assigned_only' : 'all',
    allowSensitiveExport: roleKey === 'admin' || roleKey === 'principal'
  };

  // Default Business Rules
  const businessRules: RoleBusinessRules = {
    assignedClassesAttendanceOnly: roleKey === 'teacher' || roleKey === 'hod',
    assignedSubjectsMarksOnly: roleKey === 'teacher' || roleKey === 'hod',
    marksSubmissionDeadlineDays: 14,
    restrictFinanceAccess: roleKey === 'teacher' || roleKey === 'student',
    allowFeeCollection: roleKey === 'finance_manager' || roleKey === 'admin',
    allowReceiptGeneration: roleKey === 'finance_manager' || roleKey === 'admin',
    allowDiscountApproval: roleKey === 'principal' || roleKey === 'admin',
    allowStudentProvisioning: roleKey === 'admin',
    allowLeaveApproval: roleKey === 'principal' || roleKey === 'hod' || roleKey === 'admin',
    allowCertificateGeneration: roleKey === 'admin' || roleKey === 'principal'
  };

  // Default Workflow Participation
  const workflowParticipation: Record<string, WorkflowStageParticipation> = {
    wf_student_leave: {
      canInitiate: roleKey === 'student',
      canSubmit: roleKey === 'student',
      canApprove: roleKey === 'teacher' || roleKey === 'principal',
      canReject: roleKey === 'teacher' || roleKey === 'principal',
      canForward: roleKey === 'teacher',
      canComplete: roleKey === 'principal',
      canCancel: roleKey === 'student'
    },
    wf_fee_concession: {
      canInitiate: roleKey === 'receptionist' || roleKey === 'finance_manager',
      canSubmit: roleKey === 'finance_manager',
      canApprove: roleKey === 'principal' || roleKey === 'admin',
      canReject: roleKey === 'principal' || roleKey === 'admin',
      canForward: roleKey === 'finance_manager',
      canComplete: roleKey === 'admin',
      canCancel: roleKey === 'finance_manager'
    },
    wf_admission_approval: {
      canInitiate: roleKey === 'receptionist',
      canSubmit: roleKey === 'receptionist',
      canApprove: roleKey === 'principal' || roleKey === 'admin',
      canReject: roleKey === 'principal' || roleKey === 'admin',
      canForward: roleKey === 'receptionist',
      canComplete: roleKey === 'admin',
      canCancel: roleKey === 'receptionist'
    }
  };

  return {
    role: roleKey,
    collegeId,
    label: baseRole.label,
    description: baseRole.description,
    category: baseRole.category,
    status: baseRole.status || 'active',
    enabledModules: baseRole.allowedModules || ['students', 'academics', 'attendance'],
    enabledFeatures: ['feat_attendance_marking', 'feat_assignment_creation'],
    enabledCapabilities: enabledCapIds,
    backendActions,
    dataAccess,
    crud,
    businessRules,
    workflowParticipation,
    dashboard: masterDefaults.dashboards[roleKey] || {
      role: roleKey as any,
      columns: 4,
      gap: 'md',
      widgets: []
    },
    navigation: masterDefaults.navigation[roleKey] || {
      role: roleKey as any,
      items: [],
      groups: ['Academic', 'Services', 'Administration']
    },
    pageConfig: masterDefaults.pages[roleKey] || {
      role: roleKey as any,
      layout: 'grid_dashboard',
      spacing: 'normal',
      sections: []
    },
    formRules: {
      student_profile: {
        hiddenFields: roleKey === 'student' ? ['internalRemarks', 'feeDueDetails'] : [],
        requiredFields: ['name', 'registerNumber', 'email'],
        readOnlyFields: roleKey === 'student' ? ['registerNumber', 'classId', 'status'] : []
      }
    },
    version: 'v1.0.0',
    isPublished: true,
    updatedAt: new Date().toISOString()
  };
}
