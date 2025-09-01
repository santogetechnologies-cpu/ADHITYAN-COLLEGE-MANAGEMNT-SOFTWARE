import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PenTool, Calendar, Users, Award } from 'lucide-react';

export const EntranceTest = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Entrance Test Management</h2>
        <p className="text-muted-foreground">Manage entrance tests and evaluations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <PenTool className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">3</p>
            <p className="text-sm text-muted-foreground">Scheduled Tests</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Users className="h-8 w-8 mx-auto text-success mb-2" />
            <p className="text-2xl font-bold">245</p>
            <p className="text-sm text-muted-foreground">Registered</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Calendar className="h-8 w-8 mx-auto text-warning mb-2" />
            <p className="text-2xl font-bold">2</p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Award className="h-8 w-8 mx-auto text-info mb-2" />
            <p className="text-2xl font-bold">180</p>
            <p className="text-sm text-muted-foreground">Qualified</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Entrance Tests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 border rounded-lg">
              <div>
                <h3 className="font-semibold">Class 11 Science Entrance</h3>
                <p className="text-sm text-muted-foreground">March 25, 2024 • 10:00 AM - 1:00 PM</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">Active</Badge>
                <Button variant="outline" size="sm">Manage</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};