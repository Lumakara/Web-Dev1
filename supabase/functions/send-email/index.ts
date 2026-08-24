import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = "Lumakara Store <lum4kar4@gmail.com>";

type EmailType = "payment_success" | "password_reset";

interface EmailPayload {
  type: EmailType;
  to: string;
  data: Record<string, unknown>;
}

serve(async (req) => {
  // Internal only — service role required
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (req.headers.get("authorization") !== `Bearer ${serviceRole}`) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: EmailPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { type, to, data } = payload;

  let subject = "";
  let html = "";

  if (type === "payment_success") {
    subject = `✅ Pembayaran Berhasil — Order #${data.order_id}`;
    html = paymentSuccessHtml(data);
  } else if (type === "password_reset") {
    subject = "🔑 Reset Password Lumakara Store";
    html = passwordResetHtml(data);
  } else {
    return new Response(JSON.stringify({ error: "unknown_type" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Resend error:", err);
    return new Response(JSON.stringify({ error: "send_failed", detail: err }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});

function fmtRp(n: unknown): string {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}

function paymentSuccessHtml(d: Record<string, unknown>): string {
  return `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a0a;color:#e0e0e0;padding:32px 16px}
  .wrap{max-width:480px;margin:0 auto;background:#141414;border-radius:20px;overflow:hidden;border:1px solid #242424}
  .header{background:linear-gradient(135deg,#1a1a2e,#16213e);padding:32px;text-align:center}
  .logo{font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;margin-bottom:16px}
  .badge{display:inline-flex;align-items:center;gap:8px;background:#052e16;color:#4ade80;border:1px solid #166534;border-radius:100px;padding:8px 18px;font-size:13px;font-weight:600}
  .body{padding:32px}
  h1{font-size:20px;font-weight:700;color:#fff;margin-bottom:8px}
  p{color:#888;font-size:14px;line-height:1.7;margin-bottom:20px}
  .card{background:#0d0d0d;border:1px solid #1f1f1f;border-radius:14px;padding:20px;margin:20px 0}
  .row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #1a1a1a;font-size:14px}
  .row:last-child{border:none;font-weight:700;color:#fff;font-size:15px}
  .label{color:#555}
  .cta{display:block;background:#4f46e5;color:#fff;text-decoration:none;text-align:center;padding:14px 24px;border-radius:12px;font-weight:600;font-size:14px;margin-top:8px}
  .footer{padding:20px 32px;border-top:1px solid #1a1a1a;font-size:11px;color:#444;text-align:center}
  a{color:#818cf8}
</style></head><body>
<div class="wrap">
  <div class="header">
    <div class="logo">✦ Lumakara</div>
    <div class="badge">✅ Pembayaran Berhasil</div>
  </div>
  <div class="body">
    <h1>Terima kasih atas pesananmu! 🎉</h1>
    <p>Pembayaranmu telah kami terima dan sedang diproses. Kamu akan mendapat notifikasi saat pesanan selesai.</p>
    <div class="card">
      <div class="row"><span class="label">Order ID</span><span>#${d.order_id}</span></div>
      <div class="row"><span class="label">Metode</span><span>QRIS</span></div>
      <div class="row"><span class="label">Status</span><span style="color:#4ade80">✓ Dibayar</span></div>
      <div class="row"><span class="label">Total</span><span>${fmtRp(d.total)}</span></div>
    </div>
    <a href="https://lumakara-store.web.id/profile" class="cta">Lihat Status Order →</a>
    <p style="margin-top:20px;font-size:13px">Ada pertanyaan? <a href="https://lumakara-store.web.id/support">Hubungi support kami</a></p>
  </div>
  <div class="footer">© 2026 Lumakara Store · Email ini dikirim ke ${d.user_email}</div>
</div></body></html>`;
}

function passwordResetHtml(d: Record<string, unknown>): string {
  return `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a0a;color:#e0e0e0;padding:32px 16px}
  .wrap{max-width:440px;margin:0 auto;background:#141414;border-radius:20px;overflow:hidden;border:1px solid #242424}
  .header{background:linear-gradient(135deg,#1a1a2e,#16213e);padding:32px;text-align:center}
  .logo{font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px}
  .body{padding:32px}
  h1{font-size:20px;font-weight:700;color:#fff;margin-bottom:10px}
  p{color:#888;font-size:14px;line-height:1.7;margin-bottom:20px}
  .cta{display:block;background:#4f46e5;color:#fff;text-decoration:none;text-align:center;padding:16px 24px;border-radius:12px;font-weight:600;font-size:15px}
  .warn{background:#1a1200;border:1px solid #854d0e;border-radius:10px;padding:14px;font-size:12px;color:#a16207;margin-top:16px;line-height:1.6}
  .footer{padding:20px 32px;border-top:1px solid #1a1a1a;font-size:11px;color:#444;text-align:center}
</style></head><body>
<div class="wrap">
  <div class="header"><div class="logo">✦ Lumakara</div></div>
  <div class="body">
    <h1>Reset Password</h1>
    <p>Kami menerima permintaan reset password untuk akun ini. Klik tombol di bawah untuk melanjutkan.</p>
    <a href="${d.reset_url}" class="cta">Reset Password →</a>
    <div class="warn">⏱ Link ini berlaku <strong>1 jam</strong>. Jika kamu tidak meminta reset password, abaikan email ini — akunmu tetap aman.</div>
  </div>
  <div class="footer">© 2026 Lumakara Store</div>
</div></body></html>`;
}
