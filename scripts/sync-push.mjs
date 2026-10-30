// Skickar en synkfil till Initiativtavlan.
// Användning:  SYNC_TOKEN=... node scripts/sync-push.mjs data/sync/2026-11-02.json
// Använder bara den publika anon-nyckeln + synknyckeln (se supabase/sync.sql).
// Ingen Supabase-hemlighet behövs.
import { readFileSync } from "node:fs";

const file = process.argv[2];
const token = process.env.SYNC_TOKEN;
if (!file || !token) { console.error("Ange synkfil och SYNC_TOKEN."); process.exit(1); }

// Samma publika värden som sidan använder
const cfgSrc = readFileSync(new URL("./write-config.mjs", import.meta.url), "utf8");
const url = process.env.SUPABASE_URL || cfgSrc.match(/DEFAULT_URL = "([^"]+)"/)[1];
const anon = process.env.SUPABASE_ANON_KEY || cfgSrc.match(/DEFAULT_ANON = "([^"]+)"/)[1];

const payload = JSON.parse(readFileSync(file, "utf8"));
const res = await fetch(`${url}/rest/v1/rpc/sync_import`, {
  method: "POST",
  headers: { apikey: anon, Authorization: `Bearer ${anon}`, "Content-Type": "application/json" },
  body: JSON.stringify({ p_token: token, p_payload: payload }),
});
const text = await res.text();
if (!res.ok) { console.error(`Synken misslyckades (${res.status}): ${text}`); process.exit(1); }
console.log(`${file}: ${text}`);
