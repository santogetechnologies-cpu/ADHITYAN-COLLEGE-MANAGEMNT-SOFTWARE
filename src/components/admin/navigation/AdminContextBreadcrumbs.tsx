import React, { useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, Home, Clock, Sparkles } from 'lucide-react';
import {
  getBreadcrumbsForPath,
  getStoredRecentModules,
  recordRecentModule,
  SmartNavModule
} from '@/config/smartAdminNavigation';
import { useAuth } from '@/context/AuthContext';

export function AdminContextBreadcrumbs() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Record this page visit in recents
  React.useEffect(() => {
    if (location.pathname) {
      recordRecentModule(location.pathname);
    }
  }, [location.pathname]);

  const breadcrumbs = useMemo(() => {
    return getBreadcrumbsForPath(location.pathname);
  }, [location.pathname]);

  const recents = useMemo(() => {
    const list = getStoredRecentModules();
    // Exclude current page from quick pills
    return list.filter(m => m.url !== location.pathname).slice(0, 4);
  }, [location.pathname]);

  return (
    <div className="w-full bg-slate-50/70 dark:bg-slate-900/40 border-b border-slate-200/70 dark:border-slate-800/80 px-3 sm:px-6 lg:px-8 py-2 text-xs">
      <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-3 overflow-hidden">
        {/* LEFT: Contextual Breadcrumb Path */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 min-w-0 overflow-x-auto no-scrollbar py-0.5">
          <NavLink
            to="/admin"
            className="flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors shrink-0"
            title="Institutional Command Center"
          >
            <Home className="h-3.5 w-3.5" />
            <span className="hidden sm:inline font-medium">Console</span>
          </NavLink>

          {breadcrumbs.slice(1).map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 2;
            return (
              <React.Fragment key={crumb.label + idx}>
                <ChevronRight className="h-3 w-3 text-slate-400 shrink-0 opacity-70" />
                {crumb.url && !isLast ? (
                  <NavLink
                    to={crumb.url}
                    className="font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors truncate max-w-[140px] sm:max-w-[200px]"
                  >
                    {crumb.label}
                  </NavLink>
                ) : (
                  <span
                    className={`truncate max-w-[160px] sm:max-w-[260px] ${
                      isLast
                        ? 'font-semibold text-slate-900 dark:text-slate-100'
                        : 'font-medium text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </nav>

        {/* RIGHT: Quick Jump Recent Pills */}
        {recents.length > 0 && (
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
              <Clock className="h-3 w-3" /> Recent:
            </span>
            <div className="flex items-center gap-1.5">
              {recents.map(m => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    onClick={() => navigate(m.url)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-600 border border-slate-200 dark:border-slate-700/80 transition-colors shadow-2xs"
                  >
                    <Icon className="h-3 w-3 opacity-70" />
                    <span>{m.shortTitle || m.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

