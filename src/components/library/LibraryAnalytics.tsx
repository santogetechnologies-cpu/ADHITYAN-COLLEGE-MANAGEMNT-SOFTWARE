import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BookOpen, Users, TrendingUp, Clock, Loader2, Library } from 'lucide-react';
import { db } from '@/services/supabase/database';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

export const LibraryAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBooks: 0,
    activeReaders: 0,
    returnRate: 0,
    avgReadingDays: 0
  });

  const [readingTrends, setReadingTrends] = useState<Array<{ month: string; borrowed: number; returned: number }>>([]);
  const [subjectDistribution, setSubjectDistribution] = useState<Array<{ title: string; count: number; color: string }>>([]);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const [books, issues] = await Promise.all([
        db.getLibraryBooks(),
        db.getIssuedBooks()
      ]);

      const totalCopies = (books || []).reduce((sum, b) => sum + Number(b.total_copies || 1), 0);
      const activeBorrowers = new Set((issues || []).filter((i: any) => i.status === 'Issued' || i.status === 'Overdue').map((i: any) => i.student_id)).size;
      const returnedCount = (issues || []).filter((i: any) => i.status === 'Returned').length;
      const totalIssues = (issues || []).length;
      const returnPct = totalIssues > 0 ? Math.round((returnedCount / totalIssues) * 100) : 0;

      let totalDays = 0;
      let countedDays = 0;
      (issues || []).forEach((i: any) => {
        if (i.issue_date && (i.return_date || i.due_date)) {
          const start = new Date(i.issue_date).getTime();
          const end = new Date(i.return_date || i.due_date).getTime();
          const days = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
          totalDays += days;
          countedDays++;
        }
      });
      const avgDays = countedDays > 0 ? Number((totalDays / countedDays).toFixed(1)) : 0;

      setStats({
        totalBooks: totalCopies,
        activeReaders: activeBorrowers,
        returnRate: returnPct,
        avgReadingDays: avgDays
      });

      // Subject distribution from actual books
      const subMap = new Map<string, number>();
      (books || []).forEach(b => {
        const cat = b.subject || b.category || 'General';
        subMap.set(cat, (subMap.get(cat) || 0) + Number(b.total_copies || 1));
      });

      const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
      const subList: Array<{ title: string; count: number; color: string }> = [];
      let cIdx = 0;
      subMap.forEach((count, title) => {
        subList.push({ title, count, color: colors[cIdx % colors.length] });
        cIdx++;
      });
      setSubjectDistribution(subList);

      // Monthly trends from actual book issues
      const monthMap = new Map<string, { borrowed: number; returned: number }>();
      (issues || []).forEach((i: any) => {
        if (i.issue_date) {
          const m = new Date(i.issue_date).toLocaleString('default', { month: 'short' });
          if (!monthMap.has(m)) monthMap.set(m, { borrowed: 0, returned: 0 });
          monthMap.get(m)!.borrowed++;
          if (i.status === 'Returned') monthMap.get(m)!.returned++;
        }
      });

      const trends: Array<{ month: string; borrowed: number; returned: number }> = [];
      monthMap.forEach((val, month) => {
        trends.push({ month, borrowed: val.borrowed, returned: val.returned });
      });
      setReadingTrends(trends);

    } catch (err) {
      console.warn('Failed to load library analytics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  useRealtimeSubscription({ table: 'library_books', onChange: loadAnalytics, onReconnect: loadAnalytics });
  useRealtimeSubscription({ table: 'book_issues', onChange: loadAnalytics, onReconnect: loadAnalytics });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <BookOpen className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">{loading ? '-' : stats.totalBooks.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Total Books</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Users className="h-8 w-8 mx-auto text-emerald-600 mb-2" />
            <p className="text-2xl font-bold">{loading ? '-' : stats.activeReaders.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Active Readers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <TrendingUp className="h-8 w-8 mx-auto text-amber-600 mb-2" />
            <p className="text-2xl font-bold">{loading ? '-' : `${stats.returnRate}%`}</p>
            <p className="text-sm text-muted-foreground">Return Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Clock className="h-8 w-8 mx-auto text-blue-600 mb-2" />
            <p className="text-2xl font-bold">{loading ? '-' : stats.avgReadingDays}</p>
            <p className="text-sm text-muted-foreground">Avg Reading Days</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Circulation Trends</CardTitle>
            <CardDescription>Real-time record of book loans and returns by month</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-60">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : readingTrends.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-60 text-center text-sm text-muted-foreground border rounded-lg">
                <BookOpen className="w-8 h-8 text-muted-foreground/40 mb-2" />
                <p className="font-semibold text-foreground/80">No Book Circulation Records</p>
                <p className="text-xs text-muted-foreground mt-0.5">Circulation trends will appear once books are issued to students.</p>
              </div>
            ) : (
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={readingTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="borrowed" fill="#3b82f6" name="Borrowed" />
                    <Bar dataKey="returned" fill="#22c55e" name="Returned" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subject Distribution</CardTitle>
            <CardDescription>Breakdown of catalog inventory across academic subjects</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-60">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : subjectDistribution.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-60 text-center text-sm text-muted-foreground border rounded-lg">
                <Library className="w-8 h-8 text-muted-foreground/40 mb-2" />
                <p className="font-semibold text-foreground/80">No Books in Catalog</p>
                <p className="text-xs text-muted-foreground mt-0.5">Subject distribution chart will render as books are cataloged.</p>
              </div>
            ) : (
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={subjectDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      label={({ title, count }) => `${title} (${count})`}
                    >
                      {subjectDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
