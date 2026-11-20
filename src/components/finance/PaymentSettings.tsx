import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const sb: any = supabase;

export function PaymentSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(false);
  const [examRule, setExamRule] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);

  const load = useCallback(async () => {
    try {
      const [{ data: s }, { data: o }] = await Promise.all([
        sb.from('institutional_settings').select('online_payments_enabled, exam_requires_fee_clearance').limit(1).maybeSingle(),
        sb.from('payment_orders').select('id, amount, status, gateway_payment_id, review_note, failure_reason, created_at, paid_at, payer_role').order('created_at', { ascending: false }).limit(50),
      ]);
      setOnline(s?.online_payments_enabled === true); setExamRule(s?.exam_requires_fee_clearance === true); setOrders(o || []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const save = async (o: boolean, e: boolean) => {
    const { data, error } = await sb.rpc('payment_flags_set', { p_online: o, p_exam_fee_clearance: e });
    if (error || !data?.success) return toast({ title: 'Not saved', description: error?.message || data?.error, variant: 'destructive' });
    setOnline(o); setExamRule(e); toast({ title: 'Saved' });
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
        <CardContent><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead><TableHead>Gateway reference</TableHead><TableHead>Note</TableHead></TableRow></TableHeader><TableBody>
          {orders.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-6 text-sm text-muted-foreground">No online payments yet.</TableCell></TableRow> : orders.map((o) => (
            <TableRow key={o.id}><TableCell>{new Date(o.created_at).toLocaleString()}</TableCell><TableCell className="text-right font-mono">₹{Number(o.amount).toLocaleString('en-IN')}</TableCell>
              <TableCell><Badge variant={o.status === 'Paid' ? 'default' : o.status === 'Review' ? 'destructive' : 'secondary'}>{o.status}</Badge></TableCell>
              <TableCell className="font-mono text-xs">{o.gateway_payment_id || '—'}</TableCell><TableCell className="text-xs">{o.review_note || o.failure_reason || ''}</TableCell></TableRow>))}
        </TableBody></Table></CardContent></Card>
    </div>
  );
}
