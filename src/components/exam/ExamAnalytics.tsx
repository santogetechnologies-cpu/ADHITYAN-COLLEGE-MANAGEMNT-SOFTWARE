import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Users, Target, BookOpen, Award } from 'lucide-react';

export const ExamAnalytics = () => {
  const [performanceData] = useState([
    { subject: 'Mathematics', average: 78, passRate: 85, excellentRate: 25 },
    { subject: 'Physics', average: 72, passRate: 80, excellentRate: 20 },
    { subject: 'Chemistry', average: 75, passRate: 82, excellentRate: 22 },
    { subject: 'Biology', average: 80, passRate: 88, excellentRate: 30 },
    { subject: 'English', average: 76, passRate: 90, excellentRate: 28 }
  ]);

  const [trendData] = useState([
    { exam: 'Unit Test 1', average: 70, passRate: 75 },
    { exam: 'Unit Test 2', average: 74, passRate: 80 },
    { exam: 'Mid Term', average: 78, passRate: 85 },
    { exam: 'Unit Test 3', average: 76, passRate: 82 },
    { exam: 'Final Exam', average: 80, passRate: 88 }
  ]);

  const [gradeDistribution] = useState([
    { grade: 'A+', count: 15, percentage: 20, color: '#22c55e' },
    { grade: 'A', count: 20, percentage: 27, color: '#3b82f6' },
    { grade: 'B+', count: 18, percentage: 24, color: '#f59e0b' },
    { grade: 'B', count: 12, percentage: 16, color: '#ef4444' },
    { grade: 'C', count: 10, percentage: 13, color: '#6b7280' }
  ]);

  const [classComparison] = useState([
    { class: 'Class 9A', average: 82, students: 45 },
    { class: 'Class 9B', average: 78, students: 42 },
    { class: 'Class 10A', average: 85, students: 40 },
    { class: 'Class 10B', average: 80, students: 43 },
    { class: 'Class 11A', average: 79, students: 38 },
    { class: 'Class 11B', average: 76, students: 35 },
    { class: 'Class 12A', average: 88, students: 35 },
    { class: 'Class 12B', average: 84, students: 37 }
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Exam Analytics</h2>
          <p className="text-muted-foreground">Comprehensive analysis of examination performance and trends</p>
        </div>
        <div className="flex gap-2">
          <Select>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select exam type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Exams</SelectItem>
              <SelectItem value="mid-term">Mid Term</SelectItem>
              <SelectItem value="final">Final Exam</SelectItem>
              <SelectItem value="unit-test">Unit Tests</SelectItem>
            </SelectContent>
          </Select>
          <Select>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Academic year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024-25</SelectItem>
              <SelectItem value="2023">2023-24</SelectItem>
              <SelectItem value="2022">2022-23</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overall Average</p>
                <p className="text-2xl font-bold text-primary">76.2%</p>
                <div className="flex items-center gap-1 text-sm">
                  <TrendingUp className="h-4 w-4 text-success" />
                  <span className="text-success">+2.3%</span>
                </div>
              </div>
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pass Rate</p>
                <p className="text-2xl font-bold text-success">84.5%</p>
                <div className="flex items-center gap-1 text-sm">
                  <TrendingUp className="h-4 w-4 text-success" />
                  <span className="text-success">+1.8%</span>
                </div>
              </div>
              <Award className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold">1,247</p>
                <div className="flex items-center gap-1 text-sm">
                  <TrendingUp className="h-4 w-4 text-success" />
                  <span className="text-success">+45</span>
                </div>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Top Performer</p>
                <p className="text-lg font-bold">Emma Johnson</p>
                <div className="flex items-center gap-1 text-sm">
                  <Badge variant="outline">95.2%</Badge>
                </div>
              </div>
              <BookOpen className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance by Subject */}
      <Card>
        <CardHeader>
          <CardTitle>Subject-wise Performance Analysis</CardTitle>
          <CardDescription>Average scores and pass rates across different subjects</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="subject" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="average" fill="#3b82f6" name="Average Score %" />
                <Bar dataKey="passRate" fill="#22c55e" name="Pass Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Trend</CardTitle>
            <CardDescription>Track improvement over multiple examinations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="exam" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="average" stroke="#3b82f6" strokeWidth={2} name="Average %" />
                  <Line type="monotone" dataKey="passRate" stroke="#22c55e" strokeWidth={2} name="Pass Rate %" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Grade Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Grade Distribution</CardTitle>
            <CardDescription>Distribution of grades across all students</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gradeDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ grade, percentage }) => `${grade} (${percentage}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {gradeDistribution.map((entry, index) => (
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

      {/* Class Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Class-wise Performance Comparison</CardTitle>
          <CardDescription>Compare average performance across different classes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {classComparison.map((classData, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-20">
                    <p className="font-medium">{classData.class}</p>
                    <p className="text-sm text-muted-foreground">{classData.students} students</p>
                  </div>
                  <div className="flex-1 max-w-md">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Average Performance</span>
                      <span className="font-medium">{classData.average}%</span>
                    </div>
                    <Progress value={classData.average} className="h-2" />
                  </div>
                </div>
                <Badge 
                  variant={classData.average >= 85 ? 'default' : classData.average >= 75 ? 'secondary' : 'outline'}
                >
                  {classData.average >= 85 ? 'Excellent' : classData.average >= 75 ? 'Good' : 'Needs Improvement'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};