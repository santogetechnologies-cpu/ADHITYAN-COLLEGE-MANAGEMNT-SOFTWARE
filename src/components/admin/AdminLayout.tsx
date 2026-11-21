import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { PageLoader } from '@/components/PageLoader';
import { ManagementRoute } from '@/components/guards/ManagementRoute';
import { AdminExecutiveNavbar } from './AdminExecutiveNavbar';
import { AdminContextBreadcrumbs } from './navigation/AdminContextBreadcrumbs';

export function AdminLayout() {
  return (
    <ManagementRoute>
      <div className="min-h-screen flex flex-col bg-slate-50/50 dark:bg-background text-foreground overflow-x-hidden w-full">
        <AdminExecutiveNavbar />
        <AdminContextBreadcrumbs />
        <main className="flex-1 w-full max-w-screen-2xl mx-auto px-3 sm:px-6 lg:px-8 py-5 min-w-0">
          <Suspense fallback={<PageLoader />}><Outlet /></Suspense>
        </main>
      </div>
    </ManagementRoute>
  );
}
