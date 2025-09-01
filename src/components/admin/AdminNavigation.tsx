import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
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
import {
  Shield,
  GraduationCap,
  DollarSign,
  Package,
  Truck,
  Users,
  Award,
  Settings,
  UserPlus,
  BarChart3,
  FileText,
  Home,
  Calendar,
  Heart,
  Stethoscope,
  GraduationCap as Alumni,
  FileCheck,
  BookOpen,
  Target
} from 'lucide-react';

const adminModules = [
  {
    title: 'Overview',
    icon: Home,
    url: '/admin',
    description: 'System Overview',
    roles: ['admin']
  },
  {
    title: 'Principal Dashboard',
    icon: GraduationCap,
    url: '/admin/principal',
    description: 'Academic Management',
    roles: ['admin', 'principal']
  },
  {
    title: 'Financial Management',
    icon: DollarSign,
    url: '/admin/finance',
    description: 'Finance & Accounts',
    roles: ['admin', 'financier']
  },
  {
    title: 'Accounts Officer',
    icon: DollarSign,
    url: '/admin/accounts',
    description: 'Accounting & Expenses',
    roles: ['admin', 'accountant']
  },
  {
    title: 'Store Management',
    icon: Package,
    url: '/admin/store',
    description: 'Inventory & Assets',
    roles: ['admin']
  },
  {
    title: 'Store Keeper',
    icon: Package,
    url: '/admin/storekeeper',
    description: 'Inventory Control',
    roles: ['admin', 'storekeeper']
  },
  {
    title: 'Transport Management',
    icon: Truck,
    url: '/admin/transport',
    description: 'Vehicle & Routes',
    roles: ['admin', 'driver']
  },
  {
    title: 'User Management',
    icon: UserPlus,
    url: '/admin/users',
    description: 'Create & Manage Users',
    roles: ['admin']
  },
  {
    title: 'Department Management',
    icon: Users,
    url: '/admin/departments',
    description: 'Manage Departments & Sections',
    roles: ['admin']
  },
  {
    title: 'NAAC Accreditation',
    icon: Award,
    url: '/admin/naac',
    description: 'NAAC Management',
    roles: ['admin', 'naac_coordinator']
  },
  {
    title: 'Events Management',
    icon: Calendar,
    url: '/admin/events',
    description: 'Manage College Events',
    roles: ['admin', 'principal']
  },
  {
    title: 'Alumni Management',
    icon: Alumni,
    url: '/alumni-management',
    description: 'Alumni Directory & Programs',
    roles: ['admin', 'principal']
  },
  {
    title: 'Medical Management',
    icon: Stethoscope,
    url: '/medical-management',
    description: 'Health Records & Infirmary',
    roles: ['admin', 'medical_officer']
  },
  {
    title: 'Certificate Generation',
    icon: FileCheck,
    url: '/certificate-generation',
    description: 'Digital Certificates & Transcripts',
    roles: ['admin', 'registrar']
  },
  {
    title: 'Examination Management',
    icon: FileText,
    url: '/exam-management',
    description: 'Exam Scheduling & Result Publishing',
    roles: ['admin', 'principal', 'teacher']
  },
  {
    title: 'Library Management',
    icon: FileText,
    url: '/library-management',
    description: 'Digital Catalog & Book Tracking',
    roles: ['admin', 'librarian']
  },
  {
    title: 'Admission Management',
    icon: UserPlus,
    url: '/admission-management',
    description: 'Application Portal & Merit Lists',
    roles: ['admin', 'admission_officer']
  },
  {
    title: 'Sports & Extra-Curricular',
    icon: Award,
    url: '/sports-management',
    description: 'Events, Teams & Competition Management',
    roles: ['admin', 'sports_coordinator']
  },
  {
    title: 'Receptionist',
    icon: Users,
    url: '/admin/receptionist',
    description: 'Front Office & Visitor Management',
    roles: ['admin', 'receptionist']
  },
  {
    title: 'Store Manager',
    icon: Package,
    url: '/admin/store-manager',
    description: 'Inventory & Asset Management',
    roles: ['admin', 'store_manager']
  },
  {
    title: 'Finance Manager',
    icon: DollarSign,
    url: '/admin/finance-manager',
    description: 'Financial Oversight & Fee Management',
    roles: ['admin', 'finance_manager']
  },
  {
    title: 'Transport Driver',
    icon: Truck,
    url: '/admin/transport-driver',
    description: 'Student Transport & Safety',
    roles: ['admin', 'transport_driver']
  },
];

const quickAccess = [
  {
    title: 'Reports',
    icon: FileText,
    url: '/admin/reports',
    description: 'Generate Reports',
    roles: ['admin', 'principal', 'financier']
  },
  {
    title: 'Analytics',
    icon: BarChart3,
    url: '/admin/analytics',
    description: 'System Analytics',
    roles: ['admin', 'principal']
  },
  {
    title: 'Settings',
    icon: Settings,
    url: '/admin/settings',
    description: 'System Configuration',
    roles: ['admin']
  }
];

export function AdminNavigation() {
  const { state } = useSidebar();
  const { user } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;
  const isCollapsed = state === 'collapsed';

  const isActive = (path: string) => {
    if (path === '/admin') {
      return currentPath === '/admin' || currentPath === '/admin/';
    }
    return currentPath.startsWith(path);
  };

  const getNavClass = (path: string) =>
    isActive(path) ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'hover:bg-sidebar-accent/50';

  const canAccess = (roles: string[]) => {
    return user && roles.includes(user.role);
  };

  const getVisibleModules = (modules: typeof adminModules) => {
    return modules.filter(module => canAccess(module.roles));
  };

  return (
    <Sidebar className={isCollapsed ? 'w-16' : 'w-80'} collapsible="icon">
      <SidebarContent>
        {/* Main Admin Modules */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            {!isCollapsed && 'Management Modules'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {getVisibleModules(adminModules).map((module) => {
                const Icon = module.icon;
                
                return (
                  <SidebarMenuItem key={module.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={module.url} className={getNavClass(module.url)}>
                        <div className="flex items-center gap-3 w-full">
                          <Icon className="w-4 h-4 shrink-0" />
                          {!isCollapsed && (
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-sm truncate">
                                {module.title}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {module.description}
                              </div>
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

        {/* Quick Access */}
        <SidebarGroup>
          <SidebarGroupLabel>
            {!isCollapsed && 'Quick Access'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {getVisibleModules(quickAccess).map((item) => {
                const Icon = item.icon;
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className={getNavClass(item.url)}>
                        <Icon className="w-4 h-4" />
                        {!isCollapsed && (
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm">{item.title}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {item.description}
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

        {/* User Info */}
        {!isCollapsed && user && (
          <SidebarGroup>
            <SidebarGroupLabel>Current User</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="p-3 space-y-2">
                <div className="text-sm font-medium truncate">
                  {user.name}
                </div>
                <div className="text-xs text-muted-foreground capitalize">
                  {user.role.replace('_', ' ')} Access
                </div>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}