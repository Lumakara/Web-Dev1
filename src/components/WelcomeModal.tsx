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
    color: 'from-blue-500 via-purple-500 to-pink-500',
    bgGradient: 'from-blue-50 via-purple-50 to-pink-50',
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
    color: 'from-green-500 via-emerald-500 to-teal-500',
    bgGradient: 'from-green-50 via-emerald-50 to-teal-50',
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
    color: 'from-orange-500 via-amber-500 to-yellow-500',
    bgGradient: 'from-orange-50 via-amber-50 to-yellow-50',
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
    color: 'from-purple-500 via-violet-500 to-indigo-500',
    bgGradient: 'from-purple-50 via-violet-50 to-indigo-50',
    features: [
      { icon: Zap, text: 'AI Chatbot Pintar' },
      { icon: Headphones, text: 'Support Teknis' },
      { icon: Check, text: 'Respons Cepat' },
      { icon: User, text: 'Akun Pribadi' },
    ],
  },
];

export function WelcomeModal() {
  const { hasSeenWelcome, setHasSeenWelcome, soundEnabled, isDarkMode } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');

  useEffect(() => {
    // Show welcome modal after a short delay if not seen before
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent 
        className={`max-w-lg p-0 overflow-hidden border-0 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}
        style={{ borderRadius: '1.5rem' }}
      >
        {/* Animated Background */}
        <div 
          className={`absolute inset-0 bg-gradient-to-br ${currentStepData.bgGradient} opacity-50 dark:opacity-10 transition-all duration-700`}
        />
        
        {/* Progress Bar - Top */}
        <div className="relative z-10 flex h-1.5 bg-gray-200 dark:bg-gray-800">
          <div 
            className={`h-full bg-gradient-to-r ${currentStepData.color} transition-all duration-500 ease-out`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Header with Step Indicator */}
        <div className="relative z-10 flex items-center justify-between px-6 pt-6">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Langkah {currentStep + 1}
            </span>
            <span className="text-gray-300">/</span>
            <span className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              {welcomeSteps.length}
            </span>
          </div>
          
          {/* Step Dots */}
          <div className="flex items-center gap-1.5">
            {welcomeSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => goToStep(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentStep 
                    ? 'w-6 bg-gradient-to-r ' + currentStepData.color
                    : index < currentStep 
                      ? 'bg-green-500'
                      : isDarkMode ? 'bg-gray-700' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleSkip}
            className={`p-2 rounded-full transition-colors ${
              isDarkMode 
                ? 'hover:bg-gray-800 text-gray-400' 
                : 'hover:bg-gray-100 text-gray-500'
            }`}
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
            <div 
              className={`relative w-28 h-28 rounded-3xl bg-gradient-to-br ${currentStepData.color} p-0.5 shadow-2xl`}
            >
              {/* Animated rings */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/20 to-transparent animate-pulse" />
              
              {/* Icon */}
              <div className="relative w-full h-full rounded-3xl bg-gradient-to-br from-white/10 to-black/10 backdrop-blur-sm flex items-center justify-center">
                <Icon className="h-12 w-12 text-white drop-shadow-lg animate-float" />
              </div>
              
              {/* Glow effect */}
              <div 
                className={`absolute -inset-2 bg-gradient-to-r ${currentStepData.color} opacity-20 blur-xl rounded-full animate-pulse`}
              />
            </div>
          </div>

          {/* Title & Subtitle */}
          <DialogHeader className="text-center mb-4">
            <p className={`text-sm font-semibold uppercase tracking-wider mb-2 bg-gradient-to-r ${currentStepData.color} bg-clip-text text-transparent`}>
              {currentStepData.subtitle}
            </p>
            <DialogTitle className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {currentStepData.title}
            </DialogTitle>
          </DialogHeader>

          {/* Description */}
          <p className={`text-center mb-6 leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {currentStepData.description}
          </p>

          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            {currentStepData.features.map((feature, index) => (
              <div 
                key={index}
                className={`flex items-center gap-2 p-3 rounded-xl transition-all duration-300 hover:scale-105 ${
                  isDarkMode 
                    ? 'bg-gray-800/80 hover:bg-gray-700' 
                    : 'bg-white/80 hover:bg-white shadow-sm'
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${currentStepData.color} flex items-center justify-center flex-shrink-0`}>
                  <feature.icon className="h-4 w-4 text-white" />
                </div>
                <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
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
                className={`flex-1 transition-all duration-300 ${
                  isDarkMode 
                    ? 'border-gray-700 text-gray-300 hover:bg-gray-800' 
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
                onClick={handlePrev}
              >
                Kembali
              </Button>
            )}
            <Button
              className={`flex-1 bg-gradient-to-r ${currentStepData.color} hover:opacity-90 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]`}
              onClick={handleNext}
            >
              {currentStep === welcomeSteps.length - 1 ? 'Mulai Sekarang' : 'Lanjut'}
              <ArrowRight className="h-4 w-4 ml-2 animate-pulse" />
            </Button>
          </div>

          {/* Skip Link */}
          {currentStep < welcomeSteps.length - 1 && (
            <button
              onClick={handleSkip}
              className={`w-full mt-4 text-sm transition-colors ${
                isDarkMode 
                  ? 'text-gray-500 hover:text-gray-300' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Lewati tutorial
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
