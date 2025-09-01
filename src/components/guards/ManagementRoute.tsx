import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ManagementRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<'admin' | 'principal' | 'financier' | 'accountant' | 'storekeeper' | 'driver' | 'naac_coordinator' | 'receptionist' | 'store_manager' | 'finance_manager' | 'transport_driver'>;
  requireAdmin?: boolean;
}

export function ManagementRoute({ 
  children, 
  allowedRoles = ['admin'], 
  requireAdmin = false 
}: ManagementRouteProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const managementRoles = ['admin', 'principal', 'financier', 'accountant', 'storekeeper', 'driver', 'naac_coordinator', 'receptionist', 'store_manager', 'finance_manager', 'transport_driver'];

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    
    // If requireAdmin is true, only allow admin role
    if (requireAdmin && user.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    
    // Check if user role is in allowed roles
    if (!allowedRoles.includes(user.role as any)) {
      navigate('/dashboard');
      return;
    }
  }, [user, navigate, allowedRoles, requireAdmin]);

  if (!user) {
    return null; // Will redirect
  }

  if (requireAdmin && user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle className="text-xl">Admin Access Required</CardTitle>
            <CardDescription>
              You need administrator privileges to access this section.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!allowedRoles.includes(user.role as any)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle className="text-xl">Access Restricted</CardTitle>
            <CardDescription>
              You don't have permission to access this management section.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}