/** The single institution this deployment serves (name and contact details come from Settings → institutional_settings). */
export type InstitutionType = 'Paramedical' | 'Medical' | 'Engineering' | 'Arts & Science' | 'Multi-Disciplinary';

export interface College {
  id: string;
  name: string;
  code: string;
  logo_url?: string;
  institution_type: InstitutionType;
  contact_email: string;
  contact_phone?: string;
  address?: string;
}

export const INSTITUTION_ID = '11111111-1111-1111-1111-111111111111';
