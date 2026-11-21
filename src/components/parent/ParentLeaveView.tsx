import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CalendarOff } from 'lucide-react';
import { campusOpsService, LeaveRow } from '@/services/campusOpsService';

const tone: Record<string, string> = { Pending: 'text-amber-700 border-amber-300', Approved: 'text-emerald-700 border-emerald-300', Rejected: 'text-rose-700 border-rose-300', Cancelled: 'text-slate-500' };

export function ParentLeaveView({ studentId, studentName }: { studentId: string; studentName: string }) {
  const [rows, setRows] = useState<LeaveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true; setLoading(true); setError(null);
    campusOpsService.leaveForStudents([studentId]).then(r => live && setRows(r)).catch(e => live && setError(e.message)).finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [studentId]);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><CalendarOff className="w-4 h-4" /> Leave requests — {studentName}</CardTitle>
        <CardDescription>Requests {studentName} has made, and what the college decided. Only the student can apply.</CardDescription></CardHeader>
      <CardContent>
        {loading ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> : error ? <p className="text-sm text-red-600">{error}</p> : rows.length === 0 ? <p className="text-sm text-slate-500">No leave requests.</p> : (
          <ul className="divide-y">{rows.map(r => (
            <li key={r.id} className="py-2 flex items-center justify-between gap-3 text-sm">
              <div><span className="font-medium">{r.leave_type}</span> · {r.from_date} → {r.to_date}<div className="text-xs text-slate-500">{r.reason}{r.decision_note ? ` — ${r.decision_note}` : ''}</div></div>
              <Badge variant="outline" className={tone[r.status]}>{r.status}</Badge></li>))}</ul>)}
      </CardContent>
    </Card>
  );
}
