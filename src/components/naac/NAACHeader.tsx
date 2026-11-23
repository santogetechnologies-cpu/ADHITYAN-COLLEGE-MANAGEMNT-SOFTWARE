import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth } from '@/context/AuthContext';
import { useNAAC } from '@/context/NAACContext';
import { Link } from 'react-router-dom';
import { 
  Settings, 
  User, 
  LogOut,
  Award,
  ArrowLeft
} from 'lucide-react';
import { InstitutionName } from '@/lib/institution';

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
            <img
              src="/lovable-uploads/8ea95178-bb37-43e2-ae4d-595e31707954.png"
              alt="Adithyan College"
              className="w-10 h-10 object-contain rounded-lg bg-white p-0.5 border shadow-sm"
            />
            <div>
              <h1 className="text-xl font-bold text-foreground"><InstitutionName /> - NAAC System</h1>
              <p className="text-xs text-muted-foreground">AI&MCP Automated Assessment & Reporting</p>
            </div>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="icon" asChild title="NAAC settings">
            <Link to="/admin/naac/settings"><Settings className="w-5 h-5" /></Link>
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