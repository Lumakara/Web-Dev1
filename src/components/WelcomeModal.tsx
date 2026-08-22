import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  ShoppingCart,
  Headphones,
  User,
  ArrowRight,
  X,
  Check,
  Zap,
  Shield,
  CreditCard,
  Smartphone,
  Bell,
  Wifi,
  Camera,
  Code,
  Palette,
  Server
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { audioService } from '@/lib/audio';

const welcomeSteps = [
  {
    icon: Sparkles,
    title: 'Selamat Datang di Layanan Digital!',
    subtitle: 'Solusi Digital Profesional',
    description: 'Temukan berbagai layanan digital profesional untuk kebutuhan Anda. Dari instalasi Wi-Fi, CCTV, editing kreatif, hingga support teknis.',
    features: [
      { icon: Wifi, text: 'Instalasi WiFi Profesional' },
      { icon: Camera, text: 'Sistem CCTV Lengkap' },
      { icon: Code, text: 'Jasa Programming' },
      { icon: Palette, text: 'Editing Kreatif' },
    ],
  },
  {
    icon: ShoppingCart,
    title: 'Belanja Mudah & Cepat',
    subtitle: 'Pengalaman Belanja Terbaik',
    description: 'Pilih layanan yang Anda butuhkan, tambahkan ke keranjang, dan lakukan pembayaran dengan QRIS. Cepat, aman, dan praktis!',
    features: [
      { icon: Check, text: 'Pilih Paket Sesuai Kebutuhan' },
      { icon: CreditCard, text: 'Pembayaran QRIS' },
      { icon: Zap, text: 'Proses Cepat' },
      { icon: Shield, text: 'Transaksi Aman' },
    ],
  },
  {
    icon: Smartphone,
    title: 'Akses Dimana Saja',
    subtitle: 'Install Aplikasi Kami',
    description: 'Install Progressive Web App (PWA) kami untuk pengalaman terbaik. Akses layanan kami kapan saja, bahkan offline!',
    features: [
      { icon: Smartphone, text: 'Install ke Home Screen' },
      { icon: Zap, text: 'Akses Cepat' },
      { icon: Bell, text: 'Notifikasi Real-time' },
      { icon: Server, text: 'Mode Offline' },
    ],
  },
  {
    icon: Headphones,
    title: 'Support 24/7',
    subtitle: 'Kami Selalu Siap Membantu',
    description: 'Tim kami siap membantu kapan saja. Gunakan fitur AI Chatbot untuk jawaban instan, atau kirim tiket dukungan untuk bantuan lebih lanjut.',
    features: [
      { icon: Zap, text: 'AI Chatbot Pintar' },
      { icon: Headphones, text: 'Support Teknis' },
      { icon: Check, text: 'Respons Cepat' },
      { icon: User, text: 'Akun Pribadi' },
    ],
  },
];

export function WelcomeModal() {
  const { hasSeenWelcome, setHasSeenWelcome, soundEnabled } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');

  useEffect(() => {
    if (!hasSeenWelcome) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        if (soundEnabled) audioService.playSuccess();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [hasSeenWelcome, soundEnabled]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setHasSeenWelcome(true);
    if (soundEnabled) audioService.playClick();
  }, [setHasSeenWelcome, soundEnabled]);

  const handleNext = useCallback(() => {
    if (soundEnabled) audioService.playClick();
    if (currentStep < welcomeSteps.length - 1) {
      setIsAnimating(true);
      setDirection('next');
      setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        setIsAnimating(false);
      }, 300);
    } else {
      handleClose();
    }
  }, [currentStep, handleClose, soundEnabled]);

  const handlePrev = useCallback(() => {
    if (soundEnabled) audioService.playClick();
    if (currentStep > 0) {
      setIsAnimating(true);
      setDirection('prev');
      setTimeout(() => {
        setCurrentStep(prev => prev - 1);
        setIsAnimating(false);
      }, 300);
    }
  }, [currentStep, soundEnabled]);

  const handleSkip = useCallback(() => {
    if (soundEnabled) audioService.playClick();
    handleClose();
  }, [handleClose, soundEnabled]);

  const goToStep = useCallback((index: number) => {
    if (index !== currentStep && !isAnimating) {
      setIsAnimating(true);
      setDirection(index > currentStep ? 'next' : 'prev');
      setTimeout(() => {
        setCurrentStep(index);
        setIsAnimating(false);
      }, 300);
    }
  }, [currentStep, isAnimating]);

  const currentStepData = welcomeSteps[currentStep];
  const Icon = currentStepData.icon;
  const progress = ((currentStep + 1) / welcomeSteps.length) * 100;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          setHasSeenWelcome(true);
        }
      }}
    >
      <DialogContent
        className="max-w-lg p-0 overflow-hidden border-border bg-card shadow-soft-lg"
        style={{ borderRadius: '1.5rem' }}
      >
        {/* Progress Bar */}
        <div className="relative z-10 flex h-1.5 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Header with Step Indicator */}
        <div className="relative z-10 flex items-center justify-between px-6 pt-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-primary">
              Langkah {currentStep + 1}
            </span>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm text-muted-foreground">
              {welcomeSteps.length}
            </span>
          </div>

          {/* Step Dots */}
          <div className="flex items-center gap-1.5">
            {welcomeSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => goToStep(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentStep
                    ? 'w-6 bg-primary'
                    : index < currentStep
                      ? 'w-2 bg-accent'
                      : 'w-2 bg-muted'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleSkip}
            className="p-2 rounded-full transition-colors hover:bg-muted text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content with Animation */}
        <div
          className={`relative z-10 px-8 pb-8 transition-all duration-300 ${
            isAnimating
              ? direction === 'next'
                ? 'opacity-0 -translate-x-4'
                : 'opacity-0 translate-x-4'
              : 'opacity-100 translate-x-0'
          }`}
        >
          {/* Animated Icon Container */}
          <div className="flex justify-center mb-6">
            <div className="relative w-24 h-24 rounded-3xl bg-primary p-0.5 shadow-sm">
              <div className="relative w-full h-full rounded-3xl bg-primary flex items-center justify-center">
                <Icon className="h-12 w-12 text-primary-foreground" />
              </div>
            </div>
          </div>

          {/* Title & Subtitle */}
          <DialogHeader className="text-center mb-4">
            <p className="text-xs font-bold uppercase tracking-wider mb-1 text-accent">
              {currentStepData.subtitle}
            </p>
            <DialogTitle className="text-2xl font-bold text-primary">
              {currentStepData.title}
            </DialogTitle>
          </DialogHeader>

          {/* Description */}
          <p className="text-center mb-6 text-sm leading-relaxed text-secondary">
            {currentStepData.description}
          </p>

          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            {currentStepData.features.map((feature, index) => (
              <div
                key={index}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-background border border-border"
              >
                <div className="w-8 h-8 rounded-lg bg-accent text-primary flex items-center justify-center flex-shrink-0 font-bold">
                  <feature.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-xs font-medium text-primary">
                  {feature.text}
                </span>
              </div>
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-3">
            {currentStep > 0 && (
              <Button
                variant="outline"
                className="flex-1 border-border"
                onClick={handlePrev}
              >
                Kembali
              </Button>
            )}
            <Button
              className="flex-1 bg-primary hover:bg-secondary text-primary-foreground font-semibold shadow-sm"
              onClick={handleNext}
            >
              {currentStep === welcomeSteps.length - 1 ? 'Mulai Sekarang' : 'Lanjut'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          {currentStep < welcomeSteps.length - 1 && (
            <button
              onClick={handleSkip}
              className="w-full mt-4 text-xs transition-colors text-muted-foreground hover:text-primary"
            >
              Lewati tutorial
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
