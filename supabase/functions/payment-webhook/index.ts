import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://lumakara-store.web.id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Vary": "Origin",
  "Content-Type": "application/json",
};

// Mustika is disabled. Reject stale callbacks so they cannot mutate payment state.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  return new Response(JSON.stringify({
    success: false,
    error: "Payment webhook provider is disabled",
  }), {
    status: 410,
    headers: CORS_HEADERS,
  });
});
