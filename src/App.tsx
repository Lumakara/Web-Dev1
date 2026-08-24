import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Sidebar } from '@/components/Sidebar';
import { BrandIntro } from '@/components/BrandIntro';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import { Chatbot } from '@/components/Chatbot';
import { FlashSaleBanner } from '@/components/FlashSaleBanner';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SEO, SEOConfig } from '@/components/SEO';
import { IntroSplash } from '@/components/IntroSplash';
import { WelcomeModal } from '@/components/WelcomeModal';

import { NotFound } from '@/pages/NotFound';
import { SessionExpired } from '@/pages/SessionExpired';
import { useAppStore } from '@/store/appStore';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { audioService } from '@/lib/audio';
import { 
  initPWA, 
  onConnectionStatusChange, 
  isOnline,
  getDisplayMode 
} from '@/lib/pwa';
import { useIdleTimer } from '@/hooks/useIdleTimer';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import './App.css';

// =============================================================================
// LAZY LOADED COMPONENTS - Optimized for Performance
// =============================================================================

// Preload critical components
const HomeSection = lazy(() => import('@/sections/HomeSection'));
const ProductSection = lazy(() => import('@/sections/ProductSection'));
const CartSection = lazy(() => import('@/sections/CartSection'));
const AuthSection = lazy(() => import('@/sections/AuthSection'));
const SupportSection = lazy(() => import('@/sections/SupportSection'));
const ProfileSection = lazy(() => import('@/sections/ProfileSection'));
const CheckoutSection = lazy(() => import('@/sections/CheckoutSection'));

// Non-critical components loaded lazily
const SearchSection = lazy(() => import('@/sections/SearchSection'));

// =============================================================================
// LOADING COMPONENTS
// =============================================================================

/**
 * Section Loader Component
 * Shown while section components are loading
 */
function SectionLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-blue-500" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Memuat konten...</p>
      </div>
    </div>
  );
}



// =============================================================================
// CONNECTION STATUS COMPONENT
// =============================================================================

function ConnectionStatusBar({ isDarkMode }: { isDarkMode: boolean }) {
  const [isConnected, setIsConnected] = useState(isOnline());
  const [showBar, setShowBar] = useState(false);

  useEffect(() => {
    const unsubscribe = onConnectionStatusChange((online) => {
      setIsConnected(online);
      setShowBar(true);
      
      if (online) {
        toast.success('Koneksi internet tersambung kembali', {
          icon: <Wifi className="h-4 w-4" />,
        });
      } else {
        toast.error('Koneksi internet terputus', {
          icon: <WifiOff className="h-4 w-4" />,
          duration: 5000,
        });
      }

      if (online) {
        const timer = setTimeout(() => setShowBar(false), 3000);
        return () => clearTimeout(timer);
      }
    });

    return () => unsubscribe();
  }, []);

  if (!showBar) return null;

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-[60] flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-300',
        isConnected
          ? 'bg-green-500 text-white'
          : isDarkMode
          ? 'bg-red-600 text-white'
          : 'bg-red-500 text-white'
      )}
    >
      {isConnected ? (
        <>
          <Wifi className="h-4 w-4" />
          <span>Terhubung ke internet</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          <span>Tidak ada koneksi internet</span>
        </>
      )}
    </div>
  );
}

// =============================================================================
// UPDATE NOTIFICATION COMPONENT
// =============================================================================

function UpdateNotification({ isDarkMode }: { isDarkMode: boolean }) {
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    const handleUpdate = () => setShowUpdate(true);
    window.addEventListener('sw-update-available', handleUpdate);
    return () => window.removeEventListener('sw-update-available', handleUpdate);
  }, []);

  if (!showUpdate) return null;

  return (
    <div
      className={cn(
        'fixed top-16 left-4 right-4 z-50 mx-auto max-w-md',
        'rounded-lg p-4 shadow-lg animate-in fade-in slide-in-from-top-4',
        isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-medium">Pembaruan Tersedia</p>
          <p className="text-sm text-white/80">
            Versi baru aplikasi telah tersedia.
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="shrink-0 rounded-lg bg-white px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
        >
          Update
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// SEO CONFIG HELPER
// =============================================================================

function getSEOConfig(pathname: string) {
  if (pathname === '/') return SEOConfig.home;
  if (pathname.startsWith('/product/')) return SEOConfig.home;
  if (pathname === '/cart') return SEOConfig.cart;
  if (pathname === '/checkout') return SEOConfig.checkout;
  if (pathname === '/profile') return SEOConfig.profile;
  if (pathname === '/support') return SEOConfig.support;
  if (pathname === '/auth') return SEOConfig.auth;
  if (pathname.startsWith('/admin')) return SEOConfig.admin;
  return SEOConfig.home;
}

// =============================================================================
// THEME PROVIDER COMPONENT
// =============================================================================

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { isDarkMode } = useAppStore();
  
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  return <>{children}</>;
}

// =============================================================================
// MAIN APP COMPONENT
// =============================================================================

function App() {
  const { 
    notification, 
    setNotification, 
    isDarkMode, 
    soundEnabled, 
  } = useAppStore();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [displayMode, setDisplayMode] = useState<string>('browser');
  const [showIntro, setShowIntro] = useState(!sessionStorage.getItem('intro_shown'));
  const location = useLocation();
  const navigate = useNavigate();

  // Session timeout (2 jam idle)
  useIdleTimer();

  // Initialize PWA features
  useEffect(() => {
    initPWA();
    
    const mode = getDisplayMode();
    setDisplayMode(mode);

    const handleInstalled = () => {
      toast.success('Aplikasi berhasil diinstall!');
    };
    window.addEventListener('pwa-installed', handleInstalled);

    return () => {
      window.removeEventListener('pwa-installed', handleInstalled);
    };
  }, []);

  // Show notifications
  useEffect(() => {
    if (notification) {
      toast[notification.type](notification.message);
      setNotification(null);
    }
  }, [notification, setNotification]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        navigate('/search');
      }
      if (e.key === 'Escape') {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Determine if we should show header/bottom nav
  const isCheckout = location.pathname === '/checkout';
  const isProductDetail = location.pathname.startsWith('/product/');
  const hideNav = isCheckout || isProductDetail;
  const isStandalone = displayMode === 'standalone';

  return (
    <ThemeProvider>
      {/* Intro Splash - sekali per session */}
      {showIntro && <IntroSplash onComplete={() => setShowIntro(false)} />}

      {/* Welcome Modal - sekali selamanya */}
      {!showIntro && <WelcomeModal />}

      <div className={cn(
        "min-h-screen transition-colors",
        isDarkMode ? "bg-gray-900" : "bg-gray-50"
      )}>
        {/* Connection Status Bar */}
        <ConnectionStatusBar isDarkMode={isDarkMode} />

        {/* Offline Banner */}
        <OfflineBanner />

        {/* Update Notification */}
        <UpdateNotification isDarkMode={isDarkMode} />

        {/* Brand intro — first visit only, skippable */}
        {location.pathname === '/' && <BrandIntro />}


        {/* PWA Install Prompt */}
        <PWAInstallPrompt />

        {/* AI Chatbot */}
        <Chatbot />

        {/* Flash Sale Banner - shows only when active flash sale exists */}
        <FlashSaleBanner />

        {/* Header - Hidden on checkout and product detail */}
        {!hideNav && (
          <Header 
            onMenuClick={() => {
              if (soundEnabled) audioService.playClick();
              setSidebarOpen(true);
            }} 
          />
        )}

        {/* Sidebar */}
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
        />

        {/* Search Modal */}
        

        {/* SEO Component */}
        <SEO {...getSEOConfig(location.pathname)} />

        {/* Main Content with Routes */}
        <main className={cn(
          'min-h-screen',
          !hideNav && 'pb-16',
          isStandalone && !hideNav && 'pb-safe-bottom'
        )}>
          <Suspense fallback={<SectionLoader />}>
            <Routes>
              <Route path="/" element={<HomeSection />} />
              <Route path="/products" element={<ProductSection />} />
              <Route path="/product/:id" element={<ProductSection />} />
              <Route path="/cart" element={<CartSection />} />
              <Route path="/auth" element={<AuthSection />} />
              <Route path="/support" element={<SupportSection />} />
              <Route path="/profile" element={<ProfileSection />} />
              <Route path="/checkout" element={<CheckoutSection />} />
              <Route path="/search" element={<SearchSection />} />
              <Route path="/session-expired" element={<SessionExpired />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>

        {/* Bottom Navigation - Hidden on checkout and product detail */}
        {!hideNav && <BottomNav />}

        {/* Toast notifications */}
        <Toaster 
          position="top-center"
          toastOptions={{
            style: {
              background: isDarkMode ? '#1f2937' : '#fff',
              color: isDarkMode ? '#fff' : '#000',
            },
          }}
        />
      </div>
    </ThemeProvider>
  );
}

export default App;
