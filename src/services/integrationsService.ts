import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export interface FieldDef { key: string; label: string; required: boolean; help?: string; type?: 'text' | 'email' | 'tel' | 'number' }
export interface ProviderDef { id: string; label: string; docs?: string; publicFields: FieldDef[]; secretFields: FieldDef[] }
export type Catalog = Record<string, { label: string; help: string; providers: ProviderDef[] }>;
export interface IntegrationItem { kind: string; provider: string; enabled: boolean; public_config: Record<string, string>; secret_keys: string[]; updated_at: string; last_test_at: string | null; last_test_ok: boolean | null; last_test_message: string | null }

async function call<T = any>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await sb.functions.invoke('integrations-admin', { body });
  if (error) {
    let msg = error.message as string;
    try { const j = await error.context?.json?.(); if (j?.error) msg = j.error; } catch { /* keep generic message */ }
    throw new Error(msg || 'The request failed.');
  }
  return data as T;
}

export const integrationsService = {
  catalog: () => call<{ catalog: Catalog; items: IntegrationItem[]; encryption_ready: boolean }>({ action: 'catalog' }),
  save: (kind: string, provider: string, enabled: boolean, publicConfig: Record<string, string>, secrets: Record<string, string>) =>
    call({ action: 'save', kind, provider, enabled, public_config: publicConfig, secrets }),
  test: (kind: string, to?: string) => call<{ success: boolean; message: string }>({ action: 'test', kind, to }),
  clear: (kind: string) => call({ action: 'clear', kind }),
  webhookUrl: (): string => `${(sb.supabaseUrl as string) || ''}/functions/v1/payments-webhook`,
};
