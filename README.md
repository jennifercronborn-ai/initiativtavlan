# Initiativtavlan – live

Gemensamt arbetsrum för kanslierna i Sveriges lokala och regionala klimatinitiativ inom bygg och anläggning. Sidan är **samma sida som Claude-artefakten**, med tre ändringar:

| Ändrat | Före (artefakt) | Nu (live) |
|---|---|---|
| Inloggning | Gemensamt lösenord | E-post + 6-siffrig kod, bara inbjudna |
| Delad data | Claude-artefaktens databas | Supabase (Stockholm) med ändringslogg |
| Sammanfatta avstämning | Claude i artefakten | Netlify-funktion mot Claude API (valfri) |

Allt annat – vyer, design, filter, anslagstavla, Klimattinget, initiativprofiler – är oförändrat.

## Så hänger det ihop

```
Initiativens webbplatser
        │  (varje måndag)
        ▼
Schemalagd Claude-uppgift ──► data/sync/<datum>.json ──► Pull request ──► Redaktör mergar
                                                                               │
                                                     GitHub Action "Synka" ◄───┘
                                                               │
Inloggade kanslier ◄── Netlify (sidan) ◄── Supabase (docs, members, audit_log)
```

| Del | Fil |
|---|---|
| Sidan | `public/index.html` |
| Koppling sida ↔ Supabase | `public/claude-shim.js` |
| Databas, behörigheter, logg | `supabase/schema.sql` |
| Claude-sammanfattning | `netlify/functions/sample.mjs` |
| Bjud in personer | `scripts/invite.mjs` |
| Läs in data (flytt + synk) | `scripts/import.mjs` |
| Veckosynk | `data/sync/SYNK-INSTRUKTION.md` + `.github/workflows/synk.yml` |

## Roller

| Roll | Behöver Claude? | Kan |
|---|---|---|
| Läsare | Nej | Se allt, lägga lappar, rösta, lägga till träffar/länkar |
| Redaktör | Nej | Som läsare + granska och merga synk-PR:er (kräver GitHub) |
| Admin | Nej | Som redaktör + bjuda in, se ändringsloggen |
| Kodredigerare | Ja | Ändra sidan via Claude Code → PR → förhandsvisning → publicering |

---

## Uppstart – checklista

Gör stegen i ordning. Kryssa i statusdokumentet i Claude-projektet.

### 1. GitHub
- [ ] Skapa **privat** repo `initiativtavlan` (personligt konto under piloten – se fallgrop 1 i receptet).
- [ ] Ladda upp innehållet i den här mappen.
- [ ] Settings › Collaborators: lägg till Claudes GitHub-konto.
- [ ] Settings › Secrets › Actions: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

### 2. Supabase
- [ ] Nytt projekt `initiativtavlan`, region **Stockholm (eu-north-1)**.
- [ ] SQL Editor: kör `supabase/schema.sql`.
- [ ] Kör raden längst ned i schemat med din egen adress (första admin).
- [ ] Authentication › Sign In / Providers › Email: på. **Allow new users to sign up: av.**
- [ ] Authentication › URL Configuration:
  - Site URL: `https://<site>.netlify.app`
  - Redirect URLs: `https://<site>.netlify.app/**` och `https://deploy-preview-*--<site>.netlify.app/**`
- [ ] Authentication › Emails › Magic Link: lägg in `{{ .Token }}` i mallen så koden syns (kräver egen SMTP, steg 4).
- [ ] Project Settings › API: kopiera Project URL, publika nyckeln (anon/publishable) och service_role-nyckeln.

### 3. Netlify
- [ ] Add new project › Import from GitHub › välj repot. Build-inställningarna läses från `netlify.toml`.
- [ ] Environment variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (används bara av serverfunktionen).
- [ ] Valfritt: `ANTHROPIC_API_KEY` (+ ev. `ANTHROPIC_MODEL`) för "Spara och sammanfatta". Utan nyckel sparas avstämningar som text.
- [ ] Kontrollera att Deploy Previews för pull requests är på.
- [ ] Byt site-namn till t.ex. `initiativtavlan` och uppdatera URL:erna i Supabase steg 2.

### 4. E-post (SMTP)
- [ ] Sätt upp e-posttjänst och verifiera avsändardomän (t.ex. `noreply@lfm30.se`).
- [ ] Supabase › Authentication › Emails › SMTP Settings: fyll i.
- [ ] Testa: logga in med din adress, kontrollera att koden kommer fram.

### 5. Flytta data från artefakten
- [ ] Be Claude, i kontot där artefakten skapades: *"Exportera all data i artefakten Initiativtavlan (alla samlingar) till en JSON-fil med en lista per samling och id på varje objekt."*
- [ ] Kör `node --env-file=.env scripts/import.mjs export.json --replace` lokalt, eller be Claude Code göra det.

### 6. Bjud in pilot
- [ ] Fyll i `inbjudningar.csv` (`email,namn,initiativ,roll`).
- [ ] Kör `node --env-file=.env scripts/invite.mjs inbjudningar.csv`.
- [ ] Skicka länken till sidan. Personerna loggar in med sin e-post.

### 7. Veckosynk
- [ ] Skapa en schemalagd uppgift i Claude (måndagar 06:00) med texten i `data/sync/SYNK-INSTRUKTION.md` och åtkomst till repot.
- [ ] Bestäm vem som granskar och mergar synk-PR:en varje vecka.

## Arbetssätt efter start

| Moment | Så går det till |
|---|---|
| Ändra sidan | Be Claude Code göra ändringen → branch → PR → testa i förhandsvisningen → merga |
| Ny person | Lägg till rad i CSV och kör invite-skriptet (eller lägg in i `members` i Supabase) |
| Någon slutar | Ta bort raden i `members` – inloggningen slutar fungera direkt |
| Något försvann | Admin tittar i `audit_log` i Supabase (vem, när, gammalt värde) |
| Veckosynk | Granska PR:en "Synk <datum>" → merga → syns på tavlan inom ett par minuter |

## Kör lokalt
```
npm install
cp .env.example .env   # fyll i
npm run config         # skriver public/config.js
npx serve public       # öppna http://localhost:3000
```
(Lägg `http://localhost:3000/**` i Supabase Redirect URLs om du testar inloggningslänken lokalt.)
