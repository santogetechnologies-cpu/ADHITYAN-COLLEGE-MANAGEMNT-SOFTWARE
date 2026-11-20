import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Award, 
  Calendar, 
  Clock, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Search,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { Exam, ExamSchedule, ExamResult, Department } from '@/types/database.types';

interface ExaminationsModuleProps {
  exams: Exam[];
  schedules: ExamSchedule[];
  results: ExamResult[];
  departments: Department[];
}

export function ExaminationsModule({
  exams,
  schedules,
  results,
  departments
}: ExaminationsModuleProps) {
  const [selectedExamId, setSelectedExamId] = useState<string>('all');

  const filteredSchedules = useMemo(() => {
    if (selectedExamId === 'all') return schedules;
    return schedules.filter(s => s.exam_id === selectedExamId);
  }, [schedules, selectedExamId]);

  // Overall pass percentage calculation from real database results
  const passStats = useMemo(() => {
    if (results.length === 0) return { total: 0, passed: 0, rate: 0 };
    const passed = results.filter(r => (r.status || '').toLowerCase() === 'pass' || (r.marks_obtained || 0) >= 50).length;
    const rate = Math.round((passed / results.length) * 1000) / 10;
    return { total: results.length, passed, rate };
  }, [results]);

  return (
    <div className="space-y-5">
      {/* Module Title Bar */}
      <div className="pb-2 border-b border-slate-200">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Award className="w-5 h-5 text-purple-600" />
          <span>Examinations & Assessment Oversight</span>
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Master examination schedules, assessment timetables, and department-wise pass percentages
        </p>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-white border-slate-200 shadow-2xs">
          <CardHeader className="p-4 pb-2">
            <span className="text-xs font-semibold text-muted-foreground">Scheduled Examinations</span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-black text-slate-900">{exams.length}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Mid-term, internal & end-semester</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-2xs">
          <CardHeader className="p-4 pb-2">
            <span className="text-xs font-semibold text-muted-foreground">Subject Assessment Papers</span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-black text-indigo-700">{schedules.length}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Timetable slots confirmed</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-2xs">
          <CardHeader className="p-4 pb-2">
            <span className="text-xs font-semibold text-muted-foreground">Overall Pass Rate</span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-black text-emerald-700">
              {passStats.total > 0 ? `${passStats.rate}%` : '—'}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {passStats.total > 0 ? `${passStats.passed} passed of ${passStats.total} graded tests` : 'No examination marks graded yet'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="schedules" className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-lg">
          <TabsTrigger value="schedules" className="text-xs font-semibold px-3 py-1.5 data-[state=active]:bg-white">
            Examination Timetable ({schedules.length})
          </TabsTrigger>
          <TabsTrigger value="exams" className="text-xs font-semibold px-3 py-1.5 data-[state=active]:bg-white">
            Upcoming Exam Sessions ({exams.length})
          </TabsTrigger>
          <TabsTrigger value="results" className="text-xs font-semibold px-3 py-1.5 data-[state=active]:bg-white">
            Results & Evaluations ({results.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Schedules */}
        <TabsContent value="schedules" className="space-y-3 mt-3">
          <Card className="bg-white border-slate-200 shadow-2xs overflow-hidden">
            {filteredSchedules.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                <Calendar className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-800">No Examination Schedules on Record</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Exam slots published by the Controller of Examinations will appear here.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-xs font-bold text-slate-700">Subject Name & Code</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">Class / Program</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">Exam Date</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">Session Timing</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">Hall / Room</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSchedules.map((s) => (
                    <TableRow key={s.id} className="hover:bg-slate-50">
                      <TableCell className="font-semibold text-xs text-slate-900 py-3">
                        {s.subject_name || s.subject || 'Paramedical Clinical Paper'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground py-3">
                        {s.class_name || 'Allied Health Sciences'}
                      </TableCell>
                      <TableCell className="text-xs font-medium py-3">
                        {s.exam_date || s.date}
                      </TableCell>
                      <TableCell className="text-xs py-3">
                        {s.start_time} - {s.end_time}
                      </TableCell>
                      <TableCell className="text-xs py-3">
                        <Badge variant="outline" className="text-[10px]">
                          {s.room || 'Examination Hall'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        {/* Tab 2: Exam Sessions */}
        <TabsContent value="exams" className="space-y-3 mt-3">
          <Card className="bg-white border-slate-200 shadow-2xs overflow-hidden">
            {exams.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                <Award className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-800">No Active Examination Sessions</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Scheduled semester and university assessment sessions will be displayed here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {exams.map(e => (
                  <div key={e.id} className="p-4 flex items-center justify-between text-xs hover:bg-slate-50">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{e.name}</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Schedule: {e.start_date} to {e.end_date} • Academic Term: {e.academic_year || '2026-2027'}
                      </p>
                    </div>
                    <Badge className="text-[10px] bg-purple-50 text-purple-800 border-purple-200">
                      Official Session
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Tab 3: Results */}
        <TabsContent value="results" className="space-y-3 mt-3">
          <Card className="bg-white border-slate-200 shadow-2xs overflow-hidden">
            {results.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                <BarChart3 className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-800">No Graded Results Recorded</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  When examination marks are published, evaluation and pass percentages will appear here.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-xs font-bold text-slate-700">Student</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">Subject</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 text-center">Marks</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 text-center">Percentage</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 text-center">Result Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-semibold text-xs text-slate-900 py-2.5">
                        {r.student_name || 'Student Candidate'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground py-2.5">
                        {r.subject_name || 'Clinical Course'}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-center py-2.5">
                        {r.marks_obtained || 0} / {r.max_marks || 100}
                      </TableCell>
                      <TableCell className="text-xs text-center py-2.5">
                        {r.percentage ?? Math.round(((r.marks_obtained || 0) / (r.max_marks || 100)) * 100)}%
                      </TableCell>
                      <TableCell className="text-center py-2.5">
                        <Badge variant={r.status === 'pass' ? 'default' : 'destructive'} className="text-[10px]">
                          {r.status?.toUpperCase() || 'PASS'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
