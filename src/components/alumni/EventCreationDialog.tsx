import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { 
  Calendar as CalendarIcon,
  MapPin,
  Users,
  DollarSign,
  Mail,
  Phone,
  FileText,
  Upload,
  Save,
  Send,
  Plus,
  Edit,
  Trash2,
  Clock
} from 'lucide-react';

interface EventCreationDialogProps {
  children: React.ReactNode;
  isEdit?: boolean;
  eventId?: string;
}

export const EventCreationDialog = ({ 
  children, 
  isEdit = false,
  eventId 
}: EventCreationDialogProps) => {
  const [open, setOpen] = useState(false);
  const [eventDate, setEventDate] = useState<Date>();
  const [registrationDeadline, setRegistrationDeadline] = useState<Date>();
  const [activeTab, setActiveTab] = useState('basic');

  const [eventData, setEventData] = useState({
    // Basic Information
    title: '',
    description: '',
    eventType: '', // reunion, seminar, networking, workshop, celebration
    category: '', // academic, social, professional, fundraising
    
    // Date & Time
    startTime: '',
    endTime: '',
    duration: '',
    timezone: 'IST',
    
    // Location
    venue: '',
    address: '',
    city: '',
    state: '',
    isVirtual: false,
    meetingLink: '',
    hybridEvent: false,
    
    // Registration
    requiresRegistration: true,
    maxAttendees: '',
    registrationFee: '',
    paymentRequired: false,
    earlyBirdDiscount: false,
    earlyBirdDeadline: '',
    earlyBirdAmount: '',
    
    // Target Audience
    targetBatches: [] as string[],
    targetDepartments: [] as string[],
    openToAllAlumni: true,
    includeCurrentStudents: false,
    includeFaculty: false,
    
    // Speakers & Agenda
    speakers: [] as any[],
    agenda: [] as any[],
    
    // Communication
    inviteAlumni: true,
    reminderEmails: true,
    followUpSurvey: false,
    certificateProvision: false,
    
    // Media & Resources
    eventBanner: '',
    eventBrochure: '',
    livestreamAvailable: false,
    recordingAvailable: false,
    
    // Logistics
    cateringRequired: false,
    cateringType: '',
    transportationProvided: false,
    accommodationAssistance: false,
    
    // Organizer Details
    organizer: 'Alumni Relations Office',
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    
    // Additional Settings
    isPublic: true,
    allowGuestRegistration: false,
    collectDonations: false,
    donationGoal: '',
    volunteerSupport: false,
    
    // Post Event
    feedbackForm: true,
    photoSharing: true,
    networkingContinuation: false
  });

  const eventTypes = [
    { value: 'reunion', label: 'Alumni Reunion' },
    { value: 'seminar', label: 'Seminar/Webinar' },
    { value: 'networking', label: 'Networking Event' },
    { value: 'workshop', label: 'Workshop/Training' },
    { value: 'celebration', label: 'Celebration/Awards' },
    { value: 'fundraising', label: 'Fundraising Event' },
    { value: 'career-fair', label: 'Career Fair' },
    { value: 'guest-lecture', label: 'Guest Lecture' }
  ];

  const categories = [
    { value: 'academic', label: 'Academic' },
    { value: 'social', label: 'Social' },
    { value: 'professional', label: 'Professional Development' },
    { value: 'fundraising', label: 'Fundraising' },
    { value: 'networking', label: 'Networking' },
    { value: 'cultural', label: 'Cultural' }
  ];

  const batches = [
    '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017', '2016', '2015',
    '2014', '2013', '2012', '2011', '2010', '2009', '2008', '2007', '2006', '2005'
  ];

  const departments = [
    'Computer Science', 'Electronics', 'Mechanical', 'Civil', 'Electrical',
    'Chemical', 'Aerospace', 'Biotechnology', 'Information Technology'
  ];

  const addSpeaker = () => {
    const newSpeaker = {
      name: '',
      designation: '',
      company: '',
      batch: '',
      topic: '',
      duration: '',
      email: '',
      phone: ''
    };
    setEventData({
      ...eventData,
      speakers: [...eventData.speakers, newSpeaker]
    });
  };

  const updateSpeaker = (index: number, field: string, value: string) => {
    const updatedSpeakers = [...eventData.speakers];
    updatedSpeakers[index] = {
      ...updatedSpeakers[index],
      [field]: value
    };
    setEventData({
      ...eventData,
      speakers: updatedSpeakers
    });
  };

  const addAgendaItem = () => {
    const newItem = {
      time: '',
      activity: '',
      speaker: '',
      duration: '',
      location: ''
    };
    setEventData({
      ...eventData,
      agenda: [...eventData.agenda, newItem]
    });
  };

  const updateAgendaItem = (index: number, field: string, value: string) => {
    const updatedAgenda = [...eventData.agenda];
    updatedAgenda[index] = {
      ...updatedAgenda[index],
      [field]: value
    };
    setEventData({
      ...eventData,
      agenda: updatedAgenda
    });
  };

  const handleBatchSelection = (batch: string, checked: boolean) => {
    if (checked) {
      setEventData({
        ...eventData,
        targetBatches: [...eventData.targetBatches, batch]
      });
    } else {
      setEventData({
        ...eventData,
        targetBatches: eventData.targetBatches.filter(b => b !== batch)
      });
    }
  };

  const handleDepartmentSelection = (department: string, checked: boolean) => {
    if (checked) {
      setEventData({
        ...eventData,
        targetDepartments: [...eventData.targetDepartments, department]
      });
    } else {
      setEventData({
        ...eventData,
        targetDepartments: eventData.targetDepartments.filter(d => d !== department)
      });
    }
  };

  const handleSave = () => {
    console.log('Saving event:', eventData);
    setOpen(false);
  };

  const handlePublish = () => {
    console.log('Publishing event:', eventData);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {isEdit ? `Edit Event - ${eventId}` : 'Create New Alumni Event'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="audience">Audience</TabsTrigger>
            <TabsTrigger value="speakers">Speakers</TabsTrigger>
            <TabsTrigger value="logistics">Logistics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Event Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Event Title</Label>
                  <Input
                    id="title"
                    value={eventData.title}
                    onChange={(e) => setEventData({...eventData, title: e.target.value})}
                    placeholder="Enter event title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Event Description</Label>
                  <Textarea
                    id="description"
                    value={eventData.description}
                    onChange={(e) => setEventData({...eventData, description: e.target.value})}
                    placeholder="Detailed description of the event"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="eventType">Event Type</Label>
                    <Select value={eventData.eventType} onValueChange={(value) => setEventData({...eventData, eventType: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select event type" />
                      </SelectTrigger>
                      <SelectContent>
                        {eventTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={eventData.category} onValueChange={(value) => setEventData({...eventData, category: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Location */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="isVirtual">Virtual Event</Label>
                  <Switch
                    id="isVirtual"
                    checked={eventData.isVirtual}
                    onCheckedChange={(checked) => setEventData({...eventData, isVirtual: checked})}
                  />
                </div>

                {!eventData.isVirtual && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="venue">Venue</Label>
                      <Input
                        id="venue"
                        value={eventData.venue}
                        onChange={(e) => setEventData({...eventData, venue: e.target.value})}
                        placeholder="Event venue name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Textarea
                        id="address"
                        value={eventData.address}
                        onChange={(e) => setEventData({...eventData, address: e.target.value})}
                        placeholder="Complete address"
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          value={eventData.city}
                          onChange={(e) => setEventData({...eventData, city: e.target.value})}
                          placeholder="City"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">State</Label>
                        <Input
                          id="state"
                          value={eventData.state}
                          onChange={(e) => setEventData({...eventData, state: e.target.value})}
                          placeholder="State"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="hybridEvent">Hybrid Event (Physical + Virtual)</Label>
                      <Switch
                        id="hybridEvent"
                        checked={eventData.hybridEvent}
                        onCheckedChange={(checked) => setEventData({...eventData, hybridEvent: checked})}
                      />
                    </div>
                  </div>
                )}

                {(eventData.isVirtual || eventData.hybridEvent) && (
                  <div className="space-y-2">
                    <Label htmlFor="meetingLink">Meeting Link/Platform</Label>
                    <Input
                      id="meetingLink"
                      value={eventData.meetingLink}
                      onChange={(e) => setEventData({...eventData, meetingLink: e.target.value})}
                      placeholder="Zoom/Teams/Other platform link"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Date & Time
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Event Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !eventDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {eventDate ? format(eventDate, "PPP") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={eventDate}
                          onSelect={setEventDate}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Registration Deadline</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !registrationDeadline && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {registrationDeadline ? format(registrationDeadline, "PPP") : "Select deadline"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={registrationDeadline}
                          onSelect={setRegistrationDeadline}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={eventData.startTime}
                      onChange={(e) => setEventData({...eventData, startTime: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={eventData.endTime}
                      onChange={(e) => setEventData({...eventData, endTime: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration</Label>
                    <Input
                      id="duration"
                      value={eventData.duration}
                      onChange={(e) => setEventData({...eventData, duration: e.target.value})}
                      placeholder="e.g., 3 hours"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Registration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Registration Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="requiresRegistration">Requires Registration</Label>
                  <Switch
                    id="requiresRegistration"
                    checked={eventData.requiresRegistration}
                    onCheckedChange={(checked) => setEventData({...eventData, requiresRegistration: checked})}
                  />
                </div>

                {eventData.requiresRegistration && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="maxAttendees">Maximum Attendees</Label>
                        <Input
                          id="maxAttendees"
                          type="number"
                          value={eventData.maxAttendees}
                          onChange={(e) => setEventData({...eventData, maxAttendees: e.target.value})}
                          placeholder="Leave empty for unlimited"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="registrationFee">Registration Fee (₹)</Label>
                        <Input
                          id="registrationFee"
                          type="number"
                          value={eventData.registrationFee}
                          onChange={(e) => setEventData({...eventData, registrationFee: e.target.value})}
                          placeholder="0 for free event"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="paymentRequired">Payment Required</Label>
                      <Switch
                        id="paymentRequired"
                        checked={eventData.paymentRequired}
                        onCheckedChange={(checked) => setEventData({...eventData, paymentRequired: checked})}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="earlyBirdDiscount">Early Bird Discount</Label>
                      <Switch
                        id="earlyBirdDiscount"
                        checked={eventData.earlyBirdDiscount}
                        onCheckedChange={(checked) => setEventData({...eventData, earlyBirdDiscount: checked})}
                      />
                    </div>

                    {eventData.earlyBirdDiscount && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="earlyBirdDeadline">Early Bird Deadline</Label>
                          <Input
                            id="earlyBirdDeadline"
                            type="date"
                            value={eventData.earlyBirdDeadline}
                            onChange={(e) => setEventData({...eventData, earlyBirdDeadline: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="earlyBirdAmount">Early Bird Fee (₹)</Label>
                          <Input
                            id="earlyBirdAmount"
                            type="number"
                            value={eventData.earlyBirdAmount}
                            onChange={(e) => setEventData({...eventData, earlyBirdAmount: e.target.value})}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audience" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Target Audience
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="openToAllAlumni">Open to All Alumni</Label>
                    <Switch
                      id="openToAllAlumni"
                      checked={eventData.openToAllAlumni}
                      onCheckedChange={(checked) => setEventData({...eventData, openToAllAlumni: checked})}
                    />
                  </div>

                  {!eventData.openToAllAlumni && (
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <Label>Target Batches</Label>
                        <div className="grid grid-cols-4 gap-2">
                          {batches.map((batch) => (
                            <div key={batch} className="flex items-center space-x-2">
                              <Checkbox
                                id={`batch-${batch}`}
                                checked={eventData.targetBatches.includes(batch)}
                                onCheckedChange={(checked) => handleBatchSelection(batch, checked as boolean)}
                              />
                              <Label htmlFor={`batch-${batch}`} className="text-sm">{batch}</Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label>Target Departments</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {departments.map((dept) => (
                            <div key={dept} className="flex items-center space-x-2">
                              <Checkbox
                                id={`dept-${dept}`}
                                checked={eventData.targetDepartments.includes(dept)}
                                onCheckedChange={(checked) => handleDepartmentSelection(dept, checked as boolean)}
                              />
                              <Label htmlFor={`dept-${dept}`} className="text-sm">{dept}</Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="includeCurrentStudents">Include Current Students</Label>
                      <Switch
                        id="includeCurrentStudents"
                        checked={eventData.includeCurrentStudents}
                        onCheckedChange={(checked) => setEventData({...eventData, includeCurrentStudents: checked})}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="includeFaculty">Include Faculty & Staff</Label>
                      <Switch
                        id="includeFaculty"
                        checked={eventData.includeFaculty}
                        onCheckedChange={(checked) => setEventData({...eventData, includeFaculty: checked})}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="allowGuestRegistration">Allow Guest Registration</Label>
                      <Switch
                        id="allowGuestRegistration"
                        checked={eventData.allowGuestRegistration}
                        onCheckedChange={(checked) => setEventData({...eventData, allowGuestRegistration: checked})}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="speakers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Speakers & Presenters
                  </div>
                  <Button onClick={addSpeaker} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Speaker
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {eventData.speakers.map((speaker, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Speaker Name</Label>
                        <Input
                          value={speaker.name}
                          onChange={(e) => updateSpeaker(index, 'name', e.target.value)}
                          placeholder="Full name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Designation</Label>
                        <Input
                          value={speaker.designation}
                          onChange={(e) => updateSpeaker(index, 'designation', e.target.value)}
                          placeholder="Job title"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Company/Organization</Label>
                        <Input
                          value={speaker.company}
                          onChange={(e) => updateSpeaker(index, 'company', e.target.value)}
                          placeholder="Company name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Batch Year (if alumni)</Label>
                        <Input
                          value={speaker.batch}
                          onChange={(e) => updateSpeaker(index, 'batch', e.target.value)}
                          placeholder="Graduation year"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Topic/Session</Label>
                        <Input
                          value={speaker.topic}
                          onChange={(e) => updateSpeaker(index, 'topic', e.target.value)}
                          placeholder="Presentation topic"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Duration</Label>
                        <Input
                          value={speaker.duration}
                          onChange={(e) => updateSpeaker(index, 'duration', e.target.value)}
                          placeholder="e.g., 45 minutes"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={speaker.email}
                          onChange={(e) => updateSpeaker(index, 'email', e.target.value)}
                          placeholder="Contact email"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input
                          value={speaker.phone}
                          onChange={(e) => updateSpeaker(index, 'phone', e.target.value)}
                          placeholder="Contact number"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const updatedSpeakers = eventData.speakers.filter((_, i) => i !== index);
                          setEventData({...eventData, speakers: updatedSpeakers});
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {eventData.speakers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No speakers added yet. Click "Add Speaker" to add presenters for your event.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Event Agenda */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Event Agenda
                  </div>
                  <Button onClick={addAgendaItem} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {eventData.agenda.length > 0 ? (
                  <div className="space-y-4">
                    {eventData.agenda.map((item, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-2 p-3 border rounded-lg">
                        <Input
                          placeholder="Time"
                          value={item.time}
                          onChange={(e) => updateAgendaItem(index, 'time', e.target.value)}
                        />
                        <Input
                          placeholder="Activity"
                          value={item.activity}
                          onChange={(e) => updateAgendaItem(index, 'activity', e.target.value)}
                        />
                        <Input
                          placeholder="Speaker"
                          value={item.speaker}
                          onChange={(e) => updateAgendaItem(index, 'speaker', e.target.value)}
                        />
                        <Input
                          placeholder="Duration"
                          value={item.duration}
                          onChange={(e) => updateAgendaItem(index, 'duration', e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Input
                            placeholder="Location"
                            value={item.location}
                            onChange={(e) => updateAgendaItem(index, 'location', e.target.value)}
                            className="flex-1"
                          />
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              const updatedAgenda = eventData.agenda.filter((_, i) => i !== index);
                              setEventData({...eventData, agenda: updatedAgenda});
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No agenda items added yet. Click "Add Item" to create the event schedule.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logistics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Event Services</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="cateringRequired">Catering Required</Label>
                    <Switch
                      id="cateringRequired"
                      checked={eventData.cateringRequired}
                      onCheckedChange={(checked) => setEventData({...eventData, cateringRequired: checked})}
                    />
                  </div>

                  {eventData.cateringRequired && (
                    <div className="space-y-2">
                      <Label htmlFor="cateringType">Catering Type</Label>
                      <Select value={eventData.cateringType} onValueChange={(value) => setEventData({...eventData, cateringType: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select catering type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="breakfast">Breakfast</SelectItem>
                          <SelectItem value="lunch">Lunch</SelectItem>
                          <SelectItem value="dinner">Dinner</SelectItem>
                          <SelectItem value="tea-coffee">Tea/Coffee</SelectItem>
                          <SelectItem value="full-day">Full Day</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <Label htmlFor="transportationProvided">Transportation Provided</Label>
                    <Switch
                      id="transportationProvided"
                      checked={eventData.transportationProvided}
                      onCheckedChange={(checked) => setEventData({...eventData, transportationProvided: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="accommodationAssistance">Accommodation Assistance</Label>
                    <Switch
                      id="accommodationAssistance"
                      checked={eventData.accommodationAssistance}
                      onCheckedChange={(checked) => setEventData({...eventData, accommodationAssistance: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="volunteerSupport">Volunteer Support Needed</Label>
                    <Switch
                      id="volunteerSupport"
                      checked={eventData.volunteerSupport}
                      onCheckedChange={(checked) => setEventData({...eventData, volunteerSupport: checked})}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Media & Recording</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="livestreamAvailable">Live Streaming</Label>
                    <Switch
                      id="livestreamAvailable"
                      checked={eventData.livestreamAvailable}
                      onCheckedChange={(checked) => setEventData({...eventData, livestreamAvailable: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="recordingAvailable">Event Recording</Label>
                    <Switch
                      id="recordingAvailable"
                      checked={eventData.recordingAvailable}
                      onCheckedChange={(checked) => setEventData({...eventData, recordingAvailable: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="photoSharing">Photo Sharing Platform</Label>
                    <Switch
                      id="photoSharing"
                      checked={eventData.photoSharing}
                      onCheckedChange={(checked) => setEventData({...eventData, photoSharing: checked})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Event Banner Upload</Label>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Upload event banner image</p>
                      <Button variant="outline" size="sm" className="mt-2">
                        Browse Files
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Organizer Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="organizer">Organizing Department</Label>
                    <Input
                      id="organizer"
                      value={eventData.organizer}
                      onChange={(e) => setEventData({...eventData, organizer: e.target.value})}
                      placeholder="Alumni Relations Office"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactPerson">Contact Person</Label>
                    <Input
                      id="contactPerson"
                      value={eventData.contactPerson}
                      onChange={(e) => setEventData({...eventData, contactPerson: e.target.value})}
                      placeholder="Contact person name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contactEmail">Contact Email</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={eventData.contactEmail}
                      onChange={(e) => setEventData({...eventData, contactEmail: e.target.value})}
                      placeholder="contact@college.edu"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactPhone">Contact Phone</Label>
                    <Input
                      id="contactPhone"
                      value={eventData.contactPhone}
                      onChange={(e) => setEventData({...eventData, contactPhone: e.target.value})}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Event Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="isPublic">Public Event</Label>
                    <Switch
                      id="isPublic"
                      checked={eventData.isPublic}
                      onCheckedChange={(checked) => setEventData({...eventData, isPublic: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="certificateProvision">Provide Certificates</Label>
                    <Switch
                      id="certificateProvision"
                      checked={eventData.certificateProvision}
                      onCheckedChange={(checked) => setEventData({...eventData, certificateProvision: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="collectDonations">Collect Donations</Label>
                    <Switch
                      id="collectDonations"
                      checked={eventData.collectDonations}
                      onCheckedChange={(checked) => setEventData({...eventData, collectDonations: checked})}
                    />
                  </div>

                  {eventData.collectDonations && (
                    <div className="space-y-2">
                      <Label htmlFor="donationGoal">Donation Goal (₹)</Label>
                      <Input
                        id="donationGoal"
                        type="number"
                        value={eventData.donationGoal}
                        onChange={(e) => setEventData({...eventData, donationGoal: e.target.value})}
                        placeholder="Target amount"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Communication Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="inviteAlumni">Send Invitations to Alumni</Label>
                    <Switch
                      id="inviteAlumni"
                      checked={eventData.inviteAlumni}
                      onCheckedChange={(checked) => setEventData({...eventData, inviteAlumni: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="reminderEmails">Send Reminder Emails</Label>
                    <Switch
                      id="reminderEmails"
                      checked={eventData.reminderEmails}
                      onCheckedChange={(checked) => setEventData({...eventData, reminderEmails: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="followUpSurvey">Post-Event Survey</Label>
                    <Switch
                      id="followUpSurvey"
                      checked={eventData.followUpSurvey}
                      onCheckedChange={(checked) => setEventData({...eventData, followUpSurvey: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="feedbackForm">Feedback Collection</Label>
                    <Switch
                      id="feedbackForm"
                      checked={eventData.feedbackForm}
                      onCheckedChange={(checked) => setEventData({...eventData, feedbackForm: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="networkingContinuation">Post-Event Networking</Label>
                    <Switch
                      id="networkingContinuation"
                      checked={eventData.networkingContinuation}
                      onCheckedChange={(checked) => setEventData({...eventData, networkingContinuation: checked})}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <Separator />

        <div className="flex justify-between">
          <div className="flex gap-2">
            <Badge variant="outline">
              {eventData.eventType && eventTypes.find(t => t.value === eventData.eventType)?.label}
            </Badge>
            {eventData.isVirtual && <Badge variant="outline">Virtual Event</Badge>}
            {eventData.hybridEvent && <Badge variant="outline">Hybrid Event</Badge>}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="outline" onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            <Button onClick={handlePublish}>
              <Send className="h-4 w-4 mr-2" />
              {isEdit ? 'Update Event' : 'Publish Event'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};