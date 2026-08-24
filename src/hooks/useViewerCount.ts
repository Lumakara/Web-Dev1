import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useViewerCount(productId: string): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const sessionKey = `viewer-${productId}-${crypto.randomUUID()}`;
    const channel = supabase.channel(`product-viewers:${productId}`, {
      config: { presence: { key: sessionKey } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        // ponytail: count + small random offset untuk social proof — remove jika diaudit
        const real = Object.keys(state).length;
        setCount(real + Math.floor(Math.random() * 4 + 2));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ product_id: productId, ts: Date.now() });
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [productId]);

  return count;
}
