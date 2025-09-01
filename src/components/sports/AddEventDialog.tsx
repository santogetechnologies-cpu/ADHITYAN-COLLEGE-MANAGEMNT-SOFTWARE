import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AddEventDialogProps {
  onEventAdded: (event: any) => void;
}

export const AddEventDialog = ({ onEventAdded }: AddEventDialogProps) => {
  const [open, setOpen] = useState(false);
  const [eventData, setEventData] = useState({
    name: '',
    sport: '',
    date: '',
    description: '',
    venue: '',
    category: '',
    maxParticipants: '',
    registrationDeadline: '',
  });
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!eventData.name || !eventData.sport || !eventData.date) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const newEvent = {
      id: Date.now(),
      name: eventData.name,
      sport: eventData.sport,
      date: eventData.date,
      status: 'Registrations Open',
      participants: 0,
      teams: eventData.category === 'team' ? 0 : undefined,
      description: eventData.description,
      venue: eventData.venue,
      category: eventData.category,
      maxParticipants: parseInt(eventData.maxParticipants) || 0,
      registrationDeadline: eventData.registrationDeadline,
    };

    onEventAdded(newEvent);
    
    toast({
      title: "Success",
      description: "Sports event created successfully!",
    });
    
    setEventData({
      name: '',
      sport: '',
      date: '',
      description: '',
      venue: '',
      category: '',
      maxParticipants: '',
      registrationDeadline: '',
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Event
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Sports Event</DialogTitle>
          <DialogDescription>
            Add a new sports event or competition to the calendar.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Event Name *</Label>
              <Input
                id="name"
                value={eventData.name}
                onChange={(e) => setEventData({ ...eventData, name: e.target.value })}
                placeholder="e.g., Annual Sports Day"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sport">Sport/Activity *</Label>
              <Select value={eventData.sport} onValueChange={(value) => setEventData({ ...eventData, sport: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sport" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Football">Football</SelectItem>
                  <SelectItem value="Basketball">Basketball</SelectItem>
                  <SelectItem value="Cricket">Cricket</SelectItem>
                  <SelectItem value="Badminton">Badminton</SelectItem>
                  <SelectItem value="Athletics">Athletics</SelectItem>
                  <SelectItem value="Swimming">Swimming</SelectItem>
                  <SelectItem value="Tennis">Tennis</SelectItem>
                  <SelectItem value="Volleyball">Volleyball</SelectItem>
                  <SelectItem value="Multiple">Multiple Sports</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Event Date *</Label>
              <Input
                id="date"
                type="date"
                value={eventData.date}
                onChange={(e) => setEventData({ ...eventData, date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="registrationDeadline">Registration Deadline</Label>
              <Input
                id="registrationDeadline"
                type="date"
                value={eventData.registrationDeadline}
                onChange={(e) => setEventData({ ...eventData, registrationDeadline: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Event Category</Label>
              <Select value={eventData.category} onValueChange={(value) => setEventData({ ...eventData, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxParticipants">Max Participants</Label>
              <Input
                id="maxParticipants"
                type="number"
                value={eventData.maxParticipants}
                onChange={(e) => setEventData({ ...eventData, maxParticipants: e.target.value })}
                placeholder="e.g., 50"
                min="1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="venue">Venue</Label>
            <Input
              id="venue"
              value={eventData.venue}
              onChange={(e) => setEventData({ ...eventData, venue: e.target.value })}
              placeholder="e.g., School Ground, Sports Hall"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={eventData.description}
              onChange={(e) => setEventData({ ...eventData, description: e.target.value })}
              placeholder="Event details, rules, and additional information..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Event</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};