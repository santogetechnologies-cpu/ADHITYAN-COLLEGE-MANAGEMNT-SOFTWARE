import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Phone, Bus, Info, Loader2, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { db } from '@/services/supabase/database';
import { useAuth } from '@/context/AuthContext';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { TransportVehicle, TransportStop, Profile } from '@/types/database.types';
import { ROLE_CONFIGS } from '@/config/roles';
import { InstitutionName } from '@/lib/institution';

interface StopItem {
  time: string;
  location: string;
  status: string;
}

const TrackSchoolBus = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [vehicle, setVehicle] = useState<TransportVehicle | null>(null);
  const [allVehicles, setAllVehicles] = useState<TransportVehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [busLocation, setBusLocation] = useState<string>('En Route');
  const [estimatedArrival, setEstimatedArrival] = useState<string>('Calculating...');
  const [busStatus, setBusStatus] = useState<string>('Active');
  const [stopsList, setStopsList] = useState<StopItem[]>([]);

  // Parent & Child Context
  const [linkedChildren, setLinkedChildren] = useState<Profile[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');

  // 1. If Parent, load linked children
  useEffect(() => {
    async function loadChildren() {
      if (!user?.id) return;
      if (user.role === 'parent') {
        const links = await db.getLinkedStudentsForParent(user.id);
        const children = links.map(l => l.student).filter(Boolean) as Profile[];
        setLinkedChildren(children);
        if (children.length > 0) {
          setSelectedChildId(children[0].id);
        }
      }
    }
    loadChildren();
  }, [user?.id, user?.role]);

  // 2. Load bus tracking data for the active student or selected vehicle
  const loadBusData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const vehiclesList = await db.getTransportVehicles();
      setAllVehicles(vehiclesList || []);

      let targetVehicle: TransportVehicle | null = null;
      let targetStops: TransportStop[] = [];

      // If user explicitly picked a vehicle from the route switcher
      if (selectedVehicleId) {
        targetVehicle = vehiclesList.find(v => v.id === selectedVehicleId) || null;
        if (targetVehicle) {
          targetStops = await db.getVehicleStops(targetVehicle.id);
        }
      } else {
        // Otherwise determine student assignment
        let targetStudentId = user.id;
        if (user.role === 'parent') {
          if (!selectedChildId && linkedChildren.length > 0) {
            targetStudentId = linkedChildren[0].id;
          } else if (selectedChildId) {
            targetStudentId = selectedChildId;
          }
        }

        const assignment = await db.getStudentTransportAssignment(targetStudentId);
        if (assignment.vehicle) {
          targetVehicle = assignment.vehicle;
          targetStops = assignment.stops || [];
          setSelectedVehicleId(assignment.vehicle.id);
        } else if (vehiclesList.length > 0) {
          targetVehicle = vehiclesList[0];
          targetStops = await db.getVehicleStops(targetVehicle.id);
          setSelectedVehicleId(targetVehicle.id);
        }
      }

      if (targetVehicle) {
        setVehicle(targetVehicle);
        setBusLocation(targetVehicle.current_location || 'Main Campus Transit Route');
        setEstimatedArrival(targetVehicle.eta_to_next_stop || 'In Transit');
        setBusStatus(targetVehicle.status === 'active' ? 'On Time' : (targetVehicle.status || 'Active'));

        if (targetStops && targetStops.length > 0) {
          setStopsList(targetStops.map((s: TransportStop) => ({
            time: s.scheduled_time || 'Scheduled',
            location: s.stop_name,
            status: s.status || 'Upcoming',
          })));
        } else {
          setStopsList([]);
        }
      } else {
        setVehicle(null);
        setStopsList([]);
      }
    } catch (err) {
      console.warn('Failed to load bus tracking data:', err);
      setVehicle(null);
    } finally {
      setLoading(false);
    }
  }, [user, selectedChildId, linkedChildren, selectedVehicleId]);

  useEffect(() => {
    loadBusData();
  }, [loadBusData]);

  // Real-time synchronization
  useRealtimeSubscription({
    table: 'transport_vehicles',
    onChange: loadBusData,
    onReconnect: loadBusData,
  });

  useRealtimeSubscription({
    table: 'transport_stops',
    onChange: loadBusData,
    onReconnect: loadBusData,
  });

  useRealtimeSubscription({
    table: 'student_transport_logs',
    onChange: loadBusData,
    onReconnect: loadBusData,
  });

  const activeStudentName = user?.role === 'parent'
    ? linkedChildren.find(c => c.id === selectedChildId)?.name || 'Linked Ward'
    : user?.name || 'Student';

  const handleBack = () => {
    if (window.history.state?.idx > 0) {
      navigate(-1);
    } else {
      const userHome = user ? (ROLE_CONFIGS[user.role]?.home || `/dashboard/${user.role}`) : '/';
      navigate(userHome, { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleBack}
                className="shrink-0"
              >
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Dashboard
              </Button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">Track Campus Bus & Transit</h1>
                <p className="text-xs text-muted-foreground"><InstitutionName /> – Fleet Telematics</p>
              </div>
            </div>

            {/* Quick Fleet Route Switcher */}
            {allVehicles.length > 1 && (
              <div className="hidden sm:flex items-center gap-2">
                <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Campus Route:</Label>
                <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                  <SelectTrigger className="w-56 h-8 text-xs">
                    <SelectValue placeholder="Select Bus Route" />
                  </SelectTrigger>
                  <SelectContent>
                    {allVehicles.map(v => (
                      <SelectItem key={v.id} value={v.id} className="text-xs">
                        {v.vehicle_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Child Selector for Parents with Multiple Children */}
        {user?.role === 'parent' && linkedChildren.length > 1 && (
          <Card className="border-secondary/40 shadow-sm">
            <CardContent className="pt-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <GraduationCap className="w-5 h-5 text-primary" />
                <Label className="font-semibold text-sm">Select Student Transport Route:</Label>
              </div>
              <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                <SelectTrigger className="w-60">
                  <SelectValue placeholder="Choose Child" />
                </SelectTrigger>
                <SelectContent>
                  {linkedChildren.map(child => (
                    <SelectItem key={child.id} value={child.id}>
                      {child.name} ({child.class_name || 'Class'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* Telemetry Transparency Banner */}
        <Alert className="bg-muted/50 border-muted">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription className="text-xs text-muted-foreground">
            Vehicle status and ETA are driven by live driver route logging in Supabase. Real-time GPS hardware telematics integration is pending vehicle OBD-II sensor provisioning.
          </AlertDescription>
        </Alert>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !vehicle ? (
          <Card className="text-center py-12">
            <CardContent className="space-y-3">
              <Bus className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
              <CardTitle className="text-lg">No Transport Vehicle Assigned</CardTitle>
              <CardDescription className="max-w-md mx-auto">
                No active bus transit is currently assigned to {activeStudentName}. Please contact the Transport Department to register for bus transit services.
              </CardDescription>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Real-time Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bus className="h-5 w-5 text-primary" />
                  {vehicle.vehicle_number || vehicle.bus_number || 'College Bus'} — Live Route for {activeStudentName}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">Current Stop / Location</p>
                      <p className="text-sm text-muted-foreground">{busLocation}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">Estimated Arrival (ETA)</p>
                      <p className="text-sm text-muted-foreground">{estimatedArrival}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-500" />
                    <div>
                      <p className="font-medium text-sm">Status</p>
                      <Badge variant="secondary" className="text-green-600 font-semibold">
                        {busStatus}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bus Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Bus & Driver Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Vehicle Number:</span>
                    <span className="font-medium">{vehicle.vehicle_number}</span>
                    
                    <span className="text-muted-foreground">Route Name:</span>
                    <span>{vehicle.route_name || 'Standard Transit Route'}</span>
                    
                    <span className="text-muted-foreground">Assigned Driver:</span>
                    <span className="font-medium">{vehicle.driver_name}</span>
                    
                    <span className="text-muted-foreground">Capacity / Occupied:</span>
                    <span>{vehicle.occupied_seats || 0} / {vehicle.capacity || 40} seats</span>
                    
                    <span className="text-muted-foreground">Driver Contact:</span>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{vehicle.driver_phone || 'Contact Transport Office'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Route Progress */}
              <Card>
                <CardHeader>
                  <CardTitle>Route Stations</CardTitle>
                </CardHeader>
                <CardContent>
                  {stopsList.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">
                      No designated stops configured for this vehicle route yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {stopsList.map((stop, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            stop.status === 'Completed' ? 'bg-green-500' :
                            stop.status === 'Current' ? 'bg-blue-500' :
                            'bg-muted-foreground/30'
                          }`} />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">{stop.location}</span>
                              <span className="text-xs text-muted-foreground">{stop.time}</span>
                            </div>
                            <Badge 
                              variant={stop.status === 'Current' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {stop.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Emergency Contact */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Need transport assistance?</h3>
                <p className="text-sm text-muted-foreground">Contact the campus transportation operations office</p>
              </div>
              <Button variant="outline" asChild>
                <a href="tel:+914422200000">
                  <Phone className="h-4 w-4 mr-2" />
                  Call Office
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default TrackSchoolBus;
