import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-yellow-500/95 text-black px-4 py-2.5 rounded-full text-sm font-medium shadow-xl backdrop-blur-sm animate-in slide-in-from-bottom-4">
      <WifiOff className="w-4 h-4" />
      Mode Offline — Menampilkan data tersimpan
    </div>
  );
}
