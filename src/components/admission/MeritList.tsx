import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Loader2, Trophy } from 'lucide-react';
import { db } from '@/services/supabase/database';
import { useToast } from '@/hooks/use-toast';
import { STATUS_STYLE, type AdmissionStatus } from '@/lib/admissionWorkflow';

/** Applications that take part in ranking (mirrors admission_publish_merit in migration 039). */
const RANKABLE = ['Under Review', 'Approved', 'Waitlisted', 'Offered'];

export const MeritList = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [merit, setMerit] = useState<any[]>([]);

  const [course, setCourse] = useState('');
  const [year, setYear] = useState('all');
  const [seats, setSeats] = useState('30');
  const [weightQ, setWeightQ] = useState('50');
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [excluded, setExcluded] = useState<{ name: string; reason: string }[]>([]);
  const [skipped, setSkipped] = useState<{ name: string; reason: string }[]>([]);

  const load = useCallback(async () => {
    try {
      const [apps, rows] = await Promise.all([db.getAdmissionApplications(), db.getAdmissionMeritLists()]);
      setApplications(apps as any[]);
      setMerit(rows);
      setLoadError(null);
    } catch (err: any) {
      setLoadError(err?.message || 'Could not load the merit list.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const courses = useMemo(
    () => Array.from(new Set(applications.filter((a) => RANKABLE.includes(a.status)).map((a) => a.class_name).filter(Boolean))).sort() as string[],
    [applications]
  );
  useEffect(() => {
    if (!course && courses.length > 0) setCourse(courses[0]);
  }, [courses, course]);

  const years = useMemo(
    () => Array.from(new Set(applications.filter((a) => a.class_name === course).map((a) => a.academic_year).filter(Boolean))).sort() as string[],
    [applications, course]
  );
  const appById = useMemo(() => new Map(applications.map((a) => [a.id, a])), [applications]);
  const candidates = applications.filter((a) => a.class_name === course && RANKABLE.includes(a.status) && (year === 'all' || a.academic_year === year));
  const rows = merit.filter((m) => m.course_name === course && (year === 'all' || m.academic_year === year));
  const selected = rows.filter((r) => r.status === 'Selected').length;

  const seatsNum = Number(seats);
  const wq = Number(weightQ);
  const inputsOk = Number.isInteger(seatsNum) && seatsNum >= 1 && Number.isInteger(wq) && wq >= 0 && wq <= 100;

  const generate = async () => {
    if (!inputsOk) {
      toast({ title: 'Check the inputs', description: 'Seats must be a whole number of at least 1 and the weight a whole number from 0 to 100.', variant: 'destructive' });
      return;
    }
    if (rows.length > 0 && !window.confirm(`This replaces the current merit list for ${course}. Continue?`)) return;
    setGenerating(true);
    try {
      const r = await db.publishMeritList({ course, academicYear: year === 'all' ? undefined : year, seats: seatsNum, weightQualifying: wq });
      setExcluded(r.excluded ?? []);
      setSkipped([]);
      toast({
        title: 'Merit list generated',
        description: `${r.ranked} ranked: ${r.selected} selected, ${r.waitlisted} waitlisted${r.excluded?.length ? `, ${r.excluded.length} could not be ranked` : ''}.`,
      });
      await load();
    } catch (err: any) {
      toast({ title: 'Merit list not generated', description: err?.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const apply = async () => {
    if (!window.confirm('Selected applicants will be marked Approved and the rest Waitlisted. Continue?')) return;
    setApplying(true);
    try {
      const r = await db.applyMeritDecisions({ course, academicYear: year === 'all' ? undefined : year });
      setSkipped(r.skipped ?? []);
      toast({
        title: 'Decisions applied',
        description: `${r.updated} application${r.updated === 1 ? '' : 's'} updated${r.skipped?.length ? `, ${r.skipped.length} left unchanged (see below)` : ''}.`,
      });
      await load();
    } catch (err: any) {
      toast({ title: 'Decisions not applied', description: err?.message, variant: 'destructive' });
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Merit List</h2>
        <p className="text-muted-foreground">Rank applicants of a course from their qualifying marks and entrance-test score, then apply the result.</p>
      </div>

      {loadError ? (
        <Card><CardContent className="p-8 text-center">
          <p className="text-sm text-destructive flex items-center justify-center gap-1.5"><AlertTriangle className="h-4 w-4" /> {loadError}</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={() => { setLoading(true); void load(); }}>Retry</Button>
        </CardContent></Card>
      ) : loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : courses.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          No applications are under review yet. Move applications to “Under Review” in the Applications tab to rank them.
        </CardContent></Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2"><Trophy className="h-5 w-5 text-amber-500" /> Ranking settings</CardTitle>
              <CardDescription>
                Score = qualifying marks × {Number.isFinite(wq) ? wq : '–'}% + entrance score × {Number.isFinite(wq) ? 100 - wq : '–'}%. Both are percentages out of 100.
                Applicants missing a required score are listed as “could not be ranked”.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold">Course</Label>
                  <Select value={course} onValueChange={(v) => { setCourse(v); setYear('all'); setExcluded([]); setSkipped([]); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{courses.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Academic year</Label>
                  <Select value={year} onValueChange={setYear}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Seats</Label>
                  <Input type="number" min="1" step="1" value={seats} onChange={(e) => setSeats(e.target.value)} className="font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Qualifying weight %</Label>
                  <Input type="number" min="0" max="100" step="1" value={weightQ} onChange={(e) => setWeightQ(e.target.value)} className="font-mono" />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <Button onClick={generate} disabled={generating || applying || !inputsOk || candidates.length === 0}>
                  {generating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                  {rows.length > 0 ? 'Regenerate ranking' : 'Generate ranking'}
                </Button>
                <Button variant="outline" onClick={apply} disabled={applying || generating || rows.length === 0}>
                  {applying ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                  Apply to applications
                </Button>
                <span className="text-xs text-muted-foreground">{candidates.length} applicant{candidates.length === 1 ? '' : 's'} eligible for ranking</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Ranking{rows.length > 0 ? ` — ${selected} selected, ${rows.length - selected} waitlisted` : ''}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Merit result</TableHead>
                    <TableHead>Application</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No ranking yet for this course. Set the seats and weights, then generate it.</TableCell></TableRow>
                  ) : rows.map((r) => {
                    const app = appById.get(r.application_id);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono font-semibold">{r.rank}</TableCell>
                        <TableCell className="text-sm font-medium">{r.student_name}</TableCell>
                        <TableCell className="font-mono text-xs">{app?.application_no ?? '—'}</TableCell>
                        <TableCell className="font-mono text-sm">{Number(r.merit_score).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={r.status === 'Selected' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-orange-100 text-orange-800 border-orange-200'}>{r.status}</Badge>
                        </TableCell>
                        <TableCell>
                          {app ? <Badge variant="outline" className={STATUS_STYLE[app.status as AdmissionStatus] ?? ''}>{app.status}</Badge> : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {excluded.length > 0 && (
            <Card className="border-amber-200">
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /> Could not be ranked ({excluded.length})</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-1">
                {excluded.map((e, i) => <p key={i}><span className="font-medium">{e.name}</span> — {e.reason}</p>)}
              </CardContent>
            </Card>
          )}
          {skipped.length > 0 && (
            <Card className="border-amber-200">
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /> Left unchanged ({skipped.length})</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-1">
                {skipped.map((e, i) => <p key={i}><span className="font-medium">{e.name}</span> — {e.reason}</p>)}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
