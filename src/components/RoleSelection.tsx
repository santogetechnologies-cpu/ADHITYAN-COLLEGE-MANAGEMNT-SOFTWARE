import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserRole } from '@/context/AuthContext';
import { GraduationCap, Heart, BookOpen, Shield, Users, BarChart3, MessageCircle, Calendar, Phone, Package, CreditCard, Bus } from 'lucide-react';
interface RoleSelectionProps {
  onSelectRole: (role: UserRole) => void;
}
const roles = [{
  id: 'student' as UserRole,
  title: 'Student Portal',
  description: 'Access your personalized learning dashboard, AI mentor, assignments, and more',
  icon: GraduationCap,
  features: ['AI-Powered Learning', 'Assignment Tracking', 'Health Check-ins', 'Peer Communities'],
  color: 'bg-gradient-primary'
}, {
  id: 'parent' as UserRole,
  title: 'Parent Dashboard',
  description: 'Monitor your child\'s academic progress, attendance, and overall wellbeing',
  icon: Heart,
  features: ['Progress Monitoring', 'Health Insights', 'Teacher Communication', 'Fee Management'],
  color: 'bg-gradient-secondary'
}, {
  id: 'teacher' as UserRole,
  title: 'Teacher Hub',
  description: 'Manage classes, create content, track student progress, and engage with parents',
  icon: BookOpen,
  features: ['Class Management', 'AI Lesson Plans', 'Student Analytics', 'Content Creation'],
  color: 'bg-gradient-accent'
}, {
  id: 'admin' as UserRole,
  title: 'Admin Console',
  description: 'Comprehensive institution management with analytics and administrative tools',
  icon: Shield,
  features: ['Institution Analytics', 'Staff Management', 'System Administration', 'Reports & Insights'],
  color: 'bg-gradient-hero'
}];
const additionalRoles = [{
  id: 'receptionist' as UserRole,
  title: 'Receptionist',
  description: 'Front office & visitor management',
  icon: Phone,
  features: ['Visitor Check-in', 'Appointment Booking', 'Enquiry Tracker', 'Notice Distribution'],
  color: 'bg-blue-500'
}, {
  id: 'store_manager' as UserRole,
  title: 'Store Manager',
  description: 'Inventory & asset management',
  icon: Package,
  features: ['Stock Management', 'Low Stock Alerts', 'Book Distribution', 'Vendor Management'],
  color: 'bg-green-500'
}, {
  id: 'finance_manager' as UserRole,
  title: 'Finance Manager',
  description: 'Financial oversight & fee management',
  icon: CreditCard,
  features: ['Fee Collection', 'Payment Gateway', 'Payroll Management', 'Budget Reports'],
  color: 'bg-yellow-500'
}, {
  id: 'transport_driver' as UserRole,
  title: 'Transport Driver',
  description: 'Student transport & safety',
  icon: Bus,
  features: ['Route Management', 'GPS Tracking', 'Student Check-in', 'Vehicle Maintenance'],
  color: 'bg-purple-500'
}];
const stats = [{
  icon: Users,
  value: '500+',
  label: 'Active Students'
}, {
  icon: BookOpen,
  value: '35+',
  label: 'Courses Available'
}, {
  icon: BarChart3,
  value: '95%',
  label: 'Success Rate'
}, {
  icon: MessageCircle,
  value: '24/7',
  label: 'AI Support'
}];
export function RoleSelection({
  onSelectRole
}: RoleSelectionProps) {
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center p-1">
                <img src="/lovable-uploads/8ea95178-bb37-43e2-ae4d-595e31707954.png" alt="Adhithyan Institute Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Adhithyan</h1>
                <p className="text-xs text-muted-foreground">AI&MCP Edu System</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-hero text-primary-foreground py-16 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-32 h-32 border border-white/20 rounded-full animate-pulse"></div>
          <div className="absolute top-40 right-20 w-24 h-24 border border-white/20 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute bottom-20 left-1/4 w-16 h-16 border border-white/20 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
          <div className="absolute top-1/3 right-1/3 w-20 h-20 border border-white/20 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
        </div>
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-fade-in">
            <span className="inline-block hover-scale">The Future of</span>
            <span className="block bg-gradient-accent bg-clip-text text-transparent animate-fade-in hover-scale" style={{animationDelay: '0.3s'}}>
              Educational Excellence
            </span>
          </h1>
          <p className="text-xl md:text-2xl mb-8 opacity-90 max-w-3xl mx-auto animate-fade-in" style={{animationDelay: '0.6s'}}>
            Empowering students, parents, teachers, and administrators with AI-driven learning, 
            wellness tracking, and comprehensive analytics.
          </p>
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mb-12">
            {stats.map((stat, index) => <div key={index} className="text-center animate-fade-in hover-scale group" style={{animationDelay: `${0.9 + index * 0.1}s`}}>
                <div className="w-12 h-12 mx-auto mb-2 bg-white/20 rounded-full flex items-center justify-center transition-all duration-300 group-hover:bg-white/30 group-hover:scale-110">
                  <stat.icon className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" />
                </div>
                <div className="text-2xl font-bold transition-transform duration-300 group-hover:scale-105">{stat.value}</div>
                <div className="text-sm opacity-80">{stat.label}</div>
              </div>)}
          </div>
        </div>
        
        {/* Floating particles */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/6 w-2 h-2 bg-white/30 rounded-full animate-pulse" style={{animationDelay: '3s'}}></div>
          <div className="absolute top-3/4 right-1/5 w-1 h-1 bg-white/40 rounded-full animate-pulse" style={{animationDelay: '4s'}}></div>
          <div className="absolute top-1/2 left-3/4 w-1.5 h-1.5 bg-white/20 rounded-full animate-pulse" style={{animationDelay: '2.5s'}}></div>
        </div>
      </section>

      {/* Role Selection */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Choose Your Portal</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Select your role to access your personalized dashboard with tailored features and tools.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {roles.map(role => {
            const IconComponent = role.icon;
            return <Card key={role.id} className="relative overflow-hidden hover:shadow-xl transition-smooth cursor-pointer group transform hover:scale-105 animate-fade-in" onClick={() => onSelectRole(role.id)}>
                  <div className={`absolute inset-0 ${role.color} opacity-5 group-hover:opacity-10 transition-smooth`} />
                  <CardHeader className="text-center pb-4">
                    <div className={`w-16 h-16 mx-auto mb-4 ${role.color} rounded-full flex items-center justify-center shadow-lg`}>
                      <IconComponent className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <CardTitle className="text-xl">{role.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {role.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ul className="space-y-2">
                      {role.features.map((feature, index) => <li key={index} className="text-sm flex items-center">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full mr-2" />
                          {feature}
                        </li>)}
                    </ul>
                    <Button variant="outline" className="w-full mt-4 group-hover:bg-primary group-hover:text-primary-foreground">
                      Access Portal
                    </Button>
                  </CardContent>
                </Card>;
          })}
          </div>
          
          {/* Additional Specialized Roles */}
          <div className="mt-16">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold mb-2">Specialized Staff Portals</h3>
              <p className="text-muted-foreground">
                Role-specific dashboards for specialized administrative functions
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {additionalRoles.map(role => {
              const IconComponent = role.icon;
              return <Card key={role.id} className="relative overflow-hidden hover:shadow-lg transition-smooth cursor-pointer group transform hover:scale-105 bg-card/50 animate-fade-in" onClick={() => onSelectRole(role.id)}>
                    <CardHeader className="text-center pb-3">
                      <div className={`w-12 h-12 mx-auto mb-3 ${role.color} rounded-lg flex items-center justify-center shadow-sm`}>
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      <CardTitle className="text-lg">{role.title}</CardTitle>
                      <CardDescription className="text-xs">
                        {role.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <ul className="space-y-1">
                        {role.features.slice(0, 2).map((feature, index) => <li key={index} className="text-xs flex items-center">
                            <div className="w-1 h-1 bg-muted-foreground rounded-full mr-2" />
                            {feature}
                          </li>)}
                      </ul>
                      <Button variant="outline" size="sm" className="w-full mt-3 text-xs group-hover:bg-primary group-hover:text-primary-foreground">
                        Demo Login
                      </Button>
                    </CardContent>
                  </Card>;
            })}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground">
            © 2025 Adhithyan<br />
            AI&MCP Edu System
          </p>
        </div>
      </footer>
    </div>;
}