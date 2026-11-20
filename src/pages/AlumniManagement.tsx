import { useState, useEffect, useCallback } from 'react';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { Navigation } from '@/components/Navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Users, Calendar, DollarSign, Heart, Plus, Filter, Download, Mail, Loader2 } from "lucide-react";
import { MentorshipMatchingDialog } from '@/components/alumni/MentorshipMatchingDialog';
import { EventCreationDialog } from '@/components/alumni/EventCreationDialog';
import { DonationTrackingDialog } from '@/components/alumni/DonationTrackingDialog';
import { AddAlumniDialog } from '@/components/alumni/AddAlumniDialog';
import { db } from '@/services/supabase/database';
import { AlumniProfile, AlumniEvent } from '@/types/database.types';

export default function AlumniManagement() {
  const [alumniList, setAlumniList] = useState<AlumniProfile[]>([]);
  const [eventsList, setEventsList] = useState<AlumniEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadAlumniData = useCallback(async () => {
      try {
        const [profiles, events] = await Promise.all([
          db.getAlumniProfiles(),
          db.getAlumniEvents()
        ]);

        if (profiles && profiles.length > 0) {
          setAlumniList(profiles);
        } else {
          setAlumniList([]);
        }

        if (events && events.length > 0) {
          setEventsList(events);
        } else {
          setEventsList([]);
        }
      } catch (err) {
        console.error('Failed to load alumni data:', err);
      } finally {
        setLoading(false);
      }
  }, []);

  useEffect(() => {
    loadAlumniData();
  }, [loadAlumniData]);

  // Real-time synchronization for alumni directory and networking events
  useRealtimeSubscription({ table: 'alumni_members', onChange: loadAlumniData, onReconnect: loadAlumniData });
  useRealtimeSubscription({ table: 'alumni_events', onChange: loadAlumniData, onReconnect: loadAlumniData });

  const handleAlumniAdded = (newAlumni: AlumniProfile) => {
    setAlumniList(prev => [newAlumni, ...prev]);
  };

  const filteredAlumni = alumniList.filter((a) => {
    const fullName = `${a.first_name} ${a.last_name}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    return (
      fullName.includes(query) ||
      (a.department && a.department.toLowerCase().includes(query)) ||
      (a.company && a.company.toLowerCase().includes(query)) ||
      (a.current_position && a.current_position.toLowerCase().includes(query))
    );
  });

  const totalCount = alumniList.length;
  const activeCount = alumniList.filter(a => a.status === 'Active' || a.status === 'Mentor').length;
  const upcomingEventsCount = eventsList.filter(e => e.status === 'Upcoming' || e.status === 'Ongoing').length;

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
            <AddAlumniDialog onAlumniAdded={handleAlumniAdded}>
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
                <div className="text-2xl font-bold">{totalCount}</div>
                <p className="text-xs text-muted-foreground">+12% from last year</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Members</CardTitle>
                <Heart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeCount}</div>
                <p className="text-xs text-muted-foreground">High engagement rate</p>
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
                <div className="text-2xl font-bold">{upcomingEventsCount}</div>
                <p className="text-xs text-muted-foreground">Scheduled in system</p>
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
                      <Input 
                        placeholder="Search alumni by name, company, position, department..." 
                        className="pl-8" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
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
                          <TableHead>Batch</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Current Position</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAlumni.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                              No alumni found.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredAlumni.map((alumnus) => (
                            <TableRow key={alumnus.id}>
                              <TableCell className="font-medium">
                                {alumnus.first_name} {alumnus.last_name}
                              </TableCell>
                              <TableCell>{alumnus.graduation_year || 'N/A'}</TableCell>
                              <TableCell>{alumnus.department}</TableCell>
                              <TableCell>
                                {alumnus.current_position ? `${alumnus.current_position}${alumnus.company ? ` at ${alumnus.company}` : ''}` : '-'}
                              </TableCell>
                              <TableCell>{alumnus.location || 'N/A'}</TableCell>
                              <TableCell>
                                <Badge variant={alumnus.status === 'Active' ? 'secondary' : alumnus.status === 'Mentor' ? 'default' : 'outline'}>
                                  {alumnus.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="sm" onClick={() => window.open(`mailto:${alumnus.email}`)}>
                                  <Mail className="w-4 h-4" />
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
                    {eventsList.map((ev) => (
                      <Card key={ev.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{ev.title}</CardTitle>
                            <Badge variant={ev.status === 'Upcoming' ? 'default' : ev.status === 'Ongoing' ? 'secondary' : 'outline'}>
                              {ev.status}
                            </Badge>
                          </div>
                          <CardDescription>
                            {ev.event_date} • {ev.location}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-3">
                            {ev.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">{ev.attendees_count} Registered</span>
                            <Button size="sm">Manage</Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
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
