import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// NEOXR GPT4 API — key stored as NEOXR_API_KEY secret
const NEOXR_API_KEY = Deno.env.get("NEOXR_API_KEY") || "oggwWy";
const NEOXR_API_URL = "https://api.neoxr.eu/api/gpt4";

const ALLOWED_ORIGINS = [
  "https://lumakara-store.web.id",
  "https://www.lumakara-store.web.id",
  "https://lumakara.com",
  "https://www.lumakara.com",
  "http://localhost:3000",
  "http://localhost:5173",
];

function corsHeaders(origin: string | null) {
  const allowed =
    origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    Vary: "Origin",
  };
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: corsHeaders(origin),
    });
  }

  let body: { messages?: Array<{ role: string; content: string }>; max_tokens?: number };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: corsHeaders(origin),
    });
  }

  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return new Response(JSON.stringify({ error: "messages_required" }), {
      status: 400,
      headers: corsHeaders(origin),
    });
  }

  // Ambil pesan terakhir dari user sebagai query
  const lastUserMsg = [...body.messages].reverse().find(m => m.role === "user");
  const query = lastUserMsg?.content || "";

  // ponytail: no per-user rate limit — add if NEOXR costs spike
  const url = `${NEOXR_API_URL}?q=${encodeURIComponent(query)}&apikey=${NEOXR_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  // Normalize NEOXR response ke format OpenAI-compatible
  if (data.status && data.data?.message) {
    return new Response(JSON.stringify({
      choices: [{
        message: {
          role: "assistant",
          content: data.data.message,
        },
      }],
    }), {
      status: 200,
      headers: corsHeaders(origin),
    });
  }

  // Error dari NEOXR
  return new Response(JSON.stringify({ error: "ai_error", detail: data }), {
    status: 500,
    headers: corsHeaders(origin),
  });
});
