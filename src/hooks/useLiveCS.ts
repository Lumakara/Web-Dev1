// Hook: Live CS Messages via Supabase Realtime
// ponytail: single channel, add typing indicator when CS activity spikes

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface CSMessage {
  message: string;
  from: string;
  timestamp: string;
}

export function useLiveCS() {
  const [messages, setMessages] = useState<CSMessage[]>([]);
  const [isCSOnline, setIsCSOnline] = useState(false);

  useEffect(() => {
    const channel = supabase.channel('live-cs');

    channel
      .on('broadcast', { event: 'cs-reply' }, (payload) => {
        setMessages((prev) => [...prev, payload.payload as CSMessage]);
        setIsCSOnline(true);
      })
      .subscribe();

    // ponytail: heartbeat check setiap 5 menit, set offline jika tidak ada pesan
    const heartbeat = setInterval(() => {
      if (messages.length > 0) {
        const lastMsg = messages[messages.length - 1];
        const diff = Date.now() - new Date(lastMsg.timestamp).getTime();
        if (diff > 5 * 60 * 1000) setIsCSOnline(false);
      }
    }, 60000);

    return () => {
      channel.unsubscribe();
      clearInterval(heartbeat);
    };
  }, [messages]);

  return { messages, isCSOnline };
}
