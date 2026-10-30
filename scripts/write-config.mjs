// Körs av Netlify vid varje publicering. Skriver public/config.js från miljövariablerna.
// Bara den publika anon-nyckeln hamnar i sidan – aldrig service_role.
import { writeFileSync } from "node:fs";

// Publika värden: projektets adress och anon-nyckeln är gjorda för att synas i sidan.
// Skyddet ligger i databasens behörigheter (RLS), inte i att nyckeln är hemlig.
const DEFAULT_URL = "https://nwtzxyuqbhichtqhhzdk.supabase.co";
const DEFAULT_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53dHp4eXVxYmhpY2h0cWhoemRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzNDgyMjEsImV4cCI6MjEwODkyNDIyMX0.17_QfVzfSZpK69_7wDfvQbz1PZAtk_4XZxdIFxlkU3g";

const url = process.env.SUPABASE_URL || DEFAULT_URL;
const anon = process.env.SUPABASE_ANON_KEY || DEFAULT_ANON;
const ai = !!process.env.ANTHROPIC_API_KEY;
const shared = (process.env.SHARED_LOGIN_EMAIL || "initiativtavlan@lfm30.se").toLowerCase();

if (!url || !anon) console.warn("VARNING: SUPABASE_URL eller SUPABASE_ANON_KEY saknas. Sidan kan inte logga in.");
function isSecretKey(k) {
  if (k.startsWith("sb_secret_")) return true;
  const parts = k.split(".");
  if (parts.length === 3) {
    try { return JSON.parse(Buffer.from(parts[1], "base64url").toString()).role === "service_role"; } catch { return false; }
  }
  return false;
}
if (isSecretKey(anon)) throw new Error("SUPABASE_ANON_KEY är en hemlig nyckel (service_role/secret). Använd den publika nyckeln. Avbryter.");

writeFileSync(
  new URL("../public/config.js", import.meta.url),
  `window.IT_CONFIG = ${JSON.stringify({ SUPABASE_URL: url, SUPABASE_ANON_KEY: anon, AI_ENABLED: ai, SHARED_LOGIN_EMAIL: shared })};\n`
);
console.log("config.js skriven. Claude-sammanfattning:", ai ? "på" : "av");
