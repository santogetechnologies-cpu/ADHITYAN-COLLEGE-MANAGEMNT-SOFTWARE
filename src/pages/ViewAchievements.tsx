import { useState, useEffect, useCallback } from 'react';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Award, Trophy, Star, Medal, Target, Loader2, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/supabase/database';
import { Profile } from '@/types/database.types';
import { ROLE_CONFIGS } from '@/config/roles';

interface AchievementItem {
  id: string | number;
  title: string;
  description: string;
  icon: any;
  type: string;
  date: string;
  level: string;
}

interface GoalItem {
  title: string;
  description: string;
  progress: number;
  current: number;
  target: number;
}

const ViewAchievements = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [goals, setGoals] = useState<GoalItem[]>([]);

  // Parent & Child Context
  const [linkedChildren, setLinkedChildren] = useState<Profile[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');

  // 1. If Parent, load linked children
  useEffect(() => {
    async function loadChildren() {
      if (!user?.id) return;
      if (user.role === 'parent') {
        const links = await db.getLinkedStudentsForParent(user.id);
        const children = links.map(l => l.student).filter(Boolean) as Profile[];
        setLinkedChildren(children);
        if (children.length > 0) {
          setSelectedChildId(children[0].id);
        }
      }
    }
    loadChildren();
  }, [user?.id, user?.role]);

  // 2. Load Achievements and Goals for Active Student
  const loadAchievementsData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    let targetStudentId = user.id;
    if (user.role === 'parent') {
      if (!selectedChildId && linkedChildren.length > 0) {
        targetStudentId = linkedChildren[0].id;
      } else if (selectedChildId) {
        targetStudentId = selectedChildId;
      } else {
        setLoading(false);
        setAchievements([]);
        setGoals([]);
        return;
      }
    }

    setLoading(true);
    try {
      const [remoteAchievements, remoteGoals] = await Promise.all([
        db.getStudentAchievements(targetStudentId),
        db.getStudentGoals(targetStudentId)
      ]);

      if (remoteAchievements && remoteAchievements.length > 0) {
        setAchievements(remoteAchievements.map(a => ({
          id: a.id,
          title: a.title,
          description: a.description,
          icon: a.type === 'academic' ? Trophy : a.type === 'attendance' ? Star : Medal,
          type: a.type,
          date: a.date,
          level: a.level,
        })));
      } else {
        setAchievements([]);
      }

      if (remoteGoals && remoteGoals.length > 0) {
        setGoals(remoteGoals.map(g => ({
          title: g.title,
          description: g.description || '',
          progress: g.progress,
          current: g.current_value,
          target: g.target_value,
        })));
      } else {
        setGoals([]);
      }
    } catch (err) {
      console.warn('Failed to load achievements:', err);
      setAchievements([]);
      setGoals([]);
    } finally {
      setLoading(false);
    }
  }, [user, selectedChildId, linkedChildren]);

  useEffect(() => {
    loadAchievementsData();
  }, [loadAchievementsData]);

  // Real-time synchronization
  useRealtimeSubscription({ table: 'student_achievements', onChange: loadAchievementsData, onReconnect: loadAchievementsData });
  useRealtimeSubscription({ table: 'student_goals', onChange: loadAchievementsData, onReconnect: loadAchievementsData });

  const getBadgeColor = (level: string) => {
    switch (level) {
      case 'Gold': return 'bg-accent text-accent-foreground';
      case 'Silver': return 'bg-muted text-muted-foreground';
      case 'Bronze': return 'bg-secondary text-secondary-foreground';
      default: return 'bg-primary text-primary-foreground';
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'academic': return 'text-primary';
      case 'attendance': return 'text-success';
      case 'social': return 'text-secondary';
      default: return 'text-primary';
    }
  };

  const activeStudentName = user?.role === 'parent'
    ? linkedChildren.find(c => c.id === selectedChildId)?.name || 'Linked Child'
    : user?.name || 'Student';

  const handleBack = () => {
    if (window.history.state?.idx > 0) {
      navigate(-1);
    } else {
      const userHome = user ? (ROLE_CONFIGS[user.role]?.home || `/dashboard/${user.role}`) : '/';
      navigate(userHome, { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleBack}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Achievements</h1>
              <p className="text-xs text-muted-foreground">Recognitions and academic learning milestones</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Child Selector for Parents with Multiple Children */}
        {user?.role === 'parent' && linkedChildren.length > 1 && (
          <Card className="border-secondary/40 shadow-sm">
            <CardContent className="pt-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <GraduationCap className="w-5 h-5 text-primary" />
                <Label className="font-semibold text-sm">Select Student:</Label>
              </div>
              <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                <SelectTrigger className="w-60">
                  <SelectValue placeholder="Choose Child" />
                </SelectTrigger>
                <SelectContent>
                  {linkedChildren.map(child => (
                    <SelectItem key={child.id} value={child.id}>
                      {child.name} ({child.class_name || 'Class'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="achievements" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="achievements">Achievements ({achievements.length})</TabsTrigger>
              <TabsTrigger value="goals">Learning Goals ({goals.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="achievements" className="space-y-4">
              {achievements.length === 0 ? (
                <Card className="text-center py-12">
                  <CardContent className="space-y-2">
                    <Trophy className="h-10 w-10 mx-auto text-muted-foreground opacity-40" />
                    <CardTitle className="text-base font-semibold">No Achievements Recorded Yet</CardTitle>
                    <CardDescription>
                      When awards, recognitions, or badges are granted to {activeStudentName}, they will appear here automatically.
                    </CardDescription>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {achievements.map((achievement) => {
                    const IconComponent = achievement.icon;
                    return (
                      <Card key={achievement.id} className="relative">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-muted">
                                <IconComponent className={`h-6 w-6 ${getIconColor(achievement.type)}`} />
                              </div>
                              <div>
                                <CardTitle className="text-lg">{achievement.title}</CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {achievement.description}
                                </p>
                              </div>
                            </div>
                            <Badge className={getBadgeColor(achievement.level)}>
                              {achievement.level}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>Earned on {new Date(achievement.date).toLocaleDateString()}</span>
                            <Badge variant="outline" className="capitalize">
                              {achievement.type}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="goals" className="space-y-4">
              {goals.length === 0 ? (
                <Card className="text-center py-12">
                  <CardContent className="space-y-2">
                    <Target className="h-10 w-10 mx-auto text-muted-foreground opacity-40" />
                    <CardTitle className="text-base font-semibold">No Active Learning Goals</CardTitle>
                    <CardDescription>
                      Curricular targets and reading goals established for {activeStudentName} will appear here.
                    </CardDescription>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {goals.map((goal, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-muted">
                            <Target className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-lg">{goal.title}</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              {goal.description}
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span>Progress</span>
                            <span className="font-medium">
                              {goal.current} / {goal.target}
                            </span>
                          </div>
                          <Progress value={goal.progress} className="h-2" />
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{goal.progress}% complete</span>
                            <span>{goal.target - goal.current} remaining</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
};

export default ViewAchievements;
