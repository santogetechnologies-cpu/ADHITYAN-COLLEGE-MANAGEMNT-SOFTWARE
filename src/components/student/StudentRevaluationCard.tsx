import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { examService, type ExamItem } from '@/services/examService';
import { examLogisticsService, type RevalRequest } from '@/services/examLogisticsService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { askConfirm, askText } from '@/lib/dialogs';

/** Revaluation requests for published marks while a window is open, and the outcome of earlier requests. */
export function StudentRevaluationCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState<Array<{ exam: ExamItem; results: any[] }>>([]);
  const [mine, setMine] = useState<RevalRequest[]>([]);
  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const sb: any = supabase;
      const exams = (await examService.listExams()).filter((e) => e.revaluation_open && (!e.revaluation_deadline || e.revaluation_deadline >= new Date().toISOString().slice(0, 10)));
      const reqs = await examLogisticsService.revaluations();
      setMine(reqs.filter((r) => r.student_id === user.id));
      const out = [];
      for (const e of exams) {
        const { data } = await sb.from('exam_results').select('subject, marks_obtained, max_marks, result_status').eq('exam_id', e.id).eq('student_id', user.id).eq('is_published', true);
        out.push({ exam: e, results: (data || []).filter((r: any) => r.result_status !== 'Absent') });
      }
      setOpen(out);
    } catch { /* nothing to show */ }
  }, [user?.id]);
  useEffect(() => { void load(); }, [load]);

  const ask = async (examId: string, subject: string) => {
    const reason = await askText(`Why do you want ${subject} re-checked?`, { title: 'Request re-checking', required: true, minLength: 10, confirmLabel: 'Request' });
    if (!reason) return;
    try { await examLogisticsService.requestRevaluation(examId, subject, reason); toast({ title: 'Revaluation requested' }); await load(); }
    catch (e: any) { toast({ title: 'Not requested', description: e.message, variant: 'destructive' }); }
  };

  if (open.length === 0 && mine.length === 0) return null;
  const asked = new Set(mine.map((r) => `${r.exam_id}|${r.subject}`));
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Revaluation</CardTitle><CardDescription>Ask for a re-check of a published mark while the window is open. The marks can go up or down. {open.some(({ exam }) => (exam.revaluation_fee ?? 0) > 0) ? 'A fee applies and appears under Fees & Receipts; the request is decided after it is paid.' : ''}</CardDescription></CardHeader>
      <CardContent className="space-y-3 text-sm">
        {open.map(({ exam, results }) => (
          <div key={exam.id}><div className="font-medium">{exam.title} <span className="text-xs text-muted-foreground">until {exam.revaluation_deadline ?? 'further notice'}</span></div>
            {results.map((r) => (<div key={r.subject} className="flex items-center justify-between py-1 border-b last:border-0"><span>{r.subject} — {r.marks_obtained}/{r.max_marks}</span>
              {asked.has(`${exam.id}|${r.subject}`) ? <Badge variant="secondary">Requested</Badge> : <Button size="sm" variant="outline" onClick={() => ask(exam.id, r.subject)}>Request revaluation</Button>}</div>))}</div>))}
        {mine.length > 0 && <table className="w-full text-xs"><thead className="text-muted-foreground"><tr><th className="text-left py-1">Subject</th><th className="text-left">Status</th><th className="text-right">Marks</th><th className="text-left pl-3">Decision</th></tr></thead>
          <tbody>{mine.map((r) => <tr key={r.id} className="border-t"><td className="py-1">{r.subject}</td><td>{r.status}</td><td className="text-right font-mono">{r.original_marks}{r.revised_marks != null ? ` → ${r.revised_marks}` : ''}</td><td className="pl-3">{r.decision_note || '—'}</td></tr>)}</tbody></table>}
      </CardContent>
    </Card>
  );
}
