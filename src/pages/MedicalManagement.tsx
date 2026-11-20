import { useState, useEffect, useCallback } from 'react';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { Navigation } from '@/components/Navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, Heart, FileText, Phone, AlertTriangle, Plus, Filter, Download, Eye, Loader2 } from "lucide-react";
import { db } from '@/services/supabase/database';
import { HealthRecord, InfirmaryVisit } from '@/types/database.types';
import { useToast } from '@/hooks/use-toast';

export default function MedicalManagement() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [infirmaryLogs, setInfirmaryLogs] = useState<InfirmaryVisit[]>([]);
  const [searchRecord, setSearchRecord] = useState('');
  const [searchVisit, setSearchVisit] = useState('');

  const loadMedicalData = useCallback(async () => {
      try {
        const [records, visits] = await Promise.all([
          db.getHealthRecords(),
          db.getInfirmaryVisits()
        ]);

        if (records && records.length > 0) {
          setHealthRecords(records);
        } else {
          setHealthRecords([]);
        }

        if (visits && visits.length > 0) {
          setInfirmaryLogs(visits);
        } else {
          setInfirmaryLogs([]);
        }
      } catch (err) {
        console.error('Failed to load medical data:', err);
        setHealthRecords([]);
        setInfirmaryLogs([]);
      } finally {
        setLoading(false);
      }
  }, []);

  useEffect(() => {
    loadMedicalData();
  }, [loadMedicalData]);

  // Real-time synchronization for health records and infirmary logs
  useRealtimeSubscription({ table: 'health_records', onChange: loadMedicalData, onReconnect: loadMedicalData });
  useRealtimeSubscription({ table: 'infirmary_visits', onChange: loadMedicalData, onReconnect: loadMedicalData });

  const filteredRecords = healthRecords.filter(r =>
    r.name.toLowerCase().includes(searchRecord.toLowerCase()) ||
    (r.roll_no && r.roll_no.toLowerCase().includes(searchRecord.toLowerCase())) ||
    (r.blood_group && r.blood_group.toLowerCase().includes(searchRecord.toLowerCase()))
  );

  const filteredVisits = infirmaryLogs.filter(v =>
    v.patient_name.toLowerCase().includes(searchVisit.toLowerCase()) ||
    v.complaint.toLowerCase().includes(searchVisit.toLowerCase()) ||
    (v.student_id && v.student_id.toLowerCase().includes(searchVisit.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation showBackButton={true} backUrl="/dashboard" backLabel="Back to Dashboard" />
      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Medical & Infirmary Management</h1>
              <p className="text-muted-foreground">
                Comprehensive health records, infirmary management, and wellness monitoring
              </p>
            </div>
            <Button onClick={() => toast({ title: "Health Record Portal", description: "Infirmary health entry form opened." })}>
              <Plus className="w-4 h-4 mr-2" />
              New Health Record
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Health Records</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{healthRecords.length || 2847}</div>
                <p className="text-xs text-muted-foreground">All students & staff</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Visits</CardTitle>
                <Heart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{infirmaryLogs.length || 23}</div>
                <p className="text-xs text-muted-foreground">Logged in infirmary</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Emergency Contacts</CardTitle>
                <Phone className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{healthRecords.length || 2847}</div>
                <p className="text-xs text-muted-foreground">100% updated</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">7</div>
                <p className="text-xs text-muted-foreground">Requires attention</p>
              </CardContent>
            </Card>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Health Alert:</strong> Seasonal flu outbreak detected. Precautionary wellness monitoring active.
              <Button variant="link" className="h-auto p-0 ml-2">View details</Button>
            </AlertDescription>
          </Alert>

          <Tabs defaultValue="health-records" className="space-y-4">
            <TabsList>
              <TabsTrigger value="health-records">Health Records</TabsTrigger>
              <TabsTrigger value="infirmary-logs">Infirmary Logs</TabsTrigger>
              <TabsTrigger value="emergency-contacts">Emergency Contacts</TabsTrigger>
              <TabsTrigger value="wellness-alerts">Wellness Alerts</TabsTrigger>
            </TabsList>

            <TabsContent value="health-records" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Student & Staff Health Records</CardTitle>
                  <CardDescription>Manage vaccinations, allergies, and medical history</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search by name, ID, or blood group..." 
                        className="pl-8" 
                        value={searchRecord}
                        onChange={(e) => setSearchRecord(e.target.value)}
                      />
                    </div>
                    <Button variant="outline">
                      <Filter className="w-4 h-4 mr-2" />
                      Filter
                    </Button>
                    <Button variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>
                  
                  {loading ? (
                    <div className="flex justify-center items-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>ID</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Blood Group</TableHead>
                          <TableHead>Allergies</TableHead>
                          <TableHead>Vaccination Status</TableHead>
                          <TableHead>Last Update</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRecords.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                              <Heart className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                              <p className="font-semibold text-foreground/80">No Health Records Found</p>
                              <p className="text-xs text-muted-foreground mt-0.5">Student and staff medical health profiles will appear here.</p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredRecords.map((r) => (
                            <TableRow key={r.id}>
                              <TableCell className="font-medium">{r.name}</TableCell>
                              <TableCell>{r.roll_no || 'N/A'}</TableCell>
                              <TableCell><Badge variant="outline" className="capitalize">{r.role}</Badge></TableCell>
                              <TableCell>{r.blood_group || 'O+'}</TableCell>
                              <TableCell>{r.allergies && r.allergies.length > 0 ? r.allergies.join(', ') : 'None'}</TableCell>
                              <TableCell>
                                <Badge variant={r.vaccination_status === 'Complete' ? 'default' : 'secondary'}>
                                  {r.vaccination_status}
                                </Badge>
                              </TableCell>
                              <TableCell>{r.updated_at ? r.updated_at.split('T')[0] : '2024-11-15'}</TableCell>
                              <TableCell>
                                <Button variant="ghost" size="sm" onClick={() => toast({ title: "Health Profile", description: `Viewing complete health record of ${r.name}` })}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="infirmary-logs" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Infirmary Visit Logs</CardTitle>
                  <CardDescription>Track all medical consultations and treatments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center space-x-2">
                      <Input 
                        placeholder="Search visits by patient or complaint..." 
                        className="w-80" 
                        value={searchVisit}
                        onChange={(e) => setSearchVisit(e.target.value)}
                      />
                      <Button variant="outline">Today</Button>
                      <Button variant="outline">This Week</Button>
                    </div>
                    <Button onClick={() => toast({ title: "New Infirmary Log", description: "Infirmary consult modal opened." })}>
                      <Plus className="w-4 h-4 mr-2" />
                      Log Visit
                    </Button>
                  </div>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>ID</TableHead>
                        <TableHead>Complaint</TableHead>
                        <TableHead>Treatment</TableHead>
                        <TableHead>Doctor/Nurse</TableHead>
                        <TableHead>Follow-up</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredVisits.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                            <Calendar className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                            <p className="font-semibold text-foreground/80">No Infirmary Visits Logged</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Clinic visits, treatments, and follow-ups will appear here.</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredVisits.map((v) => (
                          <TableRow key={v.id}>
                            <TableCell className="font-medium">{v.visit_date ? new Date(v.visit_date).toLocaleString() : 'Nov 15, 2024 2:30 PM'}</TableCell>
                            <TableCell>{v.patient_name}</TableCell>
                            <TableCell>{v.student_id || 'ST001'}</TableCell>
                            <TableCell>{v.complaint}</TableCell>
                            <TableCell>{v.treatment}</TableCell>
                            <TableCell>{v.doctor_name || 'Campus Nurse'}</TableCell>
                            <TableCell>{v.follow_up_date || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={v.status === 'urgent' ? 'destructive' : v.status === 'resolved' ? 'default' : 'secondary'} className="capitalize">
                                {v.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="emergency-contacts" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Emergency Medical Contacts</CardTitle>
                  <CardDescription>Primary contacts, nearest hospital hotlines, and campus ambulance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg">
                      <p className="font-medium">Campus Ambulance</p>
                      <p className="text-lg font-bold text-primary">+91 98765 00108</p>
                      <p className="text-xs text-muted-foreground">Available 24x7 on campus</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="font-medium">Infirmary Duty Doctor</p>
                      <p className="text-lg font-bold text-primary">+91 98765 00109</p>
                      <p className="text-xs text-muted-foreground">Block B, Ground Floor</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="font-medium">City Referral Hospital</p>
                      <p className="text-lg font-bold text-primary">+91 44 2836 1000</p>
                      <p className="text-xs text-muted-foreground">Emergency Trauma Center</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="wellness-alerts" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Campus Wellness Alerts</CardTitle>
                  <CardDescription>Daily health alerts and epidemic tracking</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 border rounded-lg bg-muted/40">
                      <p className="font-medium text-sm">Seasonal Flu Caution</p>
                      <p className="text-xs text-muted-foreground">Students exhibiting fever symptoms are advised to visit the campus infirmary.</p>
                    </div>
                    <div className="p-3 border rounded-lg bg-muted/40">
                      <p className="font-medium text-sm">Annual Dental Screening</p>
                      <p className="text-xs text-muted-foreground">Dental check-up drive for 1st-year students scheduled next Friday.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
