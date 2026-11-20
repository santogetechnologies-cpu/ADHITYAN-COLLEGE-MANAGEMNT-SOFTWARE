export interface ContentOverride {
  id: string;
  text: string;
  styling?: {
    fontSize?: string;
    fontWeight?: string;
    color?: string;
    textAlign?: 'left' | 'center' | 'right';
    letterSpacing?: string;
  };
  isHidden?: boolean;
  updatedAt?: string;
}

export interface InjectedComponent {
  id: string;
  zoneId: string;
  type: 'banner' | 'stat_card' | 'action_button' | 'text_block' | 'section';
  title?: string;
  content?: string;
  theme?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'blue' | 'slate';
  iconName?: string;
  statValue?: string;
  statChange?: string;
  buttonLabel?: string;
  buttonAction?: string; // target tab key or URL
  order: number;
  updatedAt?: string;
}

export type CustomFieldType = 'text' | 'number' | 'dropdown' | 'date' | 'checkbox' | 'file' | 'textarea';

export interface FormFieldDefinition {
  id: string;
  formId: string;
  label: string;
  key: string;
  type: CustomFieldType;
  placeholder?: string;
  options?: string[];
  required: boolean;
  helpText?: string;
  order: number;
  defaultValue?: any;
  updatedAt?: string;
}

export interface FormCustomizationConfig {
  formId: string;
  formTitle?: string;
  customFields: FormFieldDefinition[];
  hiddenDefaultFieldKeys: string[];
  fieldOverrides?: Record<string, { label?: string; placeholder?: string; required?: boolean }>;
  updatedAt?: string;
}

export interface CollegeRoleVisualCustomization {
  collegeId: string;
  roleKey: string;
  contentOverrides: Record<string, ContentOverride>;
  injectedComponents: Record<string, InjectedComponent[]>;
  formCustomizations: Record<string, FormCustomizationConfig>;
  updatedAt: string;
  version: string;
}
