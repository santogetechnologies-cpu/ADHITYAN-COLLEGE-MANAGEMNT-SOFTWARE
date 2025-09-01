import { Navigation } from '@/components/Navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Users, Calendar, DollarSign, Heart, Plus, Filter, Download, Mail } from "lucide-react";
import { MentorshipMatchingDialog } from '@/components/alumni/MentorshipMatchingDialog';
import { EventCreationDialog } from '@/components/alumni/EventCreationDialog';
import { DonationTrackingDialog } from '@/components/alumni/DonationTrackingDialog';
import { AddAlumniDialog } from '@/components/alumni/AddAlumniDialog';

export default function AlumniManagement() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation showBackButton={true} backUrl="/dashboard" backLabel="Back to Dashboard" />
      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Alumni Management</h1>
          <p className="text-muted-foreground">
            Manage alumni directory, events, donations, and mentorship programs
          </p>
        </div>
        <AddAlumniDialog>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Alumni
          </Button>
        </AddAlumniDialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alumni</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,847</div>
            <p className="text-xs text-muted-foreground">+12% from last year</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-xs text-muted-foreground">43% engagement rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Donations This Year</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹12.5L</div>
            <p className="text-xs text-muted-foreground">+28% from last year</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">Next: Annual Meet</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="directory" className="space-y-4">
        <TabsList>
          <TabsTrigger value="directory">Alumni Directory</TabsTrigger>
          <TabsTrigger value="events">Events & Programs</TabsTrigger>
          <TabsTrigger value="donations">Donations & Sponsorship</TabsTrigger>
          <TabsTrigger value="mentorship">Mentorship Program</TabsTrigger>
        </TabsList>

        <TabsContent value="directory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alumni Directory</CardTitle>
              <CardDescription>Browse and manage alumni profiles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search alumni..." className="pl-8" />
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
                    <TableHead>Batch</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Current Position</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Rajesh Kumar</TableCell>
                    <TableCell>2015-2019</TableCell>
                    <TableCell>Computer Science</TableCell>
                    <TableCell>Software Engineer at Google</TableCell>
                    <TableCell>Bangalore</TableCell>
                    <TableCell><Badge variant="secondary">Active</Badge></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Mail className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Priya Sharma</TableCell>
                    <TableCell>2012-2016</TableCell>
                    <TableCell>Electronics</TableCell>
                    <TableCell>Product Manager at Microsoft</TableCell>
                    <TableCell>Hyderabad</TableCell>
                    <TableCell><Badge variant="secondary">Active</Badge></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Mail className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Arun Patel</TableCell>
                    <TableCell>2018-2022</TableCell>
                    <TableCell>Mechanical</TableCell>
                    <TableCell>Entrepreneur</TableCell>
                    <TableCell>Mumbai</TableCell>
                    <TableCell><Badge>Mentor</Badge></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Mail className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alumni Events & Programs</CardTitle>
              <CardDescription>Organize reunions, guest lectures, and networking events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-2">
                  <EventCreationDialog>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Event
                    </Button>
                  </EventCreationDialog>
                  <Button variant="outline">View Calendar</Button>
                </div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Annual Alumni Meet 2024</CardTitle>
                      <Badge>Upcoming</Badge>
                    </div>
                    <CardDescription>Dec 15, 2024 • College Auditorium</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      Grand reunion celebrating 50 years of excellence. Guest speaker: Dr. APJ Abdul Kalam Foundation
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">156 Registered</span>
                      <Button size="sm">Manage</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Tech Talk Series</CardTitle>
                      <Badge variant="secondary">Ongoing</Badge>
                    </div>
                    <CardDescription>Monthly • Virtual</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      Monthly tech talks by alumni working in top tech companies
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Next: AI in Healthcare</span>
                      <Button size="sm">Manage</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Career Guidance Workshop</CardTitle>
                      <Badge variant="outline">Planning</Badge>
                    </div>
                    <CardDescription>Jan 20, 2025 • Seminar Hall</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      Career guidance session for final year students by industry experts
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">12 Speakers confirmed</span>
                      <Button size="sm">Manage</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Golden Batch Reunion</CardTitle>
                      <Badge variant="secondary">Completed</Badge>
                    </div>
                    <CardDescription>Nov 10, 2024 • Main Campus</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      25-year reunion for the batch of 1999. Nostalgic celebration with faculty
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">89 Attended</span>
                      <Button size="sm" variant="outline">View Report</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="donations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Donations & Sponsorship Tracking</CardTitle>
              <CardDescription>Track alumni contributions and sponsorships</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">This Month</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">₹2,45,000</div>
                    <p className="text-xs text-muted-foreground">23 donations</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">This Year</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">₹12,50,000</div>
                    <p className="text-xs text-muted-foreground">184 donations</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Largest Donation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">₹5,00,000</div>
                    <p className="text-xs text-muted-foreground">Infrastructure fund</p>
                  </CardContent>
                </Card>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Donor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Receipt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Rajesh Kumar (2019)</TableCell>
                    <TableCell>₹50,000</TableCell>
                    <TableCell>Computer Lab Equipment</TableCell>
                    <TableCell>Nov 15, 2024</TableCell>
                    <TableCell><Badge>Received</Badge></TableCell>
                    <TableCell>
                      <DonationTrackingDialog donationId="D001">
                        <Button variant="ghost" size="sm">Download</Button>
                      </DonationTrackingDialog>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Priya Sharma (2016)</TableCell>
                    <TableCell>₹25,000</TableCell>
                    <TableCell>Scholarship Fund</TableCell>
                    <TableCell>Nov 12, 2024</TableCell>
                    <TableCell><Badge>Received</Badge></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">Download</Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">TechCorp (Arun Patel)</TableCell>
                    <TableCell>₹2,00,000</TableCell>
                    <TableCell>Annual Tech Fest Sponsorship</TableCell>
                    <TableCell>Oct 28, 2024</TableCell>
                    <TableCell><Badge variant="secondary">Processing</Badge></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" disabled>Pending</Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mentorship" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mentorship Program</CardTitle>
              <CardDescription>Connect current students with alumni mentors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Active Mentors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">78</div>
                    <p className="text-xs text-muted-foreground">Available alumni</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Mentees</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">156</div>
                    <p className="text-xs text-muted-foreground">Current students</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Active Pairs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">123</div>
                    <p className="text-xs text-muted-foreground">Ongoing mentorship</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Success Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">92%</div>
                    <p className="text-xs text-muted-foreground">Completion rate</p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-between items-center mb-4">
                <MentorshipMatchingDialog mode="match">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Pairing
                  </Button>
                </MentorshipMatchingDialog>
                <div className="flex items-center space-x-2">
                  <MentorshipMatchingDialog mode="mentor">
                    <Button variant="outline">Mentor Applications</Button>
                  </MentorshipMatchingDialog>
                  <MentorshipMatchingDialog mode="program">
                    <Button variant="outline">Program Analytics</Button>
                  </MentorshipMatchingDialog>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mentor</TableHead>
                    <TableHead>Mentee</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Rajesh Kumar (Google)</TableCell>
                    <TableCell>Amit Singh (Final Year CSE)</TableCell>
                    <TableCell>Software Development</TableCell>
                    <TableCell>6 months</TableCell>
                    <TableCell><Badge>Active</Badge></TableCell>
                    <TableCell>
                      <MentorshipMatchingDialog mode="program" profileId="M001">
                        <Button variant="ghost" size="sm">View Details</Button>
                      </MentorshipMatchingDialog>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Priya Sharma (Microsoft)</TableCell>
                    <TableCell>Neha Gupta (Third Year ECE)</TableCell>
                    <TableCell>Product Management</TableCell>
                    <TableCell>4 months</TableCell>
                    <TableCell><Badge>Active</Badge></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">View Details</Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Arun Patel (Entrepreneur)</TableCell>
                    <TableCell>Rahul Verma (Final Year ME)</TableCell>
                    <TableCell>Entrepreneurship</TableCell>
                    <TableCell>8 months</TableCell>
                    <TableCell><Badge variant="secondary">Completed</Badge></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">View Report</Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        </div>
      </main>
    </div>
  );
}