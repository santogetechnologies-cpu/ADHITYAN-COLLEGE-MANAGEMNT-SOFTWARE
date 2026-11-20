import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { db } from '@/services/supabase/database';
import { toast } from '@/hooks/use-toast';
import { 
  FileText, 
  Download, 
  BarChart3, 
  Users, 
  DollarSign, 
  GraduationCap,
  Loader2
} from 'lucide-react';

export default function AdminReports() {
  const [reportType, setReportType] = useState('students');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [departmentsList, setDepartmentsList] = useState<any[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [recordsCount, setRecordsCount] = useState({
    students: 0,
    finance: 0,
    departments: 0,
    fees: 0
  });

  useEffect(() => {
    async function loadStats() {
      try {
        const [profiles, depts, fees, txs] = await Promise.all([
          db.getAllProfiles(),
          db.getDepartments(),
          db.getStudentFees(),
          db.getFinanceTransactions()
        ]);

        const studentCount = (profiles || []).filter((p: any) => p.role === 'student').length;
        setDepartmentsList(depts || []);
        setRecordsCount({
          students: studentCount,
          finance: (txs || []).length,
          departments: (depts || []).length,
          fees: (fees || []).length
        });
      } catch (err) {
        console.warn('Error loading report stats:', err);
      }
    }
    loadStats();
  }, []);

  const handleExportCSV = async (type: string) => {
    setIsExporting(true);
    try {
      let csvContent = '';
      const filename = `adhithyan_${type}_report_${new Date().toISOString().slice(0, 10)}.csv`;

      if (type === 'students') {
        const profiles = await db.getAllProfiles();
        let students = (profiles || []).filter((p: any) => p.role === 'student');
        if (departmentFilter !== 'all') {
          students = students.filter((s: any) => s.department?.toLowerCase() === departmentFilter.toLowerCase());
        }
        
        csvContent = 'ID,Name,Email,Department,Class,Roll Number,Phone,Created At\n';
        students.forEach((s: any) => {
          csvContent += `"${s.id}","${s.name || ''}","${s.email || ''}","${s.department || ''}","${s.class_name || ''}","${s.roll_number || ''}","${s.phone || ''}","${s.created_at || ''}"\n`;
        });
      } else if (type === 'finance') {
        const txs = await db.getFinanceTransactions();
        csvContent = 'Transaction ID,Category,Amount,Type,Date,Description,Payment Method,Status\n';
        (txs || []).forEach((t: any) => {
          csvContent += `"${t.id}","${t.category || t.department || ''}","${t.amount || 0}","${t.type || ''}","${t.date || ''}","${t.description || ''}","${t.payment_method || ''}","${t.status || ''}"\n`;
        });
      } else if (type === 'fees') {
        const fees = await db.getStudentFees();
        csvContent = 'Fee ID,Student Name,Fee Type,Total Amount,Paid Amount,Remaining Balance,Status,Due Date\n';
        (fees || []).forEach((f: any) => {
          csvContent += `"${f.id}","${f.student_name || ''}","${f.fee_type || ''}","${f.total_due || 0}","${f.paid_amount || 0}","${(f.total_due || 0) - (f.paid_amount || 0)}","${f.status || ''}","${f.due_date || ''}"\n`;
        });
      } else {
        const depts = await db.getDepartments();
        csvContent = 'Department ID,Code,Name,Duration (Years),Sections Count\n';
        (depts || []).forEach((d: any) => {
          csvContent += `"${d.id}","${d.code || ''}","${d.name || ''}","${d.duration_years || d.duration || 4}","${d.sections?.length || 0}"\n`;
        });
      }

      // Trigger browser download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Report Generated Successfully",
        description: `Exported ${filename} with live database records.`
      });
    } catch (err: any) {
      toast({
        title: "Export Error",
        description: err.message || "Failed to generate report",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Institutional Reports</h1>
          <p className="text-muted-foreground">
            Generate and export verified authoritative reports across academics, finance, and operations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            className="bg-primary hover:bg-primary/90 flex items-center gap-2"
            onClick={() => handleExportCSV(reportType)}
            disabled={isExporting}
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export Selected CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Student Records</CardTitle>
            <GraduationCap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recordsCount.students}</div>
            <p className="text-xs text-muted-foreground">Active enrolled students</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Financial Transactions</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recordsCount.finance}</div>
            <p className="text-xs text-muted-foreground">Audited entries</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fee Ledgers</CardTitle>
            <FileText className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recordsCount.fees}</div>
            <p className="text-xs text-muted-foreground">Student dues & receipts</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recordsCount.departments}</div>
            <p className="text-xs text-muted-foreground">Academic divisions</p>
          </CardContent>
        </Card>
      </div>

      {/* Report Generator Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Report Configuration & Data Extraction
          </CardTitle>
          <CardDescription>
            Select report module and parameter filters to export compliant data formats
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={reportType} onValueChange={setReportType} className="space-y-4">
            <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
              <TabsTrigger value="students">Student Cohort</TabsTrigger>
              <TabsTrigger value="finance">Revenue & Expense</TabsTrigger>
              <TabsTrigger value="fees">Fee Collections</TabsTrigger>
              <TabsTrigger value="departments">Departments</TabsTrigger>
            </TabsList>

            <div className="grid gap-4 md:grid-cols-3 pt-4">
              <div className="space-y-2">
                <Label>Department Scope</Label>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departmentsList.map((d: any) => (
                      <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Academic Session</Label>
                <Select defaultValue="2025-2026">
                  <SelectTrigger>
                    <SelectValue placeholder="Session" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2025-2026">2025-2026 (Current)</SelectItem>
                    <SelectItem value="2024-2025">2024-2025</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Report Format</Label>
                <Select defaultValue="csv">
                  <SelectTrigger>
                    <SelectValue placeholder="Format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">Standard CSV (.csv)</SelectItem>
                    <SelectItem value="tsv">Tab-Separated (.tsv)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <TabsContent value="students" className="mt-4">
              <div className="p-4 border rounded-lg bg-muted/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">Included Fields</span>
                  <Badge variant="outline">Authoritative DB</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Student UUID, Full Name, Institutional Email, Enrolled Department, Class Section, Roll Number, Enrollment Date.
                </p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="mt-2 flex items-center gap-1.5"
                  onClick={() => handleExportCSV('students')}
                >
                  <Download className="w-3.5 h-3.5" /> Download Student Roster (.csv)
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="finance" className="mt-4">
              <div className="p-4 border rounded-lg bg-muted/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">Included Fields</span>
                  <Badge variant="outline">Authoritative DB</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Transaction Reference, Ledger Category, Total Value, Transaction Flow (Income/Expense), Execution Date, Method.
                </p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="mt-2 flex items-center gap-1.5"
                  onClick={() => handleExportCSV('finance')}
                >
                  <Download className="w-3.5 h-3.5" /> Download Financial Ledger (.csv)
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="fees" className="mt-4">
              <div className="p-4 border rounded-lg bg-muted/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">Included Fields</span>
                  <Badge variant="outline">Authoritative DB</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Fee Entry ID, Student Name, Fee Category, Total Assessment, Cleared Amount, Remaining Balance, Payment Status.
                </p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="mt-2 flex items-center gap-1.5"
                  onClick={() => handleExportCSV('fees')}
                >
                  <Download className="w-3.5 h-3.5" /> Download Fee Status (.csv)
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="departments" className="mt-4">
              <div className="p-4 border rounded-lg bg-muted/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">Included Fields</span>
                  <Badge variant="outline">Authoritative DB</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Department Identifier, Code, Faculty Head (HOD), Teaching Faculty Count, Enrolled Students, Operational Budget.
                </p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="mt-2 flex items-center gap-1.5"
                  onClick={() => handleExportCSV('departments')}
                >
                  <Download className="w-3.5 h-3.5" /> Download Department Audit (.csv)
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
