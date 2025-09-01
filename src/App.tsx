import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { NAACLayout } from "@/components/naac/NAACLayout";
import { AdminLayout } from "@/components/admin/AdminLayout";
import AdminOverview from "@/components/admin/AdminOverview";
import PrincipalDashboard from "@/components/dashboards/PrincipalDashboard";
import FinanceDashboard from "@/components/dashboards/FinanceDashboard";
import StoreDashboard from "@/components/dashboards/StoreDashboard";
import TransportDashboard from "@/components/dashboards/TransportDashboard";
import StoreKeeperDashboard from "@/components/roles/StoreKeeperDashboard";
import AccountsOfficerDashboard from "@/components/roles/AccountsOfficerDashboard";
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

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/message-teacher" element={<MessageTeacher />} />
            <Route path="/track-bus" element={<TrackSchoolBus />} />
            <Route path="/achievements" element={<ViewAchievements />} />
            <Route path="/report-concern" element={<ReportConcern />} />
            <Route path="/store" element={<Store />} />
            {/* Teacher Routes */}
            <Route path="/teachers/create-assignment" element={<CreateAssignment />} />
            <Route path="/teachers/message-parents" element={<MessageParents />} />
            <Route path="/teachers/generate-report" element={<GenerateReport />} />
            <Route path="/teachers/daily-update" element={<DailyTeachingUpdate />} />
            {/* Module Routes */}
            <Route path="/exam-management" element={<ExamManagement />} />
            <Route path="/library-management" element={<LibraryManagement />} />
            <Route path="/admission-management" element={<AdmissionManagement />} />
            <Route path="/alumni-management" element={<AlumniManagement />} />
            <Route path="/medical-management" element={<MedicalManagement />} />
            <Route path="/certificate-generation" element={<CertificateGeneration />} />
            <Route path="/sports-management" element={<SportsManagement />} />
            <Route path="/disciplinary-management" element={<DisciplinaryManagement />} />
            {/* Admin Management Routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminOverview />} />
              <Route path="principal" element={<PrincipalDashboard />} />
              <Route path="finance" element={<FinanceDashboard />} />
              <Route path="store" element={<StoreDashboard />} />
              <Route path="transport" element={<TransportDashboard />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="departments" element={<DepartmentManagement />} />
              <Route path="teachers" element={<TeacherAssignments />} />
              <Route path="timetable" element={<TimetableManagement />} />
              <Route path="storekeeper" element={<StoreKeeperDashboard />} />
              <Route path="accounts" element={<AccountsOfficerDashboard />} />
              <Route path="events" element={<EventsManagement />} />
              <Route path="receptionist" element={<ReceptionistDashboard />} />
              <Route path="store-manager" element={<StoreManagerDashboard />} />
              <Route path="finance-manager" element={<FinanceManagerDashboard />} />
              <Route path="transport-driver" element={<TransportDriverDashboard />} />
            </Route>
            
            {/* NAAC System Routes */}
            <Route path="/admin/naac" element={<NAACLayout />}>
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
