import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { 
  Settings as SettingsIcon, 
  User, 
  Lock, 
  ShieldCheck, 
  KeyRound, 
  Building2, 
  CheckCircle2, 
  AlertTriangle,
  Loader2,
  Mail,
  Award
} from 'lucide-react';
import { Profile } from '@/types/database.types';

interface SettingsModuleProps {
  principalProfile?: Profile | null;
}

export function SettingsModule({ principalProfile }: SettingsModuleProps) {
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const [notifications, setNotifications] = useState({
    emailOnLeaveRequest: true,
    emailOnAdmissionSubmit: true,
    emailOnScholarshipSubmit: false,
    dailySummaryDigest: true
  });

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 6 characters.",
        variant: "destructive"
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords Do Not Match",
        description: "Please verify both password fields match.",
        variant: "destructive"
      });
      return;
    }

    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: "Password Updated",
        description: "Your Principal account credentials have been securely updated.",
      });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast({
        title: "Update Failed",
        description: err.message || "Could not update account credentials.",
        variant: "destructive"
      });
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* 1. Header */}
      <div className="pb-1 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Principal Account & Governance Settings
          </h2>
          <Badge variant="outline" className="text-xs border-blue-200 text-blue-700 bg-blue-50">
            Executive Profile
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage your personal credentials, digital authorization seal, and notification preferences.
        </p>
      </div>

      {/* 2. Personal Profile Card */}
      <Card className="border-slate-200 shadow-2xs">
        <CardHeader className="py-3 px-4 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <User className="w-4 h-4 text-primary" />
            <span>Executive Identity & Institutional Affiliation</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Official executive credentials recognized on sanctioned institutional certificates and orders.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground font-medium">Designation / Executive Title</Label>
              <div className="p-2 rounded-md bg-slate-50 border border-slate-200 font-semibold text-slate-800">
                Principal & Dean of Paramedical Sciences
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground font-medium">Institution</Label>
              <div className="p-2 rounded-md bg-slate-50 border border-slate-200 font-semibold text-slate-800 flex items-center space-x-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Adithyan College of Paramedical Sciences</span>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground font-medium">Authorized Executive Name</Label>
              <div className="p-2 rounded-md bg-slate-50 border border-slate-200 font-semibold text-slate-800">
                {principalProfile?.full_name || 'Dr. Principal & Dean'}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground font-medium">Official Executive Email</Label>
              <div className="p-2 rounded-md bg-slate-50 border border-slate-200 font-mono text-slate-800 flex items-center space-x-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{principalProfile?.email || 'principal@gmail.com'}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Password / Credentials Update */}
      <Card className="border-slate-200 shadow-2xs">
        <CardHeader className="py-3 px-4 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Lock className="w-4 h-4 text-primary" />
            <span>Security & Portal Password</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Update your personal password for portal access. Requires minimum 6 characters.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <form onSubmit={handlePasswordChange} className="space-y-3 max-w-md text-xs">
            <div className="space-y-1">
              <Label className="text-slate-700 font-semibold">New Account Password</Label>
              <Input
                type="password"
                required
                placeholder="Enter new secure password..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-slate-700 font-semibold">Confirm New Password</Label>
              <Input
                type="password"
                required
                placeholder="Re-enter new password..."
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <Button
              type="submit"
              size="sm"
              disabled={updatingPassword}
              className="h-8 text-xs font-semibold bg-primary text-primary-foreground mt-1"
            >
              {updatingPassword ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Updating Password...
                </>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                  Save New Password
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 4. Notification Preferences */}
      <Card className="border-slate-200 shadow-2xs">
        <CardHeader className="py-3 px-4 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>Executive Notification Preferences</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Configure automated alerts for items requiring Principal sanction.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 border border-slate-100">
            <div>
              <p className="font-semibold text-slate-800">Faculty Leave Sanction Alerts</p>
              <p className="text-[11px] text-muted-foreground">Notify immediately when faculty submit urgent leave requests</p>
            </div>
            <input
              type="checkbox"
              checked={notifications.emailOnLeaveRequest}
              onChange={(e) => setNotifications({ ...notifications, emailOnLeaveRequest: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 border border-slate-100">
            <div>
              <p className="font-semibold text-slate-800">Candidate Admission Intake Alerts</p>
              <p className="text-[11px] text-muted-foreground">Notify when candidate applications are ready for final Principal sanction</p>
            </div>
            <input
              type="checkbox"
              checked={notifications.emailOnAdmissionSubmit}
              onChange={(e) => setNotifications({ ...notifications, emailOnAdmissionSubmit: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 border border-slate-100">
            <div>
              <p className="font-semibold text-slate-800">Daily Institutional Digest</p>
              <p className="text-[11px] text-muted-foreground">Receive evening summary of institutional attendance and pending requests</p>
            </div>
            <input
              type="checkbox"
              checked={notifications.dailySummaryDigest}
              onChange={(e) => setNotifications({ ...notifications, dailySummaryDigest: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
            />
          </div>
        </CardContent>
      </Card>

      {/* 5. Institutional Security & RBAC Guardrail Notice */}
      <Card className="border-blue-200 bg-blue-50/30 shadow-2xs">
        <CardContent className="p-4 flex items-start space-x-3">
          <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-blue-900">
              Institutional RBAC & System Security Policy
            </p>
            <p className="text-slate-600 leading-relaxed">
              As Principal & Dean, your portal grants executive sanction authority across academic approvals, candidate admissions, 
              examinations, departments, and circulars. System-wide user deletion, administrative credential resets, and global database 
              configurations remain strictly isolated to the Central Administrator to ensure separation of institutional duties and regulatory compliance.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
