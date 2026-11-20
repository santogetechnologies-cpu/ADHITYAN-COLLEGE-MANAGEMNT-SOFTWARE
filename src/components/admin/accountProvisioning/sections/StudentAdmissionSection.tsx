import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Loader2, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface StudentAdmissionSectionProps { onStatusChange: () => void }

const STAGES = ['Approved', 'Offered', 'Enrolled'];

/**
 * Read-only view of admitted applicants for account provisioning.
 * The admission lifecycle (review → approve → offer → deposit → enrol) is managed ONLY in Admission Management, where every
 * step is validated and audited. This screen used to create and change merit-list rows directly (invented merit score 88,
 * rank 1, a made-up email domain), bypassing that lifecycle.
 */
export function StudentAdmissionSection({ onStatusChange }: StudentAdmissionSectionProps) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: e } = await (supabase as any).from('admission_applications')
      .select('id, application_number, applicant_name, class_name, status, quota, admission_type, submission_date, student_record_id')
      .in('status', STAGES).order('created_at', { ascending: false }).limit(500);
    if (e) setError(e.message); else { setError(null); setRows(data || []); }
    setLoading(false);
    onStatusChange();
  }, [onStatusChange]);
  useEffect(() => { void load(); }, [load]);

  const shown = rows.filter((r) => (stage === 'all' || r.status === stage) && `${r.applicant_name} ${r.application_number}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center"><GraduationCap className="w-5 h-5 mr-2 text-indigo-600" />Admitted applicants</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">Applicants who have been approved, offered a seat or enrolled. Their student record and portal login are created when they are enrolled; manage every admission step in Admission Management.</p>
        </div>
        <Button asChild size="sm"><Link to="/admission-management">Open Admission Management</Link></Button>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" /><Input className="pl-8" placeholder="Name or application number" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <Select value={stage} onValueChange={setStage}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All stages</SelectItem>{STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
      </div>
      {loading ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
        : error ? <p className="text-sm text-destructive">{error}</p>
        : shown.length === 0 ? <p className="text-sm text-slate-500 text-center py-8">No applicants at these stages.</p>
        : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px]"><tr><th className="p-3 text-left">Applicant</th><th className="p-3 text-left">Application no.</th><th className="p-3 text-left">Programme</th><th className="p-3 text-left">Route</th><th className="p-3 text-left">Stage</th></tr></thead>
            <tbody>{shown.map((r) => (
              <tr key={r.id} className="border-t"><td className="p-3 font-semibold">{r.applicant_name}</td><td className="p-3 font-mono">{r.application_number}</td><td className="p-3">{r.class_name}</td>
                <td className="p-3">{[r.admission_type, r.quota].filter(Boolean).join(' • ') || '—'}</td>
                <td className="p-3"><Badge variant={r.status === 'Enrolled' ? 'default' : 'secondary'}>{r.status}</Badge>{r.status === 'Enrolled' && !r.student_record_id && <span className="ml-2 text-amber-600">no student record</span>}</td></tr>))}</tbody>
          </table>
        </div>)}
    </div>
  );
}
