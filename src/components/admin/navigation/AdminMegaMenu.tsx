import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Grid,
  ChevronDown,
  Search,
  Star,
  Clock,
  Sparkles,
  ExternalLink,
  Layers,
  Users,
  GraduationCap,
  DollarSign,
  Package,
  Stethoscope,
  Shield,
  X
} from 'lucide-react';
import {
  ALL_SMART_MODULES,
  SMART_CATEGORIES,
  SmartNavModule,
  getStoredFavourites,
  toggleStoredFavourite,
  getStoredRecentModules
} from '@/config/smartAdminNavigation';
import { useAuth } from '@/context/AuthContext';

interface AdminMegaMenuProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerButton?: React.ReactNode;
}

export function AdminMegaMenu({ isOpen, onOpenChange, triggerButton }: AdminMegaMenuProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [favourites, setFavourites] = useState<string[]>(() => getStoredFavourites());

  const isControlled = typeof isOpen === 'boolean';
  const effectiveOpen = isControlled ? isOpen : open;
  const setEffectiveOpen = (v: boolean) => {
    if (isControlled && onOpenChange) {
      onOpenChange(v);
    } else {
      setOpen(v);
    }
  };

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
  }, [effectiveOpen, user]);

  const favouriteModules = useMemo(() => {
    return accessibleModules.filter(m => favourites.includes(m.id));
  }, [favourites, accessibleModules]);

  const handleToggleFav = (e: React.MouseEvent, moduleId: string) => {
    e.stopPropagation();
    const updated = toggleStoredFavourite(moduleId);
    setFavourites(updated);
  };

  const handleModuleClick = (url: string) => {
    setEffectiveOpen(false);
    navigate(url);
  };

  // Filter groups
  const filteredCategories = useMemo(() => {
    const q = filterQuery.toLowerCase().trim();
    return SMART_CATEGORIES.map(category => {
      const filteredModules = category.modules.filter(m => {
        if (!canAccess(m.roles)) return false;
        if (!q) return true;
        const matchTitle = m.title.toLowerCase().includes(q);
        const matchShort = m.shortTitle?.toLowerCase().includes(q);
        const matchDesc = m.description.toLowerCase().includes(q);
        const matchKeywords = (m.keywords || []).some(k => k.toLowerCase().includes(q));
        return matchTitle || matchShort || matchDesc || matchKeywords;
      });
      return {
        ...category,
        modules: filteredModules
      };
    }).filter(cat => cat.modules.length > 0);
  }, [filterQuery, user]);

  return (
    <DropdownMenu open={effectiveOpen} onOpenChange={setEffectiveOpen}>
      <DropdownMenuTrigger asChild>
        {triggerButton || (
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shrink-0"
          >
            <Grid className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>Modules</span>
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="center"
        sideOffset={10}
        className="w-[96vw] max-w-6xl p-0 shadow-2xl border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950 overflow-hidden animate-in fade-in-80 zoom-in-95 duration-150 z-50"
      >
        {/* Top Control Bar: Title & Search Filter */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="p-1.5 bg-blue-600 text-white rounded-lg shadow-xs">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  Institutional Command Center
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-200 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40">
                  All Operational Modules
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Direct access to every campus department, paramedical section and governance tool
              </p>
            </div>
          </div>

          {/* Quick Filter Input */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={filterQuery}
              onChange={e => setFilterQuery(e.target.value)}
              placeholder="Filter modules in menu..."
              className="h-8 pl-8 pr-7 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl"
            />
            {filterQuery && (
              <button
                onClick={() => setFilterQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Favourites & Recents Strip (When not actively searching) */}
        {!filterQuery && (favouriteModules.length > 0 || recents.length > 0) && (
          <div className="px-5 py-2.5 bg-slate-50/40 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-4 text-xs">
            {/* Bookmarks */}
            {favouriteModules.length > 0 && (
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
                  <Star className="h-3 w-3 text-amber-500 fill-amber-500" /> Favourites:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {favouriteModules.slice(0, 5).map(m => (
                    <button
                      key={m.id}
                      onClick={() => handleModuleClick(m.url)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-600 border border-slate-200 dark:border-slate-800 transition-colors shadow-2xs"
                    >
                      <span>{m.shortTitle || m.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Recents */}
            {recents.length > 0 && (
              <div className="hidden lg:flex items-center gap-2 min-w-0 ml-auto">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
                  <Clock className="h-3 w-3 text-blue-500" /> Recents:
                </span>
                <div className="flex items-center gap-1.5">
                  {recents.slice(0, 3).map(m => (
                    <button
                      key={m.id}
                      onClick={() => handleModuleClick(m.url)}
                      className="px-2 py-0.5 rounded text-[11px] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    >
                      {m.shortTitle || m.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 6 Category Columns Grid */}
        <div className="p-5 max-h-[68vh] overflow-y-auto">
          {filteredCategories.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No operational modules matched "{filterQuery}".
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCategories.map(cat => {
                const CatIcon = cat.icon;
                return (
                  <div
                    key={cat.id}
                    className="flex flex-col bg-slate-50/40 dark:bg-slate-900/30 rounded-xl p-3 border border-slate-100 dark:border-slate-800/80"
                  >
                    {/* Category Header */}
                    <div className="flex items-center gap-2 pb-2 mb-2 border-b border-slate-200/80 dark:border-slate-800">
                      <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                        <CatIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                          {cat.name}
                        </h4>
                        <p className="text-[10px] text-slate-400 truncate">{cat.tagline}</p>
                      </div>
                    </div>

                    {/* Module Items */}
                    <div className="space-y-1">
                      {cat.modules.map(module => {
                        const ModuleIcon = module.icon;
                        const isFav = favourites.includes(module.id);
                        return (
                          <div
                            key={module.id}
                            onClick={() => handleModuleClick(module.url)}
                            className="group flex items-start justify-between p-2 rounded-lg cursor-pointer hover:bg-white dark:hover:bg-slate-800/80 transition-all border border-transparent hover:border-slate-200/80 dark:hover:border-slate-700/80 hover:shadow-2xs"
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              <ModuleIcon className="h-4 w-4 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 shrink-0 mt-0.5 transition-colors" />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                                    {module.shortTitle || module.title}
                                  </span>
                                  {module.badge && (
                                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-blue-200 text-blue-700 dark:text-blue-300">
                                      {module.badge}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-1">
                                  {module.description}
                                </p>
                              </div>
                            </div>

                            {/* Bookmark Star Button */}
                            <button
                              type="button"
                              onClick={e => handleToggleFav(e, module.id)}
                              className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1 hover:bg-slate-100 dark:hover:bg-slate-700 ${
                                isFav ? 'opacity-100 text-amber-500' : 'text-slate-300 hover:text-slate-500'
                              }`}
                              title={isFav ? 'Remove from Favourites' : 'Add to Favourites'}
                            >
                              <Star className={`h-3 w-3 ${isFav ? 'fill-amber-500' : ''}`} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Tip: Hover any module to click the star (★) and bookmark it for quick access</span>
          <span className="font-medium text-slate-500 dark:text-slate-400">Adithyan Group of Institutions</span>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

