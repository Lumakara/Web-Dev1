/**
 * PAYMENT HOOK - ULTRA FUNCTIONAL VERSION
 * Complete payment flow with Pakasir integration
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  createPayment, 
  getTransactionDetail, 
  cancelTransaction,
  simulatePayment,
  calculateTotal,
  getPaymentFee,
  type PaymentMethod,
  type PaymentResponse,
  type TransactionDetailResponse,
  type PaymentUrlOptions,
  openPaymentWindow,
  isPakasirConfigured,
  getPakasirStatus,
} from '@/lib/pakasir';
import { OrderService } from '@/lib/firebase-db';
import { TelegramBot } from '@/lib/telegram';
import { useAppStore } from '@/store/appStore';
import { toast } from 'sonner';
import { showErrorBox } from '@/lib/error-tracker';

// ============================================
// TYPES
// ============================================

export interface UsePaymentOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  onStatusChange?: (status: PaymentStatus) => void;
  autoCheckInterval?: number; // ms, default 10000 (10s)
}

export type PaymentStatus = 'idle' | 'creating' | 'pending' | 'completed' | 'expired' | 'cancelled' | 'error';

export interface PaymentState {
  status: PaymentStatus;
  isProcessing: boolean;
  error: string | null;
  paymentData: PaymentResponse | null;
  transactionDetail: TransactionDetailResponse | null;
  countdown: number;
  orderId: string | null;
}

// ============================================
// MAIN HOOK
// ============================================

export const usePayment = (options: UsePaymentOptions = {}) => {
  const { user, profile, getSelectedItems } = useAppStore();
  
  // State
  const [state, setState] = useState<PaymentState>({
    status: 'idle',
    isProcessing: false,
    error: null,
    paymentData: null,
    transactionDetail: null,
    countdown: 1800, // 30 minutes
    orderId: null,
  });
  
  // Refs for interval management
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const popupRef = useRef<Window | null>(null);

  // ============================================
  // CLEANUP
  // ============================================
  
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (statusCheckRef.current) clearInterval(statusCheckRef.current);
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
    };
  }, []);

  // ============================================
  // HELPERS
  // ============================================
  
  const updateState = useCallback((updates: Partial<PaymentState>) => {
    setState(prev => {
      const newState = { ...prev, ...updates };
      if (updates.status && updates.status !== prev.status) {
        options.onStatusChange?.(updates.status);
      }
      return newState;
    });
  }, [options]);

  const calculateCartTotal = useCallback((): number => {
    const selectedItems = getSelectedItems();
    return selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [getSelectedItems]);

  const formatCountdown = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const formatRupiah = useCallback((amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  }, []);

  // ============================================
  // COUNTDOWN TIMER
  // ============================================
  
  const startCountdown = useCallback((duration: number = 1800) => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    
    updateState({ countdown: duration });
    
    // Use ref to track remaining time to avoid stale closure
    let remaining = duration;
    
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      
      if (remaining <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        setState(prev => ({ ...prev, countdown: 0, status: 'expired' }));
      } else {
        setState(prev => ({ ...prev, countdown: remaining }));
      }
    }, 1000);
  }, [updateState]);

  const stopCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  // ============================================
  // STATUS CHECKING
  // ============================================
  
  const startStatusChecking = useCallback((orderId: string, amount: number) => {
    if (statusCheckRef.current) clearInterval(statusCheckRef.current);
    
    const checkInterval = options.autoCheckInterval || 10000;
    
    statusCheckRef.current = setInterval(async () => {
      try {
        const detail = await getTransactionDetail(orderId, amount);
        
        if (detail.transaction.status === 'completed') {
          updateState({ 
            status: 'completed', 
            transactionDetail: detail,
            isProcessing: false,
          });
          stopCountdown();
          if (statusCheckRef.current) clearInterval(statusCheckRef.current);
          toast.success('Pembayaran berhasil! 🎉');
          options.onSuccess?.();
        } else if (detail.transaction.status === 'cancelled') {
          updateState({ 
            status: 'cancelled', 
            transactionDetail: detail,
            isProcessing: false,
          });
          stopCountdown();
          if (statusCheckRef.current) clearInterval(statusCheckRef.current);
        } else if (detail.transaction.status === 'expired') {
          updateState({ 
            status: 'expired', 
            transactionDetail: detail,
            isProcessing: false,
          });
          stopCountdown();
          if (statusCheckRef.current) clearInterval(statusCheckRef.current);
        }
      } catch (error) {
        showErrorBox('💥 STATUS CHECK ERROR', {
          'Error': error instanceof Error ? error.message : 'Unknown',
        }, 'error');
      }
    }, checkInterval);
  }, [options, updateState, stopCountdown]);

  // ============================================
  // MAIN ACTIONS
  // ============================================

  /**
   * Create payment using API method - QRIS Only
   */
  const create = useCallback(async (method: PaymentMethod = 'qris'): Promise<PaymentResponse | null> => {
    // Validate Pakasir configuration
    if (!isPakasirConfigured()) {
      const status = getPakasirStatus();
      const errorMsg = status.error || 'Pakasir tidak terkonfigurasi';
      updateState({ error: errorMsg, status: 'error' });
      toast.error(errorMsg);
      return null;
    }
    
    // Validate cart
    const selectedItems = getSelectedItems();
    if (selectedItems.length === 0) {
      const errorMsg = 'Keranjang belanja kosong';
      updateState({ error: errorMsg, status: 'error' });
      toast.error(errorMsg);
      return null;
    }

    updateState({ isProcessing: true, status: 'creating', error: null });
    
    try {
      const subtotal = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      
      console.log('[PAYMENT] Creating payment...', { orderId, method, amount: subtotal });
      
      const response = await createPayment({
        method,
        orderId,
        amount: subtotal,
        customerName: profile?.full_name || user?.displayName || 'Guest',
        customerEmail: profile?.email || user?.email || '',
        description: `Pembelian ${selectedItems.length} item`,
      });

      // Update state with payment data
      updateState({
        paymentData: response,
        status: 'pending',
        orderId,
        isProcessing: false,
      });

      // Start countdown
      startCountdown();
      
      // Start status checking
      startStatusChecking(orderId, subtotal);

      // Create order in Firebase
      try {
        const order = await OrderService.create({
          user_id: user?.uid || 'guest',
          items: selectedItems.map(item => ({
            product_id: item.productId,
            title: item.title,
            tier: item.tier,
            price: item.price,
            quantity: item.quantity,
            image: item.image,
          })),
          total_amount: subtotal,
          status: 'pending',
          payment_method: method,
          payment_reference: orderId,
        });

        // Send Telegram notification
        try {
          await TelegramBot.sendCheckoutNotification({
            user: {
              id: user?.uid || 'guest',
              email: user?.email || 'guest@example.com',
              name: user?.displayName || 'Guest',
            },
            items: selectedItems.map(item => ({
              id: item.productId,
              title: item.title,
              tier: item.tier,
              quantity: item.quantity,
              price: item.price,
              image: item.image,
            })),
            totalAmount: subtotal,
            subtotal: subtotal,
          });
        } catch (telegramError) {
          console.error('Telegram notification failed:', telegramError);
        }

        console.log('[PAYMENT] ✅ Order created:', order.id);
      } catch (orderError) {
        console.error('[PAYMENT] ❌ Order creation failed:', orderError);
        // Continue even if order creation fails
      }

      toast.success('Pembayaran dibuat! Silakan selesaikan pembayaran Anda.');
      return response;
      
    } catch (error: any) {
      // Ultra error logging
      showErrorBox('💥 PAYMENT CREATE ERROR', {
        'Error': error?.message || 'Unknown',
        'Type': error?.name || 'Unknown',
        'Code': error?.code || 'N/A',
      }, 'error');
      
      const errorMsg = error?.message || 'Gagal membuat pembayaran';
      updateState({ 
        error: errorMsg, 
        status: 'error',
        isProcessing: false,
      });
      toast.error(errorMsg);
      options.onError?.(error);
      return null;
    }
  }, [user, profile, getSelectedItems, updateState, startCountdown, startStatusChecking, options]);

  /**
   * Create payment using redirect method (opens popup)
   */
  const createWithRedirect = useCallback((method: PaymentMethod = 'qris', redirectOptions?: PaymentUrlOptions): boolean => {
    // Validate Pakasir configuration
    if (!isPakasirConfigured()) {
      const status = getPakasirStatus();
      toast.error(status.error || 'Pakasir tidak terkonfigurasi');
      return false;
    }
    
    // Validate cart
    const selectedItems = getSelectedItems();
    if (selectedItems.length === 0) {
      toast.error('Keranjang belanja kosong');
      return false;
    }

    try {
      const subtotal = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      
      console.log('[PAYMENT] Opening payment window...', { orderId, amount: subtotal });
      
      // QRIS only - simplified options
      const popup = openPaymentWindow(subtotal, orderId, redirectOptions);
      
      if (popup) {
        popupRef.current = popup;
        updateState({
          status: 'pending',
          orderId,
          isProcessing: true,
        });
        
        // Start countdown
        startCountdown();
        
        // Monitor popup
        const checkPopup = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkPopup);
            updateState({ isProcessing: false });
            // Check status after popup closes
            checkStatus(orderId, subtotal);
          }
        }, 1000);
        
        // Create order in background
        OrderService.create({
          user_id: user?.uid || 'guest',
          items: selectedItems.map(item => ({
            product_id: item.productId,
            title: item.title,
            tier: item.tier,
            price: item.price,
            quantity: item.quantity,
            image: item.image,
          })),
          total_amount: subtotal,
          status: 'pending',
          payment_method: method,
          payment_reference: orderId,
        }).catch(err => console.error('Order creation failed:', err));
        
        return true;
      }
      
      return false;
    } catch (error: any) {
      showErrorBox('💥 PAYMENT REDIRECT ERROR', {
        'Error': error?.message || 'Unknown',
      }, 'error');
      toast.error(error.message || 'Gagal membuka pembayaran');
      return false;
    }
  }, [user, getSelectedItems, updateState, startCountdown]);

  /**
   * Check payment status manually
   */
  const checkStatus = useCallback(async (orderId?: string, amount?: number): Promise<TransactionDetailResponse | null> => {
    const targetOrderId = orderId || state.orderId;
    const targetAmount = amount || state.paymentData?.payment.amount;
    
    if (!targetOrderId || !targetAmount) {
      toast.error('Data pembayaran tidak ditemukan');
      return null;
    }
    
    updateState({ isProcessing: true });
    
    try {
      const detail = await getTransactionDetail(targetOrderId, targetAmount);
      
      updateState({
        transactionDetail: detail,
        isProcessing: false,
      });
      
      if (detail.transaction.status === 'completed') {
        updateState({ status: 'completed' });
        stopCountdown();
        toast.success('Pembayaran berhasil! 🎉');
        
        // Update order status in Firebase
        if (state.orderId) {
          OrderService.updatePayment(state.orderId, targetOrderId, 'paid')
            .catch(err => console.error('Update order failed:', err));
        }
        
        options.onSuccess?.();
      } else if (detail.transaction.status === 'pending') {
        toast.info('Pembayaran masih menunggu');
      } else if (detail.transaction.status === 'cancelled') {
        updateState({ status: 'cancelled' });
        stopCountdown();
        toast.info('Pembayaran dibatalkan');
      } else if (detail.transaction.status === 'expired') {
        updateState({ status: 'expired' });
        stopCountdown();
        toast.info('Pembayaran kadaluarsa');
      }
      
      return detail;
    } catch (error: any) {
      showErrorBox('💥 CHECK STATUS ERROR', {
        'Error': error?.message || 'Unknown',
      }, 'error');
      updateState({ 
        error: error.message,
        isProcessing: false,
      });
      return null;
    }
  }, [state.orderId, state.paymentData, updateState, stopCountdown, options]);

  /**
   * Cancel payment
   */
  const cancel = useCallback(async (): Promise<boolean> => {
    if (!state.paymentData || !state.orderId) {
      toast.error('Tidak ada pembayaran aktif');
      return false;
    }
    
    updateState({ isProcessing: true });
    
    try {
      const amount = state.paymentData.payment.amount;
      const orderId = state.orderId;
      
      await cancelTransaction(orderId, amount);
      
      updateState({ 
        status: 'cancelled',
        isProcessing: false,
      });
      
      stopCountdown();
      if (statusCheckRef.current) clearInterval(statusCheckRef.current);
      
      toast.success('Pembayaran dibatalkan');
      return true;
    } catch (error: any) {
      showErrorBox('💥 CANCEL PAYMENT ERROR', {
        'Error': error?.message || 'Unknown',
      }, 'error');
      updateState({ 
        error: error.message,
        isProcessing: false,
      });
      toast.error(error.message || 'Gagal membatalkan pembayaran');
      return false;
    }
  }, [state.paymentData, state.orderId, updateState, stopCountdown]);

  /**
   * Simulate payment (sandbox only)
   */
  const simulate = useCallback(async (): Promise<boolean> => {
    if (!state.paymentData || !state.orderId) {
      toast.error('Tidak ada pembayaran aktif');
      return false;
    }
    
    updateState({ isProcessing: true });
    
    try {
      const amount = state.paymentData.payment.amount;
      const orderId = state.orderId;
      
      await simulatePayment(orderId, amount);
      
      // Check status to get updated data
      await checkStatus();
      
      updateState({ isProcessing: false });
      return true;
    } catch (error: any) {
      showErrorBox('💥 SIMULATE ERROR', {
        'Error': error?.message || 'Unknown',
      }, 'error');
      updateState({ 
        error: error.message,
        isProcessing: false,
      });
      toast.error(error.message || 'Gagal mensimulasikan pembayaran');
      return false;
    }
  }, [state.paymentData, state.orderId, checkStatus, updateState]);

  /**
   * Reset payment state
   */
  const reset = useCallback(() => {
    stopCountdown();
    if (statusCheckRef.current) clearInterval(statusCheckRef.current);
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
    }
    
    setState({
      status: 'idle',
      isProcessing: false,
      error: null,
      paymentData: null,
      transactionDetail: null,
      countdown: 1800,
      orderId: null,
    });
  }, [stopCountdown]);

  // ============================================
  // DERIVED VALUES
  // ============================================
  
  const getCartTotal = useCallback((): number => {
    return calculateCartTotal();
  }, [calculateCartTotal]);

  const getTotalWithFee = useCallback((method: PaymentMethod = 'qris'): number => {
    const subtotal = calculateCartTotal();
    return calculateTotal(subtotal, method);
  }, [calculateCartTotal]);

  const getFeeBreakdown = useCallback((method: PaymentMethod = 'qris') => {
    const subtotal = calculateCartTotal();
    return getPaymentFee(method, subtotal);
  }, [calculateCartTotal]);

  // ============================================
  // RETURN
  // ============================================
  
  return {
    // State
    ...state,
    formattedCountdown: formatCountdown(state.countdown),
    
    // Status helpers
    isIdle: state.status === 'idle',
    isCreating: state.status === 'creating',
    isPending: state.status === 'pending',
    isCompleted: state.status === 'completed',
    isExpired: state.status === 'expired',
    isCancelled: state.status === 'cancelled',
    hasError: state.status === 'error',
    isConfigured: isPakasirConfigured(),
    
    // Actions
    create,
    createWithRedirect,
    checkStatus,
    cancel,
    simulate,
    reset,
    
    // Utilities
    formatRupiah,
    getCartTotal,
    getTotalWithFee,
    getFeeBreakdown,
    calculateTotal,
    getPaymentFee,
  };
};

export default usePayment;
