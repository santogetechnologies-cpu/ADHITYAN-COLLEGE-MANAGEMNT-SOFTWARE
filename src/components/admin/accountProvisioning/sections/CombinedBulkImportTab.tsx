import React, { useState, useRef } from 'react';
import { 
  bulkAccountProvisioningService, 
  CombinedBulkImportRow, 
  BulkImportExecutionResult 
} from '@/services/bulkAccountProvisioningService';
import { 
  Upload, 
  Download, 
  Users, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Search, 
  Loader2,
  Layers,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface CombinedBulkImportTabProps {
  onSuccess: () => void;
}

export function CombinedBulkImportTab({ onSuccess }: CombinedBulkImportTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rawRows, setRawRows] = useState<CombinedBulkImportRow[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [executionResult, setExecutionResult] = useState<BulkImportExecutionResult | null>(null);
  const [searchPreview, setSearchPreview] = useState('');

  // Sample CSV Download Template
  const handleDownloadTemplate = () => {
    const headers = [
      'Student Name',
      'Student ID',
      'Student Email',
      'Student Password',
      'Parent Name',
      'Parent Email',
      'Parent Password',
      'Relationship',
      'Department',
      'Class Name'
    ];
    const sampleRows = [
      {
        student_name: 'Pooja Krishnan',
        student_id: 'STU-2026-005',
        student_email: 'pooja.krishnan@adithyan.edu.in',
        student_password: 'Edu@Pooja2026',
        parent_name: 'Krishnan V',
        parent_email: 'krishnan.v@gmail.com',
        parent_password: 'Par@Krishnan26',
        relationship: 'Father',
        department: 'Cardiac Technology',
        class_name: 'Semester 1'
      },
      {
        student_name: 'Suresh Babu',
        student_id: 'STU-2026-006',
        student_email: 'suresh.babu@adithyan.edu.in',
        student_password: 'Edu@Suresh2026',
        parent_name: '', // Missing parent info test
        parent_email: '',
        parent_password: '',
        relationship: '',
        department: 'Radiology',
        class_name: 'Semester 1'
      }
    ];

    const csv = bulkAccountProvisioningService.generateCSV(headers, sampleRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'combined_student_parent_import_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Downloaded combined import CSV template');
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = bulkAccountProvisioningService.parseCSV(text);

        if (parsed.length === 0) {
          toast.error('The selected file is empty or missing headers.');
          return;
        }

        const mapped: CombinedBulkImportRow[] = parsed.map(p => ({
          studentName: p.student_name || p.name || '',
          studentId: p.student_id || p.studentid || p.roll_number || '',
          studentEmail: p.student_email || p.email || '',
          studentPassword: p.student_password || p.password || '',
          parentName: p.parent_name || p.guardian_name || '',
          parentEmail: p.parent_email || p.guardian_email || '',
          parentPassword: p.parent_password || '',
          relationship: p.relationship || 'Parent',
          department: p.department || 'Paramedical Sciences',
          className: p.class_name || 'Semester 1'
        }));

        setRawRows(mapped);
        setExecutionResult(null);
        toast.success(`Loaded ${mapped.length} rows for combined import preview.`);
      } catch (err: any) {
        toast.error(`Failed to parse file: ${err.message || 'Unknown error'}`);
      }
    };

    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Run Bulk Execution
  const handleExecuteImport = async () => {
    if (rawRows.length === 0) {
      toast.error('No rows to import.');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await bulkAccountProvisioningService.executeCombinedBulkImport(rawRows);
      setExecutionResult(res);

      if (res.failureCount === 0) {
        toast.success(`🎉 Successfully processed ${res.successCount} student logins & parent links!`);
      } else {
        toast.warning(`Combined import complete: ${res.successCount} succeeded, ${res.failureCount} failed.`);
      }

      onSuccess();
    } catch (err: any) {
      toast.error(`Combined import failed: ${err.message || 'Server error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Download Failed Rows CSV
  const handleDownloadFailedRows = () => {
    if (!executionResult || executionResult.failedRows.length === 0) {
      toast.info('No failed rows to download.');
      return;
    }

    const headers = ['Student Name', 'Student ID', 'Student Email', 'Parent Name', 'Parent Email', 'Failure Reason'];
    const rows = executionResult.failedRows.map(r => ({
      student_name: r.student_name || r.name || '',
      student_id: r.student_id || '',
      student_email: r.student_email || r.email || '',
      parent_name: r.parent_name || '',
      parent_email: r.parent_email || '',
      failure_reason: r.failure_reason || 'Unknown error'
    }));

    const csv = bulkAccountProvisioningService.generateCSV(headers, rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `failed_combined_imports_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Downloaded failed rows CSV for correction');
  };

  const filteredRows = rawRows.filter(r => {
    const term = searchPreview.toLowerCase();
    return (
      (r.studentName || '').toLowerCase().includes(term) ||
      (r.studentId || '').toLowerCase().includes(term) ||
      (r.studentEmail || '').toLowerCase().includes(term) ||
      (r.parentName || '').toLowerCase().includes(term) ||
      (r.parentEmail || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      
      {/* 1. Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center">
              <Layers className="w-5 h-5 mr-2 text-indigo-600" />
              Combined Student Login & Parent Account Bulk Import
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Provision student login credentials and create or reuse linked parent accounts in a single file upload. <strong>Graceful Fallback</strong>: If parent details are omitted for any row, the student login is created successfully without failing the row.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="text-xs h-8 text-slate-700 hover:bg-slate-50 border-slate-300"
            >
              <Download className="w-3.5 h-3.5 mr-1 text-slate-500" /> Download Template
            </Button>

            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />

            <Button
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              <Upload className="w-3.5 h-3.5 mr-1" /> Upload Combined CSV
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Preview Table */}
      {rawRows.length > 0 && !executionResult && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-3">
              <span className="font-bold text-sm text-slate-900">Combined File Preview</span>
              <Badge className="bg-indigo-50 text-indigo-800 border-indigo-200 text-xs">
                {rawRows.length} Rows Loaded
              </Badge>
            </div>

            <div className="flex items-center space-x-2">
              <div className="relative w-48">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Filter rows..."
                  value={searchPreview}
                  onChange={e => setSearchPreview(e.target.value)}
                  className="pl-8 h-8 text-xs bg-slate-50 border-slate-200"
                />
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRawRows([])}
                className="text-xs h-8 text-slate-500"
              >
                Clear
              </Button>

              <Button
                size="sm"
                disabled={isProcessing || rawRows.length === 0}
                onClick={handleExecuteImport}
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Process All {rawRows.length} Records
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="p-2.5 w-10 text-center">#</th>
                  <th className="p-2.5">Student Details</th>
                  <th className="p-2.5">Student ID</th>
                  <th className="p-2.5">Parent Details</th>
                  <th className="p-2.5">Parent Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((r, i) => {
                  const hasParent = Boolean(r.parentName && r.parentEmail);
                  return (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-2.5 text-center font-mono text-slate-400 text-[11px]">{i + 1}</td>
                      <td className="p-2.5">
                        <div className="font-bold text-slate-900">{r.studentName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{r.studentEmail}</div>
                      </td>
                      <td className="p-2.5 font-mono font-semibold text-indigo-700">{r.studentId}</td>
                      <td className="p-2.5">
                        {hasParent ? (
                          <div>
                            <div className="font-medium text-slate-800">{r.parentName} ({r.relationship || 'Parent'})</div>
                            <div className="text-[11px] text-slate-500 font-mono">{r.parentEmail}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No parent info provided</span>
                        )}
                      </td>
                      <td className="p-2.5">
                        {hasParent ? (
                          <Badge className="bg-violet-100 text-violet-800 border-violet-200 text-[10px]">
                            Student + Parent Linking
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-500 border-slate-300 text-[10px]">
                            Student Login Only
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Execution Results Report */}
      {executionResult && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h4 className="font-bold text-sm text-slate-900">Combined Import Results Report</h4>
              <p className="text-xs text-slate-500">
                Processed {executionResult.totalRows} combined records: {executionResult.successCount} succeeded, {executionResult.failureCount} failed.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              {executionResult.failureCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadFailedRows}
                  className="h-8 text-xs border-rose-300 text-rose-700 hover:bg-rose-50 font-semibold"
                >
                  <Download className="w-3.5 h-3.5 mr-1 text-rose-600" /> Download {executionResult.failureCount} Failed Rows
                </Button>
              )}

              <Button
                variant="secondary"
                size="sm"
                onClick={() => { setExecutionResult(null); setRawRows([]); }}
                className="h-8 text-xs"
              >
                Start New Import
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-80 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px] sticky top-0">
                <tr>
                  <th className="p-2.5 w-10 text-center">#</th>
                  <th className="p-2.5">Student ID</th>
                  <th className="p-2.5">Student Login</th>
                  <th className="p-2.5">Parent Account</th>
                  <th className="p-2.5">Status Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {executionResult.results.map((r) => (
                  <tr key={r.index} className={r.success ? 'bg-emerald-50/20' : 'bg-rose-50/40'}>
                    <td className="p-2.5 text-center font-mono text-[11px] text-slate-400">{r.index + 1}</td>
                    <td className="p-2.5 font-mono font-semibold text-slate-800">{r.row.student_id || r.row.studentId}</td>
                    <td className="p-2.5">
                      <Badge className={r.success ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}>
                        {r.success ? 'Provisioned' : 'Failed'}
                      </Badge>
                    </td>
                    <td className="p-2.5">
                      {(r as any).parentLinked ? (
                        <Badge className="bg-violet-100 text-violet-800">Linked</Badge>
                      ) : (
                        <span className="text-slate-400 text-[11px]">N/A</span>
                      )}
                    </td>
                    <td className="p-2.5 text-slate-600 text-[11px]">{r.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
