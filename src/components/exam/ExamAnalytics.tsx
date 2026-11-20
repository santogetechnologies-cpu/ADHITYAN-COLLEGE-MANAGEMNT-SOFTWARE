import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Award, Users, TrendingUp, CheckCircle, BarChart2 } from 'lucide-react';
import { useExamAnalytics } from '@/hooks/queries/useExams';
import { DataState } from '@/components/shared/DataState';

export const ExamAnalytics = () => {
  const { data: analytics, isLoading, isError, error, refetch } = useExamAnalytics();

  return (
    <div className="space-y-6">
      <DataState
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
        loadingVariant="card"
      >
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Candidates Appeared</p>
                <p className="text-2xl font-bold">{analytics?.totalAppeared || 0}</p>
              </div>
              <Users className="w-8 h-8 text-primary opacity-80" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Pass Percentage</p>
                <p className="text-2xl font-bold text-emerald-600">{analytics?.passPercentage || 0}%</p>
              </div>
              <CheckCircle className="w-8 h-8 text-emerald-600 opacity-80" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Average Score</p>
                <p className="text-2xl font-bold text-blue-600">{analytics?.averageMarks || 0}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600 opacity-80" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Top Rankers</p>
                <p className="text-2xl font-bold text-amber-600">{analytics?.topPerformers?.length || 0}</p>
              </div>
              <Award className="w-8 h-8 text-amber-600 opacity-80" />
            </CardContent>
          </Card>
        </div>

        {/* Top Performers Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              Institutional Honor Roll & Top Performers
            </CardTitle>
            <CardDescription className="text-xs">
              Students achieving highest academic distinction across semester assessments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(!analytics?.topPerformers || analytics.topPerformers.length === 0) ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                No examination marks recorded yet. Grades entered will rank here automatically.
              </p>
            ) : (
              <div className="space-y-3">
                {analytics.topPerformers.map((student, idx) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{student.student_name}</div>
                        <div className="text-muted-foreground text-[11px]">{student.class_name} • {student.subject}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                        {student.marks_obtained}/{student.total_marks} ({Math.round((student.marks_obtained / student.total_marks) * 100)}%)
                      </Badge>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Grade: {student.grade}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </DataState>
    </div>
  );
};

export default ExamAnalytics;
