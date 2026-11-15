# Quranic dua playback (ADR 0092 step 5) — plan

Date: 15 Nov 2026 · Status: **proposed** · Parent plan: `docs/plans/single-topics-audio.md` step 5 · Branch: `main`.
Agents write no religious text: fixtures use marked placeholders (`.claude/agent-rules.md`).

## Rests on

- ADR 0092 decision 3 (accepted 15 Nov 2026): a Quranic dua gets a play button that plays its verse range with `playerStore`, the user's reciter, verse highlighting and the existing timings. No new audio file. It lifts the cut line of ADR 0055 §2 and the «Duas never imports the Quran `playerStore`» consequence of ADR 0055.
- ADR 0055 §2 (only the cut line and the boundary line change; §1, §3, §4, §5 stand).
- ADR 0008 (QF audio URLs), ADR 0061 and 0074 (Taybah's R2 host for MP3Quran and Way2Quran), ADR 0077 and 0062 (partial surah files, `surah-unavailable`): the player already resolves all of these. No new host.
- ADR 0037 (a tap never moves the reader; only explicit play commands do), ADR 0046 (one current ayah, `startingTarget`, buffering ring), ADR 0052 and 0060 (timings that don't fit the audio are dropped, so a surah can have none), ADR 0059 (mini player only while playing or on the reader).
- Spec §12 (Audio → ayah, Repeat, "Timings must match the audio"), §14 (Jest layers, architecture tests), §15 cut lines.
- Code read: `apps/mobile/src/features/audio/{player.ts,playerStore.ts,play-verse.ts,repeat.ts,active-ayah.ts,partial-range.ts,data/timings.ts,hooks/useIsStarting.ts}`, `features/reader/panels/AyahActionsPanel.tsx` (the «play from here» tile), `features/reader/anchor/usePlaybackReadingPlace.ts` (mounted in `app/_layout.tsx:60`), `features/duas/screens/DuaQuranDetailScreen.tsx`, `features/duas/components/{DuaQuranText,DuaOpenInMushafButton}.tsx`, `features/duas/data/{content-repository,verse-range}.ts`, `features/duas/duas-audio-boundary.test.ts`, `screens/frames/duas/DuaQuranDetail*.html` (no play control in any of them).

## How «play from here» drives the player today

1. `AyahActionsPanel.onPlay` resolves the verse key and calls `playVerse(verseKey)` (`audio/play-verse.ts`).
2. `playVerse`: `store.beginStarting({kind:'verse', verseKey})` (the buffering ring reads it, ADR 0046 §6); `catalogueReciter()` resolves the saved reciter against the catalogue; if its pack is not installed `downloadReciterPack` runs first; `setReciterId` saves the choice; then `playFromVerse(verseKey)` in `player.ts`.
3. `playFromVerse`: bumps `playCommand` (the reader resumes following, ADR 0037 §3), releases any repeat, resolves the verse and `lookupAudio` (errors `not-installed`, `surah-unavailable`, `offline`, `verify-required` set the store error), rejects an ayah outside a partial file's recorded range (`isAyahRecorded`, raises the range notice), finds the ayah's timing row and calls `loadChapter(chapterId, ayahSeekStartMs(timing), reciterId, verse.id)`.
4. `loadChapter` loads the surah file in the gapless playlist (one file per surah, index to surah 114), seeks (muted pre-play, Android rule), sets `highlightFloor` and `setActive(verseId)`.
5. The 100 ms status tick (`onPlaylistStatus`) runs `updateHighlight` (binary search of the timings, lag `HIGHLIGHT_LAG_MS`), `applyRepeat`, and at the last track end `stopPlayback()`. Nothing in this path knows an end verse: playback continues into the next ayah and the next surah.
6. `usePlaybackReadingPlace` (mounted app-wide) writes the recited ayah to `reader.lastVerseKey`, so any playback moves Continue Reading (ADR 0046 §1).

The existing repeat (`repeat.ts`, `applyRepeat`) cannot be reused as a stop: with `count = 1` the range «finishes» and playback continues (`repeatAction` returns `'finish'`, `releaseRepeat`).

## Design

### Player API (in `features/audio`, the only place that touches the playlist)

- **Store** (`playerStore.ts`): add `rangePlay: { chapterId: number; fromVerseId: number; toVerseId: number } | null` (initial null; cleared by `markStopped`, `markFailed`, `markUnavailable`, `reset`, `beginLoad` of a different play, `moveTo`) with `setRangePlay` and `clearRangePlay`. Add `PlayTarget` kind `{ kind: 'range'; fromKey: string; toKey: string }` and a `rangeMatch(fromKey, toKey)` in `useIsStarting.ts`, so the dua's button shows the buffering ring from tap to first audio.
- **Pure decision** (new `range-stop.ts` + test, in the manner of `repeat.ts`): `rangeStopAction(range, timings, positionMs)` returns `'none'` until the position reaches the end of `toVerseId`'s timing (`endMs`, minus nothing: stopping early clips the last word; the output buffer already makes the heard position lag the decoded one, see `HIGHLIGHT_LAG_MS`), then `'stop'`. Constant `RANGE_STOP_LAG_MS` is tuned on the iPhone 17 simulator and a device, like `HIGHLIGHT_LAG_MS`.
- **Player** (`player.ts`):
  - `playVerseRange(fromKey, toKey)`: like `playFromVerse` for `fromKey` (same lookups, same errors, same partial-surah check, applied to both ends), plus: both verses must be in one surah, `fromId <= toId`, the file must have ayah timings for the surah (`timingsForChapter` non-empty and containing both verses), then `loadChapter(..., { range })`. `loadChapter` gets an option `range` that sets `rangePlay` after `beginLoad`. **Every other entry point passes none, so any other play (reader «play from here», a reciter, a surah, next or previous ayah or surah, lock screen skip, `restore`) clears `rangePlay`**: the dua's button returns to «play» and the stop no longer applies.
  - `applyRangeStop(active, chapterId, positionMs)` in `onPlaylistStatus`, next to `applyRepeat` and under the same guards (`status.playing && isLoaded && pendingSeek === null`, `trackTimings.chapterId` matches). On `'stop'`, call `stopPlayback()` (idle, position 0, highlight cleared), so the button shows «play» again and a new tap replays the range from its start. While a repeat is active, the repeat wins; the stop applies once it finishes (documented, tested).
  - **Surah-end case.** The range's last ayah can be the last ayah of the surah (a reader meeting that case is common for end-of-surah duas). Then `endMs` is the file end and the playlist advances to the next surah. `onTrackChanged` therefore also ends a range play: when `rangePlay` is set and the ended track is its chapter, pause the playlist at once and `stopPlayback()`. Expect up to one status tick of the next surah to be heard; verify on a device, and if audible, pause one tick early for that case only (open question 5).
  - `seekStartMs`, `seek`, `pause`, `resume` are unchanged and keep `rangePlay`. `switchReciter` re-passes the range so a reciter change inside the full player keeps the stop; if the new reciter has no timings that fit, the range play ends and the normal «no highlight» behaviour applies (existing rule).
  - `resetPlayerForTests` clears the new state.
- **Entry point** (`play-verse.ts`): `playRange(fromKey, toKey)`, same shape as `playVerse` (`beginStarting({kind:'range',…})`, `catalogueReciter`, pack install, `setReciterId`, then `playVerseRange`).
- **Availability before the tap** (`audio/range-availability.ts`, pure over `SqlExecutor`): `rangePlayability(db, reciterId, fromKey, toKey)` returns `ok | no-reciter | not-installed | no-timings | not-recorded`. The dua's button reads it, so a reciter whose surah has no ayah timings (ADR 0052 untrusted list, a file that doesn't fit, Way2Quran unreleased) shows a disabled button with a short hint, never a play that cannot stop.
- **Public surface for Duas** (`audio/hooks/useRangePlayback.ts`): `useRangePlayback(fromKey, toKey)` returns `{ state: 'idle'|'starting'|'playing'|'paused'|'unavailable'|'error', activeVerseId, errorCode, toggle() }`. `toggle` is play, pause or resume. `features/duas` imports only this hook (and `playRange` through it), never `player.ts`, `playerStore` or `azkarPlayerStore`.

### Duas screen

- `DuaQuranDetailScreen`: `getQuranicDuaVerses` already returns `VerseRecord[]` (it has `id`); the screen passes `{ id, textUthmani }[]` instead of `string[]`. The share text and the stored text path stay as they are (`duaQuranShareText(verses.map(text))`).
- `DuaQuranText` (existing file): renders each verse as a nested `Text` inside one centered `QuranText`, the separator space outside the nested spans, so the joined string is byte-identical to today's `verses.join(' ')` inside `﴿ ﴾`. The active verse gets the `highlight-active` wash (same token the reader uses, spec §12 Highlights). No word highlight in v1 (open question 4).
- New component `DuaQuranPlayButton.tsx` with `.test.tsx` in `features/duas/components/`: a Button (or the Azkar reader's play control, whichever the approved frame shows) with states idle, starting (buffering ring), playing (pause glyph), paused (resume), disabled with hint. It sits beside «فتح في المصحف» in the screen's pager controls area or in `DuaReaderActions`; the frame decides.
- The screen shows the player error through the existing notice mapping (`offline`, `verify-required`, `not-installed`, `surah-unavailable`, `load-failed`), reusing the strings and `PlayerErrorNotice` that the reader bar uses, not new copy.
- `useRangePlayback`'s `activeVerseId` is non-null only while `rangePlay` equals this dua's range, so a verse is highlighted only while this dua is the thing playing.
- Leaving the screen does not stop the audio (same as the reader). The tabs mini player shows while playing (ADR 0059) and can pause it; when the range ends the audio stops by itself.

### Reading place, recent listens (decisions, see open questions 1 and 2)

- The recommended default is **do not change** the reader's place: add `rangePlay !== null` as a condition in `usePlaybackReadingPlace` so dua playback never writes `reader.lastVerseKey` (a dua listened to in Duas must not become «continue reading» in the Mushaf).
- `stopPlayback` calls `saveCurrentListen`, which would add the surah to Home's «Recently listened» at the dua's end. Recommended: skip the save while `rangePlay` is set.

### Design (ADR 0087)

The six existing `DuaQuranDetail*` frames have no play control, so the screen cannot be built until a frame is approved. New or changed frames in `screens/frames/duas/`: `DuaQuranDetail` (idle with the play control), plus `DuaQuranDetailPlaying` (verse highlighted, pause glyph), `DuaQuranDetailStarting` (buffering ring), `DuaQuranDetailNoTimings` (disabled with hint), each in Arabic light, dark and English. Captions in `screens/index.html` carry «(بانتظار الموافقة)». Rebuild with `python3 design/screens/scripts/build.py && python3 design/scripts/build_reference.py`, review at `design/<stack>/DuaQuranDetail/index.html?theme=both&dir=both&sizes=compact%2Cmedium%2Cexpanded%2Clandscape`. Generated `design/` files are never hand-edited. This design work is the parent plan's step 7 for these states and must come first.

## Schema and contract

No schema, pack, migration, API or OpenAPI change. `rangePlay` is in-memory only (not persisted; after a cold-start restore the session resumes as a normal surah session).

## Native fingerprint

None expected. TypeScript only: no package (`npx expo install` is not run), no config plugin, no native field in `app.config.ts`, no change to the `expo-audio` usage beyond the calls already made (`pause`, `skipTo`, `seekTo`). Strings go in `src/core/i18n/locales/{ar,en}.json`. Ships by `eas update --channel production`. Gate: `npx eas-cli fingerprint:compare` before publishing; if it differs, stop and report.

## Steps (each is one reviewable change; run the app checks after each: `npm run lint && npx tsc --noEmit && npm test && npx expo-doctor`)

| # | Step | Files | Tests |
| --- | --- | --- | --- |
| 5.0 | Design: frames for the play control and its states, developer approval | `screens/frames/duas/DuaQuranDetail*.html`, `screens/index.html`, rebuilt `design/` | `npm run check:html -w @quran/design-tokens`; developer review link |
| 5.1 | Pure stop rule and availability | `audio/range-stop.ts`, `audio/range-availability.ts` | `range-stop.test.ts`: before end none, at end stop, last ayah, missing timing none, repeat active; `range-availability.test.ts`: every result code incl. partial file, untrusted reciter, no timings |
| 5.2 | Store state and target | `playerStore.ts`, `hooks/useIsStarting.ts` | `playerStore.test.ts`: set and clear paths (markStopped, markFailed, moveTo, reset); `useIsStarting.test.ts`: `rangeMatch` |
| 5.3 | Player: `playVerseRange`, `applyRangeStop`, `loadChapter` option, surah-end case, every other entry clears the range | `audio/player.ts` | `player-range.test.ts` (fake playlist like `player-partial.test.ts`): plays from the first verse, highlights through the range, pauses at the end, status idle, no next-surah load, last-ayah-of-surah case, any other play clears the range, pause and resume keep it, seek inside keeps it, repeat interplay, partial file range, no timings error, invalid verse, offline and `verify-required` errors |
| 5.4 | Entry point and hook | `audio/play-verse.ts`, `audio/hooks/useRangePlayback.ts` | `play-verse.test.ts` additions: installs the pack first, saves the reciter, failed install clears the target, no reciter; `useRangePlayback.test.tsx`: each state, active verse only for this range |
| 5.5 | Reading place and listens | `reader/anchor/usePlaybackReadingPlace.ts`, `audio/player.ts` (`saveCurrentListen` guard) | `usePlaybackReadingPlace.test.tsx`: no write during a range play, still writes for a normal play; listen not saved after a range play |
| 5.6 | Screen and components | `duas/components/DuaQuranText.tsx` (+test), `DuaQuranPlayButton.tsx` (+test), `duas/screens/DuaQuranDetailScreen.tsx` (+test), `i18n/locales/{ar,en}.json` | Component: render, each state, press calls toggle, RTL, role `button` and label per state, disabled hint. `DuaQuranText`: joined text byte-equal to `verses.join(' ')`, active verse gets the wash, no highlight when none. Screen: button present, share text unchanged, error shown, «فتح في المصحف» still pushes `/read/<verseKey>` |
| 5.7 | Boundary test and docs | `duas/duas-audio-boundary.test.ts`, ADR 0055 pointer line, spec §12 line, `docs/plans/single-topics-audio.md` | Boundary test: `features/duas` never references `azkarPlayerStore` outside the public Azkar API (step 4), never imports `audio/player` or `audio/playerStore`, and imports from `audio` only `hooks/useRangePlayback` |
| 5.8 | Visual check and release | screenshots | iPhone 17 simulator vs `python3 packages/design-tokens/scripts/frame-shot.py DuaQuranDetail out.png`; device check of the stop point; `fingerprint:compare`; `eas update --channel production` |

## Gates

- Frame approved by the developer before 5.6 (ADR 0087; CLAUDE.md «Layouts these don't cover are drawn there… and approved before code»).
- Quran text unchanged: the dua text still comes only from `content.db` verses, byte-for-byte; the checksum test (`packages/quran-text-check`) must pass; `DuaQuranText` test proves the join.
- No Duas file imports `azkarPlayerStore` outside the step 4 public API, and none imports `playerStore` or `player.ts` (boundary test).
- Fingerprint unchanged (`fingerprint:compare`).
- A device check (iOS and Android) that playback stops at the end of the range, including a range ending at a surah's last ayah, and that no audio of the next ayah or surah is audible beyond the tolerance chosen.
- `npm run lint && npx tsc --noEmit && npm test && npx expo-doctor`.

## Risks

- **Stop timing.** The decoded position leads the heard position by the output buffer. Stopping at `endMs` can clip the last syllable on slow routes (Bluetooth), stopping later lets the next ayah's first sound through. A named constant, tuned on device, and a test of the pure rule.
- **Surah-end range.** The gapless playlist advances on its own; the 100 ms tick may let a fraction of the next surah play (see Design). Needs a device check on both platforms.
- **Reciters without ayah timings** (ADR 0052 list, unreleased Way2Quran, files that don't fit, ADR 0060 Taybah timings missing after a URL change) cannot stop at a verse. The button is disabled with a hint rather than playing on. This means a user whose chosen reciter has no timings sees no play on the dua screen. Mitigation options are open question 3.
- **First-play latency**: a reciter pack not installed is installed first (same as `playVerse`); offline with no download shows the existing error.
- **A play started elsewhere** clears the range by construction; test that no other path keeps a stale `rangePlay`.
- **Reading place and recent listens** side effects (open questions 1, 2).
- **Android foreground rule**: `loadChapter` already plays muted before the seek; keep that path, don't add a new load path.

## Open questions for the developer (the first three block step 5.3 and 5.5; question 6 blocks 5.0)

1. **Reading place.** Should playing a dua move «continue reading» (ADR 0046 §1 today moves it for any playback)? Recommended: no, as above. If yes, no change and a note in the ADR.
2. **Recently listened.** Should a dua listen appear in Home's recent listens? Recommended: no.
3. **Reciter with no ayah timings.** Options: (a) disable the button with a hint (recommended, stays honest to «stops at the range end»); (b) play from the verse's start with no stop and no highlight; (c) fall back to the default reciter that has timings, without changing the user's choice (a silent switch, probably not wanted). Which?
4. **Word highlight.** Verse highlight only in v1 (recommended: the dua text is a short centered paragraph), or the word-level highlight the reader shows in Reading mode (needs per-word rendering of the dua text)?
5. **End of range.** Stop at the verse end (silence follows) is the brief. Confirm that no pause or fade is wanted, and that a play of the same dua while playing pauses it (toggle) rather than restarting.
6. **Placement and look of the play control** on the dua detail (beside «فتح في المصحف» or in the action row), and whether the reciter's name is shown on this screen. Drawn in the frame; approve there.
7. **Repeat.** Should the dua screen offer repeat of the range (the player already has a repeat range of the current surah)? Not in this plan; confirm it is out.
8. **ADR housekeeping.** ADR 0092 decision 3 covers this change, so no new ADR is proposed. Add pointer lines to ADR 0055 §2 and the spec §12 once the step ships. If question 1 or 2 is answered «yes» the ADR 0046 consequence changes and needs an addendum.
