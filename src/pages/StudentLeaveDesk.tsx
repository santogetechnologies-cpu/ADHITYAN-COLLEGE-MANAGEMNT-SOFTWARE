import { useCallback, useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/hooks/use-toast';
import { CalendarOff, Loader2 } from 'lucide-react';
import { campusOpsService, LeaveRow } from '@/services/campusOpsService';

export default function StudentLeaveDesk() {
  const { toast } = useToast();
  const [rows, setRows] = useState<LeaveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'Pending' | 'all'>('Pending');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => { setLoading(true); setError(null); try { setRows(await campusOpsService.leaveList()); } catch (e: any) { setError(e.message); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);

  const decide = async (id: string, d: 'Approve' | 'Reject') => {
    setBusy(id);
    try { await campusOpsService.leaveDecide(id, d, notes[id]); toast({ title: d === 'Approve' ? 'Leave approved' : 'Leave rejected' }); await load(); }
    catch (e: any) { toast({ title: 'Could not save the decision', description: e.message, variant: 'destructive' }); }
    finally { setBusy(null); }
  };
  const shown = rows.filter(r => filter === 'all' || r.status === 'Pending');

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation showBackButton={true} backUrl="/dashboard" backLabel="Back to Dashboard" />
      <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div><h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><CalendarOff className="w-6 h-6" /> Student Leave Requests</h1>
            <p className="text-sm text-slate-500">Teachers see their own classes. Rejecting needs a reason the student will read.</p></div>
          <div className="flex gap-1"><Button size="sm" variant={filter === 'Pending' ? 'default' : 'outline'} onClick={() => setFilter('Pending')}>Waiting</Button><Button size="sm" variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>All</Button></div>
        </div>
        {loading ? <div className="py-10 flex justify-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /></div>
          : error ? <div className="text-sm text-red-600 text-center py-6">{error} <Button variant="link" onClick={load}>Retry</Button></div>
          : shown.length === 0 ? <EmptyState title={filter === 'Pending' ? 'Nothing waiting for a decision' : 'No leave requests yet'} size="sm" />
          : shown.map(r => (
            <Card key={r.id}><CardHeader className="pb-2"><CardTitle className="text-base flex items-center justify-between gap-2"><span>{r.student?.name ?? 'Student'} <span className="text-sm font-normal text-slate-500">{r.student?.class_name ?? ''}</span></span><Badge variant="outline">{r.status}</Badge></CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm"><div>{r.leave_type} · {r.from_date} → {r.to_date}</div><div className="text-slate-600">{r.reason}</div>
                {r.status === 'Pending' ? <div className="flex flex-wrap gap-2 pt-1"><Input className="flex-1 min-w-48" placeholder="Note (required to reject)" value={notes[r.id] ?? ''} onChange={e => setNotes({ ...notes, [r.id]: e.target.value })} />
                  <Button size="sm" disabled={busy === r.id} onClick={() => decide(r.id, 'Approve')}>Approve</Button>
                  <Button size="sm" variant="outline" className="text-rose-700" disabled={busy === r.id || (notes[r.id] ?? '').trim().length < 3} onClick={() => decide(r.id, 'Reject')}>Reject</Button></div>
                  : r.decision_note ? <div className="text-xs text-slate-500">Note: {r.decision_note}</div> : null}</CardContent></Card>))}
      </main>
    </div>
  );
}
