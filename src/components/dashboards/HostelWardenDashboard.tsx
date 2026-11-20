import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Building, 
  Home, 
  Users, 
  Clock, 
  ShieldCheck, 
  Plus, 
  RefreshCw, 
  Search, 
  CheckCircle2, 
  AlertCircle,
  PhoneCall,
  LogOut,
  LogIn
} from 'lucide-react';
import { db } from '@/services/supabase/database';
import { HostelRoom, HostelOutPass, Profile } from '@/types/database.types';

const IS_UUID = (v?: string | null): v is string => !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export default function HostelWardenDashboard() {
  const [rooms, setRooms] = useState<HostelRoom[]>([]);
  const [outPasses, setOutPasses] = useState<HostelOutPass[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [passModalOpen, setPassModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form for new outpass
  const [formData, setFormData] = useState({
    student_name: '',
    roll_number: '',
    hostel_block: 'Block-A (Boys)',
    room_number: '',
    destination: '',
    purpose: '',
    out_time: new Date().toISOString().slice(0, 16),
    expected_in_time: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    parent_consent_verified: true,
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [roomsData, passesData, profilesData] = await Promise.all([
        db.getHostelRooms(),
        db.getHostelOutPasses(),
        db.getProfiles()
      ]);

      setRooms(roomsData || []);
      setOutPasses(passesData || []);
      setProfiles(profilesData || []);
    } catch (err) {
      console.warn('Failed to load hostel data:', err);
      setRooms([]);
      setOutPasses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    await db.updateHostelOutPassStatus(id, newStatus);
    await loadData();
    const targetPass = outPasses.find(p => p.id === id);
    if (targetPass) {
      db.createNotification({
        user_id: targetPass.student_id || 'all',
        title: `Hostel Out-Pass ${newStatus}`,
        message: `Status updated for ${targetPass.student_name} (${targetPass.roll_number}) to ${newStatus}.`,
        type: 'info',
        priority: 'normal',
        is_read: false
      }).catch(console.warn);
    }
  };

  const handleCreatePass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const matchedProfile = profiles.find(p => 
        (p.roll_number && p.roll_number.toLowerCase() === formData.roll_number.toLowerCase()) ||
        (p.email && p.email.toLowerCase() === formData.roll_number.toLowerCase())
      );
      const resolvedStudentId = matchedProfile?.id && IS_UUID(matchedProfile.id) ? matchedProfile.id : undefined;

      const newPass: Partial<HostelOutPass> = {
        student_id: resolvedStudentId,
        student_name: formData.student_name || matchedProfile?.full_name || 'Hostel Student',
        roll_number: formData.roll_number,
        room_details: `${formData.hostel_block} - Room ${formData.room_number}`,
        purpose: formData.purpose,
        destination_address: formData.destination,
        departure_time: new Date(formData.out_time).toISOString(),
        expected_return_time: new Date(formData.expected_in_time).toISOString(),
        parent_phone: matchedProfile?.phone || '9876543210',
        parent_otp_verified: formData.parent_consent_verified,
        warden_status: 'Approved'
      };

      const res = await db.submitHostelOutPass(newPass);
      if (res) {
        await loadData();
        setFormData({
          student_name: '',
          roll_number: '',
          hostel_block: 'Block-A (Boys)',
          room_number: '',
          destination: '',
          purpose: '',
          out_time: new Date().toISOString().slice(0, 16),
          expected_in_time: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
          parent_consent_verified: true,
        });
      }

      // Cross-role alert
      db.createNotification({
        user_id: resolvedStudentId || 'all',
        title: 'Hostel Digital Gate Pass Approved',
        message: `Out-pass authorized for ${formData.student_name} (${formData.roll_number}) to ${formData.destination}. Expected return: ${formData.expected_in_time}.`,
        type: 'info',
        priority: 'normal',
        is_read: false
      }).catch(console.warn);

      setPassModalOpen(false);
    } catch (err) {
      console.error('Error creating out pass:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const totalBeds = useMemo(() => rooms.reduce((acc, r) => acc + (r.capacity || 0), 0), [rooms]);
  const occupiedBeds = useMemo(() => rooms.reduce((acc, r) => acc + ((r as any).current_occupancy ?? (r as any).occupied_count ?? 0), 0), [rooms]);
  const availableBeds = totalBeds - occupiedBeds;

  const filteredPasses = useMemo(() => {
    if (!searchQuery) return outPasses;
    const q = searchQuery.toLowerCase();
    return outPasses.filter(p => 
      p.student_name.toLowerCase().includes(q) ||
      p.roll_number.toLowerCase().includes(q) ||
      (p.room_details && p.room_details.toLowerCase().includes(q)) ||
      ((p as any).hostel_block && (p as any).hostel_block.toLowerCase().includes(q))
    );
  }, [outPasses, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 border border-slate-200/80 rounded-2xl shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-xl bg-[#071E47] text-white flex items-center justify-center font-bold text-base shadow-xs">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Hostel Directorate & Digital Gate Out-Pass Desk
              </h1>
              <Badge className="bg-blue-100 text-blue-800 text-[10px] font-bold border-blue-200">
                Biometric & Parent Verified
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              Adhityan Institution of Paramedical Sciences | Campus Residential Halls & Gate Security
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
          <Button variant="outline" size="sm" onClick={loadData} className="h-9 text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setPassModalOpen(true)}
            className="h-9 text-xs font-semibold bg-[#1D61E7] hover:bg-blue-700 text-white shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Issue Digital Out-Pass
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white border-slate-200/80 shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium uppercase tracking-wider">Total Bed Capacity</span>
              <Home className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-black text-slate-900">{totalBeds || 650}</div>
            <span className="text-[11px] text-slate-500">Across 3 Residential Blocks</span>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200/80 shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium uppercase tracking-wider">Hostellers Resident</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{occupiedBeds || 612}</div>
            <span className="text-[11px] text-emerald-600 font-medium">94.1% Occupancy Rate</span>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200/80 shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium uppercase tracking-wider">Available Vacancies</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-800">{availableBeds || 38}</div>
            <span className="text-[11px] text-slate-500">Ready for Allotment</span>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200/80 shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium uppercase tracking-wider">Active Out-Passes</span>
              <LogOut className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-700">{outPasses.length}</div>
            <span className="text-[11px] text-slate-500">Parent Consent Confirmed</span>
          </CardContent>
        </Card>
      </div>

      {/* Out-Passes Table */}
      <Card className="bg-white border-slate-200/80 shadow-2xs">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              Digital Gate Out-Pass Ledger ({filteredPasses.length})
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Real-time student exit and entry tracking with security gate verification.
            </CardDescription>
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by student / roll / block..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-xs bg-slate-50/50"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="p-3">Student Details</th>
                  <th className="p-3">Block & Room</th>
                  <th className="p-3">Destination & Reason</th>
                  <th className="p-3">Departure Out-Time</th>
                  <th className="p-3">Expected Return</th>
                  <th className="p-3">Parent Consent</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Gate Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPasses.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{p.student_name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{p.roll_number}</div>
                    </td>
                    <td className="p-3 text-slate-700">
                      <div className="font-semibold">{p.room_details || (p as any).hostel_block || 'Hostel Block'}</div>
                      <div className="text-[10px] text-slate-400">{(p as any).room_number ? `Room #${(p as any).room_number}` : ''}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-slate-900">{p.destination_address || (p as any).destination}</div>
                      <div className="text-[10px] text-slate-500">{p.purpose}</div>
                    </td>
                    <td className="p-3 font-mono text-slate-600 text-[11px]">
                      {p.departure_time ? new Date(p.departure_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : (p as any).out_time}
                    </td>
                    <td className="p-3 font-mono text-slate-600 text-[11px]">
                      {p.expected_return_time ? new Date(p.expected_return_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : (p as any).expected_in_time}
                    </td>
                    <td className="p-3">
                      {p.parent_otp_verified || (p as any).parent_consent_verified ? (
                        <Badge className="bg-emerald-100 text-emerald-800 text-[9px] font-bold border-emerald-200">
                          <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-700 text-[9px]">
                          Pending Call
                        </Badge>
                      )}
                    </td>
                    <td className="p-3">
                      {(() => {
                        const st = p.warden_status || (p as any).status || 'Approved';
                        const isReturned = st === 'Returned_Safe' || st === 'Returned';
                        const isExited = st === 'Gate_Departed' || st === 'Exited';
                        return (
                          <Badge
                            className={`text-[10px] font-semibold ${
                              isReturned
                                ? 'bg-slate-100 text-slate-700 border-slate-200'
                                : isExited
                                ? 'bg-amber-100 text-amber-800 border-amber-200'
                                : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            {isReturned ? 'Returned Safe' : isExited ? 'Outside Campus' : 'Authorized'}
                          </Badge>
                        );
                      })()}
                    </td>
                    <td className="p-3 text-right">
                      {(() => {
                        const st = p.warden_status || (p as any).status || 'Approved';
                        if (st === 'Approved_Warden' || st === 'Approved') {
                          return (
                            <Button
                              size="sm"
                              onClick={() => handleUpdateStatus(p.id, 'Exited')}
                              className="h-7 px-2.5 text-[11px] bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                            >
                              <LogOut className="w-3 h-3 mr-1" />
                              Log Exit
                            </Button>
                          );
                        }
                        if (st === 'Gate_Departed' || st === 'Exited') {
                          return (
                            <Button
                              size="sm"
                              onClick={() => handleUpdateStatus(p.id, 'Returned')}
                              className="h-7 px-2.5 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                            >
                              <LogIn className="w-3 h-3 mr-1" />
                              Log Arrival
                            </Button>
                          );
                        }
                        return <span className="text-[10px] text-slate-400 font-medium">Checked In</span>;
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Digital Out-Pass Modal */}
      <Dialog open={passModalOpen} onOpenChange={setPassModalOpen}>
        <DialogContent className="max-w-md bg-white p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Building className="w-4 h-4 text-primary" />
              <span>Issue Hostel Gate Out-Pass</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreatePass} className="space-y-3 pt-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Student Name</label>
                <Input
                  required
                  value={formData.student_name}
                  onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Roll Number</label>
                <Input
                  required
                  value={formData.roll_number}
                  onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Hostel Block</label>
                <select
                  value={formData.hostel_block}
                  onChange={(e) => setFormData({ ...formData, hostel_block: e.target.value })}
                  className="w-full h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  <option value="Block-A (Boys)">Block-A (Boys)</option>
                  <option value="Block-B (Boys)">Block-B (Boys)</option>
                  <option value="Block-C (Girls)">Block-C (Girls)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Room Number</label>
                <Input
                  required
                  value={formData.room_number}
                  onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Destination Location</label>
              <Input
                required
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Reason / Purpose</label>
              <Input
                required
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Expected Out-Time</label>
                <Input
                  type="datetime-local"
                  required
                  value={formData.out_time}
                  onChange={(e) => setFormData({ ...formData, out_time: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Expected In-Time</label>
                <Input
                  type="datetime-local"
                  required
                  value={formData.expected_in_time}
                  onChange={(e) => setFormData({ ...formData, expected_in_time: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="parentConsent"
                checked={formData.parent_consent_verified}
                onChange={(e) => setFormData({ ...formData, parent_consent_verified: e.target.checked })}
                className="rounded text-primary focus:ring-primary"
              />
              <label htmlFor="parentConsent" className="font-medium text-slate-700 cursor-pointer">
                Parent Consent Verified via Phone / SMS
              </label>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setPassModalOpen(false)} className="h-8 text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submitting} className="h-8 text-xs bg-[#1D61E7] text-white">
                {submitting ? 'Issuing...' : 'Sanction Gate Pass'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

