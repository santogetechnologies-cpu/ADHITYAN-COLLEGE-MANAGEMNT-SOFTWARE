import { useCallback, useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { StudentSearchSelect } from '@/components/shared/StudentSearchSelect';
import { useToast } from '@/hooks/use-toast';
import { Bus, Plus, Pencil, UserPlus, UserMinus, MapPin, Trash2, Loader2 } from 'lucide-react';
import { campusOpsService, TransportVehicleView } from '@/services/campusOpsService';
import TransportDriverDashboard from '@/components/dashboards/TransportDriverDashboard';

const blankVehicle = { id: null as string | null, vehicle_number: '', route_name: '', driver_name: '', driver_phone: '', capacity: 40, status: 'active' };

export default function TransportAdminDesk() {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<TransportVehicleView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vForm, setVForm] = useState<typeof blankVehicle | null>(null);
  const [stopFor, setStopFor] = useState<{ vehicle: TransportVehicleView; id: string | null; name: string; time: string; order: number } | null>(null);
  const [riderFor, setRiderFor] = useState<TransportVehicleView | null>(null);
  const [student, setStudent] = useState('');
  const [stop, setStop] = useState('');
  const [removing, setRemoving] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setVehicles(await campusOpsService.transportOverview()); } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (fn: () => Promise<any>, done: string, close: () => void) => {
    setBusy(true);
    try { await fn(); toast({ title: done }); close(); await load(); }
    catch (e: any) { toast({ title: 'Could not complete that', description: e.message, variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  return (
    <Tabs defaultValue="fleet" className="space-y-4">
      <TabsList>
        <TabsTrigger value="fleet">Fleet & riders</TabsTrigger>
        <TabsTrigger value="driver">Driver desk</TabsTrigger>
      </TabsList>
      <TabsContent value="fleet" className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div><h2 className="text-lg font-bold flex items-center gap-2"><Bus className="w-5 h-5" /> Buses, stops and riders</h2>
            <p className="text-sm text-slate-500">Set up routes once; allotted riders appear on the driver's list each morning.</p></div>
          <Button onClick={() => setVForm({ ...blankVehicle })}><Plus className="w-4 h-4 mr-1.5" /> Add vehicle</Button>
        </div>
        {loading ? <div className="py-10 flex justify-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /></div>
          : error ? <div className="text-sm text-red-600 text-center py-6">{error} <Button variant="link" onClick={load}>Retry</Button></div>
          : vehicles.length === 0 ? <EmptyState title="No vehicles yet" description="Add a bus, then its stops, then allot riders." action={{ label: 'Add the first vehicle', onClick: () => setVForm({ ...blankVehicle }) }} />
          : <div className="grid gap-4 lg:grid-cols-2">{vehicles.map(v => (
            <Card key={v.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div><CardTitle className="text-base">{v.vehicle_number} · {v.route_name}</CardTitle>
                    <CardDescription>{v.driver_name}{v.driver_phone ? ` · ${v.driver_phone}` : ''}</CardDescription></div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className={v.riders >= v.capacity ? 'text-rose-700 border-rose-300' : ''}>{v.riders}/{v.capacity} seats</Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Edit ${v.vehicle_number}`} onClick={() => setVForm({ id: v.id, vehicle_number: v.vehicle_number, route_name: v.route_name, driver_name: v.driver_name, driver_phone: v.driver_phone ?? '', capacity: v.capacity, status: v.status })}><Pencil className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1"><span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Stops</span>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setStopFor({ vehicle: v, id: null, name: '', time: '', order: v.stops.length + 1 })}><Plus className="w-3 h-3 mr-1" /> Add stop</Button></div>
                  {v.stops.length === 0 ? <div className="text-xs text-slate-400">No stops yet.</div> : <ul className="space-y-1">{v.stops.map(s => (
                    <li key={s.id} className="flex items-center justify-between text-xs"><span>{s.order}. {s.name} <span className="text-slate-400">· {s.time} · {s.riders} rider(s)</span></span>
                      <span className="flex"><Button variant="ghost" size="icon" className="h-6 w-6" aria-label={`Edit stop ${s.name}`} onClick={() => setStopFor({ vehicle: v, id: s.id, name: s.name, time: s.time, order: s.order })}><Pencil className="w-3 h-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-rose-600" aria-label={`Delete stop ${s.name}`} onClick={() => act(() => campusOpsService.transportDeleteStop(s.id), 'Stop removed', () => {})}><Trash2 className="w-3 h-3" /></Button></span></li>))}</ul>}
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1"><span>Riders</span>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" disabled={v.status === 'maintenance'} onClick={() => { setRiderFor(v); setStudent(''); setStop(v.stops[0]?.name ?? ''); }}><UserPlus className="w-3 h-3 mr-1" /> Allot rider</Button></div>
                  {v.roster.length === 0 ? <div className="text-xs text-slate-400">Nobody allotted.</div> : <ul className="space-y-1 max-h-40 overflow-y-auto">{v.roster.map(r => (
                    <li key={r.student_id} className="flex items-center justify-between text-xs"><span>{r.name}{r.class_name ? <span className="text-slate-400"> · {r.class_name}</span> : null} <span className="text-slate-400">· {r.stop}</span></span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-rose-600" aria-label={`Remove ${r.name}`} onClick={() => setRemoving({ id: r.student_id, name: r.name })}><UserMinus className="w-3 h-3" /></Button></li>))}</ul>}
                </div>
              </CardContent>
            </Card>))}</div>}
      </TabsContent>
      <TabsContent value="driver"><TransportDriverDashboard /></TabsContent>

      <Dialog open={!!vForm} onOpenChange={o => !o && setVForm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{vForm?.id ? 'Edit vehicle' : 'Add a vehicle'}</DialogTitle><DialogDescription>The driver's login is linked to the bus from User Accounts.</DialogDescription></DialogHeader>
          {vForm && <div className="grid grid-cols-2 gap-3">
            <div><Label>Vehicle number</Label><Input value={vForm.vehicle_number} onChange={e => setVForm({ ...vForm, vehicle_number: e.target.value })} /></div>
            <div><Label>Route name</Label><Input value={vForm.route_name} onChange={e => setVForm({ ...vForm, route_name: e.target.value })} /></div>
            <div><Label>Driver name</Label><Input value={vForm.driver_name} onChange={e => setVForm({ ...vForm, driver_name: e.target.value })} /></div>
            <div><Label>Driver phone</Label><Input value={vForm.driver_phone} onChange={e => setVForm({ ...vForm, driver_phone: e.target.value })} /></div>
            <div><Label>Seats</Label><Input type="number" min={1} value={vForm.capacity} onChange={e => setVForm({ ...vForm, capacity: Number(e.target.value) })} /></div>
            <div><Label>Status</Label><select className="w-full border rounded-md h-10 px-3 text-sm bg-white" value={vForm.status} onChange={e => setVForm({ ...vForm, status: e.target.value })}>
              <option value="active">Active</option><option value="idle">Idle</option><option value="delayed">Delayed</option><option value="maintenance">Maintenance</option></select></div>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setVForm(null)}>Cancel</Button>
            <Button disabled={busy} onClick={() => vForm && act(() => campusOpsService.transportSaveVehicle(vForm), 'Vehicle saved', () => setVForm(null))}>{busy ? 'Saving…' : 'Save'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!stopFor} onOpenChange={o => !o && setStopFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{stopFor?.id ? 'Edit stop' : 'Add a stop'} · {stopFor?.vehicle.vehicle_number}</DialogTitle></DialogHeader>
          {stopFor && <div className="grid grid-cols-3 gap-3">
            <div className="col-span-3"><Label>Stop name</Label><Input value={stopFor.name} onChange={e => setStopFor({ ...stopFor, name: e.target.value })} /></div>
            <div className="col-span-2"><Label>Pick-up time</Label><Input value={stopFor.time} onChange={e => setStopFor({ ...stopFor, time: e.target.value })} placeholder="e.g. 07:45 AM" /></div>
            <div><Label>Order</Label><Input type="number" min={1} value={stopFor.order} onChange={e => setStopFor({ ...stopFor, order: Number(e.target.value) })} /></div>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setStopFor(null)}>Cancel</Button>
            <Button disabled={busy} onClick={() => stopFor && act(() => campusOpsService.transportSaveStop({ id: stopFor.id, vehicle_id: stopFor.vehicle.id, stop_name: stopFor.name, scheduled_time: stopFor.time, stop_order: stopFor.order }), 'Stop saved', () => setStopFor(null))}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!riderFor} onOpenChange={o => !o && setRiderFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Allot a rider to {riderFor?.vehicle_number}</DialogTitle><DialogDescription>A student rides one bus at a time; allotting here moves them from any other.</DialogDescription></DialogHeader>
          <StudentSearchSelect label="Student" onSelect={s => setStudent(s?.id ?? '')} />
          <div><Label>Pick-up stop</Label>
            {riderFor && riderFor.stops.length > 0
              ? <select className="w-full border rounded-md h-10 px-3 text-sm bg-white" value={stop} onChange={e => setStop(e.target.value)}>{riderFor.stops.map(s => <option key={s.id} value={s.name}>{s.name} · {s.time}</option>)}</select>
              : <Input value={stop} onChange={e => setStop(e.target.value)} placeholder="Stop name (add stops to pick from a list)" />}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setRiderFor(null)}>Cancel</Button>
            <Button disabled={busy || !student || !stop.trim()} onClick={() => riderFor && act(() => campusOpsService.transportAssign(student, riderFor.id, stop), 'Rider allotted', () => setRiderFor(null))}>{busy ? 'Allotting…' : 'Allot'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removing} onOpenChange={o => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remove {removing?.name} from the bus?</AlertDialogTitle><AlertDialogDescription>They will no longer appear on the driver's daily list. Past trip records are kept.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={() => removing && act(() => campusOpsService.transportUnassign(removing.id), 'Rider removed', () => setRemoving(null))}>Remove</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Tabs>
  );
}
