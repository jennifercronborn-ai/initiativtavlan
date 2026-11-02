// Hämtar initiativ som lagts till på sidan och skriver dem till data/initiativ.json,
// så att veckosynken (se data/sync/SYNK-INSTRUKTION.md) läser även deras webbplatser.
// Användning:  SYNC_TOKEN=... node scripts/sync-initiatives.mjs
// Filen innehåller bara offentliga uppgifter: namn, region och webbadresser. Aldrig kontaktuppgifter.
import { readFileSync, writeFileSync } from "node:fs";

const token = process.env.SYNC_TOKEN;
if (!token) { console.error("Ange SYNC_TOKEN."); process.exit(1); }

const cfgSrc = readFileSync(new URL("./write-config.mjs", import.meta.url), "utf8");
const url = process.env.SUPABASE_URL || cfgSrc.match(/DEFAULT_URL = "([^"]+)"/)[1];
const anon = process.env.SUPABASE_ANON_KEY || cfgSrc.match(/DEFAULT_ANON = "([^"]+)"/)[1];

const res = await fetch(`${url}/rest/v1/rpc/sync_initiatives`, {
  method: "POST",
  headers: { apikey: anon, Authorization: `Bearer ${anon}`, "Content-Type": "application/json" },
  body: JSON.stringify({ p_token: token }),
});
const text = await res.text();
if (!res.ok) { console.error(`Kunde inte hämta initiativ (${res.status}): ${text}`); process.exit(1); }

const okUrl = s => /^https?:\/\/[^\s"<>]+$/.test(s || "") ? s : "";
const list = (JSON.parse(text) || []).map(i => ({
  key: String(i.key), name: String(i.name || ""), short: String(i.short || i.name || ""),
  region: String(i.region || ""), site: okUrl(i.site), url: okUrl(i.url) || okUrl(i.site),
})).filter(i => i.name && (i.site || i.url));

const out = new URL("../data/initiativ.json", import.meta.url);
writeFileSync(out, JSON.stringify({ initiatives: list }, null, 1) + "\n");
console.log(`${list.length} initiativ tillagda på sidan skrivna till data/initiativ.json`);
