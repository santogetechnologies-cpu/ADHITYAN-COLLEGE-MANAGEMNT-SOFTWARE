import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar, 
  Clock, 
  Upload, 
  Download, 
  Edit, 
  Trash2, 
  Plus,
  BookOpen,
  Users,
  MapPin
} from 'lucide-react';

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  subject: string;
  teacher: string;
  room: string;
  day: string;
}

interface TimetableEntry {
  classId: string;
  className: string;
  schedule: TimeSlot[];
}

export default function TimetableManagement() {
  const [selectedClass, setSelectedClass] = useState('');
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const { toast } = useToast();

  const classes = [
    'Grade 9-A', 'Grade 9-B', 'Grade 10-A', 'Grade 10-B', 'Grade 11-A', 'Grade 11-B', 'Grade 12-A', 'Grade 12-B'
  ];

  const timeSlots = [
    '08:00-08:45', '08:45-09:30', '09:30-10:15', '10:15-11:00',
    '11:15-12:00', '12:00-12:45', '13:30-14:15', '14:15-15:00', '15:00-15:45'
  ];

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const subjects = ['Mathematics', 'English', 'Physics', 'Chemistry', 'Biology', 'History', 'Geography', 'PE'];
  const teachers = ['Dr. Rodriguez', 'Mrs. Johnson', 'Mr. Chen', 'Dr. Smith', 'Mrs. Davis'];
  const rooms = ['Room 101', 'Room 102', 'Room 201', 'Room 202', 'Lab A', 'Lab B', 'Gymnasium'];

  const sampleTimetable: TimetableEntry[] = [
    {
      classId: 'grade-10-a',
      className: 'Grade 10-A',
      schedule: [
        { id: '1', startTime: '08:00', endTime: '08:45', subject: 'Mathematics', teacher: 'Dr. Rodriguez', room: 'Room 201', day: 'Monday' },
        { id: '2', startTime: '08:45', endTime: '09:30', subject: 'English', teacher: 'Mrs. Johnson', room: 'Room 105', day: 'Monday' },
        { id: '3', startTime: '09:30', endTime: '10:15', subject: 'Physics', teacher: 'Dr. Smith', room: 'Lab A', day: 'Monday' },
        { id: '4', startTime: '11:15', endTime: '12:00', subject: 'Chemistry', teacher: 'Mr. Chen', room: 'Lab B', day: 'Monday' },
        { id: '5', startTime: '12:00', endTime: '12:45', subject: 'Biology', teacher: 'Mrs. Davis', room: 'Room 301', day: 'Monday' },
        
        { id: '6', startTime: '08:00', endTime: '08:45', subject: 'English', teacher: 'Mrs. Johnson', room: 'Room 105', day: 'Tuesday' },
        { id: '7', startTime: '08:45', endTime: '09:30', subject: 'Mathematics', teacher: 'Dr. Rodriguez', room: 'Room 201', day: 'Tuesday' },
        { id: '8', startTime: '09:30', endTime: '10:15', subject: 'History', teacher: 'Dr. Smith', room: 'Room 102', day: 'Tuesday' },
      ]
    }
  ];

  const currentTimetable = sampleTimetable.find(tt => tt.className === selectedClass);

  const getScheduleForDay = (day: string) => {
    if (!currentTimetable) return [];
    return currentTimetable.schedule
      .filter(slot => slot.day === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const handleUploadTimetable = () => {
    toast({
      title: "Timetable Uploaded",
      description: "Timetable has been successfully uploaded and distributed to teachers."
    });
    setIsUploadDialogOpen(false);
  };

  const handleEditSlot = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setIsEditDialogOpen(true);
  };

  const handleSaveSlot = () => {
    toast({
      title: "Slot Updated",
      description: "Timetable slot has been updated successfully."
    });
    setIsEditDialogOpen(false);
    setSelectedSlot(null);
  };

  const handleDeleteSlot = (slotId: string) => {
    toast({
      title: "Slot Deleted",
      description: "Timetable slot has been removed."
    });
  };

  const exportTimetable = () => {
    toast({
      title: "Timetable Exported",
      description: "Timetable has been exported successfully."
    });
  };

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Calendar className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Timetable Management</h1>
        </div>
        <div className="flex space-x-2">
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="w-4 h-4 mr-2" />
                Upload Timetable
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Timetable</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="class-select">Select Class</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map(cls => (
                        <SelectItem key={cls} value={cls.toLowerCase().replace(' ', '-')}>
                          {cls}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="file-upload">Upload CSV/Excel File</Label>
                  <Input type="file" accept=".csv,.xlsx,.xls" />
                  <p className="text-xs text-muted-foreground mt-1">
                    Supported formats: CSV, Excel. Download template for proper format.
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Download Template
                  </Button>
                  <Button onClick={handleUploadTimetable} className="flex-1">
                    Upload & Apply
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button onClick={exportTimetable}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Tabs defaultValue="manage" className="space-y-6">
        <TabsList>
          <TabsTrigger value="manage">Manage Timetables</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="manage" className="space-y-6">
          {/* Class Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Class</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2">
                {classes.map((cls) => (
                  <Button
                    key={cls}
                    variant={selectedClass === cls ? 'default' : 'outline'}
                    onClick={() => setSelectedClass(cls)}
                    className="text-sm"
                  >
                    {cls}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Timetable Grid */}
          {selectedClass && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <BookOpen className="w-5 h-5" />
                    <span>{selectedClass} Timetable</span>
                  </CardTitle>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Period
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <div className="grid grid-cols-6 gap-2 min-w-max">
                    {/* Header */}
                    <div className="font-semibold text-sm p-2 bg-muted rounded">Time</div>
                    {days.map(day => (
                      <div key={day} className="font-semibold text-sm p-2 bg-muted rounded text-center">
                        {day}
                      </div>
                    ))}

                    {/* Time slots */}
                    {timeSlots.map((timeSlot) => (
                      <>
                        <div key={`time-${timeSlot}`} className="text-sm p-2 border rounded flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {timeSlot}
                        </div>
                        {days.map(day => {
                          const daySchedule = getScheduleForDay(day);
                          const slotTime = timeSlot.split('-')[0];
                          const period = daySchedule.find(slot => slot.startTime === slotTime);
                          
                          return (
                            <div key={`${day}-${timeSlot}`} className="border rounded p-2 min-h-16">
                              {period ? (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <Badge variant="secondary" className="text-xs">
                                      {period.subject}
                                    </Badge>
                                    <div className="flex space-x-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEditSlot(period)}
                                      >
                                        <Edit className="w-3 h-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteSlot(period.id)}
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    <div className="flex items-center space-x-1">
                                      <Users className="w-3 h-3" />
                                      <span>{period.teacher}</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <MapPin className="w-3 h-3" />
                                      <span>{period.room}</span>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center text-muted-foreground text-xs py-4">
                                  Free Period
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Edit Slot Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Time Slot</DialogTitle>
              </DialogHeader>
              {selectedSlot && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-subject">Subject</Label>
                    <Select defaultValue={selectedSlot.subject}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map(subject => (
                          <SelectItem key={subject} value={subject}>
                            {subject}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-teacher">Teacher</Label>
                    <Select defaultValue={selectedSlot.teacher}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {teachers.map(teacher => (
                          <SelectItem key={teacher} value={teacher}>
                            {teacher}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-room">Room</Label>
                    <Select defaultValue={selectedSlot.room}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {rooms.map(room => (
                          <SelectItem key={room} value={room}>
                            {room}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-start">Start Time</Label>
                      <Input 
                        type="time" 
                        defaultValue={selectedSlot.startTime}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-end">End Time</Label>
                      <Input 
                        type="time" 
                        defaultValue={selectedSlot.endTime}
                      />
                    </div>
                  </div>
                  <Button onClick={handleSaveSlot} className="w-full">
                    Save Changes
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Timetable Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Classes:</span>
                  <span className="font-semibold">{classes.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Timetables Created:</span>
                  <span className="font-semibold">6</span>
                </div>
                <div className="flex justify-between">
                  <span>Average Periods per Day:</span>
                  <span className="font-semibold">7</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Updated:</span>
                  <span className="font-semibold">2 days ago</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Updates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <div className="font-medium text-sm">Grade 10-A Updated</div>
                      <div className="text-xs text-muted-foreground">Mathematics period rescheduled</div>
                    </div>
                    <div className="text-xs text-muted-foreground">2h ago</div>
                  </div>
                  <div className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <div className="font-medium text-sm">New Timetable Created</div>
                      <div className="text-xs text-muted-foreground">Grade 12-B timetable published</div>
                    </div>
                    <div className="text-xs text-muted-foreground">1d ago</div>
                  </div>
                  <div className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <div className="font-medium text-sm">Room Change</div>
                      <div className="text-xs text-muted-foreground">Physics lab moved to Lab C</div>
                    </div>
                    <div className="text-xs text-muted-foreground">3d ago</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}