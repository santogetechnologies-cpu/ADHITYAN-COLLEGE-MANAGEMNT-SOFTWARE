import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Briefcase, 
  Award, 
  Building, 
  Calendar, 
  CheckCircle2, 
  Users, 
  Plus, 
  RefreshCw, 
  Search, 
  TrendingUp, 
  DollarSign,
  GraduationCap
} from 'lucide-react';
import { db } from '@/services/supabase/database';
import { PlacementDrive, PlacementApplication } from '@/types/database.types';

export default function PlacementOfficerDashboard() {
  const [drives, setDrives] = useState<PlacementDrive[]>([]);
  const [applications, setApplications] = useState<PlacementApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [driveModalOpen, setDriveModalOpen] = useState(false);
  const [creatingDrive, setCreatingDrive] = useState(false);

  // New drive form
  const [formData, setFormData] = useState({
    company_name: '',
    job_role: '',
    salary_package_lpa: '',
    eligible_departments: 'Dialysis Technology, Medical Lab Technology',
    min_cgpa: '',
    max_history_arrears: '0',
    drive_date: new Date().toISOString().split('T')[0],
    venue: '',
    rounds_description: '',
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [drivesData, appsData] = await Promise.all([
        db.getPlacementDrives(),
        db.getPlacementApplications()
      ]);

      setDrives(drivesData || []);
      setApplications(appsData || []);
    } catch (err) {
      console.warn('Failed to load placement data:', err);
      setDrives([]);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateDrive = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreatingDrive(true);
      const rounds = formData.rounds_description.split(',').map(s => s.trim()).filter(Boolean);
      const newDrive: Partial<PlacementDrive> = {
        company_name: formData.company_name,
        job_title: formData.job_role,
        package_lpa: Number(formData.salary_package_lpa) || 4.5,
        eligible_departments: formData.eligible_departments.split(',').map(s => s.trim()),
        min_cgpa: Number(formData.min_cgpa) || 6.0,
        max_backlogs: Number(formData.max_history_arrears) || 0,
        drive_date: formData.drive_date,
        application_deadline: formData.drive_date,
        job_location: formData.venue || 'Campus Placement Cell',
        selection_rounds: rounds.length > 0 ? rounds : ['Written Assessment', 'HR Interview'],
        status: 'Open'
      };

      const res = await db.createPlacementDrive(newDrive);
      if (res) {
        await loadData();
        setFormData({
          company_name: '',
          job_role: '',
          salary_package_lpa: '',
          eligible_departments: 'Dialysis Technology, Medical Lab Technology',
          min_cgpa: '',
          max_history_arrears: '0',
          drive_date: new Date().toISOString().split('T')[0],
          venue: '',
          rounds_description: '',
        });
      }
      setDriveModalOpen(false);
    } catch (err) {
      console.error('Error creating drive:', err);
    } finally {
      setCreatingDrive(false);
    }
  };

  const filteredDrives = useMemo(() => {
    if (!searchQuery) return drives;
    const q = searchQuery.toLowerCase();
    return drives.filter(d => 
      d.company_name.toLowerCase().includes(q) ||
      (d.job_title && d.job_title.toLowerCase().includes(q)) ||
      ((d as any).job_role && (d as any).job_role.toLowerCase().includes(q))
    );
  }, [drives, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 border border-slate-200/80 rounded-2xl shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-xl bg-[#071E47] text-white flex items-center justify-center font-bold text-base shadow-xs">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Hospital Rotations & Clinical Career Placement Desk
              </h1>
              <Badge className="bg-blue-100 text-blue-800 text-[10px] font-bold border-blue-200">
                100% Hospital Placements
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              Adhityan Institution of Paramedical Sciences | Multi-Speciality Hospital Clinical Rotations & Placements
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
          <Button variant="outline" size="sm" onClick={loadData} className="h-9 text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setDriveModalOpen(true)}
            className="h-9 text-xs font-semibold bg-[#1D61E7] hover:bg-blue-700 text-white shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Schedule Hospital Drive
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white border-slate-200/80 shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium uppercase tracking-wider">Highest CTC Package</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-800">₹ 7.8 LPA</div>
            <span className="text-[11px] text-slate-500">Apollo Multi-Speciality</span>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200/80 shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium uppercase tracking-wider">Average Package (CTC)</span>
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">₹ 4.8 LPA</div>
            <span className="text-[11px] text-emerald-600 font-medium">+18% over previous batch</span>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200/80 shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium uppercase tracking-wider">Total Offers Received</span>
              <Award className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-black text-slate-900">185</div>
            <span className="text-[11px] text-slate-500">94% Clinical Batch Placed</span>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200/80 shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium uppercase tracking-wider">Partner Recruiters</span>
              <Building className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">84</div>
            <span className="text-[11px] text-slate-500">Tier-1 IT & Core Giants</span>
          </CardContent>
        </Card>
      </div>

      {/* Recruiter Drives Table */}
      <Card className="bg-white border-slate-200/80 shadow-2xs">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              Upcoming & Active Recruitment Drives ({filteredDrives.length})
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Schedule corporate recruitment sessions, set eligibility gates, and track selection rounds.
            </CardDescription>
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search recruiter / job role..."
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
                  <th className="p-3">Recruiter Company</th>
                  <th className="p-3">Job Profile</th>
                  <th className="p-3 text-right">Package CTC</th>
                  <th className="p-3">Eligible Branches</th>
                  <th className="p-3">Min CGPA</th>
                  <th className="p-3">Drive Date & Venue</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDrives.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3 font-bold text-slate-900">
                      {d.company_name}
                    </td>
                    <td className="p-3 text-slate-700 font-medium">
                      {d.job_title || (d as any).job_role}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-800 text-sm">
                      ₹ {d.package_lpa ?? (d as any).salary_package_lpa} LPA
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {(Array.isArray(d.eligible_departments) ? d.eligible_departments : [d.eligible_departments]).map((dept, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] bg-slate-50">
                            {dept}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 font-semibold text-slate-800">
                      {d.min_cgpa} CGPA ({d.max_backlogs ?? (d as any).max_history_arrears ?? 0} arrears)
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-900 font-mono text-[11px]">{d.drive_date}</div>
                      <div className="text-[10px] text-slate-500">{d.job_location || (d as any).venue}</div>
                    </td>
                    <td className="p-3">
                      <Badge className="bg-blue-100 text-blue-800 text-[10px] font-semibold border-blue-200">
                        {d.status || 'Scheduled'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Recruitment Drive Modal */}
      <Dialog open={driveModalOpen} onOpenChange={setDriveModalOpen}>
        <DialogContent className="max-w-md bg-white p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Briefcase className="w-4 h-4 text-primary" />
              <span>Schedule Corporate Recruitment Drive</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateDrive} className="space-y-3 pt-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Company Name</label>
              <Input
                required
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Job Role</label>
                <Input
                  required
                  value={formData.job_role}
                  onChange={(e) => setFormData({ ...formData, job_role: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">CTC Package (LPA)</label>
                <Input
                  type="number"
                  step="0.1"
                  required
                  value={formData.salary_package_lpa}
                  onChange={(e) => setFormData({ ...formData, salary_package_lpa: Number(e.target.value) })}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Min CGPA Gate</label>
                <Input
                  type="number"
                  step="0.1"
                  required
                  value={formData.min_cgpa}
                  onChange={(e) => setFormData({ ...formData, min_cgpa: Number(e.target.value) })}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Max Backlogs Permitted</label>
                <Input
                  type="number"
                  required
                  value={formData.max_history_arrears}
                  onChange={(e) => setFormData({ ...formData, max_history_arrears: Number(e.target.value) })}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Eligible Disciplines</label>
              <Input
                required
                placeholder="e.g. CSE, IT, ECE"
                value={formData.eligible_departments}
                onChange={(e) => setFormData({ ...formData, eligible_departments: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Drive Date</label>
                <Input
                  type="date"
                  required
                  value={formData.drive_date}
                  onChange={(e) => setFormData({ ...formData, drive_date: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Venue / Location</label>
                <Input
                  required
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDriveModalOpen(false)} className="h-8 text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={creatingDrive} className="h-8 text-xs bg-[#1D61E7] text-white">
                {creatingDrive ? 'Scheduling...' : 'Confirm Recruitment Drive'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

