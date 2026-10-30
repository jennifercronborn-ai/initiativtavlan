# Synkfiler

Hit skriver den schemalagda Claude-uppgiften en fil per körning, t.ex. `2026-11-02.json`.
När filen hamnar på `main` läser GitHub Action "Synka till Initiativtavlan" in den i Supabase.

Format: se `scripts/import.mjs`. Allt som hämtas automatiskt märks `"source": "auto"`
och länkar tillbaka till initiativets egen sida. Manuellt innehåll skrivs aldrig över.
