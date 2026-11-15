# Step 9b — Audio follows the reciter's riwayah (ADR 0090 decision 12)

On `main` in `/Applications/MAMP/htdocs/quran-app` (check with `git branch --show-current`; the work moved there from the worktree on 15 Nov 2026). Stage and commit nothing. Add no dependency.

The work has three parts, done in this order:

- **A. API:** a `riwayah` field on the content manifest, and the MP3Quran and Way2Quran importers taking the qirat from their source.
- **B. Contract and device data:** the reciter's riwayah reaches the reader.
- **C. Reciters list UI:** blocked until a frame is approved.

**Model:** Haiku, for A and B (developer rule; the plan names no stronger model for this step).

**Order with step 9:** do this after step 9 Part D, which carries the place back to the chosen mushaf when playback stops. Without it, the chosen non-Hafs list receives a raw Hafs key.

## Before you start

- Run `git status --short > /private/tmp/claude-501/-Applications-MAMP-htdocs-quran-app/45caaed8-c2a1-4fa5-a801-974871103e43/scratchpad/step9b-before.txt`.
  - The tree holds many uncommitted files from steps 2–9. Never revert, stage or edit them, except the files this brief names.
  - At the end, compare `git status --short` with the saved list. The new differences must be only this step's files, plus the regenerated `openapi.json` and `schema.d.ts`.
- Read `.claude/agent-rules.md`, root `CLAUDE.md`, `apps/api/CLAUDE.md` («Layering» and «Tests»), and `apps/mobile/CLAUDE.md`.
  - `apps/api/tests/Unit/ArchitectureTest.php` enforces layering: services use repository contracts, and repositories do persistence only.
- **No Quran text in fixtures.** Reciter names in API tests follow the existing tests. Any new placeholder reads `FIXTURE reciter 1`.

## Read first (every path checked 15 Nov 2026)

- `docs/adr/0090-madinah-svg-mushaf.md`, decision 12; `docs/adr/0061-mp3quran-reciters-hosted-on-r2.md`, decision 10 (only Hafs is shipped); `docs/adr/0074-way2quran-reciters-hosted-on-r2.md`.
- `docs/technical-spec.md`:
  - §5 «Audio» (the `recitations` row);
  - §9 «Content manifest», including the paragraph after the JSON;
  - §12 «Audio» and «Mushaf place».
- API:
  - `app/Domains/Content/Services/{ContentDeliveryService,Mp3QuranImporter}.php`;
  - `app/Domains/Content/Data/ContentManifestEntryData.php`;
  - `app/Domains/Content/Http/Resources/{ContentManifestEntryResource,ContentManifestResource}.php`;
  - `app/Domains/Content/Mp3Quran/{Mp3QuranManifest,Mp3QuranMoshaf,ReciterSource}.php`;
  - `app/Domains/Content/Console/ImportWay2QuranCommand.php`;
  - `app/Domains/Content/Sync/Handlers/ChapterRecitationsHandler.php` (`names()`, lines 297–320);
  - `app/Integrations/QuranFoundation/QfResponseParser.php` (`reciters()`, line 65);
  - `app/Domains/Content/Repositories/Eloquent/EloquentResourceRepository.php` (`activeWithPacks()` eager-loads `recitation` and `source`);
  - `config/quran.php` (lines 112–130) and `config/mushaf.php` (`editions`);
  - tests `tests/Feature/Content/{ContentDeliveryTest,Mp3QuranImportTest}.php` and `tests/Unit/Content/ReciterSourceTest.php`.
- Mobile:
  - `src/core/db/content/schema.ts` (`catalogResources`);
  - `src/core/db/content/migrations/0007_reciter_style.sql` (the precedent this step copies);
  - `src/core/sync/content-sync.ts` (`writeCatalog`, lines 403–433);
  - `src/core/sync/catalog-version.ts`;
  - `src/features/audio/data/reciters.ts` (`listReciters`, `CatalogReciter`);
  - `src/features/audio/playerStore.ts` (`reciterId` is the resource id; `status`);
  - `src/features/reader/mushaf-svg/shown-mushaf.ts` and its test;
  - `src/features/reader/screens/ReaderScreen.tsx` (lines 176–187).

## Where each source states the riwayah (facts)

| Source | Where the source states it | Where Taybah stores it today |
| --- | --- | --- |
| Quran Foundation | The reciter catalogue's `qirat.name`, for example `Hafs` (`QfResponseParser.php:65`) | `recitations.qirat`, set by `ChapterRecitationsHandler::names()`. It is null when the reciter is missing from QF's catalogue (`ContentHandlersTest.php:602`) |
| MP3Quran | The API's moshaf `rewaya_id` and the `riwayat` list. `tools/mp3quran-ingest/mp3quran_ingest/sources.py:56` refuses any moshaf that isn't Hafs, and line 72 writes the Arabic name, «حفص عن عاصم», to the committed manifest's `riwayah` field | `Mp3QuranManifest.php:102–111` reads `riwayah` and skips any value not in `quran.mp3quran_riwayat` (`['حفص عن عاصم']`). `Mp3QuranImporter.php:33` then stores the **constant** `QIRAT = 'Hafs'` (lines 158 and 324), ignoring the manifest value |
| Way2Quran | The file path's riwayah folder, `hafs-an-asim` (`tools/mp3quran-ingest/mp3quran_ingest/way2quran.py:32` and `201`), written to the manifest's `riwayah` field | The same parser and importer as MP3Quran (`ImportWay2QuranCommand.php:43–44`; `ReciterSource::way2quran()` uses `riwayahConfig: 'quran.mp3quran_riwayat'`) |

Other facts:

- **`recitations.qirat` already exists** (API migration `2026_10_27_143838_create_recitations_table.php`, `string(32)` nullable). It is in the reciter pack (`PackSchema.php:150`) and in the device's `content.db` `recitations` table. **No API migration is needed.**
- The manifest carries no riwayah today. `catalog_resources` has `style` but no riwayah, so a reciter that isn't installed can't show one.
- **The fingerprint risk.** `Mp3QuranImporter` puts `'qirat' => self::QIRAT` into each moshaf's fingerprint (line 324). Any change to the **stored value** would bump every MP3Quran and Way2Quran resource version and make every reader download those packs again. The stored value must stay exactly `Hafs`.
- **The hook point** (built in step 7):
  - `shownMushafKey({ chosen, playing, reciterRiwayah })` in `src/features/reader/mushaf-svg/shown-mushaf.ts`. While playing it returns `reciterRiwayah ?? 'hafs'`, and otherwise `chosen`.
  - It is called at `ReaderScreen.tsx` line 183 with `reciterRiwayah: null` and `playing: active`, where `active = status === 'playing' || status === 'loading'` (line 178).
  - When playback stops, it returns the chosen mushaf. Step 9 Part D carries the place.
- **Frames:** none shows a riwayah for a reciter (checked).
  - `screens/frames/salah/Reciters.html` (built as `design/audio/Reciters`, the Listen tab), `core/PlayerReciters.html` (the player's reciter sheet), `onboarding/OnboardReciter.html`, `core/PlayerReciterDownloading.html` and `loading/LoadingReciters.html` show the name and the style tag only.
  - So the list UI (Part C) needs a frame drawn and approved first (ADR 0087).

## Conflicts and gaps found (handled as written; the developer decides the open questions)

1. **ADR 0090 decision 12 says "MP3Quran and Way2Quran recordings carry theirs from their source".** The importer stores a constant instead.
   - It is correct today only because the parser drops every other riwayah.
   - A2 makes it come from the manifest, through a map, with the stored value unchanged.
2. **ADR 0090 says "QF reciters are Hafs", but QF's `qirat` can be null.** A1 serves `hafs` for a QF recitation whose `qirat` is null, as the ADR states. See Q4.
3. **`active` excludes `paused`.** Pausing therefore returns the view to the chosen mushaf, and resuming flips it back to Hafs. This brief keeps step 7's `playing: active` unchanged. See Q1.
4. **Playing without the reciter's pack.** A Warsh reader who plays a Hafs reciter without the Hafs pack sees the Hafs download card in place of the pages. Step 9 Part C stops it from auto-starting. See Q2, which step 9's Q10 shares.

---

## Part A. API

### A1. The manifest serves `riwayah` (`GET /api/v1/content/manifest`)

- **`app/Domains/Content/Data/ContentManifestEntryData.php`:** add `public readonly ?string $riwayah,` immediately after `$style`. There is one construction site, in `ContentDeliveryService`. It uses named arguments; grep `new ContentManifestEntryData` to confirm.
- **`ContentDeliveryService::manifest()`:** pass `riwayah: $this->servedRiwayah($resource),` after `style:`. Add, next to `servedStyle`:

  ```php
  /**
   * A chapter recitation's riwayah as a mushaf key (ADR 0090 decision 12): recitations.qirat matched case-insensitively
   * against the keys of config('mushaf.editions'). A QF recitation with no qirat is Hafs, as the ADR states. Anything else
   * is null, and every other group is null. The recitation and source are already eager-loaded.
   */
  private function servedRiwayah(Resource $resource): ?string
  ```

  Logic:
  1. Return `null` unless the group is `ResourceGroup::ChapterRecitations`.
  2. Take `$qirat = $resource->recitation?->qirat`.
  3. If `$qirat` is a string, return `strtolower(trim($qirat))` when that is a key of `(array) config('mushaf.editions')`, else `null`.
  4. If `$qirat` is `null` and `$resource->source?->code === 'qf'`, return `'hafs'`.
  5. Otherwise return `null`.
- **`ContentManifestEntryResource::toArray()`:** add `'riwayah' => $this->resource->riwayah,` right after `'style'`, and `riwayah: string|null,` in the `@return array{…}` docblock after `style`.
- **`ContentManifestResource.php`:** add `riwayah: string|null,` to its inline entry shape, after `style: string|null,` (line 29).
- The endpoint, its route and its cache headers are unchanged. The field adds no query: `activeWithPacks()` already eager-loads `recitation` and `source`. The existing «keeps the manifest query count flat» test must still pass unchanged.

### A2. MP3Quran and Way2Quran take the qirat from their source (stored value unchanged)

- **`config/quran.php`:** after `mp3quran_riwayat` (line 121), add:

  ```php
  // ADR 0090 decision 12: the recitations.qirat stored for a moshaf, by the manifest's `riwayah` text. It must hold every
  // entry of mp3quran_riwayat. The value is QF's spelling, so the stored qirat (and each moshaf's fingerprint) stays as it was.
  'mp3quran_qirat' => ['حفص عن عاصم' => 'Hafs'],
  ```

- **Before you edit the importer,** record the fingerprints the current code stores in `resources.import_fingerprint` (`Mp3QuranImporter.php:191–204`):
  - in the existing `Mp3QuranImportTest` happy-path test, temporarily add `dump(Resource::query()->pluck('import_fingerprint', 'source_key')->all());` after the import;
  - run it once with `nice -n 10 ./vendor/bin/pest --filter=<that test>`;
  - save the printed map to `/private/tmp/claude-501/-Applications-MAMP-htdocs-quran-app/45caaed8-c2a1-4fa5-a801-974871103e43/scratchpad/step9b-fingerprints.txt`;
  - remove the `dump`.

  Test 8 (A3) compares against these values.
- **`Mp3QuranImporter.php`:** delete `private const string QIRAT = 'Hafs';`. Add:

  ```php
  /** The stored qirat of a moshaf, from its manifest riwayah (config quran.mp3quran_qirat). A missing mapping is a config error. */
  private function qirat(Mp3QuranMoshaf $moshaf): string
  ```

  - It returns the mapped string.
  - When the key is missing, or the value isn't a non-empty string, it throws `\UnexpectedValueException('No qirat for riwayah '.$moshaf->riwayah)`.
  - Use it at both former `self::QIRAT` sites: the recitation upsert (line 158) and the fingerprint (line 324).
- Do not change `Mp3QuranManifest`, `ReciterSource`, `mp3quran_riwayat` or the ingest tools.

### A3. API tests (Pest; synthetic data only)

`tests/Feature/Content/ContentDeliveryTest.php`, next to the two style tests (copy their setup and the `packedRecitation()` helper):

1. A QF recitation with `qirat` `Hafs` gives `riwayah` `'hafs'`. A tafsir gives `null`.
2. A QF recitation with `qirat` `null` gives `'hafs'`.
3. A recitation with `qirat` `'hafs'` (the factory's lowercase) gives `'hafs'`.
4. A recitation with `qirat` `'FIXTURE unknown'` gives `null`.
5. A recitation of the `mp3quran` source with `qirat` `null` gives `null`. Create the source with `ContentSource::query()->firstOrCreate(['code' => 'mp3quran'], [...])`, copying the `qf` block's fields.
6. Every existing exact-shape assertion on a manifest entry gains the `riwayah` key.

`tests/Feature/Content/Mp3QuranImportTest.php`:

7. The existing assertion `qirat` is `Hafs` stays, and passes through the map.
8. **The fingerprint did not move.**
   - After an import, each fixture moshaf's stored fingerprint equals the value recorded before the edit (A2): hard-code those strings in the test, with a one-line comment saying they were recorded from the pre-change importer.
   - Importing the same manifest a second time reports `unchanged` for every moshaf.
   - Idempotence alone doesn't prove the stored values match production's; the hard-coded fingerprints do.
9. With `config(['quran.mp3quran_qirat' => []])`, the import throws `UnexpectedValueException`.

`tests/Unit/Content/ReciterSourceTest.php` (or a new `tests/Unit/Content/QiratConfigTest.php`):

10. Every entry of `config('quran.mp3quran_riwayat')` is a key of `config('quran.mp3quran_qirat')`.

### A4. Spec (`docs/technical-spec.md`, same change)

- **§5, the `recitations` row:** after `qirat varchar(32) null`, add «(the source's name: QF's `qirat.name`; MP3Quran and Way2Quran map the manifest's `riwayah` through `quran.mp3quran_qirat`)».
- **§9, after the `svg_mushafs` paragraph (line 593):** add «A `chapter_recitations` entry carries `riwayah`: its recitation's riwayah as a mushaf key (`hafs`, `warsh`, `qalun`, `shubah`, `duri`), matched from `recitations.qirat`. A QF recitation with no qirat is `hafs` (ADR 0090 decision 12). An unknown qirat is `null`. Every other entry has `riwayah: null`.»
- **§12 «Audio»:** add the bullet «**Reciter riwayah** (ADR 0090 decision 12): the catalogue's `riwayah` decides the Mushaf pages shown and followed while that reciter plays. Unknown is treated as Hafs. The reciters list shows it once its frame is approved.»
- Do not edit ADR 0090.

## Part B. Contract and device data

### B1. Contract (from the worktree root, after Part A passes)

- If `node_modules/.bin/openapi-typescript` is missing in the worktree, run `npm ci` there first (step 5 review, item 5). This installs the lockfile's packages and adds none.
- Then run `npm run generate -w @quran/api-contract`. The changes ready for review are `packages/api-contract/openapi.json` and `packages/api-contract/src/schema.d.ts`, where `riwayah: string | null` appears on the manifest entry. Never hand-edit them.

### B2. `content.db`: `catalog_resources.riwayah`

1. **`src/core/db/content/schema.ts`:** add `riwayah: text('riwayah'),` to `catalogResources`, after `sourceKey`.
2. **Generate the migration,** from `apps/mobile`: `nice -n 10 npm run db:generate -- --name reciter_riwayah`.
   - Drizzle's content snapshots run through `0016`, so generation works here (unlike `user.db`).
   - Expect `0017_reciter_riwayah.sql` holding exactly `ALTER TABLE \`catalog_resources\` ADD \`riwayah\` text;`, a new snapshot, a journal entry and the `migrations.js` import.
   - **If the generated SQL holds anything else, delete the generated files and stop: report it.**
3. **Append to the SQL,** as `0007_reciter_style.sql` does:

   ```sql
   --> statement-breakpoint
   -- A manifest read by an older app has no riwayah, so a 304 would leave every reciter without one.
   DELETE FROM `meta` WHERE `key` = 'manifest_etag';
   ```

4. **`src/core/sync/content-sync.ts` `writeCatalog`:**
   - add `riwayah` to the column list and one `?`;
   - its value is `resource.riwayah ?? null`, with the comment «Only recitations carry a riwayah; a missing value (an older API) is null»;
   - the `UPDATE installed_resources` statement is unchanged.
5. **Manifest fixtures in tests:** after B1, `tsc` will flag every fixture that builds a `ContentManifestResource`. Add `riwayah: null` there, or `'hafs'` for a recitation where the test needs one. Expected places include `__tests__/{content-sync,install-resource,content-selection}.test.ts`, `src/core/mushaf-pack/install-svg-mushaf.test.ts` and `src/features/hadith/data/__fixtures__/pack-test-helpers.ts`; the `tsc` output is the full list. Do not make the field optional.

### B3. The reciter's riwayah on the device (`src/features/audio/data/reciters.ts`)

- **`CatalogReciter`:** add `riwayah: SvgMushafKey | null;`, documented as «The catalogue's riwayah (ADR 0090 decision 12), or null when the catalogue has none or an unknown value.»
- **`listReciters`:**
  - select `riwayah` from `catalog_resources`;
  - map it with `isSvgMushafKey(row.riwayah) ? row.riwayah : null` (from `@/core/mushaf-pack`);
  - installed rows missing from the catalogue get `null`.
- **New:**

  ```ts
  /** The riwayah of one recitation resource from the catalogue, or null (unknown, unlisted or not a recitation). */
  export function reciterRiwayah(db: SqlExecutor, resourceId: number): SvgMushafKey | null;
  // SELECT riwayah FROM catalog_resources WHERE resource_id = ? AND "group" = 'chapter_recitations'; validated with isSvgMushafKey
  ```

- **Test fixtures:** `riwayah` is a required field of `CatalogReciter`, so `tsc` will flag every test that builds one (for example the `ListenScreen`, `PlayerReciterList` and onboarding mocks). Add `riwayah: null` there; do not make the field optional.
- Why the catalogue and not `recitations.qirat`: one mapping, the server's, serves both the list and the player. A reciter that is installed but absent from the catalogue reads `null`, which `shownMushafKey` treats as Hafs.

### B4. The hook and the screen

- **New `src/features/reader/mushaf-svg/usePlayingReciterRiwayah.ts`, with its test:**

  ```ts
  /** The riwayah of the reciter in the player (ADR 0090 decision 12), or null. Re-reads when the catalogue changes. */
  export function usePlayingReciterRiwayah(): SvgMushafKey | null;
  ```

  - It reads `usePlayerStore((s) => s.reciterId)` and `const catalog = useCatalogVersion((s) => s.version)`.
  - It returns `null` when `reciterId` is `null`.
  - Otherwise it returns `reciterRiwayah(openContentDb().executor, reciterId)`, and `null` if opening throws.
  - **Memoize the lookup:** `useMemo(…, [reciterId, catalog])`. `ReaderScreen` re-renders about every 100 ms while audio plays (`activeWord`), and this must not be a SQLite read per tick.
- **`ReaderScreen.tsx` line 183:** replace `reciterRiwayah: null` with `reciterRiwayah: playingRiwayah`, where `const playingRiwayah = usePlayingReciterRiwayah();` sits just above it.
  - Nothing else in the screen changes.
  - Today every catalogue recitation reads `hafs`, so the shown pages are what they were (Hafs while playing).
- `shown-mushaf.ts` and its rules are unchanged.

### B5. Device tests

- **`__tests__/content-sync.test.ts`:** `writeCatalog` stores `riwayah`; a resource without the field stores `null`.
- **`__tests__/content-db.test.ts`:** if it asserts the content migration list or the `catalog_resources` columns, add `0017_reciter_riwayah` and `riwayah`.
- **`src/features/audio/data/reciters.test.ts`:**
  - `riwayah` is `'hafs'` from the catalogue;
  - an unknown text gives `null`;
  - an installed reciter missing from the catalogue gives `null`;
  - `reciterRiwayah` returns the same values, and `null` for a tafsir resource id.
- **`usePlayingReciterRiwayah.test.ts`:**
  - `null` with no reciter;
  - `'hafs'`;
  - `'qalun'` from a mocked catalogue;
  - unknown gives `null`;
  - it re-reads after `bumpCatalogVersion()`.
- **`ReaderScreen.test.tsx`:**
  - with chosen `warsh`, a playing reciter whose catalogue riwayah is `qalun` gives the container `mushafKey="qalun"` (the seam works for a future non-Hafs reciter), and after stop `mushafKey="warsh"`;
  - with `hafs` from the catalogue while playing, `mushafKey="hafs"`.

## Part C. The riwayah in the reciters list (blocked: frame first, ADR 0087)

The data is ready after Part B (`CatalogReciter.riwayah`). No approved frame draws it, so build nothing here until one is approved.

**The coordinator draws the frame** in `screens/frames/<section>/`, copied from the sibling it changes.

- Its `gx-fig` caption in `screens/index.html` carries «(بانتظار الموافقة)».
- Rebuild with `python3 design/screens/scripts/build.py && python3 design/scripts/build_reference.py`, and never hand-edit `design/`.
- Review at `design/<stack>/<FrameId>/index.html?theme=both&dir=both&sizes=compact%2Cmedium%2Cexpanded%2Clandscape`. For example, the Listen list is `design/audio/Reciters/`.

Which lists, and which design, is Q3. Two proposals:

- **(a) Per row:** the line under the name reads «مرتّل · حفص عن عاصم». The riwayah name is `t(\`reader.mushafs.${riwayah}.name\`)`, with no new string.
- **(b) One line above the list:** «جميع القرّاء برواية حفص عن عاصم», shown only while every listed reciter has the same riwayah. Each row shows its riwayah only when they differ. This needs one new key (`audio.reciters.allRiwayah`: ar «جميع القرّاء برواية {{riwayah}}», en "All reciters recite {{riwayah}}"). The English wording is for the developer.

Once a frame is approved, the coordinator writes the component part of this brief: which of `ReciterRow`, `PlayerReciterRow` and `OnboardReciter`'s row change, their props, and the colocated tests.

## i18n

Parts A and B add no string. Part C adds none under (a), or one key under (b), after approval.

## Gates

API (from `/Applications/MAMP/htdocs/quran-app/apps/api`; PHP 8.5 from Homebrew; if MySQL is down, `brew services start mysql redis`):

```bash
nice -n 10 ./vendor/bin/pint
nice -n 10 ./vendor/bin/pint --test
nice -n 10 ./vendor/bin/phpstan analyse --memory-limit=1G --no-progress
nice -n 10 ./vendor/bin/pest tests/Feature/Content/ContentDeliveryTest.php tests/Feature/Content/Mp3QuranImportTest.php tests/Unit/Content
nice -n 10 ./vendor/bin/pest
```

- Run Pest serially: never `--parallel`, and so not `composer qa`.
- No `composer audit`: no dependency changes.

Contract (from the worktree root): B1.

Mobile (from `/Applications/MAMP/htdocs/quran-app/apps/mobile`; Node 26 through `nvm use`):

```bash
pkill -f jest || true
nice -n 10 npm run lint
nice -n 10 npx tsc --noEmit
nice -n 10 npx jest --maxWorkers=2 __tests__/content-sync.test.ts __tests__/content-db.test.ts __tests__/install-resource.test.ts __tests__/content-selection.test.ts src/core/mushaf-pack src/features/audio/data src/features/reader/mushaf-svg src/features/reader/screens/ReaderScreen.test.tsx
nice -n 10 npx jest --maxWorkers=2
```

- Run the full suite once, at the end.
- `npx expo-doctor` and `node .github/scripts/npm-audit.mjs` are not needed: no package changes. `npm ci` only installs the lockfile.

## Machine rules

- No Android emulator, Gradle or Android build. No simulator: the reviewer does any visual check (Part C only).
- Prefix heavy commands with `nice -n 10`.
- Never run two Jest processes at once. Kill orphans first.
- Stage nothing, commit nothing, push nothing. Don't switch branches.
- Never run `mp3quran:import`, `way2quran:import` or any import against a real database. Tests use the test database.

## Out of scope

- **Non-Hafs reciters** (ADR 0090 decision 12, «later, under its own ADR»). Each needs a word-level text source, timings and word boxes for that riwayah. `mp3quran_riwayat` stays `['حفص عن عاصم']`.
- Changing what "playing" means for the shown mushaf (Q1), and what shows when the reciter's pack is missing (Q2).
- An API migration (none is needed), the ingest tools, and the reciter packs (`PackSchema` already carries `qirat`).
- The reciters list UI until its frame is approved (Part C).
- The release (plan step 11).

## Report

- Files created, changed and deleted, by part. Confirm that `git status --short` differs from `step9b-before.txt` only by them, plus the regenerated contract files.
- The gate results.
- The generated `0017` SQL, quoted exactly.
- Whether the second import reported `unchanged` for every moshaf.
- Every disagreement between this brief and the code. Stop and report rather than redesign.

## Open questions for the developer (do not decide; put them in the report)

- **Q1. What "stops" means.** The shown mushaf follows `active` (playing or loading). Pausing therefore shows the chosen mushaf again, and resuming shows Hafs. Keep this, or keep the reciter's pages while paused? If paused counts as playing, a reader who paused once keeps seeing Hafs pages until the player goes idle.
- **Q2. The reciter's pack is not installed.** For example, Warsh is chosen and only the Warsh pack is installed. Playing then shows the Hafs download card in place of the pages (decision 12 literally). Step 9 C1 stops it from auto-downloading. Should it instead keep the chosen pages, unfollowed, until the pack exists? (Shared with step 9's Q10.)
- **Q3. The reciters list.** Which lists show the riwayah: the Listen tab, the player's reciter sheet, onboarding? And which design: per row (a), or one line while all reciters share it (b)?
- **Q4. QF qirat null.** A QF recitation without `qirat` is served as `hafs`, as ADR 0090 states. Confirm, or serve `null` (unknown, still followed on Hafs pages by step 7's rule).
- **Q5. Unknown qirat.** A value that isn't one of the five keys is served as `null`. While that reciter plays, `shownMushafKey` shows Hafs. Should such a reciter instead never be followed, or be hidden?
- **Q6. Showing it in the Mushaf.** While a Hafs reciter plays under a non-Hafs choice, should the Mushaf toolbar also name the riwayah being shown (as step 9 Part G does for Reading and Focus)? That needs a frame.

## Decisions on the open questions (coordinator, 15 Nov 2026)

- **Q1:** a pause keeps the reciter's riwayah, so a resume never flips the pages. The pages return to the chosen mushaf only when playback stops (the queue clears or the player closes).
- **Q2:** when the reciter's pack is missing, show that pack's download card. The download starts automatically when the downloads setting allows it (step 9 Q10).
- **Q3: the developer picks** between the two frames: (a) the riwayah on every row, or (b) one line above the list. Part C waits for that choice.
- **Q4:** accepted. A QF reciter with no qirat is served as `hafs` (ADR 0090).
- **Q5:** accepted. An unknown qirat is served as null and followed on Hafs pages.
- **Q6:** yes. While playback shows Hafs pages for a reader who chose another mushaf, the Mushaf title pill reads «… · حفص عن عاصم», using `reader.toolbar.withRiwayah` from step 9 Part G. This needs frame F4, which is with the developer for approval.
