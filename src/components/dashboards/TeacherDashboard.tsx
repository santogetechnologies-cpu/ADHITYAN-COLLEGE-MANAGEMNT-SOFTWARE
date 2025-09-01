import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClassManagementSidebar } from '@/components/teachers/ClassManagementSidebar';
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  Users, 
  Calendar, 
  TrendingUp, 
  MessageCircle,
  PlusCircle,
  FileText,
  Bot,
  CheckCircle,
  Clock,
  AlertTriangle,
  Star,
  BarChart3
} from 'lucide-react';

export function TeacherDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const classStats = {
    totalStudents: 32,
    attendanceToday: 30,
    assignmentsPending: 8,
    avgPerformance: 85
  };

  const todaysClasses = [
    { subject: 'Mathematics', time: '9:00 AM', class: 'Grade 10-A', students: 32, status: 'completed' },
    { subject: 'Physics', time: '11:00 AM', class: 'Grade 10-B', students: 28, status: 'in-progress' },
    { subject: 'Mathematics', time: '2:00 PM', class: 'Grade 10-C', students: 30, status: 'upcoming' },
    { subject: 'Study Hall', time: '3:30 PM', class: 'All Grades', students: 45, status: 'upcoming' }
  ];

  const recentSubmissions = [
    { student: 'Alex Chen', assignment: 'Quadratic Equations', subject: 'Math', score: 92, time: '2 hours ago' },
    { student: 'Sarah Johnson', assignment: 'Physics Lab Report', subject: 'Physics', score: 88, time: '4 hours ago' },
    { student: 'Mike Rodriguez', assignment: 'Algebra Practice', subject: 'Math', score: 76, time: '6 hours ago' },
    { student: 'Emma Davis', assignment: 'Trigonometry Quiz', subject: 'Math', score: 94, time: '1 day ago' }
  ];

  const studentAlerts = [
    { student: 'John Smith', issue: 'Low performance in recent tests', priority: 'high', subject: 'Mathematics' },
    { student: 'Lisa Wong', issue: 'Multiple absent days this week', priority: 'medium', subject: 'All' },
    { student: 'David Brown', issue: 'Health check-in concerns', priority: 'high', subject: 'Wellness' }
  ];

  const upcomingTasks = [
    { task: 'Grade Physics Lab Reports', due: 'Today', priority: 'high' },
    { task: 'Prepare Math Quiz for Grade 10-A', due: 'Tomorrow', priority: 'medium' },
    { task: 'Submit Monthly Performance Reports', due: '3 days', priority: 'medium' },
    { task: 'Parent-Teacher Conference Prep', due: '1 week', priority: 'low' }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-accent text-accent-foreground rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Welcome back, Dr. Rodriguez! 👨‍🏫</h1>
            <p className="opacity-90">Ready to inspire young minds today?</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{classStats.avgPerformance}%</div>
            <div className="text-sm opacity-80">Class Average</div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-md">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mx-auto mb-2">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div className="text-2xl font-bold">{classStats.totalStudents}</div>
            <div className="text-sm text-muted-foreground">Total Students</div>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-success/10 rounded-full mx-auto mb-2">
              <CheckCircle className="w-6 h-6 text-success" />
            </div>
            <div className="text-2xl font-bold">{classStats.attendanceToday}</div>
            <div className="text-sm text-muted-foreground">Present Today</div>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-warning/10 rounded-full mx-auto mb-2">
              <Clock className="w-6 h-6 text-warning" />
            </div>
            <div className="text-2xl font-bold">{classStats.assignmentsPending}</div>
            <div className="text-sm text-muted-foreground">Pending Reviews</div>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-accent/10 rounded-full mx-auto mb-2">
              <TrendingUp className="w-6 h-6 text-accent" />
            </div>
            <div className="text-2xl font-bold">{classStats.avgPerformance}%</div>
            <div className="text-sm text-muted-foreground">Avg Performance</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Teaching Assistant */}
          <Card className="shadow-md">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Bot className="w-5 h-5 text-primary" />
                <CardTitle>AI Teaching Assistant</CardTitle>
              </div>
              <CardDescription>Your intelligent lesson planning companion</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-lg p-4 mb-4">
                <p className="text-sm mb-2"><strong>AI Assistant:</strong> I've analyzed your students' performance and suggest focusing on quadratic equations visualization techniques in tomorrow's lesson.</p>
                <div className="flex space-x-2">
                  <Button size="sm" variant="default">Generate Lesson Plan</Button>
                  <Button size="sm" variant="outline">Create Quiz</Button>
                  <Button size="sm" variant="outline">Student Insights</Button>
                </div>
              </div>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <span>📚 Smart Lesson Plans</span>
                <span>📊 Performance Analytics</span>
                <span>🎯 Personalized Recommendations</span>
              </div>
            </CardContent>
          </Card>

          {/* Today's Classes */}
          <Card className="shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <CardTitle>Today's Classes</CardTitle>
                </div>
                <Button variant="outline" size="sm">
                  <PlusCircle className="w-4 h-4 mr-1" />
                  Add Class
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {todaysClasses.map((classItem, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium">{classItem.subject}</h4>
                        <Badge 
                          variant={classItem.status === 'completed' ? 'default' : classItem.status === 'in-progress' ? 'secondary' : 'outline'}
                        >
                          {classItem.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{classItem.class} • {classItem.students} students</p>
                      <p className="text-sm font-medium">{classItem.time}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Submissions */}
          <Card className="shadow-md">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-accent" />
                <CardTitle>Recent Submissions</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentSubmissions.map((submission, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-sm">{submission.student}</h4>
                        <Badge variant="outline" className="text-xs">{submission.subject}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{submission.assignment}</p>
                      <p className="text-xs text-muted-foreground">{submission.time}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        <Star className="w-4 h-4 text-accent" />
                        <span className="font-bold text-lg">{submission.score}%</span>
                      </div>
                      <Button size="sm" variant="outline" className="mt-1">Review</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Student Alerts */}
          <Card className="shadow-md">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <CardTitle className="text-lg">Student Alerts</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {studentAlerts.map((alert, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">{alert.student}</h4>
                    <Badge 
                      variant={alert.priority === 'high' ? 'destructive' : alert.priority === 'medium' ? 'secondary' : 'outline'}
                      className="text-xs"
                    >
                      {alert.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{alert.issue}</p>
                  <Button size="sm" variant="outline" className="w-full">
                    Take Action
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Upcoming Tasks */}
          <Card className="shadow-md">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-warning" />
                <CardTitle className="text-lg">Upcoming Tasks</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingTasks.map((task, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{task.task}</div>
                      <div className="text-xs text-muted-foreground">Due: {task.due}</div>
                    </div>
                    <Badge 
                      variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'secondary' : 'outline'}
                      className="text-xs"
                    >
                      {task.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link to="/teachers/create-assignment">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Create Assignment
                </Button>
              </Link>
              <Link to="/teachers/message-parents">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Message Parents
                </Button>
              </Link>
              <Link to="/teachers/generate-report">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Report
                </Button>
              </Link>
              <Link to="/teachers/daily-update">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Daily Update
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <ClassManagementSidebar 
        isOpen={isSidebarOpen} 
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)} 
      />
    </div>
  );
}