import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { 
  Award, 
  BookOpen, 
  CheckCircle2, 
  FileText, 
  Plus, 
  Save, 
  Send, 
  TrendingUp, 
  Users, 
  Loader2,
  RefreshCw,
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import { db } from '@/services/supabase/database';
import { useAuth } from '@/context/AuthContext';
import { Exam, ExamResult, Profile } from '@/types/database.types';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

interface StudentMarkRow {
  studentId: string;
  studentName: string;
  rollNumber: string;
  marksObtained: number | string;
  remarks: string;
  resultId?: string;
}

interface TeacherExamsTabProps {
  initialClassName?: string;
}

export function TeacherExamsTab({ initialClassName }: TeacherExamsTabProps = {}) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [assignedClasses, setAssignedClasses] = useState<string[]>([]);
  const [assignedSubjects, setAssignedSubjects] = useState<string[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);

  // Selected filters
  const [selectedClass, setSelectedClass] = useState<string>(initialClassName || '');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedExamId, setSelectedExamId] = useState<string>('');

  useEffect(() => {
    if (initialClassName) {
      setSelectedClass(initialClassName);
    }
  }, [initialClassName]);

  const [exams, setExams] = useState<Exam[]>([]);
  const [examRows, setExamRows] = useState<StudentMarkRow[]>([]);
  const [maxMarks, setMaxMarks] = useState<number>(100);
  const [loadingRows, setLoadingRows] = useState(false);
  const [saving, setSaving] = useState(false);

  // New Exam Dialog
  const [newExamOpen, setNewExamOpen] = useState(false);
  const [newExamName, setNewExamName] = useState('');
  const [newExamType, setNewExamType] = useState('Unit Assessment');
  const [newExamMaxMarks, setNewExamMaxMarks] = useState(100);
  const [creatingExam, setCreatingExam] = useState(false);

  // 1. Load Teacher's Assigned Classes & Subjects
  const loadTeacherAssignments = useCallback(async () => {
    if (!user?.id) return;
    setLoadingAssignments(true);
    try {
      const data = await db.getTeacherAssignedClassesAndSubjects(user.id, user.name);
      setAssignedClasses(data.assignedClasses);
      setAssignedSubjects(data.assignedSubjects);

      if (data.assignedClasses.length > 0) {
        setSelectedClass(prev => data.assignedClasses.includes(prev) ? prev : data.assignedClasses[0]);
      }
      if (data.assignedSubjects.length > 0) {
        setSelectedSubject(prev => data.assignedSubjects.includes(prev) ? prev : data.assignedSubjects[0]);
      }
    } catch (err) {
      console.warn('TeacherExamsTab loadAssignments notice:', err);
    } finally {
      setLoadingAssignments(false);
    }
  }, [user]);

  useEffect(() => {
    loadTeacherAssignments();
  }, [loadTeacherAssignments]);

  // 2. Load Exams
  const loadExams = useCallback(async () => {
    try {
      const allExams = await db.getExams();
      setExams(allExams);
      if (allExams.length > 0 && !selectedExamId) {
        setSelectedExamId(allExams[0].id);
        setMaxMarks(allExams[0].max_marks || 100);
      }
    } catch (err) {
      console.warn('TeacherExamsTab loadExams notice:', err);
    }
  }, [selectedExamId]);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  // Real-time synchronization
  useRealtimeSubscription({ table: 'exams', onChange: loadExams, onReconnect: loadExams });
  useRealtimeSubscription({ table: 'timetables', onChange: loadTeacherAssignments, onReconnect: loadTeacherAssignments });

  // 3. Load Student Roster and Published Marks for (selectedExamId, selectedClass, selectedSubject)
  const loadMarksRoster = useCallback(async () => {
    if (!selectedClass) {
      setExamRows([]);
      return;
    }

    setLoadingRows(true);
    try {
      const [students, allResults] = await Promise.all([
        db.getStudentsByClass(selectedClass),
        db.getExamResults(),
      ]);

      const activeExam = exams.find(e => e.id === selectedExamId);
      const currentMax = activeExam?.max_marks || 100;
      setMaxMarks(currentMax);

      const rows: StudentMarkRow[] = students.map((s, idx) => {
        const existing = allResults.find(r => 
          r.student_id === s.id && 
          (r.exam_id === selectedExamId || !selectedExamId) &&
          (!selectedSubject || r.subject === selectedSubject)
        );

        return {
          studentId: s.id,
          studentName: s.name,
          rollNumber: s.roll_number || s.student_id || `STU-${String(idx + 1001).padStart(4, '0')}`,
          marksObtained: existing ? existing.marks_obtained : '',
          remarks: existing?.remarks || '',
          resultId: existing?.id,
        };
      });

      setExamRows(rows);
    } catch (err) {
      console.warn('loadMarksRoster warning:', err);
    } finally {
      setLoadingRows(false);
    }
  }, [selectedClass, selectedExamId, selectedSubject, exams]);

  useEffect(() => {
    loadMarksRoster();
  }, [loadMarksRoster]);

  const handleMarkChange = (studentId: string, val: string) => {
    const num = val === '' ? '' : Math.max(0, Math.min(maxMarks, Number(val)));
    setExamRows(prev => prev.map(r => r.studentId === studentId ? { ...r, marksObtained: num } : r));
  };

  const handleRemarkChange = (studentId: string, remarks: string) => {
    setExamRows(prev => prev.map(r => r.studentId === studentId ? { ...r, remarks } : r));
  };

  const calculateGrade = (obtained: number, max: number): string => {
    const pct = (obtained / max) * 100;
    if (pct >= 90) return 'O';
    if (pct >= 80) return 'A';
    if (pct >= 70) return 'B+';
    if (pct >= 60) return 'B';
    if (pct >= 50) return 'C';
    return 'F';
  };

  // 4. Save & Publish Marks
  const handleSaveMarks = async () => {
    if (!selectedExamId || !selectedSubject || !selectedClass) {
      toast({
        title: "Missing Details",
        description: "Please ensure an assigned class, subject, and exam are selected.",
        variant: "destructive",
      });
      return;
    }

    const filledRows = examRows.filter(r => r.marksObtained !== '');
    if (filledRows.length === 0) {
      toast({
        title: "No Marks Entered",
        description: "Please enter marks for at least one student before saving.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      let savedCount = 0;
      for (const row of filledRows) {
        const marksObtained = Number(row.marksObtained);
        const grade = calculateGrade(marksObtained, maxMarks);

        await db.recordExamResult({
          ...(row.resultId ? { id: row.resultId } : {}),
          exam_id: selectedExamId,
          student_id: row.studentId,
          student_name: row.studentName,
          subject: selectedSubject,
          marks_obtained: marksObtained,
          max_marks: maxMarks,
          grade,
          remarks: row.remarks || `${selectedSubject} - ${grade}`,
          published: true,
        });

        // Notify student about published marks
        db.createNotification({
          user_id: row.studentId,
          title: `Assessment Marks Published: ${selectedSubject}`,
          message: `Your score for ${selectedSubject} has been published: ${marksObtained}/${maxMarks} (Grade: ${grade}). Check Performance Analytics.`,
          type: 'info',
          priority: 'medium',
          is_read: false
        }).catch(console.warn);

        savedCount++;
      }

      toast({
        title: "Marks Published Successfully",
        description: `Recorded and published results for ${savedCount} students in ${selectedClass} (${selectedSubject}). Student, Parent, and Admin dashboards updated.`,
      });

      await loadMarksRoster();
    } catch (err: any) {
      toast({
        title: "Failed to Publish Marks",
        description: err.message || "Could not save exam results. Please check database permissions.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // 5. Create Assessment
  const handleCreateNewExam = async () => {
    if (!newExamName.trim()) {
      toast({ title: "Title Required", description: "Please enter an exam title.", variant: "destructive" });
      return;
    }

    setCreatingExam(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const created = await db.createExam({
        name: newExamName,
        exam_type: newExamType,
        class_name: selectedClass,
        subject: selectedSubject,
        start_date: today,
        end_date: today,
        max_marks: newExamMaxMarks,
        passing_marks: Math.round(newExamMaxMarks * 0.5),
        status: 'published',
      });

      if (created) {
        toast({
          title: "Exam Created",
          description: `${created.name} (${selectedSubject}) created successfully for ${selectedClass}.`,
        });
        setNewExamOpen(false);
        setNewExamName('');
        await loadExams();
        setSelectedExamId(created.id);
      }
    } catch (err: any) {
      toast({
        title: "Exam Creation Failed",
        description: err.message || "Could not register new exam.",
        variant: "destructive",
      });
    } finally {
      setCreatingExam(false);
    }
  };

  if (loadingAssignments) {
    return (
      <div className="flex items-center justify-center py-16 bg-white rounded-2xl border border-slate-200">
        <Loader2 className="w-8 h-8 animate-spin text-[#1D61E7]" />
        <span className="ml-3 text-sm text-slate-600 font-medium">Verifying Faculty Assigned Classes...</span>
      </div>
    );
  }

  if (assignedClasses.length === 0) {
    return (
      <Card className="shadow-sm border-amber-200 bg-amber-50/40">
        <CardContent className="p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No Assigned Classes for Examination</h3>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            You do not currently have any classes assigned by the Administration.
            Marks entry and exam evaluation are restricted to classes officially assigned to you.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1D61E7] flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Examinations & Marks Evaluation Desk</h3>
                <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                  <ShieldCheck className="w-3 h-3 mr-1" /> Assigned Classes & Subjects Only
                </Badge>
              </div>
              <p className="text-xs text-slate-500">Record and publish verified marks. Published results reflect immediately on Student, Parent, and Admin portals.</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setNewExamOpen(true)}
              className="h-8 text-xs font-bold"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Create Assessment
            </Button>
            <Button
              size="sm"
              onClick={handleSaveMarks}
              disabled={saving || examRows.length === 0}
              className="h-8 text-xs font-bold bg-[#1D61E7] hover:bg-blue-700 text-white rounded-xl shadow-xs"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
              Publish Marks
            </Button>
          </div>
        </div>

        {/* Filter Selection Row: Strictly Assigned Classes & Subjects */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <Label className="text-[11px] font-bold text-slate-500">Assigned Class / Batch</Label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="h-8 text-xs mt-1">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {assignedClasses.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[11px] font-bold text-slate-500">Assigned Subject</Label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="h-8 text-xs mt-1">
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {assignedSubjects.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[11px] font-bold text-slate-500">Examination Assessment</Label>
            <Select 
              value={selectedExamId} 
              onValueChange={(val) => {
                setSelectedExamId(val);
                const matched = exams.find(e => e.id === val);
                if (matched?.max_marks) setMaxMarks(matched.max_marks);
              }}
            >
              <SelectTrigger className="h-8 text-xs mt-1">
                <SelectValue placeholder="Select exam" />
              </SelectTrigger>
              <SelectContent>
                {exams.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.name} (Max: {e.max_marks || 100})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Metric Strip */}
        <div className="flex flex-wrap items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs gap-2">
          <div className="flex items-center space-x-4">
            <span>Enrolled Students: <strong className="text-slate-900">{examRows.length}</strong></span>
            <span>Max Marks: <strong className="text-[#1D61E7] font-mono">{maxMarks}</strong></span>
            <span>Graded Students: <strong className="text-emerald-700">{examRows.filter(r => r.marksObtained !== '').length}</strong></span>
          </div>
          <div className="text-[11px] text-slate-500">
            Grading Scale: <strong>O (≥90) • A (≥80) • B+ (≥70) • B (≥60) • C (≥50) • F (&lt;50)</strong>
          </div>
        </div>
      </div>

      {/* Marks Entry Ledger Table */}
      {loadingRows ? (
        <div className="flex items-center justify-center py-12 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-6 h-6 animate-spin text-[#1D61E7]" />
          <span className="ml-2 text-xs text-slate-600">Loading student roster...</span>
        </div>
      ) : examRows.length === 0 ? (
        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-10 text-center space-y-2 text-slate-500 text-xs">
            <Users className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-700">No Students Found</p>
            <p>No students enrolled in {selectedClass}.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3 w-12 text-center">#</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Roll / Reg. No</th>
                  <th className="p-3 w-36">Marks Obtained (Max: {maxMarks})</th>
                  <th className="p-3 w-20 text-center">Grade</th>
                  <th className="p-3">Faculty Remarks</th>
                  <th className="p-3 w-28 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {examRows.map((row, idx) => {
                  const hasMark = row.marksObtained !== '';
                  const numMark = Number(row.marksObtained);
                  const grade = hasMark ? calculateGrade(numMark, maxMarks) : '-';
                  const passed = numMark >= (maxMarks * 0.5);

                  return (
                    <tr key={row.studentId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                      <td className="p-3 font-semibold text-slate-800">{row.studentName}</td>
                      <td className="p-3 font-mono text-slate-600">{row.rollNumber}</td>
                      <td className="p-3">
                        <Input
                          type="number"
                          min={0}
                          max={maxMarks}
                          placeholder={`0 - ${maxMarks}`}
                          value={row.marksObtained}
                          onChange={(e) => handleMarkChange(row.studentId, e.target.value)}
                          className="h-8 text-xs font-mono font-bold"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <Badge 
                          variant="outline" 
                          className={`font-mono text-xs font-bold ${
                            !hasMark 
                              ? 'bg-slate-50 text-slate-400' 
                              : passed 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {grade}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Input
                          type="text"
                          placeholder="Feedback or observations..."
                          value={row.remarks}
                          onChange={(e) => handleRemarkChange(row.studentId, e.target.value)}
                          className="h-8 text-xs"
                        />
                      </td>
                      <td className="p-3 text-center">
                        {row.resultId ? (
                          <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 mr-0.5 inline" /> Published
                          </Badge>
                        ) : hasMark ? (
                          <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300 bg-amber-50">
                            Pending Save
                          </Badge>
                        ) : (
                          <span className="text-[11px] text-slate-400">Unassessed</span>
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

      {/* Create Assessment Dialog */}
      <Dialog open={newExamOpen} onOpenChange={setNewExamOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Course Assessment</DialogTitle>
            <DialogDescription>
              Register an assessment for <strong>{selectedSubject}</strong> ({selectedClass}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs">Assessment Name</Label>
              <Input
                placeholder="e.g. Unit Test 1, Mid-Term Evaluation, Clinical Case Exam"
                value={newExamName}
                onChange={e => setNewExamName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Assessment Type</Label>
                <Select value={newExamType} onValueChange={setNewExamType}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Unit Assessment">Unit Assessment</SelectItem>
                    <SelectItem value="Internal Evaluation">Internal Evaluation</SelectItem>
                    <SelectItem value="Clinical Practical">Clinical Practical</SelectItem>
                    <SelectItem value="Semester Exam">Semester Exam</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Maximum Marks</Label>
                <Input
                  type="number"
                  min={10}
                  max={200}
                  value={newExamMaxMarks}
                  onChange={e => setNewExamMaxMarks(Number(e.target.value))}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewExamOpen(false)} disabled={creatingExam}>
              Cancel
            </Button>
            <Button onClick={handleCreateNewExam} disabled={creatingExam} className="bg-[#1D61E7] hover:bg-blue-700 text-white">
              {creatingExam ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Create Assessment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

