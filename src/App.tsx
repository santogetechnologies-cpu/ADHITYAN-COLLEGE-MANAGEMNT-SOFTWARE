import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { PresenceProvider } from "@/context/PresenceContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProtectedRoute } from "@/components/guards/ProtectedRoute";
import { NAACLayout } from "@/components/naac/NAACLayout";
import { AdminLayout } from "@/components/admin/AdminLayout";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { DialogHost } from '@/lib/dialogs';
import { useAuth } from '@/context/AuthContext';
import { CollegeProvider } from '@/context/CollegeContext';
import { VisualCustomizerProvider } from '@/context/VisualCustomizerContext';
import { lazy, Suspense } from 'react';
import { PageLoader } from '@/components/PageLoader';
import { AppSafetyNet } from '@/components/AppSafetyNet';

// Each screen is downloaded the first time it is opened, so the app starts fast.
const AdminReports = lazy(() => import('@/pages/admin/AdminReports'));
const AdminAnalytics = lazy(() => import('@/pages/admin/AdminAnalytics'));
const AdminSettings = lazy(() => import('@/pages/admin/AdminSettings'));
const AdminOverview = lazy(() => import('@/components/admin/AdminOverview'));
const PrincipalDashboard = lazy(() => import('@/components/dashboards/PrincipalDashboard'));
const UserManagement = lazy(() => import('@/components/admin/UserManagement'));
const DepartmentManagement = lazy(() => import('@/components/admin/DepartmentManagement'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const MessageTeacher = lazy(() => import('./pages/MessageTeacher'));
const TrackSchoolBus = lazy(() => import('./pages/TrackSchoolBus'));
const ViewAchievements = lazy(() => import('./pages/ViewAchievements'));
const ReportConcern = lazy(() => import('./pages/ReportConcern'));
const CreateAssignment = lazy(() => import('@/pages/teachers/CreateAssignment'));
const MessageParents = lazy(() => import('@/pages/teachers/MessageParents'));
const GenerateReport = lazy(() => import('@/pages/teachers/GenerateReport'));
const DailyTeachingUpdate = lazy(() => import('@/components/teachers/DailyTeachingUpdate').then(m => ({ default: m.DailyTeachingUpdate })));
const TeacherAssignments = lazy(() => import('./components/admin/TeacherAssignments'));
const TimetableManagement = lazy(() => import('./components/admin/TimetableManagement'));
const NAACDashboard = lazy(() => import('./pages/naac/NAACDashboard'));
const Criterion1 = lazy(() => import('./pages/naac/Criterion1'));
const Criterion2 = lazy(() => import('./pages/naac/Criterion2'));
const Criterion3 = lazy(() => import('./pages/naac/Criterion3'));
const Criterion4 = lazy(() => import('./pages/naac/Criterion4'));
const Criterion5 = lazy(() => import('./pages/naac/Criterion5'));
const Criterion6 = lazy(() => import('./pages/naac/Criterion6'));
const Criterion7 = lazy(() => import('./pages/naac/Criterion7'));
const Repository = lazy(() => import('./pages/naac/Repository'));
const Reports = lazy(() => import('./pages/naac/Reports'));
const Settings = lazy(() => import('./pages/naac/Settings'));
const EventsManagement = lazy(() => import('@/components/admin/EventsManagement').then(m => ({ default: m.EventsManagement })));
const ExamManagement = lazy(() => import('@/pages/ExamManagement'));
const LibraryManagement = lazy(() => import('@/pages/LibraryManagement'));
const AdmissionManagement = lazy(() => import('@/pages/AdmissionManagement'));
const AlumniManagement = lazy(() => import('@/pages/AlumniManagement'));
const StudentPromotion = lazy(() => import('@/pages/StudentPromotion'));
const StudentLifecycle = lazy(() => import('@/pages/StudentLifecycle'));
const StudentLeaveDesk = lazy(() => import('@/pages/StudentLeaveDesk'));
const Announcements = lazy(() => import('@/pages/Announcements'));
const Integrations = lazy(() => import('@/pages/Integrations'));
const DataCentre = lazy(() => import('@/pages/DataCentre'));
const AuditLogViewer = lazy(() => import('@/pages/AuditLogViewer'));
const MedicalManagement = lazy(() => import('@/pages/MedicalManagement'));
const CertificateGeneration = lazy(() => import('@/pages/CertificateGeneration'));
const SportsManagement = lazy(() => import('@/pages/SportsManagement'));
const DisciplinaryManagement = lazy(() => import('@/pages/DisciplinaryManagement'));
const Store = lazy(() => import('@/pages/Store'));
const ReceptionistDashboard = lazy(() => import('@/components/dashboards/ReceptionistDashboard'));
const StoreManagerDashboard = lazy(() => import('@/components/dashboards/StoreManagerDashboard'));
const FinanceManagerDashboard = lazy(() => import('@/components/dashboards/FinanceManagerDashboard'));
const TransportDriverDashboard = lazy(() => import('@/components/dashboards/TransportDriverDashboard'));
const TransportAdminDesk = lazy(() => import('@/components/transport/TransportAdminDesk'));
const SuperAdminControlCenter = lazy(() => import('@/components/admin/superAdmin/SuperAdminControlCenter'));
const AccountProvisioningWorkspace = lazy(() => import('@/components/admin/accountProvisioning/AccountProvisioningWorkspace'));


function TransportRouteSwitch() {
  const { user } = useAuth();
  return user?.role === 'admin' || user?.role === 'principal' ? <TransportAdminDesk /> : <TransportDriverDashboard />;
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CollegeProvider>
          <VisualCustomizerProvider>
            <PresenceProvider>
          <TooltipProvider>
            <Toaster />
            <DialogHost />
            <Sonner />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <AppSafetyNet />
              <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public Route */}
                <Route path="/" element={<Index />} />

                {/* Authenticated Dashboard Core */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/:role"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Direct Role Shortcut Landing Paths */}
                <Route
                  path="/principal"
                  element={
                    <ProtectedRoute allowedRoles={['principal', 'admin']}>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teacher"
                  element={
                    <ProtectedRoute allowedRoles={['teacher', 'hod', 'admin']}>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student"
                  element={<Navigate to="/dashboard/student" replace />}
                />
                <Route
                  path="/parent"
                  element={
                    <ProtectedRoute allowedRoles={['parent', 'admin']}>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Common Protected Services */}
                <Route
                  path="/message-teacher"
                  element={
                    <ProtectedRoute allowedRoles={['student', 'parent', 'admin', 'teacher']}>
                      <MessageTeacher />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/track-bus"
                  element={
                    <ProtectedRoute allowedRoles={['student', 'parent', 'transport_driver', 'driver', 'admin']}>
                      <TrackSchoolBus />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/achievements"
                  element={
                    <ProtectedRoute allowedRoles={['student', 'teacher', 'admin', 'principal']}>
                      <ViewAchievements />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/report-concern"
                  element={
                    <ProtectedRoute>
                      <ReportConcern />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/store"
                  element={
                    <ProtectedRoute>
                      <Store />
                    </ProtectedRoute>
                  }
                />

                {/* Teacher Faculty Routes */}
                <Route
                  path="/teachers/create-assignment"
                  element={
                    <ProtectedRoute allowedRoles={['teacher', 'hod', 'admin']}>
                      <CreateAssignment />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teachers/message-parents"
                  element={
                    <ProtectedRoute allowedRoles={['teacher', 'hod', 'admin']}>
                      <MessageParents />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teachers/generate-report"
                  element={
                    <ProtectedRoute allowedRoles={['teacher', 'hod', 'admin', 'principal']}>
                      <GenerateReport />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teachers/daily-update"
                  element={
                    <ProtectedRoute allowedRoles={['teacher', 'hod', 'admin', 'principal']}>
                      <DailyTeachingUpdate />
                    </ProtectedRoute>
                  }
                />

                {/* Academic & Administrative Modules */}
                <Route
                  path="/exam-management"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'principal', 'teacher', 'student', 'coe']}>
                      <ExamManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/library-management"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'principal', 'teacher', 'student', 'librarian']}>
                      <LibraryManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admission-management"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'principal', 'receptionist']}>
                      <AdmissionManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student-lifecycle"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'principal']}>
                      <StudentLifecycle />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student-leave"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'principal', 'hod', 'teacher']}>
                      <StudentLeaveDesk />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/announcements"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'principal']}>
                      <Announcements />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/data-centre"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'principal', 'hod', 'teacher', 'finance_manager', 'financier', 'accountant', 'hr_manager', 'receptionist']}>
                      <DataCentre />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/integrations"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <Integrations />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student-promotion"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'principal']}>
                      <StudentPromotion />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/audit-log"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'principal']}>
                      <AuditLogViewer />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/alumni-management"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'principal']}>
                      <AlumniManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/medical-management"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'principal']}>
                      <MedicalManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/certificate-generation"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'principal']}>
                      <CertificateGeneration />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/sports-management"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'principal', 'teacher']}>
                      <SportsManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/disciplinary-management"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'principal', 'teacher']}>
                      <DisciplinaryManagement />
                    </ProtectedRoute>
                  }
                />

                {/* Finance workspaces for the finance roles (the /admin layout is admin/principal only) */}
                <Route
                  path="/finance"
                  element={
                    <ProtectedRoute allowedRoles={['finance_manager', 'financier', 'admin', 'principal']}>
                      <FinanceManagerDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/accounts"
                  element={
                    <ProtectedRoute allowedRoles={['finance_manager', 'accountant', 'admin', 'principal']}>
                      <FinanceManagerDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Admin Management System (Nested) */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'principal']}>
                      <AdminLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<AdminOverview />} />
                  <Route path="principal" element={<PrincipalDashboard />} />
                  <Route path="finance" element={<FinanceManagerDashboard />} />
                  <Route path="store" element={<StoreManagerDashboard />} />
                  <Route path="transport" element={<TransportRouteSwitch />} />
                  <Route path="users" element={<ProtectedRoute allowedRoles={['admin']}><UserManagement /></ProtectedRoute>} />
                  <Route path="departments" element={<DepartmentManagement />} />
                  <Route path="teachers" element={<TeacherAssignments />} />
                  <Route path="timetable" element={<TimetableManagement />} />
                  <Route path="storekeeper" element={<StoreManagerDashboard />} />
                  <Route path="accounts" element={<FinanceManagerDashboard />} />
                  <Route path="events" element={<EventsManagement />} />
                  <Route path="receptionist" element={<ReceptionistDashboard />} />
                  <Route path="store-manager" element={<StoreManagerDashboard />} />
                  <Route path="finance-manager" element={<FinanceManagerDashboard />} />
                  <Route path="transport-driver" element={<TransportDriverDashboard />} />
                  <Route path="reports" element={<AdminReports />} />
                  <Route path="analytics" element={<AdminAnalytics />} />
                  <Route path="settings" element={<ProtectedRoute allowedRoles={['admin']}><AdminSettings /></ProtectedRoute>} />
                  <Route path="control-center" element={<ProtectedRoute allowedRoles={['admin']}><SuperAdminControlCenter /></ProtectedRoute>} />
                  <Route path="account-provisioning" element={<ProtectedRoute allowedRoles={['admin', 'principal', 'receptionist']}><AccountProvisioningWorkspace /></ProtectedRoute>} />
                </Route>
                
                {/* Super Admin Direct Shortcut */}
                <Route
                  path="/control-center"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <SuperAdminControlCenter />
                    </ProtectedRoute>
                  }
                />

                {/* Account Provisioning & Admission Direct Shortcut */}
                <Route
                  path="/account-provisioning"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'principal', 'receptionist']}>
                      <AccountProvisioningWorkspace />
                    </ProtectedRoute>
                  }
                />
                

                
                {/* NAAC Accreditation System (Nested) */}
                <Route
                  path="/admin/naac"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'principal', 'naac_coordinator']}>
                      <NAACLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<NAACDashboard />} />
                  <Route path="criterion-1" element={<Criterion1 />} />
                  <Route path="criterion-2" element={<Criterion2 />} />
                  <Route path="criterion-3" element={<Criterion3 />} />
                  <Route path="criterion-4" element={<Criterion4 />} />
                  <Route path="criterion-5" element={<Criterion5 />} />
                  <Route path="criterion-6" element={<Criterion6 />} />
                  <Route path="criterion-7" element={<Criterion7 />} />
                  <Route path="repository" element={<Repository />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="settings" element={<Settings />} />
                </Route>

                {/* 404 Catch-All */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
            </PresenceProvider>
          </VisualCustomizerProvider>
        </CollegeProvider>
    </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
