import { supabase } from '@/lib/supabase';
import { 
  MasterSystemConfigState, 
  SuperAdminConfigType, 
  ConfigurationRelease, 
  AuditLogItem,
  RoleCustomConfig,
  ModuleDefinition,
  FeatureDefinition,
  GlobalSettingsConfig,
  ThemeBrandingConfig
} from '@/types/superAdmin.types';
import { 
  buildInitialMasterConfigState, 
  DEFAULT_ROLES_CONFIG, 
  DEFAULT_MODULES, 
  DEFAULT_FEATURES,
  DEFAULT_GLOBAL_SETTINGS,
  DEFAULT_THEME_CONFIG
} from './superAdminDefaults';

const STORAGE_CACHE_KEY = 'adhityan_super_admin_config_cache_v1';
const DRAFT_CACHE_KEY = 'adhityan_super_admin_draft_cache_v1';

class SuperAdminService {
  private inMemoryCache: MasterSystemConfigState | null = null;
  private draftCache: Partial<MasterSystemConfigState> | null = null;
  private releaseHistory: ConfigurationRelease[] = [];

  constructor() {
    this.initLocalCache();
  }

  private initLocalCache() {
    try {
      const stored = localStorage.getItem(STORAGE_CACHE_KEY);
      if (stored) {
        this.inMemoryCache = JSON.parse(stored);
      }
      const draftStored = localStorage.getItem(DRAFT_CACHE_KEY);
      if (draftStored) {
        this.draftCache = JSON.parse(draftStored);
      }
    } catch {
      // Local storage unavailable or parsing error
    }

    if (!this.inMemoryCache) {
      this.inMemoryCache = buildInitialMasterConfigState();
    }
  }

  // ===========================================================================
  // 1. GET CONFIGURATION (PUBLISHED OR DRAFT)
  // ===========================================================================
  async getMasterConfiguration(options?: { includeDrafts?: boolean }): Promise<MasterSystemConfigState> {
    if (!this.inMemoryCache) {
      this.inMemoryCache = buildInitialMasterConfigState();
    }

    const merged = { ...this.inMemoryCache };

    // Synchronize global settings from real existing Supabase institutional_settings table
    try {
      const { data: instRow } = await supabase
        .from('institutional_settings')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .maybeSingle();

      if (instRow) {
        merged.globalSettings = {
          ...merged.globalSettings,
          institutionName: instRow.institution_name || merged.globalSettings.institutionName,
          institutionCode: instRow.institution_code || merged.globalSettings.institutionCode,
          academicYear: instRow.academic_year || merged.globalSettings.academicYear,
          contactEmail: instRow.contact_email || merged.globalSettings.contactEmail,
          contactPhone: instRow.contact_phone || merged.globalSettings.contactPhone,
          attendancePolicyThreshold: instRow.min_attendance_percentage ?? merged.globalSettings.attendancePolicyThreshold,
          passingMarksThreshold: instRow.passing_marks_percentage ?? merged.globalSettings.passingMarksThreshold,
          enableRealtime: instRow.enable_realtime ?? merged.globalSettings.enableRealtime,
          maintenanceMode: instRow.maintenance_mode ?? merged.globalSettings.maintenanceMode,
        };
      }
    } catch (err) {
      // Continue with in-memory state
    }

    // Synchronize latest release snapshot from real existing Supabase audit_logs table
    try {
      const { data: releaseLogs } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('action', 'publish_configuration')
        .order('created_at', { ascending: false })
        .limit(1);

      if (releaseLogs && releaseLogs.length > 0 && releaseLogs[0].new_values?.snapshot) {
        const snap = releaseLogs[0].new_values.snapshot;
        if (snap.roles && Array.isArray(snap.roles)) {
          snap.roles.forEach((r: any) => { merged.roles[r.role] = r; });
        }
        if (snap.modules && Array.isArray(snap.modules)) merged.modules = snap.modules;
        if (snap.features && Array.isArray(snap.features)) merged.features = snap.features;
        if (snap.globalSettings) merged.globalSettings = { ...merged.globalSettings, ...snap.globalSettings };
        if (snap.theme) merged.theme = { ...merged.theme, ...snap.theme };
        if (releaseLogs[0].new_values.version) merged.activeReleaseVersion = releaseLogs[0].new_values.version;
      }
    } catch (err) {
      // Continue with in-memory state
    }

    // Merge in-memory drafts if requested
    if (options?.includeDrafts && this.draftCache) {
      return {
        ...merged,
        ...this.draftCache
      };
    }

    return merged;
  }

  // ===========================================================================
  // 2. SAVE DRAFT CONFIGURATION
  // ===========================================================================
  async saveDraft(
    configType: SuperAdminConfigType,
    data: any,
    targetRole: string = 'global',
    author: { email: string; id?: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Update memory / local cache immediately
      if (!this.draftCache) this.draftCache = {};
      
      if (configType === 'global') {
        this.draftCache.globalSettings = data;
      } else if (configType === 'theme') {
        this.draftCache.theme = data;
      } else if (configType === 'role' && targetRole !== 'global') {
        if (!this.draftCache.roles) this.draftCache.roles = { ...(this.inMemoryCache?.roles || {}) };
        this.draftCache.roles[targetRole] = data;
      } else if (configType === 'dashboard' && targetRole !== 'global') {
        if (!this.draftCache.dashboards) this.draftCache.dashboards = { ...(this.inMemoryCache?.dashboards || {}) };
        this.draftCache.dashboards[targetRole] = data;
      } else if (configType === 'page' && targetRole !== 'global') {
        if (!this.draftCache.pages) this.draftCache.pages = { ...(this.inMemoryCache?.pages || {}) };
        this.draftCache.pages[targetRole] = data;
      } else if (configType === 'navigation' && targetRole !== 'global') {
        if (!this.draftCache.navigation) this.draftCache.navigation = { ...(this.inMemoryCache?.navigation || {}) };
        this.draftCache.navigation[targetRole] = data;
      } else if (configType === 'module') {
        this.draftCache.modules = data;
      } else if (configType === 'feature') {
        this.draftCache.features = data;
      }

      try {
        localStorage.setItem(DRAFT_CACHE_KEY, JSON.stringify(this.draftCache));
      } catch {}

      // Record audit log entry in Supabase audit_logs table
      await this.logAuditAction({
        user_email: author.email,
        user_role: 'admin',
        action: 'save_draft',
        entity_type: configType,
        entity_id: targetRole,
        new_values: { data, timestamp: new Date().toISOString() }
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to save draft' };
    }
  }

  // ===========================================================================
  // 3. PUBLISH CONFIGURATION (VALIDATE, VERSION & DEPLOY LIVE)
  // ===========================================================================
  async publishConfiguration(
    author: { email: string; id?: string },
    changeSummary: string
  ): Promise<{ success: boolean; release?: ConfigurationRelease; error?: string }> {
    try {
      const currentConfig = await this.getMasterConfiguration({ includeDrafts: true });

      // Run pre-flight validation
      const validation = this.validateConfiguration(currentConfig);
      if (!validation.isValid) {
        return { success: false, error: `Validation Failed: ${validation.errors.join(' • ')}` };
      }

      // Calculate next version
      const currentVersionNum = this.releaseHistory.length + 1;
      const releaseVersionStr = `v1.${currentVersionNum}.0`;

      const release: ConfigurationRelease = {
        id: crypto.randomUUID ? crypto.randomUUID() : `rel_${Date.now()}`,
        release_version: releaseVersionStr,
        version_number: currentVersionNum,
        title: `Release ${releaseVersionStr}`,
        change_summary: changeSummary || 'Routine institutional configuration update.',
        author_id: author.id,
        author_email: author.email,
        snapshot: {
          roles: Object.values(currentConfig.roles),
          modules: currentConfig.modules,
          features: currentConfig.features,
          globalSettings: currentConfig.globalSettings,
          theme: currentConfig.theme,
          publishedAt: new Date().toISOString()
        },
        is_active: true,
        created_at: new Date().toISOString()
      };

      // Add to release history
      this.releaseHistory.unshift(release);

      // Promote in-memory cache to published
      this.inMemoryCache = {
        ...currentConfig,
        activeReleaseVersion: releaseVersionStr,
        lastUpdated: new Date().toISOString()
      };
      this.draftCache = null;

      try {
        localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(this.inMemoryCache));
        localStorage.removeItem(DRAFT_CACHE_KEY);
      } catch {}

      // Update institutional_settings in Supabase as live global persistence
      try {
        await supabase.from('institutional_settings').update({
          institution_name: currentConfig.globalSettings.institutionName,
          institution_code: currentConfig.globalSettings.institutionCode,
          academic_year: currentConfig.globalSettings.academicYear,
          contact_email: currentConfig.globalSettings.contactEmail,
          contact_phone: currentConfig.globalSettings.contactPhone,
          min_attendance_percentage: currentConfig.globalSettings.attendancePolicyThreshold,
          passing_marks_percentage: currentConfig.globalSettings.passingMarksThreshold,
          maintenance_mode: currentConfig.globalSettings.maintenanceMode,
          enable_realtime: currentConfig.globalSettings.enableRealtime,
          updated_at: new Date().toISOString()
        }).eq('id', '00000000-0000-0000-0000-000000000001');
      } catch (err) {
        // Continue
      }

      // Record high-priority audit log entry with full snapshot in new_values
      await this.logAuditAction({
        user_email: author.email,
        user_role: 'admin',
        action: 'publish_configuration',
        entity_type: 'release',
        entity_id: releaseVersionStr,
        new_values: {
          version: releaseVersionStr,
          summary: changeSummary,
          snapshot: release.snapshot,
          publishedAt: new Date().toISOString()
        }
      });

      return { success: true, release };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to publish configuration.' };
    }
  }

  // ===========================================================================
  // 4. GET RELEASES (FETCHED FROM AUDIT_LOGS)
  // ===========================================================================
  async getReleases(): Promise<ConfigurationRelease[]> {
    try {
      const { data: logs } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('action', 'publish_configuration')
        .order('created_at', { ascending: false })
        .limit(20);

      if (logs && logs.length > 0) {
        return logs.map((log: any, idx: number) => ({
          id: log.id,
          release_version: log.entity_id || log.new_values?.version || `v1.${idx + 1}.0`,
          version_number: idx + 1,
          title: `Release ${log.entity_id || log.new_values?.version || 'v1.0.0'}`,
          change_summary: log.new_values?.summary || 'Administrative configuration release',
          author_email: log.user_email || 'admin@gmail.com',
          snapshot: log.new_values?.snapshot || {},
          is_active: idx === 0,
          created_at: log.created_at
        }));
      }
    } catch (err) {
      console.warn('Failed to fetch releases from audit_logs:', err);
    }
    return this.releaseHistory;
  }

  // ===========================================================================
  // 5. ROLLBACK CONFIGURATION
  // ===========================================================================
  async rollbackConfiguration(
    versionNumber: number,
    author: { email: string; id?: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const targetRelease = this.releaseHistory.find(r => r.version_number === versionNumber);
      if (!targetRelease) {
        return { success: false, error: `Release version #${versionNumber} not found in history.` };
      }

      // Restore snapshot
      const snapshot = targetRelease.snapshot;
      if (this.inMemoryCache && snapshot) {
        const restoredRoles: Record<string, RoleCustomConfig> = {};
        if (snapshot.roles && Array.isArray(snapshot.roles)) {
          snapshot.roles.forEach(r => { restoredRoles[r.role] = r; });
        }

        this.inMemoryCache = {
          ...this.inMemoryCache,
          roles: Object.keys(restoredRoles).length > 0 ? restoredRoles : this.inMemoryCache.roles,
          modules: snapshot.modules || this.inMemoryCache.modules,
          features: snapshot.features || this.inMemoryCache.features,
          globalSettings: snapshot.globalSettings || this.inMemoryCache.globalSettings,
          theme: snapshot.theme || this.inMemoryCache.theme,
          activeReleaseVersion: targetRelease.release_version,
          lastUpdated: new Date().toISOString()
        };

        try {
          localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(this.inMemoryCache));
        } catch {}
      }

      // Log audit
      await this.logAuditAction({
        user_email: author.email,
        user_role: 'admin',
        action: 'rollback_configuration',
        entity_type: 'release',
        entity_id: targetRelease.release_version,
        new_values: { rolledBackTo: targetRelease.release_version, timestamp: new Date().toISOString() }
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to rollback release.' };
    }
  }

  // ===========================================================================
  // 6. AUDIT LOGGING & RETRIEVAL (CONNECTED TO SUPABASE audit_logs)
  // ===========================================================================
  async logAuditAction(entry: {
    user_email: string;
    user_role: string;
    action: string;
    entity_type: string;
    entity_id: string;
    old_values?: any;
    new_values?: any;
  }): Promise<void> {
    try {
      await supabase.from('audit_logs').insert({
        user_email: entry.user_email,
        user_role: entry.user_role,
        action: entry.action,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id,
        old_values: entry.old_values || null,
        new_values: entry.new_values || null,
        created_at: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Audit log insert note:', err);
    }
  }

  async getAuditLogs(options?: { actionFilter?: string; limit?: number }): Promise<AuditLogItem[]> {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(options?.limit || 50);

      if (options?.actionFilter && options.actionFilter !== 'all') {
        query = query.eq('action', options.actionFilter);
      }

      const { data, error } = await query;
      if (!error && data) {
        return data as AuditLogItem[];
      }
    } catch (err) {
      console.warn('Failed to query remote audit_logs table:', err);
    }

    return [];
  }

  // ===========================================================================
  // 7. BACKUP & RESTORE CONFIGURATION
  // ===========================================================================
  async createBackup(
    name: string,
    author: { email: string; id?: string }
  ): Promise<{ success: boolean; backupPayload?: string; error?: string }> {
    try {
      const config = await this.getMasterConfiguration({ includeDrafts: true });
      const payload = {
        backupName: name,
        createdAt: new Date().toISOString(),
        authorEmail: author.email,
        version: config.activeReleaseVersion || 'v1.0.0',
        config
      };
      const jsonStr = JSON.stringify(payload, null, 2);

      // Persist backup into audit logs as well for full disaster recovery
      await this.logAuditAction({
        user_email: author.email,
        user_role: 'admin',
        action: 'create_backup',
        entity_type: 'backup',
        entity_id: name,
        new_values: { name, version: payload.version, timestamp: payload.createdAt }
      });

      return { success: true, backupPayload: jsonStr };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to create backup' };
    }
  }

  async restoreFromBackupJson(
    backupJson: string,
    author: { email: string; id?: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const parsed = JSON.parse(backupJson);
      if (!parsed.config || !parsed.config.roles || !parsed.config.globalSettings) {
        return { success: false, error: 'Invalid backup structure. Required configuration keys missing.' };
      }

      this.inMemoryCache = parsed.config;
      try {
        localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(parsed.config));
      } catch {}

      await this.logAuditAction({
        user_email: author.email,
        user_role: 'admin',
        action: 'restore_backup',
        entity_type: 'backup',
        entity_id: parsed.backupName || 'unnamed_backup',
        new_values: { restoredFrom: parsed.backupName, timestamp: new Date().toISOString() }
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to parse and restore backup.' };
    }
  }

  // ===========================================================================
  // 8. PRE-FLIGHT CONFIGURATION VALIDATOR
  // ===========================================================================
  validateConfiguration(config: MasterSystemConfigState): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Rule 1: Super Admin role must remain active and retain core permissions
    const adminRole = config.roles['admin'];
    if (!adminRole || adminRole.status !== 'active') {
      errors.push('Super Admin role must exist and cannot be disabled.');
    }

    // Rule 2: Minimum attendance percentage must be between 1 and 100
    const att = config.globalSettings.attendancePolicyThreshold;
    if (att < 1 || att > 100) {
      errors.push('Attendance policy threshold must be between 1% and 100%.');
    }

    // Rule 3: Required Core Modules must exist
    const coreModules = ['students', 'faculty', 'academics'];
    const activeModuleIds = config.modules.filter(m => m.enabled).map(m => m.id);
    for (const core of coreModules) {
      if (!activeModuleIds.includes(core)) {
        errors.push(`Core system module "${core}" cannot be disabled without breaking system integrity.`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // ===========================================================================
  // 9. SAVE FULL MASTER CONFIGURATION DRAFT & SNAPSHOT
  // ===========================================================================
  async saveMasterConfiguration(config: MasterSystemConfigState): Promise<boolean> {
    this.inMemoryCache = { ...config };
    this.draftCache = { ...config };
    try {
      localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(this.inMemoryCache));
      localStorage.setItem(DRAFT_CACHE_KEY, JSON.stringify(this.draftCache));
    } catch {}

    // Update institutional_settings if changed
    if (config.globalSettings) {
      try {
        await supabase.from('institutional_settings').update({
          institution_name: config.globalSettings.institutionName,
          institution_code: config.globalSettings.institutionCode,
          academic_year: config.globalSettings.academicYear,
          contact_email: config.globalSettings.contactEmail,
          contact_phone: config.globalSettings.contactPhone,
          min_attendance_percentage: config.globalSettings.attendancePolicyThreshold,
          passing_marks_percentage: config.globalSettings.passingMarksThreshold,
          maintenance_mode: config.globalSettings.maintenanceMode,
          enable_realtime: config.globalSettings.enableRealtime,
          updated_at: new Date().toISOString()
        }).eq('id', '00000000-0000-0000-0000-000000000001');
      } catch {}
    }

    return true;
  }

  // ===========================================================================
  // 10. PUBLISH RELEASE CONVENIENCE WRAPPER
  // ===========================================================================
  async publishRelease(
    title: string,
    summary: string,
    authorEmail: string = 'superadmin@adithyan.edu.in'
  ): Promise<{ success: boolean; error?: string; release?: ConfigurationRelease }> {
    return this.publishConfiguration({ email: authorEmail }, summary);
  }
}

export const superAdminService = new SuperAdminService();
