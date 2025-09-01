import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  GraduationCap, 
  Users, 
  FileText, 
  TrendingUp, 
  Calendar, 
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';

export default function PrincipalDashboard() {
  const academicStats = [
    { title: 'Total Students', value: '1,247', icon: Users, trend: '+5.2%' },
    { title: 'Teaching Staff', value: '89', icon: GraduationCap, trend: '+2.1%' },
    { title: 'Pending Approvals', value: '12', icon: Clock, trend: '-15%' },
    { title: 'Academic Performance', value: '87.5%', icon: TrendingUp, trend: '+3.2%' }
  ];

  const pendingApprovals = [
    { type: 'Fee Waiver', student: 'Rahul Sharma - Class 10A', priority: 'high' },
    { type: 'Transfer Certificate', student: 'Priya Patel - Class 8B', priority: 'medium' },
    { type: 'Leave Application', staff: 'Mrs. Gupta - English Dept', priority: 'low' },
    { type: 'Infrastructure Request', department: 'Science Lab Equipment', priority: 'high' }
  ];

  const recentAlerts = [
    { message: 'Monthly Parent-Teacher Meeting scheduled for next week', type: 'info' },
    { message: 'Budget approval required for library renovation', type: 'warning' },
    { message: 'Annual sports day preparations completed', type: 'success' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Principal Dashboard</h1>
        <p className="text-muted-foreground">
          Academic oversight and institutional management
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {academicStats.map((stat) => {
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
                <p className="text-xs text-muted-foreground">
                  {stat.trend} from last month
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
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
                  <div className="font-medium">{approval.type}</div>
                  <div className="text-sm text-muted-foreground">
                    {approval.student || approval.staff || approval.department}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={
                      approval.priority === 'high' ? 'destructive' :
                      approval.priority === 'medium' ? 'secondary' : 'outline'
                    }
                  >
                    {approval.priority}
                  </Badge>
                  <Button size="sm" variant="outline">
                    Review
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Alerts & Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Recent Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentAlerts.map((alert, index) => (
              <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                {alert.type === 'success' && <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />}
                {alert.type === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />}
                {alert.type === 'info' && <Calendar className="h-5 w-5 text-blue-500 mt-0.5" />}
                <div className="flex-1">
                  <p className="text-sm">{alert.message}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <Users className="h-6 w-6" />
              <span className="text-xs">Staff Management</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <FileText className="h-6 w-6" />
              <span className="text-xs">Academic Reports</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <Calendar className="h-6 w-6" />
              <span className="text-xs">Schedule Events</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <TrendingUp className="h-6 w-6" />
              <span className="text-xs">Performance Analytics</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <GraduationCap className="h-6 w-6" />
              <span className="text-xs">Student Discipline</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <AlertTriangle className="h-6 w-6" />
              <span className="text-xs">Infrastructure</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}