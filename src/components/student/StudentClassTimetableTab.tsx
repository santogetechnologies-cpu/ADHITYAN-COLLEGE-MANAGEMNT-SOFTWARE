import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  UserCheck, 
  RefreshCw, 
  Printer, 
  GraduationCap, 
  BookOpen, 
  Lock
} from 'lucide-react';
import { db } from '@/services/supabase/database';
import { TimetableSlot } from '@/types/database.types';
import { useAuth } from '@/context/AuthContext';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useToast } from '@/hooks/use-toast';

const WORKING_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export function StudentClassTimetableTab() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('all');

  // Real-time Day Detection
  const todayName = useMemo(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const current = days[new Date().getDay()];
    return current;
  }, []);

  // Student course and class identity
  const studentCourse = user?.department || 'Paramedical Sciences';
  const studentClass = user?.class_name || '1st Year';
  const studentId = user?.student_id || user?.roll_number || 'AIP-STUDENT';

  // Load class timetables from database
  const loadTimetable = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch matching timetables for student's course and semester
      const slots = await db.getTimetables({
        courseName: studentCourse,
        yearSemester: studentClass
      });
      setTimetableSlots(slots || []);
    } catch (err) {
      console.warn('Failed to load student timetable:', err);
      toast({
        title: 'Error Loading Timetable',
        description: 'Could not retrieve schedule from database.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [studentCourse, studentClass, toast]);

  useEffect(() => {
    loadTimetable();
  }, [loadTimetable]);

  // Real-time synchronization when Teacher or Admin publishes updates
  useRealtimeSubscription({
    table: 'timetables',
    onChange: loadTimetable,
    onReconnect: loadTimetable,
  });

  const handlePrint = () => {
    window.print();
  };

  // Filtered and sorted slots
  const filteredSlots = useMemo(() => {
    let slots = [...timetableSlots];
    if (selectedDayFilter !== 'all') {
      slots = slots.filter(s => s.day_of_week === selectedDayFilter);
    }
    // Sort chronologically by day order then start_time
    const dayOrderMap: Record<string, number> = {
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
      Sunday: 7
    };
    return slots.sort((a, b) => {
      const dA = dayOrderMap[a.day_of_week] || 99;
      const dB = dayOrderMap[b.day_of_week] || 99;
      if (dA !== dB) return dA - dB;
      return (a.start_time || '').localeCompare(b.start_time || '');
    });
  }, [timetableSlots, selectedDayFilter]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* 1. Header Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#1D61E7] flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Class Timetable
                </h1>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold flex items-center space-x-1">
                  <Lock className="w-3 h-3 text-emerald-600" />
                  <span>View Only</span>
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Official weekly academic timetable published by College Administration and Faculty
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-600">
            <span className="flex items-center">
              <GraduationCap className="w-3.5 h-3.5 mr-1 text-[#1D61E7]" />
              Course: <strong className="ml-1 text-slate-800">{studentCourse}</strong>
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center">
              <BookOpen className="w-3.5 h-3.5 mr-1 text-[#1D61E7]" />
              Semester: <strong className="ml-1 text-slate-800">{studentClass}</strong>
            </span>
            <span className="text-slate-300">•</span>
            <span className="font-mono text-slate-500">ID: {studentId}</span>
          </div>
        </div>

        {/* Action Controls: Print, Refresh */}
        <div className="flex items-center space-x-2 self-start sm:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="h-9 px-3 text-xs font-semibold rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <Printer className="w-3.5 h-3.5 mr-1 text-slate-500" /> Print Schedule
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadTimetable}
            disabled={loading}
            className="h-9 px-3 text-xs font-semibold rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#1D61E7]' : 'text-slate-500'}`} />
          </Button>
        </div>
      </div>

      {/* 2. Working Day Filter */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-2xs flex items-center justify-between overflow-x-auto gap-2">
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setSelectedDayFilter('all')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              selectedDayFilter === 'all'
                ? 'bg-[#1D61E7] text-white shadow-2xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60'
            }`}
          >
            All Working Days (Mon — Sat)
          </button>

          {WORKING_DAYS.map(day => {
            const isSelected = selectedDayFilter === day;
            const isToday = todayName === day;

            return (
              <button
                key={day}
                onClick={() => setSelectedDayFilter(day)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 shrink-0 ${
                  isSelected
                    ? 'bg-[#1D61E7] text-white shadow-2xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60'
                }`}
              >
                <span>{day}</span>
                {isToday && (
                  <span 
                    className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} 
                    title="Today" 
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Clean Timetable Table Format */}
      <Card className="bg-white border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
        <CardHeader className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-[#1D61E7]" />
            <CardTitle className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              {selectedDayFilter === 'all' ? 'Complete Weekly Schedule' : `${selectedDayFilter} Timetable`}
            </CardTitle>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            {filteredSlots.length} Scheduled Classes
          </span>
        </CardHeader>

        <CardContent className="p-0">
          {filteredSlots.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-800">No Timetable Scheduled</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {loading 
                    ? 'Retrieving latest academic timetable...' 
                    : `No class schedule entries found for ${studentCourse} (${studentClass}). Schedules published by teachers will appear here.`}
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-700 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3.5 w-28">Day</th>
                    <th className="p-3.5 w-36">Time</th>
                    <th className="p-3.5">Subject</th>
                    <th className="p-3.5">Teacher (Faculty)</th>
                    <th className="p-3.5">Classroom / Lab Venue</th>
                    <th className="p-3.5 text-right w-24">Session Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSlots.map((slot) => {
                    const isToday = slot.day_of_week === todayName;
                    const sessionType = slot.session_type || 'theory';

                    return (
                      <tr 
                        key={slot.id} 
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isToday ? 'bg-blue-50/25' : ''
                        }`}
                      >
                        <td className="p-3.5 font-bold text-slate-900 flex items-center space-x-1.5">
                          <span>{slot.day_of_week}</span>
                          {isToday && (
                            <Badge className="bg-blue-100 text-blue-700 text-[9px] px-1 py-0 font-bold border-blue-200">
                              Today
                            </Badge>
                          )}
                        </td>
                        <td className="p-3.5 font-mono font-semibold text-slate-700">
                          <div className="flex items-center space-x-1.5">
                            <Clock className="w-3.5 h-3.5 text-[#1D61E7]" />
                            <span>{slot.start_time?.slice(0, 5)} — {slot.end_time?.slice(0, 5)}</span>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900 text-xs">
                            {slot.subject}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {slot.course_name || studentCourse}
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-800 font-medium">
                          <div className="flex items-center space-x-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{slot.teacher_name || 'Faculty Staff'}</span>
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-700">
                          <div className="flex items-center space-x-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-semibold text-slate-800">
                              {slot.room_lab || slot.room || 'Lecture Hall'}
                            </span>
                          </div>
                        </td>
                        <td className="p-3.5 text-right">
                          <Badge 
                            variant="outline" 
                            className={`text-[10px] font-semibold uppercase ${
                              sessionType === 'practical' 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : sessionType === 'clinical' 
                                ? 'bg-purple-50 text-purple-700 border-purple-200' 
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {sessionType}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
