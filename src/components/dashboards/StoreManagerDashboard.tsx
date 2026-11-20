import { useState, useEffect, useCallback } from 'react';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  FlaskConical,
  Loader2,
  Plus,
  Download,
  CheckCircle,
  Scan,
  ShoppingBag,
  ExternalLink,
  Minus
} from 'lucide-react';
import { db } from '@/services/supabase/database';
import { InventoryItem, InventoryTransaction, StoreProduct, StoreOrder } from '@/types/database.types';
import { useToast } from '@/hooks/use-toast';
import { StudentSearchSelect } from '@/components/shared/StudentSearchSelect';

export default function StoreManagerDashboard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([]);
  const [storeOrders, setStoreOrders] = useState<StoreOrder[]>([]);

  // Dialog States
  const [purchaseOrderDialogOpen, setPurchaseOrderDialogOpen] = useState(false);
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [distributionDialogOpen, setDistributionDialogOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [scannerDialogOpen, setScannerDialogOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportTitle, setReportTitle] = useState('');
  const [reportData, setReportData] = useState<any[]>([]);

  // Selected item for order
  const [selectedItemName, setSelectedItemName] = useState('');

  // Form states
  const [newPO, setNewPO] = useState({
    item_name: '',
    quantity: 10,
    supplier: '',
    category: 'General'
  });

  const [newItem, setNewItem] = useState({
    name: '',
    category: 'Stationery',
    current_stock: 50,
    minimum_stock: 20,
    unit: 'Units',
    urgency: 'medium' as 'low' | 'medium' | 'high' | 'critical'
  });

  const [distributionForm, setDistributionForm] = useState({
    category: 'Books',
    item_name: '',
    student_name: '',
    quantity: 1,
    barcode: ''
  });

  const [returnForm, setReturnForm] = useState({
    item_name: '',
    student_name: '',
    quantity: 1,
    reason: 'End of Term'
  });

  const [addStoreProductDialogOpen, setAddStoreProductDialogOpen] = useState(false);
  const [newStoreProduct, setNewStoreProduct] = useState({
    name: '',
    category: 'Clinical Equipment',
    price: 500,
    stock: 40,
    description: ''
  });

  const [scannedBarcode, setScannedBarcode] = useState('');

  const loadStoreData = useCallback(async () => {
    try {
      const [items, txs, prods, orders] = await Promise.all([
        db.getInventoryItems(),
        db.getInventoryTransactions(),
        db.getStoreProducts(),
        db.getStoreOrders()
      ]);
      setInventoryItems(items || []);
      setTransactions(txs || []);
      setStoreProducts(prods || []);
      setStoreOrders(orders || []);
    } catch (err) {
      console.error('Failed to load store data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStoreData();
  }, [loadStoreData]);

  // Real-time synchronization
  useRealtimeSubscription({ table: 'inventory_items', onChange: loadStoreData, onReconnect: loadStoreData });
  useRealtimeSubscription({ table: 'inventory_transactions', onChange: loadStoreData, onReconnect: loadStoreData });
  useRealtimeSubscription({ table: 'store_products', onChange: loadStoreData, onReconnect: loadStoreData });
  useRealtimeSubscription({ table: 'store_orders', onChange: loadStoreData, onReconnect: loadStoreData });

  // Low stock items: items where current_stock <= minimum_stock
  const lowStockItems = inventoryItems.filter(i => i.current_stock <= i.minimum_stock);

  // Recent distributions: transactions with type === 'Issue'
  const recentDistributions = transactions.filter(t => t.type === 'Issue');

  // Purchase orders
  const purchaseOrders = transactions.filter(t => t.type === 'Order');

  // Total stock count and estimated valuation
  const totalStockUnits = inventoryItems.reduce((acc, curr) => acc + (curr.current_stock || 0), 0);
  const pendingOrdersCount = purchaseOrders.filter(p => p.status === 'pending').length;

  const inventoryStats = [
    { 
      title: 'Total Stock Units', 
      value: totalStockUnits.toLocaleString(), 
      icon: Package, 
      trend: `${inventoryItems.length} catalog items managed` 
    },
    { 
      title: 'Low Stock Alerts', 
      value: lowStockItems.length.toString(), 
      icon: AlertTriangle, 
      trend: `${lowStockItems.filter(i => i.urgency === 'critical' || i.urgency === 'high').length} critical items` 
    },
    { 
      title: 'Pending Orders', 
      value: pendingOrdersCount.toString(), 
      icon: ShoppingCart, 
      trend: `${purchaseOrders.length} total purchase orders` 
    },
    { 
      title: 'Active Store Items', 
      value: storeProducts.length > 0 ? storeProducts.length.toString() : inventoryItems.length.toString(), 
      icon: BarChart3, 
      trend: 'Campus store active listings' 
    }
  ];

  // Handle Add Item
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name.trim()) {
      toast({ title: 'Validation Error', description: 'Item name is required.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const created = await db.createInventoryItem(newItem);
      if (created) {
        toast({ title: 'Item Added', description: `${created.name} added to inventory.` });
        setAddItemDialogOpen(false);
        setNewItem({
          name: '',
          category: 'Stationery',
          current_stock: 50,
          minimum_stock: 20,
          unit: 'Units',
          urgency: 'medium'
        });
        loadStoreData();
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Create Purchase Order
  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPO.item_name.trim() || !newPO.supplier.trim() || newPO.quantity <= 0) {
      toast({ title: 'Validation Error', description: 'Please complete all purchase order fields.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await db.createPurchaseOrder({
        itemName: newPO.item_name,
        quantity: Number(newPO.quantity),
        supplier: newPO.supplier,
        department: newPO.category
      });
      if (res.success) {
        toast({ title: 'Purchase Order Placed', description: `Ordered ${newPO.quantity} units of ${newPO.item_name} from ${newPO.supplier}.` });
        db.createNotification({
          user_id: 'admin',
          title: 'Store Purchase Order Placed',
          message: `PO logged for ${newPO.quantity}x ${newPO.item_name} from ${newPO.supplier} (${newPO.category} dept). Pending finance verification.`,
          type: 'info',
          priority: 'medium',
          is_read: false
        }).catch(console.warn);
        setPurchaseOrderDialogOpen(false);
        setNewPO({ item_name: '', quantity: 10, supplier: '', category: 'General' });
        loadStoreData();
      } else {
        toast({ title: 'Order Failed', description: res.error, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Item Distribution to Student
  const handleDistributeItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!distributionForm.item_name.trim() || !distributionForm.student_name.trim() || distributionForm.quantity <= 0) {
      toast({ title: 'Validation Error', description: 'Please enter item name, recipient student, and quantity.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await db.issueItemDistribution({
        itemName: distributionForm.item_name,
        quantity: Number(distributionForm.quantity),
        studentName: distributionForm.student_name,
        department: distributionForm.category
      });
      if (res.success) {
        toast({ 
          title: 'Distribution Recorded', 
          description: `Issued ${distributionForm.quantity}x ${distributionForm.item_name} to ${distributionForm.student_name}. Stock decremented.` 
        });
        setDistributionDialogOpen(false);
        setDistributionForm({ category: 'Books', item_name: '', student_name: '', quantity: 1, barcode: '' });
        loadStoreData();
      } else {
        toast({ title: 'Distribution Failed', description: res.error, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Item Return
  const handleReturnItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnForm.item_name.trim() || !returnForm.student_name.trim() || returnForm.quantity <= 0) {
      toast({ title: 'Validation Error', description: 'Please fill all return fields.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await db.returnItemDistribution({
        itemName: returnForm.item_name,
        quantity: Number(returnForm.quantity),
        studentName: returnForm.student_name,
        reason: returnForm.reason
      });
      if (res.success) {
        toast({ 
          title: 'Return Processed', 
          description: `Restocked ${returnForm.quantity}x ${returnForm.item_name} from ${returnForm.student_name}.` 
        });
        setReturnDialogOpen(false);
        setReturnForm({ item_name: '', student_name: '', quantity: 1, reason: 'End of Term' });
        loadStoreData();
      } else {
        toast({ title: 'Return Failed', description: res.error, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // Store Orders and Catalog Handlers
  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      const ok = await db.updateStoreOrderStatus(orderId, status);
      if (ok) {
        toast({ title: 'Order Status Updated', description: `Order status changed to ${status}.` });
        loadStoreData();
      } else {
        toast({ title: 'Update Failed', description: 'Could not update order status.', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleAdjustProductStock = async (productId: string, currentStock: number, delta: number) => {
    const newStock = Math.max(0, currentStock + delta);
    try {
      const ok = await db.updateStoreProduct(productId, { stock: newStock });
      if (ok) {
        toast({ title: 'Stock Updated', description: `Stock adjusted to ${newStock} units.` });
        loadStoreData();
      }
    } catch (err: any) {
      toast({ title: 'Stock Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleCreateStoreProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreProduct.name.trim() || newStoreProduct.price <= 0) {
      toast({ title: 'Validation Error', description: 'Item name and valid price are required.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await db.createStoreProduct(({
        name: newStoreProduct.name.trim(),
        category: newStoreProduct.category,
        price: Number(newStoreProduct.price),
        stock: Number(newStoreProduct.stock),
        description: newStoreProduct.description.trim()
      } as any));
      if (res) {
        toast({ title: 'Store Product Created', description: `${res.name} added to campus store catalog.` });
        setAddStoreProductDialogOpen(false);
        setNewStoreProduct({
          name: '',
          category: 'Clinical Equipment',
          price: 500,
          stock: 40,
          description: ''
        });
        loadStoreData();
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Barcode Scan lookup
  const handleBarcodeLookup = () => {
    if (!scannedBarcode.trim()) return;
    const match = inventoryItems.find(i => 
      i.name.toLowerCase().includes(scannedBarcode.toLowerCase()) || 
      i.category.toLowerCase().includes(scannedBarcode.toLowerCase())
    );
    if (match) {
      toast({ title: 'Barcode Matched', description: `Identified: ${match.name} (In Stock: ${match.current_stock} ${match.unit})` });
      setDistributionForm({ ...distributionForm, item_name: match.name, barcode: scannedBarcode });
      setScannerDialogOpen(false);
      setDistributionDialogOpen(true);
    } else {
      toast({ title: 'Not Found', description: `No catalog item matching "${scannedBarcode}".`, variant: 'destructive' });
    }
  };

  // CSV Audit Export
  const handleExportAuditCSV = () => {
    if (inventoryItems.length === 0) {
      toast({ title: 'No Data', description: 'No inventory items available to export.' });
      return;
    }
    const headers = ['Item Name', 'Category', 'Current Stock', 'Minimum Stock', 'Unit', 'Urgency'];
    const rows = inventoryItems.map(item => [
      `"${item.name}"`,
      `"${item.category}"`,
      item.current_stock,
      item.minimum_stock,
      `"${item.unit}"`,
      `"${item.urgency}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Inventory_Audit_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Audit Exported', description: 'Inventory audit CSV successfully downloaded.' });
  };

  // Open predefined reports modal
  const openReport = (type: string) => {
    setReportTitle(type);
    if (type === 'Usage Report') {
      setReportData(transactions.filter(t => t.type === 'Issue'));
    } else if (type === 'Procurement') {
      setReportData(transactions.filter(t => t.type === 'Order'));
    } else if (type === 'Student Distribution') {
      setReportData(transactions.filter(t => t.type === 'Issue'));
    } else if (type === 'Inventory Audit') {
      setReportData(inventoryItems);
    } else {
      setReportData(transactions);
    }
    setReportModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Store Management Hub</h1>
          <p className="text-muted-foreground">
            Inventory control, purchase orders & student resource distribution
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setScannerDialogOpen(true)}>
            <Scan className="h-4 w-4 mr-2" />
            Scan Barcode
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportAuditCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export Audit
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPurchaseOrderDialogOpen(true)}>
            <ShoppingCart className="h-4 w-4 mr-2" />
            New Purchase Order
          </Button>
          <Button size="sm" onClick={() => setAddItemDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
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
                <div className="text-2xl font-bold">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : stat.value}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stat.trend}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Navigation Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto p-1">
          <TabsTrigger value="overview" className="flex items-center gap-2 py-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Overview & Alerts
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2 py-2">
            <ShoppingCart className="w-4 h-4 text-blue-500" />
            Campus Orders ({storeOrders.length})
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2 py-2">
            <ShoppingBag className="w-4 h-4 text-indigo-500" />
            Store Catalog ({storeProducts.length})
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-2 py-2">
            <Package className="w-4 h-4 text-emerald-500" />
            Inventory Audit ({inventoryItems.length})
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Low Stock Alerts */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Low Stock Alerts (Auto Stock Level Monitor)
                </CardTitle>
                <Badge variant="outline">{lowStockItems.length} items flagged</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                {lowStockItems.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500 opacity-80" />
                    All inventory items are currently well stocked above threshold.
                  </div>
                ) : (
                  lowStockItems.slice(0, 5).map((item) => {
                    const percentage = item.minimum_stock > 0 
                      ? Math.min(100, Math.round((item.current_stock / item.minimum_stock) * 100))
                      : 0;
                    return (
                      <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex-1 mr-4">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Current: <span className="font-semibold text-destructive">{item.current_stock}</span> {item.unit} | Min: {item.minimum_stock} {item.unit}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Category: {item.category}
                          </div>
                          <Progress 
                            value={percentage} 
                            className="h-2 mt-2"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={
                              item.urgency === 'critical' || item.urgency === 'high' ? 'destructive' :
                              item.urgency === 'medium' ? 'secondary' : 'outline'
                            }
                            className="capitalize text-xs"
                          >
                            {item.urgency}
                          </Badge>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setNewPO({
                                item_name: item.name,
                                quantity: item.minimum_stock * 2,
                                supplier: 'Preferred Vendor',
                                category: item.category
                              });
                              setPurchaseOrderDialogOpen(true);
                            }}
                          >
                            Order Now
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Book & Uniform Distribution */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Recent Distributions (Student ID Linked)
                </CardTitle>
                <Button size="sm" variant="ghost" onClick={() => setDistributionDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Fast Issue
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentDistributions.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No resource distributions recorded yet. Click Fast Issue to distribute books, uniforms, or lab kits.
                  </div>
                ) : (
                  recentDistributions.slice(0, 5).map((dist) => (
                    <div key={dist.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{dist.department || 'Student'}</span>
                          <QrCode className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground font-mono">{dist.id.slice(0, 8)}</span>
                        </div>
                        <div className="text-sm font-medium mt-0.5">{dist.item_name} × {dist.quantity}</div>
                        <div className="text-xs text-muted-foreground">
                          Issued on {dist.created_at ? new Date(dist.created_at).toLocaleDateString() : 'Today'}
                        </div>
                      </div>
                      <Badge 
                        variant={dist.status === 'completed' ? 'default' : 'secondary'}
                        className="capitalize text-xs"
                      >
                        {dist.status}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Vendor Management & Purchase Orders */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Vendor Management & Purchase Orders
                </CardTitle>
                <Button size="sm" variant="ghost" onClick={() => setPurchaseOrderDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> New PO
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {purchaseOrders.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    <Building className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No purchase orders active. Click New PO to order inventory from vendors.
                  </div>
                ) : (
                  purchaseOrders.slice(0, 5).map((po) => (
                    <div key={po.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{po.item_name} × {po.quantity}</div>
                        <div className="text-sm text-muted-foreground">
                          Vendor: <span className="font-medium text-foreground">{po.supplier || 'Campus Supplies'}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Dept: {po.department || 'Store'} • {po.created_at ? new Date(po.created_at).toLocaleDateString() : 'Recent'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={po.status === 'completed' ? 'default' : 'secondary'} className="capitalize text-xs">
                          {po.status}{po.status === 'processing' ? ` (${(po as any).received_qty}/${po.quantity})` : ''}
                        </Badge>
                        {['pending', 'processing'].includes(po.status) && (<>
                          <Button size="sm" variant="outline" onClick={async () => {
                            const left = po.quantity - ((po as any).received_qty || 0);
                            const v = window.prompt(`How many units arrived? (up to ${left})`, String(left));
                            if (!v) return;
                            const r = await db.receivePurchaseOrder(po.id, Number(v));
                            toast(r.success ? { title: r.complete ? 'Order complete' : 'Partial delivery recorded', description: 'Stock updated.' } : { title: 'Not received', description: r.error, variant: 'destructive' });
                            if (r.success) loadStoreData();
                          }}>Receive</Button>
                          <Button size="sm" variant="ghost" onClick={async () => {
                            const why = window.prompt('Reason for cancelling this order:');
                            if (!why) return;
                            const r = await db.cancelPurchaseOrder(po.id, why);
                            toast(r.success ? { title: 'Order cancelled' } : { title: 'Not cancelled', description: r.error, variant: 'destructive' });
                            if (r.success) loadStoreData();
                          }}>Cancel</Button></>)}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Barcode/QR Scanning & Fast Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Barcode/QR Fast Transactions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-6 border-2 border-dashed rounded-lg bg-muted/20">
                  <QrCode className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-medium mb-1">Fast Barcode & Item Lookup</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Scan barcode or enter code for instant checkout and stock updates
                  </p>
                  <Button onClick={() => setScannerDialogOpen(true)}>
                    <Scan className="w-4 h-4 mr-2" />
                    Start Scanner
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    className="h-auto p-3 flex flex-col gap-1 items-center justify-center hover:border-primary"
                    onClick={() => {
                      setDistributionForm({ ...distributionForm, category: 'Books' });
                      setDistributionDialogOpen(true);
                    }}
                  >
                    <BookOpen className="h-5 w-5 text-blue-500" />
                    <span className="text-xs font-medium">Issue Books</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-auto p-3 flex flex-col gap-1 items-center justify-center hover:border-primary"
                    onClick={() => {
                      setDistributionForm({ ...distributionForm, category: 'Uniforms' });
                      setDistributionDialogOpen(true);
                    }}
                  >
                    <Shirt className="h-5 w-5 text-indigo-500" />
                    <span className="text-xs font-medium">Issue Uniforms</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-auto p-3 flex flex-col gap-1 items-center justify-center hover:border-primary"
                    onClick={() => {
                      setDistributionForm({ ...distributionForm, category: 'Lab Equipment' });
                      setDistributionDialogOpen(true);
                    }}
                  >
                    <FlaskConical className="h-5 w-5 text-emerald-500" />
                    <span className="text-xs font-medium">Lab Items</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-auto p-3 flex flex-col gap-1 items-center justify-center hover:border-primary"
                    onClick={() => setReturnDialogOpen(true)}
                  >
                    <Package className="h-5 w-5 text-amber-500" />
                    <span className="text-xs font-medium">Return Items</span>
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
                <Button 
                  variant="outline" 
                  className="h-auto p-4 flex flex-col gap-2 items-center justify-center"
                  onClick={() => openReport('Usage Report')}
                >
                  <BarChart3 className="h-6 w-6 text-primary" />
                  <span className="text-xs font-medium">Usage Report</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto p-4 flex flex-col gap-2 items-center justify-center"
                  onClick={() => openReport('Wastage Report')}
                >
                  <AlertTriangle className="h-6 w-6 text-amber-500" />
                  <span className="text-xs font-medium">Wastage Report</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto p-4 flex flex-col gap-2 items-center justify-center"
                  onClick={() => openReport('Procurement')}
                >
                  <ShoppingCart className="h-6 w-6 text-blue-500" />
                  <span className="text-xs font-medium">Procurement</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto p-4 flex flex-col gap-2 items-center justify-center"
                  onClick={() => openReport('Student Distribution')}
                >
                  <Users className="h-6 w-6 text-green-500" />
                  <span className="text-xs font-medium">Student Distribution</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto p-4 flex flex-col gap-2 items-center justify-center"
                  onClick={handleExportAuditCSV}
                >
                  <Package className="h-6 w-6 text-purple-500" />
                  <span className="text-xs font-medium">Inventory Audit</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto p-4 flex flex-col gap-2 items-center justify-center"
                  onClick={() => openReport('Vendor Analysis')}
                >
                  <Building className="h-6 w-6 text-indigo-500" />
                  <span className="text-xs font-medium">Vendor Analysis</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CAMPUS STORE ORDERS TAB */}
        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-blue-500" />
                  Campus Store Orders ({storeOrders.length})
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Orders placed by students, parents, and staff via the campus store portal
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={loadStoreData}>
                Refresh Orders
              </Button>
            </CardHeader>
            <CardContent>
              {storeOrders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="font-medium text-foreground">No Store Orders Recorded</p>
                  <p className="text-xs mt-1">Orders placed by students or parents will automatically appear here in real time.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {storeOrders.map((order) => {
                    const statusColors: Record<string, string> = {
                      'Delivered': 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-300',
                      'Processing': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300',
                      'Pending': 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300',
                      'Cancelled': 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300',
                    };
                    const items = Array.isArray(order.items) ? order.items : [];

                    return (
                      <div key={order.id} className="p-4 border rounded-lg bg-card hover:bg-muted/30 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">Order #{order.id.slice(0, 8)}</span>
                              <Badge variant="outline" className={`text-xs ${statusColors[order.status] || ''}`}>
                                {order.status}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Placed on {order.created_at ? new Date(order.created_at).toLocaleString() : 'Recent'}
                              {order.user_name && ` • Customer: ${order.user_name}`}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="text-xs text-muted-foreground block">Order Total</span>
                              <span className="font-bold text-base text-primary">₹{Number(order.total_amount).toLocaleString()}</span>
                            </div>

                            <Select 
                              value={order.status} 
                              onValueChange={(val) => handleUpdateOrderStatus(order.id, val)}
                            >
                              <SelectTrigger className="w-[140px] h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Pending">Pending</SelectItem>
                                <SelectItem value="Processing">Processing</SelectItem>
                                <SelectItem value="Delivered">Delivered</SelectItem>
                                <SelectItem value="Cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-xs font-medium text-muted-foreground">Order Items:</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {items.map((it: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between p-2 rounded bg-muted/40 text-xs">
                                <span className="font-medium text-foreground">{it.name}</span>
                                <span className="text-muted-foreground">{it.quantity} × ₹{Number(it.price).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* STORE PRODUCTS CATALOG TAB */}
        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-indigo-500" />
                  Store Product Catalog & Stock Adjustments ({storeProducts.length})
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Active products displayed in the Student, Parent, and Campus Store
                </p>
              </div>
              <Button size="sm" onClick={() => setAddStoreProductDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                Add Store Product
              </Button>
            </CardHeader>
            <CardContent>
              {storeProducts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="font-medium text-foreground">No Store Products Listed</p>
                  <p className="text-xs mt-1">Click "Add Store Product" to create products for students and parents.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {storeProducts.map((prod) => {
                    const isOutOfStock = prod.stock <= 0;
                    return (
                      <div key={prod.id} className="p-4 border rounded-lg bg-card flex flex-col justify-between hover:shadow-sm transition-shadow">
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">{prod.category}</Badge>
                            <span className={`text-xs font-semibold ${isOutOfStock ? 'text-destructive' : 'text-emerald-600'}`}>
                              {isOutOfStock ? 'Out of Stock' : `${prod.stock} in stock`}
                            </span>
                          </div>
                          <h4 className="font-semibold text-sm line-clamp-2 mt-1">{prod.name}</h4>
                          <div className="text-lg font-bold text-foreground mt-2">
                            ₹{Number(prod.price).toLocaleString()}
                          </div>
                          {prod.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{prod.description}</p>
                          )}
                        </div>

                        <div className="border-t pt-3 mt-3 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Quick Stock Adjust:</span>
                          <div className="flex items-center gap-1.5">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-7 px-2 text-xs"
                              disabled={prod.stock <= 0}
                              onClick={() => handleAdjustProductStock(prod.id, prod.stock, -10)}
                            >
                              -10
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-7 px-2 text-xs"
                              onClick={() => handleAdjustProductStock(prod.id, prod.stock, 10)}
                            >
                              +10
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* DEPARTMENT INVENTORY AUDIT TAB */}
        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-emerald-500" />
                  Department Inventory Audit ({inventoryItems.length} items)
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Internal institutional consumable and equipment ledger
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportAuditCSV}>
                  <Download className="h-4 w-4 mr-1.5" />
                  Export CSV
                </Button>
                <Button size="sm" onClick={() => setAddItemDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  New Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {inventoryItems.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No Inventory Items</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-muted/50 text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Item Name</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3 text-right">Current Stock</th>
                        <th className="px-4 py-3 text-right">Min Stock</th>
                        <th className="px-4 py-3">Unit</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {inventoryItems.map((item) => {
                        const isLow = item.current_stock <= item.minimum_stock;
                        return (
                          <tr key={item.id} className="hover:bg-muted/30">
                            <td className="px-4 py-3 font-medium">{item.name}</td>
                            <td className="px-4 py-3 text-muted-foreground">{item.category}</td>
                            <td className={`px-4 py-3 text-right font-bold ${isLow ? 'text-destructive' : 'text-foreground'}`}>
                              {item.current_stock}
                            </td>
                            <td className="px-4 py-3 text-right text-muted-foreground">{item.minimum_stock}</td>
                            <td className="px-4 py-3 text-muted-foreground">{item.unit}</td>
                            <td className="px-4 py-3">
                              <Badge variant={isLow ? 'destructive' : 'outline'} className="capitalize text-xs">
                                {isLow ? 'Low Stock' : 'Adequate'}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add New Item Dialog */}
      <Dialog open={addItemDialogOpen} onOpenChange={setAddItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Inventory Catalog Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddItem} className="space-y-4">
            <div>
              <Label>Item Name</Label>
              <Input
                placeholder="e.g. Clinical Pathology Manual, College Lab Coat (M)"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select 
                  value={newItem.category} 
                  onValueChange={(val) => setNewItem({ ...newItem, category: val })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Books">Books & Manuals</SelectItem>
                    <SelectItem value="Uniform">Uniforms & Apparel</SelectItem>
                    <SelectItem value="Science Lab">Science Lab Equipment</SelectItem>
                    <SelectItem value="Stationery">Stationery</SelectItem>
                    <SelectItem value="Sports">Sports Equipment</SelectItem>
                    <SelectItem value="IT">IT Hardware & Tech</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Unit of Measurement</Label>
                <Input
                  placeholder="Units, Pieces, Sets, Reams"
                  value={newItem.unit}
                  onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Initial Stock</Label>
                <Input
                  type="number"
                  min="0"
                  value={newItem.current_stock}
                  onChange={(e) => setNewItem({ ...newItem, current_stock: Number(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label>Minimum Stock Alert Level</Label>
                <Input
                  type="number"
                  min="1"
                  value={newItem.minimum_stock}
                  onChange={(e) => setNewItem({ ...newItem, minimum_stock: Number(e.target.value) })}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddItemDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Item
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Purchase Order Dialog */}
      <Dialog open={purchaseOrderDialogOpen} onOpenChange={setPurchaseOrderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Vendor Purchase Order</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreatePO} className="space-y-4">
            <div>
              <Label>Item Name</Label>
              <Input
                placeholder="e.g. Diagnostic Reagent Kits, College Lab Coats, Syringes"
                value={newPO.item_name}
                onChange={(e) => setNewPO({ ...newPO, item_name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Quantity to Order</Label>
                <Input
                  type="number"
                  min="1"
                  value={newPO.quantity}
                  onChange={(e) => setNewPO({ ...newPO, quantity: Number(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label>Vendor / Supplier Name</Label>
                <Input
                  placeholder="e.g. Academic Publishers Ltd"
                  value={newPO.supplier}
                  onChange={(e) => setNewPO({ ...newPO, supplier: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <Label>Department / Category</Label>
              <Input
                placeholder="e.g. Academic Store, Science Lab"
                value={newPO.category}
                onChange={(e) => setNewPO({ ...newPO, category: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPurchaseOrderDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Submit Purchase Order
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Item Distribution Dialog */}
      <Dialog open={distributionDialogOpen} onOpenChange={setDistributionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fast Student Resource Distribution</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDistributeItem} className="space-y-4">
            <div>
              <Label>Item Name</Label>
              <Input
                placeholder="Select or enter item name"
                value={distributionForm.item_name}
                onChange={(e) => setDistributionForm({ ...distributionForm, item_name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Recipient Student (Search by Student ID or Name) *</Label>
              <StudentSearchSelect
                placeholder="Search by AIP Student ID or Name..."
                onSelect={(st) => {
                  if (st) {
                    setDistributionForm(prev => ({
                      ...prev,
                      student_name: `${st.name} (${st.student_id || st.roll_number || 'AIP-VERIFIED'})`,
                    }));
                  }
                }}
              />
              {distributionForm.student_name && (
                <p className="text-xs text-muted-foreground mt-1">
                  Recipient: <span className="font-semibold text-primary">{distributionForm.student_name}</span>
                </p>
              )}
            </div>
            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                min="1"
                value={distributionForm.quantity}
                onChange={(e) => setDistributionForm({ ...distributionForm, quantity: Number(e.target.value) })}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDistributionDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Confirm Issue & Deduct Stock
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Return Item Dialog */}
      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return Item to Stock</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleReturnItem} className="space-y-4">
            <div>
              <Label>Item Name</Label>
              <Input
                placeholder="e.g. Lab Kit, Library Manual"
                value={returnForm.item_name}
                onChange={(e) => setReturnForm({ ...returnForm, item_name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Returned By (Student / Staff)</Label>
                <Input
                  placeholder="e.g. Priya Patel"
                  value={returnForm.student_name}
                  onChange={(e) => setReturnForm({ ...returnForm, student_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={returnForm.quantity}
                  onChange={(e) => setReturnForm({ ...returnForm, quantity: Number(e.target.value) })}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReturnDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Restock Item
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Barcode Scanner Simulator Dialog */}
      <Dialog open={scannerDialogOpen} onOpenChange={setScannerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scan className="h-5 w-5" />
              Barcode / QR Scanner Terminal
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted/40 rounded-lg text-center border-2 border-dashed">
              <Scan className="h-10 w-10 mx-auto text-primary animate-pulse mb-2" />
              <p className="text-sm font-medium">Ready to scan item barcode or student QR</p>
              <p className="text-xs text-muted-foreground mt-1">
                Scan or type the item name/code below to initiate fast distribution
              </p>
            </div>
            <div>
              <Label>Barcode / SKU / Item Name</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder="Enter or scan code (e.g. Paper, Markers, Lab)..."
                  value={scannedBarcode}
                  onChange={(e) => setScannedBarcode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleBarcodeLookup()}
                />
                <Button onClick={handleBarcodeLookup}>
                  Lookup
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Predefined Report View Dialog */}
      <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{reportTitle}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[350px] overflow-y-auto space-y-2">
            {reportData.length === 0 ? (
              <p className="text-center py-8 text-sm text-muted-foreground">No records logged for {reportTitle}.</p>
            ) : (
              reportData.map((row: any, idx: number) => (
                <div key={idx} className="p-3 border rounded-lg flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">{row.item_name || row.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.department ? `Dept/Student: ${row.department}` : ''} 
                      {row.supplier ? ` • Supplier: ${row.supplier}` : ''}
                      {row.created_at ? ` • ${new Date(row.created_at).toLocaleDateString()}` : ''}
                    </div>
                  </div>
                  <Badge variant="outline">
                    {row.quantity !== undefined ? `Qty: ${row.quantity}` : `Stock: ${row.current_stock}`}
                  </Badge>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setReportModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Add Store Product Dialog */}
      <Dialog open={addStoreProductDialogOpen} onOpenChange={setAddStoreProductDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Store Product</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateStoreProduct} className="space-y-4">
            <div>
              <Label>Product Name</Label>
              <Input
                placeholder="e.g. Paramedical Scrub Suit, Pulse Oximeter..."
                value={newStoreProduct.name}
                onChange={(e) => setNewStoreProduct({ ...newStoreProduct, name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select
                  value={newStoreProduct.category}
                  onValueChange={(val) => setNewStoreProduct({ ...newStoreProduct, category: val })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Uniform & Apparel">Uniform & Apparel</SelectItem>
                    <SelectItem value="Clinical Equipment">Clinical Equipment</SelectItem>
                    <SelectItem value="Diagnostics & Electronics">Diagnostics & Electronics</SelectItem>
                    <SelectItem value="Textbooks & Records">Textbooks & Records</SelectItem>
                    <SelectItem value="Stationery">Stationery</SelectItem>
                    <SelectItem value="Consumables">Consumables</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Price (₹)</Label>
                <Input
                  type="number"
                  min="1"
                  value={newStoreProduct.price}
                  onChange={(e) => setNewStoreProduct({ ...newStoreProduct, price: Number(e.target.value) })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Initial Stock</Label>
                <Input
                  type="number"
                  min="0"
                  value={newStoreProduct.stock}
                  onChange={(e) => setNewStoreProduct({ ...newStoreProduct, stock: Number(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  placeholder="Clinical purpose, sizes, or notes"
                  value={newStoreProduct.description}
                  onChange={(e) => setNewStoreProduct({ ...newStoreProduct, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddStoreProductDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Publish Product
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
