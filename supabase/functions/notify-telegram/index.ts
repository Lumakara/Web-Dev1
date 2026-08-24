import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const GROUP_ID = "-1003862129556";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ALLOWED_ORIGINS = [
  "https://lumakara-store.web.id",
  "https://www.lumakara-store.web.id",
  "https://lumakara.com",
  "https://www.lumakara.com",
];

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    "Vary": "Origin",
  };
}

type EventType =
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

interface NotifyPayload {
  event: EventType;
  data: Record<string, unknown>;
}

function formatMessage(event: EventType, data: Record<string, unknown>): string {
  const ts = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
  const fmt = (n: unknown) =>
    typeof n === "number" ? n.toLocaleString("id-ID") : String(n ?? "—");

  const messages: Record<EventType, string> = {
    order_created: `🛒 *ORDER BARU*\n🆔 ${data.order_id}\n👤 ${data.user_email}\n💰 Rp ${fmt(data.total)}\n🕐 ${ts}`,
    payment_success: `✅ *PAYMENT BERHASIL*\n🆔 ${data.order_id}\n💰 Rp ${fmt(data.amount)}\n🏦 ${data.provider}\n🕐 ${ts}`,
    payment_failed: `❌ *PAYMENT GAGAL*\n🆔 ${data.order_id}\n❗ ${data.reason ?? "Unknown"}\n🕐 ${ts}`,
    payment_expired: `⏰ *PAYMENT EXPIRED*\n🆔 ${data.order_id}\n🕐 ${ts}`,
    ticket_created: `🎫 *TIKET BARU*\n📧 ${data.user_email}\n📝 ${data.subject}\n🏷️ ${data.category}\n🕐 ${ts}`,
    ticket_replied: `💬 *TIKET DIBALAS*\n🆔 ${data.ticket_id}\n👤 ${data.user_email}\n🕐 ${ts}`,
    user_registered: `👤 *USER BARU*\n📧 ${data.email}\n🕐 ${ts}`,
    admin_login: `🔐 *ADMIN LOGIN*\n👤 ${data.email}\n🌐 ${data.ip ?? "unknown"}\n🕐 ${ts}`,
    refund_requested: `💸 *REFUND REQUEST*\n🆔 ${data.order_id}\n👤 ${data.user_email}\n📝 ${data.reason}\n💰 Rp ${fmt(data.amount)}\n🕐 ${ts}`,
    low_stock: `⚠️ *STOK MENIPIS*\n📦 ${data.product_name}\n📊 Sisa: ${data.stock}\n🕐 ${ts}`,
  };

  return messages[event] ?? `📌 *${event.toUpperCase()}*\n${JSON.stringify(data)}\n🕐 ${ts}`;
}

serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(origin) });
  }

  // Internal only — service role required
  const auth = req.headers.get("authorization");
  if (!auth || auth !== `Bearer ${SERVICE_ROLE_KEY}`) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: corsHeaders(origin),
    });
  }

  let payload: NotifyPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: corsHeaders(origin),
    });
  }

  const text = formatMessage(payload.event, payload.data);

  // Fire-and-forget — never fail the caller if Telegram is down
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: GROUP_ID,
        text,
        parse_mode: "Markdown",
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("[notify-telegram] Telegram API error:", err);
    }
  } catch (e) {
    console.error("[notify-telegram] fetch failed:", e);
  }

  return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders(origin) });
});
