import { useState, useEffect, useCallback } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Plus, X, Loader2, Calendar, Clock, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/supabase/database';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { DailyTeachingUpdate as TeachingUpdateItem } from '@/types/database.types';

interface TeachingUpdateState {
  date: string;
  subject: string;
  class: string;
  topicsCovered: string[];
  importantTopics: string[];
  pyq: string[];
  nextClassPrep: string;
  notes: string;
}

interface DailyTeachingUpdateProps {
  selectedClass?: string;
  embedded?: boolean;
}

export function DailyTeachingUpdate({ selectedClass, embedded = false }: DailyTeachingUpdateProps = {}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [loadingUpdates, setLoadingUpdates] = useState(true);
  const [pastUpdates, setPastUpdates] = useState<TeachingUpdateItem[]>([]);

  const [subjects, setSubjects] = useState<string[]>([]);
  const [classes, setClasses] = useState<string[]>([]);

  const [update, setUpdate] = useState<TeachingUpdateState>({
    date: new Date().toISOString().split('T')[0],
    subject: '',
    class: selectedClass || '',
    topicsCovered: [],
    importantTopics: [],
    pyq: [],
    nextClassPrep: '',
    notes: ''
  });

  useEffect(() => {
    if (selectedClass) {
      setUpdate(prev => ({ ...prev, class: selectedClass }));
    }
  }, [selectedClass]);

  const [currentTopic, setCurrentTopic] = useState('');
  const [currentImportant, setCurrentImportant] = useState('');
  const [currentPyq, setCurrentPyq] = useState('');

  // 1. Load Classes & Subjects for Teacher
  const initOptions = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { assignedClasses, assignedSubjects } = await db.getTeacherAssignedClassesAndSubjects(user.id, user.name);

      if (assignedClasses.length > 0) {
        setClasses(assignedClasses);
        setUpdate(prev => ({ ...prev, class: prev.class || assignedClasses[0] }));
      } else {
        setClasses([]);
        setUpdate(prev => ({ ...prev, class: '' }));
      }

      const validSubjects = assignedSubjects.length > 0 
        ? assignedSubjects 
        : (user.department ? [user.department] : []);

      if (validSubjects.length > 0) {
        setSubjects(validSubjects);
        setUpdate(prev => ({ ...prev, subject: prev.subject || validSubjects[0] }));
      }
    } catch (err) {
      console.warn('Failed to load classes for daily update:', err);
    }
  }, [user]);

  useEffect(() => {
    initOptions();
  }, [initOptions]);

  useRealtimeSubscription({
    table: 'profiles',
    onChange: initOptions,
    onReconnect: initOptions,
  });

  useEffect(() => {
    const handleSync = () => {
      initOptions();
    };
    window.addEventListener('teacher-assignments-changed', handleSync);
    return () => {
      window.removeEventListener('teacher-assignments-changed', handleSync);
    };
  }, [initOptions]);

  // 2. Load Past Daily Updates
  const loadPastUpdates = useCallback(async () => {
    try {
      const data = await db.getDailyTeachingUpdates();
      // Filter for this teacher if teacher_id exists, or show all for teacher's subjects
      const filtered = user?.id 
        ? data.filter(d => !d.teacher_id || d.teacher_id === user.id)
        : data;
      setPastUpdates(filtered || []);
    } catch (err) {
      console.warn('Failed to load past updates:', err);
      setPastUpdates([]);
    } finally {
      setLoadingUpdates(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadPastUpdates();
  }, [loadPastUpdates]);

  useRealtimeSubscription({
    table: 'daily_teaching_updates',
    onChange: loadPastUpdates,
    onReconnect: loadPastUpdates,
  });

  const addTopic = (type: 'topicsCovered' | 'importantTopics' | 'pyq', value: string, setValue: (val: string) => void) => {
    if (value.trim()) {
      setUpdate(prev => ({
        ...prev,
        [type]: [...prev[type], value.trim()]
      }));
      setValue('');
    }
  };

  const removeTopic = (type: 'topicsCovered' | 'importantTopics' | 'pyq', index: number) => {
    setUpdate(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!update.subject || !update.class) {
      toast({
        title: "Missing Fields",
        description: "Please select both a subject and class.",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      await db.createDailyTeachingUpdate({
        subject: update.subject,
        class_name: update.class,
        date: update.date,
        topics_covered: update.topicsCovered,
        important_topics: update.importantTopics,
        pyq: update.pyq,
        next_class_prep: update.nextClassPrep,
        notes: update.notes,
        teacher_id: user?.id,
        teacher_name: user?.name || 'Faculty'
      });

      // Also dispatch notifications to students of this class
      try {
        const enrolledStudents = (await db.getStudentsByClass(update.class));
        for (const stu of enrolledStudents) {
          await db.createNotification({
            user_id: stu.id,
            title: `New Daily Update: ${update.subject}`,
            message: `${user?.name || 'Your teacher'} updated today's topics and exam focus points.`,
            type: 'info',
            priority: 'medium',
            is_read: false
          });
        }
      } catch (notifErr) {
        console.warn('Student notification dispatch note:', notifErr);
      }
      
      toast({
        title: "Daily Update Saved",
        description: `Teaching update for ${update.class} saved and synchronized with student mentor chat.`,
      });

      // Reset dynamic arrays
      setUpdate(prev => ({
        ...prev,
        topicsCovered: [],
        importantTopics: [],
        pyq: [],
        nextClassPrep: '',
        notes: ''
      }));

      await loadPastUpdates();
    } catch (err: any) {
      toast({
        title: "Submission Failed",
        description: err.message || "Failed to save daily update",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const mainBody = (
    <div className="space-y-6 max-w-4xl mx-auto">
        <Card className="shadow-xs border border-slate-200">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <CardTitle>Daily Teaching Update</CardTitle>
            </div>
            <CardDescription>
              Record curriculum topics taught today — this directly powers student mentor chat guidance and revision
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={update.date}
                    onChange={(e) => setUpdate(prev => ({ ...prev, date: e.target.value }))}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select value={update.subject} onValueChange={(value) => setUpdate(prev => ({ ...prev, subject: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.length === 0 ? (
                        <SelectItem value="none" disabled>No assigned subjects</SelectItem>
                      ) : (
                        subjects.map((subject) => (
                          <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Class / Cohort</Label>
                  <Select value={update.class} onValueChange={(value) => setUpdate(prev => ({ ...prev, class: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.length === 0 ? (
                        <SelectItem value="none" disabled>No assigned classes</SelectItem>
                      ) : (
                        classes.map((cls) => (
                          <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Topics Covered Today</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="Add topic covered (e.g., Matrix Diagonalization)..."
                      value={currentTopic}
                      onChange={(e) => setCurrentTopic(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTopic('topicsCovered', currentTopic, setCurrentTopic))}
                    />
                    <Button 
                      type="button" 
                      onClick={() => addTopic('topicsCovered', currentTopic, setCurrentTopic)}
                      size="sm"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {update.topicsCovered.map((topic, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {topic}
                        <X 
                          className="w-3 h-3 cursor-pointer" 
                          onClick={() => removeTopic('topicsCovered', index)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Important Topics for Upcoming Exams</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="Add exam priority topic..."
                      value={currentImportant}
                      onChange={(e) => setCurrentImportant(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTopic('importantTopics', currentImportant, setCurrentImportant))}
                    />
                    <Button 
                      type="button" 
                      onClick={() => addTopic('importantTopics', currentImportant, setCurrentImportant)}
                      size="sm"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {update.importantTopics.map((topic, index) => (
                      <Badge key={index} variant="default" className="flex items-center gap-1">
                        {topic}
                        <X 
                          className="w-3 h-3 cursor-pointer" 
                          onClick={() => removeTopic('importantTopics', index)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Previous Year Questions (PYQ Reference)</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="Add PYQ reference (e.g., Nov 2023 - Q4)..."
                      value={currentPyq}
                      onChange={(e) => setCurrentPyq(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTopic('pyq', currentPyq, setCurrentPyq))}
                    />
                    <Button 
                      type="button" 
                      onClick={() => addTopic('pyq', currentPyq, setCurrentPyq)}
                      size="sm"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {update.pyq.map((q, index) => (
                      <Badge key={index} variant="outline" className="flex items-center gap-1">
                        {q}
                        <X 
                          className="w-3 h-3 cursor-pointer" 
                          onClick={() => removeTopic('pyq', index)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nextClass">Preparation Needed for Next Class</Label>
                  <Input
                    id="nextClass"
                    placeholder="e.g., Review theorem 4.2 and bring calculator"
                    value={update.nextClassPrep}
                    onChange={(e) => setUpdate(prev => ({ ...prev, nextClassPrep: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Teacher Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="General guidance, reference book pages, or announcements..."
                    value={update.notes}
                    onChange={(e) => setUpdate(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving Daily Update...
                  </>
                ) : (
                  'Publish Daily Update'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Feed of Published Teaching Updates */}
        <Card className="shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Recent Published Updates</CardTitle>
              <Badge variant="outline">{pastUpdates.length} Records</Badge>
            </div>
            <CardDescription>
              Chronological log of teaching updates visible to students
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingUpdates ? (
              <div className="flex justify-center p-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : pastUpdates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No teaching updates published yet. Fill out the form above to record today's class.
              </p>
            ) : (
              <div className="space-y-4">
                {pastUpdates.slice(0, 5).map((u) => (
                  <div key={u.id} className="p-4 border rounded-lg space-y-2 bg-card">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-sm">{u.subject}</span>
                        <Badge variant="secondary" className="text-xs">{u.class_name}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(u.date).toLocaleDateString()}
                      </span>
                    </div>

                    {u.topics_covered && u.topics_covered.length > 0 && (
                      <div className="text-xs">
                        <span className="font-medium text-muted-foreground">Topics: </span>
                        <span>{u.topics_covered.join(', ')}</span>
                      </div>
                    )}

                    {u.important_topics && u.important_topics.length > 0 && (
                      <div className="text-xs">
                        <span className="font-medium text-primary">Exam Focus: </span>
                        <span>{u.important_topics.join(', ')}</span>
                      </div>
                    )}

                    {u.next_class_prep && (
                      <p className="text-xs text-muted-foreground italic">
                        Next Class: {u.next_class_prep}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  );

  if (embedded) {
    return mainBody;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation showBackButton={true} backUrl="/dashboard" backLabel="Back to Dashboard" />
      <main className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        {mainBody}
      </main>
    </div>
  );
}
