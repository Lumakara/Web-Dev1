/**
 * Database Service - Real Supabase Implementation
 * Phase 2: All operations use Supabase
 */

import { supabase } from './supabase';
import type { Product, Order, SupportTicket, UserProfile, Tier } from '@/types/database';

// Re-export types
export type { Product, Order, SupportTicket, UserProfile, Tier };

// Product Service
export const ProductService = {
  async getAll(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*, product_tiers(*)');
    
    if (error) throw error;
    
    // Transform tiers from separate table to nested array
    return (data || []).map(p => ({
      ...p,
      tiers: p.product_tiers || [],
      product_tiers: undefined,
    })) as Product[];
  },
  
  async getById(id: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*, product_tiers(*)')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    
    return {
      ...data,
      tiers: data.product_tiers || [],
      product_tiers: undefined,
    } as Product;
  },

  async create(product: Omit<Product, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Promise<Product> {
    const { tiers, ...productData } = product;
    const productId = product.id || `prod-${Date.now()}`;
    
    // Insert product
    const { data: newProduct, error: productError } = await supabase
      .from('products')
      .insert({ ...productData, id: productId })
      .select()
      .single();
    
    if (productError) throw productError;
    
    // Insert tiers
    if (tiers && tiers.length > 0) {
      const { error: tiersError } = await supabase
        .from('product_tiers')
        .insert(tiers.map(t => ({ ...t, product_id: productId })));
      
      if (tiersError) throw tiersError;
    }
    
    return { ...newProduct, tiers: tiers || [] } as Product;
  },

  async update(id: string, updates: Partial<Product>): Promise<void> {
    const { tiers, ...productUpdates } = updates;
    
    // Update product
    const { error: productError } = await supabase
      .from('products')
      .update(productUpdates)
      .eq('id', id);
    
    if (productError) throw productError;
    
    // Update tiers if provided
    if (tiers) {
      // Delete existing tiers
      await supabase.from('product_tiers').delete().eq('product_id', id);
      
      // Insert new tiers
      if (tiers.length > 0) {
        const { error: tiersError } = await supabase
          .from('product_tiers')
          .insert(tiers.map(t => ({ ...t, product_id: id })));
        
        if (tiersError) throw tiersError;
      }
    }
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async updateStock(id: string, stock: number): Promise<void> {
    const { error } = await supabase
      .from('products')
      .update({ stock })
      .eq('id', id);
    
    if (error) throw error;
  },

  async updatePrice(id: string, basePrice: number, discountPrice?: number): Promise<void> {
    const { error } = await supabase
      .from('products')
      .update({ base_price: basePrice, discount_price: discountPrice })
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Order Service
export const OrderService = {
  async create(order: Omit<Order, 'created_at' | 'updated_at'>): Promise<Order> {
    const { items, ...orderData } = order;
    const { data, error } = await supabase.rpc('create_customer_order', {
      p_order_id: order.id,
      p_total_amount: order.total_amount,
      p_items: items,
    });
    if (error) throw error;
    return { ...(data as Order), ...orderData, items };
  },

  async getByUser(userId: string): Promise<Order[]> {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return (orders || []).map(o => ({
      ...o,
      items: o.order_items || [],
      order_items: undefined,
    })) as Order[];
  },

  async getAll(): Promise<Order[]> {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return (orders || []).map(o => ({
      ...o,
      items: o.order_items || [],
      order_items: undefined,
    })) as Order[];
  },

  async updateStatus(id: string, status: Order['status']): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id);
    
    if (error) throw error;
  },

  async updatePayment(id: string, data: { payment_method: string; payment_reference: string }): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .update(data)
      .eq('id', id);
    
    if (error) throw error;
  },

  onOrdersChange(callback: (orders: Order[]) => void) {
    const channel = supabase
      .channel('orders-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          OrderService.getAll().then(callback);
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }
};

// User Service
export const UserService = {
  async createProfile(profile: Omit<UserProfile, 'created_at' | 'updated_at'>): Promise<UserProfile> {
    const { id, ...profileData } = profile;
    const { data, error } = await supabase
      .from('profiles')
      .insert({ ...profileData, user_id: id })
      .select()
      .single();
    
    if (error) throw error;
    return { ...data, id: data.user_id } as UserProfile;
  },

  async getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    
    return { ...data, id: data.user_id } as UserProfile;
  },

  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', userId);
    
    if (error) throw error;
  },

  async getAll(): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(p => ({ ...p, id: p.user_id })) as UserProfile[];
  }
};

// Ticket Service
export const TicketService = {
  async create(ticket: Omit<SupportTicket, 'id' | 'created_at' | 'updated_at'>): Promise<SupportTicket> {
    const ticketId = `TICKET-${Date.now()}`;
    
    const { data, error } = await supabase
      .from('support_tickets')
      .insert({ ...ticket, id: ticketId })
      .select()
      .single();
    
    if (error) throw error;
    return data as SupportTicket;
  },

  async getAll(): Promise<SupportTicket[]> {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []) as SupportTicket[];
  },

  async getByUser(userId: string): Promise<SupportTicket[]> {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []) as SupportTicket[];
  },

  async updateStatus(id: string, status: SupportTicket['status']): Promise<void> {
    const { error } = await supabase
      .from('support_tickets')
      .update({ status })
      .eq('id', id);
    
    if (error) throw error;
  }
};

export default { ProductService, UserService, TicketService, OrderService };
