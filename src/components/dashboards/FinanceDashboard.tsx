import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  CreditCard, 
  PiggyBank,
  FileText,
  AlertCircle
} from 'lucide-react';

export default function FinanceDashboard() {
  const financialStats = [
    { title: 'Total Revenue', value: '₹2,45,67,890', icon: DollarSign, trend: '+12.5%', positive: true },
    { title: 'Outstanding Fees', value: '₹45,23,100', icon: CreditCard, trend: '-8.2%', positive: true },
    { title: 'Monthly Expenses', value: '₹1,89,45,200', icon: TrendingDown, trend: '+5.1%', positive: false },
    { title: 'Budget Remaining', value: '₹67,89,340', icon: PiggyBank, trend: '-15.3%', positive: false }
  ];

  const pendingApprovals = [
    { type: 'Salary Payment', amount: '₹15,67,890', department: 'Teaching Staff', urgency: 'high' },
    { type: 'Infrastructure', amount: '₹2,45,000', description: 'Laboratory Equipment', urgency: 'medium' },
    { type: 'Scholarship', amount: '₹89,500', description: 'Merit Scholarships Q2', urgency: 'low' },
    { type: 'Maintenance', amount: '₹1,23,450', description: 'Building Repairs', urgency: 'medium' }
  ];

  const feeCollection = {
    target: 2500000,
    collected: 1875000,
    percentage: 75
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Financial Management</h1>
        <p className="text-muted-foreground">
          Financial oversight and budget management
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
            
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-lg font-bold text-green-700">892</div>
                <div className="text-xs text-green-600">Paid Students</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-lg font-bold text-red-700">158</div>
                <div className="text-xs text-red-600">Pending Payments</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Financial Approvals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Pending Approvals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingApprovals.map((approval, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{approval.type}</div>
                  <div className="text-sm text-muted-foreground">
                    {approval.department || approval.description}
                  </div>
                  <div className="text-sm font-semibold text-green-600">
                    {approval.amount}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={
                      approval.urgency === 'high' ? 'destructive' :
                      approval.urgency === 'medium' ? 'secondary' : 'outline'
                    }
                  >
                    {approval.urgency}
                  </Badge>
                  <Button size="sm" variant="outline">
                    Approve
                  </Button>
                </div>
              </div>
            ))}
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
              <span className="text-xs">Fee Management</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <Users className="h-6 w-6" />
              <span className="text-xs">Salary Processing</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <PiggyBank className="h-6 w-6" />
              <span className="text-xs">Budget Planning</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <TrendingUp className="h-6 w-6" />
              <span className="text-xs">Expense Tracking</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <FileText className="h-6 w-6" />
              <span className="text-xs">Financial Reports</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <DollarSign className="h-6 w-6" />
              <span className="text-xs">Audit Trail</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}