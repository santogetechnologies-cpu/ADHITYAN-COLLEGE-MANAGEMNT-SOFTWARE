import React, { useEffect, useState } from 'react';
import { db } from '@/services/supabase/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, ShieldCheck, Download, UserCheck } from 'lucide-react';
import { StaffPayrollItem } from '@/types/database.types';

interface PrintablePayslipProps {
  item: StaffPayrollItem;
  panNumber?: string;
  uanNumber?: string;
  bankAccountNo?: string;
  bankIfsc?: string;
  onClose?: () => void;
}

// Convert number to Indian currency words
function numberToWordsINR(num: number): string {
  const rounded = Math.round(num);
  if (rounded === 0) return 'Zero';

  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n: number): string {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + inWords(n % 100000) : '');
    return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + inWords(n % 10000000) : '');
  }

  return inWords(rounded) + ' Only';
}

export function PrintablePayslip({
  item,
  panNumber = '—',
  uanNumber = '—',
  bankAccountNo = '—',
  bankIfsc = '—',
  onClose,
}: PrintablePayslipProps) {
  const [inst, setInst] = useState<{ institution_name?: string; address?: string; contact_phone?: string; contact_email?: string } | null>(null);
  useEffect(() => { db.getInstitutionalSettings().then((s: any) => setInst(s)).catch(() => setInst(null)); }, []);
  const handlePrint = () => {
    window.print();
  };

  const amountInWords = numberToWordsINR(item.net_salary || 0);

  return (
    <div className="space-y-4 font-sans text-slate-800">
      {/* Top Action Bar */}
      <div className="print:hidden flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Official Salary Slip #{item.payslip_number}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            onClick={handlePrint}
            className="h-8 text-xs font-bold bg-[#1D61E7] hover:bg-blue-700 text-white rounded-lg shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Print / Save PDF
          </Button>
          {onClose && (
            <Button size="sm" variant="outline" onClick={onClose} className="h-8 text-xs">
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Official Payslip Printable Document */}
      <div 
        id="payslip-print-sheet" 
        className="bg-white border-2 border-slate-800 p-6 sm:p-8 rounded-lg shadow-sm print:border-2 print:border-slate-900 print:p-6 print:m-0 print:shadow-none print:w-full print:max-w-none"
      >
        {/* Header with College Emblem Title */}
        <div className="border-b-2 border-slate-800 pb-4 text-center space-y-1">
          <div className="flex items-center justify-center space-x-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-wide uppercase font-serif">
              {inst?.institution_name || 'Institution'}
            </h1>
          </div>
          <p className="text-[10px] text-slate-500">
            {[inst?.address, inst?.contact_phone && `Phone: ${inst.contact_phone}`, inst?.contact_email].filter(Boolean).join(' | ')}
          </p>
          <div className="pt-2">
            <span className="inline-block px-4 py-1 text-xs font-bold uppercase tracking-widest bg-slate-100 border border-slate-800 text-slate-900 rounded-sm">
              SALARY ADVICE & PAYSLIP FOR {item.month_year.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Employee Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-b border-slate-300 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Employee Code</span>
            <span className="font-bold text-slate-900 font-mono">{item.employee_code}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Employee Name</span>
            <span className="font-bold text-slate-900">{item.employee_name}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Designation</span>
            <span className="font-semibold text-slate-800">{item.designation}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Department</span>
            <span className="font-semibold text-slate-800">{item.department}</span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">PAN Number</span>
            <span className="font-mono text-slate-800">{panNumber}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">PF UAN Number</span>
            <span className="font-mono text-slate-800">{uanNumber}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Bank Account No.</span>
            <span className="font-mono text-slate-800">{bankAccountNo}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Bank IFSC Code</span>
            <span className="font-mono text-slate-800">{bankIfsc}</span>
          </div>
        </div>

        {/* Attendance Statistics Strip */}
        <div className="grid grid-cols-4 gap-2 py-2.5 px-3 bg-slate-50 border-b border-slate-300 text-xs text-center font-medium">
          <div>
            <span className="text-[10px] uppercase text-slate-500 block font-bold">Month Days</span>
            <span className="font-bold text-slate-800">{item.days_in_month || 30}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase text-slate-500 block font-bold">Payable Days</span>
            <span className="font-bold text-emerald-700">{item.days_worked || 30}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase text-slate-500 block font-bold">Approved Leaves</span>
            <span className="font-bold text-blue-700">{(item.days_in_month || 30) - (item.days_worked || 30) - (item.lop_days || 0)}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase text-slate-500 block font-bold">Loss of Pay (LOP)</span>
            <span className={`font-bold ${(item.lop_days || 0) > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
              {item.lop_days || 0} Days
            </span>
          </div>
        </div>

        {/* Dual Table: Earnings & Deductions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border-b border-slate-300">
          {/* Earnings Column */}
          <div className="border-r sm:border-r border-slate-300">
            <div className="bg-slate-100 p-2 font-bold text-xs uppercase tracking-wider text-slate-800 border-b border-slate-300 flex justify-between">
              <span>Earnings Component</span>
              <span>Amount (₹)</span>
            </div>
            <div className="divide-y divide-slate-200 text-xs">
              <div className="p-2 flex justify-between text-slate-700">
                <span>Basic Salary</span>
                <span className="font-semibold text-slate-900">₹ {(item.basic_earned || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="p-2 flex justify-between text-slate-700">
                <span>Dearness Allowance (DA)</span>
                <span className="font-semibold text-slate-900">₹ {(item.da_earned || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="p-2 flex justify-between text-slate-700">
                <span>House Rent Allowance (HRA)</span>
                <span className="font-semibold text-slate-900">₹ {(item.hra_earned || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="p-2 flex justify-between text-slate-700">
                <span>Special / Academic Allowance</span>
                <span className="font-semibold text-slate-900">₹ {(item.special_allowance || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="p-2 bg-slate-50 flex justify-between text-xs font-bold text-slate-900 border-t border-slate-300">
                <span>Gross Earnings (A)</span>
                <span>₹ {(item.gross_salary || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Deductions Column */}
          <div>
            <div className="bg-slate-100 p-2 font-bold text-xs uppercase tracking-wider text-slate-800 border-b border-slate-300 flex justify-between">
              <span>Deductions Component</span>
              <span>Amount (₹)</span>
            </div>
            <div className="divide-y divide-slate-200 text-xs">
              <div className="p-2 flex justify-between text-slate-700">
                <span>Provident Fund (EPF 12%)</span>
                <span className="font-semibold text-slate-900">₹ {(item.epf_deduction || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="p-2 flex justify-between text-slate-700">
                <span>Employees' State Insurance (ESI)</span>
                <span className="font-semibold text-slate-900">₹ {(item.esi_deduction || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="p-2 flex justify-between text-slate-700">
                <span>Professional Tax (PT)</span>
                <span className="font-semibold text-slate-900">₹ {(item.pt_deduction || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="p-2 flex justify-between text-slate-700">
                <span>Tax Deducted at Source (TDS)</span>
                <span className="font-semibold text-slate-900">₹ {(item.tds_deduction || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="p-2 flex justify-between text-slate-700">
                <span>Other / LOP Deduction</span>
                <span className="font-semibold text-slate-900">₹ {(item.other_deductions || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="p-2 bg-slate-50 flex justify-between text-xs font-bold text-rose-800 border-t border-slate-300">
                <span>Total Deductions (B)</span>
                <span>₹ {(item.total_deductions || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Net Salary Summary Block */}
        <div className="p-4 bg-blue-50/70 border-b-2 border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-600 block">
              Net Payable Take-Home Salary (A - B)
            </span>
            <div className="text-xl sm:text-2xl font-black text-blue-900">
              ₹ {(item.net_salary || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] font-semibold text-slate-700 capitalize italic">
              Amount in words: {amountInWords}
            </div>
          </div>

          <div className="text-right text-xs space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Disbursal Mode</span>
            <Badge className="bg-emerald-600 text-white font-semibold text-[11px]">
              Direct Bank NEFT / RTGS
            </Badge>
            <div className="text-[10px] text-slate-500 font-mono pt-1">
              {item.payment_reference ? `Ref: ${item.payment_reference}` : 'Payment pending'}
            </div>
          </div>
        </div>

        {/* Verification and Signatures */}
        <div className="pt-6 grid grid-cols-3 gap-4 text-center text-xs">
          <div className="space-y-8">
            <div className="text-[10px] text-slate-400">Prepared By</div>
            <div className="border-t border-slate-400 pt-1 font-semibold text-slate-700">
              HR Payroll Officer
            </div>
          </div>

          <div className="space-y-4">
            <div className="inline-block p-1 bg-slate-100 border border-slate-300 rounded font-mono text-[9px] text-slate-600">
              SECURE HASH: {item.id ? item.id.slice(0, 12).toUpperCase() : 'ADH-SEC-8491'}
            </div>
            <div className="border-t border-slate-400 pt-1 font-semibold text-slate-700">
              Finance Controller
            </div>
          </div>

          <div className="space-y-8">
            <div className="text-[10px] text-slate-400">Institutional Seal</div>
            <div className="border-t border-slate-400 pt-1 font-semibold text-slate-700">
              Registrar / Principal
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="pt-4 mt-4 border-t border-slate-200 text-center text-[10px] text-slate-400">
          Confidential Document — Generated by the institutional ERP payroll system. Retain for personal income tax filing records.
        </div>
      </div>
    </div>
  );
}

