import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  BookOpen, 
  Calendar, 
  TrendingUp,
  Search,
  Filter,
  Building2,
  UserCheck,
  Clock,
  Target
} from 'lucide-react';

export function DepartmentOversight() {
  const [searchQuery, setSearchQuery] = useState('');

  const departments = [
    {
      id: 1,
      name: 'Mathematics',
      head: 'Dr. Sarah Johnson',
      teachers: 8,
      students: 320,
      subjects: ['Algebra', 'Geometry', 'Calculus'],
      performance: 87,
      status: 'active'
    },
    {
      id: 2,
      name: 'Science',
      head: 'Dr. Michael Chen',
      teachers: 12,
      students: 450,
      subjects: ['Physics', 'Chemistry', 'Biology'],
      performance: 92,
      status: 'active'
    },
    {
      id: 3,
      name: 'Languages',
      head: 'Prof. Emily Rodriguez',
      teachers: 6,
      students: 280,
      subjects: ['English', 'Hindi', 'French'],
      performance: 85,
      status: 'active'
    },
    {
      id: 4,
      name: 'Social Studies',
      head: 'Dr. Robert Singh',
      teachers: 5,
      students: 250,
      subjects: ['History', 'Geography', 'Civics'],
      performance: 79,
      status: 'active'
    }
  ];

  const metrics = [
    { label: 'Total Departments', value: '12', icon: Building2, change: '+2' },
    { label: 'Total Faculty', value: '98', icon: Users, change: '+8' },
    { label: 'Active Courses', value: '45', icon: BookOpen, change: '+3' },
    { label: 'Avg Performance', value: '86%', icon: TrendingUp, change: '+4%' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Department Oversight</h1>
          <p className="text-muted-foreground">Monitor and manage academic departments</p>
        </div>
        <Button>Add New Department</Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
                  <p className="text-2xl font-bold">{metric.value}</p>
                </div>
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <metric.icon className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <Badge variant="secondary" className="text-xs">
                  {metric.change} this month
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="departments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>

        <TabsContent value="departments" className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input 
                placeholder="Search departments..." 
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Departments Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {departments.map((dept) => (
              <Card key={dept.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{dept.name}</CardTitle>
                      <CardDescription>Head: {dept.head}</CardDescription>
                    </div>
                    <Badge variant={dept.status === 'active' ? 'default' : 'secondary'}>
                      {dept.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{dept.teachers} Teachers</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{dept.students} Students</span>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Performance Score</span>
                        <span className="text-sm font-bold">{dept.performance}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${dept.performance}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <span className="text-sm font-medium mb-2 block">Subjects:</span>
                      <div className="flex flex-wrap gap-1">
                        {dept.subjects.map((subject, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {subject}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        View Details
                      </Button>
                      <Button size="sm" className="flex-1">
                        Manage
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Department Performance Overview</CardTitle>
              <CardDescription>Academic performance metrics across departments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {departments.map((dept) => (
                  <div key={dept.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">{dept.name}</h3>
                        <p className="text-sm text-muted-foreground">{dept.students} students</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{dept.performance}%</div>
                      <div className="text-sm text-muted-foreground">Performance Score</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resource Allocation</CardTitle>
              <CardDescription>Manage resources across departments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Resource Management</h3>
                <p className="text-muted-foreground mb-4">
                  Allocate and track resources for each department
                </p>
                <Button>Manage Resources</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}