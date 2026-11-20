import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BookOpen, 
  Calendar, 
  Clock, 
  Layers, 
  CheckCircle2, 
  Building2, 
  Search,
  FileText,
  MapPin
} from 'lucide-react';
import { Department, CalendarEvent, DailyTeachingUpdate } from '@/types/database.types';

interface AcademicsModuleProps {
  departments: Department[];
  calendarEvents: CalendarEvent[];
  dailyUpdates?: DailyTeachingUpdate[];
  timetableSlots?: any[];
}

export function AcademicsModule({
  departments,
  calendarEvents,
  dailyUpdates = [],
  timetableSlots = []
}: AcademicsModuleProps) {
  const [selectedDept, setSelectedDept] = useState<string>(departments[0]?.name || 'all');
  const [selectedSemester, setSelectedSemester] = useState<string>('Semester 1');

  const academicEvents = useMemo(() => {
    return calendarEvents.filter(e => e.category === 'academic' || e.category === 'exam');
  }, [calendarEvents]);

  const filteredUpdates = useMemo(() => {
    if (selectedDept === 'all') return dailyUpdates;
    return dailyUpdates.filter(u => 
      u.course_name?.toLowerCase().includes(selectedDept.toLowerCase()) ||
      u.class_name?.toLowerCase().includes(selectedDept.toLowerCase())
    );
  }, [dailyUpdates, selectedDept]);

  const filteredTimetable = useMemo(() => {
    return timetableSlots.filter(s => {
      const matchCourse = selectedDept === 'all' || s.course_name?.toLowerCase().includes(selectedDept.toLowerCase());
      const matchSem = !selectedSemester || s.year_semester?.toLowerCase().includes(selectedSemester.toLowerCase());
      return matchCourse && matchSem;
    });
  }, [timetableSlots, selectedDept, selectedSemester]);

  return (
    <div className="space-y-5">
      {/* Module Title Bar */}
      <div className="pb-2 border-b border-slate-200">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <span>Academic Curriculum & Syllabus Progress</span>
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Curriculum monitoring, master timetable matrix, and faculty syllabus completion tracking
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="syllabus" className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-lg">
          <TabsTrigger value="syllabus" className="text-xs font-semibold px-3 py-1.5 data-[state=active]:bg-white">
            Daily Lesson Updates ({dailyUpdates.length})
          </TabsTrigger>
          <TabsTrigger value="timetable" className="text-xs font-semibold px-3 py-1.5 data-[state=active]:bg-white">
            Master Timetable Matrix ({timetableSlots.length})
          </TabsTrigger>
          <TabsTrigger value="calendar" className="text-xs font-semibold px-3 py-1.5 data-[state=active]:bg-white">
            Academic Calendar ({academicEvents.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Daily Syllabus Lesson Logs */}
        <TabsContent value="syllabus" className="space-y-4 mt-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Faculty Lesson Completion Logs
            </h3>
            <Select value={selectedDept} onValueChange={setSelectedDept}>
              <SelectTrigger className="h-8 text-xs w-60 bg-white">
                <SelectValue placeholder="Filter Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.name}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card className="bg-white border-slate-200 shadow-2xs overflow-hidden">
            {filteredUpdates.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-800">No Lesson Updates Logged</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  When teachers record daily lecture and practical topics, they appear here for Principal review.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredUpdates.map((u) => (
                  <div key={u.id} className="p-4 hover:bg-slate-50 transition-colors text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900">{u.subject}</span>
                        <Badge variant="outline" className="text-[10px] bg-slate-50">
                          {u.course_name}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {u.class_name}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-muted-foreground font-mono">{u.date}</span>
                    </div>
                    <p className="text-slate-700 leading-relaxed mt-1">
                      <strong className="text-slate-900 font-semibold">Topics Covered:</strong> {u.topics_covered}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                      <span>Faculty In-Charge: <strong>{u.teacher_name}</strong></span>
                      <span>Next Session Plan: {u.next_plan || 'Clinical Practical Rotation'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Tab 2: Master Timetable Matrix */}
        <TabsContent value="timetable" className="space-y-4 mt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Department Period Routine Matrix
            </h3>
            <div className="flex items-center space-x-2">
              <Select value={selectedDept} onValueChange={setSelectedDept}>
                <SelectTrigger className="h-8 text-xs w-48 bg-white">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.name}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                <SelectTrigger className="h-8 text-xs w-36 bg-white">
                  <SelectValue placeholder="Semester" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Semester 1">Semester 1</SelectItem>
                  <SelectItem value="Semester 2">Semester 2</SelectItem>
                  <SelectItem value="Semester 3">Semester 3</SelectItem>
                  <SelectItem value="Semester 4">Semester 4</SelectItem>
                  <SelectItem value="Semester 5">Semester 5</SelectItem>
                  <SelectItem value="Semester 6">Semester 6</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card className="bg-white border-slate-200 shadow-2xs overflow-hidden">
            {filteredTimetable.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                <Calendar className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-800">No Timetable Slots Scheduled</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Class period schedules registered in Timetable Management will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredTimetable.map((slot) => (
                  <div key={slot.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                    <div>
                      <div className="font-bold text-slate-900 flex items-center space-x-2">
                        <span>{slot.subject}</span>
                        <Badge variant="outline" className="text-[10px]">{slot.day}</Badge>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {slot.start_time} - {slot.end_time} • Room: {slot.room_lab || slot.room || 'Lecture Hall'}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-medium text-slate-800 block">{slot.teacher}</span>
                      <span className="text-[10px] text-muted-foreground">{slot.course_name}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Tab 3: Academic Calendar */}
        <TabsContent value="calendar" className="space-y-4 mt-3">
          <Card className="bg-white border-slate-200 shadow-2xs overflow-hidden">
            <CardHeader className="p-4 pb-2 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900">
                Official Academic Milestones & Semester Calendar
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {academicEvents.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No academic milestones scheduled in the calendar.
                </div>
              ) : (
                <div className="space-y-2">
                  {academicEvents.map((e) => (
                    <div key={e.id} className="p-3 border rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-blue-50 text-blue-700 font-bold text-center min-w-10">
                          <span className="block text-[9px] uppercase">{new Date(e.date).toLocaleDateString('en-IN', { month: 'short' })}</span>
                          <span className="text-sm">{new Date(e.date).getDate()}</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900">{e.title}</h4>
                          <p className="text-[11px] text-muted-foreground">{e.description || 'Institutional Academic Event'}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary">
                        {e.category}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
