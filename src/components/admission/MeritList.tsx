import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award } from 'lucide-react';

export const MeritList = () => {
  const meritList = [
    { rank: 1, name: 'Emma Johnson', score: 95, class: 'Class 11', status: 'Selected' },
    { rank: 2, name: 'John Smith', score: 92, class: 'Class 11', status: 'Selected' },
    { rank: 3, name: 'Michael Brown', score: 89, class: 'Class 11', status: 'Waitlist' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Merit List & Seat Allocation</h2>
        <p className="text-muted-foreground">View merit lists and manage seat allocation</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <Trophy className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">150</p>
            <p className="text-sm text-muted-foreground">Total Applicants</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Medal className="h-8 w-8 mx-auto text-success mb-2" />
            <p className="text-2xl font-bold">100</p>
            <p className="text-sm text-muted-foreground">Selected</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Award className="h-8 w-8 mx-auto text-warning mb-2" />
            <p className="text-2xl font-bold">25</p>
            <p className="text-sm text-muted-foreground">Waitlisted</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Merit List - Class 11 Science</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Student Name</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Applied For</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {meritList.map((student) => (
                <TableRow key={student.rank}>
                  <TableCell className="font-bold">#{student.rank}</TableCell>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>{student.score}/100</TableCell>
                  <TableCell>{student.class}</TableCell>
                  <TableCell>
                    <Badge variant={student.status === 'Selected' ? 'default' : 'secondary'}>
                      {student.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};