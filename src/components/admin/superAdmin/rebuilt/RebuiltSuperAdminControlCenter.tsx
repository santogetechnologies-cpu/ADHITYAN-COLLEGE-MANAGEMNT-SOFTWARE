import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useCollege } from '@/context/CollegeContext';
import { superAdminService } from '@/services/superAdminService';
import { MasterSystemConfigState, RoleCustomConfig, WidgetPlacement, NavItemConfig as RoleNavItem, RolePageConfig, ModuleDefinition } from '@/types/superAdmin.types';
import { SuperAdminCommandHeader } from './header/SuperAdminCommandHeader';
import { RoleControlCenterView } from './views/RoleControlCenterView';
import { ModuleManagementView } from './views/ModuleManagementView';
import { WorkflowEngineView } from './views/WorkflowEngineView';
import { CollegeConfigView } from './views/CollegeConfigView';
import { UserAccountControlView } from './views/UserAccountControlView';
import { SecurityEnforcementView } from './views/SecurityEnforcementView';
import { AuditMonitoringView } from './views/AuditMonitoringView';
import { RollbackVersionDialog } from './dialogs/RollbackVersionDialog';
import { 
  Users, 
  Boxes, 
  GitBranch, 
  Building2, 
  UserCog, 
  ShieldCheck, 
  FileText,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

export type SuperAdminDomainTab = 
  | 'roles' 
  | 'modules' 
  | 'workflows' 
  | 'college' 
  | 'users' 
  | 'security' 
  | 'audit';

export function RebuiltSuperAdminControlCenter() {
  const { user } = useAuth();
  const { currentCollege } = useCollege();

  const [activeTab, setActiveTab] = useState<SuperAdminDomainTab>('roles');
  const activeCollege = currentCollege;
  const [masterConfig, setMasterConfig] = useState<MasterSystemConfigState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isRollbackOpen, setIsRollbackOpen] = useState(false);

  useEffect(() => {
    initializeControlCenter();
  }, [currentCollege?.id]);

  const initializeControlCenter = async () => {
    setIsLoading(true);
    try {
      // 2. Load master system configuration
      const config = await superAdminService.getMasterConfiguration({ includeDrafts: true });
      setMasterConfig(config);
    } catch (err: any) {
      toast.error('Failed to initialize Super Admin Control Center');
    } finally {
      setIsLoading(false);
    }
  };

  // State mutators with unsaved changes tracking
  const handleUpdateRoleConfig = (roleKey: string, updatedRole: RoleCustomConfig) => {
    if (!masterConfig) return;
    setMasterConfig({
      ...masterConfig,
      roles: {
        ...masterConfig.roles,
        [roleKey]: updatedRole
      }
    });
    setHasUnsavedChanges(true);
  };

  const handleUpdateRoleNav = (roleKey: string, navItems: RoleNavItem[]) => {
    if (!masterConfig) return;
    setMasterConfig({
      ...masterConfig,
      navigation: {
        ...masterConfig.navigation,
        [roleKey]: {
          role: roleKey,
          items: navItems,
          groups: ['Core', 'Specialized'],
          updatedAt: new Date().toISOString()
        }
      }
    });
    setHasUnsavedChanges(true);
  };

  const handleUpdateRoleDashboard = (roleKey: string, widgets: WidgetPlacement[]) => {
    if (!masterConfig) return;
    setMasterConfig({
      ...masterConfig,
      dashboards: {
        ...masterConfig.dashboards,
        [roleKey]: {
          role: roleKey,
          columns: 4,
          gap: 'md',
          widgets,
          updatedAt: new Date().toISOString()
        }
      }
    });
    setHasUnsavedChanges(true);
  };

  const handleUpdateRolePage = (roleKey: string, pageConfig: RolePageConfig) => {
    if (!masterConfig) return;
    setMasterConfig({
      ...masterConfig,
      pages: {
        ...masterConfig.pages,
        [roleKey]: pageConfig
      }
    });
    setHasUnsavedChanges(true);
  };

  const handleUpdateModules = (modules: ModuleDefinition[]) => {
    if (!masterConfig) return;
    setMasterConfig({
      ...masterConfig,
      modules
    });
    setHasUnsavedChanges(true);
  };

  // Save Draft (Step 10: Persist after refresh)
  const handleSaveDraft = async () => {
    if (!masterConfig) return;
    setIsSaving(true);
    try {
      await superAdminService.saveMasterConfiguration(masterConfig);
      setHasUnsavedChanges(false);
      toast.success('Configuration draft saved successfully');
    } catch (err: any) {
      toast.error(`Failed to save draft: ${err.message || 'Error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Publish Live (Step 10: Versioning, snapshot to audit_logs, event broadcast)
  const handlePublishLive = async () => {
    if (!masterConfig) return;
    setIsSaving(true);
    try {
      const currentVerNum = parseFloat((masterConfig.activeReleaseVersion || 'v1.0.0').replace('v', '')) || 1.0;
      const nextVer = `v${(currentVerNum + 0.1).toFixed(1)}.0`;

      const result = await superAdminService.publishRelease(
        `Institutional Release ${nextVer}`,
        `Comprehensive configuration publish for ${activeCollege.name}. Changes: ${Object.keys(masterConfig.roles).length} roles configured, ${masterConfig.modules?.length || 0} modules.`
      );

      if (result.success) {
        setMasterConfig(prev => prev ? { ...prev, activeReleaseVersion: nextVer } : prev);
        setHasUnsavedChanges(false);
        window.dispatchEvent(new CustomEvent('system_config_published', { detail: { version: nextVer } }));
        toast.success(`🎉 Configuration published live as ${nextVer}! Immediately effective across all portals.`);
      } else {
        toast.error(`Publish failed: ${result.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      toast.error(`Publish failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Rollback to Snapshot
  const handleRollbackSelected = async (snapshotData: any, versionTag: string) => {
    if (!masterConfig) return;
    setIsSaving(true);
    try {
      const merged: MasterSystemConfigState = {
        ...masterConfig,
        ...snapshotData,
        activeReleaseVersion: versionTag
      };
      await superAdminService.saveMasterConfiguration(merged);
      setMasterConfig(merged);
      setHasUnsavedChanges(false);
      window.dispatchEvent(new CustomEvent('system_config_published', { detail: { version: versionTag } }));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !masterConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-xs text-slate-500 font-medium">Loading Institutional Command Center...</p>
        </div>
      </div>
    );
  }

  const navDomainItems = [
    { id: 'roles' as const, label: 'Role Control Center', icon: Users, badge: `${Object.keys(masterConfig.roles).length} Roles` },
    { id: 'modules' as const, label: 'Module Management', icon: Boxes, badge: `${masterConfig.modules?.length || 0} Modules` },
    { id: 'workflows' as const, label: 'Workflows & Approvals', icon: GitBranch, badge: 'Active' },
    { id: 'college' as const, label: 'College Configuration', icon: Building2, badge: activeCollege.code },
    { id: 'users' as const, label: 'User & Account Control', icon: UserCog, badge: 'Supabase' },
    { id: 'security' as const, label: 'Security & Enforcement', icon: ShieldCheck, badge: 'RLS Active' },
    { id: 'audit' as const, label: 'Audit Logs & Monitoring', icon: FileText, badge: 'Live Stream' },
  ];

  return (
    <div className="min-h-screen bg-slate-50/60 flex flex-col">
      
      {/* 1. Master Command Header */}
      <SuperAdminCommandHeader
        activeCollege={activeCollege}
        activeVersion={masterConfig.activeReleaseVersion || 'v1.0.0'}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving}
        onSaveDraft={handleSaveDraft}
        onPublishLive={handlePublishLive}
        onOpenRollbackDialog={() => setIsRollbackOpen(true)}
      />

      {/* 2. Main Two-Column Layout */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Domain Navigation Sidebar */}
          <aside className="lg:col-span-3">
            <div className="sticky top-24 bg-white rounded-xl border border-slate-200 p-2 shadow-2xs space-y-1">
              <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Management Domains
              </div>
              
              {navDomainItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                      <span>{item.label}</span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      isActive ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {item.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Right Active View Container */}
          <main className="lg:col-span-9">
            {activeTab === 'roles' && (
              <RoleControlCenterView
                masterConfig={masterConfig}
                onUpdateRoleConfig={handleUpdateRoleConfig}
                onUpdateRoleNav={handleUpdateRoleNav}
                onUpdateRoleDashboard={handleUpdateRoleDashboard}
                onUpdateRolePage={handleUpdateRolePage}
              />
            )}

            {activeTab === 'modules' && (
              <ModuleManagementView
                masterConfig={masterConfig}
                onUpdateModules={handleUpdateModules}
              />
            )}

            {activeTab === 'workflows' && (
              <WorkflowEngineView />
            )}

            {activeTab === 'college' && (
              <CollegeConfigView
                activeCollege={activeCollege}
              />
            )}

            {activeTab === 'users' && (
              <UserAccountControlView />
            )}

            {activeTab === 'security' && (
              <SecurityEnforcementView />
            )}

            {activeTab === 'audit' && (
              <AuditMonitoringView />
            )}
          </main>

        </div>
      </div>

      {/* 3. Snapshot Rollback Modal */}
      <RollbackVersionDialog
        open={isRollbackOpen}
        onOpenChange={setIsRollbackOpen}
        onRollbackSelected={handleRollbackSelected}
      />

    </div>
  );
}

export default RebuiltSuperAdminControlCenter;
