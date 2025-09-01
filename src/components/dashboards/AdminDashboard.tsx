import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';
import UserManagement from '@/components/admin/UserManagement';
import TeacherAssignments from '@/components/admin/TeacherAssignments';
import TimetableManagement from '@/components/admin/TimetableManagement';
import { FeedbackSystem } from '@/components/admin/FeedbackSystem';
import { 
  Shield, 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  School,
  BookOpen,
  DollarSign,
  Calendar,
  BarChart3,
  UserCheck,
  Bus,
  Settings,
  FileText,
  Heart,
  Award,
  PenTool,
  FileCheck,
  Stethoscope,
  Trophy,
  UserPlus,
  GraduationCap,
  Phone,
  Package
} from 'lucide-react';

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  
  const institutionStats = {
    totalStudents: 1250,
    totalTeachers: 85,
    totalStaff: 45,
    attendanceRate: 94.5,
    revenue: 485000,
    expenses: 320000
  };

  const performanceMetrics = [
    { department: 'Mathematics', performance: 88, students: 320, trend: 'up' },
    { department: 'Science', performance: 92, students: 310, trend: 'up' },
    { department: 'English', performance: 85, students: 340, trend: 'stable' },
    { department: 'Social Studies', performance: 79, students: 280, trend: 'down' },
    { department: 'Physical Education', performance: 95, students: 350, trend: 'up' }
  ];

  const recentAlerts = [
    { type: 'health', message: '15 students reported flu symptoms', priority: 'high', time: '2 hours ago' },
    { type: 'finance', message: 'Fee collection target achieved', priority: 'medium', time: '4 hours ago' },
    { type: 'staff', message: '3 teacher leave requests pending', priority: 'medium', time: '6 hours ago' },
    { type: 'transport', message: 'Bus Route 5 delayed due to traffic', priority: 'low', time: '1 day ago' }
  ];

  const upcomingEvents = [
    { event: 'Board Meeting', date: 'March 15', type: 'Administrative', attendees: 12 },
    { event: 'Annual Sports Day', date: 'March 20', type: 'Academic', attendees: 800 },
    { event: 'Parent-Teacher Conference', date: 'March 25', type: 'Academic', attendees: 400 },
    { event: 'Staff Development Workshop', date: 'March 30', type: 'Professional', attendees: 85 }
  ];

  const departmentHealth = [
    { name: 'Academic Performance', score: 88, status: 'good' },
    { name: 'Student Wellbeing', score: 92, status: 'excellent' },
    { name: 'Staff Satisfaction', score: 85, status: 'good' },
    { name: 'Financial Health', score: 79, status: 'fair' },
    { name: 'Infrastructure', score: 91, status: 'excellent' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex space-x-4 mb-6">
        <Button
          variant={activeTab === 'overview' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </Button>
        <Button
          variant={activeTab === 'users' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('users')}
        >
          User Management
        </Button>
        <Button
          variant={activeTab === 'teachers' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('teachers')}
        >
          Teacher Assignments
        </Button>
        <Button
          variant={activeTab === 'timetable' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('timetable')}
        >
          Timetable
        </Button>
        <Button
          variant={activeTab === 'feedback' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('feedback')}
        >
          Feedback System
        </Button>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Welcome Section */}
          <div className="bg-gradient-hero text-primary-foreground rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-2">Welcome, Jennifer! 🏫</h1>
                <p className="opacity-90">Your institution overview at a glance</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{institutionStats.attendanceRate}%</div>
                <div className="text-sm opacity-80">Institution Attendance</div>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            <Card className="shadow-md">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-full mx-auto mb-2">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div className="text-xl font-bold">{institutionStats.totalStudents.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Students</div>
              </CardContent>
            </Card>
            <Card className="shadow-md">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center w-10 h-10 bg-secondary/10 rounded-full mx-auto mb-2">
                  <BookOpen className="w-5 h-5 text-secondary" />
                </div>
                <div className="text-xl font-bold">{institutionStats.totalTeachers}</div>
                <div className="text-xs text-muted-foreground">Teachers</div>
              </CardContent>
            </Card>
            <Card className="shadow-md">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center w-10 h-10 bg-accent/10 rounded-full mx-auto mb-2">
                  <UserCheck className="w-5 h-5 text-accent" />
                </div>
                <div className="text-xl font-bold">{institutionStats.totalStaff}</div>
                <div className="text-xs text-muted-foreground">Staff</div>
              </CardContent>
            </Card>
            <Card className="shadow-md">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center w-10 h-10 bg-success/10 rounded-full mx-auto mb-2">
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
                <div className="text-xl font-bold">{institutionStats.attendanceRate}%</div>
                <div className="text-xs text-muted-foreground">Attendance</div>
              </CardContent>
            </Card>
            <Card className="shadow-md">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center w-10 h-10 bg-success/10 rounded-full mx-auto mb-2">
                  <DollarSign className="w-5 h-5 text-success" />
                </div>
                <div className="text-lg font-bold">${(institutionStats.revenue / 1000).toFixed(0)}K</div>
                <div className="text-xs text-muted-foreground">Revenue</div>
              </CardContent>
            </Card>
            <Card className="shadow-md">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center w-10 h-10 bg-warning/10 rounded-full mx-auto mb-2">
                  <DollarSign className="w-5 h-5 text-warning" />
                </div>
                <div className="text-lg font-bold">${(institutionStats.expenses / 1000).toFixed(0)}K</div>
                <div className="text-xs text-muted-foreground">Expenses</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Department Performance */}
              <Card className="shadow-md">
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <School className="w-5 h-5 text-primary" />
                    <CardTitle>Department Performance</CardTitle>
                  </div>
                  <CardDescription>Academic performance metrics across departments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {performanceMetrics.map((dept, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{dept.department}</h4>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium">{dept.performance}%</span>
                              <TrendingUp className={`w-4 h-4 ${dept.trend === 'up' ? 'text-success' : dept.trend === 'down' ? 'text-destructive' : 'text-muted-foreground'}`} />
                            </div>
                          </div>
                          <Progress value={dept.performance} className="h-2 mb-1" />
                          <div className="text-sm text-muted-foreground">{dept.students} students</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Institution Health Overview */}
              <Card className="shadow-md">
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5 text-accent" />
                    <CardTitle>Institution Health</CardTitle>
                  </div>
                  <CardDescription>Key performance indicators for overall health</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {departmentHealth.map((metric, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm">{metric.name}</h4>
                          <Badge 
                            variant={metric.status === 'excellent' ? 'default' : metric.status === 'good' ? 'secondary' : 'outline'}
                            className="text-xs"
                          >
                            {metric.status}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Progress value={metric.score} className="h-2 flex-1" />
                          <span className="text-sm font-medium">{metric.score}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Alerts */}
              <Card className="shadow-md">
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    <CardTitle>Recent Alerts & Notifications</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentAlerts.map((alert, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          alert.type === 'health' ? 'bg-red-100' :
                          alert.type === 'finance' ? 'bg-green-100' :
                          alert.type === 'staff' ? 'bg-blue-100' : 'bg-yellow-100'
                        }`}>
                          {alert.type === 'health' && <Heart className="w-4 h-4 text-red-600" />}
                          {alert.type === 'finance' && <DollarSign className="w-4 h-4 text-green-600" />}
                          {alert.type === 'staff' && <Users className="w-4 h-4 text-blue-600" />}
                          {alert.type === 'transport' && <Bus className="w-4 h-4 text-yellow-600" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{alert.message}</p>
                          <p className="text-xs text-muted-foreground">{alert.time}</p>
                        </div>
                        <Badge 
                          variant={alert.priority === 'high' ? 'destructive' : alert.priority === 'medium' ? 'secondary' : 'outline'}
                          className="text-xs"
                        >
                          {alert.priority}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Upcoming Events */}
              <Card className="shadow-md">
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5 text-warning" />
                    <CardTitle className="text-lg">Upcoming Events</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {upcomingEvents.map((event, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-sm">{event.event}</h4>
                          <Badge variant="outline" className="text-xs">{event.type}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">{event.date}</p>
                        <p className="text-xs text-muted-foreground">{event.attendees} attendees</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Management */}
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">Quick Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {/* Role Management Sections */}
                  <div className="space-y-3 mb-4">
                    <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">Department Oversight</h3>
                    
                    {/* Finance Manager Section */}
                    <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                      <Link to="/dashboard?role=finance_manager">
                        <DollarSign className="w-4 h-4 mr-2" />
                        <div className="flex-1 text-left">
                          <div className="font-medium">Finance Manager</div>
                          <div className="text-xs text-muted-foreground">Financial oversight & fee management</div>
                        </div>
                      </Link>
                    </Button>
                    
                    {/* Transport Driver Section */}
                    <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                      <Link to="/dashboard?role=driver">
                        <Bus className="w-4 h-4 mr-2" />
                        <div className="flex-1 text-left">
                          <div className="font-medium">Transport Driver</div>
                          <div className="text-xs text-muted-foreground">Student transport & safety</div>
                        </div>
                      </Link>
                    </Button>
                    
                    {/* Receptionist Section */}
                    <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                      <Link to="/dashboard?role=receptionist">
                        <Phone className="w-4 h-4 mr-2" />
                        <div className="flex-1 text-left">
                          <div className="font-medium">Receptionist</div>
                          <div className="text-xs text-muted-foreground">Front office & visitor management</div>
                        </div>
                      </Link>
                    </Button>
                    
                    {/* Store Manager Section */}
                    <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                      <Link to="/dashboard?role=storekeeper">
                        <Package className="w-4 h-4 mr-2" />
                        <div className="flex-1 text-left">
                          <div className="font-medium">Store Manager</div>
                          <div className="text-xs text-muted-foreground">Inventory & asset management</div>
                        </div>
                      </Link>
                    </Button>
                  </div>

                  {/* System Management */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">System Management</h3>
                    
                    <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                      <Link to="/exam-management">
                        <PenTool className="w-4 h-4 mr-2" />
                        Exam Management
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                      <Link to="/library-management">
                        <BookOpen className="w-4 h-4 mr-2" />
                        Library System
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                      <Link to="/admission-management">
                        <UserPlus className="w-4 h-4 mr-2" />
                        Admissions
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                      <Link to="/alumni-management">
                        <GraduationCap className="w-4 h-4 mr-2" />
                        Alumni Network
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                      <Link to="/medical-management">
                        <Stethoscope className="w-4 h-4 mr-2" />
                        Medical Center
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                      <Link to="/certificate-generation">
                        <FileCheck className="w-4 h-4 mr-2" />
                        Certificates
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                      <Link to="/sports-management">
                        <Trophy className="w-4 h-4 mr-2" />
                        Sports & Events
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                      <Link to="/disciplinary-management">
                        <Shield className="w-4 h-4 mr-2" />
                        Disciplinary
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                      <Link to="/admin/naac">
                        <Award className="w-4 h-4 mr-2" />
                        NAAC Accreditation
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <Settings className="w-4 h-4 mr-2" />
                      System Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* System Status */}
              <Card className="shadow-md">
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <Shield className="w-5 h-5 text-success" />
                    <CardTitle className="text-lg">System Status</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Server Status</span>
                      <Badge variant="default" className="bg-success">Online</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Database</span>
                      <Badge variant="default" className="bg-success">Healthy</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Backup Status</span>
                      <Badge variant="secondary">Last: 2h ago</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Security</span>
                      <Badge variant="default" className="bg-success">Secure</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
      
      {activeTab === 'users' && <UserManagement />}
      {activeTab === 'teachers' && <TeacherAssignments />}
      {activeTab === 'timetable' && <TimetableManagement />}
      {activeTab === 'feedback' && <FeedbackSystem />}
    </div>
  );
}