import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export interface UserBadge {
  id: string;
  user_id: string;
  badge_type: string;
  earned_at: string;
}

export const BADGE_META: Record<string, { label: string; icon: string; desc: string; color: string }> = {
  first_order:    { label: 'Pembeli Pertama', icon: '🛒', desc: 'Selesaikan order pertamamu', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  loyal_customer: { label: 'Pelanggan Setia', icon: '⭐', desc: '5+ order selesai', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  big_spender:    { label: 'Big Spender', icon: '💎', desc: 'Total belanja Rp 1 juta+', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  reviewer:       { label: 'Reviewer', icon: '📝', desc: '3+ ulasan diberikan', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  early_adopter:  { label: 'Early Adopter', icon: '🚀', desc: 'Bergabung di awal', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  vip:            { label: 'VIP', icon: '👑', desc: 'Total belanja Rp 5 juta+', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
};

export function useBadges() {
  const { user } = useAuth();
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    supabase
      .from('user_badges')
      .select('id, user_id, badge_type, earned_at')
      .eq('user_id', user.uid)
      .then(({ data }) => {
        setBadges(data ?? []);
        setLoading(false);
      });
  }, [user]);

  const getBadgeInfo = (type: string) =>
    BADGE_META[type] ?? { label: type, icon: '🏅', desc: '', color: 'bg-muted text-muted-foreground' };

  return { badges, loading, getBadgeInfo };
}
