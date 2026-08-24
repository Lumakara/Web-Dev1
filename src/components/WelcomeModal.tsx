import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShoppingBag, HeadphonesIcon, Sparkles } from 'lucide-react';
import { audioService } from '@/lib/audio';

export function WelcomeModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('welcome_modal_seen');
    if (!seen) {
      setTimeout(() => setOpen(true), 500);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('welcome_modal_seen', 'true');
    setOpen(false);
    audioService.playClick();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-0">
        <div className="relative bg-gradient-to-br from-primary via-secondary to-primary p-8 text-center text-white">
          <div className="absolute inset-0 bg-black/10" />
          <div className="relative z-10">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
              <Sparkles className="h-10 w-10 text-primary animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Selamat Datang!</h2>
            <p className="text-white/90 text-sm mb-6">
              Di Lumakara Store — Solusi jaringan dan keamanan terpercaya untuk rumah dan bisnis Anda
            </p>
            
            <div className="grid grid-cols-2 gap-3 text-left">
              <button
                onClick={() => {
                  handleClose();
                  window.location.hash = '#products';
                }}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm p-3 rounded-lg transition-all"
              >
                <ShoppingBag className="h-5 w-5 mb-2" />
                <div className="text-xs font-semibold">Lihat Produk</div>
              </button>
              
              <button
                onClick={() => {
                  handleClose();
                  window.location.hash = '#support';
                }}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm p-3 rounded-lg transition-all"
              >
                <HeadphonesIcon className="h-5 w-5 mb-2" />
                <div className="text-xs font-semibold">Bantuan</div>
              </button>
            </div>

            <Button
              onClick={handleClose}
              variant="ghost"
              className="w-full mt-4 text-white hover:bg-white/20"
            >
              Tutup
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
