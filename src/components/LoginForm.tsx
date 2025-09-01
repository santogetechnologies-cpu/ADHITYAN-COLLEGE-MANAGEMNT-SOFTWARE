import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth, UserRole } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Loader2, User, Mail, Lock } from 'lucide-react';

interface LoginFormProps {
  role: UserRole;
  onBack: () => void;
}

const roleCredentials = {
  student: { email: 'student@gmail.com', password: 'student@123' },
  parent: { email: 'parent@gmail.com', password: 'parent@123' },
  teacher: { email: 'teacher@gmail.com', password: 'teacher@123' },
  admin: { email: 'admin@gmail.com', password: 'admin@123' },
  principal: { email: 'principal@gmail.com', password: 'principal@123' },
  financier: { email: 'financier@gmail.com', password: 'financier@123' },
  accountant: { email: 'accountant@gmail.com', password: 'accountant@123' },
  storekeeper: { email: 'storekeeper@gmail.com', password: 'storekeeper@123' },
  driver: { email: 'driver@gmail.com', password: 'driver@123' },
  naac_coordinator: { email: 'naac@gmail.com', password: 'naac@123' },
  receptionist: { email: 'receptionist@gmail.com', password: 'receptionist@123' },
  store_manager: { email: 'storemanager@gmail.com', password: 'storemanager@123' },
  finance_manager: { email: 'financemanager@gmail.com', password: 'financemanager@123' },
  transport_driver: { email: 'transportdriver@gmail.com', password: 'transportdriver@123' }
};

const roleLabels = {
  student: 'Student Portal',
  parent: 'Parent Portal',
  teacher: 'Teacher Portal',
  admin: 'Admin Dashboard',
  principal: 'Principal Dashboard',
  financier: 'Finance Dashboard',
  accountant: 'Accounts Dashboard',
  storekeeper: 'Store Dashboard',
  driver: 'Transport Dashboard',
  naac_coordinator: 'NAAC Dashboard',
  receptionist: 'Reception Dashboard',
  store_manager: 'Store Manager Dashboard',
  finance_manager: 'Finance Manager Dashboard',
  transport_driver: 'Transport Driver Dashboard'
};

export function LoginForm({ role, onBack }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const success = await login(email, password);
    
    if (success) {
      toast({
        title: "Login Successful",
        description: `Welcome to ${roleLabels[role]}!`,
      });
    } else {
      toast({
        title: "Login Failed",
        description: "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDemoLogin = () => {
    const credentials = roleCredentials[role];
    setEmail(credentials.email);
    setPassword(credentials.password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto bg-gradient-primary rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">{roleLabels[role]}</CardTitle>
          <CardDescription>
            Enter your credentials to access your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
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
          </form>
          
          <div className="space-y-3">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Demo Access</span>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleDemoLogin}
            >
              Use Demo Credentials
            </Button>
          </div>
          
          <Button 
            variant="ghost" 
            className="w-full"
            onClick={onBack}
          >
            ← Back to Role Selection
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}