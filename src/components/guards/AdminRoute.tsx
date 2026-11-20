import React from 'react';
import { ProtectedRoute } from './ProtectedRoute';

export function AdminRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute allowedRoles={['admin', 'principal', 'naac_coordinator']}>{children}</ProtectedRoute>;
}

export default AdminRoute;
