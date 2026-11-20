import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Pencil, Plus, Trash2, Upload, FileText, AlertTriangle } from 'lucide-react';
import { useNAAC } from '@/context/NAACContext';
import { naacService, type NaacMetric } from '@/services/naacService';
import { EvidenceActions } from '@/components/naac/EvidenceActions';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface CriterionTemplateProps { criterionNumber: number; title: string; description: string; icon: React.ElementType }
const STATUSES: NaacMetric['status'][] = ['Pending', 'In progress', 'Completed'];

export function CriterionTemplate({ criterionNumber, title, description, icon: Icon }: CriterionTemplateProps) {
  const { naacData, reload, canEdit, isLoading, loadError } = useNAAC();
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState('metrics');
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newM, setNewM] = useState({ code: `${criterionNumber}.`, title: '' });
  const [edit, setEdit] = useState<NaacMetric | null>(null);
  const [uploadMetric, setUploadMetric] = useState('');

  const progress = naacData.criterionProgress.find((p) => p.criterionNumber === criterionNumber);
  const metrics = useMemo(() => naacData.metrics.filter((m) => m.criterion_number === criterionNumber), [naacData.metrics, criterionNumber]);
  const docs = naacData.documents.filter((d) => d.criterionNumber === criterionNumber);
  const evidenceCount = (code: string) => docs.filter((d) => d.metricCode === code).length;

  const run = async (fn: () => Promise<void>, ok: string, after?: () => void) => {
    setBusy(true);
    try { await fn(); toast({ title: ok }); after?.(); await reload(); }
    catch (e: any) { toast({ title: 'Not saved', description: e.message, variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  const addMetric = () => {
    const code = newM.code.trim();
    if (!new RegExp(`^${criterionNumber}\\.\\d+(\\.\\d+)?$`).test(code)) return toast({ title: `Metric code must look like ${criterionNumber}.1.1`, variant: 'destructive' });
    if (!newM.title.trim()) return toast({ title: 'Enter a title', variant: 'destructive' });
    void run(() => naacService.addMetric({ criterion_number: criterionNumber, metric_code: code, title: newM.title.trim() }), 'Metric added', () => { setAddOpen(false); setNewM({ code: `${criterionNumber}.`, title: '' }); });
  };

  const upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    if (!uploadMetric) return toast({ title: 'Choose the metric this evidence supports', variant: 'destructive' });
    void run(() => naacService.addEvidence(file, { title: file.name.replace(/\.[^.]+$/, ''), criterion: criterionNumber, metricCode: uploadMetric, evidenceType: 'Supporting document', tags: [], userId: user?.id }), 'Document uploaded');
  };

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center"><Icon className="w-6 h-6 text-primary-foreground" /></div>
          <div><h1 className="text-3xl font-bold text-foreground">Criterion {criterionNumber}: {title}</h1><p className="text-muted-foreground">{description}</p></div>
        </div>
        <div className="text-right"><div className="text-2xl font-bold text-primary">{progress?.completionPercentage ?? 0}%</div><p className="text-sm text-muted-foreground">Complete</p></div>
      </div>
      {loadError && <p className="text-sm text-destructive flex items-center gap-1"><AlertTriangle className="h-4 w-4" />{loadError}</p>}

      <Card>
        <CardHeader><CardTitle>Progress</CardTitle><CardDescription>Calculated from the metrics below: completed ÷ total.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progress?.completionPercentage ?? 0} className="h-3" />
          <div className="grid grid-cols-3 gap-4 text-center">
            <div><div className="text-2xl font-bold">{progress?.completedMetrics ?? 0}</div><p className="text-sm text-muted-foreground">Completed</p></div>
            <div><div className="text-2xl font-bold">{(progress?.totalMetrics ?? 0) - (progress?.completedMetrics ?? 0)}</div><p className="text-sm text-muted-foreground">Remaining</p></div>
            <div><div className="text-2xl font-bold">{docs.length}</div><p className="text-sm text-muted-foreground">Evidence files</p></div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="metrics">Metrics ({metrics.length})</TabsTrigger><TabsTrigger value="documents">Evidence ({docs.length})</TabsTrigger></TabsList>

        <TabsContent value="metrics">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div><CardTitle>Metrics</CardTitle><CardDescription>Add the metrics your institution tracks for this criterion, then record data and status.</CardDescription></div>
                {canEdit && <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="w-4 h-4 mr-1" />Add metric</Button>}
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Title</TableHead><TableHead>Status</TableHead><TableHead>Value</TableHead><TableHead>Evidence</TableHead><TableHead>Updated</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>
                  {metrics.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">No metrics yet.{canEdit ? ' Click "Add metric" to start.' : ''}</TableCell></TableRow> : metrics.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.metric_code}</TableCell><TableCell>{m.title}</TableCell>
                      <TableCell>{canEdit ? (
                        <Select value={m.status} onValueChange={(v) => void run(() => naacService.updateMetric(m.id, { status: v as NaacMetric['status'] }), 'Status updated')}>
                          <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
                      ) : <Badge variant={m.status === 'Completed' ? 'default' : 'secondary'}>{m.status}</Badge>}</TableCell>
                      <TableCell>{m.quantitative_value ?? '—'}</TableCell>
                      <TableCell>{evidenceCount(m.metric_code)} file(s)</TableCell>
                      <TableCell>{m.updated_at?.slice(0, 10)}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">{canEdit && <>
                        <Button variant="ghost" size="sm" title="Record data" onClick={() => setEdit(m)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" title="Delete metric" onClick={() => { if (window.confirm(`Delete metric ${m.metric_code}? Its evidence files stay in the repository.`)) void run(() => naacService.deleteMetric(m.id), 'Metric deleted'); }}><Trash2 className="w-4 h-4" /></Button></>}</TableCell>
                    </TableRow>))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><CardTitle>Evidence documents</CardTitle><CardDescription>Files are stored privately; links open for two minutes.</CardDescription></div>
                <div className="flex items-center gap-2">
                  <Select value={uploadMetric} onValueChange={setUploadMetric}><SelectTrigger className="w-56"><SelectValue placeholder="Metric for new file" /></SelectTrigger>
                    <SelectContent>{metrics.map((m) => <SelectItem key={m.id} value={m.metric_code}>{m.metric_code} — {m.title}</SelectItem>)}</SelectContent></Select>
                  <input type="file" id={`naac-upload-${criterionNumber}`} className="hidden" onChange={upload} accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" />
                  <Button size="sm" disabled={busy || metrics.length === 0} onClick={() => document.getElementById(`naac-upload-${criterionNumber}`)?.click()}><Upload className="w-4 h-4 mr-1" />Upload</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {metrics.length === 0 && <p className="text-xs text-muted-foreground mb-2">Add a metric first; evidence is filed under a metric.</p>}
              <Table>
                <TableHeader><TableRow><TableHead>Document</TableHead><TableHead>Metric</TableHead><TableHead>Type</TableHead><TableHead>Uploaded</TableHead><TableHead>Size</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>
                  {docs.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">No evidence uploaded yet.</TableCell></TableRow> : docs.map((d) => (
                    <TableRow key={d.id}><TableCell><span className="flex items-center gap-2"><FileText className="w-4 h-4" />{d.title}</span></TableCell><TableCell>{d.metricCode}</TableCell><TableCell>{d.fileType}</TableCell><TableCell>{d.uploadDate}</TableCell><TableCell>{d.fileSize}</TableCell><TableCell><EvidenceActions doc={d} /></TableCell></TableRow>))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={addOpen} onOpenChange={setAddOpen}><DialogContent><DialogHeader><DialogTitle>Add metric to criterion {criterionNumber}</DialogTitle></DialogHeader>
        <div className="grid gap-3"><div className="space-y-1"><Label>Metric code</Label><Input value={newM.code} onChange={(e) => setNewM({ ...newM, code: e.target.value })} /></div>
          <div className="space-y-1"><Label>Title</Label><Input value={newM.title} onChange={(e) => setNewM({ ...newM, title: e.target.value })} /></div></div>
        <DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button onClick={addMetric} disabled={busy}>Add</Button></DialogFooter></DialogContent></Dialog>

      {edit && <Dialog open onOpenChange={(o) => !o && setEdit(null)}><DialogContent><DialogHeader><DialogTitle>{edit.metric_code} — record data</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>Academic year</Label><Input value={edit.academic_year ?? ''} onChange={(e) => setEdit({ ...edit, academic_year: e.target.value })} placeholder="2025-26" /></div>
            <div className="space-y-1"><Label>Quantitative value</Label><Input type="number" value={edit.quantitative_value ?? ''} onChange={(e) => setEdit({ ...edit, quantitative_value: e.target.value === '' ? null : Number(e.target.value) })} /></div></div>
          <div className="space-y-1"><Label>Description</Label><Textarea rows={3} value={edit.description ?? ''} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></div>
          <div className="space-y-1"><Label>Remarks</Label><Textarea rows={2} value={edit.remarks ?? ''} onChange={(e) => setEdit({ ...edit, remarks: e.target.value })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button><Button disabled={busy} onClick={() => void run(() => naacService.updateMetric(edit.id, { academic_year: edit.academic_year || null, quantitative_value: edit.quantitative_value, description: edit.description || null, remarks: edit.remarks || null }), 'Saved', () => setEdit(null))}>Save</Button></DialogFooter></DialogContent></Dialog>}
    </div>
  );
}
