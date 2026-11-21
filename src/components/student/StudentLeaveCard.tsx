import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { CalendarOff, Loader2 } from 'lucide-react';
import { campusOpsService, LeaveRow } from '@/services/campusOpsService';

const tone: Record<string, string> = { Pending: 'text-amber-700 border-amber-300', Approved: 'text-emerald-700 border-emerald-300', Rejected: 'text-rose-700 border-rose-300', Cancelled: 'text-slate-500' };

export function StudentLeaveCard() {
  const { toast } = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const [rows, setRows] = useState<LeaveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ type: 'Medical', from: today, to: today, reason: '' });
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { try { setRows(await campusOpsService.leaveList()); } catch { setRows([]); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    setBusy(true);
    try { await campusOpsService.leaveApply(form.type, form.from, form.to, form.reason); toast({ title: 'Leave request sent', description: 'Your class teacher will decide soon. You will be notified.' }); setForm({ ...form, reason: '' }); await load(); }
    catch (e: any) { toast({ title: 'Could not send the request', description: e.message, variant: 'destructive' }); }
    finally { setBusy(false); }
  };
  const cancel = async (id: string) => {
    try { await campusOpsService.leaveCancel(id); toast({ title: 'Request cancelled' }); await load(); }
    catch (e: any) { toast({ title: 'Could not cancel', description: e.message, variant: 'destructive' }); }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><CalendarOff className="w-4 h-4" /> Apply for leave</CardTitle><CardDescription>Approved leave is shown to your teachers so absence is not a surprise.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <div><Label>Type</Label><select className="w-full border rounded-md h-10 px-3 text-sm bg-white" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>{['Medical', 'Personal', 'Family', 'Event', 'Other'].map(t => <option key={t}>{t}</option>)}</select></div>
          <div><Label>From</Label><Input type="date" value={form.from} onChange={e => setForm({ ...form, from: e.target.value, to: e.target.value > form.to ? e.target.value : form.to })} /></div>
          <div><Label>To</Label><Input type="date" min={form.from} value={form.to} onChange={e => setForm({ ...form, to: e.target.value })} /></div>
          <div className="flex items-end"><Button className="w-full" disabled={busy || form.reason.trim().length < 5} onClick={submit}>{busy ? 'Sending…' : 'Send request'}</Button></div>
          <div className="sm:col-span-4"><Label>Reason</Label><Textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Say why you need leave" /></div>
        </div>
        {loading ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> : rows.length === 0 ? <p className="text-sm text-slate-500">No leave requests yet.</p> : (
          <ul className="divide-y">{rows.map(r => (
            <li key={r.id} className="py-2 flex items-center justify-between gap-3 text-sm">
              <div><span className="font-medium">{r.leave_type}</span> · {r.from_date} → {r.to_date}<div className="text-xs text-slate-500">{r.reason}{r.decision_note ? ` — ${r.decision_note}` : ''}</div></div>
              <div className="flex items-center gap-2"><Badge variant="outline" className={tone[r.status]}>{r.status}</Badge>
                {['Pending', 'Approved'].includes(r.status) && r.to_date >= today && <Button size="sm" variant="ghost" onClick={() => cancel(r.id)}>Cancel</Button>}</div></li>))}</ul>)}
      </CardContent>
    </Card>
  );
}
