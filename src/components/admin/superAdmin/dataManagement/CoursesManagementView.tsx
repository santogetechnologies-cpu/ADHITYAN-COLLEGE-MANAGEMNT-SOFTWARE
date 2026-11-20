import React, { useState } from 'react';
import { useCollege } from '@/context/CollegeContext';
import { useCollegeCourses } from '@/hooks/useCollegeCourses';
import { Course } from '@/types/database.types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  GraduationCap,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  BookOpen,
  Filter,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

export function CoursesManagementView() {
  const { currentCollege } = useCollege();
  const { courses, loading, refresh, createCourse, updateCourse, deleteCourse } = useCollegeCourses(currentCollege.id);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'Degree' | 'Diploma'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    duration_years: 3,
    type: 'Degree' as 'Degree' | 'Diploma',
    department: '',
    tuition_fee: 65000,
    description: '',
    eligibility: '10+2 / Higher Secondary with Science',
    status: 'active' as 'active' | 'inactive'
  });

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      duration_years: 3,
      type: 'Degree',
      department: '',
      tuition_fee: 65000,
      description: '',
      eligibility: '10+2 / Higher Secondary with Science',
      status: 'active'
    });
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (c: Course) => {
    setEditingCourse(c);
    setFormData({
      code: c.code || '',
      name: c.name || '',
      duration_years: c.duration_years || 3,
      type: (c.type as any) === 'Diploma' ? 'Diploma' : 'Degree',
      department: c.department || c.name || '',
      tuition_fee: c.tuition_fee || 60000,
      description: c.description || '',
      eligibility: c.eligibility || '10+2 with Science',
      status: (c.status as any) || 'active'
    });
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error('Course name and code are required.');
      return;
    }

    setSaving(true);
    try {
      if (editingCourse) {
        await updateCourse(editingCourse.id, {
          code: formData.code.trim().toUpperCase(),
          name: formData.name.trim(),
          duration_years: Number(formData.duration_years) || 3,
          type: formData.type,
          department: formData.department.trim() || formData.name.trim(),
          tuition_fee: Number(formData.tuition_fee) || 60000,
          description: formData.description.trim(),
          eligibility: formData.eligibility.trim(),
          status: formData.status
        });
        toast.success(`Course "${formData.name}" updated successfully.`);
        setEditingCourse(null);
      } else {
        await createCourse({
          code: formData.code.trim().toUpperCase(),
          name: formData.name.trim(),
          duration_years: Number(formData.duration_years) || 3,
          type: formData.type,
          department: formData.department.trim() || formData.name.trim(),
          tuition_fee: Number(formData.tuition_fee) || 60000,
          description: formData.description.trim(),
          eligibility: formData.eligibility.trim(),
          status: formData.status
        });
        toast.success(`New course "${formData.name}" registered and published!`);
        setIsCreateOpen(false);
      }
      resetForm();
      await refresh();
    } catch (err: any) {
      toast.error(err.message || 'Error occurred while saving course.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!deletingCourseId) return;
    setSaving(true);
    try {
      await deleteCourse(deletingCourseId);
      toast.success('Course deactivated and removed.');
      setDeletingCourseId(null);
      await refresh();
    } catch (err: any) {
      toast.error(err.message || 'Error deleting course.');
    } finally {
      setSaving(false);
    }
  };

  const filteredCourses = courses.filter(c => {
    const matchesSearch = !searchQuery || 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.department && c.department.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = typeFilter === 'all' || c.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const degreeCount = courses.filter(c => c.type === 'Degree').length;
  const diplomaCount = courses.filter(c => c.type === 'Diploma').length;
  const avgFee = courses.length > 0 
    ? Math.round(courses.reduce((sum, c) => sum + (c.tuition_fee || 0), 0) / courses.length) 
    : 0;

  return (
    <div className="space-y-4">
      
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <GraduationCap className="w-5 h-5 text-indigo-600" />
            <span>Academic Courses & Degree Programs</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Manage institutional courses, semester structures, tuition fee heads, and admission eligibility criteria.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refresh()}
            disabled={loading}
            className="text-xs h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Sync
          </Button>
          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add New Course
          </Button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Catalog</span>
          <div className="text-xl font-bold text-slate-900 mt-0.5">{courses.length} Courses</div>
        </div>
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Degree Programs</span>
          <div className="text-xl font-bold text-indigo-600 mt-0.5">{degreeCount} Degrees</div>
        </div>
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Diploma Programs</span>
          <div className="text-xl font-bold text-purple-600 mt-0.5">{diplomaCount} Diplomas</div>
        </div>
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Average Tuition</span>
          <div className="text-xl font-bold text-emerald-600 mt-0.5">₹{avgFee.toLocaleString('en-IN')}/yr</div>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-slate-400" />
          <Input
            placeholder="Search by code, title, or department..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-9"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Select value={typeFilter} onValueChange={(val: any) => setTypeFilter(val)}>
            <SelectTrigger className="text-xs h-9 w-[130px]">
              <SelectValue placeholder="Program Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Degree">Degree Only</SelectItem>
              <SelectItem value="Diploma">Diploma Only</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
            <SelectTrigger className="text-xs h-9 w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Courses Master Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-[120px] text-xs font-bold text-slate-700">Course Code</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Course Name & Department</TableHead>
              <TableHead className="w-[140px] text-xs font-bold text-slate-700">Type & Duration</TableHead>
              <TableHead className="w-[140px] text-xs font-bold text-slate-700">Tuition Fee</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Eligibility</TableHead>
              <TableHead className="w-[100px] text-xs font-bold text-slate-700">Status</TableHead>
              <TableHead className="w-[110px] text-right text-xs font-bold text-slate-700">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && courses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-xs">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                  Loading academic course catalog...
                </TableCell>
              </TableRow>
            ) : filteredCourses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-xs">
                  No courses matching your filter criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredCourses.map((c) => (
                <TableRow key={c.id} className="hover:bg-slate-50/80 transition-colors">
                  <TableCell className="font-mono text-xs font-bold text-slate-900">
                    <Badge variant="outline" className="bg-slate-100 text-slate-800 border-slate-300 font-mono text-[11px]">
                      {c.code}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-xs text-slate-900">{c.name}</div>
                    <div className="text-[11px] text-slate-500 truncate max-w-sm">
                      {c.department || c.name} {c.description ? `• ${c.description}` : ''}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-medium text-slate-800">
                      {c.type}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {c.duration_years} {c.duration_years === 1 ? 'Year' : 'Years'} ({c.duration_years * 2} Semesters)
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-bold text-slate-900">
                      ₹{c.tuition_fee?.toLocaleString('en-IN') || '60,000'}
                    </div>
                    <div className="text-[10px] text-slate-400">per academic year</div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 max-w-xs truncate">
                    {c.eligibility || '10+2 with Science / Relevant Stream'}
                  </TableCell>
                  <TableCell>
                    <Badge className={c.status === 'active' 
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]' 
                      : 'bg-slate-100 text-slate-600 border-slate-200 text-[10px]'}>
                      {c.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(c)}
                      className="h-8 w-8 p-0 text-slate-600 hover:text-indigo-600"
                      title="Edit Course"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingCourseId(c.id)}
                      className="h-8 w-8 p-0 text-slate-600 hover:text-rose-600"
                      title="Delete Course"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Create / Edit Course Modal */}
      <Dialog open={isCreateOpen || !!editingCourse} onOpenChange={(open) => { if (!open) { setIsCreateOpen(false); setEditingCourse(null); } }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center space-x-2">
              <GraduationCap className="w-5 h-5 text-indigo-600" />
              <span>{editingCourse ? 'Edit Academic Course' : 'Register New Academic Course'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure course details, duration, fee structure, and eligibility criteria for {currentCollege.name}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCourse} className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Course Code *</Label>
                <Input
                  placeholder="e.g. BVOC-MLT"
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Program Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(val: any) => {
                    setFormData({
                      ...formData,
                      type: val,
                      duration_years: val === 'Diploma' ? 1 : 3
                    });
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Degree">Degree (3-4 Years)</SelectItem>
                    <SelectItem value="Diploma">Diploma (1-2 Years)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Course Full Name *</Label>
              <Input
                placeholder="e.g. B.VOC Medical Lab Technology (MLT)"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Duration (Years)</Label>
                <Input
                  type="number"
                  min="1"
                  max="6"
                  value={formData.duration_years}
                  onChange={e => setFormData({ ...formData, duration_years: Number(e.target.value) })}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Total Semesters</Label>
                <Input
                  disabled
                  value={`${formData.duration_years * 2} Semesters`}
                  className="bg-slate-50 font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Annual Tuition (₹)</Label>
                <Input
                  type="number"
                  step="500"
                  value={formData.tuition_fee}
                  onChange={e => setFormData({ ...formData, tuition_fee: Number(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Department / Faculty Wing</Label>
              <Input
                placeholder="e.g. Allied Health Sciences / Paramedical Wing"
                value={formData.department}
                onChange={e => setFormData({ ...formData, department: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Eligibility Requirements</Label>
              <Input
                placeholder="e.g. 10+2 with Physics, Chemistry, Biology / Maths"
                value={formData.eligibility}
                onChange={e => setFormData({ ...formData, eligibility: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Course Description</Label>
              <Textarea
                placeholder="Brief summary of program curriculum and career pathways"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Catalog Status</Label>
              <Select
                value={formData.status}
                onValueChange={(val: any) => setFormData({ ...formData, status: val })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active (Open for Admissions & Enrolment)</SelectItem>
                  <SelectItem value="inactive">Inactive / Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => { setIsCreateOpen(false); setEditingCourse(null); }} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  editingCourse ? 'Save Changes' : 'Register Course'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingCourseId} onOpenChange={(open) => { if (!open) setDeletingCourseId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-rose-600 flex items-center space-x-1.5">
              <AlertCircle className="w-4 h-4" />
              <span>Confirm Course Removal</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to deactivate and remove this course from the college catalog? This will affect student registrations and fee structures linked to this course.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeletingCourseId(null)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteCourse} disabled={saving}>
              {saving ? 'Removing...' : 'Delete Course'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
