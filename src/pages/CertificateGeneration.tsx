import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { Navigation } from '@/components/Navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, FileText, Printer, Download, CheckCircle, XCircle, Clock, Loader2, ShieldCheck } from 'lucide-react';
import { db } from '@/services/supabase/database';
import { Certificate } from '@/types/database.types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { exportToCSV, printDocument } from '@/lib/exportUtils';
import { StudentRecordSearch } from '@/components/shared/StudentRecordSearch';

const TYPES = ['Bonafide Certificate', 'Character Certificate', 'Conduct Certificate', 'Transfer Certificate', 'Course Completion', 'Attendance Certificate', 'Medical Certificate', 'Scholarship Certificate'];
const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

/** Prints only facts held on the record. Wording is neutral; institutions put the final text on their own letterhead. */
function printCertificate(c: Certificate) {
  printDocument(`${c.certificate_type} – ${c.certificate_number}`, `
    <div style="text-align:center"><h2 style="margin:0">${esc(c.certificate_type)}</h2><p style="color:#555;margin:4px 0 24px">Certificate no. ${esc(c.certificate_number)}</p></div>
    <p>This is to certify that <b>${esc(c.student_name)}</b>${c.roll_number ? ` (ID ${esc(c.roll_number)})` : ''}${c.class_name ? `, ${esc(c.class_name)}` : ''}${(c as any).department ? `, ${esc((c as any).department)}` : ''}, is a student of this institution.</p>
    <p>Purpose: <b>${esc(c.purpose || '—')}</b></p>
    ${(c as any).details ? `<p>${esc((c as any).details)}</p>` : ''}
    <p style="margin-top:28px">Date of issue: <b>${esc(c.issue_date)}</b></p>
    <p style="margin-top:48px;font-family:monospace;font-size:11px">Verify at the college portal with number ${esc(c.certificate_number)}</p>`);
}

export default function CertificateGeneration() {
  const { toast } = useToast();
  const { user } = useAuth();
  const canDecide = ['admin', 'principal'].includes(user?.role ?? '');
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [certificateType, setCertificateType] = useState(TYPES[0]);
  const [studentRef, setStudentRef] = useState('');
  const [purpose, setPurpose] = useState('');
  const [details, setDetails] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [verifyNo, setVerifyNo] = useState('');
  const [verifyResult, setVerifyResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setCertificates(await db.getCertificates()); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useRealtimeSubscription({ table: 'certificates', onChange: load, onReconnect: load });

  const issue = async () => {
    if (!studentRef.trim() || purpose.trim().length < 3) {
      toast({ title: 'Incomplete details', description: 'Pick the student and enter the purpose.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const r = await db.issueCertificate(studentRef.trim(), certificateType, purpose.trim(), details.trim() || undefined);
      toast({ title: 'Certificate issued', description: `Number ${r.certificate_number}` });
      setPurpose(''); setStudentRef(''); setDetails('');
      await load();
    } catch (e: any) {
      toast({ title: 'Not issued', description: e.message, variant: 'destructive' });
    } finally { setSubmitting(false); }
  };

  const decide = async (c: Certificate, approve: boolean) => {
    try {
      let note: string | undefined;
      if (!approve) {
        const r = window.prompt('Reason for rejecting this request (required):');
        if (!r || r.trim().length < 3) return;
        note = r.trim();
      }
      await db.updateCertificateStatus(c.id, approve ? 'Issued' : 'Rejected', note);
      toast({ title: approve ? 'Certificate issued' : 'Request rejected' });
      await load();
    } catch (e: any) { toast({ title: 'Action failed', description: e.message, variant: 'destructive' }); }
  };

  const verify = async () => {
    try {
      const r = await db.verifyCertificate(verifyNo);
      setVerifyResult(r.valid ? `Genuine: ${r.type} issued to ${r.student} on ${r.issued_on}.` : 'Not found, or not issued. Treat this certificate as invalid.');
    } catch (e: any) { setVerifyResult(e.message); }
  };

  const shown = useMemo(() => certificates.filter((c) =>
    (statusFilter === 'all' || c.status === statusFilter) &&
    `${c.student_name} ${c.roll_number ?? ''} ${c.certificate_number ?? ''} ${c.certificate_type}`.toLowerCase().includes(search.toLowerCase())), [certificates, search, statusFilter]);
  const pending = certificates.filter((c) => c.status === 'Pending').length;
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const issuedThisMonth = certificates.filter((c) => c.status === 'Issued' && new Date(c.issue_date) >= monthStart).length;

  return (
    <div className="min-h-screen bg-background">
      <Navigation showBackButton={true} backUrl="/dashboard" backLabel="Back to Dashboard" />
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Certificates</h1>
          <p className="text-muted-foreground">Issue certificates, decide student requests and verify certificate numbers. Numbers are assigned by the system.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Issued this month</CardTitle><FileText className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{issuedThisMonth}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Pending requests</CardTitle><Clock className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{pending}</div><p className="text-xs text-muted-foreground">Awaiting a decision</p></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total records</CardTitle><ShieldCheck className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{certificates.length}</div></CardContent></Card>
        </div>

        <Tabs defaultValue={canDecide ? 'generate' : 'requests'} className="space-y-4">
          <TabsList>
            {canDecide && <TabsTrigger value="generate">Issue certificate</TabsTrigger>}
            <TabsTrigger value="requests">Requests &amp; records ({certificates.length})</TabsTrigger>
            <TabsTrigger value="verify">Verify</TabsTrigger>
          </TabsList>

          {canDecide && (
            <TabsContent value="generate">
              <Card className="max-w-2xl">
                <CardHeader><CardTitle>Issue a certificate</CardTitle><CardDescription>The student's name, class and department are taken from their record.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2"><label className="text-sm font-medium">Certificate type</label>
                    <Select value={certificateType} onValueChange={setCertificateType}><SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><label className="text-sm font-medium">Student</label>
                    <StudentRecordSearch onSelect={(s) => setStudentRef(s?.student_id ?? '')} /></div>
                  <div className="space-y-2"><label className="text-sm font-medium">Purpose</label>
                    <Textarea placeholder="e.g. Bank education loan" value={purpose} onChange={(e) => setPurpose(e.target.value)} /></div>
                  <div className="space-y-2"><label className="text-sm font-medium">Additional details (printed on the certificate)</label>
                    <Textarea value={details} onChange={(e) => setDetails(e.target.value)} /></div>
                  <Button onClick={issue} disabled={submitting}>{submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}Issue certificate</Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="requests">
            <Card>
              <CardHeader><CardTitle>Requests &amp; records</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-4">
                  <div className="relative flex-1"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search name, ID, number or type" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="Pending">Pending</SelectItem><SelectItem value="Issued">Issued</SelectItem><SelectItem value="Rejected">Rejected</SelectItem></SelectContent></Select>
                  <Button variant="outline" disabled={shown.length === 0} onClick={() => exportToCSV('certificates', ['Number', 'Student', 'ID', 'Type', 'Purpose', 'Date', 'Status'], shown.map((c) => [c.certificate_number, c.student_name, c.roll_number, c.certificate_type, c.purpose, c.issue_date, c.status]))}><Download className="w-4 h-4 mr-2" />Export</Button>
                </div>
                {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div> : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Number</TableHead><TableHead>Student</TableHead><TableHead>Type</TableHead><TableHead>Purpose</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
                    <TableBody>
                      {shown.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-10 text-sm text-muted-foreground">No certificates or requests found.</TableCell></TableRow> : shown.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-mono text-xs">{c.certificate_number}</TableCell>
                          <TableCell>{c.student_name} <span className="text-xs text-muted-foreground">({c.roll_number || '—'})</span></TableCell>
                          <TableCell>{c.certificate_type}</TableCell>
                          <TableCell>{c.purpose || '—'}</TableCell>
                          <TableCell>{c.issue_date}</TableCell>
                          <TableCell><Badge variant={c.status === 'Issued' ? 'default' : c.status === 'Pending' ? 'secondary' : 'outline'}>{c.status}</Badge></TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {canDecide && c.status === 'Pending' && <>
                              <Button variant="outline" size="sm" title="Issue" onClick={() => decide(c, true)}><CheckCircle className="w-4 h-4" /></Button>
                              <Button variant="outline" size="sm" className="ml-1" title="Reject" onClick={() => decide(c, false)}><XCircle className="w-4 h-4" /></Button>
                            </>}
                            {c.status === 'Issued' && <Button variant="outline" size="sm" className="ml-1" title="Print" onClick={() => printCertificate(c)}><Printer className="w-4 h-4" /></Button>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="verify">
            <Card className="max-w-xl">
              <CardHeader><CardTitle>Verify a certificate</CardTitle><CardDescription>Enter the number printed on the certificate.</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2"><Input placeholder="CERT-2026-000123" value={verifyNo} onChange={(e) => setVerifyNo(e.target.value)} /><Button onClick={verify} disabled={!verifyNo.trim()}>Verify</Button></div>
                {verifyResult && <p className="text-sm">{verifyResult}</p>}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
