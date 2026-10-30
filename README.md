# Initiativtavlan – live

Gemensamt arbetsrum för kanslierna i Sveriges lokala och regionala klimatinitiativ inom bygg och anläggning. Sidan är **samma sida som Claude-artefakten**, med tre ändringar:

| Ändrat | Före (artefakt) | Nu (live) |
|---|---|---|
| Inloggning | Lösenordet stod i sidans kod | Gemensamt lösenord som kontrolleras av Supabase (inte synligt i koden) |
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
| Lägg till personliga konton (valfritt, senare) | `scripts/invite.mjs` |
| Läs in data (flytt + synk) | `scripts/import.mjs` |
| Veckosynk | `data/sync/SYNK-INSTRUKTION.md` + `.github/workflows/synk.yml` |

## Roller

| Roll | Behöver Claude? | Kan |
|---|---|---|
| Alla med lösenordet | Nej | Se allt, lägga lappar, rösta, lägga till träffar/länkar, ladda upp avstämningar |
| Redaktör för synken | Nej | Granska och merga veckans synk-PR (kräver GitHub) |
| Admin | Nej | Byta lösenord och se ändringsloggen i Supabase |
| Kodredigerare | Ja | Ändra sidan via Claude Code → PR → förhandsvisning → publicering |

---

## Uppstart – checklista

Gör stegen i ordning. Kryssa i statusdokumentet i Claude-projektet.

### 1. GitHub
- [ ] Skapa **privat** repo `initiativtavlan` (personligt konto under piloten – se fallgrop 1 i receptet).
- [ ] Ladda upp innehållet i den här mappen.
- [ ] Settings › Collaborators: lägg till Claudes GitHub-konto.
- [ ] Settings › Secrets and variables › Actions: `SYNC_TOKEN` (synknyckeln, se steg 6).

### 2. Supabase
- [ ] Nytt projekt `initiativtavlan`, region **Stockholm (eu-north-1)**.
- [ ] SQL Editor: kör `supabase/schema.sql`.
- [ ] Authentication › Users › Add user › **Create new user**: e-post `initiativtavlan@lfm30.se`, det gemensamma lösenordet, kryssa i **Auto Confirm User**.
- [ ] Authentication › Sign In / Providers: **Allow new users to sign up: av.**
- [ ] Authentication › URL Configuration: Site URL `https://initiativtavlan.netlify.app`.
- [ ] Project Settings › API Keys › Legacy API keys: kopiera anon- och service_role-nyckeln.

### 3. Netlify
- [ ] Add new project › Import from GitHub › välj repot. Build-inställningarna läses från `netlify.toml`.
- [ ] Environment variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (används bara av serverfunktionen).
- [ ] Valfritt: `ANTHROPIC_API_KEY` (+ ev. `ANTHROPIC_MODEL`) för "Spara och sammanfatta". Utan nyckel sparas avstämningar som text.
- [ ] Kontrollera att Deploy Previews för pull requests är på.
- [ ] Byt site-namn till t.ex. `initiativtavlan` och uppdatera URL:erna i Supabase steg 2.

### 4. Flytta data från artefakten
- [ ] Be Claude, i kontot där artefakten skapades: *"Exportera all data i artefakten Initiativtavlan (alla samlingar) till en JSON-fil med en lista per samling och id på varje objekt."*
- [ ] Kör `node --env-file=.env scripts/import.mjs export.json --replace` lokalt, eller be Claude Code göra det.

### 5. Dela lösenordet
- [ ] Skicka länken och lösenordet till kanslierna (inte i samma kanal som publiceras öppet).
- [ ] Byt lösenord vid behov: Supabase › Authentication › Users › `initiativtavlan@lfm30.se`.

### 6. Veckosynk
- [ ] Kör `supabase/sync.sql` i SQL Editor och sätt synknyckelns hash (se längst ned i filen).
- [ ] Lägg synknyckeln som `SYNC_TOKEN` i GitHub › Settings › Secrets and variables › Actions.
- [ ] Schemalagd Claude-uppgift (måndagar) med texten i `data/sync/SYNK-INSTRUKTION.md`.
- [ ] Bestäm vem som granskar och mergar synk-PR:en varje vecka.

Synknyckeln kan bara lägga in automatiskt hämtade träffar, nyheter och källstatus – aldrig ändra eller ta bort manuellt innehåll. Supabase hemliga nyckel behövs inte för synken.

## Arbetssätt efter start

| Moment | Så går det till |
|---|---|
| Ändra sidan | Be Claude Code göra ändringen → branch → PR → testa i förhandsvisningen → merga |
| Ny person | Ge dem länken och lösenordet |
| Lösenordet har spridits för brett | Byt lösenord på det gemensamma kontot i Supabase och dela det nya |
| Något försvann | Admin tittar i `audit_log` i Supabase (när och gammalt värde; alla syns som det gemensamma kontot) |
| Veckosynk | Granska PR:en "Synk <datum>" → merga → syns på tavlan inom ett par minuter |

## Kör lokalt
```
npm install
cp .env.example .env   # fyll i
npm run config         # skriver public/config.js
npx serve public       # öppna http://localhost:3000
```
(Lägg `http://localhost:3000/**` i Supabase Redirect URLs om du testar inloggningslänken lokalt.)
