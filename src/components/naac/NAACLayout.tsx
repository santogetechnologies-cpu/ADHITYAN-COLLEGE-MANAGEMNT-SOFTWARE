import { Outlet } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { NAACProvider } from '@/context/NAACContext';
import { AdminRoute } from '@/components/guards/AdminRoute';
import { NAACNavigation } from './NAACNavigation';
import { NAACHeader } from './NAACHeader';

export function NAACLayout() {
  return (
    <AdminRoute>
      <NAACProvider>
        <div className="min-h-screen bg-background">
          <SidebarProvider>
            <div className="flex min-h-screen w-full">
              <NAACNavigation />
              <main className="flex-1 flex flex-col">
                <NAACHeader />
                <div className="flex-1 p-6">
                  <Outlet />
                </div>
              </main>
            </div>
          </SidebarProvider>
        </div>
      </NAACProvider>
    </AdminRoute>
  );
}