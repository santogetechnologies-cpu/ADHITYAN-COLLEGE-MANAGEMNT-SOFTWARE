import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { College } from '@/types/multiCollege.types';
import { MasterSystemConfigState } from '@/types/superAdmin.types';
import { multiCollegeService, DEFAULT_PRIMARY_COLLEGE } from '@/services/multiCollegeService';
import { buildInitialMasterConfigState } from '@/services/superAdminDefaults';
import { collegeDataService } from '@/services/collegeDataService';
import { toast } from 'sonner';

interface CollegeContextType {
  currentCollege: College;
  collegesList: College[];
  isPlatformSuperAdmin: boolean;
  collegeConfig: MasterSystemConfigState;
  isModuleEnabled: (moduleId: string) => boolean;
  isFeatureEnabled: (featureId: string) => boolean;
  hasPermission: (action: string, resource: string) => boolean;
  switchCollege: (collegeId: string) => Promise<boolean>;
  reloadCollegeData: () => Promise<void>;
  isLoading: boolean;
}

const CollegeContext = createContext<CollegeContextType | undefined>(undefined);

export function CollegeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const isPlatformSuperAdmin = user?.role === 'platform_super_admin' || user?.email === 'superadmin@platform.adithyan.edu';
  const [currentCollege, setCurrentCollege] = useState<College>(DEFAULT_PRIMARY_COLLEGE);
  const [collegesList, setCollegesList] = useState<College[]>([DEFAULT_PRIMARY_COLLEGE]);
  const [collegeConfig, setCollegeConfig] = useState<MasterSystemConfigState>(buildInitialMasterConfigState());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load colleges and resolve active tenant
  const loadData = async () => {
    setIsLoading(true);
    try {
      const list = await multiCollegeService.listColleges();
      setCollegesList(list);

      // Determine active college:
      // If user has an explicit college_id, lock to their college
      let targetCollege = DEFAULT_PRIMARY_COLLEGE;

      if (!isPlatformSuperAdmin && user?.college_id) {
        const matched = list.find(c => c.id === user.college_id);
        if (matched) targetCollege = matched;
      } else if (isPlatformSuperAdmin) {
        // Platform Super Admin remembers last viewed college or defaults to primary
        const savedTenantId = localStorage.getItem('adhityan_active_tenant_id');
        if (savedTenantId) {
          const matched = list.find(c => c.id === savedTenantId);
          if (matched) targetCollege = matched;
        }
      }

      setCurrentCollege(targetCollege);
      collegeDataService.setCollegeContext(targetCollege.id);
      collegeDataService.getCourses(targetCollege.id).catch(console.warn);

      // Load active college's isolated configuration
      const config = await multiCollegeService.getCollegeConfiguration(targetCollege.id, { includeDrafts: true });
      setCollegeConfig(config);
    } catch (err) {
      console.error('Failed to load college context:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Switch college tenant context (Permitted strictly for Platform Super Admin)
  const switchCollege = async (collegeId: string): Promise<boolean> => {
    if (!isPlatformSuperAdmin) {
      toast.error('Unauthorized: College switching is restricted strictly to Platform Super Admins.');
      return false;
    }

    const target = collegesList.find(c => c.id === collegeId);
    if (!target) {
      toast.error(`Target college "${collegeId}" not found.`);
      return false;
    }

    setCurrentCollege(target);
    localStorage.setItem('adhityan_active_tenant_id', target.id);
    collegeDataService.setCollegeContext(target.id);
    collegeDataService.getCourses(target.id, true).catch(console.warn);

    // Load newly selected college's isolated configuration
    const config = await multiCollegeService.getCollegeConfiguration(target.id, { includeDrafts: true });
    setCollegeConfig(config);

    toast.success(`Switched active context to ${target.name} (${target.code})`);
    return true;
  };

  // Helper check if module is enabled for current college
  const isModuleEnabled = (moduleId: string): boolean => {
    const mod = collegeConfig.modules.find(m => m.id === moduleId);
    return mod ? !!mod.enabled : true;
  };

  // Helper check if granular feature is enabled for current college
  const isFeatureEnabled = (featureId: string): boolean => {
    const feat = collegeConfig.features.find(f => f.id === featureId);
    return feat ? !!feat.enabled : true;
  };

  // Helper check if current user role has permission on resource
  const hasPermission = (action: string, resource: string): boolean => {
    if (isPlatformSuperAdmin) return true;
    const userRole = user?.role || 'student';
    if (userRole === 'admin') return true;

    const rule = collegeConfig.permissions.find(p => p.role === userRole && p.resource === resource);
    if (!rule) return true; // Default permissive if not explicitly restricted
    return rule.actions.includes(action as any) || rule.actions.includes('manage');
  };

  return (
    <CollegeContext.Provider
      value={{
        currentCollege,
        collegesList,
        isPlatformSuperAdmin,
        collegeConfig,
        isModuleEnabled,
        isFeatureEnabled,
        hasPermission,
        switchCollege,
        reloadCollegeData: loadData,
        isLoading
      }}
    >
      {children}
    </CollegeContext.Provider>
  );
}

export function useCollege() {
  const context = useContext(CollegeContext);
  if (!context) {
    throw new Error('useCollege must be used within a CollegeProvider');
  }
  return context;
}
