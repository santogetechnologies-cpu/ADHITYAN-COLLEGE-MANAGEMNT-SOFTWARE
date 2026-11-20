import { supabase } from '../lib/supabase';
import { 
  College, 
  CollegeStatus, 
  CollegeTemplate, 
  PlatformAuditLog, 
  CollegeProvisioningPayload,
  CollegeMembership
} from '../types/multiCollege.types';
import { MasterSystemConfigState, ModuleDefinition } from '../types/superAdmin.types';
import { buildInitialMasterConfigState } from './superAdminDefaults';
import { RoleCustomizationState, RoleValidationIssue } from '../types/roleCustomization.types';
import { buildDefaultRoleCustomization, CAPABILITY_REGISTRY } from './capabilityRegistry';

const COLLEGES_LOCAL_KEY = 'adhityan_platform_colleges_v1';
const COLLEGE_CONFIG_PREFIX = 'adhityan_college_cfg_';
const PLATFORM_AUDIT_LOCAL_KEY = 'adhityan_platform_audit_logs_v1';

// Initial Seed College: Adithyan College of Allied Health Sciences (Primary Baseline)
export const DEFAULT_PRIMARY_COLLEGE: College = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Adithyan College of Allied Health Sciences',
  code: 'ADH-COLLEGE',
  logo_url: '/lovable-uploads/8ea95178-bb37-43e2-ae4d-595e31707954.png',
  status: 'active',
  institution_type: 'Paramedical',
  contact_email: 'admin@adithyan.edu.in',
  contact_phone: '+91 (044) 2876-4100',
  address: 'Adithyan Nagar, Coimbatore, Tamil Nadu, India',
  website: 'https://adithyan.edu.in',
  academic_config: {
    programs: ['B.Sc Allied Health', 'B.VOC Healthcare', 'Diploma Allied Health'],
    academicYears: ['2024-2025', '2025-2026', '2026-2027'],
    semesterStructure: 'Semester (1 to 8)',
    departments: [
      'Cardiac Technology',
      'Dialysis Technology',
      'Radiology & Imaging Technology',
      'Operation Theatre & Anaesthesia Technology',
      'Medical Laboratory Technology',
      'Physician Assistant',
      'Critical Care Technology'
    ]
  },
  branding_config: {
    palette: 'blue',
    primaryColor: '#1e40af',
    fontScale: 'md',
    layoutDensity: 'normal'
  },
  admin_email: 'admin@gmail.com',
  current_version: 'v1.0.0',
  created_at: '2026-01-01T00:00:00.000Z'
};

export const BUILTIN_TEMPLATES: CollegeTemplate[] = [
  {
    id: 'tmpl_paramedical',
    template_name: 'Default Paramedical ERP Template',
    description: 'Comprehensive institutional suite for Paramedical & Allied Health colleges including clinical schedules, biometric attendance, and NAAC workflows.',
    institution_type: 'Paramedical',
    roles: [
      { role: 'admin' as any, label: 'College Administrator', category: 'Administration', status: 'active', isSystemProtected: true },
      { role: 'principal' as any, label: 'Principal', category: 'Administration', status: 'active' },
      { role: 'teacher' as any, label: 'Faculty & Instructor', category: 'Academic', status: 'active' },
      { role: 'student' as any, label: 'Enrolled Student', category: 'Student & Parent', status: 'active' },
      { role: 'parent' as any, label: 'Parent / Guardian', category: 'Student & Parent', status: 'active' },
      { role: 'finance_manager' as any, label: 'Finance Manager', category: 'Finance', status: 'active' },
      { role: 'store_manager' as any, label: 'Store Keeper', category: 'Operations', status: 'active' },
      { role: 'transport_driver' as any, label: 'Transport Driver', category: 'Operations', status: 'active' },
      { role: 'receptionist' as any, label: 'Front Desk Receptionist', category: 'Operations', status: 'active' }
    ],
    modules: [
      { id: 'students', name: 'Student Management', enabled: true },
      { id: 'faculty', name: 'Faculty & Staff Directory', enabled: true },
      { id: 'academics', name: 'Academics & Timetables', enabled: true },
      { id: 'attendance', name: 'Biometric & Class Attendance', enabled: true },
      { id: 'examinations', name: 'Exam Cell & Gradebook', enabled: true },
      { id: 'finance', name: 'Fee Collection & Accounts', enabled: true },
      { id: 'admissions', name: 'Admissions & Verification', enabled: true },
      { id: 'certificates', name: 'Bonafide & Document Generation', enabled: true },
      { id: 'medical', name: 'Infirmary & Clinical Health', enabled: true },
      { id: 'naac', name: 'NAAC Accreditation System', enabled: true },
      { id: 'transport', name: 'Fleet & Bus Tracking', enabled: true },
      { id: 'store', name: 'Inventory & Uniform Store', enabled: true }
    ],
    features: [
      { id: 'student_admission_provisioning', enabled: true },
      { id: 'fee_receipt_pdf_export', enabled: true },
      { id: 'hall_ticket_download', enabled: true },
      { id: 'parent_telemetry_access', enabled: true },
      { id: 'naac_repository_evidence', enabled: true }
    ],
    permissions: [],
    is_builtin: true
  },
  {
    id: 'tmpl_minimal',
    template_name: 'Minimal College Template',
    description: 'Lightweight essentials containing only student directory, faculty registry, attendance, and fee tracking.',
    institution_type: 'Paramedical',
    roles: [
      { role: 'admin' as any, label: 'College Administrator', category: 'Administration', status: 'active', isSystemProtected: true },
      { role: 'teacher' as any, label: 'Teacher', category: 'Academic', status: 'active' },
      { role: 'student' as any, label: 'Student', category: 'Student & Parent', status: 'active' },
      { role: 'parent' as any, label: 'Parent', category: 'Student & Parent', status: 'active' },
      { role: 'finance_manager' as any, label: 'Finance Officer', category: 'Finance', status: 'active' }
    ],
    modules: [
      { id: 'students', name: 'Student Management', enabled: true },
      { id: 'faculty', name: 'Faculty Directory', enabled: true },
      { id: 'academics', name: 'Academics', enabled: true },
      { id: 'attendance', name: 'Attendance', enabled: true },
      { id: 'finance', name: 'Fee Management', enabled: true }
    ],
    features: [
      { id: 'fee_receipt_pdf_export', enabled: true }
    ],
    permissions: [],
    is_builtin: true
  },
  {
    id: 'tmpl_multi_disciplinary',
    template_name: 'Full Multi-Disciplinary ERP Template',
    description: 'Full-scale campus deployment for large colleges with hostels, placement training cells, and transport logistics.',
    institution_type: 'Multi-Disciplinary',
    roles: [
      { role: 'admin' as any, label: 'College Administrator', category: 'Administration', status: 'active', isSystemProtected: true },
      { role: 'principal' as any, label: 'Principal', category: 'Administration', status: 'active' },
      { role: 'teacher' as any, label: 'Professor & Faculty', category: 'Academic', status: 'active' },
      { role: 'student' as any, label: 'Student', category: 'Student & Parent', status: 'active' },
      { role: 'parent' as any, label: 'Parent / Guardian', category: 'Student & Parent', status: 'active' },
      { role: 'finance_manager' as any, label: 'Chief Finance Officer', category: 'Finance', status: 'active' },
      { role: 'store_manager' as any, label: 'Store Manager', category: 'Operations', status: 'active' },
      { role: 'transport_driver' as any, label: 'Fleet Coordinator', category: 'Operations', status: 'active' },
      { role: 'receptionist' as any, label: 'Reception & Admissions', category: 'Operations', status: 'active' },
      { role: 'hr_manager' as any, label: 'HR Manager', category: 'Operations', status: 'active' },
      { role: 'librarian' as any, label: 'Chief Librarian', category: 'Operations', status: 'active' },
      { role: 'hostel_warden' as any, label: 'Hostel Warden', category: 'Operations', status: 'active' },
      { role: 'placement_officer' as any, label: 'Placement Director', category: 'Operations', status: 'active' }
    ],
    modules: [
      { id: 'students', name: 'Student Management', enabled: true },
      { id: 'faculty', name: 'Faculty & Staff Directory', enabled: true },
      { id: 'academics', name: 'Academics & Timetables', enabled: true },
      { id: 'attendance', name: 'Biometric Attendance', enabled: true },
      { id: 'examinations', name: 'Examination Cell', enabled: true },
      { id: 'finance', name: 'Finance & Accounts', enabled: true },
      { id: 'admissions', name: 'Admissions', enabled: true },
      { id: 'certificates', name: 'Certificates', enabled: true },
      { id: 'medical', name: 'Medical Center', enabled: true },
      { id: 'naac', name: 'NAAC Review', enabled: true },
      { id: 'transport', name: 'Transport Fleet', enabled: true },
      { id: 'store', name: 'Campus Store', enabled: true },
      { id: 'library', name: 'Digital Library', enabled: true },
      { id: 'hostel', name: 'Hostel Management', enabled: true },
      { id: 'placements', name: 'Placement Drives', enabled: true },
      { id: 'alumni', name: 'Alumni Association', enabled: true }
    ],
    features: [],
    permissions: [],
    is_builtin: true
  }
];

class MultiCollegeService {
  private static isCollegesTableAvailable: boolean | null = null;
  private static isCollegeConfigsTableAvailable: boolean | null = null;
  private inMemoryColleges: Map<string, College> = new Map();
  private inMemoryConfigs: Map<string, MasterSystemConfigState> = new Map();
  private inMemoryRoleConfigs: Map<string, RoleCustomizationState> = new Map();
  private inMemoryAuditLogs: PlatformAuditLog[] = [];
  private ROLE_CONFIG_PREFIX = 'adhityan_role_cfg_';

  constructor() {
    this.initCache();
  }

  private initCache() {
    try {
      const storedColleges = localStorage.getItem(COLLEGES_LOCAL_KEY);
      if (storedColleges) {
        const parsed: College[] = JSON.parse(storedColleges);
        parsed.forEach(c => this.inMemoryColleges.set(c.id, c));
      }

      const storedAudit = localStorage.getItem(PLATFORM_AUDIT_LOCAL_KEY);
      if (storedAudit) {
        this.inMemoryAuditLogs = JSON.parse(storedAudit);
      }
    } catch {}

    // Ensure primary college always exists
    if (!this.inMemoryColleges.has(DEFAULT_PRIMARY_COLLEGE.id)) {
      this.inMemoryColleges.set(DEFAULT_PRIMARY_COLLEGE.id, DEFAULT_PRIMARY_COLLEGE);
      this.persistColleges();
    }
  }

  private persistColleges() {
    try {
      const list = Array.from(this.inMemoryColleges.values());
      localStorage.setItem(COLLEGES_LOCAL_KEY, JSON.stringify(list));
    } catch {}
  }

  private persistAuditLogs() {
    try {
      localStorage.setItem(PLATFORM_AUDIT_LOCAL_KEY, JSON.stringify(this.inMemoryAuditLogs.slice(0, 200)));
    } catch {}
  }

  // ===========================================================================
  // 1. COLLEGE MANAGEMENT (CRUD & STATUS)
  // ===========================================================================
  async listColleges(): Promise<College[]> {
    if (MultiCollegeService.isCollegesTableAvailable !== false) {
      try {
        const { data, error } = await supabase
          .from('colleges')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) {
          if (error.code === 'PGRST205' || error.message?.includes('Could not find') || (error as any).status === 404) {
            MultiCollegeService.isCollegesTableAvailable = false;
          }
        } else if (data && data.length > 0) {
          MultiCollegeService.isCollegesTableAvailable = true;
          data.forEach((c: any) => {
            this.inMemoryColleges.set(c.id, c as College);
          });
          this.persistColleges();
          return data as College[];
        }
      } catch (err: any) {
        MultiCollegeService.isCollegesTableAvailable = false;
      }
    }

    return Array.from(this.inMemoryColleges.values());
  }

  async getCollegeById(id: string): Promise<College | null> {
    const cached = this.inMemoryColleges.get(id);
    if (cached) return cached;

    if (MultiCollegeService.isCollegesTableAvailable !== false) {
      try {
        const { data, error } = await supabase
          .from('colleges')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) {
          if (error.code === 'PGRST205' || error.message?.includes('Could not find')) {
            MultiCollegeService.isCollegesTableAvailable = false;
          }
        } else if (data) {
          MultiCollegeService.isCollegesTableAvailable = true;
          this.inMemoryColleges.set(data.id, data as College);
          return data as College;
        }
      } catch {
        MultiCollegeService.isCollegesTableAvailable = false;
      }
    }

    return null;
  }

  async getCollegeByCode(code: string): Promise<College | null> {
    const normalized = code.trim().toUpperCase();
    for (const c of this.inMemoryColleges.values()) {
      if (c.code.toUpperCase() === normalized) return c;
    }

    if (MultiCollegeService.isCollegesTableAvailable !== false) {
      try {
        const { data, error } = await supabase
          .from('colleges')
          .select('*')
          .ilike('code', normalized)
          .maybeSingle();

        if (error) {
          if (error.code === 'PGRST205' || error.message?.includes('Could not find')) {
            MultiCollegeService.isCollegesTableAvailable = false;
          }
        } else if (data) {
          MultiCollegeService.isCollegesTableAvailable = true;
          this.inMemoryColleges.set(data.id, data as College);
          return data as College;
        }
      } catch {
        MultiCollegeService.isCollegesTableAvailable = false;
      }
    }

    return null;
  }

  // ===========================================================================
  // 2. COLLEGE PROVISIONING WIZARD
  // ===========================================================================
  async provisionCollege(
    payload: CollegeProvisioningPayload,
    superAdminEmail: string
  ): Promise<{ success: boolean; college?: College; error?: string }> {
    try {
      // Validate unique code
      const cleanCode = payload.code.trim().toUpperCase().replace(/\s+/g, '-');
      const existing = await this.getCollegeByCode(cleanCode);
      if (existing) {
        return { success: false, error: `A college with code "${cleanCode}" already exists on the platform.` };
      }

      const collegeId = crypto.randomUUID ? crypto.randomUUID() : `col_${Date.now()}`;
      
      const newCollege: College = {
        id: collegeId,
        name: payload.name.trim(),
        code: cleanCode,
        logo_url: payload.logo_url || '/placeholder.svg',
        status: 'active',
        institution_type: payload.institution_type,
        contact_email: payload.contact_email.trim().toLowerCase(),
        contact_phone: payload.contact_phone || '',
        address: payload.address || '',
        website: payload.website || '',
        academic_config: payload.academic_config,
        branding_config: payload.branding || {
          palette: 'indigo',
          primaryColor: '#4f46e5',
          fontScale: 'md',
          layoutDensity: 'normal'
        },
        admin_email: payload.admin_account.email.trim().toLowerCase(),
        current_version: 'v1.0.0',
        created_at: new Date().toISOString()
      };

      // 1. Persist to memory and localStorage
      this.inMemoryColleges.set(collegeId, newCollege);
      this.persistColleges();

      // 2. Persist to Supabase if colleges table exists
      try {
        await supabase.from('colleges').insert({
          id: newCollege.id,
          name: newCollege.name,
          code: newCollege.code,
          logo_url: newCollege.logo_url,
          status: newCollege.status,
          institution_type: newCollege.institution_type,
          contact_email: newCollege.contact_email,
          contact_phone: newCollege.contact_phone,
          address: newCollege.address,
          website: newCollege.website,
          academic_config: newCollege.academic_config,
          branding_config: newCollege.branding_config,
          current_version: newCollege.current_version
        });
      } catch (dbErr) {
        // Table fallback intact
      }

      // 3. Initialize dedicated isolated configuration state for this new college
      const initialCollegeConfig = buildInitialMasterConfigState();
      
      // Customize config based on template and selected modules
      if (payload.template_name) {
        const tmpl = BUILTIN_TEMPLATES.find(t => t.template_name === payload.template_name);
        if (tmpl) {
          if (tmpl.modules && tmpl.modules.length > 0) {
            initialCollegeConfig.modules = initialCollegeConfig.modules.map(m => {
              const matched = tmpl.modules.find(tm => tm.id === m.id);
              return matched ? { ...m, enabled: !!matched.enabled } : { ...m, enabled: false };
            });
          }
        }
      }

      if (payload.selected_modules && payload.selected_modules.length > 0) {
        initialCollegeConfig.modules = initialCollegeConfig.modules.map(m => ({
          ...m,
          enabled: payload.selected_modules!.includes(m.id)
        }));
      }

      // Update institutional meta in college configuration
      initialCollegeConfig.globalSettings.institutionName = newCollege.name;
      initialCollegeConfig.globalSettings.institutionCode = newCollege.code;
      initialCollegeConfig.globalSettings.contactEmail = newCollege.contact_email;
      initialCollegeConfig.globalSettings.contactPhone = newCollege.contact_phone || '';

      // Save college-isolated configuration
      await this.saveCollegeConfiguration(collegeId, initialCollegeConfig);

      // 4. Log to Platform Audit Logs
      await this.logPlatformAction({
        super_admin_email: superAdminEmail,
        college_id: collegeId,
        college_code: cleanCode,
        action: 'provision_college',
        entity_type: 'college',
        entity_id: cleanCode,
        new_values: {
          name: newCollege.name,
          code: newCollege.code,
          admin_email: newCollege.admin_email,
          institution_type: newCollege.institution_type,
          timestamp: new Date().toISOString()
        }
      });

      return { success: true, college: newCollege };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to provision college.' };
    }
  }

  // ===========================================================================
  // 3. UPDATE COLLEGE & STATUS TOGGLE (ACTIVATE, DEACTIVATE, SUSPEND)
  // ===========================================================================
  async updateCollege(
    collegeId: string,
    updates: Partial<College>,
    superAdminEmail: string
  ): Promise<{ success: boolean; college?: College; error?: string }> {
    try {
      const existing = await this.getCollegeById(collegeId);
      if (!existing) {
        return { success: false, error: 'College not found.' };
      }

      const updated: College = {
        ...existing,
        ...updates,
        updated_at: new Date().toISOString()
      };

      this.inMemoryColleges.set(collegeId, updated);
      this.persistColleges();

      try {
        await supabase
          .from('colleges')
          .update(updates)
          .eq('id', collegeId);
      } catch {}

      await this.logPlatformAction({
        super_admin_email: superAdminEmail,
        college_id: collegeId,
        college_code: existing.code,
        action: 'update_college',
        entity_type: 'college',
        entity_id: collegeId,
        old_values: existing,
        new_values: updated
      });

      return { success: true, college: updated };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update college.' };
    }
  }

  async setCollegeStatus(
    collegeId: string,
    status: CollegeStatus,
    superAdminEmail: string
  ): Promise<{ success: boolean; error?: string }> {
    const res = await this.updateCollege(collegeId, { status }, superAdminEmail);
    if (res.success) {
      await this.logPlatformAction({
        super_admin_email: superAdminEmail,
        college_id: collegeId,
        college_code: res.college?.code || '',
        action: `set_college_status_${status}`,
        entity_type: 'college_status',
        entity_id: collegeId,
        new_values: { status, timestamp: new Date().toISOString() }
      });
      return { success: true };
    }
    return { success: false, error: res.error };
  }

  // ===========================================================================
  // 4. COLLEGE-SCOPED DYNAMIC CONFIGURATIONS (STRICT TENANT ISOLATION)
  // ===========================================================================
  async getCollegeConfiguration(
    collegeId: string,
    options?: { includeDrafts?: boolean }
  ): Promise<MasterSystemConfigState> {
    const cacheKey = `${COLLEGE_CONFIG_PREFIX}${collegeId}`;

    // 1. Check in-memory map
    if (this.inMemoryConfigs.has(collegeId)) {
      return JSON.parse(JSON.stringify(this.inMemoryConfigs.get(collegeId)!));
    }

    // 2. Check localStorage
    try {
      const stored = localStorage.getItem(cacheKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.inMemoryConfigs.set(collegeId, parsed);
        return JSON.parse(JSON.stringify(parsed));
      }
    } catch {}

    // 3. Fallback: Initialize with college identity
    const college = await this.getCollegeById(collegeId) || DEFAULT_PRIMARY_COLLEGE;
    const initial = buildInitialMasterConfigState();
    initial.globalSettings.institutionName = college.name;
    initial.globalSettings.institutionCode = college.code;
    initial.globalSettings.contactEmail = college.contact_email;
    initial.globalSettings.contactPhone = college.contact_phone || '';
    
    this.inMemoryConfigs.set(collegeId, JSON.parse(JSON.stringify(initial)));
    try {
      localStorage.setItem(cacheKey, JSON.stringify(initial));
    } catch {}

    return initial;
  }

  async saveCollegeConfiguration(
    collegeId: string,
    config: MasterSystemConfigState
  ): Promise<void> {
    const cacheKey = `${COLLEGE_CONFIG_PREFIX}${collegeId}`;
    const cloned = JSON.parse(JSON.stringify(config));
    this.inMemoryConfigs.set(collegeId, cloned);
    try {
      localStorage.setItem(cacheKey, JSON.stringify(cloned));
    } catch {}
  }

  async publishCollegeConfiguration(
    collegeId: string,
    superAdminEmail: string,
    changeSummary: string
  ): Promise<{ success: boolean; releaseVersion?: string; error?: string }> {
    try {
      const college = await this.getCollegeById(collegeId);
      if (!college) return { success: false, error: 'College not found' };

      const config = await this.getCollegeConfiguration(collegeId, { includeDrafts: true });
      const versionNum = parseInt(college.current_version.replace(/[^0-9]/g, '') || '1', 10) + 1;
      const releaseVersionStr = `v1.${versionNum}.0`;

      // Update college version
      await this.updateCollege(collegeId, { current_version: releaseVersionStr }, superAdminEmail);

      // Update configuration published timestamp
      config.activeReleaseVersion = releaseVersionStr;
      config.lastUpdated = new Date().toISOString();
      await this.saveCollegeConfiguration(collegeId, config);

      // Record in platform audit logs
      await this.logPlatformAction({
        super_admin_email: superAdminEmail,
        college_id: collegeId,
        college_code: college.code,
        action: 'publish_college_configuration',
        entity_type: 'configuration_release',
        entity_id: releaseVersionStr,
        new_values: {
          version: releaseVersionStr,
          summary: changeSummary,
          publishedAt: new Date().toISOString()
        }
      });

      return { success: true, releaseVersion: releaseVersionStr };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to publish college configuration.' };
    }
  }

  // ===========================================================================
  // 5. PLATFORM AUDIT LOGGING & AUDIT TRAIL
  // ===========================================================================
  async logPlatformAction(entry: {
    super_admin_email: string;
    college_id?: string;
    college_code?: string;
    action: string;
    entity_type: string;
    entity_id?: string;
    old_values?: any;
    new_values?: any;
  }): Promise<void> {
    const logItem: PlatformAuditLog = {
      id: crypto.randomUUID ? crypto.randomUUID() : `pal_${Date.now()}`,
      super_admin_email: entry.super_admin_email,
      college_id: entry.college_id,
      college_code: entry.college_code,
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      old_values: entry.old_values || null,
      new_values: entry.new_values || null,
      created_at: new Date().toISOString()
    };

    this.inMemoryAuditLogs.unshift(logItem);
    this.persistAuditLogs();

    // Also persist into Supabase audit_logs table for remote querying
    try {
      await supabase.from('audit_logs').insert({
        user_email: entry.super_admin_email,
        user_role: 'platform_super_admin',
        action: entry.action,
        entity_type: entry.entity_type,
        entity_id: entry.college_code ? `${entry.college_code}:${entry.entity_id || ''}` : (entry.entity_id || 'platform'),
        old_values: entry.old_values || null,
        new_values: entry.new_values || null,
        created_at: logItem.created_at
      });
    } catch {}
  }

  async listPlatformAuditLogs(options?: { collegeId?: string; limit?: number }): Promise<PlatformAuditLog[]> {
    // 1. Attempt query from Supabase audit_logs table
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(options?.limit || 50);

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data.map((row: any) => ({
          id: row.id,
          super_admin_email: row.user_email || 'superadmin@platform.adithyan.edu',
          college_code: row.entity_id?.split(':')[0] || 'GLOBAL',
          action: row.action,
          entity_type: row.entity_type,
          entity_id: row.entity_id,
          old_values: row.old_values,
          new_values: row.new_values,
          created_at: row.created_at
        }));
      }
    } catch {}

    // 2. Resilient memory fallback
    if (options?.collegeId) {
      return this.inMemoryAuditLogs.filter(l => l.college_id === options.collegeId);
    }
    return this.inMemoryAuditLogs.slice(0, options?.limit || 50);
  }

  // ===========================================================================
  // 6. ROLE CUSTOMIZATION & FUNCTIONALITY GOVERNANCE (STRICT TENANT ISOLATION)
  // ===========================================================================
  async getRoleConfiguration(
    collegeId: string,
    roleKey: string
  ): Promise<RoleCustomizationState> {
    const memoryKey = `${collegeId}_${roleKey}`;
    const localKey = `${this.ROLE_CONFIG_PREFIX}${memoryKey}`;

    // 1. In-memory cache
    if (this.inMemoryRoleConfigs.has(memoryKey)) {
      return JSON.parse(JSON.stringify(this.inMemoryRoleConfigs.get(memoryKey)!));
    }

    // 2. localStorage
    try {
      const stored = localStorage.getItem(localKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.inMemoryRoleConfigs.set(memoryKey, parsed);
        return JSON.parse(JSON.stringify(parsed));
      }
    } catch {}

    // 3. Supabase remote DB query
    if (MultiCollegeService.isCollegeConfigsTableAvailable !== false) {
      try {
        const { data, error } = await supabase
          .from('college_configurations')
          .select('data')
          .eq('college_id', collegeId)
          .eq('target_role', roleKey)
          .eq('config_type', 'role_customization')
          .maybeSingle();

        if (error) {
          if (error.code === 'PGRST205' || error.message?.includes('Could not find') || (error as any).status === 404) {
            MultiCollegeService.isCollegeConfigsTableAvailable = false;
          }
        } else if (data?.data) {
          MultiCollegeService.isCollegeConfigsTableAvailable = true;
          const loaded = data.data as RoleCustomizationState;
          this.inMemoryRoleConfigs.set(memoryKey, loaded);
          try { localStorage.setItem(localKey, JSON.stringify(loaded)); } catch {}
          return JSON.parse(JSON.stringify(loaded));
        }
      } catch {
        MultiCollegeService.isCollegeConfigsTableAvailable = false;
      }
    }

    // 4. Fallback: Build default isolated customization for this role in this college
    const initial = buildDefaultRoleCustomization(collegeId, roleKey);
    this.inMemoryRoleConfigs.set(memoryKey, initial);
    try {
      localStorage.setItem(localKey, JSON.stringify(initial));
    } catch {}

    return JSON.parse(JSON.stringify(initial));
  }

  async saveRoleConfiguration(
    collegeId: string,
    roleKey: string,
    config: RoleCustomizationState
  ): Promise<void> {
    const memoryKey = `${collegeId}_${roleKey}`;
    const localKey = `${this.ROLE_CONFIG_PREFIX}${memoryKey}`;
    const cloned = JSON.parse(JSON.stringify({ ...config, updatedAt: new Date().toISOString() }));

    this.inMemoryRoleConfigs.set(memoryKey, cloned);
    try {
      localStorage.setItem(localKey, JSON.stringify(cloned));
    } catch {}

    // Remote persistence to college_configurations
    if (MultiCollegeService.isCollegeConfigsTableAvailable !== false) {
      try {
        const { error } = await supabase.from('college_configurations').upsert({
          college_id: collegeId,
          config_type: 'role_customization',
          target_role: roleKey,
          data: cloned,
          version: cloned.version || 'v1.0.0',
          is_published: !!cloned.isPublished,
          updated_at: new Date().toISOString()
        }, { onConflict: 'college_id,config_type,target_role' });

        if (error && (error.code === 'PGRST205' || error.message?.includes('Could not find') || (error as any).status === 404)) {
          MultiCollegeService.isCollegeConfigsTableAvailable = false;
        }
      } catch {
        MultiCollegeService.isCollegeConfigsTableAvailable = false;
      }
    }

    // Keep MasterSystemConfigState synced for this role's widgets and navigation
    try {
      const collegeConfig = await this.getCollegeConfiguration(collegeId);
      collegeConfig.roles[roleKey] = {
        role: roleKey as any,
        label: cloned.label,
        category: cloned.category,
        description: cloned.description,
        status: cloned.status,
        allowedModules: cloned.enabledModules,
        visibleWidgets: cloned.dashboard?.widgets?.map((w: any) => w.widgetId) || [],
        isSystemProtected: roleKey === 'admin'
      };
      if (cloned.dashboard) {
        collegeConfig.dashboards[roleKey] = cloned.dashboard;
      }
      if (cloned.navigation) {
        collegeConfig.navigation[roleKey] = cloned.navigation;
      }
      if (cloned.pageConfig) {
        collegeConfig.pages[roleKey] = cloned.pageConfig;
      }
      await this.saveCollegeConfiguration(collegeId, collegeConfig);
    } catch {}
  }

  async publishRoleConfiguration(
    collegeId: string,
    roleKey: string,
    superAdminEmail: string,
    summary: string
  ): Promise<{ success: boolean; releaseVersion?: string; error?: string }> {
    try {
      const college = await this.getCollegeById(collegeId);
      if (!college) return { success: false, error: 'College not found.' };

      const config = await this.getRoleConfiguration(collegeId, roleKey);
      const currentVerNum = parseInt(config.version.replace(/[^0-9]/g, '') || '10', 10);
      const nextVersion = `v1.${currentVerNum + 1}.0`;

      config.version = nextVersion;
      config.isPublished = true;
      config.updatedAt = new Date().toISOString();

      await this.saveRoleConfiguration(collegeId, roleKey, config);

      // Log in platform audit trail
      await this.logPlatformAction({
        super_admin_email: superAdminEmail,
        college_id: collegeId,
        college_code: college.code,
        action: 'publish_role_configuration',
        entity_type: 'role_customization',
        entity_id: `${roleKey}:${nextVersion}`,
        new_values: {
          role: roleKey,
          version: nextVersion,
          summary,
          publishedAt: config.updatedAt,
          enabledCapabilitiesCount: config.enabledCapabilities.length,
          backendActionsCount: Object.values(config.backendActions).filter(Boolean).length
        }
      });

      return { success: true, releaseVersion: nextVersion };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to publish role configuration.' };
    }
  }

  validateRoleConfiguration(
    roleConfig: RoleCustomizationState,
    collegeModules?: ModuleDefinition[]
  ): RoleValidationIssue[] {
    const issues: RoleValidationIssue[] = [];

    // Rule 1: Safety guardrail: Admin role must remain active
    if (roleConfig.role === 'admin' && roleConfig.status !== 'active') {
      issues.push({
        type: 'error',
        title: 'Super Admin Protected',
        description: 'The primary Institutional Administrator role cannot be suspended.',
        tabKey: 'overview'
      });
    }

    // Rule 2: Module dependency check
    if (collegeModules && collegeModules.length > 0) {
      roleConfig.enabledCapabilities.forEach(capId => {
        const cap = CAPABILITY_REGISTRY.find(c => c.id === capId);
        if (cap) {
          const mod = collegeModules.find(m => m.id === cap.module);
          if (mod && !mod.enabled) {
            issues.push({
              type: 'warning',
              title: `Capability Conflict: ${cap.name}`,
              description: `Module "${mod.name}" is disabled for this college, so capability "${cap.name}" will be blocked at the backend.`,
              tabKey: 'capabilities'
            });
          }
        }
      });
    }

    // Rule 3: Sensitive data export warning
    if (roleConfig.dataAccess.allowSensitiveExport && roleConfig.role !== 'admin' && roleConfig.role !== 'principal') {
      issues.push({
        type: 'security',
        title: 'Sensitive Data Export Authorized',
        description: `Role "${roleConfig.label}" has been granted permission to export sensitive records (finance/PII).`,
        tabKey: 'dataAccess'
      });
    }

    // Rule 4: Action enabled without CRUD permission
    if (roleConfig.backendActions['record_attendance'] && roleConfig.crud['Attendance Logs']?.create === false) {
      issues.push({
        type: 'warning',
        title: 'Attendance Permission Mismatch',
        description: 'Action "record_attendance" is enabled but CRUD create permission for "Attendance Logs" is disabled.',
        tabKey: 'crud'
      });
    }

    return issues;
  }

  async resetRoleConfigurationToDefault(
    collegeId: string,
    roleKey: string
  ): Promise<RoleCustomizationState> {
    const fresh = buildDefaultRoleCustomization(collegeId, roleKey);
    await this.saveRoleConfiguration(collegeId, roleKey, fresh);
    return fresh;
  }

  // ===========================================================================
  // 7. CONFIGURATION TEMPLATES
  // ===========================================================================
  listTemplates(): CollegeTemplate[] {
    return BUILTIN_TEMPLATES;
  }
}

export const multiCollegeService = new MultiCollegeService();
