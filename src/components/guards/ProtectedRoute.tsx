import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '@/context/AuthContext';
import { ROLE_CONFIGS } from '@/config/roles';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verifying institutional credentials...</p>
        </div>
      </div>
    );
  }

  // Not logged in: redirect to login, preserving intended location only for deep non-dashboard links
  if (!user) {
    const isGenericDashboard = location.pathname === '/dashboard' || location.pathname.startsWith('/dashboard/');
    const state = isGenericDashboard ? undefined : { from: location };
    return <Navigate to="/" state={state} replace />;
  }

  // Check role authorization: safely redirect unauthorized users to their own home dashboard
  // and replace the unauthorized URL in history so browser Back does not return to unauthorized pages
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    const userRoleConfig = ROLE_CONFIGS[user.role];
    const userHome = userRoleConfig?.home || `/dashboard/${user.role}`;
    return <Navigate to={userHome} replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;

