# ADR 0062, step 3: unavailable surahs in the reciter's surah list

Branch `ft/recitation-timings`. Read first: `.claude/agent-rules.md`, `apps/mobile/CLAUDE.md`, ADR 0062 decision 3. Do not commit. Depends on step 2.

## Goal

In Listen > a reciter's page, a surah the reciter lacks is listed, dimmed, shows «غير متوفرة» where the play or download control would be, is not pressable, and is disabled for accessibility. Other rows are unchanged. Frame: `ReciterSurahsUnavailable` (render: `/private/tmp/claude-501/-Applications-MAMP-htdocs-quran-app/b314d19d-b450-43e2-9cf5-0b05834f905a/scratchpad/frames/ReciterSurahsUnavailable.png`).

## Findings (checked in code)

- Today `reciterSurahs()` (`features/audio/data/reciter-surahs.ts`) **filters** the list to chapters with audio, so a missing surah is invisible. The frame shows all surahs, so the filter goes.
- `ReciterDownloadsScreen.tsx` draws rows with `ReciterSurahRow` (wraps `shared/ui/DownloadRow`). The count header uses `total` («{n} من {total} محمّلة», `ReciterPageHeader`).
- `enqueueAll` (`downloads/manager.ts`) queues only surahs that have a `chapter_audio_files` row, and `enqueueSurah` returns false when `audioFor` finds none, so «تنزيل الكل» never queues a missing surah. No change there.

## Files

Modify:

1. `features/audio/data/reciter-surahs.ts`: `ReciterSurahs` becomes
```ts
export type ReciterSurah = ChapterRecord & { available: boolean };
export type ReciterSurahs = {
  /** Every surah of the Quran in order, each flagged. Empty until the pack is installed. */
  surahs: ReciterSurah[];
  /** Surahs the reciter has audio for (the «{n} من {total}» denominator). */
  total: number;
};
```
`reciterSurahs(db, resourceId)` returns all chapters with `available = withAudio.has(chapter.id)`; `total = withAudio.size`. When the pack is not installed (`recitationIdForResource` is undefined) keep today's behaviour: `{ surahs: [], total: chapters.length }` (the header showed 114). **Open question Q3 (developer): the header denominator for a partial reciter, 109 (this brief's default) or 114.** Use `chapterIdsWithAudio` from step 2's `availableChapterIds`.
2. `features/audio/hooks/useReciterSurahs.ts`: update the `EMPTY` constant and the `installed ? result : { surahs: [], total: result.total }` branch to the new type.
3. `features/audio/components/ReciterSurahRow.tsx`: add prop `available?: boolean` (default `true`). When `false`, render `UnavailableSurahRow` (below) instead of `DownloadRow`.
4. `features/audio/screens/ReciterDownloadsScreen.tsx`: pass `available={item.available}` and `showDivider`; for an unavailable row pass no-op handlers (never called). Do not pass `starting`/`status` for it. Divider rule stays `index < surahs.length - 1`.
5. `src/core/i18n/locales/ar.json` and `en.json`, under `listen.reciter`:
   - `surahUnavailable`: ar «غير متوفرة» / en "Unavailable"
   - `surahUnavailableLabel`: ar «{{surah}}، غير متوفرة بصوت هذا القارئ» / en "{{surah}}, not available in this reciter's voice"

Create:

6. `features/audio/components/UnavailableSurahRow.tsx`, own file, own test.
```ts
export function UnavailableSurahRow({ title, showDivider = false, testID }: { title: string; showDivider?: boolean; testID?: string })
```
Layout (match the frame; tokens only, no hex): the same outer metrics as `DownloadRow` (`theme.size.downloadRowMinHeight`, `theme.size.downloadRowInset`, divider `colors.line` hairline when `showDivider`). The title in `UiText variant="headline"` with `tone="muted"` (ink-muted, the whole row dimmed per the frame); trailing `UiText variant="caption" tone="muted"` «غير متوفرة» in a `minHeight: theme.size.touchTarget` centred box (no border, no fill: it is a label, not a button). The row root has `accessible`, `accessibilityLabel = t('listen.reciter.surahUnavailableLabel', { surah: title })`, `accessibilityState={{ disabled: true }}`, and **no** `accessibilityRole="button"`, no `onPress` (not a `Pressable`). The frame's number medallion and "مكية · ٥٤ آية" subtitle belong to the SurahIndex row style which this screen's `DownloadRow` does not draw today; **do not add a medallion**: keep the screen's existing row look and only dim it. (If the developer wants the medallion rows, that is a separate design step.)

## Tests

`components/UnavailableSurahRow.test.tsx`: renders title and «غير متوفرة»; ar and en strings (switch the app locale as sibling tests do); root has `accessibilityState.disabled === true`, label from `surahUnavailableLabel`, and is not a button (`queryByRole('button')` is null); pressing it does nothing (no throw, no callback); divider on/off; no raw hex (assert via the pattern used in `ReciterRow.test.tsx`); title uses the muted ink colour from `theme`.

`components/ReciterSurahRow.test.tsx`: add `'renders the unavailable row when available is false'` and `'the unavailable row has no download or play button'`.

`data/reciter-surahs.test.ts`: update for the new shape. `'lists every surah and flags the ones with no audio'` (rows for 36 and 38: 37 is `available: false`, list length 114), `'counts total as the surahs with audio'`, `'is empty and keeps the 114 total before the pack is installed'`.

`screens/ReciterDownloadsScreen.test.tsx`: add `'shows an unavailable surah dimmed and not pressable'` (surah 37 missing: `surah-row-37` has no `-action`; other rows keep theirs), and `'Download all still queues only surahs with audio'` (assert `enqueueAll` count equals the rows with audio).

## Gates

```
cd apps/mobile && npm run lint && npx tsc --noEmit && npm test && npx expo-doctor
```

## Frame

`ReciterSurahsUnavailable`. Approved difference to record in the review: this screen's rows are `DownloadRow` rows without the SurahIndex medallion (existing screen, no frame for it); the unavailable state follows the frame's dimming, label and non-interactive behaviour.

## Do not touch

`features/azkar/**`, `azkarPlayerStore`, `apps/api`, `packages/api-contract`, `downloads/manager.ts`.
