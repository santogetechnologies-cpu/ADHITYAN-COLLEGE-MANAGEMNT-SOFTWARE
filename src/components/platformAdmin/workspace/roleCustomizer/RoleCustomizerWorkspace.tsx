import React, { useState, useEffect } from 'react';
import { 
  RoleCustomizationState, 
  RoleCapability, 
  RoleValidationIssue,
  CrudAction
} from '@/types/roleCustomization.types';
import { College } from '@/types/multiCollege.types';
import { ModuleDefinition, FeatureDefinition } from '@/types/superAdmin.types';
import { multiCollegeService } from '@/services/multiCollegeService';
import { CAPABILITY_REGISTRY, DEFAULT_CRUD_ENTITIES } from '@/services/capabilityRegistry';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Shield,
  Sliders,
  Database,
  Lock,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  Eye,
  Save,
  UploadCloud,
  FileCode,
  Layers,
  Sparkles,
  RefreshCw,
  GitBranch,
  Search,
  Check,
  X,
  Plus,
  Trash2,
  ChevronRight,
  Settings2,
  FileCheck
} from 'lucide-react';

interface RoleCustomizerWorkspaceProps {
  college: College;
  roleKey: string;
  collegeModules: ModuleDefinition[];
  collegeFeatures: FeatureDefinition[];
  onBack: () => void;
  onRolePublished?: () => void;
}

export function RoleCustomizerWorkspace({
  college,
  roleKey,
  collegeModules,
  collegeFeatures,
  onBack,
  onRolePublished
}: RoleCustomizerWorkspaceProps) {
  const [roleConfig, setRoleConfig] = useState<RoleCustomizationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Validation modal
  const [validationIssues, setValidationIssues] = useState<RoleValidationIssue[]>([]);
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);

  // Publish modal
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [releaseSummary, setReleaseSummary] = useState('');

  // Capability search
  const [capSearch, setCapSearch] = useState('');
  const [capCategoryFilter, setCapCategoryFilter] = useState('ALL');

  // Preview / Simulation state
  const [simulatedAction, setSimulatedAction] = useState<string>('record_attendance');
  const [simulationResult, setSimulationResult] = useState<{
    status: number;
    authorized: boolean;
    reason: string;
    actionName: string;
  } | null>(null);

  const loadRoleConfig = async () => {
    setLoading(true);
    try {
      const cfg = await multiCollegeService.getRoleConfiguration(college.id, roleKey);
      setRoleConfig(cfg);
    } catch (err) {
      console.error('Failed to load role customization:', err);
      toast.error('Failed to load role configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoleConfig();
  }, [college.id, roleKey]);

  if (loading || !roleConfig) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-sm font-medium">Loading full role configuration for {roleKey}...</p>
      </div>
    );
  }

  // Capability toggle handler
  const handleToggleCapability = (capId: string) => {
    const isCurrentlyEnabled = roleConfig.enabledCapabilities.includes(capId);
    const updatedCaps = isCurrentlyEnabled
      ? roleConfig.enabledCapabilities.filter(id => id !== capId)
      : [...roleConfig.enabledCapabilities, capId];

    // Find corresponding backend action
    const capDef = CAPABILITY_REGISTRY.find(c => c.id === capId);
    const updatedBackendActions = { ...roleConfig.backendActions };
    if (capDef?.backendAction) {
      updatedBackendActions[capDef.backendAction] = !isCurrentlyEnabled;
    }

    setRoleConfig({
      ...roleConfig,
      enabledCapabilities: updatedCaps,
      backendActions: updatedBackendActions
    });
    setHasUnsavedChanges(true);
  };

  // Direct Backend Action Toggle
  const handleToggleBackendAction = (actionName: string) => {
    const current = roleConfig.backendActions[actionName] ?? false;
    setRoleConfig({
      ...roleConfig,
      backendActions: {
        ...roleConfig.backendActions,
        [actionName]: !current
      }
    });
    setHasUnsavedChanges(true);
  };

  // CRUD toggle handler
  const handleToggleCrud = (entity: string, action: CrudAction) => {
    const currentRule = roleConfig.crud[entity] || {
      view: false, create: false, edit: false, delete: false, approve: false, export: false
    };

    setRoleConfig({
      ...roleConfig,
      crud: {
        ...roleConfig.crud,
        [entity]: {
          ...currentRule,
          [action]: !currentRule[action as keyof typeof currentRule]
        }
      }
    });
    setHasUnsavedChanges(true);
  };

  // Business rule toggle
  const handleToggleBusinessRule = (ruleKey: string) => {
    const current = roleConfig.businessRules[ruleKey];
    setRoleConfig({
      ...roleConfig,
      businessRules: {
        ...roleConfig.businessRules,
        [ruleKey]: !current
      }
    });
    setHasUnsavedChanges(true);
  };

  // Save Draft
  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await multiCollegeService.saveRoleConfiguration(college.id, roleKey, roleConfig);
      setHasUnsavedChanges(false);
      toast.success(`Role draft saved for ${roleConfig.label} (${college.code}).`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save role draft.');
    } finally {
      setSaving(false);
    }
  };

  // Validate Configuration
  const handleRunValidation = () => {
    const issues = multiCollegeService.validateRoleConfiguration(roleConfig, collegeModules);
    setValidationIssues(issues);
    setIsValidationModalOpen(true);
  };

  // Publish Configuration
  const handlePublishRole = async () => {
    setPublishing(true);
    try {
      // Run pre-flight validation
      const issues = multiCollegeService.validateRoleConfiguration(roleConfig, collegeModules);
      const errors = issues.filter(i => i.type === 'error');
      if (errors.length > 0) {
        toast.error(`Cannot publish: ${errors.length} security error(s) must be resolved.`);
        setValidationIssues(issues);
        setIsValidationModalOpen(true);
        setIsPublishModalOpen(false);
        return;
      }

      const res = await multiCollegeService.publishRoleConfiguration(
        college.id,
        roleKey,
        'superadmin@platform.adithyan.edu',
        releaseSummary || `Customized ${roleConfig.label} functionality for ${college.code}`
      );

      if (res.success) {
        setIsPublishModalOpen(false);
        setHasUnsavedChanges(false);
        toast.success(`Published release ${res.releaseVersion} for ${roleConfig.label}!`);
        if (onRolePublished) onRolePublished();
        await loadRoleConfig();
      } else {
        toast.error(res.error || 'Failed to publish.');
      }
    } finally {
      setPublishing(false);
    }
  };

  // Reset to Baseline
  const handleResetToBaseline = async () => {
    if (confirm(`Reset role "${roleConfig.label}" to platform baseline defaults for ${college.code}?`)) {
      setLoading(true);
      try {
        const fresh = await multiCollegeService.resetRoleConfigurationToDefault(college.id, roleKey);
        setRoleConfig(fresh);
        setHasUnsavedChanges(false);
        toast.success(`Role reset to defaults.`);
      } finally {
        setLoading(false);
      }
    }
  };

  // Simulation Runner
  const handleSimulateAction = () => {
    const actionEnabled = roleConfig.backendActions[simulatedAction] ?? false;
    const cap = CAPABILITY_REGISTRY.find(c => c.backendAction === simulatedAction);

    // Check module status
    const mod = collegeModules.find(m => m.id === cap?.module);
    const moduleEnabled = mod ? mod.enabled : true;

    if (!moduleEnabled) {
      setSimulationResult({
        status: 403,
        authorized: false,
        reason: `Module "${mod?.name}" is disabled at institutional level for college "${college.code}". Backend rejects with HTTP 403 MODULE_DISABLED.`,
        actionName: simulatedAction
      });
      return;
    }

    if (!actionEnabled) {
      setSimulationResult({
        status: 403,
        authorized: false,
        reason: `Backend action "${simulatedAction}" has been toggled OFF in this role configuration. Backend rejects with HTTP 403 ROLE_ACTION_DISABLED.`,
        actionName: simulatedAction
      });
      return;
    }

    if (roleConfig.businessRules.restrictFinanceAccess && ['collect_fee_payment', 'generate_fee_receipt'].includes(simulatedAction)) {
      setSimulationResult({
        status: 403,
        authorized: false,
        reason: `Business Rule "restrictFinanceAccess" is active for role "${roleConfig.label}". Financial transaction blocked with HTTP 403 FINANCE_ACCESS_RESTRICTED.`,
        actionName: simulatedAction
      });
      return;
    }

    setSimulationResult({
      status: 200,
      authorized: true,
      reason: `Authorized! Backend action "${simulatedAction}" is fully enabled, active in capability registry, and satisfies institutional policy rules.`,
      actionName: simulatedAction
    });
  };

  // Filtered capabilities
  const filteredCaps = CAPABILITY_REGISTRY.filter(cap => {
    const matchCat = capCategoryFilter === 'ALL' || cap.category === capCategoryFilter;
    const matchSearch = !capSearch.trim() || 
      cap.name.toLowerCase().includes(capSearch.toLowerCase()) ||
      cap.description.toLowerCase().includes(capSearch.toLowerCase()) ||
      cap.backendAction.toLowerCase().includes(capSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* 1. Master Workspace Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onBack}
              className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                {roleConfig.label}
              </h1>
              <Badge variant="outline" className="font-mono text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
                {roleKey}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {roleConfig.category}
              </Badge>
              {roleConfig.status === 'active' ? (
                <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-300 text-xs">Active</Badge>
              ) : (
                <Badge className="bg-rose-500/10 text-rose-700 border-rose-300 text-xs">Suspended</Badge>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-500 pl-10 flex items-center gap-1.5">
            <span>Configuring software functionality for college:</span>
            <span className="font-bold text-slate-800">{college.name}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono font-bold bg-slate-100 text-slate-700">
              {college.code}
            </Badge>
            <span>• Version:</span>
            <span className="font-mono font-semibold text-indigo-600">{roleConfig.version}</span>
          </p>
        </div>

        {/* Global Action Bar */}
        <div className="flex items-center flex-wrap gap-2">
          {hasUnsavedChanges && (
            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-800 border-amber-300 animate-pulse">
              Unsaved Draft Changes
            </Badge>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleRunValidation}
            className="text-xs h-8.5 gap-1.5 border-slate-300 text-slate-700 shadow-xs"
          >
            <FileCheck className="w-3.5 h-3.5 text-indigo-600" />
            Validate
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleResetToBaseline}
            className="text-xs h-8.5 text-slate-600 border-slate-300 shadow-xs"
          >
            Reset
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveDraft}
            disabled={saving}
            className="text-xs h-8.5 gap-1.5 bg-slate-50 border-slate-300 text-slate-800 shadow-xs"
          >
            <Save className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />
            Save Draft
          </Button>

          <Button
            size="sm"
            onClick={() => setIsPublishModalOpen(true)}
            className="text-xs h-8.5 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            Publish Role
          </Button>
        </div>
      </div>

      {/* 2. Main Tabbed Navigation Container */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="bg-slate-100 p-1 rounded-xl border border-slate-200/80 mb-4 overflow-x-auto">
          <TabsList className="bg-transparent h-9 p-0 gap-1 flex justify-start">
            <TabsTrigger value="overview" className="text-xs px-3 data-[state=active]:bg-white data-[state=active]:shadow-xs">
              Overview
            </TabsTrigger>
            <TabsTrigger value="capabilities" className="text-xs px-3 data-[state=active]:bg-white data-[state=active]:shadow-xs">
              Capability Registry
              <Badge className="ml-1.5 px-1 py-0 text-[10px] bg-indigo-100 text-indigo-700 font-mono">
                {roleConfig.enabledCapabilities.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="backend_actions" className="text-xs px-3 data-[state=active]:bg-white data-[state=active]:shadow-xs">
              Backend Actions
            </TabsTrigger>
            <TabsTrigger value="data_access" className="text-xs px-3 data-[state=active]:bg-white data-[state=active]:shadow-xs">
              Data Access Scope
            </TabsTrigger>
            <TabsTrigger value="crud" className="text-xs px-3 data-[state=active]:bg-white data-[state=active]:shadow-xs">
              CRUD Matrix
            </TabsTrigger>
            <TabsTrigger value="business_rules" className="text-xs px-3 data-[state=active]:bg-white data-[state=active]:shadow-xs">
              Business Logic
            </TabsTrigger>
            <TabsTrigger value="modules" className="text-xs px-3 data-[state=active]:bg-white data-[state=active]:shadow-xs">
              Modules & Features
            </TabsTrigger>
            <TabsTrigger value="workflows" className="text-xs px-3 data-[state=active]:bg-white data-[state=active]:shadow-xs">
              Workflows
            </TabsTrigger>
            <TabsTrigger value="simulator" className="text-xs px-3 data-[state=active]:bg-white data-[state=active]:shadow-xs">
              Sandbox & Simulation
            </TabsTrigger>
          </TabsList>
        </div>

        {/* =========================================================================
            TAB 1: OVERVIEW
           ========================================================================= */}
        <TabsContent value="overview">
          <Card className="border-slate-200 shadow-xs">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900">Role Identity & Institutional Profile</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Core identity settings for this role in {college.name}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Display Label</Label>
                  <Input
                    value={roleConfig.label}
                    onChange={e => {
                      setRoleConfig({ ...roleConfig, label: e.target.value });
                      setHasUnsavedChanges(true);
                    }}
                    className="text-xs h-9 bg-slate-50/50"
                  />
                  <p className="text-[10px] text-slate-400">Human-readable portal header label shown to logged-in users.</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Role Category</Label>
                  <Select
                    value={roleConfig.category}
                    onValueChange={v => {
                      setRoleConfig({ ...roleConfig, category: v });
                      setHasUnsavedChanges(true);
                    }}
                  >
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Academic">Academic</SelectItem>
                      <SelectItem value="Administration">Administration</SelectItem>
                      <SelectItem value="Student & Parent">Student & Parent</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                      <SelectItem value="Operations">Operations</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Institutional Purpose & Description</Label>
                <Textarea
                  value={roleConfig.description}
                  onChange={e => {
                    setRoleConfig({ ...roleConfig, description: e.target.value });
                    setHasUnsavedChanges(true);
                  }}
                  className="text-xs min-h-[80px] bg-slate-50/50"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Role Operational Status</h4>
                  <p className="text-[11px] text-slate-500">
                    If suspended, users assigned to this role in {college.code} cannot log into the portal.
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={roleConfig.status === 'active'}
                    disabled={roleKey === 'admin'}
                    onCheckedChange={checked => {
                      setRoleConfig({ ...roleConfig, status: checked ? 'active' : 'suspended' });
                      setHasUnsavedChanges(true);
                    }}
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    {roleConfig.status === 'active' ? 'Active' : 'Suspended'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =========================================================================
            TAB 2: CAPABILITY REGISTRY
           ========================================================================= */}
        <TabsContent value="capabilities">
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-600" />
                  Institutional Capability Registry
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Granular functional capabilities wired to real backend endpoints and database services.
                </CardDescription>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <Input
                    placeholder="Search capabilities or backend action..."
                    value={capSearch}
                    onChange={e => setCapSearch(e.target.value)}
                    className="pl-8 text-xs h-8 bg-slate-50"
                  />
                </div>
                <Select value={capCategoryFilter} onValueChange={setCapCategoryFilter}>
                  <SelectTrigger className="h-8 text-xs w-44">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Categories</SelectItem>
                    <SelectItem value="Academic Operations">Academic Operations</SelectItem>
                    <SelectItem value="Data Management">Data Management</SelectItem>
                    <SelectItem value="Financial Transactions">Financial Transactions</SelectItem>
                    <SelectItem value="Administrative Governance">Administrative Governance</SelectItem>
                    <SelectItem value="Compliance & Documents">Compliance & Documents</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-xs font-semibold text-slate-600">Capability</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">Module</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">Backend Action</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">Default Scope</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600 text-right">Enabled</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCaps.map(cap => {
                    const isEnabled = roleConfig.enabledCapabilities.includes(cap.id);
                    const collegeMod = collegeModules.find(m => m.id === cap.module);
                    const isModDisabledByCollege = collegeMod && !collegeMod.enabled;

                    return (
                      <TableRow key={cap.id} className="hover:bg-slate-50/60 transition-colors">
                        <TableCell>
                          <div className="space-y-0.5">
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-xs text-slate-800">{cap.name}</span>
                              <Badge variant="outline" className="text-[10px] px-1 py-0 bg-slate-100 text-slate-600">
                                {cap.category}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-slate-500">{cap.description}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={`text-[10px] font-mono ${
                              isModDisabledByCollege 
                                ? 'bg-rose-50 text-rose-700 border-rose-300 line-through' 
                                : 'bg-slate-100 text-slate-700 border-slate-300'
                            }`}
                          >
                            {cap.module}
                          </Badge>
                          {isModDisabledByCollege && (
                            <span className="block text-[9px] text-rose-600 font-semibold mt-0.5">Disabled by College</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs text-indigo-700 bg-indigo-50/60 px-2 py-0.5 rounded border border-indigo-200/50">
                            {cap.backendAction}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 font-mono">
                          {cap.defaultDataScope}
                        </TableCell>
                        <TableCell className="text-right">
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={() => handleToggleCapability(cap.id)}
                            disabled={isModDisabledByCollege}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =========================================================================
            TAB 3: BACKEND ACTIONS
           ========================================================================= */}
        <TabsContent value="backend_actions">
          <Card className="border-slate-200 shadow-xs">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900">Direct Backend Action Permissions</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Directly enable or disable backend actions handled by the API gateway. Disabled actions return HTTP 403 ROLE_ACTION_DISABLED.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(roleConfig.backendActions).map(([actionName, isAllowed]) => (
                  <div 
                    key={actionName} 
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <span className="font-mono text-xs font-bold text-slate-800">{actionName}</span>
                      <p className="text-[11px] text-slate-500">
                        {isAllowed ? 'Action allowed at API gateway' : 'Blocked with HTTP 403 ROLE_ACTION_DISABLED'}
                      </p>
                    </div>
                    <Switch
                      checked={!!isAllowed}
                      onCheckedChange={() => handleToggleBackendAction(actionName)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =========================================================================
            TAB 4: DATA ACCESS SCOPE
           ========================================================================= */}
        <TabsContent value="data_access">
          <Card className="border-slate-200 shadow-xs">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900">Institutional Data Access Boundaries</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Restricts the scope of database records visible and queryable by this role in {college.name}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Students Scope */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <Label className="text-xs font-bold text-slate-800">Student Records Scope</Label>
                  <Select
                    value={roleConfig.dataAccess.studentsScope}
                    onValueChange={(val: any) => {
                      setRoleConfig({
                        ...roleConfig,
                        dataAccess: { ...roleConfig.dataAccess, studentsScope: val }
                      });
                      setHasUnsavedChanges(true);
                    }}
                  >
                    <SelectTrigger className="text-xs h-9 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Students across College</SelectItem>
                      <SelectItem value="assigned_only">Assigned Classes / Students Only</SelectItem>
                      <SelectItem value="department_only">Department Students Only</SelectItem>
                      <SelectItem value="none">No Student Access</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-slate-500">Enforces filter on student queries and attendance rosters.</p>
                </div>

                {/* Faculty Scope */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <Label className="text-xs font-bold text-slate-800">Faculty Directory Scope</Label>
                  <Select
                    value={roleConfig.dataAccess.facultyScope}
                    onValueChange={(val: any) => {
                      setRoleConfig({
                        ...roleConfig,
                        dataAccess: { ...roleConfig.dataAccess, facultyScope: val }
                      });
                      setHasUnsavedChanges(true);
                    }}
                  >
                    <SelectTrigger className="text-xs h-9 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Faculty across College</SelectItem>
                      <SelectItem value="department_only">Own Department Faculty Only</SelectItem>
                      <SelectItem value="none">No Faculty Directory Access</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-slate-500">Governs staff contacts and peer allocations.</p>
                </div>

                {/* Finance Scope */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <Label className="text-xs font-bold text-slate-800">Finance & Fee Ledger Scope</Label>
                  <Select
                    value={roleConfig.dataAccess.financeScope}
                    onValueChange={(val: any) => {
                      setRoleConfig({
                        ...roleConfig,
                        dataAccess: { ...roleConfig.dataAccess, financeScope: val }
                      });
                      setHasUnsavedChanges(true);
                    }}
                  >
                    <SelectTrigger className="text-xs h-9 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Full Fee Collections & Accounts</SelectItem>
                      <SelectItem value="summary_only">Aggregate Summary Reports Only</SelectItem>
                      <SelectItem value="none">Strictly Blocked (No Financial Access)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-slate-500">Restricts ledger view and fee collection endpoints.</p>
                </div>

                {/* Academics Scope */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <Label className="text-xs font-bold text-slate-800">Academic & Timetable Scope</Label>
                  <Select
                    value={roleConfig.dataAccess.academicsScope}
                    onValueChange={(val: any) => {
                      setRoleConfig({
                        ...roleConfig,
                        dataAccess: { ...roleConfig.dataAccess, academicsScope: val }
                      });
                      setHasUnsavedChanges(true);
                    }}
                  >
                    <SelectTrigger className="text-xs h-9 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Programs & Classes</SelectItem>
                      <SelectItem value="assigned_only">Assigned Teaching Timetable Only</SelectItem>
                      <SelectItem value="department_only">Department Timetables Only</SelectItem>
                      <SelectItem value="none">No Academic Access</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-slate-500">Controls class workspaces and teaching update logs.</p>
                </div>
              </div>

              {/* Sensitive Export */}
              <div className="flex items-center justify-between p-3.5 bg-amber-50/60 rounded-xl border border-amber-200">
                <div>
                  <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-700" />
                    Allow Sensitive Data Export (CSV / PDF)
                  </h4>
                  <p className="text-[11px] text-amber-700">
                    Enables student phone numbers, guardian contacts, fee payment ledgers, and PII exports.
                  </p>
                </div>
                <Switch
                  checked={roleConfig.dataAccess.allowSensitiveExport}
                  onCheckedChange={checked => {
                    setRoleConfig({
                      ...roleConfig,
                      dataAccess: { ...roleConfig.dataAccess, allowSensitiveExport: checked }
                    });
                    setHasUnsavedChanges(true);
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =========================================================================
            TAB 5: CRUD MATRIX
           ========================================================================= */}
        <TabsContent value="crud">
          <Card className="border-slate-200 shadow-xs">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900">Entity CRUD Authorization Matrix</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Configure View, Create, Edit, Delete, Approve, and Export permissions across all operational database entities.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-xs font-semibold text-slate-700">Database Entity</TableHead>
                    <TableHead className="text-xs font-semibold text-center text-slate-700">View</TableHead>
                    <TableHead className="text-xs font-semibold text-center text-slate-700">Create</TableHead>
                    <TableHead className="text-xs font-semibold text-center text-slate-700">Edit</TableHead>
                    <TableHead className="text-xs font-semibold text-center text-slate-700">Delete</TableHead>
                    <TableHead className="text-xs font-semibold text-center text-slate-700">Approve</TableHead>
                    <TableHead className="text-xs font-semibold text-center text-slate-700">Export</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {DEFAULT_CRUD_ENTITIES.map(entity => {
                    const rule = roleConfig.crud[entity] || {
                      view: false, create: false, edit: false, delete: false, approve: false, export: false
                    };

                    return (
                      <TableRow key={entity} className="hover:bg-slate-50/50">
                        <TableCell className="font-semibold text-xs text-slate-800">
                          {entity}
                        </TableCell>
                        <TableCell className="text-center">
                          <input
                            type="checkbox"
                            checked={rule.view}
                            onChange={() => handleToggleCrud(entity, 'view')}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <input
                            type="checkbox"
                            checked={rule.create}
                            onChange={() => handleToggleCrud(entity, 'create')}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <input
                            type="checkbox"
                            checked={rule.edit}
                            onChange={() => handleToggleCrud(entity, 'edit')}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <input
                            type="checkbox"
                            checked={rule.delete}
                            onChange={() => handleToggleCrud(entity, 'delete')}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <input
                            type="checkbox"
                            checked={rule.approve}
                            onChange={() => handleToggleCrud(entity, 'approve')}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <input
                            type="checkbox"
                            checked={rule.export}
                            onChange={() => handleToggleCrud(entity, 'export')}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =========================================================================
            TAB 6: BUSINESS LOGIC
           ========================================================================= */}
        <TabsContent value="business_rules">
          <Card className="border-slate-200 shadow-xs">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900">Institutional Business Rules & Operational Policies</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Enforced in backend validations and database transactions for this role.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Assigned Classes Attendance Only</h4>
                    <p className="text-[11px] text-slate-500">
                      User can only record and view attendance for classes officially assigned in faculty directory.
                    </p>
                  </div>
                  <Switch
                    checked={roleConfig.businessRules.assignedClassesAttendanceOnly}
                    onCheckedChange={() => handleToggleBusinessRule('assignedClassesAttendanceOnly')}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Assigned Subjects Marks Only</h4>
                    <p className="text-[11px] text-slate-500">
                      User can submit examination marks only for courses where they are the designated instructor.
                    </p>
                  </div>
                  <Switch
                    checked={roleConfig.businessRules.assignedSubjectsMarksOnly}
                    onCheckedChange={() => handleToggleBusinessRule('assignedSubjectsMarksOnly')}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Strictly Restrict Finance Access</h4>
                    <p className="text-[11px] text-slate-500">
                      Completely blocks all fee collections, concessions, invoices, and accounting endpoints.
                    </p>
                  </div>
                  <Switch
                    checked={roleConfig.businessRules.restrictFinanceAccess}
                    onCheckedChange={() => handleToggleBusinessRule('restrictFinanceAccess')}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Allow Fee Collection & Challans</h4>
                    <p className="text-[11px] text-slate-500">
                      Authorizes collecting student tuition, examination, and hostel fees.
                    </p>
                  </div>
                  <Switch
                    checked={roleConfig.businessRules.allowFeeCollection}
                    onCheckedChange={() => handleToggleBusinessRule('allowFeeCollection')}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Allow Student Account Provisioning</h4>
                    <p className="text-[11px] text-slate-500">
                      Allows generating permanent STU-ID and initializing initial user credentials from admissions.
                    </p>
                  </div>
                  <Switch
                    checked={roleConfig.businessRules.allowStudentProvisioning}
                    onCheckedChange={() => handleToggleBusinessRule('allowStudentProvisioning')}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Allow Certificate Generation & Issuance</h4>
                    <p className="text-[11px] text-slate-500">
                      Authorizes printing and downloading official bonafide and transfer certificates.
                    </p>
                  </div>
                  <Switch
                    checked={roleConfig.businessRules.allowCertificateGeneration}
                    onCheckedChange={() => handleToggleBusinessRule('allowCertificateGeneration')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =========================================================================
            TAB 7: MODULES & FEATURES
           ========================================================================= */}
        <TabsContent value="modules">
          <Card className="border-slate-200 shadow-xs">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900">Module & Feature Permissions for Role</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Inherits from {college.name} blueprint. A module disabled for the college cannot be enabled for a role.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {collegeModules.map(mod => {
                  const isRoleAllowed = roleConfig.enabledModules.includes(mod.id);
                  const isCollegeAllowed = mod.enabled;

                  return (
                    <div 
                      key={mod.id} 
                      className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
                        !isCollegeAllowed 
                          ? 'bg-slate-100/60 border-slate-200 opacity-60' 
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs text-slate-800">{mod.name}</span>
                          {!isCollegeAllowed && (
                            <Badge variant="outline" className="text-[10px] text-rose-600 border-rose-200 bg-rose-50">
                              Disabled at College
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">{mod.description}</p>
                      </div>
                      <Switch
                        checked={isRoleAllowed && isCollegeAllowed}
                        disabled={!isCollegeAllowed}
                        onCheckedChange={checked => {
                          const updated = checked
                            ? [...roleConfig.enabledModules, mod.id]
                            : roleConfig.enabledModules.filter(id => id !== mod.id);
                          setRoleConfig({ ...roleConfig, enabledModules: updated });
                          setHasUnsavedChanges(true);
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =========================================================================
            TAB 8: WORKFLOWS
           ========================================================================= */}
        <TabsContent value="workflows">
          <Card className="border-slate-200 shadow-xs">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900">Institutional Workflow Participation</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Configure role responsibility stages for multi-step approval workflows in {college.name}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(roleConfig.workflowParticipation).map(([wfId, participation]) => (
                <div key={wfId} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-slate-800 font-mono">{wfId}</h4>
                      <p className="text-[11px] text-slate-500">Lifecycle stage participation for this role</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <label className="flex items-center space-x-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={participation.canInitiate}
                        onChange={() => {
                          setRoleConfig({
                            ...roleConfig,
                            workflowParticipation: {
                              ...roleConfig.workflowParticipation,
                              [wfId]: { ...participation, canInitiate: !participation.canInitiate }
                            }
                          });
                          setHasUnsavedChanges(true);
                        }}
                        className="rounded border-slate-300 text-indigo-600"
                      />
                      <span className="font-semibold text-slate-700 text-[11px]">Can Initiate</span>
                    </label>

                    <label className="flex items-center space-x-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={participation.canApprove}
                        onChange={() => {
                          setRoleConfig({
                            ...roleConfig,
                            workflowParticipation: {
                              ...roleConfig.workflowParticipation,
                              [wfId]: { ...participation, canApprove: !participation.canApprove }
                            }
                          });
                          setHasUnsavedChanges(true);
                        }}
                        className="rounded border-slate-300 text-indigo-600"
                      />
                      <span className="font-semibold text-slate-700 text-[11px]">Can Approve</span>
                    </label>

                    <label className="flex items-center space-x-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={participation.canReject}
                        onChange={() => {
                          setRoleConfig({
                            ...roleConfig,
                            workflowParticipation: {
                              ...roleConfig.workflowParticipation,
                              [wfId]: { ...participation, canReject: !participation.canReject }
                            }
                          });
                          setHasUnsavedChanges(true);
                        }}
                        className="rounded border-slate-300 text-indigo-600"
                      />
                      <span className="font-semibold text-slate-700 text-[11px]">Can Reject</span>
                    </label>

                    <label className="flex items-center space-x-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={participation.canCancel}
                        onChange={() => {
                          setRoleConfig({
                            ...roleConfig,
                            workflowParticipation: {
                              ...roleConfig.workflowParticipation,
                              [wfId]: { ...participation, canCancel: !participation.canCancel }
                            }
                          });
                          setHasUnsavedChanges(true);
                        }}
                        className="rounded border-slate-300 text-indigo-600"
                      />
                      <span className="font-semibold text-slate-700 text-[11px]">Can Cancel</span>
                    </label>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* =========================================================================
            TAB 9: SIMULATOR & SANDBOX
           ========================================================================= */}
        <TabsContent value="simulator">
          <Card className="border-slate-200 shadow-xs">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-indigo-600" />
                Live Role Execution Sandbox & Verification
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Simulate backend API action execution under this role's configured permissions and institutional rules.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="w-full sm:w-80">
                  <Label className="text-xs font-semibold text-slate-700 mb-1 block">Test Backend Action</Label>
                  <Select value={simulatedAction} onValueChange={setSimulatedAction}>
                    <SelectTrigger className="text-xs h-9 bg-slate-50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="record_attendance">record_attendance</SelectItem>
                      <SelectItem value="create_assignment">create_assignment</SelectItem>
                      <SelectItem value="submit_marks">submit_marks</SelectItem>
                      <SelectItem value="collect_fee_payment">collect_fee_payment</SelectItem>
                      <SelectItem value="generate_fee_receipt">generate_fee_receipt</SelectItem>
                      <SelectItem value="create_admission_application">create_admission_application</SelectItem>
                      <SelectItem value="provision_student_account">provision_student_account</SelectItem>
                      <SelectItem value="set_active_status">set_active_status (Manage User)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:self-end w-full sm:w-auto">
                  <Button
                    onClick={handleSimulateAction}
                    className="w-full sm:w-auto text-xs h-9 bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-xs"
                  >
                    <PlayCircle className="w-4 h-4" />
                    Simulate Gateway Execution
                  </Button>
                </div>
              </div>

              {simulationResult && (
                <div className={`p-4 rounded-xl border text-xs font-mono space-y-1.5 ${
                  simulationResult.authorized 
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
                    : 'bg-rose-50 text-rose-900 border-rose-300'
                }`}>
                  <div className="flex items-center gap-2 font-bold">
                    {simulationResult.authorized ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                    )}
                    <span>HTTP {simulationResult.status} — {simulationResult.authorized ? 'ACCESS GRANTED' : 'ACCESS DENIED'}</span>
                  </div>
                  <p className="text-[11px] font-sans text-slate-700">
                    {simulationResult.reason}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* =========================================================================
          MODAL 1: VALIDATION RESULTS
         ========================================================================= */}
      <Dialog open={isValidationModalOpen} onOpenChange={setIsValidationModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-indigo-600" />
              Role Configuration Validation Report
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Evaluated {roleConfig.label} against institutional safety rules and college blueprints.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-2 max-h-80 overflow-y-auto">
            {validationIssues.length === 0 ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold">All Validation Checks Passed</span>
                  <p className="text-[11px] text-emerald-700">This role configuration is healthy and ready to publish.</p>
                </div>
              </div>
            ) : (
              validationIssues.map((issue, idx) => (
                <div 
                  key={idx} 
                  className={`p-3 rounded-lg border text-xs space-y-0.5 ${
                    issue.type === 'error'
                      ? 'bg-rose-50 border-rose-300 text-rose-900'
                      : issue.type === 'security'
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : 'bg-blue-50 border-blue-300 text-blue-900'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span>{issue.title}</span>
                    <Badge variant="outline" className="text-[9px] uppercase font-mono">
                      {issue.type}
                    </Badge>
                  </div>
                  <p className="text-[11px] opacity-90">{issue.description}</p>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setIsValidationModalOpen(false)} className="text-xs">
              Dismiss
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL 2: PUBLISH CONFIRMATION
         ========================================================================= */}
      <Dialog open={isPublishModalOpen} onOpenChange={setIsPublishModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-indigo-600" />
              Publish Role Customization
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              This will update the live software environment for all users assigned to role "{roleConfig.label}" in {college.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-2 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Target College:</span>
                <span className="font-bold text-slate-800">{college.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Role:</span>
                <span className="font-bold text-slate-800">{roleConfig.label} ({roleKey})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Active Capabilities:</span>
                <span className="font-mono font-bold text-indigo-600">{roleConfig.enabledCapabilities.length} capabilities</span>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Release Notes / Change Summary</Label>
              <Textarea
                placeholder="e.g. Enabled clinical attendance marking and restricted finance ledger access..."
                value={releaseSummary}
                onChange={e => setReleaseSummary(e.target.value)}
                className="text-xs min-h-[60px]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button size="sm" variant="outline" onClick={() => setIsPublishModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={handlePublishRole} 
              disabled={publishing}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
            >
              {publishing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              Confirm & Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
