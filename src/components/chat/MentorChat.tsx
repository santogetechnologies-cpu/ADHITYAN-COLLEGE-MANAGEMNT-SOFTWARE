import { useState, useEffect, useCallback } from 'react';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { GraduationCap, CheckCircle, Clock, BookOpen, MessageSquare, Loader2 } from 'lucide-react';
import { db } from '@/services/supabase/database';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

interface MentorMessage {
  id: string;
  type: 'daily_update' | 'feedback_form' | 'quiz' | 'summary';
  content: string;
  timestamp: Date;
  quiz?: QuizQuestion;
  dailyUpdate?: {
    subject: string;
    class: string;
    topicsCovered: string[];
    importantTopics: string[];
    pyq: string[];
    nextClassPrep: string;
    notes: string;
  };
  feedbackForm?: {
    id: string;
    class: string;
    subject: string;
    teacher: string;
    message: string;
  };
}

export function MentorChat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<MentorMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState<Record<string, boolean>>({});
  const [feedbackResponses, setFeedbackResponses] = useState<Record<string, string>>({});
  const [submittingFeedback, setSubmittingFeedback] = useState<Record<string, boolean>>({});

  // Load daily updates and feedback forms from Supabase database
  const loadData = useCallback(async () => {
    try {
      const [teachingUpdates, feedbackForms] = await Promise.all([
        db.getDailyTeachingUpdates(),
        db.getFeedbackSubmissions()
      ]);

      const newMessages: MentorMessage[] = [];

      // Add database daily teaching updates
      if (teachingUpdates && teachingUpdates.length > 0) {
        teachingUpdates.forEach((update) => {
          newMessages.push({
            id: `db-update-${update.id}`,
            type: 'daily_update',
            content: `Daily Class Update — ${update.subject} (${update.class_name})`,
            timestamp: new Date(update.date || Date.now()),
            dailyUpdate: {
              subject: update.subject,
              class: update.class_name,
              topicsCovered: update.topics_covered || [],
              importantTopics: update.important_topics || [],
              pyq: update.pyq || [],
              nextClassPrep: update.next_class_prep || '',
              notes: update.notes || ''
            }
          });
        });
      }

      // Add database feedback forms
      if (feedbackForms && feedbackForms.length > 0) {
        feedbackForms.forEach((form) => {
          newMessages.push({
            id: `db-feedback-${form.id}`,
            type: 'feedback_form',
            content: `Faculty Feedback Request — ${form.subject}`,
            timestamp: new Date(form.created_at || Date.now()),
            feedbackForm: {
              id: form.id,
              class: form.class_name,
              subject: form.subject,
              teacher: form.teacher_name,
              message: form.message
            }
          });
        });
      }

      // Sort by timestamp descending so newest updates appear first
      newMessages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setMessages(newMessages);
    } catch (err) {
      console.error('Failed to load mentor chat updates:', err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time synchronization for daily teaching updates & teacher feedback
  useRealtimeSubscription({ table: 'daily_teaching_updates', onChange: loadData, onReconnect: loadData });
  useRealtimeSubscription({ table: 'feedback_submissions', onChange: loadData, onReconnect: loadData });

  const handleQuizAnswer = (messageId: string, answerIndex: number) => {
    setSelectedAnswers(prev => ({ ...prev, [messageId]: answerIndex }));
  };

  const handleSubmitFeedback = async (messageId: string, form: { class: string; subject: string; teacher: string }) => {
    const text = feedbackResponses[messageId]?.trim();
    if (!text) return;

    setSubmittingFeedback(prev => ({ ...prev, [messageId]: true }));
    try {
      await db.createFeedbackSubmission({
        user_id: user?.id,
        user_name: user?.name || 'Student',
        class_name: form.class,
        subject: form.subject,
        teacher_name: form.teacher,
        message: text,
      });

      toast({
        title: "Feedback Recorded",
        description: "Your response has been saved securely in the database."
      });
      setFeedbackResponses(prev => ({ ...prev, [messageId]: '' }));
    } catch (err: any) {
      toast({
        title: "Submission Error",
        description: err.message || "Could not record feedback response.",
        variant: "destructive"
      });
    } finally {
      setSubmittingFeedback(prev => ({ ...prev, [messageId]: false }));
    }
  };

  return (
    <Card className="h-[500px] flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <GraduationCap className="w-5 h-5 text-accent" />
            <CardTitle className="text-lg">Mentor Chat</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {messages.length} Live Updates
          </Badge>
        </div>
        <CardDescription>Daily Faculty Teaching Updates & Academic Study Guides</CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="flex-1 pr-4">
            {messages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium text-sm">No Daily Teaching Updates Yet</p>
                <p className="text-xs mt-1 max-w-sm mx-auto">
                  Teaching updates, important exam topics, PYQ references, and study guides posted by your faculty will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className="space-y-3">
                    <div className="bg-muted rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        {message.type === 'daily_update' && (
                          <>
                            <BookOpen className="w-4 h-4 text-accent" />
                            <Badge variant="secondary">Class Update</Badge>
                          </>
                        )}
                        {message.type === 'feedback_form' && (
                          <>
                            <MessageSquare className="w-4 h-4 text-primary" />
                            <Badge variant="default">Faculty Request</Badge>
                          </>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">
                          {message.timestamp.toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className="whitespace-pre-line text-sm mb-3 font-medium">
                        {message.content}
                      </div>

                      {message.dailyUpdate && (
                        <div className="space-y-3 border-t pt-3">
                          <div className="bg-card p-3 rounded-md space-y-2">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Class: {message.dailyUpdate.class}</span>
                              <span>Subject: {message.dailyUpdate.subject}</span>
                            </div>
                            
                            {message.dailyUpdate.topicsCovered.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Topics Covered:</p>
                                <div className="flex flex-wrap gap-1">
                                  {message.dailyUpdate.topicsCovered.map((topic, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-xs">{topic}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {message.dailyUpdate.importantTopics.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Key Exam Focus:</p>
                                <div className="flex flex-wrap gap-1">
                                  {message.dailyUpdate.importantTopics.map((topic, idx) => (
                                    <Badge key={idx} variant="default" className="text-xs">{topic}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {message.dailyUpdate.pyq.length > 0 && (
                              <div className="mb-3">
                                <p className="text-xs font-medium text-muted-foreground mb-1">Previous Year Questions:</p>
                                <div className="flex flex-wrap gap-1">
                                  {message.dailyUpdate.pyq.map((pyq, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">{pyq}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {message.dailyUpdate.nextClassPrep && (
                              <div className="mb-2">
                                <p className="text-xs font-medium text-muted-foreground">Next Class Prep:</p>
                                <p className="text-xs">{message.dailyUpdate.nextClassPrep}</p>
                              </div>
                            )}
                            
                            {message.dailyUpdate.notes && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground">Faculty Notes:</p>
                                <p className="text-xs">{message.dailyUpdate.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {message.feedbackForm && (
                        <div className="space-y-3 border-t pt-3">
                          <div className="bg-muted/50 p-3 rounded-lg">
                            <h4 className="font-medium text-sm mb-2">Feedback Request</h4>
                            <p className="text-xs text-muted-foreground mb-2">
                              Class: {message.feedbackForm.class} | Subject: {message.feedbackForm.subject} | Faculty: {message.feedbackForm.teacher}
                            </p>
                            <p className="text-sm mb-3">{message.feedbackForm.message}</p>
                            
                            <div className="space-y-2">
                              <Textarea
                                placeholder="Enter your response to this feedback request..."
                                value={feedbackResponses[message.id] || ''}
                                onChange={(e) => setFeedbackResponses(prev => ({
                                  ...prev,
                                  [message.id]: e.target.value
                                }))}
                                rows={3}
                              />
                              <Button 
                                size="sm" 
                                className="w-full"
                                disabled={!feedbackResponses[message.id]?.trim() || submittingFeedback[message.id]}
                                onClick={() => handleSubmitFeedback(message.id, message.feedbackForm!)}
                              >
                                {submittingFeedback[message.id] ? 'Submitting...' : 'Submit Response'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
