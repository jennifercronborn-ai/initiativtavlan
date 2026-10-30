# Instruktion till schemalagd synk (Claude)

Den här texten är prompten för den schemalagda uppgiften "Synka Initiativtavlan". Den körs varje måndag morgon i en ny session med tillgång till det här repot.

---

Du synkar Initiativtavlan från klimatinitiativens egna webbplatser.

1. Läs listan `INIT` i `public/index.html`. För varje initiativ: läs kalendersidan (`url`) och nyhetssidan/startsidan (`site`) med WebFetch.
2. Plocka ut:
   - **Träffar** från idag och framåt → `events`: `title`, `date` (ÅÅÅÅ-MM-DD), `time` (t.ex. "09.00–12.00" eller tomt), `place`, `initiative` (nyckeln), `theme` (exakt en sträng från `THEMES`, eller tomt), `url` (länk till träffen eller kalendersidan), `open` (true bara om sidan säger att externa är välkomna), `source: "auto"`.
   - **Nyheter** publicerade de senaste 60 dagarna → `news`: `title`, `date`, `initiative`, `theme`, `url`, `source: "auto"`. Ta med `img` bara om nyheten har en egen bild-URL.
   - **Material & verktyg** som publicerats de senaste 60 dagarna → `resources`: `title`, `initiative`, `type` (exakt en av "Guide", "Vägledning", "Metod", "Verktyg", "Mall", "Rapport", "Handbok", "Webbinarium", "Upprop"), `theme`, `year`, `description` (en mening med egna ord, max 20 ord), `url`, `source: "auto"`. Leta på sidor som Publikationer, Rapporter, Kunskapsbank, Verktyg eller Material. Klimat 2030 har även material på https://samhallsbyggnad.lindholmen.se/sv/projekt/klimat-2030-vastra-gotaland-staller-om. Samma länk läggs aldrig in två gånger.
   - **Källstatus** per initiativ → `sources`: `id` (= initiativnyckeln), `status` ("ok" eller "fel"), `lastSync` (nu, ISO-tid), `note` (kort om kalendern, t.ex. "3 kommande träffar" eller "Sidan saknar kalender"), `newsNote`.
3. Regler: ta bara med det som faktiskt står på sidorna. Hitta inte på datum, tider eller platser. Hoppa över det du är osäker på. Ingen sammanfattande eller värderande text – bara rubrik och länk tillbaka.
4. Kontrollera innan du skriver: varje `theme` är exakt en sträng ur `THEMES` eller tom, inga träffar före dagens datum, giltig JSON. Max 15 träffar, 6 nyheter och 4 nya material per initiativ.
5. Skriv allt till `data/sync/<dagens datum>.json` i formatet `{ "events": [...], "news": [...], "resources": [...], "sources": [...] }`.
6. Committa filen direkt på `main` med meddelandet "Synk <datum>: X träffar, Y nyheter, Z material" och pusha. GitHub Action "Synka till Initiativtavlan" läser då in den automatiskt (kräver hemligheten `SYNC_TOKEN`).
7. Avsluta med en kort sammanställning per initiativ: antal träffar, antal nyheter och vilka sidor som inte gick att läsa.

Synken lägger bara till och uppdaterar automatiskt hämtade träffar, nyheter, material och källstatus. Arbetsgrupper och profiler kommer från initiativen själva (enkät eller manuellt) och rörs inte. Manuellt inlagt innehåll rörs aldrig, och inget tas bort.
