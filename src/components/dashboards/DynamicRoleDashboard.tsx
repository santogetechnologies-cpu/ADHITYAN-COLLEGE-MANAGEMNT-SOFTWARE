import React, { useState, useEffect } from 'react';
import { superAdminService } from '@/services/superAdminService';
import { MasterSystemConfigState, DashboardLayoutConfig, RoleCustomConfig } from '@/types/superAdmin.types';
import { DynamicWidgetRenderer } from '@/components/widgets/DynamicWidgetRenderer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Sliders, Shield } from 'lucide-react';

interface DynamicRoleDashboardProps {
  role: string;
  defaultDashboardComponent: React.ReactNode;
}

export function DynamicRoleDashboard({ role, defaultDashboardComponent }: DynamicRoleDashboardProps) {
  const [dashboardConfig, setDashboardConfig] = useState<DashboardLayoutConfig | null>(null);
  const [roleConfig, setRoleConfig] = useState<RoleCustomConfig | null>(null);
  const [isRestricted, setIsRestricted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadConfig = async () => {
      try {
        const master = await superAdminService.getMasterConfiguration();
        if (isMounted) {
          const rConfig = master.roles[role];
          setRoleConfig(rConfig || null);

          // Check if restricted
          if (rConfig && rConfig.status === 'restricted') {
            setIsRestricted(true);
          }

          const dConfig = master.dashboards[role];
          if (dConfig && dConfig.widgets && dConfig.widgets.length > 0) {
            setDashboardConfig(dConfig);
          }
        }
      } catch (err) {
        console.warn('DynamicRoleDashboard config load notice:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadConfig();
    return () => { isMounted = false; };
  }, [role]);

  // 1. If Super Admin marked this role as restricted:
  if (isRestricted) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-rose-200 bg-rose-50/30 text-center">
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-2">
              <Shield className="w-6 h-6" />
            </div>
            <CardTitle className="text-lg font-bold text-slate-900">Portal Access Restricted</CardTitle>
            <CardDescription className="text-xs text-rose-700">
              The {roleConfig?.label || role} workspace is currently under administrative restriction.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 space-y-2">
            <p>
              The Super Administration has temporarily disabled access to this portal. Please contact the administrative control center for assistance.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 2. If Super Admin configured custom widgets for this role, render widgets + standard component
  return (
    <div className="space-y-6">
      {dashboardConfig && dashboardConfig.widgets.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-slate-200">
            <div className="flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Institutional Executive Widgets
              </h3>
            </div>
            <Badge variant="outline" className="text-[10px] bg-indigo-50 border-indigo-200 text-indigo-700">
              Live Super Admin Configuration
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <DynamicWidgetRenderer placement={w} userRole={role} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Primary Role Workspace View */}
      <div>
        {defaultDashboardComponent}
      </div>
    </div>
  );
}
export default DynamicRoleDashboard;
