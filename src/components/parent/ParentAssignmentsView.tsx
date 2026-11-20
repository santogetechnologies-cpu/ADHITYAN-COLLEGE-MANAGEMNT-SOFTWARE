import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Calendar, Clock, CheckCircle2, AlertCircle, Loader2, MessageSquare, Award, FileText } from 'lucide-react';
import { db } from '@/services/supabase/database';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { Assignment, AssignmentSubmission } from '@/types/database.types';

interface ParentAssignmentsViewProps {
  className: string;
  studentId: string;
  studentName: string;
}

export function ParentAssignmentsView({
  className,
  studentId,
  studentName,
}: ParentAssignmentsViewProps) {
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'submitted' | 'graded' | 'overdue'>('all');

  const loadAssignmentsAndSubmissions = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const [asgData, subData] = await Promise.all([
        db.getAssignments(className || 'Semester 1'),
        db.getAssignmentSubmissions(studentId),
      ]);
      setAssignments(asgData || []);
      setSubmissions(subData || []);
    } catch (err) {
      console.warn('Failed to load assignments/submissions:', err);
    } finally {
      setLoading(false);
    }
  }, [className, studentId]);

  useEffect(() => {
    loadAssignmentsAndSubmissions();
  }, [loadAssignmentsAndSubmissions]);

  // Real-time synchronization
  useRealtimeSubscription({ table: 'assignments', onChange: loadAssignmentsAndSubmissions, onReconnect: loadAssignmentsAndSubmissions });
  useRealtimeSubscription({ table: 'assignment_submissions', onChange: loadAssignmentsAndSubmissions, onReconnect: loadAssignmentsAndSubmissions });

  // Map submissions by assignment ID
  const submissionMap = useMemo(() => {
    const map = new Map<string, AssignmentSubmission>();
    submissions.forEach(sub => {
      map.set(sub.assignment_id, sub);
    });
    return map;
  }, [submissions]);

  const items = useMemo(() => {
    const now = new Date();
    return assignments.map(asg => {
      const sub = submissionMap.get(asg.id);
      let calculatedStatus: 'pending' | 'submitted' | 'graded' | 'overdue' = 'pending';

      if (sub) {
        if (sub.status === 'graded' || (sub.score !== undefined && sub.score !== null)) {
          calculatedStatus = 'graded';
        } else {
          calculatedStatus = 'submitted';
        }
      } else if (asg.due_date && new Date(asg.due_date) < now) {
        calculatedStatus = 'overdue';
      }

      return {
        assignment: asg,
        submission: sub,
        status: calculatedStatus,
      };
    });
  }, [assignments, submissionMap]);

  const filteredItems = useMemo(() => {
    if (statusFilter === 'all') return items;
    return items.filter(item => item.status === statusFilter);
  }, [items, statusFilter]);

  const counts = useMemo(() => {
    return {
      all: items.length,
      pending: items.filter(i => i.status === 'pending').length,
      submitted: items.filter(i => i.status === 'submitted').length,
      graded: items.filter(i => i.status === 'graded').length,
      overdue: items.filter(i => i.status === 'overdue').length,
    };
  }, [items]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Coursework & Homework Tracking</h2>
          <p className="text-muted-foreground text-sm">
            Live assignments, student submissions, and teacher evaluations for {studentName}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl w-max max-w-full">
        {(['all', 'pending', 'submitted', 'graded', 'overdue'] as const).map(f => (
          <Button
            key={f}
            size="sm"
            variant={statusFilter === f ? 'default' : 'ghost'}
            onClick={() => setStatusFilter(f)}
            className={`text-xs h-7 px-3 rounded-lg capitalize ${statusFilter === f ? 'bg-[#1D61E7] text-white' : 'text-muted-foreground'}`}
          >
            {f} ({counts[f]})
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading coursework records...
        </div>
      ) : filteredItems.length === 0 ? (
        <Card className="rounded-2xl border-border p-8 text-center text-muted-foreground">
          <BookOpen className="w-10 h-10 mx-auto text-muted-foreground mb-3 opacity-60" />
          <h3 className="font-semibold text-foreground">No Assignments in this Category</h3>
          <p className="text-xs text-muted-foreground mt-1">
            No coursework items matching "{statusFilter}" found for {className || 'current term'}.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredItems.map(({ assignment: asg, submission: sub, status }) => (
            <Card key={asg.id} className="rounded-2xl border-border shadow-xs hover:border-slate-300 transition-colors">
              <CardContent className="p-4 sm:p-5 space-y-3 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">{asg.title}</span>
                      <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                        {asg.subject}
                      </Badge>
                      {asg.teacher_name && (
                        <span className="text-[11px] text-muted-foreground">
                          • Assigned by {asg.teacher_name}
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      {asg.description || 'Academic assignment assigned by department faculty.'}
                    </p>
                  </div>

                  <div className="flex flex-col sm:items-end gap-1 shrink-0">
                    <span className="flex items-center gap-1 font-mono text-muted-foreground text-xs">
                      <Calendar className="w-3.5 h-3.5 text-primary" /> Due: {asg.due_date ? new Date(asg.due_date).toLocaleDateString() : 'Upcoming'}
                    </span>
                    {status === 'graded' && (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Graded: {sub?.score ?? (sub as any)?.marks ?? 0}/100
                      </Badge>
                    )}
                    {status === 'submitted' && (
                      <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                        <Clock className="w-3.5 h-3.5 mr-1" /> Submitted — Awaiting Review
                      </Badge>
                    )}
                    {status === 'pending' && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                        <AlertCircle className="w-3.5 h-3.5 mr-1" /> Pending Submission
                      </Badge>
                    )}
                    {status === 'overdue' && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertCircle className="w-3.5 h-3.5 mr-1" /> Overdue
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Submission Details & Teacher Feedback Banner */}
                {sub && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border/60 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">
                        Student submitted: <strong className="text-foreground">{sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : 'Recently'}</strong>
                      </span>
                      {sub.attachment_url && (
                        <a 
                          href={sub.attachment_url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-[#1D61E7] hover:underline flex items-center gap-1 font-medium"
                        >
                          <FileText className="w-3 h-3" /> View Submitted File
                        </a>
                      )}
                    </div>
                    {sub.submission_text && (
                      <p className="text-foreground/90 italic text-[11px] bg-white dark:bg-slate-800 p-2 rounded-lg border border-border/40">
                        "{sub.submission_text}"
                      </p>
                    )}
                    {sub.feedback && (
                      <div className="p-2.5 rounded-lg bg-emerald-50/80 border border-emerald-200 text-emerald-900 text-[11px] flex items-start gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block font-semibold">Teacher Feedback & Evaluation:</strong>
                          <span>{sub.feedback}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
