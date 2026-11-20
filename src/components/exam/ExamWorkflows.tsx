import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { supabase } from '@/lib/supabase';
import { examService, type ExamItem, type ExamScheduleItem } from '@/services/examService';

type PaperState = 'Upcoming' | 'Today' | 'Held';
const stateStyle: Record<PaperState, string> = {
  Upcoming: 'bg-sky-100 text-sky-800 border-sky-200',
  Today: 'bg-amber-100 text-amber-800 border-amber-200',
  Held: 'bg-slate-100 text-slate-700 border-slate-200',
};
const today = () => new Date().toISOString().slice(0, 10);

/**
 * Examination progress board: for every paper, whether it is upcoming / today / held (from its date) and how far
 * marks entry has got (students with marks / active students in that class), plus whether results are published.
 * All numbers come from the database. (The previous tab invented "online" exams from the row index, counted EVERY
 * student as a participant of every paper and offered Monitor Live / End Exam buttons for an online-exam engine
 * that does not exist.)
 */
export const ExamWorkflows = () => {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [papers, setPapers] = useState<ExamScheduleItem[]>([]);
  const [entered, setEntered] = useState<Map<string, number>>(new Map());      // exam|class|subject -> students with marks
  const [roster, setRoster] = useState<Map<string, number>>(new Map());        // class -> active students

  const load = useCallback(async () => {
    try {
      const [e, p, results, students] = await Promise.all([
        examService.listExams(), examService.listSchedules(),
        supabase.from('exam_results').select('exam_id, class_name, subject'),
        supabase.from('students').select('class_name').eq('status', 'active').limit(10000),
      ]);
      if (results.error) throw new Error(results.error.message);
      const m = new Map<string, number>();
      (results.data || []).forEach((r: any) => { const k = `${r.exam_id}|${r.class_name}|${r.subject}`; m.set(k, (m.get(k) ?? 0) + 1); });
      const ros = new Map<string, number>();
      ((students.data || []) as any[]).forEach((s) => { if (s.class_name) ros.set(s.class_name, (ros.get(s.class_name) ?? 0) + 1); });
      setExams(e); setPapers(p); setEntered(m); setRoster(ros); setLoadError(null);
    } catch (err: any) {
      setLoadError(err?.message || 'Could not load examination progress.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useRealtimeSubscription({ table: 'exam_results', onChange: load, onReconnect: load });
  useRealtimeSubscription({ table: 'exam_schedules', onChange: load, onReconnect: load });

  const byExam = useMemo(() => {
    const m = new Map<string, ExamScheduleItem[]>();
    papers.forEach((p) => { const k = p.exam_id || ''; if (!m.has(k)) m.set(k, []); m.get(k)!.push(p); });
    return m;
  }, [papers]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (loadError) return (
    <Card><CardContent className="p-8 text-center">
      <p className="text-sm text-destructive flex items-center justify-center gap-1.5"><AlertTriangle className="h-4 w-4" /> {loadError}</p>
      <Button size="sm" variant="outline" className="mt-3" onClick={() => { setLoading(true); void load(); }}>Retry</Button>
    </CardContent></Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Examination progress</h2>
        <p className="text-muted-foreground">Which papers are done and how far marks entry has got, per class.</p>
      </div>
      {exams.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground text-sm">No examinations yet. Create one in the Scheduling tab.</CardContent></Card>
      ) : exams.map((exam) => {
        const list = (byExam.get(exam.id) ?? []).slice().sort((a, b) => a.exam_date.localeCompare(b.exam_date));
        return (
          <Card key={exam.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">{exam.title}
                {exam.is_published
                  ? <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-200">Results published</Badge>
                  : <Badge variant="outline">Results not published</Badge>}
              </CardTitle>
              <CardDescription>{exam.term} · {exam.academic_year} · {list.length} paper{list.length === 1 ? '' : 's'}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Paper</TableHead><TableHead>Class</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead className="w-56">Marks entered</TableHead></TableRow></TableHeader>
                <TableBody>
                  {list.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-6 text-sm text-muted-foreground">No papers scheduled.</TableCell></TableRow>
                  ) : list.map((p) => {
                    const state: PaperState = p.exam_date > today() ? 'Upcoming' : p.exam_date === today() ? 'Today' : 'Held';
                    const done = entered.get(`${exam.id}|${p.class_name}|${p.subject}`) ?? 0;
                    const total = roster.get(p.class_name || '') ?? 0;
                    const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="text-sm font-medium">{p.subject}</TableCell>
                        <TableCell className="text-sm">{p.class_name}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{p.exam_date} · {p.start_time}</TableCell>
                        <TableCell><Badge variant="outline" className={stateStyle[state]}>{state}</Badge></TableCell>
                        <TableCell>
                          {state === 'Upcoming' ? <span className="text-xs text-muted-foreground">Not started</span> : (
                            <div className="space-y-1">
                              <Progress value={pct} className="h-2" />
                              <p className="text-[11px] text-muted-foreground">{done} of {total || '?'} students{total === 0 ? ' (class roster not available)' : ''}</p>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
