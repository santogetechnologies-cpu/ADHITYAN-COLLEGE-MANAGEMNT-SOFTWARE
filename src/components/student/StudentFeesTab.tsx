import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CreditCard, 
  Receipt, 
  Download, 
  Printer, 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Loader2, 
  RefreshCw,
  Plus,
  ShieldCheck,
  Send
} from 'lucide-react';
import { db } from '@/services/supabase/database';
import { useAuth } from '@/context/AuthContext';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { StudentFee, FeeReceipt, ScholarshipMaster, ScholarshipApplication } from '@/types/database.types';
import { FeeReceiptModal } from '@/components/shared/FeeReceiptModal';
import { useToast } from '@/hooks/use-toast';

export function StudentFeesTab() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [fees, setFees] = useState<StudentFee[]>([]);
  const [receipts, setReceipts] = useState<FeeReceipt[]>([]);
  const [scholarships, setScholarships] = useState<ScholarshipMaster[]>([]);
  const [myApplications, setMyApplications] = useState<ScholarshipApplication[]>([]);

  // Dialogs
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [scholarshipModalOpen, setScholarshipModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<FeeReceipt | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pay Form

  // Scholarship Application Form
  const [selectedScholarshipId, setSelectedScholarshipId] = useState<string>('');
  const [requestedAmount, setRequestedAmount] = useState<number>(25000);
  const [remarks, setRemarks] = useState<string>('');

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [feeList, receiptList, scholList, myApps] = await Promise.all([
        db.getStudentFees(user.id),
        db.getFeeReceipts(user.id, user.roll_number || user.student_id),
        db.getScholarships(),
        db.getScholarshipApplications(user.id),
      ]);
      setFees(feeList || []);
      setReceipts(receiptList || []);
      setScholarships(scholList || []);
      setMyApplications(myApps || []);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time synchronization
  useRealtimeSubscription({ table: 'student_fees', onChange: loadData, onReconnect: loadData });
  useRealtimeSubscription({ table: 'fee_receipts', onChange: loadData, onReconnect: loadData });
  useRealtimeSubscription({ table: 'scholarship_applications', onChange: loadData, onReconnect: loadData });

  const totalFeeDue = fees.reduce((acc, f) => acc + Number(f.total_due || 0), 0);
  const totalPaid = fees.reduce((acc, f) => acc + Number(f.paid_amount || 0), 0);
  const grossTotal = totalFeeDue + totalPaid;
  const paymentPct = grossTotal > 0 ? Math.round((totalPaid / grossTotal) * 100) : 0;

  // Handle Apply Scholarship
  const handleApplyScholarship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !selectedScholarshipId) {
      toast({ title: 'Select a scholarship', variant: 'destructive' });
      return;
    }
    const chosen = scholarships.find(s => s.id === selectedScholarshipId);
    if (!chosen) return;

    setIsSubmitting(true);
    try {
      const app = await db.submitScholarshipApplication({
        student_id: user.id,
        student_name: user.name || 'Student',
        roll_number: user.roll_number || user.student_id || 'STU-2026-0001',
        department: user.department || 'B.Sc Medical Laboratory Technology (B.Sc MLT)',
        scholarship_id: chosen.id,
        scholarship_name: chosen.scholarship_name,
        academic_year: '2026-2027',
        requested_amount: Number(requestedAmount),
        remarks: remarks || 'Academic merit & family eligibility criteria met.',
        status: 'Submitted',
      });

      if (app) {
        toast({
          title: 'Application Submitted',
          description: 'Your scholarship request has been routed to Accounts & Principal.',
        });
        setScholarshipModalOpen(false);
        loadData();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 border border-slate-200 rounded-2xl shadow-2xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1D61E7] flex items-center justify-center font-bold">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Academic Fees, Receipts & Scholarships</h3>
            <p className="text-xs text-slate-500">Official college fee ledger, instant downloadable receipts, and concession schemes</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button size="sm" variant="outline" onClick={loadData} className="h-8 text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setScholarshipModalOpen(true)}
            className="h-8 text-xs font-bold text-amber-700 hover:bg-amber-50 border-amber-300"
          >
            <Award className="w-3.5 h-3.5 mr-1 text-amber-600" /> Apply Scholarship
          </Button>
          <Button
            size="sm"
            onClick={() => setPayModalOpen(true)}
            disabled={totalFeeDue <= 0}
            className="h-8 text-xs font-bold bg-[#1D61E7] hover:bg-blue-700 text-white rounded-xl shadow-xs"
          >
            <CreditCard className="w-3.5 h-3.5 mr-1" /> How to Pay
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Annual Fee */}
        <Card className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Annual Fee</span>
          <div className="text-2xl font-black text-slate-900">₹{grossTotal.toLocaleString('en-IN')}</div>
          <p className="text-[11px] text-slate-500">Academic Year 2026-2027</p>
        </Card>

        {/* Amount Settled */}
        <Card className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Amount Paid</span>
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
              {paymentPct}% Cleared
            </Badge>
          </div>
          <div className="text-2xl font-black text-emerald-600">₹{totalPaid.toLocaleString('en-IN')}</div>
          <Progress value={paymentPct} className="h-1.5 bg-slate-100" />
        </Card>

        {/* Outstanding Balance */}
        <Card className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Outstanding Dues</span>
          <div className={`text-2xl font-black ${totalFeeDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {totalFeeDue > 0 ? `₹${totalFeeDue.toLocaleString('en-IN')}` : 'NIL (All Dues Cleared)'}
          </div>
          <p className="text-[11px] text-slate-500">
            {totalFeeDue > 0 ? 'Due by 15th of next month' : 'Exam hall ticket eligible'}
          </p>
        </Card>
      </div>

      {/* Receipts Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center">
            <Receipt className="w-4 h-4 mr-1.5 text-[#1D61E7]" />
            Official Downloadable Payment Receipts ({receipts.length})
          </h4>
        </div>

        {receipts.length === 0 ? (
          <Card className="bg-white text-center py-8 border border-slate-200">
            <CardContent className="space-y-2">
              <Receipt className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs text-slate-500">No receipts yet. A verified receipt appears here once the accounts office records your payment.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {receipts.map((r) => (
              <div 
                key={r.id} 
                className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:border-blue-300 transition-all flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold font-mono text-slate-400 block">{r.receipt_number}</span>
                    <h5 className="text-xs font-bold text-slate-900">{r.fee_type}</h5>
                    <div className="text-[11px] text-slate-500">
                      Paid on {new Date(r.payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-slate-900">₹{r.amount_paid.toLocaleString('en-IN')}</div>
                    <Badge variant="outline" className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border-emerald-200">
                      Paid • {r.payment_mode.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 flex items-center">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Verified QR Stamp
                  </span>
                  <Button
                    size="sm"
                    className="h-7 text-xs font-bold bg-[#1D61E7] hover:bg-blue-700 text-white rounded-lg shadow-2xs"
                    onClick={() => {
                      setSelectedReceipt(r);
                      setReceiptModalOpen(true);
                    }}
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Download / Print PDF
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Scholarships & Concessions Applications */}
      {myApplications.length > 0 && (
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center">
            <Award className="w-4 h-4 mr-1.5 text-amber-500" />
            My Scholarship & Concession Requests ({myApplications.length})
          </h4>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3">Scheme Name</th>
                    <th className="p-3">Academic Term</th>
                    <th className="p-3">Requested</th>
                    <th className="p-3">Sanctioned</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myApplications.map((app) => (
                    <tr key={app.id}>
                      <td className="p-3 font-bold text-slate-900">{app.scholarship_name}</td>
                      <td className="p-3 text-slate-600">{app.academic_year}</td>
                      <td className="p-3 font-semibold text-slate-800">₹{Number(app.requested_amount).toLocaleString('en-IN')}</td>
                      <td className="p-3 font-bold text-emerald-600">
                        {app.sanctioned_amount > 0 ? `₹${Number(app.sanctioned_amount).toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={app.status === 'Approved' ? 'default' : app.status === 'Rejected' ? 'destructive' : 'secondary'}
                          className="text-[10px] font-bold"
                        >
                          {app.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Pay Semester Fee Dialog */}
      {/* How to pay: online self-service payment is not enabled (no payment gateway configured) */}
      <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Pay Semester Fee</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <div className="rounded-xl border bg-amber-50 border-amber-200 p-3">
              <div className="text-[11px] text-amber-800">Outstanding dues</div>
              <div className="text-2xl font-bold text-amber-700">₹{totalFeeDue.toLocaleString('en-IN')}</div>
            </div>
            <p className="text-slate-600">
              Online payment is not enabled yet. Please pay at the college accounts desk (cash, UPI, card, bank transfer or
              cheque). Your receipt will appear in the receipt list on this page once the accounts office
              records your payment.
            </p>
          </div>
          <DialogFooter className="pt-2">
            <Button size="sm" onClick={() => setPayModalOpen(false)} className="h-8 text-xs">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Apply Scholarship Dialog */}
      <Dialog open={scholarshipModalOpen} onOpenChange={setScholarshipModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Apply for Scholarship / Concession</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleApplyScholarship} className="space-y-4 text-xs">
            <div>
              <Label className="text-xs font-bold">Select Scholarship Scheme</Label>
              <Select value={selectedScholarshipId} onValueChange={setSelectedScholarshipId}>
                <SelectTrigger className="h-9 text-xs mt-1"><SelectValue placeholder="Choose scheme..." /></SelectTrigger>
                <SelectContent>
                  {scholarships.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.scholarship_name} ({s.discount_type === 'Percentage' ? `${s.discount_value}%` : `₹${s.discount_value}`})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-bold">Requested Concession Amount (INR)</Label>
              <Input
                type="number"
                value={requestedAmount}
                onChange={(e) => setRequestedAmount(Number(e.target.value))}
                className="h-9 text-xs mt-1"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-bold">Eligibility Statement & Certificate Details</Label>
              <Input
                placeholder="Certificate / Roll / Income proof reference code..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="h-9 text-xs mt-1"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setScholarshipModalOpen(false)} className="h-8 text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting} className="h-8 text-xs font-bold bg-[#1D61E7] text-white">
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Submit for Sanction
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Printable Receipt Viewer Modal */}
      <FeeReceiptModal
        open={receiptModalOpen}
        onOpenChange={setReceiptModalOpen}
        receipt={selectedReceipt}
      />
    </div>
  );
}

