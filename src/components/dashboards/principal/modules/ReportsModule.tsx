import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  BarChart3, 
  Download, 
  Printer, 
  FileText, 
  Users, 
  GraduationCap, 
  Building2, 
  Clock, 
  Award, 
  CheckCircle2, 
  Sparkles,
  Calendar
} from 'lucide-react';
import { 
  Profile, 
  Department, 
  AdmissionApplication, 
  StaffLeaveApplication, 
  ScholarshipApplication,
  ExamResult 
} from '@/types/database.types';
import { InstitutionName, getInstitutionName } from '@/lib/institution';

interface ReportsModuleProps {
  students: Profile[];
  faculty: Profile[];
  departments: Department[];
  admissions: AdmissionApplication[];
  leaves: StaffLeaveApplication[];
  scholarships: ScholarshipApplication[];
  examResults: ExamResult[];
  attendanceMetrics: { rate: number; totalRecords: number; presentRecords: number };
}

interface InstitutionalReport {
  id: string;
  title: string;
  description: string;
  category: 'Academics' | 'Students' | 'Faculty' | 'Administration' | 'Examinations';
  icon: React.ComponentType<{ className?: string }>;
  getData: () => { headers: string[]; rows: (string | number)[][] };
}

export function ReportsModule({
  students,
  faculty,
  departments,
  admissions,
  leaves,
  scholarships,
  examResults,
  attendanceMetrics
}: ReportsModuleProps) {
  const [selectedReport, setSelectedReport] = useState<InstitutionalReport | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [previewData, setPreviewData] = useState<{ headers: string[]; rows: (string | number)[][] } | null>(null);

  // Define 9 Real Institutional Reports
  const reports: InstitutionalReport[] = [
    {
      id: 'student-strength',
      title: 'Student Strength & Enrollment Register',
      description: 'Department and class-wise breakdown of all enrolled paramedical students with admission IDs and contact info.',
      category: 'Students',
      icon: Users,
      getData: () => {
        const headers = ['Student ID', 'Full Name', 'Department / Program', 'Class / Year', 'Email', 'Phone', 'Enrollment Status'];
        const rows = students.map(s => [
          s.student_id || s.id.slice(0, 8),
          s.name,
          s.department || 'Paramedical Sciences',
          s.class_name || 'Year 1',
          s.email || '—',
          s.phone_number || '—',
          s.enrollment_status || 'Active'
        ]);
        return { headers, rows };
      }
    },
    {
      id: 'dept-allocation',
      title: 'Department & Faculty Allocation Matrix',
      description: 'Institutional department capacity, allocated faculty count, enrolled student strength, and faculty-to-student ratios.',
      category: 'Academics',
      icon: Building2,
      getData: () => {
        const headers = ['Department Code', 'Department Name', 'Duration (Yrs)', 'Faculty Count', 'Student Strength', 'F:S Ratio'];
        const rows = departments.map(d => {
          const dName = (d.name || '').toLowerCase();
          const dStudents = students.filter(s => (s.department || '').toLowerCase().includes(dName)).length;
          const dFaculty = faculty.filter(f => (f.department || '').toLowerCase().includes(dName)).length;
          const ratio = dFaculty > 0 ? `1:${Math.round(dStudents / dFaculty)}` : 'N/A';
          return [d.code || 'PARAMED', d.name, d.duration || 3, dFaculty, dStudents, ratio];
        });
        return { headers, rows };
      }
    },
    {
      id: 'faculty-roster',
      title: 'Faculty Roster & Workload Directory',
      description: 'Complete roster of teaching and clinical staff with designations, departments, employee IDs, and assigned classes.',
      category: 'Faculty',
      icon: GraduationCap,
      getData: () => {
        const headers = ['Staff ID', 'Faculty Name', 'Department', 'Designation', 'Email', 'Assigned Classes'];
        const rows = faculty.map(f => [
          f.staff_id || f.id.slice(0, 8),
          f.name,
          f.department || 'Paramedical',
          f.designation || 'Lecturer / Clinical Instructor',
          f.email || '—',
          (f.assigned_classes || []).join(', ') || 'General'
        ]);
        return { headers, rows };
      }
    },
    {
      id: 'student-attendance',
      title: 'Institutional Attendance Compliance Summary',
      description: 'Overall student attendance compliance figures, lecture participation rates, and attendance shortages across all programs.',
      category: 'Academics',
      icon: Clock,
      getData: () => {
        const headers = ['Metric', 'Recorded Value', 'Institutional Benchmark', 'Compliance Status'];
        const rows = [
          ['Overall Institutional Attendance Rate', `${attendanceMetrics.rate}%`, '>= 75.0%', attendanceMetrics.rate >= 75 ? 'Compliant' : 'Shortage Alert'],
          ['Total Lecture Attendance Records Logged', attendanceMetrics.totalRecords, '—', 'Recorded in Supabase'],
          ['Total Present Log Entries', attendanceMetrics.presentRecords, '—', 'Verified'],
          ['Mandatory Attendance Policy Threshold', '75.0%', '75.0%', 'Mandatory for Exam Clearance']
        ];
        return { headers, rows };
      }
    },
    {
      id: 'faculty-leaves',
      title: 'Faculty Leave & Absence Register',
      description: 'Record of faculty leave applications, sanctioned dates, leave categories, and Principal approval status.',
      category: 'Faculty',
      icon: Clock,
      getData: () => {
        const headers = ['Application ID', 'Staff Name', 'Department', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Status'];
        const rows = leaves.map(l => [
          l.id.slice(0, 8),
          l.staff_name,
          l.department,
          l.leave_type,
          l.start_date,
          l.end_date,
          l.total_days,
          l.status
        ]);
        return { headers, rows };
      }
    },
    {
      id: 'exam-performance',
      title: 'Examination Performance & Pass Rate Analytics',
      description: 'Consolidated examination results, subject-wise marks distribution, and institutional pass rate figures.',
      category: 'Examinations',
      icon: Award,
      getData: () => {
        const headers = ['Student ID', 'Subject / Paper', 'Marks Obtained', 'Max Marks', 'Status', 'Exam Session'];
        const rows = examResults.map(r => [
          r.student_id || '—',
          r.subject || 'Paramedical Science Paper',
          r.marks_obtained,
          r.max_marks || 100,
          r.status || ((r.marks_obtained || 0) >= 50 ? 'Pass' : 'Fail'),
          r.exam_id || 'Current Term'
        ]);
        return { headers, rows };
      }
    },
    {
      id: 'admissions-intake',
      title: 'Admissions Intake & Sanction Analysis',
      description: 'Paramedical candidate intake statistics, department-wise application count, sanctioned seats, and conversion rates.',
      category: 'Administration',
      icon: FileText,
      getData: () => {
        const headers = ['Application No', 'Applicant Name', 'Program Applied', 'Parent Name', 'Mobile', 'Submission Date', 'Sanction Status'];
        const rows = admissions.map(a => [
          a.application_number || a.application_no || a.id.slice(0, 8),
          a.applicant_name || a.name || 'Applicant',
          a.class_name || a.class_applied || 'Paramedical Sciences',
          a.parent_name || '—',
          a.phone || '—',
          a.created_at ? new Date(a.created_at).toLocaleDateString() : '—',
          a.status
        ]);
        return { headers, rows };
      }
    },
    {
      id: 'scholarship-disbursement',
      title: 'Scholarships & Institutional Fee Concessions',
      description: 'Audited record of student scholarship applications, requested amounts, sanctioned concessions, and Principal approvals.',
      category: 'Administration',
      icon: Award,
      getData: () => {
        const headers = ['Sanction ID', 'Student Name', 'Department', 'Scholarship Scheme', 'Requested (₹)', 'Sanctioned (₹)', 'Approval Status'];
        const rows = scholarships.map(s => [
          s.id.slice(0, 8),
          s.student_name,
          s.department,
          s.scholarship_name,
          s.requested_amount || 0,
          s.sanctioned_amount || 0,
          s.status
        ]);
        return { headers, rows };
      }
    },
    {
      id: 'college-overview',
      title: 'Comprehensive College Governance Overview',
      description: 'Executive snapshot of overall institutional health: total enrollment, faculty strength, compliance, and active programs.',
      category: 'Administration',
      icon: Sparkles,
      getData: () => {
        const headers = ['Institutional Metric', 'Current Statistic', 'Notes & Accreditations'];
        const rows = [
          ['Institution Name', getInstitutionName(), 'Affiliated Paramedical & Allied Health'],
          ['Total Enrolled Students', students.length, 'Central Supabase Profile Registry'],
          ['Total Teaching & Clinical Faculty', faculty.length, 'Verified Faculty Accounts'],
          ['Academic Departments / Programs', departments.length, 'B.Voc / Diploma Programs'],
          ['Total Admissions Processed', admissions.length, 'Central Intake Database'],
          ['Institutional Attendance Rate', `${attendanceMetrics.rate}%`, 'Student Attendance Compliance'],
          ['Approved Scholarships / Concessions', scholarships.filter(s => s.status === 'Approved').length, 'Principal Sanctioned'],
          ['Sanctioned Faculty Leaves', leaves.filter(l => l.status === 'Approved').length, 'Principal Authorized']
        ];
        return { headers, rows };
      }
    }
  ];

  const filteredReports = activeCategory === 'All' 
    ? reports 
    : reports.filter(r => r.category === activeCategory);

  // CSV Export Trigger
  const handleExportCSV = (report: InstitutionalReport) => {
    const { headers, rows } = report.getData();
    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(val => {
          const str = String(val ?? '');
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${report.id}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenPreview = (report: InstitutionalReport) => {
    setSelectedReport(report);
    setPreviewData(report.getData());
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Categories */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Institutional Reports & Regulatory Governance
            </h2>
            <Badge variant="outline" className="text-xs border-blue-200 text-blue-700 bg-blue-50">
              Paramedical Compliance
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Generate, preview, print, and export official administrative and academic institutional data.
          </p>
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['All', 'Academics', 'Students', 'Faculty', 'Examinations', 'Administration'].map((cat) => (
            <Button
              key={cat}
              variant={activeCategory === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveCategory(cat)}
              className="h-7 text-xs font-medium px-2.5"
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* 2. Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredReports.map((report) => {
          const Icon = report.icon;
          return (
            <Card key={report.id} className="border-slate-200 shadow-2xs hover:border-primary/40 transition-all flex flex-col justify-between">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-600 bg-slate-50">
                    {report.category}
                  </Badge>
                </div>
                <CardTitle className="text-sm font-bold text-slate-900 mt-2 line-clamp-1">
                  {report.title}
                </CardTitle>
                <CardDescription className="text-xs text-slate-600 line-clamp-2 mt-1">
                  {report.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 pt-2">
                <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-7 text-xs font-medium"
                    onClick={() => handleOpenPreview(report)}
                  >
                    <FileText className="w-3.5 h-3.5 mr-1 text-slate-500" />
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 h-7 text-xs font-semibold bg-primary text-primary-foreground"
                    onClick={() => handleExportCSV(report)}
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    CSV Export
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 3. Report Preview & Print Modal */}
      <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
        {selectedReport && previewData && (
          <DialogContent className="max-w-4xl max-h-[85vh] bg-white p-6 rounded-xl flex flex-col">
            <DialogHeader className="border-b border-slate-200 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-base font-bold text-slate-900 flex items-center space-x-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    <span>{selectedReport.title}</span>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    <InstitutionName /> • Office of the Principal • Official Institutional Record
                  </DialogDescription>
                </div>
                <Badge variant="outline" className="text-xs">
                  {previewData.rows.length} Records
                </Badge>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-auto py-3 text-xs">
              {previewData.rows.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <p>No records found in this category to generate report.</p>
                </div>
              ) : (
                <table className="w-full border-collapse border border-slate-200 text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 border-b border-slate-200">
                      {previewData.headers.map((h, i) => (
                        <th key={i} className="p-2 border border-slate-200 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.rows.map((row, rIdx) => (
                      <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        {row.map((val, cIdx) => (
                          <td key={cIdx} className="p-2 border border-slate-200 text-slate-700 font-normal">
                            {String(val ?? '—')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <DialogFooter className="border-t border-slate-200 pt-3 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                Generated: {new Date().toLocaleString()}
              </span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="h-8 text-xs font-medium"
                >
                  <Printer className="w-3.5 h-3.5 mr-1" />
                  Print Report
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleExportCSV(selectedReport)}
                  className="h-8 text-xs font-semibold bg-primary text-primary-foreground"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  Download CSV
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
