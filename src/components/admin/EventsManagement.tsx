import { useState, useEffect, useCallback } from 'react';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, Plus, Edit, Trash2, Users, GraduationCap, Building2, Clock, MapPin, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { EmptyState } from '@/components/ui/empty-state';
import { db } from '@/services/supabase/database';

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  category: 'academic' | 'cultural' | 'sports' | 'exam' | 'meeting' | 'holiday';
  targetAudience: 'all' | 'students' | 'teachers' | 'parents' | 'staff';
  department?: string;
  class?: string;
  priority: 'low' | 'medium' | 'high';
  createdBy: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
}

const categoryIcons = {
  academic: GraduationCap,
  cultural: Users,
  sports: Users,
  exam: GraduationCap,
  meeting: Building2,
  holiday: Calendar
};

const categoryColors = {
  academic: 'bg-blue-100 text-blue-800',
  cultural: 'bg-purple-100 text-purple-800',
  sports: 'bg-green-100 text-green-800',
  exam: 'bg-red-100 text-red-800',
  meeting: 'bg-yellow-100 text-yellow-800',
  holiday: 'bg-gray-100 text-gray-800'
};

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800'
};

export function EventsManagement() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  const loadEvents = useCallback(async () => {
    try {
      const data = await db.getCalendarEvents();
      if (data && data.length > 0) {
        const mapped: Event[] = data.map(d => ({
          id: d.id,
          title: d.title,
          description: d.description || '',
          date: d.date,
          time: d.time || '10:00',
          location: d.location || 'Campus',
          category: (d.category as any) || 'academic',
          targetAudience: (d.target_audience as any) || 'all',
          department: d.department,
          class: d.class_name,
          priority: (d.priority as any) || 'medium',
          createdBy: d.created_by || 'Admin',
          status: (d.status as any) || 'upcoming'
        }));
        setEvents(mapped);
      } else {
        setEvents([]);
      }
    } catch (err) {
      console.error('Failed to load events from Supabase:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Real-time synchronization for campus calendar events
  useRealtimeSubscription({ table: 'calendar_events', onChange: loadEvents, onReconnect: loadEvents });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    category: 'academic' as Event['category'],
    targetAudience: 'all' as Event['targetAudience'],
    department: '',
    class: '',
    priority: 'medium' as Event['priority']
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      date: '',
      time: '',
      location: '',
      category: 'academic',
      targetAudience: 'all',
      department: '',
      class: '',
      priority: 'medium'
    });
    setEditingEvent(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingEvent) {
      try {
        await db.updateCalendarEvent(editingEvent.id, {
          title: formData.title,
          description: formData.description,
          date: formData.date,
          time: formData.time,
          location: formData.location,
          category: formData.category,
          target_audience: formData.targetAudience,
          department: formData.department,
          class_name: formData.class,
          priority: formData.priority
        });
        setEvents(events.map(event => 
          event.id === editingEvent.id 
            ? { ...event, ...formData }
            : event
        ));
        toast({
          title: "Event Updated",
          description: "Event has been saved to database successfully.",
        });
      } catch (err: any) {
        toast({
          title: "Failed to update event",
          description: err.message,
          variant: "destructive"
        });
      }
    } else {
      try {
        const created = await db.createCalendarEvent({
          title: formData.title,
          description: formData.description,
          date: formData.date,
          time: formData.time,
          location: formData.location,
          category: formData.category,
          target_audience: formData.targetAudience,
          department: formData.department,
          class_name: formData.class,
          priority: formData.priority,
          status: 'upcoming'
        });

        const newEvent: Event = {
          id: created?.id || Date.now().toString(),
          ...formData,
          createdBy: 'Admin',
          status: 'upcoming'
        };
        setEvents([...events, newEvent]);
        toast({
          title: "Event Created",
          description: "New event has been created in Supabase.",
        });
      } catch (err) {
        const newEvent: Event = {
          id: Date.now().toString(),
          ...formData,
          createdBy: 'Admin',
          status: 'upcoming'
        };
        setEvents([...events, newEvent]);
      }
    }
    
    setIsDialogOpen(false);
    resetForm();
  };

  const handleUpdateStatus = async (eventId: string, newStatus: Event['status']) => {
    try {
      await db.updateCalendarEvent(eventId, { status: newStatus });
      setEvents(events.map(ev => ev.id === eventId ? { ...ev, status: newStatus } : ev));
      toast({
        title: "Event Status Updated",
        description: `Event marked as ${newStatus}.`
      });
    } catch (err: any) {
      toast({
        title: "Failed to update status",
        description: err.message,
        variant: "destructive"
      });
    }
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description,
      date: event.date,
      time: event.time,
      location: event.location,
      category: event.category,
      targetAudience: event.targetAudience,
      department: event.department || '',
      class: event.class || '',
      priority: event.priority
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (eventId: string) => {
    try {
      await db.deleteCalendarEvent(eventId);
      setEvents(events.filter(event => event.id !== eventId));
      toast({
        title: "Event Deleted",
        description: "Event has been deleted successfully.",
        variant: "destructive",
      });
    } catch (err) {
      setEvents(events.filter(event => event.id !== eventId));
    }
  };

  const filteredEvents = events.filter(event => {
    if (selectedTab === 'all') return true;
    return event.status === selectedTab;
  });

  const EventCard = ({ event }: { event: Event }) => {
    const CategoryIcon = categoryIcons[event.category];
    
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <CategoryIcon className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">{event.title}</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => handleEdit(event)}>
                <Edit className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(event.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <CardDescription>{event.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date(event.date).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {event.time}
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {event.location}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Badge className={categoryColors[event.category]}>
              {event.category}
            </Badge>
            <Badge className={priorityColors[event.priority]}>
              {event.priority} priority
            </Badge>
            <Badge variant="outline">
              {event.targetAudience}
            </Badge>
            {event.department && (
              <Badge variant="secondary">
                {event.department}
              </Badge>
            )}
            {event.class && (
              <Badge variant="secondary">
                {event.class}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Events Management</h1>
          <p className="text-muted-foreground">Manage college events, meetings, and announcements</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingEvent ? 'Edit Event' : 'Create New Event'}
              </DialogTitle>
              <DialogDescription>
                {editingEvent ? 'Update event details' : 'Add a new event to the college calendar'}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="title">Event Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    required
                  />
                </div>
                
                <div className="col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({...formData, time: e.target.value})}
                    required
                  />
                </div>
                
                <div className="col-span-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(value: Event['category']) => setFormData({...formData, category: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="academic">Academic</SelectItem>
                      <SelectItem value="cultural">Cultural</SelectItem>
                      <SelectItem value="sports">Sports</SelectItem>
                      <SelectItem value="exam">Exam</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="holiday">Holiday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={formData.priority} onValueChange={(value: Event['priority']) => setFormData({...formData, priority: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="targetAudience">Target Audience</Label>
                  <Select value={formData.targetAudience} onValueChange={(value: Event['targetAudience']) => setFormData({...formData, targetAudience: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="students">Students</SelectItem>
                      <SelectItem value="teachers">Teachers</SelectItem>
                      <SelectItem value="parents">Parents</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="department">Department (Optional)</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    placeholder="e.g., Medical Lab Technology, Dialysis Technology"
                  />
                </div>
                
                <div>
                  <Label htmlFor="class">Semester / Batch (Optional)</Label>
                  <Input
                    id="class"
                    value={formData.class}
                    onChange={(e) => setFormData({...formData, class: e.target.value})}
                    placeholder="e.g., B.VOC MLT - Semester 1, All Semesters"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingEvent ? 'Update Event' : 'Create Event'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="all">All Events</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
        
        <TabsContent value={selectedTab} className="space-y-4">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <EmptyState
              icon={<Calendar className="w-full h-full" />}
              title="No Events Found"
              description={
                selectedTab === 'all' 
                  ? 'No events have been created yet. Click "Add Event" to create your first event.'
                  : `No ${selectedTab} events found.`
              }
              action={{
                label: "Add Event",
                onClick: () => setIsDialogOpen(true)
              }}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
