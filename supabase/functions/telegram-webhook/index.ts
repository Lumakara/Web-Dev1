// Edge Function: Telegram Bot Webhook
// ponytail: single channel broadcast, add room routing when multi-CS needed

import { createClient } from 'jsr:@supabase/supabase-js@2';

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '';
const GROUP_CHAT_ID = Deno.env.get('TELEGRAM_GROUP_CHAT_ID') || '-1003862129556';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const update = await req.json();
    
    // ponytail: hanya handle message.text, skip media/sticker
    if (!update.message?.text) {
      return new Response('OK', { status: 200 });
    }

    const { text, from, chat } = update.message;

    // Hanya terima dari group CS
    if (chat.id.toString() !== GROUP_CHAT_ID) {
      return new Response('Unauthorized chat', { status: 403 });
    }

    // Broadcast pesan CS ke website via Realtime
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await supabase.channel('live-cs').send({
      type: 'broadcast',
      event: 'cs-reply',
      payload: {
        message: text,
        from: from.first_name || 'CS',
        timestamp: new Date().toISOString()
      }
    });

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Internal error', { status: 500 });
  }
});
