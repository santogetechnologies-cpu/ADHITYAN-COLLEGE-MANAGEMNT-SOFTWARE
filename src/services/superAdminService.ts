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

const SETTING_KEY = 'control_center';
const CACHE_TTL_MS = 15_000;
type Snapshot = Partial<MasterSystemConfigState>;
const RUNTIME_FIELDS: (keyof MasterSystemConfigState)[] = ['activeReleaseVersion', 'lastUpdated'];

/**
 * Control Center configuration.
 *  - LIVE config:   table app_settings (key 'control_center'), readable by every signed-in user, so a published
 *                   change really applies to everyone (it used to be read from admin-only audit_logs, so other
 *                   roles silently got defaults, and the draft/published copies lived in each browser's localStorage).
 *  - DRAFT:         table app_setting_drafts, one shared draft for the administrators.
 *  - RELEASES:      table app_setting_versions (append-only). Version numbers come from the database.
 * Changes only go live through publishConfiguration(); rollback publishes an old release as a NEW release.
 */
class SuperAdminService {
  private published: MasterSystemConfigState | null = null;
  private publishedVersion = 0;
  private publishedLoadedAt = 0;
  private draft: Snapshot | null = null;
  private releaseHistory: ConfigurationRelease[] = [];

  private applySnapshot(base: MasterSystemConfigState, snap: Snapshot): MasterSystemConfigState {
    return {
      ...base,
      ...snap,
      roles: { ...base.roles, ...(snap.roles || {}) },
      pages: { ...base.pages, ...(snap.pages || {}) },
      dashboards: { ...base.dashboards, ...(snap.dashboards || {}) },
      navigation: { ...base.navigation, ...(snap.navigation || {}) },
      forms: { ...base.forms, ...(snap.forms || {}) },
      workflows: { ...base.workflows, ...(snap.workflows || {}) },
      globalSettings: { ...base.globalSettings, ...(snap.globalSettings || {}) },
      theme: { ...base.theme, ...(snap.theme || {}) },
    };
  }

  /** The signed-in user is the author, whatever the calling screen passes (screens used to pass a hard-coded address). */
  private async currentAuthor(fallback: { email: string; id?: string }): Promise<{ email: string; id?: string }> {
    try {
      const { data } = await supabase.auth.getUser();
      if (data.user?.email) return { email: data.user.email, id: data.user.id };
    } catch { /* offline: keep the caller's value */ }
    return fallback;
  }

  private strip(config: Snapshot): Snapshot {
    const copy: any = { ...config };
    RUNTIME_FIELDS.forEach((k) => delete copy[k]);
    return copy;
  }

  /** Loads the live configuration from the database (cached for a few seconds). Falls back to the last known/default config offline. */
  private async loadPublished(force = false): Promise<void> {
    if (!force && this.published && Date.now() - this.publishedLoadedAt < CACHE_TTL_MS) return;
    const base = buildInitialMasterConfigState();
    try {
      const { data, error } = await supabase.from('app_settings' as any).select('value, version').eq('key', SETTING_KEY).maybeSingle();
      if (error) throw error;
      if (data && (data as any).value) {
        const v = (data as any).version as number;
        this.published = { ...this.applySnapshot(base, (data as any).value), activeReleaseVersion: `v1.${v}.0` };
        this.publishedVersion = v;
      } else {
        this.published = base;        // nothing published yet: built-in defaults
        this.publishedVersion = 0;
      }
      this.publishedLoadedAt = Date.now();
    } catch (err) {
      console.warn('Could not load the published configuration; using the last known one:', err);
      if (!this.published) this.published = base;
    }
  }

  private async loadDraft(): Promise<void> {
    try {
      const { data } = await supabase.from('app_setting_drafts' as any).select('value').eq('key', SETTING_KEY).maybeSingle();
      this.draft = ((data as any)?.value as Snapshot) || null;   // RLS: only administrators can see the draft
    } catch {
      this.draft = null;
    }
  }

  private async syncInstitutionalSettings(g: GlobalSettingsConfig): Promise<void> {
    try {
      await supabase.from('institutional_settings').update({
        institution_name: g.institutionName,
        institution_code: g.institutionCode,
        academic_year: g.academicYear,
        contact_email: g.contactEmail,
        contact_phone: g.contactPhone,
        min_attendance_percentage: g.attendancePolicyThreshold,
        passing_marks_percentage: g.passingMarksThreshold,
        maintenance_mode: g.maintenanceMode,
        enable_realtime: g.enableRealtime,
        updated_at: new Date().toISOString()
      }).eq('id', '00000000-0000-0000-0000-000000000001');
    } catch {
      // the configuration itself is already saved; institutional_settings is a convenience mirror
    }
  }

  // ===========================================================================
  // 1. GET CONFIGURATION (LIVE, OR LIVE + SHARED DRAFT FOR ADMINISTRATORS)
  // ===========================================================================
  async getMasterConfiguration(options?: { includeDrafts?: boolean }): Promise<MasterSystemConfigState> {
    await this.loadPublished();
    const live = this.published as MasterSystemConfigState;
    if (!options?.includeDrafts) return live;
    await this.loadDraft();
    return this.draft ? this.applySnapshot(live, this.draft) : live;
  }

  // ===========================================================================
  // 2. SAVE DRAFT CONFIGURATION (shared with the other administrators; not live until published)
  // ===========================================================================
  async saveDraft(
    configType: SuperAdminConfigType,
    data: any,
    targetRole: string = 'global',
    author: { email: string; id?: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      author = await this.currentAuthor(author);
      const patch: Snapshot = {};
      if (configType === 'global') patch.globalSettings = data;
      else if (configType === 'theme') patch.theme = data;
      else if (configType === 'role' && targetRole !== 'global') patch.roles = { [targetRole]: data };
      else if (configType === 'dashboard' && targetRole !== 'global') patch.dashboards = { [targetRole]: data };
      else if (configType === 'page' && targetRole !== 'global') patch.pages = { [targetRole]: data };
      else if (configType === 'navigation' && targetRole !== 'global') patch.navigation = { [targetRole]: data };
      else if (configType === 'module') patch.modules = data;
      else if (configType === 'feature') patch.features = data;
      else return { success: false, error: `Unsupported configuration type "${configType}".` };

      const { data: merged, error } = await supabase.rpc('app_settings_draft_merge' as any, { p_key: SETTING_KEY, p_patch: patch as any });
      if (error) throw error;
      this.draft = merged as Snapshot;

      await this.logAuditAction({
        user_email: author.email, user_role: 'admin', action: 'save_draft',
        entity_type: configType, entity_id: targetRole,
        new_values: { data, timestamp: new Date().toISOString() }
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to save draft' };
    }
  }

  // ===========================================================================
  // 3. PUBLISH CONFIGURATION (VALIDATE, VERSION & DEPLOY LIVE FOR EVERYONE)
  // ===========================================================================
  async publishConfiguration(
    author: { email: string; id?: string },
    changeSummary: string
  ): Promise<{ success: boolean; release?: ConfigurationRelease; error?: string }> {
    try {
      author = await this.currentAuthor(author);
      const currentConfig = await this.getMasterConfiguration({ includeDrafts: true });

      const validation = this.validateConfiguration(currentConfig);
      if (!validation.isValid) {
        return { success: false, error: `Validation Failed: ${validation.errors.join(' • ')}` };
      }

      const summary = changeSummary || 'Routine institutional configuration update.';
      // The WHOLE configuration is published (previously dashboards, pages, navigation, permissions, forms,
      // workflows and notifications were saved as drafts but silently dropped on publish).
      const { data, error } = await supabase.rpc('app_settings_publish' as any, {
        p_key: SETTING_KEY, p_value: this.strip(currentConfig) as any, p_summary: summary
      });
      if (error) throw error;
      const version = (data as any).version as number;
      const releaseVersionStr = `v1.${version}.0`;

      const release: ConfigurationRelease = {
        id: `${SETTING_KEY}:${version}`,
        release_version: releaseVersionStr,
        version_number: version,
        title: `Release ${releaseVersionStr}`,
        change_summary: summary,
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

      this.published = { ...currentConfig, activeReleaseVersion: releaseVersionStr, lastUpdated: new Date().toISOString() };
      this.publishedVersion = version;
      this.publishedLoadedAt = Date.now();
      this.draft = null;
      await this.syncInstitutionalSettings(currentConfig.globalSettings);
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('system_config_published'));

      return { success: true, release };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to publish configuration.' };
    }
  }

  // ===========================================================================
  // 4. GET RELEASES (append-only history in the database)
  // ===========================================================================
  async getReleases(): Promise<ConfigurationRelease[]> {
    try {
      const { data, error } = await supabase.from('app_setting_versions' as any)
        .select('*').eq('key', SETTING_KEY).order('version', { ascending: false }).limit(50);
      if (error) throw error;
      await this.loadPublished();
      this.releaseHistory = ((data as any[]) || []).map((row) => {
        const v = row.value || {};
        return {
          id: row.id,
          release_version: `v1.${row.version}.0`,
          version_number: row.version,
          title: row.kind === 'rollback' ? `Rollback to v1.${row.rolled_back_to}.0` : `Release v1.${row.version}.0`,
          change_summary: row.summary || 'Administrative configuration release',
          author_id: row.published_by || undefined,
          author_email: row.published_by_email || '',
          snapshot: {
            roles: Object.values(v.roles || {}) as RoleCustomConfig[],
            modules: v.modules || [], features: v.features || [],
            globalSettings: v.globalSettings, theme: v.theme, publishedAt: row.created_at
          },
          is_active: row.version === this.publishedVersion,
          created_at: row.created_at
        } as ConfigurationRelease;
      });
    } catch (err) {
      console.warn('Failed to load release history:', err);
    }
    return this.releaseHistory;
  }

  // ===========================================================================
  // 5. ROLLBACK CONFIGURATION (publishes the old release again as a NEW release; history is kept)
  // ===========================================================================
  async rollbackConfiguration(
    versionNumber: number,
    author: { email: string; id?: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      author = await this.currentAuthor(author);
      const { data, error } = await supabase.rpc('app_settings_rollback' as any, {
        p_key: SETTING_KEY, p_version: versionNumber, p_reason: `Rolled back by ${author.email}`
      });
      if (error) throw error;
      if (!(data as any)?.success) return { success: false, error: (data as any)?.error || `Release #${versionNumber} not found.` };
      await this.loadPublished(true);
      this.draft = null;
      if (this.published) await this.syncInstitutionalSettings(this.published.globalSettings);
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('system_config_published'));
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
      author = await this.currentAuthor(author);
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
      author = await this.currentAuthor(author);
      const parsed = JSON.parse(backupJson);
      if (!parsed.config || !parsed.config.roles || !parsed.config.globalSettings) {
        return { success: false, error: 'Invalid backup structure. Required configuration keys missing.' };
      }
      // A restored backup becomes the shared DRAFT: it only goes live when an administrator publishes it.
      const ok = await this.saveMasterConfiguration(parsed.config);
      if (!ok) return { success: false, error: 'The backup could not be saved as a draft.' };

      await this.logAuditAction({
        user_email: author.email, user_role: 'admin', action: 'restore_backup', entity_type: 'backup',
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
  // 9. SAVE FULL MASTER CONFIGURATION AS THE SHARED DRAFT (goes live only on publish)
  // ===========================================================================
  async saveMasterConfiguration(config: MasterSystemConfigState): Promise<boolean> {
    try {
      const stripped = this.strip(config);
      const { error } = await supabase.rpc('app_settings_draft_save' as any, { p_key: SETTING_KEY, p_value: stripped as any });
      if (error) throw error;
      this.draft = stripped;
      return true;
    } catch (err) {
      console.warn('Could not save the configuration draft:', err);
      return false;
    }
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
