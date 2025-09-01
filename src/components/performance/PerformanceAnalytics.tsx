import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Calendar, BarChart3 } from 'lucide-react';

interface SubjectPerformance {
  subject: string;
  score: number;
  trend: 'up' | 'down' | 'stable';
  change: number;
  color: string;
}

type TimeRange = '1month' | '3months' | '1year';

export function PerformanceAnalytics() {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('1month');
  
  const performanceData: Record<TimeRange, SubjectPerformance[]> = {
    '1month': [
      { subject: 'Mathematics', score: 85, trend: 'up', change: 5, color: 'bg-blue-500' },
      { subject: 'Science', score: 92, trend: 'up', change: 3, color: 'bg-green-500' },
      { subject: 'English', score: 78, trend: 'down', change: -2, color: 'bg-orange-500' },
      { subject: 'History', score: 88, trend: 'up', change: 7, color: 'bg-purple-500' },
      { subject: 'Geography', score: 82, trend: 'stable', change: 0, color: 'bg-teal-500' }
    ],
    '3months': [
      { subject: 'Mathematics', score: 87, trend: 'up', change: 8, color: 'bg-blue-500' },
      { subject: 'Science', score: 89, trend: 'up', change: 6, color: 'bg-green-500' },
      { subject: 'English', score: 81, trend: 'up', change: 4, color: 'bg-orange-500' },
      { subject: 'History', score: 85, trend: 'up', change: 5, color: 'bg-purple-500' },
      { subject: 'Geography', score: 84, trend: 'up', change: 3, color: 'bg-teal-500' }
    ],
    '1year': [
      { subject: 'Mathematics', score: 90, trend: 'up', change: 15, color: 'bg-blue-500' },
      { subject: 'Science', score: 94, trend: 'up', change: 12, color: 'bg-green-500' },
      { subject: 'English', score: 86, trend: 'up', change: 10, color: 'bg-orange-500' },
      { subject: 'History', score: 88, trend: 'up', change: 8, color: 'bg-purple-500' },
      { subject: 'Geography', score: 87, trend: 'up', change: 9, color: 'bg-teal-500' }
    ]
  };

  const timeRangeLabels = {
    '1month': 'Past 1 Month',
    '3months': 'Past 3 Months',
    '1year': 'Past 1 Year'
  };

  const currentData = performanceData[selectedRange];
  const overallAverage = Math.round(currentData.reduce((sum, subject) => sum + subject.score, 0) / currentData.length);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Performance Analytics</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Badge variant="secondary">{timeRangeLabels[selectedRange]}</Badge>
          </div>
        </div>
        <CardDescription>
          Track your academic performance across different subjects and time periods
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Time Range Filter */}
        <div className="flex flex-wrap gap-2">
          {(Object.keys(timeRangeLabels) as TimeRange[]).map((range) => (
            <Button
              key={range}
              variant={selectedRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedRange(range)}
            >
              {timeRangeLabels[range]}
            </Button>
          ))}
        </div>

        {/* Overall Performance */}
        <div className="bg-muted rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium">Overall Performance</h3>
            <div className="text-2xl font-bold text-primary">{overallAverage}%</div>
          </div>
          <Progress value={overallAverage} className="h-3" />
        </div>

        {/* Subject-wise Performance */}
        <div className="space-y-4">
          <h3 className="font-medium">Subject-wise Performance</h3>
          <div className="space-y-3">
            {currentData.map((subject, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${subject.color}`}></div>
                    <span className="font-medium text-sm">{subject.subject}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{subject.score}%</span>
                    <div className="flex items-center space-x-1">
                      {subject.trend === 'up' && (
                        <>
                          <TrendingUp className="w-3 h-3 text-green-500" />
                          <span className="text-xs text-green-500">+{subject.change}%</span>
                        </>
                      )}
                      {subject.trend === 'down' && (
                        <>
                          <TrendingDown className="w-3 h-3 text-red-500" />
                          <span className="text-xs text-red-500">{subject.change}%</span>
                        </>
                      )}
                      {subject.trend === 'stable' && (
                        <span className="text-xs text-muted-foreground">No change</span>
                      )}
                    </div>
                  </div>
                </div>
                <Progress value={subject.score} className="h-2" />
              </div>
            ))}
          </div>
        </div>

        {/* Performance Insights */}
        <div className="bg-muted rounded-lg p-4">
          <h4 className="font-medium mb-2">Performance Insights</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Best performing subject: {currentData.sort((a, b) => b.score - a.score)[0].subject}</li>
            <li>• Most improved: {currentData.sort((a, b) => b.change - a.change)[0].subject}</li>
            <li>• Areas for focus: {currentData.filter(s => s.score < 80).map(s => s.subject).join(', ') || 'All subjects performing well!'}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}