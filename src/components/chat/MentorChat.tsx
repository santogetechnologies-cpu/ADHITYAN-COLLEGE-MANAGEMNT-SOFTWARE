import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { GraduationCap, CheckCircle, Clock, Brain, BookOpen, MessageSquare } from 'lucide-react';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

interface MentorMessage {
  id: string;
  type: 'study_guide' | 'quiz' | 'summary' | 'daily_update' | 'feedback_form';
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
  const [messages, setMessages] = useState<MentorMessage[]>([
    {
      id: '1',
      type: 'study_guide',
      content: '📚 Daily Study Focus: Mathematics - Quadratic Equations\n\nKey Points for Today:\n• Standard form: ax² + bx + c = 0\n• Discriminant formula: b² - 4ac\n• Factoring methods and completing the square\n\nPractice: Solve 3 quadratic equations using different methods.',
      timestamp: new Date()
    },
    {
      id: '2',
      type: 'quiz',
      content: 'Let\'s test your understanding with a quick quiz!',
      timestamp: new Date(),
      quiz: {
        id: 'q1',
        question: 'What is the discriminant of the quadratic equation 2x² + 5x + 3 = 0?',
        options: ['1', '25', '49', '7'],
        correctAnswer: 0
      }
    }
  ]);

  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState<Record<string, boolean>>({});
  const [feedbackResponses, setFeedbackResponses] = useState<Record<string, string>>({});

  // Load daily updates and feedback forms
  useEffect(() => {
    const loadTeachingUpdates = () => {
      const updates = JSON.parse(localStorage.getItem('teachingUpdates') || '[]');
      const feedbackForms = JSON.parse(localStorage.getItem('feedbackForms') || '[]');
      
      const newMessages: MentorMessage[] = [];
      
      // Add teaching updates
      updates.forEach((update: any) => {
        newMessages.push({
          id: `update-${update.id}`,
          type: 'daily_update',
          content: `📖 Daily Class Update - ${update.subject}`,
          timestamp: new Date(update.date),
          dailyUpdate: update
        });
      });
      
      // Add feedback forms
      feedbackForms.forEach((form: any) => {
        newMessages.push({
          id: `feedback-${form.id}`,
          type: 'feedback_form',
          content: `📝 Feedback Form - ${form.subject}`,
          timestamp: new Date(form.timestamp),
          feedbackForm: form
        });
      });
      
      if (newMessages.length > 0) {
        setMessages(prev => [...prev, ...newMessages]);
      }
    };

    loadTeachingUpdates();
  }, []);

  const handleQuizAnswer = (messageId: string, answerIndex: number) => {
    setSelectedAnswers(prev => ({ ...prev, [messageId]: answerIndex }));
  };

  const handleSubmitQuiz = (messageId: string, quiz: QuizQuestion) => {
    setShowResults(prev => ({ ...prev, [messageId]: true }));
    
    const isCorrect = selectedAnswers[messageId] === quiz.correctAnswer;
    
    // Add result message
    const resultMessage: MentorMessage = {
      id: Date.now().toString(),
      type: 'summary',
      content: isCorrect 
        ? '✅ Excellent! You got it right. The discriminant is b² - 4ac = 5² - 4(2)(3) = 25 - 24 = 1'
        : '❌ Not quite right. The discriminant is b² - 4ac = 5² - 4(2)(3) = 25 - 24 = 1. Let\'s review this concept!',
      timestamp: new Date()
    };
    
    setTimeout(() => {
      setMessages(prev => [...prev, resultMessage]);
    }, 500);
  };

  const generateNewContent = () => {
    const studyTopics = [
      {
        subject: 'Physics',
        content: '⚡ Daily Study Focus: Physics - Laws of Motion\n\nKey Points:\n• Newton\'s First Law: Law of Inertia\n• Newton\'s Second Law: F = ma\n• Newton\'s Third Law: Action-Reaction\n\nToday\'s Goal: Solve 5 problems using these laws.'
      },
      {
        subject: 'Chemistry',
        content: '🧪 Daily Study Focus: Chemistry - Periodic Table\n\nKey Points:\n• Atomic number and mass number\n• Groups and periods\n• Electronic configuration\n\nPractice: Identify electron configurations for first 20 elements.'
      }
    ];

    const randomTopic = studyTopics[Math.floor(Math.random() * studyTopics.length)];
    
    const newMessage: MentorMessage = {
      id: Date.now().toString(),
      type: 'study_guide',
      content: randomTopic.content,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
  };

  return (
    <Card className="h-[500px] flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <GraduationCap className="w-5 h-5 text-accent" />
            <CardTitle className="text-lg">Mentor Chat</CardTitle>
          </div>
          <Button onClick={generateNewContent} size="sm" variant="outline">
            New Content
          </Button>
        </div>
        <CardDescription>Daily Study Guide & Interactive Quizzes</CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col">
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className="space-y-3">
                <div className="bg-muted rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    {message.type === 'study_guide' && (
                      <>
                        <Brain className="w-4 h-4 text-primary" />
                        <Badge variant="secondary">Study Guide</Badge>
                      </>
                    )}
                    {message.type === 'quiz' && (
                      <>
                        <CheckCircle className="w-4 h-4 text-accent" />
                        <Badge variant="default">Quiz Time</Badge>
                      </>
                    )}
                    {message.type === 'summary' && (
                      <>
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <Badge variant="outline">Result</Badge>
                      </>
                    )}
                    {message.type === 'daily_update' && (
                      <>
                        <BookOpen className="w-4 h-4 text-accent" />
                        <Badge variant="secondary">Class Update</Badge>
                      </>
                    )}
                    {message.type === 'feedback_form' && (
                      <>
                        <MessageSquare className="w-4 h-4 text-primary" />
                        <Badge variant="default">Feedback</Badge>
                      </>
                    )}
                  </div>
                  
                  <div className="whitespace-pre-line text-sm mb-3">
                    {message.content}
                  </div>
                  
                  {message.quiz && (
                    <div className="space-y-3 border-t pt-3">
                      <h4 className="font-medium text-sm">{message.quiz.question}</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {message.quiz.options.map((option, index) => (
                          <Button
                            key={index}
                            variant={
                              showResults[message.id]
                                ? index === message.quiz!.correctAnswer
                                  ? 'default'
                                  : selectedAnswers[message.id] === index
                                  ? 'destructive'
                                  : 'outline'
                                : selectedAnswers[message.id] === index
                                ? 'default'
                                : 'outline'
                            }
                            size="sm"
                            className="justify-start text-left"
                            onClick={() => handleQuizAnswer(message.id, index)}
                            disabled={showResults[message.id]}
                          >
                            {String.fromCharCode(65 + index)}. {option}
                          </Button>
                        ))}
                      </div>
                      {selectedAnswers[message.id] !== undefined && !showResults[message.id] && (
                        <Button
                          onClick={() => handleSubmitQuiz(message.id, message.quiz!)}
                          size="sm"
                          className="w-full"
                        >
                          Submit Answer
                        </Button>
                      )}
                    </div>
                  )}

                  {message.dailyUpdate && (
                    <div className="space-y-3 border-t pt-3">
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <h4 className="font-medium text-sm mb-2">{message.dailyUpdate.subject} - {message.dailyUpdate.class}</h4>
                        
                        {message.dailyUpdate.topicsCovered.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Topics Covered:</p>
                            <div className="flex flex-wrap gap-1">
                              {message.dailyUpdate.topicsCovered.map((topic, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">{topic}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {message.dailyUpdate.importantTopics.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs font-medium text-muted-foreground mb-1">⭐ Important for Exams:</p>
                            <div className="flex flex-wrap gap-1">
                              {message.dailyUpdate.importantTopics.map((topic, idx) => (
                                <Badge key={idx} variant="default" className="text-xs">{topic}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {message.dailyUpdate.pyq.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs font-medium text-muted-foreground mb-1">📋 PYQ References:</p>
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
                            <p className="text-xs font-medium text-muted-foreground">Notes:</p>
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
                          Class: {message.feedbackForm.class} | Subject: {message.feedbackForm.subject}
                        </p>
                        <p className="text-sm mb-3">{message.feedbackForm.message}</p>
                        
                        <div className="space-y-2">
                          <Textarea
                            placeholder="Enter your response to this feedback..."
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
                            disabled={!feedbackResponses[message.id]?.trim()}
                            onClick={() => {
                              // In real app, would submit to backend
                              console.log('Feedback response:', feedbackResponses[message.id]);
                              setFeedbackResponses(prev => ({ ...prev, [message.id]: '' }));
                            }}
                          >
                            Submit Response
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}