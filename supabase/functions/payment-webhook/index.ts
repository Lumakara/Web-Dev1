import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

// Mustika is disabled. Reject stale callbacks so they cannot mutate payment state.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");
  return new Response(JSON.stringify({
    success: false,
    error: "Payment webhook provider is disabled",
  }), {
    status: 410,
    headers: { "Content-Type": "application/json" },
  });
});
