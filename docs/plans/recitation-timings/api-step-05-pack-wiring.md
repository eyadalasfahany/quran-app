# API step 05 (plan A5): packs use Taybah timings; web-start wiring; docs; one Jest fixture

Branch `ft/recitation-timings`. Do not commit, push, switch branches or add dependencies. Plan: `docs/plans/recitation-timings.md` ("API steps"). Rests on ADR 0060 decisions 5, 6, 7, ADR 0044 (packs build at web start; amendment: import before `content:ensure-packs`, warn and keep), ADR 0052. Depends on steps 01, 02b, 03 and 04. **Never write Quran text**; fixtures are numbers and placeholders.

## Read first

`.claude/agent-rules.md`, `CLAUDE.md`, `apps/api/CLAUDE.md`, `apps/mobile/CLAUDE.md` (only for the Jest test file), the `laravel-standards` skill, `apps/api/app/Domains/Content/Repositories/Eloquent/EloquentPackSnapshotRepository.php` (the whole file: `query()` prefixes every `select` and `orderBy` with `{table}.`), `app/Domains/Content/Packs/PackBuilder.php` and `PackSchema.php` (`recitationTimings()`: columns `audio_file_id, verse_id, start_ms, end_ms, segments`), `app/Domains/Content/Console/EnsureContentPacksCommand.php`, `apps/api/docker/start-web.sh`, `tests/Feature/Deploy/StartupConfigTest.php`, the pack tests in `tests/Feature/Content/PackBuilderTest.php` (helpers `withContentPack`, `expectPackTable`), `docs/technical-spec.md` §5 (rows near line 305 to 307) and §12 (line 672), `docs/runbooks/railway-release.md` (the numbered web-start list), `apps/mobile/src/features/audio/data/timings.test.ts` and `apps/mobile/src/features/audio/active-ayah.ts`.

Environment (this Mac): `export PATH=/opt/homebrew/bin:$PATH`; Node 26 through nvm for the mobile and contract commands (`source ~/.nvm/nvm.sh && nvm use` at the repo root); run PHP tools from `apps/api`.

## Goal

1. **The pack builder uses, per surah file, the Taybah rows when a Taybah set matches the current file, else the recitation's own rows.** The pack and device schemas do not change: the pack's `recitation_timings` table stays `(audio_file_id, verse_id, start_ms, end_ms, segments)` and Taybah rows are written into it with the file's id.
2. **`start-web.sh` runs the two imports** (`mp3quran:import`, then `recitation-timings:import`, both `--defer-pack`) before `content:ensure-packs`, each warn-and-continue like the Azkar lines.
3. **Docs:** the spec and the runbook say so.
4. **One Jest fixture** proves the mobile code already handles the generated shape. No other mobile change.

## Files to change

- `apps/api/app/Domains/Content/Repositories/Eloquent/EloquentPackSnapshotRepository.php`
- `apps/api/docker/start-web.sh`
- `apps/api/tests/Feature/Deploy/StartupConfigTest.php`
- `apps/api/tests/Feature/Content/PackBuilderTest.php` (append tests)
- `docs/technical-spec.md` (§5 two table rows after the `recitation_timings` row; §12 the "Timings must match the audio" bullet)
- `docs/runbooks/railway-release.md` (the web-start list)
- `apps/mobile/src/features/audio/data/timings.test.ts` (append one `describe`)

No new PHP class. `PackSnapshotRepository`'s interface does not change.

## Pack query (exact behaviour)

In `EloquentPackSnapshotRepository::query()`, the `'recitation_timings'` arm becomes a derived table named `recitation_timings`, so the shared tail of `query()` (`orderBy('recitation_timings.audio_file_id')`, the `select` list with the `recitation_timings.` prefix, and `chunk()`) keeps working unchanged. The arm is, in words:

- **Own rows**: today's query (`RecitationTiming::query()->toBase()` joined to `chapter_audio_files` and `recitations`, `where recitations.resource_id = $resourceId`) plus `whereNotExists` a `taybah_timing_sets` row with `taybah_timing_sets.recitation_id = chapter_audio_files.recitation_id`, `taybah_timing_sets.chapter_id = chapter_audio_files.chapter_id` and `taybah_timing_sets.audio_url = chapter_audio_files.audio_url` (use `whereColumn`). Select exactly `recitation_timings.audio_file_id`, `recitation_timings.verse_id`, `recitation_timings.start_ms`, `recitation_timings.end_ms`, `recitation_timings.segments`.
- **Taybah rows**: `TaybahRecitationTiming::query()->toBase()` joined to `taybah_timing_sets` (same `recitation_id` and `chapter_id`), to `chapter_audio_files` (same `recitation_id` and `chapter_id`, **and** `chapter_audio_files.audio_url = taybah_timing_sets.audio_url`) and to `recitations` (`recitations.id = chapter_audio_files.recitation_id`), `where recitations.resource_id = $resourceId`. Select `chapter_audio_files.id as audio_file_id`, `taybah_recitation_timings.verse_id`, `start_ms`, `end_ms`, `segments` (same five names).
- **Combine**: `$own->unionAll($taybah)`, then `RecitationTiming::query()->toBase()->newQuery()->fromSub($union, 'recitation_timings')`. Do not use `Illuminate\Support\Facades\DB` (the architecture test forbids it in repositories).

A file therefore appears from exactly one of the two sources. A Taybah set whose `audio_url` no longer equals the file's contributes nothing, and that file falls back to its own rows (none for an untrusted reciter), so its surah plays without highlight, as today. `segments` comes out as the same JSON text for both sources (`PackBuilder` already writes it as TEXT). The `recitations` and `chapter_audio_files` arms are untouched (the flag `recitations.has_word_segments` is maintained by steps 02b to 04).

## `start-web.sh`

After the `azkar:import` block and before `content:ensure-packs`, in this order:

```sh
if php artisan mp3quran:import --defer-pack; then
  echo "start: MP3Quran recitations up to date"
else
  echo "WARNING: the MP3Quran import did not finish (manifest or a moshaf was refused; the lines above name it); the current MP3Quran versions keep serving."
fi

if php artisan recitation-timings:import --defer-pack; then
  echo "start: Taybah recitation timings up to date"
else
  echo "WARNING: some Taybah timing files were skipped (the lines above name them and the reason); the current versions keep serving."
fi
```

Update the header comment's "Order:" sentence to include them (import rows after the Azkar import, then packs). `--defer-pack` is required: with `QUEUE_CONNECTION=sync` a dispatched `ResourceContentChanged` would build the pack inline, once per import, before `content:ensure-packs` builds it again at the final version, and all of it before the 120 s health check. `set -u` stays and `set -e` stays absent.

`StartupConfigTest.php`: extend the order test so `strpos` of `php artisan mp3quran:import --defer-pack` is greater than the Azkar import and less than the one of `php artisan recitation-timings:import --defer-pack`, which is less than `php artisan content:ensure-packs`; add a test that both commands are wrapped in `if php artisan ...; then` with a `WARNING:` echo in the `else` and that neither contains `--build-packs`.

## Docs (exact text)

- **Spec §12**, append to the end of the "Timings must match the audio (ADR 0052)" bullet: ` Taybah timings (ADR 0060): for a surah file whose recitation has a row in \`taybah_timing_sets\` for its chapter and its current \`audio_url\`, the pack's \`recitation_timings\` rows for that file come from \`taybah_recitation_timings\` instead of QF's; everywhere else nothing changes, and the untrusted list keeps its meaning (a Taybah timing is an override, never a reason to trust QF's). A file whose URL changed falls back to QF's rows, none for an untrusted reciter.`
- **Spec §5**, after the `recitation_timings` row, two rows in the same table format: `taybah_timing_sets` with columns `id`, `recitation_id` FK, `chapter_id`, `audio_url` varchar(500), `size_bytes`, `sha256` char(64), `measured_duration_ms`, `source` varchar(32) (`aligner` or `mp3quran_published`), `tool_version` null, `models` json null, `original_first_start_ms` null, `digest` char(64), `imported_at` datetime(6), key unique (`recitation_id`,`chapter_id`), and a note "one provenance row per recitation and surah file; no FK to `chapter_audio_files`, so a QF snapshot never removes it (ADR 0060)"; and `taybah_recitation_timings` with `recitation_id` FK, `chapter_id`, `verse_id`, `start_ms`, `end_ms`, `segments` json null, key PK (`recitation_id`,`chapter_id`,`verse_id`), check `start_ms < end_ms`.
- **Spec §12, playback speed (ADR 0062 decision 4):** in the "Repeat" bullet of the Quran player (line ~669) replace "Speed (0.5×–2×) and sleep timer (end of ayah, end of surah, 15/30/60 min) live in `playerStore`." with "The sleep timer (end of ayah, end of surah, 15/30/60 min) lives in `playerStore`."; in the §15 phase 3 row (line ~853) delete "speed, ". Leave every Azkar-player speed mention (ADR 0047 keeps it).
- **Runbook** `docs/runbooks/railway-release.md`, "The web container start" list: after step 4 (`azkar:import`), add `mp3quran:import --defer-pack` (reads `resources/mp3quran/manifest.json`, writes the recitation rows; no network, no storage credential) and `recitation-timings:import --defer-pack` (reads `resources/recitation-timings/**`, skips and names any file whose audio URL, ayah rows or word layouts do not match; a rerun with unchanged files bumps nothing); renumber the rest. Mention that bumping many recitations in one deploy builds all their packs before the health check passes (see ADR 0044's consequence).

Do not edit ADRs, `CLAUDE.md` or `docs/content-plan.md` (the developer does, plan step B1).

## Tests

**PHP** (append to `tests/Feature/Content/PackBuilderTest.php`, reuse `withContentPack`; use `TaybahTimingSet::factory()` and `TaybahRecitationTiming::factory()`):

- `it('fills a listed reciter pack with Taybah rows for the files that have a set and nothing for the others')`: config `quran.untrusted_timing_recitations` contains the reciter's source key; two files (chapters 1 and 2), a Taybah set only for chapter 1; the pack's `recitation_timings` has the chapter-1 rows under the chapter-1 file id and no rows for the chapter-2 file.
- `it('leaves a trusted reciter with no Taybah set byte-identical')`: compare the sorted dump of `SELECT * FROM recitation_timings ORDER BY audio_file_id, verse_id` against the database's own rows (not the gz bytes: `built_at` differs).
- `it('uses Taybah rows for one file and QF rows for the others of a trusted reciter')`.
- `it('leaves out a file whose Taybah set has a different audio url')` (falls back to the file's own rows, and to none for an untrusted reciter).
- `it('never mixes the rows of two recitations')` (a Taybah set of another recitation with the same chapter and URL does not leak into this pack).
- `it('writes segments and null segments as in the QF path')` (compare `segments` text of a Taybah row with the MySQL value, and NULL stays NULL).
- `it('builds a new pack version through content:ensure-packs after a Taybah import bumps the resource')` (`Storage::fake('local')`; run `recitation-timings:import --defer-pack` against a temp folder with one valid file, then `content:ensure-packs`; output contains `OK <id>`; the pack for the new version exists and holds the Taybah rows).
- `it('builds the pack of an imported MP3Quran recitation with the reserved file ids')` (through `Mp3QuranImporter` with a test manifest, then `PackBuilder::build`; `chapter_audio_files.id` values in the pack are in the reserved range and `recitation_timings` is empty for it until a Taybah set exists).

**Deploy** (`StartupConfigTest.php`): the two tests above.

**Jest** (`apps/mobile/src/features/audio/data/timings.test.ts`): a new `describe('generated Taybah timings', ...)` that uses the file's existing `insertFile` and `insertTiming` helpers with a placeholder surah (`insertFile(300, 3, 4)`: four ayahs) and these rows, a measured duration of 600000: ayah 1 `0 to 150000` with segments `[[1,0,50000],[2,50000,100000],[3,100000,150000]]`; ayah 2 `150000 to 300000` with `segments` null (a verse whose QF word count the rules do not match); ayah 3 `300000 to 450000` with a repeat `[[1,300000,330000],[2,330000,360000],[3,360000,390000],[2,390000,420000],[3,420000,450000]]`; ayah 4 `450000 to 600000` with `[[1,450000,500000],[2,500000,600000]]`. Assert: `timingsFor(executor, 300)` returns four rows sorted by start with the segments parsed (null for ayah 2, repeated positions kept); `timingsFitAudio(rows, 600000)` is true and `timingsFitAudio(rows, 700000)` is false (more than 5% tail); `activeWordPosition` (import from `../active-ayah`) returns 2 at 345000 and again 2 at 400000 (the repeat), 3 at 440000, `null` for ayah 2 at any time, and `activeTimingIndex` returns 2 at 400000. Only this test file changes in `apps/mobile`.

## Gates

```bash
cd /Applications/MAMP/htdocs/quran-app/apps/api
export PATH=/opt/homebrew/bin:$PATH
vendor/bin/pint --format agent
composer qa

source ~/.nvm/nvm.sh && nvm use      # at the repo root, Node 26
cd /Applications/MAMP/htdocs/quran-app/apps/mobile
npm run lint && npx tsc --noEmit && npm test && npx expo-doctor
```

Contract gate (this step changes no endpoint, no pack schema, no device schema): copy `packages/api-contract/openapi.json` and `src/schema.d.ts` to a scratch folder you create with `mktemp -d` first; after the work run `npm run generate -w @quran/api-contract` from the repo root and `diff` against the copies; both must be empty. The tree is dirty with other work: never diff against `HEAD`. Also check `PackSchema::VERSION` is unchanged.

## Out of scope

Any change to `PackSchema`, the device schema, `reciters.ts`, the mobile player, the handler (step 03), the importers (02b, 04), ADR or `CLAUDE.md` edits, committing any timing file, the accuracy gate (plan A6).

## Open questions

- **Health-check budget.** A deploy that bumps many recitations (for example the first import of 20 reciters) builds all their packs inside `content:ensure-packs` before FrankenPHP listens (the 120 s health check, ADR 0044). Default: accept for the pilot (one reciter); recover from a shell (`php artisan content:ensure-packs`) if a larger batch times out. The developer decides whether batches need a runbook step before B9.
- **Case-insensitive URL join.** The pack join compares `audio_url` with MySQL's normal column equality (`utf8mb4_0900_ai_ci`), while the importer compares strictly. A URL that differs only by letter case counts as the same file. Accepted as documented (R2 keys are lowercase hex; QF URLs are fixed).
