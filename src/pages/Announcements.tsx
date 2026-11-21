import { useCallback, useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/hooks/use-toast';
import { Megaphone } from 'lucide-react';
import { campusOpsService } from '@/services/campusOpsService';
import { NotificationChannelsPanel } from '@/components/admin/NotificationChannelsPanel';

export default function Announcements() {
  const { toast } = useToast();
  const [list, setList] = useState<any[]>([]);
  const [f, setF] = useState({ title: '', message: '', category: 'Circular', priority: 'Normal', audience: 'All', className: '', department: '' });
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => { campusOpsService.announcements().then(setList).catch(() => setList([])); }, []);
  useEffect(() => { load(); }, [load]);
  const sel = 'w-full border rounded-md h-10 px-3 text-sm bg-white';

  const publish = async () => {
    setBusy(true);
    try { const r = await campusOpsService.announce(f); toast({ title: 'Announcement published', description: r?.recipients ? `${r.recipients} people notified.` : 'Everyone in the chosen audience has been notified.' }); setF({ ...f, title: '', message: '' }); load(); }
    catch (e: any) { toast({ title: 'Could not publish', description: e.message, variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation showBackButton={true} backUrl="/dashboard" backLabel="Back to Dashboard" />
      <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        <div><h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Megaphone className="w-6 h-6" /> Announcements</h1>
          <p className="text-sm text-slate-500">Publish a notice. It appears on the chosen people's dashboards and in their notification bell.</p></div>
        <Card><CardHeader><CardTitle className="text-base">New announcement</CardTitle><CardDescription>Choose who should see it before publishing — it cannot be recalled from notification bells.</CardDescription></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-3"><Label>Title</Label><Input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} maxLength={200} /></div>
            <div className="sm:col-span-3"><Label>Message</Label><Textarea value={f.message} onChange={e => setF({ ...f, message: e.target.value })} maxLength={2000} /></div>
            <div><Label>Audience</Label><select className={sel} value={f.audience} onChange={e => setF({ ...f, audience: e.target.value })}>{['All', 'Students', 'Faculty', 'Parents'].map(x => <option key={x}>{x}</option>)}</select></div>
            <div><Label>Category</Label><select className={sel} value={f.category} onChange={e => setF({ ...f, category: e.target.value })}>{['Circular', 'Exam', 'Holiday', 'Event', 'Emergency'].map(x => <option key={x}>{x}</option>)}</select></div>
            <div><Label>Priority</Label><select className={sel} value={f.priority} onChange={e => setF({ ...f, priority: e.target.value })}>{['Normal', 'High', 'Urgent'].map(x => <option key={x}>{x}</option>)}</select></div>
            <div><Label>Only this class (optional)</Label><Input value={f.className} onChange={e => setF({ ...f, className: e.target.value })} placeholder="e.g. BMLT-1" /></div>
            <div><Label>Only this department (optional)</Label><Input value={f.department} onChange={e => setF({ ...f, department: e.target.value })} placeholder="e.g. Radiology" /></div>
            <p className="text-xs text-muted-foreground self-end">Leave both empty to reach everyone in the audience.</p>
            <div className="sm:col-span-3"><Button disabled={busy || f.title.trim().length < 3 || f.message.trim().length < 3} onClick={publish}>{busy ? 'Publishing…' : 'Publish and notify'}</Button></div>
          </CardContent></Card>
        <NotificationChannelsPanel />
        <Card><CardHeader><CardTitle className="text-base">Published</CardTitle></CardHeader>
          <CardContent>{list.length === 0 ? <EmptyState title="No announcements yet" size="sm" /> : <ul className="divide-y">{list.map(a => (
            <li key={a.id} className="py-3"><div className="flex items-center gap-2 text-sm font-medium">{a.title}<Badge variant="outline">{a.target_audience}{a.target_class ? ` · ${a.target_class}` : ''}{a.target_department ? ` · ${a.target_department}` : ''}</Badge>{a.priority !== 'Normal' && <Badge variant="outline" className="text-rose-700 border-rose-300">{a.priority}</Badge>}</div>
              <div className="text-sm text-slate-600">{a.message}</div><div className="text-xs text-slate-500">{a.category} · {a.author_name} · {new Date(a.published_at).toLocaleString()}</div></li>))}</ul>}</CardContent></Card>
      </main>
    </div>
  );
}
