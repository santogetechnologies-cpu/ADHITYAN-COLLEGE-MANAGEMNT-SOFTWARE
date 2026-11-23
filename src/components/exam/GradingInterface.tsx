import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Loader2, Lock, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { examService, type ExamItem, type ExamResultItem, type ExamScheduleItem } from '@/services/examService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

interface RosterStudent { id: string; name: string; student_id: string | null; roll_number: string | null }
interface Entry { marks: string; absent: boolean }

/**
 * Marks entry. Pick an examination and a paper; the class roster is listed and marks are typed against each
 * student. The server (exam_save_marks) validates every row, applies the pass mark and grade bands, and saves
 * all rows or none. Teachers can only enter marks for classes they teach and only until results are published.
 * (Replaces a screen that grouped results by a column that does not exist, guessed "MCQ vs subjective" from the
 * subject name and could not enter marks for a student who had none yet.)
 */
export const GradingInterface = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const isCorrector = ['admin', 'principal', 'coe'].includes(user?.role ?? '');

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [papers, setPapers] = useState<ExamScheduleItem[]>([]);
  const [examId, setExamId] = useState('');
  const [paperId, setPaperId] = useState('');

  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [existing, setExisting] = useState<Map<string, ExamResultItem>>(new Map());
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [saving, setSaving] = useState(false);
  const [rowErrors, setRowErrors] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [e, p] = await Promise.all([examService.listExams(), examService.listSchedules()]);
        setExams(e); setPapers(p);
        if (e[0]) setExamId(e[0].id);
        setLoadError(null);
      } catch (err: any) { setLoadError(err?.message || 'Could not load examinations.'); }
      finally { setLoading(false); }
    })();
  }, []);

  const examPapers = useMemo(() => papers.filter((p) => p.exam_id === examId), [papers, examId]);
  useEffect(() => { setPaperId(examPapers[0]?.id ?? ''); }, [examId]);   // eslint-disable-line react-hooks/exhaustive-deps
  const paper = examPapers.find((p) => p.id === paperId) ?? null;
  const exam = exams.find((e) => e.id === examId) ?? null;

  const loadRoster = useCallback(async () => {
    if (!paper || !paper.class_name) { setRoster([]); setExisting(new Map()); setEntries({}); return; }
    setRosterLoading(true);
    try {
      const [rs, results] = await Promise.all([
        supabase.from('profiles').select('id, name, student_id, roll_number').eq('role', 'student').eq('class_name', paper.class_name).eq('status', 'active').order('name'),
        examService.listResults(paper.exam_id),
      ]);
      if (rs.error) throw new Error(rs.error.message);
      const mine = new Map(results.filter((r) => r.subject === paper.subject).map((r) => [r.student_id, r]));
      setRoster(((rs.data || []) as any[]) as RosterStudent[]);
      setExisting(mine);
      const e: Record<string, Entry> = {};
      mine.forEach((r, sid) => { e[sid] = { marks: String(r.marks_obtained), absent: r.result_status === 'Absent' }; });
      setEntries(e);
      setRowErrors([]);
    } catch (err: any) {
      toast({ title: 'Could not load the class list', description: err?.message, variant: 'destructive' });
    } finally { setRosterLoading(false); }
  }, [paper?.id]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void loadRoster(); }, [loadRoster]);

  const published = exam?.is_published === true;
  const locked = published && !isCorrector;
  const set = (id: string, patch: Partial<Entry>) => setEntries((prev) => ({ ...prev, [id]: { marks: '', absent: false, ...prev[id], ...patch } }));

  const changed = roster.filter((s) => {
    const cur = entries[s.id]; const old = existing.get(s.id);
    if (!cur || (cur.marks.trim() === '' && !cur.absent)) return false;
    if (!old) return true;
    return cur.absent !== (old.result_status === 'Absent') || (!cur.absent && Number(cur.marks) !== old.marks_obtained);
  });

  const save = async () => {
    if (!paper || changed.length === 0) return;
    setSaving(true); setRowErrors([]);
    try {
      const r = await examService.saveResults(changed.map((s) => ({
        exam_id: paper.exam_id, student_id: s.id, subject: paper.subject,
        marks_obtained: entries[s.id].absent ? 0 : Number(entries[s.id].marks), total_marks: paper.max_marks, absent: entries[s.id].absent,
      })));
      toast({ title: 'Marks saved', description: `${r.saved} student${r.saved === 1 ? '' : 's'} saved for ${paper.subject}.` });
      await loadRoster();
    } catch (err: any) {
      const list = Array.isArray(err?.errors) ? err.errors.map((e: any) => `${e.student ?? 'Row ' + e.row}: ${e.error}`) : [];
      setRowErrors(list);
      toast({ title: 'No marks were saved', description: list.length ? 'Fix the highlighted problems and save again.' : err?.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (loadError) return (
    <Card><CardContent className="p-8 text-center"><p className="text-sm text-destructive flex items-center justify-center gap-1.5"><AlertTriangle className="h-4 w-4" /> {loadError}</p></CardContent></Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Marks entry</h2>
        <p className="text-muted-foreground">Enter each student's marks for a paper. All marks in one save are checked together: if any row is wrong, nothing is saved.</p>
      </div>

      {exams.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">No examinations yet. They are created in the Scheduling tab.</CardContent></Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Examination</Label>
                <Select value={examId} onValueChange={setExamId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{exams.map((e) => <SelectItem key={e.id} value={e.id}>{e.title} · {e.academic_year}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Paper</Label>
                <Select value={paperId} onValueChange={setPaperId} disabled={examPapers.length === 0}>
                  <SelectTrigger><SelectValue placeholder={examPapers.length ? 'Choose' : 'No papers scheduled'} /></SelectTrigger>
                  <SelectContent>{examPapers.map((p) => <SelectItem key={p.id} value={p.id}>{p.subject} · {p.class_name} · {p.exam_date}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {paper && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">{paper.subject} <span className="text-sm font-normal text-muted-foreground">· {paper.class_name}</span></CardTitle>
                    <CardDescription>Out of {paper.max_marks} · pass mark {paper.passing_marks}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {published && <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-200">Results published</Badge>}
                    {locked && <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" /> Locked: corrections need the examination office</Badge>}
                    <Button onClick={save} disabled={saving || locked || changed.length === 0}>
                      {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                      Save {changed.length > 0 ? `(${changed.length})` : ''}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {rowErrors.length > 0 && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs space-y-0.5">
                    <p className="font-semibold text-destructive">Nothing was saved. Please fix:</p>
                    {rowErrors.map((e, i) => <p key={i}>{e}</p>)}
                  </div>
                )}
                {rosterLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                ) : roster.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No active students with a portal login are listed for {paper.class_name}, or your account has no access to this class.</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>ID</TableHead><TableHead className="w-40">Marks (/{paper.max_marks})</TableHead><TableHead>Absent</TableHead><TableHead>Saved result</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {roster.map((s) => {
                        const cur = entries[s.id] ?? { marks: '', absent: false };
                        const old = existing.get(s.id);
                        return (
                          <TableRow key={s.id}>
                            <TableCell className="text-sm font-medium">{s.name}</TableCell>
                            <TableCell className="text-xs font-mono">{s.student_id || s.roll_number || '—'}</TableCell>
                            <TableCell>
                              <Input type="number" min="0" max={paper.max_marks} step="0.5" value={cur.absent ? '' : cur.marks} disabled={cur.absent || locked}
                                onChange={(e) => set(s.id, { marks: e.target.value })} className="h-8 font-mono" aria-label={`Marks for ${s.name}`} />
                            </TableCell>
                            <TableCell><Checkbox checked={cur.absent} disabled={locked} onCheckedChange={(c) => set(s.id, { absent: c === true })} aria-label={`${s.name} absent`} /></TableCell>
                            <TableCell className="text-xs">
                              {old ? <span><span className="font-mono">{old.result_status === 'Absent' ? 'AB' : `${old.marks_obtained}/${old.total_marks}`}</span> · {old.grade} · <span className={old.result_status === 'Pass' ? 'text-emerald-700' : old.result_status === 'Fail' ? 'text-destructive' : ''}>{old.result_status}</span></span> : <span className="text-muted-foreground">not entered</span>}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default GradingInterface;
