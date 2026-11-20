import { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Search, 
  Bell, 
  ChevronDown, 
  User, 
  LogOut, 
  Settings,
  Home,
  Clock,
  Calendar,
  Sparkles,
  FileText,
  BarChart3,
  GraduationCap,
  CreditCard,
  ShoppingBag,
  Bus,
  AlertCircle,
  ArrowRight,
  X
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { NotificationCenter } from '@/components/NotificationCenter';

interface HeaderProps {
  studentName: string;
  studentRole?: string;
  avatarUrl?: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onNavigate?: (view: string) => void;
  onOpenSettings: () => void;
  onLogout: () => void;
}

const SEARCHABLE_MODULES = [
  { id: 'dashboard', label: 'Dashboard Overview', desc: 'Home metrics, today session mood & quick alerts', icon: Home, keywords: ['home', 'dashboard', 'overview', 'stats', 'welcome'] },
  { id: 'attendance', label: 'Academic Attendance', desc: 'Live attendance ledger, subject breakdown & monthly reports', icon: Clock, keywords: ['attendance', 'present', 'absent', 'sessions', 'shortage', 'percentage'] },
  { id: 'timetable', label: 'Class Timetable', desc: 'Weekly lecture, laboratory & clinical schedules', icon: Calendar, keywords: ['timetable', 'schedule', 'class', 'period', 'room', 'timing'] },
  { id: 'learning', label: 'AI Learning Tutor', desc: 'Medical & allied health intelligent revision tutor', icon: Sparkles, keywords: ['ai', 'tutor', 'learning', 'assistant', 'study', 'revision', 'questions'] },
  { id: 'assignments', label: 'Assignments & Homework', desc: 'View coursework, deadlines & hand in submissions', icon: FileText, keywords: ['assignment', 'homework', 'task', 'submission', 'coursework', 'due'] },
  { id: 'performance', label: 'Performance Analytics', desc: 'GPA analysis, subject mastery & attendance compliance', icon: BarChart3, keywords: ['performance', 'analytics', 'grade', 'marks', 'average', 'progress'] },
  { id: 'exams', label: 'Upcoming Exams & Marks', desc: 'Exam schedules, hall tickets & semester marks cards', icon: GraduationCap, keywords: ['exam', 'examination', 'hall ticket', 'marks', 'results', 'semester', 'test'] },
  { id: 'fees', label: 'Academic Fees & Receipts', desc: 'Tuition balances, verified receipts & scholarship portal', icon: CreditCard, keywords: ['fee', 'fees', 'tuition', 'receipt', 'scholarship', 'payment', 'due', 'paid'] },
  { id: 'store', label: 'Campus Store', desc: 'Official textbooks, uniforms, lab aprons & equipment', icon: ShoppingBag, keywords: ['store', 'shop', 'books', 'uniform', 'order', 'purchase', 'stationery', 'lab'] },
  { id: 'transport', label: 'Campus Bus Tracking', desc: 'Bus route, stop arrival timings & transit logs', icon: Bus, keywords: ['bus', 'transport', 'route', 'stop', 'driver', 'transit', 'vehicle'] },
  { id: 'complaints', label: 'Grievance & Concerns Desk', desc: 'Lodge formal complaints & track administration replies', icon: AlertCircle, keywords: ['complaint', 'concern', 'grievance', 'issue', 'ticket', 'support', 'help'] },
  { id: 'settings', label: 'Student Profile & Settings', desc: 'Update profile photo, contact details & notification toggles', icon: Settings, keywords: ['settings', 'profile', 'notifications', 'email', 'phone', 'avatar', 'preferences'] },
];

export function CampusProDesktopHeader({
  studentName,
  studentRole = 'Student',
  avatarUrl,
  searchQuery,
  onSearchChange,
  onNavigate,
  onOpenSettings,
  onLogout
}: HeaderProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close search dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered Modules matching search query
  const matchingModules = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return SEARCHABLE_MODULES.filter(m => 
      m.label.toLowerCase().includes(q) ||
      m.desc.toLowerCase().includes(q) ||
      m.keywords.some(k => k.includes(q))
    );
  }, [searchQuery]);

  // Clean initials fallback
  const initials = useMemo(() => {
    if (!studentName) return 'ST';
    const parts = studentName.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return studentName.slice(0, 2).toUpperCase();
  }, [studentName]);

  const handleSelectModule = (viewId: string) => {
    if (onNavigate) {
      onNavigate(viewId);
    }
    onSearchChange('');
    setIsSearchFocused(false);
  };

  return (
    <header className="h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
      {/* Search Input Bar with Working Interactive Dropdown */}
      <div ref={searchContainerRef} className="relative w-72 sm:w-80 lg:w-96">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            placeholder="Search modules, exams, attendance, fees..."
            value={searchQuery}
            onChange={(e) => {
              onSearchChange(e.target.value);
              setIsSearchFocused(true);
            }}
            onFocus={() => setIsSearchFocused(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && matchingModules.length > 0) {
                handleSelectModule(matchingModules[0].id);
              } else if (e.key === 'Escape') {
                setIsSearchFocused(false);
              }
            }}
            className="pl-9 pr-8 py-2 h-9 text-xs rounded-full bg-[#F1F5F9] border-0 text-slate-800 placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-[#1D61E7]"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Live Search Suggestions Dropdown */}
        {isSearchFocused && searchQuery.trim().length > 0 && (
          <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-200/90 shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="p-2 border-b border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-400 px-3">
              <span>Matching Modules ({matchingModules.length})</span>
              <span className="text-[10px] text-slate-400">Press Enter to open</span>
            </div>

            <div className="max-h-72 overflow-y-auto p-1.5 space-y-1">
              {matchingModules.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No matching portal features found for "{searchQuery}".
                </div>
              ) : (
                matchingModules.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectModule(item.id)}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1D61E7] flex items-center justify-center shrink-0 group-hover:bg-[#1D61E7] group-hover:text-white transition-colors">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 group-hover:text-[#1D61E7] transition-colors truncate">
                            {item.label}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {item.desc}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#1D61E7] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right User Actions */}
      <div className="flex items-center space-x-4">
        {/* Real-time Notification Center */}
        <NotificationCenter />

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center space-x-3 p-1 rounded-xl hover:bg-slate-50 transition-colors focus:outline-hidden cursor-pointer">
              {/* Clean Initials Avatar Fallback (Zero stock / Unsplash photos) */}
              <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-slate-200 shrink-0 bg-slate-100 flex items-center justify-center">
                {avatarUrl && !avatarError ? (
                  <img 
                    src={avatarUrl} 
                    alt={studentName} 
                    className="w-full h-full object-cover"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-[#0F3774] to-[#1D61E7] text-white font-bold text-xs flex items-center justify-center uppercase select-none">
                    {initials}
                  </div>
                )}
              </div>
              <div className="text-left hidden md:block">
                <div className="text-xs font-bold text-slate-900 leading-tight flex items-center">
                  <span>{studentName}</span>
                  <ChevronDown className="w-3.5 h-3.5 ml-1 text-slate-400" />
                </div>
                <div className="text-[11px] font-medium text-slate-400 leading-none mt-0.5">
                  {studentRole}
                </div>
              </div>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-52 bg-white text-xs">
            <DropdownMenuLabel className="font-semibold text-slate-900">
              {studentName}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onOpenSettings} className="cursor-pointer">
              <User className="w-3.5 h-3.5 mr-2 text-slate-500" />
              <span>Student Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenSettings} className="cursor-pointer">
              <Settings className="w-3.5 h-3.5 mr-2 text-slate-500" />
              <span>Preferences</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout} className="cursor-pointer text-rose-600 focus:text-rose-600">
              <LogOut className="w-3.5 h-3.5 mr-2 text-rose-500" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
