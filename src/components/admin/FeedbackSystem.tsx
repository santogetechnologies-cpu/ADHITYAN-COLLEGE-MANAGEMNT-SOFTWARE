import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, Users, Loader2, History, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/supabase/database';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { FeedbackSubmission } from '@/types/database.types';

interface ClassSubject {
  class: string;
  subjects: { name: string; teacher: string }[];
}

export function FeedbackSystem() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<'create' | 'history'>('create');
  const [loading, setLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [submissions, setSubmissions] = useState<FeedbackSubmission[]>([]);

  const loadSubmissions = useCallback(async () => {
    try {
      const data = await db.getFeedbackSubmissions();
      setSubmissions(data || []);
    } catch (err) {
      console.warn('loadSubmissions error:', err);
    }
  }, []);

  useEffect(() => {
    async function loadDynamicClassSubjects() {
      try {
        const [timetables, profiles] = await Promise.all([
          db.getTimetables(),
          db.getAllProfiles(),
        ]);

        const distinctClasses = Array.from(new Set(timetables.map(t => t.class_name).filter(Boolean)));
        
        const mapped: ClassSubject[] = distinctClasses.map(cName => {
          const cSlots = timetables.filter(t => t.class_name === cName);
          const distinctSubs = Array.from(new Set(cSlots.map(s => s.subject)));
          return {
            class: cName,
            subjects: distinctSubs.map(sub => {
              const slot = cSlots.find(s => s.subject === sub);
              return {
                name: sub,
                teacher: slot?.teacher_name || 'Faculty Member',
              };
            }),
          };
        });

        if (mapped.length > 0) {
          setClassSubjects(mapped);
        } else {
          const studentClasses = Array.from(new Set(profiles.map(p => p.class_name).filter(Boolean)));
          const defaultTeachers = profiles.filter(p => p.role === 'teacher');
          const defaultTeacherName = defaultTeachers[0]?.name || 'Department Faculty';
          setClassSubjects(studentClasses.map(sc => ({
            class: sc,
            subjects: [
              { name: 'Clinical Anatomy', teacher: defaultTeacherName },
              { name: 'Physiology & Pathology', teacher: defaultTeacherName },
              { name: 'Medical Lab Technology', teacher: defaultTeacherName },
            ]
          })));
        }
      } catch (err) {
        console.warn('Class subjects load notice:', err);
      }
    }
    loadDynamicClassSubjects();
    loadSubmissions();
  }, [loadSubmissions]);

  useRealtimeSubscription({ table: 'feedback_submissions', onChange: loadSubmissions, onReconnect: loadSubmissions });

  const selectedClassData = classSubjects.find(cs => cs.class === selectedClass);
  const selectedSubjectData = selectedClassData?.subjects.find(s => s.name === selectedSubject);

  const handleSendFeedback = async () => {
    if (!selectedClass || !selectedSubject || !feedbackMessage.trim()) {
      toast({
        title: "Incomplete Form",
        description: "Please select class, subject and enter feedback message.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      await db.createFeedbackSubmission({
        class_name: selectedClass,
        subject: selectedSubject,
        teacher_name: selectedSubjectData?.teacher || '',
        message: feedbackMessage,
        sender_id: user?.id
      });

      toast({
        title: "Feedback Dispatched",
        description: `Feedback submitted for ${selectedSubjectData?.teacher || 'Faculty'} (${selectedSubject} - ${selectedClass})`,
      });

      setSelectedClass('');
      setSelectedSubject('');
      setFeedbackMessage('');
      await loadSubmissions();
    } catch (err: any) {
      toast({
        title: "Failed to Send Feedback",
        description: err.message || "An error occurred while saving feedback.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex justify-end gap-2">
        <Button 
          variant={activeView === 'create' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setActiveView('create')}
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Compose Feedback
        </Button>
        <Button 
          variant={activeView === 'history' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setActiveView('history')}
        >
          <History className="w-4 h-4 mr-2" />
          Submission History ({submissions.length})
        </Button>
      </div>

      {activeView === 'create' ? (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              <CardTitle>Class Feedback System</CardTitle>
            </div>
            <CardDescription>
              Submit pedagogical and departmental feedback to faculty
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Class</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classSubjects.map((cs) => (
                      <SelectItem key={cs.class} value={cs.class}>
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4" />
                          <span>{cs.class}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedClassData && (
                <div className="space-y-2">
                  <Label>Select Subject & Teacher</Label>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedClassData.subjects.map((subject) => (
                        <SelectItem key={subject.name} value={subject.name}>
                          <div className="flex flex-col">
                            <span className="font-medium">{subject.name}</span>
                            <span className="text-sm text-muted-foreground">{subject.teacher}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedSubjectData && (
                <div className="bg-muted p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{selectedClass} - {selectedSubject}</p>
                      <p className="text-sm text-muted-foreground">Teacher: {selectedSubjectData.teacher}</p>
                    </div>
                    <Badge variant="secondary">Selected</Badge>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="feedback">Feedback Message</Label>
                <Textarea
                  id="feedback"
                  placeholder="Enter institutional or pedagogical observations for the course..."
                  value={feedbackMessage}
                  onChange={(e) => setFeedbackMessage(e.target.value)}
                  rows={4}
                />
              </div>
            </div>

            <Button 
              onClick={handleSendFeedback}
              className="w-full"
              disabled={!selectedClass || !selectedSubject || !feedbackMessage.trim() || loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </span>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Dispatch Feedback
                </>
              )}
            </Button>

            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <p className="font-medium">Information:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Select the target academic class and subject</li>
                <li>Feedback is saved to official institutional records in Supabase</li>
                <li>Teachers and Department Heads are alerted for academic continuous improvement</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <History className="w-5 h-5 text-primary" />
              <CardTitle>Feedback Submissions Log</CardTitle>
            </div>
            <CardDescription>
              Complete history of feedback recorded across academic departments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submissions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No feedback submissions recorded yet.
              </p>
            ) : (
              <div className="space-y-3">
                {submissions.map((sub) => (
                  <div key={sub.id} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{sub.class_name}</Badge>
                        <Badge variant="secondary">{sub.subject}</Badge>
                        <span className="text-xs font-semibold">{sub.teacher_name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {sub.created_at ? new Date(sub.created_at).toLocaleDateString() : 'Recorded'}
                      </span>
                    </div>
                    <p className="text-sm">{sub.message}</p>
                    {sub.rating && (
                      <div className="text-xs text-muted-foreground">
                        Rating: {sub.rating} / 5
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
