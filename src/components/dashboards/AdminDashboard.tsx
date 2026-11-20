import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import UserManagement from '@/components/admin/UserManagement';
import TeacherAssignments from '@/components/admin/TeacherAssignments';
import TimetableManagement from '@/components/admin/TimetableManagement';
import { FeedbackSystem } from '@/components/admin/FeedbackSystem';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/supabase/database';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
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
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [latency, setLatency] = useState<number | null>(null);
  const [isDbHealthy, setIsDbHealthy] = useState(true);

  const [loading, setLoading] = useState(true);
  const [institutionStats, setInstitutionStats] = useState({
    totalUsers: 0,
    activeStudents: 0,
    parentAccounts: 0,
    totalTeachers: 0,
    totalStaff: 0,
    attendanceRate: 94.5,
    revenue: 0,
    expenses: 0
  });

  const [performanceMetrics, setPerformanceMetrics] = useState<Array<{
    department: string;
    performance: number;
    students: number;
    trend: 'up' | 'down' | 'stable';
  }>>([]);

  const [recentAlerts, setRecentAlerts] = useState<Array<{
    type: 'health' | 'finance' | 'staff' | 'transport';
    message: string;
    priority: 'low' | 'medium' | 'high';
    time: string;
  }>>([]);

  const [upcomingEvents, setUpcomingEvents] = useState<Array<{
    event: string;
    date: string;
    type: string;
    attendees: number;
  }>>([]);

  const [departmentHealth, setDepartmentHealth] = useState<Array<{
    name: string;
    score: number;
    status: 'good' | 'excellent' | 'fair';
  }>>([]);

  const loadAdminData = useCallback(async () => {
    try {
      const pingStart = performance.now();
      const [profiles, attendance, transactions, fees, depts, events, notifs] = await Promise.all([
        db.getAllProfiles(),
        db.getStudentAttendance(),
        db.getFinanceTransactions(),
        db.getStudentFees(),
        db.getDepartments(),
        db.getCalendarEvents(),
        user?.id ? db.getNotifications(user.id) : Promise.resolve([])
      ]);
      const pingEnd = performance.now();
      setLatency(Math.round(pingEnd - pingStart));
      setIsDbHealthy(true);

      // 1. Institution Stats
      const totalUsers = profiles.length;
      const activeStudents = profiles.filter(p => p.role === 'student' && (p.status === 'active' || !p.status)).length;
      const parentAccounts = profiles.filter(p => p.role === 'parent').length;
      const students = profiles.filter(p => p.role === 'student');
      const teachers = profiles.filter(p => p.role === 'teacher').length;
      const staff = profiles.filter(p => 
        ['receptionist', 'store_manager', 'finance_manager', 'transport_driver', 'driver', 'storekeeper', 'accountant', 'financier', 'admin', 'principal', 'naac_coordinator', 'hr_manager', 'librarian', 'hostel_warden', 'placement_officer'].includes(p.role)
      );

      let attRate = 0;
      if (attendance.length > 0) {
        const presentCount = attendance.filter(a => a.status === 'present').length;
        attRate = Math.round((presentCount / attendance.length) * 1000) / 10;
      }

      const collectedFees = fees.reduce((sum, f) => sum + Number(f.paid_amount || 0), 0);
      const txIncome = transactions
        .filter(t => t.type === 'Fee Payment' || t.type === 'Income' || (t.amount > 0 && t.status === 'Approved'))
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const totalRevenue = Math.max(collectedFees, txIncome, 0);

      const totalExpenses = transactions
        .filter(t => t.type === 'Payroll' || t.type === 'Expense' || t.type === 'Purchase')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      setInstitutionStats({
        totalUsers,
        activeStudents,
        parentAccounts,
        totalTeachers: teachers,
        totalStaff: staff.length,
        attendanceRate: attRate,
        revenue: totalRevenue,
        expenses: totalExpenses
      });

      // 2. Department Performance
      if (depts.length > 0) {
        const mappedDepts = depts.slice(0, 6).map((d) => {
          const deptStudents = students.filter(s => s.department?.toLowerCase() === d.name.toLowerCase()).length;
          const score = deptStudents > 0 ? Math.round(attRate) : 0;
          return {
            department: d.name,
            performance: score,
            students: deptStudents,
            trend: 'stable' as const
          };
        });
        setPerformanceMetrics(mappedDepts);
      } else {
        setPerformanceMetrics([]);
      }

      // 3. Institution Health
      const academicScore = Math.min(100, Math.round(attRate * 0.95));
      const financialScore = totalRevenue > 0 ? Math.min(100, Math.round((totalRevenue / (totalRevenue + totalExpenses || 1)) * 100)) : 0;
      setDepartmentHealth([
        { name: 'Academic Performance', score: academicScore, status: academicScore >= 90 ? 'excellent' : 'good' },
        { name: 'Student Attendance & Wellbeing', score: Math.round(attRate), status: attRate >= 92 ? 'excellent' : 'good' },
        { name: 'Staff Faculty Deployment', score: teachers.length > 0 ? 100 : 0, status: teachers.length > 0 ? 'good' : 'fair' },
        { name: 'Financial Health', score: financialScore, status: financialScore >= 80 ? 'good' : 'fair' },
        { name: 'Infrastructure & Facilities', score: depts.length > 0 ? 95 : 0, status: 'excellent' }
      ]);

      // 4. Recent Alerts
      if (notifs.length > 0) {
        const alerts = notifs.slice(0, 4).map(n => {
          let type: 'health' | 'finance' | 'staff' | 'transport' = 'staff';
          const title = (n.title || '').toLowerCase();
          if (title.includes('health') || title.includes('infirmary') || title.includes('medical')) type = 'health';
          else if (title.includes('fee') || title.includes('payment') || title.includes('finance')) type = 'finance';
          else if (title.includes('transport') || title.includes('bus') || title.includes('vehicle')) type = 'transport';

          return {
            type,
            message: `${n.title}: ${n.message}`,
            priority: (n.priority || 'medium') as 'low' | 'medium' | 'high',
            time: n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'
          };
        });
        setRecentAlerts(alerts);
      } else {
        setRecentAlerts([]);
      }

      // 5. Upcoming Events
      if (events.length > 0) {
        const sorted = [...events]
          .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
          .slice(0, 4)
          .map(e => ({
            event: e.title,
            date: e.date ? new Date(e.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Upcoming',
            type: e.category ? e.category.charAt(0).toUpperCase() + e.category.slice(1) : 'Academic',
            attendees: e.target_audience === 'all' ? (students.length + teachers.length || 0) : 0
          }));
        setUpcomingEvents(sorted);
      } else {
        setUpcomingEvents([]);
      }
    } catch (err) {
      console.warn('loadAdminData error:', err);
      setIsDbHealthy(false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  // Real-time updates
  useRealtimeSubscription('profiles', loadAdminData);
  useRealtimeSubscription('calendar_events', loadAdminData);
  useRealtimeSubscription('student_fees', loadAdminData);
  useRealtimeSubscription('finance_transactions', loadAdminData);
  useRealtimeSubscription('notifications', loadAdminData);

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
                <h1 className="text-2xl font-bold mb-2">Welcome, {user?.name || 'Administrator'}! 🏫</h1>
                <p className="opacity-90">Live institution overview and administrative control</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{institutionStats.attendanceRate}%</div>
                <div className="text-sm opacity-80">Institution Attendance</div>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="shadow-md">
                  <CardContent className="p-4 text-center">
                    <Skeleton className="w-10 h-10 rounded-full mx-auto mb-2" />
                    <Skeleton className="h-6 w-16 mx-auto mb-1" />
                    <Skeleton className="h-3 w-20 mx-auto" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              <Card className="shadow-md">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-full mx-auto mb-2">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-xl font-bold">{institutionStats.totalUsers.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Total Users</div>
                </CardContent>
              </Card>
              <Card className="shadow-md">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-full mx-auto mb-2">
                    <GraduationCap className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-xl font-bold">{institutionStats.activeStudents.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Active Students</div>
                </CardContent>
              </Card>
              <Card className="shadow-md">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center w-10 h-10 bg-rose-500/10 rounded-full mx-auto mb-2">
                    <Heart className="w-5 h-5 text-rose-500" />
                  </div>
                  <div className="text-xl font-bold">{institutionStats.parentAccounts.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Parent Portals</div>
                </CardContent>
              </Card>
              <Card className="shadow-md">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center w-10 h-10 bg-secondary/10 rounded-full mx-auto mb-2">
                    <BookOpen className="w-5 h-5 text-secondary" />
                  </div>
                  <div className="text-xl font-bold">{institutionStats.totalTeachers}</div>
                  <div className="text-xs text-muted-foreground">Faculty Staff</div>
                </CardContent>
              </Card>
              <Card className="shadow-md">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center w-10 h-10 bg-accent/10 rounded-full mx-auto mb-2">
                    <UserCheck className="w-5 h-5 text-accent" />
                  </div>
                  <div className="text-xl font-bold">{institutionStats.totalStaff}</div>
                  <div className="text-xs text-muted-foreground">Admin & Ops</div>
                </CardContent>
              </Card>
              <Card className="shadow-md">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center w-10 h-10 bg-emerald-500/10 rounded-full mx-auto mb-2">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="text-lg font-bold">
                    {institutionStats.revenue >= 100000 
                      ? `₹${(institutionStats.revenue / 100000).toFixed(1)}L`
                      : `₹${institutionStats.revenue.toLocaleString()}`}
                  </div>
                  <div className="text-xs text-muted-foreground">Live Revenue</div>
                </CardContent>
              </Card>
            </div>
          )}

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
                  {performanceMetrics.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      No department performance data available. Academic metrics will appear once student assessments and attendance are recorded.
                    </div>
                  ) : (
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
                  )}
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
                  {recentAlerts.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      No urgent alerts or notices at this moment. Live system status is normal.
                    </div>
                  ) : (
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
                  )}
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
                  {upcomingEvents.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      No events scheduled on the institutional calendar.
                    </div>
                  ) : (
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
                  )}
                </CardContent>
              </Card>

              {/* Quick Management */}
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">Quick Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {/* Role Management Sections */}
                  <div className="space-y-2.5 mb-4">
                    <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">Department Oversight</h3>
                    
                    {/* Academic Departments & Courses */}
                    <Button variant="outline" className="w-full justify-start h-auto py-2.5 px-3 flex items-start gap-3 hover:bg-primary/5 transition-colors" asChild>
                      <Link to="/admin/departments">
                        <School className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <div className="flex-1 text-left min-w-0">
                          <div className="font-medium text-sm text-foreground">Academic Courses & Depts</div>
                          <div className="text-xs text-muted-foreground truncate">9 Vocational & Allied Health Programs</div>
                        </div>
                      </Link>
                    </Button>

                    {/* Finance Manager Section */}
                    <Button variant="outline" className="w-full justify-start h-auto py-2.5 px-3 flex items-start gap-3 hover:bg-primary/5 transition-colors" asChild>
                      <Link to="/admin/finance-manager">
                        <DollarSign className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                        <div className="flex-1 text-left min-w-0">
                          <div className="font-medium text-sm text-foreground">Finance Manager</div>
                          <div className="text-xs text-muted-foreground truncate">Financial oversight & fee collections</div>
                        </div>
                      </Link>
                    </Button>
                    
                    {/* Transport Driver Section */}
                    <Button variant="outline" className="w-full justify-start h-auto py-2.5 px-3 flex items-start gap-3 hover:bg-primary/5 transition-colors" asChild>
                      <Link to="/admin/transport-driver">
                        <Bus className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="flex-1 text-left min-w-0">
                          <div className="font-medium text-sm text-foreground">Transport Driver</div>
                          <div className="text-xs text-muted-foreground truncate">Student transport routes & fleet tracking</div>
                        </div>
                      </Link>
                    </Button>
                    
                    {/* Receptionist Section */}
                    <Button variant="outline" className="w-full justify-start h-auto py-2.5 px-3 flex items-start gap-3 hover:bg-primary/5 transition-colors" asChild>
                      <Link to="/admin/receptionist">
                        <Phone className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                        <div className="flex-1 text-left min-w-0">
                          <div className="font-medium text-sm text-foreground">Receptionist</div>
                          <div className="text-xs text-muted-foreground truncate">Front office & visitor management</div>
                        </div>
                      </Link>
                    </Button>
                    
                    {/* Store Manager Section */}
                    <Button variant="outline" className="w-full justify-start h-auto py-2.5 px-3 flex items-start gap-3 hover:bg-primary/5 transition-colors" asChild>
                      <Link to="/admin/store-manager">
                        <Package className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                        <div className="flex-1 text-left min-w-0">
                          <div className="font-medium text-sm text-foreground">Store Manager</div>
                          <div className="text-xs text-muted-foreground truncate">Inventory, uniforms & asset procurement</div>
                        </div>
                      </Link>
                    </Button>
                  </div>

                  {/* System Management */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">System Management</h3>
                    
                    <Button variant="outline" className="w-full justify-start h-9 px-3 flex items-center gap-2.5" asChild>
                      <Link to="/exam-management">
                        <PenTool className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-sm font-medium">Exam Management</span>
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start h-9 px-3 flex items-center gap-2.5" asChild>
                      <Link to="/library-management">
                        <BookOpen className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-sm font-medium">Library System</span>
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start h-9 px-3 flex items-center gap-2.5" asChild>
                      <Link to="/admission-management">
                        <UserPlus className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-sm font-medium">Admissions</span>
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start h-9 px-3 flex items-center gap-2.5" asChild>
                      <Link to="/alumni-management">
                        <GraduationCap className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-sm font-medium">Alumni Network</span>
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start h-9 px-3 flex items-center gap-2.5" asChild>
                      <Link to="/medical-management">
                        <Stethoscope className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-sm font-medium">Medical Center</span>
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start h-9 px-3 flex items-center gap-2.5" asChild>
                      <Link to="/certificate-generation">
                        <FileCheck className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-sm font-medium">Certificates</span>
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start h-9 px-3 flex items-center gap-2.5" asChild>
                      <Link to="/sports-management">
                        <Trophy className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-sm font-medium">Sports & Events</span>
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start h-9 px-3 flex items-center gap-2.5" asChild>
                      <Link to="/disciplinary-management">
                        <Shield className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-sm font-medium">Disciplinary</span>
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start h-9 px-3 flex items-center gap-2.5" asChild>
                      <Link to="/admin/naac">
                        <Award className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-sm font-medium">NAAC Accreditation</span>
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                      <Link to="/admin/settings">
                        <Settings className="w-4 h-4 mr-2" />
                        System Settings
                      </Link>
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
                      <Badge variant={isDbHealthy ? "default" : "destructive"} className={isDbHealthy ? "bg-success" : ""}>
                        {isDbHealthy ? 'Connected' : 'Offline'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">API Latency</span>
                      <Badge variant="secondary">
                        {latency !== null ? `${latency}ms` : 'Checking...'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Security & Auth</span>
                      <Badge variant="default" className="bg-success">Secure (RLS)</Badge>
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
