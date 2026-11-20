import React, { useState, useEffect } from 'react';
import { useCollege } from '@/context/CollegeContext';
import { useCollegeCourses } from '@/hooks/useCollegeCourses';
import { collegeDataService } from '@/services/collegeDataService';
import { FeeStructure, FeeReceipt } from '@/types/database.types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  CreditCard,
  Plus,
  Search,
  Edit2,
  Trash2,
  Receipt,
  Download,
  Printer,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Building,
  DollarSign
} from 'lucide-react';
import { FeeReceiptModal } from '@/components/shared/FeeReceiptModal';
import { toast } from 'sonner';

export function FeesManagementView() {
  const { currentCollege } = useCollege();
  const { courses } = useCollegeCourses(currentCollege.id);

  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingStructure, setEditingStructure] = useState<FeeStructure | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Counter payment modal state
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [generatedReceipt, setGeneratedReceipt] = useState<FeeReceipt | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  // Fee Structure Form
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    academic_year: '2026-2027',
    quota: 'Merit' as 'Merit' | 'Management' | 'Lateral_Entry' | 'NRI',
    tuition_fee: 55000,
    lab_fee: 10000,
    exam_fee: 3500,
    library_fee: 2500,
    sports_fee: 1500,
    development_fund: 5000,
    installments_allowed: 2
  });

  // Counter Payment Form
  const [paymentData, setPaymentData] = useState({
    student_name: '',
    roll_number: '',
    department: '',
    amount_paid: 50000,
    fee_type: 'Tuition Fee Installment',
    payment_mode: 'UPI / NetBanking',
    transaction_reference: `TXN-${Date.now().toString().slice(-6)}`,
    remarks: 'Fee collected at Central Admin counter'
  });

  const loadFeeStructures = async () => {
    setLoading(true);
    try {
      const data = await collegeDataService.getFeeStructures(currentCollege.id);
      setStructures(data);
    } catch (err) {
      console.warn('Failed to load fee structures:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeeStructures();

    const handleUpdate = () => loadFeeStructures();
    window.addEventListener('college_data_updated', handleUpdate);
    return () => window.removeEventListener('college_data_updated', handleUpdate);
  }, [currentCollege.id]);

  const resetForm = () => {
    const defaultDept = courses[0]?.name || 'B.VOC Medical Lab Technology (MLT)';
    setFormData({
      title: `${defaultDept} - Standard Structure`,
      department: defaultDept,
      academic_year: '2026-2027',
      quota: 'Merit',
      tuition_fee: 55000,
      lab_fee: 10000,
      exam_fee: 3500,
      library_fee: 2500,
      sports_fee: 1500,
      development_fund: 5000,
      installments_allowed: 2
    });
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (fs: FeeStructure) => {
    setEditingStructure(fs);
    setFormData({
      title: fs.title || `${fs.department} Fee Structure`,
      department: fs.department || courses[0]?.name || '',
      academic_year: fs.academic_year || '2026-2027',
      quota: (fs.quota as any) || 'Merit',
      tuition_fee: fs.tuition_fee || 50000,
      lab_fee: fs.lab_fee || 0,
      exam_fee: fs.exam_fee || 0,
      library_fee: fs.library_fee || 0,
      sports_fee: fs.sports_fee || 0,
      development_fund: fs.development_fund || 0,
      installments_allowed: fs.installments_allowed || 2
    });
  };

  const calculatedTotal = 
    Number(formData.tuition_fee) + 
    Number(formData.lab_fee) + 
    Number(formData.exam_fee) + 
    Number(formData.library_fee) + 
    Number(formData.sports_fee) + 
    Number(formData.development_fund);

  const handleSaveStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.department) {
      toast.error('Department selection is required.');
      return;
    }

    setSaving(true);
    try {
      if (editingStructure) {
        await collegeDataService.updateFeeStructure(editingStructure.id, {
          title: formData.title || `${formData.department} Fee Schedule`,
          department: formData.department,
          academic_year: formData.academic_year,
          quota: formData.quota,
          tuition_fee: Number(formData.tuition_fee),
          lab_fee: Number(formData.lab_fee),
          exam_fee: Number(formData.exam_fee),
          library_fee: Number(formData.library_fee),
          sports_fee: Number(formData.sports_fee),
          development_fund: Number(formData.development_fund),
          total_annual_fee: calculatedTotal,
          installments_allowed: Number(formData.installments_allowed)
        });
        toast.success('Fee structure schedule updated.');
        setEditingStructure(null);
      } else {
        await collegeDataService.createFeeStructure({
          title: formData.title || `${formData.department} Fee Schedule`,
          department: formData.department,
          academic_year: formData.academic_year,
          quota: formData.quota,
          tuition_fee: Number(formData.tuition_fee),
          lab_fee: Number(formData.lab_fee),
          exam_fee: Number(formData.exam_fee),
          library_fee: Number(formData.library_fee),
          sports_fee: Number(formData.sports_fee),
          development_fund: Number(formData.development_fund),
          total_annual_fee: calculatedTotal,
          installments_allowed: Number(formData.installments_allowed)
        }, currentCollege.id);
        toast.success('New institutional fee structure published.');
        setIsCreateOpen(false);
      }
      resetForm();
      await loadFeeStructures();
    } catch (err: any) {
      toast.error(err.message || 'Error occurred while saving fee structure.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStructure = async () => {
    if (!deletingId) return;
    setSaving(true);
    try {
      await collegeDataService.deleteFeeStructure(deletingId);
      toast.success('Fee structure removed.');
      setDeletingId(null);
      await loadFeeStructures();
    } catch (err: any) {
      toast.error(err.message || 'Error deleting structure.');
    } finally {
      setSaving(false);
    }
  };

  // Record Counter Payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentData.student_name.trim() || !paymentData.roll_number.trim()) {
      toast.error('Student name and roll number are mandatory.');
      return;
    }

    setPaymentSaving(true);
    try {
      const receipt = await collegeDataService.recordFeePayment({
        student_name: paymentData.student_name.trim(),
        roll_number: paymentData.roll_number.trim(),
        department: paymentData.department || courses[0]?.name || 'Paramedical Sciences',
        amount_paid: Number(paymentData.amount_paid) || 50000,
        gross_amount: Number(paymentData.amount_paid) || 50000,
        fee_type: paymentData.fee_type,
        payment_mode: paymentData.payment_mode,
        transaction_reference: paymentData.transaction_reference,
        remarks: paymentData.remarks
      }, currentCollege.id);

      toast.success(`Fee receipt ${receipt.receipt_number} generated!`);
      setIsPaymentOpen(false);
      setGeneratedReceipt(receipt);
      setReceiptModalOpen(true);
    } catch (err: any) {
      toast.error(err.message || 'Error recording fee payment.');
    } finally {
      setPaymentSaving(false);
    }
  };

  const filteredStructures = structures.filter(s => {
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    return (
      (s.department && s.department.toLowerCase().includes(term)) ||
      (s.title && s.title.toLowerCase().includes(term)) ||
      (s.quota && s.quota.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-4">
      
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            <span>Institutional Fee Structures & Financial Ledger</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Configure fee heads (tuition, lab, exam, library, development fund), quotas, and record counter deposits for {currentCollege.name}.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPaymentData({
                student_name: '',
                roll_number: '',
                department: courses[0]?.name || 'Medical Laboratory Technology',
                amount_paid: 45000,
                fee_type: 'Tuition Fee Installment',
                payment_mode: 'UPI / Online Transfer',
                transaction_reference: `TXN-${Date.now().toString().slice(-6)}`,
                remarks: 'Counter payment recorded via Super Admin Desk'
              });
              setIsPaymentOpen(true);
            }}
            className="text-xs h-9 text-slate-700 font-semibold"
          >
            <Receipt className="w-3.5 h-3.5 mr-1 text-emerald-600" />
            Record Fee Payment
          </Button>

          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Fee Structure
          </Button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Configured Schedules</span>
          <div className="text-xl font-bold text-slate-900 mt-0.5">{structures.length} Structures</div>
        </div>
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Active Academic Year</span>
          <div className="text-xl font-bold text-indigo-600 mt-0.5">2026-2027</div>
        </div>
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Average Annual Fee</span>
          <div className="text-xl font-bold text-emerald-600 mt-0.5">
            ₹{structures.length > 0 
              ? Math.round(structures.reduce((acc, s) => acc + (s.total_annual_fee || 0), 0) / structures.length).toLocaleString('en-IN')
              : '75,000'}
          </div>
        </div>
      </div>

      {/* Search and Table */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-slate-400" />
          <Input
            placeholder="Search by department, title, or quota..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-9"
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadFeeStructures}
          disabled={loading}
          className="text-xs h-9"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Fee Structures Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="text-xs font-bold text-slate-700">Department / Title</TableHead>
              <TableHead className="w-[120px] text-xs font-bold text-slate-700">Quota</TableHead>
              <TableHead className="w-[110px] text-xs font-bold text-slate-700">Tuition Fee</TableHead>
              <TableHead className="w-[100px] text-xs font-bold text-slate-700">Lab Fee</TableHead>
              <TableHead className="w-[100px] text-xs font-bold text-slate-700">Exam Fee</TableHead>
              <TableHead className="w-[130px] text-xs font-bold text-slate-700">Total Annual Fee</TableHead>
              <TableHead className="w-[100px] text-xs font-bold text-slate-700">Installments</TableHead>
              <TableHead className="w-[100px] text-right text-xs font-bold text-slate-700">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && structures.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-xs">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                  Loading institutional fee structures...
                </TableCell>
              </TableRow>
            ) : filteredStructures.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-xs">
                  No fee structures found.
                </TableCell>
              </TableRow>
            ) : (
              filteredStructures.map((s) => (
                <TableRow key={s.id} className="hover:bg-slate-50/80 transition-colors">
                  <TableCell>
                    <div className="font-semibold text-xs text-slate-900">{s.department}</div>
                    <div className="text-[11px] text-slate-500">{s.title || 'Standard Academic Schedule'}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] font-semibold bg-slate-100 text-slate-800">
                      {s.quota || 'Merit'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-800">
                    ₹{s.tuition_fee?.toLocaleString('en-IN')}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-600">
                    ₹{s.lab_fee?.toLocaleString('en-IN') || 0}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-600">
                    ₹{s.exam_fee?.toLocaleString('en-IN') || 0}
                  </TableCell>
                  <TableCell className="font-mono text-xs font-bold text-indigo-700">
                    ₹{s.total_annual_fee?.toLocaleString('en-IN')}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {s.installments_allowed || 2} terms
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(s)}
                      className="h-8 w-8 p-0 text-slate-600 hover:text-indigo-600"
                      title="Edit Structure"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingId(s.id)}
                      className="h-8 w-8 p-0 text-slate-600 hover:text-rose-600"
                      title="Delete Structure"
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

      {/* Add / Edit Fee Structure Dialog */}
      <Dialog open={isCreateOpen || !!editingStructure} onOpenChange={(open) => { if (!open) { setIsCreateOpen(false); setEditingStructure(null); } }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center space-x-2">
              <CreditCard className="w-5 h-5 text-indigo-600" />
              <span>{editingStructure ? 'Edit Fee Structure Schedule' : 'Create New Fee Structure'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define fee breakdown across academic heads for {currentCollege.name}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveStructure} className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Department / Course *</Label>
                <Select
                  value={formData.department}
                  onValueChange={(val) => setFormData({ ...formData, department: val, title: `${val} Fee Structure` })}
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

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Admission Quota</Label>
                <Select
                  value={formData.quota}
                  onValueChange={(val: any) => setFormData({ ...formData, quota: val })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Merit">Government Merit Quota</SelectItem>
                    <SelectItem value="Management">Management Quota</SelectItem>
                    <SelectItem value="Lateral_Entry">Lateral Entry Quota</SelectItem>
                    <SelectItem value="NRI">NRI Quota</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tuition Fee (₹) *</Label>
                <Input
                  type="number"
                  value={formData.tuition_fee}
                  onChange={e => setFormData({ ...formData, tuition_fee: Number(e.target.value) })}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Laboratory Fee (₹)</Label>
                <Input
                  type="number"
                  value={formData.lab_fee}
                  onChange={e => setFormData({ ...formData, lab_fee: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Examination Fee (₹)</Label>
                <Input
                  type="number"
                  value={formData.exam_fee}
                  onChange={e => setFormData({ ...formData, exam_fee: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Library Fee (₹)</Label>
                <Input
                  type="number"
                  value={formData.library_fee}
                  onChange={e => setFormData({ ...formData, library_fee: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Sports & Culturals (₹)</Label>
                <Input
                  type="number"
                  value={formData.sports_fee}
                  onChange={e => setFormData({ ...formData, sports_fee: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Development Fund (₹)</Label>
                <Input
                  type="number"
                  value={formData.development_fund}
                  onChange={e => setFormData({ ...formData, development_fund: Number(e.target.value) })}
                />
              </div>
            </div>

            {/* Total Calculation Banner */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-indigo-900 block">Calculated Total Annual Fee</span>
                <span className="text-[11px] text-indigo-700">Combined sum across all configured heads</span>
              </div>
              <div className="text-lg font-black text-indigo-700 font-mono">
                ₹{calculatedTotal.toLocaleString('en-IN')}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => { setIsCreateOpen(false); setEditingStructure(null); }} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  editingStructure ? 'Save Changes' : 'Create Structure'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Counter Payment Dialog */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center space-x-2">
              <Receipt className="w-5 h-5 text-emerald-600" />
              <span>Record Counter Fee Payment</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Direct counter deposit recording with verifiable receipt generation.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRecordPayment} className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Student Name *</Label>
              <Input
                placeholder="e.g. Anandha Kumar"
                value={paymentData.student_name}
                onChange={e => setPaymentData({ ...paymentData, student_name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Roll Number *</Label>
                <Input
                  placeholder="ROLL-2026-001"
                  value={paymentData.roll_number}
                  onChange={e => setPaymentData({ ...paymentData, roll_number: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Amount Paid (₹) *</Label>
                <Input
                  type="number"
                  value={paymentData.amount_paid}
                  onChange={e => setPaymentData({ ...paymentData, amount_paid: Number(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Department</Label>
              <Select
                value={paymentData.department}
                onValueChange={(val) => setPaymentData({ ...paymentData, department: val })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
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
                <Label className="text-xs font-semibold">Payment Mode</Label>
                <Select
                  value={paymentData.payment_mode}
                  onValueChange={(val) => setPaymentData({ ...paymentData, payment_mode: val })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UPI / Online Transfer">UPI / Online Transfer</SelectItem>
                    <SelectItem value="Bank Transfer (NEFT/RTGS)">Bank Transfer (NEFT/RTGS)</SelectItem>
                    <SelectItem value="Cash Counter">Cash Counter</SelectItem>
                    <SelectItem value="Demand Draft">Demand Draft (DD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Transaction Reference</Label>
                <Input
                  value={paymentData.transaction_reference}
                  onChange={e => setPaymentData({ ...paymentData, transaction_reference: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsPaymentOpen(false)} disabled={paymentSaving}>
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={paymentSaving}>
                {paymentSaving ? 'Generating...' : 'Record Payment & Print Receipt'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Fee Structure Dialog */}
      <Dialog open={!!deletingId} onOpenChange={(open) => { if (!open) setDeletingId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-rose-600 flex items-center space-x-1.5">
              <AlertCircle className="w-4 h-4" />
              <span>Confirm Fee Structure Removal</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to remove this fee structure? Existing student receipts will remain archived.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeletingId(null)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteStructure} disabled={saving}>
              {saving ? 'Removing...' : 'Delete Structure'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Official Verifiable Receipt Modal */}
      <FeeReceiptModal
        open={receiptModalOpen}
        onOpenChange={setReceiptModalOpen}
        receipt={generatedReceipt}
      />

    </div>
  );
}
