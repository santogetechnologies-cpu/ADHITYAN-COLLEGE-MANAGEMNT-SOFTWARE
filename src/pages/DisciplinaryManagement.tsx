import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ReportIncidentDialog } from '@/components/disciplinary/ReportIncidentDialog';
import { TakeActionDialog } from '@/components/disciplinary/TakeActionDialog';
import { ViewIncidentDetailsDialog } from '@/components/incident/ViewIncidentDetailsDialog';
import { GenerateReportDialog } from '@/components/reports/GenerateReportDialog';
import { 
  AlertTriangle, 
  FileText, 
  History, 
  BarChart3, 
  Calendar, 
  Edit, 
  Eye,
  Loader2
} from 'lucide-react';
import { db } from '@/services/supabase/database';
import { useToast } from '@/hooks/use-toast';

const DisciplinaryManagement = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState<any[]>([]);

  // Dynamically derive behavioral longitudinal history from real database incidents
  const behavioralHistory = useMemo(() => {
    const map = new Map<string, any>();
    incidents.forEach(inc => {
      const key = inc.studentId || inc.studentName;
      if (!map.has(key)) {
        map.set(key, {
          studentId: inc.studentId,
          studentName: inc.studentName,
          class: inc.class,
          totalIncidents: 0,
          lastIncident: inc.date,
          behaviorTrend: inc.status === 'Resolved' ? 'Resolved' : 'Under Review',
          interventions: inc.actionTaken ? [inc.actionTaken] : ['Counseling Review']
        });
      }
      const entry = map.get(key);
      entry.totalIncidents++;
      if (inc.date > entry.lastIncident) entry.lastIncident = inc.date;
    });
    return Array.from(map.values());
  }, [incidents]);

  const [selectedIncident, setSelectedIncident] = useState(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [viewDetailsDialogOpen, setViewDetailsDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  const loadIncidents = useCallback(async () => {
    try {
      const data = await db.getDisciplinaryIncidents();
      if (data && data.length > 0) {
        const mapped = data.map((d: any) => ({
          id: d.id,
          studentName: d.student_name,
          studentId: d.roll_no || 'ST001',
          class: d.class_name,
          incident: d.incident,
          severity: d.severity,
          reportedBy: d.reported_by,
          date: d.incident_date,
          status: d.status,
          actionTaken: d.action_taken
        }));
        setIncidents(mapped);
      } else {
        setIncidents([]);
      }
    } catch (err) {
      console.error('Failed to load disciplinary incidents:', err);
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  useRealtimeSubscription({
    table: 'disciplinary_incidents',
    onChange: loadIncidents,
    onReconnect: loadIncidents,
  });

  const handleIncidentReported = async (newIncident: any) => {
    try {
      await db.reportDisciplinaryIncident({
        student_name: newIncident.studentName,
        roll_no: newIncident.studentId,
        class_name: newIncident.class || 'B.VOC MLT - Semester 1',
        incident: newIncident.incident,
        severity: newIncident.severity,
        reported_by: newIncident.reportedBy,
        incident_date: newIncident.date,
        status: 'Pending Review'
      });
      setIncidents(prev => [newIncident, ...prev]);
    } catch (err) {
      console.error('Failed to report incident to db:', err);
      setIncidents(prev => [newIncident, ...prev]);
    }
  };

  const handleActionTaken = async (incidentId: any, action: string) => {
    try {
      await db.resolveIncident(String(incidentId), action);
      setIncidents(incidents.map(incident => 
        String(incident.id) === String(incidentId) 
          ? { ...incident, status: 'Resolved', actionTaken: action }
          : incident
      ));
      toast({
        title: "Action Recorded",
        description: "Incident has been resolved and logged."
      });
    } catch (err: any) {
      toast({
        title: "Error resolving incident",
        description: err.message,
        variant: "destructive"
      });
    }
  };

  const handleTakeAction = (incident: any) => {
    setSelectedIncident(incident);
    setActionDialogOpen(true);
  };

  const handleViewDetails = (incident: any) => {
    setSelectedIncident(incident);
    setViewDetailsDialogOpen(true);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Minor': return 'secondary';
      case 'Major': return 'default';
      case 'Critical': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending Review': return 'destructive';
      case 'Under Investigation': return 'default';
      case 'Resolved': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation showBackButton={true} backUrl="/dashboard" backLabel="Back to Dashboard" />
      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Disciplinary Management</h1>
          <p className="text-muted-foreground">Track incidents, behavioral patterns, and interventions</p>
        </div>

        <Tabs defaultValue="incidents" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="incidents" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Incidents</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Behavioral History</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="incidents" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Incident Management</CardTitle>
                    <CardDescription>Report and track disciplinary incidents</CardDescription>
                  </div>
                  <ReportIncidentDialog onIncidentReported={handleIncidentReported} />
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : incidents.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground border rounded-lg">
                    <AlertTriangle className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                    <p className="text-base font-semibold text-foreground/80">No Disciplinary Incidents Recorded</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                      All student behavioral and disciplinary logs filed by faculty will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {incidents.map((incident) => (
                      <div key={incident.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold">{incident.studentName}</h3>
                            <Badge variant="outline">{incident.studentId}</Badge>
                            <Badge variant="outline">{incident.class}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={getSeverityColor(incident.severity)}>
                              {incident.severity}
                            </Badge>
                            <Badge variant={getStatusColor(incident.status)}>
                              {incident.status}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Incident:</span>
                            <p className="font-medium">{incident.incident}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Reported By:</span>
                            <p className="font-medium">{incident.reportedBy}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Date:</span>
                            <p className="font-medium flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {incident.date}
                            </p>
                          </div>
                          {incident.actionTaken && (
                            <div>
                              <span className="text-muted-foreground">Action Taken:</span>
                              <p className="font-medium">{incident.actionTaken}</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex gap-2 pt-2">
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewDetails(incident)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                          {incident.status === 'Pending Review' && (
                            <Button size="sm" onClick={() => handleTakeAction(incident)}>
                              Take Action
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Disciplinary Reports</CardTitle>
                    <CardDescription>Generate and download behavioral and incident reports</CardDescription>
                  </div>
                  <Button onClick={() => setReportDialogOpen(true)}>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Select report criteria above to export formal school incident records.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Behavioral History</CardTitle>
                <CardDescription>Student longitudinal behavioral records and interventions</CardDescription>
              </CardHeader>
              <CardContent>
                {behavioralHistory.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground border rounded-lg">
                    <History className="w-9 h-9 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="font-semibold text-foreground/80">No Behavioral History Recorded</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Longitudinal intervention tracking will automatically appear as student records are updated.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {behavioralHistory.map((item, idx) => (
                      <div key={idx} className="border p-4 rounded-lg flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{item.studentName} ({item.studentId})</h4>
                          <p className="text-xs text-muted-foreground">Class: {item.class} • Total Incidents: {item.totalIncidents}</p>
                          <div className="flex gap-1 mt-2">
                            {item.interventions.map((iv, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{iv}</Badge>
                            ))}
                          </div>
                        </div>
                        <Badge variant="secondary">{item.behaviorTrend}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Incident Trend Analytics</CardTitle>
                <CardDescription>Distribution of disciplinary incidents across grades and categories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div className="p-4 border rounded-lg">
                    <p className="text-2xl font-bold">{incidents.length}</p>
                    <p className="text-xs text-muted-foreground">Total Incidents Recorded</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-2xl font-bold">{incidents.filter(i => i.status === 'Resolved').length}</p>
                    <p className="text-xs text-muted-foreground">Resolved Cases</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-2xl font-bold">{incidents.filter(i => i.status === 'Pending Review').length}</p>
                    <p className="text-xs text-muted-foreground">Pending Review</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <TakeActionDialog
          incident={selectedIncident}
          open={actionDialogOpen}
          onOpenChange={setActionDialogOpen}
          onActionTaken={handleActionTaken}
        />

        <ViewIncidentDetailsDialog
          incident={selectedIncident}
          open={viewDetailsDialogOpen}
          onOpenChange={setViewDetailsDialogOpen}
        />

        <GenerateReportDialog
          open={reportDialogOpen}
          onOpenChange={setReportDialogOpen}
          incidents={incidents}
        />
      </main>
    </div>
  );
};

export default DisciplinaryManagement;
