import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { gpaService, type StudentGpa } from '@/services/gpaService';

/** SGPA per examination and CGPA from published results; computed on the server from the institution's grade scale. */
export function StudentGpaCard({ studentId }: { studentId?: string }) {
  const [g, setG] = useState<StudentGpa | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!studentId) return;
    gpaService.studentGpa(studentId).then(setG).catch((e) => setErr(e.message));
  }, [studentId]);
  if (err) return null;
  if (!g) return null;
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Grade point average</CardTitle>
        <CardDescription>From published results • scale of {g.scale_max} • subjects without credits count as 1</CardDescription></CardHeader>
      <CardContent>
        {g.credits === 0 ? <p className="text-sm text-muted-foreground">No published results yet.</p> : (
          <div className="space-y-3">
            <div className="flex gap-6">
              <div><div className="text-3xl font-bold text-primary">{g.cgpa ?? '—'}</div><div className="text-xs text-muted-foreground">CGPA</div></div>
              <div><div className="text-3xl font-bold">{g.credits}</div><div className="text-xs text-muted-foreground">Credits</div></div>
              <div><div className={`text-3xl font-bold ${g.arrears ? 'text-rose-600' : ''}`}>{g.arrears}</div><div className="text-xs text-muted-foreground">Arrears</div></div>
            </div>
            <table className="w-full text-xs"><thead className="text-muted-foreground"><tr><th className="text-left py-1">Examination</th><th className="text-right">Credits</th><th className="text-right">SGPA</th></tr></thead>
              <tbody>{g.terms.map((t) => <tr key={t.exam_id} className="border-t"><td className="py-1">{t.exam}</td><td className="text-right">{t.credits}</td><td className="text-right font-mono">{t.sgpa ?? '—'}</td></tr>)}</tbody></table>
          </div>)}
      </CardContent>
    </Card>
  );
}
