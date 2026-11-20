import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { 
  ArrowLeft, 
  ShoppingCart, 
  Search, 
  Filter, 
  Star, 
  Loader2, 
  Package, 
  Settings, 
  Plus, 
  Clock, 
  CheckCircle2, 
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  Zap,
  Truck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { CartDialog } from '@/components/store/CartDialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/supabase/database';
import { StoreProduct, StoreOrder } from '@/types/database.types';
import { ROLE_CONFIGS } from '@/config/roles';

const CATEGORY_IMAGES: Record<string, string> = {
  'Textbooks': 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
  'Textbooks & Records': 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
  'Diagnostics & Electronics': 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=600&auto=format&fit=crop&q=80',
  'Electronics': 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=600&auto=format&fit=crop&q=80',
  'Stationery': 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=600&auto=format&fit=crop&q=80',
  'Uniform & Apparel': 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&auto=format&fit=crop&q=80',
  'Uniform': 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&auto=format&fit=crop&q=80',
  'Clinical Equipment': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80',
  'Consumables': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80',
};

function getProductImage(product: StoreProduct): string {
  if (product.image_url && !product.image_url.includes('placeholder.svg')) {
    return product.image_url;
  }
  const categoryKey = Object.keys(CATEGORY_IMAGES).find(k => 
    (product.category || '').toLowerCase().includes(k.toLowerCase()) ||
    (product.name || '').toLowerCase().includes(k.toLowerCase())
  );
  return categoryKey ? CATEGORY_IMAGES[categoryKey] : 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=600&auto=format&fit=crop&q=80';
}

const STORE_CATEGORIES = [
  'All',
  'Uniform & Apparel',
  'Clinical Equipment',
  'Diagnostics & Electronics',
  'Textbooks & Records',
  'Stationery',
  'Consumables',
];

const Store = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'catalog' | 'orders'>('catalog');
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Cart
  const [cart, setCart] = useState<any[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Buy Now modal state
  const [buyNowProduct, setBuyNowProduct] = useState<StoreProduct | null>(null);
  const [buyNowQty, setBuyNowQty] = useState<number>(1);
  const [buyNowModalOpen, setBuyNowModalOpen] = useState(false);
  const [submittingBuyNow, setSubmittingBuyNow] = useState(false);

  // Add Product modal state (for Store Managers / Admin)
  const isStoreAdmin = ['admin', 'store_manager', 'storekeeper'].includes(user?.role || '');
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [newProductForm, setNewProductForm] = useState({
    name: '',
    category: 'Clinical Equipment',
    price: 500,
    stock: 50,
    description: '',
    image_url: '',
    rating: 4.8
  });

  const fetchProducts = useCallback(async () => {
    try {
      const remoteProducts = await db.getStoreProducts();
      setProducts(remoteProducts || []);
    } catch (err) {
      console.warn('Failed to load store products:', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    if (!user?.id) return;
    setOrdersLoading(true);
    try {
      if (isStoreAdmin) {
        // Store Manager & Admin see all campus orders
        const allOrders = await db.getStoreOrders();
        setOrders(allOrders || []);
      } else {
        // Students, Parents & Staff see their own orders
        const userOrders = await db.getUserStoreOrders(user.id);
        setOrders(userOrders || []);
      }
    } catch (err) {
      console.warn('Failed to fetch store orders:', err);
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, [user?.id, isStoreAdmin]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    }
  }, [activeTab, fetchOrders]);

  useRealtimeSubscription({
    table: 'store_products',
    onChange: fetchProducts,
    onReconnect: fetchProducts,
  });

  useRealtimeSubscription({
    table: 'store_orders',
    onChange: () => {
      fetchProducts();
      if (activeTab === 'orders') fetchOrders();
    },
    onReconnect: () => {
      fetchProducts();
      if (activeTab === 'orders') fetchOrders();
    },
  });

  const addToCart = (product: StoreProduct) => {
    if (product.stock <= 0) {
      toast({
        title: 'Out of Stock',
        description: `Sorry, ${product.name} is currently out of stock.`,
        variant: 'destructive',
      });
      return;
    }

    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        toast({
          title: 'Max Stock Reached',
          description: `Only ${product.stock} units of ${product.name} are available in the store.`,
          variant: 'destructive',
        });
        return;
      }
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { 
        id: product.id,
        name: product.name,
        price: Number(product.price),
        category: product.category,
        image: getProductImage(product),
        stock: product.stock,
        quantity: 1 
      }]);
    }

    toast({
      title: 'Added to cart',
      description: `${product.name} has been added to your cart.`,
    });
  };

  const updateCartQuantity = (id: any, quantity: number) => {
    const product = products.find(p => p.id === id);
    if (product && quantity > product.stock) {
      toast({
        title: 'Max Stock Reached',
        description: `Cannot exceed available stock of ${product.stock} units.`,
        variant: 'destructive',
      });
      return;
    }

    setCart(cart.map(item => 
      item.id === id ? { ...item, quantity } : item
    ));
  };

  const removeFromCart = (id: any) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Buy Now flow
  const handleInitiateBuyNow = (product: StoreProduct) => {
    if (!user?.id) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to make a purchase from the campus store.',
        variant: 'destructive'
      });
      return;
    }
    setBuyNowProduct(product);
    setBuyNowQty(1);
    setBuyNowModalOpen(true);
  };

  const handleConfirmBuyNow = async () => {
    if (!user?.id || !buyNowProduct) return;
    setSubmittingBuyNow(true);
    try {
      const price = Number(buyNowProduct.price) || 0;
      const totalAmount = price * buyNowQty;

      const res = await db.placeStoreOrderAtomic({
        userId: user.id,
        userName: user.name || 'Campus Student',
        items: [{
          id: buyNowProduct.id,
          name: buyNowProduct.name,
          price: price,
          quantity: buyNowQty
        }],
        totalAmount
      });

      if (!res.success) {
        toast({
          title: 'Order Placement Failed',
          description: res.error || 'Failed to place order. Please check stock.',
          variant: 'destructive'
        });
        return;
      }

      toast({
        title: 'Order Placed Successfully! 🎉',
        description: `Your order for ${buyNowQty}x ${buyNowProduct.name} (Total: ₹${totalAmount.toLocaleString()}) has been placed.`,
      });

      setBuyNowModalOpen(false);
      setBuyNowProduct(null);
      fetchProducts();
      setActiveTab('orders');
    } catch (err: any) {
      toast({
        title: 'Checkout Error',
        description: err.message || 'An error occurred during order placement.',
        variant: 'destructive'
      });
    } finally {
      setSubmittingBuyNow(false);
    }
  };

  // Create Product flow (Store Admin)
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductForm.name.trim() || newProductForm.price <= 0) {
      toast({ title: 'Validation Error', description: 'Please provide a valid product name and price.', variant: 'destructive' });
      return;
    }
    setCreatingProduct(true);
    try {
      const created = await db.createStoreProduct({
        name: newProductForm.name.trim(),
        category: newProductForm.category,
        price: Number(newProductForm.price),
        stock: Number(newProductForm.stock),
        description: newProductForm.description.trim(),
        image_url: newProductForm.image_url.trim() || undefined,
        rating: 4.8
      });

      if (created) {
        toast({ title: 'Product Published', description: `${created.name} is now live in the campus store!` });
        setAddProductOpen(false);
        setNewProductForm({
          name: '',
          category: 'Clinical Equipment',
          price: 500,
          stock: 50,
          description: '',
          image_url: '',
          rating: 4.8
        });
        fetchProducts();
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setCreatingProduct(false);
    }
  };

  // Update Order Status (Store Admin)
  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const ok = await db.updateStoreOrderStatus(orderId, newStatus);
      if (ok) {
        toast({ title: 'Order Status Updated', description: `Order marked as ${newStatus}.` });
        fetchOrders();
      } else {
        toast({ title: 'Update Failed', description: 'Could not update order status.', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesCategory = selectedCategory === 'All' || 
        product.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const handleBack = () => {
    if (window.history.state?.idx > 0) {
      navigate(-1);
    } else {
      const userHome = user ? (ROLE_CONFIGS[user.role]?.home || `/dashboard/${user.role}`) : '/';
      navigate(userHome, { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Banner / Navigation */}
      <div className="border-b bg-card shadow-sm sticky top-0 z-30">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleBack}
                className="h-9"
              >
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Dashboard
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    Adithyan College Store
                  </h1>
                  {isStoreAdmin && (
                    <Badge variant="outline" className="hidden sm:inline-flex items-center gap-1 bg-primary/10 text-primary border-primary/20 text-xs">
                      <ShieldCheck className="w-3 h-3" />
                      Store Management Active
                    </Badge>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Paramedical uniforms, clinical equipment, diagnostic kits, textbooks & records
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {isStoreAdmin && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-9"
                    onClick={() => navigate('/admin/store')}
                  >
                    <Settings className="h-4 w-4 mr-1.5" />
                    Store Hub
                  </Button>
                  <Button 
                    size="sm"
                    className="h-9"
                    onClick={() => setAddProductOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Add Product
                  </Button>
                </>
              )}
              <Button 
                className="relative h-9" 
                onClick={() => setCartOpen(true)}
              >
                <ShoppingCart className="h-4 w-4 mr-1.5" />
                Cart
                {cart.length > 0 && (
                  <Badge className="ml-1.5 px-1.5 py-0 h-5 text-xs bg-primary-foreground text-primary">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
            <TabsList className="grid w-full sm:w-[320px] grid-cols-2">
              <TabsTrigger value="catalog" className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                Product Catalog ({products.length})
              </TabsTrigger>
              <TabsTrigger value="orders" className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                {isStoreAdmin ? 'Campus Orders' : 'My Orders'}
              </TabsTrigger>
            </TabsList>

            {activeTab === 'catalog' && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input 
                    placeholder="Search equipment, uniforms, books..." 
                    className="pl-9 h-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full sm:w-[200px] h-9">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {STORE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* CATALOG TAB */}
          <TabsContent value="catalog" className="space-y-6 mt-0">
            {loading ? (
              <div className="flex flex-col justify-center items-center py-20 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-3 text-primary" />
                <p className="text-sm">Loading college store catalog...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground border rounded-lg bg-card/50">
                <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-40 text-muted-foreground" />
                <p className="text-lg font-medium text-foreground">No Products Found</p>
                <p className="text-sm mt-1 max-w-md mx-auto">
                  No products matched your search or category filter. Try selecting "All" or a different category.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4"
                  onClick={() => { setSelectedCategory('All'); setSearchQuery(''); }}
                >
                  Reset Filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map((product) => {
                  const imageSrc = getProductImage(product);
                  const isOutOfStock = product.stock <= 0;

                  return (
                    <Card key={product.id} className="overflow-hidden flex flex-col hover:shadow-md transition-shadow border">
                      <div className="aspect-[4/3] bg-muted relative overflow-hidden group">
                        <img 
                          src={imageSrc} 
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                        <Badge 
                          className="absolute top-2.5 right-2.5 backdrop-blur-sm bg-background/80 text-foreground border shadow-sm text-xs"
                        >
                          {product.category}
                        </Badge>
                        {isOutOfStock && (
                          <div className="absolute inset-0 bg-background/70 backdrop-blur-[2px] flex items-center justify-center">
                            <Badge variant="destructive" className="text-sm px-3 py-1 font-semibold">
                              Out of Stock
                            </Badge>
                          </div>
                        )}
                      </div>

                      <CardHeader className="p-4 pb-2 flex-1">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center text-amber-500 text-xs">
                            <Star className="h-3.5 w-3.5 fill-amber-500 mr-1" />
                            <span className="font-medium">{product.rating || 4.8}</span>
                          </div>
                          <span className={`text-xs font-medium ${isOutOfStock ? 'text-destructive' : 'text-emerald-600'}`}>
                            {isOutOfStock ? 'Out of Stock' : `${product.stock} in stock`}
                          </span>
                        </div>
                        <CardTitle className="text-base font-semibold leading-tight line-clamp-2">
                          {product.name}
                        </CardTitle>
                        {product.description && (
                          <CardDescription className="text-xs line-clamp-2 mt-1">
                            {product.description}
                          </CardDescription>
                        )}
                      </CardHeader>

                      <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold text-foreground">
                          ₹{Number(product.price).toLocaleString()}
                        </div>
                      </CardContent>

                      <CardFooter className="p-4 pt-0 grid grid-cols-2 gap-2">
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => addToCart(product)}
                          disabled={isOutOfStock}
                          className="w-full text-xs"
                        >
                          <ShoppingCart className="w-3.5 h-3.5 mr-1" />
                          Cart
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => handleInitiateBuyNow(product)}
                          disabled={isOutOfStock}
                          className="w-full text-xs"
                        >
                          <Zap className="w-3.5 h-3.5 mr-1" />
                          Buy Now
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ORDERS TAB */}
          <TabsContent value="orders" className="space-y-4 mt-0">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">
                  {isStoreAdmin ? 'Campus Store Orders Management' : 'Your Order History'}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {isStoreAdmin 
                    ? 'Review, verify, and fulfill orders placed by students, parents, and staff'
                    : 'Track the status and collection details of your campus store orders'
                  }
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchOrders} disabled={ordersLoading}>
                {ordersLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Refresh
              </Button>
            </div>

            {ordersLoading ? (
              <div className="flex justify-center items-center py-16 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mr-2 text-primary" />
                <span>Loading orders...</span>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground border rounded-lg bg-card/50">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="text-base font-medium text-foreground">No Orders Found</p>
                <p className="text-xs mt-1">
                  {isStoreAdmin 
                    ? 'No orders have been placed in the campus store yet.'
                    : 'You have not placed any orders yet. Browse the catalog to purchase supplies.'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => {
                  const statusColors: Record<string, string> = {
                    'Delivered': 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-300',
                    'Processing': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300',
                    'Pending': 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300',
                    'Cancelled': 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300',
                  };

                  const itemsList = Array.isArray(order.items) ? order.items : [];

                  return (
                    <Card key={order.id} className="p-4 border">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">Order #{order.id.slice(0, 8)}</span>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${statusColors[order.status] || ''}`}
                            >
                              {order.status}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Placed on {order.created_at ? new Date(order.created_at).toLocaleString() : 'Recent'} 
                            {order.user_name && ` • By ${order.user_name}`}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-xs text-muted-foreground block">Total Paid</span>
                            <span className="font-bold text-base text-primary">₹{Number(order.total_amount).toLocaleString()}</span>
                          </div>

                          {isStoreAdmin && (
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
                          )}
                        </div>
                      </div>

                      {/* Items */}
                      <div className="space-y-1.5">
                        <div className="text-xs font-medium text-muted-foreground">Order Items:</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {itemsList.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-2 rounded bg-muted/40 text-xs">
                              <span className="font-medium text-foreground">{item.name}</span>
                              <span className="text-muted-foreground">
                                {item.quantity} × ₹{Number(item.price).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Cart Dialog */}
      <CartDialog
        open={cartOpen}
        onOpenChange={setCartOpen}
        items={cart}
        onUpdateQuantity={updateCartQuantity}
        onRemoveItem={removeFromCart}
        onClearCart={clearCart}
      />

      {/* Buy Now Modal */}
      <Dialog open={buyNowModalOpen} onOpenChange={setBuyNowModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Quick Checkout</DialogTitle>
            <DialogDescription>
              Confirm and place your order directly from the college store.
            </DialogDescription>
          </DialogHeader>

          {buyNowProduct && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
                <img 
                  src={getProductImage(buyNowProduct)} 
                  alt={buyNowProduct.name}
                  className="w-16 h-16 object-cover rounded border"
                />
                <div className="flex-1">
                  <h4 className="font-medium text-sm leading-tight">{buyNowProduct.name}</h4>
                  <Badge variant="outline" className="text-xs mt-1">{buyNowProduct.category}</Badge>
                  <div className="font-bold text-primary mt-1">₹{Number(buyNowProduct.price).toLocaleString()} each</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Quantity</Label>
                <div className="flex items-center gap-3">
                  <Input 
                    type="number" 
                    min="1" 
                    max={buyNowProduct.stock} 
                    value={buyNowQty} 
                    onChange={(e) => setBuyNowQty(Math.max(1, Math.min(buyNowProduct.stock, Number(e.target.value))))}
                    className="w-24"
                  />
                  <span className="text-xs text-muted-foreground">
                    Available stock: {buyNowProduct.stock} units
                  </span>
                </div>
              </div>

              <div className="p-3 border rounded-lg space-y-1.5 text-sm bg-card">
                <div className="flex justify-between text-muted-foreground text-xs">
                  <span>Subtotal</span>
                  <span>₹{(Number(buyNowProduct.price) * buyNowQty).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted-foreground text-xs">
                  <span>Campus Delivery / Counter Pickup</span>
                  <span className="text-emerald-600 font-medium">Free</span>
                </div>
                <div className="border-t pt-1.5 flex justify-between font-bold text-base text-foreground">
                  <span>Total Amount</span>
                  <span className="text-primary">₹{(Number(buyNowProduct.price) * buyNowQty).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setBuyNowModalOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmBuyNow} disabled={submittingBuyNow}>
              {submittingBuyNow ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirm & Place Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Product Dialog (Store Admin) */}
      <Dialog open={addProductOpen} onOpenChange={setAddProductOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Campus Store Product</DialogTitle>
            <DialogDescription>
              Publish a new official uniform, kit, equipment, or textbook to the college store.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateProduct} className="space-y-4">
            <div>
              <Label>Product Name *</Label>
              <Input 
                placeholder="e.g. Paramedical Scrub Suit, Pulse Oximeter..."
                value={newProductForm.name}
                onChange={(e) => setNewProductForm({ ...newProductForm, name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select 
                  value={newProductForm.category} 
                  onValueChange={(val) => setNewProductForm({ ...newProductForm, category: val })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STORE_CATEGORIES.slice(1).map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Price (₹) *</Label>
                <Input 
                  type="number"
                  min="1"
                  value={newProductForm.price}
                  onChange={(e) => setNewProductForm({ ...newProductForm, price: Number(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Initial Stock *</Label>
                <Input 
                  type="number"
                  min="0"
                  value={newProductForm.stock}
                  onChange={(e) => setNewProductForm({ ...newProductForm, stock: Number(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label>Image URL (Optional)</Label>
                <Input 
                  placeholder="https://images.unsplash..."
                  value={newProductForm.image_url}
                  onChange={(e) => setNewProductForm({ ...newProductForm, image_url: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Input 
                placeholder="Specifications, size details, or department requirement..."
                value={newProductForm.description}
                onChange={(e) => setNewProductForm({ ...newProductForm, description: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddProductOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={creatingProduct}>
                {creatingProduct ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Publish to Store
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Store;
