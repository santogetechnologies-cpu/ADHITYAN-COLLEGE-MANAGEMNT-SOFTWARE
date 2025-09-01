import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  Plus,
  Receipt,
  Coffee,
  Car,
  Zap,
  Wrench,
  PartyPopper,
  AlertCircle,
  CreditCard,
  Calendar as CalendarIcon,
  Download,
  Filter,
  Search,
  DollarSign
} from 'lucide-react';

export function MiscExpensesModule() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [date, setDate] = useState<Date>();
  const [searchTerm, setSearchTerm] = useState('');

  const expenseCategories = [
    { id: 'office_supplies', name: 'Office Supplies', icon: Coffee, color: 'bg-blue-100 text-blue-800' },
    { id: 'utilities', name: 'Utilities', icon: Zap, color: 'bg-green-100 text-green-800' },
    { id: 'maintenance', name: 'Maintenance', icon: Wrench, color: 'bg-orange-100 text-orange-800' },
    { id: 'travel', name: 'Travel & Transport', icon: Car, color: 'bg-purple-100 text-purple-800' },
    { id: 'events', name: 'Events & Celebrations', icon: PartyPopper, color: 'bg-pink-100 text-pink-800' },
    { id: 'emergency', name: 'Emergency Expenses', icon: AlertCircle, color: 'bg-red-100 text-red-800' },
    { id: 'petty_cash', name: 'Petty Cash', icon: CreditCard, color: 'bg-yellow-100 text-yellow-800' }
  ];

  const recentExpenses = [
    {
      id: 'EXP001',
      category: 'office_supplies',
      description: 'Office stationery and supplies',
      amount: 2500,
      date: '2024-01-15',
      vendor: 'Office Mart',
      status: 'approved',
      receipt: 'RCP001.pdf',
      approvedBy: 'Principal'
    },
    {
      id: 'EXP002',
      category: 'utilities',
      description: 'Electricity bill - January',
      amount: 15000,
      date: '2024-01-10',
      vendor: 'State Electricity Board',
      status: 'paid',
      receipt: 'RCP002.pdf',
      approvedBy: 'Admin'
    },
    {
      id: 'EXP003',
      category: 'maintenance',
      description: 'AC servicing - Computer Lab',
      amount: 3500,
      date: '2024-01-08',
      vendor: 'Cool Tech Services',
      status: 'pending',
      receipt: 'RCP003.pdf',
      approvedBy: 'Pending'
    },
    {
      id: 'EXP004',
      category: 'travel',
      description: 'Faculty conference travel',
      amount: 8000,
      date: '2024-01-05',
      vendor: 'Travel Agency',
      status: 'approved',
      receipt: 'RCP004.pdf',
      approvedBy: 'Principal'
    },
    {
      id: 'EXP005',
      category: 'events',
      description: 'Annual Day celebration expenses',
      amount: 25000,
      date: '2024-01-03',
      vendor: 'Event Organizers',
      status: 'paid',
      receipt: 'RCP005.pdf',
      approvedBy: 'Principal'
    }
  ];

  const monthlyStats = [
    { category: 'Office Supplies', budgeted: 10000, spent: 6500, remaining: 3500 },
    { category: 'Utilities', budgeted: 50000, spent: 45000, remaining: 5000 },
    { category: 'Maintenance', budgeted: 20000, spent: 12000, remaining: 8000 },
    { category: 'Travel', budgeted: 15000, spent: 8000, remaining: 7000 },
    { category: 'Events', budgeted: 30000, spent: 25000, remaining: 5000 },
    { category: 'Emergency', budgeted: 10000, spent: 0, remaining: 10000 }
  ];

  const getCategoryIcon = (categoryId: string) => {
    const category = expenseCategories.find(cat => cat.id === categoryId);
    return category ? category.icon : Receipt;
  };

  const getCategoryName = (categoryId: string) => {
    const category = expenseCategories.find(cat => cat.id === categoryId);
    return category ? category.name : categoryId;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'paid': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Miscellaneous Expenses</h2>
          <p className="text-muted-foreground">
            Track and manage all miscellaneous expenses
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Expense</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="expense-category">Category</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expense-amount">Amount (₹)</Label>
                  <Input 
                    id="expense-amount" 
                    type="number" 
                    placeholder="Enter amount" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expense-vendor">Vendor/Payee</Label>
                  <Input 
                    id="expense-vendor" 
                    placeholder="Enter vendor name" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense-description">Description</Label>
                <Textarea 
                  id="expense-description" 
                  placeholder="Enter expense description" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense-receipt">Receipt/Invoice</Label>
                <Input 
                  id="expense-receipt" 
                  type="file" 
                  accept=".pdf,.jpg,.jpeg,.png"
                />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1">Save & Submit for Approval</Button>
                <Button variant="outline" className="flex-1">Save as Draft</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category Overview */}
      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-7">
        {expenseCategories.map((category) => {
          const Icon = category.icon;
          const categoryExpenses = recentExpenses.filter(exp => exp.category === category.id);
          const totalAmount = categoryExpenses.reduce((sum, exp) => sum + exp.amount, 0);
          
          return (
            <Card key={category.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4 text-center">
                <Icon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <h3 className="font-medium text-sm">{category.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">₹{totalAmount.toLocaleString()}</p>
                <Badge className={`mt-2 text-xs ${category.color}`}>
                  {categoryExpenses.length} items
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Budget Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Monthly Budget Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {monthlyStats.map((stat, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{stat.category}</div>
                  <div className="text-sm text-muted-foreground">
                    Spent: ₹{stat.spent.toLocaleString()} / ₹{stat.budgeted.toLocaleString()}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${(stat.spent / stat.budgeted) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="font-medium text-green-600">
                    ₹{stat.remaining.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">remaining</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search expenses..." 
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {expenseCategories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          More Filters
        </Button>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Expenses List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {recentExpenses.map((expense) => {
            const Icon = getCategoryIcon(expense.category);
            return (
              <div key={expense.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <Icon className="h-8 w-8 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{expense.description}</span>
                      <Badge variant="outline">{expense.id}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {getCategoryName(expense.category)} • {expense.vendor} • {expense.date}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Approved by: {expense.approvedBy}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">₹{expense.amount.toLocaleString()}</div>
                  <Badge className={getStatusColor(expense.status)}>
                    {expense.status}
                  </Badge>
                  <div className="text-xs text-muted-foreground mt-1">
                    <Button variant="link" size="sm" className="p-0 h-auto">
                      {expense.receipt}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}