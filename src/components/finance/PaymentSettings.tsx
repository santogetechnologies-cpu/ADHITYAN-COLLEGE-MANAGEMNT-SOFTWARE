import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
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
        sb.from('fee_payments').select('id, amount, payment_mode, transaction_reference, status, paid_at, reversal_reason').neq('payment_mode', 'Online_Gateway').order('paid_at', { ascending: false }).limit(15),
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

  const refund = async (o: any) => {
    const reason = window.prompt('Reason for refunding this online payment (required):');
    if (!reason || reason.trim().length < 5) return;
    setBusy(o.id);
    const { data, error } = await supabase.functions.invoke('payments-refund', { body: { order_id: o.id, reason: reason.trim() } });
    setBusy(null);
    if (error || !data?.success) return toast({ title: 'Refund not completed', description: data?.error || (error as any)?.message, variant: 'destructive' });
    toast({ title: 'Refunded', description: `Gateway refund ${data.gateway_refund_id}` }); await load();
  };
  const reverse = async (p: any) => {
    const reason = window.prompt('Reason for reversing this payment (required, e.g. entered against the wrong student):');
    if (!reason || reason.trim().length < 5) return;
    setBusy(p.id);
    const { data, error } = await sb.rpc('fee_payment_reverse', { p_payment: p.id, p_reason: reason.trim() });
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
              <TableCell className="font-mono text-xs">{o.gateway_payment_id || '—'}</TableCell><TableCell className="text-xs">{o.review_note || o.failure_reason || ''}</TableCell><TableCell className="text-right">{canRefund && ['Paid', 'Review'].includes(o.status) && <Button size="sm" variant="outline" disabled={busy === o.id} onClick={() => refund(o)}>Refund</Button>}</TableCell></TableRow>))}
        </TableBody></Table></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">Counter payments (last 15)</CardTitle><CardDescription>Reverse a payment entered by mistake. The fee returns to the ledger and the receipt is voided; handing money back is done outside the system.</CardDescription></CardHeader>
        <CardContent><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Mode</TableHead><TableHead>Reference</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader><TableBody>
          {counter.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-6 text-sm text-muted-foreground">No counter payments.</TableCell></TableRow> : counter.map((p) => (
            <TableRow key={p.id}><TableCell>{new Date(p.paid_at).toLocaleString()}</TableCell><TableCell className="text-right font-mono">₹{Number(p.amount).toLocaleString('en-IN')}</TableCell><TableCell>{p.payment_mode}</TableCell><TableCell className="font-mono text-xs">{p.transaction_reference || '—'}</TableCell>
              <TableCell><Badge variant={p.status === 'Completed' ? 'default' : 'secondary'}>{p.status}</Badge></TableCell>
              <TableCell className="text-right">{canRefund && p.status === 'Completed' && <Button size="sm" variant="outline" disabled={busy === p.id} onClick={() => reverse(p)}>Reverse</Button>}</TableCell></TableRow>))}
        </TableBody></Table></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">Reconciliation — last 30 days</CardTitle><CardDescription>Collections by day and mode, net of reversals, and items that need attention.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {recon && recon.exceptions.length > 0 && <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 space-y-1">{recon.exceptions.map((e, i) => <div key={i}><b>{e.kind.replace(/_/g, ' ')}</b> — ₹{Number(e.amount).toLocaleString('en-IN')} {e.note ? `• ${e.note}` : ''}</div>)}</div>}
          <Table><TableHeader><TableRow><TableHead>Day</TableHead><TableHead>Mode</TableHead><TableHead className="text-right">Payments</TableHead><TableHead className="text-right">Collected</TableHead><TableHead className="text-right">Reversed</TableHead><TableHead className="text-right">Net</TableHead></TableRow></TableHeader><TableBody>
            {!recon || recon.days.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-6 text-sm text-muted-foreground">No payments in this period.</TableCell></TableRow> : recon.days.map((d, i) => (
              <TableRow key={i}><TableCell>{d.day}</TableCell><TableCell>{d.mode}</TableCell><TableCell className="text-right">{d.payments}</TableCell><TableCell className="text-right font-mono">₹{Number(d.collected).toLocaleString('en-IN')}</TableCell><TableCell className="text-right font-mono">₹{Number(d.reversed).toLocaleString('en-IN')}</TableCell><TableCell className="text-right font-mono font-semibold">₹{(Number(d.collected)).toLocaleString('en-IN')}</TableCell></TableRow>))}
          </TableBody></Table>
        </CardContent></Card>
    </div>
  );
}
