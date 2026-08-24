import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useCountdown } from '@/hooks/useCountdown';

interface FlashSale {
  id: string;
  discount_percentage: number;
  ends_at: string;
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-white/20 rounded-lg px-2 py-1 min-w-[36px] text-center">
        <span className="text-lg font-bold tabular-nums">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-xs opacity-75 mt-0.5">{label}</span>
    </div>
  );
}

export function FlashSaleBanner() {
  const [sale, setSale] = useState<FlashSale | null>(null);

  useEffect(() => {
    supabase.from('flash_sales')
      .select('id, discount_percentage, ends_at')
      .gte('ends_at', new Date().toISOString())
      .lte('starts_at', new Date().toISOString())
      .order('ends_at', { ascending: true })
      .limit(1)
      .single()
      .then(({ data }) => setSale(data));
  }, []);

  const timeLeft = useCountdown(sale ? new Date(sale.ends_at) : new Date(0));

  if (!sale || timeLeft.expired) return null;

  return (
    <div className="w-full bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500 text-white px-4 py-3 rounded-xl shadow-lg">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔥</span>
          <div>
            <span className="font-bold text-sm">FLASH SALE</span>
            <div className="text-xs opacity-90">Diskon {sale.discount_percentage}% — Jangan sampai kehabisan!</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs opacity-90 mr-1">Berakhir dalam:</span>
          <div className="flex gap-1">
            <CountdownUnit value={timeLeft.hours} label="JAM" />
            <span className="text-lg font-bold self-center mb-1">:</span>
            <CountdownUnit value={timeLeft.minutes} label="MIN" />
            <span className="text-lg font-bold self-center mb-1">:</span>
            <CountdownUnit value={timeLeft.seconds} label="DET" />
          </div>
        </div>
      </div>
    </div>
  );
}
