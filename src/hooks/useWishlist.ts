import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function useWishlist() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('favorites').eq('user_id', user.uid).single()
      .then(({ data }) => setFavorites(data?.favorites ?? []));
  }, [user]);

  const toggle = async (productId: string) => {
    if (!user) { toast.error('Login untuk menyimpan favorit'); return; }
    const isFav = favorites.includes(productId);
    const next = isFav
      ? favorites.filter(id => id !== productId)
      : [...favorites, productId];
    setFavorites(next);
    await supabase.from('profiles').update({ favorites: next }).eq('user_id', user.uid);
    if (!isFav) toast.success('Ditambahkan ke favorit ❤️');
  };

  return {
    favorites,
    toggle,
    isFavorite: (id: string) => favorites.includes(id),
  };
}
