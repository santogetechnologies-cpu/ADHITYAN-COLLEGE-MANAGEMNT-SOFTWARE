import { 
  Home, 
  BookOpen, 
  FileText, 
  BarChart3, 
  Calendar, 
  ShoppingBag, 
  Bus, 
  AlertCircle, 
  Settings, 
  LogOut, 
  GraduationCap,
  CreditCard,
  Clock,
  Sparkles
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  onLogout: () => void;
  pendingAssignmentsCount?: number;
}

export function CampusProDesktopSidebar({ 
  currentView, 
  onSelectView, 
  onLogout,
  pendingAssignmentsCount = 0 
}: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'timetable', label: 'Class Timetable', icon: Calendar },
    { id: 'learning', label: 'AI Assistant', icon: Sparkles },
    { id: 'assignments', label: 'Assignments & Homework', icon: FileText, badge: pendingAssignmentsCount > 0 ? pendingAssignmentsCount : undefined },
    { id: 'performance', label: 'Performance Analytics', icon: BarChart3 },
    { id: 'exams', label: 'Upcoming Exams & Marks', icon: GraduationCap },
    { id: 'fees', label: 'Fees & Receipts', icon: CreditCard },
    { id: 'store', label: 'Store', icon: ShoppingBag },
    { id: 'transport', label: 'Bus Tracking', icon: Bus },
    { id: 'placement', label: 'Placements', icon: GraduationCap },
    { id: 'complaints', label: 'Raise Complaints', icon: AlertCircle },
  ];

  return (
    <aside className="w-64 xl:w-72 bg-[#071E47]/95 xl:bg-[#071E47]/90 backdrop-blur-xl border-r border-blue-900/50 flex flex-col justify-between h-screen sticky top-0 shrink-0 z-30 select-none text-white shadow-xl shadow-blue-950/20">
      {/* Top Branding */}
      <div>
        <div className="p-4 xl:p-5 flex items-center space-x-3 border-b border-blue-900/40">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/10 p-1 flex items-center justify-center shrink-0 border border-white/20 shadow-md">
            <img 
              src="/lovable-uploads/8ea95178-bb37-43e2-ae4d-595e31707954.png" 
              alt="Adithyan College Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-white tracking-tight leading-snug truncate">
              Adithyan College
            </h1>
            <p className="text-[10px] font-medium text-blue-200/70">Student Portal</p>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="p-3.5 space-y-1 overflow-y-auto max-h-[calc(100vh-230px)] scrollbar-thin scrollbar-thumb-blue-900">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectView(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#1D61E7] text-white shadow-md shadow-blue-950/50 ring-1 ring-white/20'
                    : 'text-blue-100/75 hover:text-white hover:bg-white/10'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-blue-300/80'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-blue-500/30 text-blue-100 border border-blue-400/30'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Area: Settings, Logout, and Architecture Watermark */}
      <div className="p-3.5 border-t border-blue-900/40 space-y-1 relative">
        <button
          onClick={() => onSelectView('settings')}
          className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            currentView === 'settings'
              ? 'bg-[#1D61E7] text-white shadow-md shadow-blue-950/50 ring-1 ring-white/20'
              : 'text-blue-100/75 hover:text-white hover:bg-white/10'
          }`}
        >
          <Settings className="w-4 h-4 text-blue-300/80" />
          <span>Settings</span>
        </button>

        <button
          onClick={onLogout}
          className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-300 hover:text-white hover:bg-rose-500/20 transition-all"
        >
          <LogOut className="w-4 h-4 text-rose-400" />
          <span>Logout</span>
        </button>

        {/* Architectural Campus Watermark Illustration */}
        <div className="pt-2 px-2 pointer-events-none opacity-20 invert brightness-200">
          <img 
            src="/assets/campus-watermark.svg" 
            alt="Campus Architecture" 
            className="w-full h-12 object-contain"
          />
        </div>
      </div>
    </aside>
  );
}

