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

const cors = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return { ...cors, "Access-Control-Allow-Origin": allowed, "Vary": "Origin" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req.headers.get("Origin")) });
  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) throw new Error("Unauthorized");
    const callerClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: caller } = await callerClient.auth.getUser();
    if (!caller.user) throw new Error("Unauthorized");
    const { data: profile } = await admin.from("profiles").select("role,is_active")
      .eq("user_id", caller.user.id).maybeSingle();
    if (!profile?.is_active || profile.role !== "super_admin") throw new Error("Forbidden");
    const { email, password, name, role } = await req.json();
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
    return response({ success: true, userId: data.user.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Admin creation failed";
    return response({ success: false, error: message }, message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400);
  }
});

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(req.headers.get("Origin")) });
}
