import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, BookOpen, FileText } from 'lucide-react';

interface Assignment {
  id: string;
  title: string;
  subject: string;
  type: 'assignment' | 'homework';
  dueDate: Date;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export function AssignmentsHomework() {
  const [assignments] = useState<Assignment[]>([
    {
      id: '1',
      title: 'Quadratic Equations Worksheet',
      subject: 'Mathematics',
      type: 'homework',
      dueDate: new Date('2024-08-30'),
      description: 'Complete problems 1-20 from Chapter 4',
      priority: 'high'
    },
    {
      id: '2',
      title: 'Physics Lab Report',
      subject: 'Physics',
      type: 'assignment',
      dueDate: new Date('2024-08-28'),
      description: 'Submit lab report on pendulum experiment',
      priority: 'medium'
    },
    {
      id: '3',
      title: 'Essay on Climate Change',
      subject: 'English',
      type: 'assignment',
      dueDate: new Date('2024-08-31'),
      description: 'Write a 500-word essay on climate change impacts',
      priority: 'medium'
    },
    {
      id: '4',
      title: 'Chemistry Problem Set',
      subject: 'Chemistry',
      type: 'homework',
      dueDate: new Date('2024-08-29'),
      description: 'Solve organic chemistry problems from Unit 3',
      priority: 'low'
    }
  ]);

  const now = new Date();
  const activeAssignments = assignments.filter(assignment => assignment.dueDate > now);

  const getDaysUntilDue = (dueDate: Date) => {
    const timeDiff = dueDate.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return daysDiff;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getUrgencyColor = (days: number) => {
    if (days <= 1) return 'text-destructive';
    if (days <= 3) return 'text-warning';
    return 'text-muted-foreground';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Assignments & Homework</CardTitle>
        </div>
        <CardDescription>
          Track your upcoming assignments and homework deadlines
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activeAssignments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No pending assignments or homework</p>
            </div>
          ) : (
            activeAssignments.map((assignment) => {
              const daysUntilDue = getDaysUntilDue(assignment.dueDate);
              return (
                <div
                  key={assignment.id}
                  className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-sm">{assignment.title}</h4>
                        <Badge 
                          variant={getPriorityColor(assignment.priority)}
                          className="text-xs"
                        >
                          {assignment.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {assignment.subject} • {assignment.type === 'assignment' ? 'Assignment' : 'Homework'}
                      </p>
                      <p className="text-sm text-muted-foreground">{assignment.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center space-x-2 text-xs">
                      <Calendar className="w-3 h-3" />
                      <span>Due: {assignment.dueDate.toLocaleDateString()}</span>
                    </div>
                    <div className={`flex items-center space-x-1 text-xs ${getUrgencyColor(daysUntilDue)}`}>
                      <Clock className="w-3 h-3" />
                      <span>
                        {daysUntilDue === 0 
                          ? 'Due today' 
                          : daysUntilDue === 1 
                          ? 'Due tomorrow' 
                          : `${daysUntilDue} days left`
                        }
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}