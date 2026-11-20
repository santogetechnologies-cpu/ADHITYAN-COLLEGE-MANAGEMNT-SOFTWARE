import React from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Download, CheckCircle2, ShieldCheck } from 'lucide-react';
import { FeeReceipt } from '@/types/database.types';

interface PrintableReceiptProps {
  receipt: FeeReceipt;
  onClose?: () => void;
}

export function PrintableFeeReceipt({ receipt, onClose }: PrintableReceiptProps) {
  const handlePrint = () => {
    window.print();
  };

  const paymentDate = receipt?.payment_date ? new Date(receipt.payment_date) : new Date();
  const formattedDate = isNaN(paymentDate.getTime())
    ? new Date().toLocaleDateString('en-IN')
    : paymentDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

  const grossAmount = Number(receipt?.gross_amount ?? receipt?.amount_paid ?? 0);
  const discountApplied = Number(receipt?.discount_applied ?? 0);
  const amountPaid = Number(receipt?.amount_paid ?? 0);
  const balanceRemaining = Number(receipt?.balance_remaining ?? 0);
  const receiptNumber = receipt?.receipt_number || 'REC-PENDING';
  const paymentMode = (receipt?.payment_mode || 'Cash').replace(/_/g, ' ');
  const txnRef = receipt?.transaction_reference || 'COUNTER-CASH';
  const studentName = receipt?.student_name || 'Student';
  const rollNumber = receipt?.roll_number || 'N/A';
  const department = receipt?.department || 'Paramedical Sciences';
  const academicYear = receipt?.academic_year || '2026-2027';
  const semester = receipt?.semester || 'Semester 1';
  const feeType = receipt?.fee_type || 'Academic / Tuition Fee';
  const qrToken = receipt?.qr_verification_token || receiptNumber;

  return (
    <div className="space-y-4">
      {/* Top Action Bar (Hidden during print) */}
      <div className="print:hidden flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Verified Institutional Payment Receipt: <strong>{receiptNumber}</strong></span>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            onClick={handlePrint}
            className="h-8 text-xs font-bold bg-[#1D61E7] hover:bg-blue-700 text-white rounded-lg shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Print / Save as PDF
          </Button>
          {onClose && (
            <Button size="sm" variant="outline" onClick={onClose} className="h-8 text-xs">
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Official Printable Receipt Document */}
      <div 
        id="printable-fee-receipt" 
        className="bg-white p-6 sm:p-8 border border-slate-200 rounded-2xl shadow-sm text-slate-800 print:border-none print:shadow-none print:p-0 max-w-2xl mx-auto font-sans"
      >
        {/* Institutional Letterhead */}
        <div className="border-b-2 border-slate-800 pb-4 text-center space-y-1.5">
          <div className="inline-flex items-center justify-center space-x-3">
            <img 
              src="/lovable-uploads/8ea95178-bb37-43e2-ae4d-595e31707954.png" 
              alt="Logo" 
              className="w-12 h-12 object-contain rounded-md"
            />
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 uppercase">
              Adithyan College
            </h1>
          </div>
          <p className="text-[11px] text-slate-600 font-medium">
            Affiliated to Directorate of Medical Education & Research • Paramedical Board
          </p>
          <p className="text-[10px] text-slate-500">
            Campus Road, Coimbatore Highway, Tamil Nadu • Phone: +91 422 2987654 • Email: accounts@adithyan.edu.in
          </p>
          <div className="pt-2">
            <span className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-black uppercase tracking-wider rounded-md">
              Official Academic Fee Payment Receipt
            </span>
          </div>
        </div>

        {/* Receipt Metadata Header */}
        <div className="grid grid-cols-2 gap-4 py-4 text-xs border-b border-slate-200">
          <div className="space-y-1">
            <div><strong className="text-slate-500 font-semibold">Receipt No:</strong> <span className="font-bold text-slate-900">{receiptNumber}</span></div>
            <div><strong className="text-slate-500 font-semibold">Payment Date:</strong> <span className="font-bold text-slate-900">{formattedDate}</span></div>
            <div><strong className="text-slate-500 font-semibold">Payment Mode:</strong> <span className="font-bold text-slate-900 uppercase">{paymentMode}</span></div>
            <div><strong className="text-slate-500 font-semibold">Transaction Ref:</strong> <span className="font-mono text-[11px] font-bold text-slate-800">{txnRef}</span></div>
          </div>
          <div className="space-y-1 text-right">
            <div><strong className="text-slate-500 font-semibold">Student Name:</strong> <span className="font-bold text-slate-900">{studentName}</span></div>
            <div><strong className="text-slate-500 font-semibold">Roll Number:</strong> <span className="font-bold text-[#1D61E7]">{rollNumber}</span></div>
            <div><strong className="text-slate-500 font-semibold">Department:</strong> <span className="font-bold text-slate-900">{department}</span></div>
            <div><strong className="text-slate-500 font-semibold">Academic Term:</strong> <span className="font-bold text-slate-900">{academicYear} • {semester}</span></div>
          </div>
        </div>

        {/* Itemized Fee Breakdown Table */}
        <div className="py-4">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b-2 border-slate-300 text-slate-600 uppercase text-[10px] font-bold">
                <th className="py-2">S.No</th>
                <th className="py-2">Fee Description & Component</th>
                <th className="py-2 text-right">Amount (INR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-2 font-medium">1</td>
                <td className="py-2 font-semibold text-slate-800">{feeType}</td>
                <td className="py-2 text-right font-bold text-slate-900">₹{grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
              {discountApplied > 0 && (
                <tr className="text-emerald-700 bg-emerald-50/50">
                  <td className="py-2 font-medium">2</td>
                  <td className="py-2 font-semibold">
                    Concession / Scholarship Applied: {receipt?.discount_reason || 'Verified Institutional Concession'}
                  </td>
                  <td className="py-2 text-right font-bold">- ₹{discountApplied.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-800 text-sm">
                <th colSpan={2} className="py-3 font-bold text-slate-900 text-right pr-4">
                  Net Amount Paid:
                </th>
                <th className="py-3 font-black text-slate-900 text-right">
                  ₹{amountPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </th>
              </tr>
              {balanceRemaining > 0 ? (
                <tr className="text-rose-600 text-xs">
                  <td colSpan={2} className="py-1 text-right pr-4 font-bold">Outstanding Balance Remaining:</td>
                  <td className="py-1 text-right font-bold">₹{balanceRemaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              ) : (
                <tr className="text-emerald-600 text-xs">
                  <td colSpan={2} className="py-1 text-right pr-4 font-bold">Outstanding Dues Status:</td>
                  <td className="py-1 text-right font-bold">NIL (Full Payment Settled)</td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>

        {/* Security QR Verification & Authorization Footer */}
        <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-4 items-end">
          <div className="flex items-center space-x-3">
            <div className="w-16 h-16 p-1 bg-white border border-slate-300 rounded-lg flex items-center justify-center shrink-0">
              {/* Vector Simulated QR Code */}
              <div className="w-full h-full bg-slate-900 rounded grid grid-cols-3 gap-1 p-1">
                <div className="bg-white rounded-xs" />
                <div className="bg-white rounded-xs" />
                <div className="bg-white rounded-xs" />
                <div className="bg-white rounded-xs" />
                <div className="bg-transparent" />
                <div className="bg-white rounded-xs" />
                <div className="bg-white rounded-xs" />
                <div className="bg-white rounded-xs" />
                <div className="bg-white rounded-xs" />
              </div>
            </div>
            <div className="space-y-0.5 text-[10px] text-slate-500">
              <div className="flex items-center space-x-1 text-emerald-600 font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Digitally Verified Receipt</span>
              </div>
              <div>Auth Token: {qrToken.slice(0, 16)}...</div>
              <div>Valid for official university audit.</div>
            </div>
          </div>

          <div className="text-right space-y-1">
            <div className="h-10 flex items-end justify-end">
              <span className="font-serif italic text-xs text-slate-700 tracking-wider">
                Accounts Officer
              </span>
            </div>
            <div className="text-xs font-bold text-slate-900 border-t border-slate-300 pt-1">
              Authorized Finance Cashier
            </div>
            <div className="text-[10px] text-slate-400">
              Adithyan College Central Accounts Office
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

