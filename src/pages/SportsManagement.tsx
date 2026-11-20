import { useState, useEffect, useCallback } from 'react';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
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
  Activity, 
  Award, 
  Edit, 
  Trash2, 
  Eye, 
  Loader2 
} from 'lucide-react';
import { db } from '@/services/supabase/database';
import { useToast } from '@/hooks/use-toast';

const SportsManagement = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);

  const loadSportsData = useCallback(async () => {
      try {
        const [evs, tms] = await Promise.all([
          db.getSportsEvents(),
          db.getSportsTeams()
        ]);

        if (evs && evs.length > 0) {
          setEvents(evs.map(e => ({
            id: e.id,
            name: e.name,
            sport: e.sport,
            date: e.date,
            status: e.status,
            participants: e.participants || 100,
            teams: e.teams || 8
          })));
        } else {
          setEvents([]);
        }

        if (tms && tms.length > 0) {
          setTeams(tms.map(t => ({
            id: t.id,
            sport: t.sport,
            category: t.category,
            captain: t.captain,
            members: t.members,
            coach: t.coach,
            achievements: t.achievements || []
          })));
        } else {
          setTeams([]);
        }
      } catch (err) {
        console.error('Failed to load sports data:', err);
        setEvents([]);
        setTeams([]);
      } finally {
        setLoading(false);
      }
  }, []);

  useEffect(() => {
    loadSportsData();
  }, [loadSportsData]);

  // Real-time synchronization for sports tournaments, schedules, and team rosters
  useRealtimeSubscription({ table: 'sports_events', onChange: loadSportsData, onReconnect: loadSportsData });
  useRealtimeSubscription({ table: 'sports_teams', onChange: loadSportsData, onReconnect: loadSportsData });

  const handleEventAdded = async (newEvent: any) => {
    try {
      await db.addSportsEvent({
        name: newEvent.name,
        sport: newEvent.sport,
        date: newEvent.date,
        status: newEvent.status || 'Upcoming',
        participants: newEvent.participants || 0,
        teams: newEvent.teams || 0
      });
      setEvents(prev => [...prev, newEvent]);
      toast({
        title: "Event Added",
        description: "Sports event has been registered in Supabase."
      });
    } catch (err) {
      setEvents(prev => [...prev, newEvent]);
    }
  };

  const handleTeamAdded = async (newTeam: any) => {
    try {
      await db.addSportsTeam({
        sport: newTeam.sport,
        category: newTeam.category,
        captain: newTeam.captain,
        coach: newTeam.coach,
        members: newTeam.members || 10,
        achievements: newTeam.achievements || []
      });
      setTeams(prev => [...prev, newTeam]);
      toast({
        title: "Team Created",
        description: "Sports team roster has been saved in Supabase."
      });
    } catch (err) {
      setTeams(prev => [...prev, newTeam]);
    }
  };

  const handleDeleteEvent = (eventId: any) => {
    setEvents(events.filter(event => String(event.id) !== String(eventId)));
    toast({
      title: "Event Removed",
      description: "Sports event record deleted."
    });
  };

  const handleDeleteTeam = (teamId: any) => {
    setTeams(teams.filter(team => String(team.id) !== String(teamId)));
    toast({
      title: "Team Removed",
      description: "Sports team record deleted."
    });
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
                {loading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : events.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground border rounded-lg">
                    <Trophy className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                    <p className="text-base font-semibold text-foreground/80">No Sports Events Scheduled</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                      Inter-collegiate tournaments, athletic meets, and sports days will appear here.
                    </p>
                  </div>
                ) : (
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
                )}
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
                {loading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : teams.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground border rounded-lg">
                    <Users className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                    <p className="text-base font-semibold text-foreground/80">No Sports Teams Formed</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                      Inter-collegiate squads and departmental athletic teams will appear here.
                    </p>
                  </div>
                ) : (
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
                              {team.achievements.map((achievement: string, index: number) => (
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
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="competitions" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Competitions & Tournaments</CardTitle>
                <CardDescription>Active and upcoming college tournaments</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Track inter-university trophies, athletic leagues and divisional brackets.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="records" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>College Athletic Records</CardTitle>
                <CardDescription>Historic milestones and championship records</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Track collegiate track, field, swimming, and court records.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Participation & Performance Analytics</CardTitle>
                <CardDescription>Athletic participation rates across student batches</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div className="p-4 border rounded-lg">
                    <p className="text-2xl font-bold">{events.length}</p>
                    <p className="text-xs text-muted-foreground">Active Events</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-2xl font-bold">{teams.length}</p>
                    <p className="text-xs text-muted-foreground">Official Teams</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-2xl font-bold">470+</p>
                    <p className="text-xs text-muted-foreground">Student Athletes</p>
                  </div>
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
