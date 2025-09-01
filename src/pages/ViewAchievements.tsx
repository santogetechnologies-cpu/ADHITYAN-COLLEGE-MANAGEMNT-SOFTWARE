import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Award, Trophy, Star, Medal, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ViewAchievements = () => {
  const navigate = useNavigate();

  const achievements = [
    {
      id: 1,
      title: 'Math Champion',
      description: 'Scored above 90% in Mathematics for 3 consecutive months',
      icon: Trophy,
      type: 'academic',
      date: '2024-02-15',
      level: 'Gold'
    },
    {
      id: 2,
      title: 'Perfect Attendance',
      description: 'No missed days for the entire semester',
      icon: Star,
      type: 'attendance',
      date: '2024-01-30',
      level: 'Silver'
    },
    {
      id: 3,
      title: 'Science Explorer',
      description: 'Completed all science projects with excellence',
      icon: Medal,
      type: 'academic',
      date: '2024-01-15',
      level: 'Bronze'
    },
    {
      id: 4,
      title: 'Team Player',
      description: 'Outstanding participation in group activities',
      icon: Award,
      type: 'social',
      date: '2023-12-20',
      level: 'Gold'
    }
  ];

  const goals = [
    {
      title: 'Reading Master',
      description: 'Read 50 books this year',
      progress: 75,
      current: 38,
      target: 50
    },
    {
      title: 'Math Wizard',
      description: 'Master multiplication tables',
      progress: 90,
      current: 9,
      target: 10
    },
    {
      title: 'Science Scholar',
      description: 'Complete all science experiments',
      progress: 60,
      current: 12,
      target: 20
    }
  ];

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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/dashboard')}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Achievements</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="achievements" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="goals">Learning Goals</TabsTrigger>
          </TabsList>

          <TabsContent value="achievements" className="space-y-4">
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
          </TabsContent>

          <TabsContent value="goals" className="space-y-4">
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
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ViewAchievements;