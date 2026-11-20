import { MasterSystemConfigState, RoleCustomConfig, ModuleDefinition, FeatureDefinition, PermissionRule } from './superAdmin.types';

export type CollegeStatus = 'active' | 'inactive' | 'suspended' | 'archived';
export type InstitutionType = 'Paramedical' | 'Medical' | 'Engineering' | 'Arts & Science' | 'Multi-Disciplinary';

export interface AcademicStructureConfig {
  programs: string[];
  academicYears: string[];
  semesterStructure: string;
  departments: string[];
  courseDurations?: Record<string, string>;
}

export interface CollegeBrandingConfig {
  palette: 'blue' | 'indigo' | 'emerald' | 'violet' | 'rose' | 'slate';
  primaryColor: string;
  logoUrl?: string;
  fontScale?: 'sm' | 'md' | 'lg';
  layoutDensity?: 'compact' | 'normal' | 'comfortable';
}

export interface College {
  id: string;
  name: string;
  code: string;
  logo_url?: string;
  status: CollegeStatus;
  institution_type: InstitutionType;
  contact_email: string;
  contact_phone?: string;
  address?: string;
  website?: string;
  academic_config: AcademicStructureConfig;
  branding_config: CollegeBrandingConfig;
  admin_user_id?: string;
  admin_email?: string;
  current_version: string;
  created_at: string;
  updated_at?: string;
}

export interface CollegeMembership {
  id: string;
  college_id: string;
  user_id: string;
  role: string;
  status: 'active' | 'suspended' | 'revoked';
  is_primary: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CollegeTemplate {
  id: string;
  template_name: string;
  description: string;
  institution_type: InstitutionType;
  roles: Partial<RoleCustomConfig>[];
  modules: Partial<ModuleDefinition>[];
  features: Partial<FeatureDefinition>[];
  permissions: Partial<PermissionRule>[];
  navigation?: Record<string, any>;
  dashboards?: Record<string, any>;
  forms?: Record<string, any>;
  workflows?: Record<string, any>;
  settings?: Record<string, any>;
  is_builtin: boolean;
  created_at?: string;
}

export interface PlatformAuditLog {
  id: string;
  super_admin_email: string;
  super_admin_id?: string;
  college_id?: string;
  college_code?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  created_at: string;
}

export interface CollegeProvisioningPayload {
  name: string;
  code: string;
  institution_type: InstitutionType;
  contact_email: string;
  contact_phone?: string;
  address?: string;
  website?: string;
  logo_url?: string;
  academic_config: AcademicStructureConfig;
  admin_account: {
    name: string;
    email: string;
    password?: string;
  };
  template_name?: string;
  selected_modules?: string[];
  selected_roles?: string[];
  branding?: CollegeBrandingConfig;
}

export interface CollegeConfigurationRecord {
  id: string;
  college_id: string;
  config_type: string;
  target_role: string;
  is_published: boolean;
  version: number;
  data: any;
  updated_by?: string;
  updated_at: string;
}
