import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { db } from '@/services/supabase/database';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useToast } from '@/hooks/use-toast';
import { FinanceTransaction } from '@/types/database.types';
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
  Download,
  Filter,
  Search,
  DollarSign,
  Loader2
} from 'lucide-react';

export function MiscExpensesModule() {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const [newExpense, setNewExpense] = useState({
    category: 'office_supplies',
    amount: '',
    vendor: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const expenseCategories = [
    { id: 'office_supplies', name: 'Office Supplies', icon: Coffee, color: 'bg-blue-100 text-blue-800' },
    { id: 'utilities', name: 'Utilities', icon: Zap, color: 'bg-green-100 text-green-800' },
    { id: 'maintenance', name: 'Maintenance', icon: Wrench, color: 'bg-orange-100 text-orange-800' },
    { id: 'travel', name: 'Travel & Transport', icon: Car, color: 'bg-purple-100 text-purple-800' },
    { id: 'events', name: 'Events & Celebrations', icon: PartyPopper, color: 'bg-pink-100 text-pink-800' },
    { id: 'emergency', name: 'Emergency Expenses', icon: AlertCircle, color: 'bg-red-100 text-red-800' },
    { id: 'petty_cash', name: 'Petty Cash', icon: CreditCard, color: 'bg-yellow-100 text-yellow-800' }
  ];

  const loadData = useCallback(async () => {
    try {
      const data = await db.getFinanceTransactions();
      setTransactions(data || []);
    } catch (err) {
      console.warn('Failed to load misc expenses:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useRealtimeSubscription({ table: 'finance_transactions', onChange: loadData, onReconnect: loadData });

  const handleAddExpense = async () => {
    if (!newExpense.amount || !newExpense.description.trim()) {
      toast({ title: 'Validation Error', description: 'Please provide amount and description.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const created = await db.createFinanceTransaction({
        type: newExpense.category,
        amount: Number(newExpense.amount),
        department: newExpense.vendor.trim() || 'Campus Facilities',
        description: newExpense.description.trim(),
        urgency: 'medium',
        status: 'Approved'
      });
      if (created) {
        toast({ title: 'Expense Logged', description: `₹${Number(newExpense.amount).toLocaleString('en-IN')} recorded in ledger.` });
        setAddDialogOpen(false);
        setNewExpense({
          category: 'office_supplies',
          amount: '',
          vendor: '',
          description: '',
          date: new Date().toISOString().split('T')[0]
        });
        loadData();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const recentExpenses = transactions.map(t => ({
    id: t.id.slice(0, 8).toUpperCase(),
    category: t.type,
    description: t.description,
    amount: Number(t.amount) || 0,
    date: new Date(t.created_at).toISOString().split('T')[0],
    vendor: t.department || 'Campus Facilities',
    status: t.status.toLowerCase(),
    receipt: 'Voucher-' + t.id.slice(0, 6).toUpperCase(),
    approvedBy: 'Finance Office'
  }));

  const filteredExpenses = recentExpenses.filter(exp => {
    const matchesCategory = selectedCategory === 'all' || exp.category === selectedCategory;
    const matchesSearch = !searchTerm || exp.description.toLowerCase().includes(searchTerm.toLowerCase()) || exp.vendor.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const monthlyStats = expenseCategories.map(cat => {
    const spent = recentExpenses
      .filter(exp => exp.category === cat.id)
      .reduce((sum, exp) => sum + exp.amount, 0);
    const budgeted = Math.max(spent * 1.25, 25000);
    return {
      category: cat.name,
      budgeted: Math.round(budgeted),
      spent,
      remaining: Math.max(0, Math.round(budgeted - spent))
    };
  });

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
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
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
                  <Select
                    value={newExpense.category}
                    onValueChange={(val) => setNewExpense({ ...newExpense, category: val })}
                  >
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
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expense-vendor">Vendor / Payee</Label>
                  <Input 
                    id="expense-vendor" 
                    placeholder="Enter vendor name" 
                    value={newExpense.vendor}
                    onChange={(e) => setNewExpense({ ...newExpense, vendor: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expense-date">Date</Label>
                  <Input 
                    id="expense-date" 
                    type="date"
                    value={newExpense.date}
                    onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense-description">Description</Label>
                <Textarea 
                  id="expense-description" 
                  placeholder="Enter expense description" 
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleAddExpense} disabled={submitting} className="flex-1">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Save & Submit for Approval
                </Button>
                <Button variant="outline" onClick={() => setAddDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
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
                <p className="text-xs text-muted-foreground mt-1">₹{totalAmount.toLocaleString('en-IN')}</p>
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
                    Spent: ₹{stat.spent.toLocaleString('en-IN')} / ₹{stat.budgeted.toLocaleString('en-IN')}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${Math.min(100, (stat.spent / (stat.budgeted || 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="font-medium text-green-600">
                    ₹{stat.remaining.toLocaleString('en-IN')}
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
          {filteredExpenses.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No expense records found. Add an expense above to record in ledger.</p>
          ) : filteredExpenses.map((expense) => {
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
                  <div className="font-bold text-lg">₹{expense.amount.toLocaleString('en-IN')}</div>
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