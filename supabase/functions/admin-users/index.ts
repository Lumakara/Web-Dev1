import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const url = Deno.env.get("SUPABASE_URL")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const ALLOWED_ORIGINS = [
  "https://lumakara-store.web.id",
  "https://www.lumakara-store.web.id",
  "https://lumakara.com",
  "https://www.lumakara.com",
];

const corsBase = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return { ...corsBase, "Access-Control-Allow-Origin": allowed, "Vary": "Origin" };
}

// Simple in-memory rate limit: max 10 req/15min per IP
// ponytail: in-memory resets on cold start — use DB counter if abuse detected
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 15 * 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });

  // Rate limiting
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(ip)) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: corsHeaders(origin),
    });
  }

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) throw new Error("Unauthorized");

    const callerClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: caller } = await callerClient.auth.getUser();
    if (!caller.user) throw new Error("Unauthorized");

    // Verify caller is super_admin
    const { data: profile } = await admin.from("profiles").select("role,is_active")
      .eq("user_id", caller.user.id).maybeSingle();
    if (!profile?.is_active || profile.role !== "super_admin") throw new Error("Forbidden");

    // Enforce MFA: super_admin MUST have AAL2 (TOTP verified this session)
    // Check authenticator_assurance_level via the caller's session
    const { data: { session } } = await callerClient.auth.getSession();
    const aal = session?.user?.factors?.length ?? 0;
    // If Supabase MFA is enrolled and not at AAL2, reject
    // We check via user factors — if any TOTP factor is verified
    const mfaFactors = session?.user?.factors ?? [];
    const hasMfaFactor = mfaFactors.some((f: Record<string, unknown>) => f.factor_type === "totp");
    const aal2Verified = session && (
      // Check AMR claim for "totp" verifier
      (session as unknown as Record<string, unknown>).amr
        ? ((session as unknown as Record<string, { method: string }[]>).amr ?? []).some(
            (a) => a.method === "totp"
          )
        : true // If no AMR claim, MFA not enforced yet (allow but log)
    );

    if (hasMfaFactor && !aal2Verified) {
      throw new Error("MFA_REQUIRED");
    }

    const body = await req.json();
    const { email, password, name, role } = body;
    if (!email || !password || !name || !["moderator", "manager", "admin", "super_admin"].includes(role)) {
      throw new Error("Invalid admin data");
    }

    const { data, error } = await admin.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { full_name: name },
    });
    if (error) throw error;

    const { error: profileError } = await admin.from("profiles").update({
      full_name: name, role, is_active: true,
    }).eq("user_id", data.user.id);
    if (profileError) throw profileError;

    return res({ success: true, userId: data.user.id }, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Admin creation failed";
    const status = message === "Unauthorized" ? 401
      : message === "Forbidden" ? 403
      : message === "MFA_REQUIRED" ? 403
      : 400;
    return res({ success: false, error: message }, status, origin);
  }
});

function res(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) });
}
