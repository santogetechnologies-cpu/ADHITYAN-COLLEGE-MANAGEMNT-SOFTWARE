import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Eye, 
  Monitor, 
  Tablet, 
  Smartphone, 
  Layers, 
  ExternalLink, 
  ShieldCheck, 
  Sliders, 
  Sparkles,
  ArrowRight,
  UserCheck
} from 'lucide-react';
import { MasterSystemConfigState, UserRole } from '@/types/superAdmin.types';
import { DynamicWidgetRenderer } from '@/components/widgets/DynamicWidgetRenderer';

interface PreviewModeSectionProps {
  config: MasterSystemConfigState;
  onNavigateSection: (sectionId: string, roleParam?: string) => void;
}

export function PreviewModeSection({ config, onNavigateSection }: PreviewModeSectionProps) {
  const [selectedRole, setSelectedRole] = useState<string>('principal');
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [configSource, setConfigSource] = useState<'live' | 'draft'>('draft');

  const roleConfig = config.roles[selectedRole] || {
    role: selectedRole as any,
    label: (selectedRole || 'ROLE').toUpperCase(),
    category: 'Operations',
    status: 'active',
    allowedModules: [],
    permissions: [],
    visibleWidgets: []
  };

  const navConfig = config.navigation[selectedRole] || { items: [] };
  const dashboardConfig = config.dashboards[selectedRole] || { widgets: [] };

  const getViewportWidth = () => {
    switch (viewport) {
      case 'mobile': return 'max-w-[390px]';
      case 'tablet': return 'max-w-[768px]';
      default: return 'w-full';
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Multi-Role Interactive Portal Preview
            </h2>
            <Badge variant="outline" className="text-xs border-indigo-200 text-indigo-700 bg-indigo-50">
              Live Responsive Simulator
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Test and preview exactly how each role's dashboard, widgets, navigation, and authorized permissions render.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigateSection('dashboards', selectedRole)}
            className="h-8 text-xs font-medium"
          >
            <Sliders className="w-3.5 h-3.5 mr-1.5" />
            Customize {roleConfig.label} Dashboard
          </Button>
        </div>
      </div>

      {/* 2. Controls Toolbar (Role Selector, Device, Source) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="flex items-center space-x-3">
          <label className="text-xs font-semibold text-slate-700">Preview Role:</label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="h-8 text-xs font-medium border border-slate-300 rounded-md px-2.5 bg-white text-slate-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {Object.values(config.roles).map((r) => (
              <option key={r.role} value={r.role}>
                {r.label} ({r.role})
              </option>
            ))}
          </select>
          <Badge variant="outline" className="text-[10px] bg-white text-slate-600">
            {roleConfig.category}
          </Badge>
        </div>

        {/* Viewport Selectors */}
        <div className="flex items-center space-x-1 bg-white p-1 rounded-md border border-slate-200 shadow-2xs">
          <button
            type="button"
            onClick={() => setViewport('desktop')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              viewport === 'desktop' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Desktop</span>
          </button>

          <button
            type="button"
            onClick={() => setViewport('tablet')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              viewport === 'tablet' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Tablet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tablet</span>
          </button>

          <button
            type="button"
            onClick={() => setViewport('mobile')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              viewport === 'mobile' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mobile</span>
          </button>
        </div>

        {/* Configuration State Toggle */}
        <div className="flex items-center space-x-1 bg-white p-1 rounded-md border border-slate-200 text-xs shadow-2xs">
          <button
            type="button"
            onClick={() => setConfigSource('draft')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              configSource === 'draft' ? 'bg-amber-100 text-amber-800' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Draft Preview
          </button>
          <button
            type="button"
            onClick={() => setConfigSource('live')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              configSource === 'live' ? 'bg-emerald-100 text-emerald-800' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Published Live
          </button>
        </div>
      </div>

      {/* 3. Interactive Preview Frame */}
      <div className="flex justify-center p-4 bg-slate-100 rounded-xl border border-slate-200 min-h-[560px] overflow-x-auto">
        <div className={`transition-all duration-300 w-full ${getViewportWidth()} bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col`}>
          
          {/* Simulated Browser / Portal Navbar */}
          <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center font-bold text-xs text-white">
                A
              </div>
              <span className="font-semibold text-xs tracking-tight">Adithyan College ERP</span>
              <span className="text-slate-500 text-xs">/</span>
              <span className="text-indigo-400 text-xs font-medium">{roleConfig.label} Workspace</span>
            </div>

            <div className="flex items-center space-x-2">
              <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-[10px]">
                {selectedRole}
              </Badge>
              <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-200">
                {(selectedRole || 'RO').slice(0, 2).toUpperCase()}
              </div>
            </div>
          </div>

          {/* Simulated Navigation Bar */}
          {navConfig.items && navConfig.items.length > 0 && (
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center space-x-2 overflow-x-auto text-xs">
              {navConfig.items.filter(i => i.visible).map((nav) => (
                <div
                  key={nav.id}
                  className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 font-medium whitespace-nowrap shadow-2xs text-[11px]"
                >
                  {nav.label}
                  {nav.badge && <span className="ml-1.5 px-1 py-0.2 bg-indigo-100 text-indigo-700 rounded text-[9px]">{nav.badge}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Simulated Dashboard Content */}
          <div className="p-4 flex-1 space-y-4 bg-slate-50/50">
            {/* Header greeting */}
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Welcome, {roleConfig.label}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Academic Year: {config.globalSettings.academicYear} • Term: {config.globalSettings.currentSemester}
                </p>
              </div>
              <Badge variant={roleConfig.status === 'active' ? 'default' : 'destructive'} className="text-[10px]">
                {roleConfig.status === 'active' ? 'Portal Active' : 'Restricted'}
              </Badge>
            </div>

            {/* Render configured widgets using DynamicWidgetRenderer */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-slate-700">Configured Widgets & Dashboards</h4>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {dashboardConfig.widgets?.length || 0} Widgets Active
                </span>
              </div>

              {(!dashboardConfig.widgets || dashboardConfig.widgets.length === 0) ? (
                <div className="text-center py-10 bg-white border border-dashed border-slate-300 rounded-lg">
                  <p className="text-xs text-muted-foreground">No widgets configured for this role.</p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => onNavigateSection('dashboards', selectedRole)}
                    className="text-xs text-indigo-600 mt-1"
                  >
                    Configure Widgets in Dashboard Builder &rarr;
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {dashboardConfig.widgets.map((w) => (
                    <div
                      key={w.instanceId}
                      className={
                        w.colSpan === 4 ? 'col-span-1 md:col-span-4' :
                        w.colSpan === 3 ? 'col-span-1 md:col-span-3' :
                        w.colSpan === 2 ? 'col-span-1 md:col-span-2' :
                        'col-span-1'
                      }
                    >
                      <DynamicWidgetRenderer placement={w} userRole={selectedRole} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Access Permissions Summary */}
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs space-y-2">
              <h4 className="text-xs font-semibold text-slate-700 flex items-center">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 mr-1.5" />
                Authorized Modules & Capabilities
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {roleConfig.allowedModules && roleConfig.allowedModules.length > 0 ? (
                  roleConfig.allowedModules.map((mod) => (
                    <Badge key={mod} variant="outline" className="text-[10px] bg-slate-50 text-slate-700 font-medium">
                      {mod}
                    </Badge>
                  ))
                ) : (
                  <span className="text-[11px] text-slate-400 italic">No specific module restrictions applied.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
