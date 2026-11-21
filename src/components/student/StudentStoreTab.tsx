import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ShoppingCart, 
  Search, 
  Filter, 
  Package, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ShoppingBag, 
  X, 
  Plus, 
  Minus,
  Loader2,
  RefreshCw,
  Receipt,
  Star,
  Zap,
  Truck,
  BookOpen,
  FileText
} from 'lucide-react';
import { payOnline } from '@/lib/onlinePay';
import { db } from '@/services/supabase/database';
import { useAuth } from '@/context/AuthContext';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { StoreProduct, StoreOrder } from '@/types/database.types';
import { useToast } from '@/hooks/use-toast';
import { askConfirm, askText } from '@/lib/dialogs';

const CATEGORY_ICONS: Record<string, any> = {
  'Textbooks': BookOpen,
  'Electronics': Zap,
  'Stationery': FileText,
  'Uniform': Package,
  'Apparel': Package,
  'Uniform & Apparel': Package,
  'Lab Supplies': Zap,
  'Sports': Star,
};

function ProductThumbnail({ product }: { product: StoreProduct }) {
  const [imgError, setImgError] = useState(false);
  const hasRealImage = product.image_url && !product.image_url.includes('unsplash.com') && !product.image_url.includes('placeholder.svg');

  if (hasRealImage && !imgError) {
    return (
      <img 
        src={product.image_url} 
        alt={product.name} 
        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
        loading="lazy"
        onError={() => setImgError(true)}
      />
    );
  }

  const catLower = (product.category || '').toLowerCase();
  const matchedKey = Object.keys(CATEGORY_ICONS).find(k => catLower.includes(k.toLowerCase())) || 'Stationery';
  const Icon = CATEGORY_ICONS[matchedKey] || ShoppingBag;

  return (
    <div className="w-full h-full bg-gradient-to-tr from-slate-100 via-blue-50/50 to-indigo-50/60 flex flex-col items-center justify-center p-6 text-center select-none group-hover:scale-105 transition-transform duration-500">
      <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center text-[#1D61E7] mb-2 group-hover:shadow-md transition-shadow">
        <Icon className="w-7 h-7" />
      </div>
      <span className="text-xs font-bold text-slate-800 line-clamp-1 max-w-[180px]">
        {product.name}
      </span>
      <span className="text-[10px] text-slate-400 font-medium">
        {product.category || 'Official Campus Store'}
      </span>
    </div>
  );
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
}

export function StudentStoreTab() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'catalog' | 'orders'>('catalog');
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Buy Now Modal State
  const [buyNowProduct, setBuyNowProduct] = useState<StoreProduct | null>(null);
  const [buyNowQty, setBuyNowQty] = useState<number>(1);
  const [buyNowModalOpen, setBuyNowModalOpen] = useState(false);
  const [buyNowPaymentMode, setBuyNowPaymentMode] = useState<string>('Online_UPI');

  const handleInitiateBuyNow = (product: StoreProduct) => {
    setBuyNowProduct(product);
    setBuyNowQty(1);
    setBuyNowModalOpen(true);
  };

  const handleConfirmBuyNow = async () => {
    if (!user?.id || !buyNowProduct) return;
    setSubmittingOrder(true);
    try {
      const singlePrice = Number(buyNowProduct.price) || 0;
      const totalCost = singlePrice * buyNowQty;

      const orderPayload = {
        userId: user.id,
        userName: user.name || 'Student',
        items: [{
          id: buyNowProduct.id,
          name: buyNowProduct.name,
          price: singlePrice,
          quantity: buyNowQty,
        }],
        totalAmount: totalCost,
      };

      const result = await db.placeStoreOrderAtomic(orderPayload);
      if (result.success) {
        toast({
          title: 'Instant Order Confirmed',
          description: `Purchased ${buyNowQty}x ${buyNowProduct.name} for ₹${totalCost.toFixed(0)}.`,
        });
        setBuyNowModalOpen(false);
        setBuyNowProduct(null);
        setActiveTab('orders');
        loadData();
      } else {
        throw new Error(result.error || 'Failed to complete instant purchase.');
      }
    } catch (err: any) {
      toast({
        title: 'Purchase Failed',
        description: err.message || 'Unable to complete order.',
        variant: 'destructive',
      });
    } finally {
      setSubmittingOrder(false);
    }
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [productList, orderList] = await Promise.all([
        db.getStoreProducts(),
        user?.id ? db.getUserStoreOrders(user.id) : Promise.resolve([]),
      ]);
      setProducts(productList || []);
      setOrders(orderList || []);
    } catch (err) {
      console.warn('Failed to load store data:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useRealtimeSubscription({
    table: 'store_products',
    onChange: loadData,
    onReconnect: loadData,
  });

  useRealtimeSubscription({
    table: 'store_orders',
    onChange: loadData,
    onReconnect: loadData,
  });

  // Categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return ['All', ...Array.from(set)];
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, categoryFilter]);

  // Cart handlers
  const handleAddToCart = (product: StoreProduct) => {
    if (product.stock <= 0) return;
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast({
            title: 'Max Stock Reached',
            description: `Only ${product.stock} units available.`,
            variant: 'destructive',
          });
          return prev;
        }
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        id: product.id,
        name: product.name,
        price: Number(product.price) || 0,
        quantity: 1,
        stock: product.stock,
      }];
    });

    toast({
      title: 'Added to Cart',
      description: `${product.name} added to your bag.`,
    });
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === productId) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          if (newQty > item.stock) return item;
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(Boolean) as CartItem[];
    });
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const cartItemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const [onlineEnabled, setOnlineEnabled] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  useEffect(() => { db.getInstitutionalSettings().then((i: any) => setOnlineEnabled(i?.online_payments_enabled === true)).catch(() => setOnlineEnabled(false)); }, []);
  const payOrder = async (orderId: string) => {
    setPayingId(orderId);
    try {
      const r = await payOnline({ store_order_id: orderId }, 'Campus store order');
      if (r.status === 'paid') toast({ title: 'Payment received', description: 'Your order is paid.' });
      else if (r.status === 'pending') toast({ title: 'Payment is being confirmed', description: r.message });
      else if (r.status === 'failed') toast({ title: 'Payment failed', description: r.message, variant: 'destructive' });
      await loadData();
    } catch (e: any) { toast({ title: 'Payment not started', description: e.message, variant: 'destructive' }); }
    finally { setPayingId(null); }
  };
  const cancelOrder = async (orderId: string) => {
    if (!(await askConfirm('Cancel this order? Its items go back to stock.', { title: 'Cancel order', confirmLabel: 'Cancel order', cancelLabel: 'Keep order', destructive: true }))) return;
    try { await db.updateStoreOrderStatus(orderId, 'Cancelled'); toast({ title: 'Order cancelled' }); await loadData(); }
    catch (e: any) { toast({ title: 'Not cancelled', description: e.message, variant: 'destructive' }); }
  };

  const handleCheckout = async () => {
    if (!user?.id || cart.length === 0) return;
    setSubmittingOrder(true);
    try {
      const orderPayload = {
        userId: user.id,
        userName: user.name || 'Student',
        items: cart.map(i => ({
          id: i.id,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
        })),
        totalAmount: cartTotal,
      };

      const result = await db.placeStoreOrderAtomic(orderPayload);
      if (result.success) {
        toast({
          title: 'Order Placed Successfully',
          description: `Order total ₹${cartTotal.toFixed(2)}. Track status in "My Orders".`,
        });
        setCart([]);
        setCartOpen(false);
        setActiveTab('orders');
        loadData();
      } else {
        throw new Error(result.error || 'Failed to complete order.');
      }
    } catch (err: any) {
      toast({
        title: 'Checkout Failed',
        description: err.message || 'Unable to place order.',
        variant: 'destructive',
      });
    } finally {
      setSubmittingOrder(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 border border-border rounded-xl">
        <div className="flex items-center space-x-2.5">
          <ShoppingBag className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-xl font-bold text-foreground">Campus Store & Supplies</h2>
            <p className="text-xs text-muted-foreground">
              Official books, lab manuals, stationery, and uniforms managed by Store Manager
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
            <TabsList className="h-8 bg-muted/60 p-0.5 text-xs">
              <TabsTrigger value="catalog" className="text-[11px] px-3">
                <Package className="w-3.5 h-3.5 mr-1" /> Catalog ({products.length})
              </TabsTrigger>
              <TabsTrigger value="orders" className="text-[11px] px-3">
                <Receipt className="w-3.5 h-3.5 mr-1" /> My Orders ({orders.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {activeTab === 'catalog' && (
            <Button
              size="sm"
              variant={cart.length > 0 ? 'default' : 'outline'}
              className="h-8 text-xs relative"
              onClick={() => setCartOpen(true)}
            >
              <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />
              Cart ({cartItemCount})
              {cartItemCount > 0 && (
                <span className="ml-1.5 font-bold">₹{cartTotal.toFixed(0)}</span>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* CATALOG TAB */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search products by title, subject, or equipment..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9 bg-white"
              />
            </div>
            <div className="w-full sm:w-48">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="text-xs h-9 bg-white">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat} className="text-xs">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-2 bg-white border border-border rounded-xl">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Loading campus inventory...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <Card className="bg-white border-border text-center py-12">
              <CardContent className="space-y-3">
                <Package className="w-12 h-12 mx-auto text-muted-foreground/30" />
                <h4 className="text-sm font-semibold text-foreground">No Products Match Your Filter</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Try adjusting your search keywords or switching category filters.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredProducts.map((product) => {
                const inCart = cart.find(i => i.id === product.id);
                const isOutOfStock = product.stock <= 0;
                const isLowStock = product.stock > 0 && product.stock <= 5;
                const mrp = Math.round(product.price * 1.25);
                const discount = Math.round(((mrp - product.price) / mrp) * 100);

                return (
                  <div 
                    key={product.id} 
                    className="group bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-lg hover:border-[#1D61E7]/40 transition-all duration-300 flex flex-col justify-between overflow-hidden"
                  >
                    {/* Top E-Commerce Image & Badges Container */}
                    <div>
                      <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                        <ProductThumbnail product={product} />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/30 via-transparent to-transparent pointer-events-none" />

                        {/* Top Left Category Pill */}
                        <div className="absolute top-2.5 left-2.5">
                          <Badge className="bg-white/95 backdrop-blur-md text-slate-800 border border-slate-200 shadow-2xs text-[10px] font-bold px-2 py-0.5">
                            {product.category || 'Supplies'}
                          </Badge>
                        </div>

                        {/* Top Right Discount Tag */}
                        {discount > 0 && (
                          <div className="absolute top-2.5 right-2.5">
                            <Badge className="bg-rose-500 text-white font-bold text-[10px] px-2 py-0.5 shadow-sm">
                              {discount}% OFF
                            </Badge>
                          </div>
                        )}

                        {/* Bottom Floating Stock Pill */}
                        <div className="absolute bottom-2.5 left-2.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold shadow-2xs backdrop-blur-md ${
                            isOutOfStock 
                              ? 'bg-rose-500/90 text-white' 
                              : isLowStock 
                              ? 'bg-amber-500/90 text-white' 
                              : 'bg-emerald-600/90 text-white'
                          }`}>
                            {isOutOfStock ? 'Sold Out' : isLowStock ? `Only ${product.stock} left!` : 'In Stock'}
                          </span>
                        </div>
                      </div>

                      {/* Product Content */}
                      <div className="p-4 space-y-2">
                        {/* Rating Row */}
                        <div className="flex items-center space-x-1.5 text-xs">
                          <div className="flex items-center text-amber-500">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span className="font-bold text-slate-900 ml-1 text-xs">{product.rating || '4.8'}</span>
                          </div>
                          <span className="text-[11px] text-slate-400">({Math.floor((product.price % 30) + 42)} reviews)</span>
                        </div>

                        {/* Product Title */}
                        <h4 className="text-sm font-bold text-slate-900 line-clamp-1 group-hover:text-[#1D61E7] transition-colors" title={product.name}>
                          {product.name}
                        </h4>

                        {/* Description */}
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {product.description || 'Verified academic syllabus material for Adhithyan College.'}
                        </p>

                        {/* Price & MRP Row */}
                        <div className="pt-2 flex items-baseline space-x-2">
                          <span className="text-lg font-black text-slate-900 tracking-tight">
                            ₹{product.price.toFixed(0)}
                          </span>
                          <span className="text-xs text-slate-400 line-through">
                            ₹{mrp}
                          </span>
                          <span className="text-[11px] font-bold text-emerald-600">
                            Save ₹{(mrp - product.price).toFixed(0)}
                          </span>
                        </div>

                        {/* Campus Delivery Guarantee */}
                        <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 pt-0.5">
                          <Truck className="w-3.5 h-3.5 text-[#1D61E7] shrink-0" />
                          <span>Pickup at Central Store / Dept Delivery</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Area (Dual Action: Add to Cart + Buy Now) */}
                    <div className="p-4 pt-0 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        {inCart ? (
                          <div className="flex items-center justify-between p-1 bg-blue-50 border border-blue-200 rounded-xl">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-6 p-0 text-slate-700 hover:bg-white rounded-lg"
                              onClick={() => handleUpdateQuantity(product.id, -1)}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="text-xs font-bold text-slate-900 px-1 text-center">
                              {inCart.quantity}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-6 p-0 text-slate-700 hover:bg-white rounded-lg"
                              onClick={() => handleUpdateQuantity(product.id, 1)}
                              disabled={inCart.quantity >= product.stock}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full text-xs h-9 font-semibold rounded-xl border-slate-300 hover:bg-slate-50 text-slate-700 px-2 truncate"
                            disabled={isOutOfStock}
                            onClick={() => handleAddToCart(product)}
                          >
                            <ShoppingCart className="w-3.5 h-3.5 mr-1" />
                            Add Cart
                          </Button>
                        )}

                        <Button
                          size="sm"
                          className="w-full text-xs h-9 bg-[#1D61E7] hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs px-2 truncate"
                          disabled={isOutOfStock}
                          onClick={() => handleInitiateBuyNow(product)}
                        >
                          <Zap className="w-3.5 h-3.5 mr-1 text-amber-300 fill-amber-300" />
                          Buy Now
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MY ORDERS TAB */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <Card className="bg-white border-border text-center py-12">
              <CardContent className="space-y-3">
                <Receipt className="w-12 h-12 mx-auto text-muted-foreground/30" />
                <h4 className="text-sm font-semibold text-foreground">No Purchase Orders Placed Yet</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Browse the campus store catalog to order books, stationery, and lab kits.
                </p>
                <Button size="sm" variant="outline" onClick={() => setActiveTab('catalog')} className="text-xs mt-2">
                  Browse Catalog
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const itemsList = Array.isArray(order.items) ? order.items : [];
                return (
                  <div
                    key={order.id}
                    className="p-4 sm:p-5 border border-border rounded-xl bg-white space-y-3 hover:border-primary/40 transition-colors shadow-2xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs text-foreground">
                            Order #{order.id.slice(0, 8).toUpperCase()}
                          </span>
                          <Badge 
                            variant="outline" 
                            className={`text-[10px] ${
                              order.status === 'Delivered' 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                                : order.status === 'Processing' 
                                ? 'bg-blue-50 text-blue-700 border-blue-300' 
                                : 'bg-amber-50 text-amber-800 border-amber-300'
                            }`}
                          >
                            {order.status}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>Placed on {new Date(order.created_at).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="text-left sm:text-right space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Total Amount</span>
                        <div className="text-base font-bold text-primary">₹{order.total_amount}</div>
                        <div className="text-[10px] text-muted-foreground">{(order as any).payment_status === 'Paid' ? 'Paid online' : (order as any).payment_status === 'Refunded' ? 'Refunded' : 'Pay at the counter on collection'}</div>
                        {['Pending', 'Processing'].includes(order.status) && (order as any).payment_status === 'Unpaid' && onlineEnabled && (
                          <Button size="sm" className="h-7 text-xs" disabled={payingId === order.id} onClick={() => payOrder(order.id)}>{payingId === order.id ? 'Opening…' : 'Pay online'}</Button>
                        )}
                        {order.status === 'Pending' && (
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => cancelOrder(order.id)}>Cancel order</Button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Items Ordered ({itemsList.length})
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {itemsList.map((item: any, idx: number) => (
                          <div key={idx} className="p-2.5 bg-slate-50 border border-border/60 rounded-lg text-xs space-y-0.5">
                            <div className="font-semibold text-foreground truncate">{item.name}</div>
                            <div className="text-[11px] text-muted-foreground flex justify-between">
                              <span>Qty: {item.quantity}</span>
                              <span>₹{(item.unit_price ?? item.price ?? 0) * item.quantity}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Cart Dialog */}
      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center space-x-2">
              <ShoppingCart className="w-4 h-4 text-primary" />
              <span>Your Shopping Cart ({cartItemCount} items)</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Review your selected supplies before confirming checkout.
            </DialogDescription>
          </DialogHeader>

          {cart.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              Your cart is empty. Add supplies from the catalog.
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1 divide-y divide-border">
                {cart.map((item) => (
                  <div key={item.id} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                    <div className="flex-1 pr-2 min-w-0">
                      <div className="font-semibold text-foreground truncate">{item.name}</div>
                      <div className="text-[11px] text-muted-foreground">₹{item.price} each</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center border border-border rounded bg-slate-50">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handleUpdateQuantity(item.id, -1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="text-xs px-2 font-bold">{item.quantity}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handleUpdateQuantity(item.id, 1)}
                          disabled={item.quantity >= item.stock}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <span className="font-bold text-foreground w-14 text-right">
                        ₹{(item.price * item.quantity).toFixed(0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-3 space-y-1 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>₹{cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-foreground pt-1">
                  <span>Total Due</span>
                  <span className="text-primary font-bold">₹{cartTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCartOpen(false)}>
              Continue Shopping
            </Button>
            <Button
              size="sm"
              disabled={cart.length === 0 || submittingOrder}
              onClick={handleCheckout}
            >
              {submittingOrder ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Processing...
                </>
              ) : (
                <>Confirm & Place Order</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Instant "Buy Now" Checkout Modal */}
      <Dialog open={buyNowModalOpen} onOpenChange={setBuyNowModalOpen}>
        <DialogContent className="max-w-md bg-white p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
              Instant Checkout
            </DialogTitle>
            <DialogDescription className="text-xs">
              Confirm your order for immediate dispatch or central store pickup.
            </DialogDescription>
          </DialogHeader>

          {buyNowProduct && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{buyNowProduct.name}</h4>
                  <span className="text-[11px] text-slate-500">Unit Price: ₹{Number(buyNowProduct.price).toFixed(0)}</span>
                </div>
                <div className="flex items-center space-x-1.5 border border-slate-200 bg-white rounded-lg p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setBuyNowQty(Math.max(1, buyNowQty - 1))}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="text-xs px-2 font-bold">{buyNowQty}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setBuyNowQty(Math.min(buyNowProduct.stock, buyNowQty + 1))}
                    disabled={buyNowQty >= buyNowProduct.stock}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-700">Payment Option</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBuyNowPaymentMode('Online_UPI')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                      buyNowPaymentMode === 'Online_UPI'
                        ? 'border-[#1D61E7] bg-blue-50 text-[#1D61E7]'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    UPI / Online Pay
                  </button>
                  <button
                    type="button"
                    onClick={() => setBuyNowPaymentMode('Campus_Store_Counter')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                      buyNowPaymentMode === 'Campus_Store_Counter'
                        ? 'border-[#1D61E7] bg-blue-50 text-[#1D61E7]'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Store Counter Pay
                  </button>
                </div>
              </div>

              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl flex justify-between items-center text-xs">
                <span className="text-slate-600">Total Payable:</span>
                <span className="text-base font-bold text-[#1D61E7]">
                  ₹{((Number(buyNowProduct.price) || 0) * buyNowQty).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setBuyNowModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-[#1D61E7] hover:bg-blue-700 text-white font-bold"
              disabled={submittingOrder}
              onClick={handleConfirmBuyNow}
            >
              {submittingOrder ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Processing...
                </>
              ) : (
                <>Confirm & Pay</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

