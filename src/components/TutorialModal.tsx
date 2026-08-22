import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Search, ShoppingCart, CreditCard, MessageCircle, CheckCircle, ArrowRight, ArrowLeft, X } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { audioService } from '@/lib/audio';

const tutorialSteps = [
  {
    icon: Search,
    title: 'Cari Layanan',
    description: 'Gunakan fitur pencarian atau filter kategori untuk menemukan layanan yang Anda butuhkan. Geser kategori ke kiri/kanan untuk melihat semua pilihan.',
    tips: ['Ketik nama layanan di kolom pencarian', 'Gunakan filter kategori untuk menyempitkan hasil', 'Tekan tombol filter untuk opsi lebih lanjut'],
  },
  {
    icon: ShoppingCart,
    title: 'Tambah ke Keranjang',
    description: 'Pilih paket yang sesuai dengan kebutuhan Anda. Setiap layanan memiliki beberapa pilihan paket dengan fitur berbeda.',
    tips: ['Klik produk untuk melihat detail', 'Pilih paket yang sesuai (Basic/Standard/Premium)', 'Klik "Tambah ke Keranjang"'],
  },
  {
    icon: CreditCard,
    title: 'Pembayaran QRIS',
    description: 'Lakukan pembayaran dengan mudah menggunakan QRIS. Scan kode QR dengan aplikasi e-wallet favorit Anda.',
    tips: ['Periksa item di keranjang', 'Klik "Checkout" untuk membayar', 'Scan kode QRIS dengan aplikasi pembayaran'],
  },
  {
    icon: MessageCircle,
    title: 'Dapatkan Bantuan',
    description: 'Jika ada pertanyaan atau masalah, gunakan fitur live chat atau kirim tiket dukungan. Tim kami siap membantu 24/7.',
    tips: ['Buka menu "Bantuan"', 'Gunakan live chat untuk respon cepat', 'Kirim tiket untuk masalah kompleks'],
  },
  {
    icon: CheckCircle,
    title: 'Selesai!',
    description: 'Anda sudah siap menggunakan layanan kami. Selamat berbelanja dan jangan ragu untuk menghubungi kami jika perlu bantuan.',
    tips: ['Pantau status pesanan di menu Profil', 'Berikan ulasan setelah layanan selesai', 'Nikmati pengalaman berbelanja!'],
  },
];

export function TutorialModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const { soundEnabled } = useAppStore();

  const handleNext = () => {
    if (soundEnabled) audioService.playClick();
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (soundEnabled) audioService.playClick();
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    if (soundEnabled) audioService.playClick();
    setCurrentStep(0);
    onClose();
  };

  const currentStepData = tutorialSteps[currentStep];
  const Icon = currentStepData.icon;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden bg-card border-border">
        {/* Header */}
        <div className="bg-primary p-4 flex items-center justify-between text-primary-foreground border-b border-border">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            <span className="font-semibold">Cara Penggunaan</span>
          </div>
          <button
            onClick={handleClose}
            className="text-primary-foreground/80 hover:text-primary-foreground p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 pt-4">
          <div className="flex gap-1.5">
            {tutorialSteps.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  index <= currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
              <Icon className="h-8 w-8" />
            </div>
            <DialogTitle className="text-xl font-bold mb-2 text-primary">{currentStepData.title}</DialogTitle>
            <p className="text-sm text-muted-foreground leading-relaxed">{currentStepData.description}</p>
          </div>

          {/* Tips */}
          <div className="bg-background border border-border rounded-xl p-4 mb-6">
            <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">💡 Tips:</p>
            <ul className="space-y-1.5">
              {currentStepData.tips.map((tip, index) => (
                <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-accent font-bold">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-border"
              onClick={handlePrev}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Sebelumnya
            </Button>
            <Button
              className="flex-1 bg-primary hover:bg-secondary text-primary-foreground font-semibold"
              onClick={handleNext}
            >
              {currentStep === tutorialSteps.length - 1 ? 'Selesai' : 'Selanjutnya'}
              {currentStep < tutorialSteps.length - 1 && <ArrowRight className="h-4 w-4 ml-2" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
