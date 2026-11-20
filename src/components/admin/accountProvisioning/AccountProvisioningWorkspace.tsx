import React, { useState, useEffect } from 'react';
import { bulkAccountProvisioningService, OfficialStudentStats } from '@/services/bulkAccountProvisioningService';
import { IndependenceStatsCard } from './sections/IndependenceStatsCard';
import { StudentAdmissionSection } from './sections/StudentAdmissionSection';
import { StudentBulkImportTab } from './sections/StudentBulkImportTab';
import { ParentBulkImportTab } from './sections/ParentBulkImportTab';
import { CombinedBulkImportTab } from './sections/CombinedBulkImportTab';
import { 
  GraduationCap, 
  UserCheck, 
  Users, 
  Layers, 
  ShieldCheck, 
  ArrowLeft,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export function AccountProvisioningWorkspace() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'admission' | 'student_import' | 'parent_import' | 'combined_import'>('admission');
  const [stats, setStats] = useState<OfficialStudentStats>({
    official_enrolled_students: 0,
    total_admission_applications: 0,
    pending_admission_reviews: 0,
    provisioned_student_logins: 0,
    provisioned_parent_accounts: 0,
    active_parent_student_links: 0,
    enrolled_without_login: 0
  });
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoadingStats(true);
    try {
      const data = await bulkAccountProvisioningService.getOfficialStudentStats();
      setStats(data);
    } catch {
      toast.error('Failed to query institutional student and account telemetry');
    } finally {
      setIsLoadingStats(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 pb-12">
      
      {/* 1. Header Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin')}
              className="text-xs text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              <span>Admin Console</span>
            </Button>
            <span className="text-slate-300">/</span>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                  Student Admission & Account Provisioning Center
                </h1>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  Decoupled workflows for Admissions, Student Logins, and Parent Linking
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadStats}
              disabled={isLoadingStats}
              className="h-8 text-xs text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isLoadingStats ? 'animate-spin' : ''}`} />
              <span>Refresh Stats</span>
            </Button>
          </div>
        </div>
      </header>

      {/* 2. Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Independence & Telemetry Widget */}
        <IndependenceStatsCard stats={stats} isLoading={isLoadingStats} />

        {/* 4 Separated Functional Workflow Tabs */}
        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full bg-slate-200/80 p-1 rounded-xl">
            <TabsTrigger value="admission" className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-indigo-900 data-[state=active]:shadow-2xs">
              <GraduationCap className="w-3.5 h-3.5 mr-1.5" />
              <span>1. Student Admission</span>
            </TabsTrigger>

            <TabsTrigger value="student_import" className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-indigo-900 data-[state=active]:shadow-2xs">
              <UserCheck className="w-3.5 h-3.5 mr-1.5" />
              <span>2. Student Login Import</span>
            </TabsTrigger>

            <TabsTrigger value="parent_import" className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-indigo-900 data-[state=active]:shadow-2xs">
              <Users className="w-3.5 h-3.5 mr-1.5" />
              <span>3. Parent Import & Linking</span>
            </TabsTrigger>

            <TabsTrigger value="combined_import" className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-indigo-900 data-[state=active]:shadow-2xs">
              <Layers className="w-3.5 h-3.5 mr-1.5" />
              <span>4. Combined Import</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: STUDENT ADMISSION */}
          <TabsContent value="admission" className="mt-6">
            <StudentAdmissionSection onStatusChange={loadStats} />
          </TabsContent>

          {/* TAB 2: STUDENT LOGIN BULK IMPORT */}
          <TabsContent value="student_import" className="mt-6">
            <StudentBulkImportTab onSuccess={loadStats} />
          </TabsContent>

          {/* TAB 3: PARENT BULK IMPORT & LINKING */}
          <TabsContent value="parent_import" className="mt-6">
            <ParentBulkImportTab onSuccess={loadStats} />
          </TabsContent>

          {/* TAB 4: COMBINED BULK IMPORT */}
          <TabsContent value="combined_import" className="mt-6">
            <CombinedBulkImportTab onSuccess={loadStats} />
          </TabsContent>
        </Tabs>

      </main>

    </div>
  );
}

export default AccountProvisioningWorkspace;
