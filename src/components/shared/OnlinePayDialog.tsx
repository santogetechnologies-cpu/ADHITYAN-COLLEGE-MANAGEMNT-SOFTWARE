import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { db } from '@/services/supabase/database';
import { useToast } from '@/hooks/use-toast';
import type { StudentFee } from '@/types/database.types';

declare global { interface Window { Razorpay?: any } }
const inr = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

function loadCheckout(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'; s.onload = () => resolve(true); s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

/** Pay outstanding fees online. Amounts are re-priced and validated on the server; if online payment is off, explains how to pay at the desk. */
export function OnlinePayDialog({ open, onOpenChange, fees, studentName, onPaid }: { open: boolean; onOpenChange: (o: boolean) => void; fees: StudentFee[]; studentName?: string; onPaid: () => void }) {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [sel, setSel] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const due = useMemo(() => fees.filter((f) => Number(f.total_due) > 0 && !['cancelled', 'waived', 'paid'].includes(f.status)), [fees]);

  useEffect(() => {
    if (!open) return;
    db.getInstitutionalSettings().then((s: any) => setEnabled(s?.online_payments_enabled === true)).catch(() => setEnabled(false));
    setSel(Object.fromEntries(due.map((f) => [f.id, String(f.total_due)])));
  }, [open]);   // eslint-disable-line react-hooks/exhaustive-deps

  const picked = due.filter((f) => sel[f.id] !== undefined && sel[f.id] !== '');
  const total = picked.reduce((s, f) => s + (Number(sel[f.id]) || 0), 0);
  const toggle = (f: StudentFee, on: boolean) => setSel((s) => { const n = { ...s }; if (on) n[f.id] = String(f.total_due); else delete n[f.id]; return n; });

  const pay = async () => {
    const items = picked.map((f) => ({ student_fee_id: f.id, amount: Number(sel[f.id]) }));
    if (items.some((i) => !(i.amount > 0))) return toast({ title: 'Enter an amount above zero for each selected fee', variant: 'destructive' });
    if (picked.some((f) => Number(sel[f.id]) > Number(f.total_due))) return toast({ title: 'An amount is more than that fee\'s balance', variant: 'destructive' });
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('payments-create-order', { body: { items } });
      if (error || !data?.success) throw new Error(data?.error || (error as any)?.message || 'Could not start the payment.');
      if (!(await loadCheckout())) throw new Error('The payment window could not be loaded. Check your connection.');
      const rz = new window.Razorpay({
        key: data.key_id, order_id: data.gateway_order_id, amount: data.amount_paise, currency: 'INR', name: 'Fee payment', description: studentName ? `Fees for ${studentName}` : 'Fees',
        handler: async (r: any) => {
          const v = await supabase.functions.invoke('payments-verify', { body: { razorpay_order_id: r.razorpay_order_id, razorpay_payment_id: r.razorpay_payment_id, razorpay_signature: r.razorpay_signature } });
          if (v.data?.success) toast({ title: 'Payment received', description: 'Your receipt is in the receipt list.' });
          else toast({ title: 'Payment is being confirmed', description: v.data?.message || 'If money was debited it will be applied automatically within a few minutes.' });
          onPaid(); onOpenChange(false);
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      rz.on('payment.failed', (r: any) => toast({ title: 'Payment failed', description: r?.error?.description || 'Nothing was charged.', variant: 'destructive' }));
      rz.open();
    } catch (e: any) { toast({ title: 'Payment not started', description: e.message, variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Pay fees</DialogTitle><DialogDescription>{studentName ? `For ${studentName}` : 'Outstanding fees'}</DialogDescription></DialogHeader>
        {enabled === null ? <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        : due.length === 0 ? <p className="text-sm text-muted-foreground py-4">Nothing is due.</p>
        : !enabled ? <p className="text-sm text-muted-foreground">Online payment is not enabled yet. Please pay at the college accounts desk (cash, UPI, card, bank transfer or cheque). Your receipt appears here once the accounts office records the payment.</p>
        : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {due.map((f) => (
              <div key={f.id} className="flex items-center gap-3 p-2 border rounded-lg">
                <Checkbox checked={sel[f.id] !== undefined} onCheckedChange={(c) => toggle(f, c === true)} />
                <div className="flex-1 text-sm"><div className="font-medium">{(f as any).description || 'Fee'}</div><div className="text-xs text-muted-foreground">Due {f.due_date} • balance {inr(Number(f.total_due))}</div></div>
                <Input className="w-28 text-right font-mono" type="number" min="1" max={f.total_due} disabled={sel[f.id] === undefined} value={sel[f.id] ?? ''} onChange={(e) => setSel((s) => ({ ...s, [f.id]: e.target.value }))} />
              </div>))}
          </div>)}
        <DialogFooter className="items-center">
          {enabled && due.length > 0 && <span className="mr-auto text-sm">Total <b>{inr(total)}</b></span>}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          {enabled && due.length > 0 && <Button onClick={pay} disabled={busy || total <= 0}>{busy ? 'Opening…' : 'Pay online'}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
