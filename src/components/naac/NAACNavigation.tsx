import { NavLink, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';
import { useNAAC } from '@/context/NAACContext';
import { Progress } from '@/components/ui/progress';
import {
  BookOpen,
  GraduationCap,
  FlaskConical,
  Building2,
  Users,
  Shield,
  Heart,
  FolderOpen,
  FileText,
  Settings,
  Award
} from 'lucide-react';

const naacCriteria = [
  {
    number: 1,
    title: 'Curricular Aspects',
    icon: BookOpen,
    url: '/admin/naac/criterion-1',
    description: 'Curriculum Design & Development'
  },
  {
    number: 2,
    title: 'Teaching-Learning & Evaluation',
    icon: GraduationCap,
    url: '/admin/naac/criterion-2',
    description: 'Student Enrollment & Profile'
  },
  {
    number: 3,
    title: 'Research, Innovations & Extension',
    icon: FlaskConical,
    url: '/admin/naac/criterion-3',
    description: 'Research Publications & Patents'
  },
  {
    number: 4,
    title: 'Infrastructure & Learning Resources',
    icon: Building2,
    url: '/admin/naac/criterion-4',
    description: 'Physical & Academic Support Facilities'
  },
  {
    number: 5,
    title: 'Student Support & Progression',
    icon: Users,
    url: '/admin/naac/criterion-5',
    description: 'Student Support & Guidance'
  },
  {
    number: 6,
    title: 'Governance, Leadership & Management',
    icon: Shield,
    url: '/admin/naac/criterion-6',
    description: 'Institutional Vision & Leadership'
  },
  {
    number: 7,
    title: 'Institutional Values & Best Practices',
    icon: Heart,
    url: '/admin/naac/criterion-7',
    description: 'Environment Consciousness & Values'
  }
];

const extraMenus = [
  {
    title: 'Central Repository',
    icon: FolderOpen,
    url: '/admin/naac/repository',
    description: 'Document Management System'
  },
  {
    title: 'Reports',
    icon: FileText,
    url: '/admin/naac/reports',
    description: 'SSR/AQAR Report Generation'
  },
  {
    title: 'Settings',
    icon: Settings,
    url: '/admin/naac/settings',
    description: 'System Configuration'
  }
];

export function NAACNavigation() {
  const { state } = useSidebar();
  const location = useLocation();
  const { naacData } = useNAAC();
  const currentPath = location.pathname;
  const isCollapsed = state === 'collapsed';

  const isActive = (path: string) => currentPath === path;
  const getNavClass = (path: string) =>
    isActive(path) ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'hover:bg-sidebar-accent/50';

  const getProgressForCriterion = (criterionNumber: number) => {
    return naacData.criterionProgress.find(p => p.criterionNumber === criterionNumber);
  };

  return (
    <Sidebar className={isCollapsed ? 'w-16' : 'w-80'} collapsible="icon">
      <SidebarContent>
        {/* NAAC Criteria Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            {!isCollapsed && 'NAAC Criteria'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {naacCriteria.map((criterion) => {
                const progress = getProgressForCriterion(criterion.number);
                const Icon = criterion.icon;
                
                return (
                  <SidebarMenuItem key={criterion.number}>
                    <SidebarMenuButton asChild>
                      <NavLink to={criterion.url} className={getNavClass(criterion.url)}>
                        <div className="flex items-center gap-3 w-full">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Icon className="w-4 h-4 shrink-0" />
                            {!isCollapsed && (
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-sm truncate">
                                  {criterion.number}. {criterion.title}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {criterion.description}
                                </div>
                                {progress && (
                                  <div className="mt-1 space-y-1">
                                    <Progress 
                                      value={progress.completionPercentage} 
                                      className="h-1.5"
                                    />
                                    <div className="text-xs text-muted-foreground">
                                      {progress.completedMetrics}/{progress.totalMetrics} metrics ({progress.completionPercentage}%)
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          {isCollapsed && progress && (
                            <div className="text-xs font-bold text-primary">
                              {progress.completionPercentage}%
                            </div>
                          )}
                        </div>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Extra Menus Section */}
        <SidebarGroup>
          <SidebarGroupLabel>
            {!isCollapsed && 'Additional Features'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {extraMenus.map((menu) => {
                const Icon = menu.icon;
                
                return (
                  <SidebarMenuItem key={menu.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={menu.url} className={getNavClass(menu.url)}>
                        <Icon className="w-4 h-4" />
                        {!isCollapsed && (
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm">{menu.title}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {menu.description}
                            </div>
                          </div>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Overall Progress Summary */}
        {!isCollapsed && (
          <SidebarGroup>
            <SidebarGroupLabel>Overall Progress</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="p-3 space-y-2">
                <div className="text-sm font-medium">
                  NAAC Readiness: {Math.round(naacData.criterionProgress.reduce((acc, p) => acc + p.completionPercentage, 0) / 7)}%
                </div>
                <Progress 
                  value={Math.round(naacData.criterionProgress.reduce((acc, p) => acc + p.completionPercentage, 0) / 7)} 
                  className="h-2"
                />
                <div className="text-xs text-muted-foreground">
                  {naacData.documents.length} documents uploaded
                </div>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}