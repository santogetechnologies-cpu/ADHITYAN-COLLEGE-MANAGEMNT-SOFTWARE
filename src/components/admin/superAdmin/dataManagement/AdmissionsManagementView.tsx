import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useCollege } from '@/context/CollegeContext';
import { useCollegeCourses } from '@/hooks/useCollegeCourses';
import { collegeDataService } from '@/services/collegeDataService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FileCheck2,
  Award,
  Search,
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCw,
  Loader2,
  UserCheck,
  GraduationCap,
  Sparkles,
  Eye,
  FileText
} from 'lucide-react';
import { ComprehensiveAdmissionDialog } from '@/components/admission/ComprehensiveAdmissionDialog';
import { toast } from 'sonner';

interface ParsedApplication {
  id: string;
  record_id: string;
  name: string;
  email: string;
  phone: string;
  class_applied: string;
  academic_year: string;
  qualifying_marks?: number;
  science_score?: number;
  parent_name?: string;
  status: string;
  submission_date?: string;
  is_provisioned?: boolean;
}

interface MeritEntry {
  id: string;
  student_name: string;
  course_name: string;
  merit_score: number;
  rank: number;
  category: string;
  status: string;
  academic_year: string;
}

export function AdmissionsManagementView() {
  const { currentCollege } = useCollege();
  const { courses } = useCollegeCourses(currentCollege.id);

  const [activeTab, setActiveTab] = useState<'applications' | 'merit'>('applications');
  const [applications, setApplications] = useState<ParsedApplication[]>([]);
  const [meritList, setMeritList] = useState<MeritEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isNewApplicationOpen, setIsNewApplicationOpen] = useState(false);
  const [reviewingApp, setReviewingApp] = useState<ParsedApplication | null>(null);
  const [isAddMeritOpen, setIsAddMeritOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // New Merit Entry Form
  const [meritForm, setMeritForm] = useState({
    student_name: '',
    course_name: '',
    merit_score: 92,
    rank: 1,
    category: 'Government Quota',
    status: 'Admitted'
  });

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Load Applications from admission_document_verifications
      const { data: verifs } = await supabase
        .from('admission_document_verifications')
        .select('*')
        .eq('document_type', 'APPLICATION_METADATA')
        .order('created_at', { ascending: false });

      if (verifs && verifs.length > 0) {
        const parsed: ParsedApplication[] = verifs.map(v => {
          let meta: any = {};
          try {
            meta = typeof v.document_url === 'string' && v.document_url.startsWith('{')
              ? JSON.parse(v.document_url)
              : {};
          } catch {}

          return {
            id: meta.application_number || meta.student_id || v.id.slice(0, 8),
            record_id: v.id,
            name: meta.applicant_name || meta.name || v.student_name || 'Candidate',
            email: meta.email || 'applicant@adithyan.edu.in',
            phone: meta.phone || '—',
            class_applied: meta.class_applied || meta.class_name || courses[0]?.name || 'Paramedical Sciences',
            academic_year: meta.academic_year || '2026-2027',
            qualifying_marks: meta.qualifying_marks || 88,
            science_score: meta.science_score || 92,
            parent_name: meta.parent_name || 'Parent',
            status: meta.status || v.status || 'Pending',
            submission_date: v.submission_date || '2026-11-18',
            is_provisioned: meta.is_provisioned ?? false
          };
        });
        setApplications(parsed);
      } else {
        setApplications([]);
      }

      // 2. Load Merit List from admission_merit_lists
      const { data: merits } = await supabase
        .from('admission_merit_lists')
        .select('*')
        .order('rank', { ascending: true });

      if (merits) {
        setMeritList(merits as MeritEntry[]);
      }
    } catch (err) {
      console.warn('AdmissionsManagementView load notice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentCollege.id]);

  // Sanction & Provision Student Account
  const handleSanctionAndProvision = async (app: ParsedApplication) => {
    setActionLoading(true);
    try {
      // 1. Create Profile in profiles table via collegeDataService
      const rollNumber = `STU-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      await collegeDataService.createStudent({
        name: app.name,
        email: app.email,
        student_id: rollNumber,
        roll_number: rollNumber,
        department: app.class_applied,
        class_name: 'Year 1',
        phone: app.phone,
        status: 'active'
      }, currentCollege.id);

      // 2. Update admission verification status
      try {
        await supabase
          .from('admission_document_verifications')
          .update({
            status: 'Verified',
            verified_at: new Date().toISOString()
          })
          .eq('id', app.record_id);
      } catch {}

      toast.success(`🎉 Admission Sanctioned! Student account ${rollNumber} for ${app.name} has been enrolled in ${app.class_applied}!`);
      setReviewingApp(null);
      await loadData();
    } catch (err: any) {
      toast.error('Error provisioning student: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Add Merit List Entry
  const handleSaveMerit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const targetCourse = meritForm.course_name || courses[0]?.name || 'B.VOC Medical Lab Technology (MLT)';
      await supabase.from('admission_merit_lists').insert({
        id: crypto.randomUUID(),
        student_name: meritForm.student_name.trim(),
        course_name: targetCourse,
        merit_score: Number(meritForm.merit_score),
        rank: Number(meritForm.rank),
        category: meritForm.category,
        status: meritForm.status,
        academic_year: '2026-2027'
      });

      toast.success(`Candidate "${meritForm.student_name}" placed in Merit Rank #${meritForm.rank}!`);
      setIsAddMeritOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error('Failed to add merit entry: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredApps = applications.filter(a => {
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    return (
      a.name.toLowerCase().includes(term) ||
      a.id.toLowerCase().includes(term) ||
      a.class_applied.toLowerCase().includes(term) ||
      a.email.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-4">
      
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <FileCheck2 className="w-5 h-5 text-indigo-600" />
            <span>Admissions Desk & Merit Sanction Management</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Review incoming student applications, verify academic qualifying marks, rank candidates, and sanction student accounts for {currentCollege.name}.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="text-xs h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => setIsNewApplicationOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            New Admission Application
          </Button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Applications</span>
          <div className="text-xl font-bold text-slate-900 mt-0.5">{applications.length} Candidates</div>
        </div>
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Documents Verified</span>
          <div className="text-xl font-bold text-indigo-600 mt-0.5">
            {applications.filter(a => a.status === 'Verified' || a.status === 'Approved').length} Verified
          </div>
        </div>
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Merit Ranked</span>
          <div className="text-xl font-bold text-emerald-600 mt-0.5">{meritList.length} Ranked</div>
        </div>
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Batch Year</span>
          <div className="text-xl font-bold text-purple-600 mt-0.5">2026-2027</div>
        </div>
      </div>

      {/* Admissions Tabs */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between gap-3 items-center">
          <TabsList className="bg-slate-100 p-1 border border-slate-200 rounded-lg">
            <TabsTrigger value="applications" className="data-[state=active]:bg-white text-xs font-semibold py-1.5 px-3">
              <FileCheck2 className="w-3.5 h-3.5 mr-1.5" />
              Applications & Verification ({applications.length})
            </TabsTrigger>
            <TabsTrigger value="merit" className="data-[state=active]:bg-white text-xs font-semibold py-1.5 px-3">
              <Award className="w-3.5 h-3.5 mr-1.5" />
              Merit Rank List ({meritList.length})
            </TabsTrigger>
          </TabsList>

          {activeTab === 'applications' && (
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-slate-400" />
              <Input
                placeholder="Search candidate, course, or ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>
          )}

          {activeTab === 'merit' && (
            <Button
              size="sm"
              onClick={() => {
                setMeritForm({
                  student_name: '',
                  course_name: courses[0]?.name || 'Medical Laboratory Technology',
                  merit_score: 90,
                  rank: meritList.length + 1,
                  category: 'Government Quota',
                  status: 'Admitted'
                });
                setIsAddMeritOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 font-semibold"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Merit Rank Entry
            </Button>
          )}
        </div>

        {/* Tab 1: Applications Table */}
        <TabsContent value="applications" className="m-0">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[110px] text-xs font-bold text-slate-700">App No.</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700">Applicant Details</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700">Program Applied</TableHead>
                  <TableHead className="w-[120px] text-xs font-bold text-slate-700">12th Marks</TableHead>
                  <TableHead className="w-[100px] text-xs font-bold text-slate-700">Status</TableHead>
                  <TableHead className="w-[160px] text-right text-xs font-bold text-slate-700">Decision</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && applications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-xs">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                      Loading candidate applications...
                    </TableCell>
                  </TableRow>
                ) : filteredApps.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-xs">
                      No applications recorded yet. Click "New Admission Application" to register candidates.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredApps.map((app) => (
                    <TableRow key={app.record_id} className="hover:bg-slate-50/80 transition-colors">
                      <TableCell className="font-mono text-xs font-bold text-slate-800">
                        <Badge variant="outline" className="bg-slate-100 text-slate-800 font-mono text-[11px]">
                          {app.id}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-xs text-slate-900">{app.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{app.email} • {app.phone}</div>
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-800 max-w-xs truncate">
                        {app.class_applied}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-semibold text-slate-900">{app.science_score || app.qualifying_marks}%</div>
                        <div className="text-[10px] text-slate-400">PCB Science Aggregate</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          app.status === 'Approved' || app.status === 'Verified'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]'
                            : app.status === 'Rejected'
                            ? 'bg-rose-100 text-rose-800 border-rose-200 text-[10px]'
                            : 'bg-amber-100 text-amber-800 border-amber-200 text-[10px]'
                        }>
                          {app.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setReviewingApp(app)}
                          className="h-8 text-xs font-semibold text-slate-700 hover:text-indigo-600"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Review
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSanctionAndProvision(app)}
                          disabled={actionLoading}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs font-semibold"
                          title="Sanction Admission and auto-provision Student Portal account"
                        >
                          <UserCheck className="w-3.5 h-3.5 mr-1" />
                          Sanction
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Tab 2: Merit Rank List */}
        <TabsContent value="merit" className="m-0">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[80px] text-xs font-bold text-slate-700">Rank</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700">Candidate Name</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700">Allocated Course</TableHead>
                  <TableHead className="w-[120px] text-xs font-bold text-slate-700">Merit Score</TableHead>
                  <TableHead className="w-[140px] text-xs font-bold text-slate-700">Seat Category</TableHead>
                  <TableHead className="w-[100px] text-xs font-bold text-slate-700">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {meritList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-xs">
                      No merit list rankings published yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  meritList.map((m) => (
                    <TableRow key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <TableCell className="font-mono text-xs font-bold">
                        <Badge className="bg-indigo-600 text-white font-mono text-xs h-6 w-6 rounded-full p-0 flex items-center justify-center">
                          {m.rank}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-xs text-slate-900">
                        {m.student_name}
                      </TableCell>
                      <TableCell className="text-xs text-slate-800">
                        {m.course_name}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-bold text-emerald-700">
                        {m.merit_score}%
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-800">
                          {m.category || 'Government Quota'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                          {m.status || 'Admitted'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Review Application Modal */}
      <Dialog open={!!reviewingApp} onOpenChange={(open) => { if (!open) setReviewingApp(null); }}>
        <DialogContent className="max-w-md">
          {reviewingApp && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-base font-bold flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <span>Application Verification Dossier</span>
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Review applicant credentials for {reviewingApp.name}.
                </DialogDescription>
              </DialogHeader>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-200">
                  <span className="text-slate-500">Applicant:</span>
                  <span className="font-bold text-slate-900">{reviewingApp.name}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200">
                  <span className="text-slate-500">Program Applied:</span>
                  <span className="font-semibold text-slate-800">{reviewingApp.class_applied}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200">
                  <span className="text-slate-500">12th Science Aggregate:</span>
                  <span className="font-mono font-bold text-indigo-700">{reviewingApp.science_score || reviewingApp.qualifying_marks}%</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200">
                  <span className="text-slate-500">Contact:</span>
                  <span className="text-slate-800">{reviewingApp.email} • {reviewingApp.phone}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500">Parent / Guardian:</span>
                  <span className="text-slate-800">{reviewingApp.parent_name || 'Guardian'}</span>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button variant="outline" size="sm" onClick={() => setReviewingApp(null)}>
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleSanctionAndProvision(reviewingApp)}
                  disabled={actionLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  <UserCheck className="w-3.5 h-3.5 mr-1" />
                  Sanction & Enroll Candidate
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Merit Entry Modal */}
      <Dialog open={isAddMeritOpen} onOpenChange={setIsAddMeritOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center space-x-2">
              <Award className="w-5 h-5 text-indigo-600" />
              <span>Add Candidate to Merit List</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Assign merit ranking and program seat allocation.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveMerit} className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Candidate Full Name *</Label>
              <Input
                placeholder="e.g. Anandha Kumar"
                value={meritForm.student_name}
                onChange={e => setMeritForm({ ...meritForm, student_name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Allocated Course Program</Label>
              <Select
                value={meritForm.course_name}
                onValueChange={(val) => setMeritForm({ ...meritForm, course_name: val })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select Course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map(c => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Merit Score (%) *</Label>
                <Input
                  type="number"
                  min="40"
                  max="100"
                  value={meritForm.merit_score}
                  onChange={e => setMeritForm({ ...meritForm, merit_score: Number(e.target.value) })}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Merit Rank # *</Label>
                <Input
                  type="number"
                  min="1"
                  value={meritForm.rank}
                  onChange={e => setMeritForm({ ...meritForm, rank: Number(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Seat Category</Label>
                <Select
                  value={meritForm.category}
                  onValueChange={(val) => setMeritForm({ ...meritForm, category: val })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Government Quota">Government Quota</SelectItem>
                    <SelectItem value="Management Quota">Management Quota</SelectItem>
                    <SelectItem value="Sports / Cultural Quota">Sports / Cultural Quota</SelectItem>
                    <SelectItem value="NRI Quota">NRI Quota</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Allocation Status</Label>
                <Select
                  value={meritForm.status}
                  onValueChange={(val) => setMeritForm({ ...meritForm, status: val })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admitted">Admitted</SelectItem>
                    <SelectItem value="Sanctioned">Sanctioned</SelectItem>
                    <SelectItem value="Waitlisted">Waitlisted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddMeritOpen(false)} disabled={actionLoading}>
                Cancel
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={actionLoading}>
                {actionLoading ? 'Saving...' : 'Add to Merit Rank List'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Connected Comprehensive Admission Dialog */}
      <ComprehensiveAdmissionDialog
        open={isNewApplicationOpen}
        onOpenChange={setIsNewApplicationOpen}
        onSuccess={() => {
          setIsNewApplicationOpen(false);
          loadData();
        }}
      />

    </div>
  );
}
