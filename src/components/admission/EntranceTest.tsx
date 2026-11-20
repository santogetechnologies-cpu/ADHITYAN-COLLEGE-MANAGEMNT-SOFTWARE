import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CalendarPlus, ClipboardCheck, Loader2, PenTool } from 'lucide-react';
import { db } from '@/services/supabase/database';
import { useToast } from '@/hooks/use-toast';

/** Applicants who can still sit a test (open, not enrolled). */
const TESTABLE = ['Submitted', 'Under Review', 'Waitlisted', 'Approved', 'Offered'];

interface TestRow {
  id: string;
  application_id: string;
  applicant_name: string;
  roll_no: string;
  test_date: string;
  score: number | null;
  max_score: number;
  status: 'Scheduled' | 'Completed' | 'Absent';
}

const statusStyle: Record<string, string> = {
  Scheduled: 'bg-sky-100 text-sky-800 border-sky-200',
  Completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Absent: 'bg-zinc-200 text-zinc-700 border-zinc-300',
};

export const EntranceTest = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tests, setTests] = useState<TestRow[]>([]);
  const [applications, setApplications] = useState<any[]>([]);

  // schedule dialog
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [scheduling, setScheduling] = useState(false);

  // result dialog
  const [resultFor, setResultFor] = useState<TestRow | null>(null);
  const [resultMode, setResultMode] = useState<'Completed' | 'Absent'>('Completed');
  const [score, setScore] = useState('');
  const [maxScore, setMaxScore] = useState('100');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [t, a] = await Promise.all([db.getAdmissionEntranceTests(), db.getAdmissionApplications()]);
      setTests(t as TestRow[]);
      setApplications(a as any[]);
      setLoadError(null);
    } catch (err: any) {
      setLoadError(err?.message || 'Could not load entrance tests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const testedIds = useMemo(() => new Set(tests.map((t) => t.application_id)), [tests]);
  const courses = useMemo(
    () => Array.from(new Set(applications.map((a) => a.class_name).filter(Boolean))).sort() as string[],
    [applications]
  );
  // applicants without a test record yet (existing Scheduled ones can be moved from the table)
  const eligible = useMemo(
    () => applications.filter((a) => TESTABLE.includes(a.status) && !testedIds.has(a.id) && (courseFilter === 'all' || a.class_name === courseFilter)),
    [applications, testedIds, courseFilter]
  );

  const stats = useMemo(() => {
    const done = tests.filter((t) => t.status === 'Completed' && t.score != null);
    const avg = done.length ? Math.round(done.reduce((s, t) => s + (Number(t.score) / Number(t.max_score)) * 100, 0) / done.length) : null;
    return {
      scheduled: tests.filter((t) => t.status === 'Scheduled').length,
      completed: done.length,
      absent: tests.filter((t) => t.status === 'Absent').length,
      avg,
    };
  }, [tests]);

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const openSchedule = () => {
    setPicked(new Set());
    setScheduleDate('');
    setCourseFilter('all');
    setScheduleOpen(true);
  };

  const submitSchedule = async () => {
    if (!scheduleDate) {
      toast({ title: 'Choose the test date', variant: 'destructive' });
      return;
    }
    if (picked.size === 0) {
      toast({ title: 'Select at least one applicant', variant: 'destructive' });
      return;
    }
    setScheduling(true);
    try {
      const r = await db.scheduleEntranceTests(Array.from(picked), scheduleDate);
      const skipped = r.skipped?.length ?? 0;
      toast({
        title: 'Tests scheduled',
        description: `${r.scheduled} scheduled${r.rescheduled ? `, ${r.rescheduled} moved` : ''}${skipped ? `, ${skipped} skipped (${r.skipped[0].name}: ${r.skipped[0].reason}${skipped > 1 ? '…' : ''})` : ''}.`,
      });
      setScheduleOpen(false);
      await load();
    } catch (err: any) {
      toast({ title: 'Could not schedule tests', description: err?.message, variant: 'destructive' });
    } finally {
      setScheduling(false);
    }
  };

  const openResult = (t: TestRow) => {
    setResultFor(t);
    setResultMode('Completed');
    setScore('');
    setMaxScore(String(t.max_score ?? 100));
  };

  const submitResult = async () => {
    if (!resultFor) return;
    const max = Number(maxScore);
    const sc = Number(score);
    if (resultMode === 'Completed') {
      if (!Number.isFinite(max) || max <= 0) {
        toast({ title: 'Check the maximum score', description: 'It must be greater than zero.', variant: 'destructive' });
        return;
      }
      if (score.trim() === '' || !Number.isFinite(sc) || sc < 0 || sc > max) {
        toast({ title: 'Check the score', description: `Enter a score between 0 and ${max}.`, variant: 'destructive' });
        return;
      }
    }
    setSaving(true);
    try {
      await db.recordEntranceResult(resultFor.id, resultMode === 'Absent' ? { status: 'Absent' } : { status: 'Completed', score: sc, maxScore: max });
      toast({ title: resultMode === 'Absent' ? 'Marked absent' : 'Result saved', description: resultFor.applicant_name });
      setResultFor(null);
      await load();
    } catch (err: any) {
      toast({ title: 'Result not saved', description: err?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Entrance Tests</h2>
          <p className="text-muted-foreground">Schedule tests for applicants and record their scores. Scores feed the merit list.</p>
        </div>
        <Button onClick={openSchedule} className="flex items-center gap-2">
          <CalendarPlus className="h-4 w-4" />
          <span>Schedule tests</span>
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-5 text-center"><PenTool className="h-6 w-6 mx-auto text-sky-600 mb-1" /><p className="text-2xl font-bold">{stats.scheduled}</p><p className="text-sm text-muted-foreground">Awaiting test</p></CardContent></Card>
        <Card><CardContent className="p-5 text-center"><ClipboardCheck className="h-6 w-6 mx-auto text-emerald-600 mb-1" /><p className="text-2xl font-bold">{stats.completed}</p><p className="text-sm text-muted-foreground">Results recorded</p></CardContent></Card>
        <Card><CardContent className="p-5 text-center"><p className="text-2xl font-bold">{stats.absent}</p><p className="text-sm text-muted-foreground">Absent</p></CardContent></Card>
        <Card><CardContent className="p-5 text-center"><p className="text-2xl font-bold">{stats.avg == null ? '—' : `${stats.avg}%`}</p><p className="text-sm text-muted-foreground">Average score</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-lg">Test register</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Applicant</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Test date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Score</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-6"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
              ) : loadError ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-sm text-destructive flex items-center justify-center gap-1.5"><AlertTriangle className="h-4 w-4" /> {loadError}</p>
                    <Button size="sm" variant="outline" className="mt-3" onClick={() => { setLoading(true); void load(); }}>Retry</Button>
                  </TableCell>
                </TableRow>
              ) : tests.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No tests scheduled yet. Use “Schedule tests” to pick applicants.</TableCell></TableRow>
              ) : (
                tests.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium text-sm">{t.applicant_name}</TableCell>
                    <TableCell className="font-mono text-xs">{t.roll_no}</TableCell>
                    <TableCell className="text-sm">{t.test_date}</TableCell>
                    <TableCell><Badge variant="outline" className={statusStyle[t.status]}>{t.status}</Badge></TableCell>
                    <TableCell className="text-sm font-mono">{t.status === 'Completed' && t.score != null ? `${t.score} / ${t.max_score}` : '—'}</TableCell>
                    <TableCell className="text-right">
                      {t.status === 'Scheduled' && (
                        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => openResult(t)}>Record result</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Schedule dialog */}
      <Dialog open={scheduleOpen} onOpenChange={(o) => { if (!scheduling) setScheduleOpen(o); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule entrance tests</DialogTitle>
            <DialogDescription>Pick the applicants and the test date. Applicants who already have a test record are not listed.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Test date *</Label>
              <Input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Course</Label>
              <Select value={courseFilter} onValueChange={(v) => { setCourseFilter(v); setPicked(new Set()); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All courses</SelectItem>
                  {courses.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{picked.size} of {eligible.length} selected</span>
            <Button type="button" size="sm" variant="ghost" className="h-7 text-xs"
              onClick={() => setPicked(picked.size === eligible.length ? new Set() : new Set(eligible.map((a) => a.id)))}>
              {picked.size === eligible.length && eligible.length > 0 ? 'Clear' : 'Select all'}
            </Button>
          </div>
          <div className="max-h-64 overflow-y-auto border rounded-md divide-y">
            {eligible.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">No applicants available for testing.</p>
            ) : eligible.map((a) => (
              <label key={a.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50">
                <Checkbox checked={picked.has(a.id)} onCheckedChange={() => toggle(a.id)} />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium truncate">{a.name}</span>
                  <span className="block text-[11px] text-muted-foreground truncate">{a.application_no} · {a.class_name} · {a.status}</span>
                </span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)} disabled={scheduling}>Cancel</Button>
            <Button onClick={submitSchedule} disabled={scheduling}>
              {scheduling ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Schedule {picked.size > 0 ? `(${picked.size})` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Result dialog */}
      <Dialog open={!!resultFor} onOpenChange={(o) => { if (!o && !saving) setResultFor(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Record result</DialogTitle>
            <DialogDescription>{resultFor?.applicant_name} · {resultFor?.roll_no}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button type="button" size="sm" variant={resultMode === 'Completed' ? 'default' : 'outline'} className="flex-1" onClick={() => setResultMode('Completed')}>Attended</Button>
              <Button type="button" size="sm" variant={resultMode === 'Absent' ? 'default' : 'outline'} className="flex-1" onClick={() => setResultMode('Absent')}>Absent</Button>
            </div>
            {resultMode === 'Completed' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Score *</Label>
                  <Input type="number" min="0" step="0.01" value={score} onChange={(e) => setScore(e.target.value)} className="font-mono" autoFocus />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Out of</Label>
                  <Input type="number" min="1" step="0.01" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} className="font-mono" />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResultFor(null)} disabled={saving}>Cancel</Button>
            <Button onClick={submitResult} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
