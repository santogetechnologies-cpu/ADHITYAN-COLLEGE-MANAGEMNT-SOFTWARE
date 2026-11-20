import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useCollege } from './CollegeContext';
import { DEFAULT_PRIMARY_COLLEGE } from '@/services/multiCollegeService';
import { visualCustomizationService } from '@/services/visualCustomizationService';
import { 
  CollegeRoleVisualCustomization, 
  ContentOverride, 
  InjectedComponent, 
  FormCustomizationConfig, 
  FormFieldDefinition 
} from '@/types/visualCustomizer.types';
import { toast } from 'sonner';

interface VisualCustomizerContextType {
  isCustomizerMode: boolean;
  setIsCustomizerMode: (val: boolean) => void;
  collegeId: string;
  roleKey: string;
  setCustomizingRole: (role: string) => void;
  customization: CollegeRoleVisualCustomization | null;
  getContent: (id: string, defaultText: string) => { text: string; styling?: any; isHidden?: boolean };
  updateContent: (id: string, text: string, styling?: any) => Promise<void>;
  hideContent: (id: string) => Promise<void>;
  getInjectedComponents: (zoneId: string) => InjectedComponent[];
  addInjectedComponent: (zoneId: string, comp: Omit<InjectedComponent, 'id' | 'zoneId' | 'order'>) => Promise<void>;
  removeInjectedComponent: (zoneId: string, componentId: string) => Promise<void>;
  getFormConfig: (formId: string) => FormCustomizationConfig;
  addFormField: (formId: string, field: Omit<FormFieldDefinition, 'id' | 'formId' | 'order'>) => Promise<void>;
  updateFormField: (formId: string, fieldId: string, updates: Partial<FormFieldDefinition>) => Promise<void>;
  removeFormField: (formId: string, fieldId: string) => Promise<void>;
  saveFormData: (formId: string, recordId: string, data: Record<string, any>) => Promise<void>;
  refreshCustomizations: () => Promise<void>;
}

const VisualCustomizerContext = createContext<VisualCustomizerContextType | undefined>(undefined);

export function VisualCustomizerProvider({ 
  children,
  initialRole,
  forcedCustomizerMode
}: { 
  children: React.ReactNode;
  initialRole?: string;
  forcedCustomizerMode?: boolean;
}) {
  const { user } = useAuth();
  const { currentCollege } = useCollege();
  const activeCollege = currentCollege || DEFAULT_PRIMARY_COLLEGE;

  // Resolve role: either forced or initial or user's role or 'student'
  const [roleKey, setRoleKey] = useState<string>(initialRole || user?.role || 'student');
  const [isCustomizerMode, setIsCustomizerMode] = useState<boolean>(
    forcedCustomizerMode !== undefined ? forcedCustomizerMode : false
  );

  const [customization, setCustomization] = useState<CollegeRoleVisualCustomization | null>(null);

  // Sync roleKey if initialRole prop changes
  useEffect(() => {
    if (initialRole && initialRole !== roleKey) {
      setRoleKey(initialRole);
    }
  }, [initialRole]);

  // Sync isCustomizerMode if forcedCustomizerMode changes
  useEffect(() => {
    if (forcedCustomizerMode !== undefined) {
      setIsCustomizerMode(forcedCustomizerMode);
    }
  }, [forcedCustomizerMode]);

  const loadData = useCallback(async () => {
    if (!activeCollege?.id || !roleKey) return;
    try {
      const data = await visualCustomizationService.getCustomizations(activeCollege.id, roleKey);
      setCustomization(data);
    } catch (err) {
      console.warn('VisualCustomizerContext load error:', err);
    }
  }, [activeCollege?.id, roleKey]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Listen for cross-tab or component updates
  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.collegeId === activeCollege?.id && e.detail?.roleKey === roleKey) {
        loadData();
      }
    };
    window.addEventListener('visual_customization_updated', handler);
    return () => window.removeEventListener('visual_customization_updated', handler);
  }, [activeCollege?.id, roleKey, loadData]);

  // 1. Content Overrides
  const getContent = (id: string, defaultText: string) => {
    const override = customization?.contentOverrides?.[id];
    if (override) {
      return {
        text: override.text,
        styling: override.styling,
        isHidden: override.isHidden
      };
    }
    return { text: defaultText, isHidden: false };
  };

  const updateContent = async (id: string, text: string, styling?: any) => {
    if (!customization) return;
    const nextOverrides = {
      ...customization.contentOverrides,
      [id]: {
        id,
        text,
        styling,
        isHidden: false,
        updatedAt: new Date().toISOString()
      }
    };

    const nextCustomization: CollegeRoleVisualCustomization = {
      ...customization,
      contentOverrides: nextOverrides
    };

    setCustomization(nextCustomization);
    await visualCustomizationService.saveCustomizations(activeCollege.id, roleKey, nextCustomization);
    toast.success('Text updated and saved for all college students!');
  };

  const hideContent = async (id: string) => {
    if (!customization) return;
    const existing = customization.contentOverrides[id] || { id, text: '' };
    const nextOverrides = {
      ...customization.contentOverrides,
      [id]: {
        ...existing,
        isHidden: true,
        updatedAt: new Date().toISOString()
      }
    };

    const nextCustomization: CollegeRoleVisualCustomization = {
      ...customization,
      contentOverrides: nextOverrides
    };

    setCustomization(nextCustomization);
    await visualCustomizationService.saveCustomizations(activeCollege.id, roleKey, nextCustomization);
    toast.success('Element hidden from view');
  };

  // 2. Injected Components
  const getInjectedComponents = (zoneId: string): InjectedComponent[] => {
    return customization?.injectedComponents?.[zoneId] || [];
  };

  const addInjectedComponent = async (
    zoneId: string, 
    comp: Omit<InjectedComponent, 'id' | 'zoneId' | 'order'>
  ) => {
    if (!customization) return;
    const currentList = customization.injectedComponents[zoneId] || [];
    const newComp: InjectedComponent = {
      ...comp,
      id: `comp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      zoneId,
      order: currentList.length,
      updatedAt: new Date().toISOString()
    };

    const nextCustomization: CollegeRoleVisualCustomization = {
      ...customization,
      injectedComponents: {
        ...customization.injectedComponents,
        [zoneId]: [...currentList, newComp]
      }
    };

    setCustomization(nextCustomization);
    await visualCustomizationService.saveCustomizations(activeCollege.id, roleKey, nextCustomization);
    toast.success('Component added to portal!');
  };

  const removeInjectedComponent = async (zoneId: string, componentId: string) => {
    if (!customization) return;
    const currentList = customization.injectedComponents[zoneId] || [];
    const nextList = currentList.filter(c => c.id !== componentId);

    const nextCustomization: CollegeRoleVisualCustomization = {
      ...customization,
      injectedComponents: {
        ...customization.injectedComponents,
        [zoneId]: nextList
      }
    };

    setCustomization(nextCustomization);
    await visualCustomizationService.saveCustomizations(activeCollege.id, roleKey, nextCustomization);
    toast.success('Component removed');
  };

  // 3. Form Customization & Dynamic Fields
  const getFormConfig = (formId: string): FormCustomizationConfig => {
    return customization?.formCustomizations?.[formId] || {
      formId,
      customFields: [],
      hiddenDefaultFieldKeys: []
    };
  };

  const addFormField = async (
    formId: string, 
    field: Omit<FormFieldDefinition, 'id' | 'formId' | 'order'>
  ) => {
    if (!customization) return;
    const currentCfg = getFormConfig(formId);
    const newField: FormFieldDefinition = {
      ...field,
      id: `fld_${Date.now()}_${field.key}`,
      formId,
      order: currentCfg.customFields.length,
      updatedAt: new Date().toISOString()
    };

    const nextCustomization: CollegeRoleVisualCustomization = {
      ...customization,
      formCustomizations: {
        ...customization.formCustomizations,
        [formId]: {
          ...currentCfg,
          customFields: [...currentCfg.customFields, newField],
          updatedAt: new Date().toISOString()
        }
      }
    };

    setCustomization(nextCustomization);
    await visualCustomizationService.saveCustomizations(activeCollege.id, roleKey, nextCustomization);
    toast.success(`Field "${field.label}" added to form schema!`);
  };

  const updateFormField = async (
    formId: string, 
    fieldId: string, 
    updates: Partial<FormFieldDefinition>
  ) => {
    if (!customization) return;
    const currentCfg = getFormConfig(formId);
    const nextFields = currentCfg.customFields.map(f => f.id === fieldId ? { ...f, ...updates } : f);

    const nextCustomization: CollegeRoleVisualCustomization = {
      ...customization,
      formCustomizations: {
        ...customization.formCustomizations,
        [formId]: {
          ...currentCfg,
          customFields: nextFields,
          updatedAt: new Date().toISOString()
        }
      }
    };

    setCustomization(nextCustomization);
    await visualCustomizationService.saveCustomizations(activeCollege.id, roleKey, nextCustomization);
    toast.success('Form field updated');
  };

  const removeFormField = async (formId: string, fieldId: string) => {
    if (!customization) return;
    const currentCfg = getFormConfig(formId);
    const nextFields = currentCfg.customFields.filter(f => f.id !== fieldId);

    const nextCustomization: CollegeRoleVisualCustomization = {
      ...customization,
      formCustomizations: {
        ...customization.formCustomizations,
        [formId]: {
          ...currentCfg,
          customFields: nextFields,
          updatedAt: new Date().toISOString()
        }
      }
    };

    setCustomization(nextCustomization);
    await visualCustomizationService.saveCustomizations(activeCollege.id, roleKey, nextCustomization);
    toast.success('Field removed from form');
  };

  const saveFormData = async (formId: string, recordId: string, data: Record<string, any>) => {
    const tableName = formId === 'student_registration' ? 'admission_document_verifications' :
                      formId === 'student_profile' ? 'profiles' :
                      'student_complaints';
    await visualCustomizationService.saveRecordCustomFields(tableName, recordId, data);
  };

  return (
    <VisualCustomizerContext.Provider value={{
      isCustomizerMode,
      setIsCustomizerMode,
      collegeId: activeCollege.id,
      roleKey,
      setCustomizingRole: setRoleKey,
      customization,
      getContent,
      updateContent,
      hideContent,
      getInjectedComponents,
      addInjectedComponent,
      removeInjectedComponent,
      getFormConfig,
      addFormField,
      updateFormField,
      removeFormField,
      saveFormData,
      refreshCustomizations: loadData
    }}>
      {children}
    </VisualCustomizerContext.Provider>
  );
}

export function useVisualCustomizer() {
  const context = useContext(VisualCustomizerContext);
  if (!context) {
    // Graceful fallback if component is rendered outside provider
    return {
      isCustomizerMode: false,
      setIsCustomizerMode: () => {},
      collegeId: '',
      roleKey: '',
      setCustomizingRole: () => {},
      customization: null,
      getContent: (_id: string, defaultText: string) => ({ text: defaultText, isHidden: false }),
      updateContent: async () => {},
      hideContent: async () => {},
      getInjectedComponents: () => [],
      addInjectedComponent: async () => {},
      removeInjectedComponent: async () => {},
      getFormConfig: (formId: string) => ({ formId, customFields: [], hiddenDefaultFieldKeys: [] }),
      addFormField: async () => {},
      updateFormField: async () => {},
      removeFormField: async () => {},
      saveFormData: async () => {},
      refreshCustomizations: async () => {}
    };
  }
  return context;
}
