# Initiativtavlan – instruktioner för Claude

Live-sida för klimatinitiativens kanslier: https://initiativtavlan.netlify.app
Ägare: LFM30 (Jennifer Cronborn). Redigerare: Jennifer och Amanda (LFM30).

## Så hänger det ihop
- `public/index.html` – hela sidan (samma som Claude-artefakten). Det är här de flesta ändringar görs.
- `public/claude-shim.js` – kopplar sidans `window.claude.use("db" | "user" | "sample")` till Supabase. Ändra bara om datalagret ska ändras.
- `scripts/write-config.mjs` – skriver `public/config.js` vid publicering (publik projektadress och anon-nyckel).
- `supabase/*.sql` – databasschema och synkfunktion. Ändringar här måste också köras i Supabase › SQL Editor av någon med åtkomst.
- `data/sync/` – synkfiler från initiativens **webbplatser** (offentligt material). Se `SYNK-INSTRUKTION.md`.
- `netlify/functions/sample.mjs` – valfri Claude-sammanfattning av avstämningar.

## Arbetssätt
1. Gör varje ändring på en egen branch och öppna en pull request till `main`.
2. Netlify bygger en förhandsvisning för pull requesten. Testa där (lösenordet får du av LFM30:s kansli).
3. Merga först när ändringen är granskad. Då publiceras den automatiskt.
4. Skriv commit- och PR-texter på svenska och beskriv vad som ändrats för användaren.

## Regler
- **Repot är publikt.** Lägg aldrig in lösenord, nycklar, e-postadresser, personnamn eller enkätsvar här. Enkätdata och kontaktuppgifter läses in direkt i databasen.
- Ändra inte inloggningen, `claude-shim.js` eller RLS-reglerna utan att Jennifer godkänt det.
- Behåll designen (färgtoken i `:root`, ljust/mörkt läge, mobil). Följ befintliga mönster i `index.html`.
- Teman och materialtyper är fasta listor (`THEMES`, `RTYPES` i `index.html`). Ändras de måste befintlig data i Supabase ses över.
- Innehåll (träffar, material, lappar) ändras på sidan, inte i koden.
- Testa efter ändring: öppna sidan, logga in, gå igenom alla vyer och kontrollera konsolen efter fel.
