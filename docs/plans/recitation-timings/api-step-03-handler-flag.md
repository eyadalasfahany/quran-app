# API step 03 (plan A4): QF handler keeps Taybah timings and the word-segments flag

Branch `ft/recitation-timings`. Do not commit, push, switch branches or add dependencies. Plan: `docs/plans/recitation-timings.md` ("API steps"). Rests on ADR 0060 decisions 4, 6 and 10, ADR 0052 (the untrusted list keeps its meaning). Depends on steps 01 and 02b (`TaybahTimingRepository`, `RecitationSegmentsFlagService`). **Never write Quran text**; tests reuse the existing fixture helpers.

## Read first

`.claude/agent-rules.md`, `apps/api/CLAUDE.md`, the `laravel-standards` skill, `apps/api/app/Domains/Content/Sync/Handlers/ChapterRecitationsHandler.php` (the whole file), `app/Domains/Content/Services/ContentSyncService.php` lines 270 to 305 (a `null` returned by `applyRow` means no version bump and no change row), and the test helpers in `tests/Feature/Content/ContentHandlersTest.php` (`bootstrapChapterRecitationResource`, `runContent`, `reciterRoutes`, `audioFile`, `audioSegment`, `contentResourceMutation`, `contentRowMutation`, `contentSnapshot`; the fixture reciter is QF source key `6`, file id `10734`, chapter 1).

Environment (this Mac): `export PATH=/opt/homebrew/bin:$PATH`; run PHP tools from `apps/api`.

## Goal

Make the QF content sync and the Taybah timings coexist:

1. `recitations.has_word_segments` is true when any file in the recitation's pack has segments, whether they come from QF rows or from Taybah rows that are currently served. A QF snapshot or row mutation must not reset the flag to false while Taybah segments are served.
2. A QF `audio_segment` mutation for a file that has a Taybah set matching its current URL must not reach devices: the QF row is still stored (it stays the fallback if the Taybah set later goes stale) but the mutation returns no change row, so no version bump and no change feed entry. (Otherwise a device holding the Taybah rows would receive a QF row that overwrites them.)
3. The handler, a QF snapshot and the file or timing mutations never touch `taybah_timing_sets` or `taybah_recitation_timings` (proved by tests, nothing to delete in code: the tables have no FK to the file).
4. A resource of another source (source `mp3quran`) is not touched by a QF sync (proved by a test; no guard is needed, the sync works from `resources->sourceId('qf')`).

## Files to change

- `app/Domains/Content/Sync/Handlers/ChapterRecitationsHandler.php`
- `app/Domains/Content/Services/ContentSyncService.php`: **no change expected**; only if the return type change below forces one, report it.
- `tests/Feature/Content/ContentHandlersTest.php`: append the new tests (the helpers are file-level functions in that file).

No migration, no new file in `app/`.

## Exact changes in `ChapterRecitationsHandler`

1. Constructor gains two parameters, appended after `$timings`: `private readonly TaybahTimingRepository $taybah` and `private readonly RecitationSegmentsFlagService $segmentsFlag`. (`ContentServiceProvider::register()` resolves the handler with `$app->make(...)`, so no provider change.)
2. `replaceFromSnapshot`: keep the existing `$hasSegments` computation for the `upsertForResource` call, then after `$this->files->insert($fileRows); $this->timings->insert($timingRows);` call `$this->segmentsFlag->refresh($recitation->id);`. (The flag is thereby recomputed against the files and Taybah sets that now exist.)
3. `refreshSegmentsFlag(Recitation $recitation)` becomes `$this->segmentsFlag->refresh($recitation->id);` (the body that used `recitations->setHasWordSegments(... anyHaveSegments ...)` moves into the service from step 02b).
4. `upsertFile`: after `$this->files->upsert($row);` call `$this->refreshSegmentsFlag($recitation);` (a URL change can make a Taybah set stale, so the flag must follow). The returned change is unchanged.
5. `upsertTiming` and `deleteTiming` return `?ContentChangeData`. After the QF row is stored (or deleted) and the flag refreshed: if `$this->taybah->hasServedSet($recitation->id, $file->chapter_id, $file->audio_url)` is true (`$file` is the `ChapterAudioFile` that `requireFile()` returns), `return null;` instead of the change. `applyRow`'s return type is already `?ContentChangeData` and so is `skipRow`'s; but `removeRow(...)` and `delete(Resource, Mutation)` are declared `: ContentChangeData` today and must become `?ContentChangeData` too (they pass `deleteTiming`'s result through; `deleteRecitation` and `deleteFile` still never return null). `ContentSyncService` already handles null from `applyRow`, so it needs no change. Add one PHPDoc line on each method saying why (ADR 0060 decision 5: a served Taybah set owns that file's pack rows).
6. `upsertRecitation` is unchanged (it keeps `$existing->has_word_segments`).
7. `trustsTimings`, the config `quran.untrusted_timing_recitations`, and everything about names are unchanged.

## Tests (append to `ContentHandlersTest.php`; names as written or close)

Helper to add in that file: `taybahSetFor(ChapterAudioFile $file, bool $withSegments = true): TaybahTimingSet` creating a `TaybahTimingSet` (factory) with `recitation_id = $file->recitation_id`, `chapter_id = $file->chapter_id`, `audio_url = $file->audio_url`, and one `TaybahRecitationTiming` (factory) for verse 1 with `segments` `[[1, 0, 500]]` or `null`.

- `it('keeps Taybah sets and rows when a QF snapshot replaces the files')`: bootstrap the QF resource, add a set and rows, run a second `RESOURCE_CREATE` snapshot for the same resource (use `contentResourceMutation(..., 'RESOURCE_INVALIDATE', ...)` or a second `RESOURCE_CREATE`, whichever the existing tests use for a re-snapshot), then assert the set and rows still exist unchanged.
- `it('keeps has_word_segments true for an untrusted reciter that has served Taybah segments')`: config `untrusted_timing_recitations = [6]`, snapshot, set with segments exists beforehand (create the resource first through a bootstrap, then add the set, then re-snapshot); flag is true after the snapshot although no QF timing row is stored.
- `it('sets has_word_segments false when the Taybah set has no segments and the reciter is untrusted')`.
- `it('drops the flag when a file url change makes the Taybah set stale')`: a `ROW_UPDATE` `chapter_audio_file` mutation with a different URL; flag false afterwards; the set row still exists.
- `it('leaves Taybah rows alone when a QF audio_segment is created, updated or deleted')` (three mutations), and for a served set: `it('stores the QF timing but writes no change row and no version bump when a served Taybah set covers the file')` (assert the QF `RecitationTiming` row exists, `ContentChange` count unchanged, `resources.version` unchanged).
- `it('writes the change row and bumps the version when no Taybah set covers the file')` (the existing behaviour, for contrast; may already be covered, then reference it rather than duplicating).
- `it('leaves Taybah rows alone when a chapter_audio_file is deleted by a QF mutation')`.
- `it('does not touch a recitation owned by another source during a QF sync')`: create a `ContentSource` `mp3quran`, a `Resource` (`group = ChapterRecitations`, `source_key = '6'` **the same key as the QF fixture reciter**, `version = 9`), a `Recitation`, a `ChapterAudioFile` and a Taybah set on it; run the QF fixture snapshot for reciter 6; assert the mp3quran resource, recitation, file, set and rows are unchanged and its version is still 9, while the QF resource of the same key got its own rows.
- Every other existing test in the file still passes untouched.

## Gates

```bash
cd /Applications/MAMP/htdocs/quran-app/apps/api
export PATH=/opt/homebrew/bin:$PATH
vendor/bin/pint --format agent
composer qa
```

Contract gate: copy `packages/api-contract/openapi.json` and `src/schema.d.ts` to a scratch folder you create with `mktemp -d` first; after the work run `npm run generate -w @quran/api-contract` from the repo root (nvm Node 26) and `diff` against the copies; it must be empty (the tree is dirty, never diff against `HEAD`).

## Out of scope

The pack query and release wiring (step 05), MP3Quran import (step 04), the importer (02b), mobile code, any change to `quran.untrusted_timing_recitations` or `trustsTimings`.

## Open questions

None. (Decision 5 above, "store the QF row but emit no change while a Taybah set is served", is an implementation default that follows ADR 0060 decision 5; it adds a rule the ADR does not spell out. Report it to the orchestrator so the ADR can be amended.)
