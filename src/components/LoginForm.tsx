import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth, UserRole } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Loader2, User, Mail, Lock, KeyRound, ShieldAlert, Sparkles } from 'lucide-react';
import { ROLE_CONFIGS } from '@/config/roles';
import { parentLinkingService } from '@/services/parentLinkingService';
import { studentParentAuthService } from '@/services/studentParentAuthService';
import { FirstLoginDialog } from '@/components/auth/FirstLoginDialog';

interface LoginFormProps {
  role?: UserRole;
  onBack: () => void;
}

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator Console',
  principal: 'Principal / Dean Dashboard',
  teacher: 'Teaching Faculty Hub',
  student: 'Student Portal',
  parent: 'Parent Portal',
  finance_manager: 'Finance Manager Dashboard',
  financier: 'Finance Dashboard',
  accountant: 'Accounts Dashboard',
  hr_manager: 'HR Manager Dashboard',
  librarian: 'Chief Librarian Dashboard',
  hostel_warden: 'Hostel Warden Dashboard',
  placement_officer: 'Placement Officer Dashboard',
  receptionist: 'Receptionist Desk',
  store_manager: 'Store Manager Dashboard',
  storekeeper: 'Store Dashboard',
  transport_driver: 'Transport Driver Dashboard',
  driver: 'Transport Driver Dashboard',
  naac_coordinator: 'NAAC Coordinator Dashboard',
};

export function LoginForm({ role, onBack }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  const [isFirstLoginOpen, setIsFirstLoginOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const { login, resetPassword, updatePassword, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Check if arriving via password recovery link
  useEffect(() => {
    if (window.location.hash.includes('type=recovery')) {
      setIsRecoveryOpen(true);
    }
  }, []);

  const currentRoleTitle = role ? (ROLE_LABELS[role] || `${role} Portal`) : 'Institutional Portal Sign In';

  const getIdentifierConfig = () => {
    if (role === 'student') {
      return {
        label: 'Email, Student ID, or Mobile',
        placeholder: 'e.g. STU-2026-1001, mobile, or email',
      };
    }
    if (role === 'parent') {
      return {
        label: 'Email, Parent ID, or Mobile',
        placeholder: 'e.g. PAR-2026-1001, mobile, or email',
      };
    }
    return {
      label: 'Email Address or Mobile',
      placeholder: 'e.g. staff@adhityan.edu.in or registered mobile',
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const identifier = email.trim();
    if (!identifier) return;

    // 1. Role-specific input validation rules
    const upperId = identifier.toUpperCase();
    if (role === 'student') {
      if (upperId.startsWith('PAR-') || upperId.startsWith('ADP')) {
        toast({
          title: "Invalid Identifier for Student Portal",
          description: "Parent IDs cannot be used to sign in to the Student Portal. Please use your Student ID (STU-...), registered mobile, or email.",
          variant: "destructive",
        });
        return;
      }
    } else if (role === 'parent') {
      if (upperId.startsWith('STU-') || upperId.startsWith('ADS')) {
        toast({
          title: "Invalid Identifier for Parent Portal",
          description: "Student IDs cannot be used to sign in to the Parent Portal. Please use your Parent ID (PAR-...), registered mobile, or email.",
          variant: "destructive",
        });
        return;
      }
    } else if (role) {
      if (upperId.startsWith('STU-') || upperId.startsWith('PAR-') || upperId.startsWith('ADS') || upperId.startsWith('ADP')) {
        toast({
          title: "Invalid Identifier",
          description: "Student and Parent IDs cannot be used for staff or administrator logins. Please use your institutional email or registered mobile.",
          variant: "destructive",
        });
        return;
      }
    }

    let targetEmail = identifier;
    if (!identifier.includes('@')) {
      // Securely resolve human-readable Login ID or Mobile Number to auth email with role constraint
      const resolved = await studentParentAuthService.resolveLoginIdentifier(identifier, role);
      if (!resolved) {
        const hintText = (role === 'student' || role === 'parent')
          ? `No ${role} account found matching "${identifier}". If this is your first time logging in, please click "First-Time Student or Parent? Set Your Password".`
          : `No account found matching "${identifier}". Please verify your credentials or contact institutional administration.`;
        toast({
          title: "Account Identifier Not Recognized",
          description: hintText,
          variant: "destructive",
        });
        return;
      }
      targetEmail = resolved;
    }

    const loggedInUser = await login(targetEmail, password);
    
    if (loggedInUser) {
      // 2. Strict Role Boundary Enforcement
      if (role && loggedInUser.role !== role) {
        toast({
          title: "Access Denied: Role Mismatch",
          description: `This account is registered with the role "${ROLE_LABELS[loggedInUser.role] || loggedInUser.role}". It cannot be used to access the ${currentRoleTitle}.`,
          variant: "destructive",
        });
        await logout();
        return;
      }

      // Check if user account requires initial password setup
      if (loggedInUser.is_first_login || loggedInUser.requires_password_change) {
        setIsFirstLoginOpen(true);
        toast({
          title: "First-Time Password Setup Required",
          description: "Please set your personal password before accessing your dashboard.",
        });
        return;
      }

      const activeRole = loggedInUser.role || role || 'student';
      const label = ROLE_LABELS[activeRole] || `${activeRole} Portal`;
      toast({
        title: "Login Successful",
        description: `Welcome, ${loggedInUser.name}! Accessing ${label}.`,
      });

      // Redirect to authorized location or default role home
      const userRole = loggedInUser.role;
      const roleConfig = ROLE_CONFIGS[userRole];
      const defaultHome = roleConfig?.home || (userRole === 'admin' ? '/admin' : `/dashboard/${userRole}`);

      let targetDestination = defaultHome;
      const destination = (location.state as any)?.from?.pathname;

      if (destination && destination !== '/' && destination !== '/dashboard') {
        const allowed = roleConfig?.allowedRoutes || [];
        const isAllowed = allowed.some((route) =>
          destination === route || destination.startsWith(`${route}/`)
        );
        // Never allow redirecting to another role's dashboard prefix (e.g. /dashboard/student for an admin or teacher)
        const isOtherRoleDashboard = destination.startsWith('/dashboard/') && destination !== `/dashboard/${userRole}`;

        if (isAllowed && !isOtherRoleDashboard) {
          targetDestination = destination;
        }
      }

      navigate(targetDestination, { replace: true });
    } else {
      toast({
        title: "Login Failed",
        description: "Invalid credentials. Please verify your identifier and password, or click 'First-Time Student or Parent?' to set your credentials.",
        variant: "destructive",
      });
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;

    setIsResetting(true);
    const result = await resetPassword(resetEmail.trim());
    setIsResetting(false);

    if (result.success) {
      toast({
        title: "Password Reset Email Sent",
        description: "Check your email for instructions to reset your password.",
      });
      setIsResetOpen(false);
      setResetEmail('');
    } else {
      toast({
        title: "Reset Failed",
        description: result.error || "Unable to send password reset email.",
        variant: "destructive",
      });
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast({
        title: "Invalid Password",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingPassword(true);
    const result = await updatePassword(newPassword);
    setIsUpdatingPassword(false);

    if (result.success) {
      toast({
        title: "Password Updated",
        description: "Your password has been successfully updated. You may now sign in.",
      });
      setIsRecoveryOpen(false);
      setNewPassword('');
    } else {
      toast({
        title: "Update Failed",
        description: result.error || "Failed to update password.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white p-1.5 shadow-md border border-slate-100 flex items-center justify-center">
            <img 
              src="/lovable-uploads/8ea95178-bb37-43e2-ae4d-595e31707954.png" 
              alt="Adithyan College Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-primary block">Adithyan College</span>
            <CardTitle className="text-2xl font-bold mt-1">
              {currentRoleTitle}
            </CardTitle>
          </div>
          <CardDescription>
            Enter your authenticated credentials to access your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{getIdentifierConfig().label}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="email"
                  type="text"
                  placeholder={getIdentifierConfig().placeholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 text-sm"
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline font-medium"
                      onClick={() => setResetEmail(email)}
                    >
                      Forgot password?
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <KeyRound className="w-5 h-5 text-primary" />
                        Reset Password
                      </DialogTitle>
                      <DialogDescription>
                        Enter your registered email address and we'll send you a password reset link.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="reset-email">Registered Email</Label>
                        <Input
                          id="reset-email"
                          type="email"
                          placeholder="name@adhityan.edu.in"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          required
                        />
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsResetOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isResetting}>
                          {isResetting ? 'Sending...' : 'Send Reset Link'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-gradient-primary hover:bg-primary-dark transition-smooth"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>

            {(role === 'student' || role === 'parent') && (
              <div className="pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-blue-200 text-blue-700 bg-blue-50/60 hover:bg-blue-100 font-semibold text-xs py-2 h-auto"
                  onClick={() => setIsFirstLoginOpen(true)}
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                  First-Time Student or Parent? Set Your Password
                </Button>
              </div>
            )}
          </form>

          {/* First Login Dialog */}
          <FirstLoginDialog
            open={isFirstLoginOpen}
            onOpenChange={setIsFirstLoginOpen}
            defaultIdentifier={email}
            defaultRole={role}
          />

          {/* Dialog for setting new password when following a recovery link */}
          <Dialog open={isRecoveryOpen} onOpenChange={setIsRecoveryOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-primary" />
                  Set New Password
                </DialogTitle>
                <DialogDescription>
                  Enter your new password to complete the account recovery process.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSetNewPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Enter new password (min. 6 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsRecoveryOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isUpdatingPassword}>
                    {isUpdatingPassword ? 'Updating...' : 'Save New Password'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          
          <div className="rounded-md bg-muted/40 p-3 text-center border border-muted">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-muted-foreground" />
              Accounts are provisioned exclusively by Institutional Administration.
            </p>
          </div>
          
          <Button 
            variant="ghost" 
            className="w-full"
            onClick={onBack}
          >
            ← Back to Portal Selection
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
