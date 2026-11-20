import { UserRole } from '@/context/AuthContext';

export type SuperAdminConfigType =
  | 'role'
  | 'page'
  | 'dashboard'
  | 'navigation'
  | 'module'
  | 'feature'
  | 'permission'
  | 'form'
  | 'workflow'
  | 'notification'
  | 'global'
  | 'theme';

export interface SuperAdminConfigItem<T = any> {
  id: string;
  config_type: SuperAdminConfigType;
  target_role: string; // 'global' or role identifier
  is_published: boolean;
  version: number;
  data: T;
  checksum?: string;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
}

// 1. Role Customization
export interface RoleCustomConfig {
  role: UserRole;
  label: string;
  description: string;
  home: string;
  category: 'Administration' | 'Academic' | 'Student & Parent' | 'Operations' | 'Finance' | 'Specialized';
  status: 'active' | 'restricted';
  allowedModules: string[];
  allowedRoutes: string[];
  permissions: string[];
  features: string[];
  visibleWidgets: string[];
  isSystemProtected?: boolean; // admin cannot be disabled or deleted
  updatedAt?: string;
}

// 2. Role Page Customization
export interface PageSectionConfig {
  id: string;
  title: string;
  description?: string;
  type: 'banner' | 'stats_grid' | 'main_content' | 'widgets' | 'timeline' | 'shortcuts' | 'notices';
  visible: boolean;
  order: number;
  columns?: 1 | 2 | 3 | 4;
  dataFilter?: string;
}

export interface RolePageConfig {
  role: string;
  layout: 'single' | 'sidebar_split' | 'grid_dashboard' | 'executive';
  spacing: 'compact' | 'normal' | 'relaxed';
  sections: PageSectionConfig[];
  updatedAt?: string;
}

// 3. Dashboard Layout & Widget Placement
export interface WidgetPlacement {
  instanceId: string;
  widgetId: string;
  title?: string;
  colSpan: 1 | 2 | 3 | 4; // grid columns out of 4
  rowSpan?: number;
  displayFormat?: 'card' | 'bar' | 'line' | 'table' | 'list' | 'gauge';
  order: number;
  customOptions?: Record<string, any>;
}

export interface DashboardLayoutConfig {
  role: string;
  columns: number; // default 4
  gap: 'sm' | 'md' | 'lg';
  widgets: WidgetPlacement[];
  updatedAt?: string;
}

// 4. Widget Definition in Catalog
export interface WidgetDefinition {
  id: string;
  title: string;
  description: string;
  category: 'kpi' | 'chart' | 'table' | 'list' | 'action';
  supportedRoles: string[]; // empty means all
  requiredPermissions?: string[];
  dataQueryKey: string;
  defaultColSpan: 1 | 2 | 3 | 4;
  supportedFormats: ('card' | 'bar' | 'line' | 'table' | 'list' | 'gauge')[];
  iconName: string;
  status: 'active' | 'deprecated';
}

// 5. Navigation Configuration
export interface NavItemConfig {
  id: string;
  label: string;
  path: string;
  iconName: string;
  badge?: string;
  group?: string;
  order: number;
  visible: boolean;
  requiredPermission?: string;
}

export interface RoleNavigationConfig {
  role: string;
  items: NavItemConfig[];
  groups: string[];
  updatedAt?: string;
}

// 6. Module Management
export interface ModuleDefinition {
  id: string;
  name: string;
  description: string;
  category: 'Core' | 'Academic' | 'Student Services' | 'Administration' | 'Operations' | 'Finance';
  iconName: string;
  enabled: boolean;
  assignedRoles: string[];
  dependencies: string[];
  routePath: string;
  isSystemCore?: boolean;
}

// 7. Feature Management
export interface FeatureDefinition {
  id: string;
  name: string;
  description: string;
  moduleId: string;
  enabled: boolean;
  assignedRoles: string[];
  actionKey: string;
  requiresAdminSanction?: boolean;
}

// 8. Permission Management
export interface PermissionRule {
  role: string;
  resource: string; // e.g. 'students', 'faculty', 'attendance', 'finance', 'certificates', 'system_config'
  actions: ('view' | 'create' | 'edit' | 'delete' | 'approve' | 'export' | 'manage')[];
  scope: 'all' | 'department' | 'own';
}

// 9. Form Builder Configuration
export interface FormFieldConfig {
  id: string;
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'time' | 'select' | 'checkbox' | 'email' | 'phone';
  placeholder?: string;
  required: boolean;
  isSystemRequired?: boolean;
  options?: string[]; // for select/dropdown
  order: number;
  visible: boolean;
  helpText?: string;
}

export interface FormBuilderConfig {
  formId: string;
  name: string;
  description: string;
  targetTable: string;
  allowedRoles: string[];
  fields: FormFieldConfig[];
  updatedAt?: string;
}

// 10. Workflow Configuration
export interface WorkflowStageConfig {
  stageId: string;
  name: string;
  assignedRole: string;
  order: number;
  actionRequired: 'approve_reject' | 'review_forward' | 'verify' | 'provision';
  notifyRoles: string[];
}

export interface WorkflowBuilderConfig {
  workflowId: string;
  name: string;
  description: string;
  targetEntity: string;
  triggerEvent: string;
  stages: WorkflowStageConfig[];
  enabled: boolean;
  updatedAt?: string;
}

// 11. Notification Configuration
export interface NotificationRuleConfig {
  id: string;
  triggerEvent: string;
  title: string;
  targetRoles: string[];
  priority: 'Normal' | 'Important' | 'Emergency';
  templateSubject: string;
  templateBody: string;
  channels: ('in_app' | 'email' | 'broadcast')[];
  enabled: boolean;
}

// 12. Global Institutional Settings
export interface GlobalSettingsConfig {
  institutionName: string;
  institutionCode: string;
  academicYear: string;
  currentSemester: string;
  contactEmail: string;
  contactPhone: string;
  campusAddress: string;
  attendancePolicyThreshold: number; // e.g. 75
  passingMarksThreshold: number; // e.g. 40
  currencyCode: string; // e.g. 'INR'
  currencySymbol: string; // e.g. '₹'
  timezone: string; // e.g. 'Asia/Kolkata'
  dateFormat: string; // e.g. 'DD/MM/YYYY'
  maintenanceMode: boolean;
  enableRealtime: boolean;
}

// 13. Theme & Branding Configuration
export interface ThemeBrandingConfig {
  colorPalette: 'blue' | 'indigo' | 'emerald' | 'violet' | 'rose' | 'slate';
  logoUrl?: string;
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  layoutDensity: 'compact' | 'normal' | 'comfortable';
  sidebarStyle: 'light' | 'dark' | 'glass';
  fontScale: 'sm' | 'md' | 'lg';
}

// 14. Configuration Releases / Versions
export interface ConfigurationRelease {
  id: string;
  release_version: string;
  version_number: number;
  title: string;
  change_summary: string;
  author_id?: string;
  author_email: string;
  snapshot: {
    roles: RoleCustomConfig[];
    modules: ModuleDefinition[];
    features: FeatureDefinition[];
    globalSettings: GlobalSettingsConfig;
    theme: ThemeBrandingConfig;
    publishedAt: string;
  };
  is_active: boolean;
  created_at: string;
}

// 15. Audit Log Entry
export interface AuditLogItem {
  id: string;
  user_id?: string;
  user_email: string;
  user_role: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  created_at: string;
}

// 16. Full Master System Configuration State
export interface MasterSystemConfigState {
  roles: Record<string, RoleCustomConfig>;
  pages: Record<string, RolePageConfig>;
  dashboards: Record<string, DashboardLayoutConfig>;
  navigation: Record<string, RoleNavigationConfig>;
  modules: ModuleDefinition[];
  features: FeatureDefinition[];
  permissions: PermissionRule[];
  forms: Record<string, FormBuilderConfig>;
  workflows: Record<string, WorkflowBuilderConfig>;
  notifications: NotificationRuleConfig[];
  globalSettings: GlobalSettingsConfig;
  theme: ThemeBrandingConfig;
  activeReleaseVersion?: string;
  lastUpdated?: string;
}
