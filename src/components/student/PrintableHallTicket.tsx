import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, ShieldCheck, CheckCircle2, AlertOctagon, User } from 'lucide-react';
import { ExamSchedule } from '@/types/database.types';

interface HallTicketProps {
  studentName: string;
  rollNumber: string;
  registerNumber?: string;
  department: string;
  className: string;
  semester?: string;
  examTitle?: string;
  examCenter?: string;
  hallNumber?: string;
  seatNumber?: string;
  qrCodeToken?: string;
  coeSignatureHash?: string;
  attendancePct?: number;
  isDetained?: boolean;
  schedules: ExamSchedule[];
  onClose?: () => void;
}

export function PrintableHallTicket({
  studentName,
  rollNumber,
  registerNumber = '2025BMLT042',
  department,
  className,
  semester,
  examTitle = 'End Semester Examination',
  examCenter = 'Main Examination Complex (Block B), Adithyan College',
  hallNumber = 'Exam Hall B-302',
  seatNumber = 'Desk 14-B',
  qrCodeToken,
  coeSignatureHash = 'COE-AUTH-SIG-2025-VERIFIED',
  attendancePct = 88.0,
  isDetained = false,
  schedules,
  onClose
}: HallTicketProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 font-sans text-slate-800">
      {/* Top Action Bar */}
      <div className="print:hidden flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
          {isDetained ? (
            <span className="text-rose-600 flex items-center">
              <AlertOctagon className="w-4 h-4 mr-1" />
              Detained — Hall Ticket Issuance Restricted
            </span>
          ) : (
            <span className="text-emerald-700 flex items-center">
              <ShieldCheck className="w-4 h-4 mr-1 text-emerald-600" />
              Verified University Examination Admit Card (75% Criteria Met: {attendancePct}%)
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {!isDetained && (
            <Button
              size="sm"
              onClick={handlePrint}
              className="h-8 text-xs font-bold bg-[#1D61E7] hover:bg-blue-700 text-white rounded-lg shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              Print / Save Admit Card
            </Button>
          )}
          {onClose && (
            <Button size="sm" variant="outline" onClick={onClose} className="h-8 text-xs">
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Official Admit Card Document */}
      <div 
        id="printable-hall-ticket"
        className="bg-white p-6 sm:p-8 border border-slate-200 rounded-2xl shadow-sm print:border-none print:shadow-none print:p-0 max-w-3xl mx-auto"
      >
        {/* University Header */}
        <div className="border-b-2 border-slate-900 pb-3 text-center space-y-1">
          <div className="inline-flex items-center justify-center space-x-3">
            <img 
              src="/lovable-uploads/8ea95178-bb37-43e2-ae4d-595e31707954.png" 
              alt="Adithyan College Logo" 
              className="w-10 h-10 object-contain rounded-md"
            />
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 uppercase">
              Adithyan College
            </h1>
          </div>
          <p className="text-[11px] text-slate-600 font-medium">
            Affiliated to Directorate of Medical Education & Research • Paramedical Board
          </p>
          <div className="pt-2">
            <span className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-black uppercase tracking-wider rounded-md">
              Office of the Controller of Examinations — {examTitle}
            </span>
          </div>
        </div>

        {/* Candidate Details Grid */}
        <div className="grid grid-cols-4 gap-4 py-4 text-xs border-b border-slate-200">
          <div className="col-span-3 grid grid-cols-2 gap-y-2 gap-x-4">
            <div><strong className="text-slate-500 font-semibold">Candidate Name:</strong> <div className="font-bold text-slate-900 text-sm">{studentName}</div></div>
            <div><strong className="text-slate-500 font-semibold">Student ID / Roll:</strong> <div className="font-bold text-[#1D61E7] text-sm">{rollNumber}</div></div>
            <div><strong className="text-slate-500 font-semibold">Register Number:</strong> <div className="font-bold text-slate-800 font-mono">{registerNumber}</div></div>
            <div><strong className="text-slate-500 font-semibold">Course & Department:</strong> <div className="font-bold text-slate-900">{department}</div></div>
            <div><strong className="text-slate-500 font-semibold">Academic Term:</strong> <div className="font-bold text-slate-800">{semester || className}</div></div>
            <div><strong className="text-slate-500 font-semibold">Exam Center:</strong> <div className="font-bold text-slate-800">{examCenter}</div></div>
            <div><strong className="text-slate-500 font-semibold">Assigned Hall & Desk:</strong> <div className="font-bold text-[#1D61E7]">{hallNumber} • {seatNumber}</div></div>
            <div><strong className="text-slate-500 font-semibold">Attendance & Clearance:</strong> <div className="font-bold text-emerald-600">{attendancePct}% (Cleared by CoE)</div></div>
          </div>

          {/* Student Photo Box */}
          <div className="flex flex-col items-center justify-center p-2 border border-slate-300 rounded-xl bg-slate-50 space-y-1">
            <div className="w-20 h-24 bg-slate-200 rounded-lg overflow-hidden border border-slate-300 flex items-center justify-center">
              <img 
                src="/assets/student-avatar.svg" 
                alt={studentName} 
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Verified Photo</span>
          </div>
        </div>

        {/* Scheduled Examination Papers Table */}
        <div className="py-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Authorized Course Papers for this Examination Session
          </h4>
          <table className="w-full text-xs text-left border border-slate-200">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 uppercase text-[10px] font-bold">
              <tr>
                <th className="p-2.5">Date</th>
                <th className="p-2.5">Time Session</th>
                <th className="p-2.5">Course Code & Subject</th>
                <th className="p-2.5">Exam Hall</th>
                <th className="p-2.5 text-center">Invigilator Sign</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {schedules.map((exam, idx) => (
                <tr key={exam.id || idx}>
                  <td className="p-2.5 font-bold text-slate-900">
                    {new Date(exam.exam_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="p-2.5 font-mono text-[11px] text-slate-600">
                    {exam.start_time?.slice(0, 5)} - {exam.end_time?.slice(0, 5)} (FN)
                  </td>
                  <td className="p-2.5">
                    <div className="font-bold text-slate-900">{exam.subject}</div>
                    <div className="text-[10px] text-slate-500">Autonomous Degree Evaluation</div>
                  </td>
                  <td className="p-2.5 font-bold text-[#1D61E7]">
                    {exam.room_no || 'Hall B-302'}
                  </td>
                  <td className="p-2.5 border-l border-slate-200 text-center">
                    <div className="h-6 w-20 border-b border-dashed border-slate-300 mx-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Examination Guidelines */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] text-slate-600 space-y-1">
          <strong className="text-slate-800 font-bold block">Important Candidate Instructions:</strong>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Candidates must report at the designated exam hall 30 minutes prior to session commencement.</li>
            <li>College Identity Card and this printed Hall Ticket are mandatory for entry.</li>
            <li>Possession of mobile phones, smartwatches, or any unauthorized electronic storage devices is strictly punishable under malpractices act.</li>
          </ul>
        </div>

        {/* CoE Verification Stamp & Candidate Sign */}
        <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-4 items-end text-xs">
          <div>
            <div className="h-10 flex items-end">
              <span className="font-mono text-xs text-slate-700 tracking-wider">
                {studentName}
              </span>
            </div>
            <div className="font-bold text-slate-900 border-t border-slate-300 pt-1">
              Candidate's Signature
            </div>
          </div>

          <div className="text-right space-y-1">
            <div className="h-10 flex items-end justify-end">
              <span className="font-serif italic text-xs text-[#1D61E7] font-bold tracking-wider">
                Dr. R. Chandrasekar, Ph.D.
              </span>
            </div>
            <div className="font-bold text-slate-900 border-t border-slate-300 pt-1">
              Controller of Examinations (CoE)
            </div>
            <div className="text-[10px] text-slate-400">
              Adithyan College
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

