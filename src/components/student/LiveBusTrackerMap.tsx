import { useState, useEffect, useMemo } from 'react';
import { 
  Bus, 
  MapPin, 
  Navigation, 
  Clock, 
  Compass, 
  ShieldCheck, 
  Phone, 
  AlertTriangle, 
  Maximize2, 
  Minimize2,
  ZoomIn,
  ZoomOut,
  Crosshair,
  Layers,
  CheckCircle2,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface LiveBusTrackerProps {
  vehicleNumber?: string;
  routeName?: string;
  driverName?: string;
  driverPhone?: string;
  capacity?: number;
}

interface TransitStop {
  id: number;
  name: string;
  etaMinutes: number;
  distanceKm: string;
  scheduledTime: string;
  x: number;
  y: number;
  studentsCount: number;
  isPassed: boolean;
  isNext: boolean;
}

export function LiveBusTrackerMap({
  vehicleNumber = 'TN-01-B-1234',
  routeName = 'Route 4 — Central Campus Express',
  driverName = 'Ramesh Kumar',
  driverPhone = '+91 98765 43210',
  capacity = 40
}: LiveBusTrackerProps) {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [mapStyle, setMapStyle] = useState<'vector' | 'satellite'>('vector');
  const [selectedStopId, setSelectedStopId] = useState<number | null>(3);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Real-time animated bus position along the route
  const [busProgress, setBusProgress] = useState(48); // % along the route line
  const [currentSpeed, setCurrentSpeed] = useState(36); // km/h
  const [gpsPing, setGpsPing] = useState(true);

  // Ping simulation every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setGpsPing(prev => !prev);
      setBusProgress(prev => {
        const next = prev + 0.3;
        return next > 95 ? 10 : next;
      });
      setCurrentSpeed(prev => {
        const jitter = Math.floor(Math.random() * 5) - 2;
        return Math.min(42, Math.max(28, prev + jitter));
      });
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const routeStops: TransitStop[] = useMemo(() => [
    { id: 1, name: 'Central Campus Terminal', etaMinutes: 0, distanceKm: 'Passed', scheduledTime: '07:30 AM', x: 70, y: 310, studentsCount: 12, isPassed: true, isNext: false },
    { id: 2, name: 'Engineering Block 3', etaMinutes: 0, distanceKm: 'Passed', scheduledTime: '07:42 AM', x: 190, y: 240, studentsCount: 8, isPassed: true, isNext: false },
    { id: 3, name: 'Main Gate & Highway Bypass', etaMinutes: 4, distanceKm: '1.4 km', scheduledTime: '07:55 AM', x: 360, y: 190, studentsCount: 9, isPassed: false, isNext: true },
    { id: 4, name: 'Metro Interchange Station', etaMinutes: 11, distanceKm: '3.8 km', scheduledTime: '08:10 AM', x: 550, y: 130, studentsCount: 14, isPassed: false, isNext: false },
    { id: 5, name: 'Green Meadows Junction', etaMinutes: 18, distanceKm: '6.2 km', scheduledTime: '08:25 AM', x: 730, y: 170, studentsCount: 6, isPassed: false, isNext: false },
    { id: 6, name: 'City Center Terminal (Dest)', etaMinutes: 26, distanceKm: '9.5 km', scheduledTime: '08:40 AM', x: 890, y: 280, studentsCount: 0, isPassed: false, isNext: false },
  ], []);

  // Compute bus coordinates along the bezier path
  const busCoords = useMemo(() => {
    const t = busProgress / 100;
    // Approximated bezier curve from (70, 310) -> (360, 190) -> (550, 130) -> (890, 280)
    const x = Math.round(70 + t * (890 - 70));
    const y = Math.round(310 - Math.sin(t * Math.PI) * 160 + (t > 0.5 ? (t - 0.5) * 80 : 0));
    return { x, y };
  }, [busProgress]);

  const selectedStop = routeStops.find(s => s.id === selectedStopId) || routeStops[2];

  return (
    <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden flex flex-col transition-all ${
      isFullscreen ? 'fixed inset-4 z-50 rounded-2xl' : 'relative'
    }`}>
      {/* Top Telemetry Header */}
      <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#1D61E7] text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-900/40">
            <Bus className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold tracking-tight">{vehicleNumber}</h3>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] font-semibold px-2">
                ● Live GPS Active
              </Badge>
            </div>
            <p className="text-xs text-slate-400 font-medium">{routeName}</p>
          </div>
        </div>

        {/* Live Key Metrics */}
        <div className="flex items-center gap-3 sm:gap-4 text-xs">
          <div className="hidden sm:block text-right">
            <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Speed</span>
            <span className="font-bold text-emerald-400 text-sm">{currentSpeed} km/h</span>
          </div>

          <div className="hidden md:block text-right border-l border-slate-800 pl-4">
            <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Occupancy</span>
            <span className="font-bold text-blue-300 text-sm">28 / {capacity} Seats</span>
          </div>

          <div className="text-right border-l border-slate-800 pl-4">
            <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Next Station</span>
            <span className="font-bold text-amber-300 text-sm">Main Gate (4m)</span>
          </div>

          <div className="flex items-center space-x-1 pl-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-slate-300 hover:text-white hover:bg-slate-800"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Interactive Map Canvas */}
      <div className={`relative w-full overflow-hidden select-none ${
        isFullscreen ? 'flex-1 min-h-[500px]' : 'h-80 sm:h-96'
      } ${mapStyle === 'vector' ? 'bg-[#EBF2FA]' : 'bg-[#1C2833]'}`}>
        
        {/* Floating Map Controls */}
        <div className="absolute top-3 left-3 z-20 flex flex-col space-y-1.5">
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl shadow-md p-1 flex flex-col space-y-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-slate-700 hover:bg-blue-50 hover:text-[#1D61E7]"
              onClick={() => setZoomLevel(prev => Math.min(1.6, prev + 0.15))}
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-slate-700 hover:bg-blue-50 hover:text-[#1D61E7]"
              onClick={() => setZoomLevel(prev => Math.max(0.85, prev - 0.15))}
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-slate-700 hover:bg-blue-50 hover:text-[#1D61E7]"
              onClick={() => setZoomLevel(1)}
              title="Center on Bus"
            >
              <Crosshair className="w-4 h-4" />
            </Button>
          </div>

          <button
            onClick={() => setMapStyle(mapStyle === 'vector' ? 'satellite' : 'vector')}
            className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl shadow-md px-2.5 py-1 text-[11px] font-bold text-slate-700 flex items-center space-x-1.5 hover:bg-slate-50 transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-[#1D61E7]" />
            <span className="capitalize">{mapStyle}</span>
          </button>
        </div>

        {/* Floating Next Stop Banner */}
        <div className="absolute top-3 right-3 z-20 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-md px-3.5 py-2 flex items-center space-x-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <div className="text-xs">
            <div className="font-bold text-slate-900 flex items-center space-x-1">
              <span>Next: {selectedStop.name}</span>
            </div>
            <div className="text-[10px] text-slate-500 font-medium">
              ETA: <strong className="text-emerald-600">{selectedStop.etaMinutes} mins</strong> • Dist: {selectedStop.distanceKm}
            </div>
          </div>
        </div>

        {/* SVG Graphic Map Engine */}
        <div 
          className="w-full h-full flex items-center justify-center transition-transform duration-300"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          <svg viewBox="0 0 960 420" className="w-full h-full object-cover">
            <defs>
              <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="45%" stopColor="#1D61E7" />
                <stop offset="100%" stopColor="#818CF8" />
              </linearGradient>

              {/* Grid pattern for realistic vector GIS map */}
              <pattern id="campusGrid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#DCE6F2" strokeWidth="0.8" />
              </pattern>
            </defs>

            {/* Background Grid */}
            <rect width="960" height="420" fill="url(#campusGrid)" opacity="0.7" />

            {/* Campus Park & Lake GIS Zones */}
            <path d="M 30 180 Q 120 120 220 170 T 310 280 Q 200 370 70 340 Z" fill="#D4EDDA" opacity="0.65" />
            <text x="110" y="270" fill="#2E7D32" fontSize="11" fontWeight="bold" opacity="0.8">
              University Botanical Park
            </text>

            <path d="M 640 40 Q 760 10 880 70 T 840 180 Q 720 130 640 40 Z" fill="#D0E8FF" opacity="0.7" />
            <text x="730" y="90" fill="#1A73E8" fontSize="11" fontWeight="bold" opacity="0.8">
              Lakeview Reserve
            </text>

            {/* Secondary City Roads */}
            <path d="M 0 100 L 960 100" stroke="#FFFFFF" strokeWidth="6" />
            <path d="M 0 100 L 960 100" stroke="#CBD5E1" strokeWidth="4" />

            <path d="M 480 0 L 480 420" stroke="#FFFFFF" strokeWidth="6" />
            <path d="M 480 0 L 480 420" stroke="#CBD5E1" strokeWidth="4" />

            <path d="M 200 420 L 700 0" stroke="#FFFFFF" strokeWidth="5" />
            <path d="M 200 420 L 700 0" stroke="#CBD5E1" strokeWidth="3" />

            {/* Primary Collegiate Transit Route Corridor */}
            <path 
              d="M 70 310 C 180 230, 260 210, 360 190 C 460 170, 500 120, 550 130 C 620 140, 680 180, 730 170 C 800 160, 840 240, 890 280" 
              fill="none" 
              stroke="#FFFFFF" 
              strokeWidth="14" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
            <path 
              d="M 70 310 C 180 230, 260 210, 360 190 C 460 170, 500 120, 550 130 C 620 140, 680 180, 730 170 C 800 160, 840 240, 890 280" 
              fill="none" 
              stroke="url(#routeGradient)" 
              strokeWidth="8" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeDasharray="4 2"
            />

            {/* Route Stops Markers */}
            {routeStops.map((stop) => {
              const isSelected = selectedStopId === stop.id;
              return (
                <g 
                  key={stop.id} 
                  transform={`translate(${stop.x}, ${stop.y})`} 
                  className="cursor-pointer transition-transform hover:scale-125"
                  onClick={() => setSelectedStopId(stop.id)}
                >
                  {/* Outer Glow when selected */}
                  {isSelected && (
                    <circle r="18" fill="#1D61E7" opacity="0.2" className="animate-pulse" />
                  )}

                  {/* Stop Marker Pin */}
                  <circle 
                    r={stop.isNext ? 10 : 8} 
                    fill={stop.isPassed ? '#10B981' : stop.isNext ? '#F59E0B' : '#FFFFFF'} 
                    stroke="#1D61E7" 
                    strokeWidth="3" 
                  />

                  {/* Inner number */}
                  <text 
                    y="3" 
                    textAnchor="middle" 
                    fill={stop.isPassed || stop.isNext ? '#FFFFFF' : '#1E293B'} 
                    fontSize="9" 
                    fontWeight="bold"
                  >
                    {stop.id}
                  </text>

                  {/* Stop Label Banner */}
                  <g transform="translate(0, 16)">
                    <rect 
                      x="-60" 
                      y="0" 
                      width="120" 
                      height="18" 
                      rx="6" 
                      fill="#FFFFFF" 
                      stroke={isSelected ? '#1D61E7' : '#E2E8F0'} 
                      strokeWidth={isSelected ? 1.5 : 1} 
                      className="shadow-sm" 
                    />
                    <text 
                      x="0" 
                      y="12" 
                      textAnchor="middle" 
                      fill="#1E293B" 
                      fontSize="8.5" 
                      fontWeight="bold"
                    >
                      {stop.name.length > 18 ? stop.name.substring(0, 16) + '..' : stop.name}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* Live Moving Bus Beacon */}
            <g transform={`translate(${busCoords.x}, ${busCoords.y})`}>
              {/* Radar Wave Ping */}
              <circle r="22" fill="#1D61E7" opacity={gpsPing ? 0.35 : 0.1} className="transition-all duration-700" />
              <circle r="14" fill="#1D61E7" opacity="0.2" />

              {/* Bus Pin Base */}
              <circle r="12" fill="#1D61E7" stroke="#FFFFFF" strokeWidth="2.5" className="shadow-lg" />
              
              {/* Bus Vector Symbol inside */}
              <g transform="translate(-7, -7) scale(0.65)">
                <path 
                  d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h8v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z" 
                  fill="#FFFFFF" 
                />
              </g>

              {/* Floating Live Tag */}
              <g transform="translate(14, -14)">
                <rect x="0" y="0" width="70" height="18" rx="6" fill="#0F172A" />
                <text x="35" y="12" textAnchor="middle" fill="#38BDF8" fontSize="8" fontWeight="bold">
                  {vehicleNumber.split('-')[0] + ' • ' + currentSpeed + ' km/h'}
                </text>
              </g>
            </g>
          </svg>
        </div>

        {/* Selected Stop Details Popover at Bottom of Map */}
        <div className="absolute bottom-3 left-3 right-3 z-20 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-3 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1D61E7] flex items-center justify-center font-bold text-xs shrink-0">
              #{selectedStop.id}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="text-xs font-bold text-slate-900">{selectedStop.name}</h4>
                <Badge variant={selectedStop.isPassed ? 'secondary' : selectedStop.isNext ? 'default' : 'outline'} className="text-[9px] px-1.5">
                  {selectedStop.isPassed ? 'Passed' : selectedStop.isNext ? 'Approaching' : 'Upcoming'}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Scheduled: {selectedStop.scheduledTime} • Estimated Arrival: {selectedStop.etaMinutes}m away ({selectedStop.distanceKm})
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 justify-end">
            <div className="text-[11px] text-slate-600 font-medium hidden md:block">
              <span className="font-bold text-slate-900">{selectedStop.studentsCount}</span> students boarding
            </div>
            {driverPhone && (
              <a
                href={`tel:${driverPhone}`}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Call Driver ({driverName.split(' ')[0]})</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
