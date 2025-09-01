import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Truck, 
  Users, 
  MapPin, 
  Fuel, 
  Wrench,
  Clock,
  CheckCircle,
  AlertTriangle,
  Navigation
} from 'lucide-react';

export default function TransportDashboard() {
  const transportStats = [
    { title: 'Active Vehicles', value: '24', icon: Truck, trend: '3 on route' },
    { title: 'Total Drivers', value: '18', icon: Users, trend: '2 on leave' },
    { title: 'Students Transported', value: '856', icon: Users, trend: 'Daily average' },
    { title: 'Fuel Consumption', value: '₹45,670', icon: Fuel, trend: 'This month' }
  ];

  const vehicleStatus = [
    { vehicle: 'Bus-001', route: 'Route A - Central Area', status: 'active', driver: 'Rajesh Kumar', students: 45 },
    { vehicle: 'Bus-002', route: 'Route B - North Zone', status: 'maintenance', driver: 'Suresh Patel', students: 0 },
    { vehicle: 'Van-003', route: 'Route C - East Side', status: 'active', driver: 'Amit Sharma', students: 28 },
    { vehicle: 'Bus-004', route: 'Route D - West Area', status: 'idle', driver: 'Mohan Das', students: 0 }
  ];

  const maintenanceSchedule = [
    { vehicle: 'Bus-001', type: 'Regular Service', dueDate: '2024-01-15', priority: 'medium' },
    { vehicle: 'Van-003', type: 'Tire Replacement', dueDate: '2024-01-10', priority: 'high' },
    { vehicle: 'Bus-002', type: 'Engine Overhaul', dueDate: 'In Progress', priority: 'high' },
    { vehicle: 'Bus-005', type: 'AC Maintenance', dueDate: '2024-01-20', priority: 'low' }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'maintenance': return <Wrench className="h-4 w-4 text-orange-500" />;
      case 'idle': return <Clock className="h-4 w-4 text-gray-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Transport Management</h1>
        <p className="text-muted-foreground">
          Vehicle tracking and transport operations
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
        {/* Vehicle Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Vehicle Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {vehicleStatus.map((vehicle, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{vehicle.vehicle}</span>
                    {getStatusIcon(vehicle.status)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {vehicle.route}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Driver: {vehicle.driver} | Students: {vehicle.students}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={
                      vehicle.status === 'active' ? 'default' :
                      vehicle.status === 'maintenance' ? 'secondary' : 'outline'
                    }
                    className="capitalize"
                  >
                    {vehicle.status}
                  </Badge>
                  <Button size="sm" variant="outline">
                    <Navigation className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Maintenance Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Maintenance Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {maintenanceSchedule.map((maintenance, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{maintenance.vehicle}</div>
                  <div className="text-sm text-muted-foreground">
                    {maintenance.type}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Due: {maintenance.dueDate}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={
                      maintenance.priority === 'high' ? 'destructive' :
                      maintenance.priority === 'medium' ? 'secondary' : 'outline'
                    }
                  >
                    {maintenance.priority}
                  </Badge>
                  <Button size="sm" variant="outline">
                    Schedule
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Transport Operations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <Users className="h-6 w-6" />
              <span className="text-xs">Driver Management</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <MapPin className="h-6 w-6" />
              <span className="text-xs">Route Planning</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <Fuel className="h-6 w-6" />
              <span className="text-xs">Fuel Management</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <Wrench className="h-6 w-6" />
              <span className="text-xs">Maintenance</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <Navigation className="h-6 w-6" />
              <span className="text-xs">GPS Tracking</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <Truck className="h-6 w-6" />
              <span className="text-xs">Vehicle Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}