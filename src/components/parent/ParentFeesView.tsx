import { OnlinePayDialog } from '@/components/shared/OnlinePayDialog';
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

  // student_fees.total_due is the OUTSTANDING balance; paid_amount is cumulative paid.
  const pendingBalance = fees.reduce((sum, f: any) => sum + Number(f.total_due ?? 0), 0);
  const paidFee = fees.reduce((sum, f: any) => sum + Number(f.paid_amount ?? 0), 0);
  const totalFee = pendingBalance + paidFee;

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
          <CreditCard className="w-4 h-4" /> How to Pay Fees
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

      <OnlinePayDialog open={isPayOpen} onOpenChange={setIsPayOpen} fees={fees} studentName={student.name} onPaid={loadFeesAndReceipts} />

      {/* Receipt Viewer Modal */}
      <FeeReceiptModal
        receipt={selectedReceipt}
        open={receiptsModalOpen}
        onOpenChange={setReceiptsModalOpen}
      />
    </div>
  );
}

