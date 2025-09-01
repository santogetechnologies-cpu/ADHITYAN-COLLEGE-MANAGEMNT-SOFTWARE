import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  ShoppingCart,
  Bus,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { AILearningChat } from '@/components/chat/AILearningChat';
import { MentorChat } from '@/components/chat/MentorChat';
import { WellnessCheckIn } from '@/components/wellness/WellnessCheckIn';
import { PerformanceAnalytics } from '@/components/performance/PerformanceAnalytics';
import { AssignmentsHomework } from '@/components/assignments/AssignmentsHomework';

export function StudentDashboard() {
  const navigate = useNavigate();
  const [selectedChatTab, setSelectedChatTab] = useState<'ai' | 'mentor'>('ai');

  const upcomingExams = [
    { subject: 'Mathematics', date: 'March 15', type: 'Unit Test', daysLeft: 3 },
    { subject: 'Physics', date: 'March 18', type: 'Lab Practical', daysLeft: 6 },
    { subject: 'Chemistry', date: 'March 22', type: 'Quarterly Exam', daysLeft: 10 }
  ];

  const getDueColor = (daysLeft: number) => {
    if (daysLeft <= 1) return 'text-destructive';
    if (daysLeft <= 3) return 'text-warning';
    return 'text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-hero text-primary-foreground rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Good morning, Alex! 🌟</h1>
            <p className="opacity-90">Ready to conquer today's learning goals?</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">78%</div>
            <div className="text-sm opacity-80">Overall Progress</div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chat Modules */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Learning Assistant</CardTitle>
                <div className="flex space-x-2">
                  <Button 
                    variant={selectedChatTab === 'ai' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedChatTab('ai')}
                  >
                    AI Doubt Solver
                  </Button>
                  <Button 
                    variant={selectedChatTab === 'mentor' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedChatTab('mentor')}
                  >
                    Mentor Guide
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {selectedChatTab === 'ai' ? <AILearningChat /> : <MentorChat />}
            </CardContent>
          </Card>

          {/* Assignments & Homework */}
          <AssignmentsHomework />

          {/* Performance Analytics */}
          <PerformanceAnalytics />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Daily Wellness Check-in */}
          <WellnessCheckIn />

          {/* Upcoming Exams */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-warning" />
                <CardTitle className="text-lg">Upcoming Exams</CardTitle>
              </div>
              <CardDescription>Stay prepared for your upcoming assessments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingExams.map((exam, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{exam.subject}</div>
                      <div className="text-xs text-muted-foreground">{exam.type}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{exam.date}</div>
                      <div className={`text-xs ${getDueColor(exam.daysLeft)}`}>
                        {exam.daysLeft} days left
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
              <CardDescription>Fast access to important features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => navigate('/store')}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Store
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => navigate('/track-bus')}
              >
                <Bus className="w-4 h-4 mr-2" />
                Track Bus
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => navigate('/report-concern')}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Raise Complaints
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}