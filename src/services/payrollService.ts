import { supabase } from '@/lib/supabase';

const sb: any = supabase;
const call = async (fn: string, args: Record<string, unknown>) => {
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'The server refused the request.');
  return data;
};

export interface PayrollSettings { configured: boolean; epf_rate_pct: number; epf_wage_ceiling: number | null; esi_rate_pct: number; esi_gross_limit: number | null; professional_tax_monthly: number; lop_leave_types: string[] }

export const payrollService = {
  async settings(): Promise<PayrollSettings | null> {
    const { data, error } = await sb.from('payroll_settings').select('*').eq('id', true).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  },
  configure: (s: { epf: number; epfCeiling: number | null; esi: number; esiLimit: number | null; pt: number }) =>
    call('payroll_configure', { p_epf_rate: s.epf, p_epf_ceiling: s.epfCeiling, p_esi_rate: s.esi, p_esi_limit: s.esiLimit, p_pt: s.pt }),
  createRun: (month: string) => call('payroll_run_create', { p_month: month }),
  approve: (run: string) => call('payroll_run_approve', { p_run: run }),
  disburse: (run: string, reference: string) => call('payroll_run_disburse', { p_run: run, p_reference: reference }),
  cancel: (run: string, reason: string) => call('payroll_run_cancel', { p_run: run, p_reason: reason }),
  async bankRows(userIds: string[]): Promise<Record<string, { bank_name: string | null; bank_account_no: string | null; bank_ifsc: string | null; pan_number: string | null; pf_uan_number: string | null }>> {
    const { data, error } = await sb.from('staff_service_records').select('user_id, bank_name, bank_account_no, bank_ifsc, pan_number, pf_uan_number').in('user_id', userIds);
    if (error) throw new Error(error.message);
    return Object.fromEntries((data || []).map((r: any) => [r.user_id, r]));
  },
};
