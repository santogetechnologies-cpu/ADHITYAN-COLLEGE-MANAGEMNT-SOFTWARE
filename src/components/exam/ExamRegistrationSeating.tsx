import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Loader2, Pencil, Plus, Printer, Trash2 } from 'lucide-react';
import { examService, type ExamItem } from '@/services/examService';
import { examLogisticsService, type ExamRoom, type Invigilator, type SeatRow } from '@/services/examLogisticsService';
import { exportToCSV, printDocument } from '@/lib/exportUtils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

export function ExamRegistrationSeating() {
  const { toast } = useToast();
  const { user } = useAuth();
  const canManage = ['admin', 'principal', 'coe'].includes(user?.role ?? '');
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [examId, setExamId] = useState('');
  const [classes, setClasses] = useState<string[]>([]);
  const [sessions, setSessions] = useState<Array<{ date: string; start: string }>>([]);
  const [rooms, setRooms] = useState<ExamRoom[]>([]);
  const [seats, setSeats] = useState<SeatRow[]>([]);
  const [duty, setDuty] = useState<Invigilator[]>([]);
  const [teachers, setTeachers] = useState<Array<{ id: string; name: string }>>([]);
  const [regCount, setRegCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [deadline, setDeadline] = useState('');
  const [roomDlg, setRoomDlg] = useState<{ id?: string; name: string; block: string; capacity: string; active: boolean } | null>(null);
  const [classPick, setClassPick] = useState('');
  const [dutyPick, setDutyPick] = useState<{ session: string; room: string; teacher: string }>({ session: '', room: '', teacher: '' });
  const exam = exams.find((e) => e.id === examId);

  const loadBase = useCallback(async () => {
    try { const [e, r] = await Promise.all([examService.listExams(), examLogisticsService.rooms()]); setExams(e); setRooms(r); setExamId((c) => c || e[0]?.id || ''); }
    catch (err: any) { toast({ title: 'Could not load', description: err.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  const loadExam = useCallback(async () => {
    if (!examId) return;
    try {
      const sched = await examService.listSchedules(examId);
      setClasses(Array.from(new Set(sched.map((s) => s.class_name).filter(Boolean) as string[])));
      setSessions(Array.from(new Map(sched.map((s) => [`${s.exam_date}|${s.start_time}`, { date: s.exam_date, start: s.start_time }])).values()).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)));
      const [regs, st, inv] = await Promise.all([examLogisticsService.registrations(examId), examLogisticsService.seating(examId), examLogisticsService.invigilators(examId)]);
      setRegCount(regs.filter((r) => r.status === 'Registered').length); setSeats(st); setDuty(inv);
      if (canManage) setTeachers(await examLogisticsService.teachers().catch(() => []));
    } catch (err: any) { toast({ title: 'Could not load this examination', description: err.message, variant: 'destructive' }); }
  }, [examId, canManage]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void loadBase(); }, [loadBase]);
  useEffect(() => { void loadExam(); }, [loadExam]);
  useEffect(() => { setDeadline(exam?.registration_deadline ?? ''); }, [exam?.registration_deadline, examId]);

  const run = async (fn: () => Promise<any>, ok: string, reload: 'base' | 'exam' | 'both' = 'exam') => {
    setBusy(true);
    try { await fn(); toast({ title: ok }); if (reload !== 'exam') await loadBase(); if (reload !== 'base') await loadExam(); }
    catch (e: any) { toast({ title: 'Not done', description: e.message, variant: 'destructive' }); }
    finally { setBusy(false); }
  };
  const roomName = (id: string) => rooms.find((r) => r.id === id)?.name ?? '—';
  const byRoom = useMemo(() => {
    const m = new Map<string, SeatRow[]>();
    seats.forEach((s) => { const k = `${s.exam_date}|${s.start_time}|${s.room_id}`; m.set(k, [...(m.get(k) ?? []), s]); });
    return [...m.entries()];
  }, [seats]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (exams.length === 0) return <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Create an examination and schedule its papers first.</CardContent></Card>;

  return (
    <div className="space-y-6">
      <div className="flex items-end gap-3"><div className="space-y-1.5 min-w-72"><Label className="text-xs font-semibold">Examination</Label>
        <Select value={examId} onValueChange={setExamId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{exams.map((e) => <SelectItem key={e.id} value={e.id}>{e.title} · {e.academic_year}</SelectItem>)}</SelectContent></Select></div></div>

      <Card>
        <CardHeader><CardTitle>Registration</CardTitle><CardDescription>When required, only registered students get hall tickets and seats. Fee clearance is checked if your institution requires it.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{exam?.registration_required ? (exam.registration_open ? 'Registration open' : 'Registration closed') : 'Registration not required'}</Badge>
            <Badge variant="secondary">{regCount} registered</Badge>
            {canManage && <>
              <Input type="date" className="w-44" value={deadline} onChange={(e) => setDeadline(e.target.value)} title="Registration deadline" />
              <Button size="sm" disabled={busy} onClick={() => void run(() => examLogisticsService.setRegistration(examId, true, true, deadline || null), 'Registration opened', 'both')}>Open registration</Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(() => examLogisticsService.setRegistration(examId, true, false, deadline || null), 'Registration closed', 'both')}>Close</Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => void run(() => examLogisticsService.setRegistration(examId, false, false, null), 'Registration no longer required', 'both')}>Not required</Button></>}
          </div>
          {canManage && <div className="flex items-center gap-2"><Select value={classPick} onValueChange={setClassPick}><SelectTrigger className="w-56"><SelectValue placeholder="Register a whole class" /></SelectTrigger><SelectContent>{classes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            <Button size="sm" variant="outline" disabled={!classPick || busy} onClick={() => void run(() => examLogisticsService.registerClass(examId, classPick), `Registered ${classPick}`)}>Register class</Button></div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><div className="flex items-start justify-between"><div><CardTitle>Exam rooms</CardTitle><CardDescription>Seating fills active rooms by capacity.</CardDescription></div>
          {canManage && <Button size="sm" onClick={() => setRoomDlg({ name: '', block: '', capacity: '', active: true })}><Plus className="w-4 h-4 mr-1" />Add room</Button>}</div></CardHeader>
        <CardContent><Table><TableHeader><TableRow><TableHead>Room</TableHead><TableHead>Block</TableHead><TableHead className="text-right">Seats</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader><TableBody>
          {rooms.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-6 text-sm text-muted-foreground">No rooms yet.</TableCell></TableRow> : rooms.map((r) => (
            <TableRow key={r.id}><TableCell className="font-medium">{r.name}</TableCell><TableCell>{r.block || '—'}</TableCell><TableCell className="text-right">{r.capacity}</TableCell><TableCell><Badge variant={r.active ? 'default' : 'secondary'}>{r.active ? 'Active' : 'Inactive'}</Badge></TableCell>
              <TableCell className="text-right">{canManage && <Button variant="ghost" size="sm" onClick={() => setRoomDlg({ id: r.id, name: r.name, block: r.block ?? '', capacity: String(r.capacity), active: r.active })}><Pencil className="w-4 h-4" /></Button>}</TableCell></TableRow>))}
        </TableBody></Table></CardContent>
      </Card>

      <Card>
        <CardHeader><div className="flex items-start justify-between"><div><CardTitle>Seating plan</CardTitle><CardDescription>One plan per session (date + start time). Classes are interleaved so neighbours sit different papers.</CardDescription></div>
          <Button variant="outline" size="sm" disabled={!seats.length} onClick={() => exportToCSV('seating-plan', ['Date', 'Start', 'Room', 'Seat', 'Student', 'ID', 'Class', 'Paper'], seats.map((s) => [s.exam_date, s.start_time, roomName(s.room_id), s.seat_no, s.student_name, s.roll_number, s.class_name, s.subject]))}><Download className="w-4 h-4 mr-1" />Export</Button></div></CardHeader>
        <CardContent className="space-y-3">
          {sessions.length === 0 ? <p className="text-sm text-muted-foreground">No papers scheduled.</p> : sessions.map((ss) => {
            const n = seats.filter((s) => s.exam_date === ss.date && s.start_time === ss.start).length;
            return (<div key={ss.date + ss.start} className="flex items-center justify-between p-3 border rounded-lg"><div><span className="font-medium">{ss.date}</span> <span className="text-muted-foreground">at {ss.start}</span> {n > 0 && <Badge variant="secondary" className="ml-2">{n} seated</Badge>}</div>
              {canManage && <Button size="sm" disabled={busy} onClick={() => void run(() => examLogisticsService.generateSeating(examId, ss.date, ss.start), n ? 'Seating regenerated' : 'Seating generated')}>{n ? 'Regenerate' : 'Generate seating'}</Button>}</div>);
          })}
          {byRoom.map(([k, list]) => { const [d, t, rid] = k.split('|'); return (
            <div key={k} className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2"><div className="font-semibold text-sm">{roomName(rid)} — {d} {t}</div>
                <Button size="sm" variant="outline" onClick={() => printDocument(`Seating ${roomName(rid)}`, `<h2>${esc(roomName(rid))} — ${esc(d)} ${esc(t)}</h2><table border="1" cellpadding="6" style="border-collapse:collapse"><tr><th>Seat</th><th>Student</th><th>ID</th><th>Class</th><th>Paper</th></tr>${list.map((s) => `<tr><td>${s.seat_no}</td><td>${esc(s.student_name)}</td><td>${esc(s.roll_number)}</td><td>${esc(s.class_name)}</td><td>${esc(s.subject)}</td></tr>`).join('')}</table><p>Invigilator(s): ${esc(duty.filter((x) => x.room_id === rid && x.exam_date === d && x.start_time === t).map((x) => x.teacher_name).join(', ') || '—')}</p>`)}><Printer className="w-4 h-4 mr-1" />Print</Button></div>
              <div className="flex flex-wrap gap-1.5">{list.map((s) => <span key={s.id} className="text-[11px] px-2 py-1 rounded bg-slate-100" title={`${s.class_name} — ${s.subject}`}><b>{s.seat_no}</b> {s.student_name}</span>)}</div>
            </div>); })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Invigilation duty</CardTitle><CardDescription>Assign teachers to rooms that have students seated; a teacher cannot be in two rooms in the same session.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {canManage && <div className="flex flex-wrap gap-2">
            <Select value={dutyPick.session} onValueChange={(v) => setDutyPick({ ...dutyPick, session: v })}><SelectTrigger className="w-52"><SelectValue placeholder="Session" /></SelectTrigger><SelectContent>{sessions.map((s) => <SelectItem key={s.date + s.start} value={`${s.date}|${s.start}`}>{s.date} {s.start}</SelectItem>)}</SelectContent></Select>
            <Select value={dutyPick.room} onValueChange={(v) => setDutyPick({ ...dutyPick, room: v })}><SelectTrigger className="w-44"><SelectValue placeholder="Room" /></SelectTrigger><SelectContent>{rooms.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent></Select>
            <Select value={dutyPick.teacher} onValueChange={(v) => setDutyPick({ ...dutyPick, teacher: v })}><SelectTrigger className="w-56"><SelectValue placeholder="Teacher" /></SelectTrigger><SelectContent>{teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select>
            <Button size="sm" disabled={busy || !dutyPick.session || !dutyPick.room || !dutyPick.teacher} onClick={() => { const [d, t] = dutyPick.session.split('|'); void run(() => examLogisticsService.assignInvigilator(examId, d, t, dutyPick.room, dutyPick.teacher), 'Invigilator assigned'); }}>Assign</Button></div>}
          <Table><TableHeader><TableRow><TableHead>Session</TableHead><TableHead>Room</TableHead><TableHead>Teacher</TableHead><TableHead /></TableRow></TableHeader><TableBody>
            {duty.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-6 text-sm text-muted-foreground">No invigilators assigned.</TableCell></TableRow> : duty.map((d) => (
              <TableRow key={d.id}><TableCell>{d.exam_date} {d.start_time}</TableCell><TableCell>{roomName(d.room_id)}</TableCell><TableCell>{d.teacher_name}</TableCell>
                <TableCell className="text-right">{canManage && <Button variant="ghost" size="sm" onClick={() => void run(() => examLogisticsService.removeInvigilator(d.id), 'Removed')}><Trash2 className="w-4 h-4" /></Button>}</TableCell></TableRow>))}
          </TableBody></Table>
        </CardContent>
      </Card>

      {roomDlg && <Dialog open onOpenChange={(o) => !o && setRoomDlg(null)}><DialogContent><DialogHeader><DialogTitle>{roomDlg.id ? 'Edit room' : 'Add room'}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Name</Label><Input value={roomDlg.name} onChange={(e) => setRoomDlg({ ...roomDlg, name: e.target.value })} /></div>
          <div className="space-y-1"><Label>Block</Label><Input value={roomDlg.block} onChange={(e) => setRoomDlg({ ...roomDlg, block: e.target.value })} /></div>
          <div className="space-y-1"><Label>Seats</Label><Input type="number" min="1" value={roomDlg.capacity} onChange={(e) => setRoomDlg({ ...roomDlg, capacity: e.target.value })} /></div>
          <div className="space-y-1"><Label>Status</Label><Select value={roomDlg.active ? 'a' : 'i'} onValueChange={(v) => setRoomDlg({ ...roomDlg, active: v === 'a' })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="a">Active</SelectItem><SelectItem value="i">Inactive</SelectItem></SelectContent></Select></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setRoomDlg(null)}>Cancel</Button><Button disabled={busy} onClick={() => { const d = roomDlg; void run(() => examLogisticsService.saveRoom({ id: d.id, name: d.name, block: d.block, capacity: Number(d.capacity), active: d.active }), 'Room saved', 'base').then(() => setRoomDlg(null)); }}>Save</Button></DialogFooter></DialogContent></Dialog>}
    </div>
  );
}
