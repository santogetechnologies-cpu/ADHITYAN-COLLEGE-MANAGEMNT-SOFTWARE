import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

const sb: any = supabase;

export function StudentPlacementTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [drives, setDrives] = useState<any[]>([]);
  const [apps, setApps] = useState<Record<string, any>>({});
  const [cgpa, setCgpa] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [d, a] = await Promise.all([
        sb.from('placement_drives').select('*').order('drive_date', { ascending: true }),
        sb.from('placement_applications').select('*').eq('student_id', user?.id ?? ''),
      ]);
      setDrives(d.data || []);
      setApps(Object.fromEntries((a.data || []).map((x: any) => [x.drive_id, x])));
    } finally { setLoading(false); }
  }, [user?.id]);
  useEffect(() => { void load(); }, [load]);

  const apply = async (driveId: string) => {
    const n = Number(cgpa);
    if (!(n >= 0 && n <= 10) || cgpa.trim() === '') return toast({ title: 'Enter your current CGPA (0–10) first', variant: 'destructive' });
    setBusy(driveId);
    const { data, error } = await sb.rpc('placement_apply', { p_drive: driveId, p_cgpa: n });
    setBusy(null);
    if (error || !data?.success) return toast({ title: 'Not applied', description: error?.message || data?.error, variant: 'destructive' });
    toast({ title: 'Application submitted' });
    await load();
  };
  const withdraw = async (appId: string) => {
    const { error } = await sb.from('placement_applications').update({ status: 'Withdrawn' }).eq('id', appId);
    if (error) toast({ title: 'Not withdrawn', description: error.message, variant: 'destructive' }); else await load();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      <div><h2 className="text-2xl font-bold">Placements</h2><p className="text-sm text-muted-foreground">Recruitment drives you can apply to. The placement cell verifies your CGPA against your mark sheet.</p></div>
      <Card><CardContent className="p-4 flex items-center gap-3"><label className="text-sm font-medium">My current CGPA</label><Input className="w-28" type="number" min="0" max="10" step="0.01" value={cgpa} onChange={(e) => setCgpa(e.target.value)} /></CardContent></Card>
      {drives.length === 0 ? <p className="text-sm text-muted-foreground text-center py-10">No drives announced yet.</p> : drives.map((d) => {
        const app = apps[d.id];
        const open = d.status === 'Open' && d.application_deadline >= today;
        return (
          <Card key={d.id}>
            <CardHeader className="pb-2"><div className="flex items-start justify-between gap-2">
              <div><CardTitle className="text-base">{d.company_name} — {d.job_title}</CardTitle><CardDescription>₹{d.package_lpa} LPA • Drive {d.drive_date} • Apply by {d.application_deadline}{d.job_location ? ` • ${d.job_location}` : ''}</CardDescription></div>
              <Badge variant={open ? 'default' : 'secondary'}>{open ? 'Open' : 'Closed'}</Badge></div></CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="text-muted-foreground">Eligible: {d.eligible_departments?.length ? d.eligible_departments.join(', ') : 'all departments'} • Minimum CGPA {d.min_cgpa ?? '—'}</div>
              {app ? (
                <div className="flex items-center gap-2"><Badge variant="outline">Your application: {app.status}</Badge>
                  {app.status === 'Applied' && <Button size="sm" variant="outline" onClick={() => withdraw(app.id)}>Withdraw</Button>}</div>
              ) : (
                <Button size="sm" disabled={!open || busy === d.id} onClick={() => apply(d.id)}>{busy === d.id ? 'Applying…' : 'Apply'}</Button>
              )}
            </CardContent>
          </Card>);
      })}
    </div>
  );
}
