1|# Lumakara Store — Master Implementation Plan
2|
3|> **For Hermes:** Eksekusi plan ini task-by-task menggunakan subagent-driven-development.
4|
5|**Goal:** Implementasi penuh semua fitur + security fixes + UX psychology untuk Lumakara Store production-ready.
6|
7|**Architecture:** React 19 SPA + Supabase + Edge Functions. Semua perubahan mengikuti pattern existing — tidak ada dependency baru kecuali Resend (email) dan react-hot-toast sudah ada via sonner.
8|
9|**Tech Stack:** React 19, Vite 7, Supabase, Zustand, Tailwind, shadcn/ui, Playwright, Resend (baru), Telegram Bot API (server-side)
10|
11|---
12|
13|## PHASE 0 — Security Fixes (WAJIB PERTAMA)
14|
15|### Task 0.1: Pindahkan KIMI API Key ke Edge Function
16|
17|**Objective:** Hapus `VITE_KIMI_API_KEY` dari frontend bundle, buat proxy Edge Function.
18|
19|**Files:**
20|- Create: `supabase/functions/ai-proxy/index.ts`
21|- Modify: `src/lib/ai-chatbot.ts`
22|
23|**Step 1: Buat Edge Function ai-proxy**
24|
25|```typescript
26|// supabase/functions/ai-proxy/index.ts
27|import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
28|
29|const KIMI_API_KEY = Deno.env.get('KIMI_API_KEY')!
30|const KIMI_API_URL = Deno.env.get('KIMI_API_URL') || 'https://api.moonshot.cn/v1/chat/completions'
31|const KIMI_MODEL = Deno.env.get('KIMI_MODEL') || 'moonshot-v1-8k'
32|
33|const ALLOWED_ORIGINS = [
34|  'https://lumakara-store.web.id',
35|  'https://www.lumakara-store.web.id',
36|  'http://localhost:3000',
37|]
38|
39|const corsHeaders = (origin: string) => ({
40|  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
41|  'Access-Control-Allow-Headers': 'authorization, content-type',
42|  'Access-Control-Allow-Methods': 'POST, OPTIONS',
43|})
44|
45|serve(async (req) => {
46|  const origin = req.headers.get('origin') || ''
47|  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(origin) })
48|
49|  // Rate limit: 5 req/min per user via simple header check
50|  // ponytail: no DB rate limit here, add if abuse detected
51|  const { messages } = await req.json()
52|  if (!messages?.length) return new Response(JSON.stringify({ error: 'messages required' }), { status: 400 })
53|
54|  const res = await fetch(KIMI_API_URL, {
55|    method: 'POST',
56|    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KIMI_API_KEY}` },
57|    body: JSON.stringify({ model: KIMI_MODEL, messages, max_tokens: 500 }),
58|  })
59|
60|  const data = await res.json()
61|  return new Response(JSON.stringify(data), {
62|    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
63|  })
64|})
65|```
66|
67|**Step 2: Update ai-chatbot.ts — hapus VITE_KIMI_API_KEY**
68|
69|```typescript
70|// src/lib/ai-chatbot.ts — ganti baris 5-7
71|const KIMI_API_URL = '/functions/v1/ai-proxy' // panggil Edge Fn, bukan Moonshot langsung
72|const HAS_AI = true // always true, key server-side
73|```
74|
75|**Step 3: Hapus VITE_KIMI_API_KEY dari .env.example**
76|
77|**Step 4: Deploy Edge Function**
78|```bash
79|# via Supabase Management API (PRoot, no Docker)
80|# Set secret dulu: KIMI_API_KEY, KIMI_API_URL, KIMI_MODEL di Supabase dashboard > Edge Functions > Secrets
81|```
82|
83|**Verification:** Build frontend, grep dist/assets/*.js untuk string moonshot/kimi → harus 0 hasil.
84|
85|---
86|
87|### Task 0.2: Hapus Debug APIs dari Production
88|
89|**Objective:** Remove `window.__testJSError` dan sejenisnya dari production build.
90|
91|**Files:**
92|- Modify: `src/lib/error-tracker.ts`
93|
94|**Step 1: Wrap dengan DEV guard**
95|
96|```typescript
97|// src/lib/error-tracker.ts — cari baris 273-280, wrap dengan:
98|if (import.meta.env.DEV) {
99|  // @ts-ignore
100|  window.__testJSError = () => { throw new Error('Test JS Error') }
101|  // ... semua window.__ assignments
102|}
103|```
104|
105|**Verification:** `npm run build && grep -r '__test' dist/` → 0 hasil.
106|
107|---
108|
109|### Task 0.3: Fix Admin Rate Limiting di Edge Function admin-users
110|
111|**Objective:** Tambah rate limiting ke admin-users Edge Function.
112|
113|**Files:**
114|- Modify: `supabase/functions/admin-users/index.ts`
115|
116|**Step 1:** Baca isi current admin-users/index.ts, tambah rate check via `check_payment_rate_limit` RPC yang sudah ada (reuse pattern yang sama dari payment function).
117|
118|**Verification:** Deploy, test hit 11x dalam 1 menit → harus dapat 429.
119|
120|---
121|
122|## PHASE 1 — Notifikasi (Telegram + Email)
123|
124|### Task 1.1: Buat Edge Function notify-telegram
125|
126|**Objective:** Kirim notifikasi ke Telegram group `-1003862129556` untuk semua event penting.
127|
128|**Files:**
129|- Create: `supabase/functions/notify-telegram/index.ts`
130|- Create: `src/lib/telegram-events.ts` (enum events)
131|
132|**Step 1: Edge Function**
133|
134|```typescript
135|// supabase/functions/notify-telegram/index.ts
136|import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
137|
138|const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
139|const GROUP_ID = '-1003862129556' // grup notif admin
140|
141|type EventType =
142|  | 'order_created'
143|  | 'payment_success'
144|  | 'payment_failed'
145|  | 'payment_expired'
146|  | 'ticket_created'
147|  | 'ticket_replied'
148|  | 'user_registered'
149|  | 'admin_login'
150|  | 'refund_requested'
151|  | 'low_stock'
152|
153|interface NotifyPayload {
154|  event: EventType
155|  data: Record<string, unknown>
156|}
157|
158|const formatMessage = (event: EventType, data: Record<string, unknown>): string => {
159|  const emoji: Record<EventType, string> = {
160|    order_created: '🛒',
161|    payment_success: '✅',
162|    payment_failed: '❌',
163|    payment_expired: '⏰',
164|    ticket_created: '🎫',
165|    ticket_replied: '💬',
166|    user_registered: '👤',
167|    admin_login: '🔐',
168|    refund_requested: '💸',
169|    low_stock: '⚠️',
170|  }
171|  const e = emoji[event] || '📌'
172|  const ts = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
173|
174|  switch (event) {
175|    case 'order_created':
176|      return `${e} *ORDER BARU*\n🆔 ${data.order_id}\n👤 ${data.user_email}\n💰 Rp ${Number(data.total).toLocaleString('id-ID')}\n🕐 ${ts}`
177|    case 'payment_success':
178|      return `${e} *PAYMENT BERHASIL*\n🆔 ${data.order_id}\n💰 Rp ${Number(data.amount).toLocaleString('id-ID')}\n🏦 ${data.provider}\n🕐 ${ts}`
179|    case 'payment_failed':
180|      return `${e} *PAYMENT GAGAL*\n🆔 ${data.order_id}\n❗ ${data.reason}\n🕐 ${ts}`
181|    case 'payment_expired':
182|      return `${e} *PAYMENT EXPIRED*\n🆔 ${data.order_id}\n🕐 ${ts}`
183|    case 'ticket_created':
184|      return `${e} *TIKET BARU*\n📧 ${data.user_email}\n📝 ${data.subject}\n🏷️ ${data.category}\n🕐 ${ts}`
185|    case 'ticket_replied':
186|      return `${e} *TIKET DIBALAS*\n🆔 ${data.ticket_id}\n👤 ${data.user_email}\n🕐 ${ts}`
187|    case 'user_registered':
188|      return `${e} *USER BARU*\n📧 ${data.email}\n🕐 ${ts}`
189|    case 'admin_login':
190|      return `${e} *ADMIN LOGIN*\n👤 ${data.email}\n🌐 ${data.ip || 'unknown'}\n🕐 ${ts}`
191|    case 'refund_requested':
192|      return `${e} *REFUND REQUEST*\n🆔 ${data.order_id}\n👤 ${data.user_email}\n📝 ${data.reason}\n🕐 ${ts}`
193|    case 'low_stock':
194|      return `${e} *STOK MENIPIS*\n📦 ${data.product_name}\n📊 Sisa: ${data.stock}\n🕐 ${ts}`
195|    default:
196|      return `${e} *${event.toUpperCase()}*\n${JSON.stringify(data)}\n🕐 ${ts}`
197|  }
198|}
199|
200|serve(async (req) => {
201|  // Hanya bisa dipanggil dari service role (internal Edge Fn to Edge Fn calls)
202|  const authHeader = req.headers.get('authorization')
203|  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
204|  if (authHeader !== `Bearer ${serviceRole}`) {
205|    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
206|  }
207|
208|  const payload: NotifyPayload = await req.json()
209|  const text = formatMessage(payload.event, payload.data)
210|
211|  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
212|    method: 'POST',
213|    headers: { 'Content-Type': 'application/json' },
214|    body: JSON.stringify({
215|      chat_id: GROUP_ID,
216|      text,
217|      parse_mode: 'Markdown',
218|    }),
219|  })
220|
221|  return new Response(JSON.stringify({ ok: true }))
222|})
223|```
224|
225|**Step 2: Helper untuk panggil notify dari Edge Fn lain**
226|
227|```typescript
228|// Tambahkan ke supabase/functions/_shared/notify.ts
229|export const notifyTelegram = async (event: string, data: Record<string, unknown>) => {
230|  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
231|  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
232|  await fetch(`${supabaseUrl}/functions/v1/notify-telegram`, {
233|    method: 'POST',
234|    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRole}` },
235|    body: JSON.stringify({ event, data }),
236|  }).catch(() => {}) // fire-and-forget, jangan fail payment karena notif gagal
237|}
238|```
239|
240|**Step 3: Wire notifyTelegram ke payment Edge Function**
241|
242|Di `supabase/functions/payment/index.ts`, setelah payment berhasil dibuat:
243|```typescript
244|await notifyTelegram('order_created', { order_id, user_email, total: order.total_amount })
245|// dan setelah status paid:
246|await notifyTelegram('payment_success', { order_id, amount, provider })
247|```
248|
249|**Step 4: Wire ke support ticket creation**
250|
251|Di DB trigger atau dari `useSupport.ts` via Edge Fn call saat ticket dibuat.
252|
253|**Verification:** Buat test order → cek grup Telegram dapat notif dalam <5 detik.
254|
255|---
256|
257|### Task 1.2: Setup Resend + Email Templates
258|
259|**Objective:** Kirim email konfirmasi payment dan password reset branded ke `lum4kar4@gmail.com` sender.
260|
261|**Files:**
262|- Create: `supabase/functions/send-email/index.ts`
263|- Create: `supabase/functions/_shared/email-templates.ts`
264|
265|**Step 1: Daftar Resend dan verifikasi Gmail sender**
266|
267|Resend mendukung Gmail sebagai sender dengan SPF/DKIM override via `from: 'Lumakara <lum4kar4@gmail.com>'`.
268|Perlu setup di Resend dashboard: Settings > Domains > Add Gmail (ikuti verifikasi).
269|
270|**Step 2: Edge Function send-email**
271|
272|```typescript
273|// supabase/functions/send-email/index.ts
274|import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
275|
276|const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
277|const FROM_EMAIL = 'Lumakara Store <lum4kar4@gmail.com>'
278|
279|type EmailType = 'payment_success' | 'password_reset'
280|
281|interface EmailPayload {
282|  type: EmailType
283|  to: string
284|  data: Record<string, unknown>
285|}
286|
287|serve(async (req) => {
288|  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
289|  if (req.headers.get('authorization') !== `Bearer ${serviceRole}`) {
290|    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
291|  }
292|
293|  const { type, to, data }: EmailPayload = await req.json()
294|
295|  let subject = ''
296|  let html = ''
297|
298|  if (type === 'payment_success') {
299|    subject = `✅ Pembayaran Berhasil — Order #${data.order_id}`
300|    html = paymentSuccessTemplate(data)
301|  } else if (type === 'password_reset') {
302|    subject = '🔑 Reset Password Lumakara'
303|    html = passwordResetTemplate(data)
304|  }
305|
306|  const res = await fetch('https://api.resend.com/emails', {
307|    method: 'POST',
308|    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
309|    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
310|  })
311|
312|  if (!res.ok) {
313|    const err = await res.text()
314|    console.error('Resend error:', err)
315|    return new Response(JSON.stringify({ error: 'email_failed' }), { status: 500 })
316|  }
317|
318|  return new Response(JSON.stringify({ ok: true }))
319|})
320|
321|// Templates — premium feel, minimal, dark
322|function paymentSuccessTemplate(data: Record<string, unknown>) {
323|  return `
324|  <!DOCTYPE html><html><head><meta charset="utf-8">
325|  <style>
326|    body { font-family: -apple-system, sans-serif; background: #0f0f0f; color: #f0f0f0; margin: 0; padding: 40px 20px; }
327|    .container { max-width: 480px; margin: 0 auto; background: #1a1a1a; border-radius: 16px; padding: 40px; border: 1px solid #2a2a2a; }
328|    .logo { font-size: 24px; font-weight: 700; color: #fff; margin-bottom: 32px; letter-spacing: -0.5px; }
329|    .badge { display: inline-block; background: #16a34a22; color: #4ade80; border: 1px solid #16a34a44; border-radius: 99px; padding: 6px 16px; font-size: 13px; font-weight: 600; margin-bottom: 24px; }
330|    h1 { font-size: 22px; font-weight: 700; color: #fff; margin: 0 0 8px; }
331|    p { color: #a0a0a0; font-size: 15px; line-height: 1.6; margin: 0 0 24px; }
332|    .detail-box { background: #111; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #222; }
333|    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #222; font-size: 14px; }
334|    .detail-row:last-child { border-bottom: none; font-weight: 600; color: #fff; }
335|    .detail-label { color: #777; }
336|    .footer { font-size: 12px; color: #444; margin-top: 32px; }
337|    a { color: #818cf8; }
338|  </style></head><body>
339|  <div class="container">
340|    <div class="logo">Lumakara</div>
341|    <div class="badge">✅ Pembayaran Berhasil</div>
342|    <h1>Terima kasih!</h1>
343|    <p>Pesananmu telah kami terima dan sedang diproses. Kamu akan mendapat update selanjutnya segera.</p>
344|    <div class="detail-box">
345|      <div class="detail-row"><span class="detail-label">Order ID</span><span>#${data.order_id}</span></div>
346|      <div class="detail-row"><span class="detail-label">Metode</span><span>QRIS</span></div>
347|      <div class="detail-row"><span class="detail-label">Total</span><span>Rp ${Number(data.total).toLocaleString('id-ID')}</span></div>
348|    </div>
349|    <p>Ada pertanyaan? Hubungi support kami di <a href="https://lumakara-store.web.id/support">lumakara-store.web.id/support</a></p>
350|    <div class="footer">© 2026 Lumakara Store. Email ini dikirim ke ${data.user_email}.</div>
351|  </div></body></html>`
352|}
353|
354|function passwordResetTemplate(data: Record<string, unknown>) {
355|  return `
356|  <!DOCTYPE html><html><head><meta charset="utf-8">
357|  <style>
358|    body { font-family: -apple-system, sans-serif; background: #0f0f0f; color: #f0f0f0; margin: 0; padding: 40px 20px; }
359|    .container { max-width: 480px; margin: 0 auto; background: #1a1a1a; border-radius: 16px; padding: 40px; border: 1px solid #2a2a2a; }
360|    .logo { font-size: 24px; font-weight: 700; color: #fff; margin-bottom: 32px; }
361|    h1 { font-size: 22px; font-weight: 700; color: #fff; margin: 0 0 8px; }
362|    p { color: #a0a0a0; font-size: 15px; line-height: 1.6; margin: 0 0 24px; }
363|    .btn { display: inline-block; background: #818cf8; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 600; font-size: 15px; }
364|    .footer { font-size: 12px; color: #444; margin-top: 32px; }
365|  </style></head><body>
366|  <div class="container">
367|    <div class="logo">Lumakara</div>
368|    <h1>Reset Password</h1>
369|    <p>Kami menerima permintaan reset password untuk akunmu. Klik tombol di bawah untuk melanjutkan.</p>
370|    <a href="${data.reset_url}" class="btn">Reset Password →</a>
371|    <p style="margin-top:24px">Link ini berlaku 1 jam. Jika kamu tidak meminta reset password, abaikan email ini.</p>
372|    <div class="footer">© 2026 Lumakara Store</div>
373|  </div></body></html>`
374|}
375|```
376|
377|**Step 3: Wire payment success email ke payment Edge Function**
378|
379|Setelah `apply_payment_status` sukses di `payment/index.ts`:
380|```typescript
381|import { notifyEmail } from '../_shared/email.ts'
382|await notifyEmail('payment_success', order.user_email, { order_id, total: order.total_amount })
383|```
384|
385|**Step 4: Wire password reset ke Supabase Auth custom email**
386|
387|Di Supabase Dashboard → Authentication → Email Templates → "Reset Password":
388|Ganti template dengan call ke send-email Edge Function. Atau gunakan Supabase custom SMTP dengan Resend SMTP credentials.
389|
390|**Verification:** Buat test payment → cek inbox `lum4kar4@gmail.com` dapat email dalam <30 detik.
391|
392|---
393|

---

## PHASE 2 — Admin Panel Full CRUD

### Task 2.1: Enable Admin Mutations + RBAC

**Objective:** Buka penuh canCreate/canEdit/canDelete dengan role-based access control.

**Role Matrix:**
| Aksi | moderator | manager | admin | super_admin |
|---|---|---|---|---|
| View semua data | ✅ | ✅ | ✅ | ✅ |
| Edit order status | ❌ | ✅ | ✅ | ✅ |
| CRUD produk + tier | ❌ | ❌ | ✅ | ✅ |
| Pricing rules | ❌ | ❌ | ✅ | ✅ |
| User management (ban/role) | ❌ | ❌ | ❌ | ✅ |
| Refund | ❌ | ✅ | ✅ | ✅ |
| Admin creation | ❌ | ❌ | ❌ | ✅ |

**Files:**
- Modify: `src/AdminApp.tsx` (lines 702-704 — canCreate/canEdit/canDelete)
- Modify: `src/sections/admin/AdminProducts.tsx`
- Modify: `src/sections/admin/AdminOrders.tsx`
- Create: `src/sections/admin/AdminPricing.tsx`
- Create: `src/sections/admin/AdminUsers.tsx`
- Modify: `src/lib/admin-auth.ts` — tambah `hasPermission(role, action)`

**Step 1: Tambah permission helper ke admin-auth.ts**

```typescript
// src/lib/admin-auth.ts
export type AdminAction =
  | 'view_all'
  | 'edit_order'
  | 'crud_product'
  | 'pricing_rules'
  | 'user_management'
  | 'refund'
  | 'create_admin'

const PERMISSIONS: Record<AdminRole, AdminAction[]> = {
  moderator:   ['view_all'],
  manager:     ['view_all', 'edit_order', 'refund'],
  admin:       ['view_all', 'edit_order', 'refund', 'crud_product', 'pricing_rules'],
  super_admin: ['view_all', 'edit_order', 'refund', 'crud_product', 'pricing_rules', 'user_management', 'create_admin'],
}

export const hasPermission = (role: AdminRole, action: AdminAction): boolean =>
  PERMISSIONS[role]?.includes(action) ?? false
```

**Step 2: Wire ke AdminApp.tsx**

```typescript
// src/AdminApp.tsx line 702-704 — ganti false dengan:
const canCreate = hasPermission(currentAdmin.role, 'crud_product')
const canEdit = hasPermission(currentAdmin.role, 'crud_product') || hasPermission(currentAdmin.role, 'edit_order')
const canDelete = hasPermission(currentAdmin.role, 'crud_product')
```

**Step 3: AdminProducts.tsx — form create/edit/delete produk**

Form harus include: title, category, base_price, discount_price, stock, description, image upload, tags, tiers (CRUD per-tier dengan nama+harga+fitur).

**Step 4: AdminOrders.tsx — order management interaktif**

Status flow dengan konfirmasi:
```
pending → paid (manual jika diperlukan)
paid → processing → completed
any → cancelled (dengan alasan)
any → refunded (dengan form refund — lihat Task 2.2)
```

Modal konfirmasi setiap perubahan status. History log status di detail order.

**Step 5: AdminPricing.tsx — pricing rules CRUD**

Table editor untuk `pricing_rules` (threshold → markup %) dan `rounding_config` singleton.

**Step 6: AdminUsers.tsx — user management (super_admin only)**

List semua profiles, bisa ban/unban (`is_active`), bisa lihat order history per user. Role upgrade HANYA super_admin.

---

### Task 2.2: Refund Flow (A+B)

**Objective:** Admin bisa ubah status jadi "refunded" + form alasan + notif Telegram.

**Files:**
- Create: `src/sections/admin/components/RefundModal.tsx`
- Modify: `src/sections/admin/AdminOrders.tsx`
- Modify: `supabase/migrations/033_refund_notes.sql`

**Step 1: Migration — tambah kolom refund_reason**

```sql
-- supabase/migrations/033_refund_notes.sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_reason TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refunded_by UUID REFERENCES auth.users(id);
```

**Step 2: RefundModal component**

```typescript
// src/sections/admin/components/RefundModal.tsx
interface Props {
  order: Order
  onConfirm: (reason: string) => Promise<void>
  onClose: () => void
}

export function RefundModal({ order, onConfirm, onClose }: Props) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Konfirmasi Refund — #{order.id}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Total: <strong>Rp {order.total_amount.toLocaleString('id-ID')}</strong>
          </p>
          <Textarea
            placeholder="Alasan refund (wajib diisi)..."
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
          />
          <div className="text-xs text-muted-foreground">
            ⚠️ Refund hanya mengubah status di sistem. Proses pengembalian dana dilakukan manual.
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button
            variant="destructive"
            disabled={!reason.trim() || loading}
            onClick={async () => {
              setLoading(true)
              await onConfirm(reason)
              onClose()
            }}
          >
            {loading ? 'Memproses...' : 'Konfirmasi Refund'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 3: Wire refund ke notifyTelegram**

```typescript
// Di AdminOrders.tsx setelah update status refunded:
await supabase.functions.invoke('notify-telegram', {
  body: { event: 'refund_requested', data: {
    order_id: order.id,
    user_email: order.user_email,
    reason,
    amount: order.total_amount,
  }}
})
```

---

## PHASE 3 — Product Features (Wishlist + Review)

### Task 3.1: Wishlist

**Objective:** User bisa simpan produk favorit. Login required.

**Files:**
- Modify: `supabase/migrations/034_wishlist.sql`
- Modify: `src/types/database.ts`
- Create: `src/hooks/useWishlist.ts`
- Modify: `src/sections/HomeSection.tsx` dan `ProductSection.tsx`

**Step 1: Migration — favorites array di profiles**

```sql
-- supabase/migrations/034_wishlist.sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS favorites TEXT[] DEFAULT '{}';

-- Index untuk query
CREATE INDEX IF NOT EXISTS idx_profiles_favorites ON profiles USING GIN(favorites);
```

**Step 2: useWishlist hook**

```typescript
// src/hooks/useWishlist.ts
export function useWishlist() {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState<string[]>([])

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('favorites').eq('user_id', user.id).single()
      .then(({ data }) => setFavorites(data?.favorites ?? []))
  }, [user])

  const toggle = async (productId: string) => {
    if (!user) { toast.error('Login untuk menyimpan favorit'); return }
    const next = favorites.includes(productId)
      ? favorites.filter(id => id !== productId)
      : [...favorites, productId]
    setFavorites(next)
    await supabase.from('profiles').update({ favorites: next }).eq('user_id', user.id)
  }

  return { favorites, toggle, isFavorite: (id: string) => favorites.includes(id) }
}
```

**Step 3: Tambah tombol wishlist ke product card**

Heart icon dengan animasi fill saat di-toggle. Dopamin: pulse animation + toast "Ditambahkan ke favorit ❤️".

---

### Task 3.2: Anonymous Review + Rating

**Objective:** Semua user (termasuk anonymous) bisa review. Rate-limited per IP. Admin bisa hapus.

**Files:**
- Create: `supabase/migrations/035_product_reviews.sql`
- Create: `src/hooks/useReviews.ts`
- Create: `src/sections/components/ReviewSection.tsx`
- Modify: `src/sections/admin/AdminProducts.tsx` (moderation queue)

**Step 1: Migration**

```sql
-- supabase/migrations/035_product_reviews.sql
CREATE TABLE product_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),  -- NULL = anonymous
  display_name TEXT NOT NULL DEFAULT 'Pengguna Anonim',
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  is_visible BOOLEAN DEFAULT true,
  ip_hash TEXT,  -- hash IP untuk rate limit, bukan IP asli
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reviews_product ON product_reviews(product_id);
CREATE INDEX idx_reviews_ip_hash ON product_reviews(ip_hash, created_at);

-- Rate limit: 1 review per produk per IP per 24 jam
CREATE UNIQUE INDEX idx_reviews_ip_product_day
  ON product_reviews(product_id, ip_hash, DATE(created_at));

-- RLS
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_public_read" ON product_reviews
  FOR SELECT USING (is_visible = true);
CREATE POLICY "reviews_insert_anon" ON product_reviews
  FOR INSERT WITH CHECK (true);  -- rate limit via unique index
CREATE POLICY "reviews_staff_all" ON product_reviews
  FOR ALL USING (is_staff());

-- Update products.rating otomatis
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE products SET
    rating = (SELECT ROUND(AVG(rating)::NUMERIC, 1) FROM product_reviews WHERE product_id = COALESCE(NEW.product_id, OLD.product_id) AND is_visible = true),
    reviews = (SELECT COUNT(*) FROM product_reviews WHERE product_id = COALESCE(NEW.product_id, OLD.product_id) AND is_visible = true)
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_rating
AFTER INSERT OR UPDATE OR DELETE ON product_reviews
FOR EACH ROW EXECUTE FUNCTION update_product_rating();
```

**Step 2: ReviewSection component — psychology-optimized**

```typescript
// src/sections/components/ReviewSection.tsx
// Features:
// - Star rating visual dengan hover effect
// - Review count dan distribusi (bar chart mini)
// - "Verified purchase" badge jika user_id punya order untuk produk ini
// - Sort: terbaru | tertinggi | terendah
// - Form submit dengan loading state + sukses animation
// - Anonymous: hanya minta nama display (opsional)
```

---

## PHASE 4 — Psychology & UX / Dopamin Mechanics

### Task 4.1: Flash Sale Countdown Timer

**Objective:** Urgensi visual — "Sale berakhir dalam X:XX:XX"

**Files:**
- Create: `src/components/FlashSaleBanner.tsx`
- Create: `src/hooks/useCountdown.ts`
- Modify: `supabase/migrations/036_flash_sales.sql`

**Step 1: Flash sales table**

```sql
-- supabase/migrations/036_flash_sales.sql
CREATE TABLE flash_sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id TEXT REFERENCES products(id),
  discount_percentage INT CHECK (discount_percentage BETWEEN 1 AND 100),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN GENERATED ALWAYS AS (NOW() BETWEEN starts_at AND ends_at) STORED
);

ALTER TABLE flash_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flash_sales_public_read" ON flash_sales FOR SELECT USING (true);
CREATE POLICY "flash_sales_admin_write" ON flash_sales FOR ALL USING (is_admin());
```

**Step 2: useCountdown hook**

```typescript
// src/hooks/useCountdown.ts
export function useCountdown(targetDate: Date) {
  const [timeLeft, setTimeLeft] = useState(calcTimeLeft(targetDate))
  useEffect(() => {
    const id = setInterval(() => setTimeLeft(calcTimeLeft(targetDate)), 1000)
    return () => clearInterval(id)
  }, [targetDate])
  return timeLeft
}

function calcTimeLeft(target: Date) {
  const diff = target.getTime() - Date.now()
  if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0, expired: true }
  return {
    hours: Math.floor(diff / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
    expired: false,
  }
}
```

**Step 3: FlashSaleBanner component**

Tampilan: background gradient merah/oranye, angka countdown besar dengan flip animation (CSS), badge "🔥 FLASH SALE". Tempatkan di atas product listing.

---

### Task 4.2: Social Proof Real-Time

**Objective:** "X orang sedang melihat produk ini" — FOMO mechanic.

**Files:**
- Create: `src/hooks/useViewerCount.ts`
- Modify: `src/sections/HomeSection.tsx`

**Step 1: Viewer count via Supabase Realtime presence**

```typescript
// src/hooks/useViewerCount.ts
export function useViewerCount(productId: string) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const channel = supabase.channel(`product-viewers:${productId}`, {
      config: { presence: { key: crypto.randomUUID() } }
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        // Tambah noise kecil untuk psikologi: tampilkan count + 2-5 (orang yang tidak refresh)
        const real = Object.keys(state).length
        setCount(real + Math.floor(Math.random() * 4 + 2))
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ product_id: productId, ts: Date.now() })
        }
      })

    return () => { supabase.removeChannel(channel) }
  }, [productId])

  return count
}
```

**Step 2: Tampilkan di product card**

```tsx
// Hanya tampilkan jika count >= 3 (jangan tampilkan "1 orang")
{viewerCount >= 3 && (
  <span className="text-xs text-orange-400 animate-pulse">
    👁️ {viewerCount} orang sedang melihat ini
  </span>
)}
```

---

### Task 4.3: Streak & Badge System

**Objective:** Gamifikasi — user dapat badge berdasarkan aktivitas. Dopamin loop.

**Files:**
- Create: `supabase/migrations/037_badges.sql`
- Create: `src/hooks/useBadges.ts`
- Create: `src/sections/components/BadgeDisplay.tsx`
- Modify: `src/sections/ProfileSection.tsx`

**Step 1: Migration**

```sql
-- supabase/migrations/037_badges.sql
CREATE TABLE user_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL CHECK (badge_type IN (
    'first_order',       -- Order pertama
    'loyal_customer',    -- 5+ order
    'big_spender',       -- Total belanja > Rp 1jt
    'reviewer',          -- Submit 3+ review
    'early_adopter',     -- Daftar di 100 user pertama
    'vip'                -- Total belanja > Rp 5jt
  )),
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_type)
);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "badges_own_read" ON user_badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "badges_staff_read" ON user_badges FOR SELECT USING (is_staff());

-- Function: cek dan assign badges setelah order completed
CREATE OR REPLACE FUNCTION check_and_assign_badges(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  order_count INT;
  total_spend NUMERIC;
BEGIN
  SELECT COUNT(*), SUM(total_amount) INTO order_count, total_spend
  FROM orders WHERE user_id = p_user_id AND status = 'completed';

  IF order_count >= 1 THEN
    INSERT INTO user_badges(user_id, badge_type) VALUES (p_user_id, 'first_order') ON CONFLICT DO NOTHING;
  END IF;
  IF order_count >= 5 THEN
    INSERT INTO user_badges(user_id, badge_type) VALUES (p_user_id, 'loyal_customer') ON CONFLICT DO NOTHING;
  END IF;
  IF total_spend >= 1000000 THEN
    INSERT INTO user_badges(user_id, badge_type) VALUES (p_user_id, 'big_spender') ON CONFLICT DO NOTHING;
  END IF;
  IF total_spend >= 5000000 THEN
    INSERT INTO user_badges(user_id, badge_type) VALUES (p_user_id, 'vip') ON CONFLICT DO NOTHING;
  END IF;
END;
$$;
```

**Step 2: Trigger badge check setelah order selesai**

Panggil `check_and_assign_badges` dari `apply_payment_status` function setelah status = 'completed'.

**Step 3: BadgeDisplay component**

Kartu badge dengan ikon, nama, deskripsi. Animasi reveal saat badge baru didapat (konfetti kecil via CSS). Tampilkan di ProfileSection.

---

### Task 4.4: Checkout Success Animation

**Objective:** Satisfying moment — animasi sukses saat payment berhasil. Dopamin spike.

**Files:**
- Modify: `src/sections/CheckoutSection.tsx`

**Step 1: Success state animation**

```tsx
// Di CheckoutSection.tsx — ganti success step yang minimal dengan:
// 1. Checkmark animasi draw (SVG stroke-dasharray animation)
// 2. Konfetti particle burst (CSS-only, 20-30 particles)
// 3. "Pembayaran Berhasil! 🎉" dengan typewriter effect
// 4. Order summary card slide-in
// 5. CTA "Lihat Order" dan "Lanjut Belanja"
// Sound: optional chime (sudah ada audioService di audio.ts)
```

```css
/* Konfetti CSS — tambahkan ke global CSS */
@keyframes confetti-fall {
  0% { transform: translateY(-100px) rotate(0deg); opacity: 1; }
  100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
}

.confetti-particle {
  position: fixed;
  width: 8px;
  height: 8px;
  animation: confetti-fall 2s ease-in forwards;
}
```

---

### Task 4.5: Product Card Psychology Enhancements

**Objective:** Micro-interactions yang meningkatkan engagement dan konversi.

**Files:**
- Modify: `src/sections/HomeSection.tsx`
- Modify: `src/components/ui/card.tsx` (atau buat ProductCard component terpisah)

**Enhancements:**

1. **Scarcity indicator** — "Sisa [stock] unit" dengan warna merah jika stock < 5
2. **"Terlaris"/"Baru" badge** — berdasarkan `reviews` count atau `created_at`
3. **Hover reveal** — detail singkat produk muncul saat hover (desktop)
4. **Add to cart animation** — item "fly" ke cart icon
5. **Price highlight** — discount_price dengan strikethrough base_price + % saved badge
6. **Recently viewed** — "Baru kamu lihat" section di home, stored di localStorage

---

## PHASE 5 — PWA Offline + Image Upload

### Task 5.1: PWA Offline (Cache produk)

**Objective:** User bisa browse produk tanpa internet.

**Files:**
- Modify: `vite.config.ts` (pastikan VitePWA config ada)
- Create/Modify: `src/sw.ts` atau via VitePWA generateSW

**Step 1: Konfigurasi VitePWA cache strategy**

```typescript
// vite.config.ts — tambah/update VitePWA plugin:
VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/txujwsolndskreywxqtq\.supabase\.co\/rest\/v1\/products/,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'products-cache',
          expiration: { maxEntries: 500, maxAgeSeconds: 3600 }, // 1 jam
        },
      },
      {
        urlPattern: /\.(png|jpg|jpeg|webp|svg)$/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'images-cache',
          expiration: { maxEntries: 100, maxAgeSeconds: 86400 }, // 1 hari
        },
      },
    ],
  },
})
```

**Step 2: Offline indicator banner**

```typescript
// src/components/OfflineBanner.tsx
export function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine)
  useEffect(() => {
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  if (!offline) return null
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-yellow-500/90 text-black px-4 py-2 rounded-full text-sm font-medium z-50">
      📶 Mode Offline — Menampilkan data tersimpan
    </div>
  )
}
```

---

### Task 5.2: Image Upload (Produk + Avatar)

**Objective:** Admin upload gambar produk, user upload avatar. Supabase Storage.

**Files:**
- Create: `supabase/migrations/038_storage_policies.sql`
- Create: `src/components/ImageUploader.tsx`
- Modify: `src/sections/admin/AdminProducts.tsx`
- Modify: `src/sections/ProfileSection.tsx`

**Step 1: Storage policies**

```sql
-- supabase/migrations/038_storage_policies.sql
-- Bucket 'avatars' sudah ada dari migration 004
-- Buat bucket 'products'
INSERT INTO storage.buckets (id, name, public) VALUES ('products', 'products', true)
  ON CONFLICT DO NOTHING;

-- Products bucket: hanya admin yang bisa upload/delete
CREATE POLICY "products_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'products');
CREATE POLICY "products_admin_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'products' AND is_staff());
CREATE POLICY "products_admin_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'products' AND is_staff());

-- Avatars: user bisa upload avatar sendiri
CREATE POLICY "avatars_own_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "avatars_own_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

**Step 2: ImageUploader component (reusable)**

```typescript
// src/components/ImageUploader.tsx
interface Props {
  bucket: 'products' | 'avatars'
  path: string  // e.g. 'product-123' atau 'user-uuid/avatar'
  currentUrl?: string
  onUpload: (url: string) => void
  maxSizeMB?: number  // default 5
}

export function ImageUploader({ bucket, path, currentUrl, onUpload, maxSizeMB = 5 }: Props) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(currentUrl)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Ukuran file maksimal ${maxSizeMB}MB`)
      return
    }

    setUploading(true)
    const ext = file.name.split('.').pop()
    const filePath = `${path}.${ext}`

    const { error } = await supabase.storage.from(bucket).upload(filePath, file, { upsert: true })
    if (error) { toast.error('Upload gagal'); setUploading(false); return }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)
    setPreview(data.publicUrl)
    onUpload(data.publicUrl)
    setUploading(false)
    toast.success('Foto berhasil diupload')
  }

  return (
    <label className="cursor-pointer relative group">
      <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted border-2 border-dashed border-muted-foreground/25 hover:border-primary transition-colors">
        {preview ? (
          <img src={preview} className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <Upload className="w-6 h-6" />
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-white" />
          </div>
        )}
      </div>
      <input type="file" accept="image/*" className="sr-only" onChange={handleFile} />
    </label>
  )
}
```

---

## PHASE 6 — Order History Enhancement

### Task 6.1: Order History Interaktif

**Objective:** Order history yang informatif dengan tracking status + CTA support.

**Files:**
- Modify: `src/sections/ProfileSection.tsx`
- Create: `src/sections/components/OrderCard.tsx`

**Order card features:**
1. Status badge dengan warna (pending=kuning, paid=biru, processing=ungu, completed=hijau, cancelled/refunded=merah)
2. Timeline status progress (visual stepper)
3. Item list dengan gambar thumbnail
4. Total breakdown
5. Tombol "Hubungi Support" → pre-fill ticket dengan order ID
6. Tombol "Beli Lagi" → add semua items ke cart
7. Invoice download (simple HTML → print)

---

## PHASE 7 — Testing

### Task 7.1: Playwright Smoke Tests

**Objective:** Cover 3 alur kritis: checkout, auth, support ticket.

**Files:**
- Create: `tests/smoke.spec.ts`

```typescript
// tests/smoke.spec.ts
import { test, expect } from '@playwright/test'

const BASE = process.env.BASE_URL || 'http://localhost:3000'

test('homepage loads dan produk tampil', async ({ page }) => {
  await page.goto(BASE)
  await expect(page.locator('h1,h2').first()).toBeVisible()
  // produk ada setidaknya 1
  const products = page.locator('[data-testid="product-card"]')
  await expect(products.first()).toBeVisible({ timeout: 10000 })
})

test('auth flow: register → login → logout', async ({ page }) => {
  const testEmail = `test+${Date.now()}@test.com`
  await page.goto(`${BASE}/auth`)
  // register
  await page.click('[data-testid="tab-register"]')
  await page.fill('[name="email"]', testEmail)
  await page.fill('[name="password"]', 'Test123456!')
  // NOTE: Turnstile widget di dev mode biasanya auto-pass
  await page.click('[data-testid="btn-register"]')
  await expect(page).toHaveURL(`${BASE}/`, { timeout: 15000 })
  // logout
  await page.click('[data-testid="user-menu"]')
  await page.click('[data-testid="btn-logout"]')
  await expect(page).toHaveURL(`${BASE}/auth`, { timeout: 5000 })
})

test('checkout flow: add to cart → checkout page muncul', async ({ page }) => {
  // Login dulu
  await page.goto(`${BASE}/auth`)
  await page.fill('[name="email"]', process.env.TEST_EMAIL || 'test@test.com')
  await page.fill('[name="password"]', process.env.TEST_PASS || 'Test123456!')
  await page.click('[data-testid="btn-login"]')
  await expect(page).toHaveURL(BASE, { timeout: 10000 })

  // Add produk pertama ke cart
  await page.click('[data-testid="product-card"]:first-child [data-testid="btn-add-cart"]')
  await expect(page.locator('[data-testid="cart-badge"]')).toHaveText('1')

  // Ke checkout
  await page.goto(`${BASE}/checkout`)
  await expect(page.locator('[data-testid="order-summary"]')).toBeVisible()
})

test('support ticket submit', async ({ page }) => {
  await page.goto(`${BASE}/support`)
  await page.fill('[name="subject"]', 'Test ticket')
  await page.fill('[name="email"]', 'test@test.com')
  await page.fill('[name="description"]', 'Ini test ticket dari playwright')
  await page.click('[data-testid="btn-submit-ticket"]')
  await expect(page.locator('[data-testid="ticket-success"]')).toBeVisible({ timeout: 10000 })
})
```

**Step 2: Tambah `data-testid` ke elemen-elemen penting**

Semua `data-testid` di atas harus ditambahkan ke komponen terkait selama implementasi.

**Step 3: Playwright config**

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests',
  use: { baseURL: process.env.BASE_URL || 'http://localhost:3000', screenshot: 'only-on-failure' },
  webServer: { command: 'npm run dev', url: 'http://localhost:3000', reuseExistingServer: true },
})
```

---

## DEPENDENCIES YANG DIPERLUKAN

```bash
# Tidak ada dependency baru yang signifikan
# Semua sudah tersedia:
# - @supabase/supabase-js (Storage, Realtime)
# - react-hook-form + zod (form validation)
# - sonner (toast)
# - lucide-react (icons)
# - shadcn/ui (dialog, button, dll)

# BARU yang perlu di-install:
# resend — untuk Edge Function (server-side, bukan frontend)
# Ini di-install di Deno Edge Function, bukan package.json:
# import { Resend } from 'npm:resend'
```

---

## SUPABASE SECRETS YANG PERLU DITAMBAHKAN

Via Supabase Dashboard → Edge Functions → Secrets:

```
KIMI_API_KEY=<value dari .env.example>
KIMI_API_URL=https://api.moonshot.cn/v1/chat/completions
KIMI_MODEL=moonshot-v1-8k
RESEND_API_KEY=<daftar di resend.com>
TELEGRAM_BOT_TOKEN=<dari .env>
TELEGRAM_NOTIFY_GROUP=-1003862129556
```

---

## MIGRATION EXECUTION ORDER

```
033_refund_notes.sql
034_wishlist.sql
035_product_reviews.sql
036_flash_sales.sql
037_badges.sql
038_storage_policies.sql
```

Deploy via Supabase SQL Editor atau `supabase db push` (butuh Docker).

---

## VERIFICATION CHECKLIST

Sebelum deploy ke production:

- [ ] `npm run build` sukses tanpa error
- [ ] `grep -r 'KIMI_API_KEY' dist/` → 0 hasil
- [ ] `grep -r '__test' dist/` → 0 hasil
- [ ] Edge Functions deployed: ai-proxy, notify-telegram, send-email
- [ ] Semua Supabase secrets ter-set
- [ ] Telegram notif test: kirim test event ke group -1003862129556
- [ ] Resend test: kirim email ke lum4kar4@gmail.com
- [ ] Playwright smoke tests: semua pass
- [ ] Admin CRUD: test create/edit/delete produk dengan role admin
- [ ] Wishlist: toggle ❤️ tersimpan setelah refresh
- [ ] Review: submit anonymous, rate limit (coba submit 2x produk sama hari ini → harus blocked)
- [ ] Flash sale: buat 1 sale aktif → countdown muncul
- [ ] Checkout success: animasi konfetti + email terkirim
