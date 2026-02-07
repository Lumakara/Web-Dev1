import { useState, useEffect } from 'react';
import { X, Download, Smartphone, Share2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  canInstallPWA,
  isPWAInstalled,
  getInstallPlatform,
  showInstallPrompt,
  onInstallPromptAvailable,
} from '@/lib/pwa';
import { cn } from '@/lib/utils';

interface PWAInstallPromptProps {
  className?: string;
}

const STORAGE_KEY = 'pwa-install-prompt-dismissed';
const DISMISS_DURATION_DAYS = 7;

export function PWAInstallPrompt({ className }: PWAInstallPromptProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [platform, setPlatform] = useState<ReturnType<typeof getInstallPlatform> | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already dismissed
    const dismissedData = localStorage.getItem(STORAGE_KEY);
    if (dismissedData) {
      try {
        const { timestamp } = JSON.parse(dismissedData);
        const daysSinceDismissed = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
        if (daysSinceDismissed < DISMISS_DURATION_DAYS) {
          return; // Still in cooldown period
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    // Check initial state
    const checkInstallState = () => {
      const installed = isPWAInstalled();
      setIsInstalled(installed);

      if (!installed && canInstallPWA()) {
        setPlatform(getInstallPlatform());
        // Small delay for better UX
        const timer = setTimeout(() => {
          setIsVisible(true);
        }, 2000);
        return () => clearTimeout(timer);
      }
    };

    checkInstallState();

    // Listen for install prompt availability
    const unsubscribe = onInstallPromptAvailable(() => {
      if (!isPWAInstalled()) {
        setPlatform(getInstallPlatform());
        setIsVisible(true);
      }
    });

    // Listen for successful installation
    const handleInstalled = () => {
      setIsInstalled(true);
      setIsVisible(false);
    };
    window.addEventListener('pwa-installed', handleInstalled);

    return () => {
      unsubscribe();
      window.removeEventListener('pwa-installed', handleInstalled);
    };
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    // Store dismissal timestamp
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ timestamp: Date.now() })
    );
  };

  const handleInstall = async () => {
    const accepted = await showInstallPrompt();
    if (accepted) {
      setIsVisible(false);
      // Clear dismissal data on successful install
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // Don't render if not visible or already installed
  if (!isVisible || isInstalled) {
    return null;
  }

  // iOS specific instructions
  if (platform?.isIos) {
    return (
      <div
        className={cn(
          'fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-sm',
          'animate-in slide-in-from-bottom-4 fade-in duration-300',
          className
        )}
      >
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white shadow-2xl">
          {/* Background pattern */}
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
          <div className="absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-white/10" />

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute right-2 top-2 rounded-full p-1 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="relative flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20">
              <Smartphone className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="mb-1 font-semibold">Install Aplikasi</h3>
              <p className="mb-3 text-sm text-blue-50">
                Tambahkan ke Home Screen untuk akses cepat
              </p>

              {/* iOS Installation Steps */}
              <div className="space-y-2 rounded-lg bg-white/10 p-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs font-medium">
                    1
                  </span>
                  <span>Ketuk ikon <Share2 className="mx-1 inline h-4 w-4" /> di bawah</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs font-medium">
                    2
                  </span>
                  <span>
                    Pilih <Plus className="mx-1 inline h-4 w-4" />{' '}
                    <strong>Add to Home Screen</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Android/Desktop install prompt
  return (
    <div
      className={cn(
        'fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-sm',
        'animate-in slide-in-from-bottom-4 fade-in duration-300',
        className
      )}
    >
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white shadow-2xl">
        {/* Background pattern */}
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
        <div className="absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-white/10" />

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute right-2 top-2 rounded-full p-1 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
          aria-label="Tutup"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20">
            <Download className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="mb-1 font-semibold">Install Layanan Digital</h3>
            <p className="mb-3 text-sm text-blue-50">
              Akses lebih cepat dan notifikasi realtime dengan aplikasi kami
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                className="bg-white text-blue-600 hover:bg-blue-50"
                onClick={handleInstall}
              >
                Install Sekarang
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20"
                onClick={handleDismiss}
              >
                Nanti
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Compact version for use in headers or menus
export function PWAInstallButton({ className }: { className?: string }) {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<ReturnType<typeof getInstallPlatform> | null>(null);

  useEffect(() => {
    const checkState = () => {
      setIsInstalled(isPWAInstalled());
      setCanInstall(canInstallPWA());
      setPlatform(getInstallPlatform());
    };

    checkState();

    const unsubscribe = onInstallPromptAvailable(() => {
      checkState();
    });

    const handleInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
    };
    window.addEventListener('pwa-installed', handleInstalled);

    return () => {
      unsubscribe();
      window.removeEventListener('pwa-installed', handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (platform?.isIos) {
      // For iOS, show instructions (you might want to use a modal here)
      alert(
        'Untuk menginstall di iOS:\n\n' +
          '1. Ketuk tombol Share (⬆️) di bawah\n' +
          '2. Pilih "Add to Home Screen"\n' +
          '3. Ketuk "Add"'
      );
      return;
    }

    const accepted = await showInstallPrompt();
    if (accepted) {
      setIsInstalled(true);
      setCanInstall(false);
    }
  };

  if (isInstalled || !canInstall) {
    return null;
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className={cn('gap-2', className)}
      onClick={handleInstall}
    >
      <Download className="h-4 w-4" />
      <span className="hidden sm:inline">Install App</span>
    </Button>
  );
}

// Export hook for custom implementations
export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<ReturnType<typeof getInstallPlatform> | null>(null);

  useEffect(() => {
    const checkState = () => {
      setIsInstalled(isPWAInstalled());
      setCanInstall(canInstallPWA());
      setPlatform(getInstallPlatform());
    };

    checkState();

    const unsubscribe = onInstallPromptAvailable(() => {
      checkState();
    });

    const handleInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
    };
    window.addEventListener('pwa-installed', handleInstalled);

    return () => {
      unsubscribe();
      window.removeEventListener('pwa-installed', handleInstalled);
    };
  }, []);

  const install = async () => {
    const accepted = await showInstallPrompt();
    if (accepted) {
      setIsInstalled(true);
      setCanInstall(false);
    }
    return accepted;
  };

  return {
    canInstall,
    isInstalled,
    platform,
    install,
  };
}

export default PWAInstallPrompt;
