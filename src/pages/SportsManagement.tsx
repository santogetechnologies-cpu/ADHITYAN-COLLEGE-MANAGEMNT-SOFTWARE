import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Loader2, Pencil, Plus, Trash2, Trophy, Users, AlertTriangle } from 'lucide-react';
import { sportsService, type SportsEvent, type SportsTeam } from '@/services/sportsService';
import { exportToCSV } from '@/lib/exportUtils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { askConfirm, askText } from '@/lib/dialogs';

const STATUSES = ['Upcoming', 'Registrations Open', 'Ongoing', 'Completed'];
const nonNeg = (v: string) => v === '' ? 0 : Math.max(0, Math.floor(Number(v)));

export default function SportsManagement() {
  const { toast } = useToast();
  const { user } = useAuth();
  const canEdit = ['admin', 'principal', 'teacher'].includes(user?.role ?? '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<SportsEvent[]>([]);
  const [teams, setTeams] = useState<SportsTeam[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { const [e, t] = await Promise.all([sportsService.events(), sportsService.teams()]); setEvents(e); setTeams(t); setError(null); }
    catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useRealtimeSubscription({ table: 'sports_events', onChange: load, onReconnect: load });
  useRealtimeSubscription({ table: 'sports_teams', onChange: load, onReconnect: load });

  const run = async (fn: () => Promise<void>, ok: string, after?: () => void) => {
    setBusy(true);
    try { await fn(); toast({ title: ok }); after?.(); await load(); }
    catch (e: any) { toast({ title: 'Not saved', description: e.message, variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  const blankEv = { id: '', name: '', sport: '', date: '', status: 'Upcoming', participants: '', teams: '' };
  const [evOpen, setEvOpen] = useState(false); const [ev, setEv] = useState(blankEv);
  const saveEv = () => {
    if (!ev.name.trim() || !ev.sport.trim() || !ev.date) return toast({ title: 'Name, sport and date are required', variant: 'destructive' });
    void run(() => sportsService.saveEvent({ id: ev.id || undefined, name: ev.name.trim(), sport: ev.sport.trim(), date: ev.date, status: ev.status, participants: nonNeg(ev.participants), teams: nonNeg(ev.teams) } as any), ev.id ? 'Event updated' : 'Event added', () => setEvOpen(false));
  };

  const blankTm = { id: '', sport: '', category: '', captain: '', coach: '', members: '', achievements: '' };
  const [tmOpen, setTmOpen] = useState(false); const [tm, setTm] = useState(blankTm);
  const saveTm = () => {
    if (!tm.sport.trim() || !tm.category.trim() || !tm.captain.trim() || !tm.coach.trim()) return toast({ title: 'Sport, category, captain and coach are required', variant: 'destructive' });
    void run(() => sportsService.saveTeam({ id: tm.id || undefined, sport: tm.sport.trim(), category: tm.category.trim(), captain: tm.captain.trim(), coach: tm.coach.trim(), members_count: nonNeg(tm.members), achievements: tm.achievements.split(',').map((a) => a.trim()).filter(Boolean) } as any), tm.id ? 'Team updated' : 'Team created', () => setTmOpen(false));
  };

  const bySport = useMemo(() => {
    const m = new Map<string, { events: number; teams: number; members: number }>();
    events.forEach((e) => { const r = m.get(e.sport) ?? { events: 0, teams: 0, members: 0 }; r.events++; m.set(e.sport, r); });
    teams.forEach((t) => { const r = m.get(t.sport) ?? { events: 0, teams: 0, members: 0 }; r.teams++; r.members += t.members_count; m.set(t.sport, r); });
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [events, teams]);

  if (loading) return <div className="min-h-screen bg-background"><Navigation showBackButton backUrl="/dashboard" backLabel="Back to Dashboard" /><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></div>;

  return (
    <div className="min-h-screen bg-background">
      <Navigation showBackButton={true} backUrl="/dashboard" backLabel="Back to Dashboard" />
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div><h1 className="text-3xl font-bold">Sports &amp; activities</h1><p className="text-muted-foreground">Events, teams and participation.</p></div>
        {error && <p className="text-sm text-destructive flex items-center gap-1"><AlertTriangle className="h-4 w-4" />{error}</p>}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[['Events', events.length], ['Upcoming / open', events.filter((e) => ['Upcoming', 'Registrations Open', 'Ongoing'].includes(e.status)).length], ['Teams', teams.length], ['Team members', teams.reduce((s, t) => s + t.members_count, 0)]].map(([t, n]) => (
            <Card key={t as string}><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{t}</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{n}</div></CardContent></Card>))}
        </div>

        <Tabs defaultValue="events" className="space-y-4">
          <TabsList><TabsTrigger value="events">Events</TabsTrigger><TabsTrigger value="teams">Teams</TabsTrigger><TabsTrigger value="summary">By sport</TabsTrigger></TabsList>

          <TabsContent value="events"><Card><CardHeader><div className="flex items-start justify-between"><div><CardTitle>Events</CardTitle><CardDescription>Tournaments, meets and practice matches.</CardDescription></div>
            <div className="flex gap-2"><Button variant="outline" disabled={!events.length} onClick={() => exportToCSV('sports-events', ['Event', 'Sport', 'Date', 'Status', 'Participants', 'Teams'], events.map((e) => [e.name, e.sport, e.date, e.status, e.participants, e.teams]))}><Download className="w-4 h-4 mr-1" />Export</Button>
              {canEdit && <Button onClick={() => { setEv(blankEv); setEvOpen(true); }}><Plus className="w-4 h-4 mr-1" />Add event</Button>}</div></div></CardHeader>
            <CardContent><Table><TableHeader><TableRow><TableHead>Event</TableHead><TableHead>Sport</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Participants</TableHead><TableHead className="text-right">Teams</TableHead><TableHead /></TableRow></TableHeader><TableBody>
              {events.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-10 text-sm text-muted-foreground"><Trophy className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />No sports events yet.</TableCell></TableRow> : events.map((e) => (
                <TableRow key={e.id}><TableCell className="font-medium">{e.name}</TableCell><TableCell>{e.sport}</TableCell><TableCell>{e.date}</TableCell>
                  <TableCell>{canEdit ? <Select value={e.status} onValueChange={(v) => void run(() => sportsService.saveEvent({ ...e, status: v }), 'Status updated')}><SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select> : <Badge variant="secondary">{e.status}</Badge>}</TableCell>
                  <TableCell className="text-right">{e.participants}</TableCell><TableCell className="text-right">{e.teams}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{canEdit && <>
                    <Button variant="ghost" size="sm" title="Edit" onClick={() => { setEv({ id: e.id, name: e.name, sport: e.sport, date: e.date, status: e.status, participants: String(e.participants), teams: String(e.teams) }); setEvOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" title="Delete" onClick={async () => { if (await askConfirm(`Delete "${e.name}"?`, { title: 'Delete event', confirmLabel: 'Delete', destructive: true })) void run(() => sportsService.deleteEvent(e.id), 'Event deleted'); }}><Trash2 className="w-4 h-4" /></Button></>}</TableCell></TableRow>))}
            </TableBody></Table></CardContent></Card></TabsContent>

          <TabsContent value="teams"><Card><CardHeader><div className="flex items-start justify-between"><div><CardTitle>Teams</CardTitle><CardDescription>Squads, captains and coaches.</CardDescription></div>
            {canEdit && <Button onClick={() => { setTm(blankTm); setTmOpen(true); }}><Plus className="w-4 h-4 mr-1" />Add team</Button>}</div></CardHeader>
            <CardContent><Table><TableHeader><TableRow><TableHead>Sport</TableHead><TableHead>Category</TableHead><TableHead>Captain</TableHead><TableHead>Coach</TableHead><TableHead className="text-right">Members</TableHead><TableHead>Achievements</TableHead><TableHead /></TableRow></TableHeader><TableBody>
              {teams.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-10 text-sm text-muted-foreground"><Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />No teams yet.</TableCell></TableRow> : teams.map((t) => (
                <TableRow key={t.id}><TableCell className="font-medium">{t.sport}</TableCell><TableCell>{t.category}</TableCell><TableCell>{t.captain}</TableCell><TableCell>{t.coach}</TableCell><TableCell className="text-right">{t.members_count}</TableCell>
                  <TableCell>{t.achievements?.length ? t.achievements.join(', ') : '—'}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{canEdit && <>
                    <Button variant="ghost" size="sm" title="Edit" onClick={() => { setTm({ id: t.id, sport: t.sport, category: t.category, captain: t.captain, coach: t.coach, members: String(t.members_count), achievements: (t.achievements || []).join(', ') }); setTmOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" title="Delete" onClick={async () => { if (await askConfirm(`Delete the ${t.sport} ${t.category} team?`, { title: 'Delete team', confirmLabel: 'Delete', destructive: true })) void run(() => sportsService.deleteTeam(t.id), 'Team deleted'); }}><Trash2 className="w-4 h-4" /></Button></>}</TableCell></TableRow>))}
            </TableBody></Table></CardContent></Card></TabsContent>

          <TabsContent value="summary"><Card><CardHeader><CardTitle>Participation by sport</CardTitle></CardHeader><CardContent>
            <Table><TableHeader><TableRow><TableHead>Sport</TableHead><TableHead className="text-right">Events</TableHead><TableHead className="text-right">Teams</TableHead><TableHead className="text-right">Players</TableHead></TableRow></TableHeader><TableBody>
              {bySport.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-8 text-sm text-muted-foreground">Nothing recorded yet.</TableCell></TableRow> : bySport.map(([s, r]) => <TableRow key={s}><TableCell className="font-medium">{s}</TableCell><TableCell className="text-right">{r.events}</TableCell><TableCell className="text-right">{r.teams}</TableCell><TableCell className="text-right">{r.members}</TableCell></TableRow>)}
            </TableBody></Table></CardContent></Card></TabsContent>
        </Tabs>
      </main>

      <Dialog open={evOpen} onOpenChange={setEvOpen}><DialogContent><DialogHeader><DialogTitle>{ev.id ? 'Edit event' : 'Add event'}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1"><Label>Name</Label><Input value={ev.name} onChange={(e) => setEv({ ...ev, name: e.target.value })} /></div>
          <div className="space-y-1"><Label>Sport</Label><Input value={ev.sport} onChange={(e) => setEv({ ...ev, sport: e.target.value })} /></div>
          <div className="space-y-1"><Label>Date</Label><Input type="date" value={ev.date} onChange={(e) => setEv({ ...ev, date: e.target.value })} /></div>
          <div className="space-y-1"><Label>Status</Label><Select value={ev.status} onValueChange={(v) => setEv({ ...ev, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><Label>Participants</Label><Input type="number" min="0" value={ev.participants} onChange={(e) => setEv({ ...ev, participants: e.target.value })} /></div>
          <div className="space-y-1"><Label>Teams</Label><Input type="number" min="0" value={ev.teams} onChange={(e) => setEv({ ...ev, teams: e.target.value })} /></div>
        </div><DialogFooter><Button variant="outline" onClick={() => setEvOpen(false)}>Cancel</Button><Button onClick={saveEv} disabled={busy}>Save</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={tmOpen} onOpenChange={setTmOpen}><DialogContent><DialogHeader><DialogTitle>{tm.id ? 'Edit team' : 'Add team'}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Sport</Label><Input value={tm.sport} onChange={(e) => setTm({ ...tm, sport: e.target.value })} /></div>
          <div className="space-y-1"><Label>Category</Label><Input value={tm.category} onChange={(e) => setTm({ ...tm, category: e.target.value })} placeholder="Men / Women / Mixed" /></div>
          <div className="space-y-1"><Label>Captain</Label><Input value={tm.captain} onChange={(e) => setTm({ ...tm, captain: e.target.value })} /></div>
          <div className="space-y-1"><Label>Coach</Label><Input value={tm.coach} onChange={(e) => setTm({ ...tm, coach: e.target.value })} /></div>
          <div className="space-y-1"><Label>Members</Label><Input type="number" min="0" value={tm.members} onChange={(e) => setTm({ ...tm, members: e.target.value })} /></div>
          <div className="space-y-1"><Label>Achievements (comma separated)</Label><Input value={tm.achievements} onChange={(e) => setTm({ ...tm, achievements: e.target.value })} /></div>
        </div><DialogFooter><Button variant="outline" onClick={() => setTmOpen(false)}>Cancel</Button><Button onClick={saveTm} disabled={busy}>Save</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
