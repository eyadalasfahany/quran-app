# ADR 0062, step 7: the «القرّاء» list in the player (rows and states, no switching yet)

Branch `ft/recitation-timings`. Read first: `.claude/agent-rules.md`, `apps/mobile/CLAUDE.md`, ADR 0062 decision 5, ADR 0046, ADR 0052. Do not commit. Depends on steps 2 and 6. Step 8 wires the switch; here the rows take callbacks.

## Goal

Under the controls, an always-visible list of reciters for the current surah. Frames `PlayerReciters` and `PlayerReciterDownloading` (renders in `/private/tmp/claude-501/-Applications-MAMP-htdocs-quran-app/b314d19d-b450-43e2-9cf5-0b05834f905a/scratchpad/frames/`; HTML ids of the same names in `quran-app-screens.html`).

## Row states

| State | Draws | Interaction | a11y |
| --- | --- | --- | --- |
| `current` | filled tile, a check mark (`CHECK_ICON`) at the end, status «يُتلى الآن» only while playing | none (already selected) | role `radio`, `checked: true` |
| `installed` | normal | tap switches (callback `onSelect`) | role `radio`, `checked: false` |
| `notDownloaded` (pack not installed, availability unknown) | status «غير منزّل», a 44 pt circular download button at the end | the button calls `onDownload` | button label `common.a11yAction` with `ui.download.start` and the name |
| `downloading` | status «جارٍ التنزيل», a 4 pt progress bar under the text, a 44 pt stop button | stop calls `onCancel` | `progressbar` with `now`; stop button label with `ui.download.cancel` |
| `unavailable` (installed pack, no file for this surah) | dimmed, status «غير متوفرة لهذه السورة» in place of the style tag and status | disabled | `accessibilityState.disabled: true`, not a button |

The style tag (مرتّل / مجوّد / معلّم) shows beside the status for every state except `unavailable` (frame). A reciter that is installed and has no usable timings keeps the Listen tab's «بدون تتبع» status (`listen.noFollow`). The status for `installed` is joined with a middle dot using `joinStatusLine` (`reciter-list.ts`) and `listen.downloadedSurahs` («سور محمّلة») when the reciter has downloaded surahs (`useDoneCountsByReciter`, `data/downloads.ts`).

## Findings (checked in code) and decisions

- Reuse, do not rebuild: `ReciterTile` (46 pt tile; uses light-theme tokens), `ReciterStyleTag`, `ReciterRow` (Listen). The player is **always dark** (`theme.colors.playerBg`, `playerInk`, `playerMuted`, `playerLine`, `playerGlassFill`; the gold on dark is the brand tint used in `PlayerOptionButton`/`PlayerIconButton`; check `PlayerChoiceRow.tsx` for the exact player tokens and `PlayerProgress.tsx` for the player's progress track colours). `ReciterTile`, `ReciterStyleTag` and `DownloadRow` read light tokens (`useContrastColors`, `brandSurface`), so **they do not match the dark frame**. Create player-dark twins: `PlayerReciterTile`, `PlayerReciterStyleTag` (small files), do not parameterise the light ones.
- The 4 pt bar and 44 pt stop button come from `shared/ui/DownloadRow` (`theme.size.progressHeight`, `theme.radius.progress`, `theme.size.stopGlyph`, `theme.size.touchTarget`); reuse those **tokens** in the dark row.
- Pack install progress is in `useReciterDownloads` (`reciter-downloads.ts`, `byId[resourceId] = { status: 'downloading' | 'failed', progress }`). `downloadReciterPack(resourceId)` exists. **There is no cancel**: add it here (see Files 1). `installResource` already accepts `options.signal` (`core/sync/install-resource.ts`, tafsir downloads use it in `features/reader/panels/tafsir-downloads.ts`).
- Availability for a surah and a set of reciters: `useReciterAvailabilityForSurah(resourceIds, chapterId)` (step 2). `unknown` shows as `notDownloaded` when the pack is not installed (`ReciterEntry.installed === false`) and as `installed` otherwise.
- The list of reciters is `useReciterCatalogue(ready)` (`hooks/useReciterCatalogue.ts`), `reciters` (each `ReciterEntry`), `selectedId`, `playingId`. Order: the current reciter first, then the catalogue order (resource id). **Open question Q6 (developer): ordering when the catalogue has many reciters** (default as stated). A catalogue larger than four rows scrolls inside the list.
- The list scrolls inside the full player, which has a drag-to-dismiss gesture bridge: use `PlayerScrollView` (`components/PlayerScrollView.tsx`) for the list's scroll container so the simultaneous-gesture pattern is kept.

## Files

Modify:

1. `features/audio/reciter-downloads.ts`: add `const controllers = new Map<number, AbortController>()`; `downloadReciterPack` creates one controller per install and passes `signal` to `installResource`; delete it in `finally`. Export `cancelReciterPack(resourceId: number): void` (aborts the controller; the existing `result.status === 'cancelled'` branch already clears the entry). Tests in `reciter-downloads.test.ts`: `'cancelReciterPack aborts a running install and leaves no entry'`, `'cancelling a second time or an unknown id does nothing'`.
2. `features/audio/screens/PlayerScreen.tsx`: render `<PlayerReciterList scrollable={!fit.scrolls} />` inside the `player-reciters-slot` from step 6 (replace the empty view; keep `flex: 1, minHeight: 0`). The screen only composes.
3. `src/core/i18n/locales/ar.json` and `en.json`, new group `player.reciters`:
   - `title`: ar «القرّاء» / en "Reciters"
   - `notDownloaded`: ar «غير منزّل» / en "Not downloaded"
   - `unavailableForSurah`: ar «غير متوفرة لهذه السورة» / en "Not available for this surah"
   - `a11yCurrent`: ar «{{name}}، القارئ الحالي» / en "{{name}}, current reciter"
   - `a11ySwitch`: ar «{{name}}، اضغط للتشغيل بصوته» / en "{{name}}, double-tap to listen in this voice"
   Existing keys reused: `player.nowPlaying` («يُتلى الآن»), `listen.noFollow`, `listen.downloadedSurahs`, `ui.download.start`, `ui.download.cancel`, `ui.download.downloading`, `ui.download.failed`, `common.a11yAction`, `player.style.*`.

Create (each in `features/audio/components/`, own file, own test):

4. `PlayerReciterTile.tsx`: `({ letter, selected, testID })`, 46 pt, radius `theme.radius.md`; `selected` uses the brand-on-dark fill (the frame: `#1f4d40` tile, gold letter: find the matching tokens `brandSurface`/`onBrandSurface` under `theme.colors` and the player variant; if none exists, **stop and ask**: do not hard-code a hex), otherwise `playerGlassFill`; letter in `UiText variant="displaySm"` (same sizes as `ReciterTile`).
5. `PlayerReciterStyleTag.tsx`: `({ label, testID })`, pill radius 10, hairline `playerLine`, gold text.
6. `PlayerReciterRow.tsx`:
```ts
export type PlayerReciterRowState = 'current' | 'installed' | 'notDownloaded' | 'downloading' | 'unavailable';
export function PlayerReciterRow({ name, letter, state, styleLabel, statusLabel, progress = 0, playing = false, showDivider = true, onSelect, onDownload, onCancel, testID }: {
  name: string; letter: string; state: PlayerReciterRowState;
  styleLabel: string | null;     // null for `unavailable`
  statusLabel: string | null;    // the line already composed by the list (see Row states)
  progress?: number;             // 0..1, `downloading` only
  playing?: boolean;             // `current` only: status shows «يُتلى الآن» (the list composes statusLabel; this only drives a11y)
  showDivider?: boolean;
  onSelect: () => void; onDownload: () => void; onCancel: () => void;
  testID?: string;
})
```
Metrics from the frame: row `minHeight: 56`, horizontal padding 6, gap 12, hairline bottom `playerLine`, name `UiText variant="headline"` in `playerInk` (muted when `unavailable`), 12 pt status in `playerMuted`. The check mark: `Icon name={CHECK_ICON}` 22 in the gold tint. Download and stop buttons: `Pressable`, `theme.size.touchTarget` square, radius half, hairline `playerLine`, fill `playerGlassFill`, gold glyph; the download glyph `{ ios: 'arrow.down.to.line', android: 'download' }` (match the glyph the Listen/Downloads screens use: grep `ReciterPlayButton`/`DownloadRow` for it; if a shared one exists, reuse). The stop glyph is the square from `DownloadRow`. In `current` and `installed` the whole row is one `Pressable` (`accessibilityRole="radio"`); in `notDownloaded` and `downloading` the row is **not** pressable (only the button); `unavailable` is a plain `View` with `accessibilityState={{ disabled: true }}`. Direction: `flexDirection: 'row'` (follows the layout direction, ADR 0012); the check and buttons sit at the end edge.
7. `PlayerReciterList.tsx`: `({ scrollable }: { scrollable: boolean })`. Reads `usePlayerStore` (`chapterId`, `reciterId`, `status`), `useReciterCatalogue`, `useReciterAvailabilityForSurah(ids, chapterId)`, `useReciterDownloads` (progress), `useDoneCountsByReciter`. Composes the title (`UiText variant="label" tone` muted on dark, `player.reciters.title`, `accessibilityRole="header"`) and one `PlayerReciterRow` per reciter. State per reciter: current reciter -> `current`; `availability === 'unavailable'` -> `unavailable`; download entry `downloading` -> `downloading`; `!installed` -> `notDownloaded`; else `installed`. A failed pack download shows the status «تعذّر التنزيل» (`ui.download.failed`) in the `notDownloaded` row. Callbacks come from `features/audio/reciter-playback.ts`: this step defines **placeholders** `onSelect`, `onDownload` = `downloadReciterPack`, `onCancel` = `cancelReciterPack` and leaves `onSelect` a documented no-op (`// step 8`). With no surah loaded (`chapterId === null`) the list shows every reciter as `installed`/`notDownloaded` and no `unavailable`. Container: `PlayerScrollView` when `scrollable`, else a plain `View`; `testID="player-reciters"`.

## Tests

`PlayerReciterRow.test.tsx`: one `it` per state asserting the visible text, the controls present and absent (`current` has the check and no download button; `notDownloaded` has a 44 pt download button; `downloading` has progressbar `accessibilityValue.now` equal to the percent and a stop button; `unavailable` has no button and `disabled: true`); callbacks fire (`onSelect` on press of `installed`; not on `current`, `unavailable`, `notDownloaded`); `radio` role and `checked` state; labels; both locales (Arabic and English, row mirrored under English via `I18nManager`); no raw hex; touch targets `>= 44`; the progress fill is the percent of the bar and starts at the start edge.
`PlayerReciterTile.test.tsx`, `PlayerReciterStyleTag.test.tsx`: render, selected variant, locales, no raw hex.
`PlayerReciterList.test.tsx`: states per reciter from fixtures (a current, an installed, an uninstalled, a downloading, an unavailable reciter); current first; `unavailable` after a pack with no row for the surah (use `test-db.ts`); an uninstalled reciter is never `unavailable`; the stop button calls `cancelReciterPack`; the list renders without a loaded surah; scrollable and non-scrollable containers; ar and en.
`PlayerScreen.test.tsx`: `'shows the reciters list below the options'`.
`reciter-downloads.test.ts`: the cancel cases above.

## Gates

```
cd apps/mobile && npm run lint && npx tsc --noEmit && npm test && npx expo-doctor
```

## Frames

`PlayerReciters`, `PlayerReciterDownloading`. The frame's caption annotation «يبدأ التشغيل تلقائيًا عند انتهاء التنزيل» is a design note, not UI: do not render it.

## Do not touch

`features/azkar/**`, `azkarPlayerStore`, the light `ReciterRow`/`ReciterTile`/`DownloadRow` (read-only), `apps/api`, `packages/api-contract`.
