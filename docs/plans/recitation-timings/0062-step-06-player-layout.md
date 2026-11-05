# ADR 0062, step 6: full player without artwork (room for the reciters list)

Branch `ft/recitation-timings`. Read first: `.claude/agent-rules.md`, `apps/mobile/CLAUDE.md`, ADR 0062 decision 5, the `apple-design` skill. Do not commit. Depends on step 1. This step only re-lays-out the existing player; the reciters list arrives in step 7.

## Goal

Remove the artwork and make the full player a column that leaves the lower part of the screen to the reciters list: header, reciter name and surah, ayah card, progress, transport, utility bar, then a flexible region (empty until step 7). Frame `PlayerReciters` (render: `/private/tmp/claude-501/-Applications-MAMP-htdocs-quran-app/b314d19d-b450-43e2-9cf5-0b05834f905a/scratchpad/frames/PlayerReciters.png`). The frame's padding is 52 top, 24 sides, 30 bottom, column gap 20, as today.

## Findings (checked in code)

- `PlayerScreen.tsx` renders `ReciterArtwork` when `fitPlayerColumn()` gives an `artworkSize`; `player-fit.ts` shares the room between the artwork and the ayah card (`ARTWORK_MAX/MIN`, `CARD_SHARE`, `CARD_MAX_SHARE`, the card has a fixed `height`). `usePlayerMeasures` measures the fixed parts. `PlayerScrollView` is the page scroller with the drag-to-dismiss gesture bridge.
- `ReciterArtwork` is used only by `PlayerScreen`. After this step it is unused: delete it.
- The frame's ayah card is **as tall as its text** (one line: about 100 pt), not the fixed 168 pt card the player has today. `NowPlayingAyah` already supports no `height`. A very long ayah must still not push the list away: add a cap.

## Files

Modify:

1. `features/audio/player-fit.ts`: remove `ARTWORK_MAX`, `ARTWORK_MIN`, `CARD_SHARE`, `CARD_MAX_SHARE` and `artworkSize`. Add
```ts
/** Room kept for the reciters list: its label plus four 56 pt rows (the frame). */
export const RECITERS_LIST_MIN_HEIGHT = 24 + 4 * 56;
export type PlayerColumnFit = {
  /** The ayah card's largest height; the card is its text's height up to this. Null until the window is measured. */
  cardMaxHeight: number | null;
  /** Only when even the minimum card and the list's minimum do not fit (a very large text size): the column scrolls. */
  scrolls: boolean;
};
export function fitPlayerColumn({ available, fixedCount, fixedHeight, hasCard }: {...same as today}): PlayerColumnFit
```
Rule: `children = fixedCount + 1 (list) + (hasCard ? 1 : 0)`; `room = available - fixedHeight - PLAYER_COLUMN_GAP * (children - 1) - RECITERS_LIST_MIN_HEIGHT`; with a card: `cardMaxHeight = max(AYAH_CARD_MIN_HEIGHT, room)`, `scrolls = room < AYAH_CARD_MIN_HEIGHT`; without a card `cardMaxHeight = null`, `scrolls = room < 0`. `available === null`: `{ cardMaxHeight: null, scrolls: false }`. Keep `PLAYER_COLUMN_GAP`, `AYAH_LINE_HEIGHT`, `AYAH_CARD_MIN_HEIGHT`.
2. `features/audio/components/NowPlayingAyah.tsx`: add optional prop `maxHeight?: number`; applied as `maxHeight` on the card `View` (text scrolls inside when taller; the counter stays pinned, as with `height`). `height` keeps working. Update the doc comment.
3. `features/audio/screens/PlayerScreen.tsx`: remove the `ReciterArtwork` import and render, the `fit.artworkSize` usage; pass `maxHeight={fit.cardMaxHeight ?? undefined}` and no `height` to `NowPlayingAyah`. The outer container: a `View` (flex 1, same padding and column) normally; wrap the same content in `PlayerScrollView` **only when `fit.scrolls`** (as today's page scroll, `scrollEnabled`). The options part keeps `onLayout` for measurement but loses `marginTop: 'auto'`; below it add `<View style={{ flex: 1, minHeight: 0 }} testID="player-reciters-slot" />` (an empty flexible region; step 7 fills it with `PlayerReciterList`). Update the file's header comment.
4. `features/audio/hooks/usePlayerMeasures.ts`: no change needed (the `PlayerPart` list stays: header, title, notice, progress, transport, options).

Delete: `features/audio/components/ReciterArtwork.tsx` and `ReciterArtwork.test.tsx`.

## Tests

`player-fit.test.ts`: rewrite. `'returns no cap before the window is measured'`; `'caps the card at the room left after the list minimum on an iPhone 17 height (available 762)'` with measured fixed parts (use the numbers from the old iPhone 17 case and assert the cap is `>= AYAH_CARD_MIN_HEIGHT`); `'never lets the cap fall below the minimum card'`; `'scrolls only when the minimum card and the list minimum do not fit (iPhone SE with a large text size)'`; `'without a card, scrolls only when the fixed parts and the list do not fit'`. Delete every artwork case.
`components/NowPlayingAyah.test.tsx`: add `'caps its height with maxHeight and scrolls the text inside'` and `'is as tall as its text when shorter than maxHeight'`; keep the existing `height` cases.
`screens/PlayerScreen.test.tsx`: remove the artwork assertions and the `'matches the frame numbers ... artwork ...'` artwork part (keep play 76, transport, progress, options, padding 52/24/30); replace the iPhone 17 / SE / scroll cases (lines ~292-330) with `'shows no artwork'`, `'keeps the card at its text height up to the cap, with no page scroll on an iPhone 17'`, `'caps a long ayah and scrolls its own text with transport, options and the list slot rendered'`, `'scrolls the whole column only when even the minimum card does not fit'`, and `'renders the reciters slot below the utility bar'`. Keep the Arabic, English, accessibility and no-raw-colour tests.

## Gates

```
cd apps/mobile && npm run lint && npx tsc --noEmit && npm test && npx expo-doctor
```

## Frame

`PlayerReciters` (upper part). The old `Player` and `PlayerBuffering` frames are superseded for the full player (ADR 0062 header).

## Do not touch

`features/azkar/**`, `azkarPlayerStore`, `PlayerHost`, `apps/api`, `packages/api-contract`. Do not type the frame's ayah text into any test (use «نص تجريبي ١ — ليس قرآنًا»-style placeholder words as the existing PlayerScreen tests do).
