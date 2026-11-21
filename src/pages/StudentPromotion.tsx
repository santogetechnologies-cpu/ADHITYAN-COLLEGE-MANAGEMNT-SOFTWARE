import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, ArrowUpCircle, Undo2, Loader2 } from 'lucide-react';
import { campusOpsService, PromotionBatch, PromotionCandidate } from '@/services/campusOpsService';

export default function StudentPromotion() {
  const { toast } = useToast();
  const [dept, setDept] = useState('');
  const [cls, setCls] = useState('');
  const [sem, setSem] = useState('');
  const [maxSem, setMaxSem] = useState(8);
  const [year, setYear] = useState(`${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(2)}`);
  const [rows, setRows] = useState<PromotionCandidate[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<PromotionBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<'promote' | 'graduate' | null>(null);
  const [undo, setUndo] = useState<PromotionBatch | null>(null);
  const [busy, setBusy] = useState(false);

  const loadHistory = useCallback(() => { campusOpsService.promotionHistory().then(setHistory).catch(() => setHistory([])); }, []);
  const search = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const list = await campusOpsService.promotionPreview({ department: dept.trim(), className: cls.trim(), semester: sem ? Number(sem) : null });
      setRows(list); setPicked(new Set(list.filter(r => Number(r.dues) <= 0).map(r => r.id)));
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, [dept, cls, sem]);
  useEffect(() => { loadHistory(); }, [loadHistory]);

  const withDues = useMemo(() => rows.filter(r => Number(r.dues) > 0).length, [rows]);
  const toggle = (id: string) => setPicked(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const run = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      const r = await campusOpsService.promote([...picked], confirm, maxSem, year);
      toast({ title: confirm === 'promote' ? 'Promotion done' : 'Graduation done', description: `${r.moved} moved${r.skipped ? `, ${r.skipped} skipped (not active or already in the final semester)` : ''}.` });
      setConfirm(null); await search(); loadHistory();
    } catch (e: any) { toast({ title: 'Could not complete that', description: e.message, variant: 'destructive' }); }
    finally { setBusy(false); }
  };
  const doUndo = async () => {
    if (!undo) return;
    setBusy(true);
    try { const r = await campusOpsService.promotionUndo(undo.batch_id); toast({ title: 'Promotion undone', description: `${r.restored} students restored.` }); setUndo(null); await search(); loadHistory(); }
    catch (e: any) { toast({ title: 'Could not undo', description: e.message, variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation showBackButton={true} backUrl="/dashboard" backLabel="Back to Dashboard" />
      <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><GraduationCap className="w-6 h-6" /> Year-End Promotion & Graduation</h1>
          <p className="text-sm text-slate-500">Move a class to the next semester or graduate the final batch. Students with unpaid dues start unticked so the office can decide. Every batch can be undone.</p>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">1. Choose the students</CardTitle><CardDescription>Leave filters empty to list every active student.</CardDescription></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 items-end">
            <div><Label>Department</Label><Input value={dept} onChange={e => setDept(e.target.value)} placeholder="e.g. Radiology" /></div>
            <div><Label>Class</Label><Input value={cls} onChange={e => setCls(e.target.value)} placeholder="e.g. BMLT-1" /></div>
            <div><Label>Current semester</Label><Input type="number" min={1} value={sem} onChange={e => setSem(e.target.value)} /></div>
            <div><Label>Final semester of the course</Label><Input type="number" min={1} value={maxSem} onChange={e => setMaxSem(Number(e.target.value))} /></div>
            <Button onClick={search} disabled={loading}>{loading ? 'Loading…' : 'Show students'}</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div><CardTitle className="text-base">2. Review and apply</CardTitle>
              <CardDescription>{rows.length ? `${picked.size} of ${rows.length} selected${withDues ? ` · ${withDues} with dues` : ''}` : 'Nothing loaded yet.'}</CardDescription></div>
            <div className="flex flex-wrap items-end gap-2">
              <div><Label className="text-xs">Academic year</Label><Input className="h-9 w-28" value={year} onChange={e => setYear(e.target.value)} /></div>
              <Button disabled={!picked.size || busy} onClick={() => setConfirm('promote')}><ArrowUpCircle className="w-4 h-4 mr-1.5" /> Promote selected</Button>
              <Button variant="outline" disabled={!picked.size || busy} onClick={() => setConfirm('graduate')}><GraduationCap className="w-4 h-4 mr-1.5" /> Graduate selected</Button>
            </div>
          </CardHeader>
          <CardContent>
            {error ? <div className="text-sm text-red-600 text-center py-6">{error}</div>
              : loading ? <div className="py-10 flex justify-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /></div>
              : rows.length === 0 ? <EmptyState title="No students listed" description="Choose a class and press Show students." size="sm" />
              : <div className="overflow-x-auto"><Table>
                <TableHeader><TableRow>
                  <TableHead className="w-10"><input type="checkbox" aria-label="Select all" checked={picked.size === rows.length} onChange={e => setPicked(e.target.checked ? new Set(rows.map(r => r.id)) : new Set())} /></TableHead>
                  <TableHead>Student</TableHead><TableHead>Class</TableHead><TableHead>Sem</TableHead><TableHead className="text-right">Dues</TableHead><TableHead className="text-right">Failed subjects</TableHead>
                </TableRow></TableHeader>
                <TableBody>{rows.map(r => (
                  <TableRow key={r.id}>
                    <TableCell><input type="checkbox" aria-label={`Select ${r.name}`} checked={picked.has(r.id)} onChange={() => toggle(r.id)} /></TableCell>
                    <TableCell><div className="font-medium">{r.name}</div><div className="text-xs text-slate-500">{r.student_id}</div></TableCell>
                    <TableCell>{r.class_name || '—'}</TableCell>
                    <TableCell>{r.semester}</TableCell>
                    <TableCell className="text-right">{Number(r.dues) > 0 ? <Badge variant="outline" className="text-rose-700 border-rose-300">₹{Number(r.dues).toLocaleString('en-IN')}</Badge> : <span className="text-slate-400">Clear</span>}</TableCell>
                    <TableCell className="text-right">{r.arrear_subjects > 0 ? <Badge variant="outline" className="text-amber-700 border-amber-300">{r.arrear_subjects}</Badge> : <span className="text-slate-400">0</span>}</TableCell>
                  </TableRow>))}
                </TableBody></Table></div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Recent batches</CardTitle></CardHeader>
          <CardContent>
            {history.length === 0 ? <EmptyState title="No promotions yet" size="sm" /> : (
              <ul className="divide-y">{history.map(h => (
                <li key={h.batch_id} className="py-2 flex items-center justify-between gap-3 text-sm">
                  <div><span className="font-medium capitalize">{h.action}d</span> · {h.count} student(s){h.academic_year ? ` · ${h.academic_year}` : ''}<div className="text-xs text-slate-500">{new Date(h.at).toLocaleString()}</div></div>
                  {h.undone ? <Badge variant="outline">Undone</Badge> : <Button variant="outline" size="sm" onClick={() => setUndo(h)}><Undo2 className="w-3.5 h-3.5 mr-1" /> Undo</Button>}
                </li>))}</ul>)}
          </CardContent>
        </Card>
      </main>

      <AlertDialog open={!!confirm} onOpenChange={o => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm === 'promote' ? `Promote ${picked.size} student(s) to the next semester?` : `Graduate ${picked.size} student(s)?`}</AlertDialogTitle>
            <AlertDialogDescription>{confirm === 'promote' ? `Students already in semester ${maxSem} are skipped; graduate them instead.` : 'Graduated students leave the active roll. You can undo this batch afterwards.'}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={run} disabled={busy}>Confirm</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!undo} onOpenChange={o => !o && setUndo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Undo this batch?</AlertDialogTitle><AlertDialogDescription>Students whose semester or status has not changed since are put back. Anyone changed afterwards is left alone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Keep</AlertDialogCancel><AlertDialogAction onClick={doUndo} disabled={busy}>Undo</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
