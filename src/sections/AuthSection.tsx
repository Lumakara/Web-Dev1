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
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { audioService } from '@/lib/audio';
import { toast } from 'sonner';
import { TurnstileWidget } from '@/components/TurnstileWidget';

const checkPasswordStrength = (password: string): { strength: number; label: string } => {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;
  
  const labels = ['Sangat Lemah', 'Lemah', 'Sedang', 'Kuat', 'Sangat Kuat'];
  return { strength, label: labels[strength] };
};

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
  const { loginWithGoogle, login, register, isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  
  const passwordStrength = checkPasswordStrength(regPassword);
  const requestedRedirect = new URLSearchParams(location.search).get('redirect');
  const safeRedirect = requestedRedirect?.startsWith('/') && !requestedRedirect.startsWith('//')
    ? requestedRedirect
    : '/';

  useEffect(() => {
    if (!isAuthenticated) return;
    const stored = sessionStorage.getItem('oauth_return_to');
    sessionStorage.removeItem('oauth_return_to');
    const target = stored?.startsWith('/') && !stored.startsWith('//') ? stored : safeRedirect;
    navigate(target, { replace: true });
  }, [isAuthenticated, navigate, safeRedirect]);
  
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
  
  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };
  
  const handleRetry = async (action: () => Promise<void>) => {
    if (retryCount >= 3) {
      setError('Gagal terhubung. Silakan refresh halaman atau coba lagi nanti.');
      return;
    }
    
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    
    const delay = Math.pow(2, retryCount) * 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    try {
      await action();
      setRetryCount(0);
    } catch {
      // Handled in caller
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
      await loginWithGoogle(safeRedirect);
      
      toast.success('Login berhasil!', { icon: <Check className="h-4 w-4" /> });
      
      audioService.playSuccess();
    } catch (err: any) {
      const translatedError = translateAuthError(err.message || err.toString());
      setError(translatedError);
      audioService.playRemove();
      
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
      if (!captchaToken) throw new Error('Selesaikan verifikasi Turnstile.');
      await login(loginEmail, loginPassword, captchaToken);
      
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', loginEmail);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      
      toast.success('Login berhasil!', { icon: <Check className="h-4 w-4" /> });
      
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
      if (!captchaToken) throw new Error('Selesaikan verifikasi Turnstile.');
      await register(regEmail, regPassword, regName, captchaToken);
      
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
  
  useEffect(() => {
    const remembered = localStorage.getItem('rememberedEmail');
    if (remembered) {
      setLoginEmail(remembered);
      setRememberMe(true);
    }
  }, []);
  
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 relative overflow-hidden">
      <div className="w-full max-w-md relative z-10 py-12">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center shadow-soft-lg mb-4 bg-primary text-primary-foreground">
            <Shield className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-primary mb-1">Selamat Datang</h1>
          <p className="text-sm text-muted-foreground">Masuk ke Layanan Digital</p>
        </div>
        
        {/* Network Status Warning */}
        {!isOnline && (
          <div className="mb-4 p-4 rounded-xl bg-destructive/10 border border-destructive text-destructive flex items-center gap-3">
            <WifiOff className="h-5 w-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-sm">Koneksi Terputus</p>
              <p className="text-xs opacity-80">Periksa koneksi internet Anda</p>
            </div>
          </div>
        )}
        
        <Card className="bg-card border-border shadow-soft-lg">
          <CardContent className="p-6">
              <Tabs value={activeTab} onValueChange={(value) => { setActiveTab(value); setCaptchaToken(null); }} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-background border border-border">
                <TabsTrigger 
                  value="login" 
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold"
                >
                  <KeyRound className="h-4 w-4 mr-2" />
                  Masuk
                </TabsTrigger>
                <TabsTrigger 
                  value="register"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold"
                >
                  <Fingerprint className="h-4 w-4 mr-2" />
                  Daftar
                </TabsTrigger>
              </TabsList>
              
              {/* Error Display */}
              {error && (
                <div className="mb-4 p-4 rounded-xl bg-destructive/10 border border-destructive text-destructive flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
              )}
              
              {/* Google Sign In */}
              <Button
                variant="outline"
                className="w-full mb-4 h-12 font-semibold border-border text-primary hover:bg-muted transition-colors"
                onClick={handleGoogleSignIn}
                disabled={isLoading || isRetrying || !isOnline}
              >
                {isLoading || isRetrying ? (
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin text-primary" />
                ) : (
                  <Chrome className="h-5 w-5 mr-2 text-primary" />
                )}
                {isRetrying ? 'Menghubungkan...' : 'Lanjutkan dengan Google'}
              </Button>
              
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="px-3 bg-card text-muted-foreground font-medium">atau gunakan email</span>
                </div>
              </div>
              
              {/* Login Form */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-primary font-medium">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="nama@email.com"
                        className="pl-10 h-12 bg-background border-border text-foreground focus:ring-primary"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    {loginEmailError && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <X className="h-3 w-3" /> {loginEmailError}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="login-password" className="text-primary font-medium">Password</Label>
                      <Link to="#" className="text-xs text-primary font-semibold hover:underline">
                        Lupa password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="pl-10 pr-12 h-12 bg-background border-border text-foreground focus:ring-primary"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {loginPasswordError && (
                      <p className="text-xs text-destructive flex items-center gap-1">
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
                    <label htmlFor="remember" className="text-sm cursor-pointer text-muted-foreground">
                      Ingat saya
                    </label>
                  </div>
                  
                  <TurnstileWidget action="login" onToken={setCaptchaToken} />
                  <Button
                    type="submit"
                    className="w-full h-12 bg-primary hover:bg-secondary text-primary-foreground font-semibold shadow-sm transition-colors"
                    disabled={isLoading || !isOnline || !captchaToken}
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
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-name" className="text-primary font-medium">Nama Lengkap</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="reg-name"
                        type="text"
                        placeholder="John Doe"
                        className="pl-10 h-12 bg-background border-border text-foreground focus:ring-primary"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    {regNameError && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <X className="h-3 w-3" /> {regNameError}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="reg-email" className="text-primary font-medium">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="reg-email"
                        type="email"
                        placeholder="nama@email.com"
                        className="pl-10 h-12 bg-background border-border text-foreground focus:ring-primary"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    {regEmailError && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <X className="h-3 w-3" /> {regEmailError}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="reg-password" className="text-primary font-medium">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="reg-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Minimal 8 karakter"
                        className="pl-10 pr-12 h-12 bg-background border-border text-foreground focus:ring-primary"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    
                    {regPassword && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                          Kekuatan: <span className="font-semibold text-primary">{passwordStrength.label}</span>
                        </p>
                      </div>
                    )}
                    
                    {regPasswordError && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <X className="h-3 w-3" /> {regPasswordError}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="reg-phone" className="text-primary font-medium">Nomor Telepon (Opsional)</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="reg-phone"
                        type="tel"
                        placeholder="0812-3456-7890"
                        className="pl-10 h-12 bg-background border-border text-foreground focus:ring-primary"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-background border border-border">
                    <Checkbox
                      id="agree-terms"
                      checked={agreeTerms}
                      onCheckedChange={(checked) => setAgreeTerms(checked as boolean)}
                      className="mt-0.5"
                    />
                    <label htmlFor="agree-terms" className="text-xs leading-relaxed text-muted-foreground">
                      Saya menyetujui{' '}
                      <Link to="#" className="text-primary font-semibold hover:underline">Syarat dan Ketentuan</Link>
                      {' '}serta{' '}
                      <Link to="#" className="text-primary font-semibold hover:underline">Kebijakan Privasi</Link>
                    </label>
                  </div>
                  
                  <TurnstileWidget action="register" onToken={setCaptchaToken} />
                  <Button
                    type="submit"
                    className="w-full h-12 bg-primary hover:bg-secondary text-primary-foreground font-semibold shadow-sm transition-colors"
                    disabled={isLoading || !isOnline || !captchaToken}
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
        <p className="text-center mt-6 text-sm text-muted-foreground">
          Atau{' '}
          <Link to="/" className="text-primary font-semibold hover:underline">
            lanjutkan sebagai tamu
          </Link>
        </p>
        
        {/* Security Badge */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield className="h-4 w-4 text-primary" />
          <span>Terlindungi dengan enkripsi SSL 256-bit</span>
        </div>
      </div>
    </div>
  );
}

export default AuthSection;
