import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Loader2, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { askConfirm, askText } from '@/lib/dialogs';

// Writes go through an untyped alias: the generated Database typings in this repo do not resolve
// insert/update payloads for any table (project-wide).
const sb: any = supabase;
const ALL = '__all__';

interface Route { code: string; name: string; description: string | null; requires_entrance: boolean; requires_merit: boolean; active: boolean; sort_order: number }
interface Quota { code: string; name: string; active: boolean; sort_order: number }
interface Seat { id: string; course_name: string; academic_year: string; quota_code: string; seats: number }
interface Field { id: string; field_key: string; label: string; field_type: string; required: boolean; options: string[] | null; help_text: string | null; section: string; course_name: string | null; sort_order: number; active: boolean }
interface Doc { id: string; course_name: string | null; doc_type: string; required: boolean; active: boolean; sort_order: number }

const FIELD_TYPES: Record<string, string> = { text: 'Short text', textarea: 'Long text', number: 'Number', date: 'Date', select: 'Dropdown', checkbox: 'Yes / No' };
const SECTIONS: Record<string, string> = { student: 'Student details', parent: 'Parent / guardian', academic: 'Academic', other: 'Other' };
const codeFrom = (s: string) => s.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30);
const keyFrom = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/^([^a-z])/, 'f_$1').slice(0, 40);

export const AdmissionSetup = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [quotas, setQuotas] = useState<Quota[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [courses, setCourses] = useState<string[]>([]);

  const load = useCallback(async () => {
    try {
      const [r, q, s, f, d, c, a] = await Promise.all([
        supabase.from('admission_routes' as any).select('*').order('sort_order'),
        supabase.from('admission_quotas' as any).select('*').order('sort_order'),
        supabase.from('admission_seats' as any).select('*').order('course_name'),
        supabase.from('admission_form_fields' as any).select('*').order('sort_order'),
        supabase.from('admission_required_documents' as any).select('*').order('sort_order'),
        supabase.from('courses').select('name').order('name'),
        supabase.from('admission_applications').select('class_name').limit(2000),
      ]);
      const err = (r as any).error || (q as any).error || (s as any).error || (f as any).error || (d as any).error;
      if (err) throw new Error(err.message);
      setRoutes(((r as any).data || []) as Route[]);
      setQuotas(((q as any).data || []) as Quota[]);
      setSeats(((s as any).data || []) as Seat[]);
      setFields(((f as any).data || []) as Field[]);
      setDocs(((d as any).data || []) as Doc[]);
      const names = new Set<string>([...((c.data || []) as any[]).map((x) => x.name), ...((a.data || []) as any[]).map((x) => x.class_name)].filter(Boolean));
      setCourses(Array.from(names).sort());
      setLoadError(null);
    } catch (e: any) {
      setLoadError(e?.message || 'Could not load admission setup.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  if (loadError) return (
    <Card><CardContent className="p-8 text-center">
      <p className="text-sm text-destructive flex items-center justify-center gap-1.5"><AlertTriangle className="h-4 w-4" /> {loadError}</p>
      <Button size="sm" variant="outline" className="mt-3" onClick={() => { setLoading(true); void load(); }}>Retry</Button>
    </CardContent></Card>
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Admission setup</h2>
        <p className="text-muted-foreground">Define how candidates are admitted, how seats are split, what the application form asks, and which documents must be verified.</p>
      </div>
      <Tabs defaultValue="routes">
        <TabsList>
          <TabsTrigger value="routes">Routes & quotas</TabsTrigger>
          <TabsTrigger value="seats">Seats</TabsTrigger>
          <TabsTrigger value="fields">Form fields</TabsTrigger>
          <TabsTrigger value="docs">Required documents</TabsTrigger>
        </TabsList>
        <TabsContent value="routes" className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RoutesCard routes={routes} onChange={load} toast={toast} />
          <QuotasCard quotas={quotas} onChange={load} toast={toast} />
        </TabsContent>
        <TabsContent value="seats" className="mt-4"><SeatsCard seats={seats} quotas={quotas} courses={courses} onChange={load} toast={toast} /></TabsContent>
        <TabsContent value="fields" className="mt-4"><FieldsCard fields={fields} courses={courses} onChange={load} toast={toast} /></TabsContent>
        <TabsContent value="docs" className="mt-4"><DocsCard docs={docs} courses={courses} onChange={load} toast={toast} /></TabsContent>
      </Tabs>
    </div>
  );
};

type Toast = ReturnType<typeof useToast>['toast'];
const failToast = (toast: Toast, title: string, e: any) =>
  toast({ title, description: e?.code === '23505' ? 'That already exists.' : e?.message || String(e), variant: 'destructive' });

/* ------------------------------------------------------------------ routes */
function RoutesCard({ routes, onChange, toast }: { routes: Route[]; onChange: () => Promise<void>; toast: Toast }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: '', description: '', requires_entrance: false, requires_merit: false });
  const [busy, setBusy] = useState(false);
  const add = async () => {
    const code = codeFrom(f.name);
    if (f.name.trim().length < 2 || code.length < 2) { toast({ title: 'Give the route a name', variant: 'destructive' }); return; }
    setBusy(true);
    const { error } = await sb.from('admission_routes').insert({ code, name: f.name.trim(), description: f.description.trim() || null, requires_entrance: f.requires_entrance, requires_merit: f.requires_merit, sort_order: routes.length + 1 });
    setBusy(false);
    if (error) return failToast(toast, 'Route not added', error);
    setOpen(false); setF({ name: '', description: '', requires_entrance: false, requires_merit: false }); await onChange();
  };
  const toggle = async (r: Route) => {
    const { error } = await sb.from('admission_routes').update({ active: !r.active }).eq('code', r.code);
    if (error) failToast(toast, 'Not updated', error);
    await onChange();
  };
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between pb-3">
        <div><CardTitle className="text-lg">Admission routes</CardTitle><CardDescription>How a candidate gets in. The route decides what must happen before approval.</CardDescription></div>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add</Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {routes.map((r) => (
          <div key={r.code} className={`flex items-start justify-between gap-3 rounded-md border p-3 ${r.active ? '' : 'opacity-60'}`}>
            <div className="min-w-0">
              <p className="text-sm font-medium">{r.name} <span className="text-[11px] font-mono text-muted-foreground">{r.code}</span></p>
              {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <Badge variant="outline" className="text-[10px]">{r.requires_entrance ? 'Entrance test required' : 'No entrance test'}</Badge>
                <Badge variant="outline" className="text-[10px]">{r.requires_merit ? 'Approved via merit list' : 'Approved directly'}</Badge>
              </div>
            </div>
            <Switch checked={r.active} onCheckedChange={() => toggle(r)} aria-label={`Toggle ${r.name}`} />
          </div>
        ))}
      </CardContent>
      <Dialog open={open} onOpenChange={(o) => { if (!busy) setOpen(o); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add admission route</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs font-semibold">Name *</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={80} placeholder="e.g. Sports merit" /></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold">Description</Label><Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} maxLength={200} /></div>
            <label className="flex items-center gap-2 text-sm"><Switch checked={f.requires_entrance} onCheckedChange={(v) => setF({ ...f, requires_entrance: v })} /> A completed entrance test is required before approval</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={f.requires_merit} onCheckedChange={(v) => setF({ ...f, requires_merit: v })} /> Approval only through the merit list (ranked)</label>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button><Button onClick={add} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function QuotasCard({ quotas, onChange, toast }: { quotas: Quota[]; onChange: () => Promise<void>; toast: Toast }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const add = async () => {
    const code = codeFrom(name);
    if (name.trim().length < 2 || code.length < 2) { toast({ title: 'Give the quota a name', variant: 'destructive' }); return; }
    setBusy(true);
    const { error } = await sb.from('admission_quotas').insert({ code, name: name.trim(), sort_order: quotas.length + 1 });
    setBusy(false);
    if (error) return failToast(toast, 'Quota not added', error);
    setName(''); await onChange();
  };
  const toggle = async (q: Quota) => {
    const { error } = await sb.from('admission_quotas').update({ active: !q.active }).eq('code', q.code);
    if (error) failToast(toast, 'Not updated', error);
    await onChange();
  };
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-lg">Quotas</CardTitle><CardDescription>Seat categories (management, government, NRI…). A candidate belongs to one quota; fee plans and merit lists can be limited to it.</CardDescription></CardHeader>
      <CardContent className="space-y-2">
        {quotas.map((q) => (
          <div key={q.code} className={`flex items-center justify-between rounded-md border px-3 py-2 ${q.active ? '' : 'opacity-60'}`}>
            <span className="text-sm">{q.name} <span className="text-[11px] font-mono text-muted-foreground">{q.code}</span></span>
            <Switch checked={q.active} onCheckedChange={() => toggle(q)} aria-label={`Toggle ${q.name}`} />
          </div>
        ))}
        <div className="flex gap-2 pt-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New quota, e.g. Defence wards" maxLength={80} onKeyDown={(e) => { if (e.key === 'Enter') void add(); }} />
          <Button onClick={add} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}</Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ seats */
function SeatsCard({ seats, quotas, courses, onChange, toast }: { seats: Seat[]; quotas: Quota[]; courses: string[]; onChange: () => Promise<void>; toast: Toast }) {
  const [f, setF] = useState({ course: '', year: '', quota: '', seats: '' });
  const [busy, setBusy] = useState(false);
  const total = useMemo(() => {
    const m = new Map<string, number>();
    seats.forEach((s) => m.set(`${s.course_name}|${s.academic_year}`, (m.get(`${s.course_name}|${s.academic_year}`) ?? 0) + s.seats));
    return m;
  }, [seats]);
  const save = async () => {
    const n = Number(f.seats);
    if (!f.course.trim() || f.year.trim().length < 4 || !f.quota || !Number.isInteger(n) || n < 0) {
      toast({ title: 'Check the seat entry', description: 'Course, academic year, quota and a whole number of seats are required.', variant: 'destructive' });
      return;
    }
    setBusy(true);
    const { error } = await sb.from('admission_seats').upsert({ course_name: f.course.trim(), academic_year: f.year.trim(), quota_code: f.quota, seats: n, updated_at: new Date().toISOString() }, { onConflict: 'course_name,academic_year,quota_code' });
    setBusy(false);
    if (error) return failToast(toast, 'Seats not saved', error);
    setF({ ...f, seats: '' }); await onChange();
  };
  const remove = async (id: string) => {
    const { error } = await sb.from('admission_seats').delete().eq('id', id);
    if (error) failToast(toast, 'Not removed', error);
    await onChange();
  };
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-lg">Seat matrix</CardTitle><CardDescription>Seats per course, academic year and quota. The merit list uses these when you leave “seats” blank for a quota.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs font-semibold">Course</Label>
            <Input list="setup-courses" value={f.course} onChange={(e) => setF({ ...f, course: e.target.value })} placeholder="Course name" />
            <datalist id="setup-courses">{courses.map((c) => <option key={c} value={c} />)}</datalist>
          </div>
          <div className="space-y-1.5"><Label className="text-xs font-semibold">Academic year</Label><Input value={f.year} onChange={(e) => setF({ ...f, year: e.target.value })} placeholder="2026-27" /></div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Quota</Label>
            <Select value={f.quota} onValueChange={(v) => setF({ ...f, quota: v })}>
              <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
              <SelectContent>{quotas.filter((q) => q.active).map((q) => <SelectItem key={q.code} value={q.code}>{q.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 items-end">
            <div className="space-y-1.5 flex-1"><Label className="text-xs font-semibold">Seats</Label><Input type="number" min="0" value={f.seats} onChange={(e) => setF({ ...f, seats: e.target.value })} className="font-mono" /></div>
            <Button onClick={save} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}</Button>
          </div>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Course</TableHead><TableHead>Year</TableHead><TableHead>Quota</TableHead><TableHead className="text-right">Seats</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {seats.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground text-sm">No seats configured yet.</TableCell></TableRow> :
              seats.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="text-sm font-medium">{s.course_name}</TableCell>
                  <TableCell className="text-sm">{s.academic_year}</TableCell>
                  <TableCell className="text-sm">{quotas.find((q) => q.code === s.quota_code)?.name ?? s.quota_code}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{s.seats}</TableCell>
                  <TableCell className="text-right"><Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => remove(s.id)} aria-label="Remove"><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        {total.size > 0 && (
          <p className="text-xs text-muted-foreground">
            Totals: {Array.from(total.entries()).map(([k, v]) => `${k.replace('|', ' ')} = ${v}`).join(' · ')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ form fields */
function FieldsCard({ fields, courses, onChange, toast }: { fields: Field[]; courses: string[]; onChange: () => Promise<void>; toast: Toast }) {
  const [open, setOpen] = useState(false);
  const empty = { label: '', field_type: 'text', required: false, options: '', help_text: '', section: 'other', course: ALL };
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);

  const add = async () => {
    const key = keyFrom(f.label);
    const options = f.field_type === 'select' ? f.options.split(',').map((x) => x.trim()).filter(Boolean) : null;
    if (f.label.trim().length < 2 || key.length < 2) { toast({ title: 'Give the field a label', variant: 'destructive' }); return; }
    if (f.field_type === 'select' && (!options || options.length === 0)) { toast({ title: 'Add the dropdown options', description: 'Separate them with commas.', variant: 'destructive' }); return; }
    setBusy(true);
    const { error } = await sb.from('admission_form_fields').insert({
      field_key: key, label: f.label.trim(), field_type: f.field_type, required: f.required, options,
      help_text: f.help_text.trim() || null, section: f.section, course_name: f.course === ALL ? null : f.course, sort_order: fields.length + 1,
    });
    setBusy(false);
    if (error) return failToast(toast, 'Field not added', error);
    setOpen(false); setF(empty); await onChange();
  };
  const patch = async (id: string, values: Partial<Field>) => {
    const { error } = await sb.from('admission_form_fields').update(values).eq('id', id);
    if (error) failToast(toast, 'Not updated', error);
    await onChange();
  };
  const remove = async (id: string) => {
    if (!(await askConfirm('Delete this field? Answers already saved on applications are kept.', { title: 'Delete field', confirmLabel: 'Delete', destructive: true }))) return;
    const { error } = await sb.from('admission_form_fields').delete().eq('id', id);
    if (error) failToast(toast, 'Not removed', error);
    await onChange();
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between pb-3">
        <div><CardTitle className="text-lg">Application form fields</CardTitle><CardDescription>Extra questions on the admission form, for every course or just one. Answers are checked by the server and saved with the application.</CardDescription></div>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add field</Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Question</TableHead><TableHead>Type</TableHead><TableHead>Section</TableHead><TableHead>Course</TableHead><TableHead>Required</TableHead><TableHead>Shown</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {fields.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground text-sm">No extra fields. The standard form is shown.</TableCell></TableRow> :
              fields.map((x) => (
                <TableRow key={x.id} className={x.active ? '' : 'opacity-60'}>
                  <TableCell><p className="text-sm font-medium">{x.label}</p><p className="text-[11px] font-mono text-muted-foreground">{x.field_key}{x.options ? ` · ${x.options.join(' / ')}` : ''}</p></TableCell>
                  <TableCell className="text-sm">{FIELD_TYPES[x.field_type]}</TableCell>
                  <TableCell className="text-sm">{SECTIONS[x.section]}</TableCell>
                  <TableCell className="text-sm">{x.course_name ?? 'All courses'}</TableCell>
                  <TableCell><Switch checked={x.required} onCheckedChange={(v) => patch(x.id, { required: v })} aria-label="Required" /></TableCell>
                  <TableCell><Switch checked={x.active} onCheckedChange={(v) => patch(x.id, { active: v })} aria-label="Shown" /></TableCell>
                  <TableCell className="text-right"><Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => remove(x.id)} aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent>
      <Dialog open={open} onOpenChange={(o) => { if (!busy) setOpen(o); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add form field</DialogTitle><DialogDescription>The question is added to the admission form.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs font-semibold">Question *</Label><Input value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} maxLength={120} placeholder="e.g. Blood donor?" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Answer type</Label>
                <Select value={f.field_type} onValueChange={(v) => setF({ ...f, field_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(FIELD_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Section</Label>
                <Select value={f.section} onValueChange={(v) => setF({ ...f, section: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(SECTIONS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {f.field_type === 'select' && <div className="space-y-1.5"><Label className="text-xs font-semibold">Options (comma separated) *</Label><Input value={f.options} onChange={(e) => setF({ ...f, options: e.target.value })} placeholder="Yes, No, Not sure" /></div>}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Applies to</Label>
              <Select value={f.course} onValueChange={(v) => setF({ ...f, course: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value={ALL}>All courses</SelectItem>{courses.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold">Help text</Label><Input value={f.help_text} onChange={(e) => setF({ ...f, help_text: e.target.value })} maxLength={200} /></div>
            <label className="flex items-center gap-2 text-sm"><Switch checked={f.required} onCheckedChange={(v) => setF({ ...f, required: v })} /> Required</label>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button><Button onClick={add} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ------------------------------------------------------------------ required documents */
function DocsCard({ docs, courses, onChange, toast }: { docs: Doc[]; courses: string[]; onChange: () => Promise<void>; toast: Toast }) {
  const [type, setType] = useState('');
  const [course, setCourse] = useState(ALL);
  const [busy, setBusy] = useState(false);
  const add = async () => {
    if (type.trim().length < 2) { toast({ title: 'Enter the document name', variant: 'destructive' }); return; }
    setBusy(true);
    const { error } = await sb.from('admission_required_documents').insert({ doc_type: type.trim(), course_name: course === ALL ? null : course, sort_order: docs.length + 1 });
    setBusy(false);
    if (error) return failToast(toast, 'Document not added', error);
    setType(''); await onChange();
  };
  const patch = async (id: string, values: Partial<Doc>) => {
    const { error } = await sb.from('admission_required_documents').update(values).eq('id', id);
    if (error) failToast(toast, 'Not updated', error);
    await onChange();
  };
  const remove = async (id: string) => {
    const { error } = await sb.from('admission_required_documents').delete().eq('id', id);
    if (error) failToast(toast, 'Not removed', error);
    await onChange();
  };
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-lg">Required documents</CardTitle><CardDescription>An application cannot be approved until each required document below is marked Verified in the Verification tab. The names must match the document type used there.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Input value={type} onChange={(e) => setType(e.target.value)} placeholder="e.g. 12th Marksheet" maxLength={100} className="max-w-xs" onKeyDown={(e) => { if (e.key === 'Enter') void add(); }} />
          <Select value={course} onValueChange={setCourse}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value={ALL}>All courses</SelectItem>{courses.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={add} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}Add</Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Document</TableHead><TableHead>Course</TableHead><TableHead>Required</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {docs.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-sm">No required documents: approval is not blocked by documents.</TableCell></TableRow> :
              docs.map((d) => (
                <TableRow key={d.id} className={d.active ? '' : 'opacity-60'}>
                  <TableCell className="text-sm font-medium">{d.doc_type}</TableCell>
                  <TableCell className="text-sm">{d.course_name ?? 'All courses'}</TableCell>
                  <TableCell><Switch checked={d.required && d.active} onCheckedChange={(v) => patch(d.id, { required: v, active: v ? true : d.active })} aria-label="Required" /></TableCell>
                  <TableCell className="text-right"><Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => remove(d.id)} aria-label="Remove"><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
