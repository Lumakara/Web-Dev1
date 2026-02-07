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
    image: 'search',
    tips: ['Ketik nama layanan di kolom pencarian', 'Gunakan filter kategori untuk menyempitkan hasil', 'Tekan tombol filter untuk opsi lebih lanjut'],
  },
  {
    icon: ShoppingCart,
    title: 'Tambah ke Keranjang',
    description: 'Pilih paket yang sesuai dengan kebutuhan Anda. Setiap layanan memiliki beberapa pilihan paket dengan fitur berbeda.',
    image: 'cart',
    tips: ['Klik produk untuk melihat detail', 'Pilih paket yang sesuai (Basic/Standard/Premium)', 'Klik "Tambah ke Keranjang"'],
  },
  {
    icon: CreditCard,
    title: 'Pembayaran QRIS',
    description: 'Lakukan pembayaran dengan mudah menggunakan QRIS. Scan kode QR dengan aplikasi e-wallet favorit Anda.',
    image: 'payment',
    tips: ['Periksa item di keranjang', 'Klik "Checkout" untuk membayar', 'Scan kode QRIS dengan aplikasi pembayaran'],
  },
  {
    icon: MessageCircle,
    title: 'Dapatkan Bantuan',
    description: 'Jika ada pertanyaan atau masalah, gunakan fitur live chat atau kirim tiket dukungan. Tim kami siap membantu 24/7.',
    image: 'support',
    tips: ['Buka menu "Bantuan"', 'Gunakan live chat untuk respon cepat', 'Kirim tiket untuk masalah kompleks'],
  },
  {
    icon: CheckCircle,
    title: 'Selesai!',
    description: 'Anda sudah siap menggunakan layanan kami. Selamat berbelanja dan jangan ragu untuk menghubungi kami jika perlu bantuan.',
    image: 'done',
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
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-orange-500 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Icon className="h-5 w-5" />
            <span className="font-medium">Cara Penggunaan</span>
          </div>
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 pt-4">
          <div className="flex gap-1">
            {tutorialSteps.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  index <= currentStep ? 'bg-blue-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-500 to-orange-500 flex items-center justify-center">
              <Icon className="h-8 w-8 text-white" />
            </div>
            <DialogTitle className="text-xl font-bold mb-2">{currentStepData.title}</DialogTitle>
            <p className="text-gray-600">{currentStepData.description}</p>
          </div>

          {/* Tips */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm font-medium text-gray-700 mb-2">💡 Tips:</p>
            <ul className="space-y-1">
              {currentStepData.tips.map((tip, index) => (
                <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handlePrev}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Sebelumnya
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600"
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
