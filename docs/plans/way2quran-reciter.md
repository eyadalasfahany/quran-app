# Way2Quran reciters (first two: Muhammad Abadh, Hossam El Din Ebadi)

Status: **accepted, 7 Nov 2026** · Branch: `main` (developer, 7 Nov 2026; the tree is shared with Phase 7 work, so each step stages only its own files) · ADR: `docs/adr/0074-way2quran-reciters-hosted-on-r2.md` (draft) · Builds on ADR 0061 (`docs/adr/0061-mp3quran-reciters-hosted-on-r2.md`, incl. 5 Nov amendment), ADR 0060 (`docs/adr/0060-taybah-generated-recitation-timings.md`), ADR 0062 (unavailable surahs, `docs/plans/recitation-timings/0062-step-03-unavailable-rows.md`), ADR 0010 (design source), ADR 0014/0015 not touched.

Spec and content rest on: `docs/technical-spec.md` §5 (line 280 `content_sources`, 306 `chapter_audio_files`, 308 `taybah_timing_sets`), §7 (content pipeline, line 419), §12 (reader, audio; line 661), §14 (testing), §15 (delivery plan); `docs/content-plan.md` (recitation audio table line 135–145, checklist line 207); `docs/plans/recitation-timings.md` (A6 gate line 131, release blockers line 158).

## What this adds, in five lines

1. A second content source `way2quran`, seeded by a migration, with its own committed manifest in the MP3Quran manifest schema.
2. The ingest tool takes a source: the MP3Quran adapter stays; a Way2Quran adapter reads a committed **data file listing each reciter's exact file names** (names are not uniform). A lister command writes that data from the reciter page, so a new reciter is data only.
3. Timings come from the whole-surah aligner only (`source: "aligner"`), under timing kind `way2quran`.
4. API: the MP3Quran manifest parser and importer are generalised through a source profile (step 1, a pure refactor) rather than copied. New reciters import **hidden** until their id is in `way2quran_released_reciters`.
5. The `add-reciter` workflow gains a `source` input and keeps its refusals; the Way2Quran branch needs no published timings. Release needs the accuracy review.

## Decisions (developer, 7 Nov 2026)

1. **Recording owner:** the permission held covers the Midad-tagged recordings; Midad is credited as producer (ADR 0074 decision 2c). Step 10 does not wait.
2. **`permission_status`:** `granted` (notes: verbal).
3. **Sources screen:** no frame (developer approval, an approved difference under ADR 0010). One Way2Quran entry on the existing screen, built from the existing row component, naming the reciter(s) and Midad as producer (step 9). Keep the static `SOURCES` array; note the mismatch with `docs/plans/recitation-timings.md` line 58 there.
4. **Names:** «محمد عبادة» / Muhammad Abadh, «حسام الدين عبادي» / Hossam El Din Ebadi.
5. **Reciter ids:** 1 (Abadh), 2 (Ebadi), never reused.
6. **Hidden until listed in `way2quran_released_reciters`.**
7. **Written confirmation:** recommended open item, not a blocker.
8. **Order:** Abadh first (proves the pipeline); Ebadi follows as a data-only add.
9. **Warsh and other riwayat:** out of v1.
10. **CLAUDE.md** rule 2 edit (developer), and any rename of `tools/mp3quran-ingest` later.

## Grants (the plan's record; the ADR holds the wording)

| Reciter | Date | Given | Scope | Credit |
| --- | --- | --- | --- | --- |
| Muhammad Abadh | 7 Nov 2026 | in person, verbal | R2 hosting, offline download, timings derived from audio | reciter by name + Way2Quran |
| Hossam El Din Ebadi | 7 Nov 2026 | in person, verbal | same | same |
| Any other Way2Quran reciter | developer states catalogue-wide, 7 Nov 2026 | verbal | same | same |

## Facts used (checked 7 Nov 2026)

- Abadh: 114 files, about 1,845 MB, VBR about 140–180 kbps, 48 kHz stereo, PNG cover art per file; no `ETag` (planner HEADs of 001, 002, 114), `Last-Modified` present, `Accept-Ranges: bytes`. His 001 is 1,321,473 bytes / 58.54 s; 002 is 129,657,854 bytes.
- Ebadi: 54 of 114 Hafs surahs [1,12,14,15,17,18,19,31,32,36,38,44,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,72,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,93,99], about 328 MB; unpadded names for 79, 80, 82, 83, 84, 87; the same page also lists Warsh files.
- Way2Quran has no JSON endpoint that the planner found. The reciter page's HTML embeds every file URL (`https://way2quran.com/ar/reciters/hossam-el-din-ebadi` returned 82 distinct `media.way2quran.com` URLs: 54 Hafs, 28 Warsh). The lister parses that HTML. Step 6 re-verifies the page shape and asks for an API first if the site offers one by then.
- The copy Worker is pinned to MP3Quran (`tools/r2-copy-worker/src/index.ts:17-19`), so Way2Quran uses `--via s3`.

## Steps

Each step is one reviewable change. Run the checks of `CLAUDE.md` for every app touched. Implementation goes to a subagent with a brief (delegation rule); no step commits.

### Step 0. Documents (developer)

Developer accepts or edits ADR 0074; edits `CLAUDE.md` rule 2; content-plan row (see "Edits"). No code.

### Step 1. API: source profile, pure refactor

Files: new `apps/api/app/Domains/Content/Mp3Quran/ReciterSource.php` (value object: source code, manifest `source` string, key prefix, file-id base, config key names for riwayat, hide rule), `Mp3Quran/Mp3QuranManifest.php` (reads source, prefix and riwayat from the profile; the key/url checks at lines of `parseFile` use the profile's prefix), `Mp3Quran/Mp3QuranFileId.php` (base from the profile), `Services/Mp3QuranImporter.php` (`SOURCE`, held/duplicate logic via the profile). The default profile is `mp3quran`, so no caller changes.
Tests: `tests/Feature/Content/Mp3QuranImportTest.php`, `tests/Unit/Content/Mp3QuranFileIdTest.php` and the manifest tests pass **unchanged** (this is the proof). New: `tests/Unit/Content/ReciterSourceTest.php` (profile values; the mp3quran profile equals today's constants).
Gate: `composer qa`.

### Step 2. API: the `way2quran` source, profile and import command

Files: migration `apps/api/database/migrations/2026_11_07_100001_insert_way2quran_content_source.php` (upsert like `2026_11_05_100003_insert_mp3quran_content_source.php`; name "Way2Quran", `licence_url` https://way2quran.com, provisional neutral attribution, notes say the permission is verbal and no wording is quoted); `config/quran.php` (`way2quran_manifest_path`, `way2quran_released_reciters` = `[]`; riwayat and style maps reused); `ReciterSource::way2quran()` (key prefix `audio/way2quran/`, id base `2_000_000_000`, hidden unless released, reason `held`); new `Console/ImportWay2QuranCommand.php` (`way2quran:import`, same options as `mp3quran:import`, same importer); register in the Content provider where `ImportMp3QuranCommand` is registered.
`start-web.sh` is **not** touched here: the parser refuses an empty manifest, so the line is added in step 8 with the first real manifest.
Tests: new `tests/Support/Way2QuranTestManifest.php`; `tests/Feature/Content/Way2QuranImportTest.php` (a reciter imports inactive with reason `held`; active when released; a **54-surah** reciter lists no surah without a file; an 114-surah reciter likewise; rerun writes nothing and bumps no version; a key under `audio/mp3quran/` is refused; file ids sit in the 2e9 range and never equal an MP3Quran id; deactivation of a reciter removed from the manifest touches only `way2quran` resources; MP3Quran resources untouched by a Way2Quran import and the reverse); `Way2QuranSourceMigrationTest.php` (like `Mp3QuranSourceMigrationTest.php`; rerun converges); a pack test that an active way2quran recitation appears in the content pack like an MP3Quran one. `tests/Unit/ArchitectureTest.php` still passes.
Spec edits in this step: §5 (note on non-QF recitations and the three file-id ranges), §7 (Way2Quran manifest and import line), §12 (audio host serves both sources).
Gate: `composer qa`; no OpenAPI change expected (shapes unchanged); run `npm run generate -w @quran/api-contract` once and confirm no diff.

### Step 3. API: timing kind `way2quran`

Files: `Enums/TaybahTimingKind.php` (add `Way2Quran = 'way2quran'`), `Services/TaybahTimingImporter.php` (line 172: size check for every kind except `Qf`), `Console/ImportRecitationTimingsCommand.php` (the `--kind` help text and error message at lines 20 and 35). `TaybahTimingSource` is unchanged (`aligner`).
Tests: extend the timing importer test: a way2quran file imports under `resources/recitation-timings/way2quran/{id}/NNN.json` fixtures (marked placeholder content, no real timing of Quran text beyond ids and numbers); a `size differs` file is refused for way2quran; `--kind=way2quran` filters; an unknown kind is refused.
Gate: `composer qa`.

### Step 4. Ingest tool: source abstraction, retries, optional ETag (refactor + hardening, MP3Quran behaviour unchanged)

Files in `tools/mp3quran-ingest/mp3quran_ingest/`: `pipeline.py` (take a reciter-source object: metadata, `source_url(surah)`, key prefix, manifest `source` string, allowed copy modes; the MP3Quran adapter wraps today's `find_moshaf` and `{server}{NNN}.mp3`), `keys.py` (`object_key` takes the prefix), `manifest.py` (source string parameter; `source_last_modified` optional; null `source_etag` allowed), `remote.py` (`head_file` retries 5xx, timeouts and connection errors three times with waits 2, 4, 8 s, never 404, as the Worker client does; returns `Last-Modified`), `audio.py` (duration measure and ffmpeg map the **audio stream only**, `-map 0:a:0`), `cli.py`.
Tests (`tools/mp3quran-ingest/tests/`): every existing test passes unchanged (`uv run pytest -q`); new: HEAD retried on timeout then succeeds; HEAD 404 not retried; missing `ETag` recorded as null; a generated tone file with an embedded cover image measures the right duration and the same sha256 as its bytes.
Gate: `uv run pytest -q`.

### Step 5. Ingest tool: the Way2Quran adapter and the source data file

Files: new `way2quran.py` (loader and validator of the data file; the adapter), new `way2quran_reciters.json` (schema in ADR 0074 decision 7; **starts with no reciter or with the two entries from step 6**), `cli.py` (`ingest --source way2quran --reciter 1 [--surah N]…`, default manifest path `apps/api/resources/way2quran/manifest.json` with `--upload`, dry run by default as today; `--via worker` refused for this source with a message naming the reason).
Rules the validator enforces: `reciter_id` unique int; `riwayah_folder` is `hafs-an-asim`; `files` keys are 1 to 114; every file name is `^[0-9]{1,3}\.mp3$`, its integer equals its surah; names unique; the URL is built as `https://media.way2quran.com/{slug}/{riwayah_folder}/{file}` and nothing else (no redirect, no other host). The ingest checks each download's length equals `Content-Length` (existing rule).
Manifest output per reciter: `moshaf_id` = reciter id, `surah_list` = the listed surahs, `riwayah` `حفص عن عاصم`, `moshaf_name` ending « - مرتل».
Tests: loader refuses a bad schema, a duplicate surah, a name that does not match its surah, a non-Hafs folder; the adapter builds the unpadded URL for surah 79 and the padded one for 1; a dry run against a local fake of the Way2Quran host (like the existing fake CDN) of a three-surah reciter writes a manifest that the PHP parser accepts (a shared fixture checked into both test suites).
Gate: `uv run pytest -q`.

### Step 6. Ingest tool: the lister (adding a reciter is data)

Files: `way2quran_list.py`, `cli.py` (`way2quran-list --slug hossam-el-din-ebadi --reciter-id 2 [--write]`).
Behaviour: fetch the reciter page (descriptive User-Agent, one request), extract every `https://media.way2quran.com/{slug}/{folder}/{file}.mp3`, keep the `hafs-an-asim` folder, report the count of other-riwayah files ignored, HEAD each kept URL (with the step 4 retries), refuse the entry if any listed file does not answer 200 with `Content-Length` and `audio/mpeg`, and print the entry plus total bytes. Names (`name_ar`, `name_en`) come from arguments, never guessed. Without `--write` it prints and writes nothing; with it, it updates `way2quran_reciters.json` deterministically (sorted, stable). Counts only; no text beyond names and numbers.
If the site offers a JSON listing, replace the HTML parse with it in this step.
Tests: fixture HTML (URLs only) with 54 Hafs and 28 Warsh links gives 54 and ignores 28; padded and unpadded names; a surah appearing twice is refused; a HEAD failing after retries refuses the entry; `--write` is idempotent.
Run for real (developer-approved, read-only network): both reciters; compare the counts with the facts above (114 and 54 and the surah list).

### Step 7. Aligner tools: aligner-only mode, export kind, cover-art input

Files in `tools/recitation-align/`: `scripts/pilot_published.py` (new `--aligner-only`: skip the raw published file, the normaliser and `published_refusal`; run the whole-surah aligner and `snap_to_pauses` as `run_aligner` does; every surah is written with `source: "aligner"`; the `--raw-dir` argument stops being required in that mode; emissions cache file names include the source so two sources never share `{id}-{surah}.npz`), `recitation_align/export.py` (`KINDS` gains `way2quran`; the `mp3quran` branches at lines 265 and 296 become "kinds that read a manifest": `mp3quran` and `way2quran`; `--manifest` default per kind), `recitation_align/audio.py` if its ffmpeg decode does not already select the audio stream (check first).
Tests (`tools/recitation-align/tests/`): `--aligner-only` on a tiny fixture does not touch raw files and labels `aligner`; export under `--kind way2quran` writes `kind: "way2quran"` and the manifest URL; a cover-art input loads as audio only; existing tests pass.
Gate: `uv run pytest -q` here.

### Step 8. Workflow and CI helpers: the `source` input, refusals kept

Files: `.github/workflows/add-reciter.yml` (input `source`, choices `mp3quran` and `way2quran`, default `mp3quran`; `moshaf_ids` keeps its name so existing dispatches still work, its description says "reciter ids for way2quran"; the concurrency group includes the source; the "Fetch MP3Quran published timings" step and `--fallback-aligner` only for `mp3quran`; for `way2quran` the ingest passes `--source way2quran --reciter`, the align step passes `--aligner-only`, the export uses `--kind way2quran --source aligner`, paths use `apps/api/resources/way2quran/manifest.json` and `.../recitation-timings/way2quran/{id}`, the PR title and branch say which source), `tools/recitation-align/recitation_align/ci.py` (`plan` and `merge_manifest` take a source), `scripts/ci_plan.py`, `scripts/ci_merge_manifest.py`, `scripts/ci_quality.py` (manifest path by source), `apps/api/docker/start-web.sh` (add `php artisan way2quran:import --defer-pack` after the MP3Quran import, with the same warn-and-continue pattern), `tools/mp3quran-ingest/README.md` (a Way2Quran section; "Where it runs").
Refusals for `way2quran` in `plan` (every reason in one message, as today): the reciter id is not in the data file; the reciter has no Hafs files; the reciter is already in the committed manifest with all its listed surahs. **Not** applied: "no published timings" and the MP3Quran held/duplicates lists. `merge` still refuses a reciter with any listed surah missing or listed twice, so a partial run never ships; Ebadi's "complete" means all 54.
The MP3Quran path must behave exactly as before. A reciter merged but not released is hidden (step 2), so the merge cannot publish it.
Tests (`tools/recitation-align/tests/`): plan refuses unknown id, non-Hafs data, already complete; plan for way2quran needs no network to MP3Quran (fake `Api` not called); merge refuses a missing listed surah and a surah twice; merge for a 54-surah reciter accepts exactly its list; the MP3Quran plan/merge tests pass unchanged. Workflow YAML is reviewed by hand and syntax-checked with `actionlint` if available. A first end-to-end check uses a small dispatch (`chunks` 1, three surahs is not allowed by merge, so use a dry run of the scripts on fixtures instead).
Gate: pytest in both tools; `composer qa`; `node .github/scripts/npm-audit.mjs` only if dependencies changed (none planned).

### Step 9. App: Sources credit (UI)

No frame (developer approval, 7 Nov 2026; decision 3). Files: `SourcesScreen.tsx` (the new row(s)), `apps/mobile/src/core/i18n/locales/{ar,en}.json` (wording: the developer's), `SourcesScreen.test.tsx` (render, row, link, RTL, accessibility role and label). If the frame needs a new row component, it is its own file with its own test (frontend rule).
Review: an iPhone 17 simulator screenshot (`xcrun simctl io booted screenshot`) checked against the existing Sources rows and the apple-design skill (no frame to compare). Gate: `npm run lint && npx tsc --noEmit && npm test && npx expo-doctor`.
Release blocker: the credit ships in both languages before either reciter is visible.

### Step 10. First data run (developer present; after question 1)

**Superseded (7 Nov 2026)** by `docs/plans/way2quran-quality.md` steps Q10 and Q12 (ADR 0077): runs are quality-mode dispatches, reciter 2 first, reciters 1 and 3 fresh.

1. Dry run locally on three Abadh surahs (1, 2 as the largest, 90 as the one that timed out): `uv run mp3quran-ingest ingest --source way2quran --reciter 1 --surah 1 --surah 2 --surah 90` (no `--upload`). Check bytes equal `Content-Length`, duration, null ETag, `Last-Modified` recorded.
2. Dispatch the workflow for reciter 1 (`source=way2quran`, `chunks=6`; if a chunk times out, resume with `resume_run_id`). The PR holds the manifest, 114 timing files and the quality table.
3. Review and merge. Railway imports it **hidden**. Then reciter 2 the same way (54 surahs; `chunks` 3 is enough). A second PR can conflict on `manifest.json`; rebase or rerun on the new `main`.
Tests: none new; the checks are the PR's quality tables (counts only) and a local `way2quran:import --dry-run` of the merged manifest.

### Step 11. Accuracy review and release (blocker)

**Superseded (7 Nov 2026)** by `docs/plans/way2quran-quality.md` steps Q9, Q11 and Q13 (ADR 0077): the gate, A6(a) record and release rules replace the pause audit and the listening check; the release is a coordinator PR.

Per reciter, on every surah: the A6(c) pause audit (`docs/plans/recitation-timings.md` line 131: at least 90% of ayah starts at a pause, at least 83% steady, more than 10% of ayahs below the confidence floor blocks the surah); the quality table's lowest-confidence ayahs; a developer listening spot check on three surahs including a long one (listening is not ground truth). Record the numbers in an addendum to ADR 0060. Any failing surah keeps the whole reciter hidden. Then the developer adds the id to `way2quran_released_reciters`; the next deploy shows the reciter; a second deploy writes nothing (idempotent).
Exit check on the iPhone 17 simulator: reciter appears in the list, streams the R2 URL, downloads one surah offline, highlights ayah and word on three surahs, and for Ebadi the 60 missing surahs show unavailable and continuous play skips them (ADR 0062).
Note: the A6(a) reference run on Afasy is not recorded in ADR 0060 as far as found (no addendum). If it has not passed, the aligner itself is not validated and these reciters are blocked on it like MP3Quran 253.

## Edits to existing documents (same change as the step named)

| Document | Edit | Step |
| --- | --- | --- |
| `CLAUDE.md` non-negotiable 2 | «for MP3Quran reciters (ADR 0061)» becomes «for MP3Quran and Way2Quran reciters (ADR 0061, 0074)» (developer only) | 0 |
| `docs/content-plan.md` line 135–145 | new row «Way2Quran»: reciter pages and `media.way2quran.com` files, no licence stated, verbal permission from each reciter (7 Nov 2026), **Primary for additional reciters**, hosted on R2, Hafs only; checklist near line 207: a Way2Quran line, open item "written confirmation" | 0 |
| `docs/adr/0061-…` | one-line "see also ADR 0074" in its header | 0 |
| `docs/technical-spec.md` §5 (lines 280, 306) | `content_sources` example codes; the three `chapter_audio_files.id` ranges (QF; 1e9 MP3Quran; 2e9 Way2Quran) | 2 |
| `docs/technical-spec.md` §7 | Way2Quran manifest and `way2quran:import` at web start; the data-file/lister route for a new reciter | 2 |
| `docs/technical-spec.md` §12 | audio host `audio.taybah-app.com` serves both sources; reciter hidden until released | 2 |
| `docs/technical-spec.md` line 308 | none (`source` stays `aligner` or `mp3quran_published`) | — |
| `docs/technical-spec.md` §14 | add the Way2Quran import and aligner-only tests to the matrix | 3 |
| `docs/plans/recitation-timings.md` | cross-reference to this plan; fix line 58 only if the developer decides the Sources question | 9 |
| `docs/runbooks/` | a short "add a Way2Quran reciter" runbook: lister, review, dispatch, release | 11 |

The spec §16 risks gain one line: verbal permission and recording ownership (open items 1 and 2 of the ADR).

## Release blockers

1. Developer answer on recording ownership (Midad tags) before any R2 upload.
2. ADR 0074 accepted; `CLAUDE.md` rule 2 updated.
3. Accuracy review passed for the reciter, on every surah, numbers recorded in the ADR 0060 addendum (and the A6(a) question above settled).
4. Sources credit approved in the HTML and shipped in Arabic and English before any Way2Quran reciter is visible.
5. Reciter listed in `way2quran_released_reciters` (hidden by default).
6. Import idempotent on a second deploy (no version bump).
7. R2: immutable cache header and range requests verified on one Way2Quran object; billing alert (ADR 0061).
8. Partial reciter (Ebadi): unavailable-surah rows and skip in continuous play verified on the simulator.
9. `composer qa`, mobile checks, both Python suites green; contract regeneration shows no diff.

## Rollback

Remove the id from `way2quran_released_reciters` (hides at the next deploy), or remove the reciter from the manifest (the import marks it inactive, reason `removed_from_manifest`). Objects are deleted only after the developer accepts that streaming devices will fail, and never while an installed pack can name them (ADR 0061 decision 13). If a permission is withdrawn, remove objects, resources and the Sources line in one change.

## Questions only the developer can answer

See "Decisions that need the developer", especially 1 (recording owner), 3 (Sources design) and 2 (`permission_status`).
