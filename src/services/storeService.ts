import { supabase } from '@/lib/supabase';
import { handleSupabaseError } from './api/errors';

export interface StoreProductItem {
  id: string;
  name: string;
  price: number;
  category: string;
  rating?: number;
  image_url?: string;
  stock: number;
  description?: string;
}

export interface CartLineItem {
  product_id: string;
  quantity: number;
  name?: string;
  price?: number;
}

export interface StoreOrderItem {
  id: string;
  student_id: string;
  student_name?: string;
  total_amount: number;
  status: 'placed' | 'confirmed' | 'ready' | 'collected' | 'cancelled';
  created_at: string;
}

export const storeService = {
  async listProducts(category?: string, search?: string): Promise<StoreProductItem[]> {
    try {
      let query = supabase
        .from('store_products')
        .select('*')
        .order('name', { ascending: true });

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      if (search && search.trim()) {
        query = query.ilike('name', `%${search.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        price: Number(p.price) || 0,
        category: p.category || 'General',
        rating: p.rating || 4.8,
        image_url: p.image_url || '/placeholder.svg',
        stock: p.stock ?? 0,
        description: p.description || '',
      }));
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to fetch store products');
    }
  },

  async createProduct(input: Omit<StoreProductItem, 'id'>): Promise<StoreProductItem> {
    try {
      const { data, error } = await supabase
        .from('store_products')
        .insert({
          name: input.name.trim(),
          price: input.price,
          category: input.category,
          stock: input.stock,
          description: input.description,
          image_url: input.image_url || '/placeholder.svg',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to create store product');
    }
  },

  async updateProduct(id: string, input: Partial<StoreProductItem>): Promise<void> {
    try {
      const { error } = await supabase
        .from('store_products')
        .update({
          name: input.name,
          price: input.price,
          category: input.category,
          stock: input.stock,
          description: input.description,
          image_url: input.image_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to update product');
    }
  },

  async deleteProduct(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('store_products')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to remove store product');
    }
  },

  async checkoutOrder(studentId: string, items: CartLineItem[], totalAmount: number): Promise<any> {
    try {
      // Call atomic RPC checkout_store_order to avoid race conditions or overselling
      const { data, error } = await supabase.rpc('checkout_store_order', {
        p_student_id: studentId,
        p_items: items.map(it => ({ product_id: it.product_id, quantity: it.quantity })),
        p_total_amount: totalAmount,
      });

      if (error) throw error;
      if (data && data.success === false) {
        throw new Error(data.error || 'Failed to place order');
      }

      return data;
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to complete store checkout');
    }
  },

  async listOrders(studentId?: string): Promise<StoreOrderItem[]> {
    try {
      let query = supabase
        .from('store_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (studentId) {
        query = query.eq('student_id', studentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((o: any) => ({
        id: o.id,
        student_id: o.student_id,
        total_amount: Number(o.total_amount) || 0,
        status: o.status || 'placed',
        created_at: o.created_at,
      }));
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to fetch store orders');
    }
  },
};

export default storeService;

