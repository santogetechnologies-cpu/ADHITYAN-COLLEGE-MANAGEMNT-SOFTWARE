import { useCallback, useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { ScrollText, Download, Loader2 } from 'lucide-react';
import { campusOpsService, AuditRow } from '@/services/campusOpsService';

const PAGE = 100;

const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export default function AuditLogViewer() {
  const [query, setQuery] = useState('');
  const [entity, setEntity] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<{ total: number; items: AuditRow[] }>({ total: 0, items: [] });
  const [open, setOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p = 0) => {
    setLoading(true); setError(null);
    try { setData(await campusOpsService.auditSearch({ query, entity: entity.trim(), from, to, limit: PAGE, offset: p * PAGE })); setPage(p); }
    catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, [query, entity, from, to]);
  useEffect(() => { load(0); /* initial load only */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportCsv = () => {
    const head = ['When', 'Who', 'Role', 'Action', 'Record type', 'Record id'];
    const lines = data.items.map(r => [new Date(r.created_at).toISOString(), r.user_email, r.user_role, r.action, r.entity_type, r.entity_id].map(csvCell).join(','));
    const blob = new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };

  const pages = Math.max(1, Math.ceil(data.total / PAGE));
  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation showBackButton={true} backUrl="/dashboard" backLabel="Back to Dashboard" />
      <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><ScrollText className="w-6 h-6" /> Audit Log</h1>
          <p className="text-sm text-slate-500">A tamper-proof record of who did what: payments, refunds, grades, promotions, role changes. Entries cannot be edited or deleted.</p>
        </div>
        <Card>
          <CardHeader><CardTitle className="text-base">Find entries</CardTitle><CardDescription>Search by action, person or record id.</CardDescription></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 items-end">
            <div className="lg:col-span-2"><Label>Search</Label><Input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && load(0)} placeholder="e.g. refund, someone@college.edu" /></div>
            <div><Label>Record type</Label><Input value={entity} onChange={e => setEntity(e.target.value)} placeholder="e.g. students" /></div>
            <div><Label>From</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
            <div><Label>To</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
            <Button onClick={() => load(0)} disabled={loading}>Search</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{data.total} entr{data.total === 1 ? 'y' : 'ies'}</CardTitle>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!data.items.length}><Download className="w-3.5 h-3.5 mr-1.5" /> Export this page</Button>
          </CardHeader>
          <CardContent>
            {error ? <div className="text-sm text-red-600 text-center py-6">{error}</div>
              : loading ? <div className="py-10 flex justify-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /></div>
              : data.items.length === 0 ? <EmptyState title="No entries match" description="Widen the dates or clear the search." size="sm" />
              : <div className="overflow-x-auto"><Table>
                <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Who</TableHead><TableHead>Action</TableHead><TableHead>Record</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>{data.items.map(r => (<>
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-xs">{new Date(r.created_at).toLocaleString()}</TableCell>
                    <TableCell><div className="text-sm">{r.user_email}</div><div className="text-xs text-slate-500">{r.user_role}</div></TableCell>
                    <TableCell className="font-medium text-sm">{r.action}</TableCell>
                    <TableCell className="text-xs text-slate-500">{r.entity_type}{r.entity_id ? ` · ${r.entity_id.slice(0, 8)}` : ''}</TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={() => setOpen(open === r.id ? null : r.id)}>{open === r.id ? 'Hide' : 'Details'}</Button></TableCell>
                  </TableRow>
                  {open === r.id && <TableRow key={r.id + 'd'}><TableCell colSpan={5}><pre className="text-xs bg-slate-50 rounded p-3 overflow-x-auto">{JSON.stringify({ before: r.old_values, after: r.new_values, record: r.entity_id }, null, 2)}</pre></TableCell></TableRow>}
                </>))}</TableBody></Table></div>}
            {data.total > PAGE && <div className="flex items-center justify-between pt-4 text-sm">
              <Button variant="outline" size="sm" disabled={page === 0 || loading} onClick={() => load(page - 1)}>Previous</Button>
              <span>Page {page + 1} of {pages}</span>
              <Button variant="outline" size="sm" disabled={page + 1 >= pages || loading} onClick={() => load(page + 1)}>Next</Button>
            </div>}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
