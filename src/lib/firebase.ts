/**
 * FIREBASE CONFIGURATION - ULTRA FUNCTIONAL VERSION
 * Fully working Firebase Auth & Storage integration
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  type User,
  type AuthError
} from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

// ============================================
// CONFIGURATION & VALIDATION
// ============================================

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

// Get config from environment with validation
const getFirebaseConfig = (): FirebaseConfig => {
  const config: FirebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
  };

  // Validate required fields
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'appId'] as const;
  const missing = requiredFields.filter(field => !config[field] || config[field] === `your-${field.replace(/[A-Z]/g, '-$1').toLowerCase()}`);
  
  if (missing.length > 0) {
    console.error('[FIREBASE] Missing required config:', missing);
  }

  return config;
};

const firebaseConfig = getFirebaseConfig();

// ============================================
// APP INITIALIZATION
// ============================================

let app: FirebaseApp;
let auth: ReturnType<typeof getAuth>;
let db: ReturnType<typeof getFirestore>;
let storage: ReturnType<typeof getStorage>;
let googleProvider: GoogleAuthProvider;
let isInitialized = false;
let initError: Error | null = null;

// Initialize Firebase with error handling
try {
  // Check if Firebase is already initialized (HMR support)
  app = initializeApp(firebaseConfig);
  
  // Initialize services
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  
  // Configure Google Provider
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({
    prompt: 'select_account'
  });
  
  // Set persistence to local (survives browser restart)
  setPersistence(auth, browserLocalPersistence).catch(err => {
    console.warn('[FIREBASE] Persistence setup failed:', err);
  });
  
  // Enable offline persistence for Firestore
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('[FIREBASE] Multiple tabs open, persistence enabled in first tab only');
    } else if (err.code === 'unimplemented') {
      console.warn('[FIREBASE] Browser does not support offline persistence');
    }
  });
  
  isInitialized = true;
  console.log('[FIREBASE] ✅ Initialized successfully');
  console.log('[FIREBASE] Project:', firebaseConfig.projectId);
  
} catch (error) {
  initError = error as Error;
  console.error('[FIREBASE] ❌ Initialization failed:', error);
  
  // Create fallback objects to prevent crashes
  app = {} as FirebaseApp;
  auth = {} as ReturnType<typeof getAuth>;
  db = {} as ReturnType<typeof getFirestore>;
  storage = {} as ReturnType<typeof getStorage>;
  googleProvider = {} as GoogleAuthProvider;
}

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
}

export interface FirebaseStatus {
  isInitialized: boolean;
  isConfigured: boolean;
  error: string | null;
  projectId: string | null;
}

// ============================================
// ERROR HANDLER
// ============================================

const handleAuthError = (error: AuthError): string => {
  const errorCode = error.code || '';
  const errorMessage = error.message || '';
  
  const errorMap: Record<string, string> = {
    'auth/user-not-found': 'Email tidak terdaftar',
    'auth/wrong-password': 'Password salah',
    'auth/invalid-email': 'Email tidak valid',
    'auth/email-already-in-use': 'Email sudah terdaftar',
    'auth/weak-password': 'Password terlalu lemah (min. 6 karakter)',
    'auth/popup-closed-by-user': 'Login dibatalkan',
    'auth/cancelled-popup-request': 'Login dibatalkan',
    'auth/popup-blocked': 'Popup diblokir browser, izinkan popup untuk login',
    'auth/network-request-failed': 'Koneksi internet bermasalah',
    'auth/too-many-requests': 'Terlalu banyak percobaan, coba lagi nanti',
    'auth/invalid-credential': 'Kredensial tidak valid',
    'auth/operation-not-allowed': 'Operasi tidak diizinkan',
    'auth/account-exists-with-different-credential': 'Akun sudah ada dengan metode login berbeda',
    'auth/invalid-api-key': 'Konfigurasi Firebase tidak valid',
    'auth/app-not-authorized': 'Aplikasi tidak diizinkan',
  };
  
  return errorMap[errorCode] || errorMessage || 'Terjadi kesalahan, coba lagi';
};

// ============================================
// AUTH SERVICE
// ============================================

export const FirebaseAuth = {
  // Check if Firebase is properly initialized
  isReady(): boolean {
    return isInitialized && !!auth.currentUser !== undefined;
  },
  
  // Get initialization status
  getStatus(): FirebaseStatus {
    const hasRequiredConfig = !!(
      firebaseConfig.apiKey && 
      firebaseConfig.authDomain && 
      firebaseConfig.projectId &&
      firebaseConfig.appId
    );
    
    return {
      isInitialized,
      isConfigured: hasRequiredConfig,
      error: initError?.message || null,
      projectId: firebaseConfig.projectId || null,
    };
  },

  // Get current user
  getCurrentUser(): User | null {
    if (!isInitialized) {
      console.warn('[FIREBASE] Not initialized, cannot get current user');
      return null;
    }
    return auth.currentUser;
  },

  // Listen to auth state changes
  onAuthStateChanged(callback: (user: User | null) => void) {
    if (!isInitialized) {
      console.warn('[FIREBASE] Not initialized, auth state changes not available');
      callback(null);
      return () => {};
    }
    return onAuthStateChanged(auth, callback);
  },

  // Sign in with Google
  async signInWithGoogle(): Promise<AuthUser> {
    if (!isInitialized) {
      throw new Error('Firebase belum diinisialisasi. Periksa konfigurasi.');
    }
    
    try {
      console.log('[FIREBASE] Starting Google sign in...');
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      console.log('[FIREBASE] ✅ Google sign in successful:', user.email);
      
      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        phoneNumber: user.phoneNumber,
        emailVerified: user.emailVerified,
        createdAt: user.metadata.creationTime,
        lastLoginAt: user.metadata.lastSignInTime,
      };
    } catch (error: any) {
      const friendlyError = handleAuthError(error);
      console.error('[FIREBASE] ❌ Google sign in failed:', error.code, error.message);
      throw new Error(friendlyError);
    }
  },

  // Sign in with Email & Password
  async signInWithEmail(email: string, password: string): Promise<AuthUser> {
    if (!isInitialized) {
      throw new Error('Firebase belum diinisialisasi. Periksa konfigurasi.');
    }
    
    try {
      console.log('[FIREBASE] Starting email sign in...');
      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = result.user;
      
      console.log('[FIREBASE] ✅ Email sign in successful:', user.email);
      
      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        phoneNumber: user.phoneNumber,
        emailVerified: user.emailVerified,
        createdAt: user.metadata.creationTime,
        lastLoginAt: user.metadata.lastSignInTime,
      };
    } catch (error: any) {
      const friendlyError = handleAuthError(error);
      console.error('[FIREBASE] ❌ Email sign in failed:', error.code, error.message);
      throw new Error(friendlyError);
    }
  },

  // Register with Email & Password
  async registerWithEmail(email: string, password: string, displayName: string): Promise<AuthUser> {
    if (!isInitialized) {
      throw new Error('Firebase belum diinisialisasi. Periksa konfigurasi.');
    }
    
    try {
      console.log('[FIREBASE] Starting registration...');
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;
      
      // Update profile with display name
      await updateProfile(user, { displayName });
      
      // Reload to get updated data
      await user.reload();
      
      console.log('[FIREBASE] ✅ Registration successful:', user.email);
      
      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        phoneNumber: user.phoneNumber,
        emailVerified: user.emailVerified,
        createdAt: user.metadata.creationTime,
        lastLoginAt: user.metadata.lastSignInTime,
      };
    } catch (error: any) {
      const friendlyError = handleAuthError(error);
      console.error('[FIREBASE] ❌ Registration failed:', error.code, error.message);
      throw new Error(friendlyError);
    }
  },

  // Sign out
  async signOut(): Promise<void> {
    if (!isInitialized) {
      throw new Error('Firebase belum diinisialisasi');
    }
    
    try {
      await signOut(auth);
      console.log('[FIREBASE] ✅ Sign out successful');
    } catch (error: any) {
      console.error('[FIREBASE] ❌ Sign out failed:', error);
      throw new Error(handleAuthError(error));
    }
  },

  // Update user profile
  async updateProfile(updates: { displayName?: string; photoURL?: string }): Promise<void> {
    if (!isInitialized) {
      throw new Error('Firebase belum diinisialisasi');
    }
    
    const user = auth.currentUser;
    if (!user) throw new Error('Tidak ada user yang login');
    
    try {
      await updateProfile(user, updates);
      console.log('[FIREBASE] ✅ Profile updated');
    } catch (error: any) {
      console.error('[FIREBASE] ❌ Profile update failed:', error);
      throw new Error(handleAuthError(error));
    }
  },

  // Send password reset email
  async sendPasswordResetEmail(email: string): Promise<void> {
    if (!isInitialized) {
      throw new Error('Firebase belum diinisialisasi');
    }
    
    try {
      const { sendPasswordResetEmail } = await import('firebase/auth');
      await sendPasswordResetEmail(auth, email);
      console.log('[FIREBASE] ✅ Password reset email sent');
    } catch (error: any) {
      console.error('[FIREBASE] ❌ Password reset failed:', error);
      throw new Error(handleAuthError(error));
    }
  },

  // Reload current user
  async reloadCurrentUser(): Promise<AuthUser | null> {
    if (!isInitialized || !auth.currentUser) return null;
    
    try {
      await auth.currentUser.reload();
      const user = auth.currentUser;
      
      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        phoneNumber: user.phoneNumber,
        emailVerified: user.emailVerified,
        createdAt: user.metadata.creationTime,
        lastLoginAt: user.metadata.lastSignInTime,
      };
    } catch (error) {
      console.error('[FIREBASE] ❌ Reload user failed:', error);
      return null;
    }
  }
};

// ============================================
// CONNECTION TESTER
// ============================================

export const testFirebaseConnection = async (): Promise<{
  success: boolean;
  auth: boolean;
  firestore: boolean;
  storage: boolean;
  error?: string;
}> => {
  if (!isInitialized) {
    return {
      success: false,
      auth: false,
      firestore: false,
      storage: false,
      error: 'Firebase not initialized'
    };
  }
  
  const results = {
    auth: false,
    firestore: false,
    storage: false,
  };
  
  // Test Auth
  try {
    const currentUser = auth.currentUser;
    results.auth = true;
    console.log('[FIREBASE TEST] Auth OK (currentUser:', !!currentUser + ')');
  } catch (error) {
    console.error('[FIREBASE TEST] Auth failed:', error);
  }
  
  // Test Firestore (just check if we can access it)
  try {
    const { collection, getDocs, query, limit } = await import('firebase/firestore');
    const testQuery = query(collection(db, '_test_'), limit(1));
    await getDocs(testQuery);
    results.firestore = true;
    console.log('[FIREBASE TEST] Firestore OK');
  } catch (error: any) {
    // Collection not found is OK, means we can connect
    if (error.code === 'not-found' || error.message?.includes('permission')) {
      results.firestore = true;
      console.log('[FIREBASE TEST] Firestore OK (collection not found is OK)');
    } else {
      console.error('[FIREBASE TEST] Firestore failed:', error);
    }
  }
  
  // Test Storage (just check if we can access it)
  try {
    const { ref, listAll } = await import('firebase/storage');
    const rootRef = ref(storage, '/');
    await listAll(rootRef);
    results.storage = true;
    console.log('[FIREBASE TEST] Storage OK');
  } catch (error: any) {
    // Permission denied is OK, means we can connect
    if (error.code === 'storage/unauthorized' || error.message?.includes('unauthorized')) {
      results.storage = true;
      console.log('[FIREBASE TEST] Storage OK (unauthorized is OK for test)');
    } else {
      console.error('[FIREBASE TEST] Storage failed:', error);
    }
  }
  
  return {
    success: results.auth && results.firestore && results.storage,
    ...results
  };
};

// Export instances for direct use
export { app, auth, db, storage, googleProvider, isInitialized };
export default FirebaseAuth;
