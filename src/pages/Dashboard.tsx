import { useEffect, lazy, Suspense } from 'react';
import { PageLoader } from '@/components/PageLoader';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, LogOut, ArrowLeft } from 'lucide-react';
import { ROLE_CONFIGS } from '@/config/roles';

const StudentDashboard = lazy(() => import('@/components/dashboards/StudentDashboard').then(m => ({ default: m.StudentDashboard })));
const ParentDashboard = lazy(() => import('@/components/dashboards/ParentDashboard').then(m => ({ default: m.ParentDashboard })));
const TeacherDashboard = lazy(() => import('@/components/dashboards/TeacherDashboard').then(m => ({ default: m.TeacherDashboard })));
const AdminDashboard = lazy(() => import('@/components/dashboards/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const PrincipalDashboard = lazy(() => import('@/components/dashboards/PrincipalDashboard'));
const ReceptionistDashboard = lazy(() => import('@/components/dashboards/ReceptionistDashboard'));
const StoreManagerDashboard = lazy(() => import('@/components/dashboards/StoreManagerDashboard'));
const FinanceManagerDashboard = lazy(() => import('@/components/dashboards/FinanceManagerDashboard'));
const TransportDriverDashboard = lazy(() => import('@/components/dashboards/TransportDriverDashboard'));
const HRManagerDashboard = lazy(() => import('@/components/dashboards/HRManagerDashboard'));
const LibrarianDashboard = lazy(() => import('@/components/dashboards/LibrarianDashboard'));
const HostelWardenDashboard = lazy(() => import('@/components/dashboards/HostelWardenDashboard'));
const PlacementOfficerDashboard = lazy(() => import('@/components/dashboards/PlacementOfficerDashboard'));
const DynamicRoleDashboard = lazy(() => import('@/components/dashboards/DynamicRoleDashboard').then(m => ({ default: m.DynamicRoleDashboard })));

function RoleErrorDashboard({ role, onLogout }: { role: string; onLogout: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-md border-amber-300">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto mb-2">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <CardTitle className="text-xl font-bold">Unrecognized Institutional Role</CardTitle>
          <CardDescription>
            The role <span className="font-mono font-semibold text-foreground">"{role}"</span> does not have an assigned portal dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground text-center">
            Please contact the College Administration to update your role privileges or log in with authorized credentials.
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={() => navigate('/')} variant="outline" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" /> Return to Login
            </Button>
            <Button onClick={onLogout} variant="destructive" className="w-full">
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const DashboardInner = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { role: routeRole } = useParams<{ role?: string }>();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (!user) {
      navigate('/', { replace: true });
      return;
    }

    if (user.role === 'naac_coordinator') {
      navigate('/admin/naac', { replace: true });
      return;
    }

    // Admin portal default is /admin. Admin landing on /dashboard or /dashboard/:role without explicit preview is routed to /admin
    if (user.role === 'admin') {
      const isPreview = searchParams.get('preview') === 'true';
      if (!isPreview || !routeRole || routeRole === 'admin') {
        navigate('/admin', { replace: true });
        return;
      }
    }

    // Non-admin roles are restricted to their own assigned portal dashboard
    if (user.role !== 'admin') {
      const allowedHome = ROLE_CONFIGS[user.role]?.home || `/dashboard/${user.role}`;
      if (!routeRole || routeRole !== user.role) {
        const target = location.search ? `${allowedHome}${location.search}` : allowedHome;
        navigate(target, { replace: true });
        return;
      }
    }
  }, [user, navigate, routeRole, searchParams, location.search]);

  if (!user) {
    return null;
  }

  // Active role resolution: strictly user.role unless verified admin in explicit preview mode
  const isPreviewMode = user.role === 'admin' && searchParams.get('preview') === 'true' && !!routeRole;
  const activeRole = isPreviewMode ? (routeRole as string) : user.role;

  const renderDashboard = () => {
    let dashboardContent = null;
    switch (activeRole) {
      case 'student':
        dashboardContent = <StudentDashboard />;
        break;
      case 'parent':
        dashboardContent = <ParentDashboard />;
        break;
      case 'teacher':
      case 'hod':
        dashboardContent = <TeacherDashboard />;
        break;
      case 'admin':
        dashboardContent = <AdminDashboard />;
        break;
      case 'principal':
        dashboardContent = <PrincipalDashboard />;
        break;
      case 'finance_manager':
      case 'financier':
      case 'accountant':
        dashboardContent = <FinanceManagerDashboard />;
        break;
      case 'store_manager':
      case 'storekeeper':
        dashboardContent = <StoreManagerDashboard />;
        break;
      case 'transport_driver':
      case 'driver':
        dashboardContent = <TransportDriverDashboard />;
        break;
      case 'receptionist':
        dashboardContent = <ReceptionistDashboard />;
        break;
      case 'hr_manager':
      case 'hr':
        dashboardContent = <HRManagerDashboard />;
        break;
      case 'librarian':
        dashboardContent = <LibrarianDashboard />;
        break;
      case 'hostel_warden':
      case 'warden':
        dashboardContent = <HostelWardenDashboard />;
        break;
      case 'placement_officer':
        dashboardContent = <PlacementOfficerDashboard />;
        break;
      default:
        return <RoleErrorDashboard role={activeRole} onLogout={logout} />;
    }

    return (
      <DynamicRoleDashboard
        role={activeRole}
        defaultDashboardComponent={dashboardContent}
      />
    );
  };

  // Student portal has its own integrated mobile & desktop shell
  if (activeRole === 'student') {
    return (
      <>
        {isPreviewMode && (
          <div className="bg-amber-500 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between sticky top-0 z-50">
            <span>Institutional Administrator Preview Mode: Student Portal ({user.email})</span>
            <Button size="sm" variant="outline" className="h-6 text-xs bg-white text-black hover:bg-slate-100" onClick={() => navigate('/admin')}>
              Return to Admin
            </Button>
          </div>
        )}
        <StudentDashboard />
      </>
    );
  }

  // Principal portal has its own dedicated executive sidebar & mobile responsive shell
  if (activeRole === 'principal') {
    return (
      <>
        {isPreviewMode && (
          <div className="bg-amber-500 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between sticky top-0 z-50">
            <span>Institutional Administrator Preview Mode: Principal Portal ({user.email})</span>
            <Button size="sm" variant="outline" className="h-6 text-xs bg-white text-black hover:bg-slate-100" onClick={() => navigate('/admin')}>
              Return to Admin
            </Button>
          </div>
        )}
        <PrincipalDashboard />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && (
        <div className="bg-amber-500 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between sticky top-0 z-50">
          <span>Institutional Administrator Preview Mode: {activeRole.toUpperCase()} Portal ({user.email})</span>
          <Button size="sm" variant="outline" className="h-6 text-xs bg-white text-black hover:bg-slate-100" onClick={() => navigate('/admin')}>
            Return to Admin
          </Button>
        </div>
      )}
      <Navigation />
      <main className="container mx-auto px-4 py-6">
        {renderDashboard()}
      </main>
    </div>
  );
};

const Dashboard = () => (
  <Suspense fallback={<PageLoader label="Opening your dashboard…" />}>
    <DashboardInner />
  </Suspense>
);

export default Dashboard;
