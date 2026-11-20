import React, { createContext, useContext, ReactNode } from 'react';

export interface InstitutionalProfile {
  id: string;
  name: string;
  code: string;
  academicYear: string;
  contactEmail: string;
  contactPhone: string;
}

export const ADHITYAN_INSTITUTION: InstitutionalProfile = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Adhityan College of Allied Health Sciences',
  code: 'ADH-AHS-2025',
  academicYear: '2025-2026',
  contactEmail: 'admin@adhithyan.edu',
  contactPhone: '+91 (044) 2876-4100'
};

interface CollegeContextType {
  currentCollege: InstitutionalProfile;
  isModuleEnabled: (moduleId: string) => boolean;
  isFeatureEnabled: (featureId: string) => boolean;
  hasPermission: (action: string, resource: string) => boolean;
  isLoading: boolean;
}

const CollegeContext = createContext<CollegeContextType>({
  currentCollege: ADHITYAN_INSTITUTION,
  isModuleEnabled: () => true,
  isFeatureEnabled: () => true,
  hasPermission: () => true,
  isLoading: false,
});

export function CollegeProvider({ children }: { children: ReactNode }) {
  const value: CollegeContextType = {
    currentCollege: ADHITYAN_INSTITUTION,
    isModuleEnabled: () => true,
    isFeatureEnabled: () => true,
    hasPermission: () => true,
    isLoading: false,
  };

  return (
    <CollegeContext.Provider value={value}>
      {children}
    </CollegeContext.Provider>
  );
}

export function useCollege() {
  return useContext(CollegeContext);
}
