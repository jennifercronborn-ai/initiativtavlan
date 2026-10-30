// Läser in data till Initiativtavlan.
// Användning:  node --env-file=.env scripts/import.mjs <fil.json> [--replace]
//
// Filformat (samma samlingar som sidan använder):
// {
//   "events":   [{ "id": "valfritt", "title": "...", "date": "2026-11-12", "initiative": "lfm30", "source": "auto", ... }],
//   "news":     [ ... ],
//   "sources":  [{ "id": "lfm30", "status": "ok", "lastSync": "2026-10-30T06:00:00Z", "note": "..." }],
//   ...
// }
//
// Regler
//  - Objekt med "id" skrivs över/uppdateras (fälten slås ihop). Utan id skapas ett stabilt id
//    från initiativ + datum + titel, så att samma träff inte läggs in två gånger.
//  - Manuellt tillagt innehåll (source = "manuell") skrivs aldrig över av synken.
//  - --replace ersätter i stället hela objektet (används vid flytt från artefakten).
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const COLLECTIONS = ["events", "groups", "notes", "sources", "news", "network", "resources", "board", "profiles", "contacts", "ideas"];
const [file, flag] = process.argv.slice(2);
if (!file) { console.error("Ange en JSON-fil."); process.exit(1); }
const replace = flag === "--replace";
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const input = JSON.parse(readFileSync(file, "utf8"));
const stableId = (c, o) => c + "-" + createHash("sha1")
  .update([o.initiative, o.date || o.publishedAt || "", (o.title || o.name || "").toLowerCase().trim(), o.url || o.link || ""].join("|"))
  .digest("hex").slice(0, 16);

let n = 0, skipped = 0;
for (const [collection, list] of Object.entries(input)) {
  if (!COLLECTIONS.includes(collection)) { console.warn("Okänd samling hoppas över:", collection); continue; }
  for (const raw of list) {
    const { id: givenId, ...data } = raw;
    const id = String(givenId || stableId(collection, data));
    const { data: existing } = await sb.from("docs").select("data").eq("collection", collection).eq("id", id).maybeSingle();
    if (existing && existing.data?.source === "manuell" && !replace) { skipped++; continue; }
    const merged = existing && !replace ? { ...existing.data, ...data } : data;
    const { error } = await sb.from("docs").upsert({ collection, id, data: merged, updated_by: "synk" });
    if (error) { console.error(collection, id, error.message); continue; }
    n++;
  }
}
console.log(`Klart: ${n} objekt skrivna, ${skipped} manuella orörda.`);
