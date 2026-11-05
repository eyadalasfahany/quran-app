# ADR 0062, step 1: remove playback speed from the Quran player

Branch `ft/recitation-timings` (check: `git branch --show-current`). Read first: `.claude/agent-rules.md`, `CLAUDE.md`, `apps/mobile/CLAUDE.md`, `docs/adr/0062-unavailable-surahs-and-player-reciters.md` (decision 4). Do not commit. No new dependency.

## Goal

Delete the speed control of the **Quran** player: UI, store state, engine wiring, tests. The utility row keeps repeat, ayah range and sleep timer in three equal columns (frame `PlayerReciters`).

## Findings (checked in code, 4 Nov 2026)

- Speed is **in memory only**: `playerStore.speed` (default `1`), set by `PlayerSpeedMenu`. It is **not persisted** anywhere (no hit in `settings.ts`, `settings-model.ts`, `resume-model.ts` or any MMKV key). So there is **no stored value to clean up** and no migration. Do not add one.
- **The Azkar player has its own speed** (`useAzkarPlayerStore.speed`, `features/azkar/audio/playback.ts` `setPlaybackRate`) and it reuses three shared things from the Quran player: `SPEED_RATES` (exported by `PlayerSpeedMenu.tsx`, imported by `features/azkar/components/AzkarPlayerBody.tsx`), `SPEED_ICON` (`components/player-icons.ts`, imported by `AzkarPlayerOptionsBar.tsx`) and the i18n keys `player.options.speed`, `player.options.speedTitle`, `player.options.rateValue` (used by `AzkarPlayerBody.tsx`).
- The Azkar player must stay untouched, so this step removes speed from the Quran player only. ADR 0062 says "removed from the app entirely"; that conflicts with the Azkar player. **Open question for the developer (Q1): keep Azkar speed (this brief's default) or remove it in a separate ADR.** Do not decide it here.

## Files

Modify:

1. `apps/mobile/src/features/audio/playerStore.ts`: delete the `speed: number` field (line ~41), `setSpeed` from `PlayerActions` (~87), `speed: 1` from `initialPlayerState` (~111) and the `setSpeed` implementation (~157).
2. `apps/mobile/src/features/audio/player.ts`: delete `playlist.playbackRate = store().speed;` (line ~286) and the whole `usePlayerStore.subscribe` block commented "The playlist plays at the store's speed" (~1047-1052). Keep the volume subscription below it.
3. `apps/mobile/src/features/audio/hooks/usePlayerView.ts`: delete `speed: number` from `PlayerView`, the `speed` selector line and `speed,` in the returned object.
4. `apps/mobile/src/features/audio/screens/PlayerScreen.tsx`: `<PlayerOptionsBar speed={view.speed} versesCount={...} />` becomes `<PlayerOptionsBar versesCount={view.versesCount} />`.
5. `apps/mobile/src/features/audio/components/PlayerOptionsBar.tsx`: remove the `speed` prop from the signature (`{ versesCount }: { versesCount: number }`), the `speed` selector, the speed `PlayerOptionButton`, `'speed'` from `OpenMenu`, the `PlayerSpeedMenu` import and render, `SPEED_ICON` from the icon import, and the two comment lines that mention speed. Update the doc comment to "repeat, the ayah range and the sleep timer". The `GlassSurface` row keeps `flexDirection: 'row'`; each `PlayerOptionButton` must share the width equally (check `PlayerOptionButton.tsx` has `flex: 1`; if it does not, add it and a test).
6. `apps/mobile/src/features/azkar/components/AzkarPlayerBody.tsx`: **one import line only**, `import { SPEED_RATES } from '@/features/audio/components/PlayerSpeedMenu';` becomes `import { SPEED_RATES } from '@/features/azkar/audio/speed-rates';`. No other change in any Azkar file.

Create:

7. `apps/mobile/src/features/azkar/audio/speed-rates.ts`: `export const SPEED_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;` with a one-line comment "The Azkar player's speed choices." (moved from the Quran player).

Delete:

8. `apps/mobile/src/features/audio/components/PlayerSpeedMenu.tsx` and `PlayerSpeedMenu.test.tsx`.

Keep (Azkar uses them): `SPEED_ICON` in `player-icons.ts`; i18n keys `player.options.speed`, `speedTitle`, `rateValue` in `ar.json` and `en.json` (`apps/mobile/src/core/i18n/locales/`, ~line 634). Add a short note to the Q1 line in the plan index; do not delete keys.

## Tests to update (no new component)

- `features/audio/playerStore.test.ts`: remove any `speed` / `setSpeed` assertions.
- `features/audio/player.test.ts` (~lines 442-446): delete the test(s) that call `setSpeed` and assert `playbackRate`. Add: `'creates the playlist at the default rate'`: after a load, the fake playlist's `playbackRate` is never assigned by the engine (assert it stays at the fake's initial value), proving the wiring is gone.
- `features/audio/components/PlayerOptionsBar.test.tsx`: remove `speed` from the `setState` calls (lines ~47, 76, 90) and the test that picks a speed. Add `'shows exactly three options: repeat, range and sleep'` (queryByTestId `player-option-speed` is null; `player-option-repeat`, `player-option-range`, `player-option-sleep` exist) and `'has no speed menu'`. Keep the RTL ar/en and accessibility cases already in the file.
- `features/audio/screens/PlayerScreen.test.tsx`: drop any speed expectation.
- `features/azkar/components/AzkarPlayerBody.test.tsx` and `AzkarPlayerOptionsBar.test.tsx`: **must pass unchanged** (this proves Azkar is untouched).
- `grep -rn "speed" apps/mobile/src/features/audio` must return no hit except `player-icons.ts` (`SPEED_ICON`).

## Gates

```
cd apps/mobile && npm run lint && npx tsc --noEmit && npm test && npx expo-doctor
```

## Frame

`PlayerReciters` (utility row only; the rest of the screen changes in steps 6 and 7).

## Do not touch

`features/azkar/**` except the single import line above and the new `speed-rates.ts`; `azkarPlayerStore`; `apps/api`; `packages/api-contract`. No API or contract change is needed.
