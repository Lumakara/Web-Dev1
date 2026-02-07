import { useState, useEffect } from 'react';
import { 
  Eye, EyeOff, Mail, Lock, User, Phone, Chrome, ArrowRight, 
  WifiOff, AlertCircle, Check, X, Shield, Zap, RefreshCw,
  Fingerprint, KeyRound, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { Link, useNavigate } from 'react-router-dom';
import { TelegramBot } from '@/lib/telegram';
import { useAppStore } from '@/store/appStore';
import { audioService } from '@/lib/audio';
import { toast } from 'sonner';

// Password strength checker
const checkPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;
  
  const labels = ['Sangat Lemah', 'Lemah', 'Sedang', 'Kuat', 'Sangat Kuat'];
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];
  
  return { strength, label: labels[strength], color: colors[strength] };
};

// Network status hook
const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return isOnline;
};

// Error message translator
const translateAuthError = (error: string): string => {
  const errorMap: Record<string, string> = {
    'auth/network-request-failed': 'Koneksi internet terputus. Periksa koneksi Anda dan coba lagi.',
    'auth/user-not-found': 'Email tidak terdaftar. Silakan daftar terlebih dahulu.',
    'auth/wrong-password': 'Password salah. Silakan coba lagi.',
    'auth/invalid-email': 'Format email tidak valid.',
    'auth/email-already-in-use': 'Email sudah terdaftar. Gunakan email lain atau login.',
    'auth/weak-password': 'Password terlalu lemah. Minimal 8 karakter.',
    'auth/too-many-requests': 'Terlalu banyak percobaan. Silakan coba lagi nanti.',
    'auth/popup-closed-by-user': 'Login dibatalkan. Silakan coba lagi.',
    'auth/cancelled-popup-request': 'Popup login diblokir. Izinkan popup untuk melanjutkan.',
    'auth/invalid-credential': 'Kredensial tidak valid. Periksa email dan password Anda.',
  };
  
  for (const [key, value] of Object.entries(errorMap)) {
    if (error.includes(key)) return value;
  }
  return 'Terjadi kesalahan. Silakan coba lagi.';
};

export function AuthSection() {
  const { isDarkMode } = useAppStore();
  const { signInWithGoogle, signInWithEmail, registerWithEmail, isLoading } = useAuth();
  const navigate = useNavigate();
  const isOnline = useNetworkStatus();
  
  const [activeTab, setActiveTab] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loginEmailError, setLoginEmailError] = useState('');
  const [loginPasswordError, setLoginPasswordError] = useState('');
  
  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [regNameError, setRegNameError] = useState('');
  const [regEmailError, setRegEmailError] = useState('');
  const [regPasswordError, setRegPasswordError] = useState('');
  
  const passwordStrength = checkPasswordStrength(regPassword);
  
  // Clear errors when input changes
  useEffect(() => {
    setError(null);
    setLoginEmailError('');
    setLoginPasswordError('');
  }, [loginEmail, loginPassword]);
  
  useEffect(() => {
    setError(null);
    setRegNameError('');
    setRegEmailError('');
    setRegPasswordError('');
  }, [regName, regEmail, regPassword]);
  
  // Email validation
  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };
  
  // Handle retry for network errors
  const handleRetry = async (action: () => Promise<void>) => {
    if (retryCount >= 3) {
      setError('Gagal terhubung. Silakan refresh halaman atau coba lagi nanti.');
      return;
    }
    
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    
    // Exponential backoff
    const delay = Math.pow(2, retryCount) * 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    try {
      await action();
      setRetryCount(0);
    } catch (err) {
      // Error handled in original function
    } finally {
      setIsRetrying(false);
    }
  };
  
  const handleGoogleSignIn = async () => {
    if (!isOnline) {
      setError('Koneksi internet terputus. Periksa koneksi Anda.');
      return;
    }
    
    audioService.playClick();
    
    try {
      setError(null);
      const user = await signInWithGoogle();
      
      toast.success('Login berhasil!', { icon: <Check className="h-4 w-4" /> });
      
      // Send login notification
      await TelegramBot.sendLoginNotification(
        {
          id: user.uid,
          email: user.email || '',
          name: user.displayName || 'User',
          role: 'user',
          avatar: user.photoURL || undefined,
        },
        {
          device: navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop',
          browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : 
                   navigator.userAgent.includes('Firefox') ? 'Firefox' : 
                   navigator.userAgent.includes('Safari') ? 'Safari' : 'Unknown',
          os: navigator.userAgent.includes('Windows') ? 'Windows' :
              navigator.userAgent.includes('Mac') ? 'macOS' :
              navigator.userAgent.includes('Linux') ? 'Linux' : 'Unknown',
        }
      );
      
      audioService.playSuccess();
      navigate('/');
    } catch (err: any) {
      const translatedError = translateAuthError(err.message || err.toString());
      setError(translatedError);
      audioService.playRemove();
      
      // Auto retry for network errors
      if (err.message?.includes('network-request-failed') && retryCount < 3) {
        toast.info('Mencoba menghubungkan kembali...');
        handleRetry(() => handleGoogleSignIn());
      }
    }
  };
  
  const validateLoginForm = (): boolean => {
    let isValid = true;
    
    if (!loginEmail) {
      setLoginEmailError('Email wajib diisi');
      isValid = false;
    } else if (!validateEmail(loginEmail)) {
      setLoginEmailError('Format email tidak valid');
      isValid = false;
    }
    
    if (!loginPassword) {
      setLoginPasswordError('Password wajib diisi');
      isValid = false;
    } else if (loginPassword.length < 6) {
      setLoginPasswordError('Password minimal 6 karakter');
      isValid = false;
    }
    
    return isValid;
  };
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isOnline) {
      setError('Koneksi internet terputus. Periksa koneksi Anda.');
      return;
    }
    
    if (!validateLoginForm()) {
      audioService.playRemove();
      return;
    }
    
    audioService.playClick();
    
    try {
      setError(null);
      const user = await signInWithEmail(loginEmail, loginPassword);
      
      // Save remember me
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', loginEmail);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      
      toast.success('Login berhasil!', { icon: <Check className="h-4 w-4" /> });
      
      await TelegramBot.sendLoginNotification(
        {
          id: user.uid,
          email: user.email || loginEmail,
          name: user.displayName || 'User',
          role: 'user',
        },
        {
          device: navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop',
          browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : 
                   navigator.userAgent.includes('Firefox') ? 'Firefox' : 
                   navigator.userAgent.includes('Safari') ? 'Safari' : 'Unknown',
          os: navigator.userAgent.includes('Windows') ? 'Windows' :
              navigator.userAgent.includes('Mac') ? 'macOS' :
              navigator.userAgent.includes('Linux') ? 'Linux' : 'Unknown',
        }
      );
      
      audioService.playSuccess();
      navigate('/');
    } catch (err: any) {
      const translatedError = translateAuthError(err.message || err.toString());
      setError(translatedError);
      audioService.playRemove();
      
      if (err.message?.includes('network-request-failed') && retryCount < 3) {
        toast.info('Mencoba menghubungkan kembali...');
        handleRetry(() => handleLogin(e));
      }
    }
  };
  
  const validateRegisterForm = (): boolean => {
    let isValid = true;
    
    if (!regName || regName.length < 2) {
      setRegNameError('Nama minimal 2 karakter');
      isValid = false;
    }
    
    if (!regEmail) {
      setRegEmailError('Email wajib diisi');
      isValid = false;
    } else if (!validateEmail(regEmail)) {
      setRegEmailError('Format email tidak valid');
      isValid = false;
    }
    
    if (!regPassword) {
      setRegPasswordError('Password wajib diisi');
      isValid = false;
    } else if (regPassword.length < 8) {
      setRegPasswordError('Password minimal 8 karakter');
      isValid = false;
    } else if (passwordStrength.strength < 2) {
      setRegPasswordError('Password terlalu lemah');
      isValid = false;
    }
    
    if (!agreeTerms) {
      toast.error('Anda harus menyetujui syarat dan ketentuan');
      isValid = false;
    }
    
    return isValid;
  };
  
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isOnline) {
      setError('Koneksi internet terputus. Periksa koneksi Anda.');
      return;
    }
    
    if (!validateRegisterForm()) {
      audioService.playRemove();
      return;
    }
    
    audioService.playClick();
    
    try {
      setError(null);
      await registerWithEmail(regEmail, regPassword, regName, regPhone);
      
      toast.success('Akun berhasil dibuat! Selamat datang!', { 
        icon: <Sparkles className="h-4 w-4" />,
        duration: 4000 
      });
      
      audioService.playSuccess();
      navigate('/');
    } catch (err: any) {
      const translatedError = translateAuthError(err.message || err.toString());
      setError(translatedError);
      audioService.playRemove();
      
      if (err.message?.includes('network-request-failed') && retryCount < 3) {
        toast.info('Mencoba menghubungkan kembali...');
        handleRetry(() => handleRegister(e));
      }
    }
  };
  
  // Load remembered email
  useEffect(() => {
    const remembered = localStorage.getItem('rememberedEmail');
    if (remembered) {
      setLoginEmail(remembered);
      setRememberMe(true);
    }
  }, []);
  
  // Animation classes based on dark mode
  const bgGradient = isDarkMode 
    ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
    : 'bg-gradient-to-br from-blue-50 via-white to-orange-50';
  
  const cardBg = isDarkMode ? 'bg-gray-800/90 border-gray-700' : 'bg-white/90 border-white/50';
  const textColor = isDarkMode ? 'text-white' : 'text-gray-800';
  const subTextColor = isDarkMode ? 'text-gray-400' : 'text-gray-600';
  const inputBg = isDarkMode ? 'bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500' : 'bg-white border-gray-200';
  const iconColor = isDarkMode ? 'text-gray-500' : 'text-gray-400';
  
  return (
    <div className={`min-h-screen ${bgGradient} flex items-center justify-center p-4 relative overflow-hidden`}>
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl opacity-20 animate-pulse ${isDarkMode ? 'bg-blue-600' : 'bg-blue-400'}`} />
        <div className={`absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl opacity-20 animate-pulse ${isDarkMode ? 'bg-orange-600' : 'bg-orange-400'}`} style={{ animationDelay: '1s' }} />
      </div>
      
      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <div className={`w-24 h-24 mx-auto rounded-2xl flex items-center justify-center shadow-2xl mb-4 animate-float ${isDarkMode ? 'bg-gradient-to-r from-blue-600 to-blue-500' : 'bg-gradient-to-r from-blue-600 to-orange-500'}`}>
            <Shield className="text-white w-12 h-12" />
          </div>
          <h1 className={`text-3xl font-bold ${textColor} mb-2`}>Selamat Datang</h1>
          <p className={subTextColor}>Masuk untuk mengakses layanan terbaik kami</p>
        </div>
        
        {/* Network Status Warning */}
        {!isOnline && (
          <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center gap-3 animate-shake">
            <WifiOff className="h-5 w-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Koneksi Terputus</p>
              <p className="text-sm opacity-80">Periksa koneksi internet Anda</p>
            </div>
          </div>
        )}
        
        <Card className={`${cardBg} shadow-2xl backdrop-blur-xl border animate-fade-in-scale`}>
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className={`grid w-full grid-cols-2 mb-6 p-1 ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                <TabsTrigger 
                  value="login" 
                  className={`data-[state=active]:shadow-lg transition-all duration-300 ${isDarkMode ? 'data-[state=active]:bg-gray-600 data-[state=active]:text-white' : ''}`}
                >
                  <KeyRound className="h-4 w-4 mr-2" />
                  Masuk
                </TabsTrigger>
                <TabsTrigger 
                  value="register"
                  className={`data-[state=active]:shadow-lg transition-all duration-300 ${isDarkMode ? 'data-[state=active]:bg-gray-600 data-[state=active]:text-white' : ''}`}
                >
                  <Fingerprint className="h-4 w-4 mr-2" />
                  Daftar
                </TabsTrigger>
              </TabsList>
              
              {/* Error Display with Retry */}
              {error && (
                <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-start gap-3 animate-shake">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm">{error}</p>
                    {retryCount > 0 && retryCount < 3 && (
                      <button 
                        onClick={() => setRetryCount(0)}
                        className="text-xs underline mt-1 hover:no-underline"
                      >
                        Coba lagi
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              {/* Google Sign In */}
              <Button
                variant="outline"
                className={`w-full mb-4 h-12 font-medium transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${isDarkMode ? 'border-gray-600 hover:bg-gray-700 hover:border-gray-500' : 'hover:bg-gray-50'}`}
                onClick={handleGoogleSignIn}
                disabled={isLoading || isRetrying || !isOnline}
              >
                {isLoading || isRetrying ? (
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <Chrome className="h-5 w-5 mr-2" />
                )}
                {isRetrying ? 'Menghubungkan...' : 'Lanjutkan dengan Google'}
              </Button>
              
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className={`w-full border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`} />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className={`px-2 ${isDarkMode ? 'bg-gray-800 text-gray-500' : 'bg-white text-gray-500'}`}>atau gunakan email</span>
                </div>
              </div>
              
              {/* Login Form */}
              <TabsContent value="login" className="animate-fade-in">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className={isDarkMode ? 'text-gray-300' : ''}>Email</Label>
                    <div className="relative">
                      <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${iconColor}`} />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="nama@email.com"
                        className={`pl-10 h-12 ${inputBg} ${loginEmailError ? 'border-red-500 focus-visible:ring-red-500' : ''} transition-all duration-300`}
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    {loginEmailError && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <X className="h-3 w-3" /> {loginEmailError}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="login-password" className={isDarkMode ? 'text-gray-300' : ''}>Password</Label>
                      <Link to="#" className="text-xs text-blue-500 hover:text-blue-600 hover:underline">
                        Lupa password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${iconColor}`} />
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className={`pl-10 pr-12 h-12 ${inputBg} ${loginPasswordError ? 'border-red-500 focus-visible:ring-red-500' : ''} transition-all duration-300`}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 ${iconColor} hover:text-gray-600 transition-colors`}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {loginPasswordError && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <X className="h-3 w-3" /> {loginPasswordError}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="remember" 
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    />
                    <label 
                      htmlFor="remember" 
                      className={`text-sm cursor-pointer ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
                    >
                      Ingat saya
                    </label>
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                    disabled={isLoading || !isOnline}
                  >
                    {isLoading ? (
                      <RefreshCw className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        Masuk
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
              
              {/* Register Form */}
              <TabsContent value="register" className="animate-fade-in">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-name" className={isDarkMode ? 'text-gray-300' : ''}>Nama Lengkap</Label>
                    <div className="relative">
                      <User className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${iconColor}`} />
                      <Input
                        id="reg-name"
                        type="text"
                        placeholder="John Doe"
                        className={`pl-10 h-12 ${inputBg} ${regNameError ? 'border-red-500 focus-visible:ring-red-500' : ''} transition-all duration-300`}
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    {regNameError && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <X className="h-3 w-3" /> {regNameError}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="reg-email" className={isDarkMode ? 'text-gray-300' : ''}>Email</Label>
                    <div className="relative">
                      <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${iconColor}`} />
                      <Input
                        id="reg-email"
                        type="email"
                        placeholder="nama@email.com"
                        className={`pl-10 h-12 ${inputBg} ${regEmailError ? 'border-red-500 focus-visible:ring-red-500' : ''} transition-all duration-300`}
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    {regEmailError && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <X className="h-3 w-3" /> {regEmailError}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="reg-password" className={isDarkMode ? 'text-gray-300' : ''}>Password</Label>
                    <div className="relative">
                      <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${iconColor}`} />
                      <Input
                        id="reg-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Minimal 8 karakter"
                        className={`pl-10 pr-12 h-12 ${inputBg} ${regPasswordError ? 'border-red-500 focus-visible:ring-red-500' : ''} transition-all duration-300`}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 ${iconColor} hover:text-gray-600 transition-colors`}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    
                    {/* Password Strength Indicator */}
                    {regPassword && (
                      <div className="space-y-1 animate-fade-in">
                        <div className="flex gap-1 h-1">
                          {[1, 2, 3, 4].map((level) => (
                            <div
                              key={level}
                              className={`flex-1 rounded-full transition-all duration-300 ${
                                level <= passwordStrength.strength ? passwordStrength.color : isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Kekuatan: <span className={passwordStrength.color.replace('bg-', 'text-')}>{passwordStrength.label}</span>
                        </p>
                      </div>
                    )}
                    
                    {regPasswordError && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <X className="h-3 w-3" /> {regPasswordError}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="reg-phone" className={isDarkMode ? 'text-gray-300' : ''}>Nomor Telepon (Opsional)</Label>
                    <div className="relative">
                      <Phone className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${iconColor}`} />
                      <Input
                        id="reg-phone"
                        type="tel"
                        placeholder="0812-3456-7890"
                        className={`pl-10 h-12 ${inputBg} transition-all duration-300`}
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                    <Checkbox
                      id="agree-terms"
                      checked={agreeTerms}
                      onCheckedChange={(checked) => setAgreeTerms(checked as boolean)}
                      className="mt-0.5"
                    />
                    <label htmlFor="agree-terms" className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Saya menyetujui{' '}
                      <Link to="#" className="text-blue-500 hover:text-blue-600 hover:underline font-medium">Syarat dan Ketentuan</Link>
                      {' '}serta{' '}
                      <Link to="#" className="text-blue-500 hover:text-blue-600 hover:underline font-medium">Kebijakan Privasi</Link>
                    </label>
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                    disabled={isLoading || !isOnline}
                  >
                    {isLoading ? (
                      <RefreshCw className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Buat Akun
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        {/* Guest Access */}
        <p className={`text-center mt-6 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} animate-fade-in`}>
          Atau{' '}
          <Link to="/" className="text-blue-500 hover:text-blue-600 hover:underline font-medium transition-colors">
            lanjutkan sebagai tamu
          </Link>
        </p>
        
        {/* Security Badge */}
        <div className={`mt-6 flex items-center justify-center gap-2 text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} animate-fade-in`}>
          <Shield className="h-4 w-4" />
          <span>Terlindungi dengan enkripsi SSL 256-bit</span>
        </div>
      </div>
    </div>
  );
}

export default AuthSection;
