import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface ProductReview {
  id: string;
  product_id: string;
  user_id: string | null;
  display_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export function useReviews(productId: string) {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('product_reviews')
      .select('*')
      .eq('product_id', productId)
      .eq('is_visible', true)
      .order('created_at', { ascending: false })
      .limit(50);
    setReviews(data ?? []);
    setLoading(false);
  }, [productId]);

  const submitReview = async (
    rating: number,
    comment: string,
    displayName: string,
  ) => {
    // ip_hash: pakai fingerprint sederhana dari timestamp+random (client-side approximation)
    // ponytail: bukan IP asli — server-side IP hash via Edge Fn jika abuse muncul
    const ipHash = btoa(`${navigator.userAgent}-${new Date().toDateString()}`).slice(0, 32);

    const { error } = await supabase.from('product_reviews').insert({
      product_id: productId,
      display_name: displayName || 'Pengguna Anonim',
      rating,
      comment: comment || null,
      ip_hash: ipHash,
    });

    if (error) {
      if (error.code === '23505') {
        toast.error('Kamu sudah memberikan ulasan untuk produk ini hari ini');
      } else {
        toast.error('Gagal mengirim ulasan');
      }
      return false;
    }

    toast.success('Terima kasih atas ulasanmu! ⭐');
    await fetchReviews();
    return true;
  };

  return { reviews, loading, fetchReviews, submitReview };
}
