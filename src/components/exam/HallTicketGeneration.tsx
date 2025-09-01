import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Search, Filter, CheckCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

export const HallTicketGeneration = () => {
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [students] = useState([
    {
      id: 1,
      rollNo: 'ST001',
      name: 'John Smith',
      class: 'Class 10',
      section: 'A',
      examType: 'Mid Term',
      status: 'Generated',
      photo: '✓'
    },
    {
      id: 2,
      rollNo: 'ST002',
      name: 'Emma Johnson',
      class: 'Class 10',
      section: 'A',
      examType: 'Mid Term',
      status: 'Pending',
      photo: '✓'
    },
    {
      id: 3,
      rollNo: 'ST003',
      name: 'Michael Brown',
      class: 'Class 10',
      section: 'B',
      examType: 'Final',
      status: 'Generated',
      photo: '✗'
    }
  ]);

  const toggleStudentSelection = (studentId: number) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const selectAllStudents = () => {
    setSelectedStudents(students.map(s => s.id));
  };

  const clearSelection = () => {
    setSelectedStudents([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Hall Ticket Generation</h2>
          <p className="text-muted-foreground">Generate and manage student hall tickets</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
          <Button className="flex items-center gap-2" disabled={selectedStudents.length === 0}>
            <Download className="h-4 w-4" />
            Generate Selected ({selectedStudents.length})
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="searchStudent">Search Student</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="searchStudent" placeholder="Roll no, name..." className="pl-9" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Class</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="All classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  <SelectItem value="class-9">Class 9</SelectItem>
                  <SelectItem value="class-10">Class 10</SelectItem>
                  <SelectItem value="class-11">Class 11</SelectItem>
                  <SelectItem value="class-12">Class 12</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Exam Type</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="All exams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Exams</SelectItem>
                  <SelectItem value="mid-term">Mid Term</SelectItem>
                  <SelectItem value="final">Final Exam</SelectItem>
                  <SelectItem value="unit-test">Unit Test</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="All status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="generated">Generated</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="downloaded">Downloaded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selection Controls */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={selectAllStudents}>
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={clearSelection}>
            Clear Selection
          </Button>
          <span className="text-sm text-muted-foreground">
            {selectedStudents.length} of {students.length} selected
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Preview Template
          </Button>
          <Button size="sm" disabled={selectedStudents.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Bulk Download
          </Button>
        </div>
      </div>

      {/* Students Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox 
                  checked={selectedStudents.length === students.length}
                  onCheckedChange={() => 
                    selectedStudents.length === students.length ? clearSelection() : selectAllStudents()
                  }
                />
              </TableHead>
              <TableHead>Roll No</TableHead>
              <TableHead>Student Name</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Exam Type</TableHead>
              <TableHead>Photo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedStudents.includes(student.id)}
                    onCheckedChange={() => toggleStudentSelection(student.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">{student.rollNo}</TableCell>
                <TableCell>{student.name}</TableCell>
                <TableCell>{student.class}</TableCell>
                <TableCell>{student.section}</TableCell>
                <TableCell>{student.examType}</TableCell>
                <TableCell>
                  <Badge variant={student.photo === '✓' ? 'default' : 'destructive'}>
                    {student.photo === '✓' ? 'Available' : 'Missing'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={student.status === 'Generated' ? 'default' : 'secondary'}
                    className="flex items-center gap-1 w-fit"
                  >
                    {student.status === 'Generated' && <CheckCircle className="h-3 w-3" />}
                    {student.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {student.status === 'Generated' ? (
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button size="sm">
                        Generate
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Hall Ticket Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Hall Ticket Preview</CardTitle>
          <CardDescription>Preview of the hall ticket template</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Hall Ticket Template Preview</h3>
            <p className="text-muted-foreground mb-4">
              School Name, Student Details, Exam Schedule, Instructions, etc.
            </p>
            <Button variant="outline">
              Customize Template
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};