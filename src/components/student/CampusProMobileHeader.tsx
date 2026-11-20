import { ArrowLeft, Bell, GraduationCap } from 'lucide-react';
import { NotificationCenter } from '@/components/NotificationCenter';

interface MobileHeaderProps {
  currentView: string;
  onBackToHome: () => void;
  title?: string;
}

const VIEW_TITLES: Record<string, string> = {
  'dashboard': 'Adithyan College',
  'attendance': 'Academic Attendance',
  'timetable': 'Class Timetable',
  'learning': 'AI Assistant',
  'assignments': 'Assignments & Homework',
  'performance': 'Performance Analytics',
  'exams': 'Upcoming Exams & Marks',
  'fees': 'Fees & Receipts',
  'store': 'Campus Store',
  'transport': 'Bus Tracking',
  'complaints': 'Raise Complaints',
  'settings': 'Student Profile',
};

export function CampusProMobileHeader({
  currentView,
  onBackToHome,
  title
}: MobileHeaderProps) {
  const isHome = currentView === 'dashboard';
  const pageTitle = title || VIEW_TITLES[currentView] || 'Adithyan College';

  return (
    <header className="lg:hidden h-14 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      <div className="flex items-center space-x-2.5 min-w-0">
        {!isHome ? (
          <button
            onClick={onBackToHome}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 p-0.5 border border-slate-200 shrink-0">
            <img
              src="/lovable-uploads/8ea95178-bb37-43e2-ae4d-595e31707954.png"
              alt="Adithyan College Logo"
              className="w-full h-full object-contain"
            />
          </div>
        )}

        <h1 className="text-sm font-bold text-slate-900 tracking-tight truncate">
          {pageTitle}
        </h1>
      </div>

      <div className="flex items-center space-x-2">
        <NotificationCenter />
      </div>
    </header>
  );
}

