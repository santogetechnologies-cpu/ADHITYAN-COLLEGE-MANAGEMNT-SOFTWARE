import React, { useState, useRef } from 'react';
import { 
  bulkAccountProvisioningService, 
  ParentBulkImportRow, 
  RowValidationResult, 
  BulkImportExecutionResult 
} from '@/services/bulkAccountProvisioningService';
import { 
  Upload, 
  Download, 
  Users, 
  Link2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Search, 
  RefreshCw,
  Loader2,
  UserCheck,
  UserPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface ParentBulkImportTabProps {
  onSuccess: () => void;
}

export function ParentBulkImportTab({ onSuccess }: ParentBulkImportTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rawRows, setRawRows] = useState<ParentBulkImportRow[]>([]);
  const [validationResults, setValidationResults] = useState<RowValidationResult<ParentBulkImportRow>[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [executionResult, setExecutionResult] = useState<BulkImportExecutionResult | null>(null);
  const [searchPreview, setSearchPreview] = useState('');

  // Sample CSV Download Template
  const handleDownloadTemplate = () => {
    const headers = ['Student ID', 'Parent Name', 'Parent Email', 'Initial Password', 'Relationship'];
    const sampleRows = [
      {
        student_id: 'STU-2026-001',
        parent_name: 'Rajesh Sharma',
        parent_email: 'rajesh.sharma@gmail.com',
        initial_password: 'Par@Pass2026',
        relationship: 'Father'
      },
      {
        student_id: 'STU-2026-002',
        parent_name: 'Sunita Kumar',
        parent_email: 'sunita.kumar@gmail.com',
        initial_password: 'Par@Pass2026',
        relationship: 'Mother'
      }
    ];

    const csv = bulkAccountProvisioningService.generateCSV(headers, sampleRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'parent_account_import_and_linking_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Downloaded parent account CSV template');
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

        const mapped: ParentBulkImportRow[] = parsed.map(p => ({
          studentId: p.student_id || p.studentid || p.roll_number || p.roll_no || '',
          parentName: p.parent_name || p.name || p.guardian_name || '',
          parentEmail: p.parent_email || p.email || p.guardian_email || '',
          password: p.initial_password || p.password || p.temp_password || '',
          relationship: p.relationship || p.relation || 'Parent'
        }));

        setRawRows(mapped);
        setExecutionResult(null);

        // Run pre-validation
        setIsValidating(true);
        const validated = await bulkAccountProvisioningService.validateParentRows(mapped);
        setValidationResults(validated);
        setIsValidating(false);

        const invalidCount = validated.filter(v => v.status === 'invalid').length;
        if (invalidCount > 0) {
          toast.warning(`File loaded with ${mapped.length} rows. ${invalidCount} rows have validation issues.`);
        } else {
          toast.success(`Successfully validated ${mapped.length} parent records!`);
        }
      } catch (err: any) {
        toast.error(`Failed to parse file: ${err.message || 'Unknown error'}`);
      }
    };

    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Run Bulk Parent Import & Linking
  const handleExecuteImport = async () => {
    const validItems = validationResults
      .filter(v => v.status !== 'invalid')
      .map(v => v.row);

    if (validItems.length === 0) {
      toast.error('No valid rows available to import.');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await bulkAccountProvisioningService.executeParentBulkImport(validItems);
      setExecutionResult(res);

      if (res.failureCount === 0) {
        toast.success(`🎉 Successfully processed ${res.successCount} parent accounts & student links!`);
      } else {
        toast.warning(`Import complete: ${res.successCount} succeeded, ${res.failureCount} failed.`);
      }

      onSuccess();
    } catch (err: any) {
      toast.error(`Bulk import failed: ${err.message || 'Unknown server error'}`);
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

    const headers = ['Student ID', 'Parent Name', 'Parent Email', 'Failure Reason'];
    const rows = executionResult.failedRows.map(r => ({
      student_id: r.student_id || r.studentId || '',
      parent_name: r.parent_name || r.name || '',
      parent_email: r.parent_email || r.email || '',
      failure_reason: r.failure_reason || 'Unknown error'
    }));

    const csv = bulkAccountProvisioningService.generateCSV(headers, rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `failed_parent_imports_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Downloaded failed rows CSV for correction');
  };

  const validCount = validationResults.filter(v => v.status !== 'invalid').length;
  const invalidCount = validationResults.filter(v => v.status === 'invalid').length;

  const filteredPreview = validationResults.filter(v => {
    const term = searchPreview.toLowerCase();
    return (
      (v.row.studentId || '').toLowerCase().includes(term) ||
      (v.row.parentName || '').toLowerCase().includes(term) ||
      (v.row.parentEmail || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      
      {/* 1. Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center">
              <Users className="w-5 h-5 mr-2 text-violet-600" />
              Parent Account Bulk Provisioning & Student Linking
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Upload parent details and map them directly to enrolled students using <strong>Student ID</strong>. Existing parent accounts are reused without duplicates, supporting multiple children per guardian. Parent accounts never increase student counts.
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
              className="h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white font-semibold"
            >
              <Upload className="w-3.5 h-3.5 mr-1" /> Upload Parent CSV
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Interactive Validation & Preview Section */}
      {validationResults.length > 0 && !executionResult && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-3">
              <span className="font-bold text-sm text-slate-900">Pre-Import Verification & Student ID Match</span>
              <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-xs">
                {validCount} Ready to Link
              </Badge>
              {invalidCount > 0 && (
                <Badge className="bg-rose-50 text-rose-800 border-rose-200 text-xs">
                  {invalidCount} Errors
                </Badge>
              )}
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
                onClick={() => { setRawRows([]); setValidationResults([]); }}
                className="text-xs h-8 text-slate-500"
              >
                Clear
              </Button>

              <Button
                size="sm"
                disabled={validCount === 0 || isProcessing}
                onClick={handleExecuteImport}
                className="h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white font-bold"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Linking...
                  </>
                ) : (
                  <>
                    <Link2 className="w-3.5 h-3.5 mr-1" /> Provision & Link {validCount} Parents
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Table Preview */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="p-2.5 w-12 text-center">Row</th>
                  <th className="p-2.5">Student ID Reference</th>
                  <th className="p-2.5">Matched Enrolled Student</th>
                  <th className="p-2.5">Parent Name</th>
                  <th className="p-2.5">Parent Email</th>
                  <th className="p-2.5">Account Strategy</th>
                  <th className="p-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPreview.map((item) => (
                  <tr key={item.index} className={item.status === 'invalid' ? 'bg-rose-50/40' : 'hover:bg-slate-50'}>
                    <td className="p-2.5 text-center font-mono text-slate-400 text-[11px]">{item.index + 1}</td>
                    <td className="p-2.5 font-mono text-indigo-700 font-semibold">{item.row.studentId || <span className="text-rose-500">Missing</span>}</td>
                    <td className="p-2.5 font-medium text-slate-900">
                      {item.matchedStudent ? (
                        <span className="text-emerald-700 flex items-center">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> {item.matchedStudent.name}
                        </span>
                      ) : (
                        <span className="text-rose-600 flex items-center">
                          <XCircle className="w-3 h-3 mr-1" /> Not Found
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 font-bold text-slate-800">{item.row.parentName || <span className="text-rose-500">Missing</span>}</td>
                    <td className="p-2.5 text-slate-600">{item.row.parentEmail || <span className="text-rose-500">Missing</span>}</td>
                    <td className="p-2.5">
                      {item.isParentReused ? (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
                          Reuse Existing Account
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                          Create New Account
                        </Badge>
                      )}
                    </td>
                    <td className="p-2.5">
                      {item.status === 'valid' ? (
                        <span className="inline-flex items-center text-emerald-700 text-[11px] font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Ready
                        </span>
                      ) : item.status === 'warning' ? (
                        <span className="inline-flex items-center text-amber-700 text-[11px] font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600" /> {item.warnings[0]}
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-rose-700 text-[11px] font-semibold">
                          <XCircle className="w-3.5 h-3.5 mr-1 text-rose-600 shrink-0" /> {item.errors.join(' • ')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Execution Results & Failed Rows Download */}
      {executionResult && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h4 className="font-bold text-sm text-slate-900">Parent Linking Results Report</h4>
              <p className="text-xs text-slate-500">
                Processed {executionResult.totalRows} parent rows: {executionResult.successCount} linked successfully, {executionResult.failureCount} failed.
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
                onClick={() => { setExecutionResult(null); setValidationResults([]); setRawRows([]); }}
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
                  <th className="p-2.5 w-12 text-center">Row</th>
                  <th className="p-2.5">Student ID</th>
                  <th className="p-2.5">Parent Email</th>
                  <th className="p-2.5">Strategy</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Result Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {executionResult.results.map((r) => (
                  <tr key={r.index} className={r.success ? 'bg-emerald-50/20' : 'bg-rose-50/40'}>
                    <td className="p-2.5 text-center font-mono text-[11px] text-slate-400">{r.index + 1}</td>
                    <td className="p-2.5 font-mono font-semibold text-slate-800">{r.row.student_id || r.row.studentId}</td>
                    <td className="p-2.5 text-slate-600">{r.row.parent_email || r.row.email}</td>
                    <td className="p-2.5">
                      <Badge variant="outline" className={r.isReused ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}>
                        {r.isReused ? 'Reused Account' : 'New Account'}
                      </Badge>
                    </td>
                    <td className="p-2.5">
                      <Badge className={r.success ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}>
                        {r.success ? 'Linked' : 'Failed'}
                      </Badge>
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
