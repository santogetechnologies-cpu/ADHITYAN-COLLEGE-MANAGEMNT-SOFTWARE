import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/context/AuthContext';
import { ROLE_CONFIGS } from '@/config/roles';
import { RoleSelection } from '@/components/RoleSelection';
import { LoginForm } from '@/components/LoginForm';

const Index = () => {
  const [selectedRole, setSelectedRole] = useState<UserRole | undefined>(undefined);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        const homePath = ROLE_CONFIGS[user.role]?.home || `/dashboard/${user.role}`;
        navigate(homePath, { replace: true });
      }
    }
  }, [user, navigate]);

  const handleSelectRole = (role?: UserRole) => {
    setSelectedRole(role);
    setIsLoginOpen(true);
  };

  const handleBackToRoleSelection = () => {
    setIsLoginOpen(false);
    setSelectedRole(undefined);
  };

  if (isLoginOpen) {
    return <LoginForm role={selectedRole} onBack={handleBackToRoleSelection} />;
  }

  return <RoleSelection onSelectRole={handleSelectRole} />;
};

export default Index;
