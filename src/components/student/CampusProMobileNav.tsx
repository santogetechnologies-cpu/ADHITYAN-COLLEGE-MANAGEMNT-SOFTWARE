import { useState } from 'react';
import { 
  Home, 
  BookOpen, 
  Calendar, 
  User, 
  Menu, 
  ShoppingBag, 
  Bus, 
  AlertCircle, 
  BarChart3, 
  Clock, 
  Sparkles,
  FileText,
  X,
  LogOut,
  Settings,
  CreditCard
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';

interface MobileNavProps {
  currentView: string;
  onSelectView: (view: string) => void;
  onLogout: () => void;
  pendingAssignmentsCount?: number;
}

export function CampusProMobileNav({
  currentView,
  onSelectView,
  onLogout,
  pendingAssignmentsCount = 0
}: MobileNavProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleNavClick = (view: string) => {
    onSelectView(view);
    setDrawerOpen(false);
  };

  return (
    <>
      {/* Bottom Sticky Mobile Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/90 z-40 px-3 py-1.5 shadow-lg select-none">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {/* Home */}
          <button
            onClick={() => handleNavClick('dashboard')}
            className={`flex flex-col items-center py-1 px-2.5 rounded-lg transition-colors ${
              currentView === 'dashboard' ? 'text-[#1D61E7]' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-semibold mt-0.5">Home</span>
          </button>

          {/* AI Assistant */}
          <button
            onClick={() => handleNavClick('learning')}
            className={`flex flex-col items-center py-1 px-2.5 rounded-lg transition-colors ${
              currentView === 'learning' ? 'text-[#1D61E7]' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-5 h-5" />
            <span className="text-[10px] font-semibold mt-0.5">AI Assistant</span>
          </button>

          {/* Attendance */}
          <button
            onClick={() => handleNavClick('attendance')}
            className={`flex flex-col items-center py-1 px-2.5 rounded-lg transition-colors ${
              currentView === 'attendance' ? 'text-[#1D61E7]' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Clock className="w-5 h-5" />
            <span className="text-[10px] font-semibold mt-0.5">Attendance</span>
          </button>

          {/* Assignments */}
          <button
            onClick={() => handleNavClick('assignments')}
            className={`flex flex-col items-center py-1 px-2.5 rounded-lg transition-colors relative ${
              currentView === 'assignments' ? 'text-[#1D61E7]' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileText className="w-5 h-5" />
            {pendingAssignmentsCount > 0 && (
              <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-blue-600" />
            )}
            <span className="text-[10px] font-semibold mt-0.5">Tasks</span>
          </button>

          {/* Exams */}
          <button
            onClick={() => handleNavClick('exams')}
            className={`flex flex-col items-center py-1 px-2.5 rounded-lg transition-colors ${
              currentView === 'exams' ? 'text-[#1D61E7]' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-[10px] font-semibold mt-0.5">Exams</span>
          </button>

          {/* More Drawer */}
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetTrigger asChild>
              <button
                className={`flex flex-col items-center py-1 px-2.5 rounded-lg transition-colors ${
                  drawerOpen || ['store', 'transport', 'complaints', 'performance', 'attendance', 'fees', 'settings'].includes(currentView)
                    ? 'text-[#1D61E7]' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Menu className="w-5 h-5" />
                <span className="text-[10px] font-semibold mt-0.5">More</span>
              </button>
            </SheetTrigger>

            <SheetContent side="bottom" className="bg-white rounded-t-3xl max-h-[85vh] p-6 text-slate-800">
              <SheetHeader className="pb-4 border-b border-slate-100 flex flex-row items-center space-x-3">
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 p-0.5 shrink-0 border border-slate-200">
                  <img
                    src="/lovable-uploads/8ea95178-bb37-43e2-ae4d-595e31707954.png"
                    alt="Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <SheetTitle className="text-sm font-bold text-slate-900 text-left">
                  Adithyan Institute of Paramedical
                </SheetTitle>
              </SheetHeader>

              <div className="grid grid-cols-3 gap-3 py-4 text-center">
                <button
                  onClick={() => handleNavClick('timetable')}
                  className="flex flex-col items-center p-3 rounded-2xl bg-blue-50/60 hover:bg-blue-100/50 transition-colors border border-blue-100"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#1D61E7] flex items-center justify-center mb-1.5">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-800">Timetable</span>
                </button>

                <button
                  onClick={() => handleNavClick('performance')}
                  className="flex flex-col items-center p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1.5">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-800">Analytics</span>
                </button>

                <button
                  onClick={() => handleNavClick('attendance')}
                  className="flex flex-col items-center p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-1.5">
                    <Clock className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-800">Attendance</span>
                </button>

                <button
                  onClick={() => handleNavClick('fees')}
                  className="flex flex-col items-center p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1D61E7] flex items-center justify-center mb-1.5">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-800">Fees</span>
                </button>

                <button
                  onClick={() => handleNavClick('store')}
                  className="flex flex-col items-center p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-800">Store</span>
                </button>

                <button
                  onClick={() => handleNavClick('transport')}
                  className="flex flex-col items-center p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-1.5">
                    <Bus className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-800">Bus Transit</span>
                </button>

                <button
                  onClick={() => handleNavClick('complaints')}
                  className="flex flex-col items-center p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-1.5">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-800">Grievances</span>
                </button>

                <button
                  onClick={() => handleNavClick('settings')}
                  className="flex flex-col items-center p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center mb-1.5">
                    <User className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-800">Profile</span>
                </button>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => handleNavClick('settings')}
                  className="flex items-center space-x-2 text-xs font-semibold text-slate-600"
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </button>

                <button
                  onClick={onLogout}
                  className="flex items-center space-x-2 text-xs font-semibold text-rose-600"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </>
  );
}

