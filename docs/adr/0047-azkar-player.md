# 0047 — Azkar player: queue, repetition, sleep timer, full player and the Mushaf line

Date: 2026-11-02 · Status: accepted (developer, 2 Nov 2026) · Amends ADR 0031 §8 (pointer added there) · Spec §12 "Azkar player" cites this ADR

## Context

ADR 0031 §8 set the Azkar audio rules: recordings are played when the rights allow, each play counts toward the repetition, and the player never writes the Quran `playerStore`. The player was then built in several steps (the developer's player request, 1 Nov 2026, and the follow-ups of 2 Nov 2026). This ADR records what the code does now, so the behaviour has one written source. It adds no new religious content and changes no text.

Code read for this record: `apps/mobile/src/features/azkar/audio/queue.ts`, `audio/azkarPlayerStore.ts`, `audio/playback.ts`, `audio/sleep-timer.ts`, the `app/azkar/player.tsx` route and `AzkarPlayerScreen`, and the components `AzkarPlayerBar`, `AzkarPlayerProgress` and the other `AzkarPlayer*` components.

## Decision

1. **Repetition by count.** The repeat mode `count` is the default. A dhikr with a sourced count plays `count − countAtStart` times in its run, where `countAtStart` is the count already recorded for that dhikr in the period (at least one play). Each play that ends counts one tap through `recordTap`, so the ring and the progress fill with the audio. A tap in the reader that lands while a play runs claims that play, so one repetition counts once, by the tap. A play counts at most once, whatever events arrive. The other modes are `once` (one play per dhikr) and `continuous` (the recording loops until the person stops it). The repetition label «٢ من ٣» shows the sourced count, and it never passes the count.
2. **A null count is never read as 1.** A dhikr with no sourced count plays once in every mode except `continuous`, its repetition label is hidden, and its ring is the single completion ring (ADR 0031 §6). The count stays null in the data; nothing is filled in.
3. **Auto-advance is always on.** When a run ends, the queue moves to the next dhikr that has a playable recording (`playFrom`), and it skips units with no recording. There is no setting and no switch for it. The old «تشغيل تلقائي» setting (MMKV key `azkar.audioAutoplay`) is removed: its key is deleted from `storageKeys` and nothing reads it. Rollback is a code revert, not a toggle (ADR 0042).
4. **Sleep timer.** The Azkar sleep timer mirrors the Quran timer's values and its fade (`features/audio/sleep-timer.ts`): the timed modes 15, 30 and 60 minutes fade the volume to zero over the last fade, then pause and restore the volume. «نهاية الذكر» pauses when the dhikr's run ends and resumes with the next dhikr on the next play. The deadline is wall-clock, so it survives backgrounding. The timer is one-shot: a fired timer is spent and returns to off. It lives in `azkarPlayerStore`, never in the Quran store.
5. **Two surfaces.** The reader's mini bar (`AzkarPlayerBar`, frame `AzkarReaderAudio`) sits above the reader's bottom controls and shows play or pause, the progress with the elapsed time, the repetition, and the previous and next dhikr. Tapping its middle opens the full player at `/azkar/player` (`AzkarPlayerScreen`). The full player is the same transparent modal with slide-up and drag-to-dismiss as the Quran player (spec §12 "Motion"). Both read `azkarPlayerStore`; neither draws its own playback state.
6. **Same line as the Mushaf player (developer rule, 2 Nov 2026).** The Azkar player uses the Mushaf player's tokens, glass, transport sizes, progress bar, time labels and spacing. A difference from the Mushaf player is allowed only if this ADR records it. The items checked are in «Same line» below.
7. **Seek by drag (2 Nov 2026).** The seek bar of the Azkar player and the Mushaf player share one drag, `useSeekDrag` (`features/audio/hooks/useSeekDrag.ts`). A drag starts from the playback position and moves with the finger. The fill and the elapsed label follow the finger, and the seek is sent once, on release. The fill grows from the start edge, so Arabic drags right to left and English drags left to right; the sign is corrected by `fractionAfterDrag` with the layout direction. A tap on the Azkar bar seeks to the tapped point; the Mushaf bar does not seek on a tap (unchanged). With no known duration nothing is grabbed and nothing is sent. The adjustable actions (10-second steps) still work.

## Same line (checked on the emulator)

The review of 2 Nov 2026 compared the code of both players with the `Player` and `PlayerBuffering` frames and the Mushaf components. It was a code review: no Azkar recording was installed on the review device, so the Azkar player could not be screenshotted on the emulator. Each row is matched, fixed, or open. An open row is not a deliberate difference: it needs the developer's decision before the Azkar player changes.

| Item | Mushaf player (`Player`) | Azkar player | Result |
| --- | --- | --- | --- |
| Background and glass | `playerBg` dark surface, hosted by `PlayerHost` | `AzkarPlayerScreen` is a `SheetHost` on the reader's light surface | **Open:** the full Azkar player is light, not on the player surface. Needs the developer's decision. |
| Title and subtitle type | `NowPlayingTitle` with the player tokens | `AzkarPlayerHeader` and `AzkarPlayerBody` title and caption on light tokens | **Open**, with the background decision |
| Transport glyph sizes and hit areas | `PlayerIconButton` and `PlayerTransport` | `AzkarPlayerControl` (play, 44 pt target) and `IconButton` for previous and next | **Open:** the Azkar transport does not yet reuse `PlayerIconButton`. Hit areas are 44 pt or more. |
| Progress track height and colours | 4 pt `playerLine` track, `goldOnBrandSurface` fill | `theme.size.progressHeight`, `fillSecondary` track, `brand` fill | **Open:** the reader's mini bar stays on surface tokens. The full player's colours follow the background decision. |
| Time labels | `label` variant, `playerMuted` | `caption` variant, `muted` tone | **Open**, with the background decision |
| Elapsed at the start edge, remaining at the end | Elapsed at the start, total at the end | Elapsed at the start, remaining at the end (brief, 2 Nov 2026) | Matched to the brief. The remaining-time label is the one deliberate content difference (the total is not shown); it is listed as approved only once the developer confirms it. |
| Buffering state | `PlayerBuffering` frame | `loading` status in the store; no separate buffering frame drawn for the Azkar player | **Open:** no buffering frame exists for the Azkar player. |
| Drag and seek | `useSeekDrag` (shared) | `useSeekDrag` (shared) | Matched (this ADR, decision 7). |

**Approved differences:** none recorded yet. The developer decides the open rows; each decision is written here before the code changes.

## Consequences

- The behaviour above is the reference for tests in `features/azkar/audio` (queue, playback, sleep timer) and for the Azkar player components.
- `azkarPlayerStore` stays separate from the Quran `playerStore`; a Quran play stops Azkar playback, never the reverse.
- Spec §12 gets an "Azkar player" paragraph that cites this ADR. ADR 0031 §8 gets a pointer to it.
- No religious text is written by this change. Recordings and text come from the content pack; the player only plays and counts.
