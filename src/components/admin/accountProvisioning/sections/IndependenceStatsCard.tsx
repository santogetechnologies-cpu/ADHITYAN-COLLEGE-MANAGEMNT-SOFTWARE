import React from 'react';
import { OfficialStudentStats } from '@/services/bulkAccountProvisioningService';
import { 
  GraduationCap, 
  UserCheck, 
  Users, 
  Link2, 
  AlertCircle, 
  ShieldCheck, 
  Info,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface IndependenceStatsCardProps {
  stats: OfficialStudentStats;
  isLoading?: boolean;
}

export function IndependenceStatsCard({ stats, isLoading }: IndependenceStatsCardProps) {
  return (
    <div className="space-y-4">
      {/* 1. Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Official Total Students */}
        <div className="bg-white rounded-xl border-2 border-indigo-200 p-4 shadow-2xs relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2 w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center opacity-60">
            <GraduationCap className="w-8 h-8 text-indigo-400" />
          </div>
          <div className="flex items-center space-x-1.5 mb-1">
            <Badge className="bg-indigo-600 text-white text-[10px] font-bold">
              OFFICIAL COUNT
            </Badge>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1">
            {isLoading ? '...' : stats.official_enrolled_students.toLocaleString()}
          </div>
          <div className="text-xs font-bold text-slate-700 mt-1">
            Total Admitted Students
          </div>
          <p className="text-[11px] text-slate-500 mt-1 leading-tight">
            Determined exclusively by approved & enrolled admissions. Independent of login creation.
          </p>
        </div>

        {/* Metric 2: Provisioned Student Logins */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
            <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-200 bg-emerald-50/50">
              Auth Credentials
            </Badge>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono mt-2">
            {isLoading ? '...' : stats.provisioned_student_logins.toLocaleString()}
          </div>
          <div className="text-xs font-bold text-slate-700 mt-1">
            Student Login Accounts
          </div>
          <p className="text-[11px] text-slate-500 mt-1 leading-tight">
            Accounts provisioned for portal sign-in. Creating a login does not alter admission status.
          </p>
        </div>

        {/* Metric 3: Provisioned Parent Accounts */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <div className="w-7 h-7 rounded-lg bg-violet-50 text-violet-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <Badge variant="outline" className="text-[10px] text-violet-700 border-violet-200 bg-violet-50/50">
              Guardians
            </Badge>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono mt-2">
            {isLoading ? '...' : stats.provisioned_parent_accounts.toLocaleString()}
          </div>
          <div className="text-xs font-bold text-slate-700 mt-1">
            Parent Accounts
          </div>
          <p className="text-[11px] text-slate-500 mt-1 leading-tight">
            Guardians with portal credentials. Parent accounts never increase student counts.
          </p>
        </div>

        {/* Metric 4: Active Parent-Student Links */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
              <Link2 className="w-4 h-4" />
            </div>
            <Badge variant="outline" className="text-[10px] text-sky-700 border-sky-200 bg-sky-50/50">
              Verified Links
            </Badge>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono mt-2">
            {isLoading ? '...' : stats.active_parent_student_links.toLocaleString()}
          </div>
          <div className="text-xs font-bold text-slate-700 mt-1">
            Active Student-Parent Links
          </div>
          <p className="text-[11px] text-slate-500 mt-1 leading-tight">
            One parent account supports multiple enrolled children via verified Student ID references.
          </p>
        </div>

      </div>

      {/* 2. System Independence Rules Alert Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <span className="font-bold text-sm tracking-tight">System Independence & Data Integrity Architecture</span>
            </div>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Admission status, student portal login, and parent guardian accounts operate as three decoupled systems. A student is officially counted if and only if their admission application is formally approved.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono shrink-0">
            <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-indigo-200">
              Admission ≠ Login ≠ Parent
            </span>
            <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-emerald-300">
              Pending Logins: {stats.enrolled_without_login}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
