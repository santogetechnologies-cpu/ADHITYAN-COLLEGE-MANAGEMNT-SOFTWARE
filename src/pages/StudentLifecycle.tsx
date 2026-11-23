import { useEffect, useState, useCallback } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/hooks/use-toast';
import { UserX, Search, ArrowRightLeft, UserCheck, Loader2 } from 'lucide-react';
import { campusOpsService, LifecycleEvent, StudentHit } from '@/services/campusOpsService';

type Mode = 'discontinue' | 'reinstate' | 'transfer';
const REASONS = ['Withdrawn', 'Dropout', 'Transfer Certificate', 'Expelled', 'Other'];

export default function StudentLifecycle() {
  const { toast } = useToast();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<StudentHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [events, setEvents] = useState<LifecycleEvent[]>([]);
  const [mode, setMode] = useState<{ kind: Mode; student: StudentHit } | null>(null);
  const [type, setType] = useState('Withdrawn');
  const [reason, setReason] = useState('');
  const [effective, setEffective] = useState(new Date().toISOString().slice(0, 10));
  const [dept, setDept] = useState('');
  const [cls, setCls] = useState('');
  const [sem, setSem] = useState('');
  const [dues, setDues] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const loadEvents = useCallback(() => { campusOpsService.lifecycleHistory().then(setEvents).catch(() => setEvents([])); }, []);
  useEffect(() => { loadEvents(); }, [loadEvents]);

  const search = async () => {
    if (q.trim().length < 2) { toast({ title: 'Type at least 2 letters of a name, ID or roll number' }); return; }
    setSearching(true);
    try { setHits((await campusOpsService.globalSearch(q.trim())).students); }
    catch (e: any) { toast({ title: 'Search failed', description: e.message, variant: 'destructive' }); }
    finally { setSearching(false); }
  };
  const open = (kind: Mode, student: StudentHit) => { setMode({ kind, student }); setReason(''); setDues(null); setType('Withdrawn'); setDept(student.department ?? ''); setCls(student.class_name ?? ''); setSem(''); };

  const submit = async (force = false) => {
    if (!mode) return;
    setBusy(true);
    try {
      const id = mode.student.id;
      if (mode.kind === 'discontinue') await campusOpsService.discontinue(id, type, reason, effective, force);
      else if (mode.kind === 'reinstate') await campusOpsService.reinstate(id, reason);
      else await campusOpsService.transfer(id, dept, cls, reason, sem ? Number(sem) : null);
      toast({ title: mode.kind === 'discontinue' ? 'Student discontinued' : mode.kind === 'reinstate' ? 'Student reinstated' : 'Student transferred' });
      setMode(null); loadEvents(); search();
    } catch (e: any) {
      if (e.code === 'DUES_PENDING') setDues(e.dues);
      else toast({ title: 'Could not complete that', description: e.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation showBackButton={true} backUrl="/dashboard" backLabel="Back to Dashboard" />
      <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><UserX className="w-6 h-6" /> Discontinuation & Transfers</h1>
          <p className="text-sm text-slate-500">Record a student leaving, coming back, or moving to another department or class. Hostel bed and bus seat are released automatically when a student is discontinued; fee dues stay on record.</p>
        </div>
        <Card>
          <CardHeader><CardTitle className="text-base">Find a student</CardTitle><CardDescription>By name, student ID, roll number or email.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2"><Input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} placeholder="e.g. Priya or AIP-2025-1001" aria-label="Search students" />
              <Button onClick={search} disabled={searching}>{searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-1.5" />} Search</Button></div>
            {hits.length > 0 && <ul className="divide-y border rounded-lg">{hits.map(h => (
              <li key={h.id} className="p-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <div><span className="font-medium">{h.name}</span> <span className="text-slate-500">· {h.student_id} · {h.class_name || 'No class'}{h.department ? ` · ${h.department}` : ''}</span> <Badge variant="outline" className="ml-1 capitalize">{h.status}</Badge></div>
                <div className="flex gap-2">
                  {h.status === 'active' && <><Button size="sm" variant="outline" onClick={() => open('transfer', h)}><ArrowRightLeft className="w-3.5 h-3.5 mr-1" /> Transfer</Button>
                    <Button size="sm" variant="outline" className="text-rose-700" onClick={() => open('discontinue', h)}><UserX className="w-3.5 h-3.5 mr-1" /> Discontinue</Button></>}
                  {(h.status === 'withdrawn' || h.status === 'inactive') && <Button size="sm" variant="outline" onClick={() => open('reinstate', h)}><UserCheck className="w-3.5 h-3.5 mr-1" /> Reinstate</Button>}
                </div></li>))}</ul>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Recent records</CardTitle></CardHeader>
          <CardContent>{events.length === 0 ? <EmptyState title="Nothing recorded yet" size="sm" /> : <ul className="divide-y">{events.map(e => (
            <li key={e.id} className="py-2 text-sm"><span className="font-medium">{e.name}</span> <span className="text-slate-500">({e.code})</span> — <span className="capitalize">{e.event}</span>
              {e.event === 'transferred' ? ` from ${e.from_class ?? '—'} to ${e.to_class ?? '—'}` : e.type ? ` · ${e.type}` : ''}
              {e.dues > 0 && <Badge variant="outline" className="ml-2 text-rose-700 border-rose-300">₹{Number(e.dues).toLocaleString('en-IN')} dues left</Badge>}
              <div className="text-xs text-slate-500">{e.reason} · {new Date(e.at).toLocaleString()}</div></li>))}</ul>}</CardContent>
        </Card>
      </main>

      <Dialog open={!!mode} onOpenChange={o => !o && setMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{mode?.kind === 'discontinue' ? 'Discontinue' : mode?.kind === 'reinstate' ? 'Reinstate' : 'Transfer'} {mode?.student.name}</DialogTitle>
            <DialogDescription>{mode?.kind === 'discontinue' ? 'The login is switched off, the hostel bed and bus seat are freed, and fee dues stay on record.' : mode?.kind === 'reinstate' ? 'The student becomes active again and can sign in.' : 'Department, class and (optionally) semester change. Past fees and results stay as they were.'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {mode?.kind === 'discontinue' && <div className="grid grid-cols-2 gap-3">
              <div><Label>Why</Label><select className="w-full border rounded-md h-10 px-3 text-sm bg-white" value={type} onChange={e => setType(e.target.value)}>{REASONS.map(r => <option key={r}>{r}</option>)}</select></div>
              <div><Label>Effective from</Label><Input type="date" value={effective} onChange={e => setEffective(e.target.value)} /></div></div>}
            {mode?.kind === 'transfer' && <div className="grid grid-cols-3 gap-3">
              <div><Label>Department</Label><Input value={dept} onChange={e => setDept(e.target.value)} /></div>
              <div><Label>Class</Label><Input value={cls} onChange={e => setCls(e.target.value)} /></div>
              <div><Label>Semester</Label><Input type="number" min={1} value={sem} onChange={e => setSem(e.target.value)} placeholder="unchanged" /></div></div>}
            <div><Label>Reason / note</Label><Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Recorded in the history and audit log" /></div>
            {dues !== null && <div className="rounded-md border border-amber-300 bg-amber-50 text-amber-900 text-sm p-3">This student still owes <b>₹{Number(dues).toLocaleString('en-IN')}</b>. You can proceed — the dues stay on record for recovery.</div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMode(null)}>Cancel</Button>
            {dues !== null ? <Button variant="destructive" disabled={busy} onClick={() => submit(true)}>Discontinue anyway</Button>
              : <Button disabled={busy || reason.trim().length < 3} onClick={() => submit(false)}>{busy ? 'Saving…' : 'Confirm'}</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
