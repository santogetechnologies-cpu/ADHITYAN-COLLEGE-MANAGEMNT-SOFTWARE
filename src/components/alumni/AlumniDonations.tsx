import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Loader2, Plus } from 'lucide-react';
import { alumniService, type DonationRow } from '@/services/alumniService';
import { exportToCSV } from '@/lib/exportUtils';
import { useToast } from '@/hooks/use-toast';
import type { AlumniProfile } from '@/types/database.types';

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const STATUSES = ['Pledged', 'Processing', 'Received', 'Cancelled'];

export function AlumniDonations({ alumni }: { alumni: AlumniProfile[] }) {
  const { toast } = useToast();
  const [rows, setRows] = useState<DonationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ alumni_id: '', donor_name: '', amount: '', cause: '', payment_mode: 'Online', transaction_id: '', status: 'Received' });

  const load = useCallback(async () => {
    try { setRows(await alumniService.listDonations()); setError(null); }
    catch (e: any) { setError(e.message || 'Could not load donations'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const received = rows.filter((r) => r.status === 'Received');
  const now = new Date();
  const month = received.filter((r) => { const d = new Date(r.donated_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const year = received.filter((r) => new Date(r.donated_at).getFullYear() === now.getFullYear());
  const sum = (a: DonationRow[]) => a.reduce((s, r) => s + r.amount, 0);
  const largest = useMemo(() => received.reduce<DonationRow | null>((m, r) => (!m || r.amount > m.amount ? r : m), null), [received]);

  const save = async () => {
    const amount = Number(f.amount);
    const donor = f.donor_name.trim() || (alumni.find((a) => a.id === f.alumni_id) ? `${alumni.find((a) => a.id === f.alumni_id)!.first_name} ${alumni.find((a) => a.id === f.alumni_id)!.last_name}` : '');
    if (!donor) return toast({ title: 'Enter the donor name or pick an alumnus', variant: 'destructive' });
    if (!(amount > 0)) return toast({ title: 'Amount must be greater than zero', variant: 'destructive' });
    if (!f.cause.trim()) return toast({ title: 'Enter the purpose of the donation', variant: 'destructive' });
    setSaving(true);
    try {
      await alumniService.recordDonation({ donor_name: donor, amount, cause: f.cause.trim(), alumni_id: f.alumni_id || null, payment_mode: f.payment_mode, transaction_id: f.transaction_id.trim() || undefined, status: f.status });
      toast({ title: 'Donation recorded' });
      setOpen(false); setF({ alumni_id: '', donor_name: '', amount: '', cause: '', payment_mode: 'Online', transaction_id: '', status: 'Received' });
      await load();
    } catch (e: any) { toast({ title: 'Not saved', description: e.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const setStatus = async (r: DonationRow, status: string) => {
    try { await alumniService.setDonationStatus(r.id, status); await load(); }
    catch (e: any) { toast({ title: 'Not updated', description: e.message, variant: 'destructive' }); }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (error) return <p className="text-sm text-destructive py-6 text-center">{error}</p>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div><CardTitle>Donations &amp; sponsorship</CardTitle><CardDescription>Contributions recorded by the alumni office. Totals count received donations only.</CardDescription></div>
          <div className="flex gap-2">
            <Button variant="outline" disabled={rows.length === 0} onClick={() => exportToCSV('alumni-donations', ['Donor', 'Amount', 'Purpose', 'Date', 'Mode', 'Reference', 'Status'], rows.map((r) => [r.donor_name, r.amount, r.cause, r.donated_at.slice(0, 10), r.payment_mode, r.transaction_id, r.status]))}><Download className="h-4 w-4 mr-1" /> Export</Button>
            <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Record donation</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">This month</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{inr(sum(month))}</div><p className="text-xs text-muted-foreground">{month.length} donations</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">This year</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{inr(sum(year))}</div><p className="text-xs text-muted-foreground">{year.length} donations</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Largest donation</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{largest ? inr(largest.amount) : '—'}</div><p className="text-xs text-muted-foreground">{largest ? largest.cause : 'No donations yet'}</p></CardContent></Card>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Donor</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Purpose</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">No donations recorded yet.</TableCell></TableRow> : rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.donor_name}</TableCell>
                <TableCell className="text-right font-mono">{inr(r.amount)}</TableCell>
                <TableCell>{r.cause}</TableCell>
                <TableCell>{r.donated_at.slice(0, 10)}</TableCell>
                <TableCell>
                  <Select value={r.status} onValueChange={(v) => setStatus(r, v)}>
                    <SelectTrigger className="h-8 w-32"><SelectValue><Badge variant={r.status === 'Received' ? 'default' : 'secondary'}>{r.status}</Badge></SelectValue></SelectTrigger>
                    <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record donation</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1"><Label>Alumnus (optional)</Label>
              <Select value={f.alumni_id || 'none'} onValueChange={(v) => setF({ ...f, alumni_id: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">Not in directory / organisation</SelectItem>{alumni.map((a) => <SelectItem key={a.id} value={a.id}>{a.first_name} {a.last_name} ({a.graduation_year})</SelectItem>)}</SelectContent>
              </Select></div>
            {!f.alumni_id && <div className="space-y-1"><Label>Donor name</Label><Input value={f.donor_name} onChange={(e) => setF({ ...f, donor_name: e.target.value })} /></div>}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Amount (₹)</Label><Input type="number" min="1" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></div>
              <div className="space-y-1"><Label>Status</Label>
                <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-1"><Label>Purpose</Label><Input value={f.cause} onChange={(e) => setF({ ...f, cause: e.target.value })} placeholder="e.g. Scholarship fund" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Payment mode</Label><Input value={f.payment_mode} onChange={(e) => setF({ ...f, payment_mode: e.target.value })} /></div>
              <div className="space-y-1"><Label>Reference</Label><Input value={f.transaction_id} onChange={(e) => setF({ ...f, transaction_id: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
