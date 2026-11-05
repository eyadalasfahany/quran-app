# ADR 0062, step 4: mini player, surah unavailable for the reciter

Branch `ft/recitation-timings`. Read first: `.claude/agent-rules.md`, `apps/mobile/CLAUDE.md`, ADR 0062 decision 1, ADR 0059 (mini player visibility), ADR 0046 (one current ayah). Do not commit. Depends on step 2 (`'surah-unavailable'` error code, `lookupAudio` change).

## Goal

When the user presses play on a surah the selected reciter lacks (surah 37 with this reciter), the reader's mini bar shows an info glyph and «{surah} غير متوفرة بصوت {reciter}» with a «تغيير القارئ» button (44 pt minimum) that opens the reciter picker. Nothing plays; the bar has no play button and no progress. Frame `ReadingMiniUnavailable` (render: `/private/tmp/claude-501/-Applications-MAMP-htdocs-quran-app/b314d19d-b450-43e2-9cf5-0b05834f905a/scratchpad/frames/ReadingMiniUnavailable.png`; HTML in `quran-app-screens.html`, id `ReadingMiniUnavailable`).

## Findings (checked in code)

- Play from the mini bar: `MiniPlayer.tsx` `onToggle` calls `playVerse(current)` (`play-verse.ts`) which calls `playFromVerse` (`player.ts`). `playFromVerse` and `loadChapter` call `lookupAudio`; after step 2 a missing surah returns `'surah-unavailable'`.
- The reader's bar is `MiniPlayer variant="reader"` -> `ReaderMiniPlayer` -> `ReaderMiniBar` (collapsible to `MiniPlayerCapsule`). It is shown when `status !== 'idle'` or an idle reciter resolves (`useMiniPlayerVisible`, ADR 0059). A `status === 'error'` store state keeps the reader bar visible and hides the tabs bar (tabs show only while playing or loading). So this state is **reader-only**; no tabs variant is drawn (ADR 0059 §1, the frame says idle reader rule).
- **The reciter picker is the Listen tab**: there is no sheet. `SettingsScreen.tsx` already does `router.navigate('/(main)/(listen)' as Href)` for its reciter row. Use the same call. (The frame's `href="#Reciters"` is that screen.)

## Store and engine

1. `features/audio/playerStore.ts`: add state `unavailable: { reciterId: number; chapterId: number } | null` (initial `null`), action `markUnavailable: (request: { reciterId: number; chapterId: number }) => void` that sets `{ status: 'error', error: 'surah-unavailable', unavailable: request, activeVerseId: null, activeWord: null, startingTarget: null }`. `beginLoad`, `moveTo`, `restore`, `reset`, `markStopped` set `unavailable: null`. `markFailed` does not touch it (it sets other codes; it must also set `unavailable: null` so a later failure clears it).
2. `features/audio/player.ts`: where `lookupAudio` returns an error, if `lookup.error === 'surah-unavailable'` call `store().markUnavailable({ reciterId, chapterId })` instead of `markFailed`. Two sites: `loadChapter` and `playFromVerse`. Extract a small private `failLookup(lookup, reciterId, chapterId)` used by both.

## UI

Create, each in its own file with a colocated test:

3. `features/audio/components/ReaderMiniUnavailable.tsx`
```ts
export function ReaderMiniUnavailable({ message, onChangeReciter, onCollapse }: {
  message: string;            // «الصافات غير متوفرة بصوت إسلام صبحي»
  onChangeReciter: () => void;
  onCollapse: () => void;     // same collapse as ReaderMiniBar's drag-down / chevron
})
```
Layout from the frame (tokens only, `useTheme()`, no hex): a `GlassSurface radius="lg"` (same container as `ReaderMiniBar`, `testID="mini-player-reader-unavailable"`), padding top 24, 12 elsewhere, column, gap 10; `MiniPlayerChevron` at the top; row: a 46 x 46 tile (radius 12, `theme.colors.fillSecondary`, brand-ink glyph) with the info glyph (`{ ios: 'info.circle', android: 'info' }`, 22), then the message in `UiText` (`scale="bar"`, 15/600 headline-like: use `variant="subhead" weight={600}`), `flex: 1`, with `role="status"` and `accessibilityLiveRegion="polite"`; below, aligned to the end edge, a `Pressable` pill: `minHeight: theme.size.touchTarget`, `paddingHorizontal: 14`, `borderRadius: theme.radius.lg`, hairline `colors.line`, fill `theme.colors.surfaceRaised`, text «تغيير القارئ» `UiText variant="caption" tone="brand" weight={600}`, `accessibilityRole="button"`, `accessibilityLabel` = the same string. Pan-to-collapse: reuse `ReaderMiniBar`'s gesture by extracting nothing; instead wrap this component with the same `GestureDetector` pattern **only if** `ReaderMiniBar` exposes it. Simpler and allowed: no drag here; the chevron is decorative and `onCollapse` is wired to an `accessibilityActions` entry `collapse` and to a tap on the chevron row. (If this makes the bar differ from the frame's chevron affordance, keep the visual and note it.)
4. `features/audio/hooks/useMiniUnavailable.ts`
```ts
/** The unavailable notice for the reader bar, or null. */
export function useMiniUnavailable(): { chapterId: number; reciterId: number } | null;
```
Rule (this is what clears the bar; no explicit clear call): returns `store.unavailable` only when `status === 'error'`, `error === 'surah-unavailable'`, **and** (a) the reciter a play would use now (`useIdleReciter(true)?.resourceId`, which follows the saved choice) equals `unavailable.reciterId`, **and** (b) the current ayah's surah (`useLastReadVerseKey()`, take the chapter from `"c:v"`) equals `unavailable.chapterId`. So picking another reciter, or reading another surah, returns the bar to its normal idle form with no state to reset. A new play calls `beginLoad`, which clears it.

Modify:

5. `components/MiniPlayer.tsx` (reader branch): when `useMiniUnavailable()` is not null, build the message `t('player.mini.unavailable', { surah: <bare chapter name>, reciter: shownReciter })` (chapter name: `chapterDisplayName(getChapter(db, chapterId), locale)`; the reciter name is the idle reciter's) and render `ReaderMiniPlayer` with new prop `unavailable={{ message, onChangeReciter: () => router.navigate('/(main)/(listen)' as Href) }}`.
6. `components/ReaderMiniPlayer.tsx`: accept `unavailable?: { message: string; onChangeReciter: () => void }`. When set and not collapsed, render `ReaderMiniUnavailable` instead of `ReaderMiniBar`. **Collapsed capsule rule:** while unavailable, the capsule is unchanged (it shows no progress, as when idle); expanding shows the unavailable bar again while the rule in `useMiniUnavailable` holds.
7. Footprint: the unavailable bar is taller than `MINI_PLAYER_METRICS.reader.height` (68). In `mini-player-metrics.ts` add `export const MINI_PLAYER_READER_UNAVAILABLE_HEIGHT = 136;` (24 + 46 + 10 + 44 + 12) and `MINI_PLAYER_READER_UNAVAILABLE_FOOTPRINT = MINI_PLAYER_READER_BOTTOM + MINI_PLAYER_READER_UNAVAILABLE_HEIGHT + MINI_PLAYER_BOTTOM_GAP`. `features/reader/useReaderMiniFootprint.ts`: `readerMiniFootprint(shown, collapsed, unavailable = false)` returns the larger height/footprint when `!collapsed && unavailable`; the hook passes `useMiniUnavailable() !== null`. Update `mini-player-metrics.test.ts` and `useReaderMiniFootprint.test.tsx`.
8. i18n (`ar.json`, `en.json`) under `player.mini`:
   - `unavailable`: ar «{{surah}} غير متوفرة بصوت {{reciter}}» / en "{{surah}} isn't available in {{reciter}}'s voice"
   - `changeReciter`: ar «تغيير القارئ» / en "Change reciter"

## Edge cases

- A reciter with no installed pack: `playVerse` installs the pack first, then `playFromVerse` finds no file: the bar flips to unavailable after the install (expected).
- Play from the **Listen tab** or the reciter page with a reciter that lacks the current ayah's surah: `markUnavailable` sets `status: 'error'`; the tabs bar stays hidden and no message shows there; the full player shows `PlayerErrorNotice` with `player.errors.surahUnavailable`. **Open question Q4 (developer): should the Listen tab say something here?** ADR 0062 is silent; default: no change.
- `markUnavailable` must never start audio or set `chapterId`.

## Tests

`components/ReaderMiniUnavailable.test.tsx`: renders message and «تغيير القارئ»; the button has role button, label, `minHeight >= 44`, calls `onChangeReciter`; the message node has `role="status"` and polite live region; no play button and no progress line (`queryByTestId('mini-player-toggle')`, `mini-player-progress` null); ar and en render (message text direction via `I18nManager`, as `ReaderMiniBar.test.tsx` does); uses theme colours only (no raw hex).
`hooks/useMiniUnavailable.test.tsx`: returns the entry when status, reciter and surah match; returns null after the saved reciter changes (`setReciterId`); null after the last-read ayah moves to another surah; null after `beginLoad`.
`components/MiniPlayer.test.tsx`: `'shows the unavailable bar when play hits a surah the reciter lacks'` (drive through `markUnavailable`), `'«تغيير القارئ» navigates to the Listen tab'` (router mock `navigate('/(main)/(listen)')`), `'the tabs variant does not show the unavailable bar'`.
`player.test.ts`: `'playFromVerse on a surah with no file marks it unavailable and starts nothing'` (no `play()` call; `status 'error'`, `unavailable` set, `error 'surah-unavailable'`), `'loadChapter does the same'`, `'a later beginLoad clears it'`. `playerStore.test.ts`: `markUnavailable` and the clears.

## Gates

```
cd apps/mobile && npm run lint && npx tsc --noEmit && npm test && npx expo-doctor
```

## Frame

`ReadingMiniUnavailable`; compare a simulator screenshot (iPhone 17) with `python3 packages/design-tokens/scripts/frame-shot.py ReadingMiniUnavailable <out.png>` (step 9 does the formal review).

## Do not touch

`features/azkar/**`, `azkarPlayerStore`, `apps/api`, `packages/api-contract`. Do not copy the frame's ayah text anywhere; tests use the placeholder reciter and surah names only.
