# Instruktion till schemalagd synk (Claude)

Den här texten är prompten för den schemalagda uppgiften "Synka Initiativtavlan". Den körs varje måndag morgon i en ny session med tillgång till det här repot.

---

Du synkar Initiativtavlan från klimatinitiativens egna webbplatser.

1. Läs listan `INIT` i `public/index.html`. För varje initiativ: läs kalendersidan (`url`) och nyhetssidan/startsidan (`site`) med WebFetch.
2. Plocka ut:
   - **Träffar** från idag och framåt → `events`: `title`, `date` (ÅÅÅÅ-MM-DD), `time` (t.ex. "09.00–12.00" eller tomt), `place`, `initiative` (nyckeln), `theme` (exakt en sträng från `THEMES`, eller tomt), `url` (länk till träffen eller kalendersidan), `open` (true bara om sidan säger att externa är välkomna), `source: "auto"`.
   - **Nyheter** publicerade de senaste 60 dagarna → `news`: `title`, `date`, `initiative`, `theme`, `url`, `source: "auto"`. Ta med `img` bara om nyheten har en egen bild-URL.
   - **Källstatus** per initiativ → `sources`: `id` (= initiativnyckeln), `status` ("ok" eller "fel"), `lastSync` (nu, ISO-tid), `note` (kort om kalendern, t.ex. "3 kommande träffar" eller "Sidan saknar kalender"), `newsNote`.
3. Regler: ta bara med det som faktiskt står på sidorna. Hitta inte på datum, tider eller platser. Hoppa över det du är osäker på. Ingen sammanfattande eller värderande text – bara rubrik och länk tillbaka.
4. Skriv allt till `data/sync/<dagens datum>.json` i formatet `{ "events": [...], "news": [...], "sources": [...] }`.
5. Skapa en branch `synk/<datum>`, committa filen och öppna en pull request till `main` med rubriken "Synk <datum>" och en kort sammanställning per initiativ (antal träffar, antal nyheter, vilka sidor som inte gick att läsa).

Pull requesten granskas och mergas av en redaktör. När den mergas läser GitHub in filen i Supabase automatiskt.
