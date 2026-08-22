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
  } = useAppStore();
  
  const { logout } = useAuth();
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
    await logout();
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

  return (
    <>
      {/* Overlay with subtle backdrop filter */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-primary/40 backdrop-blur-sm z-50 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar with Royal Blue Theme */}
      <aside 
        className={`fixed top-0 left-0 h-full w-72 bg-card text-foreground z-50 shadow-soft-lg transform transition-all duration-300 ease-out border-r border-border ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-primary-foreground font-bold text-lg">L</span>
            </div>
            <span className="font-bold text-lg text-primary">Layanan Digital</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => { audioService.playClick(); onClose(); }} 
            className="text-secondary hover:text-primary hover:bg-muted rounded-lg transition-transform duration-300"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* User Info */}
        {isAuthenticated ? (
          <div className="p-4 bg-background border-b border-border">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border-2 border-border shadow-sm">
                <AvatarImage src={profile?.avatar_url || user?.photoURL || ''} />
                <AvatarFallback className="bg-accent text-primary text-base font-bold">
                  {(profile?.full_name || user?.displayName || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate text-primary">{profile?.full_name || user?.displayName}</p>
                <p className="text-xs truncate text-muted-foreground">{profile?.email || user?.email}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-background border-b border-border">
            <p className="text-xs text-muted-foreground mb-3">Masuk untuk mengakses fitur lengkap</p>
            <Link to="/auth" onClick={handleNavClick}>
              <Button className="w-full bg-primary text-primary-foreground hover:bg-secondary transition-colors duration-200 font-semibold shadow-sm">
                Masuk / Daftar
              </Button>
            </Link>
          </div>
        )}

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider mb-2 px-3 text-muted-foreground">Menu</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                to={item.path}
                onClick={handleNavClick}
                className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-muted transition-all duration-200 text-left group text-secondary hover:text-primary"
              >
                <div className="p-2 rounded-lg bg-background group-hover:bg-card transition-colors">
                  <Icon className="h-5 w-5 text-secondary group-hover:text-primary transition-colors" />
                </div>
                <span className="font-medium text-sm">{item.label}</span>
              </Link>
            );
          })}
          
          {/* Admin Link */}
          <a
            href="/admin"
            onClick={handleNavClick}
            className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-muted transition-all duration-200 text-left group text-secondary hover:text-primary"
          >
            <div className="p-2 rounded-lg bg-background group-hover:bg-card transition-colors">
              <Shield className="h-5 w-5 text-secondary group-hover:text-primary transition-colors" />
            </div>
            <span className="font-medium text-sm">Admin Dashboard</span>
          </a>
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-card">
          {isAuthenticated ? (
            <Button 
              variant="outline" 
              className="w-full flex items-center gap-2 text-destructive border-border hover:bg-destructive/10 transition-colors"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Keluar
            </Button>
          ) : (
            <div className="text-center text-xs text-muted-foreground">
              © 2026 Layanan Digital
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
