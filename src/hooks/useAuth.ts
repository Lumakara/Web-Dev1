/**
 * AUTH HOOK - Supabase only
 * Supabase Auth only.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/appStore';
import { toast } from 'sonner';

export type AuthProvider = 'supabase' | 'none';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  emailVerified: boolean;
}

export interface UseAuthReturn {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authProvider: AuthProvider;
  login: (email: string, password: string, captchaToken: string) => Promise<void>;
  register: (email: string, password: string, displayName: string, captchaToken: string) => Promise<void>;
  loginWithGoogle: (returnTo?: string) => Promise<void>;
  loginWithGithub: (returnTo?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: { displayName?: string; photoURL?: string }) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  debugInfo: Record<string, unknown>;
}

export const useAuth = (): UseAuthReturn => {
  const { setUser, setProfile } = useAppStore();
  const [user, setLocalUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const authUser: AuthUser = {
            uid: session.user.id,
            email: session.user.email || null,
            displayName: session.user.user_metadata?.full_name || null,
            photoURL: session.user.user_metadata?.avatar_url || null,
            phoneNumber: session.user.phone || null,
            emailVerified: session.user.email_confirmed_at ? true : false,
          };
          setLocalUser(authUser);
          setUser(authUser);
          const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', session.user.id).maybeSingle();
          if (profile) setProfile({ ...profile, id: profile.user_id });
        }
      } catch (error) {
        console.error('[AUTH] Session check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const authUser: AuthUser = {
          uid: session.user.id,
          email: session.user.email || null,
          displayName: session.user.user_metadata?.full_name || null,
          photoURL: session.user.user_metadata?.avatar_url || null,
          phoneNumber: session.user.phone || null,
          emailVerified: session.user.email_confirmed_at ? true : false,
        };
        setLocalUser(authUser);
        setUser(authUser);
        const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', session.user.id).maybeSingle();
        if (profile) setProfile({ ...profile, id: profile.user_id });
      } else {
        setLocalUser(null);
        setUser(null);
        setProfile(null);
      }
    });

    return () => subscription?.unsubscribe();
  }, [setUser, setProfile]);

  const login = useCallback(async (email: string, password: string, captchaToken: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken } });
      if (error) throw error;
      toast.success('Login berhasil!');
    } catch (error: any) {
      toast.error('Login gagal: ' + (error.message || 'Unknown error'));
      throw error;
    }
  }, []);

  const register = useCallback(async (email: string, password: string, displayName: string, captchaToken: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: displayName },
          captchaToken,
        },
      });
      if (error) throw error;
      toast.success('Registrasi berhasil! Silakan login.');
    } catch (error: any) {
      toast.error('Registrasi gagal: ' + (error.message || 'Unknown error'));
      throw error;
    }
  }, []);

  const startOAuth = useCallback(async (provider: 'google' | 'github', returnTo = '/') => {
    try {
      const safeReturnTo = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/';
      sessionStorage.setItem('oauth_return_to', safeReturnTo);
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth` },
      });
      if (error) throw error;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`${provider === 'google' ? 'Google' : 'GitHub'} login gagal: ${message}`);
      throw error;
    }
  }, []);

  const loginWithGoogle = useCallback((returnTo?: string) => startOAuth('google', returnTo), [startOAuth]);
  const loginWithGithub = useCallback((returnTo?: string) => startOAuth('github', returnTo), [startOAuth]);

  const logout = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Logout berhasil!');
    } catch (error: any) {
      toast.error('Logout gagal: ' + (error.message || 'Unknown error'));
      throw error;
    }
  }, []);

  const updateProfile = useCallback(async (updates: { displayName?: string; photoURL?: string }) => {
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: updates.displayName,
          avatar_url: updates.photoURL,
        },
      });
      if (error) throw error;
      toast.success('Profile updated!');
    } catch (error: any) {
      toast.error('Update gagal: ' + (error.message || 'Unknown error'));
      throw error;
    }
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?mode=reset`,
      });
      if (error) throw error;
      toast.success('Reset link dikirim ke email!');
    } catch (error: any) {
      toast.error('Reset gagal: ' + (error.message || 'Unknown error'));
      throw error;
    }
  }, []);

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    authProvider: user ? 'supabase' : 'none',
    login,
    register,
    loginWithGoogle,
    loginWithGithub,
    logout,
    updateProfile,
    sendPasswordReset,
    debugInfo: {
      user: user?.email,
      provider: 'supabase',
      isLoading,
    },
  };
};
