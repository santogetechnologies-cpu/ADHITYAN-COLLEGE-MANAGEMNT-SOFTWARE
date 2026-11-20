import React, { useState } from 'react';
import { UserRole } from '@/context/AuthContext';
import { permissionEnforcementService, RouteAuthorizationResult } from '@/services/permissionEnforcementService';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Key, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Terminal,
  Server,
  Layers,
  Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function SecurityEnforcementView() {
  const [testRole, setTestRole] = useState<UserRole>('student');
  const [testPath, setTestPath] = useState('/exam-management');
  const [testResult, setTestResult] = useState<RouteAuthorizationResult | null>(null);

  const [testEntity, setTestEntity] = useState('fees');
  const [testAction, setTestAction] = useState<'view' | 'create' | 'edit' | 'delete' | 'approve'>('create');
  const [crudResult, setCrudResult] = useState<{ allowed: boolean; reason?: string } | null>(null);

  const handleRunRouteTest = () => {
    const res = permissionEnforcementService.checkRouteAccess(testRole, testPath);
    setTestResult(res);
  };

  const handleRunCrudTest = () => {
    const res = permissionEnforcementService.checkCrudAccess(testRole, testEntity, testAction);
    setCrudResult(res);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Security Overview */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center">
              <ShieldCheck className="w-5 h-5 mr-2 text-indigo-600" />
              Security Gateway & Backend Permission Enforcement
            </h2>
            <p className="text-xs text-slate-500">
              Live audit and diagnostic engine for Route Guards, API Token verification, Supabase RLS policies, and Multi-Tenant Isolation boundaries.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-xs font-semibold">
              <Lock className="w-3 h-3 mr-1 text-emerald-600" /> RLS Enforcement Active
            </Badge>
          </div>
        </div>
      </div>

      {/* 2. Interactive Permission & Route Diagnostics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Route Access Simulator */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center">
              <Terminal className="w-4 h-4 mr-2 text-indigo-600" />
              Live Route Protection Inspector
            </h3>
            <p className="text-xs text-slate-500">Simulate a browser navigation attempt to verify if ProtectedRoute permits or blocks access.</p>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Simulated User Role</label>
              <Select value={testRole} onValueChange={(val: any) => setTestRole(val)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="finance_manager">Finance Manager</SelectItem>
                  <SelectItem value="receptionist">Receptionist</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="principal">Principal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Requested URL Path</label>
              <Select value={testPath} onValueChange={setTestPath}>
                <SelectTrigger className="h-8 text-xs font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="/dashboard">/dashboard (Core)</SelectItem>
                  <SelectItem value="/principal">/principal (Governance)</SelectItem>
                  <SelectItem value="/exam-management">/exam-management (Exams)</SelectItem>
                  <SelectItem value="/library-management">/library-management (Library)</SelectItem>
                  <SelectItem value="/admission-management">/admission-management (Admissions)</SelectItem>
                  <SelectItem value="/store">/store (Campus Store)</SelectItem>
                  <SelectItem value="/track-bus">/track-bus (Transport)</SelectItem>
                  <SelectItem value="/admin/naac">/admin/naac (NAAC SSR)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              size="sm"
              onClick={handleRunRouteTest}
              className="w-full h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
            >
              Verify Route Authorization
            </Button>

            {testResult && (
              <div className={`p-3 rounded-lg border text-xs mt-3 ${
                testResult.allowed ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                <div className="flex items-center space-x-1.5 font-bold mb-1">
                  {testResult.allowed ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-rose-600" />}
                  <span>{testResult.allowed ? 'ACCESS GRANTED' : 'ACCESS DENIED (403 FORBIDDEN)'}</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  {testResult.allowed 
                    ? `Role "${testRole}" is authorized to access "${testPath}". Route guard will render component.`
                    : testResult.reason || `Route "${testPath}" is restricted for role "${testRole}". Will redirect to: ${testResult.redirectTo}`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Backend CRUD Permission Simulator */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center">
              <Server className="w-4 h-4 mr-2 text-indigo-600" />
              API & CRUD Operation Validator
            </h3>
            <p className="text-xs text-slate-500">Test backend execution rights against published role permissions before dispatching mutations.</p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Target Entity</label>
                <Select value={testEntity} onValueChange={setTestEntity}>
                  <SelectTrigger className="h-8 text-xs font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fees">fees</SelectItem>
                    <SelectItem value="students">students</SelectItem>
                    <SelectItem value="admissions">admissions</SelectItem>
                    <SelectItem value="examinations">examinations</SelectItem>
                    <SelectItem value="attendance">attendance</SelectItem>
                    <SelectItem value="courses">courses</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">CRUD Action</label>
                <Select value={testAction} onValueChange={(val: any) => setTestAction(val)}>
                  <SelectTrigger className="h-8 text-xs font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">view</SelectItem>
                    <SelectItem value="create">create</SelectItem>
                    <SelectItem value="edit">edit</SelectItem>
                    <SelectItem value="delete">delete</SelectItem>
                    <SelectItem value="approve">approve</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              size="sm"
              onClick={handleRunCrudTest}
              className="w-full h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
            >
              Verify CRUD Permission
            </Button>

            {crudResult && (
              <div className={`p-3 rounded-lg border text-xs mt-3 ${
                crudResult.allowed ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                <div className="flex items-center space-x-1.5 font-bold mb-1">
                  {crudResult.allowed ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-rose-600" />}
                  <span>{crudResult.allowed ? 'PERMISSION GRANTED' : 'PERMISSION DENIED'}</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  {crudResult.allowed 
                    ? `Role "${testRole}" holds permission to perform "${testAction}" on "${testEntity}".`
                    : crudResult.reason}
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 3. Security Boundary Telemetry */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center">
          <Database className="w-4 h-4 mr-2 text-indigo-600" />
          Active Institutional Security Boundaries
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
            <span className="font-bold text-slate-800 block mb-1">Tenant Boundary Isolation</span>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Every data query strictly filters on `college_id`. Direct cross-college read/write requests are rejected at the gateway.
            </p>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
            <span className="font-bold text-slate-800 block mb-1">Row Level Security (RLS)</span>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Supabase RLS policies enforce student and faculty row filtering based on authenticated `auth.uid()` claims.
            </p>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
            <span className="font-bold text-slate-800 block mb-1">Comprehensive Audit Logging</span>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              All configuration changes, role updates, and user modifications automatically append immutable records to `audit_logs`.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
