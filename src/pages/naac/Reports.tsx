import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { exportToCSV, printDocument } from '@/lib/exportUtils';
import { useNAAC } from '@/context/NAACContext';
import { 
  FileText, 
  Download, 
  Eye, 
  BarChart3,
  TrendingUp,
  FileSpreadsheet,
  Calendar,
  Award
} from 'lucide-react';

const reportTypes = [
  {
    id: 'ssr',
    name: 'Self Study Report (SSR)',
    description: 'Comprehensive report for NAAC submission',
    format: 'PDF',
  },
  {
    id: 'aqar',
    name: 'Annual Quality Assurance Report (AQAR)',
    description: 'Annual report for quality assurance',
    format: 'PDF',
  },
  {
    id: 'criterion-wise',
    name: 'Criterion-wise Analysis',
    description: 'Detailed analysis by each criterion',
    format: 'Excel',
  },
  {
    id: 'compliance',
    name: 'Compliance Report',
    description: 'Current compliance status report',
    format: 'PDF',
  }
];

const academicYears = (() => {
  const y = new Date().getFullYear(); const start = new Date().getMonth() >= 5 ? y : y - 1;
  return Array.from({ length: 6 }, (_, i) => `${start - i}-${String(start - i + 1).slice(2)}`);
})();

export default function Reports() {
  const { naacData } = useNAAC();
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(academicYears[0]);
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);

  const handleGenerateReport = async (reportId: string) => {
    setGeneratingReport(reportId);
    try {
      const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
      const yearMetrics = naacData.metrics.filter((m) => !m.academic_year || m.academic_year === selectedAcademicYear);
      const progressRows = naacData.criterionProgress.map((p) =>
        `<tr><td>Criterion ${p.criterionNumber}</td><td>${p.completedMetrics}/${p.totalMetrics}</td><td>${p.completionPercentage}%</td><td>${naacData.documents.filter((d) => d.criterionNumber === p.criterionNumber).length}</td></tr>`).join('');
      if (reportId === 'criterion-wise') {
        exportToCSV(`naac-criterion-wise-${selectedAcademicYear}`, ['Criterion', 'Metric', 'Title', 'Status', 'Academic year', 'Value', 'Evidence files'],
          naacData.metrics.map((m) => [m.criterion_number, m.metric_code, m.title, m.status, m.academic_year, m.quantitative_value, naacData.documents.filter((d) => d.metricCode === m.metric_code).length]));
        return;
      }
      const summary = `<h3>Progress by criterion</h3><table border="1" cellpadding="6" style="border-collapse:collapse"><tr><th>Criterion</th><th>Metrics completed</th><th>Complete</th><th>Evidence files</th></tr>${progressRows}</table>`;
      if (reportId === 'compliance') { printDocument(`NAAC compliance report ${selectedAcademicYear}`, `<h2>Compliance report — ${esc(selectedAcademicYear)}</h2>${summary}`); return; }
      const detail = yearMetrics.map((m) => `<tr><td>${esc(m.metric_code)}</td><td>${esc(m.title)}</td><td>${esc(m.status)}</td><td>${esc(m.quantitative_value ?? '')}</td><td>${esc(m.description ?? '')}</td></tr>`).join('');
      const evidence = naacData.documents.map((d) => `<tr><td>${esc(d.metricCode)}</td><td>${esc(d.title)}</td><td>${esc(d.evidenceType)}</td><td>${esc(d.uploadDate)}</td></tr>`).join('');
      printDocument(`${reportId === 'ssr' ? 'Self Study Report' : 'AQAR'} ${selectedAcademicYear}`,
        `<h2>${reportId === 'ssr' ? 'Self Study Report' : 'Annual Quality Assurance Report'} — ${esc(selectedAcademicYear)}</h2>${summary}<h3>Metrics</h3><table border="1" cellpadding="6" style="border-collapse:collapse"><tr><th>Code</th><th>Title</th><th>Status</th><th>Value</th><th>Description</th></tr>${detail || '<tr><td colspan="5">No metrics recorded.</td></tr>'}</table><h3>Evidence index</h3><table border="1" cellpadding="6" style="border-collapse:collapse"><tr><th>Metric</th><th>Document</th><th>Type</th><th>Uploaded</th></tr>${evidence || '<tr><td colspan="4">No evidence uploaded.</td></tr>'}</table>`);
    } finally { setGeneratingReport(null); }
  };

  const overallCompletionRate = Math.round(
    naacData.criterionProgress.reduce((acc, p) => acc + p.completionPercentage, 0) / 7
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center">
            <FileText className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
            <p className="text-muted-foreground">Generate SSR/AQAR reports and performance analytics</p>
          </div>
        </div>
        <div>
          <Select value={selectedAcademicYear} onValueChange={setSelectedAcademicYear}>
            <SelectTrigger className="w-48">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Select academic year" />
            </SelectTrigger>
            <SelectContent>
              {academicYears.map(year => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">NAAC Readiness</CardTitle>
            <Award className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallCompletionRate}%</div>
            <p className="text-xs text-muted-foreground">
              Overall completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{naacData.documents.length}</div>
            <p className="text-xs text-muted-foreground">
              Evidence documents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Criteria</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {naacData.criterionProgress.filter(p => p.completionPercentage >= 90).length}/7
            </div>
            <p className="text-xs text-muted-foreground">
              ≥90% completion
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Metrics</CardTitle>
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {naacData.criterionProgress.reduce((acc, p) => acc + p.completedMetrics, 0)}/
              {naacData.criterionProgress.reduce((acc, p) => acc + p.totalMetrics, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Completed metrics
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Report Generation */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Reports</CardTitle>
          <CardDescription>Create comprehensive reports for NAAC submission and internal analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reportTypes.map((report) => (
              <Card key={report.id} className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{report.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{report.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span>Format: {report.format}</span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    onClick={() => handleGenerateReport(report.id)}
                    disabled={generatingReport === report.id}
                    className="flex-1"
                  >
                    {generatingReport === report.id ? (
                      <>Generating...</>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Generate
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Criteria Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Criteria Performance Summary</CardTitle>
          <CardDescription>Detailed breakdown of progress for each NAAC criterion</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Criterion</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Metrics</TableHead>
                <TableHead>Documents</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {naacData.criterionProgress.map((criterion) => {
                const documentsCount = naacData.documents.filter(
                  d => d.criterionNumber === criterion.criterionNumber
                ).length;

                const getStatusBadge = (percentage: number) => {
                  if (percentage >= 90) return <Badge className="bg-success">Complete</Badge>;
                  if (percentage >= 50) return <Badge variant="secondary">In Progress</Badge>;
                  return <Badge variant="outline">Pending</Badge>;
                };

                return (
                  <TableRow key={criterion.criterionNumber}>
                    <TableCell className="font-medium">
                      {criterion.criterionNumber}
                    </TableCell>
                    <TableCell>
                      {criterion.criterionNumber === 1 && 'Curricular Aspects'}
                      {criterion.criterionNumber === 2 && 'Teaching-Learning & Evaluation'}
                      {criterion.criterionNumber === 3 && 'Research, Innovations & Extension'}
                      {criterion.criterionNumber === 4 && 'Infrastructure & Learning Resources'}
                      {criterion.criterionNumber === 5 && 'Student Support & Progression'}
                      {criterion.criterionNumber === 6 && 'Governance, Leadership & Management'}
                      {criterion.criterionNumber === 7 && 'Institutional Values & Best Practices'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 text-sm font-medium">
                          {criterion.completionPercentage}%
                        </div>
                        <div className="flex-1 bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary rounded-full h-2 transition-all"
                            style={{ width: `${criterion.completionPercentage}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {criterion.completedMetrics}/{criterion.totalMetrics}
                    </TableCell>
                    <TableCell>{documentsCount}</TableCell>
                    <TableCell>{criterion.lastUpdated}</TableCell>
                    <TableCell>
                      {getStatusBadge(criterion.completionPercentage)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Document Distribution</CardTitle>
            <CardDescription>Documents by criterion</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6, 7].map(criterionNum => {
                const count = naacData.documents.filter(d => d.criterionNumber === criterionNum).length;
                const percentage = naacData.documents.length > 0 ? 
                  Math.round((count / naacData.documents.length) * 100) : 0;
                
                return (
                  <div key={criterionNum} className="flex items-center justify-between">
                    <span className="text-sm">Criterion {criterionNum}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary rounded-full h-2"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-8">{count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Readiness Score</CardTitle>
            <CardDescription>Institution's NAAC readiness assessment</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-6xl font-bold text-primary mb-2">
              {overallCompletionRate}%
            </div>
            <div className="text-lg text-muted-foreground mb-4">
              Overall Readiness
            </div>
            <div className="text-sm">
              {overallCompletionRate >= 80 ? 
                'Excellent - Ready for NAAC assessment' :
                overallCompletionRate >= 60 ?
                'Good - Minor improvements needed' :
                'Needs Attention - Significant work required'
              }
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}