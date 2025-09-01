import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/context/AuthContext';
import { RoleSelection } from '@/components/RoleSelection';
import { LoginForm } from '@/components/LoginForm';

const Index = () => {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSelectRole = (role: UserRole) => {
    setSelectedRole(role);
  };

  const handleBackToRoleSelection = () => {
    setSelectedRole(null);
  };

  if (selectedRole) {
    return <LoginForm role={selectedRole} onBack={handleBackToRoleSelection} />;
  }

  return <RoleSelection onSelectRole={handleSelectRole} />;
};

export default Index;
