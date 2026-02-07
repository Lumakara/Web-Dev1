/**
 * FIREBASE FIRESTORE DATABASE SERVICE - ULTRA FUNCTIONAL VERSION
 * Fully working CRUD operations with error handling & offline support
 */

import { 
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  Timestamp,
  serverTimestamp,
  onSnapshot,
  writeBatch,
  enableNetwork,
  disableNetwork,
  type Firestore,
  type DocumentReference,
} from 'firebase/firestore';
import { app, isInitialized, testFirebaseConnection } from './firebase';
import { showErrorBox } from './error-tracker';

// ============================================
// DATABASE INITIALIZATION
// ============================================

let db: Firestore;
let dbInitialized = false;
let dbInitError: Error | null = null;

// Initialize Firestore with proper error handling
try {
  if (isInitialized && app && Object.keys(app).length > 0) {
    db = getFirestore(app);
    dbInitialized = true;
    console.log('[FIRESTORE] ✅ Database initialized');
  } else {
    throw new Error('Firebase app not initialized, cannot create Firestore instance');
  }
} catch (error) {
  dbInitError = error as Error;
  showErrorBox('💥 FIREBASE DB INIT ERROR', {
    'Error': (error as Error)?.message || 'Unknown',
    'Status': 'Using mock data',
  }, 'error');
  // Create a mock db to prevent crashes
  db = {} as Firestore;
}

// ============================================
// TYPES
// ============================================

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
  full_name: string;
  phone?: string;
  address?: string;
  avatar_url?: string;
  is_admin?: boolean;
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
  payment_method: string;
  payment_reference?: string;
  created_at?: string;
  updated_at?: string;
  // Form data for WiFi
  installation_details?: InstallationDetails;
  // Form data for Panel
  panel_details?: PanelDetails;
}

export interface OrderItem {
  product_id: string;
  title: string;
  tier: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface InstallationDetails {
  fullName: string;
  phoneNumber: string;
  ktpNumber?: string;
  address: string;
  installationDate?: string;
  notes?: string;
  packageType?: string;
}

export interface PanelDetails {
  username: string;
  password: string;
  domain?: string;
}

export interface DatabaseStatus {
  initialized: boolean;
  connected: boolean;
  offline: boolean;
  error: string | null;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const generateId = (): string => {
  if (!dbInitialized) return `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  try {
    return doc(collection(db, '_')).id;
  } catch {
    return `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
};

const timestampToString = (timestamp: Timestamp | undefined): string | undefined => {
  if (!timestamp) return undefined;
  try {
    return timestamp.toDate().toISOString();
  } catch {
    return undefined;
  }
};

const validateDbConnection = (): boolean => {
  if (!dbInitialized || !db || Object.keys(db).length === 0) {
    console.warn('[FIRESTORE] Database not initialized');
    return false;
  }
  return true;
};

// ============================================
// PRODUCT SERVICE
// ============================================

export const ProductService = {
  async getAll(options?: { 
    category?: string; 
    limit?: number;
    orderByField?: string;
  }): Promise<Product[]> {
    if (!validateDbConnection()) {
      console.log('[FIRESTORE] Using mock data (offline mode)');
      return getMockProducts();
    }
    
    try {
      let q = query(collection(db, 'products'), orderBy(options?.orderByField || 'created_at', 'desc'));
      
      if (options?.category) {
        q = query(
          collection(db, 'products'), 
          where('category', '==', options.category),
          orderBy(options?.orderByField || 'created_at', 'desc')
        );
      }
      
      if (options?.limit) {
        const { limit: limitFn } = await import('firebase/firestore');
        q = query(q, limitFn(options.limit));
      }
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.log('[FIRESTORE] No products in database, using mock data');
        return getMockProducts();
      }
      
      const products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: timestampToString(doc.data().created_at),
        updated_at: timestampToString(doc.data().updated_at),
      })) as Product[];
      
      console.log(`[FIRESTORE] ✅ Loaded ${products.length} products`);
      return products;
    } catch (error: any) {
      showErrorBox('💥 FIRESTORE FETCH PRODUCTS ERROR', {
        'Error': error?.message || 'Unknown',
      }, 'error');
      return getMockProducts();
    }
  },

  async getById(id: string): Promise<Product | null> {
    if (!validateDbConnection()) {
      return getMockProducts().find(p => p.id === id) || null;
    }
    
    try {
      const docRef = doc(db, 'products', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          created_at: timestampToString(data.created_at),
          updated_at: timestampToString(data.updated_at),
        } as Product;
      }
      
      // Fallback to mock data
      const mock = getMockProducts().find(p => p.id === id);
      if (mock) {
        console.log(`[FIRESTORE] Product ${id} not in DB, using mock`);
        return mock;
      }
      
      return null;
    } catch (error: any) {
      showErrorBox('💥 FIRESTORE FETCH PRODUCT ERROR', {
        'Error': error?.message || 'Unknown',
        'Product ID': id,
      }, 'error');
      return getMockProducts().find(p => p.id === id) || null;
    }
  },

  async create(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
    const id = generateId();
    
    if (!validateDbConnection()) {
      throw new Error('Database not connected');
    }
    
    const docRef = doc(db, 'products', id);
    const newProduct = {
      ...product,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    };
    
    await setDoc(docRef, newProduct);
    
    console.log(`[FIRESTORE] ✅ Product created: ${id}`);
    
    return {
      id,
      ...product,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  },

  async update(id: string, updates: Partial<Product>): Promise<Product> {
    if (!validateDbConnection()) {
      throw new Error('Database not connected');
    }
    
    const docRef = doc(db, 'products', id);
    const updateData = {
      ...updates,
      updated_at: serverTimestamp(),
    };
    
    await updateDoc(docRef, updateData);
    
    const updated = await getDoc(docRef);
    const data = updated.data();
    
    console.log(`[FIRESTORE] ✅ Product updated: ${id}`);
    
    return {
      id,
      ...data,
      created_at: timestampToString(data?.created_at),
      updated_at: timestampToString(data?.updated_at),
    } as Product;
  },

  async delete(id: string): Promise<void> {
    if (!validateDbConnection()) {
      throw new Error('Database not connected');
    }
    
    const docRef = doc(db, 'products', id);
    await deleteDoc(docRef);
    console.log(`[FIRESTORE] ✅ Product deleted: ${id}`);
  },

  async updateStock(id: string, stock: number): Promise<void> {
    if (!validateDbConnection()) {
      throw new Error('Database not connected');
    }
    
    const docRef = doc(db, 'products', id);
    await updateDoc(docRef, {
      stock,
      updated_at: serverTimestamp(),
    });
    console.log(`[FIRESTORE] ✅ Product stock updated: ${id} = ${stock}`);
  },

  async updatePrice(id: string, basePrice: number, discountPrice?: number): Promise<void> {
    if (!validateDbConnection()) {
      throw new Error('Database not connected');
    }
    
    const docRef = doc(db, 'products', id);
    const updates: Record<string, any> = {
      base_price: basePrice,
      updated_at: serverTimestamp(),
    };
    if (discountPrice !== undefined) {
      updates.discount_price = discountPrice;
    }
    
    await updateDoc(docRef, updates);
    console.log(`[FIRESTORE] ✅ Product price updated: ${id}`);
  },
  
  // Real-time listener for products
  onProductsChange(callback: (products: Product[]) => void) {
    if (!validateDbConnection()) {
      console.warn('[FIRESTORE] Cannot set up real-time listener (offline)');
      callback(getMockProducts());
      return () => {};
    }
    
    const q = query(collection(db, 'products'), orderBy('created_at', 'desc'));
    
    return onSnapshot(q, (snapshot) => {
      const products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: timestampToString(doc.data().created_at),
        updated_at: timestampToString(doc.data().updated_at),
      })) as Product[];
      
      callback(products);
    }, (error) => {
      console.error('[FIRESTORE] ❌ Products listener error:', error);
      callback(getMockProducts());
    });
  }
};

// ============================================
// USER SERVICE
// ============================================

export const UserService = {
  async getProfile(userId: string): Promise<UserProfile | null> {
    if (!validateDbConnection()) return null;
    
    try {
      const docRef = doc(db, 'profiles', userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          created_at: timestampToString(data.created_at),
          updated_at: timestampToString(data.updated_at),
        } as UserProfile;
      }
      return null;
    } catch (error: any) {
      showErrorBox('💥 FIRESTORE FETCH PROFILE ERROR', {
        'Error': error?.message || 'Unknown',
      }, 'error');
      return null;
    }
  },

  async createProfile(profile: Partial<UserProfile> & { id: string; email: string }): Promise<void> {
    if (!validateDbConnection()) {
      throw new Error('Database not connected');
    }
    
    const docRef = doc(db, 'profiles', profile.id);
    await setDoc(docRef, {
      ...profile,
      full_name: profile.full_name || 'User',
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    console.log(`[FIRESTORE] ✅ Profile created: ${profile.id}`);
  },

  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    if (!validateDbConnection()) {
      throw new Error('Database not connected');
    }
    
    const docRef = doc(db, 'profiles', userId);
    await updateDoc(docRef, {
      ...updates,
      updated_at: serverTimestamp(),
    });
    console.log(`[FIRESTORE] ✅ Profile updated: ${userId}`);
  },

  async isAdmin(userId: string): Promise<boolean> {
    if (!validateDbConnection()) return false;
    
    try {
      const docRef = doc(db, 'profiles', userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data()?.is_admin === true;
      }
      return false;
    } catch (error) {
      console.error('[FIRESTORE] ❌ Error checking admin:', error);
      return false;
    }
  },
  
  async setAdmin(userId: string, isAdmin: boolean): Promise<void> {
    if (!validateDbConnection()) {
      throw new Error('Database not connected');
    }
    
    const docRef = doc(db, 'profiles', userId);
    await updateDoc(docRef, {
      is_admin: isAdmin,
      updated_at: serverTimestamp(),
    });
    console.log(`[FIRESTORE] ✅ Admin status updated: ${userId} = ${isAdmin}`);
  }
};

// ============================================
// TICKET SERVICE
// ============================================

export const TicketService = {
  async create(ticket: Omit<SupportTicket, 'id' | 'created_at' | 'updated_at' | 'status'>): Promise<SupportTicket> {
    const id = generateId();
    
    if (!validateDbConnection()) {
      throw new Error('Database not connected');
    }
    
    const docRef = doc(db, 'support_tickets', id);
    const newTicket = {
      ...ticket,
      status: 'open',
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    };
    
    await setDoc(docRef, newTicket);
    
    console.log(`[FIRESTORE] ✅ Ticket created: ${id}`);
    
    return {
      id,
      ...ticket,
      status: 'open',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  },

  async getByUser(userId: string): Promise<SupportTicket[]> {
    if (!validateDbConnection()) return [];
    
    try {
      const q = query(
        collection(db, 'support_tickets'),
        where('user_id', '==', userId),
        orderBy('created_at', 'desc')
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: timestampToString(doc.data().created_at),
        updated_at: timestampToString(doc.data().updated_at),
      })) as SupportTicket[];
    } catch (error: any) {
      showErrorBox('💥 FIRESTORE FETCH USER TICKETS ERROR', {
        'Error': error?.message || 'Unknown',
      }, 'error');
      return [];
    }
  },

  async getAll(): Promise<SupportTicket[]> {
    if (!validateDbConnection()) return [];
    
    try {
      const q = query(collection(db, 'support_tickets'), orderBy('created_at', 'desc'));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: timestampToString(doc.data().created_at),
        updated_at: timestampToString(doc.data().updated_at),
      })) as SupportTicket[];
    } catch (error: any) {
      showErrorBox('💥 FIRESTORE FETCH ALL TICKETS ERROR', {
        'Error': error?.message || 'Unknown',
      }, 'error');
      return [];
    }
  },

  async updateStatus(id: string, status: SupportTicket['status'], response?: string): Promise<void> {
    if (!validateDbConnection()) {
      throw new Error('Database not connected');
    }
    
    const docRef = doc(db, 'support_tickets', id);
    const updates: any = {
      status,
      updated_at: serverTimestamp(),
    };
    if (response) updates.response = response;
    
    await updateDoc(docRef, updates);
    console.log(`[FIRESTORE] ✅ Ticket status updated: ${id} = ${status}`);
  }
};

// ============================================
// ORDER SERVICE
// ============================================

export const OrderService = {
  async create(order: Omit<Order, 'id' | 'created_at' | 'updated_at'>): Promise<Order> {
    const id = generateId();
    
    if (!validateDbConnection()) {
      throw new Error('Database not connected');
    }
    
    const docRef = doc(db, 'orders', id);
    const newOrder = {
      ...order,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    };
    
    await setDoc(docRef, newOrder);
    
    console.log(`[FIRESTORE] ✅ Order created: ${id}`);
    
    return {
      id,
      ...order,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  },

  async getByUser(userId: string): Promise<Order[]> {
    if (!validateDbConnection()) return [];
    
    try {
      const q = query(
        collection(db, 'orders'),
        where('user_id', '==', userId),
        orderBy('created_at', 'desc')
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: timestampToString(doc.data().created_at),
        updated_at: timestampToString(doc.data().updated_at),
      })) as Order[];
    } catch (error: any) {
      showErrorBox('💥 FIRESTORE FETCH USER ORDERS ERROR', {
        'Error': error?.message || 'Unknown',
      }, 'error');
      return [];
    }
  },

  async getAll(): Promise<Order[]> {
    if (!validateDbConnection()) return [];
    
    try {
      const q = query(collection(db, 'orders'), orderBy('created_at', 'desc'));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: timestampToString(doc.data().created_at),
        updated_at: timestampToString(doc.data().updated_at),
      })) as Order[];
    } catch (error: any) {
      showErrorBox('💥 FIRESTORE FETCH ALL ORDERS ERROR', {
        'Error': error?.message || 'Unknown',
      }, 'error');
      return [];
    }
  },

  async updateStatus(id: string, status: Order['status']): Promise<void> {
    if (!validateDbConnection()) {
      throw new Error('Database not connected');
    }
    
    const docRef = doc(db, 'orders', id);
    await updateDoc(docRef, {
      status,
      updated_at: serverTimestamp(),
    });
    console.log(`[FIRESTORE] ✅ Order status updated: ${id} = ${status}`);
  },

  async updatePayment(id: string, paymentReference: string, status: 'paid' | 'pending' = 'paid'): Promise<void> {
    if (!validateDbConnection()) {
      throw new Error('Database not connected');
    }
    
    const docRef = doc(db, 'orders', id);
    await updateDoc(docRef, {
      payment_reference: paymentReference,
      status,
      updated_at: serverTimestamp(),
    });
    console.log(`[FIRESTORE] ✅ Order payment updated: ${id}`);
  },
  
  // Real-time listener for orders
  onOrdersChange(callback: (orders: Order[]) => void) {
    if (!validateDbConnection()) {
      console.warn('[FIRESTORE] Cannot set up real-time listener (offline)');
      return () => {};
    }
    
    const q = query(collection(db, 'orders'), orderBy('created_at', 'desc'));
    
    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: timestampToString(doc.data().created_at),
        updated_at: timestampToString(doc.data().updated_at),
      })) as Order[];
      
      callback(orders);
    }, (error) => {
      console.error('[FIRESTORE] ❌ Orders listener error:', error);
    });
  }
};

// ============================================
// DATABASE UTILITIES
// ============================================

export const DatabaseUtils = {
  // Enable/disable network
  async enableNetwork(): Promise<void> {
    if (!validateDbConnection()) return;
    await enableNetwork(db);
    console.log('[FIRESTORE] Network enabled');
  },
  
  async disableNetwork(): Promise<void> {
    if (!validateDbConnection()) return;
    await disableNetwork(db);
    console.log('[FIRESTORE] Network disabled');
  },
  
  // Batch write
  async batchWrite(operations: { type: 'set' | 'update' | 'delete'; ref: DocumentReference; data?: any }[]): Promise<void> {
    if (!validateDbConnection()) {
      throw new Error('Database not connected');
    }
    
    const batch = writeBatch(db);
    
    for (const op of operations) {
      if (op.type === 'set') {
        batch.set(op.ref, op.data);
      } else if (op.type === 'update') {
        batch.update(op.ref, op.data);
      } else if (op.type === 'delete') {
        batch.delete(op.ref);
      }
    }
    
    await batch.commit();
    console.log(`[FIRESTORE] ✅ Batch write completed: ${operations.length} operations`);
  },
  
  // Get database status
  getStatus(): DatabaseStatus {
    return {
      initialized: dbInitialized,
      connected: dbInitialized && isInitialized,
      offline: !navigator.onLine,
      error: dbInitError?.message || null,
    };
  },
  
  // Test connection
  async testConnection() {
    return await testFirebaseConnection();
  }
};

// ============================================
// MOCK DATA
// ============================================

function getMockProducts(): Product[] {
  return [
    {
      id: 'wifi',
      title: 'Wi-Fi Installation Service',
      category: 'installation',
      base_price: 89000,
      discount_price: 79000,
      stock: 100,
      image: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400',
      icon: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=200',
      rating: 4.8,
      reviews: 156,
      duration: '2-3 jam',
      description: 'Pemasangan dan konfigurasi jaringan wireless profesional untuk rumah dan kantor.',
      tags: ['network', 'internet', 'setup'],
      tiers: [
        { name: 'Basic', price: 89000, features: ['Setup 1 router', 'Konfigurasi dasar', 'Optimasi kecepatan', 'Garansi 1 tahun'] },
        { name: 'Standard', price: 149000, features: ['Setup mesh network', 'Keamanan advanced', 'Optimasi multi device', 'Guest network', 'Garansi 2 tahun'] },
        { name: 'Premium', price: 249000, features: ['Enterprise mesh system', 'Security suite', 'IoT management', 'Priority support', 'Garansi 3 tahun'] }
      ],
      related: ['vps', 'code', 'panel'],
      requiresForm: true,
      formType: 'wifi'
    },
    {
      id: 'cctv',
      title: 'CCTV Security System',
      category: 'installation',
      base_price: 199000,
      discount_price: 179000,
      stock: 50,
      image: 'https://images.unsplash.com/photo-1557324232-b8917d3c3dcb?w=400',
      icon: 'https://images.unsplash.com/photo-1557324232-b8917d3c3dcb?w=200',
      rating: 4.7,
      reviews: 89,
      duration: '4-6 jam',
      description: 'Instalasi kamera keamanan lengkap dengan monitoring dan akses mobile.',
      tags: ['security', 'camera', 'monitoring'],
      tiers: [
        { name: 'Basic', price: 199000, features: ['2 kamera HD', 'Recording dasar', 'Akses mobile app', 'Storage 1 TB'] },
        { name: 'Standard', price: 399000, features: ['4 kamera 4K', 'Night vision', 'Motion detection', 'Cloud backup', 'Storage 2 TB'] },
        { name: 'Premium', price: 699000, features: ['8 kamera 4K', 'AI detection', '24/7 monitoring', 'Professional monitoring', 'Storage 4 TB'] }
      ],
      related: ['wifi', 'vps', 'panel']
    },
    {
      id: 'code',
      title: 'Code Error Repair',
      category: 'technical',
      base_price: 59000,
      discount_price: 49000,
      stock: 200,
      image: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400',
      icon: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=200',
      rating: 4.9,
      reviews: 234,
      duration: '1-4 jam',
      description: 'Debugging dan optimasi kode expert untuk website dan aplikasi.',
      tags: ['debugging', 'coding', 'development'],
      tiers: [
        { name: 'Basic', price: 59000, features: ['Identifikasi bug', 'Fix sederhana', 'Code review', 'Dokumentasi'] },
        { name: 'Standard', price: 129000, features: ['Complex debugging', 'Performance optimization', 'Security audit', 'Testing'] },
        { name: 'Premium', price: 249000, features: ['Full code refactoring', 'Architecture review', 'Performance tuning', 'Long-term support'] }
      ],
      related: ['vps', 'wifi', 'website']
    },
    {
      id: 'photo',
      title: 'Photo Editing',
      category: 'creative',
      base_price: 29000,
      discount_price: 25000,
      stock: 150,
      image: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=400',
      icon: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=200',
      rating: 4.6,
      reviews: 120,
      duration: '1-2 hari',
      description: 'Retouching dan enhancement gambar profesional.',
      tags: ['photo', 'editing', 'creative'],
      tiers: [
        { name: 'Basic', price: 29000, features: ['Color correction', 'Basic retouching', 'Format conversion', '5 revisi'] },
        { name: 'Standard', price: 79000, features: ['Advanced retouching', 'Background removal', 'Skin smoothing', 'Unlimited revisi'] },
        { name: 'Premium', price: 149000, features: ['High-end editing', 'Composite work', 'RAW processing', 'Priority delivery'] }
      ],
      related: ['video', 'code', 'design']
    },
    {
      id: 'video',
      title: 'Video Editing',
      category: 'creative',
      base_price: 79000,
      discount_price: 69000,
      stock: 80,
      image: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=400',
      icon: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=200',
      rating: 4.8,
      reviews: 95,
      duration: '2-5 hari',
      description: 'Editing video dan post-production profesional.',
      tags: ['video', 'editing', 'production'],
      tiers: [
        { name: 'Basic', price: 79000, features: ['Basic cuts', 'Transitions', 'Audio sync', 'Output 1080p'] },
        { name: 'Standard', price: 199000, features: ['Color grading', 'Motion graphics', 'Sound mixing', 'Output 4K'] },
        { name: 'Premium', price: 399000, features: ['VFX', 'Animation', 'Professional sound design', 'Cinema quality'] }
      ],
      related: ['photo', 'code', 'design']
    },
    {
      id: 'vps',
      title: 'VPS Hosting',
      category: 'technical',
      base_price: 49000,
      discount_price: 39000,
      stock: 500,
      image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400',
      icon: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=200',
      rating: 4.5,
      reviews: 180,
      duration: 'Instant',
      description: 'Solusi hosting Virtual Private Server.',
      tags: ['hosting', 'server', 'infrastructure'],
      tiers: [
        { name: 'Basic', price: 49000, features: ['2 CPU cores', '4GB RAM', '50GB SSD', '1TB bandwidth'] },
        { name: 'Standard', price: 99000, features: ['4 CPU cores', '8GB RAM', '100GB SSD', '2TB bandwidth'] },
        { name: 'Premium', price: 199000, features: ['8 CPU cores', '16GB RAM', '200GB SSD', 'Unlimited bandwidth'] }
      ],
      related: ['wifi', 'code', 'panel']
    },
    {
      id: 'panel',
      title: 'Panel Pterodactyl',
      category: 'technical',
      base_price: 150000,
      discount_price: 129000,
      stock: 100,
      image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400',
      icon: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=200',
      rating: 4.9,
      reviews: 145,
      duration: '1-2 jam',
      description: 'Panel manajemen game server Pterodactyl profesional dengan domain custom.',
      tags: ['game', 'server', 'panel', 'hosting', 'pterodactyl'],
      tiers: [
        { name: 'Starter', price: 129000, features: ['1GB RAM per server', '3 servers', 'Unlimited databases', 'SFTP Access', 'Domain: panel.lumakara.my.id'] },
        { name: 'Pro', price: 249000, features: ['2GB RAM per server', '5 servers', 'Unlimited databases', 'SFTP Access', 'Backup system', 'Domain: panel.lumakara.my.id'] },
        { name: 'Enterprise', price: 499000, features: ['4GB RAM per server', '10 servers', 'Unlimited databases', 'SFTP Access', 'Backup system', 'Priority support', 'Domain: panel.lumakara.my.id'] }
      ],
      related: ['vps', 'code', 'wifi'],
      requiresForm: true,
      formType: 'panel'
    },
    {
      id: 'website',
      title: 'Website Development',
      category: 'technical',
      base_price: 999000,
      discount_price: 799000,
      stock: 30,
      image: 'https://images.unsplash.com/photo-1547658719-da2b51169166?w=400',
      icon: 'https://images.unsplash.com/photo-1547658719-da2b51169166?w=200',
      rating: 4.8,
      reviews: 78,
      duration: '7-14 hari',
      description: 'Pembuatan website profesional dengan desain modern.',
      tags: ['website', 'development', 'coding', 'design'],
      tiers: [
        { name: 'Landing Page', price: 799000, features: ['1 halaman', 'Design responsive', 'SEO basic', '3 revisi'] },
        { name: 'Company Profile', price: 1499000, features: ['5-7 halaman', 'Design custom', 'SEO optimized', 'CMS integration', '5 revisi'] },
        { name: 'E-Commerce', price: 2999000, features: ['Unlimited halaman', 'Design premium', 'Payment gateway', 'Admin dashboard', 'Unlimited revisi'] }
      ],
      related: ['code', 'photo', 'video']
    },
    {
      id: 'design',
      title: 'Graphic Design',
      category: 'creative',
      base_price: 149000,
      discount_price: 99000,
      stock: 200,
      image: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=400',
      icon: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=200',
      rating: 4.7,
      reviews: 112,
      duration: '2-5 hari',
      description: 'Jasa desain grafis profesional untuk logo dan branding.',
      tags: ['design', 'creative', 'branding', 'logo'],
      tiers: [
        { name: 'Basic', price: 99000, features: ['1 konsep logo', 'File PNG & JPG', '3 revisi', 'Hak cipta penuh'] },
        { name: 'Business', price: 249000, features: ['3 konsep logo', 'File vector', 'Social media kit', '5 revisi', 'Hak cipta penuh'] },
        { name: 'Complete Branding', price: 599000, features: ['5 konsep logo', 'Complete brand identity', 'Stationery design', 'Social media kit', 'Brand guidelines', 'Unlimited revisi'] }
      ],
      related: ['photo', 'video', 'website']
    }
  ];
}

// Export database instance
export { db, dbInitialized };
export default { ProductService, UserService, TicketService, OrderService, DatabaseUtils };
