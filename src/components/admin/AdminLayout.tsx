import { Outlet } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ManagementRoute } from '@/components/guards/ManagementRoute';
import { AdminNavigation } from './AdminNavigation';
import { AdminHeader } from './AdminHeader';

export function AdminLayout() {
  return (
    <ManagementRoute allowedRoles={['admin', 'principal', 'financier', 'accountant', 'storekeeper', 'driver', 'naac_coordinator', 'receptionist', 'store_manager', 'finance_manager', 'transport_driver']}>
      <div className="min-h-screen bg-background">
        <SidebarProvider>
          <div className="flex min-h-screen w-full">
            <AdminNavigation />
            <main className="flex-1 flex flex-col">
              <AdminHeader />
              <div className="flex-1 p-6">
                <Outlet />
              </div>
            </main>
          </div>
        </SidebarProvider>
      </div>
    </ManagementRoute>
  );
}