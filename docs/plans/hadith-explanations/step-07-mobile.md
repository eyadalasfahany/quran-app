# Step 7: hadith explanations on the device (brief)

ADR 0078, plan `docs/plans/hadith-explanations.md`. The API side is committed (`fa7b4247`). Approved frames: `screens/frames/hadith/HadithCollReaderExplained.html` (also `.Dark`, `.English`), `HadithCollReaderTwoExplanations.html`, `HadithCollExpandedReaderExplained.html`. The card component already exists: `apps/mobile/src/features/hadith/components/HadithExplanationCard.tsx` (exports `HadithExplanationView`).

## Pack the server sends (group `hadith_explanations`, one resource per source; today one: HadeethEnc)

Pack tables, from `apps/api/app/Domains/Content/Packs/PackSchema.php` `hadithExplanations()` / `hadithExplanationLinks()`:

- `hadith_explanations`: `resource_id` INTEGER, `id` INTEGER, `title_ar` TEXT?, `attribution_ar` TEXT?, `reference_ar` TEXT?, `body_ar` TEXT?, `benefits_ar` TEXT? (a JSON list of strings), `words_ar` TEXT? (a JSON list of `{word, meaning}`), `intro_ar` TEXT?, `source_url` TEXT. PK (`resource_id`, `id`).
- `hadith_explanation_links`: `resource_id` INTEGER, `collection_slug` TEXT, `hadith_number` TEXT, `explanation_id` INTEGER. PK over all four.

## Work

1. **content.db**:
   - Add both tables to `src/core/db/content/schema.ts` (Drizzle), with the same columns and PKs, plus an index on links (`collection_slug`, `hadith_number`).
   - Generate migration `0016` with drizzle-kit, following how `0012_hadith_tables.sql` was added.
   - Check that the generated SQL only creates these two tables and the index; drizzle once tried to re-add an old column, and if so hand-fix the SQL.
   - Update `migrations.js` and the meta journal as drizzle-kit does.
2. **Sync mirror**:
   - In `src/core/sync/content-tables.ts`, add `'hadith_explanations'` to `PackGroup`.
   - Add a group entry with both tables, modelled on the `hadith_collections` entry: the table list, the delete-by-resource statements, and entities only if that structure requires them.
   - In `src/core/sync/install-resource.ts`, treat `hadith_explanations` like `hadith_collections`: `keepOnDemand(deps.db, [resource.id])`.
3. **Catalogue**:
   - Explanation resources must never appear as a collection: on the hadith home, in downloads or in search.
   - Check every place that lists hadith catalogue resources (`content-repository.ts`, `useHadithCatalog`) and filter by group `hadith_collections` if they don't already.
4. **Install by default**:
   - The user asked for explanations shown by default, with nothing to tap.
   - When at least one hadith collection is installed and an explanation resource in the catalogue is not, start its install in the background through the same install path the collection downloads use (`useHadithDownloads` / `installResource`).
   - Only when online, honouring the Wi-Fi-only setting the collection downloads honour.
   - Put it in a hook, e.g. `useEnsureHadithExplanations()` in `src/features/hadith/hooks/`, mounted once in the hadith home and reader screens.
   - No UI for it, and no error shown on failure: it retries on the next mount.
5. **Repository and hook**:
   - In `src/features/hadith/data/` add `explanationsFor(db, slug, hadithNumber)`: a join of links to explanations, ordered by explanation `resource_id`, then `id`.
   - It returns `HadithExplanationView[]`:
     - `sourceName`: the explanation resource's catalogue name in the UI language (`catalog_resources` name; look at how collection names are read).
     - `explanation`: `body_ar`.
     - `benefits`: parsed `benefits_ar`.
     - `wordMeanings`: parsed `words_ar`.
     - `intro`: `intro_ar`.
   - A JSON parse failure gives `null` for that field, never a throw.
   - Skip a row whose `body_ar` is null **and** which has no benefits or word meanings.
   - Add a live hook `useHadithExplanations(slug, hadithNumber)` next to `useHadithReader`, built the same way.
   - Text is passed through byte-for-byte: no trim, no normalisation.
6. **Reader**:
   - In `HadithReaderContent` (phone) render one `HadithExplanationCard` per explanation, under the hadith card, separated by the same gap as in the frame, inside the same scroll.
   - In the expanded reader, render them in the side panel as `HadithCollExpandedReaderExplained` shows.
   - No explanations: render nothing, with no empty state.
   - Placeholder («غير متوفر») rows show no explanations.
   - Screens only compose: any new wrapper with its own style is a component file with its own test.
7. **Tests**, following the existing files:
   - the migration test (`content-migration.test.ts` style);
   - the install of the new group through pack fixtures (`__fixtures__/pack-test-helpers.ts`);
   - the repository: ordering, JSON parse failure, skipped empty rows, byte-exact body;
   - the hook;
   - the ensure-install hook: online/offline, Wi-Fi-only, already installed, no collection installed;
   - the reader: explanations shown, none shown, Arabic and English, two sources stacked.
   - Fixtures use placeholder text only (e.g. «نص تجريبي»), never real hadith or explanation text.

## Rules

- No new dependency.
- Don't touch `apps/api`, `screens/`, `tools/` or `CLAUDE.md`.
- Don't commit.
- Hadith text never centred: the card already handles this.
- Tokens via `useTheme()`, no raw hex. i18n keys only.

## Gates (from `apps/mobile`)

Run `npm run lint && npx tsc --noEmit && npm test`. All must pass. Report:
- the files changed;
- the migration SQL;
- the test counts;
- any deviation from this brief, with the reason.
