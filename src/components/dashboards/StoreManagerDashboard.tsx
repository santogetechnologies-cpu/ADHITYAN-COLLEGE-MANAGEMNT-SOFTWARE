import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Package, 
  AlertTriangle, 
  ShoppingCart, 
  Truck, 
  Users,
  BarChart3,
  FileText,
  QrCode,
  Building,
  BookOpen,
  Shirt,
  FlaskConical
} from 'lucide-react';

export default function StoreManagerDashboard() {
  const inventoryStats = [
    { title: 'Total Items', value: '3,247', icon: Package, trend: '+156 new items' },
    { title: 'Low Stock Alerts', value: '28', icon: AlertTriangle, trend: '8 critical' },
    { title: 'Pending Orders', value: '15', icon: ShoppingCart, trend: 'Due in 5 days' },
    { title: 'Value in Stock', value: '₹52,67,890', icon: BarChart3, trend: '+15.2% increase' }
  ];

  const lowStockItems = [
    { item: 'Class 10 Textbooks', current: 25, minimum: 50, category: 'Books', urgency: 'high', student_demand: 45 },
    { item: 'School Uniform (Size M)', current: 12, minimum: 30, category: 'Uniform', urgency: 'high', student_demand: 28 },
    { item: 'Chemistry Lab Equipment', current: 8, minimum: 15, category: 'Lab', urgency: 'medium', student_demand: 12 },
    { item: 'Sports Equipment', current: 18, minimum: 25, category: 'Sports', urgency: 'low', student_demand: 20 }
  ];

  const recentDistributions = [
    { student_id: 'ST001', item: 'Mathematics Textbook', quantity: 1, grade: 'Class 9', status: 'issued', barcode: 'BK12345' },
    { student_id: 'ST002', item: 'School Uniform Set', quantity: 2, grade: 'Class 7', status: 'issued', barcode: 'UN67890' },
    { student_id: 'ST003', item: 'Lab Manual', quantity: 1, grade: 'Class 11', status: 'pending', barcode: 'LB11111' },
    { student_id: 'ST004', item: 'Sports Kit', quantity: 1, grade: 'Class 8', status: 'returned', barcode: 'SP22222' }
  ];

  const vendors = [
    { name: 'Academic Publishers Ltd', category: 'Books', rating: 4.8, pending_orders: 3, last_delivery: '2 days ago' },
    { name: 'Uniform Solutions', category: 'Uniforms', rating: 4.6, pending_orders: 1, last_delivery: '1 week ago' },
    { name: 'Scientific Supplies Co.', category: 'Lab Equipment', rating: 4.9, pending_orders: 2, last_delivery: '3 days ago' },
    { name: 'Sports & Recreation', category: 'Sports', rating: 4.5, pending_orders: 0, last_delivery: '2 weeks ago' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Store Management Hub</h1>
        <p className="text-muted-foreground">
          Inventory control and student resource distribution
        </p>
      </div>

      {/* Statistics */}
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
              Low Stock Alerts (Auto Reminders)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {lowStockItems.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{item.item}</div>
                  <div className="text-sm text-muted-foreground">
                    Current: {item.current} | Min: {item.minimum} | Demand: {item.student_demand}
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
                    Order Now
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Book & Uniform Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Recent Distributions (Student ID Linked)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentDistributions.map((distribution, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{distribution.student_id}</span>
                    <QrCode className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{distribution.barcode}</span>
                  </div>
                  <div className="text-sm">{distribution.item} x{distribution.quantity}</div>
                  <div className="text-xs text-muted-foreground">
                    {distribution.grade}
                  </div>
                </div>
                <Badge 
                  variant={
                    distribution.status === 'issued' ? 'default' :
                    distribution.status === 'pending' ? 'secondary' : 'outline'
                  }
                  className="capitalize"
                >
                  {distribution.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Vendor Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Vendor Management & Purchase Orders
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {vendors.map((vendor, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{vendor.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {vendor.category} • Rating: {vendor.rating}/5.0
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Last delivery: {vendor.last_delivery}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {vendor.pending_orders > 0 && (
                    <Badge variant="secondary">
                      {vendor.pending_orders} pending
                    </Badge>
                  )}
                  <Button size="sm" variant="outline">
                    New Order
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Barcode/QR Scanning */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Barcode/QR Fast Transactions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center p-6 border-2 border-dashed rounded-lg">
              <QrCode className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                Scan item barcode or student QR code for quick transactions
              </p>
              <Button>
                Start Scanner
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-auto p-3 flex flex-col gap-1">
                <BookOpen className="h-5 w-5" />
                <span className="text-xs">Issue Books</span>
              </Button>
              <Button variant="outline" className="h-auto p-3 flex flex-col gap-1">
                <Shirt className="h-5 w-5" />
                <span className="text-xs">Issue Uniforms</span>
              </Button>
              <Button variant="outline" className="h-auto p-3 flex flex-col gap-1">
                <FlaskConical className="h-5 w-5" />
                <span className="text-xs">Lab Items</span>
              </Button>
              <Button variant="outline" className="h-auto p-3 flex flex-col gap-1">
                <Package className="h-5 w-5" />
                <span className="text-xs">Return Items</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Store Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Store Reports (Monthly Usage, Wastage, Procurement)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <BarChart3 className="h-6 w-6" />
              <span className="text-xs">Usage Report</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <AlertTriangle className="h-6 w-6" />
              <span className="text-xs">Wastage Report</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <ShoppingCart className="h-6 w-6" />
              <span className="text-xs">Procurement</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <Users className="h-6 w-6" />
              <span className="text-xs">Student Distribution</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <Package className="h-6 w-6" />
              <span className="text-xs">Inventory Audit</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <Building className="h-6 w-6" />
              <span className="text-xs">Vendor Analysis</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}