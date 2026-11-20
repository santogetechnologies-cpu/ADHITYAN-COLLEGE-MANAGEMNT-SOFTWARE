import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ShieldCheck, 
  Lock, 
  Save, 
  Loader2, 
  Check, 
  X,
  AlertTriangle 
} from 'lucide-react';
import { RoleCustomConfig } from '@/types/superAdmin.types';

interface PermissionManagerSectionProps {
  roles: Record<string, RoleCustomConfig>;
  onSavePermissionsDraft?: (matrix: any) => Promise<boolean>;
}

interface ResourceRule {
  resource: string;
  name: string;
  category: string;
  allowedRoles: Record<string, boolean>; // roleKey -> boolean
}

export function PermissionManagerSection({
  roles,
  onSavePermissionsDraft
}: PermissionManagerSectionProps) {
  const roleKeys = Object.keys(roles);
  const [saving, setSaving] = useState(false);

  // Core system resources matrix
  const defaultResources: ResourceRule[] = [
    {
      resource: 'students_directory',
      name: 'Student Profiles & Directories',
      category: 'Records',
      allowedRoles: { admin: true, principal: true, teacher: true, receptionist: true, finance_manager: true }
    },
    {
      resource: 'attendance_marking',
      name: 'Attendance Daily Marking',
      category: 'Academics',
      allowedRoles: { admin: true, teacher: true }
    },
    {
      resource: 'faculty_leave_approval',
      name: 'Faculty Leave Sanction',
      category: 'Governance',
      allowedRoles: { admin: true, principal: true }
    },
    {
      resource: 'scholarship_sanction',
      name: 'Scholarship Grant Sanction',
      category: 'Governance',
      allowedRoles: { admin: true, principal: true }
    },
    {
      resource: 'candidate_admission_sanction',
      name: 'Candidate Admission Sanction',
      category: 'Governance',
      allowedRoles: { admin: true, principal: true }
    },
    {
      resource: 'financial_ledger',
      name: 'Financial Ledger & Fee Clearance',
      category: 'Finance',
      allowedRoles: { admin: true, finance_manager: true, financier: true, accountant: true }
    },
    {
      resource: 'certificates_signing',
      name: 'Digital Certificate Approval',
      category: 'Governance',
      allowedRoles: { admin: true, principal: true }
    },
    {
      resource: 'broadcast_dispatch',
      name: 'Official Campus Circulars',
      category: 'Communication',
      allowedRoles: { admin: true, principal: true }
    },
    {
      resource: 'system_configuration',
      name: 'Super Admin Control Center',
      category: 'System',
      allowedRoles: { admin: true }
    }
  ];

  const [matrix, setMatrix] = useState<ResourceRule[]>(defaultResources);

  const togglePermission = (resourceKey: string, roleKey: string) => {
    // Safety guard: admin permissions on system_configuration cannot be revoked
    if (roleKey === 'admin' && resourceKey === 'system_configuration') {
      alert('Security Policy: Super Administrator access to system configuration is immutable.');
      return;
    }

    const updated = matrix.map(r => {
      if (r.resource === resourceKey) {
        return {
          ...r,
          allowedRoles: {
            ...r.allowedRoles,
            [roleKey]: !r.allowedRoles[roleKey]
          }
        };
      }
      return r;
    });
    setMatrix(updated);
  };

  const handleSave = async () => {
    if (!onSavePermissionsDraft) return;
    setSaving(true);
    try {
      await onSavePermissionsDraft(matrix);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Role-Based Access Control (RBAC) Matrix
            </h2>
            <Badge variant="outline" className="text-xs border-indigo-200 text-indigo-700 bg-indigo-50">
              Security Governance
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure system capabilities across roles. Backend authorization enforces these policies strictly on every API operation.
          </p>
        </div>

        {onSavePermissionsDraft && (
          <Button
            size="sm"
            disabled={saving}
            onClick={handleSave}
            className="h-8 text-xs font-semibold bg-primary text-primary-foreground shadow-xs shrink-0"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
            Save Permissions Draft
          </Button>
        )}
      </div>

      {/* 2. RBAC Matrix Table */}
      <Card className="border-slate-200 shadow-2xs">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="text-[11px] bg-slate-50/75">
                <TableHead className="font-semibold text-slate-800 min-w-[220px]">
                  Institutional Resource / Action
                </TableHead>
                {roleKeys.slice(0, 9).map(k => (
                  <TableHead key={k} className="text-center font-semibold text-slate-700 text-[10px] uppercase">
                    {roles[k]?.label || k}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {matrix.map((row) => (
                <TableRow key={row.resource} className="text-xs hover:bg-slate-50/50">
                  <TableCell>
                    <div>
                      <span className="font-bold text-slate-900 block">{row.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{row.resource}</span>
                    </div>
                  </TableCell>
                  {roleKeys.slice(0, 9).map(roleKey => {
                    const isAllowed = !!row.allowedRoles[roleKey];
                    const isProtected = roleKey === 'admin' && row.resource === 'system_configuration';
                    return (
                      <TableCell key={roleKey} className="text-center">
                        <button
                          type="button"
                          disabled={isProtected}
                          onClick={() => togglePermission(row.resource, roleKey)}
                          className={`w-6 h-6 rounded-md inline-flex items-center justify-center transition-all ${
                            isAllowed 
                              ? 'bg-emerald-500 text-white shadow-2xs' 
                              : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                          } ${isProtected ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'}`}
                        >
                          {isAllowed ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <X className="w-3 h-3" />}
                        </button>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
