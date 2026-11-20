import { useState, useEffect, useCallback } from 'react';
import { Bell, Check, X, Clock, MessageCircle, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/supabase/database';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { toast } from 'sonner';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: Date;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
}

export function NotificationCenter() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const remote = await db.getNotifications(user.id);
      if (remote && remote.length > 0) {
        setNotifications(remote.map(r => ({
          id: r.id,
          title: r.title,
          message: r.message,
          type: r.type,
          timestamp: new Date(r.created_at || Date.now()),
          read: r.is_read,
          priority: r.priority,
        })));
      } else {
        setNotifications([]);
      }
    } catch (err) {
      console.warn('Failed to load notifications:', err);
    }
  }, [user]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Realtime subscription for incoming notifications & live updates
  useRealtimeSubscription<{ id: string; user_id?: string; title: string; message: string; type: any; priority: any; is_read: boolean; created_at: string }>({
    table: 'notifications',
    onInsert: (payload) => {
      const newNotif = payload.new as any;
      if (newNotif && (!newNotif.user_id || newNotif.user_id === user?.id)) {
        setNotifications(prev => [
          {
            id: newNotif.id,
            title: newNotif.title,
            message: newNotif.message,
            type: newNotif.type || 'info',
            timestamp: new Date(newNotif.created_at || Date.now()),
            read: newNotif.is_read,
            priority: newNotif.priority || 'medium',
          },
          ...prev.filter(n => n.id !== newNotif.id),
        ]);

        // Pop up a live toast alert for immediate cross-role feedback
        toast(newNotif.title, {
          description: newNotif.message,
        });
      }
    },
    onUpdate: (payload) => {
      const updated = payload.new as any;
      if (updated) {
        setNotifications(prev => prev.map(n => n.id === updated.id ? {
          ...n,
          title: updated.title,
          message: updated.message,
          read: updated.is_read,
          priority: updated.priority || n.priority,
          type: updated.type || n.type,
        } : n));
      }
    },
    onDelete: (payload) => {
      const old = payload.old as any;
      if (old?.id) {
        setNotifications(prev => prev.filter(n => n.id !== old.id));
      }
    },
    onReconnect: loadNotifications,
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    await db.markNotificationRead(id);
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    if (user) {
      await db.markAllNotificationsRead(user.id);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'error': return <X className="w-4 h-4 text-destructive" />;
      case 'success': return <Check className="w-4 h-4 text-success" />;
      default: return <Info className="w-4 h-4 text-primary" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return <Badge variant="destructive" className="text-xs">High</Badge>;
      case 'medium': return <Badge variant="secondary" className="text-xs">Medium</Badge>;
      default: return <Badge variant="outline" className="text-xs">Low</Badge>;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full text-xs flex items-center justify-center text-destructive-foreground animate-pulse-glow">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notifications</CardTitle>
              {unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  Mark all read
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-80">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No notifications</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 transition-colors hover:bg-muted/50 ${
                        !notification.read ? 'bg-muted/20' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between space-x-2">
                        <div className="flex items-start space-x-2 flex-1">
                          {getIcon(notification.type)}
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium leading-none">
                                {notification.title}
                              </p>
                              {getPriorityBadge(notification.priority)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {notification.message}
                            </p>
                            <div className="flex items-center space-x-2 text-xs text-muted-foreground pt-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatTimestamp(notification.timestamp)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-6 h-6"
                              onClick={() => markAsRead(notification.id)}
                            >
                              <Check className="w-3 h-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-6 h-6"
                            onClick={() => removeNotification(notification.id)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
