import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Phone, 
  Users, 
  Calendar, 
  MessageSquare, 
  Search, 
  AlertCircle,
  CheckCircle,
  Clock,
  Bell,
  FileText,
  UserPlus
} from 'lucide-react';

export default function ReceptionistDashboard() {
  const visitorStats = [
    { title: 'Today\'s Visitors', value: '24', icon: Users, trend: '+8 from yesterday' },
    { title: 'Pending Appointments', value: '12', icon: Calendar, trend: '5 scheduled today' },
    { title: 'Enquiries Today', value: '18', icon: MessageSquare, trend: '3 urgent' },
    { title: 'Active Notices', value: '6', icon: Bell, trend: '2 new this week' }
  ];

  const visitors = [
    { name: 'Mr. Rajesh Kumar', purpose: 'Admission Enquiry', time: '10:30 AM', status: 'checked_in', contact: '9876543210' },
    { name: 'Mrs. Priya Singh', purpose: 'Fee Payment', time: '11:15 AM', status: 'waiting', contact: '9876543211' },
    { name: 'Dr. Amit Shah', purpose: 'Teacher Meeting', time: '12:00 PM', status: 'completed', contact: '9876543212' },
    { name: 'Ms. Neha Gupta', purpose: 'Document Submission', time: '02:30 PM', status: 'pending', contact: '9876543213' }
  ];

  const appointments = [
    { time: '10:00 AM', person: 'Parent-Teacher Meeting', with: 'Mrs. Sharma (Class 5)', type: 'meeting' },
    { time: '11:30 AM', person: 'Admission Interview', with: 'Principal Office', type: 'interview' },
    { time: '02:00 PM', person: 'Vendor Meeting', with: 'Admin Office', type: 'business' },
    { time: '03:30 PM', person: 'Student Counseling', with: 'Counselor', type: 'counseling' }
  ];

  const enquiries = [
    { id: 'ENQ001', type: 'Admission', parent: 'Mr. Verma', grade: 'Class 6', priority: 'high', status: 'pending' },
    { id: 'ENQ002', type: 'Fee Structure', parent: 'Mrs. Patel', grade: 'Class 3', priority: 'medium', status: 'resolved' },
    { id: 'ENQ003', type: 'Transport', parent: 'Mr. Khan', grade: 'Class 8', priority: 'low', status: 'pending' },
    { id: 'ENQ004', type: 'Scholarship', parent: 'Mrs. Reddy', grade: 'Class 10', priority: 'high', status: 'in_progress' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reception Hub</h1>
        <p className="text-muted-foreground">
          Front office management and visitor services
        </p>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {visitorStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.trend}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Visitor Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Visitor Check-in/out Log
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {visitors.map((visitor, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{visitor.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {visitor.purpose} • {visitor.time}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Contact: {visitor.contact}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={
                      visitor.status === 'completed' ? 'default' :
                      visitor.status === 'checked_in' ? 'secondary' :
                      visitor.status === 'waiting' ? 'outline' : 'destructive'
                    }
                  >
                    {visitor.status.replace('_', ' ')}
                  </Badge>
                  {visitor.status === 'pending' && (
                    <Button size="sm" variant="outline">
                      Check In
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Appointment Booking */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Today's Appointments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {appointments.map((appointment, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{appointment.time}</span>
                  </div>
                  <div className="text-sm">{appointment.person}</div>
                  <div className="text-xs text-muted-foreground">
                    With: {appointment.with}
                  </div>
                </div>
                <Badge variant="outline" className="capitalize">
                  {appointment.type}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Student/Parent Enquiry Tracker */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Enquiry Tracker
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {enquiries.map((enquiry, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{enquiry.id}</span>
                    <Badge 
                      variant={
                        enquiry.priority === 'high' ? 'destructive' :
                        enquiry.priority === 'medium' ? 'secondary' : 'outline'
                      }
                      className="text-xs"
                    >
                      {enquiry.priority}
                    </Badge>
                  </div>
                  <div className="text-sm">{enquiry.type} - {enquiry.parent}</div>
                  <div className="text-xs text-muted-foreground">
                    {enquiry.grade}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={enquiry.status === 'resolved' ? 'default' : 'outline'}
                    className="capitalize"
                  >
                    {enquiry.status.replace('_', ' ')}
                  </Badge>
                  <Button size="sm" variant="outline">
                    Follow Up
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Quick Search & Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <input 
                  type="text" 
                  placeholder="Search student records, contact info..." 
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>
              <Button size="sm">
                <Search className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-auto p-3 flex flex-col gap-1">
                <UserPlus className="h-5 w-5" />
                <span className="text-xs">Add Visitor</span>
              </Button>
              <Button variant="outline" className="h-auto p-3 flex flex-col gap-1">
                <Calendar className="h-5 w-5" />
                <span className="text-xs">Book Appointment</span>
              </Button>
              <Button variant="outline" className="h-auto p-3 flex flex-col gap-1">
                <FileText className="h-5 w-5" />
                <span className="text-xs">Create Notice</span>
              </Button>
              <Button variant="outline" className="h-auto p-3 flex flex-col gap-1">
                <AlertCircle className="h-5 w-5" />
                <span className="text-xs">Route Complaint</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Reception Operations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <Users className="h-6 w-6" />
              <span className="text-xs">Visitor Log</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <Calendar className="h-6 w-6" />
              <span className="text-xs">Appointments</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <MessageSquare className="h-6 w-6" />
              <span className="text-xs">Enquiries</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <Bell className="h-6 w-6" />
              <span className="text-xs">Notices</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <Search className="h-6 w-6" />
              <span className="text-xs">Search Records</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <AlertCircle className="h-6 w-6" />
              <span className="text-xs">Complaints</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}