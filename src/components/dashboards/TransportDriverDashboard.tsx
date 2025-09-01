import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Bus, 
  MapPin, 
  Users, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Settings,
  QrCode,
  Navigation,
  Phone,
  Wrench,
  FileText
} from 'lucide-react';

export default function TransportDriverDashboard() {
  const transportStats = [
    { title: 'Assigned Students', value: '48', icon: Users, trend: 'Route #7 - Morning' },
    { title: 'Today\'s Trips', value: '4', icon: Bus, trend: '2 completed, 2 pending' },
    { title: 'Route Stops', value: '12', icon: MapPin, trend: 'Avg 4 min per stop' },
    { title: 'Emergency Alerts', value: '0', icon: AlertTriangle, trend: 'No active alerts' }
  ];

  const todayRoute = [
    { stop: 'School Gate', time: '7:00 AM', students: 0, status: 'completed', type: 'pickup' },
    { stop: 'Green Park Society', time: '7:05 AM', students: 8, status: 'completed', type: 'pickup' },
    { stop: 'Metro Station', time: '7:12 AM', students: 12, status: 'completed', type: 'pickup' },
    { stop: 'Residential Complex', time: '7:18 AM', students: 15, status: 'in_progress', type: 'pickup' },
    { stop: 'Shopping Mall', time: '7:25 AM', students: 9, status: 'pending', type: 'pickup' },
    { stop: 'City Center', time: '7:32 AM', students: 4, status: 'pending', type: 'pickup' }
  ];

  const studentCheckins = [
    { student_id: 'ST001', name: 'Aarav Sharma', grade: 'Class 10', stop: 'Green Park', time: '7:05 AM', status: 'checked_in' },
    { student_id: 'ST002', name: 'Priya Patel', grade: 'Class 8', stop: 'Metro Station', time: '7:12 AM', status: 'checked_in' },
    { student_id: 'ST003', name: 'Arjun Kumar', grade: 'Class 12', stop: 'Residential Complex', time: '7:18 AM', status: 'waiting' },
    { student_id: 'ST004', name: 'Sakshi Singh', grade: 'Class 9', stop: 'Shopping Mall', time: '7:25 AM', status: 'absent' }
  ];

  const vehicleMaintenance = [
    { item: 'Engine Oil', last_change: '15 days ago', next_due: 'In 15 days', status: 'good' },
    { item: 'Brake Inspection', last_change: '30 days ago', next_due: 'In 30 days', status: 'good' },
    { item: 'Tire Rotation', last_change: '45 days ago', next_due: 'Overdue by 5 days', status: 'overdue' },
    { item: 'AC Service', last_change: '60 days ago', next_due: 'In 30 days', status: 'warning' }
  ];

  const attendanceStats = {
    today: 45,
    total_assigned: 48,
    percentage: 93.75
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Transport Management Hub</h1>
        <p className="text-muted-foreground">
          Student transport, safety & route management
        </p>
      </div>

      {/* Transport Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {transportStats.map((stat) => {
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
        {/* Route & Trip Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              Today's Route & Stops
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {todayRoute.map((stop, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{stop.time}</span>
                    {stop.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                    {stop.status === 'in_progress' && <Clock className="h-4 w-4 text-blue-500" />}
                  </div>
                  <div className="text-sm">{stop.stop}</div>
                  <div className="text-xs text-muted-foreground">
                    {stop.students} students
                  </div>
                </div>
                <Badge 
                  variant={
                    stop.status === 'completed' ? 'default' :
                    stop.status === 'in_progress' ? 'secondary' : 'outline'
                  }
                  className="capitalize"
                >
                  {stop.status.replace('_', ' ')}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Live GPS Tracking */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Live GPS Tracking (Parents & Admin)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center p-6 border-2 border-dashed rounded-lg bg-blue-50">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-blue-500" />
              <p className="text-sm font-medium mb-2">GPS Tracking Active</p>
              <p className="text-xs text-muted-foreground mb-4">
                Real-time location shared with parents and admin
              </p>
              <Badge variant="default" className="mb-3">
                Currently at: Residential Complex
              </Badge>
              <div className="grid grid-cols-2 gap-3">
                <Button size="sm" variant="outline">
                  Share Location
                </Button>
                <Button size="sm" variant="outline">
                  Emergency Alert
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Speed</span>
                <span className="font-medium">35 km/h</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Next Stop</span>
                <span className="font-medium">Shopping Mall (7 min)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>ETA to School</span>
                <span className="font-medium">25 minutes</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Student Pickup/Drop Check-In */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Student Check-In (QR/RFID Scan)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {studentCheckins.map((student, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{student.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {student.student_id} • {student.grade}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Stop: {student.stop} • {student.time}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={
                      student.status === 'checked_in' ? 'default' :
                      student.status === 'waiting' ? 'secondary' : 'destructive'
                    }
                  >
                    {student.status.replace('_', ' ')}
                  </Badge>
                  {student.status === 'waiting' && (
                    <Button size="sm" variant="outline">
                      <QrCode className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Vehicle Maintenance Log */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Vehicle Maintenance Log
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {vehicleMaintenance.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{item.item}</div>
                  <div className="text-sm text-muted-foreground">
                    Last: {item.last_change}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Next: {item.next_due}
                  </div>
                </div>
                <Badge 
                  variant={
                    item.status === 'good' ? 'default' :
                    item.status === 'warning' ? 'secondary' : 'destructive'
                  }
                  className="capitalize"
                >
                  {item.status}
                </Badge>
              </div>
            ))}
            
            <Button className="w-full mt-4">
              Log Maintenance Activity
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Bus Rider Attendance Report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-700">{attendanceStats.today}</div>
              <div className="text-xs text-green-600">Present Today</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-700">{attendanceStats.total_assigned}</div>
              <div className="text-xs text-blue-600">Total Assigned</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-700">{attendanceStats.percentage}%</div>
              <div className="text-xs text-purple-600">Attendance Rate</div>
            </div>
          </div>
          
          <Progress value={attendanceStats.percentage} className="h-3" />
          
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Daily Report
            </Button>
            <Button variant="outline">
              <Phone className="h-4 w-4 mr-2" />
              Notify Parents
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Emergency & Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Transport Operations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            <Button variant="destructive" className="h-auto p-4 flex flex-col gap-2">
              <AlertTriangle className="h-6 w-6" />
              <span className="text-xs">Emergency Alert</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <Navigation className="h-6 w-6" />
              <span className="text-xs">Route Management</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <QrCode className="h-6 w-6" />
              <span className="text-xs">Student Check-in</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <MapPin className="h-6 w-6" />
              <span className="text-xs">GPS Tracking</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <Wrench className="h-6 w-6" />
              <span className="text-xs">Maintenance</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <FileText className="h-6 w-6" />
              <span className="text-xs">Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}