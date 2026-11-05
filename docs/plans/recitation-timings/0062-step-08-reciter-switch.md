# ADR 0062, step 8: switching reciter keeps the place; auto-play after a download; one selected reciter (decision 7)

Branch `ft/recitation-timings`. Read first: `.claude/agent-rules.md`, `apps/mobile/CLAUDE.md`, ADR 0062 decisions 5, 6 and 7, ADR 0046 (one current ayah), ADR 0052 (timings, «بدون تتبع»). Do not commit. Depends on steps 2 and 7.

## Goal

Tapping an installed reciter in the player's list switches to it in the same surah, at the start of the current ayah (by the new reciter's timings), keeping play or pause and the repeat range. With no usable timings it starts from the beginning of the surah. When a pack download finishes, the player switches and plays. Decision 7: one selected reciter app-wide; a row tap selects (and switches a playing reciter); every play starts at the one current ayah.

## Findings (checked in code) that shape the design

- `playFromVerse(verseKey)` (`player.ts`) calls `releaseRepeat()`; `ensureQueue` releases the repeat again when the reciter changes ("A repeat belongs to the reciter it was set with"); `loadChapter` always ends in `startPlayback`. So **repeat and paused state do not carry over today**; a new engine entry is needed.
- `loadChapter(chapterId, positionMs, reciterId, startVerseId?)` already takes a reciter and an ayah start. The ayah start is `ayahSeekStartMs(timing)` from the new reciter's `timingsForChapter(db, reciterId, chapterId)` (rows validated by `validTimings`; `dropTimingsThatDoNotFit` removes ones that do not fit the loaded audio, ADR 0052). `setRepeat(request)` (exported) validates against the loaded surah's timings through `isRepeatRangeValid` and returns false when the range is not valid, which is the ADR 0052 fallback.
- `resume()` loads the file at `store.positionMs` when the loaded surah differs; `restore(...)` puts the store into `paused` without loading. These give the paused path.
- The selected reciter is persisted with `setReciterId(resourceId)` (`settings.ts`), called by every play entry point in `reciter-playback.ts`.

## Decision 7: one selected reciter and one current ayah (checked in code)

**Sources of truth.**
- *Selected reciter* = `useAudioSettings.reciterId` (`settings.ts`; `setReciterId` writes MMKV and the store), resolved against the catalogue by `catalogueReciter()` (`play-verse.ts`) / `currentReciterId` (`player.ts`: `resolveReciterId(getReciterId(), reciters, defaultReciterId(reciters))`). The reciter that is *playing* = `playerStore.reciterId`. They disagree today only when something plays the store's reciter without `setReciterId`, or after `restoreLastSession()` (the store takes the saved listen's reciter, settings keep the selection).
- *Current ayah* = `resolveInitialAnchor().verseKey` (`reader/anchor/reading-anchor.ts`; MMKV `readerLastVerseKey`, default `1:1`). `usePlaybackReadingPlace` and `ReaderScreen` write it through `writePlayedPlace` while audio plays, so it already follows playback; `useLastReadVerseKey()` is its React subscription. It is the only current-ayah source; no entry point may read another (not `playerStore.activeVerseId` for a fresh start; `switchReciter` may use `activeVerseId` first, since it is the same ayah while audio is loaded).

**Entry points, today and required.**

| Entry point | Today | Required |
| --- | --- | --- |
| Mini player, idle or paused (`MiniPlayer.tsx`) | Name from `useIdleReciter` (settings choice, re-reads on `reciterId`, installs, catalogue version). Play calls `playVerse(useLastReadVerseKey())`. | Already correct: selected reciter, current ayah. Keep; add the subscription tests below. |
| Mini player, playing | Name from `usePlayerNames` (store reciter). | Keep (playing reciter). After a switch the store reciter equals the selection. |
| `usePlayerNames` (full player header, paused) | Always `playerStore.reciterId ?? defaultReciterId`. Paused after restore it can differ from the mini bar. | Change: when `status` is not `playing`/`loading`, the reciter is the settings choice (subscribe `useAudioSettings((s) => s.reciterId)`, resolve with `resolveReciterId`); when playing or loading, the store reciter. |
| Reader ayah ▶ (`playVerse`, `AyahActionsPanel`, `ReaderScreen`) | `catalogueReciter()`, starts the given ayah. | Already correct. |
| `playReciter` (Listen ▶, onboarding ▶) | `setReciterId` then `playFromVerse(resolveInitialAnchor().verseKey)`; already-playing same reciter is a no-op. | Already correct for (b). Keep. Playing another reciter while one plays also starts at the current ayah, which follows playback. |
| `playSurahFromReciter` (reciter page surah row ▶) | `setReciterId`, `playChapter(chapterId)` = surah start. | Change: when the chapter of the current ayah is `chapterId`, `playFromVerse(currentKey)`; otherwise `playChapter(chapterId)` (that surah has no current ayah). (Q9, decided: yes.) |
| `playRecentListen` (Home) | `setReciterId(listen reciter)`, `playChapter(chapterId, lastPositionMs)`. | Unchanged: it resumes that listen's saved position, and it makes that reciter the selection. (Q10, decided: unchanged; it also makes that reciter the selection.) |
| `resume()` (full player ▶ when paused) | Loads `reciterFor(store)` = the store reciter at `positionMs`. | Change: see "Resume" below. |
| `restoreLastSession()` | Puts the saved listen's reciter into the store, paused. | Unchanged; `resume()` and `usePlayerNames` handle the difference. |
| Listen row ▶ / row tap / reciter page (`ListenScreen`, `ReciterDownloadsScreen`) | ▶: `playReciter`. Name press (`onSelect`): `setReciterId` only. `⋯` button (`onOptions`): `router.push('/(main)/(listen)/reciter/<id>')`. The page's mount effect only downloads the pack when missing; it never selects. | Change: see "Listen row" below. |
| Onboarding (`OnboardingReciterScreen`) | `onSelect`: `setReciterId`; ▶: `playReciter`. | Unchanged (nothing plays during onboarding except a preview started by ▶; a selection while a preview plays keeps it playing). Out of scope. |

**Q11, decided (keep):** Decision 7 says tapping a reciter's row opens his surah page. In the code the name area of `ReciterRow` (`onSelect`) only selects, and the `⋯` button (`onOptions`) opens the page. Both press targets select the reciter (the `⋯` press selects first, then navigates). If the developer wants the name tap to navigate, `onSelect` also calls `router.push`.

**Listen row.** In `ListenScreen.tsx` (around lines 159-172) both `onSelect` and `onOptions` call `selectReciter(item.resourceId, item.installed)` (new, `reciter-playback.ts`); `onOptions` then pushes the route. The reciter page (`app/(main)/(listen)/reciter/[id].tsx`, `ReciterDownloadsScreen`) does **not** call `setReciterId` or `switchReciter` on mount: selection happens in the row press, and a deep link or a page opened any other way selects nothing. That is what prevents a double switch (the row press switches once; the mounted page is passive). Do not add a mount effect that selects.

```ts
/**
 * Makes a reciter the selected one (ADR 0062 decision 7). Nothing plays: only the choice is saved. When another reciter
 * is playing or loading and this pack is installed, playback moves to him at the start of the current ayah
 * (switchReciter, decision 6). Selecting the reciter who is already playing does nothing.
 */
export async function selectReciter(resourceId: number, installed: boolean): Promise<void>;
```
Rules: (1) `state = usePlayerStore.getState()`; when `state.reciterId === resourceId` and status is `playing`/`loading`, return (no-op, no `setReciterId` write needed). (2) `setReciterId(resourceId)`. (3) When status is `playing` or `loading` and `installed`: `ok = await switchReciter(resourceId)`. If `ok` is false because the reciter lacks the surah (`lookupAudio` error `surah-unavailable`): stop the old audio and show the unavailable state of decision 1, with no play. Do it inside `player.ts` so it can reach `stopPlayback` (private): `switchReciter` takes a third outcome, so change its signature to `Promise<'switched' | 'unavailable' | 'none'>` for this call path (`'none'` = nothing loaded, `'unavailable'` = it stopped the old audio and called `store().markUnavailable({ reciterId: resourceId, chapterId })`, which `useMiniUnavailable` renders). This replaces the "no state change" wording of rule 4 above **only when the status was playing/loading**; paused and idle selections of a reciter who lacks the surah change nothing in the store (the selection is saved; the next ▶ reports the unavailable state through `playFromVerse` as today). Update `PlayerReciterList`/`pickDownloadedReciter` call sites to the new return type (`'switched'` is the old `true`). (4) Status `paused` (a loaded track): call `switchReciter(resourceId)` too (its paused path moves the store to the new reciter at the new ayah start, without playing), when installed. (5) Status `idle` or `error`: only step 2. (6) **Not installed while another reciter plays or loads (Q12, decided):** after step 2, set `pendingPackPick = resourceId` (the pending pick of rule 6 below, shared with the player list) and run `downloadReciterPack(resourceId)` at once. The Listen row shows the download progress through the existing `downloads[resourceId]` state it already renders (`downloadProgress` on `ReciterRow`); add no new UI. When it resolves `true`: switch only if `pendingPackPick === resourceId` **and** status is still `playing` or `loading`; then `switchReciter(resourceId)` with the decision 6 rules (current ayah start, keeps playing; no usable timings, surah start; lacks the surah: `'unavailable'` outcome, old audio stopped, unavailable state). It clears the pending pick. When it resolves `false` (failed): clear the pending pick, leave playback untouched, and show nothing new (the row shows the existing download failure status through `download?.status === 'failed'`). The pick is cancelled by: selecting another reciter (any `selectReciter` or `pickDownloadedReciter` call replaces or clears it), `pause()` or any stop of playback (status no longer `playing`/`loading` at completion means no switch; the choice stays saved, so the mini player shows him, ready to play from the current ayah), and `cancelReciterPack`. When nothing plays or loads and the pack is not installed, only step 2 applies (as in the earlier rule: no download here; the ▶ or the page downloads it).

**Playing from nothing (b).** `playReciter` and `playVerse` already start at `resolveInitialAnchor().verseKey` / the given ayah through `playFromVerse`, which seeks to `ayahSeekStartMs` of that ayah and uses 0 when the reciter has no timing row for it (the ADR 0052 fallback), and fails with `surah-unavailable` when the file is missing. Do not add a second current-ayah reader. Add one exported helper in `reciter-playback.ts` so the tests can pin the single source: `export function currentAyahKey(): string { return resolveInitialAnchor().verseKey; }`, and use it in `playReciter` and `playSurahFromReciter`.

**Resume.** In `resume()` (`player.ts`), after the "already playing" and "nothing loaded" checks: `selected = currentReciterId(contentDb())`; when `state.status === 'paused'` (or the restored paused state), `state.chapterId !== null`, `selected !== null` and `selected !== state.reciterId`: `await switchReciter(selected, { autoplay: true })` and return (decision 6: same ayah of the same surah, now with the selected reciter; the ayah is `activeVerseId`, else the current ayah, else surah start). When the selected reciter lacks the surah, `switchReciter` ends in the unavailable state. When the two agree, `resume()` is unchanged. For a paused `error` state keep today's behaviour.

## Rules

1. **The place.** Same surah as `store.chapterId`. The ayah: `store.activeVerseId` when set; else the last-read ayah (`resolveInitialAnchor().verseKey`, `reader/anchor/reading-anchor`) when it is in this surah; else none (surah start). Position: the start of that ayah in the new reciter's timings (`ayahSeekStartMs`); `0` when the new reciter has no valid timings for the surah or no timing row for that ayah («بدون تتبع», ADR 0052: "starts the surah from the beginning").
2. **Play state.** Was `playing` or `loading`: it keeps playing. Was `paused`: it stays paused at the new place (nothing plays). Was `idle` or `error`: pick = select the reciter only (`setReciterId`), nothing starts.
3. **Repeat.** Capture `store.repeat` (`fromVerseId`, `toVerseId`, `count`) before the switch. After the new surah is loaded call `setRepeat({ fromVerseId, toVerseId, count })`; it returns false when the range is not valid for the new timings, in which case the repeat is dropped (no timings, no repeat). `done` restarts at 0 (**Open question Q7: confirm `done` resets; default yes**). The ayah ids are the same Quran ayahs for every reciter, so the range carries over unchanged.
4. **Unavailable.** A reciter that lacks the surah is disabled in the list (step 7) and cannot be picked. The engine still guards: `switchReciter` on a surah the reciter lacks does nothing and returns `false` (no state change).
5. **Download auto-play (decision 5).** Tapping download runs `downloadReciterPack(resourceId)` and records the pick. When it resolves `true`: if the pick is still pending (see 6) **and** the surah is not `'unavailable'` for this reciter (re-read availability after the install), switch with `autoplay: true`. If the surah turns out unavailable, do not switch; the row becomes `unavailable` by itself (step 2's hook re-reads on `installedVersion`). If it resolves `false` (failed or cancelled) nothing changes. **Open question Q8 (developer):** decision 5 says the player "auto-plays" after a download, decision 6 says play or pause carries over. This brief resolves it as: **a download always auto-plays**, whatever the previous state (that is what the frame's annotation promises); a plain switch keeps the state.
6. **Pending pick.** One module variable in `reciter-playback.ts`: `pendingPackPick: number | null`. It is set to the resource id when a player download starts, and cleared when: the user picks any other reciter (switch or another download), the user presses stop on it, or `PlayerReciterList` unmounts (the user left the player; call `clearPendingPackPick()` in an unmount effect). Only when `pendingPackPick === resourceId` at completion does it switch. Starting a second download while the first runs replaces the pick (the first still installs, and does not switch).

## Files

Modify:

1. `features/audio/player.ts`: add and export
```ts
/**
 * Moves the loaded surah to another reciter at the start of the current ayah (ADR 0062 decision 6).
 * Keeps play or pause and the repeat range. `autoplay: true` plays regardless of the previous state.
 * Returns false (no state change) when nothing is loaded or the reciter has no file for the surah.
 */
export function switchReciter(resourceId: number, options?: { autoplay?: boolean }): Promise<boolean>;
```
Implementation outline (private helpers allowed; keep `loadChapter` behaviour for every other caller): capture `chapterId`, `status`, `repeat`, the ayah (rule 1); `lookupAudio(db, resourceId, chapterId)` error -> return false; `releaseRepeat()`; compute the position from `timingsForChapter(db, resourceId, chapterId)`; **playing path (or `autoplay`)**: `loadChapter(chapterId, position, resourceId, verseId)` (it disposes and rebuilds the queue for the new reciter through `ensureQueue`), then `setRepeat(captured)`; **paused path**: `disposeQueue(); loadedChapterId = null;` then `store().restore({ reciterId: resourceId, chapterId, positionMs: position })`, `store().setActive(verseId ?? null, null)`, `setTrackTimings(db, resourceId, chapterId)` and `setRepeat(captured)` (so `resume()` later loads the new reciter's file at that position). Always `setReciterId(resourceId)` first (selection persists). Bump `playCommand` only when it plays.
2. `features/audio/reciter-playback.ts`: add
```ts
/** The player list's tap on an installed reciter. */
export function pickInstalledReciter(resourceId: number): Promise<void>;
/** The player list's download button: install the pack, then switch and play if still wanted. */
export function pickDownloadedReciter(resourceId: number): Promise<void>;
export function clearPendingPackPick(): void;
```
`pickInstalledReciter` clears the pending pick, then calls `switchReciter(resourceId)`; when nothing is loaded (`false` with `chapterId === null`) it only calls `setReciterId`. `pickDownloadedReciter` follows rule 5 and 6. Both call `usePlayerStore.getState().beginStarting({ kind: 'reciter', resourceId })` only when they will play, and `clearStarting()` when they do not (the existing buffering-ring contract, ADR 0046).
3. `features/audio/components/PlayerReciterList.tsx`: `onSelect = pickInstalledReciter`, `onDownload = pickDownloadedReciter`, `onCancel = (id) => { clearPendingPackPick-if-matching; cancelReciterPack(id) }`; unmount effect `clearPendingPackPick()`. Remove step 7's placeholder comment.
4. Export a tiny helper `clearPendingPackPickFor(resourceId)` if it keeps `onCancel` readable.
5. Decision 7: `reciter-playback.ts` gains `selectReciter` and `currentAyahKey`; `playSurahFromReciter` uses `currentAyahKey` (Q9); `pickInstalledReciter` calls `selectReciter(resourceId, true)`.
6. `player.ts`: `switchReciter` returns `'switched' | 'unavailable' | 'none'` (see "Listen row"); `resume()` switches to the selected reciter as described in "Resume".
7. `features/audio/screens/ListenScreen.tsx`: `onSelect` and `onOptions` call `selectReciter`; the Listen ▶ stays `playReciter`. Nothing in `ReciterDownloadsScreen` or `app/(main)/(listen)/reciter/[id].tsx` selects or switches on mount.
8. `features/audio/hooks/usePlayerNames.ts`: reciter follows settings when nothing plays (table above). `MiniPlayer.tsx` and `useIdleReciter.ts` need no change.

## Tests

`player.test.ts` (existing fake playlist and timings harness; use fixture timings, no Quran text):
- `'switchReciter while playing loads the new reciter at the start of the current ayah and keeps playing'`
- `'switchReciter while paused loads nothing, stays paused at the new ayah start, and resume plays the new reciter'`
- `'switchReciter carries the repeat range to the new reciter and restarts its count'`
- `'switchReciter drops the repeat when the new reciter has no valid timings, and starts the surah from the beginning'`
- `'switchReciter with no timing row for the current ayah starts at 0'`
- `'switchReciter is a no-op returning false when the reciter has no file for the surah'` (no store change, no play)
- `'switchReciter with autoplay plays even when it was paused'`
- `'switchReciter does not release the old reciter's repeat into the new one twice'` (repeat state is set exactly once after the load)
- `'switchReciter persists the selected reciter'`
`reciter-playback.test.ts`: `'pickInstalledReciter selects the reciter when nothing is loaded and switches when a surah is loaded'`; `'pickDownloadedReciter switches and plays after the pack installs'`; `'does not switch when another reciter was picked meanwhile'`; `'does not switch when the list unmounted (clearPendingPackPick)'`; `'does not switch when the install fails or is cancelled'`; `'does not switch when the installed pack turns out to lack the surah'`; `'a second download replaces the pending pick'`; `'buffering ring: beginStarting is set only when it will play'`.
`components/PlayerReciterList.test.tsx`: tapping an installed row calls `pickInstalledReciter`; the download button calls `pickDownloadedReciter`; stop calls the cancel; unmount calls `clearPendingPackPick`.

Decision 7 tests:
- `reciter-playback.test.ts`:
  - `'selectReciter saves the choice and starts nothing when idle'` (assert `getReciterId`, status `idle`, no `playFromVerse`/load).
  - `'selectReciter saves the choice and starts nothing when paused, and moves the store to the new reciter at the new ayah start'`.
  - `'selectReciter while another reciter plays switches at the start of the current ayah and keeps playing'`.
  - `'selectReciter on the reciter already playing does nothing'` (no `setReciterId` write, no load).
  - `'selectReciter while playing with a reciter that lacks the surah stops the audio and shows the unavailable state'` (status `error`, `error === 'surah-unavailable'`, `unavailable` set, nothing playing).
  - `'selectReciter with an uninstalled pack while idle only saves the choice and starts no download'`.
  - `'selectReciter with an uninstalled pack while playing downloads it, then switches at the current ayah and keeps playing'` (download-then-switch; assert `beginStarting` is not required and the row's download state was `downloading` meanwhile).
  - `'a pending download switch is cancelled when another reciter is selected before it finishes'` (the first pack still installs, no switch to it).
  - `'a pending download switch is cancelled when playback stops before it finishes'` (pause or stop; no switch; the selection stays saved).
  - `'a failed download keeps the current playback and switches nothing'` (status stays playing, reciter unchanged, `pendingPackPick` cleared, the download state is `failed`).
  - `'the download-then-switch to a reciter that lacks the surah ends in the unavailable state'`.
  - `'playReciter, playVerse(current), playSurahFromReciter of the current ayah's surah and the mini play each start at the current ayah, not the surah start'` (one test per entry point; fixture: current ayah `resolveInitialAnchor` = a fixture verse with a timing row; assert the load position equals `ayahSeekStartMs` of that row, and not 0).
  - `'a reciter with no usable timings starts the surah from the beginning from every entry point'`.
  - `'a reciter that lacks the surah shows the unavailable state from every entry point'`.
  - `'currentAyahKey is the saved reading anchor, and every entry point reads it'`.
  - `'playSurahFromReciter plays the surah start when the current ayah is in another surah'`.
- `player.test.ts`: `'resume of a paused track by a different reciter than the selected one switches to the selected reciter at the same ayah and plays'`; `'resume with agreeing reciters is unchanged'`; `'resume switch to a reciter that lacks the surah ends in the unavailable state'`; `'switchReciter returns unavailable and stops the audio when playing and the reciter lacks the surah; returns none when nothing is loaded'`.
- `hooks/usePlayerNames.test.tsx`: `'when paused the name is the selected reciter, not the stored one, and re-renders when the selection changes'` (render, then `act(() => setReciterId(other))`, assert the new name); `'when playing the name is the store reciter'`.
- `components/MiniPlayer.test.tsx`: `'the idle mini player re-renders with the new reciter name when the selection changes'` (render idle, `act(() => setReciterId(other))`, assert the new name and the `player.mini.label` accessibility label); `'the paused mini player shows the selected reciter, and its play calls playVerse with the current ayah'`; `'while playing it shows the playing reciter and, after switchReciter, the selected one'`.
- `screens/ListenScreen.test.tsx` (the existing test file, or a new one named so): `'tapping a reciter's name selects him and does not start playback'`; `'the ⋯ button selects the reciter once and navigates to his page'` (assert `selectReciter` called once); `'pressing ▶ on a reciter calls playReciter'`.
- `screens/ReciterDownloadsScreen.test.tsx`: `'mounting the page does not select or switch a reciter'` (assert `setReciterId` and `switchReciter` not called).

## Gates

```
cd apps/mobile && npm run lint && npx tsc --noEmit && npm test && npx expo-doctor
```

## Frames

`PlayerReciters`, `PlayerReciterDownloading`.

## Do not touch

`features/azkar/**`, `azkarPlayerStore`, `apps/api`, `packages/api-contract`. Do not change `playFromVerse`, `playChapter`, `playReciter` behaviour. Onboarding is not changed.

## Decided questions (developer, 4 Nov 2026)

- **Q9 decided: yes.** Reciter page surah ▶ starts at the current ayah when it is in that surah, else at the surah start.
- **Q10 decided: yes.** A recent listen resumes its saved position with its own reciter and makes him the selected reciter.
- **Q11 decided: keep.** Name tap selects; `⋯` selects, then opens the page.
- **Q12 decided (changed from the default):** selecting an uninstalled reciter while another plays downloads his pack at once, shows the progress on his Listen row, and auto-switches when it finishes (specified in `selectReciter` rule 6). Cancelled by selecting another reciter or by playback stopping; a failure keeps the current playback and shows the existing download error.
