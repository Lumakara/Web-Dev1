import { useState, useEffect } from 'react';
import { 
  ArrowLeft, CreditCard, Clock, Check, RefreshCw, Wifi, 
  QrCode, Copy, X, Shield,
  Server, User, Lock, Zap, Package, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore } from '@/store/appStore';
import { OrderService } from '@/lib/firebase-db';
import { TelegramBot } from '@/lib/telegram';
import { 
  usePakasir, 
  PAYMENT_METHODS, 
  type PaymentMethod,
  generatePaymentUrl 
} from '@/lib/pakasir';
import { Link } from 'react-router-dom';
import { audioService } from '@/lib/audio';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PaymentData {
  orderId: string;
  method: PaymentMethod;
  amount: number;
  serviceFee: number;
  adminFee: number;
  total: number;
  paymentNumber: string;
  expiredAt: string;
}

// WiFi Installation Data
interface WiFiFormData {
  fullName: string;
  phoneNumber: string;
  ktpNumber: string;
  address: string;
  installationDate: string;
  notes: string;
  packageType: string;
}

// Panel Pterodactyl Data
interface PanelFormData {
  username: string;
  password: string;
  confirmPassword: string;
}

// WiFi Packages
const WIFI_PACKAGES = [
  { id: 'flash', name: 'FLASH', speed: '60 Mbps', price: 235997, icon: Zap, devices: '6 perangkat' },
  { id: 'light', name: 'LIGHT', speed: '100 Mbps', price: 285630, icon: Wifi, devices: '8-10 perangkat' },
  { id: 'amazing', name: 'AMAZING', speed: '150 Mbps', price: 358651, icon: Zap, devices: '15 perangkat' },
  { id: 'blitz', name: 'BLITZ', speed: '300 Mbps', price: 526816, icon: Zap, devices: '20-25 perangkat' },
  { id: 'universe', name: 'UNIVERSE', speed: '500 Mbps', price: 650770, icon: Server, devices: 'Unlimited' },
  { id: 'infinite', name: 'INFINITE', speed: '1 Gbps', price: 1120999, icon: Zap, devices: 'Unlimited' },
];

// Panel Domain
const PANEL_DOMAIN = 'panel.lumakara.my.id';

export function CheckoutSection() {
  const { getSelectedItems, clearCart, user, isDarkMode } = useAppStore();
  const selectedItems = getSelectedItems();
  const subtotal = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  
  const { create, loading: isProcessing, calculateTotal, getPaymentFee } = usePakasir();
  
  // Step management
  const [currentStep, setCurrentStep] = useState<'form' | 'payment' | 'success'>('form');
  
  // Payment data - QRIS only
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [copied, setCopied] = useState(false);

  // Check products in cart
  const hasWiFiProducts = selectedItems.some(item => 
    item.productId === 'wifi' || item.title?.toLowerCase().includes('wi-fi') || item.title?.toLowerCase().includes('wifi')
  );
  const hasPanelProducts = selectedItems.some(item => 
    item.productId === 'panel' || item.title?.toLowerCase().includes('pterodactyl')
  );
  // const hasFormProducts = hasWiFiProducts || hasPanelProducts;

  // WiFi Form State
  const [wifiFormData, setWiFiFormData] = useState<WiFiFormData>({
    fullName: user?.displayName || '',
    phoneNumber: '',
    ktpNumber: '',
    address: '',
    installationDate: '',
    notes: '',
    packageType: '',
  });
  const [wifiFormErrors, setWiFiFormErrors] = useState<Partial<Record<keyof WiFiFormData, string>>>({});

  // Panel Form State
  const [panelFormData, setPanelFormData] = useState<PanelFormData>({
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [panelFormErrors, setPanelFormErrors] = useState<Partial<Record<keyof PanelFormData, string>>>({});

  // Panel credentials (shown after payment)
  const [panelCredentials, setPanelCredentials] = useState<{
    username: string;
    password: string;
    domain: string;
  } | null>(null);

  const totalAmount = calculateTotal(subtotal, 'qris');
  const feeBreakdown = getPaymentFee('qris', subtotal);

  // Redirect if no items
  useEffect(() => {
    if (selectedItems.length === 0 && currentStep !== 'success') {
      window.location.href = '/cart';
    }
  }, [selectedItems.length, currentStep]);

  // WiFi Form Handlers
  const handleWiFiFormChange = (field: keyof WiFiFormData, value: string) => {
    setWiFiFormData(prev => ({ ...prev, [field]: value }));
    if (wifiFormErrors[field]) {
      setWiFiFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateWiFiForm = (): boolean => {
    const errors: Partial<Record<keyof WiFiFormData, string>> = {};

    if (!wifiFormData.fullName.trim()) {
      errors.fullName = 'Nama lengkap wajib diisi';
    }

    if (!wifiFormData.phoneNumber.trim()) {
      errors.phoneNumber = 'Nomor telepon wajib diisi';
    } else if (!/^[\d\s\-+()]{10,15}$/.test(wifiFormData.phoneNumber.trim())) {
      errors.phoneNumber = 'Nomor telepon tidak valid';
    }

    if (!wifiFormData.address.trim()) {
      errors.address = 'Alamat lengkap wajib diisi';
    } else if (wifiFormData.address.trim().length < 10) {
      errors.address = 'Alamat terlalu pendek (min. 10 karakter)';
    }

    if (!wifiFormData.packageType) {
      errors.packageType = 'Silakan pilih paket WiFi';
    }

    setWiFiFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Panel Form Handlers
  const handlePanelFormChange = (field: keyof PanelFormData, value: string) => {
    setPanelFormData(prev => ({ ...prev, [field]: value }));
    if (panelFormErrors[field]) {
      setPanelFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validatePanelForm = (): boolean => {
    const errors: Partial<Record<keyof PanelFormData, string>> = {};

    if (!panelFormData.username.trim()) {
      errors.username = 'Username wajib diisi';
    } else if (panelFormData.username.length < 4) {
      errors.username = 'Username minimal 4 karakter';
    } else if (!/^[a-zA-Z0-9_]+$/.test(panelFormData.username)) {
      errors.username = 'Username hanya boleh huruf, angka, dan underscore';
    }

    if (!panelFormData.password) {
      errors.password = 'Password wajib diisi';
    } else if (panelFormData.password.length < 8) {
      errors.password = 'Password minimal 8 karakter';
    }

    if (panelFormData.password !== panelFormData.confirmPassword) {
      errors.confirmPassword = 'Password tidak cocok';
    }

    setPanelFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreatePayment = async () => {
    if (selectedItems.length === 0) {
      toast.error('Keranjang kosong');
      return;
    }

    // Validate WiFi form if has WiFi products
    if (hasWiFiProducts && !validateWiFiForm()) {
      toast.error('Mohon lengkapi data pemasangan WiFi');
      audioService.playRemove();
      return;
    }

    // Validate Panel form if has Panel products
    if (hasPanelProducts && !validatePanelForm()) {
      toast.error('Mohon lengkapi data akun Panel');
      audioService.playRemove();
      return;
    }

    audioService.playClick();
    const newOrderId = `ORDER-${Date.now()}`;

    try {
      // Create payment with Pakasir
      const response = await create({
        method: 'qris',
        orderId: newOrderId,
        amount: subtotal,
        customerName: wifiFormData.fullName || user?.displayName || 'Guest',
        customerEmail: user?.email || '',
      });

      if (!response) {
        throw new Error('Failed to create payment');
      }

      // Prepare additional data
      const installationData = hasWiFiProducts ? {
        installation_details: {
          fullName: wifiFormData.fullName,
          phoneNumber: wifiFormData.phoneNumber,
          ktpNumber: wifiFormData.ktpNumber || '',
          address: wifiFormData.address,
          installationDate: wifiFormData.installationDate || 'Belum ditentukan',
          notes: wifiFormData.notes || '',
          packageType: wifiFormData.packageType,
        }
      } : {};

      const panelData = hasPanelProducts ? {
        panel_details: {
          username: panelFormData.username,
          password: panelFormData.password,
          domain: PANEL_DOMAIN,
        }
      } : {};

      // Save order to Firestore (non-blocking - continue even if fails)
      try {
        await OrderService.create({
          user_id: user?.uid || 'guest',
          items: selectedItems.map(item => ({
            product_id: item.productId,
            title: item.title,
            tier: item.tier,
            price: item.price,
            quantity: item.quantity,
          })),
          total_amount: subtotal,
          status: 'pending',
          payment_method: 'qris',
          payment_reference: newOrderId,
          ...installationData,
          ...panelData,
        });
        console.log('[CHECKOUT] ✅ Order saved to Firestore');
      } catch (orderError) {
        console.warn('[CHECKOUT] ⚠️ Failed to save order, but payment is created:', orderError);
        toast.warning('Pembayaran dibuat, tetapi gagal menyimpan data order. Tim kami akan menghubungi Anda.');
      }

      // Send Telegram notification (non-blocking)
      try {
        await TelegramBot.sendCheckoutNotification({
          user: {
            id: user?.uid || 'guest',
            email: user?.email || 'guest@example.com',
            name: user?.displayName || 'Guest',
          },
          items: selectedItems.map(item => ({
            id: item.productId || item.id,
            title: item.title,
            tier: item.tier,
            quantity: item.quantity,
            price: item.price,
            image: item.image,
          })),
          totalAmount: subtotal,
          subtotal: subtotal,
          ...(hasWiFiProducts && {
            installationDetails: {
              fullName: wifiFormData.fullName,
              phoneNumber: wifiFormData.phoneNumber,
              address: wifiFormData.address,
              installationDate: wifiFormData.installationDate || 'Belum ditentukan',
              notes: wifiFormData.notes || '-',
              packageType: wifiFormData.packageType,
            }
          }),
          ...(hasPanelProducts && {
            panelDetails: {
              username: panelFormData.username,
              domain: PANEL_DOMAIN,
            }
          }),
        });
      } catch (telegramError) {
        console.warn('[CHECKOUT] ⚠️ Telegram notification failed:', telegramError);
      }

      const feeBreakdown = getPaymentFee('qris', subtotal);
      
      setPaymentData({
        orderId: newOrderId,
        method: 'qris',
        amount: subtotal,
        serviceFee: feeBreakdown.serviceFee,
        adminFee: feeBreakdown.adminFee,
        total: response.payment.total_payment,
        paymentNumber: response.payment.payment_number,
        expiredAt: response.payment.expired_at,
      });

      // Set panel credentials to show after payment
      if (hasPanelProducts) {
        setPanelCredentials({
          username: panelFormData.username,
          password: panelFormData.password,
          domain: PANEL_DOMAIN,
        });
      }

      setCurrentStep('payment');
      audioService.playSuccess();
      toast.success('Pembayaran berhasil dibuat!');
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error('Gagal membuat pembayaran: ' + error.message);
    }
  };

  const handleCopyPaymentNumber = () => {
    if (paymentData?.paymentNumber) {
      navigator.clipboard.writeText(paymentData.paymentNumber);
      setCopied(true);
      toast.success('Nomor pembayaran disalin!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePaymentSuccess = () => {
    setCurrentStep('success');
    audioService.playSuccess();
  };

  // Get payment method icon - QRIS only
  const getPaymentIcon = (_method: PaymentMethod) => {
    return <QrCode className="h-5 w-5" />;
  };

  // Format expiry time
  const formatExpiry = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format price
  const formatPrice = (price: number) => {
    return `Rp ${price.toLocaleString('id-ID')}`;
  };

  // Success View
  if (currentStep === 'success') {
    return (
      <div className={cn(
        "min-h-screen flex items-center justify-center px-4 py-6",
        isDarkMode ? "bg-gradient-to-br from-green-900/30 to-emerald-900/30" : "bg-gradient-to-br from-green-50 to-emerald-50"
      )}>
        <Card className={cn(
          "w-full max-w-md text-center p-8 shadow-xl animate-fade-in-scale",
          isDarkMode ? "bg-gray-800 border-gray-700" : ""
        )}>
          <div className={cn(
            "w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce",
            isDarkMode ? "bg-green-900/50" : "bg-green-100"
          )}>
            <Check className="h-12 w-12 text-green-600" />
          </div>
          <h2 className={cn(
            "text-2xl font-bold mb-2",
            isDarkMode ? "text-green-400" : "text-green-600"
          )}>Pembayaran Berhasil! 🎉</h2>
          <p className={cn(
            "mb-6",
            isDarkMode ? "text-gray-300" : "text-gray-600"
          )}>
            Terima kasih telah berbelanja. Pesanan Anda sedang diproses.
          </p>
          
          {/* WiFi Info */}
          {hasWiFiProducts && (
            <div className={cn(
              "rounded-lg p-4 mb-6 text-left",
              isDarkMode ? "bg-blue-900/30 border border-blue-800" : "bg-blue-50"
            )}>
              <div className="flex items-center gap-2 mb-2">
                <Wifi className="h-5 w-5 text-blue-600" />
                <p className={cn(
                  "font-semibold",
                  isDarkMode ? "text-blue-400" : "text-blue-700"
                )}>Informasi Pemasangan WiFi</p>
              </div>
              <p className={cn(
                "text-sm",
                isDarkMode ? "text-gray-400" : "text-gray-600"
              )}>
                Tim kami akan menghubungi Anda di <strong className={isDarkMode ? "text-gray-300" : ""}>{wifiFormData.phoneNumber}</strong> untuk konfirmasi jadwal pemasangan.
              </p>
              <div className="mt-2 text-sm">
                <p className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
                  <span className="font-medium">Paket:</span> {WIFI_PACKAGES.find(p => p.id === wifiFormData.packageType)?.name || wifiFormData.packageType}
                </p>
                <p className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
                  <span className="font-medium">Alamat:</span> {wifiFormData.address}
                </p>
              </div>
            </div>
          )}

          {/* Panel Info */}
          {hasPanelProducts && panelCredentials && (
            <div className={cn(
              "rounded-lg p-4 mb-6 text-left",
              isDarkMode ? "bg-purple-900/30 border border-purple-800" : "bg-purple-50"
            )}>
              <div className="flex items-center gap-2 mb-2">
                <Server className="h-5 w-5 text-purple-600" />
                <p className={cn(
                  "font-semibold",
                  isDarkMode ? "text-purple-400" : "text-purple-700"
                )}>Akun Panel Pterodactyl Anda</p>
              </div>
              
              <div className={cn(
                "p-3 rounded-lg mb-3",
                isDarkMode ? "bg-gray-800" : "bg-white"
              )}>
                <p className={cn(
                  "text-sm mb-1",
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                )}>Domain Panel</p>
                <p className={cn(
                  "font-mono font-medium text-lg text-purple-600",
                  isDarkMode ? "text-purple-400" : ""
                )}>
                  {panelCredentials.domain}
                </p>
              </div>

              <div className={cn(
                "p-3 rounded-lg mb-3",
                isDarkMode ? "bg-gray-800" : "bg-white"
              )}>
                <p className={cn(
                  "text-sm mb-1",
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                )}>Username</p>
                <p className={cn(
                  "font-mono font-medium text-lg",
                  isDarkMode ? "text-white" : ""
                )}>
                  {panelCredentials.username}
                </p>
              </div>

              <div className={cn(
                "p-3 rounded-lg",
                isDarkMode ? "bg-gray-800" : "bg-white"
              )}>
                <p className={cn(
                  "text-sm mb-1",
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                )}>Password</p>
                <p className={cn(
                  "font-mono font-medium text-lg",
                  isDarkMode ? "text-white" : ""
                )}>
                  {panelCredentials.password}
                </p>
              </div>

              <p className={cn(
                "text-xs mt-3",
                isDarkMode ? "text-gray-500" : "text-gray-500"
              )}>
                Simpan informasi login ini dengan aman. Panel dapat diakses di https://{panelCredentials.domain}
              </p>
            </div>
          )}

          <div className={cn(
            "rounded-lg p-4 mb-6",
            isDarkMode ? "bg-gray-700" : "bg-gray-50"
          )}>
            <p className={cn(
              "text-sm mb-1",
              isDarkMode ? "text-gray-400" : "text-gray-500"
            )}>ID Pesanan</p>
            <p className={cn(
              "font-mono font-medium text-lg",
              isDarkMode ? "text-white" : ""
            )}>{paymentData?.orderId}</p>
          </div>

          <Link to="/">
            <Button 
              className="w-full bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600"
              onClick={clearCart}
            >
              Kembali ke Beranda
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  // Payment View (showing payment details)
  if (currentStep === 'payment' && paymentData) {
    return (
      <div className={cn(
        "min-h-screen px-4 py-6",
        isDarkMode ? "bg-gradient-to-br from-gray-900 to-gray-800" : "bg-gradient-to-br from-gray-50 to-gray-100"
      )}>
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button 
              onClick={() => setCurrentStep('form')}
              className={cn(
                "p-2 rounded-full transition-colors shadow-sm",
                isDarkMode ? "hover:bg-gray-800 text-white" : "hover:bg-white"
              )}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className={cn(
              "text-xl font-bold",
              isDarkMode ? "text-white" : ""
            )}>Pembayaran</h1>
          </div>

          {/* Payment Details Card */}
          <Card className={cn(
            "mb-4 shadow-lg overflow-hidden",
            isDarkMode ? "bg-gray-800 border-gray-700" : ""
          )}>
            {/* Timer Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white p-4 text-center">
              <p className="text-sm text-blue-100 mb-1">Selesaikan pembayaran sebelum</p>
              <div className="flex items-center justify-center gap-2">
                <Clock className="h-5 w-5 animate-pulse" />
                <span className="text-lg font-bold">{formatExpiry(paymentData.expiredAt)}</span>
              </div>
            </div>

            <CardContent className="p-6">
              {/* Payment Method Display */}
              <div className="text-center mb-6">
                <div className={cn(
                  "w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center",
                  isDarkMode ? "bg-blue-900/30" : "bg-blue-100"
                )}>
                  {getPaymentIcon(paymentData.method)}
                </div>
                <h2 className={cn(
                  "font-bold text-lg",
                  isDarkMode ? "text-white" : ""
                )}>
                  {PAYMENT_METHODS.find(m => m.value === paymentData.method)?.label}
                </h2>
              </div>

              {/* QR/VA Number Display */}
              {paymentData.method === 'qris' ? (
                <div className="p-4 rounded-xl mb-4 text-center bg-white">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(paymentData.paymentNumber)}`}
                    alt="QRIS Code"
                    className="w-48 h-48 mx-auto"
                  />
                  <p className="text-xs text-gray-500 mt-2">Scan dengan aplikasi e-wallet</p>
                </div>
              ) : (
                <div className={cn(
                  "p-4 rounded-xl mb-4",
                  isDarkMode ? "bg-gray-700" : "bg-gray-100"
                )}>
                  <p className={cn(
                    "text-sm mb-1",
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  )}>Nomor Virtual Account</p>
                  <div className="flex items-center justify-center gap-2">
                    <p className={cn(
                      "font-mono text-xl font-bold",
                      isDarkMode ? "text-white" : ""
                    )}>
                      {paymentData.paymentNumber}
                    </p>
                    <button 
                      onClick={handleCopyPaymentNumber}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                    >
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Amount Details */}
              <div className={cn(
                "rounded-lg p-4 mb-4",
                isDarkMode ? "bg-gray-700/50" : "bg-gray-50"
              )}>
                <div className="flex justify-between mb-2">
                  <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>Subtotal</span>
                  <span className={isDarkMode ? "text-gray-300" : ""}>{formatPrice(paymentData.amount)}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>Biaya Layanan (1%)</span>
                  <span className={isDarkMode ? "text-gray-300" : ""}>{formatPrice(paymentData.serviceFee)}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>Biaya Admin (1.2%)</span>
                  <span className={isDarkMode ? "text-gray-300" : ""}>{formatPrice(paymentData.adminFee)}</span>
                </div>
                <div className={cn(
                  "border-t my-2",
                  isDarkMode ? "border-gray-600" : "border-gray-200"
                )} />
                <div className="flex justify-between">
                  <span className={cn(
                    "font-semibold",
                    isDarkMode ? "text-white" : ""
                  )}>Total Pembayaran</span>
                  <span className="font-bold text-blue-600 text-lg">
                    {formatPrice(paymentData.total)}
                  </span>
                </div>
              </div>

              {/* Instructions */}
              <div className={cn(
                "p-3 rounded-lg text-sm",
                isDarkMode ? "bg-yellow-900/20 border border-yellow-800 text-yellow-200" : "bg-yellow-50 text-yellow-800"
              )}>
                <p className="font-medium mb-1">Petunjuk Pembayaran:</p>
                {paymentData.method === 'qris' ? (
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Buka aplikasi e-wallet (Gojek, OVO, DANA, dll)</li>
                    <li>Pilih menu Scan QR</li>
                    <li>Scan kode QR di atas</li>
                    <li>Konfirmasi pembayaran</li>
                  </ol>
                ) : (
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Buka aplikasi mobile banking atau ATM</li>
                    <li>Pilih menu Transfer ke Virtual Account</li>
                    <li>Masukkan nomor VA di atas</li>
                    <li>Konfirmasi pembayaran</li>
                  </ol>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              className="w-full bg-green-600 hover:bg-green-700 py-6 text-lg font-bold"
              onClick={handlePaymentSuccess}
            >
              <Check className="h-5 w-5 mr-2" />
              Saya Sudah Bayar
            </Button>

            <a 
              href={generatePaymentUrl(paymentData.total, paymentData.orderId, { 
                redirectUrl: window.location.origin + '/checkout'
              })}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full"
            >
              <Button
                variant="outline"
                className={cn(
                  "w-full py-6",
                  isDarkMode ? "border-gray-600 hover:bg-gray-800" : ""
                )}
              >
                Buka di Aplikasi Pakasir
                <ChevronDown className="h-4 w-4 ml-2 rotate-[-90deg]" />
              </Button>
            </a>

            <Button
              variant="ghost"
              className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={() => setCurrentStep('form')}
            >
              <X className="h-4 w-4 mr-2" />
              Batalkan Pembayaran
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Form View (default)
  return (
    <div className={cn(
      "min-h-screen px-4 py-6",
      isDarkMode ? "bg-gradient-to-br from-gray-900 to-gray-800" : "bg-gradient-to-br from-gray-50 to-gray-100"
    )}>
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/cart" className={cn(
            "p-2 rounded-full transition-colors shadow-sm",
            isDarkMode ? "hover:bg-gray-800 text-white" : "hover:bg-white"
          )}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className={cn(
            "text-xl font-bold",
            isDarkMode ? "text-white" : ""
          )}>Checkout</h1>
        </div>

        {/* Order Summary */}
        <Card className={cn(
          "mb-4 shadow-lg",
          isDarkMode ? "bg-gray-800 border-gray-700" : ""
        )}>
          <CardContent className="p-4">
            <h2 className={cn(
              "font-semibold mb-3",
              isDarkMode ? "text-white" : ""
            )}>Ringkasan Pesanan</h2>
            <div className="space-y-3">
              {selectedItems.map((item) => (
                <div key={item.id} className="flex justify-between items-center">
                  <div className="flex-1">
                    <p className={cn(
                      "text-sm font-medium",
                      isDarkMode ? "text-gray-200" : ""
                    )}>{item.title}</p>
                    <p className={cn(
                      "text-xs",
                      isDarkMode ? "text-gray-500" : "text-gray-500"
                    )}>{item.tier} x{item.quantity}</p>
                  </div>
                  <p className={cn(
                    "text-sm font-semibold",
                    isDarkMode ? "text-blue-400" : ""
                  )}>
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
            <div className={cn(
              "border-t my-3",
              isDarkMode ? "border-gray-700" : ""
            )} />
            <div className="flex justify-between items-center">
              <span className={cn(
                "font-semibold",
                isDarkMode ? "text-white" : ""
              )}>Subtotal</span>
              <span className="font-bold text-blue-600 text-xl">
                {formatPrice(subtotal)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* WiFi Installation Form */}
        {hasWiFiProducts && (
          <Card className={cn(
            "mb-4 shadow-lg border-2",
            isDarkMode ? "bg-gray-800 border-blue-800" : "border-blue-200"
          )}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  isDarkMode ? "bg-blue-900/50" : "bg-blue-100"
                )}>
                  <Wifi className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className={cn(
                    "font-semibold",
                    isDarkMode ? "text-white" : ""
                  )}>Data Pemasangan WiFi</h2>
                  <p className={cn(
                    "text-xs",
                    isDarkMode ? "text-gray-500" : "text-gray-500"
                  )}>Lengkapi data untuk pemasangan WiFi</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Package Selection */}
                <div className="space-y-2">
                  <Label className={cn(
                    "flex items-center gap-1.5 text-sm font-medium",
                    isDarkMode ? "text-gray-200" : ""
                  )}>
                    <Package className="h-3.5 w-3.5" />
                    Pilih Paket WiFi <span className="text-red-500">*</span>
                  </Label>
                  <div className="grid grid-cols-1 gap-2">
                    {WIFI_PACKAGES.map((pkg) => {
                      const Icon = pkg.icon;
                      return (
                        <button
                          key={pkg.id}
                          type="button"
                          onClick={() => handleWiFiFormChange('packageType', pkg.id)}
                          className={cn(
                            "p-3 rounded-xl border-2 text-left transition-all",
                            wifiFormData.packageType === pkg.id
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                              : isDarkMode
                                ? "border-gray-700 hover:border-gray-600 bg-gray-700/50"
                                : "border-gray-200 hover:border-blue-300 bg-white"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                              wifiFormData.packageType === pkg.id 
                                ? "bg-blue-500 text-white" 
                                : "bg-gray-200 dark:bg-gray-600"
                            )}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <p className={cn(
                                  "font-semibold",
                                  isDarkMode ? "text-white" : ""
                                )}>{pkg.name}</p>
                                <p className="text-xs text-blue-600 font-medium">{pkg.speed}</p>
                              </div>
                              <p className={cn(
                                "text-xs",
                                isDarkMode ? "text-gray-400" : "text-gray-500"
                              )}>{pkg.devices}</p>
                              <p className="text-xs font-semibold text-green-600 mt-1">
                                {formatPrice(pkg.price)}/bulan
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {wifiFormErrors.packageType && (
                    <p className="text-xs text-red-500">{wifiFormErrors.packageType}</p>
                  )}
                </div>

                {/* Full Name */}
                <div className="space-y-1.5">
                  <Label className={cn(
                    "flex items-center gap-1.5 text-sm font-medium",
                    isDarkMode ? "text-gray-200" : ""
                  )}>
                    <User className="h-3.5 w-3.5" />
                    Nama Lengkap <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="Masukkan nama lengkap"
                    value={wifiFormData.fullName}
                    onChange={(e) => handleWiFiFormChange('fullName', e.target.value)}
                    className={cn(
                      isDarkMode ? "bg-gray-700 border-gray-600 text-white placeholder:text-gray-500" : "",
                      wifiFormErrors.fullName ? "border-red-500" : ""
                    )}
                  />
                  {wifiFormErrors.fullName && (
                    <p className="text-xs text-red-500">{wifiFormErrors.fullName}</p>
                  )}
                </div>

                {/* Phone Number */}
                <div className="space-y-1.5">
                  <Label className={cn(
                    "flex items-center gap-1.5 text-sm font-medium",
                    isDarkMode ? "text-gray-200" : ""
                  )}>
                    Nomor Telepon <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="tel"
                    placeholder="Contoh: 081234567890"
                    value={wifiFormData.phoneNumber}
                    onChange={(e) => handleWiFiFormChange('phoneNumber', e.target.value)}
                    className={cn(
                      isDarkMode ? "bg-gray-700 border-gray-600 text-white placeholder:text-gray-500" : "",
                      wifiFormErrors.phoneNumber ? "border-red-500" : ""
                    )}
                  />
                  {wifiFormErrors.phoneNumber && (
                    <p className="text-xs text-red-500">{wifiFormErrors.phoneNumber}</p>
                  )}
                </div>

                {/* Address */}
                <div className="space-y-1.5">
                  <Label className={cn(
                    "flex items-center gap-1.5 text-sm font-medium",
                    isDarkMode ? "text-gray-200" : ""
                  )}>
                    Alamat Lengkap Pemasangan <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    placeholder="Masukkan alamat lengkap pemasangan"
                    value={wifiFormData.address}
                    onChange={(e) => handleWiFiFormChange('address', e.target.value)}
                    className={cn(
                      "min-h-[80px] resize-none",
                      isDarkMode ? "bg-gray-700 border-gray-600 text-white placeholder:text-gray-500" : "",
                      wifiFormErrors.address ? "border-red-500" : ""
                    )}
                  />
                  {wifiFormErrors.address && (
                    <p className="text-xs text-red-500">{wifiFormErrors.address}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Panel Pterodactyl Form */}
        {hasPanelProducts && (
          <Card className={cn(
            "mb-4 shadow-lg border-2",
            isDarkMode ? "bg-gray-800 border-purple-800" : "border-purple-200"
          )}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  isDarkMode ? "bg-purple-900/50" : "bg-purple-100"
                )}>
                  <Server className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h2 className={cn(
                    "font-semibold",
                    isDarkMode ? "text-white" : ""
                  )}>Buat Akun Panel Pterodactyl</h2>
                  <p className={cn(
                    "text-xs",
                    isDarkMode ? "text-gray-500" : "text-gray-500"
                  )}>Masukkan username dan password untuk login panel</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Username */}
                <div className="space-y-1.5">
                  <Label className={cn(
                    "flex items-center gap-1.5 text-sm font-medium",
                    isDarkMode ? "text-gray-200" : ""
                  )}>
                    <User className="h-3.5 w-3.5" />
                    Username Panel <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="Masukkan username (min. 4 karakter)"
                    value={panelFormData.username}
                    onChange={(e) => handlePanelFormChange('username', e.target.value)}
                    className={cn(
                      isDarkMode ? "bg-gray-700 border-gray-600 text-white placeholder:text-gray-500" : "",
                      panelFormErrors.username ? "border-red-500" : ""
                    )}
                  />
                  {panelFormErrors.username && (
                    <p className="text-xs text-red-500">{panelFormErrors.username}</p>
                  )}
                  <p className={cn(
                    "text-xs",
                    isDarkMode ? "text-gray-500" : "text-gray-500"
                  )}>
                    Hanya huruf, angka, dan underscore (_)
                  </p>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <Label className={cn(
                    "flex items-center gap-1.5 text-sm font-medium",
                    isDarkMode ? "text-gray-200" : ""
                  )}>
                    <Lock className="h-3.5 w-3.5" />
                    Password <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="password"
                    placeholder="Masukkan password (min. 8 karakter)"
                    value={panelFormData.password}
                    onChange={(e) => handlePanelFormChange('password', e.target.value)}
                    className={cn(
                      isDarkMode ? "bg-gray-700 border-gray-600 text-white placeholder:text-gray-500" : "",
                      panelFormErrors.password ? "border-red-500" : ""
                    )}
                  />
                  {panelFormErrors.password && (
                    <p className="text-xs text-red-500">{panelFormErrors.password}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <Label className={cn(
                    "flex items-center gap-1.5 text-sm font-medium",
                    isDarkMode ? "text-gray-200" : ""
                  )}>
                    <Lock className="h-3.5 w-3.5" />
                    Konfirmasi Password <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="password"
                    placeholder="Ulangi password"
                    value={panelFormData.confirmPassword}
                    onChange={(e) => handlePanelFormChange('confirmPassword', e.target.value)}
                    className={cn(
                      isDarkMode ? "bg-gray-700 border-gray-600 text-white placeholder:text-gray-500" : "",
                      panelFormErrors.confirmPassword ? "border-red-500" : ""
                    )}
                  />
                  {panelFormErrors.confirmPassword && (
                    <p className="text-xs text-red-500">{panelFormErrors.confirmPassword}</p>
                  )}
                </div>

                {/* Domain Info */}
                <div className={cn(
                  "p-3 rounded-lg",
                  isDarkMode ? "bg-purple-900/20" : "bg-purple-50"
                )}>
                  <p className={cn(
                    "text-sm font-medium mb-1",
                    isDarkMode ? "text-purple-400" : "text-purple-700"
                  )}>
                    Domain Panel Anda:
                  </p>
                  <p className={cn(
                    "font-mono text-lg font-bold",
                    isDarkMode ? "text-white" : "text-purple-600"
                  )}>
                    {PANEL_DOMAIN}
                  </p>
                  <p className={cn(
                    "text-xs mt-1",
                    isDarkMode ? "text-gray-500" : "text-gray-600"
                  )}>
                    Panel dapat diakses di https://{PANEL_DOMAIN}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Method - QRIS Only */}
        <Card className={cn(
          "mb-4 shadow-lg",
          isDarkMode ? "bg-gray-800 border-gray-700" : ""
        )}>
          <CardContent className="p-4">
            <h2 className={cn(
              "font-semibold mb-3",
              isDarkMode ? "text-white" : ""
            )}>Metode Pembayaran</h2>
            
            {/* QRIS Info */}
            <div className={cn(
              "flex items-center gap-3 p-4 rounded-xl border-2 border-blue-500",
              isDarkMode ? "bg-blue-900/20" : "bg-blue-50"
            )}>
              <div className={cn(
                "w-12 h-12 rounded-lg flex items-center justify-center bg-blue-500 text-white"
              )}>
                <QrCode className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className={cn(
                  "font-semibold",
                  isDarkMode ? "text-white" : ""
                )}>QRIS (Semua E-Wallet)</p>
                <p className="text-xs text-gray-500">
                  DANA, Gojek, OVO, LinkAja, ShopeePay, dll
                </p>
                <p className="text-xs text-green-600 font-medium mt-1">
                  ✓ Tanpa biaya tambahan
                </p>
              </div>
              <Check className="h-5 w-5 text-blue-500" />
            </div>

            {/* Total Calculation */}
            <div className={cn(
              "mt-4 pt-4 border-t",
              isDarkMode ? "border-gray-700" : "border-gray-200"
            )}>
              <div className="flex justify-between text-sm mb-1">
                <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>Subtotal</span>
                <span className={isDarkMode ? "text-gray-300" : ""}>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>Biaya Layanan (1%)</span>
                <span className={isDarkMode ? "text-gray-300" : ""}>{formatPrice(feeBreakdown.serviceFee)}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>Biaya Admin (1.2%)</span>
                <span className={isDarkMode ? "text-gray-300" : ""}>{formatPrice(feeBreakdown.adminFee)}</span>
              </div>
              <div className={cn(
                "flex justify-between items-center pt-2 border-t border-dashed",
                isDarkMode ? "border-gray-600" : "border-gray-300"
              )}>
                <span className={cn(
                  "font-semibold",
                  isDarkMode ? "text-white" : ""
                )}>Total</span>
                <span className="font-bold text-blue-600 text-xl">
                  {formatPrice(totalAmount)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Badge */}
        <div className={cn(
          "flex items-center gap-2 p-3 rounded-lg mb-4",
          isDarkMode ? "bg-green-900/20 text-green-400" : "bg-green-50 text-green-700"
        )}>
          <Shield className="h-5 w-5" />
          <p className="text-sm">Pembayaran aman & terenkripsi</p>
        </div>

        {/* Pay Button */}
        <Button
          className="w-full bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600 py-7 text-lg font-bold shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
          onClick={handleCreatePayment}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
          ) : (
            <CreditCard className="h-5 w-5 mr-2" />
          )}
          {isProcessing ? 'Memproses...' : 'Bayar Sekarang'}
        </Button>

        <p className={cn(
          "text-center text-xs mt-4",
          isDarkMode ? "text-gray-500" : "text-gray-500"
        )}>
          Dengan melanjutkan, Anda menyetujui Syarat dan Ketentuan kami
        </p>
      </div>
    </div>
  );
}

export default CheckoutSection;
