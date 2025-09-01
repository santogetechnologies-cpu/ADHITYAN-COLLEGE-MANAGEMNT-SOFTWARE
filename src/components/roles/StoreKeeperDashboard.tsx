import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Package, 
  Scan, 
  TrendingDown, 
  ShoppingCart, 
  Truck, 
  AlertTriangle,
  CheckCircle,
  BarChart3,
  FileText,
  Plus,
  Minus,
  Search,
  Filter,
  Download,
  Upload,
  Tag,
  Users
} from 'lucide-react';

export default function StoreKeeperDashboard() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const inventoryStats = [
    { title: 'Total Items', value: '2,847', icon: Package, trend: '+156 new items', color: 'text-blue-600' },
    { title: 'Low Stock Alerts', value: '23', icon: AlertTriangle, trend: '5 critical', color: 'text-red-600' },
    { title: 'Pending Orders', value: '12', icon: ShoppingCart, trend: 'Due in 3 days', color: 'text-orange-600' },
    { title: 'Value in Stock', value: '₹45,67,890', icon: BarChart3, trend: '+12.5% increase', color: 'text-green-600' }
  ];

  const categories = [
    { id: 'stationery', name: 'Stationery', count: 456, color: 'bg-blue-100 text-blue-800' },
    { id: 'equipment', name: 'Equipment', count: 234, color: 'bg-green-100 text-green-800' },
    { id: 'consumables', name: 'Consumables', count: 789, color: 'bg-purple-100 text-purple-800' },
    { id: 'furniture', name: 'Furniture', count: 156, color: 'bg-orange-100 text-orange-800' },
    { id: 'electronics', name: 'Electronics', count: 98, color: 'bg-red-100 text-red-800' }
  ];

  const lowStockItems = [
    { 
      id: 'ST001', 
      item: 'A4 Paper Sheets', 
      current: 50, 
      minimum: 100, 
      category: 'Stationery', 
      urgency: 'high',
      lastUpdated: '2024-01-15',
      vendor: 'Paper Plus Ltd'
    },
    { 
      id: 'EQ012', 
      item: 'Whiteboard Markers', 
      current: 15, 
      minimum: 25, 
      category: 'Stationery', 
      urgency: 'medium',
      lastUpdated: '2024-01-14',
      vendor: 'Office Mart'
    },
    { 
      id: 'CS045', 
      item: 'Laboratory Chemicals', 
      current: 8, 
      minimum: 20, 
      category: 'Consumables', 
      urgency: 'high',
      lastUpdated: '2024-01-13',
      vendor: 'Science Supplies Co'
    }
  ];

  const recentTransactions = [
    { 
      id: 'TXN001',
      type: 'Issue', 
      item: 'Textbooks - Class 10', 
      quantity: 50, 
      department: 'Academic', 
      status: 'completed',
      date: '2024-01-15',
      issuedTo: 'John Smith'
    },
    { 
      id: 'TXN002',
      type: 'Receipt', 
      item: 'Computer Accessories', 
      quantity: 25, 
      supplier: 'Tech Solutions', 
      status: 'completed',
      date: '2024-01-14',
      receivedBy: 'Store Keeper'
    },
    { 
      id: 'TXN003',
      type: 'Issue', 
      item: 'Cleaning Supplies', 
      quantity: 10, 
      department: 'Maintenance', 
      status: 'pending',
      date: '2024-01-14',
      issuedTo: 'Maintenance Team'
    }
  ];

  const vendors = [
    { id: 'V001', name: 'Paper Plus Ltd', contact: '+91 98765 43210', rating: 4.5, totalOrders: 45 },
    { id: 'V002', name: 'Office Mart', contact: '+91 87654 32109', rating: 4.2, totalOrders: 32 },
    { id: 'V003', name: 'Science Supplies Co', contact: '+91 76543 21098', rating: 4.8, totalOrders: 28 },
    { id: 'V004', name: 'Tech Solutions', contact: '+91 65432 10987', rating: 4.3, totalOrders: 19 }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Store Keeper Dashboard</h1>
        <p className="text-muted-foreground">
          Complete inventory control and asset management system
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
                <Icon className={`h-4 w-4 ${stat.color}`} />
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

      <Tabs defaultValue="inventory" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="intake">Stock In</TabsTrigger>
          <TabsTrigger value="issue">Stock Out</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* Inventory Management Tab */}
        <TabsContent value="inventory" className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search items..." 
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
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Scan className="h-4 w-4" />
                  Barcode Scan
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Barcode Scanner</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-muted p-8 text-center">
                    <Scan className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Position barcode in the scanner area</p>
                    <p className="text-sm text-muted-foreground mt-2">Simulation: Scan detected for Item ID: ST001</p>
                  </div>
                  <Input placeholder="Or enter barcode manually" />
                  <Button className="w-full">Search Item</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Category Cards */}
          <div className="grid gap-4 md:grid-cols-5">
            {categories.map((category) => (
              <Card key={category.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4 text-center">
                  <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <h3 className="font-medium">{category.name}</h3>
                  <Badge className={`mt-2 ${category.color}`}>{category.count} items</Badge>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Low Stock Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Low Stock Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {lowStockItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.item}</span>
                      <Badge variant="outline">{item.id}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Current: {item.current} | Minimum: {item.minimum} | Vendor: {item.vendor}
                    </div>
                    <Progress 
                      value={(item.current / item.minimum) * 100} 
                      className="h-2 mt-2"
                    />
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Badge 
                      variant={item.urgency === 'high' ? 'destructive' : 'secondary'}
                    >
                      {item.urgency}
                    </Badge>
                    <Button size="sm" variant="outline">
                      Reorder
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stock Intake Tab */}
        <TabsContent value="intake" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Stock Intake Form
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="item-name">Item Name</Label>
                  <Input id="item-name" placeholder="Enter item name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item-code">Item Code/Barcode</Label>
                  <Input id="item-code" placeholder="Enter or scan barcode" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity Received</Label>
                  <Input id="quantity" type="number" placeholder="Enter quantity" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vendor">Vendor</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map(vendor => (
                        <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit-price">Unit Price</Label>
                  <Input id="unit-price" type="number" placeholder="Enter unit price" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" placeholder="Enter item description" />
              </div>
              <div className="flex gap-2">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add to Inventory
                </Button>
                <Button variant="outline" className="gap-2">
                  <Tag className="h-4 w-4" />
                  Generate Asset Tag
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stock Issue Tab */}
        <TabsContent value="issue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Minus className="h-5 w-5" />
                Stock Issue Form
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="issue-item">Item to Issue</Label>
                  <Input id="issue-item" placeholder="Search or scan item" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="issue-quantity">Quantity to Issue</Label>
                  <Input id="issue-quantity" type="number" placeholder="Enter quantity" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="academic">Academic</SelectItem>
                      <SelectItem value="administration">Administration</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="sports">Sports</SelectItem>
                      <SelectItem value="library">Library</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="issued-to">Issued To</Label>
                  <Input id="issued-to" placeholder="Enter recipient name" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="issue-purpose">Purpose</Label>
                <Textarea id="issue-purpose" placeholder="Enter purpose of issue" />
              </div>
              <Button className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Issue Items
              </Button>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{transaction.type}</span>
                      <Badge variant="outline">{transaction.id}</Badge>
                      {transaction.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {transaction.status === 'pending' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                    </div>
                    <div className="text-sm">{transaction.item}</div>
                    <div className="text-xs text-muted-foreground">
                      Qty: {transaction.quantity} | {transaction.department || transaction.supplier} | {transaction.date}
                    </div>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {transaction.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Tab */}
        <TabsContent value="audit" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Physical Count</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Conduct physical stock counting
                </p>
                <Button className="w-full gap-2">
                  <FileText className="h-4 w-4" />
                  Start Audit
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Discrepancy Report</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  View stock discrepancies
                </p>
                <Button variant="outline" className="w-full gap-2">
                  <BarChart3 className="h-4 w-4" />
                  View Report
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Asset Verification</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Verify asset tags and locations
                </p>
                <Button variant="outline" className="w-full gap-2">
                  <Tag className="h-4 w-4" />
                  Verify Assets
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Vendors Tab */}
        <TabsContent value="vendors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Vendor Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {vendors.map((vendor) => (
                <div key={vendor.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{vendor.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Contact: {vendor.contact} | Orders: {vendor.totalOrders}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-sm">Rating:</span>
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className={`text-sm ${i < Math.floor(vendor.rating) ? 'text-yellow-400' : 'text-gray-300'}`}>
                            ★
                          </span>
                        ))}
                      </div>
                      <span className="text-sm text-muted-foreground">({vendor.rating})</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">Edit</Button>
                    <Button size="sm">Contact</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Stock Report</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Current stock levels by category
                </p>
                <Button className="w-full gap-2">
                  <Download className="h-4 w-4" />
                  Generate Report
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Movement Report</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Stock in/out movements
                </p>
                <Button className="w-full gap-2">
                  <Download className="h-4 w-4" />
                  Generate Report
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Vendor Report</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Vendor performance analysis
                </p>
                <Button className="w-full gap-2">
                  <Download className="h-4 w-4" />
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