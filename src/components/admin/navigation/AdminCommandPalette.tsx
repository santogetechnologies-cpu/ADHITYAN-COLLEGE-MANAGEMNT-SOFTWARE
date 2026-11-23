import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  ArrowRight,
  Clock,
  Sparkles,
  Command as CommandIcon,
  PlusCircle,
  ExternalLink,
  Star,
  CornerDownLeft
} from 'lucide-react';
import {
  ALL_SMART_MODULES,
  SMART_CATEGORIES,
  SmartNavModule,
  getStoredRecentModules,
  getStoredFavourites
} from '@/config/smartAdminNavigation';
import { useAuth } from '@/context/AuthContext';

interface AdminCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminCommandPalette({ open, onOpenChange }: AdminCommandPaletteProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  const canAccess = (roles: string[]) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return roles.includes(user.role);
  };

  const accessibleModules = useMemo(() => {
    return ALL_SMART_MODULES.filter(m => canAccess(m.roles));
  }, [user]);

  const recents = useMemo(() => {
    return getStoredRecentModules().filter(m => canAccess(m.roles));
  }, [open, user]);

  const favourites = useMemo(() => {
    const favIds = getStoredFavourites();
    return accessibleModules.filter(m => favIds.includes(m.id));
  }, [open, accessibleModules]);

  // Quick Action Shortcuts
  const quickActions = useMemo(() => [
    {
      id: 'qa-admission',
      title: 'New Student Admission Application',
      category: 'Quick Action',
      url: '/admission-management',
      roles: ['admin', 'principal', 'receptionist']
    },
    {
      id: 'qa-user',
      title: 'Provision Student / Staff Account',
      category: 'Quick Action',
      url: '/admin/users',
      roles: ['admin']
    },
    {
      id: 'qa-timetable',
      title: 'Create Weekly Timetable Schedule',
      category: 'Quick Action',
      url: '/admin/timetable',
      roles: ['admin', 'principal']
    },
    {
      id: 'qa-fee',
      title: 'Tuition Fee Collection & Dues',
      category: 'Quick Action',
      url: '/admin/finance',
      roles: ['admin', 'finance_manager']
    },
    {
      id: 'qa-cert',
      title: 'Generate Official Certificate',
      category: 'Quick Action',
      url: '/certificate-generation',
      roles: ['admin', 'principal']
    }
  ].filter(a => canAccess(a.roles)), [user]);

  // Filtered Results
  const results = useMemo(() => {
    if (!query.trim()) {
      return [];
    }
    const q = query.toLowerCase().trim();
    return accessibleModules.filter(m => {
      const matchTitle = m.title.toLowerCase().includes(q);
      const matchShort = m.shortTitle?.toLowerCase().includes(q);
      const matchDesc = m.description.toLowerCase().includes(q);
      const matchKeywords = (m.keywords || []).some(k => k.toLowerCase().includes(q));
      return matchTitle || matchShort || matchDesc || matchKeywords;
    });
  }, [query, accessibleModules]);

  // Flattened navigation list for keyboard navigation
  const activeItems = useMemo(() => {
    if (query.trim()) {
      return results;
    }
    return [
      ...favourites.map(f => ({ ...f, _type: 'fav' })),
      ...recents.map(r => ({ ...r, _type: 'recent' }))
    ];
  }, [query, results, favourites, recents]);

  // Keyboard navigation inside list
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < activeItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : activeItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeItems[selectedIndex]) {
        handleSelect(activeItems[selectedIndex].url);
      }
    }
  };

  const handleSelect = (url: string) => {
    onOpenChange(false);
    navigate(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-2xl overflow-hidden rounded-2xl border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-950">
        <DialogHeader className="sr-only">
          <DialogTitle>Institutional Command Palette</DialogTitle>
        </DialogHeader>

        {/* Search Input Bar */}
        <div className="flex items-center px-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40">
          <Search className="h-4 w-4 text-slate-400 shrink-0 mr-3" />
          <Input
            ref={inputRef}
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a module name, workflow, role or keyword (e.g. Timetable, Fee, MLT)..."
            className="h-13 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm placeholder:text-slate-400 text-slate-900 dark:text-slate-100"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-1"
            >
              Clear
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono text-slate-400 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800">
              ESC
            </kbd>
          )}
        </div>

        {/* Results List Area */}
        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-4">
          {query.trim() ? (
            <div>
              <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Matching Modules & Tools</span>
                <span className="font-normal font-mono">{results.length} found</span>
              </div>

              {results.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">No institutional modules found for "{query}".</p>
                  <p className="text-xs text-slate-400 mt-1">Try searching for "Admission", "Timetable", "Fees", or "NAAC".</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {results.map((module, idx) => {
                    const Icon = module.icon;
                    const isSelected = selectedIndex === idx;
                    return (
                      <button
                        key={module.id}
                        onClick={() => handleSelect(module.url)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-900 dark:text-blue-100 ring-1 ring-blue-300 dark:ring-blue-800'
                            : 'hover:bg-slate-100/70 dark:hover:bg-slate-900/60 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-2 rounded-lg shrink-0 ${isSelected ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold truncate">{module.title}</span>
                              {module.badge && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-200 text-blue-700 dark:text-blue-300">
                                  {module.badge}
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{module.description}</p>
                          </div>
                        </div>
                        <CornerDownLeft className={`h-3.5 w-3.5 shrink-0 ml-2 ${isSelected ? 'text-blue-600 opacity-100' : 'opacity-0'}`} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            // Default View: Bookmarks & Recents & Quick Actions
            <div className="space-y-4">
              {/* Quick Actions Bar */}
              <div>
                <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <PlusCircle className="h-3 w-3 text-blue-500" />
                  <span>Administrative Quick Actions</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-1">
                  {quickActions.map(action => (
                    <button
                      key={action.id}
                      onClick={() => handleSelect(action.url)}
                      className="flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-100 dark:border-slate-800/80"
                    >
                      <span className="truncate">{action.title}</span>
                      <ArrowRight className="h-3 w-3 text-slate-400 shrink-0 ml-1.5" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Bookmarked Favourites */}
              {favourites.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                    <span>Bookmarked Institutional Modules</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-1">
                    {favourites.map(module => {
                      const Icon = module.icon;
                      return (
                        <button
                          key={module.id}
                          onClick={() => handleSelect(module.url)}
                          className="flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-100 dark:border-slate-800/80"
                        >
                          <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 shrink-0">
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{module.shortTitle || module.title}</p>
                            <p className="text-[10px] text-slate-400 truncate">{module.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recently Visited */}
              {recents.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-blue-500" />
                    <span>Recently Opened Modules</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 mt-1">
                    {recents.slice(0, 3).map(module => {
                      const Icon = module.icon;
                      return (
                        <button
                          key={module.id}
                          onClick={() => handleSelect(module.url)}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-100 dark:border-slate-800"
                        >
                          <Icon className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                            {module.shortTitle || module.title}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Shortcut Guide */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>Use <kbd className="font-mono bg-white dark:bg-slate-800 px-1 rounded border">↑</kbd> <kbd className="font-mono bg-white dark:bg-slate-800 px-1 rounded border">↓</kbd> to navigate</span>
            <span><kbd className="font-mono bg-white dark:bg-slate-800 px-1 rounded border">↵</kbd> to open</span>
          </div>
          <span className="font-medium text-slate-500 dark:text-slate-400">Command Palette</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

