// Bjuder in personer till Initiativtavlan.
// Användning:  node --env-file=.env scripts/invite.mjs inbjudningar.csv
// CSV med rubrikrad:  email,namn,initiativ,roll      (roll = admin | redaktor | lasare)
// Skapar inloggningskontot i Supabase och lägger till personen i members.
// Inget mejl skickas härifrån – personen loggar in själv med sin adress och får en kod.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const file = process.argv[2];
if (!file) { console.error("Ange en CSV-fil."); process.exit(1); }
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const [head, ...rows] = readFileSync(file, "utf8").trim().split(/\r?\n/);
const cols = head.split(",").map(s => s.trim().toLowerCase());
for (const line of rows) {
  const v = Object.fromEntries(line.split(",").map((s, i) => [cols[i], s.trim()]));
  const email = (v.email || "").toLowerCase();
  if (!email) continue;
  const role = ["admin", "redaktor", "lasare"].includes(v.roll) ? v.roll : "lasare";
  const { error: ce } = await sb.auth.admin.createUser({ email, email_confirm: true });
  if (ce && !/already/i.test(ce.message)) { console.error(email, "kunde inte skapas:", ce.message); continue; }
  const { error: me } = await sb.from("members").upsert({ email, name: v.namn || null, initiative: v.initiativ || null, role });
  console.log(me ? `${email}: FEL ${me.message}` : `${email}: klar (${role})`);
}
