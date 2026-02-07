/**
 * SUPABASE CONFIGURATION - ULTRA FUNCTIONAL VERSION
 * Complete authentication & database integration
 * 
 * Setup Instructions:
 * 1. Go to https://supabase.com
 * 2. Create new project
 * 3. Get URL and anon key from Settings > API
 * 4. Add to .env file
 */

import { createClient, type SupabaseClient, type AuthError } from '@supabase/supabase-js';

// ============================================
// CONFIGURATION
// ============================================

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const isConfigured = Boolean(supabaseUrl && supabaseAnonKey && 
  supabaseUrl.startsWith('https://') && 
  supabaseAnonKey.length > 20);

if (!isConfigured) {
  console.warn('[SUPABASE] ⚠️ Configuration missing or invalid. Please check your .env file.');
  console.warn('[SUPABASE] Expected VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

// Create Supabase client with enhanced configuration
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: localStorage,
      storageKey: 'supabase.auth.token',
    },
    global: {
      headers: {
        'X-Client-Info': 'layanan-digital@1.0.0',
      },
    },
  }
);

// ============================================
// TYPES
// ============================================

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  emailVerified: boolean;
  createdAt?: string;
  lastLoginAt?: string;
  provider?: string;
}

export interface SupabaseStatus {
  isConfigured: boolean;
  isConnected: boolean;
  url: string | null;
  error: string | null;
}

// ============================================
// ERROR HANDLER
// ============================================

const handleAuthError = (error: AuthError): string => {
  const errorMap: Record<string, string> = {
    'invalid_credentials': 'Email atau password salah',
    'user_not_found': 'Email tidak terdaftar',
    'email_not_confirmed': 'Email belum dikonfirmasi. Silakan cek inbox Anda.',
    'email_exists': 'Email sudah terdaftar',
    'weak_password': 'Password terlalu lemah (minimal 6 karakter)',
    'provider_disabled': 'Login dengan Google tidak diaktifkan',
    'user_already_exists': 'User sudah ada',
    'signup_disabled': 'Pendaftaran sedang ditutup',
    'timeout': 'Waktu habis. Silakan coba lagi.',
    'over_email_send_rate_limit': 'Terlalu banyak percobaan. Coba lagi nanti.',
    'invalid_email': 'Format email tidak valid',
    'over_request_rate_limit': 'Terlalu banyak request. Coba lagi nanti.',
  };
  
  return errorMap[error.name] || error.message || 'Terjadi kesalahan. Silakan coba lagi.';
};

// ============================================
// AUTH SERVICE
// ============================================

export const SupabaseAuth = {
  // Check if Supabase is properly configured
  isReady(): boolean {
    return isConfigured;
  },

  // Get configuration status
  getStatus(): SupabaseStatus {
    return {
      isConfigured,
      isConnected: isConfigured,
      url: supabaseUrl || null,
      error: isConfigured ? null : 'Supabase not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY',
    };
  },

  // Get current session
  async getCurrentSession() {
    if (!isConfigured) return null;
    
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      return session;
    } catch (error) {
      console.error('[SUPABASE] ❌ Get session error:', error);
      return null;
    }
  },

  // Get current user
  async getCurrentUser(): Promise<AuthUser | null> {
    if (!isConfigured) return null;
    
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return null;
      
      return {
        uid: user.id,
        email: user.email || null,
        displayName: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        photoURL: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        phoneNumber: user.phone || null,
        emailVerified: user.email_confirmed_at != null,
        createdAt: user.created_at,
        lastLoginAt: user.last_sign_in_at || undefined,
        provider: user.app_metadata?.provider || 'email',
      };
    } catch (error) {
      console.error('[SUPABASE] ❌ Get user error:', error);
      return null;
    }
  },

  // Listen to auth state changes
  onAuthStateChanged(callback: (user: AuthUser | null) => void) {
    if (!isConfigured) {
      console.warn('[SUPABASE] Not configured, auth state changes not available');
      callback(null);
      return { data: { subscription: { unsubscribe: () => {} } } };
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[SUPABASE] Auth state changed:', event);
        
        if (session?.user) {
          const authUser: AuthUser = {
            uid: session.user.id,
            email: session.user.email || null,
            displayName: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
            photoURL: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null,
            phoneNumber: session.user.phone || null,
            emailVerified: session.user.email_confirmed_at != null,
            createdAt: session.user.created_at,
            lastLoginAt: session.user.last_sign_in_at || undefined,
            provider: session.user.app_metadata?.provider || 'email',
          };
          callback(authUser);
        } else {
          callback(null);
        }
      }
    );

    return { data: { subscription } };
  },

  // Sign in with Google
  async signInWithGoogle(): Promise<AuthUser> {
    if (!isConfigured) {
      throw new Error('Supabase belum dikonfigurasi. Periksa file .env Anda.');
    }

    try {
      console.log('[SUPABASE] Starting Google OAuth...');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth`,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });

      if (error) throw error;
      
      // Note: OAuth redirects, so we won't get user data immediately
      // The user will be returned after redirect
      console.log('[SUPABASE] ✅ Google OAuth initiated:', data);
      
      // Return a placeholder while redirecting
      return {
        uid: 'redirecting',
        email: null,
        displayName: 'Redirecting...',
        photoURL: null,
        phoneNumber: null,
        emailVerified: false,
      };
    } catch (error: any) {
      console.error('[SUPABASE] ❌ Google sign in failed:', error);
      throw new Error(handleAuthError(error));
    }
  },

  // Sign in with Email & Password
  async signInWithEmail(email: string, password: string): Promise<AuthUser> {
    if (!isConfigured) {
      throw new Error('Supabase belum dikonfigurasi. Periksa file .env Anda.');
    }

    try {
      console.log('[SUPABASE] Starting email sign in...');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error('Login gagal');

      console.log('[SUPABASE] ✅ Email sign in successful:', data.user.email);

      return {
        uid: data.user.id,
        email: data.user.email || null,
        displayName: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'User',
        photoURL: data.user.user_metadata?.avatar_url || null,
        phoneNumber: data.user.phone || null,
        emailVerified: data.user.email_confirmed_at != null,
        createdAt: data.user.created_at,
        lastLoginAt: data.user.last_sign_in_at || undefined,
        provider: 'email',
      };
    } catch (error: any) {
      console.error('[SUPABASE] ❌ Email sign in failed:', error);
      throw new Error(handleAuthError(error));
    }
  },

  // Register with Email & Password
  async registerWithEmail(email: string, password: string, displayName: string): Promise<AuthUser> {
    if (!isConfigured) {
      throw new Error('Supabase belum dikonfigurasi. Periksa file .env Anda.');
    }

    try {
      console.log('[SUPABASE] Starting registration...');
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: displayName,
          },
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error('Pendaftaran gagal');

      console.log('[SUPABASE] ✅ Registration successful:', data.user.email);

      return {
        uid: data.user.id,
        email: data.user.email || null,
        displayName: displayName,
        photoURL: null,
        phoneNumber: null,
        emailVerified: false,
        createdAt: data.user.created_at,
        lastLoginAt: data.user.last_sign_in_at || undefined,
        provider: 'email',
      };
    } catch (error: any) {
      console.error('[SUPABASE] ❌ Registration failed:', error);
      throw new Error(handleAuthError(error));
    }
  },

  // Sign out
  async signOut(): Promise<void> {
    if (!isConfigured) return;

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      console.log('[SUPABASE] ✅ Sign out successful');
    } catch (error: any) {
      console.error('[SUPABASE] ❌ Sign out failed:', error);
      throw new Error(handleAuthError(error));
    }
  },

  // Update user profile
  async updateProfile(updates: { displayName?: string; photoURL?: string }): Promise<void> {
    if (!isConfigured) {
      throw new Error('Supabase belum dikonfigurasi');
    }

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: updates.displayName,
          avatar_url: updates.photoURL,
        },
      });

      if (error) throw error;
      console.log('[SUPABASE] ✅ Profile updated');
    } catch (error: any) {
      console.error('[SUPABASE] ❌ Profile update failed:', error);
      throw new Error(handleAuthError(error));
    }
  },

  // Send password reset email
  async sendPasswordResetEmail(email: string): Promise<void> {
    if (!isConfigured) {
      throw new Error('Supabase belum dikonfigurasi');
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) throw error;
      console.log('[SUPABASE] ✅ Password reset email sent');
    } catch (error: any) {
      console.error('[SUPABASE] ❌ Password reset failed:', error);
      throw new Error(handleAuthError(error));
    }
  },

  // Update password (after reset)
  async updatePassword(newPassword: string): Promise<void> {
    if (!isConfigured) {
      throw new Error('Supabase belum dikonfigurasi');
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
      console.log('[SUPABASE] ✅ Password updated');
    } catch (error: any) {
      console.error('[SUPABASE] ❌ Password update failed:', error);
      throw new Error(handleAuthError(error));
    }
  },
};

// ============================================
// DATABASE SERVICE (Optional - for profiles)
// ============================================

export const SupabaseDB = {
  // Create or update user profile
  async upsertProfile(userId: string, profile: {
    email: string;
    full_name?: string;
    phone?: string;
    avatar_url?: string;
    is_admin?: boolean;
  }) {
    if (!isConfigured) throw new Error('Supabase not configured');

    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        ...profile,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
      });

    if (error) throw error;
    return data;
  },

  // Get user profile
  async getProfile(userId: string) {
    if (!isConfigured) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  },

  // Check if user is admin
  async isAdmin(userId: string): Promise<boolean> {
    if (!isConfigured) return false;

    const { data, error } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (error || !data) return false;
    return data.is_admin === true;
  },
};

// ============================================
// CONNECTION TEST
// ============================================

export const testSupabaseConnection = async (): Promise<{
  success: boolean;
  configured: boolean;
  authenticated: boolean;
  message: string;
}> => {
  if (!isConfigured) {
    return {
      success: false,
      configured: false,
      authenticated: false,
      message: 'Supabase tidak terkonfigurasi. Tambahkan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY ke .env',
    };
  }

  try {
    // Test connection by getting session
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      return {
        success: false,
        configured: true,
        authenticated: false,
        message: `Koneksi error: ${error.message}`,
      };
    }

    return {
      success: true,
      configured: true,
      authenticated: !!data.session,
      message: data.session 
        ? 'Terhubung ke Supabase (user logged in)' 
        : 'Terhubung ke Supabase (no active session)',
    };
  } catch (error: any) {
    return {
      success: false,
      configured: true,
      authenticated: false,
      message: `Error: ${error.message}`,
    };
  }
};

// Export configuration status
export { isConfigured };
export default supabase;
