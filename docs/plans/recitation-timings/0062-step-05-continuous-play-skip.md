# ADR 0062, step 5: continuous play skips unavailable surahs and says so

Branch `ft/recitation-timings`. Read first: `.claude/agent-rules.md`, `apps/mobile/CLAUDE.md`, ADR 0062 decision 2, ADR 0059 (where the playing bar shows), ADR 0012/0025/0029 (audio direction, play glyph). Do not commit. Depends on step 2.

## Goal

When continuous play reaches a surah the reciter lacks, it moves on (36 to 38) and the playing mini bar shows a secondary line «تخطّي {surah} · غير متوفرة بصوت {reciter}» for about 4 s, announced to VoiceOver and TalkBack. Frame `ReadingMiniSkipped` (render: `/private/tmp/claude-501/-Applications-MAMP-htdocs-quran-app/b314d19d-b450-43e2-9cf5-0b05834f905a/scratchpad/frames/ReadingMiniSkipped.png`); it is drawn on the Listen tab (tabs variant); the same line shows in the reader's playing bar (ADR 0059: wherever the playing bar shows).

## Findings (checked in code)

- **The skip already happens.** `ensureQueue` (`player.ts` ~line 251) builds the native playlist only from the reciter's `chapter_audio_files` rows (`chapterIds`, "Surahs with no audio row for this reciter are not in the playlist"). The playlist advances 36 to 38 on its own, and `neighbourChapter` (used by `nextAyah`, `nextSurah` restore branch) also searches `chapterIds`. This step adds **detection and the notice only**; do not add skip logic.
- Where the advance is seen: `onTrackChanged({ previousIndex, currentIndex })` (`player.ts` ~595). `active.chapterIds[previousIndex]` is the ended surah and `active.chapterIds[currentIndex]` the new one.
- **End cases (already correct, no notice):** if every remaining surah is unavailable the last available surah is the last index of `chapterIds`; `onPlaylistStatus` (~556) calls `stopPlayback()` when that last track finishes. Playback stops with no notice. The same holds after surah 114. Do not add a notice for these.

## Behaviour rules

- A notice is raised when the playlist moved **forward by one playlist index** (`currentIndex === previousIndex + 1`) and `chapterIds[currentIndex] > chapterIds[previousIndex] + 1` (there is a gap), while status is `playing` or `loading`, and the change was **not** a user load of a chosen surah. Covers: natural end of a track, `nextSurah()` (`playlist.next`), the lock screen next, and `nextAyah()` crossing into the next surah (it calls `loadChapter(following, ...)`).
- The skipped surahs are the ids strictly between the two: `ended+1 ... current-1`. These are all missing for this reciter by construction.
- User loads of a chosen surah (`playChapter`, `playFromVerse`, reciter row, resume) never raise a notice. Implementation: in `loadChapter` add an optional last parameter `options?: { skippedFrom?: number }`; set a module variable `loadTargetIndex = index` where it sets `intendedIndex`, and in `onTrackChanged` do not raise when `currentIndex === loadTargetIndex` (clear it there). `nextAyah` passes `{ skippedFrom: state.chapterId }` to its `loadChapter(following, ...)`; after a successful load `loadChapter` raises the notice for the gap between `skippedFrom` and `chapterId` using the same helper. `nextSurah`'s restore branch does likewise.
- Several consecutive gaps (38 to 41 skips 39 and 40): the template names one surah, so use the plural line below. **Open question Q5 (developer): plural wording and whether to name them.** Default: 1 skipped = the named line; 2 or more = `skippedMany` with the count.
- The notice is transient (4 000 ms), replaced by a newer one, and cleared at once when a new load begins, playback stops or fails, or the reciter changes.

## Files

Create:

1. `features/audio/skip-notice.ts` (zustand, no persistence)
```ts
export const SKIP_NOTICE_MS = 4_000;
export type SkipNotice = { id: number; reciterId: number; chapterIds: number[] };
type SkipNoticeStore = { notice: SkipNotice | null; show: (notice: Omit<SkipNotice, 'id'>) => void; clear: () => void };
export const useSkipNoticeStore: UseBoundStore<StoreApi<SkipNoticeStore>>;
export function resetSkipNoticeForTests(): void;
```
`show` assigns an incrementing `id`, replaces the current notice and (re)starts one `setTimeout(SKIP_NOTICE_MS)` that clears **only if the id is still current**; `clear` cancels the timer.
2. `features/audio/components/MiniPlayerNotice.tsx`
```ts
export function MiniPlayerNotice({ message, testID }: { message: string; testID?: string })
```
One line of `UiText variant="label" tone="goldInk" weight={600}` (frame: gold-ink 12 pt), `numberOfLines={1}`, `role="status"`, `accessibilityLiveRegion="polite"`, `accessible`. Fades in and out with `timing('standard')` (opacity only, `useReducedMotion()` from reanimated: under Reduce Motion no movement at all, opacity change only, which is the dissolve; never animate height). Import motion from `@/core/theme/motion`; no raw durations.
3. `features/audio/hooks/useSkipNoticeMessage.ts`
```ts
/** The notice text for the playing bar, or null. Also announces it once per notice id. */
export function useSkipNoticeMessage(): string | null;
```
Reads `useSkipNoticeStore`; names via `chapterDisplayName(getChapter(db, id), locale)` and the reciter via `listReciters` + `reciterDisplayName` (`reciter-list.ts`, fallback `t('listen.unnamed')`); `useEffect` keyed on `notice.id` calls `AccessibilityInfo.announceForAccessibility(message)` once.

Modify:

4. `player.ts`: import the store; implement the rules above (helper `raiseSkipNotice(reciterId, fromChapter, toChapter)` calling `useSkipNoticeStore.getState().show({ reciterId, chapterIds })` when `toChapter > fromChapter + 1`; `clear()` at the top of `loadChapter` (user load), in `stopPlayback()`, and in `markFailed` callers is not needed: clear inside `stopPlayback` and when `store().status` becomes `error` via a `usePlayerStore.subscribe` that clears the notice when `status` becomes `error` or `idle` or `reciterId` changes).
5. `components/MiniPlayer.tsx`: both variants, only while `isPlaying`: `const skipMessage = useSkipNoticeMessage();` and render `<MiniPlayerNotice message={skipMessage} />` under the subtitle in the text column (tabs variant: inside the `Pressable`'s text `View`; reader variant: pass `notice` prop to `ReaderMiniPlayer` -> `ReaderMiniBar` and render under its subtitle). The accessibility label of the open button is unchanged.
6. Bar height: the notice line adds 18 pt while shown. In `mini-player-metrics.ts` add `MINI_PLAYER_NOTICE_HEIGHT = 18`. Change the bars from `height` to `minHeight` and add `MINI_PLAYER_NOTICE_HEIGHT` while the notice shows. Footprints must clear it: tabs `MINI_PLAYER_TABS_FOOTPRINT` is read by `core/layout/useTabContentBottom.ts` (find the tabs bar hook that returns it and add the notice height when `useSkipNoticeStore((s) => s.notice !== null)`), reader `readerMiniFootprint` (add a `notice` boolean like step 4's `unavailable`). Update `mini-player-metrics.test.ts`, `useTabContentBottom` test and `useReaderMiniFootprint.test.tsx`.
7. i18n under `player.mini` (`ar.json`, `en.json`):
   - `skipped`: ar «تخطّي {{surah}} · غير متوفرة بصوت {{reciter}}» / en "Skipped {{surah}} · not available in {{reciter}}'s voice"
   - `skippedMany`: ar «تخطّي {{count}} سور · غير متوفرة بصوت {{reciter}}» / en "Skipped {{count}} surahs · not available in {{reciter}}'s voice" (`count` is `formatNumber(n, locale)`; the Arabic plural for 3 to 10 is «سور», for 11 or more the same line is acceptable because a reciter lacking 11 consecutive surahs is not expected; **no plural categories**)

## Tests

`skip-notice.test.ts` (fake timers): `show` sets a notice with an id; it clears after exactly 4 000 ms, not before; a second `show` at 2 000 ms replaces it and restarts the timer (the first timer does not clear the second); `clear` cancels.
`components/MiniPlayerNotice.test.tsx`: renders the message; `role="status"`; live region polite; one line; ar and en; with Reduce Motion mocked on there is no transform/height animation (assert style has no `transform`); no raw hex.
`hooks/useSkipNoticeMessage.test.tsx`: single skipped surah gives the `skipped` text with names; two give `skippedMany` with count; `announceForAccessibility` is called once per notice id (spy), not on re-render; null when no notice.
`player.test.ts` (the existing fake playlist harness): `'raises a notice when the playlist advances over a missing surah (36 to 38)'`; `'raises no notice for an adjacent advance (36 to 37)'`; `'raises no notice when the user loads a chosen surah'`; `'nextSurah over a gap raises a notice'`; `'nextAyah from the last ayah over a gap raises a notice'`; `'two consecutive missing surahs raise one notice with both ids'`; `'the last available surah ending stops playback with no notice'`; `'a new load clears the notice'`.
`components/MiniPlayer.test.tsx`: the notice shows under the subtitle in both variants while playing; hidden when not playing; the bar's accessibility label unchanged; the notice text disappears after 4 s (fake timers).

## Gates

```
cd apps/mobile && npm run lint && npx tsc --noEmit && npm test && npx expo-doctor
```

## Frame

`ReadingMiniSkipped`. Record in the review: the frame shows the Listen tab's bar; the reader variant uses the same line and the same colour.

## Do not touch

`features/azkar/**`, `azkarPlayerStore`, `apps/api`, `packages/api-contract`.
