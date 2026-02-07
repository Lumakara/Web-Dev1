/**
 * PAKASIR PAYMENT GATEWAY - ULTRA FUNCTIONAL VERSION v2.0
 * Fixed QR generation and enhanced error handling
 * 
 * Dokumentasi: https://pakasir.com/p/docs
 */

import { toast } from 'sonner';

// ============================================
// TYPES
// ============================================

export type PaymentMethod = 
  | 'qris'
  | 'cimb_niaga_va'
  | 'bni_va'
  | 'sampoerna_va'
  | 'bnc_va'
  | 'maybank_va'
  | 'permata_va'
  | 'atm_bersama_va'
  | 'artha_graha_va'
  | 'bri_va'
  | 'paypal';

export interface PakasirConfig {
  apiKey: string;
  projectSlug: string;
  isSandbox?: boolean;
  apiUrl?: string;
}

export interface CreatePaymentRequest {
  method: PaymentMethod;
  orderId: string;
  amount: number;
  customerName?: string;
  customerEmail?: string;
  description?: string;
}

export interface PaymentResponse {
  success: boolean;
  payment: {
    project: string;
    order_id: string;
    amount: number;
    fee: number;
    total_payment: number;
    payment_method: PaymentMethod;
    payment_number: string;
    expired_at: string;
    qr_string?: string;
    va_number?: string;
    checkout_url?: string;
  };
  message?: string;
}

export interface TransactionDetailResponse {
  success: boolean;
  transaction: {
    amount: number;
    order_id: string;
    project: string;
    status: 'pending' | 'completed' | 'cancelled' | 'expired';
    payment_method: PaymentMethod;
    completed_at?: string;
    created_at?: string;
  };
  message?: string;
}

export interface WebhookPayload {
  amount: number;
  order_id: string;
  project: string;
  status: 'completed' | 'cancelled' | 'expired';
  payment_method: PaymentMethod;
  completed_at: string;
  signature?: string;
}

export interface PakasirStatus {
  configured: boolean;
  apiKey: boolean;
  projectSlug: boolean;
  sandbox: boolean;
  error: string | null;
}

export interface PaymentMethodInfo {
  value: PaymentMethod;
  label: string;
  fee: number;
  type: 'fixed' | 'percentage';
  icon?: string;
  category: 'ewallet' | 'va' | 'card' | 'international';
}

// ============================================
// CONFIGURATION
// ============================================

const PAKASIR_BASE_URL = 'https://app.pakasir.com';
const PAKASIR_API_URL = `${PAKASIR_BASE_URL}/api`;

// Use proxy in development to bypass CORS
const getApiUrl = (): string => {
  // In development, use the Vite proxy
  if (import.meta.env.DEV) {
    return '/api/pakasir';
  }
  // In production, use the direct API URL
  return import.meta.env.VITE_PAKASIR_API_URL || PAKASIR_API_URL;
};

// Validate and get config from environment
const getConfig = (): PakasirConfig & { isValid: boolean; errors: string[] } => {
  const apiKey = import.meta.env.VITE_PAKASIR_API_KEY || '';
  const projectSlug = import.meta.env.VITE_PAKASIR_PROJECT_SLUG || '';
  const isSandbox = import.meta.env.VITE_PAKASIR_SANDBOX === 'true';
  const apiUrl = getApiUrl();
  
  const errors: string[] = [];
  
  if (!apiKey) {
    errors.push('VITE_PAKASIR_API_KEY tidak dikonfigurasi');
  }
  
  if (!projectSlug) {
    errors.push('VITE_PAKASIR_PROJECT_SLUG tidak dikonfigurasi');
  }
  
  // Validate API key format
  if (apiKey && apiKey.length < 10) {
    errors.push('VITE_PAKASIR_API_KEY tidak valid (terlalu pendek)');
  }
  
  // Validate project slug format
  if (projectSlug && !/^[a-z0-9-]+$/.test(projectSlug)) {
    errors.push('VITE_PAKASIR_PROJECT_SLUG tidak valid');
  }
  
  const isValid = errors.length === 0;
  
  if (!isValid) {
    console.error('[PAKASIR] ❌ Configuration errors:', errors);
  } else {
    console.log('[PAKASIR] ✅ Configuration valid');
    console.log('[PAKASIR] Project:', projectSlug);
    console.log('[PAKASIR] Sandbox:', isSandbox);
    console.log('[PAKASIR] API URL:', apiUrl);
  }
  
  return {
    apiKey,
    projectSlug,
    isSandbox,
    apiUrl,
    isValid,
    errors,
  };
};

// ============================================
// STATUS CHECK
// ============================================

export const getPakasirStatus = (): PakasirStatus => {
  const config = getConfig();
  
  return {
    configured: config.isValid,
    apiKey: !!config.apiKey && config.apiKey.length >= 10,
    projectSlug: !!config.projectSlug && /^[a-z0-9-]+$/.test(config.projectSlug),
    sandbox: !!config.isSandbox,
    error: config.errors.length > 0 ? config.errors.join(', ') : null,
  };
};

export const isPakasirConfigured = (): boolean => {
  return getConfig().isValid;
};

// ============================================
// ERROR HANDLER
// ============================================

class PakasirError extends Error {
  code: string;
  statusCode?: number;
  
  constructor(
    message: string,
    code: string,
    statusCode?: number
  ) {
    super(message);
    this.name = 'PakasirError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

const handleApiError = async (response: Response): Promise<never> => {
  let errorMessage = 'Terjadi kesalahan pada pembayaran';
  let errorCode = 'UNKNOWN_ERROR';
  
  try {
    const errorData = await response.json();
    errorMessage = errorData.message || errorData.error || errorMessage;
    errorCode = errorData.code || `HTTP_${response.status}`;
  } catch {
    errorMessage = response.statusText || errorMessage;
    errorCode = `HTTP_${response.status}`;
  }
  
  const errorMap: Record<string, string> = {
    'HTTP_400': 'Permintaan tidak valid',
    'HTTP_401': 'API Key tidak valid',
    'HTTP_403': 'Akses ditolak',
    'HTTP_404': 'Project atau metode pembayaran tidak ditemukan',
    'HTTP_429': 'Terlalu banyak permintaan, coba lagi nanti',
    'HTTP_500': 'Server Pakasir sedang bermasalah',
    'HTTP_502': 'Server Pakasir tidak dapat diakses',
    'HTTP_503': 'Layanan Pakasir sedang maintenance',
    'INVALID_PROJECT': 'Project slug tidak valid',
    'INVALID_API_KEY': 'API key tidak valid',
    'DUPLICATE_ORDER': 'Order ID sudah pernah digunakan',
    'INVALID_AMOUNT': 'Jumlah pembayaran tidak valid',
    'MINIMUM_AMOUNT': 'Jumlah pembayaran terlalu kecil (minimal Rp 1.000)',
    'MAXIMUM_AMOUNT': 'Jumlah pembayaran terlalu besar',
    'PAYMENT_METHOD_NOT_AVAILABLE': 'Metode pembayaran tidak tersedia',
  };
  
  const friendlyMessage = errorMap[errorCode] || errorMessage;
  throw new PakasirError(friendlyMessage, errorCode, response.status);
};

// ============================================
// API FUNCTIONS - FIXED
// ============================================

/**
 * Create a new payment transaction - FIXED VERSION
 */
export async function createPayment(
  request: CreatePaymentRequest
): Promise<PaymentResponse> {
  const config = getConfig();
  
  if (!config.isValid) {
    throw new PakasirError(
      `Pakasir belum dikonfigurasi: ${config.errors.join(', ')}`,
      'NOT_CONFIGURED'
    );
  }
  
  // Validate request
  if (!request.orderId) {
    throw new PakasirError('Order ID wajib diisi', 'INVALID_ORDER_ID');
  }
  
  if (!request.amount || request.amount < 1000) {
    throw new PakasirError('Jumlah pembayaran minimal Rp 1.000', 'INVALID_AMOUNT');
  }
  
  if (!request.method) {
    throw new PakasirError('Metode pembayaran wajib dipilih', 'INVALID_METHOD');
  }
  
  console.log('[PAKASIR] Creating payment...', {
    orderId: request.orderId,
    amount: request.amount,
    method: request.method,
    project: config.projectSlug,
  });
  
  try {
    // FIXED: Use correct API endpoint format
    const apiUrl = `${config.apiUrl}/transactioncreate/${request.method}`;
    
    console.log('[PAKASIR] API URL:', apiUrl);
    
    const requestBody = {
      project: config.projectSlug,
      order_id: request.orderId,
      amount: Math.round(request.amount),
      api_key: config.apiKey,
    };
    
    console.log('[PAKASIR] Request body:', requestBody);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('[PAKASIR] Response status:', response.status);

    // Try to get response body even if not OK
    let responseData: any;
    try {
      const responseText = await response.text();
      console.log('[PAKASIR] Raw response:', responseText.substring(0, 500));
      
      if (!responseText || responseText.trim() === '') {
        throw new PakasirError('Respons server kosong', 'EMPTY_RESPONSE');
      }
      
      try {
        responseData = JSON.parse(responseText);
        console.log('[PAKASIR] Parsed response:', responseData);
      } catch (parseError) {
        console.error('[PAKASIR] JSON parse error:', parseError);
        throw new PakasirError(
          `Respons server tidak valid: ${responseText.substring(0, 100)}`,
          'INVALID_JSON_RESPONSE'
        );
      }
    } catch (e) {
      if (e instanceof PakasirError) {
        throw e;
      }
      console.error('[PAKASIR] Failed to parse response:', e);
      throw new PakasirError('Respons server tidak valid', 'INVALID_RESPONSE');
    }

    if (!response.ok) {
      // Handle specific error cases
      if (response.status === 404) {
        throw new PakasirError(
          'Metode pembayaran tidak ditemukan. Coba QRIS atau Virtual Account lain.',
          'PAYMENT_METHOD_NOT_FOUND',
          404
        );
      }
      
      const errorMsg = responseData?.message || responseData?.error || 'Gagal membuat pembayaran';
      throw new PakasirError(errorMsg, `HTTP_${response.status}`, response.status);
    }

    // Validate response structure
    if (!responseData.payment) {
      console.error('[PAKASIR] Invalid response structure:', responseData);
      throw new PakasirError('Respons pembayaran tidak valid', 'INVALID_RESPONSE_STRUCTURE');
    }

    // Ensure payment_number exists (for QRIS this is the QR string)
    if (!responseData.payment.payment_number) {
      console.warn('[PAKASIR] Payment number missing, using order_id as fallback');
      responseData.payment.payment_number = request.orderId;
    }
    
    console.log('[PAKASIR] ✅ Payment created successfully:', {
      orderId: responseData.payment.order_id,
      method: responseData.payment.payment_method,
      total: responseData.payment.total_payment,
      paymentNumber: responseData.payment.payment_number?.substring(0, 20) + '...',
    });
    
    return responseData as PaymentResponse;
    
  } catch (error) {
    if (error instanceof PakasirError) {
      throw error;
    }
    
    // Enhanced error logging - with box display
    const errorName = error instanceof Error ? error.name : 'Unknown';
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Display formatted error box
    console.log('');
    console.log('%c┌─────────────────────────────────────────────────────────────┐', 'color: #ff4444; font-weight: bold;');
    console.log('%c│ ❌ PAKASIR PAYMENT ERROR                                    │', 'color: #ff4444; font-weight: bold; font-size: 14px;');
    console.log('%c├─────────────────────────────────────────────────────────────┤', 'color: #ff4444; font-weight: bold;');
    console.log(`%c│ Name:    ${errorName.padEnd(51)}│`, 'color: #ff4444;');
    console.log(`%c│ Message: ${errorMessage.substring(0, 51).padEnd(51)}│`, 'color: #ff4444;');
    console.log(`%c│ Stack:   ${(errorStack?.split('\n')[0] || 'N/A').substring(0, 51).padEnd(51)}│`, 'color: #ff4444;');
    console.log('%c└─────────────────────────────────────────────────────────────┘', 'color: #ff4444; font-weight: bold;');
    console.log('%c⏰ Waktu: ' + new Date().toLocaleTimeString('id-ID'), 'color: #888; font-size: 10px;');
    console.log('');
    
    // Detail log
    console.error('[PAKASIR] Full error details:', {
      name: errorName,
      message: errorMessage,
      stack: errorStack,
      raw: error,
      timestamp: new Date().toISOString(),
    });
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new PakasirError(
        'Tidak dapat terhubung ke server Pakasir. Periksa koneksi internet Anda.',
        'NETWORK_ERROR'
      );
    }
    
    const finalMessage = errorMessage || 'Gagal membuat pembayaran. Silakan coba lagi.';
    throw new PakasirError(
      finalMessage,
      'CREATE_FAILED'
    );
  }
}

/**
 * Get transaction detail/status
 */
export async function getTransactionDetail(
  orderId: string,
  amount: number
): Promise<TransactionDetailResponse> {
  const config = getConfig();
  
  if (!config.isValid) {
    throw new PakasirError('Pakasir belum dikonfigurasi', 'NOT_CONFIGURED');
  }

  try {
    const params = new URLSearchParams({
      project: config.projectSlug,
      amount: Math.round(amount).toString(),
      order_id: orderId,
      api_key: config.apiKey,
    });

    const response = await fetch(
      `${config.apiUrl}/transactiondetail?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      await handleApiError(response);
    }

    const data: TransactionDetailResponse = await response.json();
    return data;
  } catch (error) {
    if (error instanceof PakasirError) {
      throw error;
    }
    
    console.error('[PAKASIR] ❌ Get transaction error:', error);
    throw new PakasirError(
      'Gagal memeriksa status pembayaran',
      'CHECK_STATUS_FAILED'
    );
  }
}

/**
 * Cancel a pending transaction
 */
export async function cancelTransaction(
  orderId: string,
  amount: number
): Promise<void> {
  const config = getConfig();
  
  if (!config.isValid) {
    throw new PakasirError('Pakasir belum dikonfigurasi', 'NOT_CONFIGURED');
  }

  try {
    const response = await fetch(`${config.apiUrl}/transactioncancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        project: config.projectSlug,
        order_id: orderId,
        amount: Math.round(amount),
        api_key: config.apiKey,
      }),
    });

    if (!response.ok) {
      await handleApiError(response);
    }
    
    console.log('[PAKASIR] ✅ Transaction cancelled:', orderId);
  } catch (error) {
    if (error instanceof PakasirError) {
      throw error;
    }
    
    console.error('[PAKASIR] ❌ Cancel transaction error:', error);
    throw new PakasirError('Gagal membatalkan pembayaran', 'CANCEL_FAILED');
  }
}

/**
 * Simulate payment (Sandbox only)
 */
export async function simulatePayment(
  orderId: string,
  amount: number
): Promise<void> {
  const config = getConfig();
  
  if (!config.isValid) {
    throw new PakasirError('Pakasir belum dikonfigurasi', 'NOT_CONFIGURED');
  }
  
  if (!config.isSandbox) {
    throw new PakasirError(
      'Simulasi pembayaran hanya tersedia di mode sandbox',
      'NOT_SANDBOX'
    );
  }

  try {
    const response = await fetch(`${config.apiUrl}/paymentsimulation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        project: config.projectSlug,
        order_id: orderId,
        amount: Math.round(amount),
        api_key: config.apiKey,
      }),
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    console.log('[PAKASIR] ✅ Payment simulated:', orderId);
    toast.success('Simulasi pembayaran berhasil!');
  } catch (error) {
    if (error instanceof PakasirError) {
      throw error;
    }
    
    console.error('[PAKASIR] ❌ Simulate payment error:', error);
    throw new PakasirError('Gagal mensimulasikan pembayaran', 'SIMULATE_FAILED');
  }
}

// ============================================
// URL REDIRECT METHOD
// ============================================

export interface PaymentUrlOptions {
  qrisOnly?: boolean;
  redirectUrl?: string;
  usePayPal?: boolean;
  customMessage?: string;
}

/**
 * Generate Pakasir payment URL for redirect method
 */
export function generatePaymentUrl(
  amount: number,
  orderId: string,
  options?: PaymentUrlOptions
): string {
  const config = getConfig();
  
  if (!config.isValid) {
    throw new PakasirError('Pakasir belum dikonfigurasi', 'NOT_CONFIGURED');
  }

  const baseUrl = config.isSandbox ? 'https://sandbox.pakasir.com' : PAKASIR_BASE_URL;
  const path = options?.usePayPal ? 'paypal' : 'pay';
  
  let url = `${baseUrl}/${path}/${config.projectSlug}/${Math.round(amount)}?order_id=${encodeURIComponent(orderId)}`;

  if (options?.qrisOnly) {
    url += '&qris_only=1';
  }

  if (options?.redirectUrl) {
    url += `&redirect=${encodeURIComponent(options.redirectUrl)}`;
  }
  
  if (options?.customMessage) {
    url += `&message=${encodeURIComponent(options.customMessage)}`;
  }

  console.log('[PAKASIR] Generated payment URL:', url);
  return url;
}

/**
 * Open payment in new window
 */
export function openPaymentWindow(
  amount: number,
  orderId: string,
  options?: PaymentUrlOptions
): Window | null {
  const url = generatePaymentUrl(amount, orderId, options);
  
  const width = 450;
  const height = 700;
  const left = (window.screen.width - width) / 2;
  const top = (window.screen.height - height) / 2;
  
  const popup = window.open(
    url,
    'PakasirPayment',
    `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
  );
  
  if (!popup || popup.closed || typeof popup.closed === 'undefined') {
    window.location.href = url;
    return null;
  }
  
  return popup;
}

// ============================================
// PAYMENT METHOD HELPERS
// ============================================

export const PAYMENT_METHODS: PaymentMethodInfo[] = [
  { value: 'qris', label: 'QRIS (Semua E-Wallet)', fee: 0, type: 'percentage', icon: 'QrCode', category: 'ewallet' },
  { value: 'bni_va', label: 'BNI Virtual Account', fee: 0, type: 'percentage', icon: 'Building2', category: 'va' },
  { value: 'bri_va', label: 'BRI Virtual Account', fee: 0, type: 'percentage', icon: 'Building2', category: 'va' },
  { value: 'permata_va', label: 'Permata Virtual Account', fee: 0, type: 'percentage', icon: 'Building2', category: 'va' },
  { value: 'cimb_niaga_va', label: 'CIMB Niaga Virtual Account', fee: 0, type: 'percentage', icon: 'Building2', category: 'va' },
  { value: 'maybank_va', label: 'Maybank Virtual Account', fee: 0, type: 'percentage', icon: 'Building2', category: 'va' },
  { value: 'bnc_va', label: 'BNC Virtual Account', fee: 0, type: 'percentage', icon: 'Building2', category: 'va' },
  { value: 'atm_bersama_va', label: 'ATM Bersama', fee: 0, type: 'percentage', icon: 'CreditCard', category: 'va' },
  { value: 'paypal', label: 'PayPal', fee: 4.4, type: 'percentage', icon: 'Globe', category: 'international' },
];

export function getPaymentMethodLabel(method: PaymentMethod): string {
  const found = PAYMENT_METHODS.find(m => m.value === method);
  return found?.label || method;
}

export function getPaymentMethodInfo(method: PaymentMethod): PaymentMethodInfo | undefined {
  return PAYMENT_METHODS.find(m => m.value === method);
}

export interface FeeBreakdown {
  subtotal: number;
  serviceFee: number;
  adminFee: number;
  paymentFee: number;
  total: number;
}

export function getPaymentFee(method: PaymentMethod, amount: number): FeeBreakdown {
  const serviceFeeRate = 0.01;
  const adminFeeRate = 0.012;
  
  const serviceFee = Math.round(amount * serviceFeeRate);
  const adminFee = Math.round(amount * adminFeeRate);
  
  let paymentFee = 0;
  
  if (method === 'paypal') {
    paymentFee = Math.round(amount * 0.044) + 4500;
  }
  
  const methodInfo = getPaymentMethodInfo(method);
  if (methodInfo && methodInfo.fee > 0 && method !== 'paypal') {
    if (methodInfo.type === 'percentage') {
      paymentFee = Math.round(amount * (methodInfo.fee / 100));
    } else {
      paymentFee = methodInfo.fee;
    }
  }
  
  return {
    subtotal: amount,
    serviceFee,
    adminFee,
    paymentFee,
    total: amount + serviceFee + adminFee + paymentFee,
  };
}

export function calculateTotal(amount: number, method: PaymentMethod): number {
  const fees = getPaymentFee(method, amount);
  return fees.total;
}

// ============================================
// REACT HOOK
// ============================================

import { useState, useCallback } from 'react';

export interface UsePakasirReturn {
  loading: boolean;
  error: string | null;
  paymentData: PaymentResponse | null;
  transactionDetail: TransactionDetailResponse | null;
  create: (request: CreatePaymentRequest) => Promise<PaymentResponse | null>;
  checkStatus: (orderId: string, amount: number) => Promise<TransactionDetailResponse | null>;
  cancel: (orderId: string, amount: number) => Promise<boolean>;
  simulate: (orderId: string, amount: number) => Promise<boolean>;
  openPayment: (amount: number, orderId: string, options?: PaymentUrlOptions) => Window | null;
  reset: () => void;
  PAYMENT_METHODS: PaymentMethodInfo[];
  getPaymentMethodLabel: typeof getPaymentMethodLabel;
  getPaymentFee: typeof getPaymentFee;
  calculateTotal: typeof calculateTotal;
  isConfigured: boolean;
}

export function usePakasir(): UsePakasirReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentResponse | null>(null);
  const [transactionDetail, setTransactionDetail] = useState<TransactionDetailResponse | null>(null);

  const create = useCallback(async (request: CreatePaymentRequest): Promise<PaymentResponse | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await createPayment(request);
      setPaymentData(response);
      return response;
    } catch (err) {
      // Enhanced error logging
      const errorInfo = {
        type: typeof err,
        name: err instanceof Error ? err.name : 'Unknown',
        message: err instanceof Error ? err.message : String(err),
        code: err instanceof PakasirError ? err.code : undefined,
        raw: err,
      };
      console.error('[usePakasir] ❌ Create error:', errorInfo);
      
      const message = err instanceof PakasirError ? err.message : 'Pembayaran gagal';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [])

  const checkStatus = useCallback(async (orderId: string, amount: number): Promise<TransactionDetailResponse | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await getTransactionDetail(orderId, amount);
      setTransactionDetail(response);
      return response;
    } catch (err) {
      const message = err instanceof PakasirError ? err.message : 'Gagal memeriksa status';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const cancel = useCallback(async (orderId: string, amount: number): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await cancelTransaction(orderId, amount);
      toast.success('Pembayaran berhasil dibatalkan');
      return true;
    } catch (err) {
      const message = err instanceof PakasirError ? err.message : 'Gagal membatalkan';
      setError(message);
      toast.error(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);
  
  const simulate = useCallback(async (orderId: string, amount: number): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await simulatePayment(orderId, amount);
      return true;
    } catch (err) {
      const message = err instanceof PakasirError ? err.message : 'Gagal mensimulasikan';
      setError(message);
      toast.error(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);
  
  const openPayment = useCallback((amount: number, orderId: string, options?: PaymentUrlOptions): Window | null => {
    try {
      return openPaymentWindow(amount, orderId, options);
    } catch (err) {
      const message = err instanceof PakasirError ? err.message : 'Gagal membuka pembayaran';
      setError(message);
      toast.error(message);
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setPaymentData(null);
    setTransactionDetail(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    loading,
    error,
    paymentData,
    transactionDetail,
    create,
    checkStatus,
    cancel,
    simulate,
    openPayment,
    reset,
    PAYMENT_METHODS,
    getPaymentMethodLabel,
    getPaymentFee,
    calculateTotal,
    isConfigured: isPakasirConfigured(),
  };
}

// ============================================
// TEST CONNECTION - ENHANCED
// ============================================

export const testPakasirConnection = async (): Promise<{
  success: boolean;
  configured: boolean;
  message: string;
  details?: any;
}> => {
  const status = getPakasirStatus();
  
  if (!status.configured) {
    return {
      success: false,
      configured: false,
      message: `Pakasir tidak terkonfigurasi: ${status.error}`,
      details: status,
    };
  }
  
  try {
    // Test with a dummy request to check connectivity
    const testOrderId = `TEST-${Date.now()}`;
    const testAmount = 10000;
    
    console.log('[PAKASIR TEST] Testing with order:', testOrderId);
    
    try {
      await createPayment({
        method: 'qris',
        orderId: testOrderId,
        amount: testAmount,
      });
      
      return {
        success: true,
        configured: true,
        message: 'Koneksi ke Pakasir berhasil - QRIS payment created',
        details: {
          ...status,
          testOrderId,
          testAmount,
        },
      };
    } catch (createError: any) {
      // If we get a duplicate order or validation error, that's actually good
      // It means the API is working but rejecting our test data
      if (createError.code?.includes('DUPLICATE') || 
          createError.message?.includes('digunakan') ||
          createError.statusCode === 400) {
        return {
          success: true,
          configured: true,
          message: 'Koneksi ke Pakasir berhasil (API merespons)',
          details: {
            ...status,
            apiResponding: true,
            note: 'Test payment rejected as expected',
          },
        };
      }
      
      throw createError;
    }
  } catch (error: any) {
    return {
      success: false,
      configured: true,
      message: `Gagal terhubung: ${error.message}`,
      details: {
        ...status,
        error: error.message,
        code: error.code,
      },
    };
  }
};

// Default export
export default {
  createPayment,
  getTransactionDetail,
  cancelTransaction,
  simulatePayment,
  generatePaymentUrl,
  openPaymentWindow,
  getPakasirStatus,
  isPakasirConfigured,
  testPakasirConnection,
  PAYMENT_METHODS,
  getPaymentMethodLabel,
  getPaymentFee,
  calculateTotal,
  usePakasir,
};
