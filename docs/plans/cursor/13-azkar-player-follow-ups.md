# Prompt 13 — Azkar player follow-ups: ADR, seek drag, frame match

Monorepo `D:\projects\quran-app`, `apps/mobile` plus docs. Follow @docs/plans/cursor/README.md. Read first: @apps/mobile/CLAUDE.md @.claude/agent-rules.md @docs/adr/0031-azkar.md (§8) @docs/adr/0040-azkar-audio-hosted-by-taybah.md @docs/adr/0029-play-glyph-stays-fixed.md @docs/technical-spec.md §12 ("Audio", "Motion") @apps/mobile/src/features/azkar/audio @apps/mobile/src/features/azkar/components/AzkarPlayer*.tsx @apps/mobile/src/features/audio/components/PlayerProgress.tsx @apps/mobile/src/features/audio/player-view.ts. Frames: `Player` and `PlayerBuffering` (the Mushaf player: the reference line) and `AzkarReaderAudio`.

**Developer rule:** the Azkar player is on the same line as the Mushaf player: the same tokens, glass, transport sizes, progress bar, time labels and spacing. A difference is allowed only if this prompt's ADR records it.

**Already done (don't redo):**
- `azkarPlayerStore.ts`.
- `queue.ts`: repeat modes `count | once | continuous`, `runPlays`, and the repetition label.
- `sleep-timer.ts`.
- `app/azkar/player.tsx` and `AzkarPlayerScreen`.
- The components `AzkarPlayerBar`, `Body`, `Control`, `Dhikr`, `Header`, `OptionButton`, `OptionsBar`, `Progress` and `Repetition`, plus `AzkarOptionChoices`, `AzkarOptionChoiceRow` and `AzkarOfflinePill`, each with tests.
- `autoplay.ts`, `AzkarAudioButton` and `AzkarAudioPlayer` are deleted.
- `AzkarPlayerProgress` seeks on tap and on adjustable increment/decrement, **but has no drag**.

**Remaining work:**
1. **ADR (doc only).** Create `docs/adr/<next free number>-azkar-player.md`. After prompt 14 that is expected to be 0048: run `ls docs/adr`. Status: accepted (developer, 2 Nov 2026). Record what the code does now (read `queue.ts` and the store, and quote the behaviour, not religious text):
   - (1) repeat by count: in `count` mode a dhikr plays its sourced count minus what was already counted, and each completed play counts one tap through `recordTap`. A null count never reads as 1;
   - (2) auto-advance is always on, with no setting and no switch;
   - (3) the old autoplay setting is removed;
   - (4) the sleep timer;
   - (5) the full player route `/azkar/player` and the mini bar;
   - (6) same line as the Mushaf player.

   Amend ADR 0031 §8 with a pointer. Update spec §12 "Audio" with an "Azkar player" paragraph that cites the new ADR.
2. **Seek drag (RTL-correct).** Give `AzkarPlayerProgress` the same responder drag as `PlayerProgress.tsx:40-62`: `onGrant`, `onMove`, `onEnd`, with `fractionAfterDrag(start, dx, width, I18nManager.isRTL)` from `src/features/audio/player-view.ts`.
   - Import it; don't copy it. If the two bars now share more than the drag, extract a `useSeekDrag(width, durationMs, canSeek, onSeek)` hook into `src/features/audio/hooks/` and use it in both. `PlayerProgress` behaviour stays identical, and its tests must still pass.
   - While dragging, the fill and the elapsed label follow the finger, and the seek is sent on release only.
   - The fill grows from the start edge. Use `alignSelf`/`flexDirection` or a `scaleX` with a start-edge origin, never `left`/`right` (README RTL rule).
   - Tests: a drag towards the end in LTR and in RTL (dx sign flipped) gives the same fraction; release seeks once; no seek while `canSeek` is false; the elapsed label updates during the drag; the adjustable actions still work.
3. **Redraw `AzkarReaderAudio`** in `quran-app-screens.html` to match the built `AzkarPlayerBar`, the mini bar in the reader, as it renders now (screenshot first). Keep its tokens. Add the dark variant `AzkarReaderAudioDark` if it is missing. **Stop for the developer's approval of the redraw.**
4. **Design comparison with `Player`.** Render `Player`, `PlayerBuffering` and `AzkarReaderAudio`. Compare `AzkarPlayerScreen` and `AzkarPlayerBar` with them on the emulator, item by item: background and glass, title and subtitle type, transport glyph sizes and hit areas (≥ 44), the progress track height and colours, time-label type and position (elapsed at the start edge, remaining at the end), and the buffering state. Fix every mismatch in the Azkar components, reusing `PlayerIconButton` and the player tokens. Add each deliberate difference to the ADR with the developer's approval. Put the item list with match or fixed in your summary.

**Acceptance:** the ADR exists and spec §12 cites it; dragging seeks correctly in Arabic and English; no `left`/`right` geometry in the Azkar player components (`grep -n "left\|right" src/features/azkar/components/AzkarPlayer*.tsx` gives only comments or `start`/`end`); the play glyph is unflipped in Arabic; the screenshots match the frames.

**Gates:** `npx jest src/features/azkar src/features/audio`, then the full suite; `lint` and `tsc` at 0.

**Emulator:**
- Open an Azkar category with recordings (needs prompt 09's local audio and `EXPO_PUBLIC_API_URL=http://192.168.1.20:8000` or `10.0.2.2:8000`), then open the full player.
- Drag the bar with `adb shell input swipe x1 y x2 y 600`, once in Arabic (right to left grows) and once in English.
- Screenshot `Player` next to the Azkar player, and the mini bar next to `AzkarReaderAudio`.
