import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { examService, type ExamItem } from '@/services/examService';
import { examLogisticsService, type SeatRow, type ExamRoom } from '@/services/examLogisticsService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

/** Examination registration (where required) and the student's own seat once hall tickets are published. */
export function StudentExamRegistrationCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [mine, setMine] = useState<Record<string, string>>({});
  const [seats, setSeats] = useState<Array<SeatRow & { room?: string }>>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const all = await examService.listExams();
      const reg = all.filter((e) => e.registration_required);
      setExams(reg);
      const regs: Record<string, string> = {};
      for (const e of reg) { const r = await examLogisticsService.registrations(e.id); const m = r.find((x) => x.student_id === user.id); if (m) regs[e.id] = m.status; }
      setMine(regs);
      const sb: any = (await import('@/lib/supabase')).supabase;
      const { data } = await sb.from('exam_seating').select('*, room:exam_rooms(name)').eq('student_id', user.id).order('exam_date').order('start_time');
      setSeats((data || []).map((d: any) => ({ ...d, room: d.room?.name })));
    } catch { /* nothing to show */ }
  }, [user?.id]);
  useEffect(() => { void load(); }, [load]);

  const act = async (id: string, withdraw: boolean) => {
    setBusy(id);
    try { await examLogisticsService.register(id, withdraw); toast({ title: withdraw ? 'Registration withdrawn' : 'Registered for the examination' }); await load(); }
    catch (e: any) { toast({ title: 'Not done', description: e.message, variant: 'destructive' }); }
    finally { setBusy(null); }
  };

  if (exams.length === 0 && seats.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Examination registration &amp; seats</CardTitle><CardDescription>Register before the deadline to receive a hall ticket and seat.</CardDescription></CardHeader>
      <CardContent className="space-y-3">
        {exams.map((e) => {
          const status = mine[e.id];
          const open = e.registration_open && (!e.registration_deadline || e.registration_deadline >= new Date().toISOString().slice(0, 10));
          return (
            <div key={e.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div><div className="font-medium text-sm">{e.title}</div><div className="text-xs text-muted-foreground">{e.registration_deadline ? `Register by ${e.registration_deadline}` : 'Registration deadline not set'}</div></div>
              <div className="flex items-center gap-2">
                {status && <Badge variant={status === 'Registered' ? 'default' : 'secondary'}>{status}</Badge>}
                {open && status !== 'Registered' && <Button size="sm" disabled={busy === e.id} onClick={() => act(e.id, false)}>Register</Button>}
                {open && status === 'Registered' && <Button size="sm" variant="outline" disabled={busy === e.id} onClick={() => act(e.id, true)}>Withdraw</Button>}
                {!open && !status && <Badge variant="outline">Closed</Badge>}
              </div>
            </div>);
        })}
        {seats.length > 0 && (
          <table className="w-full text-xs"><thead className="text-muted-foreground"><tr><th className="text-left py-1">Date</th><th className="text-left">Time</th><th className="text-left">Paper</th><th className="text-left">Room</th><th className="text-right">Seat</th></tr></thead>
            <tbody>{seats.map((s) => <tr key={s.id} className="border-t"><td className="py-1">{s.exam_date}</td><td>{s.start_time}</td><td>{s.subject}</td><td>{s.room}</td><td className="text-right font-mono">{s.seat_no}</td></tr>)}</tbody></table>)}
      </CardContent>
    </Card>
  );
}
