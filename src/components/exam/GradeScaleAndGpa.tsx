import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Loader2, Plus, Trash2 } from 'lucide-react';
import { gpaService, type GradeBand, type GpaReportRow } from '@/services/gpaService';
import { examService, type ExamItem } from '@/services/examService';
import { exportToCSV } from '@/lib/exportUtils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

export function GradeScaleAndGpa() {
  const { toast } = useToast();
  const { user } = useAuth();
  const canEdit = ['admin', 'principal', 'coe'].includes(user?.role ?? '');
  const [bands, setBands] = useState<GradeBand[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [examId, setExamId] = useState('');
  const [rows, setRows] = useState<GpaReportRow[]>([]);

  const load = useCallback(async () => {
    try { const [b, e] = await Promise.all([gpaService.bands(), examService.listExams()]); setBands(b); setExams(e); setExamId((c) => c || e[0]?.id || ''); }
    catch (e: any) { toast({ title: 'Could not load', description: e.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (examId) gpaService.classReport(examId).then(setRows).catch(() => setRows([])); }, [examId]);

  const save = async () => {
    setSaving(true);
    try { await gpaService.saveBands(bands); toast({ title: 'Grade scale saved', description: 'New marks use it immediately; existing grades are not rewritten.' }); await load(); }
    catch (e: any) { toast({ title: 'Not saved', description: e.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };
  const set = (i: number, k: keyof GradeBand, v: string) => setBands((b) => b.map((x, j) => (j === i ? { ...x, [k]: k === 'grade' ? v : Number(v) } : x)));

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Grade scale</CardTitle><CardDescription>Percentage bands → grade and grade points. A failing paper is always grade F with 0 points. A band starting at 0% is required.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <Table><TableHeader><TableRow><TableHead>From % (inclusive)</TableHead><TableHead>Grade</TableHead><TableHead>Grade points</TableHead><TableHead /></TableRow></TableHeader><TableBody>
            {bands.map((b, i) => (
              <TableRow key={i}>
                <TableCell><Input disabled={!canEdit} className="w-28" type="number" min="0" max="100" value={b.min_pct} onChange={(e) => set(i, 'min_pct', e.target.value)} /></TableCell>
                <TableCell><Input disabled={!canEdit} className="w-24" value={b.grade} onChange={(e) => set(i, 'grade', e.target.value)} /></TableCell>
                <TableCell><Input disabled={!canEdit} className="w-24" type="number" min="0" step="0.5" value={b.grade_point} onChange={(e) => set(i, 'grade_point', e.target.value)} /></TableCell>
                <TableCell>{canEdit && <Button variant="ghost" size="sm" onClick={() => setBands((x) => x.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></Button>}</TableCell>
              </TableRow>))}
          </TableBody></Table>
          {canEdit && <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setBands((b) => [...b, { min_pct: 0, grade: '', grade_point: 0 }])}><Plus className="w-4 h-4 mr-1" />Add band</Button><Button size="sm" onClick={save} disabled={saving}>Save scale</Button></div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><div><CardTitle>Semester GPA report</CardTitle><CardDescription>SGPA by student for one examination (credits weight each paper; set credits when scheduling papers).</CardDescription></div>
          <div className="flex gap-2">
            <Select value={examId} onValueChange={setExamId}><SelectTrigger className="w-64"><SelectValue placeholder="Examination" /></SelectTrigger><SelectContent>{exams.map((e) => <SelectItem key={e.id} value={e.id}>{e.title} · {e.academic_year}</SelectItem>)}</SelectContent></Select>
            <Button variant="outline" disabled={!rows.length} onClick={() => exportToCSV('sgpa-report', ['Student', 'Class', 'Subjects', 'Failed', 'SGPA'], rows.map((r) => [r.student, r.class, r.subjects, r.failed, r.sgpa]))}><Download className="w-4 h-4 mr-1" />Export</Button>
          </div></div></CardHeader>
        <CardContent>
          <Table><TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Class</TableHead><TableHead className="text-right">Subjects</TableHead><TableHead className="text-right">Failed</TableHead><TableHead className="text-right">SGPA</TableHead></TableRow></TableHeader><TableBody>
            {rows.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">No marks entered for this examination.</TableCell></TableRow> : rows.map((r) => (
              <TableRow key={r.student_id}><TableCell className="font-medium">{r.student}</TableCell><TableCell>{r.class}</TableCell><TableCell className="text-right">{r.subjects}</TableCell><TableCell className="text-right">{r.failed}</TableCell><TableCell className="text-right font-mono">{r.sgpa ?? '—'}</TableCell></TableRow>))}
          </TableBody></Table>
        </CardContent>
      </Card>
    </div>
  );
}
