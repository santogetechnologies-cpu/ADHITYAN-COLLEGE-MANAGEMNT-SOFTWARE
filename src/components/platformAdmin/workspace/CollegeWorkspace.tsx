import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCollege } from '@/context/CollegeContext';
import { multiCollegeService } from '@/services/multiCollegeService';
import { College } from '@/types/multiCollege.types';
import { 
  MasterSystemConfigState, 
  RoleCustomConfig,
  DashboardLayoutConfig,
  RolePageConfig,
  RoleNavigationConfig,
  ModuleDefinition,
  FeatureDefinition,
  PermissionRule,
  FormBuilderConfig,
  WorkflowBuilderConfig,
  GlobalSettingsConfig,
  ThemeBrandingConfig,
  ConfigurationRelease
} from '@/types/superAdmin.types';
import { buildInitialMasterConfigState } from '@/services/superAdminDefaults';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

// Reusable Section Subcomponents
import { OverviewSection } from '@/components/admin/superAdmin/sections/OverviewSection';
import { RoleManagementSection } from '@/components/admin/superAdmin/sections/RoleManagementSection';
import { RolePageCustomizerSection } from '@/components/admin/superAdmin/sections/RolePageCustomizerSection';
import { DashboardBuilderSection } from '@/components/admin/superAdmin/sections/DashboardBuilderSection';
import { NavigationManagerSection } from '@/components/admin/superAdmin/sections/NavigationManagerSection';
import { ModuleManagerSection } from '@/components/admin/superAdmin/sections/ModuleManagerSection';
import { FeatureManagerSection } from '@/components/admin/superAdmin/sections/FeatureManagerSection';
import { PermissionManagerSection } from '@/components/admin/superAdmin/sections/PermissionManagerSection';
import { WidgetLibrarySection } from '@/components/admin/superAdmin/sections/WidgetLibrarySection';
import { FormBuilderSection } from '@/components/admin/superAdmin/sections/FormBuilderSection';
import { WorkflowBuilderSection } from '@/components/admin/superAdmin/sections/WorkflowBuilderSection';
import { GlobalSettingsSection } from '@/components/admin/superAdmin/sections/GlobalSettingsSection';
import { ThemeBrandingSection } from '@/components/admin/superAdmin/sections/ThemeBrandingSection';
import { VersionHistorySection } from '@/components/admin/superAdmin/sections/VersionHistorySection';
import { PreviewModeSection } from '@/components/admin/superAdmin/sections/PreviewModeSection';
import { PublishChangesModal } from '@/components/admin/superAdmin/sections/PublishChangesModal';
import { RoleCustomizerWorkspace } from './roleCustomizer/RoleCustomizerWorkspace';

import { 
  Building2, 
  ArrowLeft, 
  Shield, 
  Sliders, 
  Layers, 
  Compass, 
  Boxes, 
  Sparkles, 
  KeyRound, 
  Grid, 
  FileCheck, 
  GitBranch, 
  Globe, 
  Palette, 
  UploadCloud, 
  RefreshCw,
  Eye,
  CheckCircle2,
  Lock
} from 'lucide-react';

export function CollegeWorkspace() {
  const { collegeId } = useParams<{ collegeId: string }>();
  const navigate = useNavigate();
  const { collegesList, switchCollege, reloadCollegeData } = useCollege();

  const [activeCollege, setActiveCollege] = useState<College | null>(null);
  const [config, setConfig] = useState<MasterSystemConfigState>(buildInitialMasterConfigState());
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [hasDrafts, setHasDrafts] = useState<boolean>(false);
  const [releases, setReleases] = useState<ConfigurationRelease[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState<boolean>(false);
  const [customizingRoleKey, setCustomizingRoleKey] = useState<string | null>(null);

  const loadCollegeData = async () => {
    if (!collegeId) return;
    setIsLoading(true);
    try {
      const col = await multiCollegeService.getCollegeById(collegeId);
      if (!col) {
        toast.error(`College "${collegeId}" not found.`);
        navigate('/platform-admin/colleges');
        return;
      }
      setActiveCollege(col);

      // Load isolated configuration for this college
      const colConfig = await multiCollegeService.getCollegeConfiguration(collegeId, { includeDrafts: true });
      setConfig(colConfig);

      // Load releases for this college
      const logs = await multiCollegeService.listPlatformAuditLogs({ collegeId });
      const releaseList = logs
        .filter(l => l.action === 'publish_college_configuration')
        .map((l, idx) => ({
          id: l.id,
          release_version: l.entity_id || `v1.${idx + 1}.0`,
          version_number: idx + 1,
          title: `Release ${l.entity_id || 'v1.0.0'}`,
          change_summary: l.new_values?.summary || 'Routine college configuration update',
          author_email: l.super_admin_email,
          snapshot: l.new_values?.snapshot || {},
          is_active: idx === 0,
          created_at: l.created_at
        }));
      setReleases(releaseList);

    } catch (err) {
      console.error('Failed to load college workspace:', err);
      toast.error('Failed to load college workspace.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCollegeData();
  }, [collegeId]);

  // Save Handlers Scoped to THIS College
  const handleSaveRole = async (roleKey: string, updatedRole: RoleCustomConfig): Promise<boolean> => {
    if (!collegeId) return false;
    const updated = {
      ...config,
      roles: { ...config.roles, [roleKey]: updatedRole }
    };
    setConfig(updated);
    setHasDrafts(true);
    await multiCollegeService.saveCollegeConfiguration(collegeId, updated);
    toast.success(`Role "${updatedRole.label}" updated for ${activeCollege?.code}.`);
    return true;
  };

  const handleSaveDashboard = async (roleKey: string, updatedDashboard: DashboardLayoutConfig): Promise<boolean> => {
    if (!collegeId) return false;
    const updated = {
      ...config,
      dashboards: { ...config.dashboards, [roleKey]: updatedDashboard }
    };
    setConfig(updated);
    setHasDrafts(true);
    await multiCollegeService.saveCollegeConfiguration(collegeId, updated);
    toast.success(`Dashboard layout saved for ${roleKey} in ${activeCollege?.code}.`);
    return true;
  };

  const handleSaveNavigation = async (roleKey: string, updatedNav: RoleNavigationConfig): Promise<boolean> => {
    if (!collegeId) return false;
    const updated = {
      ...config,
      navigation: { ...config.navigation, [roleKey]: updatedNav }
    };
    setConfig(updated);
    setHasDrafts(true);
    await multiCollegeService.saveCollegeConfiguration(collegeId, updated);
    toast.success(`Navigation saved for ${roleKey} in ${activeCollege?.code}.`);
    return true;
  };

  const handleSaveModules = async (updatedModules: ModuleDefinition[]): Promise<boolean> => {
    if (!collegeId) return false;
    const updated = { ...config, modules: updatedModules };
    setConfig(updated);
    setHasDrafts(true);
    await multiCollegeService.saveCollegeConfiguration(collegeId, updated);
    toast.success(`Modules updated for ${activeCollege?.code}.`);
    return true;
  };

  const handleSaveFeatures = async (updatedFeatures: FeatureDefinition[]): Promise<boolean> => {
    if (!collegeId) return false;
    const updated = { ...config, features: updatedFeatures };
    setConfig(updated);
    setHasDrafts(true);
    await multiCollegeService.saveCollegeConfiguration(collegeId, updated);
    toast.success(`Features updated for ${activeCollege?.code}.`);
    return true;
  };

  const handleSavePermissions = async (updatedPermissions: PermissionRule[]): Promise<boolean> => {
    if (!collegeId) return false;
    const updated = { ...config, permissions: updatedPermissions };
    setConfig(updated);
    setHasDrafts(true);
    await multiCollegeService.saveCollegeConfiguration(collegeId, updated);
    toast.success(`Permissions saved for ${activeCollege?.code}.`);
    return true;
  };

  const handleSaveSettings = async (updatedSettings: GlobalSettingsConfig): Promise<boolean> => {
    if (!collegeId) return false;
    const updated = { ...config, globalSettings: updatedSettings };
    setConfig(updated);
    setHasDrafts(true);
    await multiCollegeService.saveCollegeConfiguration(collegeId, updated);
    toast.success(`Institutional settings saved for ${activeCollege?.code}.`);
    return true;
  };

  const handleSaveTheme = async (updatedTheme: ThemeBrandingConfig): Promise<boolean> => {
    if (!collegeId) return false;
    const updated = { ...config, theme: updatedTheme };
    setConfig(updated);
    setHasDrafts(true);
    await multiCollegeService.saveCollegeConfiguration(collegeId, updated);
    toast.success(`Theme updated for ${activeCollege?.code}.`);
    return true;
  };

  const handlePublishSuccess = async (releaseVersion: string) => {
    if (!collegeId) return;
    setHasDrafts(false);
    await multiCollegeService.publishCollegeConfiguration(
      collegeId,
      'superadmin@platform.adithyan.edu',
      'Super Admin workspace configuration release'
    );
    await reloadCollegeData();
    await loadCollegeData();
    toast.success(`Published release ${releaseVersion} for ${activeCollege?.name}!`);
  };

  if (!activeCollege) {
    return (
      <div className="py-12 text-center text-xs text-muted-foreground">
        Loading college workspace...
      </div>
    );
  }

  if (customizingRoleKey) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <RoleCustomizerWorkspace
          college={activeCollege}
          roleKey={customizingRoleKey}
          collegeModules={config.modules}
          collegeFeatures={config.features}
          onBack={() => setCustomizingRoleKey(null)}
          onRolePublished={async () => {
            await loadCollegeData();
          }}
        />
      </div>
    );
  }

  const sections = [
    { id: 'overview', label: 'College Overview', icon: Building2 },
    { id: 'roles', label: 'Role Management', icon: Shield, badge: `${Object.keys(config.roles).length} Roles` },
    { id: 'dashboards', label: 'Dashboard Builder', icon: Sliders },
    { id: 'navigation', label: 'Navigation Manager', icon: Compass },
    { id: 'modules', label: 'Module Manager', icon: Boxes, badge: `${config.modules.filter(m => m.enabled).length} Active` },
    { id: 'features', label: 'Feature Manager', icon: Sparkles },
    { id: 'permissions', label: 'Permission Manager', icon: KeyRound },
    { id: 'widgets', label: 'Widget Library', icon: Grid },
    { id: 'forms', label: 'Form Builder', icon: FileCheck },
    { id: 'workflows', label: 'Workflow Builder', icon: GitBranch },
    { id: 'settings', label: 'Institutional Settings', icon: Globe },
    { id: 'theme', label: 'Theme & Branding', icon: Palette },
    { id: 'preview', label: 'Role Preview Simulator', icon: Eye },
    { id: 'history', label: 'Version History', icon: UploadCloud }
  ];

  return (
    <div className="space-y-4">
      
      {/* 1. College Workspace Header Banner */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/platform-admin/colleges')}
            className="h-8 w-8 p-0 text-slate-500 hover:text-slate-800"
            title="Return to Directory"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-sm text-indigo-700 shrink-0">
            {activeCollege.code.slice(0, 3)}
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                {activeCollege.name}
              </h2>
              <Badge variant="outline" className="text-[10px] font-mono text-indigo-700 bg-indigo-50 border-indigo-200">
                {activeCollege.code}
              </Badge>
              <Badge variant={activeCollege.status === 'active' ? 'default' : 'secondary'} className="text-[9px] uppercase font-semibold">
                {activeCollege.status}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Isolated College Software Environment • Release {activeCollege.current_version} • Admin: {activeCollege.admin_email}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {hasDrafts && (
            <Badge className="bg-amber-500 text-white text-[10px] animate-pulse">
              Unpublished Drafts
            </Badge>
          )}

          <Button
            size="sm"
            onClick={() => setIsPublishModalOpen(true)}
            className="h-8 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
          >
            <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
            Publish Changes
          </Button>
        </div>
      </div>

      {/* 2. Workspace Body: Left Section Navigator + Right Section Editor */}
      <div className="flex flex-col md:flex-row gap-4 items-start">
        
        {/* Left Sub-Sidebar (13 Sections) */}
        <div className="w-full md:w-64 bg-white rounded-xl border border-slate-200 shadow-2xs p-2 space-y-1 shrink-0">
          <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            College Workspace (13)
          </p>
          {sections.map(s => {
            const Icon = s.icon;
            const isActive = activeSection === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveSection(s.id)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between ${
                  isActive 
                    ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 shadow-2xs' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center space-x-2 truncate">
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span className="truncate">{s.label}</span>
                </div>
                {s.badge && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-semibold ${
                    isActive ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {s.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Section Content Viewport */}
        <div className="flex-1 w-full bg-white rounded-xl border border-slate-200 shadow-2xs p-4 sm:p-6 min-h-[520px]">
          
          {activeSection === 'overview' && (
            <div className="space-y-5">
              <div className="border-b border-slate-200 pb-2">
                <h3 className="text-base font-bold text-slate-900">College Identity & Overview</h3>
                <p className="text-xs text-muted-foreground">General institutional profile and academic configuration for {activeCollege.name}.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-800">Institutional Profile</h4>
                  <div className="space-y-1 text-slate-600 text-[11px]">
                    <div>• Name: <span className="font-semibold text-slate-900">{activeCollege.name}</span></div>
                    <div>• Code: <span className="font-mono font-bold text-indigo-700">{activeCollege.code}</span></div>
                    <div>• Discipline: <span className="font-semibold text-slate-900">{activeCollege.institution_type}</span></div>
                    <div>• Status: <span className="font-semibold text-slate-900 uppercase">{activeCollege.status}</span></div>
                    <div>• Contact Email: <span className="font-semibold text-slate-900">{activeCollege.contact_email}</span></div>
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-800">Academic Structure</h4>
                  <div className="space-y-1 text-slate-600 text-[11px]">
                    <div>• Programs: <span className="font-semibold text-slate-900">{activeCollege.academic_config.programs.join(', ')}</span></div>
                    <div>• Term System: <span className="font-semibold text-slate-900">{activeCollege.academic_config.semesterStructure}</span></div>
                    <div>• Departments: <span className="font-semibold text-slate-900">{activeCollege.academic_config.departments.length} departments</span></div>
                    <div>• Active Year: <span className="font-semibold text-slate-900">{activeCollege.academic_config.academicYears[0] || '2025-2026'}</span></div>
                  </div>
                </div>
              </div>

              {/* Department Chips */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs text-slate-800">Configured Academic Departments:</h4>
                <div className="flex flex-wrap gap-1.5">
                  {activeCollege.academic_config.departments.map(d => (
                    <Badge key={d} variant="outline" className="text-xs px-2.5 py-1 bg-slate-50 border-slate-200 text-slate-700">
                      {d}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'roles' && (
            <RoleManagementSection
              roles={config.roles}
              modules={config.modules}
              onSaveRoleDraft={handleSaveRole}
              onPreviewRole={(rk) => {
                setActiveSection('preview');
              }}
              onCustomizeRole={(rk) => setCustomizingRoleKey(rk)}
            />
          )}

          {activeSection === 'dashboards' && (
            <DashboardBuilderSection
              dashboards={config.dashboards}
              roles={config.roles}
              onSaveDashboard={handleSaveDashboard}
            />
          )}

          {activeSection === 'navigation' && (
            <NavigationManagerSection
              navigation={config.navigation}
              roles={config.roles}
              onSaveNavigation={handleSaveNavigation}
            />
          )}

          {activeSection === 'modules' && (
            <ModuleManagerSection
              modules={config.modules}
              roles={config.roles}
              onSaveModules={handleSaveModules}
            />
          )}

          {activeSection === 'features' && (
            <FeatureManagerSection
              features={config.features}
              modules={config.modules}
              roles={config.roles}
              onSaveFeatures={handleSaveFeatures}
            />
          )}

          {activeSection === 'permissions' && (
            <PermissionManagerSection
              permissions={config.permissions}
              roles={config.roles}
              modules={config.modules}
              onSavePermissions={handleSavePermissions}
            />
          )}

          {activeSection === 'widgets' && (
            <WidgetLibrarySection
              roles={config.roles}
              onNavigateToDashboard={() => setActiveSection('dashboards')}
            />
          )}

          {activeSection === 'forms' && (
            <FormBuilderSection
              forms={config.forms}
              roles={config.roles}
              onSaveForm={async (formId, updatedForm) => {
                const updated = { ...config, forms: { ...config.forms, [formId]: updatedForm } };
                setConfig(updated);
                setHasDrafts(true);
                if (collegeId) await multiCollegeService.saveCollegeConfiguration(collegeId, updated);
                toast.success(`Form "${updatedForm.name}" saved.`);
                return true;
              }}
            />
          )}

          {activeSection === 'workflows' && (
            <WorkflowBuilderSection
              workflows={config.workflows}
              roles={config.roles}
              onSaveWorkflow={async (wfId, updatedWf) => {
                const updated = { ...config, workflows: { ...config.workflows, [wfId]: updatedWf } };
                setConfig(updated);
                setHasDrafts(true);
                if (collegeId) await multiCollegeService.saveCollegeConfiguration(collegeId, updated);
                toast.success(`Workflow "${updatedWf.name}" saved.`);
                return true;
              }}
            />
          )}

          {activeSection === 'settings' && (
            <GlobalSettingsSection
              settings={config.globalSettings}
              onSaveSettings={handleSaveSettings}
            />
          )}

          {activeSection === 'theme' && (
            <ThemeBrandingSection
              theme={config.theme}
              onSaveTheme={handleSaveTheme}
            />
          )}

          {activeSection === 'preview' && (
            <PreviewModeSection
              config={config}
              onNavigateSection={(sec) => setActiveSection(sec)}
            />
          )}

          {activeSection === 'history' && (
            <VersionHistorySection
              releases={releases}
              activeVersion={activeCollege.current_version}
              onRollback={async () => true}
            />
          )}

        </div>
      </div>

      {/* Publish Modal */}
      <PublishChangesModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        config={config}
        hasDrafts={hasDrafts}
        onPublishSuccess={handlePublishSuccess}
      />

    </div>
  );
}

export default CollegeWorkspace;
