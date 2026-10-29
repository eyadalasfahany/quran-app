# Step 6b — Reciter style in the catalogue

Follow [README.md](README.md). Needs step 6. Found on the iPhone 17 (developer, 29 Oct 2026): the Listen tab shows a reciter's style tag («مرتّل») only after the pack is installed, because the style lives in `recitations`, which only an installed pack fills. The `#Reciters` frame draws the tag on every row, and the style chips («مرتّل», «مجوّد», «معلّم») hide reciters that aren't installed.

## Part 1: API and contract (developer's Mac)
1. **Manifest:** `ContentManifestEntryData` and `ContentManifestEntryResource` gain `style` (string, nullable, required in the schema). For `chapter_recitations` it is `recitations.style` as QF sends it in English («Murattal», «Mujawwad», «Muallim»). For every other group it is null. The recitation is already eager-loaded for `name_ar` (step 1b); keep it a single query.
2. **Tests (Pest):** a recitation's manifest entry carries its style; a tafsir's is null; a recitation with no style row is null; the query count doesn't grow.
3. **Contract:** `npm run generate -w @quran/api-contract`; commit `openapi.json` and `src/schema.d.ts`.
4. **Gate:** `cd apps/api && composer qa`.

## Part 2: device (after part 1's contract lands)
1. **`content.db` migration 0007:** nullable `style` text on `catalog_resources`. It also deletes the stored `manifest_etag`, as 0005 and 0006 do.
2. **Sync:** `writeCatalog` writes `style` (missing → null).
3. **`listReciters`:** returns `style`. It takes `recitations.style` when installed, else the catalogue's.
4. **Listen tab:** the style tag and the style chips use it, so every reciter shows its tag and filters by style before install. «للتعليم والتكرار» follows the same rule.
5. **Tests:** migration, sync, `listReciters`, and the Listen rows and chips for an uninstalled reciter.
6. **Gate:** the mobile gates.
