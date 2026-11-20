import { UserRole } from '@/context/AuthContext';
import { superAdminService } from './superAdminService';
import { MasterSystemConfigState, ModuleDefinition } from '@/types/superAdmin.types';

export interface RouteAuthorizationResult {
  allowed: boolean;
  reason?: string;
  redirectTo?: string;
  blockingModule?: string;
}

export interface CrudAuthorizationResult {
  allowed: boolean;
  reason?: string;
}

class PermissionEnforcementService {
  private activeConfig: MasterSystemConfigState | null = null;

  constructor() {
    this.refreshConfig();
    if (typeof window !== 'undefined') {
      window.addEventListener('system_config_published', () => this.refreshConfig());
      window.addEventListener('role_config_updated', () => this.refreshConfig());
      // A change published by an administrator on another device reaches everyone else: re-read the live
      // configuration when the tab becomes visible again and once a minute while it is open.
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void this.refreshConfig(); });
      window.setInterval(() => { if (document.visibilityState === 'visible') void this.refreshConfig(); }, 60_000);
    }
  }

  async refreshConfig(): Promise<MasterSystemConfigState> {
    this.activeConfig = await superAdminService.getMasterConfiguration();
    return this.activeConfig;
  }

  getConfig(): MasterSystemConfigState | null {
    return this.activeConfig;
  }

  // Route & Page Level Enforcement
  checkRouteAccess(role: UserRole, pathname: string): RouteAuthorizationResult {
    // 1. Platform Super Admin and College Admin have baseline master access to their zones
    if (role === 'platform_super_admin') {
      return { allowed: true };
    }

    if (!this.activeConfig) {
      // Fallback: If config hasn't loaded yet, allow standard navigation but require Auth
      return { allowed: true };
    }

    // 2. Identify target module from pathname
    const moduleMap: Record<string, string> = {
      '/exam-management': 'examinations',
      '/library-management': 'library',
      '/admission-management': 'admissions',
      '/alumni-management': 'alumni',
      '/medical-management': 'medical',
      '/certificate-generation': 'compliance',
      '/sports-management': 'sports',
      '/disciplinary-management': 'disciplinary',
      '/store': 'store',
      '/teachers/create-assignment': 'academics',
      '/teachers/message-parents': 'communication',
      '/teachers/generate-report': 'academics',
      '/teachers/daily-update': 'academics',
      '/admin/timetable': 'timetable',
      '/admin/naac': 'naac',
      '/admin/departments': 'departments',
      '/track-bus': 'transport',
      '/message-teacher': 'communication'
    };

    const matchedPrefix = Object.keys(moduleMap).find(prefix => pathname.startsWith(prefix));
    const moduleId = matchedPrefix ? moduleMap[matchedPrefix] : null;

    // 3. Module Status Check
    if (moduleId && this.activeConfig.modules) {
      const mod = this.activeConfig.modules.find(m => m.id === moduleId);
      if (mod && mod.status === 'disabled') {
        return {
          allowed: false,
          reason: `Institutional module "${mod.name}" is currently disabled by Super Admin.`,
          blockingModule: mod.id,
          redirectTo: `/dashboard/${role}`
        };
      }
    }

    // 4. Role-Specific Page Access Check
    const roleCfg = this.activeConfig.roles[role];
    if (roleCfg) {
      // If role is deactivated / restricted
      if (roleCfg.status === 'restricted' && role !== 'admin') {
        return {
          allowed: false,
          reason: `Your institutional role (${role}) has been restricted by Super Admin.`,
          redirectTo: '/'
        };
      }

      // Check allowedModules for the role
      if (moduleId && roleCfg.allowedModules && roleCfg.allowedModules.length > 0) {
        if (!roleCfg.allowedModules.includes(moduleId) && role !== 'admin') {
          return {
            allowed: false,
            reason: `Role "${role}" does not have access permissions for module "${moduleId}".`,
            redirectTo: roleCfg.home || `/dashboard/${role}`
          };
        }
      }
    }

    return { allowed: true };
  }

  // CRUD Operation Authorization Check
  checkCrudAccess(
    role: UserRole, 
    entity: string, 
    action: 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export' | 'import'
  ): CrudAuthorizationResult {
    if (role === 'platform_super_admin' || role === 'admin') {
      return { allowed: true };
    }

    if (!this.activeConfig) {
      return { allowed: true };
    }

    const roleCfg = this.activeConfig.roles[role];
    if (!roleCfg) {
      return { allowed: false, reason: `Unrecognized role: ${role}` };
    }

    const requiredPerm = `${entity}:${action}`;
    const wildcardPerm = `${entity}:manage`;

    // Map common domain aliases
    const aliases: Record<string, string[]> = {
      'attendance:create': ['mark_attendance', 'attendance:write'],
      'attendance:edit': ['mark_attendance', 'attendance:write'],
      'attendance:view': ['view_assigned_students', 'attendance:read'],
      'academics:create': ['create_assignment', 'assignments:write'],
      'academics:edit': ['post_daily_lesson', 'assignments:write']
    };
    const matchedAliases = aliases[requiredPerm] || [];

    if (
      roleCfg.permissions && (
        roleCfg.permissions.includes(requiredPerm) ||
        roleCfg.permissions.includes(wildcardPerm) ||
        roleCfg.permissions.includes('*') ||
        matchedAliases.some(a => roleCfg.permissions.includes(a))
      )
    ) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: `Unauthorized: Role "${role}" lacks permission "${requiredPerm}" for entity "${entity}".`
    };
  }
}

export const permissionEnforcementService = new PermissionEnforcementService();
