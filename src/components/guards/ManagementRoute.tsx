import React from 'react';
import { ProtectedRoute } from './ProtectedRoute';

export function ManagementRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute
      allowedRoles={[
        'admin',
        'principal',
        'finance_manager',
        'financier',
        'accountant',
        'store_manager',
        'storekeeper',
        'transport_driver',
        'driver',
        'receptionist',
        'hr_manager',
      ]}
    >
      {children}
    </ProtectedRoute>
  );
}

export default ManagementRoute;
