/**
 * Payment Hook - Supabase Edge Functions
 * Saweria/ApiNEOXR primary, Rama QRIS fallback
 */

import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface PaymentResult {
  success: boolean;
  payment?: {
    id: string;
    order_id: string;
    provider: 'saweria' | 'rama' | 'mustika';
    payment_method: string;
    provider_transaction_id: string;
    amount: number;
    fee?: number;
    status: string;
    qr_string?: string;
    qr_image?: string;
    qr_url?: string;
    payment_url?: string;
    reference?: string;
    expires_at?: string;
    fallback_reason?: string;
  };
  fallback?: boolean;
  error?: string;
  errorCode?: string;
  requestId?: string;
}

export interface PaymentStatus {
  status: 'pending' | 'paid' | 'failed' | 'expired';
  paidAt?: string;
}

export const usePayment = () => {
  const [isLoading, setIsLoading] = useState(false);

  const createPayment = useCallback(async (
    orderId: string,
    amount: number,
    method: 'qris' = 'qris',
    turnstileToken?: string,
  ): Promise<PaymentResult> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('payment', {
        body: {
          action: 'create',
          orderId,
          amount,
          method,
          ...(turnstileToken ? { turnstileToken } : {}),
        },
      });

      if (error) {
        const response = 'context' in error ? (error as { context?: Response }).context : undefined;
        const payload = response ? await response.clone().json().catch(() => null) : null;
        const safeError = payload?.error;
        return {
          success: false,
          error: typeof safeError?.message === 'string' ? safeError.message : 'Payment service unavailable',
          errorCode: typeof safeError?.code === 'string' ? safeError.code : 'EDGE_FUNCTION_ERROR',
          requestId: typeof safeError?.requestId === 'string' ? safeError.requestId : undefined,
        };
      }
      if (!data.success) {
        const safeError = data.error;
        return {
          success: false,
          error: typeof safeError?.message === 'string' ? safeError.message : 'Payment creation failed',
          errorCode: typeof safeError?.code === 'string' ? safeError.code : 'PAYMENT_ERROR',
          requestId: typeof safeError?.requestId === 'string' ? safeError.requestId : undefined,
        };
      }

      if (data.fallback) {
        toast.warning('Payment menggunakan fallback provider');
      }

      return data;
    } catch {
      const message = 'Payment service unavailable';
      toast.error(message);
      return { success: false, error: message, errorCode: 'PAYMENT_CLIENT_ERROR' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkStatus = useCallback(async (orderId: string): Promise<PaymentStatus | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('payment', {
        body: {
          action: 'status',
          orderId,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error?.message || 'Status check failed');

      return { status: data.status, paidAt: data.paidAt };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Status check failed';
      toast.error('Gagal check status: ' + message);
      return null;
    }
  }, []);

  return {
    createPayment,
    checkStatus,
    isLoading,
  };
};
