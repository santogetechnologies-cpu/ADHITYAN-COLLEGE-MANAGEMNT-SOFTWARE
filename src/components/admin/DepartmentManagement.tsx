import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Building, Clock, Users, BookOpen, GraduationCap, CheckCircle, Search, X } from 'lucide-react';
import { OFFICIAL_COURSES } from '@/constants/courses';
import {
  useDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
  useTeachers,
} from '@/hooks/queries/useDepartments';
import { DataState } from '@/components/shared/DataState';
import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog';
import { useZodForm, z } from '@/lib/forms';
import { createMutationToast } from '@/lib/mutationToast';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const createDepartmentSchema = z.object({
  name: z.string().trim().min(3, 'Course name must be at least 3 characters'),
  duration: z.coerce.number().int().min(1, 'Duration must be at least 1 year').max(6, 'Max duration is 6 years'),
  code: z.string().trim().optional(),
  sectionsCount: z.coerce.number().int().min(1).max(10).default(1),
});

type CreateDepartmentFormData = z.infer<typeof createDepartmentSchema>;

const editDepartmentSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(3, 'Course name must be at least 3 characters'),
  duration: z.coerce.number().int().min(1).max(6),
  code: z.string().trim().optional(),
});

type EditDepartmentFormData = z.infer<typeof editDepartmentSchema>;

export default function DepartmentManagement() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState<{ id: string; name: string } | null>(null);

  // TanStack Queries
  const {
    data: departments = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useDepartments(searchTerm);

  const { data: teachers = [] } = useTeachers();

  // TanStack Mutations with standardized toast feedback
  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();
  const deleteMutation = useDeleteDepartment();

  // Zod + React Hook Form
  const createForm = useZodForm(createDepartmentSchema, {
    defaultValues: {
      name: '',
      duration: 3,
      code: '',
      sectionsCount: 1,
    },
  });

  const editForm = useZodForm(editDepartmentSchema, {
    defaultValues: {
      id: '',
      name: '',
      duration: 3,
      code: '',
    },
  });

  // Create submission
  const handleCreateSubmit = createForm.handleSubmit(async (values: CreateDepartmentFormData) => {
    createMutation.mutate(values, {
      ...createMutationToast({
        successTitle: 'Department Initialized',
        successDescription: () => `"${values.name}" registered successfully with active sections.`,
        errorTitle: 'Creation Blocked',
      }),
      onSuccess: () => {
        setIsCreateOpen(false);
        createForm.reset({ name: '', duration: 3, code: '', sectionsCount: 1 });
      },
    });
  });

  // Edit submission
  const handleEditSubmit = editForm.handleSubmit(async (values: EditDepartmentFormData) => {
    updateMutation.mutate(
      {
        id: values.id,
        input: {
          name: values.name,
          duration: values.duration,
          code: values.code,
        },
      },
      {
        ...createMutationToast({
          successTitle: 'Department Updated',
          successDescription: () => `Changes to "${values.name}" saved to the database.`,
          errorTitle: 'Update Blocked',
        }),
        onSuccess: () => {
          setIsEditOpen(false);
        },
      }
    );
  });

  // Delete submission
  const handleConfirmDelete = () => {
    if (!departmentToDelete) return;
    deleteMutation.mutate(departmentToDelete.id, {
      ...createMutationToast({
        successTitle: 'Department Removed',
        successDescription: () => `"${departmentToDelete.name}" and associated sections removed.`,
        errorTitle: 'Delete Blocked',
      }),
      onSettled: () => {
        setDepartmentToDelete(null);
      },
    });
  };

  // Section teacher assignment handler
  const assignTeacher = async (sectionId: string, teacherName: string) => {
    try {
      const { error: assignError } = await supabase
        .from('sections')
        .update({ assigned_teacher_name: teacherName })
        .eq('id', sectionId);

      if (assignError) throw assignError;

      toast({
        title: 'Faculty Assigned',
        description: `${teacherName} assigned to section.`,
      });
      refetch();
    } catch (err: any) {
      toast({
        title: 'Assignment Failed',
        description: err.message || 'Unable to update faculty assignment',
        variant: 'destructive',
      });
    }
  };

  const totalSections = departments.reduce((sum, d) => sum + d.sections.length, 0);
  const assignedCount = departments.reduce((sum, d) => sum + d.sections.filter(s => !!s.assignedTeacher).length, 0);

  return (
    <div className="space-y-6 min-w-0 max-w-full">
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Department & Course Management</h1>
          <p className="text-muted-foreground text-sm">
            Manage the college's 9 official vocational programs, academic sections, and clinical faculty
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Department / Course
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Academic Program / Department</DialogTitle>
              <DialogDescription>
                Select from official college programs or configure a specialized track
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
              <div className="space-y-1">
                <Label>Quick Select From Official College Courses</Label>
                <Select
                  onValueChange={(courseName) => {
                    const match = OFFICIAL_COURSES.find(c => c.name === courseName);
                    if (match) {
                      createForm.setValue('name', match.name);
                      createForm.setValue('duration', match.durationYears);
                      createForm.setValue('code', match.code);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select official curriculum course..." />
                  </SelectTrigger>
                  <SelectContent>
                    {OFFICIAL_COURSES.map(c => (
                      <SelectItem key={c.id} value={c.name}>
                        {c.name} ({c.durationYears} {c.durationYears > 1 ? 'Years' : 'Year'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="create-name">Program / Department Name *</Label>
                <Input
                  id="create-name"
                  placeholder="e.g. B.VOC Medical Lab Technology (MLT)"
                  {...createForm.register('name')}
                />
                {createForm.formState.errors.name && (
                  <p className="text-xs text-destructive">{createForm.formState.errors.name.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="create-duration">Duration (Years)</Label>
                  <Select 
                    value={createForm.watch('duration').toString()} 
                    onValueChange={(value) => createForm.setValue('duration', parseInt(value))}
                  >
                    <SelectTrigger id="create-duration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6].map(year => (
                        <SelectItem key={year} value={year.toString()}>{year} Year{year > 1 ? 's' : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="create-sections">Initial Sections</Label>
                  <Select 
                    value={createForm.watch('sectionsCount').toString()} 
                    onValueChange={(value) => createForm.setValue('sectionsCount', parseInt(value))}
                  >
                    <SelectTrigger id="create-sections">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 6 }, (_, i) => i + 1).map(count => (
                        <SelectItem key={count} value={count.toString()}>{count} Section{count > 1 ? 's' : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button type="submit" disabled={createMutation.isPending} className="w-full mt-2">
                {createMutation.isPending ? 'Saving to Database...' : 'Save & Initialize Department'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Metrics Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Registered Programs</p>
              <p className="text-2xl font-bold">{isLoading ? '…' : departments.length}</p>
            </div>
            <GraduationCap className="w-8 h-8 text-primary opacity-80" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Active Sections</p>
              <p className="text-2xl font-bold">{isLoading ? '…' : totalSections}</p>
            </div>
            <BookOpen className="w-8 h-8 text-blue-600 opacity-80" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Assigned Faculty</p>
              <p className="text-2xl font-bold">{isLoading ? '…' : assignedCount}</p>
            </div>
            <Users className="w-8 h-8 text-green-600 opacity-80" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Supabase Persistence</p>
              <div className="flex items-center gap-1 mt-1 text-green-600 font-semibold text-sm">
                <CheckCircle className="w-4 h-4" /> Real DB
              </div>
            </div>
            <Building className="w-8 h-8 text-indigo-600 opacity-80" />
          </CardContent>
        </Card>
      </div>

      {/* Search Filter Bar */}
      <div className="flex items-center gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search programs and departments..."
            className="pl-9 pr-8"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Standardized DataState Wrapper */}
      <DataState
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={departments.length === 0}
        onRetry={() => refetch()}
        emptyTitle={searchTerm ? 'No matching departments' : 'No departments configured'}
        emptyDescription={searchTerm ? `No courses matching "${searchTerm}" were found in the database.` : 'Click "Add Department" to register college programs.'}
        emptyAction={{
          label: 'Add Department',
          onClick: () => setIsCreateOpen(true),
        }}
      >
        <div className="grid gap-6">
          {departments.map((department) => (
            <Card key={department.id} className="shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Building className="w-6 h-6 text-primary" />
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{department.name}</CardTitle>
                        {department.code && (
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {department.code}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="flex items-center space-x-4 mt-1">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{department.duration} Year{department.duration > 1 ? 's' : ''}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Users className="w-3.5 h-3.5" />
                          <span>{department.sections.length} Section{department.sections.length > 1 ? 's' : ''}</span>
                        </span>
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        editForm.reset({
                          id: department.id,
                          name: department.name,
                          duration: department.duration,
                          code: department.code || '',
                        });
                        setIsEditOpen(true);
                      }}
                      title="Edit Department"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setDepartmentToDelete({ id: department.id, name: department.name })}
                      title="Delete Department"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <h4 className="font-medium text-xs text-muted-foreground uppercase tracking-wider">Sections & Faculty</h4>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {department.sections.map((section) => (
                      <div key={section.id} className="border rounded-lg p-3.5 space-y-2.5 bg-card text-xs">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-sm">{section.name}</div>
                          <Badge variant="secondary" className="text-[10px]">
                            {section.currentStudents}/{section.capacity} Students
                          </Badge>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[11px] text-muted-foreground">Assigned Teacher</Label>
                          <Select 
                            value={section.assignedTeacher || ''} 
                            onValueChange={(teacherName) => assignTeacher(section.id, teacherName)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select teacher..." />
                            </SelectTrigger>
                            <SelectContent>
                              {teachers.map(teacher => (
                                <SelectItem key={teacher.id} value={teacher.name}>{teacher.name}</SelectItem>
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
      </DataState>

      {/* Edit Department Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Department Details</DialogTitle>
            <DialogDescription>
              Update course name and institutional program duration
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="edit-name">Department Name *</Label>
              <Input
                id="edit-name"
                {...editForm.register('name')}
              />
              {editForm.formState.errors.name && (
                <p className="text-xs text-destructive">{editForm.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-duration">Duration (Years)</Label>
              <Select 
                value={editForm.watch('duration').toString()} 
                onValueChange={(value) => editForm.setValue('duration', parseInt(value))}
              >
                <SelectTrigger id="edit-duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map(year => (
                    <SelectItem key={year} value={year.toString()}>{year} Year{year > 1 ? 's' : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={updateMutation.isPending} className="w-full">
              {updateMutation.isPending ? 'Saving Changes...' : 'Save Changes'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Standardized Confirm Delete Dialog */}
      <ConfirmDeleteDialog
        open={Boolean(departmentToDelete)}
        onOpenChange={(open) => !open && setDepartmentToDelete(null)}
        itemName={departmentToDelete?.name}
        isDeleting={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
