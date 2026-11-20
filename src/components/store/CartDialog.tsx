import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Minus, Plus, Trash2, ShoppingBag, CreditCard, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/supabase/database';
import { storeService } from '@/services/storeService';

interface CartItem {
  id: number | string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  image: string;
}

interface CartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItem[];
  onUpdateQuantity: (id: any, quantity: number) => void;
  onRemoveItem: (id: any) => void;
  onClearCart: () => void;
}

export function CartDialog({ 
  open, 
  onOpenChange, 
  items, 
  onUpdateQuantity, 
  onRemoveItem,
  onClearCart 
}: CartDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.18; // 18% GST
  const shipping = subtotal > 500 ? 0 : 50; // Free shipping above ₹500
  const total = subtotal + tax + shipping;

  const handleCheckout = async () => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to place a campus store order.",
        variant: "destructive",
      });
      return;
    }

    if (items.length === 0) return;

    setIsProcessing(true);
    try {
      // 1. Attempt atomic RPC checkout for race-condition prevention
      let orderId = '';
      try {
        const rpcRes = await storeService.checkoutOrder(
          user.id,
          items.map(i => ({ product_id: String(i.id), quantity: i.quantity })),
          total
        );
        orderId = rpcRes?.order_id || rpcRes?.id || '';
      } catch (rpcErr) {
        console.warn('RPC checkout_store_order fallback to db.placeStoreOrderAtomic:', rpcErr);
        const result = await db.placeStoreOrderAtomic({
          userId: user.id,
          userName: user.name || 'Student',
          items: items.map(i => ({
            id: i.id,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
          })),
          totalAmount: total,
        });

        if (!result.success) {
          toast({
            title: "Order Placement Rejected",
            description: result.error || "Insufficient stock or catalog error.",
            variant: "destructive"
          });
          return;
        }
        orderId = result.order?.id || '';
      }

      // Dispatch real-time alert to store manager
      try {
        const managers = (await db.getAllProfiles()).filter(p => p.role === 'store_manager' || p.role === 'storekeeper' || p.role === 'admin');
        for (const mgr of managers) {
          await db.createNotification({
            user_id: mgr.id,
            title: 'New Campus Store Order',
            message: `${user?.name || 'Student'} placed order #${orderId.slice(0, 8) || 'STORE'} for ₹${total.toFixed(2)} (Status: Pending)`,
            type: 'info',
            priority: 'medium',
            is_read: false
          });
        }
      } catch (nErr) {
        console.warn('Realtime store order notification fallback:', nErr);
      }

      toast({
        title: "Order Placed Successfully",
        description: `Your order (#${orderId.slice(0, 8) || 'STORE'}) of ₹${total.toFixed(2)} is recorded as "Pending". Payment will be verified at the store counter upon collection.`,
      });
      onClearCart();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Order Error",
        description: err.message || "Could not process order. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const updateQuantity = (id: any, change: number) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    
    const newQuantity = item.quantity + change;
    if (newQuantity <= 0) {
      onRemoveItem(id);
    } else {
      onUpdateQuantity(id, newQuantity);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Shopping Cart ({items.length} {items.length === 1 ? 'item' : 'items'})
          </DialogTitle>
          <DialogDescription>
            Review your campus store items before confirming order placement
          </DialogDescription>
        </DialogHeader>

        {items.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Your cart is empty</p>
            <p className="text-sm">Add items from the store to see them here</p>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {items.map((item) => (
                  <Card key={item.id} className="p-4">
                    <div className="flex gap-4">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded-md bg-muted"
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-start">
                          <h4 className="font-semibold text-sm">{item.name}</h4>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => onRemoveItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {item.category}
                        </Badge>
                        <div className="flex justify-between items-center pt-2">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateQuantity(item.id, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm font-medium">
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateQuantity(item.id, 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <span className="font-semibold text-sm">
                            ₹{(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            <div className="space-y-4 pt-4">
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GST (18%)</span>
                  <span>₹{tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery / Service</span>
                  <span>
                    {shipping === 0 ? (
                      <span className="text-green-600 font-medium">Free</span>
                    ) : (
                      `₹${shipping.toFixed(2)}`
                    )}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-base font-bold">
                  <span>Total Payable</span>
                  <span className="text-primary">₹{total.toFixed(2)}</span>
                </div>
              </div>

              <div className="bg-muted/50 p-3 rounded-lg text-xs text-muted-foreground flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary shrink-0" />
                <span>Orders are submitted with "Pending" status and fulfilled at the campus store counter.</span>
              </div>
            </div>

            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={onClearCart}
                disabled={isProcessing}
              >
                Clear Cart
              </Button>
              <Button
                onClick={handleCheckout}
                disabled={isProcessing}
                className="gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Validating Stock...
                  </>
                ) : (
                  <>
                    Confirm Order (₹{total.toFixed(2)})
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
