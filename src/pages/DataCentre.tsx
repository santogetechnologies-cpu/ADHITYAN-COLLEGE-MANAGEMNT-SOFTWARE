import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Search, Download, Database, Loader2 } from 'lucide-react';
import { campusOpsService, StaffHit, StudentHit } from '@/services/campusOpsService';

const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const DATASETS: { key: string; label: string; help: string; roles: string[] }[] = [
  { key: 'students', label: 'Student register', help: 'IDs, class, department, semester, status', roles: ['admin', 'principal'] },
  { key: 'staff', label: 'Staff directory', help: 'Name, role, department, contact', roles: ['admin', 'principal', 'hr_manager'] },
  { key: 'fees', label: 'Fee ledger', help: 'Every charge with paid, waived and outstanding', roles: ['admin', 'principal', 'finance_manager', 'financier', 'accountant'] },
  { key: 'lifecycle', label: 'Discontinuations & transfers', help: 'Who left, moved or returned, and why', roles: ['admin', 'principal'] },
];

export default function DataCentre() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [q, setQ] = useState('');
  const [res, setRes] = useState<{ students: StudentHit[]; staff: StaffHit[] } | null>(null);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const search = async () => {
    if (q.trim().length < 2) { toast({ title: 'Type at least 2 letters' }); return; }
    setSearching(true);
    try { setRes(await campusOpsService.globalSearch(q.trim())); } catch (e: any) { toast({ title: 'Search failed', description: e.message, variant: 'destructive' }); } finally { setSearching(false); }
  };
  const exportSet = async (key: string) => {
    setBusy(key);
    try {
      const rows = await campusOpsService.exportDataset(key);
      if (!rows.length) { toast({ title: 'Nothing to export yet' }); return; }
      const head = Object.keys(rows[0]);
      const csv = [head.join(','), ...rows.map(r => head.map(h => cell(r[h])).join(','))].join('\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `${key}-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(a.href);
      toast({ title: `Exported ${rows.length} rows` });
    } catch (e: any) { toast({ title: 'Could not export', description: e.message, variant: 'destructive' }); } finally { setBusy(null); }
  };
  const mine = DATASETS.filter(d => d.roles.includes(user?.role ?? ''));

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation showBackButton={true} backUrl="/dashboard" backLabel="Back to Dashboard" />
      <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        <div><h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Database className="w-6 h-6" /> Search & Export</h1>
          <p className="text-sm text-slate-500">Find a person across the college, or download a list as a spreadsheet. Every export is recorded in the audit log.</p></div>
        <Card><CardHeader><CardTitle className="text-base">Find a person</CardTitle><CardDescription>Students by name, ID, roll number or email; staff by name or email (where you are allowed).</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2"><Input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} aria-label="Search" placeholder="Start typing…" />
              <Button onClick={search} disabled={searching}>{searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-1.5" />} Search</Button></div>
            {res && res.students.length === 0 && res.staff.length === 0 && <p className="text-sm text-slate-500">No match.</p>}
            {res && res.students.length > 0 && <div><div className="text-xs font-semibold text-slate-600 mb-1">Students</div><ul className="divide-y border rounded-lg">{res.students.map(s => (
              <li key={s.id} className="p-2 text-sm flex justify-between"><span>{s.name} <span className="text-slate-500">· {s.student_id} · {s.class_name || '—'}</span></span><Badge variant="outline" className="capitalize">{s.status}</Badge></li>))}</ul></div>}
            {res && res.staff.length > 0 && <div><div className="text-xs font-semibold text-slate-600 mb-1">Staff</div><ul className="divide-y border rounded-lg">{res.staff.map(s => (
              <li key={s.id} className="p-2 text-sm flex justify-between"><span>{s.name} <span className="text-slate-500">· {s.email}</span></span><Badge variant="outline">{s.role.replace(/_/g, ' ')}</Badge></li>))}</ul></div>}
          </CardContent></Card>
        {mine.length > 0 && <Card><CardHeader><CardTitle className="text-base">Download a list</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">{mine.map(d => (
            <div key={d.key} className="border rounded-lg p-3 flex items-center justify-between gap-3"><div><div className="font-medium text-sm">{d.label}</div><div className="text-xs text-slate-500">{d.help}</div></div>
              <Button size="sm" variant="outline" disabled={busy === d.key} onClick={() => exportSet(d.key)}>{busy === d.key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1" />} CSV</Button></div>))}</CardContent></Card>}
      </main>
    </div>
  );
}
