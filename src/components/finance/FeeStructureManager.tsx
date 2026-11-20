import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, CreditCard, CheckCircle2, RefreshCw, Loader2, Building2, Users } from 'lucide-react';
import { db } from '@/services/supabase/database';
import { FeeStructure } from '@/types/database.types';
import { useToast } from '@/hooks/use-toast';
import { OFFICIAL_COURSES } from '@/constants/courses';
import { useCollegeCourses } from '@/hooks/useCollegeCourses';

export function FeeStructureManager() {
  const { toast } = useToast();
  const { collegeCourses: coursesList } = useCollegeCourses();
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Batch assign state
  const [batchOpen, setBatchOpen] = useState(false);
  const [selectedStructure, setSelectedStructure] = useState<FeeStructure | null>(null);
  const [batchDueDate, setBatchDueDate] = useState<string>(
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [batchClassName, setBatchClassName] = useState<string>('Semester 1');
  const [batchAssigning, setBatchAssigning] = useState(false);

  const [form, setForm] = useState({
    title: '',
    department: OFFICIAL_COURSES[0].name,
    academic_year: '2026-2027',
    quota: 'Merit' as 'Merit' | 'Management' | 'Lateral_Entry' | 'NRI',
    tuition_fee: 55000,
    lab_fee: 12000,
    exam_fee: 3500,
    library_fee: 2500,
    sports_fee: 1500,
    development_fund: 5500,
    installments_allowed: 2
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await db.getFeeStructures();
      setStructures(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalCalculated = Number(form.tuition_fee) + Number(form.lab_fee) + Number(form.exam_fee) + 
                          Number(form.library_fee) + Number(form.sports_fee) + Number(form.development_fund);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) {
      toast({ title: 'Title required', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await db.createFeeStructure({
        ...form,
        total_annual_fee: totalCalculated,
        hostel_fee_default: 0,
        transport_fee_default: 0
      });
      if (res) {
        toast({ title: 'Fee Structure Template Published', description: `${res.title} is now active.` });
        setCreateOpen(false);
        loadData();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleBatchAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStructure) return;
    setBatchAssigning(true);
    try {
      const res = await db.batchAssignFeeStructure({
        feeStructureId: selectedStructure.id,
        dueDate: batchDueDate,
        className: `${selectedStructure.department} - ${batchClassName}`,
      });
      if (res.success) {
        toast({
          title: 'Batch Fees Assigned',
          description: `Successfully issued fee invoices to ${res.count} enrolled students.`,
        });
        setBatchOpen(false);
      } else {
        toast({ title: 'Batch Assignment Failed', description: res.error, variant: 'destructive' });
      }
    } finally {
      setBatchAssigning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 border border-slate-200 rounded-2xl shadow-2xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1D61E7] flex items-center justify-center font-bold">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Institutional Fee Structures Master</h3>
            <p className="text-xs text-slate-500">Configure annual tuition, laboratory, and composite academic fees by department</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button size="sm" variant="outline" onClick={loadData} className="h-8 text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="h-8 text-xs font-bold bg-[#1D61E7] hover:bg-blue-700 text-white rounded-xl shadow-xs">
            <Plus className="w-3.5 h-3.5 mr-1" /> New Fee Structure
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-6 h-6 animate-spin text-[#1D61E7]" />
        </div>
      ) : structures.length === 0 ? (
        <Card className="bg-white text-center py-12">
          <CardContent className="space-y-2">
            <CreditCard className="w-10 h-10 mx-auto text-slate-300" />
            <h4 className="text-sm font-bold text-slate-900">No Fee Structures Configured</h4>
            <p className="text-xs text-slate-500">Create academic fee templates for admission enrollment.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {structures.map((s) => (
            <Card key={s.id} className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className="text-[10px] font-bold">
                    {s.academic_year}
                  </Badge>
                  <Badge className="bg-blue-50 text-[#1D61E7] border-blue-200 text-[10px] font-bold">
                    {s.quota} Quota
                  </Badge>
                </div>
                <CardTitle className="text-sm font-bold text-slate-900 line-clamp-1">{s.title}</CardTitle>
                <CardDescription className="text-xs flex items-center text-slate-500">
                  <Building2 className="w-3.5 h-3.5 mr-1 text-slate-400" /> {s.department}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-2.5 text-xs">
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-600">
                    <span>Tuition Fee:</span>
                    <strong className="text-slate-900">₹{Number(s.tuition_fee).toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Lab Composite:</span>
                    <strong className="text-slate-900">₹{Number(s.lab_fee).toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Exam & Library:</span>
                    <strong className="text-slate-900">₹{(Number(s.exam_fee) + Number(s.library_fee)).toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Development Fund:</span>
                    <strong className="text-slate-900">₹{Number(s.development_fund).toLocaleString('en-IN')}</strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
                  <span className="font-bold text-slate-700">Total Annual Fee:</span>
                  <span className="text-base font-black text-[#1D61E7]">
                    ₹{Number(s.total_annual_fee).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">
                  Payable in {s.installments_allowed} equal semester installments.
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs font-semibold h-7"
                    onClick={() => {
                      setSelectedStructure(s);
                      setBatchClassName('Semester 1');
                      setBatchOpen(true);
                    }}
                  >
                    <Users className="w-3.5 h-3.5 mr-1 text-[#1D61E7]" />
                    Assign to Enrolled Cohort
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Batch Assign Dialog */}
      <Dialog open={batchOpen} onOpenChange={setBatchOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-[#1D61E7]" />
              Assign Fee Structure to Cohort
            </DialogTitle>
          </DialogHeader>
          {selectedStructure && (
            <form onSubmit={handleBatchAssign} className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 border rounded-xl space-y-1">
                <div className="font-bold text-slate-800">{selectedStructure.title}</div>
                <div className="text-slate-500">{selectedStructure.department} • {selectedStructure.academic_year}</div>
                <div className="text-emerald-600 font-extrabold text-sm">₹{Number(selectedStructure.total_annual_fee).toLocaleString('en-IN')} per student</div>
              </div>

              <div>
                <Label className="text-xs font-bold">Academic Semester</Label>
                <Select value={batchClassName} onValueChange={setBatchClassName}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6].map(sem => (
                      <SelectItem key={sem} value={`Semester ${sem}`}>Semester {sem}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-bold">Payment Due Date</Label>
                <Input
                  type="date"
                  value={batchDueDate}
                  onChange={(e) => setBatchDueDate(e.target.value)}
                  className="h-8 text-xs mt-1"
                  required
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setBatchOpen(false)} className="h-8 text-xs">Cancel</Button>
                <Button type="submit" size="sm" disabled={batchAssigning} className="h-8 text-xs font-bold bg-[#1D61E7] text-white">
                  {batchAssigning ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                  Assign Invoices
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">New Institutional Fee Template</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3 text-xs">
            <div>
              <Label className="text-xs font-bold">Template Title</Label>
              <Input
                placeholder="e.g. B.Sc Medical Laboratory Technology 2026-2027"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="h-8 text-xs mt-1"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Department</Label>
                <Select value={form.department} onValueChange={(val) => setForm({ ...form, department: val })}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {coursesList.map(c => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-bold">Admission Quota</Label>
                <Select value={form.quota} onValueChange={(val: any) => setForm({ ...form, quota: val })}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Merit">Government Merit Quota</SelectItem>
                    <SelectItem value="Management">Management Quota</SelectItem>
                    <SelectItem value="Lateral_Entry">Lateral Entry</SelectItem>
                    <SelectItem value="NRI">NRI Quota</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <Label className="text-xs">Tuition Fee (₹)</Label>
                <Input type="number" value={form.tuition_fee} onChange={(e) => setForm({ ...form, tuition_fee: Number(e.target.value) })} className="h-8 text-xs mt-1" />
              </div>
              <div>
                <Label className="text-xs">Laboratory Fee (₹)</Label>
                <Input type="number" value={form.lab_fee} onChange={(e) => setForm({ ...form, lab_fee: Number(e.target.value) })} className="h-8 text-xs mt-1" />
              </div>
              <div>
                <Label className="text-xs">Examination Fee (₹)</Label>
                <Input type="number" value={form.exam_fee} onChange={(e) => setForm({ ...form, exam_fee: Number(e.target.value) })} className="h-8 text-xs mt-1" />
              </div>
              <div>
                <Label className="text-xs">Library & Sports (₹)</Label>
                <Input type="number" value={form.library_fee + form.sports_fee} onChange={(e) => setForm({ ...form, library_fee: Number(e.target.value) / 2, sports_fee: Number(e.target.value) / 2 })} className="h-8 text-xs mt-1" />
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
              <span className="font-bold text-slate-800">Total Calculated Annual:</span>
              <span className="text-base font-black text-[#1D61E7]">₹{totalCalculated.toLocaleString('en-IN')}</span>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(false)} className="h-8 text-xs">Cancel</Button>
              <Button type="submit" size="sm" disabled={submitting} className="h-8 text-xs font-bold bg-[#1D61E7] text-white">
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Save Structure Template
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

