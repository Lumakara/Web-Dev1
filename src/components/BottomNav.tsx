import { Home, ShoppingBag, User, Headphones } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { audioService } from '@/lib/audio';

export function BottomNav() {
  const location = useLocation();
  const { isAuthenticated, isDarkMode, soundEnabled } = useAppStore();

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
    <nav className={`fixed bottom-0 left-0 right-0 z-50 border-t shadow-lg ${
      isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white'
    }`}>
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.id}
              to={item.path}
              onClick={handleClick}
              className={`flex flex-col items-center justify-center w-full h-full transition-all ${
                isActive 
                  ? 'text-blue-600' 
                  : isDarkMode 
                    ? 'text-gray-400 hover:text-gray-300' 
                    : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <div className={`relative ${isActive ? 'transform -translate-y-1' : ''}`}>
                <Icon className={`h-5 w-5 mb-1 ${isActive ? 'fill-current' : ''}`} />
                {isActive && (
                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full" />
                )}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
