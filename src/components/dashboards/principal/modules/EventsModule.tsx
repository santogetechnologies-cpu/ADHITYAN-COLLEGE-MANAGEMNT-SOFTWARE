import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Plus, 
  Search, 
  Users, 
  AlertCircle, 
  CheckCircle2, 
  Trash2, 
  Loader2,
  Sparkles
} from 'lucide-react';
import { CalendarEvent } from '@/types/database.types';

interface EventsModuleProps {
  events: CalendarEvent[];
  onAddEvent: (event: Omit<CalendarEvent, 'id' | 'created_at'>) => Promise<boolean>;
  onDeleteEvent?: (id: string) => Promise<boolean>;
}

export function EventsModule({
  events,
  onAddEvent,
  onDeleteEvent
}: EventsModuleProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    location: 'Campus Auditorium / Main Block',
    category: 'academic' as CalendarEvent['category'],
    target_audience: 'all' as CalendarEvent['target_audience'],
    priority: 'medium' as CalendarEvent['priority'],
    status: 'upcoming' as CalendarEvent['status']
  });

  const categories = [
    { id: 'all', label: 'All Categories' },
    { id: 'academic', label: 'Academic' },
    { id: 'exam', label: 'Examinations' },
    { id: 'meeting', label: 'Council Meetings' },
    { id: 'holiday', label: 'Holidays' },
    { id: 'cultural', label: 'Cultural' },
    { id: 'sports', label: 'Sports' }
  ];

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events
      .filter(e => {
        const matchesCat = categoryFilter === 'all' || e.category === categoryFilter;
        const matchesSearch = !searchTerm || 
          e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (e.location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (e.description || '').toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCat && matchesSearch;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [events, categoryFilter, searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.date) return;

    setSubmitting(true);
    try {
      const ok = await onAddEvent({
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        date: formData.date,
        time: formData.time || undefined,
        location: formData.location.trim() || undefined,
        category: formData.category,
        target_audience: formData.target_audience,
        priority: formData.priority,
        status: formData.status
      });

      if (ok) {
        setAddModalOpen(false);
        setFormData({
          title: '',
          description: '',
          date: new Date().toISOString().split('T')[0],
          time: '09:00',
          location: 'Campus Auditorium / Main Block',
          category: 'academic',
          target_audience: 'all',
          priority: 'medium',
          status: 'upcoming'
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!onDeleteEvent) return;
    setDeletingId(id);
    try {
      await onDeleteEvent(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Institutional Calendar & Campus Events
            </h2>
            <Badge variant="outline" className="text-xs border-indigo-200 text-indigo-700 bg-indigo-50">
              Academic Year 2026–27
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Coordinate and sanction college academic calendars, clinical posting schedules, examinations, and official assemblies.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setAddModalOpen(true)}
          className="h-8 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs shrink-0"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Schedule Event
        </Button>
      </div>

      {/* 2. Filter Bar */}
      <Card className="border-slate-200 shadow-2xs">
        <CardContent className="p-3.5">
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search events by title, auditorium, or keyword..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs w-full"
              />
            </div>

            <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto">
              {categories.map(c => (
                <Button
                  key={c.id}
                  variant={categoryFilter === c.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCategoryFilter(c.id)}
                  className="h-7 text-xs px-2.5 font-medium whitespace-nowrap"
                >
                  {c.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Events Timeline / List */}
      <div className="space-y-3">
        {filteredEvents.length === 0 ? (
          <Card className="border-slate-200 shadow-2xs">
            <CardContent className="p-12 text-center">
              <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">No Calendar Events Scheduled</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {searchTerm || categoryFilter !== 'all' 
                  ? 'No events match your current filter.' 
                  : 'Click "Schedule Event" above to create an institutional calendar entry.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredEvents.map((evt) => {
              const eventDate = new Date(evt.date);
              const isPast = eventDate < new Date(new Date().setHours(0, 0, 0, 0));
              const isDeleting = deletingId === evt.id;

              return (
                <Card 
                  key={evt.id} 
                  className={`border-slate-200 shadow-2xs transition-all flex flex-col justify-between ${
                    isPast ? 'opacity-70 bg-slate-50/50' : 'bg-white hover:border-primary/40'
                  }`}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-1.5">
                        <Badge 
                          variant="outline" 
                          className="text-[10px] uppercase font-bold tracking-wider bg-slate-50 border-slate-200"
                        >
                          {evt.category}
                        </Badge>
                        {evt.priority === 'high' && (
                          <Badge variant="destructive" className="text-[10px]">
                            High Priority
                          </Badge>
                        )}
                      </div>

                      {onDeleteEvent && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isDeleting}
                          onClick={() => handleDelete(evt.id)}
                          className="h-6 w-6 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        >
                          {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </Button>
                      )}
                    </div>

                    <CardTitle className="text-sm font-bold text-slate-900 mt-2 line-clamp-1">
                      {evt.title}
                    </CardTitle>
                    {evt.description && (
                      <CardDescription className="text-xs text-slate-600 line-clamp-2 mt-1">
                        {evt.description}
                      </CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className="p-4 pt-2">
                    <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-2.5">
                      <div className="flex items-center space-x-2">
                        <CalendarIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-800">
                          {eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        {evt.time && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-600">{evt.time}</span>
                          </>
                        )}
                      </div>

                      {evt.location && (
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{evt.location}</span>
                        </div>
                      )}

                      <div className="flex items-center space-x-2">
                        <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="capitalize text-[11px] text-slate-500">Audience: {evt.target_audience}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Schedule Event Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-md bg-white p-5 rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <CalendarIcon className="w-4 h-4 text-primary" />
              <span>Schedule Institutional Event</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Dispatches date to the college academic calendar visible to students and faculty.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3 pt-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Event Title *</label>
              <Input
                required
                placeholder="e.g. Annual Paramedical Clinical Conference"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Event Date *</label>
                <Input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Time</label>
                <Input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full h-8 px-2 text-xs border border-slate-200 rounded-md bg-white"
                >
                  <option value="academic">Academic Activity</option>
                  <option value="exam">Examination</option>
                  <option value="meeting">Council Meeting</option>
                  <option value="holiday">Official Holiday</option>
                  <option value="cultural">Cultural Event</option>
                  <option value="sports">Sports</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Target Audience</label>
                <select
                  value={formData.target_audience}
                  onChange={(e) => setFormData({ ...formData, target_audience: e.target.value as any })}
                  className="w-full h-8 px-2 text-xs border border-slate-200 rounded-md bg-white"
                >
                  <option value="all">Entire Campus</option>
                  <option value="students">Students Only</option>
                  <option value="teachers">Faculty Only</option>
                  <option value="parents">Parents Only</option>
                  <option value="staff">Staff Only</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Campus Venue / Location</label>
              <Input
                placeholder="e.g. Paramedical Auditorium, Level 2"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Description</label>
              <Textarea
                rows={2}
                placeholder="Brief outline or agenda of the event..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setAddModalOpen(false)} className="h-8 text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submitting} className="h-8 text-xs bg-primary text-primary-foreground font-semibold">
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
                Confirm & Add Event
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
