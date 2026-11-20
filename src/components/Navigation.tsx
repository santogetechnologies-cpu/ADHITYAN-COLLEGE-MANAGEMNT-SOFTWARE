import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { Link, useLocation } from 'react-router-dom';
import { NotificationCenter } from '@/components/NotificationCenter';
import { UserSettings } from '@/components/UserSettings';
import { ROLE_CONFIGS } from '@/config/roles';
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
  const location = useLocation();

  if (!user) return null;

  const currentRoleConfig = ROLE_CONFIGS[user.role];
  const navItems = currentRoleConfig?.navItems || [];
  const defaultHome = currentRoleConfig?.home || '/dashboard';
  const resolvedBackUrl = backUrl === '/dashboard' ? defaultHome : backUrl;

  return (
    <header className="border-b bg-card shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center space-x-3">
            {showBackButton && (
              <Button variant="ghost" size="sm" asChild>
                <Link to={resolvedBackUrl} className="flex items-center space-x-2">
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">{backLabel}</span>
                </Link>
              </Button>
            )}
            <Link to={defaultHome} className="flex items-center space-x-3 hover:opacity-90 transition-opacity">
              <img
                src="/lovable-uploads/8ea95178-bb37-43e2-ae4d-595e31707954.png"
                alt="Adithyan College"
                className="w-10 h-10 object-contain rounded-lg bg-white p-0.5 border shadow-sm"
              />
              <div>
                <h1 className="text-xl font-bold text-foreground leading-none">Adithyan College</h1>
                <p className="text-xs text-muted-foreground mt-0.5">College Management ERP</p>
              </div>
            </Link>
          </div>

          {/* Role-Specific Navigation Links (Desktop) */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
              return (
                <Button
                  key={item.path}
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  asChild
                  className="text-xs font-medium"
                >
                  <Link to={item.path}>
                    {item.label}
                  </Link>
                </Button>
              );
            })}
          </nav>

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
                    className="w-8 h-8 rounded-full border-2 border-border object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
                <div className="text-sm hidden sm:block">
                  <div className="font-medium text-xs leading-none">{user.name}</div>
                  <div className="text-[11px] text-muted-foreground capitalize mt-0.5">{user.role.replace(/_/g, ' ')}</div>
                </div>
              </div>

              {/* Logout */}
              <Button 
                variant="ghost" 
                size="icon"
                onClick={logout}
                title="Sign Out"
                className="text-muted-foreground hover:text-destructive"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        {navItems.length > 0 && (
          <div className="lg:hidden flex items-center space-x-1 overflow-x-auto pt-2 border-t mt-2 scrollbar-none">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Button
                  key={item.path}
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  asChild
                  className="text-xs whitespace-nowrap h-7 px-2.5"
                >
                  <Link to={item.path}>
                    {item.label}
                  </Link>
                </Button>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}

export default Navigation;
