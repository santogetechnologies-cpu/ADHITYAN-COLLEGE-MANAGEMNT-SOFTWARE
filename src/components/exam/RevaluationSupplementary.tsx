import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { examService, type ExamItem } from '@/services/examService';
import { examLogisticsService, type RevalRequest } from '@/services/examLogisticsService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

export function RevaluationSupplementary() {
  const { toast } = useToast();
  const { user } = useAuth();
  const canManage = ['admin', 'principal', 'coe'].includes(user?.role ?? '');
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [examId, setExamId] = useState('');
  const [reqs, setReqs] = useState<RevalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [deadline, setDeadline] = useState('');
  const [fee, setFee] = useState('0');
  const [teachers, setTeachers] = useState<Array<{ id: string; name: string }>>([]);
  const [valuations, setValuations] = useState<Array<{ id: string; script: string; exam: string; subject: string; max_marks: number; my_marks: number | null; my_note: string | null }>>([]);
  const isValuer = ['teacher', 'hod'].includes(user?.role ?? '');
  const [dlg, setDlg] = useState<{ req: RevalRequest; decision: 'Revise' | 'Keep' | 'Reject'; marks: string; note: string } | null>(null);
  const [sup, setSup] = useState({ name: '', start: '', end: '' });
  const [paper, setPaper] = useState({ exam: '', first: '', st: '09:00', en: '12:00', room: '' });
  const exam = exams.find((e) => e.id === examId);
  const supplementaries = exams.filter((e) => e.parent_exam_id);

  const load = useCallback(async () => {
    try { const e = await examService.listExams(); setExams(e); setExamId((c) => c || e[0]?.id || ''); }
    catch (err: any) { toast({ title: 'Could not load', description: err.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  const loadReqs = useCallback(async () => { if (examId) try { setReqs(await examLogisticsService.revaluations(examId)); } catch { setReqs([]); } }, [examId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (canManage) examLogisticsService.teachers().then(setTeachers).catch(() => setTeachers([])); }, [canManage]);
  const loadValuations = useCallback(async () => { if (isValuer) try { setValuations(await examLogisticsService.myValuations()); } catch { setValuations([]); } }, [isValuer]);
  useEffect(() => { void loadValuations(); }, [loadValuations]);
  useEffect(() => { void loadReqs(); }, [loadReqs]);
  useEffect(() => { setDeadline(exam?.revaluation_deadline ?? ''); setFee(String(exam?.revaluation_fee ?? 0)); }, [examId, exam?.revaluation_deadline, exam?.revaluation_fee]);

  const run = async (fn: () => Promise<any>, ok: string) => {
    setBusy(true);
    try { await fn(); toast({ title: ok }); await load(); await loadReqs(); }
    catch (e: any) { toast({ title: 'Not done', description: e.message, variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  if (isValuer && !canManage) return (
    <Card><CardHeader><CardTitle>Scripts for second valuation</CardTitle><CardDescription>Blind valuation: you see the paper, not the student or the earlier marks. Enter the marks you award.</CardDescription></CardHeader>
      <CardContent className="space-y-2">
        {valuations.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">Nothing is assigned to you.</p> : valuations.map((v) => (
          <div key={v.id} className="flex items-center justify-between p-3 border rounded-lg"><div><div className="font-medium text-sm">{v.script} — {v.subject}</div><div className="text-xs text-muted-foreground">{v.exam} • out of {v.max_marks}{v.my_marks != null ? ` • you awarded ${v.my_marks}` : ''}</div></div>
            <Button size="sm" variant={v.my_marks != null ? 'outline' : 'default'} onClick={async () => { const m = window.prompt(`Marks for ${v.script} (0–${v.max_marks}):`, v.my_marks != null ? String(v.my_marks) : ''); if (m === null || m === '') return; const n = window.prompt('Note (optional):', v.my_note ?? '') ?? ''; try { await examLogisticsService.submitValuation(v.id, Number(m), n); toast({ title: 'Marks recorded' }); await loadValuations(); } catch (e: any) { toast({ title: 'Not saved', description: e.message, variant: 'destructive' }); } }}>{v.my_marks != null ? 'Change marks' : 'Enter marks'}</Button></div>))}
      </CardContent></Card>);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (exams.length === 0) return <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">No examinations yet.</CardContent></Card>;

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 min-w-72 max-w-md"><Label className="text-xs font-semibold">Examination</Label>
        <Select value={examId} onValueChange={setExamId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{exams.map((e) => <SelectItem key={e.id} value={e.id}>{e.title} · {e.academic_year}{e.parent_exam_id ? ' (supplementary)' : ''}</SelectItem>)}</SelectContent></Select></div>

      <Card>
        <CardHeader><CardTitle>Revaluation</CardTitle><CardDescription>Students can ask for a re-check of a published mark while the window is open. Every revision is kept in the result history and flows into GPA.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{exam?.revaluation_open ? 'Window open' : 'Window closed'}</Badge>
            {canManage && <>
              <Input type="date" className="w-44" value={deadline} onChange={(e) => setDeadline(e.target.value)} title="Last date to request" />
              <Input type="number" min="0" className="w-28" value={fee} onChange={(e) => setFee(e.target.value)} title="Fee per subject (₹)" placeholder="Fee ₹" />
              <Button size="sm" disabled={busy || !exam?.is_published} onClick={() => void run(() => examLogisticsService.setRevaluation(examId, true, deadline || null, Number(fee) || 0), 'Revaluation window opened')}>Open window</Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(() => examLogisticsService.setRevaluation(examId, false, deadline || null, Number(fee) || 0), 'Revaluation window closed')}>Close</Button>
              {!exam?.is_published && <span className="text-xs text-muted-foreground">Publish the results first.</span>}</>}
          </div>
          <Table><TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Subject</TableHead><TableHead className="text-right">Marks</TableHead><TableHead>Reason</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader><TableBody>
            {reqs.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-6 text-sm text-muted-foreground">No revaluation requests.</TableCell></TableRow> : reqs.map((r) => (
              <TableRow key={r.id}><TableCell className="font-medium">{r.student_name}<div className="text-[11px] text-muted-foreground">{r.class_name}</div></TableCell><TableCell>{r.subject}</TableCell>
                <TableCell className="text-right font-mono">{r.original_marks}/{r.max_marks}{r.revised_marks != null ? ` → ${r.revised_marks}` : ''}</TableCell><TableCell className="text-xs max-w-64">{r.reason}{r.decision_note && <div className="text-muted-foreground mt-1">Decision: {r.decision_note}</div>}
                  {r.fee_id && <div className="text-muted-foreground mt-1">Fee {r.fee_refund_due ? <b className="text-amber-700">— refund due (marks went up)</b> : 'on the ledger'}</div>}
                  {r.valuer_name && <div className="text-muted-foreground mt-1">Second valuer: {r.valuer_name}{r.valuer_marks != null ? ` → ${r.valuer_marks}` : ' (pending)'}</div>}</TableCell>
                <TableCell><Badge variant={r.status === 'Requested' ? 'secondary' : 'default'}>{r.status}</Badge></TableCell>
                <TableCell className="text-right whitespace-nowrap">{canManage && r.status === 'Requested' && <>
                  <Select value={r.valuer_id ?? ''} onValueChange={(v) => void run(() => examLogisticsService.assignValuer(r.id, v), 'Second valuer assigned')}><SelectTrigger className="h-8 w-36 inline-flex"><SelectValue placeholder="Valuer" /></SelectTrigger><SelectContent>{teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select>
                  <Button size="sm" variant="outline" className="ml-1" onClick={() => setDlg({ req: r, decision: 'Revise', marks: r.valuer_marks != null ? String(r.valuer_marks) : String(r.original_marks), note: '' })}>Revise</Button>
                  <Button size="sm" variant="ghost" className="ml-1" onClick={() => setDlg({ req: r, decision: 'Keep', marks: '', note: '' })}>Keep</Button>
                  <Button size="sm" variant="ghost" onClick={() => setDlg({ req: r, decision: 'Reject', marks: '', note: '' })}>Reject</Button></>}</TableCell></TableRow>))}
          </TableBody></Table>
        </CardContent>
      </Card>

      {canManage && (
        <Card>
          <CardHeader><CardTitle>Supplementary examination</CardTitle><CardDescription>For students who failed or were absent in the selected examination. They register themselves (when you open registration in the Seating tab); papers are created from the failed subjects.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1"><Label className="text-xs">Name</Label><Input className="w-56" value={sup.name} onChange={(e) => setSup({ ...sup, name: e.target.value })} placeholder={exam ? `${exam.title} – Supplementary` : ''} /></div>
              <div className="space-y-1"><Label className="text-xs">From</Label><Input type="date" value={sup.start} onChange={(e) => setSup({ ...sup, start: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">To</Label><Input type="date" value={sup.end} onChange={(e) => setSup({ ...sup, end: e.target.value })} /></div>
              <Button disabled={busy || !sup.start || !sup.end} onClick={() => void run(() => examLogisticsService.createSupplementary(examId, sup.name.trim() || `${exam?.title} – Supplementary`, sup.start, sup.end), 'Supplementary examination created')}>Create from this examination</Button>
            </div>
            {supplementaries.length > 0 && <div className="border rounded-lg p-3 space-y-2"><div className="text-sm font-medium">Generate papers</div>
              <div className="flex flex-wrap items-end gap-2">
                <Select value={paper.exam} onValueChange={(v) => setPaper({ ...paper, exam: v })}><SelectTrigger className="w-64"><SelectValue placeholder="Supplementary examination" /></SelectTrigger><SelectContent>{supplementaries.map((e) => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}</SelectContent></Select>
                <Input type="date" className="w-40" value={paper.first} onChange={(e) => setPaper({ ...paper, first: e.target.value })} title="First paper date" />
                <Input className="w-24" value={paper.st} onChange={(e) => setPaper({ ...paper, st: e.target.value })} title="Start" /><Input className="w-24" value={paper.en} onChange={(e) => setPaper({ ...paper, en: e.target.value })} title="End" />
                <Input className="w-32" placeholder="Room" value={paper.room} onChange={(e) => setPaper({ ...paper, room: e.target.value })} />
                <Button variant="outline" disabled={busy || !paper.exam || !paper.first} onClick={() => void run(() => examLogisticsService.supplementaryPapers(paper.exam, paper.first, paper.st, paper.en, paper.room), 'Papers generated (one per day from the first date)')}>Generate</Button>
              </div></div>}
          </CardContent>
        </Card>)}

      {dlg && <Dialog open onOpenChange={(o) => !o && setDlg(null)}><DialogContent><DialogHeader><DialogTitle>{dlg.decision} — {dlg.req.student_name}, {dlg.req.subject}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {dlg.decision === 'Revise' && <div className="space-y-1"><Label>Revised marks (out of {dlg.req.max_marks})</Label><Input type="number" min="0" max={dlg.req.max_marks} value={dlg.marks} onChange={(e) => setDlg({ ...dlg, marks: e.target.value })} /></div>}
          <div className="space-y-1"><Label>Note (kept with the record)</Label><Textarea value={dlg.note} onChange={(e) => setDlg({ ...dlg, note: e.target.value })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setDlg(null)}>Cancel</Button><Button disabled={busy} onClick={() => { const d = dlg; void run(() => examLogisticsService.decideRevaluation(d.req.id, d.decision, d.decision === 'Revise' ? Number(d.marks) : null, d.note.trim()), 'Decision recorded').then(() => setDlg(null)); }}>Save decision</Button></DialogFooter></DialogContent></Dialog>}
    </div>
  );
}
