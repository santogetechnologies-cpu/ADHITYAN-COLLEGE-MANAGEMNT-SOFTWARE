import { useState } from 'react';
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
  Plus,
  Clock,
  User,
  Calendar,
  Edit,
  Eye
} from 'lucide-react';

const DisciplinaryManagement = () => {
  const [incidents, setIncidents] = useState([
    {
      id: 1,
      studentName: 'John Smith',
      studentId: 'ST001',
      class: '10-A',
      incident: 'Disruptive behavior in class',
      severity: 'Minor',
      reportedBy: 'Ms. Johnson',
      date: '2024-03-15',
      status: 'Pending Review',
      actionTaken: null
    },
    {
      id: 2,
      studentName: 'Sarah Wilson',
      studentId: 'ST002',
      class: '12-B',
      incident: 'Unauthorized absence',
      severity: 'Major',
      reportedBy: 'Mr. Davis',
      date: '2024-03-14',
      status: 'Resolved',
      actionTaken: 'Written warning and parent meeting'
    }
  ]);

  const [behavioralHistory, setBehavioralHistory] = useState([
    {
      studentId: 'ST001',
      studentName: 'John Smith',
      class: '10-A',
      totalIncidents: 3,
      lastIncident: '2024-03-15',
      behaviorTrend: 'Improving',
      interventions: ['Counseling Session', 'Mentor Assignment']
    },
    {
      studentId: 'ST002',
      studentName: 'Sarah Wilson',
      class: '12-B',
      totalIncidents: 1,
      lastIncident: '2024-03-14',
      behaviorTrend: 'Stable',
      interventions: ['Parent Meeting']
    }
  ]);

  const [selectedIncident, setSelectedIncident] = useState(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [viewDetailsDialogOpen, setViewDetailsDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  const handleIncidentReported = (newIncident: any) => {
    setIncidents([...incidents, newIncident]);
  };

  const handleActionTaken = (incidentId: number, action: string) => {
    setIncidents(incidents.map(incident => 
      incident.id === incidentId 
        ? { ...incident, status: 'Resolved', actionTaken: action }
        : incident
    ));
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
      case 'Major': return 'destructive';
      case 'Critical': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending Review': return 'destructive';
      case 'Under Investigation': return 'secondary';
      case 'Resolved': return 'default';
      default: return 'secondary';
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
              </CardContent>
            </Card>
          </TabsContent>

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

          <TabsContent value="reports" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Incident Reports</CardTitle>
                <CardDescription>Generate and manage incident reports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Generate Reports</h3>
                  <p className="text-muted-foreground mb-4">
                    Create detailed incident reports for administration and parents
                  </p>
                  <Button onClick={() => setReportDialogOpen(true)}>Generate Report</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Behavioral History</CardTitle>
                <CardDescription>Track student behavioral patterns and interventions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {behavioralHistory.map((record) => (
                    <div key={record.studentId} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold">{record.studentName}</h3>
                          <Badge variant="outline">{record.studentId}</Badge>
                          <Badge variant="outline">{record.class}</Badge>
                        </div>
                        <Badge variant={record.behaviorTrend === 'Improving' ? 'default' : 'secondary'}>
                          {record.behaviorTrend}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Total Incidents:</span>
                          <p className="font-medium">{record.totalIncidents}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Last Incident:</span>
                          <p className="font-medium flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {record.lastIncident}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Interventions:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {record.interventions.map((intervention, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {intervention}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm">
                          <User className="h-4 w-4 mr-1" />
                          View Profile
                        </Button>
                        <Button variant="outline" size="sm">
                          <History className="h-4 w-4 mr-1" />
                          Full History
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">24</div>
                  <p className="text-xs text-muted-foreground">+2 from last month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Pending Cases</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">5</div>
                  <p className="text-xs text-muted-foreground">Requires attention</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Repeat Offenders</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">3</div>
                  <p className="text-xs text-muted-foreground">Need intervention</p>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Behavioral Analytics</CardTitle>
                <CardDescription>Insights into disciplinary patterns and trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Detailed Analytics</h3>
                  <p className="text-muted-foreground mb-4">
                    View trends, patterns, and intervention effectiveness
                  </p>
                  <Button>View Full Analytics</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default DisciplinaryManagement;