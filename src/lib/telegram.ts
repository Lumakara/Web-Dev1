/**
 * Telegram notification stub.
 *
 * ARCHITECTURE NOTE: Telegram Bot Token is a server-side secret and MUST NOT
 * be bundled into the frontend. Notifications are sent via a Supabase Edge
 * Function (or backend worker) that reads TELEGRAM_BOT_TOKEN from server env.
 *
 * This module is a no-op shim so existing callers (useSupport, admin-auth,
 * SupportSection) compile and run without error. All methods log a warning
 * and do nothing — actual delivery happens server-side when the ticket is
 * persisted or the admin login event is recorded in Supabase.
 *
 * ponytail: no-op stub; wire to /functions/v1/notify-telegram when server-side
 * notification edge function is created.
 */

export interface TicketNotification {
  ticketId: string;
  subject: string;
  category: string;
  email: string;
  description: string;
  timestamp: string;
}

export interface AdminLoginNotification {
  email: string;
  name: string;
  device: string;
  browser: string;
  os: string;
  userAgent: string;
  timestamp: string;
}

export const TelegramBot = {
  sendTicketNotification: async (_data: TicketNotification): Promise<void> => {
    // ponytail: no-op — Telegram token must stay server-side.
    // Wire this to a Supabase Edge Function when ready.
    console.warn('[TelegramBot] sendTicketNotification is a no-op stub. Configure server-side notification.');
  },

  sendAdminLoginNotification: async (_data: AdminLoginNotification): Promise<void> => {
    // ponytail: no-op — Telegram token must stay server-side.
    console.warn('[TelegramBot] sendAdminLoginNotification is a no-op stub. Configure server-side notification.');
  },
};
