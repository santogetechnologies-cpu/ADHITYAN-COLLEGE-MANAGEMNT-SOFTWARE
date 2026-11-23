import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  PiggyBank,
  FileText,
  AlertCircle,
  Award,
  Receipt,
  Building,
  Globe,
  Loader2,
  Plus,
  Download,
  CheckCircle,
  Bell,
  Search,
  Filter,
  RefreshCw,
  Printer,
  ArrowRightLeft,
  RotateCcw
} from 'lucide-react';
import { db } from '@/services/supabase/database';
import { StudentFee, FinanceTransaction, Profile, FeeReceipt } from '@/types/database.types';
import { useToast } from '@/hooks/use-toast';
import { FeeSetup } from '@/components/finance/FeeSetup';
import { useAuth } from '@/context/AuthContext';
import { FeeAdjustDialog, type AdjustableFee } from '@/components/finance/FeeAdjustDialog';
import { StudentRecordSearch } from '@/components/shared/StudentRecordSearch';
import { ScholarshipManager } from '@/components/finance/ScholarshipManager';
import { MiscExpensesModule } from '@/components/finance/MiscExpensesModule';
import { StudentSearchSelect } from '@/components/shared/StudentSearchSelect';
import { FeeReceiptModal } from '@/components/shared/FeeReceiptModal';
import { OFFICIAL_COURSES } from '@/constants/courses';

export default function FinanceManagerDashboard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeFinanceTab, setActiveFinanceTab] = useState<
    'overview' | 'student_fees' | 'structures' | 'expenses' | 'scholarships' | 'receipts' | 'reports'
  >('overview');

  // Core Data State
  const [studentFees, setStudentFees] = useState<StudentFee[]>([]);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [receipts, setReceipts] = useState<FeeReceipt[]>([]);

  // Dialog States
  const [collectPaymentOpen, setCollectPaymentOpen] = useState(false);
  const [adjustFee, setAdjustFee] = useState<AdjustableFee | null>(null);
  const { user: currentUser } = useAuth();
  // only these roles may configure fees, bill them, or adjust them (the server enforces the same rule)
  const canConfigureFees = currentUser?.role === 'admin' || currentUser?.role === 'finance_manager';
  const [addFeeInvoiceOpen, setAddFeeInvoiceOpen] = useState(false);
  const [payrollDialogOpen, setPayrollDialogOpen] = useState(false);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<FeeReceipt | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  // Filters State for Student Fee Ledger
  const [feeSearch, setFeeSearch] = useState('');
  const [feeCourseFilter, setFeeCourseFilter] = useState('all');
  const [feeSemesterFilter, setFeeSemesterFilter] = useState('all');
  const [feeStatusFilter, setFeeStatusFilter] = useState('all');

  // Forms
  const EMPTY_PAYMENT = {
    student_id: '',
    student_record_id: '',
    student_name: '',
    student_fee_id: '',
    amount: '',
    payment_method: 'UPI',
    reference: '',
    notes: ''
  };
  const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT);
  // One key per payment attempt: a double click / retry after a timeout returns the same receipt.
  const paymentKeyRef = useRef<string>(crypto.randomUUID());

  const [newInvoice, setNewInvoice] = useState({
    student_id: '',
    student_name: '',
    class_name: `${OFFICIAL_COURSES[0].name} - Semester 1`,
    total_due: '65000',
    due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  });

  const [refundForm, setRefundForm] = useState({
    student_id: '',
    student_name: '',
    fee_id: '',
    amount: '',
    reason: 'Fee Concession Adjustment',
    payment_method: 'Bank Transfer'
  });

  const [payrollForm, setPayrollForm] = useState({
    department: 'Teaching Faculty',
    employees: 45,
    amount: 1850000,
    type: 'salary'
  });

  const loadFinanceData = useCallback(async () => {
    try {
      const [fees, txs, studentList, rcpts] = await Promise.all([
        db.getStudentFees(),
        db.getFinanceTransactions(),
        db.getAllStudents(),
        db.getFeeReceipts()
      ]);
      setStudentFees(fees || []);
      setTransactions(txs || []);
      setStudents(studentList || []);
      setReceipts(rcpts || []);
    } catch (err) {
      console.error('Failed to load finance data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFinanceData();
  }, [loadFinanceData]);

  // Real-time synchronization
  useRealtimeSubscription({ table: 'student_fees', onChange: loadFinanceData, onReconnect: loadFinanceData });
  useRealtimeSubscription({ table: 'finance_transactions', onChange: loadFinanceData, onReconnect: loadFinanceData });
  useRealtimeSubscription({ table: 'fee_receipts', onChange: loadFinanceData, onReconnect: loadFinanceData });

  // Real financial calculations
  const totalCollected = studentFees.reduce((acc, curr) => acc + Number(curr.paid_amount || 0), 0);
  const totalOutstanding = studentFees.reduce((acc, curr) => acc + Number(curr.total_due || 0), 0);
  const totalInvoiced = totalCollected + totalOutstanding;
  const collectionPercentage = totalInvoiced > 0 ? Number(((totalCollected / totalInvoiced) * 100).toFixed(1)) : 100;

  const paidStudentsCount = studentFees.filter(f => f.status === 'paid').length;
  const pendingStudentsCount = studentFees.filter(f => f.status === 'pending' || f.status === 'partially_paid').length;
  const overdueStudentsCount = studentFees.filter(f => f.status === 'overdue').length;

  const payrollTransactions = transactions.filter(t => t.type?.toLowerCase().includes('payroll'));
  const monthlyPayrollTotal = payrollTransactions.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  const totalExpenses = transactions
    .filter(t => 
      t.type?.toLowerCase().includes('procurement') || 
      t.type?.toLowerCase().includes('maintenance') || 
      t.type?.toLowerCase().includes('payroll') ||
      t.type?.toLowerCase().includes('utilities') ||
      t.type?.toLowerCase().includes('supplies') ||
      t.type?.toLowerCase().includes('office') ||
      t.type?.toLowerCase().includes('expense') ||
      t.type?.toLowerCase().includes('refund')
    )
    .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  const totalRefunds = transactions
    .filter(t => t.type?.toLowerCase().includes('refund'))
    .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  const netBalance = Math.max(0, totalCollected - totalExpenses);

  const financialStats = [
    { 
      title: 'Total Fee Realized', 
      value: `₹${totalCollected.toLocaleString('en-IN')}`, 
      icon: DollarSign, 
      trend: `${studentFees.length} active fee accounts`, 
      positive: true 
    },
    { 
      title: 'Outstanding Dues', 
      value: `₹${totalOutstanding.toLocaleString('en-IN')}`, 
      icon: AlertCircle, 
      trend: `${pendingStudentsCount + overdueStudentsCount} pending collections`, 
      positive: overdueStudentsCount === 0 
    },
    { 
      title: 'Operating Expenses', 
      value: `₹${totalExpenses.toLocaleString('en-IN')}`, 
      icon: TrendingDown, 
      trend: `${transactions.length} ledger vouchers recorded`, 
      positive: false 
    },
    { 
      title: 'Net Cash Reserve', 
      value: `₹${netBalance.toLocaleString('en-IN')}`, 
      icon: PiggyBank, 
      trend: 'Fiscal net surplus', 
      positive: netBalance > 0 
    }
  ];

  // Filtered Student Fees
  const filteredFees = useMemo(() => {
    return studentFees.filter((fee) => {
      // Search
      const searchMatch = !feeSearch.trim() || 
        fee.student_name?.toLowerCase().includes(feeSearch.toLowerCase()) ||
        fee.class_name?.toLowerCase().includes(feeSearch.toLowerCase()) ||
        fee.student_id?.toLowerCase().includes(feeSearch.toLowerCase());

      // Course filter
      const courseMatch = feeCourseFilter === 'all' || 
        fee.class_name?.toLowerCase().includes(feeCourseFilter.toLowerCase());

      // Semester filter
      const semMatch = feeSemesterFilter === 'all' || 
        fee.class_name?.toLowerCase().includes(feeSemesterFilter.toLowerCase());

      // Status filter
      const statusMatch = feeStatusFilter === 'all' || fee.status === feeStatusFilter;

      return searchMatch && courseMatch && semMatch && statusMatch;
    });
  }, [studentFees, feeSearch, feeCourseFilter, feeSemesterFilter, feeStatusFilter]);

  // Open invoices of the student chosen in the payment dialog (total_due = outstanding balance)
  const openFeesForPayment = useMemo(
    () => studentFees.filter((f: any) =>
      Number(f.total_due) > 0 &&
      ((paymentForm.student_record_id && f.student_record_id === paymentForm.student_record_id) ||
       (paymentForm.student_id && f.student_id === paymentForm.student_id))),
    [studentFees, paymentForm.student_id, paymentForm.student_record_id]
  );
  const selectedPaymentFee: any = openFeesForPayment.find((f: any) => f.id === paymentForm.student_fee_id);
  const REFERENCE_REQUIRED = ['UPI', 'Card', 'Bank_Transfer', 'Cheque', 'Online_Gateway'];

  const openCollectDialog = (preset?: Partial<typeof EMPTY_PAYMENT>) => {
    paymentKeyRef.current = crypto.randomUUID();
    setPaymentForm({ ...EMPTY_PAYMENT, ...preset });
    setCollectPaymentOpen(true);
  };

  // Handle Record Payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const amountNum = Number(paymentForm.amount);
    const balance = Number(selectedPaymentFee?.total_due ?? 0);
    const fail = (description: string) =>
      toast({ title: 'Check the payment details', description, variant: 'destructive' });

    if (!paymentForm.student_id && !paymentForm.student_record_id) return fail('Select an enrolled student.');
    if (!selectedPaymentFee) return fail('Select the invoice this payment is for.');
    if (!Number.isFinite(amountNum) || amountNum <= 0) return fail('Enter an amount greater than zero.');
    if (amountNum > balance) return fail(`Amount cannot exceed the outstanding balance of ₹${balance.toLocaleString('en-IN')}.`);
    if (REFERENCE_REQUIRED.includes(paymentForm.payment_method) && paymentForm.reference.trim().length < 4) {
      return fail('Enter the transaction / cheque reference (at least 4 characters).');
    }

    setSubmitting(true);
    try {
      const res = await db.recordFeePayment({
        studentId: paymentForm.student_id,
        studentName: paymentForm.student_name,
        studentFeeId: paymentForm.student_fee_id,
        amount: amountNum,
        paymentMethod: paymentForm.payment_method as any,
        reference: paymentForm.reference.trim() || undefined,
        notes: paymentForm.notes.trim() || undefined,
        idempotencyKey: paymentKeyRef.current,
      });
      if (res.success) {
        toast({
          title: res.duplicate ? 'Payment already recorded' : 'Payment recorded',
          description: res.duplicate
            ? 'This payment was already saved earlier; no second charge was made.'
            : `₹${amountNum.toLocaleString('en-IN')} received from ${paymentForm.student_name}. Receipt issued.`,
        });
        setCollectPaymentOpen(false);
        setPaymentForm(EMPTY_PAYMENT);
        paymentKeyRef.current = crypto.randomUUID();
        loadFinanceData();
        if (res.receipt) {
          setSelectedReceipt(res.receipt);
          setReceiptModalOpen(true);
        }
      } else {
        // keep the dialog and the same key: the user can fix the input and retry safely
        toast({ title: 'Payment not recorded', description: res.error, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateFeeInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const dueNum = Number(newInvoice.total_due);
    if (!newInvoice.student_name.trim() || isNaN(dueNum) || dueNum <= 0) {
      toast({ title: 'Validation Error', description: 'Please fill student name and due amount.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const created = await db.createStudentFee({
        student_id: newInvoice.student_id || undefined,
        student_name: newInvoice.student_name,
        class_name: newInvoice.class_name,
        total_due: dueNum,
        paid_amount: 0,
        due_date: newInvoice.due_date,
        status: 'pending'
      });
      if (created) {
        toast({ title: 'Fee Invoice Created', description: `Invoice of ₹${dueNum.toLocaleString('en-IN')} created for ${created.student_name}.` });
        setAddFeeInvoiceOpen(false);
        setNewInvoice({
          student_id: '',
          student_name: '',
          class_name: `${OFFICIAL_COURSES[0].name} - Semester 1`,
          total_due: '65000',
          due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
        });
        loadFinanceData();
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Process Refund
  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    const refundNum = Number(refundForm.amount);
    if (!refundForm.student_name.trim() || isNaN(refundNum) || refundNum <= 0) {
      toast({ title: 'Validation Error', description: 'Please fill student and refund amount.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await db.processFeeRefund({
        studentId: refundForm.student_id,
        studentName: refundForm.student_name,
        feeId: refundForm.fee_id || undefined,
        amount: refundNum,
        reason: refundForm.reason,
        paymentMethod: refundForm.payment_method
      });
      if (res.success) {
        toast({ title: 'Refund Processed', description: `₹${refundNum.toLocaleString('en-IN')} refund recorded for ${refundForm.student_name}.` });
        setRefundDialogOpen(false);
        setRefundForm({ student_id: '', student_name: '', fee_id: '', amount: '', reason: 'Fee Concession Adjustment', payment_method: 'Bank Transfer' });
        loadFinanceData();
      } else {
        toast({ title: 'Refund Failed', description: res.error, variant: 'destructive' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Send Reminder
  const handleSendReminder = async (fee: StudentFee) => {
    try {
      const ok = await db.sendFeeReminder({
        feeId: fee.id,
        studentId: fee.student_id,
        studentName: fee.student_name,
        amountDue: Number(fee.total_due),
        dueDate: fee.due_date
      });
      if (ok) {
        toast({ 
          title: 'Reminder Dispatched', 
          description: `Fee payment alert dispatched to ${fee.student_name} and linked parent for ₹${Number(fee.total_due).toLocaleString('en-IN')}.` 
        });
        loadFinanceData();
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  // Handle Disburse Payroll
  const handleDisbursePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const ok = await db.processPayrollDisbursement({
        department: payrollForm.department,
        amount: Number(payrollForm.amount),
        employeesCount: Number(payrollForm.employees),
        type: payrollForm.type
      });
      if (ok) {
        toast({ 
          title: 'Payroll Disbursed', 
          description: `Disbursed ₹${Number(payrollForm.amount).toLocaleString('en-IN')} to ${payrollForm.employees} employees in ${payrollForm.department}.` 
        });
        setPayrollDialogOpen(false);
        loadFinanceData();
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // CSV Audit Export
  const handleExportCSV = () => {
    if (studentFees.length === 0 && transactions.length === 0) {
      toast({ title: 'No Data', description: 'No financial records available for audit export.' });
      return;
    }
    const headers = ['Student Name', 'Class / Course', 'Total Due (INR)', 'Paid Amount (INR)', 'Due Date', 'Status'];
    const rows = studentFees.map(f => [
      `"${f.student_name}"`,
      `"${f.class_name}"`,
      f.total_due,
      f.paid_amount,
      `"${f.due_date}"`,
      `"${f.status}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Finance_Audit_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Audit Exported', description: 'Financial ledger successfully downloaded.' });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 border border-slate-200 rounded-2xl shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Institutional Finance Hub</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time fee collections, student accounts, verifiable receipts & institutional fiscal accounting
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-8 text-xs">
            <Download className="h-3.5 w-3.5 mr-1.5" />
            CSV Ledger
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPayrollDialogOpen(true)} className="h-8 text-xs">
            <Users className="h-3.5 w-3.5 mr-1.5 text-blue-600" />
            Disburse Payroll
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAddFeeInvoiceOpen(true)} className="h-8 text-xs font-semibold">
            <Plus className="h-3.5 w-3.5 mr-1.5 text-purple-600" />
            Issue Invoice
          </Button>
          <Button size="sm" onClick={() => openCollectDialog()} className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs">
            <CreditCard className="h-3.5 w-3.5 mr-1.5" />
            Collect Fee Payment
          </Button>
        </div>
      </div>

      {/* Finance Portal Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border pb-3">
        <Button
          size="sm"
          variant={activeFinanceTab === 'overview' ? 'default' : 'outline'}
          onClick={() => setActiveFinanceTab('overview')}
          className="text-xs font-bold"
        >
          Overview & Telemetry
        </Button>
        <Button
          size="sm"
          variant={activeFinanceTab === 'student_fees' ? 'default' : 'outline'}
          onClick={() => setActiveFinanceTab('student_fees')}
          className="text-xs font-bold"
        >
          Student Fee Accounts ({studentFees.length})
        </Button>
        {canConfigureFees && (
          <Button
            size="sm"
            variant={activeFinanceTab === 'structures' ? 'default' : 'outline'}
            onClick={() => setActiveFinanceTab('structures')}
            className="text-xs font-bold"
          >
            Fee Setup
          </Button>
        )}
        <Button
          size="sm"
          variant={activeFinanceTab === 'expenses' ? 'default' : 'outline'}
          onClick={() => setActiveFinanceTab('expenses')}
          className="text-xs font-bold"
        >
          Expenses & Vouchers
        </Button>
        <Button
          size="sm"
          variant={activeFinanceTab === 'scholarships' ? 'default' : 'outline'}
          onClick={() => setActiveFinanceTab('scholarships')}
          className="text-xs font-bold"
        >
          Scholarships & Waivers
        </Button>
        <Button
          size="sm"
          variant={activeFinanceTab === 'receipts' ? 'default' : 'outline'}
          onClick={() => setActiveFinanceTab('receipts')}
          className="text-xs font-bold"
        >
          Official Receipts ({receipts.length})
        </Button>
        <Button
          size="sm"
          variant={activeFinanceTab === 'reports' ? 'default' : 'outline'}
          onClick={() => setActiveFinanceTab('reports')}
          className="text-xs font-bold"
        >
          Financial Reports
        </Button>
      </div>

      {/* 1. OVERVIEW TAB */}
      {activeFinanceTab === 'overview' && (
        <div className="space-y-6">
          {/* Financial Statistics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {financialStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.title} className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-bold text-slate-600">
                      {stat.title}
                    </CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-black text-slate-900">
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : stat.value}
                    </div>
                    <p className={`text-xs flex items-center gap-1 mt-1 font-semibold ${
                      stat.positive ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      {stat.positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {stat.trend}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Fee Collection Progress */}
            <Card className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                  <CreditCard className="h-4 w-4 text-[#1D61E7]" />
                  Fee Collection Recovery
                </CardTitle>
                <CardDescription className="text-xs">
                  Realized collections vs outstanding student fee demand
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Total Invoiced: ₹{totalInvoiced.toLocaleString('en-IN')}</span>
                    <span className="font-bold text-emerald-600">Collected: ₹{totalCollected.toLocaleString('en-IN')}</span>
                  </div>
                  <Progress value={collectionPercentage} className="h-2.5" />
                  <p className="text-[11px] text-slate-500">
                    {collectionPercentage}% of target collected to date
                  </p>
                </div>
                
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="text-center p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <div className="text-lg font-black text-emerald-700">{paidStudentsCount}</div>
                    <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Paid Accounts</div>
                  </div>
                  <div className="text-center p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <div className="text-lg font-black text-amber-700">{pendingStudentsCount}</div>
                    <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Pending Dues</div>
                  </div>
                  <div className="text-center p-3 bg-rose-50 rounded-xl border border-rose-200">
                    <div className="text-lg font-black text-rose-700">{overdueStudentsCount}</div>
                    <div className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Overdue Dues</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Income vs Expenses Cash Flow */}
            <Card className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                  <Globe className="h-4 w-4 text-emerald-600" />
                  Operating Cash Flow & Reserves
                </CardTitle>
                <CardDescription className="text-xs">
                  Direct ledger revenues vs operating expenses
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-[10px] uppercase font-bold text-emerald-700">Total Realized Revenue</span>
                    <div className="text-xl font-black text-emerald-800 mt-0.5">₹{totalCollected.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                    <span className="text-[10px] uppercase font-bold text-rose-700">Total Expenses & Vouchers</span>
                    <div className="text-xl font-black text-rose-800 mt-0.5">₹{totalExpenses.toLocaleString('en-IN')}</div>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b text-slate-600">
                    <span>Staff Payroll Disbursed</span>
                    <span className="font-bold text-slate-900">₹{monthlyPayrollTotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b text-slate-600">
                    <span>Student Concessions & Refunds</span>
                    <span className="font-bold text-slate-900">₹{totalRefunds.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between py-1 text-slate-600">
                    <span>Operating Cash Reserve</span>
                    <span className="font-black text-emerald-600">₹{netBalance.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => setActiveFinanceTab('student_fees')}>
                    View Student Fee Accounts
                  </Button>
                  <Button size="sm" className="flex-1 text-xs font-bold bg-[#1D61E7] text-white" onClick={() => setActiveFinanceTab('reports')}>
                    Detailed Reports
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Financial Transactions Feed */}
          <Card className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">Recent Institutional Ledger Transactions</CardTitle>
                <CardDescription className="text-xs">Live entries from student fee payments, expenses, and payroll</CardDescription>
              </div>
              <Button size="sm" variant="ghost" onClick={loadFinanceData} className="h-7 text-xs">
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">No ledger transactions logged yet.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {transactions.slice(0, 6).map((tx) => (
                    <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                          tx.type?.toLowerCase().includes('fee') ? 'bg-emerald-50 text-emerald-600' :
                          tx.type?.toLowerCase().includes('refund') ? 'bg-amber-50 text-amber-600' :
                          'bg-blue-50 text-blue-600'
                        }`}>
                          {tx.type?.toLowerCase().includes('fee') ? <DollarSign className="w-4 h-4" /> : <Receipt className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{tx.type} — {tx.description || tx.department || 'General'}</div>
                          <div className="text-[10px] text-slate-400">
                            {tx.department} • {tx.created_at ? new Date(tx.created_at).toLocaleDateString('en-IN') : 'Today'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`font-black ${
                          tx.type?.toLowerCase().includes('fee') ? 'text-emerald-600' : 'text-slate-900'
                        }`}>
                          {tx.type?.toLowerCase().includes('fee') ? '+' : '-'}₹{Number(tx.amount).toLocaleString('en-IN')}
                        </span>
                        <div className="text-[10px]">
                          <Badge variant="outline" className="text-[9px] font-bold capitalize">
                            {tx.status || 'Approved'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 2. STUDENT FEES TAB */}
      {activeFinanceTab === 'student_fees' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1 flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <Input
                    placeholder="Search by Student ID, Name or Class..."
                    value={feeSearch}
                    onChange={(e) => setFeeSearch(e.target.value)}
                    className="pl-8 h-8 text-xs rounded-xl"
                  />
                </div>
                <Select value={feeCourseFilter} onValueChange={setFeeCourseFilter}>
                  <SelectTrigger className="w-[180px] h-8 text-xs rounded-xl"><SelectValue placeholder="All Courses" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    {OFFICIAL_COURSES.map(c => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={feeSemesterFilter} onValueChange={setFeeSemesterFilter}>
                  <SelectTrigger className="w-[130px] h-8 text-xs rounded-xl"><SelectValue placeholder="All Semesters" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Semesters</SelectItem>
                    {[1, 2, 3, 4, 5, 6].map(sem => (
                      <SelectItem key={sem} value={`Semester ${sem}`}>Semester {sem}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={feeStatusFilter} onValueChange={setFeeStatusFilter}>
                  <SelectTrigger className="w-[130px] h-8 text-xs rounded-xl"><SelectValue placeholder="All Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="partially_paid">Partially Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Button size="sm" onClick={() => setAddFeeInvoiceOpen(true)} className="h-8 text-xs">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Single Invoice
                </Button>
                <Button size="sm" onClick={() => openCollectDialog()} className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
                  <CreditCard className="w-3.5 h-3.5 mr-1" /> Collect Payment
                </Button>
              </div>
            </div>
          </div>

          {/* Student Fees Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3">Student & ID</th>
                    <th className="p-3">Program / Semester</th>
                    <th className="p-3">Total Invoiced</th>
                    <th className="p-3">Paid Amount</th>
                    <th className="p-3">Balance Due</th>
                    <th className="p-3">Due Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFees.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        No student fee records found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredFees.map((fee) => {
                      const matchedStudent = students.find(s => s.id === fee.student_id);
                      const displayId = fee.student_code || matchedStudent?.student_id || matchedStudent?.roll_number || '—';

                      return (
                        <tr key={fee.id} className="hover:bg-slate-50/50">
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{fee.student_name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{displayId}</div>
                          </td>
                          <td className="p-3 text-slate-700 font-medium">
                            {fee.class_name}
                            {fee.description && <div className="text-[10px] text-slate-500 font-normal">{fee.description}{fee.term_label ? ` · ${fee.term_label}` : ''}</div>}
                          </td>
                          <td className="p-3 font-semibold text-slate-800">
                            ₹{(Number(fee.total_due) + Number(fee.paid_amount)).toLocaleString('en-IN')}
                          </td>
                          <td className="p-3 font-bold text-emerald-600">
                            ₹{Number(fee.paid_amount).toLocaleString('en-IN')}
                          </td>
                          <td className="p-3 font-bold text-rose-600">
                            ₹{Number(fee.total_due).toLocaleString('en-IN')}
                          </td>
                          <td className="p-3 text-slate-500 font-mono text-[11px]">
                            {fee.due_date}
                          </td>
                          <td className="p-3">
                            <Badge
                              variant={
                                fee.status === 'paid' ? 'default' :
                                fee.status === 'overdue' ? 'destructive' :
                                fee.status === 'partially_paid' ? 'outline' : 'secondary'
                              }
                              className={`text-[10px] font-bold capitalize ${
                                fee.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                fee.status === 'partially_paid' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                fee.status === 'waived' || fee.status === 'cancelled' ? 'bg-zinc-100 text-zinc-600 border-zinc-200' : ''
                              }`}
                            >
                              {fee.status?.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="p-3 text-right space-x-1">
                            {fee.status !== 'paid' && fee.status !== 'cancelled' && fee.status !== 'waived' && (
                              <>
                                <Button
                                  size="sm"
                                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg"
                                  onClick={() => openCollectDialog({
                                    student_id: fee.student_id || '',
                                    student_record_id: fee.student_record_id || '',
                                    student_name: fee.student_name,
                                    student_fee_id: fee.id,
                                    amount: String(fee.total_due),
                                  })}
                                >
                                  Collect
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs text-amber-600 border-amber-200 hover:bg-amber-50 rounded-lg"
                                  onClick={() => handleSendReminder(fee)}
                                >
                                  <Bell className="w-3 h-3 mr-1" /> Remind
                                </Button>
                                {canConfigureFees && (
                                  <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg" onClick={() => setAdjustFee(fee)}>
                                    Adjust
                                  </Button>
                                )}
                              </>
                            )}

                            {Number(fee.paid_amount) > 0 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-rose-600 hover:bg-rose-50"
                                onClick={() => {
                                  setRefundForm({
                                    student_id: fee.student_id || '',
                                    student_name: fee.student_name,
                                    fee_id: fee.id,
                                    amount: String(Math.min(10000, Number(fee.paid_amount))),
                                    reason: 'Fee Concession Adjustment',
                                    payment_method: 'Bank Transfer'
                                  });
                                  setRefundDialogOpen(true);
                                }}
                              >
                                <RotateCcw className="w-3 h-3 mr-1" /> Refund
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => {
                                // Match official fee receipt if exists or construct temporary view
                                const existingReceipt = receipts.find(r => r.student_id === fee.student_id);
                                if (existingReceipt) {
                                  setSelectedReceipt(existingReceipt);
                                  setReceiptModalOpen(true);
                                } else {
                                  // Construct receipt object for viewing
                                  const previewReceipt: FeeReceipt = {
                                    id: fee.id,
                                    receipt_number: `REC-${fee.id.slice(0, 8).toUpperCase()}`,
                                    student_id: fee.student_id,
                                    student_name: fee.student_name,
                                    roll_number: displayId,
                                    department: fee.class_name,
                                    academic_year: '2026-2027',
                                    semester: fee.class_name,
                                    fee_type: 'Tuition & Academic Composite Fee',
                                    gross_amount: Number(fee.total_due) + Number(fee.paid_amount),
                                    discount_applied: 0,
                                    amount_paid: Number(fee.paid_amount),
                                    balance_remaining: Number(fee.total_due),
                                    payment_mode: 'Verified Counter / Online',
                                    transaction_reference: `TXN-${fee.id.slice(0, 8)}`,
                                    payment_date: fee.created_at,
                                    qr_verification_token: `QR-AIP-${fee.id.slice(0, 6)}`,
                                    created_at: fee.created_at
                                  };
                                  setSelectedReceipt(previewReceipt);
                                  setReceiptModalOpen(true);
                                }
                              }}
                            >
                              <Receipt className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. FEE STRUCTURES TAB */}
      {activeFinanceTab === 'structures' && canConfigureFees && (
        <FeeSetup />
      )}

      {/* 4. EXPENSES TAB */}
      {activeFinanceTab === 'expenses' && (
        <MiscExpensesModule />
      )}

      {/* 5. SCHOLARSHIPS TAB */}
      {activeFinanceTab === 'scholarships' && (
        <ScholarshipManager />
      )}

      {/* 6. RECEIPTS & AUDIT TAB */}
      {activeFinanceTab === 'receipts' && (
        <div className="space-y-4">
          <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-2xs flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Official Institutional Receipts Ledger</h3>
              <p className="text-xs text-slate-500">Verifiable fee receipts with cryptographic QR tokens and timestamp audit records</p>
            </div>
            <Button size="sm" variant="outline" onClick={handleExportCSV} className="h-8 text-xs">
              <Download className="w-3.5 h-3.5 mr-1.5" /> Export Receipts CSV
            </Button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3">Receipt No</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Course / Dept</th>
                    <th className="p-3">Payment Mode</th>
                    <th className="p-3">Amount Paid</th>
                    <th className="p-3">Payment Date</th>
                    <th className="p-3">QR Token</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {receipts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        No receipts issued yet. When payments are recorded, official receipts will appear here.
                      </td>
                    </tr>
                  ) : (
                    receipts.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono font-bold text-[#1D61E7]">
                          {r.receipt_number}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{r.student_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{r.roll_number}</div>
                        </td>
                        <td className="p-3 text-slate-600">{r.department}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px] font-bold">
                            {r.payment_mode}
                          </Badge>
                        </td>
                        <td className="p-3 font-extrabold text-emerald-600">
                          ₹{Number(r.amount_paid).toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-slate-500 font-mono text-[11px]">
                          {new Date(r.payment_date).toLocaleDateString('en-IN')}
                        </td>
                        <td className="p-3 font-mono text-[10px] text-slate-400">
                          {r.qr_verification_token?.slice(0, 14)}...
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs font-semibold"
                            onClick={() => {
                              setSelectedReceipt(r);
                              setReceiptModalOpen(true);
                            }}
                          >
                            <Printer className="w-3.5 h-3.5 mr-1 text-[#1D61E7]" /> View & Print
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 7. FINANCIAL REPORTS TAB */}
      {activeFinanceTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Financial Reports & Institutional Analytics</h3>
              <p className="text-xs text-slate-500">Program-wise revenue recovery, defaulters list, and budget statements</p>
            </div>
            <div className="flex items-center space-x-2">
              <Button size="sm" variant="outline" onClick={() => window.print()} className="h-8 text-xs">
                <Printer className="w-3.5 h-3.5 mr-1.5" /> Print Statement
              </Button>
              <Button size="sm" onClick={handleExportCSV} className="h-8 text-xs font-bold bg-[#1D61E7] text-white">
                <Download className="w-3.5 h-3.5 mr-1.5" /> Export Full Report
              </Button>
            </div>
          </div>

          {/* Program-wise Collection Recovery Matrix */}
          <Card className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-900">Program-Wise Fee Recovery Matrix</CardTitle>
              <CardDescription className="text-xs">Breakdown of collections and outstanding dues across official paramedical programs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="p-3">Academic Program</th>
                      <th className="p-3">Tracked Accounts</th>
                      <th className="p-3">Total Invoiced</th>
                      <th className="p-3">Amount Realized</th>
                      <th className="p-3">Outstanding Dues</th>
                      <th className="p-3">Recovery %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {OFFICIAL_COURSES.map((course) => {
                      const courseFees = studentFees.filter(f => f.class_name?.toLowerCase().includes(course.name.toLowerCase()));
                      const cInvoiced = courseFees.reduce((sum, f) => sum + Number(f.total_due) + Number(f.paid_amount), 0);
                      const cPaid = courseFees.reduce((sum, f) => sum + Number(f.paid_amount), 0);
                      const cDue = courseFees.reduce((sum, f) => sum + Number(f.total_due), 0);
                      const cPct = cInvoiced > 0 ? Math.round((cPaid / cInvoiced) * 100) : 100;

                      return (
                        <tr key={course.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-bold text-slate-900">{course.name}</td>
                          <td className="p-3 text-slate-600 font-semibold">{courseFees.length}</td>
                          <td className="p-3 font-semibold text-slate-800">₹{cInvoiced.toLocaleString('en-IN')}</td>
                          <td className="p-3 font-bold text-emerald-600">₹{cPaid.toLocaleString('en-IN')}</td>
                          <td className="p-3 font-bold text-rose-600">₹{cDue.toLocaleString('en-IN')}</td>
                          <td className="p-3">
                            <div className="flex items-center space-x-2">
                              <Progress value={cPct} className="w-16 h-2" />
                              <span className="font-bold text-slate-700">{cPct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Collect Fee Payment Dialog */}
      <Dialog open={collectPaymentOpen} onOpenChange={setCollectPaymentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              Record Student Fee Payment
            </DialogTitle>
            <DialogDescription className="text-xs">
              Record fee collection via Cash, UPI, Card, Net Banking or Cheque
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRecordPayment} className="space-y-3.5 text-xs">
            <div>
              <Label className="text-xs font-bold">Select Enrolled Student *</Label>
              <StudentRecordSearch
                key={paymentForm.student_record_id || paymentForm.student_id || 'none'}
                selectedLabel={paymentForm.student_name || undefined}
                onSelect={(st) => {
                  setPaymentForm(prev => ({
                    ...prev,
                    student_id: st?.user_id || '',
                    student_record_id: st?.id || '',
                    student_name: st?.name || '',
                    student_fee_id: '',
                    amount: '',
                  }));
                }}
                placeholder="Search by student ID or name…"
              />
            </div>
            <div>
              <Label className="text-xs font-bold">Invoice *</Label>
              <Select
                value={paymentForm.student_fee_id}
                onValueChange={(id) => {
                  const f: any = openFeesForPayment.find((x: any) => x.id === id);
                  setPaymentForm(prev => ({ ...prev, student_fee_id: id, amount: f ? String(f.total_due) : prev.amount }));
                }}
                disabled={!paymentForm.student_id || openFeesForPayment.length === 0}
              >
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue placeholder={
                    !paymentForm.student_id ? 'Select a student first'
                      : openFeesForPayment.length === 0 ? 'No outstanding invoices' : 'Select invoice'
                  } />
                </SelectTrigger>
                <SelectContent>
                  {openFeesForPayment.map((f: any) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.class_name || 'Fee'} · due ₹{Number(f.total_due).toLocaleString('en-IN')}
                      {f.due_date ? ` · by ${f.due_date}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {paymentForm.student_id && openFeesForPayment.length === 0 && (
                <p className="text-[11px] text-slate-500 mt-1">This student has nothing outstanding. Issue an invoice first.</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Amount (INR) *</Label>
                <Input
                  type="number"
                  min="1"
                  max={selectedPaymentFee ? Number(selectedPaymentFee.total_due) : undefined}
                  step="0.01"
                  placeholder="e.g. 25000"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="h-8 text-xs mt-1"
                  required
                />
                {selectedPaymentFee && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Outstanding: ₹{Number(selectedPaymentFee.total_due).toLocaleString('en-IN')}
                  </p>
                )}
              </div>
              <div>
                <Label className="text-xs font-bold">Payment Method</Label>
                <Select
                  value={paymentForm.payment_method}
                  onValueChange={(val) => setPaymentForm({ ...paymentForm, payment_method: val })}
                >
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash (accounts desk)</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="Card">Debit / Credit card</SelectItem>
                    <SelectItem value="Bank_Transfer">Bank transfer (NEFT / RTGS / IMPS)</SelectItem>
                    <SelectItem value="Cheque">Cheque / Demand draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs font-bold">
                Transaction / cheque reference{REFERENCE_REQUIRED.includes(paymentForm.payment_method) ? ' *' : ' (optional)'}
              </Label>
              <Input
                placeholder="UPI ref, card approval code, UTR or cheque no."
                value={paymentForm.reference}
                onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                className="h-8 text-xs mt-1"
                maxLength={64}
              />
            </div>
            <div>
              <Label className="text-xs font-bold">Remarks (optional)</Label>
              <Input
                placeholder="Shown on the ledger entry"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                className="h-8 text-xs mt-1"
                maxLength={200}
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setCollectPaymentOpen(false)} className="h-8 text-xs">Cancel</Button>
              <Button type="submit" size="sm" disabled={submitting || !paymentForm.student_fee_id} className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Confirm Payment & Issue Receipt
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <FeeAdjustDialog fee={adjustFee} onOpenChange={(o) => { if (!o) setAdjustFee(null); }} onDone={loadFinanceData} />

      {/* Issue Fee Invoice Dialog */}
      <Dialog open={addFeeInvoiceOpen} onOpenChange={setAddFeeInvoiceOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Plus className="w-5 h-5 text-purple-600" />
              Issue Student Fee Invoice
            </DialogTitle>
            <DialogDescription className="text-xs">
              Generate academic fee demand for a specific enrolled student
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateFeeInvoice} className="space-y-3.5 text-xs">
            <div>
              <Label className="text-xs font-bold">Select Enrolled Student *</Label>
              <StudentSearchSelect
                value={newInvoice.student_id}
                onSelect={(st) => {
                  setNewInvoice(prev => ({
                    ...prev,
                    student_id: st?.id || '',
                    student_name: st?.name || '',
                    class_name: st?.class_name || st?.department || prev.class_name,
                  }));
                }}
                placeholder="Search by AIP Student ID or Name..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Program / Semester</Label>
                <Select
                  value={newInvoice.class_name}
                  onValueChange={(val) => setNewInvoice({ ...newInvoice, class_name: val })}
                >
                  <SelectTrigger className="h-8 text-xs mt-1">
                    <SelectValue placeholder="Select Course & Semester" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {OFFICIAL_COURSES.flatMap(c => 
                      [1, 2, 3, 4, 5, 6].map(sem => (
                        <SelectItem key={`${c.name}-Sem${sem}`} value={`${c.name} - Semester ${sem}`}>
                          {c.name} - Semester {sem}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-bold">Total Due (INR) *</Label>
                <Input
                  type="number"
                  min="1"
                  value={newInvoice.total_due}
                  onChange={(e) => setNewInvoice({ ...newInvoice, total_due: e.target.value })}
                  className="h-8 text-xs mt-1"
                  required
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-bold">Due Date</Label>
              <Input
                type="date"
                value={newInvoice.due_date}
                onChange={(e) => setNewInvoice({ ...newInvoice, due_date: e.target.value })}
                className="h-8 text-xs mt-1"
                required
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setAddFeeInvoiceOpen(false)} className="h-8 text-xs">Cancel</Button>
              <Button type="submit" size="sm" disabled={submitting || !newInvoice.student_name} className="h-8 text-xs font-bold bg-[#1D61E7] text-white">
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Generate Invoice
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Process Refund Dialog */}
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-rose-600" />
              Process Student Fee Refund
            </DialogTitle>
            <DialogDescription className="text-xs">
              Issue an authorized fee refund and record corresponding financial ledger entries
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleProcessRefund} className="space-y-3.5 text-xs">
            <div className="p-3 bg-slate-50 border rounded-xl space-y-1">
              <div className="font-bold text-slate-800">Student: {refundForm.student_name}</div>
              <div className="text-slate-500">Student ID: {refundForm.student_id}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Refund Amount (INR) *</Label>
                <Input
                  type="number"
                  min="1"
                  value={refundForm.amount}
                  onChange={(e) => setRefundForm({ ...refundForm, amount: e.target.value })}
                  className="h-8 text-xs mt-1"
                  required
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Disbursement Mode</Label>
                <Select 
                  value={refundForm.payment_method} 
                  onValueChange={(val) => setRefundForm({ ...refundForm, payment_method: val })}
                >
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bank Transfer">Bank Transfer / NEFT</SelectItem>
                    <SelectItem value="UPI">UPI Return</SelectItem>
                    <SelectItem value="Cheque">Cheque Refund</SelectItem>
                    <SelectItem value="Cash">Cash Return</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs font-bold">Reason for Refund *</Label>
              <Input
                value={refundForm.reason}
                onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })}
                placeholder="e.g. Scholarship waiver adjustment / Duplicate payment"
                className="h-8 text-xs mt-1"
                required
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setRefundDialogOpen(false)} className="h-8 text-xs">Cancel</Button>
              <Button type="submit" size="sm" disabled={submitting || !refundForm.amount} className="h-8 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white">
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Authorize Refund
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Disburse Payroll Dialog */}
      <Dialog open={payrollDialogOpen} onOpenChange={setPayrollDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Disburse Monthly Staff Payroll
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDisbursePayroll} className="space-y-3.5 text-xs">
            <div>
              <Label className="text-xs font-bold">Staff Department</Label>
              <Select 
                value={payrollForm.department} 
                onValueChange={(val) => setPayrollForm({ ...payrollForm, department: val })}
              >
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Teaching Faculty">Teaching Faculty</SelectItem>
                  <SelectItem value="Administrative Staff">Administrative Staff</SelectItem>
                  <SelectItem value="Support Staff & Transport Drivers">Support Staff & Transport Drivers</SelectItem>
                  <SelectItem value="Guest Lecturers">Guest & Clinical Faculty</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Staff Count</Label>
                <Input
                  type="number"
                  min="1"
                  value={payrollForm.employees}
                  onChange={(e) => setPayrollForm({ ...payrollForm, employees: Number(e.target.value) })}
                  className="h-8 text-xs mt-1"
                  required
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Total Amount (INR)</Label>
                <Input
                  type="number"
                  min="1000"
                  value={payrollForm.amount}
                  onChange={(e) => setPayrollForm({ ...payrollForm, amount: Number(e.target.value) })}
                  className="h-8 text-xs mt-1"
                  required
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setPayrollDialogOpen(false)} className="h-8 text-xs">Cancel</Button>
              <Button type="submit" size="sm" disabled={submitting} className="h-8 text-xs font-bold bg-[#1D61E7] text-white">
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Authorize & Disburse
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Official Verifiable Receipt Modal */}
      <FeeReceiptModal
        open={receiptModalOpen}
        onOpenChange={setReceiptModalOpen}
        receipt={selectedReceipt}
      />
    </div>
  );
}
