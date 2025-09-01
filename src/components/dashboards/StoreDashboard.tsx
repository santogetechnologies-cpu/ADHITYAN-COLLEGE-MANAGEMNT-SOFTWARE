import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Package, 
  TrendingDown, 
  ShoppingCart, 
  Truck, 
  AlertTriangle,
  CheckCircle,
  BarChart3,
  FileText
} from 'lucide-react';

export default function StoreDashboard() {
  const inventoryStats = [
    { title: 'Total Items', value: '2,847', icon: Package, trend: '+156 new items' },
    { title: 'Low Stock Alerts', value: '23', icon: AlertTriangle, trend: '5 critical' },
    { title: 'Pending Orders', value: '12', icon: ShoppingCart, trend: 'Due in 3 days' },
    { title: 'Value in Stock', value: '₹45,67,890', icon: BarChart3, trend: '+12.5% increase' }
  ];

  const lowStockItems = [
    { item: 'A4 Paper Sheets', current: 50, minimum: 100, category: 'Stationery', urgency: 'high' },
    { item: 'Whiteboard Markers', current: 15, minimum: 25, category: 'Classroom', urgency: 'medium' },
    { item: 'Laboratory Chemicals', current: 8, minimum: 20, category: 'Science Lab', urgency: 'high' },
    { item: 'Sports Equipment', current: 12, minimum: 15, category: 'Sports', urgency: 'low' }
  ];

  const recentTransactions = [
    { type: 'Issue', item: 'Textbooks - Class 10', quantity: 50, department: 'Academic', status: 'completed' },
    { type: 'Receipt', item: 'Computer Accessories', quantity: 25, supplier: 'Tech Solutions', status: 'completed' },
    { type: 'Issue', item: 'Cleaning Supplies', quantity: 10, department: 'Maintenance', status: 'pending' },
    { type: 'Order', item: 'Laboratory Equipment', quantity: 5, supplier: 'Sci-Tech Ltd', status: 'processing' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Store Management</h1>
        <p className="text-muted-foreground">
          Inventory control and asset management
        </p>
      </div>

      {/* Inventory Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {inventoryStats.map((stat) => {
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
                  {stat.trend}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Low Stock Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {lowStockItems.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{item.item}</div>
                  <div className="text-sm text-muted-foreground">
                    Current: {item.current} | Minimum: {item.minimum}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Category: {item.category}
                  </div>
                  <Progress 
                    value={(item.current / item.minimum) * 100} 
                    className="h-2 mt-2"
                  />
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Badge 
                    variant={
                      item.urgency === 'high' ? 'destructive' :
                      item.urgency === 'medium' ? 'secondary' : 'outline'
                    }
                  >
                    {item.urgency}
                  </Badge>
                  <Button size="sm" variant="outline">
                    Order
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentTransactions.map((transaction, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{transaction.type}</span>
                    {transaction.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                    {transaction.status === 'pending' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                    {transaction.status === 'processing' && <Truck className="h-4 w-4 text-blue-500" />}
                  </div>
                  <div className="text-sm">{transaction.item}</div>
                  <div className="text-xs text-muted-foreground">
                    Qty: {transaction.quantity} | {transaction.department || transaction.supplier}
                  </div>
                </div>
                <Badge variant="outline" className="capitalize">
                  {transaction.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Store Operations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <Package className="h-6 w-6" />
              <span className="text-xs">Add Inventory</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <ShoppingCart className="h-6 w-6" />
              <span className="text-xs">Purchase Orders</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <Truck className="h-6 w-6" />
              <span className="text-xs">Issue Items</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <BarChart3 className="h-6 w-6" />
              <span className="text-xs">Stock Reports</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <AlertTriangle className="h-6 w-6" />
              <span className="text-xs">Asset Management</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <FileText className="h-6 w-6" />
              <span className="text-xs">Audit Trail</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}