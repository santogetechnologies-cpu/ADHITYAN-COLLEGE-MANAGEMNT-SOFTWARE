import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { db } from '@/services/supabase/database';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
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
  PenTool,
  Heart,
  RefreshCw,
  Settings
} from 'lucide-react';

export default function AdminOverview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [systemStats, setSystemStats] = useState([
    { title: 'Total Registered Users', value: '0', icon: Users, trend: 'All portal logins', positive: true },
    { title: 'Active Students', value: '0', icon: GraduationCap, trend: 'Enrolled & active', positive: true },
    { title: 'Parent Accounts', value: '0', icon: Heart, trend: 'Verified guardians', positive: true },
    { title: 'Faculty & Teachers', value: '0', icon: BookOpen, trend: 'Academic staff', positive: true },
    { title: 'Staff & Admin', value: '0', icon: Shield, trend: 'Operational staff', positive: true },
    { title: 'Monthly Revenue', value: '₹0', icon: DollarSign, trend: 'Live collections', positive: true }
  ]);

  const [moduleStatus, setModuleStatus] = useState([
    { module: 'NAAC Accreditation', completion: 0, status: 'operational', priority: 'high' },
    { module: 'Financial Management', completion: 0, status: 'operational', priority: 'low' },
    { module: 'Transport System', completion: 0, status: 'operational', priority: 'medium' },
    { module: 'Store Management', completion: 0, status: 'operational', priority: 'medium' }
  ]);

  const [recentActivities, setRecentActivities] = useState<Array<{
    activity: string;
    user: string;
    time: string;
    type: 'success' | 'warning' | 'info';
  }>>([]);

  const [pendingApprovals, setPendingApprovals] = useState<Array<{
    type: string;
    count: number;
    urgency: 'high' | 'medium' | 'low';
    route: string;
  }>>([
    { type: 'Student Admission', count: 0, urgency: 'medium', route: '/admission-management' },
    { type: 'Fee Waiver / Overdue', count: 0, urgency: 'medium', route: '/admin/finance' },
    { type: 'Student Concerns', count: 0, urgency: 'low', route: '/disciplinary-management' },
    { type: 'Inventory Procurement', count: 0, urgency: 'medium', route: '/admin/store' }
  ]);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [
        profiles,
        transactions,
        fees,
        vehicles,
        naac,
        admissions,
        concerns,
        inventoryTx,
        inventoryItems
      ] = await Promise.all([
        db.getAllProfiles(),
        db.getFinanceTransactions(),
        db.getStudentFees(),
        db.getTransportVehicles(),
        db.getNAACCriterionProgress(),
        db.getAdmissionApplications(),
        db.getConcerns(),
        db.getInventoryTransactions(),
        db.getInventoryItems()
      ]);

      // 1. Stats calculation from live Supabase records
      const totalUsers = profiles.length;
      const activeStudents = profiles.filter(p => p.role === 'student' && (p.status === 'active' || !p.status)).length;
      const parentAccounts = profiles.filter(p => p.role === 'parent').length;
      const teachers = profiles.filter(p => p.role === 'teacher').length;
      const staff = profiles.filter(p => p.role !== 'student' && p.role !== 'parent').length;
      
      const collectedFees = fees.reduce((sum, f) => sum + Number(f.paid_amount || 0), 0);
      const txIncome = transactions
        .filter(t => t.type === 'Fee Payment' || t.type === 'Income' || (t.amount > 0 && t.status === 'Approved'))
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const totalRev = Math.max(collectedFees, txIncome, 0);

      const activeVehicles = vehicles.filter(v => v.status === 'active' || v.status === 'on-route');

      setSystemStats([
        { 
          title: 'Total Registered Users', 
          value: totalUsers.toLocaleString(), 
          icon: Users, 
          trend: `${totalUsers} Auth Accounts`, 
          positive: true 
        },
        { 
          title: 'Active Students', 
          value: activeStudents.toLocaleString(), 
          icon: GraduationCap, 
          trend: `${activeStudents} Active Learners`, 
          positive: true 
        },
        { 
          title: 'Parent Accounts', 
          value: parentAccounts.toLocaleString(), 
          icon: Heart, 
          trend: `${parentAccounts} Linked Portals`, 
          positive: true 
        },
        { 
          title: 'Faculty & Teachers', 
          value: teachers.toLocaleString(), 
          icon: BookOpen, 
          trend: `${teachers} Academic Staff`, 
          positive: true 
        },
        { 
          title: 'Staff & Admin', 
          value: staff.toLocaleString(), 
          icon: Shield, 
          trend: `${staff} Operations`, 
          positive: true 
        },
        { 
          title: 'Monthly Revenue', 
          value: totalRev >= 100000 ? `₹${(totalRev / 100000).toFixed(1)}L` : `₹${totalRev.toLocaleString()}`, 
          icon: DollarSign, 
          trend: 'Live collection', 
          positive: true 
        }
      ]);

      // 2. Module status
      let naacPct = 0;
      if (naac.length > 0) {
        const total = naac.reduce((sum, n) => sum + (n.completion_percentage || 0), 0);
        naacPct = Math.round(total / naac.length);
      }

      let finPct = 0;
      if (fees.length > 0) {
        const paidCount = fees.filter(f => f.status === 'paid').length;
        finPct = Math.round((paidCount / fees.length) * 100);
      }

      const transportPct = vehicles.length > 0 ? Math.round((activeVehicles.length / vehicles.length) * 100) : 0;
      const storePct = inventoryItems.length > 0 ? Math.round((inventoryItems.filter(i => (i.current_stock || 0) > 0).length / inventoryItems.length) * 100) : 0;

      setModuleStatus([
        { module: 'NAAC Accreditation', completion: naacPct, status: naacPct >= 80 ? 'operational' : 'in-progress', priority: 'high' },
        { module: 'Financial Management', completion: finPct, status: 'operational', priority: 'low' },
        { module: 'Transport System', completion: transportPct, status: 'operational', priority: 'medium' },
        { module: 'Store Management', completion: storePct, status: storePct >= 80 ? 'operational' : 'in-progress', priority: 'medium' }
      ]);

      // 3. Pending approvals
      const pendingAdmissions = admissions.filter(a => a.status === 'Submitted' || a.status === 'Under Review');
      const overdueFees = fees.filter(f => f.status === 'overdue');
      const pendingConcerns = concerns.filter(c => c.status === 'Pending' || c.status === 'In Progress');
      const pendingProcurement = inventoryTx.filter(t => t.status === 'pending');

      setPendingApprovals([
        { 
          type: 'Student Admission', 
          count: pendingAdmissions.length, 
          urgency: pendingAdmissions.length > 5 ? 'high' : 'medium',
          route: '/admission-management' 
        },
        { 
          type: 'Fee Reminders / Overdue', 
          count: overdueFees.length, 
          urgency: overdueFees.length > 0 ? 'high' : 'low',
          route: '/admin/finance' 
        },
        { 
          type: 'Student Concerns', 
          count: pendingConcerns.length, 
          urgency: pendingConcerns.length > 3 ? 'high' : 'medium',
          route: '/disciplinary-management' 
        },
        { 
          type: 'Procurement Orders', 
          count: pendingProcurement.length, 
          urgency: pendingProcurement.length > 0 ? 'medium' : 'low',
          route: '/admin/store' 
        }
      ]);

      // 4. Recent activities
      const acts: Array<{ activity: string; user: string; time: string; type: 'success' | 'warning' | 'info' }> = [];
      if (transactions.length > 0) {
        acts.push({
          activity: `Financial transaction registered: ${transactions[0].description}`,
          user: transactions[0].department || 'Finance Team',
          time: transactions[0].date || 'Recent',
          type: 'info'
        });
      }
      if (pendingAdmissions.length > 0) {
        acts.push({
          activity: `New admission submitted for ${pendingAdmissions[0].applicant_name}`,
          user: pendingAdmissions[0].class_name || 'Admissions',
          time: 'Active',
          type: 'success'
        });
      }
      if (vehicles.length > 0) {
        acts.push({
          activity: `Bus route tracking operational for ${vehicles[0].vehicle_number}`,
          user: vehicles[0].driver_name || 'Transport Team',
          time: 'Active',
          type: 'info'
        });
      }
      if (overdueFees.length > 0) {
        acts.push({
          activity: `Fee balance notification pending for ${overdueFees[0].student_name}`,
          user: 'Accounts Department',
          time: overdueFees[0].due_date || 'Due',
          type: 'warning'
        });
      }

      setRecentActivities(acts);
    } catch (err: any) {
      console.warn('loadAdminOverview error:', err);
      setError(err?.message || 'Failed to connect to Supabase database.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time subscriptions - automatically refresh counts when rows are added, updated, or removed
  useRealtimeSubscription('profiles', loadData);
  useRealtimeSubscription('student_fees', loadData);
  useRealtimeSubscription('finance_transactions', loadData);
  useRealtimeSubscription('transport_vehicles', loadData);
  useRealtimeSubscription('admission_applications', loadData);
  useRealtimeSubscription('inventory_transactions', loadData);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Overview</h1>
          <p className="text-muted-foreground">
            Live institutional telemetry and real-time database metrics
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setLoading(true); loadData(); }}>
          <RefreshCw className={`w-3.5 h-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Metrics
        </Button>
      </div>

      {/* Error state if connection fails */}
      {error && (
        <div className="p-4 border border-destructive/20 bg-destructive/10 rounded-lg flex items-center justify-between text-destructive text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Telemetry Connection Notice: {error}</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => { setLoading(true); loadData(); }}>
            Retry Connection
          </Button>
        </div>
      )}

      {/* System Statistics with Skeleton Loading */}
      {loading ? (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-7 w-16 mb-2" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {systemStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-medium line-clamp-1">
                    {stat.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className={`text-xs flex items-center gap-1 ${
                    stat.positive ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <TrendingUp className="h-3 w-3 shrink-0" />
                    <span className="truncate">{stat.trend}</span>
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

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
                  <Button size="sm" variant="outline" asChild>
                    <Link to={approval.route}>
                      Review
                    </Link>
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
            {recentActivities.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="font-medium text-foreground/80">No recent activity recorded</p>
                <p className="text-xs text-muted-foreground mt-0.5">Real-time transactions, admissions, and logs will appear here automatically.</p>
              </div>
            ) : (
              recentActivities.map((activity, index) => (
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
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Featured Management Modules */}
      <Card>
        <CardHeader>
          <CardTitle>🚀 Institutional Management Modules</CardTitle>
          <p className="text-sm text-muted-foreground">
            Access comprehensive management systems for all college operations
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
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2" asChild>
              <Link to="/admin/users">
                <Users className="h-6 w-6" />
                <span className="text-xs">User Management</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2" asChild>
              <Link to="/admin/reports">
                <BarChart3 className="h-6 w-6" />
                <span className="text-xs">System Reports</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2" asChild>
              <Link to="/admin/analytics">
                <FileText className="h-6 w-6" />
                <span className="text-xs">Audit Logs</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2" asChild>
              <Link to="/admin/settings">
                <Settings className="h-6 w-6" />
                <span className="text-xs">System Settings</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2" asChild>
              <Link to="/admin/finance">
                <DollarSign className="h-6 w-6" />
                <span className="text-xs">Financial Overview</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2" asChild>
              <Link to="/admin/departments">
                <GraduationCap className="h-6 w-6" />
                <span className="text-xs">Academic Departments</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
