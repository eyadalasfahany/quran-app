# Step 1b — Default reciter and Arabic reciter names

Follow [README.md](README.md). Needs step 1. Decision D2 (developer, 29 Oct 2026): option A, the API marks the default recitation from config by QF source id. Data from the prelive check in [`../phase-3.md`](../phase-3.md), "Prelive data".

**Why:** the device has no stable reciter key (ADR 0021). Our resource ids differ between prelive and production; QF's chapter reciter id doesn't. Afasy murattal is QF chapter reciter **7** (catalogue, 29 Oct 2026). Also, a recitation's `name_ar` is null in the manifest although `recitations.reciter_name_ar` has it, so the reciter list has no Arabic name until the pack is installed.

## Part 1: API and contract (run where PHP 8.5 and MySQL are: the developer's Mac)
1. **Config** (`apps/api/config/quran.php`): `'default_recitation' => 7`, a QF chapter reciter id (`resources.source_key` for group `chapter_recitations`), with a comment naming Mishari Rashid al-Afasy, Murattal.
2. **Serving** (`ContentDeliveryService`):
   - `servedArabicName`: for `chapter_recitations`, return the resource's `recitations.reciter_name_ar` when it isn't null, else `name_ar`. Eager-load the recitation for the manifest query (no N+1).
   - New `isDefault(Resource)`: true only for group `chapter_recitations` with `(int) source_key === config('quran.default_recitation')`.
3. **Manifest:** `ContentManifestEntryData` and `ContentManifestEntryResource` gain `is_default` (bool, required, false for every other resource). Update the docblock shape.
4. **Tests (Pest):**
   - The default recitation has `is_default: true`; another recitation and a tafsir have false.
   - Changing the config moves the flag, and the ETag changes.
   - A recitation's `name_ar` comes from `reciter_name_ar`, and is null without it.
   - The manifest query count doesn't grow with the number of recitations.
5. **Contract:** `npm run generate -w @quran/api-contract`. Commit `openapi.json` and `src/schema.d.ts`.
6. **Gate:** `cd apps/api && composer qa`.
7. **Husary:** resource 23 has no pack, so the manifest doesn't serve it. Run the pack build for it (the same command that built Afasy's) so the device sees two reciters. Record the command used in the report.

## Part 2: device (after part 1's contract lands)
1. **`content.db` migration 0006:** add `is_default` integer not null default 0 to `catalog_resources`. Delete the stored `manifest_etag`, as migration 0005 did, so the next sync rewrites the catalogue.
2. **Sync:** write `is_default` in the catalogue rewrite.
3. **`listReciters`:** return `isDefault`.
4. **Callers** pass `reciters.find(r => r.isDefault)?.resourceId ?? null` as `resolveReciterId`'s `defaultId`. Remove the `TODO(phase-3 D2)`.
5. **Tests:** migration, the sync write, `listReciters`, and the default fallback with a real flag.
6. **Gate:** the mobile gates.
