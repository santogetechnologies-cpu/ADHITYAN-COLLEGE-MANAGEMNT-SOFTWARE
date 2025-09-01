import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { NotificationCenter } from '@/components/NotificationCenter';
import { UserSettings } from '@/components/UserSettings';
import { 
  GraduationCap, 
  LogOut, 
  User,
  ArrowLeft
} from 'lucide-react';

interface NavigationProps {
  showBackButton?: boolean;
  backUrl?: string;
  backLabel?: string;
}

export function Navigation({ showBackButton = false, backUrl = '/dashboard', backLabel = 'Back to Dashboard' }: NavigationProps = {}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const roleLabels = {
    student: 'Student Portal',
    parent: 'Parent Dashboard',
    teacher: 'Teacher Hub',
    admin: 'Admin Console'
  };

  return (
    <header className="border-b bg-card shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center space-x-3">
            {showBackButton && (
              <Button variant="ghost" size="sm" asChild>
                <Link to={backUrl} className="flex items-center space-x-2">
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">{backLabel}</span>
                </Link>
              </Button>
            )}
            <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Adhithyan</h1>
              <p className="text-xs text-muted-foreground">AI&MCP Edu System</p>
            </div>
          </div>

          {/* User Actions */}
          <div className="flex items-center space-x-3">
            {/* Notifications */}
            <NotificationCenter />

            {/* Settings */}
            <UserSettings />

            {/* User Profile */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                {user.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt={user.name}
                    className="w-8 h-8 rounded-full border-2 border-border"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
                <div className="text-sm">
                  <div className="font-medium">{user.name}</div>
                  <div className="text-xs text-muted-foreground capitalize">{user.role}</div>
                </div>
              </div>

              {/* Logout */}
              <Button 
                variant="ghost" 
                size="icon"
                onClick={logout}
                className="text-muted-foreground hover:text-destructive"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}