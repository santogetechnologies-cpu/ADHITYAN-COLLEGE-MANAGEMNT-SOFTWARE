import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MiscExpensesModule } from '@/components/finance/MiscExpensesModule';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  PiggyBank,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  Receipt,
  Calculator,
  Banknote,
  Target,
  Calendar,
  BarChart3,
  Download
} from 'lucide-react';

export default function AccountsOfficerDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');

  const financialStats = [
    { 
      title: 'Total Revenue', 
      value: '₹2,45,67,890', 
      icon: DollarSign, 
      trend: '+12.5%', 
      positive: true,
      description: 'This month'
    },
    { 
      title: 'Outstanding Fees', 
      value: '₹45,23,100', 
      icon: CreditCard, 
      trend: '-8.2%', 
      positive: true,
      description: 'Pending collection'
    },
    { 
      title: 'Monthly Expenses', 
      value: '₹1,89,45,200', 
      icon: TrendingDown, 
      trend: '+5.1%', 
      positive: false,
      description: 'Total expenditure'
    },
    { 
      title: 'Budget Remaining', 
      value: '₹67,89,340', 
      icon: PiggyBank, 
      trend: '-15.3%', 
      positive: false,
      description: 'Available funds'
    }
  ];

  const feeCollectionData = [
    {
      class: 'Grade 1-3',
      totalStudents: 450,
      feesCollected: 380,
      pending: 70,
      amount: 2850000,
      percentage: 84.4
    },
    {
      class: 'Grade 4-6',
      totalStudents: 420,
      feesCollected: 365,
      pending: 55,
      amount: 3285000,
      percentage: 86.9
    },
    {
      class: 'Grade 7-9',
      totalStudents: 380,
      feesCollected: 325,
      pending: 55,
      amount: 3575000,
      percentage: 85.5
    },
    {
      class: 'Grade 10-12',
      totalStudents: 320,
      feesCollected: 285,
      pending: 35,
      amount: 4275000,
      percentage: 89.1
    }
  ];

  const expenseCategories = [
    { category: 'Salaries & Benefits', budgeted: 8500000, spent: 7200000, percentage: 84.7 },
    { category: 'Infrastructure', budgeted: 2500000, spent: 1800000, percentage: 72.0 },
    { category: 'Academic Resources', budgeted: 1500000, spent: 1200000, percentage: 80.0 },
    { category: 'Utilities', budgeted: 800000, spent: 650000, percentage: 81.25 },
    { category: 'Maintenance', budgeted: 600000, spent: 420000, percentage: 70.0 },
    { category: 'Miscellaneous', budgeted: 400000, spent: 280000, percentage: 70.0 }
  ];

  const pendingApprovals = [
    {
      id: 'PA001',
      type: 'Purchase Order',
      department: 'Science Lab',
      amount: 45000,
      requestedBy: 'Dr. Smith',
      date: '2024-01-15',
      priority: 'high'
    },
    {
      id: 'PA002',
      type: 'Travel Expense',
      department: 'Faculty',
      amount: 12000,
      requestedBy: 'Prof. Johnson',
      date: '2024-01-14',
      priority: 'medium'
    },
    {
      id: 'PA003',
      type: 'Event Budget',
      department: 'Student Affairs',
      amount: 25000,
      requestedBy: 'Event Committee',
      date: '2024-01-13',
      priority: 'medium'
    },
    {
      id: 'PA004',
      type: 'Maintenance',
      department: 'Infrastructure',
      amount: 8000,
      requestedBy: 'Maintenance Head',
      date: '2024-01-12',
      priority: 'low'
    }
  ];

  const recentTransactions = [
    {
      id: 'TXN001',
      type: 'Fee Payment',
      description: 'Term Fee - Grade 10A',
      amount: 15000,
      mode: 'Online',
      status: 'completed',
      date: '2024-01-15'
    },
    {
      id: 'TXN002',
      type: 'Expense Payment',
      description: 'Electricity Bill',
      amount: -12000,
      mode: 'Bank Transfer',
      status: 'completed',
      date: '2024-01-15'
    },
    {
      id: 'TXN003',
      type: 'Salary Payment',
      description: 'Staff Salaries - January',
      amount: -650000,
      mode: 'Bank Transfer',
      status: 'completed',
      date: '2024-01-14'
    },
    {
      id: 'TXN004',
      type: 'Fee Payment',
      description: 'Transport Fee - Multiple',
      amount: 25000,
      mode: 'Cash',
      status: 'completed',
      date: '2024-01-14'
    }
  ];

  const taxOverview = [
    { type: 'GST Collected', amount: 125000, status: 'pending', dueDate: '2024-01-31' },
    { type: 'TDS Deducted', amount: 45000, status: 'filed', dueDate: '2024-01-15' },
    { type: 'Professional Tax', amount: 8000, status: 'paid', dueDate: '2024-01-10' },
    { type: 'Income Tax', amount: 75000, status: 'pending', dueDate: '2024-02-15' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Accounts Officer Dashboard</h1>
        <p className="text-muted-foreground">
          Complete financial management and accounting system
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
                <p className={`text-xs ${stat.positive ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.trend} {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="fees">Fee Collection</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="misc">Miscellaneous</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="tax">Tax & GST</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Budget vs Actual */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Budget vs Actual Expenses
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {expenseCategories.map((expense, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{expense.category}</span>
                      <span className="text-sm text-muted-foreground">
                        {expense.percentage.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={expense.percentage} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Spent: ₹{(expense.spent / 100000).toFixed(1)}L</span>
                      <span>Budget: ₹{(expense.budgeted / 100000).toFixed(1)}L</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Recent Transactions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{transaction.description}</div>
                      <div className="text-xs text-muted-foreground">
                        {transaction.type} • {transaction.mode} • {transaction.date}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-medium ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.amount > 0 ? '+' : ''}₹{Math.abs(transaction.amount).toLocaleString()}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Fee Collection Tab */}
        <TabsContent value="fees" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Fee Collection Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {feeCollectionData.map((classData, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">{classData.class}</h3>
                    <Badge className="bg-green-100 text-green-800">
                      {classData.percentage.toFixed(1)}% collected
                    </Badge>
                  </div>
                  <div className="grid gap-2 md:grid-cols-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total Students:</span>
                      <div className="font-medium">{classData.totalStudents}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Fees Collected:</span>
                      <div className="font-medium text-green-600">{classData.feesCollected}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Pending:</span>
                      <div className="font-medium text-red-600">{classData.pending}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Amount:</span>
                      <div className="font-medium">₹{(classData.amount / 100000).toFixed(1)}L</div>
                    </div>
                  </div>
                  <Progress value={classData.percentage} className="h-2 mt-3" />
                </div>
              ))}
              
              <div className="grid gap-4 md:grid-cols-3">
                <Button className="gap-2">
                  <Download className="h-4 w-4" />
                  Defaulters List
                </Button>
                <Button variant="outline" className="gap-2">
                  <Receipt className="h-4 w-4" />
                  Fee Receipts
                </Button>
                <Button variant="outline" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Collection Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Salary Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Process staff salaries and benefits
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>This Month:</span>
                    <span className="font-medium">₹72,00,000</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Pending:</span>
                    <span className="text-red-600">₹8,50,000</span>
                  </div>
                </div>
                <Button className="w-full mt-4 gap-2">
                  <Banknote className="h-4 w-4" />
                  Process Salaries
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Vendor Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Manage supplier and vendor payments
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Pending Bills:</span>
                    <span className="font-medium">23</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Amount:</span>
                    <span className="text-red-600">₹3,45,000</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full mt-4 gap-2">
                  <CreditCard className="h-4 w-4" />
                  View Payments
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Budget Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Monitor budget allocation and usage
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Budget:</span>
                    <span className="font-medium">₹1.5Cr</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Utilized:</span>
                    <span className="text-blue-600">78.5%</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full mt-4 gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Budget Report
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Miscellaneous Expenses Tab */}
        <TabsContent value="misc" className="space-y-4">
          <MiscExpensesModule />
        </TabsContent>

        {/* Approvals Tab */}
        <TabsContent value="approvals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Pending Approvals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingApprovals.map((approval) => (
                <div key={approval.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{approval.type}</span>
                      <Badge 
                        variant={
                          approval.priority === 'high' ? 'destructive' : 
                          approval.priority === 'medium' ? 'secondary' : 'outline'
                        }
                      >
                        {approval.priority}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {approval.department} • Requested by {approval.requestedBy}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Date: {approval.date}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">₹{approval.amount.toLocaleString()}</div>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Approve
                      </Button>
                      <Button size="sm" variant="outline">
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tax & GST Tab */}
        <TabsContent value="tax" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Tax & GST Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {taxOverview.map((tax, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{tax.type}</div>
                    <div className="text-sm text-muted-foreground">
                      Due Date: {tax.dueDate}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">₹{tax.amount.toLocaleString()}</div>
                    <Badge 
                      className={
                        tax.status === 'paid' ? 'bg-green-100 text-green-800' :
                        tax.status === 'filed' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }
                    >
                      {tax.status}
                    </Badge>
                  </div>
                </div>
              ))}
              
              <div className="grid gap-4 md:grid-cols-2">
                <Button className="gap-2">
                  <Calculator className="h-4 w-4" />
                  GST Calculator
                </Button>
                <Button variant="outline" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Tax Reports
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Financial Statement</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Comprehensive financial report
                </p>
                <Button className="w-full gap-2">
                  <FileText className="h-4 w-4" />
                  Generate Report
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cash Flow Report</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Track cash inflows and outflows
                </p>
                <Button className="w-full gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Generate Report
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Budget Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Budget vs actual analysis
                </p>
                <Button className="w-full gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Generate Report
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Fee Collection Report</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Detailed fee collection analysis
                </p>
                <Button className="w-full gap-2">
                  <Users className="h-4 w-4" />
                  Generate Report
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tax Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Tax obligations and payments
                </p>
                <Button className="w-full gap-2">
                  <Calculator className="h-4 w-4" />
                  Generate Report
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Audit Trail</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  All financial transactions log
                </p>
                <Button className="w-full gap-2">
                  <FileText className="h-4 w-4" />
                  Generate Report
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}