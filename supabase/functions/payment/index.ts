import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

type PaymentStatus = "pending" | "paid" | "failed" | "expired";
type ActiveProvider = "saweria" | "rama";
type Provider = ActiveProvider | "mustika";

interface ProviderPayment {
  provider: ActiveProvider;
  reference: string;
  amount: number;
  fee: number;
  qrString: string;
  qrUrl: string | null;
  paymentUrl: string | null;
  expiresAt: string;
  raw: Record<string, unknown>;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const NEOXR_API_KEY = Deno.env.get("NEOXR_API_KEY") ?? "";
const SAWERIA_USER_ID = Deno.env.get("SAWERIA_USER_ID") ?? "";
const NEOXR_BASE_URL = "https://api.neoxr.eu/api";
const RAMA_API_KEY = Deno.env.get("RAMA_API_KEY") ?? "";
const RAMA_BASE_URL = (Deno.env.get("RAMA_BASE_URL") ?? "https://ramashop.my.id/api/public").replace(/\/$/, "");

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const ALLOWED_ORIGINS = [
  "https://lumakara.com",
  "https://www.lumakara.com",
];

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    "Vary": "Origin",
  };
}

serve(async (req) => {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req.headers.get("Origin")) });
  if (req.method !== "POST") return failure(requestId, new PaymentError("METHOD_NOT_ALLOWED", "Method not allowed", 405));

  let orderId = "";
  const origin = req.headers.get("Origin");
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const action = String(body.action ?? "");
    orderId = String(body.orderId ?? "");
    if (!orderId) throw new PaymentError("VALIDATION_ERROR", "orderId is required", 400);
    const order = await requireOwnedOrder(orderId, user.id);

    if (action === "create") {
      // Rate limit check BEFORE any provider call
      const { data: rateLimitOk, error: rateLimitErr } = await admin.rpc('check_payment_rate_limit', { p_user_id: user.id });
      if (rateLimitErr) throw rateLimitErr;
      if (!rateLimitOk) {
        throw new PaymentError("RATE_LIMIT_EXCEEDED", "Too many payment attempts. Please wait before trying again.", 429);
      }

      if (String(body.method ?? "qris").toLowerCase() !== "qris") {
        throw new PaymentError("UNSUPPORTED_METHOD", "Only QRIS is supported", 400);
      }
      // ponytail: amount from order.total_amount (DB), not client
      const amount = Number(order.total_amount);
      const MAX_PAYMENT = 10_000_000; // Rp 10 juta
      if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount < 1000) {
        throw new PaymentError("VALIDATION_ERROR", "Invalid order amount", 400);
      }
      if (amount > MAX_PAYMENT) {
        throw new PaymentError("VALIDATION_ERROR", `Maximum payment is Rp ${(MAX_PAYMENT / 1000).toFixed(0)}K`, 400);
      }
      return await createPayment(order, user.id, amount, requestId, origin);
    }
    if (action === "status") return await checkPaymentStatus(orderId, requestId, origin);
    throw new PaymentError("VALIDATION_ERROR", "Unknown payment action", 400);
  } catch (error) {
    const normalized = normalizeError(error);
    console.error(JSON.stringify({
      event: "payment_error", request_id: requestId, order_id: orderId || null,
      provider: normalized.provider, method: "qris", http_status: normalized.status,
      error_code: normalized.code, timestamp: new Date().toISOString(),
    }));
    return failure(requestId, normalized);
  }
});

async function requireUser(req: Request) {
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) throw new PaymentError("UNAUTHORIZED", "Authentication required", 401);
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new PaymentError("UNAUTHORIZED", "Authentication required", 401);
  return data.user;
}

async function requireOwnedOrder(orderId: string, userId: string) {
  const { data, error } = await admin.from("orders").select("id,user_id,total_amount,status").eq("id", orderId).maybeSingle();
  if (error) throw error;
  if (!data || data.user_id !== userId) throw new PaymentError("ORDER_NOT_FOUND", "Order not found", 404);
  if (["cancelled", "refunded"].includes(data.status)) throw new PaymentError("ORDER_NOT_PAYABLE", "Order cannot be paid", 409);
  return data;
}

async function createPayment(
  order: { id: string; user_id: string; total_amount: number; status: string },
  userId: string,
  amount: number,
  requestId: string,
  origin: string | null = null,
) {
  const { data: existing, error } = await admin.from("payments").select("*").eq("order_id", order.id).maybeSingle();
  if (error) throw error;
  if (existing?.provider_transaction_id && existing.qr_string) {
    return json({ success: true, payment: clientPayment(existing), fallback: existing.fallback_used, idempotent: true, requestId }, 200, origin);
  }
  if (existing?.metadata?.state === "creating") {
    throw new PaymentError("PAYMENT_IN_PROGRESS", "Payment creation is already in progress", 409);
  }

  const reservationId = existing?.id ?? crypto.randomUUID();
  if (existing) {
    const { error: retryError } = await admin.from("payments").update({
      provider: "saweria", fallback_used: false, fallback_reason: null,
      failure_reason: null, metadata: { state: "creating", retry: true },
    }).eq("id", reservationId);
    if (retryError) throw retryError;
  } else {
    const { error: reservationError } = await admin.from("payments").insert({
      id: reservationId, order_id: order.id, provider: "saweria", payment_method: "qris",
      amount, fee: 0, status: "pending", metadata: { state: "creating" },
    });
    if (reservationError) {
      if (reservationError.code === "23505") {
        const { data: concurrent } = await admin.from("payments").select("*").eq("order_id", order.id).maybeSingle();
        if (concurrent?.provider_transaction_id && concurrent.qr_string) {
          return json({ success: true, payment: clientPayment(concurrent), fallback: concurrent.fallback_used, idempotent: true, requestId }, 200, origin);
        }
        throw new PaymentError("PAYMENT_IN_PROGRESS", "Payment creation is already in progress", 409);
      }
      throw reservationError;
    }
  }

  const message = await buildSaweriaMessage(order.id, userId);
  let providerPayment: ProviderPayment;
  let fallbackReason: string | null = null;
  try {
    providerPayment = await retryWithBackoff(() => createSaweriaQris(amount, message), "saweria");
  } catch (saweriaError) {
    const normalized = normalizeError(saweriaError);
    await logEvent(reservationId, order.id, "provider_response", "pending", {
      provider: "saweria", error_code: normalized.code, retryable: isFallbackEligible(saweriaError),
    });
    if (!isFallbackEligible(saweriaError)) {
      await markCreationFailed(reservationId, normalized.code);
      throw saweriaError;
    }

    fallbackReason = normalized.code;
    await logEvent(reservationId, order.id, "fallback_attempted", "pending", {
      from: "saweria", to: "rama", reason: fallbackReason,
    });
    try {
      providerPayment = await retryWithBackoff(() => createRamaQris(amount), "rama");
      await logEvent(reservationId, order.id, "fallback_used", "pending", {
        from: "saweria", to: "rama", reason: fallbackReason,
      });
    } catch (ramaError) {
      const ramaNormalized = normalizeError(ramaError);
      await logEvent(reservationId, order.id, "fallback_failed", "pending", {
        provider: "rama", error_code: ramaNormalized.code,
      });
      await markCreationFailed(reservationId, ramaNormalized.code);
      throw ramaError;
    }
  }

  const fallbackUsed = providerPayment.provider === "rama";
  const { data: payment, error: updateError } = await admin.from("payments").update({
    provider: providerPayment.provider, payment_method: "qris",
    provider_transaction_id: providerPayment.reference, ref_no: providerPayment.reference,
    provider_ref: providerPayment.reference, amount: providerPayment.amount, fee: providerPayment.fee,
    status: "pending", qr_string: providerPayment.qrString,
    payment_url: providerPayment.paymentUrl ?? providerPayment.qrUrl,
    expires_at: providerPayment.expiresAt, fallback_used: fallbackUsed,
    fallback_reason: fallbackReason,
    metadata: {
      state: "ready", gateway: providerPayment.provider === "saweria" ? "neoxr" : "rama",
      qr_url: providerPayment.qrUrl, qr_image: providerPayment.qrUrl?.startsWith("data:image/") ? providerPayment.qrUrl : null,
      provider_response: sanitizeProviderData(providerPayment.raw),
    },
  }).eq("id", reservationId).select().single();
  if (updateError) throw updateError;

  await logEvent(payment.id, order.id, "provider_response", "pending", {
    provider: providerPayment.provider, reference_present: true, qr_present: true,
    amount: providerPayment.amount + providerPayment.fee, expires_at: providerPayment.expiresAt,
  });
  await logEvent(payment.id, order.id, "payment_created", "pending", {
    provider: providerPayment.provider,
    gateway: providerPayment.provider === "saweria" ? "neoxr" : "rama",
  });
  await logEvent(payment.id, order.id, "payment_pending", "pending", { source: "create" });

  const { error: orderError } = await admin.from("orders").update({
    payment_method: "qris", payment_reference: providerPayment.reference,
    payment_provider: providerPayment.provider, payment_status: "pending",
  }).eq("id", order.id);
  if (orderError) throw orderError;

  console.log(JSON.stringify({
    event: "payment_created", request_id: requestId, order_id: order.id,
    payment_id: payment.id, provider: payment.provider, method: "qris",
    fallback_used: fallbackUsed, http_status: 200, timestamp: new Date().toISOString(),
  }));
  return json({ success: true, payment: clientPayment(payment), fallback: fallbackUsed, requestId }, 200, origin);
}

async function buildSaweriaMessage(orderId: string, userId: string) {
  const [{ data: profile }, { data: items, error: itemsError }] = await Promise.all([
    admin.from("profiles").select("full_name").eq("user_id", userId).maybeSingle(),
    admin.from("order_items").select("title,tier,quantity").eq("order_id", orderId).order("id"),
  ]);
  if (itemsError) throw itemsError;
  const customer = cleanMessagePart(profile?.full_name ?? "Customer");
  const products = (items ?? []).slice(0, 3)
    .map((item) => `${cleanMessagePart(`${item.title} ${item.tier}`)} - ${Math.max(1, Number(item.quantity) || 1)}`)
    .join(", ");
  return `${customer} - ${products || cleanMessagePart(orderId)}`.slice(0, 180);
}

function cleanMessagePart(value: unknown) {
  return String(value ?? "").replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

async function checkPaymentStatus(orderId: string, requestId: string, origin: string | null = null) {
  const { data: payment, error } = await admin.from("payments").select("*").eq("order_id", orderId).maybeSingle();
  if (error) throw error;
  if (!payment?.provider_transaction_id) throw new PaymentError("PAYMENT_NOT_READY", "Payment is not ready", 409);
  if (["paid", "failed", "expired"].includes(payment.status)) {
    return json({ success: true, status: payment.status, paidAt: payment.paid_at, expiresAt: payment.expires_at, requestId }, 200, origin);
  }

  let status: PaymentStatus;
  let providerResponse: Record<string, unknown> = {};
  if (payment.expires_at && new Date(payment.expires_at).getTime() <= Date.now()) {
    status = "expired";
    providerResponse = { source: "local_expiration", expires_at: payment.expires_at };
  } else if (payment.provider === "saweria") {
    const result = await retryWithBackoff(() => checkSaweriaStatus(payment.provider_transaction_id), "saweria");
    status = result.status;
    providerResponse = result.raw;
  } else if (payment.provider === "rama") {
    const result = await retryWithBackoff(() => checkRamaStatus(payment.provider_transaction_id), "rama");
    status = result.status;
    providerResponse = result.raw;
  } else {
    throw new PaymentError("PROVIDER_DISABLED", "Payment provider is disabled", 409, "mustika");
  }

  await logEvent(payment.id, orderId, "payment_status_check", status, {
    provider: payment.provider, response: sanitizeProviderData(providerResponse),
  });
  await applyStatus(payment, status, providerResponse);
  console.log(JSON.stringify({
    event: "payment_status_check", request_id: requestId, order_id: orderId,
    payment_id: payment.id, provider: payment.provider, status, timestamp: new Date().toISOString(),
  }));
  return json({ success: true, status, paidAt: status === "paid" ? new Date().toISOString() : null, expiresAt: payment.expires_at, requestId }, 200, origin);
}

async function createSaweriaQris(amount: number, message: string): Promise<ProviderPayment> {
  if (!NEOXR_API_KEY || !SAWERIA_USER_ID) {
    console.error(JSON.stringify({
      event: "provider_config_missing",
      provider: "saweria",
      error_type: "PROVIDER_CONFIGURATION",
      timestamp: new Date().toISOString(),
    }));
    throw new PaymentError("PROVIDER_CONFIGURATION", "Payment provider configuration is incomplete", 503, "saweria");
  }
  console.log(JSON.stringify({
    event: "provider_request_start",
    provider: "saweria",
    amount,
    timestamp: new Date().toISOString(),
  }));
  const payload = await neoxrRequest("/saweria-create", {
    userid: SAWERIA_USER_ID, amount: String(amount), message, apikey: NEOXR_API_KEY,
  });
  const data = asRecord(payload.data);
  const reference = stringValue(data.id);
  const qrString = stringValue(data.qr_string);
  const providerAmount = numberValue(data.amount_raw ?? data.amount);
  const expiresAt = validDateString(data.expired_at);
  if (payload.status !== true) throw classifySaweriaRejection(payload);
  if (payload.status !== true || !reference || !qrString || providerAmount === null || !expiresAt) {
    throw new ProviderFailure("PROVIDER_MALFORMED_RESPONSE", false, 502, "saweria");
  }
  if (providerAmount < amount) throw new ProviderFailure("PROVIDER_AMOUNT_MISMATCH", false, 422, "saweria");
  return {
    provider: "saweria", reference, amount, fee: providerAmount - amount, qrString,
    qrUrl: safePublicUrl(data.qr_image), paymentUrl: safePublicUrl(data.url),
    expiresAt, raw: payload,
  };
}

function classifySaweriaRejection(payload: Record<string, unknown>) {
  const message = stringValue(payload.msg ?? payload.message).toLowerCase();
  if (message.includes("apikey") || message.includes("api key") || message.includes("authentication")) {
    return new ProviderFailure("PROVIDER_AUTHENTICATION", false, 401, "saweria");
  }
  return new ProviderFailure("PROVIDER_REJECTED", false, 422, "saweria");
}

async function checkSaweriaStatus(reference: string): Promise<{ status: PaymentStatus; raw: Record<string, unknown> }> {
  if (!NEOXR_API_KEY || !SAWERIA_USER_ID) {
    throw new PaymentError("PROVIDER_CONFIGURATION", "Payment provider configuration is incomplete", 503, "saweria");
  }
  const payload = await neoxrRequest("/saweria-check", {
    userid: SAWERIA_USER_ID, id: reference, apikey: NEOXR_API_KEY,
  });
  if (payload.status === true) return { status: "paid", raw: payload };
  const message = stringValue(payload.msg ?? payload.message).toUpperCase();
  if (message === "TRANSAKSI TIDAK TERDAFTAR ATAU BELUM TERSELESAIKAN") {
    return { status: "pending", raw: payload };
  }
  throw new ProviderFailure("PROVIDER_REJECTED", false, 422, "saweria");
}

async function neoxrRequest(path: string, params: Record<string, string>) {
  const url = new URL(`${NEOXR_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetchWithTimeout(url.toString(), { method: "GET", headers: { Accept: "application/json" } }, "saweria");
  const payload = await readProviderResponse(response, "saweria");
  if (!response.ok) {
    throw new ProviderFailure("PROVIDER_HTTP_ERROR", response.status === 429 || response.status >= 500, response.status, "saweria");
  }
  return payload;
}

async function createRamaQris(amount: number): Promise<ProviderPayment> {
  if (!RAMA_API_KEY) {
    console.error(JSON.stringify({
      event: "provider_config_missing",
      provider: "rama",
      error_type: "PROVIDER_CONFIGURATION",
      timestamp: new Date().toISOString(),
    }));
    throw new PaymentError("PROVIDER_CONFIGURATION", "Fallback provider configuration is incomplete", 503, "rama");
  }
  console.log(JSON.stringify({
    event: "provider_request_start",
    provider: "rama",
    amount,
    timestamp: new Date().toISOString(),
  }));
  const response = await fetchWithTimeout(`${RAMA_BASE_URL}/deposit/create`, {
    method: "POST", headers: { "X-API-Key": RAMA_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ amount, method: "qris" }),
  }, "rama");
  const payload = await readProviderResponse(response, "rama");
  const data = asRecord(payload.data);
  const reference = stringValue(data.depositId);
  const qrString = stringValue(data.qrString);
  const providerAmount = numberValue(data.totalAmount ?? data.amount);
  if (!response.ok || payload.success === false || !reference || !qrString || providerAmount === null) {
    throw new ProviderFailure("FALLBACK_PROVIDER_REJECTED", response.status === 429 || response.status >= 500, response.status || 502, "rama");
  }
  return {
    provider: "rama", reference, amount: providerAmount,
    fee: numberValue(data.fee ?? data.uniqueCode) ?? Math.max(0, providerAmount - amount),
    qrString, qrUrl: safePublicUrl(data.qrImage), paymentUrl: null,
    expiresAt: validDateString(data.expiredAt) ?? new Date(Date.now() + 30 * 60_000).toISOString(), raw: payload,
  };
}

async function checkRamaStatus(reference: string): Promise<{ status: PaymentStatus; raw: Record<string, unknown> }> {
  const response = await fetchWithTimeout(`${RAMA_BASE_URL}/deposit/status/${encodeURIComponent(reference)}`, {
    headers: { "X-API-Key": RAMA_API_KEY, "Content-Type": "application/json" },
  }, "rama");
  const payload = await readProviderResponse(response, "rama");
  if (!response.ok || payload.status === false) {
    throw new ProviderFailure("FALLBACK_STATUS_REJECTED", false, response.status || 422, "rama");
  }
  return { status: normalizeRamaStatus(asRecord(payload.data).status), raw: payload };
}

function normalizeRamaStatus(value: unknown): PaymentStatus {
  const status = String(value ?? "pending").toLowerCase();
  if (["success", "paid", "completed", "already"].includes(status)) return "paid";
  if (["failed", "cancelled", "canceled"].includes(status)) return "failed";
  if (status === "expired") return "expired";
  return "pending";
}

async function applyStatus(payment: { id: string; status: string; order_id: string }, status: PaymentStatus, providerResponse: Record<string, unknown>) {
  if (payment.status === status || ["paid", "failed", "expired"].includes(payment.status)) return;
  const eventType = status === "paid" ? "payment_success"
    : status === "failed" ? "payment_failed"
    : status === "expired" ? "payment_expired" : "payment_pending";
  const { error } = await admin.rpc("apply_payment_status", {
    p_payment_id: payment.id, p_status: status,
    p_provider_response: sanitizeProviderData(providerResponse), p_event_type: eventType,
  });
  if (error) throw error;
}

async function markCreationFailed(paymentId: string, errorCode: string) {
  const { error } = await admin.from("payments").update({
    failure_reason: errorCode, metadata: { state: "creation_failed", error_code: errorCode },
  }).eq("id", paymentId).is("provider_transaction_id", null);
  if (error) console.warn(JSON.stringify({ event: "payment_reservation_update_failed", error_code: "DATABASE_ERROR" }));
}

async function logEvent(paymentId: string, orderId: string, eventType: string, status: string, response: unknown) {
  const { error } = await admin.from("payment_events").insert({
    payment_id: paymentId, order_id: orderId, event_type: eventType,
    status, provider_response: sanitizeProviderData(response),
  });
  if (error && error.code !== "23505") {
    console.warn(JSON.stringify({ event: "payment_event_write_failed", event_type: eventType, error_code: "DATABASE_ERROR" }));
  }
}

async function fetchWithTimeout(url: string, init: RequestInit, provider: ActiveProvider) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch {
    throw new ProviderFailure("PROVIDER_UNAVAILABLE", true, 503, provider);
  } finally {
    clearTimeout(timer);
  }
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  provider: ActiveProvider,
  maxAttempts = 3,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (error instanceof ProviderFailure && !error.fallbackEligible) {
        throw error;
      }
      if (attempt === maxAttempts) {
        throw error;
      }
      const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
      console.log(JSON.stringify({
        event: "retry_attempt",
        provider,
        attempt,
        max_attempts: maxAttempts,
        delay_ms: delayMs,
        error_type: error instanceof ProviderFailure ? error.code : "UNKNOWN",
        timestamp: new Date().toISOString(),
      }));
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

async function readProviderResponse(response: Response, provider: ActiveProvider) {
  const text = await response.text();
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
  } catch {
    // Raw non-JSON responses are intentionally discarded.
  }
  throw new ProviderFailure("PROVIDER_MALFORMED_RESPONSE", response.status === 429 || response.status >= 500, response.status || 502, provider);
}

function sanitizeProviderData(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[TRUNCATED]";
  if (value === null || value === undefined || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return value.length > 1000 ? `${value.slice(0, 1000)}[TRUNCATED]` : value;
  if (Array.isArray(value)) return value.slice(0, 50).map((entry) => sanitizeProviderData(entry, depth + 1));
  if (typeof value !== "object") return String(value);
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
    const sensitive = /api[-_]?key|authorization|password|secret|token|cookie|session/i.test(key);
    return [key, sensitive ? "[REDACTED]" : sanitizeProviderData(entry, depth + 1)];
  }));
}

function safePublicUrl(value: unknown) {
  const candidate = stringValue(value);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return candidate.startsWith("data:image/") ? candidate : null;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function clientPayment(payment: Record<string, unknown>) {
  const metadata = asRecord(payment.metadata);
  return {
    ...payment,
    qr_url: safePublicUrl(metadata.qr_url),
    qr_image: safeQrDataUri(metadata.qr_image ?? metadata.qr_url),
    payment_url: safePublicUrl(payment.payment_url),
    reference: payment.provider_ref ?? payment.provider_transaction_id,
  };
}

function safeQrDataUri(value: unknown) {
  const candidate = stringValue(value);
  return /^data:image\/(?:png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=\s]+$/.test(candidate)
    ? candidate.replace(/\s/g, "")
    : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validDateString(value: unknown) {
  const candidate = stringValue(value);
  if (!candidate) return null;
  const localMatch = candidate.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/);
  const timestamp = localMatch
    ? new Date(
      Number(localMatch[3]), Number(localMatch[2]) - 1, Number(localMatch[1]),
      Number(localMatch[4]), Number(localMatch[5]), Number(localMatch[6]),
    ).getTime()
    : new Date(candidate).getTime();
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function isFallbackEligible(error: unknown) {
  return error instanceof ProviderFailure && error.provider === "saweria" && error.fallbackEligible;
}

class ProviderFailure extends Error {
  constructor(
    readonly code: string,
    readonly fallbackEligible: boolean,
    readonly providerStatus = 503,
    readonly provider: ActiveProvider = "saweria",
  ) { super(code); }
}

class PaymentError extends Error {
  constructor(readonly code: string, message: string, readonly status: number, readonly provider?: Provider) { super(message); }
}

function normalizeError(error: unknown): PaymentError {
  if (error instanceof PaymentError) return error;
  if (error instanceof ProviderFailure) {
    if (error.code === "PROVIDER_UNAVAILABLE" || error.fallbackEligible) {
      return new PaymentError("PROVIDER_UNAVAILABLE", "Payment provider sedang tidak tersedia.", 503, error.provider);
    }
    if (error.providerStatus === 401 || error.providerStatus === 403 || error.code === "PROVIDER_AUTHENTICATION") {
      return new PaymentError("PROVIDER_AUTHENTICATION", "Payment provider authentication failed.", 502, error.provider);
    }
    return new PaymentError(error.code, "Payment gagal diproses.", 422, error.provider);
  }
  return new PaymentError("UNKNOWN_PAYMENT_ERROR", "Payment gagal diproses.", 500);
}

function failure(requestId: string, error: PaymentError) {
  console.error(JSON.stringify({
    event: "payment_failure",
    request_id: requestId,
    error_code: error.code,
    provider: error.provider,
    http_status: error.status,
    timestamp: new Date().toISOString(),
  }));
  return json({ success: false, code: error.code, message: error.message }, error.status, origin);
}

function json(body: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) });
}
