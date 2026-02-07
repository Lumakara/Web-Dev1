/**
 * UNIVERSAL AUTH HOOK - Firebase + Supabase
 * Automatically switches between providers based on availability
 */

import { useEffect, useState, useCallback } from 'react';
import { FirebaseAuth } from '@/lib/firebase';
import { 
  SupabaseAuth,
  testSupabaseConnection,
  isConfigured as isSupabaseConfigured
} from '@/lib/supabase';
import { UserService } from '@/lib/firebase-db';
import { useAppStore } from '@/store/appStore';
import { EmailService } from '@/lib/emailjs';
import { TelegramBot } from '@/lib/telegram';
import { toast } from 'sonner';
import { showErrorBox } from '@/lib/error-tracker';

// ============================================
// TYPES
// ============================================

export type AuthProvider = 'firebase' | 'supabase' | 'none';

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

export interface AuthState {
  provider: AuthProvider;
  isLoading: boolean;
  error: string | null;
  status: {
    firebase: { configured: boolean; working: boolean };
    supabase: { configured: boolean; working: boolean };
  };
}

// ============================================
// NETWORK & RETRY HELPERS
// ============================================

const waitForNetwork = (timeout = 10000): Promise<boolean> => {
  return new Promise((resolve) => {
    if (navigator.onLine) {
      resolve(true);
      return;
    }
    
    const timer = setTimeout(() => resolve(false), timeout);
    
    const handleOnline = () => {
      clearTimeout(timer);
      window.removeEventListener('online', handleOnline);
      resolve(true);
    };
    
    window.addEventListener('online', handleOnline);
  });
};

const withRetry = async <T,>(
  operation: () => Promise<T>,
  options: { maxRetries?: number; delay?: number } = {}
): Promise<T> => {
  const { maxRetries = 3, delay = 1000 } = options;
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (!navigator.onLine) {
        const isOnline = await waitForNetwork(5000);
        if (!isOnline) {
          throw new Error('auth/network-request-failed');
        }
      }
      
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      const nonRetryableErrors = [
        'user-not-found',
        'wrong-password',
        'invalid-email',
        'email-already-in-use',
        'weak-password',
        'popup-closed-by-user',
        'invalid_credentials',
        'user_already_exists',
      ];
      
      if (nonRetryableErrors.some(e => error.message?.toLowerCase().includes(e))) {
        throw error;
      }
      
      if (attempt < maxRetries - 1) {
        const backoffDelay = delay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }
  }
  
  throw lastError;
};

// ============================================
// MAIN HOOK
// ============================================

export const useAuth = () => {
  const { user, setUser, setProfile, logout, isAuthenticated } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authProvider, setAuthProvider] = useState<AuthProvider>('none');
  const [status, setStatus] = useState<AuthState['status']>({
    firebase: { configured: false, working: false },
    supabase: { configured: false, working: false },
  });

  // Detect available auth provider on mount
  useEffect(() => {
    const detectProvider = async () => {
      try {
        const fbStatus = FirebaseAuth.getStatus();
        const sbConfigured = isSupabaseConfigured;
        
        // Test Supabase connection
        let sbWorking = false;
        if (sbConfigured) {
          const sbTest = await testSupabaseConnection();
          sbWorking = sbTest.success;
        }

        setStatus({
          firebase: { 
            configured: fbStatus.isConfigured, 
            working: fbStatus.isInitialized 
          },
          supabase: { 
            configured: sbConfigured, 
            working: sbWorking 
          },
        });

        // Priority: Supabase > Firebase > None
        if (sbConfigured) {
          console.log('[AUTH] Using Supabase as auth provider');
          setAuthProvider('supabase');
        } else if (fbStatus.isConfigured) {
          console.log('[AUTH] Using Firebase as auth provider');
          setAuthProvider('firebase');
        } else {
          showErrorBox('⚠️ AUTH CONFIG', {
            'Error': 'No auth provider configured',
            'Firebase': fbStatus.isConfigured ? 'OK' : 'Not configured',
            'Supabase': sbConfigured ? 'OK' : 'Not configured',
          }, 'warn');
          setAuthProvider('none');
        }
      } catch (error) {
        showErrorBox('💥 AUTH DETECT ERROR', {
          'Error': error instanceof Error ? error.message : 'Unknown',
        }, 'error');
        setAuthProvider('none');
      }
    };

    detectProvider();
  }, []);

  // Listen to auth state changes
  useEffect(() => {
    if (authProvider === 'none') {
      setIsLoading(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    const setupAuthListener = async () => {
      try {
        if (authProvider === 'supabase') {
          // Check existing session first
          const currentUser = await SupabaseAuth.getCurrentUser();
          if (currentUser) {
            handleUserLogin(currentUser);
          }

          // Listen for changes
          const { data: { subscription } } = SupabaseAuth.onAuthStateChanged((user) => {
            if (user) {
              handleUserLogin(user);
            } else {
              setUser(null);
              setProfile(null);
            }
            setIsLoading(false);
          });

          unsubscribe = () => subscription.unsubscribe();
        } else if (authProvider === 'firebase') {
          // Check existing user
          const currentUser = FirebaseAuth.getCurrentUser();
          if (currentUser) {
            const authUser: AuthUser = {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
              phoneNumber: currentUser.phoneNumber,
              emailVerified: currentUser.emailVerified,
              createdAt: currentUser.metadata?.creationTime,
              lastLoginAt: currentUser.metadata?.lastSignInTime,
            };
            handleUserLogin(authUser);
          }

          // Listen for changes
          unsubscribe = FirebaseAuth.onAuthStateChanged((firebaseUser) => {
            if (firebaseUser) {
              const authUser: AuthUser = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
                phoneNumber: firebaseUser.phoneNumber,
                emailVerified: firebaseUser.emailVerified,
                createdAt: firebaseUser.metadata?.creationTime,
                lastLoginAt: firebaseUser.metadata?.lastSignInTime,
              };
              handleUserLogin(authUser);
            } else {
              setUser(null);
              setProfile(null);
            }
            setIsLoading(false);
          });
        }
      } catch (error) {
        showErrorBox('💥 AUTH LISTENER ERROR', {
          'Error': error instanceof Error ? error.message : 'Unknown',
          'Provider': authProvider,
        }, 'error');
        setIsLoading(false);
      }
    };

    setupAuthListener();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [authProvider, setUser, setProfile]);

  // Handle user login (common logic)
  const handleUserLogin = async (authUser: AuthUser) => {
    setUser(authUser);

    // Fetch or create profile in Firestore (optional - for extra data)
    try {
      let profile = await UserService.getProfile(authUser.uid);
      if (!profile) {
        // Create new profile
        const newProfile = {
          id: authUser.uid,
          email: authUser.email || '',
          full_name: authUser.displayName || 'User',
          avatar_url: authUser.photoURL || '',
        };
        await UserService.createProfile(newProfile);
        profile = newProfile;
      }
      setProfile(profile);
    } catch (error) {
      console.error('[AUTH] Error fetching/creating profile:', error);
    }
  };

  // Sign in with Google
  const signInWithGoogle = useCallback(async () => {
    setError(null);
    
    try {
      setIsLoading(true);
      
      if (authProvider === 'supabase') {
        await SupabaseAuth.signInWithGoogle();
        // Note: OAuth redirects, so user will return after
        toast.success('Mengarahkan ke Google...');
        return { uid: 'redirecting', email: null, displayName: 'Redirecting...' } as AuthUser;
      } else if (authProvider === 'firebase') {
        const user = await withRetry(() => FirebaseAuth.signInWithGoogle(), { maxRetries: 3 });
        setUser(user);
        
        // Create profile if doesn't exist
        let profile = await UserService.getProfile(user.uid);
        let isNewUser = false;
        if (!profile) {
          isNewUser = true;
          const newProfile = {
            id: user.uid,
            email: user.email || '',
            full_name: user.displayName || 'User',
            avatar_url: user.photoURL || '',
          };
          await UserService.createProfile(newProfile);
          profile = newProfile;
          
          // Send welcome email
          try {
            await EmailService.sendRegistrationEmail({
              to_email: user.email || '',
              to_name: user.displayName || 'User',
              user_email: user.email || '',
              registration_date: new Date().toLocaleDateString('id-ID'),
            });
          } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
          }
          
          // Send Telegram notification
          try {
            await TelegramBot.sendNewUserNotification({
              id: user.uid,
              email: user.email || '',
              name: user.displayName || 'User',
              role: 'user',
              avatar: user.photoURL || undefined,
              registrationMethod: 'Google',
            });
          } catch (telegramError) {
            console.error('Failed to send Telegram notification:', telegramError);
          }
        }
        setProfile(profile);
        
        if (isNewUser) {
          toast.success(`Selamat datang, ${user.displayName || 'User'}! 🎉`);
        } else {
          toast.success(`Selamat datang kembali, ${user.displayName || 'User'}! 👋`);
        }
        
        return user;
      } else {
        throw new Error('Tidak ada provider autentikasi yang tersedia. Silakan hubungi admin.');
      }
    } catch (error: any) {
      showErrorBox('💥 SIGN IN GOOGLE ERROR', {
        'Error': error.message,
        'Provider': authProvider,
      }, 'error');
      setError(error.message);
      toast.error('Gagal masuk: ' + error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [authProvider, setUser, setProfile]);

  // Sign in with Email & Password
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setError(null);
    
    try {
      setIsLoading(true);
      
      let user: AuthUser;
      
      if (authProvider === 'supabase') {
        user = await withRetry(
          () => SupabaseAuth.signInWithEmail(email, password),
          { maxRetries: 3 }
        );
      } else if (authProvider === 'firebase') {
        user = await withRetry(
          () => FirebaseAuth.signInWithEmail(email, password),
          { maxRetries: 3 }
        );
      } else {
        throw new Error('Tidak ada provider autentikasi yang tersedia.');
      }
      
      setUser(user);
      
      const profile = await UserService.getProfile(user.uid);
      if (profile) {
        setProfile(profile);
      }
      
      toast.success(`Selamat datang kembali, ${user.displayName || email}! 👋`);
      return user;
    } catch (error: any) {
      showErrorBox('💥 SIGN IN EMAIL ERROR', {
        'Error': error.message,
        'Provider': authProvider,
      }, 'error');
      setError(error.message);
      toast.error('Gagal masuk: ' + error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [authProvider, setUser, setProfile]);

  // Register with Email & Password
  const registerWithEmail = useCallback(async (
    email: string, 
    password: string, 
    displayName: string, 
    phone?: string
  ) => {
    setError(null);
    
    try {
      setIsLoading(true);
      
      let user: AuthUser;
      
      if (authProvider === 'supabase') {
        user = await withRetry(
          () => SupabaseAuth.registerWithEmail(email, password, displayName),
          { maxRetries: 3 }
        );
      } else if (authProvider === 'firebase') {
        user = await withRetry(
          () => FirebaseAuth.registerWithEmail(email, password, displayName),
          { maxRetries: 3 }
        );
      } else {
        throw new Error('Tidak ada provider autentikasi yang tersedia.');
      }
      
      setUser(user);

      // Create profile in Firestore
      const newProfile = {
        id: user.uid,
        email: email,
        full_name: displayName,
        phone: phone || '',
        avatar_url: '',
      };
      await UserService.createProfile(newProfile);
      setProfile(newProfile);

      // Send welcome email
      try {
        await EmailService.sendRegistrationEmail({
          to_email: email,
          to_name: displayName,
          user_email: email,
          registration_date: new Date().toLocaleDateString('id-ID'),
        });
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
      }
      
      // Send Telegram notification
      try {
        await TelegramBot.sendNewUserNotification({
          id: user.uid,
          email: email,
          name: displayName,
          role: 'user',
          registrationMethod: 'Email',
        });
      } catch (telegramError) {
        console.error('Failed to send Telegram notification:', telegramError);
      }

      toast.success('Pendaftaran berhasil! Selamat datang! 🎉');
      return user;
    } catch (error: any) {
      showErrorBox('💥 REGISTER ERROR', {
        'Error': error.message,
        'Provider': authProvider,
      }, 'error');
      setError(error.message);
      toast.error('Gagal mendaftar: ' + error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [authProvider, setUser, setProfile]);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      setIsLoading(true);
      
      if (authProvider === 'supabase') {
        await SupabaseAuth.signOut();
      } else if (authProvider === 'firebase') {
        await FirebaseAuth.signOut();
      }
      
      logout();
      toast.success('Berhasil keluar');
    } catch (error: any) {
      showErrorBox('💥 SIGN OUT ERROR', {
        'Error': error.message,
        'Provider': authProvider,
      }, 'error');
      toast.error('Gagal keluar: ' + error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [authProvider, logout]);

  // Update user profile
  const updateUserProfile = useCallback(async (updates: { displayName?: string; photoURL?: string }) => {
    try {
      setIsLoading(true);
      
      if (authProvider === 'supabase') {
        await SupabaseAuth.updateProfile(updates);
      } else if (authProvider === 'firebase') {
        await FirebaseAuth.updateProfile(updates);
      }
      
      if (user) {
        const updatedUser = { ...user, ...updates };
        setUser(updatedUser);
        
        // Update in Firestore
        await UserService.updateProfile(user.uid, {
          full_name: updates.displayName,
          avatar_url: updates.photoURL,
        });
        
        const profile = await UserService.getProfile(user.uid);
        if (profile) setProfile(profile);
      }
    } catch (error: any) {
      showErrorBox('💥 UPDATE PROFILE ERROR', {
        'Error': error.message,
      }, 'error');
      toast.error('Gagal memperbarui profil: ' + error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [authProvider, user, setUser, setProfile]);

  // Reset password
  const resetPassword = useCallback(async (email: string) => {
    try {
      if (authProvider === 'supabase') {
        await SupabaseAuth.sendPasswordResetEmail(email);
      } else if (authProvider === 'firebase') {
        await FirebaseAuth.sendPasswordResetEmail(email);
      } else {
        throw new Error('Fitur reset password tidak tersedia');
      }
      
      toast.success('Email reset password telah dikirim');
    } catch (error: any) {
      showErrorBox('💥 RESET PASSWORD ERROR', {
        'Error': error.message,
      }, 'error');
      toast.error('Gagal mengirim email reset: ' + error.message);
      throw error;
    }
  }, [authProvider]);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    authProvider,
    providerStatus: status,
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    signOut,
    updateProfile: updateUserProfile,
    resetPassword,
  };
};

export default useAuth;
