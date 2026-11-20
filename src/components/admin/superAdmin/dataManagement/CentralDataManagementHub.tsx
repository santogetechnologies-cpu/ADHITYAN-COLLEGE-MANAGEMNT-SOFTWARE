import React, { useState, useEffect } from 'react';
import { useCollege } from '@/context/CollegeContext';
import { collegeDataService } from '@/services/collegeDataService';
import { Course, Profile, FeeStructure, InstitutionalSettings } from '@/types/database.types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  GraduationCap,
  Settings2,
  Users,
  CreditCard,
  FileCheck2,
  Building,
  RefreshCw,
  Plus,
  BookOpen,
  Calendar,
  ShieldCheck,
  Sparkles,
  ArrowRight
} from 'lucide-react';

// Dedicated Sub-Management Views
import { CoursesManagementView } from './CoursesManagementView';
import { CollegeSettingsView } from './CollegeSettingsView';
import { StudentsManagementView } from './StudentsManagementView';
import { FeesManagementView } from './FeesManagementView';
import { AdmissionsManagementView } from './AdmissionsManagementView';
import { AcademicsManagementView } from './AcademicsManagementView';
import { CampusOperationsView } from './CampusOperationsView';

interface CentralDataManagementHubProps {
  onNavigateToCustomizer?: (roleKey?: string) => void;
}

export function CentralDataManagementHub({ onNavigateToCustomizer }: CentralDataManagementHubProps) {
  const { currentCollege } = useCollege();
  const [activeTab, setActiveTab] = useState<string>('courses');

  // Overview counts
  const [counts, setCounts] = useState({
    courses: 0,
    students: 0,
    feeStructures: 0,
    minAttendance: 75,
    academicYear: '2026-2027'
  });
  const [loading, setLoading] = useState(true);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const [courses, students, fees, settings] = await Promise.all([
        collegeDataService.getCourses(currentCollege.id),
        collegeDataService.getCollegeStudents(currentCollege.id),
        collegeDataService.getFeeStructures(currentCollege.id),
        collegeDataService.getCollegeSettings(currentCollege.id)
      ]);

      setCounts({
        courses: courses.length,
        students: students.length,
        feeStructures: fees.length,
        minAttendance: settings.min_attendance_percentage || 75,
        academicYear: settings.academic_year || '2026-2027'
      });
    } catch (err) {
      console.warn('CentralDataManagementHub load notice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();

    const handleUpdate = () => loadOverview();
    window.addEventListener('college_data_updated', handleUpdate);
    return () => window.removeEventListener('college_data_updated', handleUpdate);
  }, [currentCollege.id]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      
      {/* College Environment Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/50 rounded-xl p-5 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/40 text-xs">
                CENTRAL DATA MANAGEMENT
              </Badge>
              <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 text-xs">
                Tenant: {currentCollege.code}
              </Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {currentCollege.name}
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl">
              Centralized CRUD hub for courses, academic parameters, fee structures, student directory, and campus data. Any change made here immediately syncs across all connected role portals.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={loadOverview}
              disabled={loading}
              className="bg-slate-800/80 border-slate-700 hover:bg-slate-700 text-slate-200 text-xs h-9"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {onNavigateToCustomizer && (
              <Button
                size="sm"
                onClick={() => onNavigateToCustomizer('student')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 font-semibold shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Customize Live Portals
              </Button>
            )}
          </div>
        </div>

        {/* 4 Quick Stat Metric Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/60">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Academic Courses</span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-xl font-black text-white">{counts.courses}</span>
              <span className="text-[10px] text-indigo-300">Degree & Diploma</span>
            </div>
          </div>

          <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/60">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Enrolled Students</span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-xl font-black text-white">{counts.students}</span>
              <span className="text-[10px] text-emerald-400">Active Profiles</span>
            </div>
          </div>

          <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/60">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Fee Structures</span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-xl font-black text-white">{counts.feeStructures}</span>
              <span className="text-[10px] text-purple-300">Configured Heads</span>
            </div>
          </div>

          <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/60">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Min. Attendance</span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-xl font-black text-white">{counts.minAttendance}%</span>
              <span className="text-[10px] text-amber-300">Mandatory Baseline</span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Data Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-100 p-1 border border-slate-200 rounded-lg w-full justify-start overflow-x-auto h-auto">
          <TabsTrigger value="courses" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-semibold py-2 px-3 flex items-center space-x-1.5">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Courses & Programs</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-semibold py-2 px-3 flex items-center space-x-1.5">
            <Settings2 className="w-3.5 h-3.5" />
            <span>College Settings</span>
          </TabsTrigger>
          <TabsTrigger value="students" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-semibold py-2 px-3 flex items-center space-x-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>Students & Directory</span>
          </TabsTrigger>
          <TabsTrigger value="fees" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-semibold py-2 px-3 flex items-center space-x-1.5">
            <CreditCard className="w-3.5 h-3.5" />
            <span>Fees & Financials</span>
          </TabsTrigger>
          <TabsTrigger value="admissions" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-semibold py-2 px-3 flex items-center space-x-1.5">
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Admissions Desk</span>
          </TabsTrigger>
          <TabsTrigger value="academics" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-semibold py-2 px-3 flex items-center space-x-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Academics & Attendance</span>
          </TabsTrigger>
          <TabsTrigger value="operations" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-semibold py-2 px-3 flex items-center space-x-1.5">
            <Building className="w-3.5 h-3.5" />
            <span>Campus Operations</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Courses */}
        <TabsContent value="courses" className="space-y-4">
          <CoursesManagementView />
        </TabsContent>

        {/* Tab 2: Settings */}
        <TabsContent value="settings" className="space-y-4">
          <CollegeSettingsView />
        </TabsContent>

        {/* Tab 3: Students */}
        <TabsContent value="students" className="space-y-4">
          <StudentsManagementView />
        </TabsContent>

        {/* Tab 4: Fees */}
        <TabsContent value="fees" className="space-y-4">
          <FeesManagementView />
        </TabsContent>

        {/* Tab 5: Admissions */}
        <TabsContent value="admissions" className="space-y-4">
          <AdmissionsManagementView />
        </TabsContent>

        {/* Tab 6: Academics & Telemetry */}
        <TabsContent value="academics" className="space-y-4">
          <AcademicsManagementView />
        </TabsContent>

        {/* Tab 7: Operations */}
        <TabsContent value="operations" className="space-y-4">
          <CampusOperationsView />
        </TabsContent>
      </Tabs>

    </div>
  );
}
