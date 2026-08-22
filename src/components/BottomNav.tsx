import { Home, ShoppingBag, User, Headphones } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { audioService } from '@/lib/audio';

export function BottomNav() {
  const location = useLocation();
  const { isAuthenticated, soundEnabled } = useAppStore();

  const navItems = [
    { id: 'home', label: 'Beranda', icon: Home, path: '/' },
    { id: 'cart', label: 'Keranjang', icon: ShoppingBag, path: '/cart' },
    { id: 'support', label: 'Bantuan', icon: Headphones, path: '/support' },
    { id: 'profile', label: 'Profil', icon: User, path: isAuthenticated ? '/profile' : '/auth' },
  ];

  const handleClick = () => {
    if (soundEnabled) audioService.playClick();
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card shadow-soft">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.id}
              to={item.path}
              onClick={handleClick}
              className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
                isActive 
                  ? 'text-primary font-semibold' 
                  : 'text-muted-foreground hover:text-secondary'
              }`}
            >
              <div className={`relative ${isActive ? 'transform -translate-y-0.5' : ''}`}>
                <Icon className={`h-5 w-5 mb-0.5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                {isActive && (
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-primary rounded-full" />
                )}
              </div>
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
