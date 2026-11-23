import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Download, Loader2, Printer, Settings2 } from 'lucide-react';
import { db } from '@/services/supabase/database';
import { payrollService, type PayrollSettings } from '@/services/payrollService';
import { StaffPayrollRun, StaffPayrollItem } from '@/types/database.types';
import { PrintablePayslip } from './PrintablePayslip';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { exportToCSV } from '@/lib/exportUtils';
import { askConfirm, askText } from '@/lib/dialogs';

const inr = (n: number | null | undefined) => `₹ ${Number(n || 0).toLocaleString('en-IN')}`;
const STATUS_STYLE: Record<string, string> = {
  Draft: 'bg-slate-100 text-slate-700', Approved: 'bg-blue-100 text-blue-800', Disbursed: 'bg-emerald-100 text-emerald-800', Cancelled: 'bg-rose-100 text-rose-700',
};
const lastMonths = () => {
  const out: string[] = []; const d = new Date(); d.setDate(1);
  for (let i = 0; i < 12; i++) { out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`); d.setMonth(d.getMonth() - 1); }
  return out;
};

export function StaffPayrollEngine() {
  const { user } = useAuth();
  const { toast } = useToast();
  const role = user?.role ?? '';
  const canPrepare = ['admin', 'hr_manager', 'finance_manager'].includes(role);
  const canApprove = ['admin', 'principal', 'finance_manager'].includes(role);
  const canPay = ['admin', 'finance_manager', 'accountant'].includes(role);

  const [runs, setRuns] = useState<StaffPayrollRun[]>([]);
  const [selected, setSelected] = useState<StaffPayrollRun | null>(null);
  const [items, setItems] = useState<StaffPayrollItem[]>([]);
  const [settings, setSettings] = useState<PayrollSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [month, setMonth] = useState(lastMonths()[0]);
  const [slip, setSlip] = useState<StaffPayrollItem | null>(null);
  const [slipBank, setSlipBank] = useState<{ pan_number?: string | null; pf_uan_number?: string | null; bank_account_no?: string | null; bank_ifsc?: string | null } | null>(null);
  const openSlip = async (i: StaffPayrollItem) => {
    setSlipBank(null); setSlip(i);
    if (i.user_id) { try { setSlipBank((await payrollService.bankRows([i.user_id]))[i.user_id] ?? null); } catch { /* not permitted: leave blank */ } }
  };
  const [rulesOpen, setRulesOpen] = useState(false);
  const [rules, setRules] = useState({ epf: '', epfCeiling: '', esi: '', esiLimit: '', pt: '' });

  const loadItems = useCallback(async (run: StaffPayrollRun | null) => {
    setSelected(run);
    setItems(run ? await db.getStaffPayrollItems(run.id) : []);
  }, []);

  const load = useCallback(async (keepId?: string) => {
    try {
      const [r, s] = await Promise.all([db.getStaffPayrollRuns(), payrollService.settings().catch(() => null)]);
      setRuns(r); setSettings(s);
      const pick = r.find((x) => x.id === keepId) ?? r[0] ?? null;
      await loadItems(pick);
    } finally { setLoading(false); }
  }, [loadItems]);
  useEffect(() => { void load(); }, [load]);

  const act = async (fn: () => Promise<any>, ok: string, keep?: string) => {
    setBusy(true);
    try { await fn(); toast({ title: ok }); await load(keep); }
    catch (e: any) { toast({ title: 'Not done', description: e.message, variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  const openRules = () => {
    setRules({ epf: String(settings?.epf_rate_pct ?? ''), epfCeiling: settings?.epf_wage_ceiling != null ? String(settings.epf_wage_ceiling) : '', esi: String(settings?.esi_rate_pct ?? ''), esiLimit: settings?.esi_gross_limit != null ? String(settings.esi_gross_limit) : '', pt: String(settings?.professional_tax_monthly ?? '') });
    setRulesOpen(true);
  };
  const saveRules = () => {
    const n = (v: string) => (v.trim() === '' ? null : Number(v));
    const epf = n(rules.epf), esi = n(rules.esi), pt = n(rules.pt);
    if (epf === null || esi === null || pt === null || [epf, esi, pt].some((x) => !Number.isFinite(x as number) || (x as number) < 0)) {
      return toast({ title: 'Enter EPF %, ESI % and professional tax (use 0 where not applicable)', variant: 'destructive' });
    }
    void act(() => payrollService.configure({ epf: epf!, epfCeiling: n(rules.epfCeiling), esi: esi!, esiLimit: n(rules.esiLimit), pt: pt! }), 'Payroll rules saved').then(() => setRulesOpen(false));
  };

  const exportBank = async () => {
    if (!selected) return;
    try {
      const bank = await payrollService.bankRows(items.map((i) => i.user_id).filter(Boolean) as string[]);
      exportToCSV(`payroll-bank-advice-${selected.month_year.replace(' ', '-')}`, ['Employee code', 'Name', 'Bank', 'Account no.', 'IFSC', 'Net salary'],
        items.map((i) => { const b = i.user_id ? bank[i.user_id] : undefined; return [i.employee_code, i.employee_name, b?.bank_name, b?.bank_account_no, b?.bank_ifsc, i.net_salary]; }));
    } catch (e: any) { toast({ title: 'Could not prepare the bank file', description: e.message, variant: 'destructive' }); }
  };

  const totals = useMemo(() => ({ gross: items.reduce((s, i) => s + Number(i.gross_salary || 0), 0), ded: items.reduce((s, i) => s + Number(i.total_deductions || 0), 0), net: items.reduce((s, i) => s + Number(i.net_salary || 0), 0) }), [items]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-xl font-bold text-slate-900">Payroll</h2><p className="text-xs text-slate-500">Prepared on the server from service records and approved leave. Draft → Approved by finance → Paid (bank reference recorded).</p></div>
        <div className="flex items-center gap-2">
          {canPrepare && <Button variant="outline" size="sm" onClick={openRules}><Settings2 className="w-4 h-4 mr-1" />Payroll rules</Button>}
          {canPrepare && <>
            <Select value={month} onValueChange={setMonth}><SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger><SelectContent>{lastMonths().map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
            <Button size="sm" disabled={busy || !settings?.configured} onClick={() => void act(async () => { const r = await payrollService.createRun(month); return r; }, `Draft payroll prepared for ${month}`)}>Prepare payroll</Button></>}
        </div>
      </div>

      {!settings?.configured && (
        <Card className="border-amber-300 bg-amber-50"><CardContent className="p-4 text-sm text-amber-900 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Payroll rules (EPF, ESI, professional tax) have not been set for this institution, so payroll cannot be prepared.{canPrepare && <Button size="sm" variant="outline" className="ml-2" onClick={openRules}>Set rules</Button>}</CardContent></Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2"><CardTitle className="text-base">Runs</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {runs.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">No payroll runs yet.</p> : runs.map((r) => (
              <button key={r.id} onClick={() => void loadItems(r)} className={`w-full text-left p-3 rounded-lg border ${selected?.id === r.id ? 'border-primary bg-primary/5' : 'hover:bg-slate-50'}`}>
                <div className="flex items-center justify-between"><span className="font-semibold text-sm">{r.month_year}</span><Badge className={STATUS_STYLE[r.status] ?? ''} variant="outline">{r.status}</Badge></div>
                <div className="text-xs text-slate-500 mt-1">{r.total_employees} staff • Net {inr(r.total_net_disbursed)}</div>
              </button>))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><CardTitle className="text-base">{selected ? selected.month_year : 'Select a run'}</CardTitle>
                {selected && <CardDescription>Gross {inr(totals.gross)} • Deductions {inr(totals.ded)} • Net {inr(totals.net)}{(selected as any).payment_reference ? ` • Bank ref ${(selected as any).payment_reference}` : ''}</CardDescription>}</div>
              {selected && <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={exportBank} disabled={!items.length || !['Approved', 'Disbursed'].includes(selected.status)}><Download className="w-4 h-4 mr-1" />Bank advice</Button>
                {canApprove && selected.status === 'Draft' && <Button size="sm" disabled={busy} onClick={() => void act(() => payrollService.approve(selected.id), 'Payroll approved', selected.id)}>Approve</Button>}
                {canPay && selected.status === 'Approved' && <Button size="sm" disabled={busy} onClick={async () => { const ref = await askText('Enter the bank batch or transaction reference after the transfer is made.', { title: 'Mark payroll as paid', required: true, minLength: 3, confirmLabel: 'Mark as paid' }); if (ref) void act(() => payrollService.disburse(selected.id, ref), 'Marked as paid', selected.id); }}>Mark as paid</Button>}
                {canPrepare && ['Draft', 'Approved'].includes(selected.status) && <Button size="sm" variant="outline" disabled={busy} onClick={async () => { const reason = await askText('Reason for cancelling this run', { title: 'Cancel payroll run', required: true, minLength: 3, confirmLabel: 'Cancel run', destructive: true }); if (reason) void act(() => payrollService.cancel(selected.id, reason), 'Run cancelled'); }}>Cancel run</Button>}
              </div>}
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-slate-500 uppercase text-[10px]"><tr className="border-b"><th className="p-2 text-left">Employee</th><th className="p-2 text-right">LOP days</th><th className="p-2 text-right">Gross</th><th className="p-2 text-right">Deductions</th><th className="p-2 text-right">Net</th><th className="p-2" /></tr></thead>
              <tbody>
                {items.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-slate-500">{selected ? 'No lines in this run.' : 'Prepare a payroll run to begin.'}</td></tr> : items.map((i) => (
                  <tr key={i.id} className="border-b last:border-0">
                    <td className="p-2"><div className="font-semibold text-slate-900">{i.employee_name}</div><div className="text-[10px] text-slate-500 font-mono">{i.employee_code} • {i.department}</div></td>
                    <td className="p-2 text-right">{i.lop_days}</td><td className="p-2 text-right font-mono">{inr(i.gross_salary)}</td><td className="p-2 text-right font-mono text-rose-700">-{inr(i.total_deductions)}</td><td className="p-2 text-right font-mono font-bold">{inr(i.net_salary)}</td>
                    <td className="p-2 text-right"><Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => void openSlip(i)}><Printer className="w-3 h-3 mr-1" />Payslip</Button></td>
                  </tr>))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!slip} onOpenChange={(o) => !o && setSlip(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white p-6 rounded-2xl">
          <DialogHeader className="print:hidden"><DialogTitle>Salary slip</DialogTitle></DialogHeader>
          {slip && <PrintablePayslip item={slip} panNumber={slipBank?.pan_number || undefined} uanNumber={slipBank?.pf_uan_number || undefined} bankAccountNo={slipBank?.bank_account_no ? `****${slipBank.bank_account_no.slice(-4)}` : undefined} bankIfsc={slipBank?.bank_ifsc || undefined} onClose={() => setSlip(null)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={rulesOpen} onOpenChange={setRulesOpen}>
        <DialogContent><DialogHeader><DialogTitle>Payroll rules</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">Set these to your institution's actual statutory and policy values. Leave a ceiling/limit empty if it does not apply. Income tax (TDS) and other deductions are entered per employee on the service record.</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>EPF rate (%)</Label><Input value={rules.epf} onChange={(e) => setRules({ ...rules, epf: e.target.value })} /></div>
            <div className="space-y-1"><Label>EPF wage ceiling (₹, optional)</Label><Input value={rules.epfCeiling} onChange={(e) => setRules({ ...rules, epfCeiling: e.target.value })} /></div>
            <div className="space-y-1"><Label>ESI rate (%)</Label><Input value={rules.esi} onChange={(e) => setRules({ ...rules, esi: e.target.value })} /></div>
            <div className="space-y-1"><Label>ESI applies up to gross (₹, optional)</Label><Input value={rules.esiLimit} onChange={(e) => setRules({ ...rules, esiLimit: e.target.value })} /></div>
            <div className="space-y-1"><Label>Professional tax per month (₹)</Label><Input value={rules.pt} onChange={(e) => setRules({ ...rules, pt: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setRulesOpen(false)}>Cancel</Button><Button onClick={saveRules} disabled={busy}>Save rules</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
