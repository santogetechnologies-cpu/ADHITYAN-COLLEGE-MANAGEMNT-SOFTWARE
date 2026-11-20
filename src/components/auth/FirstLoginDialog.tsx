import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  KeyRound, 
  ShieldCheck, 
  User, 
  Lock, 
  ArrowRight, 
  CheckCircle2, 
  Loader2, 
  Copy, 
  Phone, 
  Mail,
  GraduationCap,
  Users
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { studentParentAuthService, FirstLoginChallengeResult } from '@/services/studentParentAuthService';
import { useAuth } from '@/context/AuthContext';

interface FirstLoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultIdentifier?: string;
  defaultRole?: string;
}

export function FirstLoginDialog({
  open,
  onOpenChange,
  defaultIdentifier = '',
  defaultRole,
}: FirstLoginDialogProps) {
  const [step, setStep] = useState<'identifier' | 'verify' | 'set_password'>('identifier');
  const [identifier, setIdentifier] = useState(defaultIdentifier);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [challengeData, setChallengeData] = useState<FirstLoginChallengeResult | null>(null);

  const { toast } = useToast();
  const { login } = useAuth();
  const navigate = useNavigate();

  // Reset when opened
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setStep('identifier');
      setIdentifier(defaultIdentifier);
      setCode('');
      setNewPassword('');
      setConfirmPassword('');
      setChallengeData(null);
    }
    onOpenChange(isOpen);
  };

  // STEP 1: Request verification challenge
  const handleRequestChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter your Student ID, Parent ID, Registered Mobile, or Email.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const challenge = await studentParentAuthService.requestFirstLoginChallenge(identifier.trim(), defaultRole);
      setChallengeData(challenge);
      setStep('verify');
      if (challenge.verification_code) {
        setCode(challenge.verification_code);
      }
      toast({
        title: 'Verification Code Issued',
        description: `Code sent to ${challenge.masked_phone} / ${challenge.masked_email}`,
      });
    } catch (err: any) {
      toast({
        title: 'Identification Failed',
        description: err.message || 'Unable to locate account.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Proceed to Password Step after code is entered
  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter the 6-digit verification code.',
        variant: 'destructive',
      });
      return;
    }
    setStep('set_password');
  };

  // STEP 3: Complete First-Time Password Setup & Automatic Sign-In
  const handleCompleteSetup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || newPassword.length < 6) {
      toast({
        title: 'Weak Password',
        description: 'Password must be at least 6 characters long.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Passwords Do Not Match',
        description: 'Please re-enter your password to match.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const result = await studentParentAuthService.completeFirstLogin(
        identifier.trim(),
        code.trim(),
        newPassword
      );

      toast({
        title: 'Password Set Successfully',
        description: 'Signing you into your portal...',
      });

      // Automatically authenticate and route to dashboard
      const loggedUser = await login(result.email, newPassword);
      onOpenChange(false);

      if (loggedUser) {
        const dest = loggedUser.role === 'parent' ? '/dashboard/parent' : '/dashboard/student';
        navigate(dest, { replace: true });
      }
    } catch (err: any) {
      toast({
        title: 'Password Setup Failed',
        description: err.message || 'Failed to update credentials. Please check your verification code.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-12 h-12 rounded-full bg-blue-100 text-[#1D61E7] flex items-center justify-center mx-auto mb-2">
            <KeyRound className="w-6 h-6" />
          </div>
          <DialogTitle className="text-center text-xl font-bold">
            {step === 'identifier' && 'First-Time Login & Password Setup'}
            {step === 'verify' && 'Contact Verification'}
            {step === 'set_password' && 'Create Your Permanent Password'}
          </DialogTitle>
          <DialogDescription className="text-center text-xs">
            {step === 'identifier' && 'Admitted students and parents can activate their portal credentials here.'}
            {step === 'verify' && 'A one-time verification code was dispatched to your registered contact.'}
            {step === 'set_password' && 'Choose a strong password to secure your institutional portal.'}
          </DialogDescription>
        </DialogHeader>

        {/* STEP 1: IDENTIFIER INPUT */}
        {step === 'identifier' && (
          <form onSubmit={handleRequestChallenge} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="first-login-id" className="text-xs font-semibold">
                {defaultRole === 'student' 
                  ? 'Student ID, Registered Mobile, or Email *' 
                  : defaultRole === 'parent'
                  ? 'Parent ID, Registered Mobile, or Email *'
                  : 'Student ID / Parent ID / Registered Mobile / Email *'}
              </Label>
              <Input
                id="first-login-id"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={
                  defaultRole === 'student'
                    ? 'e.g. STU-2026-1001 or mobile number'
                    : defaultRole === 'parent'
                    ? 'e.g. PAR-2026-1001 or mobile number'
                    : 'e.g. STU-2026-1001, PAR-2026-1001, or mobile'
                }
                className="font-mono text-sm"
                required
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">
                {defaultRole === 'student'
                  ? 'Enter your permanent Student ID (issued upon admission confirmation) or registered mobile number.'
                  : defaultRole === 'parent'
                  ? 'Enter your permanent Parent ID (issued upon student admission confirmation) or registered mobile number.'
                  : 'Enter your permanent Student ID, Parent ID, or registered mobile number.'}
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-[#1D61E7] hover:bg-blue-700 text-white font-semibold">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    Continue <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* STEP 2: VERIFICATION CHALLENGE */}
        {step === 'verify' && challengeData && (
          <form onSubmit={handleVerifyCode} className="space-y-4 py-2">
            <div className="p-3 rounded-lg border bg-blue-50/60 border-blue-100 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-blue-900 flex items-center gap-1.5">
                  {challengeData.role === 'parent' ? <Users className="w-4 h-4 text-purple-600" /> : <GraduationCap className="w-4 h-4 text-blue-600" />}
                  {challengeData.name}
                </span>
                <Badge variant="outline" className="capitalize text-[10px] bg-white border-blue-200">
                  {challengeData.role}
                </Badge>
              </div>
              <div className="text-slate-600 flex flex-col gap-0.5 pt-1 text-[11px]">
                <span>Registered Mobile: <strong>{challengeData.masked_phone}</strong></span>
                <span>Registered Email: <strong>{challengeData.masked_email}</strong></span>
              </div>
            </div>

            {/* Test/Dev OTP Indicator */}
            {challengeData.verification_code && (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-emerald-800 font-semibold block uppercase">Security Verification Code</span>
                  <span className="font-mono font-bold text-base text-emerald-700 tracking-wider">
                    {challengeData.verification_code}
                  </span>
                </div>
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                  onClick={() => setCode(challengeData.verification_code || '')}
                >
                  Use Code
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="verification-code" className="text-xs font-semibold">
                6-Digit Verification Code *
              </Label>
              <Input
                id="verification-code"
                value={code}
                onChange={(e) => setCode(e.target.value.trim())}
                placeholder="123456"
                className="font-mono text-center tracking-widest text-lg font-bold"
                maxLength={6}
                required
                autoFocus
              />
            </div>

            <DialogFooter className="pt-2 flex justify-between">
              <Button type="button" variant="outline" onClick={() => setStep('identifier')}>
                Back
              </Button>
              <Button type="submit" className="bg-[#1D61E7] hover:bg-blue-700 text-white font-semibold">
                Verify Contact <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* STEP 3: SET PASSWORD */}
        {step === 'set_password' && (
          <form onSubmit={handleCompleteSetup} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="first-new-password" className="text-xs font-semibold">
                New Password (minimum 6 characters) *
              </Label>
              <Input
                id="first-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="first-confirm-password" className="text-xs font-semibold">
                Confirm Password *
              </Label>
              <Input
                id="first-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <p className="text-[11px] text-muted-foreground">
              Once saved, your account status will be marked as activated. You can use this password for all future logins.
            </p>

            <DialogFooter className="pt-2 flex justify-between">
              <Button type="button" variant="outline" onClick={() => setStep('verify')}>
                Back
              </Button>
              <Button type="submit" disabled={loading} className="bg-[#1D61E7] hover:bg-blue-700 text-white font-semibold">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving Password...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Save & Sign In
                  </span>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

