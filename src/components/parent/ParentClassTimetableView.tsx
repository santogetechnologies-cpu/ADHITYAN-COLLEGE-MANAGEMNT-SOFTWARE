import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, MapPin, User, Loader2 } from 'lucide-react';
import { db } from '@/services/supabase/database';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { TimetableSlot } from '@/types/database.types';

interface ParentClassTimetableViewProps {
  className: string;
  department: string;
  studentName: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export function ParentClassTimetableView({
  className,
  department,
  studentName,
}: ParentClassTimetableViewProps) {
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>('Monday');

  const loadTimetable = useCallback(async () => {
    setLoading(true);
    try {
      const data = await db.getTimetableSlots({
        className: className || 'Semester 1',
        department: department || 'Paramedical Sciences',
      });
      setSlots(data || []);
    } catch (err) {
      console.warn('Failed to load class timetable:', err);
    } finally {
      setLoading(false);
    }
  }, [className, department]);

  useEffect(() => {
    loadTimetable();
  }, [loadTimetable]);

  useRealtimeSubscription({
    table: 'timetables',
    onChange: loadTimetable,
    onReconnect: loadTimetable,
  });

  const slotsForDay = slots.filter(s => s.day_of_week === selectedDay);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Weekly Class Timetable</h2>
          <p className="text-muted-foreground text-sm">
            Official academic schedule for {studentName} ({department} • {className || 'Semester 1'})
          </p>
        </div>
      </div>

      <Tabs value={selectedDay} onValueChange={setSelectedDay} className="w-full">
        <TabsList className="grid grid-cols-3 sm:grid-cols-6 w-full">
          {DAYS.map(day => (
            <TabsTrigger key={day} value={day} className="text-xs">
              {day.slice(0, 3)}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-4">
          <Card className="rounded-2xl border-border shadow-xs">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#1D61E7]" />
                  {selectedDay} Schedule
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  {slotsForDay.length} Period{slotsForDay.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Classroom allocation and assigned faculty
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              {loading ? (
                <div className="flex items-center justify-center p-8 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading class schedule...
                </div>
              ) : slotsForDay.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm space-y-2">
                  <p>No lectures scheduled for {selectedDay}.</p>
                  <p className="text-xs text-muted-foreground">Clinical rotations, library study, or institutional rest period.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {slotsForDay.map((slot, index) => (
                    <div 
                      key={slot.id || index}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-[#1D61E7] font-semibold text-center min-w-[70px]">
                          <Clock className="w-3.5 h-3.5 mx-auto mb-0.5" />
                          <span>{slot.start_time?.slice(0, 5)} - {slot.end_time?.slice(0, 5)}</span>
                        </div>
                        <div>
                          <div className="font-bold text-sm text-foreground">{slot.subject}</div>
                          <div className="text-muted-foreground flex items-center gap-1.5 pt-0.5">
                            <User className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>Faculty: {slot.teacher_name || 'Assigned Lecturer'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center">
                        <Badge variant="secondary" className="flex items-center gap-1 font-mono text-[11px]">
                          <MapPin className="w-3 h-3" /> {slot.room || 'Room 101'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Tabs>
    </div>
  );
}

