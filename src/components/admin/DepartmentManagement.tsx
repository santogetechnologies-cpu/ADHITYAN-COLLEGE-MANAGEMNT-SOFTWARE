import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Building, Clock, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Department {
  id: string;
  name: string;
  sections: Section[];
  duration: number; // in years
}

interface Section {
  id: string;
  name: string;
  capacity: number;
  currentStudents: number;
  assignedTeacher?: string;
}

export default function DepartmentManagement() {
  const { toast } = useToast();
  const [departments, setDepartments] = useState<Department[]>([
    {
      id: '1',
      name: 'Computer Science',
      duration: 4,
      sections: [
        { id: '1', name: 'A', capacity: 60, currentStudents: 45, assignedTeacher: 'Dr. Michael Rodriguez' },
        { id: '2', name: 'B', capacity: 60, currentStudents: 52 }
      ]
    },
    {
      id: '2',
      name: 'Mathematics',
      duration: 3,
      sections: [
        { id: '3', name: 'A', capacity: 40, currentStudents: 35 }
      ]
    }
  ]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [newDepartment, setNewDepartment] = useState({
    name: '',
    duration: 1,
    sectionsCount: 1
  });

  const teachers = [
    'Dr. Michael Rodriguez',
    'Prof. Sarah Johnson',
    'Dr. Robert Singh',
    'Ms. Jennifer Davis'
  ];

  const createDepartment = () => {
    if (!newDepartment.name.trim()) return;

    const sections: Section[] = [];
    for (let i = 0; i < newDepartment.sectionsCount; i++) {
      sections.push({
        id: Date.now() + i + '',
        name: String.fromCharCode(65 + i), // A, B, C, etc.
        capacity: 50,
        currentStudents: 0
      });
    }

    const department: Department = {
      id: Date.now() + '',
      name: newDepartment.name,
      duration: newDepartment.duration,
      sections
    };

    setDepartments([...departments, department]);
    setNewDepartment({ name: '', duration: 1, sectionsCount: 1 });
    setIsCreateOpen(false);
    toast({
      title: "Department Created",
      description: `${department.name} department has been created successfully.`
    });
  };

  const assignTeacher = (deptId: string, sectionId: string, teacher: string) => {
    setDepartments(departments.map(dept => 
      dept.id === deptId 
        ? {
            ...dept,
            sections: dept.sections.map(section =>
              section.id === sectionId
                ? { ...section, assignedTeacher: teacher }
                : section
            )
          }
        : dept
    ));
    toast({
      title: "Teacher Assigned",
      description: `${teacher} has been assigned successfully.`
    });
  };

  const deleteDepartment = (deptId: string) => {
    setDepartments(departments.filter(dept => dept.id !== deptId));
    toast({
      title: "Department Deleted",
      description: "Department has been removed successfully."
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Department & Section Management</h1>
          <p className="text-muted-foreground">Manage departments, sections, and teacher assignments</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Department
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Department</DialogTitle>
              <DialogDescription>
                Add a new department with sections and duration
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="dept-name">Department Name</Label>
                <Input
                  id="dept-name"
                  value={newDepartment.name}
                  onChange={(e) => setNewDepartment({...newDepartment, name: e.target.value})}
                  placeholder="e.g., Computer Science"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="duration">Duration (Years)</Label>
                  <Select 
                    value={newDepartment.duration.toString()} 
                    onValueChange={(value) => setNewDepartment({...newDepartment, duration: parseInt(value)})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5,6].map(year => (
                        <SelectItem key={year} value={year.toString()}>{year} Year{year > 1 ? 's' : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="sections">Number of Sections</Label>
                  <Select 
                    value={newDepartment.sectionsCount.toString()} 
                    onValueChange={(value) => setNewDepartment({...newDepartment, sectionsCount: parseInt(value)})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({length: 25}, (_, i) => i + 1).map(count => (
                        <SelectItem key={count} value={count.toString()}>{count} Section{count > 1 ? 's' : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={createDepartment} className="w-full">
                Create Department
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {departments.map((department) => (
          <Card key={department.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Building className="w-6 h-6 text-primary" />
                  <div>
                    <CardTitle className="text-xl">{department.name}</CardTitle>
                    <CardDescription className="flex items-center space-x-4">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{department.duration} Year{department.duration > 1 ? 's' : ''}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Users className="w-4 h-4" />
                        <span>{department.sections.length} Section{department.sections.length > 1 ? 's' : ''}</span>
                      </span>
                    </CardDescription>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => deleteDepartment(department.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <h4 className="font-medium">Sections</h4>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {department.sections.map((section) => (
                    <div key={section.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">Section {section.name}</div>
                        <Badge variant="secondary">
                          {section.currentStudents}/{section.capacity}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Assigned Teacher</Label>
                        <Select 
                          value={section.assignedTeacher || ''} 
                          onValueChange={(teacher) => assignTeacher(department.id, section.id, teacher)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Select teacher" />
                          </SelectTrigger>
                          <SelectContent>
                            {teachers.map(teacher => (
                              <SelectItem key={teacher} value={teacher}>{teacher}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}