// Shared helper: fire-and-forget Telegram notification
// Import ini di Edge Function lain untuk kirim notif tanpa blocking main flow

export type TelegramEvent =
  | "order_created"
  | "payment_success"
  | "payment_failed"
  | "payment_expired"
  | "ticket_created"
  | "ticket_replied"
  | "user_registered"
  | "admin_login"
  | "refund_requested"
  | "low_stock";

export async function notifyTelegram(
  event: TelegramEvent,
  data: Record<string, unknown>
): Promise<void> {
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!serviceRole || !supabaseUrl) return;

  // fire-and-forget — jangan fail payment karena notif gagal
  fetch(`${supabaseUrl}/functions/v1/notify-telegram`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceRole}`,
    },
    body: JSON.stringify({ event, data }),
  }).catch(() => {});
}
