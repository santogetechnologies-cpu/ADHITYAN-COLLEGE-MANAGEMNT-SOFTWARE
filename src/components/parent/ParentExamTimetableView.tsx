import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, FileText, Loader2, AlertCircle } from 'lucide-react';
import { db } from '@/services/supabase/database';
import { ExamSchedule } from '@/types/database.types';

interface ParentExamTimetableViewProps {
  className: string;
  department: string;
  studentName: string;
}

export function ParentExamTimetableView({
  className,
  department,
  studentName,
}: ParentExamTimetableViewProps) {
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);

  const loadExams = useCallback(async () => {
    setLoading(true);
    try {
      const data = await db.getExamSchedules({ className: className || 'Semester 1' });
      setSchedules(data || []);
    } catch (err) {
      console.warn('Failed to load exam schedules:', err);
    } finally {
      setLoading(false);
    }
  }, [className]);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Examination Timetable</h2>
        <p className="text-muted-foreground text-sm">
          Official examination schedule for {studentName} ({department})
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading official examination schedule...
        </div>
      ) : schedules.length === 0 ? (
        <Card className="rounded-2xl border-border p-8 text-center text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-3 opacity-60" />
          <h3 className="font-semibold text-foreground">No Active Exam Schedules Published</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Official dates will be posted here as soon as approved by the Controller of Examinations.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {schedules.map((exam, idx) => (
            <Card key={exam.id || idx} className="rounded-2xl border-border shadow-xs">
              <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">{exam.subject}</span>
                    <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                      {exam.exam_type || 'Theory'}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
                    <span className="flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-primary" /> {exam.exam_date}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5 text-primary" /> {exam.start_time?.slice(0, 5)} - {exam.end_time?.slice(0, 5)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="flex items-center gap-1 font-mono text-xs">
                    <MapPin className="w-3 h-3" /> {exam.room || 'Examination Hall'}
                  </Badge>
                  <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Confirmed
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

