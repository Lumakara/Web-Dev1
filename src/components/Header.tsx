import { Menu, User, Moon, Sun, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import { useAppStore } from '@/store/appStore';
import { Link } from 'react-router-dom';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const {
    isAuthenticated,
    user,
    profile,
    isDarkMode,
    toggleDarkMode,
    soundEnabled,
    toggleSound,
  } = useAppStore();


  return (
    <>
      <header className="bg-primary shadow-soft-lg">
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
          </Link>

          {/* Right Actions */}
          <div className="flex items-center gap-1">
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

    </>
  );
}
