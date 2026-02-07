import { X, Home, ShoppingBag, User, Headphones, LogOut, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppStore } from '@/store/appStore';
import { useAuth } from '@/hooks/useAuth';
import { Link, useNavigate } from 'react-router-dom';
import { audioService } from '@/lib/audio';
import { useEffect } from 'react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { 
    user, 
    profile, 
    isAuthenticated, 
    isDarkMode, 
  } = useAppStore();
  
  const { signOut } = useAuth();
  const navigate = useNavigate();

  // Initialize audio on first user interaction
  useEffect(() => {
    const handleInteraction = () => {
      audioService.initOnInteraction();
    };
    
    window.addEventListener('click', handleInteraction, { once: true });
    return () => window.removeEventListener('click', handleInteraction);
  }, []);

  const handleLogout = async () => {
    audioService.playClick();
    await signOut();
    onClose();
    navigate('/');
  };

  const handleNavClick = () => {
    audioService.playClick();
    onClose();
  };

  const navItems = [
    { id: 'home', label: 'Beranda', icon: Home, path: '/' },
    { id: 'cart', label: 'Keranjang', icon: ShoppingBag, path: '/cart' },
    { id: 'support', label: 'Bantuan', icon: Headphones, path: '/support' },
    { id: 'profile', label: 'Profil Saya', icon: User, path: '/profile' },
  ];

  const bgClass = isDarkMode ? 'bg-gray-900' : 'bg-white';
  const textClass = isDarkMode ? 'text-white' : 'text-gray-900';
  const subTextClass = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const borderClass = isDarkMode ? 'border-gray-700' : 'border-gray-200';
  const hoverClass = isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100';
  const sectionBgClass = isDarkMode ? 'bg-gray-800/50' : 'bg-gradient-to-r from-blue-50 to-orange-50';
  const iconColorClass = isDarkMode ? 'text-gray-400' : 'text-gray-500';

  return (
    <>
      {/* Overlay with blur effect */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar with smooth animation */}
      <aside 
        className={`fixed top-0 left-0 h-full w-72 ${bgClass} z-50 shadow-2xl transform transition-all duration-500 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${borderClass}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-orange-500 rounded-xl flex items-center justify-center shadow-lg animate-pulse">
              <span className="text-white font-bold text-lg">L</span>
            </div>
            <span className={`font-bold text-lg ${textClass}`}>Layanan Digital</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => { audioService.playClick(); onClose(); }} 
            className={`${isDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-700'} rounded-lg hover:rotate-90 transition-transform duration-300`}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* User Info */}
        {isAuthenticated ? (
          <div className={`p-4 ${sectionBgClass} border-b ${borderClass}`}>
            <div className="flex items-center gap-3">
              <Avatar className="h-14 w-14 border-3 border-white shadow-lg ring-2 ring-blue-500/20 hover:scale-110 transition-transform duration-300">
                <AvatarImage src={profile?.avatar_url || user?.photoURL || ''} />
                <AvatarFallback className="bg-gradient-to-r from-blue-600 to-orange-500 text-white text-lg font-bold">
                  {(profile?.full_name || user?.displayName || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className={`font-bold truncate ${textClass}`}>{profile?.full_name || user?.displayName}</p>
                <p className={`text-sm truncate ${subTextClass}`}>{profile?.email || user?.email}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className={`p-4 ${sectionBgClass} border-b ${borderClass}`}>
            <p className={`text-sm ${subTextClass} mb-3`}>Masuk untuk mengakses fitur lengkap</p>
            <Link to="/auth" onClick={handleNavClick}>
              <Button className="w-full bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300">
                Masuk / Daftar
              </Button>
            </Link>
          </div>
        )}

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 px-3 ${subTextClass}`}>Menu</p>
          {navItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                to={item.path}
                onClick={handleNavClick}
                className={`flex items-center gap-3 w-full p-3 rounded-xl ${hoverClass} transition-all duration-300 text-left group ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} hover:translate-x-1`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-gray-800 group-hover:bg-gray-700' : 'bg-gray-100 group-hover:bg-gray-200'} transition-all duration-300 group-hover:scale-110`}>
                  <Icon className={`h-5 w-5 ${iconColorClass} group-hover:text-blue-500 transition-colors`} />
                </div>
                <span className="font-medium group-hover:text-blue-500 transition-colors">{item.label}</span>
              </Link>
            );
          })}
          
          {/* Admin Link */}
          <a
            href="/admin"
            onClick={handleNavClick}
            className={`flex items-center gap-3 w-full p-3 rounded-xl ${hoverClass} transition-all duration-300 text-left group ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} hover:translate-x-1`}
          >
            <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-gray-800 group-hover:bg-gray-700' : 'bg-gray-100 group-hover:bg-gray-200'} transition-all duration-300 group-hover:scale-110`}>
              <Shield className={`h-5 w-5 ${iconColorClass} group-hover:text-purple-500 transition-colors`} />
            </div>
            <span className="font-medium group-hover:text-purple-500 transition-colors">Admin Dashboard</span>
          </a>
        </nav>

        {/* Footer */}
        <div className={`absolute bottom-0 left-0 right-0 p-4 border-t ${borderClass} ${bgClass}`}>
          {isAuthenticated ? (
            <Button 
              variant="outline" 
              className={`w-full flex items-center gap-2 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${isDarkMode ? 'hover:bg-red-900/20 border-red-900/30' : ''}`}
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Keluar
            </Button>
          ) : (
            <div className={`text-center text-xs ${subTextClass}`}>
              © 2024 Layanan Digital
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
