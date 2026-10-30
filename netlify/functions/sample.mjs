// /api/sample – låter "Spara och sammanfatta" under Avstämningar använda Claude.
// Kräver inloggad medlem. API-nyckeln ligger bara här på servern.
// Om ANTHROPIC_API_KEY saknas svarar funktionen 501 och sidan sparar anteckningarna utan sammanfattning.
import { createClient } from "@supabase/supabase-js";

const json = (status, body) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json" },
});

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "method" });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return json(501, { error: "ai_disabled" });

  // 1. Är det en inloggad medlem?
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json(401, { error: "auth" });
  const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data: u, error: ue } = await admin.auth.getUser(token);
  if (ue || !u?.user?.email) return json(401, { error: "auth" });
  const { data: m } = await admin.from("members").select("role").eq("email", u.user.email.toLowerCase()).maybeSingle();
  if (!m) return json(403, { error: "not_member" });

  // 2. Fråga Claude
  const { prompt } = await req.json().catch(() => ({}));
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 80000) return json(400, { error: "prompt" });

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (r.status === 429) return json(429, { error: "rate_limited" });
  if (!r.ok) return json(502, { error: "upstream", status: r.status });

  const out = await r.json();
  const text = (out.content || []).filter(c => c.type === "text").map(c => c.text).join("");
  const start = text.indexOf("{"), end = text.lastIndexOf("}");
  try {
    return json(200, { result: JSON.parse(text.slice(start, end + 1)) });
  } catch {
    return json(502, { error: "invalid_json" });
  }
};
