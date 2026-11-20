import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Eye, Download, Printer, CheckCircle2 } from 'lucide-react';
import { useExams, useExamResults, usePublishExam } from '@/hooks/queries/useExams';
import { DataState } from '@/components/shared/DataState';
import { createMutationToast } from '@/lib/mutationToast';
import { exportToCSV, printDocument } from '@/lib/exportUtils';

export const ResultPublishing = () => {
  const { data: exams = [], isLoading: examsLoading, refetch: refetchExams } = useExams();
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const activeExamId = selectedExamId || exams[0]?.id;

  const { data: results = [], isLoading: resultsLoading, refetch: refetchResults } = useExamResults(activeExamId);
  const publishMutation = usePublishExam();

  const handleTogglePublish = (examId: string, currentStatus: boolean) => {
    publishMutation.mutate(
      { examId, isPublished: !currentStatus },
      createMutationToast({
        successTitle: !currentStatus ? 'Examination Published' : 'Examination Unpublished',
        successDescription: () =>
          !currentStatus
            ? 'Results are now visible to students and parents.'
            : 'Results have been hidden from student and parent views.',
        errorTitle: 'Action Failed',
      })
    );
  };

  const handleExportCSV = () => {
    if (results.length === 0) return;
    const headers = ['Roll Number', 'Student Name', 'Class/Program', 'Subject', 'Marks Obtained', 'Max Marks', 'Grade', 'Status'];
    const rows = results.map(r => [
      r.roll_number,
      r.student_name,
      r.class_name,
      r.subject,
      r.marks_obtained,
      r.total_marks,
      r.grade,
      r.remarks,
    ]);
    exportToCSV(`exam_results_${activeExamId || 'all'}`, headers, rows);
  };

  const handlePrint = () => {
    if (results.length === 0) return;
    const rowsHtml = results.map(r => `
      <tr>
        <td>${r.roll_number}</td>
        <td><strong>${r.student_name}</strong></td>
        <td>${r.subject}</td>
        <td>${r.marks_obtained} / ${r.total_marks}</td>
        <td><strong style="color: #2563eb;">${r.grade}</strong></td>
        <td>${r.remarks}</td>
      </tr>
    `).join('');

    const tableHtml = `
      <table>
        <thead>
          <tr>
            <th>Roll No</th>
            <th>Candidate Name</th>
            <th>Subject</th>
            <th>Marks</th>
            <th>Grade</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;
    printDocument('Official Examination Gazette & Marksheet', tableHtml);
  };

  return (
    <div className="space-y-6">
      {/* Exams Status & Publishing Toggle Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Examination Publishing Controls</CardTitle>
              <CardDescription>
                Publish examination results. Enforced at Row Level Security: students and parents see results only after publishing.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleExportCSV} disabled={results.length === 0}>
                <Download className="w-4 h-4 mr-1.5" /> Export CSV
              </Button>
              <Button size="sm" variant="outline" onClick={handlePrint} disabled={results.length === 0}>
                <Printer className="w-4 h-4 mr-1.5" /> Print Gazette
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {exams.map((exam) => {
              const isPublished = exam.status === 'published' || exam.is_published;
              const isSelected = exam.id === activeExamId;
              return (
                <div
                  key={exam.id}
                  onClick={() => setSelectedExamId(exam.id)}
                  className={`border rounded-lg p-3.5 flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/30'
                  }`}
                >
                  <div>
                    <h4 className="font-semibold text-sm">{exam.title}</h4>
                    <p className="text-xs text-muted-foreground">{exam.academic_year} • {exam.exam_type}</p>
                    <div className="mt-2">
                      <Badge variant={isPublished ? 'default' : 'secondary'} className="text-[10px]">
                        {isPublished ? 'Published' : 'Draft (Hidden from students)'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[10px] text-muted-foreground">Publish</span>
                    <Switch
                      checked={Boolean(isPublished)}
                      disabled={publishMutation.isPending}
                      onCheckedChange={() => handleTogglePublish(exam.id, Boolean(isPublished))}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Results Table for Selected Exam */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Marks & Performance Registry ({results.length} Records)
          </CardTitle>
          <CardDescription className="text-xs">
            Review graded student submissions and semester performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataState
            isLoading={resultsLoading}
            isEmpty={results.length === 0}
            onRetry={() => refetchResults()}
            emptyTitle="No results published for this examination"
            emptyDescription="Enter marks in the Grading Interface to populate student records."
          >
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Roll No</TableHead>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Class / Program</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Marks</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.roll_number}</TableCell>
                      <TableCell className="font-medium text-xs">{r.student_name}</TableCell>
                      <TableCell className="text-xs">{r.class_name}</TableCell>
                      <TableCell className="text-xs">{r.subject}</TableCell>
                      <TableCell className="text-xs font-semibold">{r.marks_obtained} / {r.total_marks}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-bold text-primary">
                          {r.grade}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={r.marks_obtained >= 35 ? 'secondary' : 'destructive'}
                          className="text-[10px]"
                        >
                          {r.remarks}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </DataState>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResultPublishing;
