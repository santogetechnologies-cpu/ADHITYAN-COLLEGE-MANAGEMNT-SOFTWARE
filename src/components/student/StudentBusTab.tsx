import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Bus, 
  MapPin, 
  Clock, 
  Phone, 
  User, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw,
  Loader2,
  Navigation
} from 'lucide-react';
import { db } from '@/services/supabase/database';
import { useAuth } from '@/context/AuthContext';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { TransportVehicle, TransportStop, StudentTransportLog } from '@/types/database.types';
import { LiveBusTrackerMap } from './LiveBusTrackerMap';

export function StudentBusTab() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [vehicle, setVehicle] = useState<TransportVehicle | null>(null);
  const [stops, setStops] = useState<TransportStop[]>([]);
  const [studentLogs, setStudentLogs] = useState<StudentTransportLog[]>([]);

  const loadTransportData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const assignment = await db.getStudentTransportAssignment(user.id);
      if (assignment?.vehicle) {
        setVehicle(assignment.vehicle);
        const [stopsList, logsList] = await Promise.all([
          db.getVehicleStops(assignment.vehicle.id),
          db.getStudentTransportLogs(assignment.vehicle.id),
        ]);
        setStops(stopsList || []);
        const myLogs = (logsList || []).filter(l => l.student_id === user.id);
        setStudentLogs(myLogs);
      } else {
        // Fallback: check if any vehicle is assigned to general fleet
        const vehicles = await db.getTransportVehicles();
        if (vehicles && vehicles.length > 0) {
          const defaultVehicle = vehicles[0];
          setVehicle(defaultVehicle);
          const stopsList = await db.getVehicleStops(defaultVehicle.id);
          setStops(stopsList || []);
        } else {
          setVehicle(null);
          setStops([]);
        }
      }
    } catch (err) {
      console.warn('Failed to load transport details:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadTransportData();
  }, [loadTransportData]);

  useRealtimeSubscription({
    table: 'transport_vehicles',
    onChange: loadTransportData,
    onReconnect: loadTransportData,
  });

  useRealtimeSubscription({
    table: 'transport_stops',
    onChange: loadTransportData,
    onReconnect: loadTransportData,
  });

  useRealtimeSubscription({
    table: 'student_transport_logs',
    onChange: loadTransportData,
    onReconnect: loadTransportData,
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 border border-border rounded-xl">
        <div className="flex items-center space-x-2.5">
          <Bus className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-xl font-bold text-foreground">Campus Bus & Transit Information</h2>
            <p className="text-xs text-muted-foreground">
              Designated college transport routes, stops, and driver verification
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadTransportData} className="h-8">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh Status
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-2 bg-white border border-border rounded-xl">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Verifying bus routes and transit assignments...</p>
        </div>
      ) : !vehicle ? (
        <Card className="bg-white border-border text-center py-12">
          <CardContent className="space-y-3">
            <Bus className="w-12 h-12 mx-auto text-muted-foreground/30" />
            <h4 className="text-sm font-semibold text-foreground">No Transit Assignment Registered</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              You are currently registered as a self-commuter or have not yet been assigned to a campus transport bus route.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Transit Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Live Interactive Transit Map */}
            <LiveBusTrackerMap
              vehicleNumber={vehicle.vehicle_number}
              routeName={vehicle.route_name || 'Route 4 — Central Campus Express'}
              driverName={vehicle.driver_name || 'Ramesh Kumar'}
              driverPhone={vehicle.driver_phone || '+91 98765 43210'}
              capacity={vehicle.capacity || 40}
            />

            {/* Vehicle Summary Card */}
            <Card className="bg-white border-border shadow-xs">
              <CardHeader className="pb-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs font-semibold">
                        Route: {vehicle.route_name || 'Campus Express'}
                      </Badge>
                      <Badge 
                        variant={vehicle.status === 'Active' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {vehicle.status || 'Active'}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg font-bold text-foreground">
                      Vehicle {vehicle.vehicle_number}
                    </CardTitle>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Capacity</span>
                    <div className="text-sm font-bold text-foreground">{vehicle.capacity || 40} Seats</div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Driver Information */}
                  <div className="p-4 bg-slate-50 border border-border rounded-xl space-y-2">
                    <div className="flex items-center space-x-2 text-xs font-bold text-foreground">
                      <User className="w-4 h-4 text-primary" />
                      <span>Assigned Driver</span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="font-semibold text-foreground">{vehicle.driver_name || 'University Fleet Staff'}</div>
                      {vehicle.driver_phone && (
                        <div className="flex items-center space-x-1.5 text-muted-foreground">
                          <Phone className="w-3.5 h-3.5 text-emerald-600" />
                          <a href={`tel:${vehicle.driver_phone}`} className="hover:underline font-medium text-foreground">
                            {vehicle.driver_phone}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Route Summary */}
                  <div className="p-4 bg-slate-50 border border-border rounded-xl space-y-2">
                    <div className="flex items-center space-x-2 text-xs font-bold text-foreground">
                      <Navigation className="w-4 h-4 text-primary" />
                      <span>Transit Schedule</span>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div>Morning Pickup Window: <strong className="text-foreground">07:30 AM – 08:30 AM</strong></div>
                      <div>Evening Departure Window: <strong className="text-foreground">04:30 PM – 05:30 PM</strong></div>
                    </div>
                  </div>
                </div>

                {/* Safety Protocol Note */}
                <div className="p-3 bg-blue-50/60 border border-blue-200/60 rounded-lg text-xs text-blue-900 flex items-start space-x-2">
                  <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    College buses operate with mandatory speed governors, RFID student check-in sensors, and emergency safety equipment.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Stops Timeline */}
            <Card className="bg-white border-border shadow-xs">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-base font-bold text-foreground">
                  Scheduled Transit Stops ({stops.length})
                </CardTitle>
                <CardDescription className="text-xs">
                  Sequential pickup and drop stations on this route
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {stops.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground">
                    No detailed stop coordinates registered for this route yet.
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                    {stops.map((stop, idx) => (
                      <div key={stop.id || idx} className="relative flex items-start space-x-3 text-xs">
                        <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-white border-2 border-primary flex items-center justify-center text-[10px] font-bold text-primary">
                          {idx + 1}
                        </div>
                        <div className="flex-1 p-3 bg-slate-50 border border-border rounded-lg flex items-center justify-between">
                          <div className="space-y-0.5">
                            <div className="font-semibold text-foreground text-sm flex items-center">
                              <MapPin className="w-3.5 h-3.5 mr-1 text-primary" />
                              {stop.stop_name}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              Sequence station {idx + 1}
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-bold text-foreground flex items-center justify-end">
                              <Clock className="w-3 h-3 mr-1 text-muted-foreground" />
                              {stop.arrival_time ? stop.arrival_time.slice(0, 5) : 'Scheduled'}
                            </div>
                            <Badge variant="outline" className="text-[10px] mt-1 bg-white">
                              Active Stop
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar / Student Boarding Logs */}
          <div className="space-y-6">
            <Card className="bg-white border-border shadow-xs">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-sm font-bold text-foreground flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600" />
                  Your Boarding History
                </CardTitle>
                <CardDescription className="text-xs">
                  Automated scan records logged on entry
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                {studentLogs.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground space-y-1">
                    <Clock className="w-8 h-8 mx-auto opacity-30" />
                    <p>No boarding events scanned today.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {studentLogs.map((log) => (
                      <div key={log.id} className="p-2.5 bg-slate-50 border border-border rounded-lg text-xs space-y-1">
                        <div className="flex justify-between font-semibold text-foreground">
                          <span>{log.date}</span>
                          <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300">
                            {log.status || 'Boarded'}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Scanned at: {log.scan_time ? new Date(log.scan_time).toLocaleTimeString() : 'Recorded'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Emergency Contact Notice */}
            <Card className="bg-white border-border shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Transport Helpdesk
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-muted-foreground">
                <p>For route changes, bus pass renewals, or transit inquiries:</p>
                <div className="p-3 bg-muted/50 rounded-lg space-y-1 border border-border">
                  <div className="font-semibold text-foreground">Campus Transport Department</div>
                  <div>Phone: +91 44 2827 5000</div>
                  <div>Email: transport@adhityancollege.edu</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

