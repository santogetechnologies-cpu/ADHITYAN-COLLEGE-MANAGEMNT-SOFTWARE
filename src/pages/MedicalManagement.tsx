import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { Navigation } from '@/components/Navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Download, FileText, Heart, Loader2, Pencil, Phone, Plus, Search, Trash2 } from 'lucide-react';
import { medicalService, type AlertRow, type ContactRow, type HealthRecordRow, type VisitRow } from '@/services/medicalService';
import { StudentRecordSearch } from '@/components/shared/StudentRecordSearch';
import { exportToCSV } from '@/lib/exportUtils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

const list = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
type Msg = (m: { title: string; description?: string; variant?: 'destructive' }) => void;

function useSave(toast: Msg, reload: () => Promise<void>) {
  const [busy, setBusy] = useState(false);
  return { busy, run: async (fn: () => Promise<void>, ok: string, after?: () => void) => {
    setBusy(true);
    try { await fn(); toast({ title: ok }); after?.(); await reload(); }
    catch (e: any) { toast({ title: 'Not saved', description: e.message, variant: 'destructive' }); }
    finally { setBusy(false); }
  } };
}

export default function MedicalManagement() {
  const { toast } = useToast();
  const { user } = useAuth();
  const canManage = ['admin', 'principal', 'hostel_warden'].includes(user?.role ?? '');
  const canRecords = ['admin', 'principal'].includes(user?.role ?? '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<HealthRecordRow[]>([]);
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [qRec, setQRec] = useState(''); const [qVis, setQVis] = useState('');
  const [vaxFilter, setVaxFilter] = useState('all'); const [range, setRange] = useState('all');

  const load = useCallback(async () => {
    try {
      const [r, v, c, a] = await Promise.all([
        canRecords ? medicalService.records() : Promise.resolve([]),
        canManage ? medicalService.visits() : Promise.resolve([]),
        medicalService.contacts(), medicalService.alerts()]);
      setRecords(r); setVisits(v); setContacts(c); setAlerts(a); setError(null);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [canManage, canRecords]);
  useEffect(() => { void load(); }, [load]);
  useRealtimeSubscription({ table: 'infirmary_visits', onChange: load, onReconnect: load });
  useRealtimeSubscription({ table: 'health_records', onChange: load, onReconnect: load });
  useRealtimeSubscription({ table: 'wellness_alerts', onChange: load, onReconnect: load });

  const save = useSave(toast as Msg, load);

  // ---- record dialog ----
  const emptyRec = { id: '', name: '', roll_no: '', class_name: '', role: 'student', blood_group: '', allergies: '', conditions: '', ec_name: '', ec_phone: '', vaccination_status: 'Up to date', notes: '' };
  const [recOpen, setRecOpen] = useState(false); const [rec, setRec] = useState(emptyRec);
  const editRec = (r: HealthRecordRow) => { setRec({ id: r.id, name: r.name, roll_no: r.roll_no ?? '', class_name: r.class_name ?? '', role: r.role, blood_group: r.blood_group ?? '', allergies: (r.allergies || []).join(', '), conditions: (r.medical_conditions || []).join(', '), ec_name: r.emergency_contact_name ?? '', ec_phone: r.emergency_contact_phone ?? '', vaccination_status: r.vaccination_status, notes: r.notes ?? '' }); setRecOpen(true); };
  const submitRec = () => {
    if (!rec.name.trim()) return toast({ title: 'Name is required', variant: 'destructive' });
    if (rec.ec_phone && !/^[+\d][\d\s-]{6,}$/.test(rec.ec_phone.trim())) return toast({ title: 'Emergency phone looks invalid', variant: 'destructive' });
    void save.run(() => medicalService.saveRecord({ id: rec.id || undefined, name: rec.name.trim(), roll_no: rec.roll_no.trim() || null, class_name: rec.class_name.trim() || null, role: rec.role, blood_group: rec.blood_group.trim() || null, allergies: list(rec.allergies), medical_conditions: list(rec.conditions), emergency_contact_name: rec.ec_name.trim() || null, emergency_contact_phone: rec.ec_phone.trim() || null, vaccination_status: rec.vaccination_status, notes: rec.notes.trim() || null } as any), 'Health record saved', () => setRecOpen(false));
  };

  // ---- visit dialog ----
  const emptyVis = { patient_name: '', student_ref: '', class_name: '', symptoms: '', treatment: '', attending_staff: user?.name ?? '', follow_up_date: '', status: 'Admitted' };
  const [visOpen, setVisOpen] = useState(false); const [vis, setVis] = useState(emptyVis);
  const submitVis = () => {
    if (!vis.patient_name.trim() || !vis.symptoms.trim() || !vis.attending_staff.trim()) return toast({ title: 'Patient, symptoms and attending staff are required', variant: 'destructive' });
    void save.run(() => medicalService.logVisit({ patient_name: vis.patient_name.trim(), student_ref: vis.student_ref || null, class_name: vis.class_name || null, symptoms: vis.symptoms.trim(), treatment: vis.treatment.trim() || null, attending_staff: vis.attending_staff.trim(), follow_up_date: vis.follow_up_date || null, status: vis.status } as any), 'Visit logged', () => { setVisOpen(false); setVis(emptyVis); });
  };

  // ---- contact / alert dialogs ----
  const [conOpen, setConOpen] = useState(false); const [con, setCon] = useState({ label: '', phone: '', note: '' });
  const [alOpen, setAlOpen] = useState(false); const [al, setAl] = useState({ title: '', message: '', severity: 'Info' });

  const fRecords = useMemo(() => records.filter((r) => (vaxFilter === 'all' || r.vaccination_status === vaxFilter) && `${r.name} ${r.roll_no ?? ''} ${r.blood_group ?? ''}`.toLowerCase().includes(qRec.toLowerCase())), [records, qRec, vaxFilter]);
  const fVisits = useMemo(() => {
    const now = new Date(); const from = range === 'today' ? new Date(now.getFullYear(), now.getMonth(), now.getDate()) : range === 'week' ? new Date(now.getTime() - 7 * 86400000) : null;
    return visits.filter((v) => (!from || new Date(v.visit_date) >= from) && `${v.patient_name} ${v.symptoms} ${v.student_ref ?? ''}`.toLowerCase().includes(qVis.toLowerCase()));
  }, [visits, qVis, range]);
  const today = new Date().toDateString();
  const todays = visits.filter((v) => new Date(v.visit_date).toDateString() === today).length;
  const admitted = visits.filter((v) => v.status === 'Admitted').length;
  const activeAlerts = alerts.filter((a) => a.active);
  const urgent = activeAlerts.find((a) => a.severity === 'Urgent') ?? activeAlerts[0];

  if (loading) return <div className="min-h-screen bg-background"><Navigation showBackButton backUrl="/dashboard" backLabel="Back to Dashboard" /><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></div>;

  return (
    <div className="min-h-screen bg-background">
      <Navigation showBackButton={true} backUrl="/dashboard" backLabel="Back to Dashboard" />
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-3xl font-bold">Medical &amp; Infirmary</h1><p className="text-muted-foreground">Health records, infirmary visits, emergency contacts and wellness alerts. Medical data is visible only to authorised staff.</p></div>
          {canRecords && <Button onClick={() => { setRec(emptyRec); setRecOpen(true); }}><Plus className="w-4 h-4 mr-2" />New health record</Button>}
        </div>
        {error && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[['Health records', canRecords ? records.length : '—', FileText], ["Today's visits", canManage ? todays : '—', Heart], ['Currently admitted', canManage ? admitted : '—', Heart], ['Active alerts', activeAlerts.length, AlertTriangle]].map(([t, n, Icon]: any) => (
            <Card key={t}><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">{t}</CardTitle><Icon className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{n}</div></CardContent></Card>
          ))}
        </div>

        {urgent && <Alert variant={urgent.severity === 'Urgent' ? 'destructive' : 'default'}><AlertTriangle className="h-4 w-4" /><AlertDescription><strong>{urgent.title}:</strong> {urgent.message}</AlertDescription></Alert>}

        <Tabs defaultValue={canRecords ? 'records' : canManage ? 'visits' : 'contacts'} className="space-y-4">
          <TabsList>
            {canRecords && <TabsTrigger value="records">Health records</TabsTrigger>}
            {canManage && <TabsTrigger value="visits">Infirmary log</TabsTrigger>}
            <TabsTrigger value="contacts">Emergency contacts</TabsTrigger>
            <TabsTrigger value="alerts">Wellness alerts</TabsTrigger>
          </TabsList>

          {canRecords && <TabsContent value="records"><Card><CardHeader><CardTitle>Health records</CardTitle><CardDescription>Vaccinations, allergies and conditions.</CardDescription></CardHeader><CardContent>
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-8" placeholder="Name, ID or blood group" value={qRec} onChange={(e) => setQRec(e.target.value)} /></div>
              <Select value={vaxFilter} onValueChange={setVaxFilter}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All vaccination</SelectItem><SelectItem value="Up to date">Up to date</SelectItem><SelectItem value="Partial">Partial</SelectItem><SelectItem value="Pending">Pending</SelectItem></SelectContent></Select>
              <Button variant="outline" disabled={fRecords.length === 0} onClick={() => exportToCSV('health-records', ['Name', 'ID', 'Type', 'Blood group', 'Allergies', 'Conditions', 'Vaccination', 'Emergency contact', 'Emergency phone'], fRecords.map((r) => [r.name, r.roll_no, r.role, r.blood_group, (r.allergies || []).join('; '), (r.medical_conditions || []).join('; '), r.vaccination_status, r.emergency_contact_name, r.emergency_contact_phone]))}><Download className="w-4 h-4 mr-2" />Export</Button>
            </div>
            <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>ID</TableHead><TableHead>Blood</TableHead><TableHead>Allergies</TableHead><TableHead>Vaccination</TableHead><TableHead>Updated</TableHead><TableHead /></TableRow></TableHeader><TableBody>
              {fRecords.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-10 text-sm text-muted-foreground">No health records.</TableCell></TableRow> : fRecords.map((r) => (
                <TableRow key={r.id}><TableCell className="font-medium">{r.name}</TableCell><TableCell>{r.roll_no || '—'}</TableCell><TableCell>{r.blood_group || '—'}</TableCell>
                  <TableCell>{r.allergies?.length ? r.allergies.join(', ') : 'None recorded'}</TableCell>
                  <TableCell><Badge variant={r.vaccination_status === 'Up to date' ? 'default' : 'secondary'}>{r.vaccination_status}</Badge></TableCell>
                  <TableCell>{r.updated_at?.slice(0, 10)}</TableCell>
                  <TableCell><Button variant="ghost" size="sm" onClick={() => editRec(r)}><Pencil className="w-4 h-4" /></Button></TableCell></TableRow>))}
            </TableBody></Table></CardContent></Card></TabsContent>}

          {canManage && <TabsContent value="visits"><Card><CardHeader><CardTitle>Infirmary log</CardTitle></CardHeader><CardContent>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2"><Input className="w-72" placeholder="Patient or symptoms" value={qVis} onChange={(e) => setQVis(e.target.value)} />
                {[['all', 'All'], ['today', 'Today'], ['week', 'This week']].map(([k, l]) => <Button key={k} variant={range === k ? 'default' : 'outline'} onClick={() => setRange(k)}>{l}</Button>)}</div>
              <Button onClick={() => { setVis(emptyVis); setVisOpen(true); }}><Plus className="w-4 h-4 mr-2" />Log visit</Button>
            </div>
            <Table><TableHeader><TableRow><TableHead>When</TableHead><TableHead>Patient</TableHead><TableHead>Symptoms</TableHead><TableHead>Treatment</TableHead><TableHead>Attended by</TableHead><TableHead>Follow-up</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>
              {fVisits.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-10 text-sm text-muted-foreground">No visits logged.</TableCell></TableRow> : fVisits.map((v) => (
                <TableRow key={v.id}><TableCell className="whitespace-nowrap">{new Date(v.visit_date).toLocaleString()}</TableCell><TableCell>{v.patient_name}{v.student_ref ? <span className="text-xs text-muted-foreground"> ({v.student_ref})</span> : null}</TableCell>
                  <TableCell>{v.symptoms}</TableCell><TableCell>{v.treatment || '—'}</TableCell><TableCell>{v.attending_staff}</TableCell><TableCell>{v.follow_up_date || '—'}</TableCell>
                  <TableCell><Select value={v.status} onValueChange={(s) => void save.run(() => medicalService.setVisitStatus(v.id, s), 'Status updated')}><SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger><SelectContent>{['Admitted', 'Discharged', 'Referred to Hospital'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></TableCell></TableRow>))}
            </TableBody></Table></CardContent></Card></TabsContent>}

          <TabsContent value="contacts"><Card><CardHeader><div className="flex items-start justify-between"><div><CardTitle>Emergency medical contacts</CardTitle><CardDescription>Ambulance, duty doctor and referral hospitals — kept by your institution.</CardDescription></div>{canRecords && <Button onClick={() => { setCon({ label: '', phone: '', note: '' }); setConOpen(true); }}><Plus className="w-4 h-4 mr-1" />Add contact</Button>}</div></CardHeader><CardContent>
            {contacts.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">No emergency contacts have been added yet.</p> :
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{contacts.map((c) => (
                <div key={c.id} className="p-4 border rounded-lg"><div className="flex justify-between"><p className="font-medium">{c.label}</p>{canRecords && <button aria-label="Delete contact" onClick={() => void save.run(() => medicalService.deleteContact(c.id), 'Contact removed')}><Trash2 className="w-4 h-4 text-muted-foreground" /></button>}</div>
                  <a href={`tel:${c.phone}`} className="text-lg font-bold text-primary flex items-center gap-1"><Phone className="w-4 h-4" />{c.phone}</a>{c.note && <p className="text-xs text-muted-foreground">{c.note}</p>}</div>))}</div>}
          </CardContent></Card></TabsContent>

          <TabsContent value="alerts"><Card><CardHeader><div className="flex items-start justify-between"><div><CardTitle>Campus wellness alerts</CardTitle><CardDescription>Published by the medical team; active alerts show on this page.</CardDescription></div>{canManage && <Button onClick={() => { setAl({ title: '', message: '', severity: 'Info' }); setAlOpen(true); }}><Plus className="w-4 h-4 mr-1" />New alert</Button>}</div></CardHeader><CardContent className="space-y-3">
            {alerts.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">No alerts.</p> : alerts.map((a) => (
              <div key={a.id} className="p-3 border rounded-lg flex items-start justify-between gap-3"><div><p className="font-medium text-sm">{a.title} <Badge variant={a.severity === 'Urgent' ? 'destructive' : 'secondary'} className="ml-1">{a.severity}</Badge>{!a.active && <Badge variant="outline" className="ml-1">Closed</Badge>}</p><p className="text-xs text-muted-foreground">{a.message}</p></div>
                {canManage && <Button size="sm" variant="outline" onClick={() => void save.run(() => medicalService.setAlertActive(a.id, !a.active), a.active ? 'Alert closed' : 'Alert reopened')}>{a.active ? 'Close' : 'Reopen'}</Button>}</div>))}
          </CardContent></Card></TabsContent>
        </Tabs>
      </main>

      <Dialog open={recOpen} onOpenChange={setRecOpen}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>{rec.id ? 'Edit health record' : 'New health record'}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {!rec.id && <div className="col-span-2 space-y-1"><Label>Find a student (optional)</Label><StudentRecordSearch onSelect={(s) => s && setRec({ ...rec, name: s.name, roll_no: s.student_id, class_name: s.class_name ?? '' })} /></div>}
          <div className="space-y-1"><Label>Name</Label><Input value={rec.name} onChange={(e) => setRec({ ...rec, name: e.target.value })} /></div>
          <div className="space-y-1"><Label>Student / staff ID</Label><Input value={rec.roll_no} onChange={(e) => setRec({ ...rec, roll_no: e.target.value })} /></div>
          <div className="space-y-1"><Label>Blood group</Label><Input value={rec.blood_group} onChange={(e) => setRec({ ...rec, blood_group: e.target.value })} placeholder="e.g. B+" /></div>
          <div className="space-y-1"><Label>Vaccination</Label><Select value={rec.vaccination_status} onValueChange={(v) => setRec({ ...rec, vaccination_status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['Up to date', 'Partial', 'Pending'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-2 space-y-1"><Label>Allergies (comma separated)</Label><Input value={rec.allergies} onChange={(e) => setRec({ ...rec, allergies: e.target.value })} /></div>
          <div className="col-span-2 space-y-1"><Label>Medical conditions (comma separated)</Label><Input value={rec.conditions} onChange={(e) => setRec({ ...rec, conditions: e.target.value })} /></div>
          <div className="space-y-1"><Label>Emergency contact</Label><Input value={rec.ec_name} onChange={(e) => setRec({ ...rec, ec_name: e.target.value })} /></div>
          <div className="space-y-1"><Label>Emergency phone</Label><Input value={rec.ec_phone} onChange={(e) => setRec({ ...rec, ec_phone: e.target.value })} /></div>
          <div className="col-span-2 space-y-1"><Label>Notes</Label><Textarea value={rec.notes} onChange={(e) => setRec({ ...rec, notes: e.target.value })} /></div>
        </div><DialogFooter><Button variant="outline" onClick={() => setRecOpen(false)}>Cancel</Button><Button onClick={submitRec} disabled={save.busy}>Save</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={visOpen} onOpenChange={setVisOpen}><DialogContent><DialogHeader><DialogTitle>Log infirmary visit</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1"><Label>Find a student (optional)</Label><StudentRecordSearch onSelect={(s) => s && setVis({ ...vis, patient_name: s.name, student_ref: s.student_id, class_name: s.class_name ?? '' })} /></div>
          <div className="space-y-1"><Label>Patient name</Label><Input value={vis.patient_name} onChange={(e) => setVis({ ...vis, patient_name: e.target.value })} /></div>
          <div className="space-y-1"><Label>Symptoms</Label><Textarea value={vis.symptoms} onChange={(e) => setVis({ ...vis, symptoms: e.target.value })} /></div>
          <div className="space-y-1"><Label>Treatment given</Label><Textarea value={vis.treatment} onChange={(e) => setVis({ ...vis, treatment: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>Attended by</Label><Input value={vis.attending_staff} onChange={(e) => setVis({ ...vis, attending_staff: e.target.value })} /></div>
            <div className="space-y-1"><Label>Follow-up date</Label><Input type="date" value={vis.follow_up_date} onChange={(e) => setVis({ ...vis, follow_up_date: e.target.value })} /></div></div>
        </div><DialogFooter><Button variant="outline" onClick={() => setVisOpen(false)}>Cancel</Button><Button onClick={submitVis} disabled={save.busy}>Save</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={conOpen} onOpenChange={setConOpen}><DialogContent><DialogHeader><DialogTitle>Add emergency contact</DialogTitle></DialogHeader>
        <div className="grid gap-3"><div className="space-y-1"><Label>Label</Label><Input value={con.label} onChange={(e) => setCon({ ...con, label: e.target.value })} placeholder="Campus ambulance" /></div>
          <div className="space-y-1"><Label>Phone</Label><Input value={con.phone} onChange={(e) => setCon({ ...con, phone: e.target.value })} /></div>
          <div className="space-y-1"><Label>Note</Label><Input value={con.note} onChange={(e) => setCon({ ...con, note: e.target.value })} /></div></div>
        <DialogFooter><Button variant="outline" onClick={() => setConOpen(false)}>Cancel</Button><Button disabled={save.busy} onClick={() => { if (!con.label.trim() || !/^[+\d][\d\s-]{2,}$/.test(con.phone.trim())) return toast({ title: 'Enter a label and a valid phone number', variant: 'destructive' }); void save.run(() => medicalService.saveContact({ label: con.label.trim(), phone: con.phone.trim(), note: con.note.trim() || undefined }), 'Contact added', () => setConOpen(false)); }}>Save</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={alOpen} onOpenChange={setAlOpen}><DialogContent><DialogHeader><DialogTitle>New wellness alert</DialogTitle></DialogHeader>
        <div className="grid gap-3"><div className="space-y-1"><Label>Title</Label><Input value={al.title} onChange={(e) => setAl({ ...al, title: e.target.value })} /></div>
          <div className="space-y-1"><Label>Message</Label><Textarea value={al.message} onChange={(e) => setAl({ ...al, message: e.target.value })} /></div>
          <div className="space-y-1"><Label>Severity</Label><Select value={al.severity} onValueChange={(v) => setAl({ ...al, severity: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['Info', 'Caution', 'Urgent'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div></div>
        <DialogFooter><Button variant="outline" onClick={() => setAlOpen(false)}>Cancel</Button><Button disabled={save.busy} onClick={() => { if (!al.title.trim() || !al.message.trim()) return toast({ title: 'Title and message are required', variant: 'destructive' }); void save.run(() => medicalService.saveAlert({ title: al.title.trim(), message: al.message.trim(), severity: al.severity }), 'Alert published', () => setAlOpen(false)); }}>Publish</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
