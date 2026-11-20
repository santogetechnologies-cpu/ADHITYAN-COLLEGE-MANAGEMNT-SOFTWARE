import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  CheckCircle,
  Clock,
  UserPlus,
  DollarSign,
  Calendar,
  ShieldAlert,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface InstitutionalNotification {
  id: string;
  title: string;
  description: string;
  time: string;
  type: 'admission' | 'finance' | 'academic' | 'security';
  read: boolean;
  link: string;
}

export function AdminNotificationCenter() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<InstitutionalNotification[]>([]);

  // Load real pending counts and alerts from Supabase backend
  useEffect(() => {
    async function fetchLiveNotifications() {
      try {
        const liveItems: InstitutionalNotification[] = [];

        // 1. Check pending admissions
        const { count: admissionCount } = await supabase
          .from('admission_applications')
          .select('*', { count: 'exact', head: true })
          .in('status', ['Pending', 'Submitted', 'Under Review']);

        if (typeof admissionCount === 'number' && admissionCount > 0) {
          liveItems.push({
            id: 'live-admission-alert',
            title: `${admissionCount} Admission${admissionCount > 1 ? 's' : ''} Awaiting Review`,
            description: 'New applicant portfolios submitted and awaiting verification.',
            time: 'Active',
            type: 'admission',
            read: false,
            link: '/admission-management'
          });
        }

        // 2. Check overdue fees
        const { count: overdueCount } = await supabase
          .from('student_fees')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'overdue');

        if (typeof overdueCount === 'number' && overdueCount > 0) {
          liveItems.push({
            id: 'live-overdue-fee-alert',
            title: `${overdueCount} Overdue Fee Account${overdueCount > 1 ? 's' : ''}`,
            description: 'Fee collection reminders pending finance department reconciliation.',
            time: 'Pending',
            type: 'finance',
            read: false,
            link: '/admin/finance'
          });
        }

        // 3. Check unresolved student concerns
        const { count: concernsCount } = await supabase
          .from('concerns')
          .select('*', { count: 'exact', head: true })
          .in('status', ['pending', 'Pending', 'open']);

        if (typeof concernsCount === 'number' && concernsCount > 0) {
          liveItems.push({
            id: 'live-concern-alert',
            title: `${concernsCount} Student Concern${concernsCount > 1 ? 's' : ''} Raised`,
            description: 'Disciplinary or student welfare tickets require administrative attention.',
            time: 'Action required',
            type: 'security',
            read: false,
            link: '/disciplinary-management'
          });
        }

        // 4. Check system notifications table
        const { data: dbNotifs } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        if (dbNotifs && dbNotifs.length > 0) {
          dbNotifs.forEach((n: any) => {
            liveItems.push({
              id: n.id,
              title: n.title || 'Institutional Notification',
              description: n.message || n.content || '',
              time: n.created_at ? new Date(n.created_at).toLocaleDateString() : 'Recent',
              type: n.type === 'finance' ? 'finance' : n.type === 'academic' ? 'academic' : 'security',
              read: Boolean(n.read || n.is_read),
              link: n.link || '/admin'
            });
          });
        }

        setNotifications(liveItems);
      } catch (err) {
        console.warn('fetchLiveNotifications error:', err);
        setNotifications([]);
      }
    }

    fetchLiveNotifications();
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleNotificationClick = (item: InstitutionalNotification) => {
    setNotifications(prev =>
      prev.map(n => (n.id === item.id ? { ...n, read: true } : n))
    );
    navigate(item.link);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'admission':
        return <UserPlus className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />;
      case 'finance':
        return <DollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />;
      case 'academic':
        return <Calendar className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />;
      default:
        return <ShieldAlert className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="View Institutional Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white shadow-xs animate-pulse">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-84 sm:w-92 p-0 shadow-2xl border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Institutional Alerts
            </span>
            {unreadCount > 0 && (
              <Badge className="bg-blue-600 text-white text-[10px] px-1.5 py-0 h-4 font-semibold">
                {unreadCount} New
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-[11px] font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No recent notifications.
            </div>
          ) : (
            notifications.map(item => (
              <div
                key={item.id}
                onClick={() => handleNotificationClick(item)}
                className={`p-3 transition-colors cursor-pointer flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-900/60 ${
                  !item.read ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                }`}
              >
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0 mt-0.5">
                  {getIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className={`text-xs font-semibold truncate ${!item.read ? 'text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}>
                      {item.title}
                    </p>
                    <span className="text-[10px] text-slate-400 shrink-0">{item.time}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                    {item.description}
                  </p>
                </div>
                {!item.read && (
                  <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-2.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-center">
          <button
            onClick={() => navigate('/admin/reports')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center justify-center gap-1.5 w-full"
          >
            <span>View All Institutional Logs</span>
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

