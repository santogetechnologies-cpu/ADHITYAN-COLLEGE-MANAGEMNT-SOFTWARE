import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Navigation } from '@/components/Navigation';
import { StudentDashboard } from '@/components/dashboards/StudentDashboard';
import { ParentDashboard } from '@/components/dashboards/ParentDashboard';
import { TeacherDashboard } from '@/components/dashboards/TeacherDashboard';
import { AdminDashboard } from '@/components/dashboards/AdminDashboard';
import PrincipalDashboard from '@/components/dashboards/PrincipalDashboard';
import FinanceDashboard from '@/components/dashboards/FinanceDashboard';
import AccountsOfficerDashboard from '@/components/roles/AccountsOfficerDashboard';
import StoreKeeperDashboard from '@/components/roles/StoreKeeperDashboard';
import TransportDashboard from '@/components/dashboards/TransportDashboard';
import ReceptionistDashboard from '@/components/dashboards/ReceptionistDashboard';
import StoreManagerDashboard from '@/components/dashboards/StoreManagerDashboard';
import FinanceManagerDashboard from '@/components/dashboards/FinanceManagerDashboard';
import TransportDriverDashboard from '@/components/dashboards/TransportDriverDashboard';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  const renderDashboard = () => {
    switch (user.role) {
      case 'student':
        return <StudentDashboard />;
      case 'parent':
        return <ParentDashboard />;
      case 'teacher':
        return <TeacherDashboard />;
      case 'admin':
        return <AdminDashboard />;
      case 'principal':
        return <PrincipalDashboard />;
      case 'financier':
        return <FinanceDashboard />;
      case 'accountant':
        return <AccountsOfficerDashboard />;
      case 'storekeeper':
        return <StoreKeeperDashboard />;
      case 'driver':
        return <TransportDashboard />;
      case 'receptionist':
        return <ReceptionistDashboard />;
      case 'store_manager':
        return <StoreManagerDashboard />;
      case 'finance_manager':
        return <FinanceManagerDashboard />;
      case 'transport_driver':
        return <TransportDriverDashboard />;
      default:
        return <div>Invalid role</div>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-6">
        {renderDashboard()}
      </main>
    </div>
  );
};

export default Dashboard;