import { Navigation } from '@/components/Navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, Heart, FileText, Phone, AlertTriangle, Plus, Filter, Download, Eye } from "lucide-react";

export default function MedicalManagement() {
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
        <Button>
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
            <div className="text-2xl font-bold">2,847</div>
            <p className="text-xs text-muted-foreground">All students & staff</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Visits</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-muted-foreground">+5 from yesterday</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emergency Contacts</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,847</div>
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
          <strong>Health Alert:</strong> Seasonal flu outbreak detected. 15 cases reported this week. 
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
                  <Input placeholder="Search by name, ID, or condition..." className="pl-8" />
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
                  <TableRow>
                    <TableCell className="font-medium">Amit Kumar Singh</TableCell>
                    <TableCell>CS2021001</TableCell>
                    <TableCell><Badge variant="outline">Student</Badge></TableCell>
                    <TableCell>O+</TableCell>
                    <TableCell>Peanuts, Dust</TableCell>
                    <TableCell><Badge>Complete</Badge></TableCell>
                    <TableCell>Nov 15, 2024</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Priya Sharma</TableCell>
                    <TableCell>EC2020045</TableCell>
                    <TableCell><Badge variant="outline">Student</Badge></TableCell>
                    <TableCell>A+</TableCell>
                    <TableCell>None</TableCell>
                    <TableCell><Badge variant="secondary">Pending</Badge></TableCell>
                    <TableCell>Oct 28, 2024</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Dr. Rajesh Gupta</TableCell>
                    <TableCell>FAC001</TableCell>
                    <TableCell><Badge>Faculty</Badge></TableCell>
                    <TableCell>B-</TableCell>
                    <TableCell>Lactose Intolerant</TableCell>
                    <TableCell><Badge>Complete</Badge></TableCell>
                    <TableCell>Nov 10, 2024</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
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
                  <Input placeholder="Search visits..." className="w-80" />
                  <Button variant="outline">Today</Button>
                  <Button variant="outline">This Week</Button>
                </div>
                <Button>
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
                  <TableRow>
                    <TableCell className="font-medium">Nov 15, 2024 2:30 PM</TableCell>
                    <TableCell>Rahul Verma</TableCell>
                    <TableCell>ME2022034</TableCell>
                    <TableCell>Fever, Headache</TableCell>
                    <TableCell>Paracetamol, Rest</TableCell>
                    <TableCell>Dr. Meera Patel</TableCell>
                    <TableCell>Nov 17, 2024</TableCell>
                    <TableCell><Badge variant="secondary">Active</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Nov 15, 2024 11:15 AM</TableCell>
                    <TableCell>Sneha Reddy</TableCell>
                    <TableCell>CS2021089</TableCell>
                    <TableCell>Stomach Ache</TableCell>
                    <TableCell>Antacid, Diet advice</TableCell>
                    <TableCell>Nurse Kavita</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell><Badge>Resolved</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Nov 15, 2024 9:45 AM</TableCell>
                    <TableCell>Arjun Singh</TableCell>
                    <TableCell>EC2020123</TableCell>
                    <TableCell>Sports Injury</TableCell>
                    <TableCell>First Aid, X-Ray referral</TableCell>
                    <TableCell>Dr. Meera Patel</TableCell>
                    <TableCell>Nov 16, 2024</TableCell>
                    <TableCell><Badge variant="destructive">Urgent</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Nov 14, 2024 4:20 PM</TableCell>
                    <TableCell>Prof. Suresh Kumar</TableCell>
                    <TableCell>FAC015</TableCell>
                    <TableCell>Blood Pressure Check</TableCell>
                    <TableCell>Routine Monitoring</TableCell>
                    <TableCell>Nurse Kavita</TableCell>
                    <TableCell>Dec 14, 2024</TableCell>
                    <TableCell><Badge>Scheduled</Badge></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emergency-contacts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Emergency Contact Management</CardTitle>
              <CardDescription>Manage emergency contacts for all students and staff</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search by name or contact..." className="pl-8" />
                </div>
                <Button variant="outline">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
                <Button variant="outline">Verify All</Button>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Person</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Primary Contact</TableHead>
                    <TableHead>Relationship</TableHead>
                    <TableHead>Secondary Contact</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Last Verified</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Amit Kumar Singh</TableCell>
                    <TableCell>CS2021001</TableCell>
                    <TableCell>+91 9876543210 (Raj Singh)</TableCell>
                    <TableCell>Father</TableCell>
                    <TableCell>+91 9876543211 (Sunita Singh)</TableCell>
                    <TableCell>123 MG Road, Delhi</TableCell>
                    <TableCell>Nov 1, 2024</TableCell>
                    <TableCell><Badge>Verified</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Priya Sharma</TableCell>
                    <TableCell>EC2020045</TableCell>
                    <TableCell>+91 8765432109 (Rakesh Sharma)</TableCell>
                    <TableCell>Father</TableCell>
                    <TableCell>+91 8765432108 (Meera Sharma)</TableCell>
                    <TableCell>456 Park Street, Mumbai</TableCell>
                    <TableCell>Oct 15, 2024</TableCell>
                    <TableCell><Badge variant="secondary">Pending</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Dr. Rajesh Gupta</TableCell>
                    <TableCell>FAC001</TableCell>
                    <TableCell>+91 7654321098 (Kavita Gupta)</TableCell>
                    <TableCell>Spouse</TableCell>
                    <TableCell>+91 7654321097 (Ravi Gupta)</TableCell>
                    <TableCell>789 Civil Lines, Pune</TableCell>
                    <TableCell>Nov 5, 2024</TableCell>
                    <TableCell><Badge>Verified</Badge></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wellness-alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Wellness Alerts</CardTitle>
              <CardDescription>Automated alerts for repeated health issues and patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>High Priority:</strong> Student ID CS2021156 has visited infirmary 5 times in 2 weeks for similar symptoms (headache, fatigue). 
                    Recommend comprehensive health checkup.
                    <div className="mt-2">
                      <Button size="sm" className="mr-2">Schedule Checkup</Button>
                      <Button size="sm" variant="outline">Contact Parent</Button>
                    </div>
                  </AlertDescription>
                </Alert>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Medium Priority:</strong> Flu outbreak pattern detected - 15 cases in CSE department this week. 
                    Consider health awareness campaign.
                    <div className="mt-2">
                      <Button size="sm" className="mr-2">Send Alert</Button>
                      <Button size="sm" variant="outline">View Pattern</Button>
                    </div>
                  </AlertDescription>
                </Alert>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Low Priority:</strong> 12 students have overdue vaccination records. 
                    Send reminder notifications.
                    <div className="mt-2">
                      <Button size="sm" className="mr-2">Send Reminders</Button>
                      <Button size="sm" variant="outline">View List</Button>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">Health Trend Analytics</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Most Common Issues</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Fever/Cold</span>
                          <Badge variant="outline">35%</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Headache</span>
                          <Badge variant="outline">22%</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Stomach Issues</span>
                          <Badge variant="outline">18%</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Peak Visit Times</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">11:00 AM - 12:00 PM</span>
                          <Badge variant="outline">High</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">2:00 PM - 3:00 PM</span>
                          <Badge variant="outline">Medium</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">4:00 PM - 5:00 PM</span>
                          <Badge variant="outline">Low</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Department-wise Health</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Computer Science</span>
                          <Badge>Good</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Electronics</span>
                          <Badge variant="secondary">Alert</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Mechanical</span>
                          <Badge>Good</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
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