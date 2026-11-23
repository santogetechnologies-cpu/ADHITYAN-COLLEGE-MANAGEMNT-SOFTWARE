import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, 
  GraduationCap, 
  Building2, 
  Calendar, 
  Phone, 
  Mail, 
  ShieldCheck, 
  Users, 
  MapPin, 
  Clock 
} from 'lucide-react';
import { Profile } from '@/types/database.types';

interface ParentStudentProfileViewProps {
  student: Profile;
  parentUser: any;
  relationship?: string;
}

export function ParentStudentProfileView({
  student,
  parentUser,
  relationship = 'Parent',
}: ParentStudentProfileViewProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Ward Profile Details</h2>
        <p className="text-muted-foreground text-sm">
          Official institutional enrollment information and parent relationship records
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student Profile Card */}
        <Card className="rounded-2xl shadow-sm border-border">
          <CardContent className="p-6 text-center space-y-4">
            <Avatar className="h-28 w-28 mx-auto border-4 border-[#1D61E7]/20 shadow-lg">
              <AvatarImage src={student.avatar_url} alt={student.name} className="object-cover" />
              <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
                {student.name?.charAt(0) || 'S'}
              </AvatarFallback>
            </Avatar>

            <div>
              <h3 className="text-xl font-bold text-foreground">{student.name}</h3>
              <Badge className="mt-1 bg-blue-50 text-blue-700 border-blue-200 font-mono text-xs">
                Student ID: {student.student_id || student.roll_number || 'AIP-PENDING'}
              </Badge>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Department:</span>
                <span className="font-semibold text-foreground truncate max-w-[150px]">{student.department || 'Paramedical Sciences'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Term / Class:</span>
                <span className="font-semibold text-foreground">{student.class_name || 'Semester 1'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Academic Status:</span>
                <span className="text-emerald-600 font-semibold capitalize">{student.status || 'Active'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Institutional Email:</span>
                <span className="font-mono text-foreground truncate max-w-[150px]">{student.email}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Academic Enrollment & Parent Linkage Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-2xl shadow-sm border-border">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-[#1D61E7]" />
                Academic Enrollment Information
              </CardTitle>
              <CardDescription className="text-xs">
                Central Student Database single source of truth
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-muted-foreground block">Permanent Student ID:</span>
                  <span className="font-mono font-bold text-base text-blue-600">
                    {student.student_id || student.roll_number || 'STU-ID-PENDING'}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground block">Program of Study:</span>
                  <span className="font-semibold text-foreground text-sm">
                    {student.department || 'Paramedical Sciences'}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground block">Current Academic Term:</span>
                  <span className="font-semibold text-foreground">
                    {student.class_name || 'Semester 1'}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground block">Verification Authority:</span>
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Institutional Registrar
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Authorized Parent & Guardian Linkage */}
          <Card className="rounded-2xl shadow-sm border-border">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                Linked Guardian & Parent Credentials
              </CardTitle>
              <CardDescription className="text-xs">
                Official guardian account authorized to monitor this student
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-muted-foreground block">Parent Name:</span>
                  <span className="font-semibold text-foreground text-sm">
                    {parentUser?.name || 'Authorized Parent'} ({relationship})
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground block">Permanent Parent ID:</span>
                  <span className="font-mono font-bold text-base text-purple-600">
                    {parentUser?.login_id || 'PAR-2026-0001'}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground block">Registered Mobile:</span>
                  <span className="font-medium text-foreground">
                    {parentUser?.phone || student.parent_phone || 'Registered on file'}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground block">Registered Email:</span>
                  <span className="font-medium text-foreground truncate block">
                    {parentUser?.email || 'Registered on file'}
                  </span>
                </div>
                <div className="sm:col-span-2 pt-2 border-t border-border/40 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Account Status: Active & Password Verified</span>
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                    <ShieldCheck className="w-3 h-3 mr-1" /> Secure Access
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

