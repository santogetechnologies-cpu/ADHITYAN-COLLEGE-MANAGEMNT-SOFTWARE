import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';
import { 
  Users, 
  GraduationCap, 
  DollarSign, 
  Truck,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  FileText,
  BookOpen,
  FileCheck,
  Stethoscope,
  Trophy,
  Shield,
  Calendar,
  PenTool
} from 'lucide-react';

export default function AdminOverview() {
  const systemStats = [
    { title: 'Total Students', value: '1,247', icon: GraduationCap, trend: '+5.2%', positive: true },
    { title: 'Staff Members', value: '156', icon: Users, trend: '+2.1%', positive: true },
    { title: 'Monthly Revenue', value: '₹24,56,789', icon: DollarSign, trend: '+12.5%', positive: true },
    { title: 'Active Vehicles', value: '24', icon: Truck, trend: '92% uptime', positive: true }
  ];

  const moduleStatus = [
    { module: 'NAAC Accreditation', completion: 78, status: 'in-progress', priority: 'high' },
    { module: 'Financial Management', completion: 95, status: 'operational', priority: 'low' },
    { module: 'Transport System', completion: 85, status: 'operational', priority: 'medium' },
    { module: 'Store Management', completion: 70, status: 'in-progress', priority: 'medium' }
  ];

  const recentActivities = [
    { activity: 'New teacher registration completed', user: 'Dr. Priya Sharma', time: '2 hours ago', type: 'success' },
    { activity: 'Fee collection report generated', user: 'Finance Team', time: '4 hours ago', type: 'info' },
    { activity: 'Transport route updated', user: 'Transport Manager', time: '6 hours ago', type: 'info' },
    { activity: 'Low stock alert: Laboratory chemicals', user: 'Store Manager', time: '8 hours ago', type: 'warning' }
  ];

  const pendingApprovals = [
    { type: 'Student Admission', count: 23, urgency: 'high' },
    { type: 'Fee Waiver Requests', count: 8, urgency: 'medium' },
    { type: 'Staff Leave Applications', count: 12, urgency: 'low' },
    { type: 'Infrastructure Requests', count: 5, urgency: 'high' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Overview</h1>
        <p className="text-muted-foreground">
          Comprehensive system monitoring and management dashboard
        </p>
      </div>

      {/* System Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {systemStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className={`text-xs flex items-center gap-1 ${
                  stat.positive ? 'text-green-600' : 'text-red-600'
                }`}>
                  <TrendingUp className="h-3 w-3" />
                  {stat.trend}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Module Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Module Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {moduleStatus.map((module, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{module.module}</span>
                  <Badge 
                    variant={
                      module.status === 'operational' ? 'default' : 'secondary'
                    }
                  >
                    {module.completion}%
                  </Badge>
                </div>
                <Progress value={module.completion} className="h-2" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="capitalize">{module.status}</span>
                  <span className="capitalize">{module.priority} priority</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Approvals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingApprovals.map((approval, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-sm">{approval.type}</div>
                  <div className="text-xs text-muted-foreground">
                    {approval.count} pending items
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={
                      approval.urgency === 'high' ? 'destructive' :
                      approval.urgency === 'medium' ? 'secondary' : 'outline'
                    }
                    className="text-xs"
                  >
                    {approval.urgency}
                  </Badge>
                  <Button size="sm" variant="outline">
                    Review
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Activities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                {activity.type === 'success' && <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />}
                {activity.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />}
                {activity.type === 'info' && <FileText className="h-4 w-4 text-blue-500 mt-0.5" />}
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.activity}</p>
                  <p className="text-xs text-muted-foreground">
                    {activity.user} • {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Featured Management Modules */}
      <Card>
        <CardHeader>
          <CardTitle>🚀 New Management Modules</CardTitle>
          <p className="text-sm text-muted-foreground">
            Access comprehensive management systems for all school operations
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Link to="/exam-management">
              <Button variant="outline" className="h-auto p-4 flex flex-col gap-2 w-full hover:bg-primary/5">
                <PenTool className="h-8 w-8 text-primary" />
                <span className="text-sm font-semibold">Exam Management</span>
                <span className="text-xs text-muted-foreground text-center">
                  Scheduling, Hall Tickets, Grading & Results
                </span>
              </Button>
            </Link>
            <Link to="/library-management">
              <Button variant="outline" className="h-auto p-4 flex flex-col gap-2 w-full hover:bg-primary/5">
                <BookOpen className="h-8 w-8 text-primary" />
                <span className="text-sm font-semibold">Library System</span>
                <span className="text-xs text-muted-foreground text-center">
                  Digital Catalog, Book Tracking & Analytics
                </span>
              </Button>
            </Link>
            <Link to="/admission-management">
              <Button variant="outline" className="h-auto p-4 flex flex-col gap-2 w-full hover:bg-primary/5">
                <Users className="h-8 w-8 text-primary" />
                <span className="text-sm font-semibold">Admissions</span>
                <span className="text-xs text-muted-foreground text-center">
                  Applications, Verification & Merit Lists
                </span>
              </Button>
            </Link>
            <Link to="/alumni-management">
              <Button variant="outline" className="h-auto p-4 flex flex-col gap-2 w-full hover:bg-primary/5">
                <GraduationCap className="h-8 w-8 text-primary" />
                <span className="text-sm font-semibold">Alumni Network</span>
                <span className="text-xs text-muted-foreground text-center">
                  Directory, Events & Mentorship
                </span>
              </Button>
            </Link>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-4">
            <Link to="/medical-management">
              <Button variant="outline" className="h-auto p-4 flex flex-col gap-2 w-full hover:bg-secondary/5">
                <Stethoscope className="h-8 w-8 text-secondary" />
                <span className="text-sm font-semibold">Medical Center</span>
                <span className="text-xs text-muted-foreground text-center">
                  Health Records & Infirmary Management
                </span>
              </Button>
            </Link>
            <Link to="/certificate-generation">
              <Button variant="outline" className="h-auto p-4 flex flex-col gap-2 w-full hover:bg-secondary/5">
                <FileCheck className="h-8 w-8 text-secondary" />
                <span className="text-sm font-semibold">Certificates</span>
                <span className="text-xs text-muted-foreground text-center">
                  Digital Certificates & Transcripts
                </span>
              </Button>
            </Link>
            <Link to="/sports-management">
              <Button variant="outline" className="h-auto p-4 flex flex-col gap-2 w-full hover:bg-accent/5">
                <Trophy className="h-8 w-8 text-accent" />
                <span className="text-sm font-semibold">Sports & Events</span>
                <span className="text-xs text-muted-foreground text-center">
                  Teams, Competitions & Records
                </span>
              </Button>
            </Link>
            <Link to="/disciplinary-management">
              <Button variant="outline" className="h-auto p-4 flex flex-col gap-2 w-full hover:bg-accent/5">
                <Shield className="h-8 w-8 text-accent" />
                <span className="text-sm font-semibold">Discipline</span>
                <span className="text-xs text-muted-foreground text-center">
                  Incident Tracking & Behavioral Analysis
                </span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>System Administration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <Users className="h-6 w-6" />
              <span className="text-xs">User Management</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <BarChart3 className="h-6 w-6" />
              <span className="text-xs">System Reports</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <FileText className="h-6 w-6" />
              <span className="text-xs">Audit Logs</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <AlertTriangle className="h-6 w-6" />
              <span className="text-xs">System Health</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <DollarSign className="h-6 w-6" />
              <span className="text-xs">Financial Overview</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <GraduationCap className="h-6 w-6" />
              <span className="text-xs">Academic Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}