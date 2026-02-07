import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product, UserProfile, Order } from '@/lib/firebase-db';
import type { AuthUser } from '@/lib/firebase';
import { audioService } from '@/lib/audio';

export interface CartItem {
  id: string;
  productId: string;
  title: string;
  tier: string;
  price: number;
  image: string;
  quantity: number;
  selected: boolean;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface AppState {
  // Auth
  user: AuthUser | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  setUser: (user: AuthUser | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  logout: () => void;

  // Products
  products: Product[];
  setProducts: (products: Product[]) => void;
  getProductById: (id: string) => Product | undefined;

  // Reviews
  reviews: Review[];
  addReview: (review: Review) => void;
  getProductReviews: (productId: string) => Review[];

  // Cart
  cart: CartItem[];
  addToCart: (product: Product, tierName: string) => void;
  removeFromCart: (index: number) => void;
  updateQuantity: (index: number, change: number) => void;
  toggleItemSelection: (index: number) => void;
  selectAllItems: (selected: boolean) => void;
  clearCart: () => void;
  getCartTotal: () => { subtotal: number; count: number };
  getSelectedItems: () => CartItem[];

  // Orders
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  addOrder: (order: Order) => void;

  // UI State
  currentSection: string;
  setCurrentSection: (section: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  notification: { message: string; type: 'success' | 'error' | 'info' } | null;
  setNotification: (notification: { message: string; type: 'success' | 'error' | 'info' } | null) => void;

  // Recently Viewed
  recentlyViewed: string[];
  addRecentlyViewed: (productId: string) => void;

  // Theme Settings (Dark Mode only)
  isDarkMode: boolean;
  toggleDarkMode: () => void;

  // Audio Settings
  soundEnabled: boolean;
  toggleSound: () => void;
  musicEnabled: boolean;
  toggleMusic: () => void;

  // Welcome Modal
  hasSeenWelcome: boolean;
  setHasSeenWelcome: (seen: boolean) => void;

  // Tutorial
  hasSeenTutorial: boolean;
  setHasSeenTutorial: (seen: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Auth
      user: null,
      profile: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setProfile: (profile) => set({ profile }),
      logout: () => set({ user: null, profile: null, isAuthenticated: false }),

      // Products
      products: [],
      setProducts: (products) => set({ products }),
      getProductById: (id) => get().products.find((p) => p.id === id),

      // Reviews
      reviews: [],
      addReview: (review) => set({ reviews: [review, ...get().reviews] }),
      getProductReviews: (productId) => get().reviews.filter((r) => r.productId === productId),

      // Cart
      cart: [],
      addToCart: (product, tierName) => {
        const tier = product.tiers.find((t) => t.name === tierName) || product.tiers[0];
        const { cart } = get();
        const existingIndex = cart.findIndex(
          (i) => i.productId === product.id && i.tier === tier.name
        );

        if (existingIndex >= 0) {
          const newCart = [...cart];
          newCart[existingIndex].quantity += 1;
          set({ cart: newCart });
        } else {
          const newItem: CartItem = {
            id: `${product.id}-${tier.name}`,
            productId: product.id,
            title: product.title,
            tier: tier.name,
            price: tier.price,
            image: product.icon,
            quantity: 1,
            selected: true,
          };
          set({ cart: [...cart, newItem] });
        }
        // Play sound effect
        audioService.playAddToCart();
      },
      removeFromCart: (index) => {
        const { cart } = get();
        audioService.playRemove();
        set({ cart: cart.filter((_, i) => i !== index) });
      },
      updateQuantity: (index, change) => {
        const { cart } = get();
        const newCart = [...cart];
        newCart[index].quantity += change;
        if (newCart[index].quantity < 1) {
          newCart.splice(index, 1);
          audioService.playRemove();
        } else {
          audioService.playClick();
        }
        set({ cart: newCart });
      },
      toggleItemSelection: (index) => {
        const { cart } = get();
        const newCart = [...cart];
        newCart[index].selected = !newCart[index].selected;
        audioService.playClick();
        set({ cart: newCart });
      },
      selectAllItems: (selected) => {
        const { cart } = get();
        audioService.playClick();
        set({ cart: cart.map((item) => ({ ...item, selected })) });
      },
      clearCart: () => {
        audioService.playSuccess();
        set({ cart: [] });
      },
      getCartTotal: () => {
        const { cart } = get();
        const selected = cart.filter((item) => item.selected);
        return {
          subtotal: selected.reduce((sum, item) => sum + item.price * item.quantity, 0),
          count: selected.reduce((sum, item) => sum + item.quantity, 0),
        };
      },
      getSelectedItems: () => {
        return get().cart.filter((item) => item.selected);
      },

      // Orders
      orders: [],
      setOrders: (orders) => set({ orders }),
      addOrder: (order) => {
        audioService.playSuccess();
        set({ orders: [order, ...get().orders] });
      },

      // UI State
      currentSection: 'home',
      setCurrentSection: (section) => set({ currentSection: section }),
      isLoading: false,
      setIsLoading: (loading) => set({ isLoading: loading }),
      notification: null,
      setNotification: (notification) => set({ notification }),

      // Recently Viewed
      recentlyViewed: [],
      addRecentlyViewed: (productId) => {
        const { recentlyViewed } = get();
        const filtered = recentlyViewed.filter((id) => id !== productId);
        set({ recentlyViewed: [productId, ...filtered].slice(0, 10) });
      },

      // Theme Settings (Dark Mode only)
      isDarkMode: false,
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),

      // Audio Settings
      soundEnabled: true,
      toggleSound: () => {
        const newState = audioService.toggleSound();
        set({ soundEnabled: newState });
      },
      musicEnabled: false,
      toggleMusic: () => {
        const newState = audioService.toggleMusic();
        set({ musicEnabled: newState });
      },

      // Welcome Modal
      hasSeenWelcome: false,
      setHasSeenWelcome: (seen) => set({ hasSeenWelcome: seen }),

      // Tutorial
      hasSeenTutorial: false,
      setHasSeenTutorial: (seen) => set({ hasSeenTutorial: seen }),
    }),
    {
      name: 'layanan-digital-storage',
      partialize: (state) => ({
        cart: state.cart,
        recentlyViewed: state.recentlyViewed,
        orders: state.orders,
        isDarkMode: state.isDarkMode,
        soundEnabled: state.soundEnabled,
        musicEnabled: state.musicEnabled,
        hasSeenWelcome: state.hasSeenWelcome,
        hasSeenTutorial: state.hasSeenTutorial,
      }),
    }
  )
);
