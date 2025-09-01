import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  UserPlus, 
  Users, 
  Search, 
  GraduationCap, 
  User, 
  Car,
  Download,
  Upload,
  Filter
} from 'lucide-react';

export default function UserManagement() {
  const userStats = [
    { title: 'Total Users', value: '2,156', icon: Users, type: 'All Users' },
    { title: 'Students', value: '1,247', icon: GraduationCap, type: 'Active Students' },
    { title: 'Teachers', value: '89', icon: User, type: 'Teaching Staff' },
    { title: 'Parents', value: '812', icon: Users, type: 'Parent Accounts' }
  ];

  const quickCreateOptions = [
    { 
      title: 'Create Student', 
      icon: GraduationCap, 
      description: 'Add new student with parent linking',
      action: 'create-student',
      color: 'bg-blue-50 hover:bg-blue-100 border-blue-200'
    },
    { 
      title: 'Create Teacher', 
      icon: User, 
      description: 'Add teaching staff with subject assignment',
      action: 'create-teacher',
      color: 'bg-green-50 hover:bg-green-100 border-green-200'
    },
    { 
      title: 'Create Parent', 
      icon: Users, 
      description: 'Add parent account and link to students',
      action: 'create-parent',
      color: 'bg-purple-50 hover:bg-purple-100 border-purple-200'
    },
    { 
      title: 'Create Driver', 
      icon: Car, 
      description: 'Add driver with vehicle assignment',
      action: 'create-driver',
      color: 'bg-orange-50 hover:bg-orange-100 border-orange-200'
    },
    { 
      title: 'Create Staff', 
      icon: User, 
      description: 'Add non-teaching staff members',
      action: 'create-staff',
      color: 'bg-gray-50 hover:bg-gray-100 border-gray-200'
    },
    { 
      title: 'Bulk Import', 
      icon: Upload, 
      description: 'Import multiple users via CSV',
      action: 'bulk-import',
      color: 'bg-red-50 hover:bg-red-100 border-red-200'
    }
  ];

  const recentUsers = [
    { name: 'Arjun Patel', role: 'student', class: 'Class 10A', email: 'arjun.patel@school.edu', status: 'active' },
    { name: 'Mrs. Priya Sharma', role: 'teacher', department: 'Mathematics', email: 'priya.sharma@school.edu', status: 'active' },
    { name: 'Rakesh Kumar', role: 'driver', vehicle: 'Bus-001', email: 'rakesh.kumar@school.edu', status: 'active' },
    { name: 'Sita Devi', role: 'parent', children: '2 Students', email: 'sita.devi@gmail.com', status: 'pending' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">
          Create and manage user accounts for all stakeholders
        </p>
      </div>

      {/* User Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {userStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.type}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Create Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Quick Create Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {quickCreateOptions.map((option) => {
              const Icon = option.icon;
              return (
                <Card key={option.title} className={`cursor-pointer transition-colors ${option.color}`}>
                  <CardContent className="p-4 text-center">
                    <Icon className="h-8 w-8 mx-auto mb-3 text-primary" />
                    <h3 className="font-medium mb-2">{option.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {option.description}
                    </p>
                    <Button size="sm" variant="outline" className="w-full">
                      Create Now
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Users */}
        <Card>
          <CardHeader>
            <CardTitle>Recently Added Users</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentUsers.map((user, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{user.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {user.class || user.department || user.vehicle || user.children}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {user.email}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {user.role}
                  </Badge>
                  <Badge 
                    variant={user.status === 'active' ? 'default' : 'secondary'}
                    className="capitalize"
                  >
                    {user.status}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* User Management Tools */}
        <Card>
          <CardHeader>
            <CardTitle>Management Tools</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input placeholder="Search users..." className="flex-1" />
              <Button variant="outline" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Filter className="h-4 w-4" />
                Advanced Filters
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2">
                <Download className="h-4 w-4" />
                Export User List
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2">
                <Upload className="h-4 w-4" />
                Bulk Operations
              </Button>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">Bulk Actions</h4>
              <div className="space-y-2">
                <Button variant="destructive" size="sm" className="w-full">
                  Deactivate Selected
                </Button>
                <Button variant="secondary" size="sm" className="w-full">
                  Send Welcome Emails
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}