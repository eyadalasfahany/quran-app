# 0037 — The reader follows the recitation until you scroll; a tap never moves your place

Date: 2026-11-01 · Status: accepted (developer, 1 Nov 2026) · Amends spec §12 (Audio → ayah, Cancelling motion) and the follow rule of 29 Oct 2026 (`FOLLOW_RESUME_MS`). ADR 0023 (where the followed line sits) is unchanged.

## Context

The reader follows the recited ayah. A drag pauses following, but following resumed on its own 5 s after the scroll stopped, so the page jumped back while the developer was still reading elsewhere. A tap on an ayah also selected it: the ayah was highlighted, and after scrolling away a pill offered to jump back to it. The developer found both of these forced the reader's position (1 Nov 2026).

The developer's answers (1 Nov 2026):

1. While listening, the reader follows the recited ayah **until the reader scrolls**. The "return to current ayah" pill brings it back and following starts again.
2. When nothing is playing, the current ayah is the top visible ayah. Continue Reading and the saved last-read place come from scrolling only, never from a tap.
3. A tap on an ayah still opens its options (tafsir, bookmark, play from here), without highlighting the ayah or saving the place.
4. Tapping another ayah while listening leaves the audio where it is. Only "play from here" moves it.
5. The same rules hold in Mushaf, Reading and Focus.

## Decision

1. **No automatic resume.** A drag (or a swipe to another ayah in Focus) pauses following until the reader taps the resume pill. `FOLLOW_RESUME_MS` and the inactivity timer are removed.
2. **The resume pill** appears while an ayah is playing, following is paused and the recited ayah is not on screen. Tapping it scrolls to the recited ayah and resumes following. It is the only pill; the pill back to a tapped ayah is removed.
3. **A new play command resumes following.** Play, play from here, and play in Focus start following again, since the reader asked to hear that ayah.
4. **A tap does not select a place.** It opens the ayah options (sheet, or the docked panel on wide windows) for that ayah. It does not draw a selection highlight in any mode, does not pin the view, and does not write the reading anchor or the last-read place.
5. **The saved place.** While an ayah is playing, it is the recited ayah, as before. Otherwise it is the top visible ayah, written by scrolling.
6. **Audio is untouched by taps.** Only the options' "play from here" and the transport controls change what plays.

## Consequences

- `follow.ts` drops `settleFollow` and `FOLLOW_RESUME_MS`, and `useRecitationFollow` drops its timer. Its tests change to match.
- `ReaderScreen` stops passing the selection to the lists as a highlight and drops `selectionPill` and the selection pin. The ayah options still read `useReaderSelection().verseKey`.
- On a wide window with the docked panel, the panel shows the tapped ayah's options with no highlight in the text. The panel's own header names the ayah.
- User highlights (colours), the recited-ayah highlight and the khatma marker are unchanged.
- Tests cover each rule in all three modes: no auto-resume after any delay, the pill resumes, a new play resumes, and a tap writes no anchor, adds no highlight and leaves the player unchanged.
