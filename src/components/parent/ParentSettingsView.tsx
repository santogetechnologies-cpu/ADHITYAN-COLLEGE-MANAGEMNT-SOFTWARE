import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { KeyRound, ShieldCheck, CheckCircle2, Lock, User, LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function ParentSettingsView() {
  const { user, updatePassword, logout } = useAuth();
  const { toast } = useToast();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updating, setUpdating] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || newPassword.length < 6) {
      toast({
        title: 'Weak Password',
        description: 'New password must be at least 6 characters long.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Passwords Do Not Match',
        description: 'Please ensure both passwords match.',
        variant: 'destructive',
      });
      return;
    }

    setUpdating(true);
    try {
      const res = await updatePassword(newPassword);
      if (res.success) {
        toast({
          title: 'Password Updated Successfully',
          description: 'Your new personal password has been saved in Supabase Auth.',
        });
        setNewPassword('');
        setConfirmPassword('');
      } else {
        throw new Error(res.error || 'Failed to update credentials.');
      }
    } catch (err: any) {
      toast({
        title: 'Update Failed',
        description: err.message || 'Could not update password.',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Parent Portal Settings</h2>
        <p className="text-muted-foreground text-sm">
          Manage your account credentials, security preferences, and session controls
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Parent Profile Card */}
        <Card className="rounded-2xl border-border shadow-xs">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <User className="w-4 h-4 text-[#1D61E7]" />
              Account Identification
            </CardTitle>
            <CardDescription className="text-xs">
              Official parent credentials registered with the institution
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-100 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Permanent Parent ID:</span>
                <span className="font-mono font-bold text-purple-800 text-sm">{user?.login_id || 'PAR-2026-0001'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Account Holder:</span>
                <span className="font-semibold text-foreground">{user?.name || 'Authorized Parent'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Registered Phone:</span>
                <span className="font-medium text-foreground">{user?.phone || 'On file'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Access Role:</span>
                <Badge className="bg-purple-100 text-purple-800 border-purple-200 capitalize text-[10px]">
                  Parent / Guardian Access
                </Badge>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-[11px]">
              Child linkages and additions are managed directly by authorized College Administration and Receptionists.
            </div>
          </CardContent>
        </Card>

        {/* Change Password Card */}
        <Card className="rounded-2xl border-border shadow-xs">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-emerald-600" />
              Update Account Password
            </CardTitle>
            <CardDescription className="text-xs">
              Set a strong password for your next login sessions
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <form onSubmit={handleUpdatePassword} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="p-new-pwd">New Password (minimum 6 characters)</Label>
                <Input
                  id="p-new-pwd"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="p-confirm-pwd">Confirm New Password</Label>
                <Input
                  id="p-confirm-pwd"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <Button type="submit" disabled={updating} className="w-full bg-[#1D61E7] hover:bg-blue-700 text-white font-semibold">
                {updating ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving Password...
                  </span>
                ) : (
                  'Update Password'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

