# Fix — review findings on steps 3 and 4 (API)

Follow [README.md](README.md). Applies to the uncommitted step 3 and 4 code in `app/Domains/Content`. Three fixes, each found by a **live** sync against QF prelive, plus the tests that would have caught them. Change nothing else.

## 1. The chapter recitation filter is rejected by QF

**What happens:** `php artisan content:sync chapter_recitations` fails with QF's 422 `Duplicate resource group: chapter_recitations`.

**Why:** `config/quran.php` has `'chapter_recitations:6;chapter_recitations:7'`. QF takes several IDs of one group **comma-separated** (`chapter_recitations:6,7`, verified live); `;` only separates different groups.

**Fix:**
- Set `'chapter_recitations' => 'chapter_recitations:6,7'`.
- Add a unit test over every `config('quran.sync.groups')` value: each entry has the shape `^[a-z_]+:(\*|\d+(,\d+)*)$`, and each one's group equals its config key.

## 2. A resource missing from QF's catalogue fails the whole run

**What happens:** `php artisan content:sync tafsirs` fails with `Quran Foundation catalog has no entry for resource 816.`

**Why:** prelive Sync returns 7 tafsirs, but `GET /resources/tafsirs` lists only 6 (`926, 381, 169, 170, 804, 159`). Tafsir 816 syncs fine; only its catalogue entry is missing.

**Fix** (in `ContentSyncService::catalogEntry`, or wherever the lookup lives):
- A missing catalogue entry must **not** throw.
- Leave `name`, `author_name`, `language_name` and `language_code` null and `direction` null (not `ltr`). Apply the snapshot as normal.
- Log one warning per resource: resource group and id only, never record content.
- A later run whose catalogue does include it fills the metadata in (the existing `RESOURCE_CREATE`/`RESOURCE_UPDATE` path).

**Test:** a tafsir `RESOURCE_CREATE` whose id isn't in the catalogue fixture.
- The run ends `ok`, the rows are written, and the metadata is null.
- A second run with the id added to the catalogue (a `RESOURCE_UPDATE`) fills the name in.

## 3. Committed changes lose their `ResourceContentChanged` event when a later mutation fails

**What happens:** events are dispatched only after the whole run succeeds. Suppose resource A's mutations commit, then a later mutation (resource B) fails:
- The run fails.
- The rerun skips A's mutations (`sequence <= last_sequence`), so A is never in `$touched` again.
- A's pack is never rebuilt (step 6 builds packs from this event), so devices never get A's committed changes.

**Fix:** dispatch `ResourceContentChanged` for every resource whose mutations **committed** in this run. Do it on success **and** on failure, before rethrowing. `$touched` only gains entries after a transaction commits, so dispatch from it in both paths. Keep "once per resource per run".

**Test** (`Event::fake`):
- A run with A's `ROW_UPDATE` (commits), then B's `RESOURCE_CREATE` whose snapshot returns 500 on every retry.
- The run fails, and `ResourceContentChanged` was dispatched exactly once, for A, with A's new version.
- Nothing is dispatched for B.

## Gates

`cd apps/api && vendor/bin/pint && composer qa`, then `git status --short`. Only `config/quran.php`, the sync service (and the handler, if needed) and the tests change.

## Reviewer live check (not for the agent)

`content:sync tafsirs` gives 7 resources, with 816 having null metadata. `content:sync chapter_recitations` gives 2 recitations, each with 114 files and 6,236 timings.
