import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { db } from '@/services/supabase/database';
import { useToast } from '@/hooks/use-toast';

export interface AdjustableFee {
  id: string;
  student_name: string;
  description?: string | null;
  class_name?: string | null;
  total_due: number;
  paid_amount: number;
}

/** Waive part of a fee, give a concession, or cancel a fee that was raised in error. Reason is mandatory and kept in history. */
export const FeeAdjustDialog = ({ fee, onOpenChange, onDone }: { fee: AdjustableFee | null; onOpenChange: (open: boolean) => void; onDone: () => void }) => {
  const { toast } = useToast();
  const [kind, setKind] = useState<'concession' | 'waiver' | 'cancellation'>('concession');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (fee) { setKind('concession'); setAmount(''); setReason(''); }
  }, [fee?.id]);

  if (!fee) return null;
  const due = Number(fee.total_due);
  const canCancel = Number(fee.paid_amount) === 0;

  const submit = async () => {
    const amt = Number(amount);
    if (reason.trim().length < 3) { toast({ title: 'A reason is required', variant: 'destructive' }); return; }
    if (kind !== 'cancellation' && (!Number.isFinite(amt) || amt <= 0 || amt > due)) {
      toast({ title: 'Check the amount', description: `Enter an amount between 0 and ₹${due.toLocaleString('en-IN')}.`, variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const r = await db.feeAdjust(fee.id, kind, kind === 'cancellation' ? undefined : amt, reason.trim());
      toast({ title: kind === 'cancellation' ? 'Fee cancelled' : 'Fee adjusted', description: `Outstanding is now ₹${Number(r.balance_remaining).toLocaleString('en-IN')}.` });
      onOpenChange(false);
      onDone();
    } catch (e: any) {
      toast({ title: 'Not adjusted', description: e?.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={!!fee} onOpenChange={(o) => { if (!busy) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust fee</DialogTitle>
          <DialogDescription>{fee.student_name} · {fee.description || fee.class_name} · outstanding ₹{due.toLocaleString('en-IN')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Type</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="concession">Concession (discount)</SelectItem>
                <SelectItem value="waiver">Waiver (write off balance)</SelectItem>
                <SelectItem value="cancellation" disabled={!canCancel}>Cancel this fee {canCancel ? '' : '(has payments)'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {kind !== 'cancellation' && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Amount (₹) *</Label>
              <Input type="number" min="1" max={due} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="font-mono" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Reason *</Label>
            <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="Saved in the fee's history" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy} variant={kind === 'cancellation' ? 'destructive' : 'default'}>{busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
