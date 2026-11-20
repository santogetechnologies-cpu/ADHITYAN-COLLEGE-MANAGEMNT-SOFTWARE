import AdminReports from '@/pages/admin/AdminReports';
import AdminAnalytics from '@/pages/admin/AdminAnalytics';
import AdminSettings from '@/pages/admin/AdminSettings';
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
import AdminOverview from "@/components/admin/AdminOverview";
import PrincipalDashboard from "@/components/dashboards/PrincipalDashboard";
import UserManagement from "@/components/admin/UserManagement";
import DepartmentManagement from "@/components/admin/DepartmentManagement";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import MessageTeacher from "./pages/MessageTeacher";
import TrackSchoolBus from "./pages/TrackSchoolBus";
import ViewAchievements from "./pages/ViewAchievements";
import ReportConcern from "./pages/ReportConcern";
import CreateAssignment from '@/pages/teachers/CreateAssignment';
import MessageParents from '@/pages/teachers/MessageParents';  
import GenerateReport from '@/pages/teachers/GenerateReport';
import { DailyTeachingUpdate } from '@/components/teachers/DailyTeachingUpdate';
import TeacherAssignments from "./components/admin/TeacherAssignments";
import TimetableManagement from "./components/admin/TimetableManagement";
import NAACDashboard from "./pages/naac/NAACDashboard";
import Criterion1 from "./pages/naac/Criterion1";
import Criterion2 from "./pages/naac/Criterion2";
import Criterion3 from "./pages/naac/Criterion3";
import Criterion4 from "./pages/naac/Criterion4";
import Criterion5 from "./pages/naac/Criterion5";
import Criterion6 from "./pages/naac/Criterion6";
import Criterion7 from "./pages/naac/Criterion7";
import Repository from "./pages/naac/Repository";
import Reports from "./pages/naac/Reports";
import Settings from "./pages/naac/Settings";
import { EventsManagement } from '@/components/admin/EventsManagement';
import ExamManagement from '@/pages/ExamManagement';
import LibraryManagement from '@/pages/LibraryManagement';
import AdmissionManagement from '@/pages/AdmissionManagement';
import AlumniManagement from '@/pages/AlumniManagement';
import MedicalManagement from '@/pages/MedicalManagement';
import CertificateGeneration from '@/pages/CertificateGeneration';
import SportsManagement from '@/pages/SportsManagement';
import DisciplinaryManagement from '@/pages/DisciplinaryManagement';
import Store from '@/pages/Store';
import ReceptionistDashboard from '@/components/dashboards/ReceptionistDashboard';
import StoreManagerDashboard from '@/components/dashboards/StoreManagerDashboard';
import FinanceManagerDashboard from '@/components/dashboards/FinanceManagerDashboard';
import TransportDriverDashboard from '@/components/dashboards/TransportDriverDashboard';
import AccountProvisioningWorkspace from '@/components/admin/accountProvisioning/AccountProvisioningWorkspace';
import { CollegeProvider } from '@/context/CollegeContext';

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CollegeProvider>
          <PresenceProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
                  <Route path="transport" element={<TransportDriverDashboard />} />
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
                  <Route path="account-provisioning" element={<ProtectedRoute allowedRoles={['admin', 'principal', 'receptionist']}><AccountProvisioningWorkspace /></ProtectedRoute>} />
                </Route>
                
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
            </BrowserRouter>
          </TooltipProvider>
            </PresenceProvider>
        </CollegeProvider>
    </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
