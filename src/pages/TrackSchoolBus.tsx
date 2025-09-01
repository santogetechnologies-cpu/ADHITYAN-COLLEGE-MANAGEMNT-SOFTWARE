import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Phone, Bus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const TrackSchoolBus = () => {
  const navigate = useNavigate();
  const [busLocation, setBusLocation] = useState('On Route 15 - Near Maple Street');
  const [estimatedArrival, setEstimatedArrival] = useState('8 minutes');
  const [busStatus, setBusStatus] = useState('On Time');

  const busInfo = {
    number: 'Bus #42',
    driver: 'James Wilson',
    phone: '(555) 123-4567',
    route: 'Route 15 - North District',
    currentStop: 'Maple Street & Oak Avenue',
    nextStop: 'Your pickup location',
    capacity: '32/45 students'
  };

  const recentStops = [
    { time: '7:25 AM', location: 'Pine Street School', status: 'Completed' },
    { time: '7:30 AM', location: 'Community Center', status: 'Completed' },
    { time: '7:35 AM', location: 'Maple Street', status: 'Current' },
    { time: '7:42 AM', location: 'Your Location', status: 'Upcoming' },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate real-time updates
      const minutes = Math.max(1, Math.floor(Math.random() * 10));
      setEstimatedArrival(`${minutes} minutes`);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/dashboard')}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Track School Bus</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Real-time Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bus className="h-5 w-5 text-primary" />
              {busInfo.number} - Live Tracking
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Current Location</p>
                  <p className="text-sm text-muted-foreground">{busLocation}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">ETA to Your Stop</p>
                  <p className="text-sm text-muted-foreground">{estimatedArrival}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-green-500" />
                <div>
                  <p className="font-medium">Status</p>
                  <Badge variant="secondary" className="text-green-600">
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
              <CardTitle>Bus Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">Route:</span>
                <span>{busInfo.route}</span>
                
                <span className="text-muted-foreground">Driver:</span>
                <span>{busInfo.driver}</span>
                
                <span className="text-muted-foreground">Capacity:</span>
                <span>{busInfo.capacity}</span>
                
                <span className="text-muted-foreground">Contact:</span>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span className="text-sm">{busInfo.phone}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Route Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Route Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentStops.map((stop, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      stop.status === 'Completed' ? 'bg-green-500' :
                      stop.status === 'Current' ? 'bg-blue-500' :
                      'bg-muted-foreground/30'
                    }`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{stop.location}</span>
                        <span className="text-sm text-muted-foreground">{stop.time}</span>
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
            </CardContent>
          </Card>
        </div>

        {/* Emergency Contact */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Need assistance?</h3>
                <p className="text-sm text-muted-foreground">Contact the school transportation office</p>
              </div>
              <Button variant="outline">
                <Phone className="h-4 w-4 mr-2" />
                Call Office
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default TrackSchoolBus;