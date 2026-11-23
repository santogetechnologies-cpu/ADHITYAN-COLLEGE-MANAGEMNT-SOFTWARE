import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { PaymentSettings } from './PaymentSettings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Copy, Loader2, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// The generated Database typings in this repo do not resolve insert/update payloads for any table
// (project-wide), so writes here go through an untyped alias. Row shapes are declared below.
const sb: any = supabase;
import { db } from '@/services/supabase/database';
import { useToast } from '@/hooks/use-toast';
import { askConfirm, askText } from '@/lib/dialogs';

const ANY = '__any__';
const CYCLES: Record<string, string> = { one_time: 'One-time', per_semester: 'Every semester', per_year: 'Every year' };
const CATEGORIES = ['tuition', 'exam', 'lab', 'library', 'hostel', 'transport', 'admission', 'activity', 'deposit', 'other'];
const inr = (n: number | string | null | undefined) => `₹${Number(n ?? 0).toLocaleString('en-IN')}`;

interface Head { id: string; code: string; name: string; category: string; refundable: boolean; active: boolean }
interface Plan { id: string; name: string; academic_year: string; department: string | null; class_name: string | null; quota: string | null; status: 'Draft' | 'Published' | 'Archived'; description: string | null }
interface Item { id: string; plan_id: string; fee_head_id: string; amount: number; billing_cycle: string; semesters: number[] | null; due_days: number }
interface Run { id: string; run_type: string; plan_id: string | null; fee_head_id: string | null; description: string | null; scope_type: string; scope_value: string | null; academic_year: string; students_count: number; demands_count: number; total_amount: number; status: string; created_at: string }

const planBadge: Record<string, string> = {
  Draft: 'bg-amber-100 text-amber-800 border-amber-200',
  Published: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Archived: 'bg-zinc-200 text-zinc-700 border-zinc-300',
};

export const FeeSetup = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [heads, setHeads] = useState<Head[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [students, setStudents] = useState<{ department: string | null; class_name: string | null; admission_quota: string | null }[]>([]);

  const load = useCallback(async () => {
    try {
      const [h, p, i, r, s] = await Promise.all([
        supabase.from('fee_heads').select('*').order('name'),
        supabase.from('fee_plans').select('*').order('created_at', { ascending: false }),
        supabase.from('fee_plan_items').select('*').order('sort_order'),
        supabase.from('fee_runs').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('students').select('department, class_name, admission_quota').eq('status', 'active').limit(5000),
      ]);
      const err = h.error || p.error || i.error || r.error;
      if (err) throw new Error(err.message);
      setHeads((h.data || []) as Head[]);
      setPlans((p.data || []) as Plan[]);
      setItems((i.data || []) as Item[]);
      setRuns((r.data || []) as Run[]);
      setStudents((s.data || []) as any[]);
      setLoadError(null);
    } catch (e: any) {
      setLoadError(e?.message || 'Could not load fee setup.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const headById = useMemo(() => new Map(heads.map((h) => [h.id, h])), [heads]);
  const planById = useMemo(() => new Map(plans.map((p) => [p.id, p])), [plans]);
  const distinct = (k: 'department' | 'class_name' | 'admission_quota') =>
    Array.from(new Set(students.map((s) => s[k]).filter(Boolean) as string[])).sort();
  const departments = useMemo(() => distinct('department'), [students]);
  const classes = useMemo(() => distinct('class_name'), [students]);
  const quotas = useMemo(() => distinct('admission_quota'), [students]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  if (loadError) {
    return (
      <Card><CardContent className="p-8 text-center">
        <p className="text-sm text-destructive flex items-center justify-center gap-1.5"><AlertTriangle className="h-4 w-4" /> {loadError}</p>
        <Button size="sm" variant="outline" className="mt-3" onClick={() => { setLoading(true); void load(); }}>Retry</Button>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Fee setup</h2>
        <p className="text-sm text-muted-foreground">Define fee types, group them into plans, then bill a plan — or one new fee — to a student, class, department or everyone.</p>
      </div>
      <Tabs defaultValue="bill">
        <TabsList>
          <TabsTrigger value="bill">Bill fees</TabsTrigger>
          <TabsTrigger value="plans">Fee plans</TabsTrigger>
          <TabsTrigger value="heads">Fee types</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="payments">Online payments</TabsTrigger>
        </TabsList>
        <TabsContent value="bill" className="mt-4"><BillFees plans={plans} heads={heads} departments={departments} classes={classes} quotas={quotas} onDone={load} /></TabsContent>
        <TabsContent value="plans" className="mt-4"><Plans plans={plans} items={items} heads={heads} headById={headById} departments={departments} classes={classes} quotas={quotas} onChange={load} /></TabsContent>
        <TabsContent value="heads" className="mt-4"><Heads heads={heads} onChange={load} /></TabsContent>
        <TabsContent value="payments" className="mt-4"><PaymentSettings /></TabsContent>
        <TabsContent value="history" className="mt-4"><History runs={runs} planById={planById} headById={headById} onChange={load} /></TabsContent>
      </Tabs>
    </div>
  );
};

/* ------------------------------------------------------------------ Fee types */
function Heads({ heads, onChange }: { heads: Head[]; onChange: () => Promise<void> }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ code: '', name: '', category: 'other', refundable: false });
  const [busy, setBusy] = useState(false);

  const create = async () => {
    const code = f.code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    if (!/^[A-Z0-9_]{2,24}$/.test(code) || f.name.trim().length < 2) {
      toast({ title: 'Check the details', description: 'Give a name and a short code (2–24 letters, digits or _).', variant: 'destructive' });
      return;
    }
    setBusy(true);
    const { error } = await sb.from('fee_heads').insert({ code, name: f.name.trim(), category: f.category, refundable: f.refundable });
    setBusy(false);
    if (error) {
      toast({ title: 'Fee type not added', description: error.code === '23505' ? `The code ${code} is already used.` : error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Fee type added', description: f.name.trim() });
    setOpen(false);
    setF({ code: '', name: '', category: 'other', refundable: false });
    await onChange();
  };

  const toggle = async (h: Head) => {
    const { error } = await sb.from('fee_heads').update({ active: !h.active, updated_at: new Date().toISOString() }).eq('id', h.id);
    if (error) toast({ title: 'Could not update', description: error.message, variant: 'destructive' });
    await onChange();
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-lg">Fee types</CardTitle>
          <CardDescription>Every kind of fee you charge. Add your own (e.g. “Clinical training”, “ID card”). Deactivate instead of deleting.</CardDescription>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add fee type</Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>Category</TableHead><TableHead>Refundable</TableHead><TableHead className="text-right">Active</TableHead></TableRow></TableHeader>
          <TableBody>
            {heads.map((h) => (
              <TableRow key={h.id} className={h.active ? '' : 'opacity-60'}>
                <TableCell className="font-medium text-sm">{h.name}</TableCell>
                <TableCell className="font-mono text-xs">{h.code}</TableCell>
                <TableCell className="text-sm capitalize">{h.category}</TableCell>
                <TableCell className="text-sm">{h.refundable ? 'Yes' : 'No'}</TableCell>
                <TableCell className="text-right"><Switch checked={h.active} onCheckedChange={() => toggle(h)} aria-label={`Toggle ${h.name}`} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <Dialog open={open} onOpenChange={(o) => { if (!busy) setOpen(o); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add fee type</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs font-semibold">Name *</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={100} /></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold">Code *</Label><Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} maxLength={24} className="font-mono uppercase" placeholder="e.g. IDCARD" /></div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Category</Label>
              <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm"><Switch checked={f.refundable} onCheckedChange={(v) => setF({ ...f, refundable: v })} /> Refundable (e.g. a deposit)</label>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button><Button onClick={create} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ------------------------------------------------------------------ Plans */
function Plans({ plans, items, heads, headById, departments, classes, quotas, onChange }: {
  plans: Plan[]; items: Item[]; heads: Head[]; headById: Map<string, Head>; departments: string[]; classes: string[]; quotas: string[]; onChange: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = plans.find((p) => p.id === selectedId) ?? null;
  const planItems = items.filter((i) => i.plan_id === selectedId);

  const [newOpen, setNewOpen] = useState(false);
  const [np, setNp] = useState({ name: '', academic_year: '', department: ANY, class_name: ANY, quota: ANY, description: '' });
  const [itemOpen, setItemOpen] = useState(false);
  const [ni, setNi] = useState({ fee_head_id: '', amount: '', billing_cycle: 'per_semester', semesters: '', due_days: '30' });
  const [cloneOpen, setCloneOpen] = useState(false);
  const [cl, setCl] = useState({ name: '', year: '' });
  const [busy, setBusy] = useState(false);
  const fail = (title: string, e: any) => toast({ title, description: e?.message || String(e), variant: 'destructive' });

  const createPlan = async () => {
    if (np.name.trim().length < 2 || np.academic_year.trim().length < 4) {
      toast({ title: 'Check the details', description: 'A plan needs a name and an academic year (e.g. 2026-27).', variant: 'destructive' });
      return;
    }
    setBusy(true);
    const { data, error } = await sb.from('fee_plans').insert({
      name: np.name.trim(), academic_year: np.academic_year.trim(), description: np.description.trim() || null,
      department: np.department === ANY ? null : np.department, class_name: np.class_name === ANY ? null : np.class_name, quota: np.quota === ANY ? null : np.quota,
    }).select().single();
    setBusy(false);
    if (error) return fail(error.code === '23505' ? 'That plan name already exists for the year' : 'Plan not created', error);
    toast({ title: 'Draft plan created', description: 'Add fee items, then publish it.' });
    setNewOpen(false);
    setNp({ name: '', academic_year: '', department: ANY, class_name: ANY, quota: ANY, description: '' });
    await onChange();
    setSelectedId(data.id);
  };

  const addItem = async () => {
    if (!selected) return;
    const amount = Number(ni.amount);
    const sems = ni.billing_cycle === 'per_semester' && ni.semesters.trim()
      ? ni.semesters.split(',').map((x) => Number(x.trim())) : null;
    if (!ni.fee_head_id || !Number.isFinite(amount) || amount < 0) {
      toast({ title: 'Check the item', description: 'Choose a fee type and enter an amount (0 or more).', variant: 'destructive' });
      return;
    }
    if (sems && sems.some((x) => !Number.isInteger(x) || x < 1 || x > 20)) {
      toast({ title: 'Check the semesters', description: 'Enter semester numbers separated by commas, e.g. 1,2. Leave blank for every semester.', variant: 'destructive' });
      return;
    }
    setBusy(true);
    const { error } = await sb.from('fee_plan_items').insert({
      plan_id: selected.id, fee_head_id: ni.fee_head_id, amount, billing_cycle: ni.billing_cycle, semesters: sems,
      due_days: Math.max(0, Math.min(365, Number(ni.due_days) || 30)),
    });
    setBusy(false);
    if (error) return fail(error.code === '23505' ? 'That fee type is already in this plan with the same billing' : 'Item not added', error);
    setItemOpen(false);
    setNi({ fee_head_id: '', amount: '', billing_cycle: 'per_semester', semesters: '', due_days: '30' });
    await onChange();
  };

  const removeItem = async (id: string) => {
    const { error } = await sb.from('fee_plan_items').delete().eq('id', id);
    if (error) return fail('Item not removed', error);
    await onChange();
  };

  const setStatus = async (status: 'Published' | 'Archived') => {
    if (!selected) return;
    if (status === 'Published' && !(await askConfirm('Publishing freezes this plan: its items can no longer be edited (you can clone it to make a new version). Publish?', { title: 'Publish fee plan', confirmLabel: 'Publish' }))) return;
    const { error } = await sb.from('fee_plans').update({ status }).eq('id', selected.id);
    if (error) return fail(status === 'Published' ? 'Plan not published' : 'Plan not archived', error);
    toast({ title: status === 'Published' ? 'Plan published' : 'Plan archived' });
    await onChange();
  };

  const clone = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const r = await db.feePlanClone(selected.id, cl.name.trim(), cl.year.trim());
      toast({ title: 'Plan copied', description: 'The copy is a Draft you can edit.' });
      setCloneOpen(false);
      await onChange();
      setSelectedId(r.plan_id);
    } catch (e: any) { fail('Plan not copied', e); } finally { setBusy(false); }
  };

  const total = planItems.reduce((s, i) => s + Number(i.amount), 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-1">
        <CardHeader className="flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Plans</CardTitle>
          <Button size="sm" onClick={() => setNewOpen(true)}><Plus className="h-4 w-4 mr-1" /> New</Button>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {plans.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No plans yet. Create one for an academic year.</p>}
          {plans.map((p) => (
            <button key={p.id} onClick={() => setSelectedId(p.id)}
              className={`w-full text-left rounded-md border px-3 py-2 hover:bg-muted/50 ${p.id === selectedId ? 'border-primary bg-muted/40' : ''}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm truncate">{p.name}</span>
                <Badge variant="outline" className={planBadge[p.status]}>{p.status}</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">{p.academic_year} · {p.department || 'All departments'}{p.class_name ? ` · ${p.class_name}` : ''}{p.quota ? ` · ${p.quota}` : ''}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        {!selected ? (
          <CardContent className="p-10 text-center text-muted-foreground text-sm">Select a plan to see and edit its fee items.</CardContent>
        ) : (
          <>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">{selected.name} <Badge variant="outline" className={`ml-1 ${planBadge[selected.status]}`}>{selected.status}</Badge></CardTitle>
                  <CardDescription>{selected.academic_year} · {selected.department || 'All departments'}{selected.class_name ? ` · ${selected.class_name}` : ''}{selected.quota ? ` · quota ${selected.quota}` : ''}</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setCl({ name: `${selected.name} (copy)`, year: selected.academic_year }); setCloneOpen(true); }}><Copy className="h-4 w-4 mr-1" /> Clone</Button>
                  {selected.status === 'Draft' && <Button size="sm" onClick={() => setStatus('Published')} disabled={planItems.length === 0}>Publish</Button>}
                  {selected.status === 'Published' && <Button size="sm" variant="outline" onClick={() => setStatus('Archived')}>Archive</Button>}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Fee</TableHead><TableHead>Amount</TableHead><TableHead>Billed</TableHead><TableHead>Due after</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>
                  {planItems.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground text-sm">No items yet.</TableCell></TableRow>
                  ) : planItems.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="text-sm font-medium">{headById.get(i.fee_head_id)?.name ?? '—'}</TableCell>
                      <TableCell className="font-mono text-sm">{inr(i.amount)}</TableCell>
                      <TableCell className="text-sm">{CYCLES[i.billing_cycle]}{i.semesters?.length ? ` (sem ${i.semesters.join(', ')})` : ''}</TableCell>
                      <TableCell className="text-sm">{i.due_days} days</TableCell>
                      <TableCell className="text-right">{selected.status === 'Draft' && <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => removeItem(i.id)}>Remove</Button>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between mt-3">
                {selected.status === 'Draft'
                  ? <Button size="sm" variant="outline" onClick={() => setItemOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add fee item</Button>
                  : <span className="text-xs text-muted-foreground">Published plans are frozen. Clone to make changes.</span>}
                <span className="text-sm text-muted-foreground">Sum of items: <span className="font-mono font-semibold text-foreground">{inr(total)}</span></span>
              </div>
            </CardContent>
          </>
        )}
      </Card>

      {/* new plan */}
      <Dialog open={newOpen} onOpenChange={(o) => { if (!busy) setNewOpen(o); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New fee plan</DialogTitle><DialogDescription>Leave department, class and quota on “All” for a plan that applies to everyone.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs font-semibold">Plan name *</Label><Input value={np.name} onChange={(e) => setNp({ ...np, name: e.target.value })} placeholder="e.g. B.Sc MLT – Management quota" maxLength={150} /></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold">Academic year *</Label><Input value={np.academic_year} onChange={(e) => setNp({ ...np, academic_year: e.target.value })} placeholder="2026-27" maxLength={20} /></div>
            {[['department', 'Department', departments], ['class_name', 'Class', classes], ['quota', 'Admission quota', quotas]].map(([k, label, opts]) => (
              <div key={k as string} className="space-y-1.5">
                <Label className="text-xs font-semibold">{label as string}</Label>
                <Select value={(np as any)[k as string]} onValueChange={(v) => setNp({ ...np, [k as string]: v } as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value={ANY}>All</SelectItem>{(opts as string[]).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            ))}
            <div className="space-y-1.5"><Label className="text-xs font-semibold">Notes</Label><Textarea rows={2} value={np.description} onChange={(e) => setNp({ ...np, description: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setNewOpen(false)} disabled={busy}>Cancel</Button><Button onClick={createPlan} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}Create draft</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* add item */}
      <Dialog open={itemOpen} onOpenChange={(o) => { if (!busy) setItemOpen(o); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add fee item</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Fee type *</Label>
              <Select value={ni.fee_head_id} onValueChange={(v) => setNi({ ...ni, fee_head_id: v })}>
                <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
                <SelectContent>{heads.filter((h) => h.active).map((h) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs font-semibold">Amount (₹) *</Label><Input type="number" min="0" step="0.01" value={ni.amount} onChange={(e) => setNi({ ...ni, amount: e.target.value })} className="font-mono" /></div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Billed</Label>
                <Select value={ni.billing_cycle} onValueChange={(v) => setNi({ ...ni, billing_cycle: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(CYCLES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {ni.billing_cycle === 'per_semester' && (
              <div className="space-y-1.5"><Label className="text-xs font-semibold">Only these semesters (optional)</Label><Input value={ni.semesters} onChange={(e) => setNi({ ...ni, semesters: e.target.value })} placeholder="e.g. 1,2 — blank = every semester" /></div>
            )}
            <div className="space-y-1.5"><Label className="text-xs font-semibold">Due this many days after billing</Label><Input type="number" min="0" max="365" value={ni.due_days} onChange={(e) => setNi({ ...ni, due_days: e.target.value })} className="font-mono" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setItemOpen(false)} disabled={busy}>Cancel</Button><Button onClick={addItem} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* clone */}
      <Dialog open={cloneOpen} onOpenChange={(o) => { if (!busy) setCloneOpen(o); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Clone plan</DialogTitle><DialogDescription>Creates an editable Draft with the same items.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs font-semibold">New name</Label><Input value={cl.name} onChange={(e) => setCl({ ...cl, name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold">Academic year</Label><Input value={cl.year} onChange={(e) => setCl({ ...cl, year: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCloneOpen(false)} disabled={busy}>Cancel</Button><Button onClick={clone} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}Clone</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ Bill fees */
function BillFees({ plans, heads, departments, classes, quotas, onDone }: {
  plans: Plan[]; heads: Head[]; departments: string[]; classes: string[]; quotas: string[]; onDone: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [mode, setMode] = useState<'plan' | 'single'>('plan');
  const [planId, setPlanId] = useState('');
  const [headId, setHeadId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [scopeType, setScopeType] = useState<'department' | 'class' | 'student' | 'all'>('department');
  const [scopeValue, setScopeValue] = useState('');
  const [quota, setQuota] = useState(ANY);
  const [semester, setSemester] = useState('');
  const [year, setYear] = useState('');
  const [due, setDue] = useState('');
  const [yearly, setYearly] = useState(false);
  const [oneTime, setOneTime] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const published = plans.filter((p) => p.status === 'Published');
  const plan = published.find((p) => p.id === planId);

  // any change invalidates the preview, so what gets billed is always what was previewed
  useEffect(() => { setPreview(null); }, [mode, planId, headId, amount, description, scopeType, scopeValue, quota, semester, year, due, yearly, oneTime]);

  const payload = () => ({
    planId: mode === 'plan' ? planId : undefined,
    feeHeadId: mode === 'single' ? headId : undefined,
    amount: mode === 'single' ? Number(amount) : undefined,
    description: mode === 'single' ? description.trim() || undefined : undefined,
    scopeType, scopeValue: scopeType === 'all' ? undefined : scopeValue.trim(),
    quota: quota === ANY ? undefined : quota,
    semester: semester.trim() === '' ? null : Number(semester),
    academicYear: (year || (mode === 'plan' ? plan?.academic_year : '') || '').trim() || undefined,
    dueDate: due || undefined, includeYearly: yearly, includeOneTime: oneTime,
  });

  const problem = (): string | null => {
    if (mode === 'plan' && !planId) return 'Choose a published plan.';
    if (mode === 'single') {
      if (!headId) return 'Choose the fee type.';
      if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) return 'Enter an amount greater than zero.';
      if (!due) return 'Choose a due date.';
      if (!(year || '').trim()) return 'Enter the academic year.';
    }
    if (scopeType !== 'all' && !scopeValue.trim()) return scopeType === 'student' ? 'Enter the student ID.' : `Choose the ${scopeType}.`;
    if (semester.trim() !== '' && (!Number.isInteger(Number(semester)) || Number(semester) < 1)) return 'Semester must be a whole number.';
    return null;
  };

  const run = async (execute: boolean) => {
    const p = problem();
    if (p) { toast({ title: 'Check the form', description: p, variant: 'destructive' }); return; }
    setBusy(true);
    try {
      const r = await db.feeGenerate(execute, payload());
      if (!execute) { setPreview(r); return; }
      toast({ title: 'Fees billed', description: `${r.created} fee${r.created === 1 ? '' : 's'} for ${r.students} student${r.students === 1 ? '' : 's'}, ${inr(r.total_amount)} in total.` });
      setPreview(null);
      await onDone();
    } catch (e: any) {
      toast({ title: execute ? 'Nothing was billed' : 'Could not preview', description: e?.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const scopeOptions = scopeType === 'department' ? departments : scopeType === 'class' ? classes : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <Card className="lg:col-span-3">
        <CardHeader className="pb-3"><CardTitle className="text-lg">What to bill</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button size="sm" variant={mode === 'plan' ? 'default' : 'outline'} onClick={() => setMode('plan')}>A fee plan</Button>
            <Button size="sm" variant={mode === 'single' ? 'default' : 'outline'} onClick={() => setMode('single')}>One new fee</Button>
          </div>

          {mode === 'plan' ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Published plan *</Label>
                <Select value={planId} onValueChange={setPlanId}>
                  <SelectTrigger><SelectValue placeholder={published.length ? 'Choose a plan' : 'No published plans yet'} /></SelectTrigger>
                  <SelectContent>{published.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} · {p.academic_year}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <label className="flex items-center gap-2"><Switch checked={yearly} onCheckedChange={setYearly} /> Include yearly fees</label>
                <label className="flex items-center gap-2"><Switch checked={oneTime} onCheckedChange={setOneTime} /> Include one-time fees</label>
              </div>
              <p className="text-[11px] text-muted-foreground">Fees billed every semester are added for each student’s current semester. Anything already billed is skipped.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Fee type *</Label>
                  <Select value={headId} onValueChange={setHeadId}>
                    <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
                    <SelectContent>{heads.filter((h) => h.active).map((h) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label className="text-xs font-semibold">Amount per student (₹) *</Label><Input type="number" min="1" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="font-mono" /></div>
                <div className="space-y-1.5"><Label className="text-xs font-semibold">Due date *</Label><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></div>
                <div className="space-y-1.5"><Label className="text-xs font-semibold">Academic year *</Label><Input value={year} onChange={(e) => setYear(e.target.value)} placeholder="2026-27" /></div>
              </div>
              <div className="space-y-1.5"><Label className="text-xs font-semibold">Note shown on the invoice (optional)</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} placeholder="e.g. Lab coat" /></div>
            </div>
          )}

          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-semibold">Who to bill</p>
            <div className="flex flex-wrap gap-2">
              {(['department', 'class', 'student', 'all'] as const).map((t) => (
                <Button key={t} size="sm" variant={scopeType === t ? 'default' : 'outline'} className="capitalize" onClick={() => { setScopeType(t); setScopeValue(''); }}>
                  {t === 'all' ? 'Everyone' : t === 'student' ? 'One student' : `A ${t}`}
                </Button>
              ))}
            </div>
            {scopeType === 'student' && (
              <div className="space-y-1.5"><Label className="text-xs font-semibold">Student ID *</Label><Input value={scopeValue} onChange={(e) => setScopeValue(e.target.value)} className="font-mono" placeholder="e.g. AIP-2026-1001" /></div>
            )}
            {(scopeType === 'department' || scopeType === 'class') && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold capitalize">{scopeType} *</Label>
                <Select value={scopeValue} onValueChange={setScopeValue}>
                  <SelectTrigger><SelectValue placeholder={scopeOptions.length ? `Choose a ${scopeType}` : `No ${scopeType}es found`} /></SelectTrigger>
                  <SelectContent>{scopeOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Only admission quota</Label>
                <Select value={quota} onValueChange={setQuota}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value={ANY}>All</SelectItem>{quotas.map((q) => <SelectItem key={q} value={q}>{q}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs font-semibold">Only students in semester</Label><Input type="number" min="1" value={semester} onChange={(e) => setSemester(e.target.value)} placeholder="any" className="font-mono" /></div>
            </div>
          </div>

          <Button onClick={() => run(false)} disabled={busy}>{busy && !preview ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}Preview</Button>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader className="pb-3"><CardTitle className="text-lg">Preview</CardTitle><CardDescription>Nothing is billed until you confirm.</CardDescription></CardHeader>
        <CardContent>
          {!preview ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Fill in the form and press Preview to see exactly what will be billed.</p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md border p-2"><p className="text-lg font-bold">{preview.students}</p><p className="text-[11px] text-muted-foreground">students</p></div>
                <div className="rounded-md border p-2"><p className="text-lg font-bold">{preview.to_create}</p><p className="text-[11px] text-muted-foreground">fees to create</p></div>
                <div className="rounded-md border p-2"><p className="text-lg font-bold font-mono">{inr(preview.total_amount)}</p><p className="text-[11px] text-muted-foreground">total</p></div>
              </div>
              {preview.already_billed > 0 && <p className="text-xs text-amber-700">{preview.already_billed} fee{preview.already_billed === 1 ? ' is' : 's are'} already billed and will be skipped.</p>}
              {preview.by_head?.length > 0 && (
                <Table>
                  <TableHeader><TableRow><TableHead>Fee</TableHead><TableHead className="text-right">Students</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                  <TableBody>{preview.by_head.map((b: any) => <TableRow key={b.head}><TableCell className="text-sm">{b.head}</TableCell><TableCell className="text-right text-sm">{b.students}</TableCell><TableCell className="text-right font-mono text-sm">{inr(b.amount)}</TableCell></TableRow>)}</TableBody>
                </Table>
              )}
              {preview.sample?.length > 0 && (
                <div className="text-[11px] text-muted-foreground">
                  <p className="font-semibold mb-1">First {preview.sample.length}:</p>
                  {preview.sample.map((s: any, i: number) => <p key={i}>{s.student} ({s.class}) — {s.fee} {inr(s.amount)}, due {s.due}</p>)}
                </div>
              )}
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={busy || preview.to_create === 0}
                onClick={async () => { if (await askConfirm(`Bill ${preview.to_create} fee(s), ${inr(preview.total_amount)} in total, to ${preview.students} student(s)?`, { title: 'Bill students', confirmLabel: 'Bill now' })) void run(true); }}>
                {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                {preview.to_create === 0 ? 'Nothing to bill' : `Bill ${preview.to_create} fees · ${inr(preview.total_amount)}`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ History */
function History({ runs, planById, headById, onChange }: { runs: Run[]; planById: Map<string, Plan>; headById: Map<string, Head>; onChange: () => Promise<void> }) {
  const { toast } = useToast();
  const [cancelFor, setCancelFor] = useState<Run | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const cancel = async () => {
    if (!cancelFor) return;
    if (reason.trim().length < 3) { toast({ title: 'A reason is required', variant: 'destructive' }); return; }
    setBusy(true);
    try {
      const r = await db.feeCancelRun(cancelFor.id, reason.trim());
      toast({ title: 'Run cancelled', description: `${r.cancelled} unpaid fee${r.cancelled === 1 ? '' : 's'} cancelled${r.kept_because_paid ? `; ${r.kept_because_paid} kept because payment was already received` : ''}.` });
      setCancelFor(null); setReason('');
      await onChange();
    } catch (e: any) {
      toast({ title: 'Run not cancelled', description: e?.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-lg">Billing history</CardTitle><CardDescription>Every time fees were billed. Cancel a run to withdraw unpaid fees raised by mistake — paid fees are kept.</CardDescription></CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>When</TableHead><TableHead>What</TableHead><TableHead>Who</TableHead><TableHead className="text-right">Fees</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {runs.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">Nothing has been billed yet.</TableCell></TableRow>
            ) : runs.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</TableCell>
                <TableCell className="text-sm">{r.run_type === 'plan' ? (planById.get(r.plan_id || '')?.name ?? 'Plan') : `${headById.get(r.fee_head_id || '')?.name ?? 'Fee'}${r.description ? ` — ${r.description}` : ''}`}</TableCell>
                <TableCell className="text-xs">{r.scope_type === 'all' ? 'Everyone' : `${r.scope_type}: ${r.scope_value}`}</TableCell>
                <TableCell className="text-right text-sm">{r.demands_count}</TableCell>
                <TableCell className="text-right font-mono text-sm">{inr(r.total_amount)}</TableCell>
                <TableCell><Badge variant="outline" className={r.status === 'Cancelled' ? 'bg-zinc-200 text-zinc-700' : 'bg-emerald-100 text-emerald-800 border-emerald-200'}>{r.status}</Badge></TableCell>
                <TableCell className="text-right">{r.status === 'Completed' && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setReason(''); setCancelFor(r); }}>Cancel run</Button>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <Dialog open={!!cancelFor} onOpenChange={(o) => { if (!o && !busy) setCancelFor(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Cancel this billing run?</DialogTitle><DialogDescription>Unpaid fees from this run are withdrawn. Fees that already received a payment stay.</DialogDescription></DialogHeader>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required)" maxLength={300} />
          <DialogFooter><Button variant="outline" onClick={() => setCancelFor(null)} disabled={busy}>Back</Button><Button variant="destructive" onClick={cancel} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}Cancel run</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
