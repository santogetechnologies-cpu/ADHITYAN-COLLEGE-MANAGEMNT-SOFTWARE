import { supabase } from '../lib/supabase';
import { 
  CollegeRoleVisualCustomization, 
  ContentOverride, 
  InjectedComponent, 
  FormCustomizationConfig,
  FormFieldDefinition 
} from '../types/visualCustomizer.types';

const VISUAL_STORAGE_KEY_PREFIX = 'adhityan_visual_customization_';

class VisualCustomizationService {
  private cache: Map<string, CollegeRoleVisualCustomization> = new Map();

  private getCacheKey(collegeId: string, roleKey: string): string {
    return `${collegeId}_${roleKey}`;
  }

  /**
   * Retrieves visual customizations for a given college and role.
   * Strict tenant isolation: collegeId must match.
   */
  async getCustomizations(collegeId: string, roleKey: string): Promise<CollegeRoleVisualCustomization> {
    const key = this.getCacheKey(collegeId, roleKey);
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    // Try LocalStorage cache
    try {
      const stored = localStorage.getItem(`${VISUAL_STORAGE_KEY_PREFIX}${key}`);
      if (stored) {
        const parsed: CollegeRoleVisualCustomization = JSON.parse(stored);
        this.cache.set(key, parsed);
        return parsed;
      }
    } catch {}

    // Try remote database fetch
    try {
      const settingKey = `visual_customization_${roleKey}`;
      const { data, error } = await supabase
        .from('institutional_settings')
        .select('*')
        .eq('key', settingKey)
        .maybeSingle();

      if (data && data.value) {
        const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        if (parsed.collegeId === collegeId) {
          this.cache.set(key, parsed);
          return parsed;
        }
      }
    } catch (err) {
      console.warn('VisualCustomizationService DB fetch note:', err);
    }

    // Default baseline empty customization
    const baseline: CollegeRoleVisualCustomization = {
      collegeId,
      roleKey,
      contentOverrides: {},
      injectedComponents: {},
      formCustomizations: {},
      updatedAt: new Date().toISOString(),
      version: 'v1.0.0'
    };

    this.cache.set(key, baseline);
    return baseline;
  }

  /**
   * Persists visual customizations for a given college and role.
   */
  async saveCustomizations(
    collegeId: string, 
    roleKey: string, 
    customization: CollegeRoleVisualCustomization
  ): Promise<void> {
    const key = this.getCacheKey(collegeId, roleKey);
    const payload: CollegeRoleVisualCustomization = {
      ...customization,
      collegeId,
      roleKey,
      updatedAt: new Date().toISOString()
    };

    // Update memory
    this.cache.set(key, payload);

    // Update LocalStorage
    try {
      localStorage.setItem(`${VISUAL_STORAGE_KEY_PREFIX}${key}`, JSON.stringify(payload));
    } catch {}

    // Persist to database institutional_settings
    try {
      const settingKey = `visual_customization_${roleKey}`;
      await supabase
        .from('institutional_settings')
        .upsert({
          key: settingKey,
          value: JSON.stringify(payload),
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
    } catch (dbErr) {
      console.warn('VisualCustomizationService remote save fallback:', dbErr);
    }

    // Broadcast update across active browser windows
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('visual_customization_updated', {
        detail: { collegeId, roleKey, timestamp: Date.now() }
      }));
    }
  }

  /**
   * Persists submitted custom fields for any entity record (student profile, complaint, admission).
   */
  async saveRecordCustomFields(
    tableName: string, 
    recordId: string, 
    customFields: Record<string, any>
  ): Promise<void> {
    if (!recordId || Object.keys(customFields).length === 0) return;

    try {
      if (tableName === 'profiles') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('preferences')
          .eq('id', recordId)
          .maybeSingle();

        const updatedPreferences = {
          ...(profile?.preferences || {}),
          custom_fields: {
            ...((profile?.preferences as any)?.custom_fields || {}),
            ...customFields
          }
        };

        await supabase
          .from('profiles')
          .update({ preferences: updatedPreferences })
          .eq('id', recordId);
      } else if (tableName === 'admission_document_verifications') {
        const { data: record } = await supabase
          .from('admission_document_verifications')
          .select('*')
          .eq('id', recordId)
          .maybeSingle();

        if (record) {
          const updated = {
            ...record,
            custom_fields: {
              ...(record.custom_fields || {}),
              ...customFields
            }
          };
          await supabase
            .from('admission_document_verifications')
            .update(updated)
            .eq('id', recordId);
        }
      }
    } catch (err) {
      console.warn('saveRecordCustomFields note:', err);
    }
  }
}

export const visualCustomizationService = new VisualCustomizationService();
