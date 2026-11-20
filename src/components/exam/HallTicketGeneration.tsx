import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Eye, EyeOff, Loader2, Printer, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { examService, type ExamItem, type HallTicketRow } from '@/services/examService';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { printDocument } from '@/lib/exportUtils';

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

/** Printable ticket: ONLY facts that exist on the ticket. Missing seat / centre are shown as "per timetable", never invented. */
function printTicket(t: HallTicketRow) {
  const row = (k: string, v: unknown) => `<tr><td style="padding:4px 12px 4px 0;color:#555">${k}</td><td style="padding:4px 0"><b>${esc(v)}</b></td></tr>`;
  printDocument(`Hall ticket – ${t.student_name}`, `
    <h2 style="margin:0">Hall ticket</h2><p style="margin:2px 0 14px;color:#555">${esc(t.exam_title || 'Examination')}${t.academic_year ? ` · ${esc(t.academic_year)}` : ''}</p>
    <table>${row('Name', t.student_name)}${row('Register / student no.', t.register_number)}${row('Programme', t.department)}${row('Class', t.class_name)}
    ${row('Hall', t.hall_number || 'As per timetable')}${row('Seat', t.seat_number || 'As per seating plan')}${row('Status', t.status)}</table>
    ${t.status !== 'Issued' ? `<p style="color:#b00020"><b>NOT VALID FOR ADMISSION.</b> ${esc(t.detention_reason || '')}</p>` : ''}
    <p style="margin-top:18px;font-family:monospace;font-size:11px">Verification code: ${esc(t.qr_code_token)}</p>
    <p style="font-family:monospace;font-size:10px;color:#777">Integrity: ${esc(t.coe_signature_hash || 'n/a')}</p>`);
}

export const HallTicketGeneration = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const canManage = ['admin', 'principal', 'coe'].includes(user?.role ?? '');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [examId, setExamId] = useState('');
  const [tickets, setTickets] = useState<HallTicketRow[]>([]);
  const [hallVisible, setHallVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [lastRun, setLastRun] = useState<{ issued: number; withheld: number } | null>(null);

  const loadExams = useCallback(async () => {
    try {
      const e = await examService.listExams();
      setExams(e);
      setExamId((cur) => cur || e[0]?.id || '');
      setLoadError(null);
    } catch (err: any) { setLoadError(err?.message || 'Could not load examinations.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void loadExams(); }, [loadExams]);

  const loadTickets = useCallback(async () => {
    if (!examId) { setTickets([]); return; }
    try { setTickets(await examService.listHallTickets(examId)); }
    catch (err: any) { toast({ title: 'Could not load hall tickets', description: err?.message, variant: 'destructive' }); }
  }, [examId]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void loadTickets(); }, [loadTickets]);
  useEffect(() => { setHallVisible(exams.find((e) => e.id === examId)?.hall_ticket_published === true); }, [examId, exams]);
  useRealtimeSubscription({ table: 'hall_tickets', onChange: loadTickets, onReconnect: loadTickets });

  const generate = async () => {
    setBusy(true);
    try {
      const r = await examService.generateHallTickets(examId);
      setLastRun({ issued: r.issued, withheld: r.withheld });
      toast({ title: 'Hall tickets generated', description: `${r.issued} issued, ${r.withheld} withheld (attendance below ${r.rules.min_attendance}%${r.rules.fee_clearance_required ? ' or fee dues' : ''})${r.kept_released ? `, ${r.kept_released} released tickets kept` : ''}.` });
      await loadTickets();
    } catch (err: any) {
      toast({ title: 'Hall tickets not generated', description: err?.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const toggleVisible = async () => {
    setBusy(true);
    try {
      await examService.setHallTicketsVisible(examId, !hallVisible);
      setHallVisible(!hallVisible);
      await loadExams();
      toast({ title: !hallVisible ? 'Hall tickets are now visible to students and parents' : 'Hall tickets hidden from students and parents' });
    } catch (err: any) {
      toast({ title: 'Not updated', description: err?.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const release = async (t: HallTicketRow) => {
    const reason = window.prompt(`Release ${t.student_name}'s ticket although it was withheld (${t.detention_reason || 'ineligible'}).\nEnter the reason (required, audited):`);
    if (!reason || reason.trim().length < 3) return;
    try { await examService.releaseHallTicket(t.id, reason.trim()); toast({ title: 'Ticket released', description: t.student_name }); await loadTickets(); }
    catch (err: any) { toast({ title: 'Not released', description: err?.message, variant: 'destructive' }); }
  };

  const shown = useMemo(() => tickets.filter((t) =>
    (statusFilter === 'all' || t.status === statusFilter) &&
    (`${t.student_name} ${t.register_number}`.toLowerCase().includes(search.toLowerCase()))), [tickets, search, statusFilter]);
  const counts = { issued: tickets.filter((t) => t.status === 'Issued').length, withheld: tickets.filter((t) => t.status === 'Withheld').length };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (loadError) return <Card><CardContent className="p-8 text-center text-sm text-destructive flex items-center justify-center gap-1.5"><AlertTriangle className="h-4 w-4" /> {loadError}</CardContent></Card>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Hall tickets</h2>
        <p className="text-muted-foreground">Tickets are created from each class's real attendance and, if your institution requires it, fee clearance. Students see them only after you publish.</p>
      </div>
      {exams.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">No examinations yet. Create one in the Scheduling tab.</CardContent></Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-4 flex flex-wrap items-end gap-3">
              <div className="space-y-1.5 min-w-64">
                <Label className="text-xs font-semibold">Examination</Label>
                <Select value={examId} onValueChange={setExamId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{exams.map((e) => <SelectItem key={e.id} value={e.id}>{e.title} · {e.academic_year}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {canManage && (
                <>
                  <Button onClick={generate} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}{tickets.length ? 'Refresh eligibility' : 'Generate tickets'}</Button>
                  <Button variant="outline" onClick={toggleVisible} disabled={busy || tickets.length === 0}>
                    {hallVisible ? <><EyeOff className="h-4 w-4 mr-1" /> Hide from students</> : <><Eye className="h-4 w-4 mr-1" /> Show to students</>}
                  </Button>
                </>
              )}
              <div className="ml-auto flex items-center gap-2 text-sm">
                <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-200">{counts.issued} issued</Badge>
                <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">{counts.withheld} withheld</Badge>
                {hallVisible && <Badge variant="outline" className="gap-1"><ShieldCheck className="h-3 w-3" /> visible to students</Badge>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><CardTitle className="text-lg">Tickets</CardTitle><CardDescription>{lastRun ? `Last run: ${lastRun.issued} issued, ${lastRun.withheld} withheld.` : 'Attendance below the institution minimum withholds a ticket; a release needs a reason and is audited.'}</CardDescription></div>
                <div className="flex gap-2">
                  <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-8 h-9 w-52" placeholder="Name or ID" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="Issued">Issued</SelectItem><SelectItem value="Withheld">Withheld</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>ID</TableHead><TableHead>Class</TableHead><TableHead className="text-right">Attendance</TableHead><TableHead>Fee dues</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>
                  {shown.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">{tickets.length === 0 ? 'No tickets yet for this examination.' : 'No tickets match the filter.'}</TableCell></TableRow>
                  ) : shown.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm font-medium">{t.student_name}</TableCell>
                      <TableCell className="text-xs font-mono">{t.register_number}</TableCell>
                      <TableCell className="text-sm">{t.class_name}</TableCell>
                      <TableCell className="text-right text-sm font-mono">{t.attendance_pct == null ? 'no data' : `${t.attendance_pct}%`}</TableCell>
                      <TableCell className="text-sm">{t.has_fee_dues ? 'Yes' : 'No'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={t.status === 'Issued' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'}>{t.status}</Badge>
                        {t.status === 'Withheld' && t.detention_reason && <p className="text-[11px] text-muted-foreground mt-0.5 max-w-64">{t.detention_reason}</p>}
                        {t.override_reason && <p className="text-[11px] text-muted-foreground mt-0.5 max-w-64">Released: {t.override_reason}</p>}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => printTicket(t)}><Printer className="h-3.5 w-3.5 mr-1" /> Print</Button>
                        {canManage && t.status === 'Withheld' && <Button size="sm" variant="outline" className="h-7 text-xs ml-1" onClick={() => release(t)}>Release</Button>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
