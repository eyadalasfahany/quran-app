# ADR 0062, step 2: per-reciter surah availability (one selector, no UI)

Branch `ft/recitation-timings`. Read first: `.claude/agent-rules.md`, `apps/mobile/CLAUDE.md`, ADR 0062 and ADR 0061. Do not commit. Depends on nothing; steps 3 to 8 depend on this one.

## Goal

One place that answers "does reciter R have audio for surah S?", used by the surah list, the mini player, the player's reciter list and the engine. Pure data plus two hooks. No UI.

## How availability is derived (checked in code)

A reciter's surah files reach the device in its recitation pack: rows in `content.db` table `chapter_audio_files` (`recitation_id`, `chapter_id`, `audio_url`, ...). `recitation_id` is `recitations.id`, resolved from a resource id by `recitationIdForResource(db, resourceId)` (`features/audio/data/reciters.ts`). `chapterIdsWithAudio(db, recitationId)` (`features/audio/data/audio-files.ts`) lists the surahs with a row. The player's playlist (`player.ts` `ensureQueue`) is also built only from those rows, so **a missing row means the surah is unavailable**.

Three states, because a pack that is not installed has no rows and the app cannot know (a catalogue coverage field would be an API change and is out of scope):

- `'available'`: the pack is installed and has a row for the surah.
- `'unavailable'`: the pack is installed with at least one row, and has no row for the surah.
- `'unknown'`: no `recitations` row for the resource (pack not installed), or the recitation has zero rows. The UI treats `unknown` like available (a download button where a pack is needed), never as unavailable.

`resourceId` everywhere (the store's `reciterId` is a resource id, not `recitations.id`).

## Files

Create:

1. `apps/mobile/src/features/audio/data/surah-availability.ts`
```ts
export type SurahAvailability = 'available' | 'unavailable' | 'unknown';
/** The surahs the reciter has a file for, or null when the pack is not installed (or has no rows). */
export function availableChapterIds(db: SqlExecutor, resourceId: number): Set<number> | null;
export function surahAvailability(db: SqlExecutor, resourceId: number, chapterId: number): SurahAvailability;
/** One query for many reciters: resourceId -> availability of `chapterId`. Missing resource ids are 'unknown'. */
export function availabilityForReciters(db: SqlExecutor, resourceIds: readonly number[], chapterId: number): Record<number, SurahAvailability>;
```
Use `recitationIdForResource` and `chapterIdsWithAudio`; do not write new SQL unless `availabilityForReciters` needs one `IN (...)` query (acceptable; parameterise it).
2. `apps/mobile/src/features/audio/hooks/useReciterSurahAvailability.ts`
```ts
/** The surah's availability for one reciter; re-read when a pack installs or the catalogue syncs. */
export function useSurahAvailability(resourceId: number | null, chapterId: number | null): SurahAvailability;
/** A reciter's available surah set (null = unknown); for lists of many surahs. */
export function useAvailableChapterIds(resourceId: number | null): Set<number> | null;
/** For the player's reciter list: resourceId -> availability of one surah. */
export function useReciterAvailabilityForSurah(resourceIds: readonly number[], chapterId: number | null): Record<number, SurahAvailability>;
```
Each reads `openContentDb().executor` inside `try/catch` (the db may not be open yet: return `'unknown'` / `null` / `{}`), memoised on `useReciterDownloads((s) => s.installedVersion)` and `useCatalogVersion((s) => s.version)` exactly as `usePlayerNames.ts` does. `null` inputs return `'unknown'`.

Modify:

3. `apps/mobile/src/features/audio/player.ts`, function `lookupAudio` (line ~137): return `{ error: 'surah-unavailable' }` instead of `'not-installed'` **only when** `recitationIdForResource` is defined and `chapterAudio` is undefined (the pack is installed but has no file for the surah). Keep `'not-installed'` when the recitation does not exist. This needs the new code in `playerStore.ts`: add `'surah-unavailable'` to `PlayerErrorCode` (comment: "The reciter's pack is installed but has no file for this surah (ADR 0062)"), and in `player-view.ts` add `'surah-unavailable': 'player.errors.surahUnavailable'` to `ERROR_KEYS` (it is `satisfies Record<PlayerErrorCode, string>`, so tsc forces it).
4. `apps/mobile/src/core/i18n/locales/ar.json` and `en.json`, `player.errors`:
   - `surahUnavailable`: ar «هذه السورة غير متوفرة بصوت هذا القارئ.» / en "This surah isn't available in this reciter's voice."
5. Update tests that assert the old code: `features/audio/player.test.ts` lines ~267 and ~276 (keep the ones where the recitation is missing as `'not-installed'`; the case "recitation installed, chapter row missing" becomes `'surah-unavailable'`); `features/audio/player-view.test.ts` (~line 52, add the new code to the list) and `PlayerErrorNotice.test.tsx` (add `'surah-unavailable'` to the codes it renders, in ar and en).

## Tests (colocated)

`data/surah-availability.test.ts` (use `data/test-db.ts`, as `reciter-surahs.test.ts` does):
- `'is available when the pack has a row for the surah'`
- `'is unavailable when the pack has rows but none for the surah'` (rows for 36 and 38, ask 37)
- `'is unknown when the reciter has no recitations row'`
- `'is unknown when the recitation has zero rows'`
- `'availableChapterIds returns the set, sorted-independent, and null when not installed'`
- `'availabilityForReciters answers several reciters in one call and maps a missing resource id to unknown'`

`hooks/useReciterSurahAvailability.test.tsx` (renderHook): result for installed, missing-row and not-installed reciters; re-reads after `useReciterDownloads.setState({ installedVersion: 1 })` (a pack that installs flips `unknown` to `available`); returns `'unknown'` for `null` inputs and when `openContentDb` throws.

## Gates

```
cd apps/mobile && npm run lint && npx tsc --noEmit && npm test && npx expo-doctor
```

## Frame

None (data only).

## Do not touch

`features/azkar/**`, `azkarPlayerStore`, `apps/api`, `packages/api-contract`. No API or contract change is needed (checked: availability is derived from the pack's `chapter_audio_files` rows already on the device).

## Open question carried to later steps

Q2: for an uninstalled pack the app cannot tell that a surah is missing. After the pack installs, the row flips to `unavailable` (step 7 handles it). Accepted limitation; the alternative needs an API coverage field.
