import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AddEventDialog } from '@/components/sports/AddEventDialog';
import { AddTeamDialog } from '@/components/sports/AddTeamDialog';
import { 
  Trophy, 
  Calendar, 
  Users, 
  Target, 
  Medal, 
  Activity,
  Plus,
  Timer,
  Award,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';

const SportsManagement = () => {
  const [events, setEvents] = useState([
    {
      id: 1,
      name: 'Inter-College Cricket Championship',
      sport: 'Cricket',
      date: '2024-03-15',
      status: 'Upcoming',
      participants: 120,
      teams: 8
    },
    {
      id: 2,
      name: 'Annual Sports Day',
      sport: 'Multiple',
      date: '2024-03-20',
      status: 'Registrations Open',
      participants: 350,
      teams: 0
    }
  ]);

  const [teams, setTeams] = useState([
    {
      id: 1,
      sport: 'Football',
      category: 'Men\'s Senior',
      captain: 'John Doe',
      members: 15,
      coach: 'Mr. Smith',
      achievements: ['State Champions 2023', 'Regional Winners']
    },
    {
      id: 2,
      sport: 'Basketball',
      category: 'Women\'s Senior',
      captain: 'Jane Smith',
      members: 12,
      coach: 'Ms. Johnson',
      achievements: ['District Runners-up']
    }
  ]);

  const handleEventAdded = (newEvent: any) => {
    setEvents([...events, newEvent]);
  };

  const handleTeamAdded = (newTeam: any) => {
    setTeams([...teams, newTeam]);
  };

  const handleDeleteEvent = (eventId: number) => {
    setEvents(events.filter(event => event.id !== eventId));
  };

  const handleDeleteTeam = (teamId: number) => {
    setTeams(teams.filter(team => team.id !== teamId));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation showBackButton={true} backUrl="/dashboard" backLabel="Back to Dashboard" />
      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Sports & Extra-Curricular Management</h1>
          <p className="text-muted-foreground">Manage events, teams, competitions, and track athletic performance</p>
        </div>

        <Tabs defaultValue="events" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="events" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Events</span>
            </TabsTrigger>
            <TabsTrigger value="teams" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Teams</span>
            </TabsTrigger>
            <TabsTrigger value="competitions" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              <span className="hidden sm:inline">Competitions</span>
            </TabsTrigger>
            <TabsTrigger value="records" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Records</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Event Management</CardTitle>
                    <CardDescription>Create and manage sports events and competitions</CardDescription>
                  </div>
                  <AddEventDialog onEventAdded={handleEventAdded} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {events.map((event) => (
                    <div key={event.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg">{event.name}</h3>
                        <Badge variant={event.status === 'Upcoming' ? 'default' : 'secondary'}>
                          {event.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Sport:</span>
                          <p className="font-medium">{event.sport}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Date:</span>
                          <p className="font-medium">{event.date}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Participants:</span>
                          <p className="font-medium">{event.participants}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Teams:</span>
                          <p className="font-medium">{event.teams || 'Individual'}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteEvent(event.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="teams" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Team Management</CardTitle>
                    <CardDescription>Manage sports teams, members, and coaching staff</CardDescription>
                  </div>
                  <AddTeamDialog onTeamAdded={handleTeamAdded} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teams.map((team) => (
                    <div key={team.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg">{team.sport} - {team.category}</h3>
                        <Badge variant="outline">{team.members} Members</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Captain:</span>
                          <p className="font-medium">{team.captain}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Coach:</span>
                          <p className="font-medium">{team.coach}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Achievements:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {team.achievements.map((achievement, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                <Award className="h-3 w-3 mr-1" />
                                {achievement}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteTeam(team.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="competitions" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Competition Management</CardTitle>
                <CardDescription>Track ongoing competitions and results</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Competition Tracking</h3>
                  <p className="text-muted-foreground mb-4">
                    Set up tournaments, track results, and manage brackets
                  </p>
                  <Button>Create Competition</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="records" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Records & Achievements</CardTitle>
                <CardDescription>Track personal bests, records, and skill development</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Performance Records</h3>
                  <p className="text-muted-foreground mb-4">
                    Maintain leaderboards and track student athletic progress
                  </p>
                  <Button>Add Record</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Sports Analytics</CardTitle>
                <CardDescription>Performance insights and participation statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Performance Analytics</h3>
                  <p className="text-muted-foreground mb-4">
                    Track participation rates, performance trends, and achievements
                  </p>
                  <Button>View Analytics</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default SportsManagement;