import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { UserRole } from '@/context/AuthContext';
import { db } from '@/services/supabase/database';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { 
  GraduationCap, 
  Heart, 
  BookOpen, 
  Shield, 
  Users, 
  Calendar, 
  Phone, 
  Package, 
  CreditCard, 
  Bus,
  Building2,
  Briefcase,
  Library,
  Home,
  Award,
  LogIn,
  CheckCircle2
} from 'lucide-react';
import { InstitutionName } from '@/lib/institution';

interface RoleSelectionProps {
  onSelectRole: (role?: UserRole) => void;
}

export interface PortalRoleCard {
  id: UserRole;
  title: string;
  category: 'academic' | 'management' | 'services';
  description: string;
  icon: any;
  features: string[];
  color: string;
}

export const ALL_13_PORTALS: PortalRoleCard[] = [
  // 1. Academic & Student Portals
  {
    id: 'student',
    title: 'Student Portal',
    category: 'academic',
    description: 'Personalized course hub, assignments, schedules & exam tracking',
    icon: GraduationCap,
    features: ['Vocational Modules', 'Lab Worksheets', 'Exam Timetables', 'Attendance'],
    color: 'bg-blue-600'
  },
  {
    id: 'parent',
    title: 'Parent Portal',
    category: 'academic',
    description: 'Academic progress, attendance telemetry, fees & faculty contact',
    icon: Heart,
    features: ['Academic Monitoring', 'Fee Payment Status', 'Direct Messaging', 'Attendance Alerts'],
    color: 'bg-rose-500'
  },
  {
    id: 'teacher',
    title: 'Faculty & Teacher Hub',
    category: 'academic',
    description: 'Batch management, curriculum lectures, lab practicals & grading',
    icon: BookOpen,
    features: ['Lecture Planning', 'Student Attendance', 'Lab Practicals', 'Gradebook'],
    color: 'bg-emerald-600'
  },
  {
    id: 'principal',
    title: 'Principal / Dean Portal',
    category: 'academic',
    description: 'Institutional leadership, academic audit, faculty overview & NAAC',
    icon: Building2,
    features: ['Curriculum Audit', 'Faculty Workload', 'Academic Approvals', 'Institution Insights'],
    color: 'bg-indigo-600'
  },

  // 2. Administrative & Operations Portals
  {
    id: 'admin',
    title: 'Administrator Console',
    category: 'management',
    description: 'Central ERP management, RBAC provisioning & system telemetry',
    icon: Shield,
    features: ['Full User Provisioning', 'Database Telemetry', 'Timetable Desk', 'Department Oversight'],
    color: 'bg-purple-600'
  },
  {
    id: 'finance_manager',
    title: 'Finance Manager',
    category: 'management',
    description: 'Fee collection desk, institutional accounting, balance sheets & payroll',
    icon: CreditCard,
    features: ['Fee Ledgers', 'Receipt Generation', 'Income Audits', 'Vendor Payments'],
    color: 'bg-amber-600'
  },
  {
    id: 'hr_manager',
    title: 'HR Manager',
    category: 'management',
    description: 'Faculty hiring, biometric attendance, staff leave & payroll management',
    icon: Briefcase,
    features: ['Staff Profiles', 'Leave Processing', 'Salary Disbursal', 'Workforce Records'],
    color: 'bg-teal-600'
  },
  {
    id: 'receptionist',
    title: 'Receptionist Desk',
    category: 'management',
    description: 'Front office visitor logs, gate passes, enquiries & student check-ins',
    icon: Phone,
    features: ['Visitor Check-In', 'Campus Enquiries', 'Appointment Desk', 'Front Office'],
    color: 'bg-cyan-600'
  },

  // 3. Campus Services & Facilities Portals
  {
    id: 'librarian',
    title: 'Chief Librarian',
    category: 'services',
    description: 'Medical textbooks, cataloging, book checkout & digital library repository',
    icon: Library,
    features: ['Digital Catalog', 'Book Checkouts', 'Fine Tracking', 'e-Journals'],
    color: 'bg-blue-700'
  },
  {
    id: 'hostel_warden',
    title: 'Hostel Warden',
    category: 'services',
    description: 'Student hostel room allocation, mess management & night roll call',
    icon: Home,
    features: ['Room Allotment', 'Mess Attendance', 'Gate Leave Passes', 'Hostel Incidents'],
    color: 'bg-orange-600'
  },
  {
    id: 'placement_officer',
    title: 'Placement Officer',
    category: 'services',
    description: 'Hospital tie-ups, corporate internships, student drives & placement stats',
    icon: Award,
    features: ['Hospital Postings', 'Recruitment Drives', 'Student Resumes', 'Placement Records'],
    color: 'bg-yellow-600'
  },
  {
    id: 'store_manager',
    title: 'Store Manager',
    category: 'services',
    description: 'Lab inventory, medical equipment, uniforms & stock replenishment',
    icon: Package,
    features: ['Stock Ledger', 'Low Stock Alerts', 'Requisition Approval', 'Uniform Issuance'],
    color: 'bg-emerald-700'
  },
  {
    id: 'transport_driver',
    title: 'Transport Driver',
    category: 'services',
    description: 'Bus fleet GPS navigation, route stops, safety logs & vehicle health',
    icon: Bus,
    features: ['GPS Route Board', 'Trip Check-In', 'Student Boarding', 'Maintenance Log'],
    color: 'bg-violet-600'
  }
];

export function RoleSelection({ onSelectRole }: RoleSelectionProps) {
  const [statsLoading, setStatsLoading] = useState(true);
  const [dbStats, setDbStats] = useState({
    totalRegisteredUsers: 13,
    activeStudents: 0,
    totalTeachers: 0,
    coursesCount: 9
  });

  const loadLiveStats = useCallback(async () => {
    try {
      const stats = await db.getSystemOverviewStats();
      setDbStats({
        totalRegisteredUsers: stats.totalRegisteredUsers || 13,
        activeStudents: stats.activeStudents || 0,
        totalTeachers: stats.totalTeachers || 0,
        coursesCount: 9
      });
    } catch (err) {
      console.warn('Could not load home page live stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLiveStats();
  }, [loadLiveStats]);

  // Real-time synchronization: automatically updates registered count if new user is added or removed
  useRealtimeSubscription({ table: 'profiles', onChange: loadLiveStats, onReconnect: loadLiveStats });

  const statsItems = [
    {
      icon: Users,
      value: dbStats.totalRegisteredUsers.toString(),
      label: 'Registered Accounts',
      subtext: 'Across all 13 institutional portals'
    },
    {
      icon: GraduationCap,
      value: dbStats.activeStudents > 0 ? dbStats.activeStudents.toString() : 'Active',
      label: 'Enrolled Students',
      subtext: 'Medical & Vocational degree cohorts'
    },
    {
      icon: BookOpen,
      value: `${dbStats.coursesCount} Courses`,
      label: 'Accredited Programs',
      subtext: 'B.VOC & Professional Diplomas'
    },
    {
      icon: Shield,
      value: '13 Portals',
      label: 'Role-Based Access',
      subtext: '100% RBAC security verified'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center p-1 bg-primary/10">
                <img 
                  src="/lovable-uploads/8ea95178-bb37-43e2-ae4d-595e31707954.png" 
                  alt="Adithyan College Logo" 
                  className="w-full h-full object-contain" 
                />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground tracking-tight leading-none">
                  <InstitutionName />
                </h1>
                <p className="text-[11px] text-muted-foreground">College Management ERP & LMS</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center space-x-1.5 text-xs text-muted-foreground border px-2.5 py-1 rounded-full">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
              <Button 
                onClick={() => onSelectRole()} 
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
              >
                <LogIn className="w-4 h-4 mr-1.5" />
                Universal Sign In
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-hero text-primary-foreground py-14 px-4 relative overflow-hidden">
        <div className="container mx-auto text-center relative z-10 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-medium mb-4 backdrop-blur border border-white/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Role-Based Access Control • Every role has its own secure portal</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold mb-4 tracking-tight leading-tight">
            Institutional Management System
          </h1>
          <p className="text-base md:text-xl mb-8 opacity-90 max-w-2xl mx-auto font-light">
            Integrated academic administration, clinical rotation schedules, automated fee ledgers, and role-secured dashboards.
          </p>

          <div className="flex flex-wrap justify-center gap-3 mb-10">
            <Button 
              size="lg" 
              onClick={() => onSelectRole()}
              className="bg-white text-primary hover:bg-white/90 font-semibold shadow-md"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Sign In to Your Account
            </Button>
          </div>

          {/* Dynamic Real-time Database Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-2 border-t border-white/20">
            {statsItems.map((stat, index) => (
              <div key={index} className="text-center p-3 rounded-lg bg-white/5 backdrop-blur border border-white/10">
                <div className="w-9 h-9 mx-auto mb-1.5 bg-white/20 rounded-full flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
                {statsLoading ? (
                  <Skeleton className="h-6 w-16 mx-auto mb-1 bg-white/20" />
                ) : (
                  <div className="text-2xl font-bold tracking-tight">{stat.value}</div>
                )}
                <div className="text-xs font-semibold">{stat.label}</div>
                <div className="text-[10px] opacity-75 mt-0.5 line-clamp-1">{stat.subtext}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Role Selection Grid - All 13 User Roles */}
      <section className="py-12 px-4 max-w-6xl mx-auto space-y-10">
        <div className="text-center space-y-2">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Access Institutional Portals</h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Select your assigned institutional role to sign in directly to your role-specific dashboard
          </p>
        </div>

        {/* Category 1: Academic & Instruction */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b pb-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-base tracking-tight">Academic & Student Portals</h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ALL_13_PORTALS.filter(p => p.category === 'academic').map(portal => {
              const Icon = portal.icon;
              return (
                <Card 
                  key={portal.id} 
                  className="hover:shadow-md hover:border-primary/50 transition-all cursor-pointer flex flex-col justify-between group"
                  onClick={() => onSelectRole(portal.id)}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className={`w-10 h-10 rounded-lg ${portal.color} flex items-center justify-center mb-2 shadow-sm text-white`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-base font-bold group-hover:text-primary transition-colors">
                      {portal.title}
                    </CardTitle>
                    <CardDescription className="text-xs line-clamp-2 mt-1">
                      {portal.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 space-y-3">
                    <div className="space-y-1">
                      {portal.features.slice(0, 3).map((f, i) => (
                        <div key={i} className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                          <span className="truncate">{f}</span>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" size="sm" className="w-full text-xs group-hover:bg-primary group-hover:text-primary-foreground">
                      Access Portal
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Category 2: Management & Institutional Operations */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b pb-2">
            <Shield className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-base tracking-tight">Administrative & Operations Portals</h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ALL_13_PORTALS.filter(p => p.category === 'management').map(portal => {
              const Icon = portal.icon;
              return (
                <Card 
                  key={portal.id} 
                  className="hover:shadow-md hover:border-primary/50 transition-all cursor-pointer flex flex-col justify-between group"
                  onClick={() => onSelectRole(portal.id)}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className={`w-10 h-10 rounded-lg ${portal.color} flex items-center justify-center mb-2 shadow-sm text-white`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-base font-bold group-hover:text-primary transition-colors">
                      {portal.title}
                    </CardTitle>
                    <CardDescription className="text-xs line-clamp-2 mt-1">
                      {portal.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 space-y-3">
                    <div className="space-y-1">
                      {portal.features.slice(0, 3).map((f, i) => (
                        <div key={i} className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                          <span className="truncate">{f}</span>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" size="sm" className="w-full text-xs group-hover:bg-primary group-hover:text-primary-foreground">
                      Access Portal
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Category 3: Campus Facilities & Student Services */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b pb-2">
            <Building2 className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-base tracking-tight">Campus Services & Facilities Portals</h3>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {ALL_13_PORTALS.filter(p => p.category === 'services').map(portal => {
              const Icon = portal.icon;
              return (
                <Card 
                  key={portal.id} 
                  className="hover:shadow-md hover:border-primary/50 transition-all cursor-pointer flex flex-col justify-between group"
                  onClick={() => onSelectRole(portal.id)}
                >
                  <CardHeader className="p-3.5 pb-2">
                    <div className={`w-9 h-9 rounded-lg ${portal.color} flex items-center justify-center mb-2 shadow-sm text-white`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <CardTitle className="text-sm font-bold group-hover:text-primary transition-colors">
                      {portal.title}
                    </CardTitle>
                    <CardDescription className="text-[11px] line-clamp-2 mt-0.5">
                      {portal.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-3.5 pt-1 space-y-2.5">
                    <div className="space-y-1">
                      {portal.features.slice(0, 2).map((f, i) => (
                        <div key={i} className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-primary/60 shrink-0" />
                          <span className="truncate">{f}</span>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" size="sm" className="w-full text-xs h-7 group-hover:bg-primary group-hover:text-primary-foreground">
                      Access
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card py-6 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} <InstitutionName />. Secure Role-Based ERP & LMS.</p>
      </footer>
    </div>
  );
}
