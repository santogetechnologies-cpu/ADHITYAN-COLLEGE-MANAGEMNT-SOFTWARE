import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CalendarPlus, FilePlus2, Loader2, Trash2 } from 'lucide-react';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { examService, type ExamItem, type ExamScheduleItem } from '@/services/examService';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { OFFICIAL_COURSES } from '@/constants/courses';
import { askConfirm, askText } from '@/lib/dialogs';

const sb: any = supabase;   // generated typings in this repo do not resolve update payloads

const statusStyle: Record<string, string> = {
  Scheduled: 'bg-sky-100 text-sky-800 border-sky-200',
  Ongoing: 'bg-amber-100 text-amber-800 border-amber-200',
  Completed: 'bg-slate-100 text-slate-700 border-slate-200',
  'Results Published': 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

export const ExamScheduling = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const canManage = ['admin', 'principal', 'coe'].includes(user?.role ?? '');

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [papers, setPapers] = useState<ExamScheduleItem[]>([]);

  const [examOpen, setExamOpen] = useState(false);
  const [paperOpen, setPaperOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ex, setEx] = useState({ name: '', term: '', academic_year: '', start_date: '', end_date: '', course: '', semester: '', exam_category: '' });
  const [pp, setPp] = useState({ exam_id: '', class_name: '', subject: '', subject_code: '', room: '', exam_date: '', start_time: '09:00', end_time: '12:00', max_marks: '100', passing_marks: '40', credits: '' });

  const load = useCallback(async () => {
    try {
      const [e, s] = await Promise.all([examService.listExams(), examService.listSchedules()]);
      setExams(e);
      setPapers(s);
      setLoadError(null);
    } catch (err: any) {
      setLoadError(err?.message || 'Could not load examinations.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useRealtimeSubscription({ table: 'exam_schedules', onChange: load, onReconnect: load });
  useRealtimeSubscription({ table: 'exams', onChange: load, onReconnect: load });

  const papersByExam = useMemo(() => {
    const m = new Map<string, ExamScheduleItem[]>();
    papers.forEach((p) => { const k = p.exam_id || ''; if (!m.has(k)) m.set(k, []); m.get(k)!.push(p); });
    return m;
  }, [papers]);

  const createExam = async () => {
    setBusy(true);
    try {
      const created = await examService.createExam({ ...ex, course: ex.course || undefined, semester: ex.semester || undefined, exam_category: ex.exam_category || undefined });
      toast({ title: 'Examination created', description: `${created.title}. Now add its papers.` });
      setExamOpen(false);
      setEx({ name: '', term: '', academic_year: '', start_date: '', end_date: '', course: '', semester: '', exam_category: '' });
      await load();
      setPp((p) => ({ ...p, exam_id: created.id }));
    } catch (err: any) {
      toast({ title: 'Examination not created', description: err?.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const createPaper = async () => {
    const max = Number(pp.max_marks); const pass = Number(pp.passing_marks);
    if (!pp.exam_id || !pp.class_name || !pp.subject.trim() || !pp.exam_date) {
      toast({ title: 'Incomplete details', description: 'Choose the examination, class, subject and date.', variant: 'destructive' });
      return;
    }
    if (!Number.isFinite(max) || max <= 0 || !Number.isFinite(pass) || pass < 0 || pass > max) {
      toast({ title: 'Check the marks', description: 'Maximum marks must be above zero and passing marks cannot exceed it.', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      await examService.createSchedule({
        exam_id: pp.exam_id, class_name: pp.class_name, subject: pp.subject.trim(), subject_code: pp.subject_code.trim() || undefined,
        room: pp.room.trim() || undefined, exam_date: pp.exam_date, start_time: pp.start_time, end_time: pp.end_time, max_marks: max, passing_marks: pass, credits: pp.credits ? Number(pp.credits) : null,
      });
      toast({ title: 'Paper scheduled', description: `${pp.subject} · ${pp.class_name} · ${pp.exam_date}` });
      setPaperOpen(false);
      setPp((p) => ({ ...p, subject: '', subject_code: '' }));
      await load();
    } catch (err: any) {
      toast({ title: 'Paper not scheduled', description: err?.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const removePaper = async (id: string) => {
    if (!(await askConfirm('Remove this paper from the timetable?', { title: 'Remove paper', confirmLabel: 'Remove', destructive: true }))) return;
    try { await examService.deleteSchedule(id); await load(); }
    catch (err: any) { toast({ title: 'Paper not removed', description: err?.message, variant: 'destructive' }); }
  };

  const setTimetablePublished = async (exam: ExamItem, published: boolean) => {
    if (published && (papersByExam.get(exam.id)?.length ?? 0) === 0) {
      toast({ title: 'Nothing to publish', description: 'Add at least one paper first.', variant: 'destructive' });
      return;
    }
    const { error } = await sb.from('exams').update({ timetable_published: published }).eq('id', exam.id);
    if (error) { toast({ title: 'Not updated', description: error.message, variant: 'destructive' }); return; }
    toast({ title: published ? 'Timetable published' : 'Timetable hidden', description: published ? 'Students can now see this examination and its timetable.' : 'Students can no longer see the timetable.' });
    await load();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (loadError) return (
    <Card><CardContent className="p-8 text-center">
      <p className="text-sm text-destructive flex items-center justify-center gap-1.5"><AlertTriangle className="h-4 w-4" /> {loadError}</p>
      <Button size="sm" variant="outline" className="mt-3" onClick={() => { setLoading(true); void load(); }}>Retry</Button>
    </CardContent></Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Examinations & timetable</h2>
          <p className="text-muted-foreground">Create an examination, add its papers, then publish the timetable to students.</p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setExamOpen(true)}><FilePlus2 className="h-4 w-4 mr-2" /> New examination</Button>
            <Button onClick={() => { setPp((p) => ({ ...p, exam_id: p.exam_id || exams[0]?.id || '' })); setPaperOpen(true); }} disabled={exams.length === 0}>
              <CalendarPlus className="h-4 w-4 mr-2" /> Add paper
            </Button>
          </div>
        )}
      </div>

      {exams.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground text-sm">
          No examinations yet.{canManage ? ' Create one to start scheduling papers.' : ' The examination office has not created any.'}
        </CardContent></Card>
      ) : exams.map((exam) => {
        const list = (papersByExam.get(exam.id) ?? []).slice().sort((a, b) => (a.exam_date + a.start_time).localeCompare(b.exam_date + b.start_time));
        return (
          <Card key={exam.id}>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {exam.title}
                    <Badge variant="outline" className={statusStyle[exam.status || 'Scheduled']}>{exam.status}</Badge>
                    {exam.timetable_published && <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Timetable visible to students</Badge>}
                  </CardTitle>
                  <CardDescription>{exam.term} · {exam.academic_year} · {exam.start_date} to {exam.end_date}{exam.course ? ` · ${exam.course}` : ''}{exam.semester ? ` · Sem ${exam.semester}` : ''}</CardDescription>
                </div>
                {canManage && (
                  <Button size="sm" variant={exam.timetable_published ? 'outline' : 'default'} onClick={() => setTimetablePublished(exam, !exam.timetable_published)}>
                    {exam.timetable_published ? 'Hide timetable' : 'Publish timetable'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Time</TableHead><TableHead>Class</TableHead><TableHead>Subject</TableHead><TableHead>Room</TableHead><TableHead className="text-right">Marks (pass)</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>
                  {list.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-6 text-sm text-muted-foreground">No papers yet.</TableCell></TableRow>
                  ) : list.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm whitespace-nowrap">{p.exam_date}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{p.start_time} – {p.end_time}</TableCell>
                      <TableCell className="text-sm">{p.class_name}</TableCell>
                      <TableCell className="text-sm font-medium">{p.subject}{p.subject_code ? <span className="text-[11px] text-muted-foreground font-mono"> {p.subject_code}</span> : null}</TableCell>
                      <TableCell className="text-sm">{p.room}</TableCell>
                      <TableCell className="text-right text-sm font-mono">{p.max_marks} ({p.passing_marks})</TableCell>
                      <TableCell className="text-right">{canManage && <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => removePaper(p.id)} aria-label="Remove paper"><Trash2 className="h-3.5 w-3.5" /></Button>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}

      {/* new examination */}
      <Dialog open={examOpen} onOpenChange={(o) => { if (!busy) setExamOpen(o); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>New examination</DialogTitle><DialogDescription>For example “Semester 1 – End semester” for 2026-27.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2"><Label className="text-xs font-semibold">Name *</Label><Input value={ex.name} onChange={(e) => setEx({ ...ex, name: e.target.value })} maxLength={150} /></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold">Term *</Label><Input value={ex.term} onChange={(e) => setEx({ ...ex, term: e.target.value })} placeholder="e.g. Term 1" /></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold">Academic year *</Label><Input value={ex.academic_year} onChange={(e) => setEx({ ...ex, academic_year: e.target.value })} placeholder="2026-27" /></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold">Starts *</Label><Input type="date" value={ex.start_date} onChange={(e) => setEx({ ...ex, start_date: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold">Ends *</Label><Input type="date" value={ex.end_date} onChange={(e) => setEx({ ...ex, end_date: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold">Course (optional)</Label><Input value={ex.course} onChange={(e) => setEx({ ...ex, course: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold">Semester (optional)</Label><Input value={ex.semester} onChange={(e) => setEx({ ...ex, semester: e.target.value })} /></div>
            <div className="space-y-1.5 col-span-2"><Label className="text-xs font-semibold">Category (optional)</Label><Input value={ex.exam_category} onChange={(e) => setEx({ ...ex, exam_category: e.target.value })} placeholder="Internal, Semester, Practical, Supplementary…" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setExamOpen(false)} disabled={busy}>Cancel</Button><Button onClick={createExam} disabled={busy || !ex.name.trim() || !ex.term.trim() || !ex.academic_year.trim() || !ex.start_date || !ex.end_date}>{busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* add paper */}
      <Dialog open={paperOpen} onOpenChange={(o) => { if (!busy) setPaperOpen(o); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Add paper</DialogTitle><DialogDescription>The same room or class cannot have two overlapping papers on one day.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs font-semibold">Examination *</Label>
              <Select value={pp.exam_id} onValueChange={(v) => setPp({ ...pp, exam_id: v })}>
                <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
                <SelectContent>{exams.map((e) => <SelectItem key={e.id} value={e.id}>{e.title} · {e.academic_year}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs font-semibold">Class / programme *</Label>
              <Select value={pp.class_name} onValueChange={(v) => setPp({ ...pp, class_name: v })}>
                <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
                <SelectContent>{OFFICIAL_COURSES.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold">Subject *</Label><Input value={pp.subject} onChange={(e) => setPp({ ...pp, subject: e.target.value })} maxLength={120} /></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold">Subject code</Label><Input value={pp.subject_code} onChange={(e) => setPp({ ...pp, subject_code: e.target.value })} maxLength={20} className="font-mono" /></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold">Date *</Label><Input type="date" value={pp.exam_date} onChange={(e) => setPp({ ...pp, exam_date: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold">Room</Label><Input value={pp.room} onChange={(e) => setPp({ ...pp, room: e.target.value })} placeholder="e.g. Hall A" /></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold">Starts *</Label><Input type="time" value={pp.start_time} onChange={(e) => setPp({ ...pp, start_time: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold">Ends *</Label><Input type="time" value={pp.end_time} onChange={(e) => setPp({ ...pp, end_time: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold">Maximum marks</Label><Input type="number" min="1" value={pp.max_marks} onChange={(e) => setPp({ ...pp, max_marks: e.target.value })} className="font-mono" /></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold">Credits (for GPA)</Label><Input type="number" min="0.5" step="0.5" value={pp.credits} onChange={(e) => setPp({ ...pp, credits: e.target.value })} placeholder="optional" className="font-mono" /></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold">Passing marks</Label><Input type="number" min="0" value={pp.passing_marks} onChange={(e) => setPp({ ...pp, passing_marks: e.target.value })} className="font-mono" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setPaperOpen(false)} disabled={busy}>Cancel</Button><Button onClick={createPaper} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}Schedule paper</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
