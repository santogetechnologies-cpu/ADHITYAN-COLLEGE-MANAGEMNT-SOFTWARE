import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const sb: any = supabase;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export function PaymentSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(false);
  const [examRule, setExamRule] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [recon, setRecon] = useState<{ days: any[]; exceptions: any[] } | null>(null);
  const [counter, setCounter] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [refundFor, setRefundFor] = useState<{ order: any; lines: Array<{ student_fee_id: string; label: string; max: number; amount: string }>; reason: string } | null>(null);
  const [settle, setSettle] = useState<any | null>(null);
  const { user } = useAuth();
  const canRefund = ['admin', 'finance_manager'].includes(user?.role ?? '');

  const load = useCallback(async () => {
    try {
      const [{ data: s }, { data: o }] = await Promise.all([
        sb.from('institutional_settings').select('online_payments_enabled, exam_requires_fee_clearance').limit(1).maybeSingle(),
        sb.from('payment_orders').select('id, amount, status, gateway_payment_id, review_note, failure_reason, created_at, paid_at, payer_role').order('created_at', { ascending: false }).limit(50),
      ]);
      const from = new Date(); from.setDate(from.getDate() - 30);
      const [rc, cp] = await Promise.all([
        sb.rpc('payment_reconciliation', { p_from: isoDay(from), p_to: isoDay(new Date()) }),
        sb.from('fee_payments').select('id, amount, refunded_amount, payment_mode, transaction_reference, status, paid_at, reversal_reason').neq('payment_mode', 'Online_Gateway').order('paid_at', { ascending: false }).limit(15),
      ]);
      setRecon(rc.data?.success ? { days: rc.data.days, exceptions: rc.data.exceptions } : null); setCounter(cp.data || []);
      setOnline(s?.online_payments_enabled === true); setExamRule(s?.exam_requires_fee_clearance === true); setOrders(o || []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const save = async (o: boolean, e: boolean) => {
    const { data, error } = await sb.rpc('payment_flags_set', { p_online: o, p_exam_fee_clearance: e });
    if (error || !data?.success) return toast({ title: 'Not saved', description: error?.message || data?.error, variant: 'destructive' });
    setOnline(o); setExamRule(e); toast({ title: 'Saved' });
  };

  const openRefund = async (o: any) => {
    if (o.status === 'Review') { setRefundFor({ order: o, lines: [], reason: '' }); return; }
    const { data: items } = await sb.from('payment_order_items').select('student_fee_id, amount, student_fee:student_fees(description)').eq('order_id', o.id);
    const { data: pays } = await sb.from('fee_payments').select('student_fee_id, amount, refunded_amount').like('transaction_reference', o.gateway_payment_id || '__none__');
    const lines = (items || []).map((i: any) => { const p = (pays || []).find((x: any) => x.student_fee_id === i.student_fee_id); const left = Number(p?.amount ?? i.amount) - Number(p?.refunded_amount ?? 0);
      return { student_fee_id: i.student_fee_id, label: i.student_fee?.description || 'Fee', max: left, amount: String(left) }; }).filter((l: any) => l.max > 0);
    setRefundFor({ order: o, lines, reason: '' });
  };
  const submitRefund = async () => {
    if (!refundFor) return;
    const { order, lines, reason } = refundFor;
    if (reason.trim().length < 5) return toast({ title: 'Give a reason (at least 5 characters)', variant: 'destructive' });
    const chosen = lines.filter((l) => Number(l.amount) > 0);
    if (order.status !== 'Review' && chosen.length === 0) return toast({ title: 'Enter an amount to refund', variant: 'destructive' });
    if (chosen.some((l) => Number(l.amount) > l.max)) return toast({ title: 'An amount is more than can be refunded', variant: 'destructive' });
    const whole = order.status === 'Review' || chosen.length === lines.length && chosen.every((l) => Number(l.amount) === l.max);
    setBusy(order.id);
    const { data, error } = await supabase.functions.invoke('payments-refund', { body: { order_id: order.id, reason: reason.trim(), items: whole ? undefined : chosen.map((l) => ({ student_fee_id: l.student_fee_id, amount: Number(l.amount) })) } });
    setBusy(null);
    if (error || !data?.success) return toast({ title: 'Refund not completed', description: data?.error || (error as any)?.message, variant: 'destructive' });
    toast({ title: 'Refunded', description: `Gateway refund ${data.gateway_refund_id}` }); setRefundFor(null); await load();
  };
  const importSettlement = async (file: File) => {
    const text = await file.text();
    const rows = text.split(/\r?\n/).filter((l) => l.trim());
    if (rows.length < 2) return toast({ title: 'The file has no rows', variant: 'destructive' });
    const split = (l: string) => { const out: string[] = []; let cur = ''; let q = false; for (const c of l) { if (c === '"') q = !q; else if (c === ',' && !q) { out.push(cur.trim()); cur = ''; } else cur += c; } out.push(cur.trim()); return out; };
    const head = split(rows[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]+/g, '_'));
    const col = (names: string[]) => head.findIndex((h) => names.includes(h));
    const ci = { sid: col(['settlement_id', 'settlement']), pid: col(['payment_id', 'entity_id', 'razorpay_payment_id']), amt: col(['amount', 'credit', 'gross_amount']), fee: col(['fee', 'fees']), tax: col(['tax', 'gst']), at: col(['settled_at', 'settlement_date', 'created_at']) };
    if (ci.sid < 0 || ci.pid < 0 || ci.amt < 0) return toast({ title: 'Columns not recognised', description: 'The file needs settlement id, payment id and amount columns.', variant: 'destructive' });
    const data = rows.slice(1).map(split).filter((r) => r[ci.pid]).map((r) => ({ settlement_id: r[ci.sid], payment_id: r[ci.pid], amount: r[ci.amt], fee: ci.fee >= 0 ? r[ci.fee] : '', tax: ci.tax >= 0 ? r[ci.tax] : '', settled_at: ci.at >= 0 ? r[ci.at] : '' }));
    const res = await sb.rpc('payment_settlement_import', { p_rows: data });
    if (res.error || !res.data?.success) return toast({ title: 'Import failed', description: res.error?.message || res.data?.error, variant: 'destructive' });
    setSettle(res.data); toast({ title: `Imported ${res.data.imported} settlement row(s)` });
  };
  const reverse = async (p: any) => {
    const left = Number(p.amount) - Number(p.refunded_amount || 0);
    const amt = window.prompt(`Amount to reverse (up to ₹${left}). Leave as is to reverse the whole remaining payment:`, String(left));
    if (!amt) return;
    const reason = window.prompt('Reason for reversing this payment (required, e.g. entered against the wrong student):');
    if (!reason || reason.trim().length < 5) return;
    setBusy(p.id);
    const { data, error } = await sb.rpc('fee_payment_reverse', { p_payment: p.id, p_reason: reason.trim(), p_amount: Number(amt) === left ? null : Number(amt) });
    setBusy(null);
    if (error || !data?.success) return toast({ title: 'Not reversed', description: error?.message || data?.error, variant: 'destructive' });
    toast({ title: 'Payment reversed', description: 'The fee is back on the ledger and the receipt is voided. Return any cash separately.' }); await load();
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  const review = orders.filter((o) => o.status === 'Review');
  return (
    <div className="space-y-4">
      <Card><CardHeader><CardTitle className="text-base">Payment rules</CardTitle><CardDescription>Online payment needs the gateway keys set as Edge Function secrets (see the deployment runbook) before it can be switched on.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center justify-between gap-4 text-sm"><span><b>Accept online payments</b><br /><span className="text-xs text-muted-foreground">Students and parents can pay fees by card, UPI or net banking; receipts are issued automatically.</span></span><Switch checked={online} onCheckedChange={(v) => save(v, examRule)} /></label>
          <label className="flex items-center justify-between gap-4 text-sm"><span><b>Fee clearance for examinations</b><br /><span className="text-xs text-muted-foreground">Students with overdue fees are withheld from hall tickets and cannot register for examinations until cleared.</span></span><Switch checked={examRule} onCheckedChange={(v) => save(online, v)} /></label>
        </CardContent></Card>
      {review.length > 0 && <Card className="border-amber-300 bg-amber-50"><CardContent className="p-4 text-sm text-amber-900"><b>{review.length} payment(s) need review.</b> Money was received but could not be applied to the fee (for example the fee was already cleared or the amount differed). Refund or re-apply them manually with the gateway reference.</CardContent></Card>}
      <Card><CardHeader><CardTitle className="text-base">Recent online payments</CardTitle></CardHeader>
        <CardContent><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead><TableHead>Gateway reference</TableHead><TableHead>Note</TableHead><TableHead /></TableRow></TableHeader><TableBody>
          {orders.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-6 text-sm text-muted-foreground">No online payments yet.</TableCell></TableRow> : orders.map((o) => (
            <TableRow key={o.id}><TableCell>{new Date(o.created_at).toLocaleString()}</TableCell><TableCell className="text-right font-mono">₹{Number(o.amount).toLocaleString('en-IN')}</TableCell>
              <TableCell><Badge variant={o.status === 'Paid' ? 'default' : o.status === 'Review' ? 'destructive' : 'secondary'}>{o.status}</Badge></TableCell>
              <TableCell className="font-mono text-xs">{o.gateway_payment_id || '—'}</TableCell><TableCell className="text-xs">{o.review_note || o.failure_reason || ''}</TableCell><TableCell className="text-right">{canRefund && ['Paid', 'Review', 'Partially_Refunded'].includes(o.status) && <Button size="sm" variant="outline" disabled={busy === o.id} onClick={() => openRefund(o)}>Refund</Button>}</TableCell></TableRow>))}
        </TableBody></Table></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">Counter payments (last 15)</CardTitle><CardDescription>Reverse a payment entered by mistake. The fee returns to the ledger and the receipt is voided; handing money back is done outside the system.</CardDescription></CardHeader>
        <CardContent><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Mode</TableHead><TableHead>Reference</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader><TableBody>
          {counter.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-6 text-sm text-muted-foreground">No counter payments.</TableCell></TableRow> : counter.map((p) => (
            <TableRow key={p.id}><TableCell>{new Date(p.paid_at).toLocaleString()}</TableCell><TableCell className="text-right font-mono">₹{Number(p.amount).toLocaleString('en-IN')}</TableCell><TableCell>{p.payment_mode}</TableCell><TableCell className="font-mono text-xs">{p.transaction_reference || '—'}</TableCell>
              <TableCell><Badge variant={p.status === 'Completed' ? 'default' : 'secondary'}>{p.status}</Badge></TableCell>
              <TableCell className="text-right">{canRefund && p.status === 'Completed' && Number(p.amount) > Number(p.refunded_amount || 0) && <Button size="sm" variant="outline" disabled={busy === p.id} onClick={() => reverse(p)}>Reverse</Button>}</TableCell></TableRow>))}
        </TableBody></Table></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">Reconciliation — last 30 days</CardTitle><CardDescription>Collections by day and mode, net of reversals, and items that need attention.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {recon && recon.exceptions.length > 0 && <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 space-y-1">{recon.exceptions.map((e, i) => <div key={i}><b>{e.kind.replace(/_/g, ' ')}</b> — ₹{Number(e.amount).toLocaleString('en-IN')} {e.note ? `• ${e.note}` : ''}</div>)}</div>}
          <Table><TableHeader><TableRow><TableHead>Day</TableHead><TableHead>Mode</TableHead><TableHead className="text-right">Payments</TableHead><TableHead className="text-right">Collected</TableHead><TableHead className="text-right">Reversed</TableHead><TableHead className="text-right">Net</TableHead></TableRow></TableHeader><TableBody>
            {!recon || recon.days.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-6 text-sm text-muted-foreground">No payments in this period.</TableCell></TableRow> : recon.days.map((d, i) => (
              <TableRow key={i}><TableCell>{d.day}</TableCell><TableCell>{d.mode}</TableCell><TableCell className="text-right">{d.payments}</TableCell><TableCell className="text-right font-mono">₹{Number(d.collected).toLocaleString('en-IN')}</TableCell><TableCell className="text-right font-mono">₹{Number(d.reversed).toLocaleString('en-IN')}</TableCell><TableCell className="text-right font-mono font-semibold">₹{(Number(d.collected)).toLocaleString('en-IN')}</TableCell></TableRow>))}
          </TableBody></Table>
        </CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">Gateway settlement check</CardTitle><CardDescription>Upload the settlement report (CSV) from the payment gateway. Each payment is matched to an order and its amount compared; paid orders missing from every imported report after 3 days are listed.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <Input type="file" accept=".csv,text/csv" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void importSettlement(f); }} />
          {settle && (<div className="text-xs space-y-2">
            <div>Imported <b>{settle.imported}</b> row(s), {settle.duplicates} already imported.</div>
            {settle.amount_mismatches?.length > 0 && <div className="rounded border border-amber-300 bg-amber-50 p-2"><b>Amount differs:</b> {settle.amount_mismatches.map((m: any) => `${m.payment_id} (file ₹${m.file_amount} vs ours ₹${m.our_amount})`).join('; ')}</div>}
            {settle.unknown_payments?.length > 0 && <div className="rounded border border-amber-300 bg-amber-50 p-2"><b>Not in our records:</b> {settle.unknown_payments.map((m: any) => `${m.payment_id} (₹${m.amount})`).join('; ')}</div>}
            {settle.paid_but_not_settled?.length > 0 && <div className="rounded border border-amber-300 bg-amber-50 p-2"><b>Paid here but not yet settled:</b> {settle.paid_but_not_settled.map((m: any) => `${m.payment_id} (₹${m.amount})`).join('; ')}</div>}
            {!settle.amount_mismatches?.length && !settle.unknown_payments?.length && !settle.paid_but_not_settled?.length && <div className="text-emerald-700">Everything matches.</div>}
          </div>)}
        </CardContent></Card>
      {refundFor && <Dialog open onOpenChange={(o) => !o && setRefundFor(null)}><DialogContent><DialogHeader><DialogTitle>Refund online payment</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          {refundFor.order.status === 'Review' || refundFor.order.store_order_id ? <p>The whole payment of ₹{Number(refundFor.order.amount).toLocaleString('en-IN')} is returned through the gateway.</p>
            : refundFor.lines.length === 0 ? <p>Nothing left to refund on this order.</p>
            : refundFor.lines.map((l, i) => (<div key={l.student_fee_id} className="flex items-center gap-2"><span className="flex-1">{l.label} <span className="text-xs text-muted-foreground">(up to ₹{l.max})</span></span>
                <Input className="w-28 text-right font-mono" type="number" min="0" max={l.max} value={l.amount} onChange={(e) => setRefundFor({ ...refundFor, lines: refundFor.lines.map((x, j) => j === i ? { ...x, amount: e.target.value } : x) })} /></div>))}
          <Input placeholder="Reason (required)" value={refundFor.reason} onChange={(e) => setRefundFor({ ...refundFor, reason: e.target.value })} />
          <p className="text-xs text-muted-foreground">The gateway refund is made first; the fee ledger is then corrected by exactly the refunded amount.</p>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setRefundFor(null)}>Cancel</Button><Button disabled={busy === refundFor.order.id} onClick={submitRefund}>Refund</Button></DialogFooter></DialogContent></Dialog>}
    </div>
  );
}
