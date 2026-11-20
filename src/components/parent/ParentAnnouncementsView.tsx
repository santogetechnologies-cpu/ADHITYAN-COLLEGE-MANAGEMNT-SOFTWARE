import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Calendar, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { db } from '@/services/supabase/database';
import { CalendarEvent } from '@/types/database.types';

export function ParentAnnouncementsView() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await db.getCalendarEvents();
      setEvents(data || []);
    } catch (err) {
      console.warn('Failed to load announcements:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Institutional Announcements</h2>
        <p className="text-muted-foreground text-sm">
          Official campus notices, academic circulars, and institutional calendar events
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading college notices...
        </div>
      ) : events.length === 0 ? (
        <Card className="rounded-2xl border-border p-8 text-center text-muted-foreground">
          <Bell className="w-10 h-10 mx-auto text-muted-foreground mb-3 opacity-60" />
          <h3 className="font-semibold text-foreground">No Current Announcements</h3>
          <p className="text-xs text-muted-foreground mt-1">
            New campus circulars and notifications will appear here.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => (
            <Card key={ev.id} className="rounded-2xl border-border shadow-xs hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">{ev.title}</span>
                    <Badge variant="outline" className="text-[10px] capitalize bg-blue-50 text-blue-700 border-blue-200">
                      {ev.category || 'Academic'}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">{ev.description || 'Institutional notification approved by Administration.'}</p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                  <span className="flex items-center gap-1 font-mono text-muted-foreground text-xs">
                    <Calendar className="w-3.5 h-3.5 text-primary" /> {ev.date}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

