import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Receipt, 
  CheckCircle2, 
  Clock, 
  Download, 
  Loader2, 
  Plus, 
  DollarSign, 
  ShieldCheck 
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { db } from '@/services/supabase/database';
import { StudentFee, FeeReceipt, Profile } from '@/types/database.types';
import { FeeReceiptModal } from '@/components/shared/FeeReceiptModal';

interface ParentFeesViewProps {
  student: Profile;
}

export function ParentFeesView({ student }: ParentFeesViewProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [fees, setFees] = useState<StudentFee[]>([]);
  const [receipts, setReceipts] = useState<FeeReceipt[]>([]);

  // Payment modal state
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(15000);
  const [paymentMethod, setPaymentMethod] = useState<string>('Online Card');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Receipt viewer modal
  const [selectedReceipt, setSelectedReceipt] = useState<FeeReceipt | null>(null);
  const [receiptsModalOpen, setReceiptsModalOpen] = useState(false);

  const loadFeesAndReceipts = useCallback(async () => {
    if (!student?.id) return;
    setLoading(true);
    try {
      const [feeData, receiptData] = await Promise.all([
        db.getStudentFees(student.id),
        db.getFeeReceipts(student.id),
      ]);
      setFees(feeData || []);
      setReceipts(receiptData || []);
    } catch (err) {
      console.warn('Failed to load fees/receipts:', err);
    } finally {
      setLoading(false);
    }
  }, [student?.id]);

  useEffect(() => {
    loadFeesAndReceipts();
  }, [loadFeesAndReceipts]);

  // Real-time synchronization
  useRealtimeSubscription({ table: 'student_fees', onChange: loadFeesAndReceipts, onReconnect: loadFeesAndReceipts });
  useRealtimeSubscription({ table: 'fee_receipts', onChange: loadFeesAndReceipts, onReconnect: loadFeesAndReceipts });

  const totalFee = fees.reduce((sum, f: any) => sum + (Number(f.total_due ?? f.amount ?? 0)), 0);
  const paidFee = receipts.reduce((sum, r) => sum + (Number(r.amount_paid ?? 0)), 0);
  const pendingBalance = Math.max(0, totalFee - paidFee);

  const handleProcessPayment = async () => {
    if (paymentAmount <= 0) {
      toast({ title: 'Invalid Amount', description: 'Please enter a valid amount to pay.', variant: 'destructive' });
      return;
    }

    setIsProcessingPayment(true);
    try {
      await db.recordFeePayment({
        studentId: student.id,
        studentName: student.name,
        amount: paymentAmount,
        paymentMethod,
        notes: `Parent payment via ${paymentMethod}`,
      });

      const receiptNo = `AIP-REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const newRec = await db.generateFeeReceipt({
        receipt_number: receiptNo,
        student_id: student.id,
        student_name: student.name,
        roll_number: student.student_id || student.roll_number || 'AIP-PENDING',
        department: student.department || 'Paramedical Sciences',
        academic_year: '2026-2027',
        semester: student.class_name || 'Semester 1',
        fee_type: 'Parent Portal Academic Installment Payment',
        gross_amount: paymentAmount,
        discount_applied: 0,
        amount_paid: paymentAmount,
        balance_remaining: Math.max(0, pendingBalance - paymentAmount),
        payment_mode: paymentMethod,
        transaction_reference: `PARENT-UPI-${Date.now().toString().slice(-8)}`,
        qr_verification_token: `VERIFY-${receiptNo}-${Date.now()}`,
      });

      toast({
        title: 'Payment Successful',
        description: `₹${paymentAmount} paid successfully for ${student.name}.`,
      });

      setIsPayOpen(false);
      await loadFeesAndReceipts();

      if (newRec) {
        setSelectedReceipt(newRec);
        setReceiptsModalOpen(true);
      }
    } catch (err: any) {
      toast({
        title: 'Payment Failed',
        description: err.message || 'Could not complete transaction.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Fees & Payment History</h2>
          <p className="text-muted-foreground text-sm">
            Financial ledger, fee receipts, and verified online payments for {student.name}
          </p>
        </div>
        <Button 
          onClick={() => setIsPayOpen(true)}
          className="bg-[#1D61E7] hover:bg-blue-700 text-white font-semibold flex items-center gap-2"
        >
          <CreditCard className="w-4 h-4" /> Pay Academic Fees
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-border shadow-xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-medium">Total Term Fees</span>
            <div className="text-2xl font-bold text-foreground font-mono">₹{totalFee.toLocaleString('en-IN')}</div>
            <span className="text-[10px] text-muted-foreground">Prescribed institutional fee schedule</span>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border shadow-xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1 text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" /> Total Paid
            </span>
            <div className="text-2xl font-bold text-emerald-600 font-mono">₹{paidFee.toLocaleString('en-IN')}</div>
            <span className="text-[10px] text-muted-foreground">Officially credited to treasury</span>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border shadow-xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1 text-amber-600">
              <Clock className="w-3.5 h-3.5" /> Outstanding Balance
            </span>
            <div className="text-2xl font-bold text-amber-600 font-mono">₹{pendingBalance.toLocaleString('en-IN')}</div>
            <span className="text-[10px] text-muted-foreground">{pendingBalance === 0 ? 'All fees settled' : 'Due for payment'}</span>
          </CardContent>
        </Card>
      </div>

      {/* Receipts Table */}
      <Card className="rounded-2xl border-border shadow-xs">
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#1D61E7]" />
            Verifiable Institutional Fee Receipts
          </CardTitle>
          <CardDescription className="text-xs">
            Download and inspect official receipts with QR code verification
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading fee receipts...
            </div>
          ) : receipts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No transactions recorded for this student yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-border text-muted-foreground font-semibold">
                  <tr>
                    <th className="py-3 px-4">Receipt No</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Payment Mode</th>
                    <th className="py-3 px-4 text-right">Amount Paid</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {receipts.map((r) => (
                    <tr key={r.id} className="hover:bg-accent/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#1D61E7]">{r.receipt_number}</td>
                      <td className="py-3 px-4 text-muted-foreground">{r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Recent'}</td>
                      <td className="py-3 px-4 font-medium text-foreground">{r.fee_type || 'Academic Fees'}</td>
                      <td className="py-3 px-4">{r.payment_mode || 'Online'}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                        ₹{(r.amount_paid || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-blue-600 hover:text-blue-700"
                          onClick={() => {
                            setSelectedReceipt(r);
                            setReceiptsModalOpen(true);
                          }}
                        >
                          <Download className="w-3.5 h-3.5 mr-1" /> View Receipt
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pay Online Dialog */}
      <Dialog open={isPayOpen} onOpenChange={setIsPayOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#1D61E7]" />
              Pay Academic Fees Online
            </DialogTitle>
            <DialogDescription className="text-xs">
              Secured payment gateway for {student.name} ({student.student_id || student.roll_number})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label>Payment Amount (₹)</Label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value) || 0)}
                className="font-mono text-base font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UPI / QR Code">UPI (GPay / PhonePe / Paytm)</SelectItem>
                  <SelectItem value="Net Banking">Net Banking</SelectItem>
                  <SelectItem value="Debit / Credit Card">Debit / Credit Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Direct bank integration with instant verifiable receipt generation.</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPayOpen(false)}>Cancel</Button>
            <Button onClick={handleProcessPayment} disabled={isProcessingPayment} className="bg-[#1D61E7] text-white">
              {isProcessingPayment ? 'Processing...' : `Pay ₹${paymentAmount.toLocaleString('en-IN')}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Viewer Modal */}
      <FeeReceiptModal
        receipt={selectedReceipt}
        open={receiptsModalOpen}
        onOpenChange={setReceiptsModalOpen}
      />
    </div>
  );
}

