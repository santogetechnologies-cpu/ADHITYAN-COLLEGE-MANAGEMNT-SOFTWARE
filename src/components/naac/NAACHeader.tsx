import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth } from '@/context/AuthContext';
import { useNAAC } from '@/context/NAACContext';
import { Link } from 'react-router-dom';
import { 
  Bell, 
  Settings, 
  User, 
  LogOut,
  Award,
  ArrowLeft
} from 'lucide-react';

export function NAACHeader() {
  const { user, logout } = useAuth();
  const { naacData } = useNAAC();

  return (
    <header className="border-b bg-card shadow-sm sticky top-0 z-50">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Left section */}
        <div className="flex items-center space-x-4">
          <SidebarTrigger />
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard" className="flex items-center space-x-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Admin</span>
            </Link>
          </Button>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Award className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Adhithyan - NAAC System</h1>
              <p className="text-xs text-muted-foreground">AI&MCP Automated Assessment & Reporting</p>
            </div>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center space-x-3">
          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full text-xs flex items-center justify-center text-destructive-foreground">
              2
            </span>
          </Button>

          {/* Settings */}
          <Button variant="ghost" size="icon">
            <Settings className="w-5 h-5" />
          </Button>

          {/* User Profile */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="text-sm">
                <div className="font-medium">{naacData.currentUser.name}</div>
                <div className="text-xs text-muted-foreground capitalize">
                  {naacData.currentUser.role.replace('_', ' ')}
                </div>
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
    </header>
  );
}