import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  PiggyBank,
  FileText,
  AlertCircle,
  Award,
  Receipt,
  Building,
  Globe
} from 'lucide-react';

export default function FinanceManagerDashboard() {
  const financialStats = [
    { title: 'Total Fee Collection', value: '₹3,45,67,890', icon: DollarSign, trend: '+18.5%', positive: true },
    { title: 'Outstanding Dues', value: '₹52,23,100', icon: AlertCircle, trend: '-12.3%', positive: true },
    { title: 'Monthly Payroll', value: '₹2,15,45,200', icon: Users, trend: '+3.2%', positive: false },
    { title: 'Scholarship Fund', value: '₹15,67,340', icon: Award, trend: '+25.1%', positive: true }
  ];

  const feeCollection = {
    target: 4000000,
    collected: 3456789,
    percentage: 86.4
  };

  const studentFeeStatus = [
    { student_id: 'ST001', name: 'Aarav Sharma', grade: 'Class 10', fee_due: '₹15,000', due_date: '2024-01-15', status: 'overdue' },
    { student_id: 'ST002', name: 'Priya Patel', grade: 'Class 8', fee_due: '₹12,000', due_date: '2024-01-20', status: 'pending' },
    { student_id: 'ST003', name: 'Arjun Kumar', grade: 'Class 12', fee_due: '₹18,000', due_date: '2024-01-25', status: 'reminder_sent' },
    { student_id: 'ST004', name: 'Sakshi Singh', grade: 'Class 9', fee_due: '₹14,000', due_date: '2024-01-30', status: 'paid' }
  ];

  const scholarships = [
    { type: 'Merit Scholarship', students: 25, amount: '₹2,50,000', criteria: 'Above 90%', status: 'active' },
    { type: 'Need-based Aid', students: 18, amount: '₹1,80,000', criteria: 'Family Income < 2L', status: 'active' },
    { type: 'Sports Excellence', students: 12, amount: '₹1,20,000', criteria: 'State Level', status: 'processing' },
    { type: 'Cultural Arts', students: 8, amount: '₹80,000', criteria: 'Competition Winners', status: 'active' }
  ];

  const payrollData = [
    { department: 'Teaching Staff', employees: 45, amount: '₹18,50,000', status: 'processed', type: 'salary' },
    { department: 'Administrative', employees: 12, amount: '₹4,20,000', status: 'processed', type: 'salary' },
    { department: 'Support Staff', employees: 28, amount: '₹6,80,000', status: 'pending', type: 'salary' },
    { department: 'Part-time Faculty', employees: 8, amount: '₹2,40,000', status: 'processing', type: 'hourly' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Finance Management Hub</h1>
        <p className="text-muted-foreground">
          Comprehensive financial oversight and fee management
        </p>
      </div>

      {/* Financial Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {financialStats.map((stat) => {
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
                <p className={`text-xs flex items-center gap-1 ${
                  stat.positive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {stat.trend} from last month
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Fee Collection Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Fee Collection Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Target: ₹{(feeCollection.target / 100000).toFixed(1)}L</span>
                <span>Collected: ₹{(feeCollection.collected / 100000).toFixed(1)}L</span>
              </div>
              <Progress value={feeCollection.percentage} className="h-3" />
              <p className="text-xs text-muted-foreground">
                {feeCollection.percentage}% of annual target achieved
              </p>
            </div>
            
            <div className="grid grid-cols-3 gap-3 pt-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-lg font-bold text-green-700">1,245</div>
                <div className="text-xs text-green-600">Paid Students</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-lg font-bold text-yellow-700">89</div>
                <div className="text-xs text-yellow-600">Pending</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-lg font-bold text-red-700">34</div>
                <div className="text-xs text-red-600">Overdue</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Online Payment Gateway Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Online Payment Gateway
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">₹8.2L</div>
                <div className="text-xs text-muted-foreground">Online Payments Today</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">98.5%</div>
                <div className="text-xs text-muted-foreground">Success Rate</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>UPI</span>
                <span>45%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Card Payment</span>
                <span>35%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Net Banking</span>
                <span>20%</span>
              </div>
            </div>
            
            <Button className="w-full">
              Payment Gateway Settings
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Student Fee Status & Dues */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Student Fee Status & Reminders
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {studentFeeStatus.map((student, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{student.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {student.student_id} • {student.grade}
                  </div>
                  <div className="text-sm font-semibold text-red-600">
                    Due: {student.fee_due} by {student.due_date}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={
                      student.status === 'paid' ? 'default' :
                      student.status === 'overdue' ? 'destructive' :
                      student.status === 'reminder_sent' ? 'secondary' : 'outline'
                    }
                  >
                    {student.status.replace('_', ' ')}
                  </Badge>
                  {student.status !== 'paid' && (
                    <Button size="sm" variant="outline">
                      Send Reminder
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Scholarships & Concessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Scholarships & Concessions Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {scholarships.map((scholarship, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{scholarship.type}</div>
                  <div className="text-sm text-muted-foreground">
                    {scholarship.students} students • {scholarship.amount}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Criteria: {scholarship.criteria}
                  </div>
                </div>
                <Badge 
                  variant={scholarship.status === 'active' ? 'default' : 'secondary'}
                  className="capitalize"
                >
                  {scholarship.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Payroll Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Payroll Management (Teachers & Staff)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {payrollData.map((dept, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{dept.department}</div>
                  <div className="text-sm text-muted-foreground">
                    {dept.employees} employees • {dept.amount}
                  </div>
                  <div className="text-xs text-muted-foreground capitalize">
                    Payment type: {dept.type}
                  </div>
                </div>
                <Badge 
                  variant={
                    dept.status === 'processed' ? 'default' :
                    dept.status === 'processing' ? 'secondary' : 'outline'
                  }
                  className="capitalize"
                >
                  {dept.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Budget Planning & Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PiggyBank className="h-5 w-5" />
              Budget Planning & Audit Reports
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-xl font-bold text-green-600">₹45.2L</div>
                <div className="text-xs text-muted-foreground">Monthly Income</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-xl font-bold text-red-600">₹38.7L</div>
                <div className="text-xs text-muted-foreground">Monthly Expenses</div>
              </div>
            </div>
            
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Receipt className="h-4 w-4 mr-2" />
                Generate Receipt
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                Financial Report
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Building className="h-4 w-4 mr-2" />
                Audit Export
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Operations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <CreditCard className="h-6 w-6" />
              <span className="text-xs">Fee Collection</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <Globe className="h-6 w-6" />
              <span className="text-xs">Payment Gateway</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <Award className="h-6 w-6" />
              <span className="text-xs">Scholarships</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <Users className="h-6 w-6" />
              <span className="text-xs">Payroll</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <PiggyBank className="h-6 w-6" />
              <span className="text-xs">Budget Planning</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <FileText className="h-6 w-6" />
              <span className="text-xs">Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}