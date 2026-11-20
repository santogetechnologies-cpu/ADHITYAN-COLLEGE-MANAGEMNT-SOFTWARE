import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus } from 'lucide-react';
import { alumniService, type MentorshipRow } from '@/services/alumniService';
import { useToast } from '@/hooks/use-toast';
import type { AlumniProfile } from '@/types/database.types';

export function AlumniMentorship({ alumni }: { alumni: AlumniProfile[] }) {
  const { toast } = useToast();
  const [rows, setRows] = useState<MentorshipRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ mentor_id: '', mentee_name: '', domain: '', duration_months: '' });

  const load = useCallback(async () => {
    try { setRows(await alumniService.listMentorships()); setError(null); }
    catch (e: any) { setError(e.message || 'Could not load mentorships'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const mentors = alumni.filter((a) => a.status !== 'Inactive');
  const active = rows.filter((r) => r.status === 'Active').length;
  const done = rows.filter((r) => r.status === 'Completed').length;
  const finished = done + rows.filter((r) => r.status === 'Cancelled').length;

  const save = async () => {
    if (!f.mentor_id || !f.mentee_name.trim() || !f.domain.trim()) return toast({ title: 'Mentor, mentee and domain are required', variant: 'destructive' });
    const dur = f.duration_months ? Number(f.duration_months) : null;
    if (dur !== null && !(dur > 0)) return toast({ title: 'Duration must be a positive number of months', variant: 'destructive' });
    setSaving(true);
    try {
      await alumniService.createMentorship({ mentor_id: f.mentor_id, mentee_name: f.mentee_name.trim(), domain: f.domain.trim(), duration_months: dur });
      toast({ title: 'Pairing created' }); setOpen(false); setF({ mentor_id: '', mentee_name: '', domain: '', duration_months: '' }); await load();
    } catch (e: any) { toast({ title: 'Not saved', description: e.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };
  const setStatus = async (r: MentorshipRow, status: string) => {
    try { await alumniService.setMentorshipStatus(r.id, status); await load(); }
    catch (e: any) { toast({ title: 'Not updated', description: e.message, variant: 'destructive' }); }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (error) return <p className="text-sm text-destructive py-6 text-center">{error}</p>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div><CardTitle>Mentorship programme</CardTitle><CardDescription>Pair current students with alumni mentors.</CardDescription></div>
          <Button onClick={() => setOpen(true)} disabled={mentors.length === 0}><Plus className="h-4 w-4 mr-1" /> Create pairing</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Available mentors</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{alumni.filter((a) => a.status === 'Mentor').length}</div><p className="text-xs text-muted-foreground">Alumni marked as mentors</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Active pairs</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{active}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Completed</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{done}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Completion rate</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{finished ? `${Math.round((done / finished) * 100)}%` : '—'}</div><p className="text-xs text-muted-foreground">Of closed pairings</p></CardContent></Card>
        </div>
        {mentors.length === 0 && <p className="text-sm text-muted-foreground mb-4">Add alumni to the directory first; any active alumnus can be paired.</p>}
        <Table>
          <TableHeader><TableRow><TableHead>Mentor</TableHead><TableHead>Mentee</TableHead><TableHead>Domain</TableHead><TableHead>Duration</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">No pairings yet.</TableCell></TableRow> : rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.mentor ? `${r.mentor.first_name} ${r.mentor.last_name}${r.mentor.company ? ` (${r.mentor.company})` : ''}` : '—'}</TableCell>
                <TableCell>{r.mentee_name}</TableCell><TableCell>{r.domain}</TableCell>
                <TableCell>{r.duration_months ? `${r.duration_months} months` : '—'}</TableCell>
                <TableCell>
                  <Select value={r.status} onValueChange={(v) => setStatus(r, v)}>
                    <SelectTrigger className="h-8 w-32"><SelectValue><Badge variant={r.status === 'Active' ? 'default' : 'secondary'}>{r.status}</Badge></SelectValue></SelectTrigger>
                    <SelectContent>{['Active', 'Completed', 'Cancelled'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create pairing</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1"><Label>Mentor</Label>
              <Select value={f.mentor_id} onValueChange={(v) => setF({ ...f, mentor_id: v })}><SelectTrigger><SelectValue placeholder="Select alumnus" /></SelectTrigger>
                <SelectContent>{mentors.map((a) => <SelectItem key={a.id} value={a.id}>{a.first_name} {a.last_name}{a.company ? ` — ${a.company}` : ''}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Mentee (student name)</Label><Input value={f.mentee_name} onChange={(e) => setF({ ...f, mentee_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Domain</Label><Input value={f.domain} onChange={(e) => setF({ ...f, domain: e.target.value })} /></div>
              <div className="space-y-1"><Label>Months</Label><Input type="number" min="1" value={f.duration_months} onChange={(e) => setF({ ...f, duration_months: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
