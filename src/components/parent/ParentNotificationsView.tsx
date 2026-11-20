import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Clock, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { db } from '@/services/supabase/database';
import { Notification } from '@/types/database.types';

interface ParentNotificationsViewProps {
  userId: string;
}

export function ParentNotificationsView({ userId }: ParentNotificationsViewProps) {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const loadNotifications = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await db.getNotifications(userId);
      setNotifications(data || []);
    } catch (err) {
      console.warn('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">System Alerts & Notifications</h2>
        <p className="text-muted-foreground text-sm">
          Automated messages, fee alerts, and attendance notifications
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading system alerts...
        </div>
      ) : notifications.length === 0 ? (
        <Card className="rounded-2xl border-border p-8 text-center text-muted-foreground">
          <Bell className="w-10 h-10 mx-auto text-muted-foreground mb-3 opacity-60" />
          <h3 className="font-semibold text-foreground">No Unread Notifications</h3>
          <p className="text-xs text-muted-foreground mt-1">
            System notices, schedule modifications, and fee receipts will appear here.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card key={n.id} className="rounded-2xl border-border shadow-xs">
              <CardContent className="p-4 sm:p-5 flex items-start gap-3 text-xs">
                <div className="p-2 rounded-xl bg-blue-50 text-[#1D61E7] shrink-0 mt-0.5">
                  <Bell className="w-4 h-4" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-foreground">{n.title}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {n.created_at ? new Date(n.created_at).toLocaleDateString() : 'Recent'}
                    </span>
                  </div>
                  <p className="text-muted-foreground">{n.message}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

