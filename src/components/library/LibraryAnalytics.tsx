import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BookOpen, Users, TrendingUp, Clock } from 'lucide-react';

export const LibraryAnalytics = () => {
  const readingData = [
    { month: 'Jan', borrowed: 120, returned: 115 },
    { month: 'Feb', borrowed: 135, returned: 128 },
    { month: 'Mar', borrowed: 150, returned: 145 }
  ];

  const popularBooks = [
    { title: 'Mathematics', count: 45, color: '#3b82f6' },
    { title: 'Physics', count: 32, color: '#22c55e' },
    { title: 'Chemistry', count: 28, color: '#f59e0b' },
    { title: 'Biology', count: 25, color: '#ef4444' }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <BookOpen className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">1,247</p>
            <p className="text-sm text-muted-foreground">Total Books</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Users className="h-8 w-8 mx-auto text-success mb-2" />
            <p className="text-2xl font-bold">342</p>
            <p className="text-sm text-muted-foreground">Active Readers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <TrendingUp className="h-8 w-8 mx-auto text-warning mb-2" />
            <p className="text-2xl font-bold">89%</p>
            <p className="text-sm text-muted-foreground">Return Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Clock className="h-8 w-8 mx-auto text-info mb-2" />
            <p className="text-2xl font-bold">12.5</p>
            <p className="text-sm text-muted-foreground">Avg Reading Days</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Reading Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={readingData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="borrowed" fill="#3b82f6" name="Borrowed" />
                  <Bar dataKey="returned" fill="#22c55e" name="Returned" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Popular Subjects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={popularBooks}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                    label={({ title, count }) => `${title} (${count})`}
                  >
                    {popularBooks.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};