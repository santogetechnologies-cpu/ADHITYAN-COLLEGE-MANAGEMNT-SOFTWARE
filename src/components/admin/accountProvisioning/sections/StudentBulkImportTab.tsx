import React, { useState, useRef } from 'react';
import { 
  bulkAccountProvisioningService, 
  StudentBulkImportRow, 
  RowValidationResult, 
  BulkImportExecutionResult 
} from '@/services/bulkAccountProvisioningService';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  UserCheck, 
  Search, 
  RefreshCw,
  Loader2,
  Trash2,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface StudentBulkImportTabProps {
  onSuccess: () => void;
}

export function StudentBulkImportTab({ onSuccess }: StudentBulkImportTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rawRows, setRawRows] = useState<StudentBulkImportRow[]>([]);
  const [validationResults, setValidationResults] = useState<RowValidationResult<StudentBulkImportRow>[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [executionResult, setExecutionResult] = useState<BulkImportExecutionResult | null>(null);
  const [searchPreview, setSearchPreview] = useState('');

  // Sample CSV Download Template
  const handleDownloadTemplate = () => {
    const headers = ['Student Name', 'Student ID', 'Student Email', 'Initial Password', 'Department', 'Class Name'];
    const sampleRows = [
      {
        student_name: 'Ananya Sharma',
        student_id: 'STU-2026-001',
        student_email: 'ananya.sharma@adithyan.edu.in',
        initial_password: 'Edu@Ananya2026',
        department: 'Cardiac Technology',
        class_name: 'Semester 1'
      },
      {
        student_name: 'Manoj Kumar',
        student_id: 'STU-2026-002',
        student_email: 'manoj.kumar@adithyan.edu.in',
        initial_password: 'Edu@Manoj2026',
        department: 'Dialysis Technology',
        class_name: 'Semester 1'
      }
    ];

    const csv = bulkAccountProvisioningService.generateCSV(headers, sampleRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'student_login_import_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Downloaded student login CSV template');
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

        const mapped: StudentBulkImportRow[] = parsed.map(p => ({
          name: p.student_name || p.name || p.full_name || '',
          studentId: p.student_id || p.studentid || p.roll_number || p.roll_no || p.id || '',
          email: p.student_email || p.email || p.institutional_email || '',
          password: p.initial_password || p.password || p.temp_password || '',
          department: p.department || p.course || 'Paramedical Sciences',
          className: p.class_name || p.class || p.semester || 'Semester 1',
          phone: p.phone || p.mobile || ''
        }));

        setRawRows(mapped);
        setExecutionResult(null);

        // Run pre-validation
        setIsValidating(true);
        const validated = await bulkAccountProvisioningService.validateStudentRows(mapped);
        setValidationResults(validated);
        setIsValidating(false);

        const invalidCount = validated.filter(v => v.status === 'invalid').length;
        if (invalidCount > 0) {
          toast.warning(`File loaded with ${mapped.length} rows. ${invalidCount} rows have validation issues.`);
        } else {
          toast.success(`Successfully validated ${mapped.length} student login records!`);
        }
      } catch (err: any) {
        toast.error(`Failed to parse file: ${err.message || 'Unknown error'}`);
      }
    };

    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Run Bulk Provisioning Execution
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
      const res = await bulkAccountProvisioningService.executeStudentBulkImport(validItems);
      setExecutionResult(res);

      if (res.failureCount === 0) {
        toast.success(`🎉 Successfully provisioned ${res.successCount} student login accounts!`);
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

    const headers = ['Student Name', 'Student ID', 'Student Email', 'Failure Reason'];
    const rows = executionResult.failedRows.map(r => ({
      student_name: r.name || r.student_name || '',
      student_id: r.student_id || r.studentId || '',
      student_email: r.email || r.student_email || '',
      failure_reason: r.failure_reason || 'Unknown error'
    }));

    const csv = bulkAccountProvisioningService.generateCSV(headers, rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `failed_student_logins_${Date.now()}.csv`;
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
      (v.row.name || '').toLowerCase().includes(term) ||
      (v.row.studentId || '').toLowerCase().includes(term) ||
      (v.row.email || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      
      {/* 1. Instructions & Template Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center">
              <UserCheck className="w-5 h-5 mr-2 text-indigo-600" />
              Student Login Account Bulk Provisioning
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Upload batches of student credentials to generate portal access. Accounts are mapped to institutional student records via <strong>Student ID</strong> without altering official admission enrollment counts.
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
              <Upload className="w-3.5 h-3.5 mr-1" /> Upload CSV File
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Interactive Validation & Preview Section */}
      {validationResults.length > 0 && !executionResult && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-3">
              <span className="font-bold text-sm text-slate-900">Pre-Import Verification</span>
              <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-xs">
                {validCount} Valid Rows
              </Badge>
              {invalidCount > 0 && (
                <Badge className="bg-rose-50 text-rose-800 border-rose-200 text-xs">
                  {invalidCount} Invalid Rows
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
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Provisioning...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Provision {validCount} Accounts
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
                  <th className="p-2.5">Student Name</th>
                  <th className="p-2.5">Student ID</th>
                  <th className="p-2.5">Email Address</th>
                  <th className="p-2.5">Initial Password</th>
                  <th className="p-2.5">Validation Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPreview.map((item) => (
                  <tr key={item.index} className={item.status === 'invalid' ? 'bg-rose-50/40' : 'hover:bg-slate-50'}>
                    <td className="p-2.5 text-center font-mono text-slate-400 text-[11px]">{item.index + 1}</td>
                    <td className="p-2.5 font-bold text-slate-900">{item.row.name || <span className="text-rose-500">Missing</span>}</td>
                    <td className="p-2.5 font-mono text-indigo-700 font-semibold">{item.row.studentId || <span className="text-rose-500">Missing</span>}</td>
                    <td className="p-2.5 text-slate-600">{item.row.email || <span className="text-rose-500">Missing</span>}</td>
                    <td className="p-2.5 font-mono text-slate-500 text-[11px]">
                      {item.row.password ? '••••••••' : <span className="text-amber-600 italic">Auto-generated</span>}
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
              <h4 className="font-bold text-sm text-slate-900">Provisioning Results Report</h4>
              <p className="text-xs text-slate-500">
                Processed {executionResult.totalRows} student account rows: {executionResult.successCount} successful, {executionResult.failureCount} failed.
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
                  <th className="p-2.5">Email</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Result Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {executionResult.results.map((r) => (
                  <tr key={r.index} className={r.success ? 'bg-emerald-50/20' : 'bg-rose-50/40'}>
                    <td className="p-2.5 text-center font-mono text-[11px] text-slate-400">{r.index + 1}</td>
                    <td className="p-2.5 font-mono font-semibold text-slate-800">{r.row.student_id || r.row.studentId}</td>
                    <td className="p-2.5 text-slate-600">{r.row.email || r.row.student_email}</td>
                    <td className="p-2.5">
                      <Badge className={r.success ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}>
                        {r.success ? 'Created' : 'Failed'}
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
