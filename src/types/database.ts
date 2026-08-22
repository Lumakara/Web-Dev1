/**
 * Database Types (Supabase target)
 * Application database types for Supabase tables.
 */

export interface Product {
  id: string;
  title: string;
  category: 'installation' | 'creative' | 'technical';
  base_price: number;
  discount_price?: number;
  stock: number;
  image: string;
  icon: string;
  rating: number;
  reviews: number;
  duration: string;
  description: string;
  tags: string[];
  tiers: Tier[];
  related: string[];
  created_at?: string;
  updated_at?: string;
  requiresForm?: boolean;
  formType?: 'wifi' | 'panel';
}

export interface Tier {
  name: string;
  price: number;
  features: string[];
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  address?: string;
  avatar_url?: string;
  role: 'customer' | 'moderator' | 'manager' | 'admin' | 'super_admin';
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SupportTicket {
  id: string;
  user_id?: string;
  subject: string;
  category: string;
  email: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at?: string;
  updated_at?: string;
  response?: string;
}

export interface Order {
  id: string;
  user_id: string;
  items: OrderItem[];
  total_amount: number;
  status: 'pending' | 'paid' | 'processing' | 'completed' | 'cancelled' | 'refunded';
  payment_method?: string;
  payment_reference?: string;
  payment_provider?: string;
  processed_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface OrderItem {
  product_id: string;
  title: string;
  tier: string;
  price: number;
  quantity: number;
  image?: string;
}
