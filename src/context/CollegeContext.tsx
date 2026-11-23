import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { College, INSTITUTION_ID } from '@/types/institution.types';
import { MasterSystemConfigState } from '@/types/superAdmin.types';
import { buildInitialMasterConfigState } from '@/services/superAdminDefaults';
import { superAdminService } from '@/services/superAdminService';
import { collegeDataService } from '@/services/collegeDataService';
import { supabase } from '@/lib/supabase';
import { setInstitutionName } from '@/lib/institution';
import { useAuth } from './AuthContext';

/**
 * One institution per deployment. This context only exposes that institution's profile (from Settings) and the
 * published ERP configuration; there is no tenant switching.
 */
interface CollegeContextType {
  currentCollege: College;
  collegeConfig: MasterSystemConfigState;
  isModuleEnabled: (moduleId: string) => boolean;
  isFeatureEnabled: (featureId: string) => boolean;
  hasPermission: (action: string, resource: string) => boolean;
  reloadCollegeData: () => Promise<void>;
  isLoading: boolean;
}

const PLACEHOLDER: College = { id: INSTITUTION_ID, name: 'Your Institution', code: 'INST', institution_type: 'Paramedical', contact_email: '' };
const CollegeContext = createContext<CollegeContextType | undefined>(undefined);

export function CollegeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentCollege, setCurrentCollege] = useState<College>(PLACEHOLDER);
  const [collegeConfig, setCollegeConfig] = useState<MasterSystemConfigState>(buildInitialMasterConfigState());
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const { data } = await (supabase as any).from('institutional_settings').select('institution_name, institution_code, contact_email, contact_phone, address').limit(1).maybeSingle();
      if (data) {
        const name = (data.institution_name || '').trim() || PLACEHOLDER.name;
        setCurrentCollege({ ...PLACEHOLDER, name, code: data.institution_code || PLACEHOLDER.code, contact_email: data.contact_email || '', contact_phone: data.contact_phone || undefined, address: data.address || undefined });
        setInstitutionName(name);
      }
      collegeDataService.setCollegeContext(INSTITUTION_ID);
      try { setCollegeConfig(await superAdminService.getMasterConfiguration({ includeDrafts: false })); } catch { /* keep defaults */ }
    } catch (err) {
      console.error('Failed to load institution profile:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { void loadData(); }, [loadData]);

  const isModuleEnabled = (moduleId: string): boolean => { const m = collegeConfig.modules.find(x => x.id === moduleId); return m ? !!m.enabled : true; };
  const isFeatureEnabled = (featureId: string): boolean => { const f = collegeConfig.features.find(x => x.id === featureId); return f ? !!f.enabled : true; };
  const hasPermission = (action: string, resource: string): boolean => {
    const role = user?.role || 'student';
    if (role === 'admin') return true;
    const rule = collegeConfig.permissions.find(p => p.role === role && p.resource === resource);
    return !rule || rule.actions.includes(action as any) || rule.actions.includes('manage');
  };

  return (
    <CollegeContext.Provider value={{ currentCollege, collegeConfig, isModuleEnabled, isFeatureEnabled, hasPermission, reloadCollegeData: loadData, isLoading }}>
      {children}
    </CollegeContext.Provider>
  );
}

export function useCollege() {
  const context = useContext(CollegeContext);
  if (!context) throw new Error('useCollege must be used within a CollegeProvider');
  return context;
}
