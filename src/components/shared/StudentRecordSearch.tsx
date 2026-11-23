import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2, Search, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export interface StudentRecord {
  id: string;            // students.id (the permanent student record)
  user_id: string | null; // portal login, if the student has one yet
  student_id: string;
  name: string;
  department: string | null;
  class_name: string | null;
}

/**
 * Searches the central `students` table (every enrolled student, with or without a portal login).
 * Subject to RLS: only roles allowed to read students will get results.
 */
export function StudentRecordSearch({ onSelect, placeholder = 'Search by student ID or name…', selectedLabel }: {
  onSelect: (s: StudentRecord | null) => void; placeholder?: string; selectedLabel?: string;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<StudentRecord | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (picked || query.trim().length < 2) { setResults([]); return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      // strip characters that have meaning inside a PostgREST filter / LIKE pattern
      const term = query.trim().replace(/[%_,()*\\]/g, ' ');
      const { data, error: err } = await supabase.from('students')
        .select('id, user_id, student_id, name, department, class_name')
        .or(`student_id.ilike.%${term}%,name.ilike.%${term}%`)
        .eq('status', 'active').order('name').limit(8);
      setLoading(false);
      if (err) { setError(err.message); setResults([]); return; }
      setError(null);
      setResults((data || []) as StudentRecord[]);
      setOpen(true);
    }, 250);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query, picked]);

  if (picked) {
    return (
      <div className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm bg-muted/40">
        <span className="truncate"><span className="font-medium">{picked.name}</span> <span className="text-muted-foreground font-mono text-xs">{picked.student_id}</span></span>
        <button type="button" aria-label="Clear student" className="text-muted-foreground hover:text-foreground" onClick={() => { setPicked(null); setQuery(''); onSelect(null); }}><X className="h-4 w-4" /></button>
      </div>
    );
  }
  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input value={query} onChange={(e) => setQuery(e.target.value)} onFocus={() => setOpen(true)} placeholder={selectedLabel || placeholder} className="pl-8 h-9 text-sm" />
      {loading && <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
      {open && (results.length > 0 || error) && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-60 overflow-auto">
          {error ? <p className="p-3 text-xs text-destructive">{error}</p> : results.map((r) => (
            <button key={r.id} type="button" className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
              onClick={() => { setPicked(r); setOpen(false); onSelect(r); }}>
              <span className="font-medium">{r.name}</span> <span className="text-xs font-mono text-muted-foreground">{r.student_id}</span>
              <span className="block text-[11px] text-muted-foreground">{[r.department, r.class_name].filter(Boolean).join(' · ')}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
