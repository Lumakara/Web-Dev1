import { X, Home, ShoppingBag, User, Headphones, LogOut, Shield, ChevronDown } from 'lucide-react';
import { useState } from 'react';
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
  const [openMenus, setOpenMenus] = useState<string[]>([]);

  // Lock body scroll when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

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
    { 
      id: 'home', 
      label: 'Beranda', 
      icon: Home,
      children: [
        { id: 'all', label: 'Semua Produk', path: '/', authRequired: false },
        { id: 'installation', label: 'Instalasi', path: '/?category=installation', authRequired: false },
        { id: 'creative', label: 'Kreatif', path: '/?category=creative', authRequired: false },
        { id: 'technical', label: 'Teknis', path: '/?category=technical', authRequired: false },
      ]
    },
    { 
      id: 'cart', 
      label: 'Keranjang', 
      icon: ShoppingBag,
      children: [
        { id: 'cart-active', label: 'Keranjang Aktif', path: '/cart', authRequired: true },
        { id: 'wishlist', label: 'Wishlist', path: '/wishlist', authRequired: true },
        { id: 'orders', label: 'Riwayat Pesanan', path: '/profile?tab=orders', authRequired: true },
      ]
    },
    { 
      id: 'support', 
      label: 'Bantuan', 
      icon: Headphones,
      children: [
        { id: 'faq', label: 'FAQ', path: '/support?tab=faq', authRequired: false },
        { id: 'new-ticket', label: 'Buat Ticket', path: '/support', authRequired: true },
        { id: 'ticket-history', label: 'Riwayat Ticket', path: '/support?tab=history', authRequired: true },
      ]
    },
    { 
      id: 'profile', 
      label: 'Profil Saya', 
      icon: User,
      children: [
        { id: 'profile-edit', label: 'Edit Profil', path: '/profile', authRequired: true },
        { id: 'settings', label: 'Pengaturan', path: '/profile?tab=settings', authRequired: true },
        { id: 'logout', label: 'Keluar', path: '#logout', authRequired: true },
      ]
    },
  ];

  return (
    <>
      {/* Overlay with subtle backdrop filter */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-primary/40 backdrop-blur-sm z-[90] transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar with Royal Blue Theme */}
      <aside 
        className={`fixed top-0 left-0 h-full w-72 bg-card text-foreground shadow-soft-lg transform transition-all duration-300 ease-out border-r border-border ${
          isOpen ? 'translate-x-0 z-[100]' : '-translate-x-full z-50'
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
        <nav className="p-3 space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-2 px-3 text-muted-foreground">Menu</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const hasChildren = 'children' in item && item.children;
            const isOpen = openMenus.includes(item.id);

            if (hasChildren) {
              return (
                <div key={item.id}>
                  <button
                    onClick={() => setOpenMenus(prev => 
                      prev.includes(item.id) ? prev.filter(m => m !== item.id) : [...prev, item.id]
                    )}
                    className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-muted transition-all duration-200 text-left group text-secondary hover:text-primary"
                  >
                    <div className="p-2 rounded-lg bg-background group-hover:bg-card transition-colors">
                      <Icon className="h-5 w-5 text-secondary group-hover:text-primary transition-colors" />
                    </div>
                    <span className="font-medium text-sm flex-1">{item.label}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="ml-6 mt-1 space-y-1 max-h-64 overflow-y-auto">
                      {item.children.map((child) => {
                        const needsAuth = child.authRequired && !isAuthenticated;
                        
                        if (child.id === 'logout') {
                          return (
                            <button
                              key={child.id}
                              onClick={handleLogout}
                              className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors text-sm text-muted-foreground hover:text-destructive w-full text-left"
                            >
                              {child.label}
                            </button>
                          );
                        }

                        return (
                          <Link
                            key={child.id}
                            to={needsAuth ? '/auth' : child.path}
                            onClick={handleNavClick}
                            className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors text-sm text-muted-foreground hover:text-primary"
                          >
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // Parent menu with children already rendered above (collapsible block)
            return null;
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
