# Step 7 — Device content database and the Tanzil seed (App)

Follow [README.md](README.md), especially the **shared contract** table: device tables use the same columns as packs. Needs step 5 committed. Read also:
- `apps/mobile/CLAUDE.md`.
- Spec §4 ("Where state lives"; cold start under 1.5 s).
- Spec §6 (`content.db`, "Packs and the first launch"; the deviations below are ADR 0009).
- Non-negotiables #1 and #3: **only Tanzil text is bundled, never QF data**.

**Goal:**
- `content.db` opens with Drizzle migrations.
- On first launch, the Tanzil seed (chapters + 6,236 verses) is copied into it.
- The reader can query verses offline.
- **Not in this step:** `user.db` (deferred to Phase 4, ADR 0009), pack downloads (step 8), and any UI.

## Dependencies

| Package | How | Version |
| --- | --- | --- |
| `expo-sqlite` | `npx expo install expo-sqlite` | Expo's pin (~58.0.14) |
| `drizzle-orm` | `npm install drizzle-orm@0.45.4 -w @quran/mobile` | 0.45.4 (version table) |
| `drizzle-kit` | dev dependency | 0.31.11 (version table) |
| `babel-plugin-inline-import` | dev dependency | 3.0.0. **Add a row to the `docs/content-plan.md` version table:** "Inlines Drizzle's `.sql` migrations into the bundle" |

Also add:
- **`babel.config.js`:** `babel-preset-expo` plus `['inline-import', { extensions: ['.sql'] }]`. Keep whatever the Expo preset already needs (Reanimated/worklets), and check the existing Jest config still works.
- **`metro.config.js`:** `getDefaultConfig` from `expo/metro-config`, with `resolver.sourceExts` += `sql` and `resolver.assetExts` += `db`.
- **`drizzle.config.ts`:** `dialect: 'sqlite'`, `driver: 'expo'`, schema `src/core/db/content/schema.ts`, out `src/core/db/content/migrations`.
- **Script:** `"db:generate": "drizzle-kit generate"`. Commit the generated migration files.

## Schema (`src/core/db/content/schema.ts`, Drizzle `sqliteTable`)

**From the Tanzil seed:**
- `meta`: `key` TEXT PK, `value` TEXT.
- `chapters`: `id` int PK, `name_arabic`, `name_simple`, `name_en`, `revelation_place` (`makkah`|`madinah`), `revelation_order` int, `verses_count` int, `bismillah_pre` int (0/1), `page_start` int, `page_end` int.
- `verses`:
  - `id` int PK (1–6,236, in Mushaf order)
  - `verse_key` TEXT unique
  - `chapter_id`, `verse_number`, `juz`, `hizb`, `rub_el_hizb`, `page` (all int)
  - `sajdah` (`none`|`recommended`|`obligatory`)
  - `text_uthmani` TEXT not null
  - `text_uthmani_tajweed`, `text_indopak`, `text_imlaei`: TEXT **nullable**
  - `text_search` TEXT not null
  - Indexes: `page`, (`chapter_id`,`verse_number`)
- `search_quran`: an FTS5 virtual table (`verse_id` UNINDEXED, `text_search`, `tokenize='unicode61 remove_diacritics 2'`). Drizzle doesn't model FTS5, so create it in a **custom migration** (`drizzle-kit generate --custom`) and fill it from `verses` after the seed import.

**From packs:**
- `installed_resources`: `resource_id` int PK, `group` TEXT, `version` int, `sha256` TEXT, `last_checked_at` int (ms), `change_cursor` TEXT null.
- The shared-contract tables: `translation_entries`, `tafsir_entries`, `mushafs`, `mushaf_pages`, `word_layouts`, `recitations`, `chapter_audio_files`, `recitation_timings`. Same columns and primary keys as the pack schema in step 6.
- Indexes: `word_layouts` (`mushaf_id`,`page`,`line`); `tafsir_entries` (`resource_id`,`first_verse_id`).
- **Not yet:** `words`, `word_translations`, `search_study` and the hadith tables arrive with their phases.

## Text normalization (shared)

`packages/quran-text-check/src/normalize.ts`, `normalizeForSearch(text: string): string`. This is the only derived text (spec §7, item 7):
- **Remove:** Arabic diacritics U+064B–U+065F, superscript alef U+0670, the Quranic annotation marks U+06D6–U+06ED, tatweel U+0640, and the `۞` (U+06DE) and `۩` (U+06E9) signs.
- **Map:** U+0622/0623/0625/0671 (آ أ إ ٱ) → U+0627 (ا); U+0649 (ى) → U+064A (ي); U+0629 (ة) → U+0647 (ه).
- **Whitespace:** collapse runs to one space, and trim.
- **Tests:** exact expected outputs for 1:1 and 2:255's first words, plus each rule on its own.

## The seed (`apps/mobile/scripts/build-content-seed.mjs` → `apps/mobile/assets/db/tanzil-seed.db`)

A Node script (Node 26 `node:sqlite`, no new dependency). It is deterministic, and its output is committed.
1. Load the data with `loadTanzil()` from `@quran/quran-text-check`. If `verifyTanzil().ok` is false, **abort** with the failures.
2. Create the database with **only** `meta`, `chapters` and `verses`, using the same columns as the Drizzle schema. The seed is a **source to copy from**, not `content.db` itself; it has no migration table.
3. **`chapters`** from the metadata suras:
   - `name_arabic` = name, `name_simple` = tname, `name_en` = ename.
   - `revelation_place` = `makkah` if type is `Meccan`, else `madinah`.
   - `revelation_order` = order, `verses_count` = ayas.
   - `bismillah_pre` = 1 except for suras 1 and 9.
   - `page_start` and `page_end` from the `pages` start points.
4. **`verses`:**
   - `id` = running index 1…6,236, `verse_key` = `"{sura}:{aya}"`.
   - `juz`, `hizb` (`ceil(quarter / 4)`), `rub_el_hizb` (quarter 1–240) and `page`: each from the last start point at or before the verse.
   - `sajdah` from the sajdas list (`recommended` or `obligatory`), else `none`.
   - `text_uthmani` = the Tanzil text **unchanged**.
   - `text_search` = `normalizeForSearch(text_uthmani)`.
   - The other text columns are null.
5. **`meta`:** `seed_schema_version` = `1`, `bundled_text` = `tanzil-uthmani-1.1`, `text_checksum` = `TANZIL_UTHMANI_CHECKSUM`, `source_credit` = `Tanzil Project — tanzil.net (CC BY 3.0)`.
6. `VACUUM`, then write `assets/db/tanzil-seed.db`.

Add `"seed:build": "node scripts/build-content-seed.mjs"` to the mobile `package.json`.

## Runtime (`src/core/db/content/`)

**`open.ts`:**
- `openContentDb()` opens `content.db` with `expo-sqlite` (`openDatabaseSync`), sets `PRAGMA journal_mode = WAL` and `PRAGMA foreign_keys = ON`, and wraps it with `drizzle(…)`.
- Export a **`useContentDb()`** hook that runs migrations (`useMigrations` from `drizzle-orm/expo-sqlite/migrator`), then `importSeedIfNeeded`, and returns `{ ready, error }`.

**`seed.ts`, `importSeedIfNeeded(db, seed: SeedSource)`:**
- If `meta.bundled_text` is set, or `verses` already has rows, do nothing.
- **Otherwise:**
  1. Copy the bundled asset into the SQLite directory (`SQLite.importDatabaseFromAssetAsync('tanzil-seed.db', { assetId: require('@/assets/db/tanzil-seed.db') })`).
  2. `ATTACH` it as `seed`.
  3. In **one transaction**: `INSERT INTO chapters SELECT … FROM seed.chapters`, the same for `verses`, `INSERT INTO search_quran(verse_id, text_search) SELECT id, text_search FROM verses`, and copy the `meta` rows.
  4. `DETACH`.
- The function depends on a small `SqlExecutor` interface (`exec`, `run`, `get`, `all`, `transaction`), so it's testable outside React Native.

**Splash:** the root layout (`app/_layout.tsx`) keeps the splash up until `useContentDb().ready`, as it already does for fonts and direction. On error, log it and show the app anyway; the reader handles an empty database later.

**Verse query:** `src/core/db/content/verses.ts` with `getVerse(db, verseKey)` and `getVersesByPage(db, page)`. Phase 2's reader builds on these.

## Tests

Jest. React Native SQLite can't run in Jest, so tests use a `node:sqlite`-backed `SqlExecutor`. Put it in `apps/mobile/jest/node-sqlite-executor.ts`.

- **Seed builder** (run the script against a temp output path, inside the test):
  - 114 chapters, 6,236 verses.
  - `ayahChecksum` over `text_uthmani` in `id` order equals `TANZIL_UTHMANI_CHECKSUM`.
  - 2:255 has `juz` 3, `page` 42 and `id` 262.
  - Exactly 15 verses with `sajdah != 'none'`.
  - `meta.bundled_text` is set.
  - The seed contains no tables other than `meta`, `chapters` and `verses` (no QF data).
- **The committed `assets/db/tanzil-seed.db`:** identical content to a fresh build (compare row checksums, not file bytes).
- **`importSeedIfNeeded`:**
  - It copies everything into an empty, migrated database.
  - It's a no-op on the second run.
  - A failure in the middle (a thrown error inside the transaction) leaves no partial rows.
  - `search_quran` matches `الحمد` for 1:2.
- **Migrations:** the generated SQL applies cleanly to an empty `node:sqlite` database.
- **`normalizeForSearch`:** the package tests above.

## Gates

The mobile gates, plus `npm run typecheck` and `npm test -w @quran/quran-text-check`, plus `node .github/scripts/npm-audit.mjs` (dependencies changed).

## Reviewer check (not for the agent)

`npx expo prebuild --clean` (the app was renamed in Phase 0), `npx expo run:ios`. In airplane mode, a dev-only log on start prints 2:255's `verse_key` and page. Remove the log before committing, or keep it behind `__DEV__`.

## Leave untouched

`apps/api`, the API contract, the navigation shell and screens (only `app/_layout.tsx` changes, for the readiness gate), and the i18n strings.
