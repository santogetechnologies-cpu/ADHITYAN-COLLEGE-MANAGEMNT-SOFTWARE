import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCollege } from '@/context/CollegeContext';
import { multiCollegeService } from '@/services/multiCollegeService';
import { College, PlatformAuditLog } from '@/types/multiCollege.types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  Shield, 
  Users, 
  GraduationCap, 
  PlusCircle, 
  Sliders, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight,
  Sparkles,
  ExternalLink,
  Layers,
  Activity
} from 'lucide-react';

export function PlatformOverview() {
  const navigate = useNavigate();
  const { collegesList, currentCollege, switchCollege } = useCollege();
  const [auditLogs, setAuditLogs] = useState<PlatformAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAudit = async () => {
      try {
        const logs = await multiCollegeService.listPlatformAuditLogs({ limit: 6 });
        setAuditLogs(logs);
      } finally {
        setIsLoading(false);
      }
    };
    loadAudit();
  }, []);

  const activeColleges = collegesList.filter(c => c.status === 'active');
  const suspendedColleges = collegesList.filter(c => c.status === 'suspended' || c.status === 'inactive');

  return (
    <div className="space-y-6">
      
      {/* 1. Platform Master Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              Platform Super Admin Control Hub
            </h1>
            <Badge className="bg-emerald-600 text-white text-xs font-semibold">
              Live & Isolated
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Global management portal for independent colleges: multi-tenant architecture, software configuration, and role portal customization.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            onClick={() => navigate('/platform-admin/provision')}
            className="h-8 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
            Provision New College
          </Button>
        </div>
      </div>

      {/* 2. Platform Telemetry Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Colleges</p>
                <p className="text-2xl font-bold text-slate-900 mt-0.5">{collegesList.length}</p>
                <p className="text-[10px] text-emerald-600 font-medium mt-0.5">{activeColleges.length} Active Environments</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Tenant Security</p>
                <p className="text-xl font-bold text-emerald-700 mt-0.5">100% Isolated</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Database RLS & Scoped RBAC</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Config Templates</p>
                <p className="text-2xl font-bold text-slate-900 mt-0.5">3 Built-in</p>
                <p className="text-[10px] text-indigo-600 mt-0.5">Paramedical & Multi-Disc</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Platform Health</p>
                <p className="text-xl font-bold text-slate-900 mt-0.5">Operational</p>
                <p className="text-[10px] text-emerald-600 font-medium mt-0.5">All Clusters Healthy</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Registered Colleges Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Registered College Environments ({collegesList.length})
            </h2>
            <p className="text-xs text-muted-foreground">
              Each college operates as a fully independent software environment with its own private database partition.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/platform-admin/colleges')}
            className="h-8 text-xs font-semibold"
          >
            View Directory &rarr;
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collegesList.map((col) => {
            const isSelected = col.id === currentCollege.id;
            return (
              <Card 
                key={col.id} 
                className={`border transition-all hover:shadow-md ${
                  isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-white' : 'border-slate-200 bg-white'
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                        {col.code.slice(0, 3)}
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold text-slate-900 line-clamp-1">{col.name}</CardTitle>
                        <CardDescription className="text-xs font-mono text-indigo-600">{col.code}</CardDescription>
                      </div>
                    </div>
                    <Badge variant={col.status === 'active' ? 'default' : 'secondary'} className="text-[9px] uppercase font-semibold">
                      {col.status}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1 text-[11px] text-slate-600">
                    <div className="flex justify-between">
                      <span>Type:</span>
                      <span className="font-semibold text-slate-800">{col.institution_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Admin:</span>
                      <span className="font-semibold text-slate-800 truncate max-w-[150px]">{col.admin_email || col.contact_email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Active Release:</span>
                      <span className="font-mono text-indigo-700 font-bold">{col.current_version}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => {
                        switchCollege(col.id);
                        navigate(`/platform-admin/workspace/${col.id}`);
                      }}
                      className="flex-1 h-8 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                    >
                      <Sliders className="w-3.5 h-3.5 mr-1.5" />
                      Configure Workspace
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate('/admin')}
                      className="h-8 text-xs text-slate-700"
                      title="Preview this college as Admin"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 4. Recent Platform Audit Activity */}
      <Card className="border-slate-200 shadow-2xs">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <ClipboardList className="w-4 h-4 text-indigo-600" />
                <span>Recent Platform Audit Trail</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Immutable record of Super Admin college creations, configuration releases, and status changes.
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/platform-admin/audit-logs')}
              className="text-xs text-indigo-600"
            >
              Full Trail &rarr;
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {auditLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No recent platform audit entries recorded.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-3 text-xs flex items-center justify-between hover:bg-slate-50/50">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-[10px] text-slate-400">
                      {new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div>
                      <p className="font-semibold text-slate-800">
                        {log.action.replace(/_/g, ' ')}
                      </p>
                      <span className="text-[10px] text-slate-500">
                        Target: {log.college_code || log.entity_id} • By: {log.super_admin_email}
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono text-indigo-700 bg-indigo-50 border-indigo-200">
                    {log.entity_type}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}

export default PlatformOverview;
