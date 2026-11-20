import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PrintableHallTicket } from '@/components/student/PrintableHallTicket';
import { FileText, Printer, ShieldCheck, Download, AlertCircle, Loader2 } from 'lucide-react';
import { db } from '@/services/supabase/database';
import { ExamSchedule, Profile } from '@/types/database.types';

interface ParentHallTicketsViewProps {
  student: Profile;
}

export function ParentHallTicketsView({ student }: ParentHallTicketsViewProps) {
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [showPrintable, setShowPrintable] = useState(false);

  const loadHallTicketData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await db.getExamSchedules({ className: student.class_name || 'Semester 1' });
      setSchedules(data || []);
    } catch (err) {
      console.warn('Failed to load hall ticket schedules:', err);
    } finally {
      setLoading(false);
    }
  }, [student.class_name]);

  useEffect(() => {
    loadHallTicketData();
  }, [loadHallTicketData]);

  if (showPrintable) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center print:hidden">
          <Button variant="outline" size="sm" onClick={() => setShowPrintable(false)}>
            ← Back to Portal
          </Button>
          <Button size="sm" onClick={() => window.print()} className="bg-[#1D61E7] text-white">
            <Printer className="w-4 h-4 mr-1.5" /> Print Hall Ticket
          </Button>
        </div>

        <PrintableHallTicket
          studentName={student.name}
          rollNumber={student.student_id || student.roll_number || 'STU-2026-1001'}
          registerNumber={`REG-${student.id?.slice(0, 8).toUpperCase()}`}
          department={student.department || 'Paramedical Sciences'}
          className={student.class_name || 'Semester 1'}
          semester={student.class_name || 'Semester 1'}
          schedules={schedules}
          onClose={() => setShowPrintable(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Official Examination Hall Ticket</h2>
          <p className="text-muted-foreground text-sm">
            Verified institutional examination admit card for {student.name}
          </p>
        </div>
        <Button 
          onClick={() => setShowPrintable(true)}
          className="bg-[#1D61E7] hover:bg-blue-700 text-white font-semibold flex items-center gap-2"
        >
          <Printer className="w-4 h-4" />
          View & Print Hall Ticket
        </Button>
      </div>

      <Card className="rounded-2xl border-border shadow-xs">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Admit Card Verification Status
            </CardTitle>
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
              Eligible for Examination
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Permanent Student ID: <strong className="font-mono text-foreground">{student.student_id || student.roll_number || 'AIP-PENDING'}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border/60">
            <div>
              <span className="text-muted-foreground block text-[11px]">Candidate Name:</span>
              <span className="font-bold text-foreground text-sm">{student.name}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Enrolled Program:</span>
              <span className="font-semibold text-foreground truncate block">{student.department || 'Paramedical Sciences'}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Exam Center:</span>
              <span className="font-semibold text-foreground">Main Examination Complex</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 text-blue-900 space-y-1 text-xs">
            <div className="font-semibold flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-600" /> Controller of Examinations Notice
            </div>
            <p className="text-[11px] text-blue-800">
              Students must carry a printed physical copy of this hall ticket along with their institutional identity card to enter the examination hall.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

