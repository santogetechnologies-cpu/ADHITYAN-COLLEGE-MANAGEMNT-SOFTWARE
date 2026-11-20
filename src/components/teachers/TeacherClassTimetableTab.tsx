import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  BookOpen, 
  GraduationCap, 
  Users, 
  Loader2, 
  RefreshCw,
  Info,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { db } from '@/services/supabase/database';
import { useAuth } from '@/context/AuthContext';
import { TimetableSlot } from '@/types/database.types';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface TeacherClassTimetableTabProps {
  selectedClass?: string;
}

export function TeacherClassTimetableTab({ selectedClass }: TeacherClassTimetableTabProps = {}) {
  const { user } = useAuth();
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string>('All');

  const loadTimetable = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await db.getTeacherTimetables(user.id, user.name);
      setSlots(data || []);
    } catch (err) {
      console.warn('TeacherClassTimetableTab load warning:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadTimetable();
  }, [loadTimetable]);

  // Real-time synchronization when Admin updates timetables
  useRealtimeSubscription({
    table: 'timetables',
    onChange: loadTimetable,
    onReconnect: loadTimetable,
  });

  const classFilteredSlots = selectedClass 
    ? slots.filter(s => s.class_name === selectedClass || (s.class_name && selectedClass.includes(s.class_name)))
    : slots;

  const displaySlots = classFilteredSlots.length > 0 ? classFilteredSlots : slots;

  const filteredSlots = selectedDay === 'All' 
    ? displaySlots 
    : displaySlots.filter(s => s.day_of_week?.toLowerCase() === selectedDay.toLowerCase());

  // Group by day of week
  const slotsByDay = DAYS_OF_WEEK.reduce((acc, day) => {
    acc[day] = displaySlots.filter(s => s.day_of_week?.toLowerCase() === day.toLowerCase())
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
    return acc;
  }, {} as Record<string, TimetableSlot[]>);

  const totalSessions = slots.length;
  const distinctClasses = Array.from(new Set(slots.map(s => s.class_name))).filter(Boolean);
  const distinctSubjects = Array.from(new Set(slots.map(s => s.subject))).filter(Boolean);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 bg-white rounded-2xl border border-slate-200">
        <Loader2 className="w-8 h-8 animate-spin text-[#1D61E7]" />
        <span className="ml-3 text-sm text-slate-600 font-medium">Loading Assigned Timetable Periods...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1D61E7] flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Faculty Academic Timetable</h3>
                <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                  <ShieldCheck className="w-3 h-3 mr-1" /> View-Only (Admin Managed)
                </Badge>
              </div>
              <p className="text-xs text-slate-500">Official weekly lecture schedule published by the Academic Dean & Principal</p>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={loadTimetable}
            className="h-8 text-xs font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh Schedule
          </Button>
        </div>

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Weekly Workload</span>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{totalSessions} Lecture Sessions</div>
            <p className="text-[11px] text-slate-500">Scheduled across Mon – Sat</p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Assigned Classes</span>
            <div className="text-xl font-bold text-[#1D61E7] mt-0.5">{distinctClasses.length} Batches</div>
            <p className="text-[11px] text-slate-500 truncate">{distinctClasses.join(', ') || 'None'}</p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Teaching Subjects</span>
            <div className="text-xl font-bold text-emerald-700 mt-0.5">{distinctSubjects.length} Courses</div>
            <p className="text-[11px] text-slate-500 truncate">{distinctSubjects.join(', ') || 'None'}</p>
          </div>
        </div>

        {/* Day Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
          <Button
            size="sm"
            variant={selectedDay === 'All' ? 'default' : 'outline'}
            onClick={() => setSelectedDay('All')}
            className="h-7 text-xs font-semibold rounded-lg"
          >
            All Working Days
          </Button>
          {DAYS_OF_WEEK.map(day => (
            <Button
              key={day}
              size="sm"
              variant={selectedDay === day ? 'default' : 'outline'}
              onClick={() => setSelectedDay(day)}
              className="h-7 text-xs font-semibold rounded-lg"
            >
              {day}
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-700">
                {slotsByDay[day]?.length || 0}
              </span>
            </Button>
          ))}
        </div>
      </div>

      {/* Timetable Schedule Grid */}
      {slots.length === 0 ? (
        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-800 text-base">No Timetable Periods Assigned</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              The Administration or Principal has not yet published timetable slots for your faculty profile.
              Once assigned, your periods, labs, and lecture halls will appear here automatically in real time.
            </p>
          </CardContent>
        </Card>
      ) : selectedDay !== 'All' ? (
        /* Single Day View */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#1D61E7]" />
              {selectedDay} Schedule ({filteredSlots.length} Sessions)
            </h4>
          </div>

          {filteredSlots.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No classes scheduled for {selectedDay}.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredSlots.map((slot, idx) => (
                <div key={slot.id || idx} className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1D61E7] flex flex-col items-center justify-center font-bold text-xs shrink-0">
                      <span>P{idx + 1}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="font-bold text-slate-900 text-sm">{slot.subject}</h5>
                        <Badge variant="outline" className="text-[11px] font-mono bg-slate-50">
                          {slot.class_name}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1 font-medium text-slate-700">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {slot.start_time} – {slot.end_time}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {slot.room || 'Lecture Hall 1'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="self-start sm:self-auto text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                    Active Assignment
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Weekly Matrix View */
        <div className="space-y-4">
          {DAYS_OF_WEEK.map(day => {
            const daySlots = slotsByDay[day] || [];
            if (daySlots.length === 0) return null;

            return (
              <div key={day} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="px-5 py-3 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-xs tracking-wider uppercase flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-[#1D61E7]" />
                    {day}
                  </h4>
                  <Badge variant="outline" className="text-[11px] bg-white">
                    {daySlots.length} {daySlots.length === 1 ? 'Period' : 'Periods'}
                  </Badge>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50/40 border-b border-slate-100 text-slate-500 uppercase text-[10px] font-bold">
                      <tr>
                        <th className="p-3 w-16 text-center">Period</th>
                        <th className="p-3">Time</th>
                        <th className="p-3">Subject</th>
                        <th className="p-3">Class / Batch</th>
                        <th className="p-3">Room / Lab</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {daySlots.map((slot, idx) => (
                        <tr key={slot.id || idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-3 text-center font-bold font-mono text-[#1D61E7]">
                            P{idx + 1}
                          </td>
                          <td className="p-3 font-semibold text-slate-800 whitespace-nowrap">
                            {slot.start_time} – {slot.end_time}
                          </td>
                          <td className="p-3 font-bold text-slate-900">
                            {slot.subject}
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="font-medium bg-slate-50 text-slate-700">
                              {slot.class_name}
                            </Badge>
                          </td>
                          <td className="p-3 text-slate-600 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {slot.room || 'Lecture Hall 1'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

