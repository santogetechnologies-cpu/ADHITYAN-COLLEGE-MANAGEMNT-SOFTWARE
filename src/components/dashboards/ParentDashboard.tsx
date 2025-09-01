import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  TrendingUp, 
  Calendar, 
  Heart, 
  MessageCircle, 
  CreditCard,
  Bus,
  AlertTriangle,
  CheckCircle,
  Clock,
  BookOpen,
  Award
} from 'lucide-react';

export function ParentDashboard() {
  const navigate = useNavigate();
  
  const childData = {
    name: "Alex Chen",
    class: "Grade 10-A",
    rollNumber: "10A-023",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
  };

  const attendanceData = {
    overall: 94,
    thisWeek: 100,
    thisMonth: 92
  };

  const academicProgress = [
    { subject: 'Mathematics', grade: 'A-', percentage: 85, trend: 'up' },
    { subject: 'Science', grade: 'A+', percentage: 92, trend: 'up' },
    { subject: 'English', grade: 'B+', percentage: 78, trend: 'stable' },
    { subject: 'History', grade: 'A', percentage: 88, trend: 'up' },
    { subject: 'Physical Education', grade: 'A+', percentage: 95, trend: 'up' }
  ];

  const recentActivities = [
    { type: 'assignment', message: 'Math homework submitted on time', time: '2 hours ago', status: 'completed' },
    { type: 'exam', message: 'Science unit test scored 92%', time: '1 day ago', status: 'success' },
    { type: 'attendance', message: 'Attended all classes today', time: '1 day ago', status: 'success' },
    { type: 'health', message: 'Completed morning wellness check-in', time: '1 day ago', status: 'completed' }
  ];

  const upcomingEvents = [
    { event: 'Parent-Teacher Conference', date: 'March 15', type: 'meeting' },
    { event: 'Mathematics Unit Test', date: 'March 18', type: 'exam' },
    { event: 'Science Project Submission', date: 'March 20', type: 'assignment' },
    { event: 'Sports Day', date: 'March 25', type: 'event' }
  ];

  const healthInsights = {
    mood: 'Positive',
    sleepPattern: 'Good',
    stressLevel: 'Low',
    physicalActivity: 'Active'
  };

  const feeStatus = {
    totalDue: 2500,
    dueDate: 'March 31, 2024',
    status: 'pending'
  };

  return (
    <div className="space-y-6">
      {/* Header with Child Info */}
      <div className="bg-gradient-secondary text-secondary-foreground rounded-lg p-6">
        <div className="flex items-center space-x-4">
          <img 
            src={childData.avatar} 
            alt={childData.name}
            className="w-16 h-16 rounded-full border-4 border-white shadow-lg"
          />
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{childData.name}</h1>
            <p className="opacity-90">{childData.class} • Roll No: {childData.rollNumber}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{attendanceData.overall}%</div>
            <div className="text-sm opacity-80">Overall Attendance</div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Academic Progress */}
          <Card className="shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  <CardTitle>Academic Progress</CardTitle>
                </div>
                <Badge variant="secondary">Current Semester</Badge>
              </div>
              <CardDescription>Track your child's performance across all subjects</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {academicProgress.map((subject, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{subject.subject}</h4>
                        <div className="flex items-center space-x-2">
                          <Badge variant={subject.grade.startsWith('A') ? 'default' : 'secondary'}>
                            {subject.grade}
                          </Badge>
                          <TrendingUp className={`w-4 h-4 ${subject.trend === 'up' ? 'text-success' : 'text-muted-foreground'}`} />
                        </div>
                      </div>
                      <Progress value={subject.percentage} className="h-2" />
                      <div className="text-sm text-muted-foreground mt-1">{subject.percentage}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activities */}
          <Card className="shadow-md">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-accent" />
                <CardTitle>Recent Activities</CardTitle>
              </div>
              <CardDescription>Stay updated with your child's daily activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      activity.status === 'completed' ? 'bg-success/10' :
                      activity.status === 'success' ? 'bg-success/10' : 'bg-muted'
                    }`}>
                      {activity.status === 'completed' || activity.status === 'success' ? (
                        <CheckCircle className="w-4 h-4 text-success" />
                      ) : (
                        <Clock className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.message}</p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card className="shadow-md">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-warning" />
                <CardTitle>Upcoming Events</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingEvents.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium text-sm">{item.event}</h4>
                      <Badge variant="outline" className="text-xs mt-1">{item.type}</Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{item.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Attendance Overview */}
          <Card className="shadow-md">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <User className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">Attendance</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-success">{attendanceData.overall}%</div>
                <p className="text-sm text-muted-foreground">Overall Attendance</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>This Week</span>
                  <span className="font-medium">{attendanceData.thisWeek}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>This Month</span>
                  <span className="font-medium">{attendanceData.thisMonth}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Health & Wellness */}
          <Card className="shadow-md">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Heart className="w-5 h-5 text-red-500" />
                <CardTitle className="text-lg">Health & Wellness</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-lg">😊</div>
                  <div className="text-xs font-medium">{healthInsights.mood}</div>
                  <div className="text-xs text-muted-foreground">Mood</div>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-lg">😴</div>
                  <div className="text-xs font-medium">{healthInsights.sleepPattern}</div>
                  <div className="text-xs text-muted-foreground">Sleep</div>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-lg">😌</div>
                  <div className="text-xs font-medium">{healthInsights.stressLevel}</div>
                  <div className="text-xs text-muted-foreground">Stress</div>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-lg">🏃</div>
                  <div className="text-xs font-medium">{healthInsights.physicalActivity}</div>
                  <div className="text-xs text-muted-foreground">Activity</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fee Management */}
          <Card className="shadow-md">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-warning" />
                <CardTitle className="text-lg">Fee Status</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Amount Due</span>
                  <span className="font-bold text-lg">${feeStatus.totalDue}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Due Date</span>
                  <span className="text-warning">{feeStatus.dueDate}</span>
                </div>
                <Button className="w-full">Pay Now</Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => navigate('/message-teacher')}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Message Teacher
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => navigate('/track-bus')}
              >
                <Bus className="w-4 h-4 mr-2" />
                Track School Bus
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => navigate('/achievements')}
              >
                <Award className="w-4 h-4 mr-2" />
                View Achievements
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => navigate('/report-concern')}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Report Concern
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}