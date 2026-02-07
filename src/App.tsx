import { useState, useEffect, lazy, Suspense, useCallback, useMemo } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Sidebar } from '@/components/Sidebar';
import { WelcomeModal } from '@/components/WelcomeModal';
import { TutorialModal } from '@/components/TutorialModal';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import { Chatbot } from '@/components/Chatbot';
import { SEO, SEOConfig } from '@/components/SEO';
import { 
  FloatingBackground, 
  CursorTrailEffect,
  ClickBurstEffect 
} from '@/components/GifParticles';
import { NotFound } from '@/pages/NotFound';
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
const UltraSearch = lazy(() => import('@/components/UltraSearch'));
const ParticleBackground = lazy(() => import('@/components/ParticleBackground'));

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
// SEARCH MODAL COMPONENT
// =============================================================================

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const { products, addToCart, isDarkMode, soundEnabled } = useAppStore();

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    return products.filter(p => 
      p.title.toLowerCase().includes(lowerQuery) ||
      p.description.toLowerCase().includes(lowerQuery)
    ).slice(0, 10);
  }, [query, products]);

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 ${isDarkMode ? 'bg-black/70' : 'bg-black/50'}`} 
      onClick={onClose}
    >
      <div 
        className={`absolute top-16 left-4 right-4 rounded-xl shadow-2xl p-4 max-h-[70vh] overflow-auto ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="text"
          placeholder="Cari layanan..."
          className={`w-full p-3 border rounded-lg mb-4 ${
            isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''
          }`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <div className="space-y-2">
          {filtered.map(product => (
            <div 
              key={product.id} 
              className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${
                isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
              }`}
              onClick={() => {
                addToCart(product, product.tiers[0]?.name || '');
                if (soundEnabled) audioService.playSuccess();
                toast.success(`${product.title} ditambahkan ke keranjang`);
                onClose();
              }}
            >
              <img 
                src={product.icon} 
                alt={product.title} 
                className="w-12 h-12 object-cover rounded"
                loading="lazy"
              />
              <div className="flex-1">
                <p className={`font-medium text-sm ${isDarkMode ? 'text-white' : ''}`}>
                  {product.title}
                </p>
                <p className="text-xs text-blue-500">
                  Rp {product.base_price.toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          ))}
          {query && filtered.length === 0 && (
            <p className={`text-center py-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Tidak ada hasil
            </p>
          )}
        </div>
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
    hasSeenTutorial, 
    setHasSeenTutorial 
  } = useAppStore();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [displayMode, setDisplayMode] = useState<string>('browser');
  const location = useLocation();

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
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Show tutorial if not seen
  useEffect(() => {
    if (!hasSeenTutorial && location.pathname === '/') {
      const timer = setTimeout(() => {
        setShowTutorial(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [hasSeenTutorial, location.pathname]);

  const handleTutorialClose = useCallback(() => {
    setShowTutorial(false);
    setHasSeenTutorial(true);
  }, [setHasSeenTutorial]);

  // Determine if we should show header/bottom nav
  const isCheckout = location.pathname === '/checkout';
  const isProductDetail = location.pathname.startsWith('/product/');
  const hideNav = isCheckout || isProductDetail;
  const isStandalone = displayMode === 'standalone';

  return (
    <ThemeProvider>
      <div className={cn(
        "min-h-screen transition-colors",
        isDarkMode ? "bg-gray-900" : "bg-gray-50"
      )}>
        {/* Connection Status Bar */}
        <ConnectionStatusBar isDarkMode={isDarkMode} />

        {/* Update Notification */}
        <UpdateNotification isDarkMode={isDarkMode} />

        {/* Welcome Modal */}
        <WelcomeModal />

        {/* Tutorial Modal */}
        <TutorialModal isOpen={showTutorial} onClose={handleTutorialClose} />

        {/* PWA Install Prompt */}
        <PWAInstallPrompt />

        {/* AI Chatbot */}
        <Chatbot />

        {/* Ultra Search Modal */}
        <Suspense fallback={null}>
          <UltraSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
        </Suspense>

        {/* Particle Background */}
        <Suspense fallback={null}>
          <ParticleBackground 
            variant="network" 
            density="low"
            isDarkMode={isDarkMode} 
          />
        </Suspense>

        {/* GIF Style Floating Background */}
        <FloatingBackground 
          density="low"
          speed="slow"
          theme="mixed"
        />

        {/* Cursor Trail Effect */}
        <CursorTrailEffect 
          enabled={true}
          emoji="✨"
          maxTrails={15}
        />

        {/* Click Burst Effect */}
        <ClickBurstEffect />

        {/* Header - Hidden on checkout and product detail */}
        {!hideNav && (
          <Header 
            onMenuClick={() => {
              if (soundEnabled) audioService.playClick();
              setSidebarOpen(true);
            }} 
            onSearchClick={() => {
              if (soundEnabled) audioService.playClick();
              setSearchOpen(true);
            }}
          />
        )}

        {/* Sidebar */}
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
        />

        {/* Search Modal */}
        <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

        {/* SEO Component */}
        <SEO {...getSEOConfig(location.pathname)} />

        {/* Main Content with Routes */}
        <main className={cn(
          'min-h-screen',
          !hideNav && 'pt-14 pb-16',
          isStandalone && !hideNav && 'pt-safe-top pb-safe-bottom'
        )}>
          <Suspense fallback={<SectionLoader />}>
            <Routes>
              <Route path="/" element={<HomeSection />} />
              <Route path="/product/:productId" element={<ProductSection />} />
              <Route path="/cart" element={<CartSection />} />
              <Route path="/auth" element={<AuthSection />} />
              <Route path="/support" element={<SupportSection />} />
              <Route path="/profile" element={<ProfileSection />} />
              <Route path="/checkout" element={<CheckoutSection />} />
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
