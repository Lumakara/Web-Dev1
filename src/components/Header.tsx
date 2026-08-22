import { useState } from 'react';
import { Menu, ShoppingBag, User, Search, Moon, Sun, Volume2, VolumeX, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAppStore } from '@/store/appStore';
import { Link } from 'react-router-dom';
import { audioService } from '@/lib/audio';
import { TutorialModal } from './TutorialModal';

interface HeaderProps {
  onMenuClick: () => void;
  onSearchClick: () => void;
}

export function Header({ onMenuClick, onSearchClick }: HeaderProps) {
  const {
    isAuthenticated,
    user,
    profile,
    cart,
    getSelectedItems,
    removeFromCart,
    updateQuantity,
    toggleItemSelection,
    isDarkMode,
    toggleDarkMode,
    soundEnabled,
    toggleSound,
  } = useAppStore();

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  const selectedItems = getSelectedItems();
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCartClick = () => {
    if (soundEnabled) audioService.playClick();
    setIsCartOpen(true);
  };

  const handleTutorialClick = () => {
    if (soundEnabled) audioService.playClick();
    setShowTutorial(true);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-primary shadow-soft-lg">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-white/20"
            onClick={onMenuClick}
          >
            <Menu className="h-6 w-6" />
          </Button>

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-md">
              <span className="text-primary font-bold text-lg">L</span>
            </div>
            <span className="text-primary-foreground font-semibold hidden sm:block">Layanan Digital</span>
          </Link>

          {/* Right Actions */}
          <div className="flex items-center gap-1">
            {/* Tutorial Button */}
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-white/20"
              onClick={handleTutorialClick}
              title="Cara Penggunaan"
            >
              <HelpCircle className="h-5 w-5" />
            </Button>

            {/* Sound Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-white/20 hidden sm:flex"
              onClick={toggleSound}
              title={soundEnabled ? 'Matikan Suara' : 'Nyalakan Suara'}
            >
              {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </Button>

            {/* Dark Mode Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-white/20 hidden sm:flex"
              onClick={toggleDarkMode}
              title={isDarkMode ? 'Mode Terang' : 'Mode Gelap'}
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            {/* Search Button */}
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-white/20"
              onClick={onSearchClick}
            >
              <Search className="h-5 w-5" />
            </Button>

            {/* Cart Button */}
            <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-primary-foreground hover:bg-white/20 relative"
                  onClick={handleCartClick}
                >
                  <ShoppingBag className="h-5 w-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-accent text-primary text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center animate-bounce">
                      {cartCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md bg-card">
                <SheetHeader>
                  <SheetTitle className="text-foreground">Keranjang Belanja</SheetTitle>
                </SheetHeader>
                <div className="mt-4">
                  {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <ShoppingBag className="h-16 w-16 mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">Keranjang Anda kosong</p>
                      <Link to="/" onClick={() => setIsCartOpen(false)}>
                        <Button className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90">
                          Jelajahi Layanan
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="flex flex-col h-full">
                      <div className="flex-1 overflow-auto space-y-3 max-h-[60vh]">
                        {cart.map((item, index) => (
                          <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={() => toggleItemSelection(index)}
                              className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                            />
                            <img src={item.image} alt={item.title} className="w-16 h-16 object-cover rounded-lg" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate text-foreground">{item.title}</p>
                              <p className="text-xs text-muted-foreground">{item.tier}</p>
                              <p className="text-primary font-semibold text-sm">
                                Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateQuantity(index, -1)}
                                className="w-6 h-6 rounded flex items-center justify-center bg-border hover:bg-primary/20"
                              >
                                -
                              </button>
                              <span className="w-6 text-center text-sm text-foreground">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(index, 1)}
                                className="w-6 h-6 rounded flex items-center justify-center bg-border hover:bg-primary/20"
                              >
                                +
                              </button>
                            </div>
                            <button
                              onClick={() => removeFromCart(index)}
                              className="text-error hover:text-error/80"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-border pt-4 mt-4">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-muted-foreground">Subtotal ({selectedItems.length} item)</span>
                          <span className="text-xl font-bold text-primary">
                            Rp {cartTotal.toLocaleString('id-ID')}
                          </span>
                        </div>
                        <Link to="/checkout" onClick={() => setIsCartOpen(false)}>
                          <Button
                            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                            disabled={selectedItems.length === 0}
                          >
                            Checkout
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            {/* Auth Button */}
            {isAuthenticated ? (
              <Link to="/profile">
                <Avatar className="h-8 w-8 border-2 border-white">
                  <AvatarImage src={profile?.avatar_url || user?.photoURL || ''} />
                  <AvatarFallback className="bg-accent text-primary text-xs font-semibold">
                    {(profile?.full_name || user?.displayName || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
            ) : (
              <Link to="/auth">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary-foreground hover:bg-white/20"
                >
                  <User className="h-5 w-5 mr-1" />
                  <span className="hidden sm:inline">Masuk</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Tutorial Modal */}
      <TutorialModal isOpen={showTutorial} onClose={() => setShowTutorial(false)} />
    </>
  );
}
