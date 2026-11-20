import { UserRole } from '@/context/AuthContext';
import { 
  DashboardLayoutConfig, 
  RolePageConfig, 
  RoleNavigationConfig, 
  ModuleDefinition, 
  FeatureDefinition,
  FormBuilderConfig
} from './superAdmin.types';

export type CrudAction = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'reject' | 'export' | 'import';
export type DataScope = 'all_college' | 'assigned_only' | 'own_department' | 'own_records';

export interface RoleCapability {
  id: string; // e.g. 'teacher.attendance.mark'
  name: string;
  description: string;
  module: string; // e.g. 'attendance'
  backendAction: string; // e.g. 'record_attendance'
  category: 'Academic Operations' | 'Data Management' | 'Financial Transactions' | 'Administrative Governance' | 'Compliance & Documents';
  defaultDataScope: DataScope;
  requiredPermission: string;
  supportedCrud: CrudAction[];
  businessRuleKeys: string[];
  isSystemCore?: boolean;
}

export interface RoleDataAccessScope {
  studentsScope: 'all' | 'assigned_only' | 'department_only' | 'none';
  facultyScope: 'all' | 'department_only' | 'none';
  financeScope: 'all' | 'summary_only' | 'none';
  academicsScope: 'all' | 'assigned_only' | 'department_only' | 'none';
  allowSensitiveExport: boolean;
}

export interface RoleCrudRule {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  approve: boolean;
  export: boolean;
}

export interface RoleBusinessRules {
  assignedClassesAttendanceOnly: boolean;
  assignedSubjectsMarksOnly: boolean;
  marksSubmissionDeadlineDays: number;
  restrictFinanceAccess: boolean;
  allowFeeCollection: boolean;
  allowReceiptGeneration: boolean;
  allowDiscountApproval: boolean;
  allowStudentProvisioning: boolean;
  allowLeaveApproval: boolean;
  allowCertificateGeneration: boolean;
  [customKey: string]: any;
}

export interface WorkflowStageParticipation {
  canInitiate: boolean;
  canSubmit: boolean;
  canApprove: boolean;
  canReject: boolean;
  canForward: boolean;
  canComplete: boolean;
  canCancel: boolean;
}

export interface RoleCustomizationState {
  role: string;
  collegeId: string;
  label: string;
  description: string;
  category: string;
  status: 'active' | 'suspended';
  enabledModules: string[];
  enabledFeatures: string[];
  enabledCapabilities: string[]; // List of capability IDs enabled
  backendActions: Record<string, boolean>; // e.g. { 'record_attendance': true, 'create_assignment': false }
  dataAccess: RoleDataAccessScope;
  crud: Record<string, RoleCrudRule>; // entity -> CrudRule
  businessRules: RoleBusinessRules;
  workflowParticipation: Record<string, WorkflowStageParticipation>; // workflowId -> Participation
  dashboard: DashboardLayoutConfig;
  navigation: RoleNavigationConfig;
  pageConfig: RolePageConfig;
  formRules: Record<string, { hiddenFields: string[]; requiredFields: string[]; readOnlyFields: string[] }>;
  version: string;
  isPublished: boolean;
  updatedAt: string;
}

export interface RoleValidationIssue {
  type: 'error' | 'warning' | 'security';
  title: string;
  description: string;
  tabKey: string;
}
