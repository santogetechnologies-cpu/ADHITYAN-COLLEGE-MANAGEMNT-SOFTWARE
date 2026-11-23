import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { StudentSearchSelect } from '@/components/shared/StudentSearchSelect';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/hooks/use-toast';
import { Bed, Plus, Pencil, UserPlus, ArrowRightLeft, LogOut, Loader2 } from 'lucide-react';
import { campusOpsService, HostelRoomView } from '@/services/campusOpsService';

interface Props { canManage: boolean; onChanged?: () => void }

const blank = { id: null as string | null, block: '', floor: 1, room: '', capacity: 3, type: 'Non-AC', fee: 0, status: 'Available' };

export function HostelRoomsPanel({ canManage, onChanged }: Props) {
  const { toast } = useToast();
  const [rooms, setRooms] = useState<HostelRoomView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [roomForm, setRoomForm] = useState<typeof blank | null>(null);
  const [allotRoom, setAllotRoom] = useState<HostelRoomView | null>(null);
  const [student, setStudent] = useState<string>('');
  const [transferFor, setTransferFor] = useState<{ student_id: string; name: string } | null>(null);
  const [targetRoom, setTargetRoom] = useState('');
  const [vacating, setVacating] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setRooms(await campusOpsService.hostelOccupancy()); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter(r => `${r.block} ${r.room} ${r.occupants.map(o => `${o.name} ${o.roll ?? ''}`).join(' ')}`.toLowerCase().includes(q));
  }, [rooms, filter]);

  const act = async (fn: () => Promise<any>, done: string, close: () => void) => {
    setBusy(true);
    try { await fn(); toast({ title: done }); close(); await load(); onChanged?.(); }
    catch (e: any) { toast({ title: 'Could not complete that', description: e.message, variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  const openRooms = rooms.filter(r => r.status !== 'Maintenance' && r.occupancy < r.capacity);

  return (
    <Card className="bg-white border-slate-200/80 shadow-2xs">
      <CardHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2"><Bed className="w-4 h-4" /> Rooms & Allotment</CardTitle>
          <CardDescription>Who sleeps where. Allotting, vacating and transferring keep every room's headcount exact.</CardDescription>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search block, room or student" className="h-9 text-xs sm:w-60" aria-label="Search rooms" />
          {canManage && <Button size="sm" className="h-9 text-xs" onClick={() => setRoomForm({ ...blank })}><Plus className="w-3.5 h-3.5 mr-1.5" /> Add room</Button>}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {loading ? <div className="py-10 flex justify-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /></div>
          : error ? <div className="text-sm text-red-600 py-6 text-center">Could not load rooms: {error} <Button variant="link" onClick={load}>Retry</Button></div>
          : visible.length === 0 ? <EmptyState title={rooms.length ? 'No room matches your search' : 'No rooms set up yet'} description={rooms.length ? 'Try a different block, room number or student name.' : 'Add the hostel blocks and rooms to start allotting beds.'} action={canManage && !rooms.length ? { label: 'Add the first room', onClick: () => setRoomForm({ ...blank }) } : undefined} size="sm" />
          : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map(r => (
              <div key={r.id} className="border border-slate-200 rounded-xl p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-sm text-slate-900">{r.block} · Room {r.room}</div>
                    <div className="text-[11px] text-slate-500">Floor {r.floor} · {r.type} · ₹{Number(r.annual_fee).toLocaleString('en-IN')}/yr</div>
                  </div>
                  <Badge variant="outline" className={r.status === 'Maintenance' ? 'text-amber-700 border-amber-300' : r.occupancy >= r.capacity ? 'text-rose-700 border-rose-300' : 'text-emerald-700 border-emerald-300'}>
                    {r.status === 'Maintenance' ? 'Maintenance' : `${r.occupancy}/${r.capacity}`}
                  </Badge>
                </div>
                {r.occupants.length === 0 ? <div className="text-xs text-slate-400">Empty</div> : (
                  <ul className="space-y-1">
                    {r.occupants.map(o => (
                      <li key={o.allotment_id} className="flex items-center justify-between text-xs">
                        <span className="truncate">{o.name}{o.roll ? <span className="text-slate-400"> · {o.roll}</span> : null}</span>
                        {canManage && <span className="flex shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Transfer to another room" aria-label={`Transfer ${o.name}`} onClick={() => { setTransferFor({ student_id: o.student_id, name: o.name }); setTargetRoom(''); }}><ArrowRightLeft className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-600" title="Vacate" aria-label={`Vacate ${o.name}`} onClick={() => setVacating({ id: o.allotment_id, name: o.name })}><LogOut className="w-3.5 h-3.5" /></Button>
                        </span>}
                      </li>
                    ))}
                  </ul>
                )}
                {canManage && <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" className="h-8 text-xs flex-1" disabled={r.status === 'Maintenance' || r.occupancy >= r.capacity} onClick={() => { setAllotRoom(r); setStudent(''); }}><UserPlus className="w-3.5 h-3.5 mr-1" /> Allot a bed</Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Edit room" aria-label={`Edit room ${r.room}`} onClick={() => setRoomForm({ id: r.id, block: r.block, floor: r.floor, room: r.room, capacity: r.capacity, type: r.type, fee: Number(r.annual_fee), status: r.status === 'Maintenance' ? 'Maintenance' : 'Available' })}><Pencil className="w-3.5 h-3.5" /></Button>
                </div>}
              </div>
            ))}
          </div>}
      </CardContent>

      <Dialog open={!!roomForm} onOpenChange={o => !o && setRoomForm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{roomForm?.id ? 'Edit room' : 'Add a room'}</DialogTitle><DialogDescription>Capacity is the number of beds. It cannot go below the students already in the room.</DialogDescription></DialogHeader>
          {roomForm && <div className="grid grid-cols-2 gap-3">
            <div><Label>Block</Label><Input value={roomForm.block} onChange={e => setRoomForm({ ...roomForm, block: e.target.value })} placeholder="e.g. Block A (Girls)" /></div>
            <div><Label>Room number</Label><Input value={roomForm.room} onChange={e => setRoomForm({ ...roomForm, room: e.target.value })} /></div>
            <div><Label>Floor</Label><Input type="number" min={0} value={roomForm.floor} onChange={e => setRoomForm({ ...roomForm, floor: Number(e.target.value) })} /></div>
            <div><Label>Beds</Label><Input type="number" min={1} value={roomForm.capacity} onChange={e => setRoomForm({ ...roomForm, capacity: Number(e.target.value) })} /></div>
            <div><Label>Type</Label><Input value={roomForm.type} onChange={e => setRoomForm({ ...roomForm, type: e.target.value })} placeholder="AC / Non-AC" /></div>
            <div><Label>Annual fee (₹)</Label><Input type="number" min={0} value={roomForm.fee} onChange={e => setRoomForm({ ...roomForm, fee: Number(e.target.value) })} /></div>
            <label className="col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={roomForm.status === 'Maintenance'} onChange={e => setRoomForm({ ...roomForm, status: e.target.checked ? 'Maintenance' : 'Available' })} /> Under maintenance (no new allotments)</label>
          </div>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoomForm(null)}>Cancel</Button>
            <Button disabled={busy} onClick={() => roomForm && act(() => campusOpsService.hostelSaveRoom(roomForm), 'Room saved', () => setRoomForm(null))}>{busy ? 'Saving…' : 'Save room'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!allotRoom} onOpenChange={o => !o && setAllotRoom(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Allot a bed in {allotRoom?.block} · {allotRoom?.room}</DialogTitle><DialogDescription>A student can hold one room at a time.</DialogDescription></DialogHeader>
          <StudentSearchSelect label="Student" onSelect={s => setStudent(s?.id ?? '')} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAllotRoom(null)}>Cancel</Button>
            <Button disabled={busy || !student} onClick={() => allotRoom && act(() => campusOpsService.hostelAllot(student, allotRoom.id), 'Bed allotted', () => setAllotRoom(null))}>{busy ? 'Allotting…' : 'Allot'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!transferFor} onOpenChange={o => !o && setTransferFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Transfer {transferFor?.name}</DialogTitle><DialogDescription>Pick a room with a free bed.</DialogDescription></DialogHeader>
          <select className="w-full border rounded-md h-10 px-3 text-sm bg-white" value={targetRoom} onChange={e => setTargetRoom(e.target.value)} aria-label="New room">
            <option value="">Choose a room…</option>
            {openRooms.map(r => <option key={r.id} value={r.id}>{r.block} · {r.room} ({r.capacity - r.occupancy} free)</option>)}
          </select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferFor(null)}>Cancel</Button>
            <Button disabled={busy || !targetRoom} onClick={() => transferFor && act(() => campusOpsService.hostelTransfer(transferFor.student_id, targetRoom), 'Student transferred', () => setTransferFor(null))}>{busy ? 'Moving…' : 'Transfer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!vacating} onOpenChange={o => !o && setVacating(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Vacate {vacating?.name}'s bed?</AlertDialogTitle><AlertDialogDescription>The bed becomes free for the next student. The allotment stays in the history.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={() => vacating && act(() => campusOpsService.hostelVacate(vacating.id), 'Bed vacated', () => setVacating(null))}>Vacate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
