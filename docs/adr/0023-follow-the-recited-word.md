# 0023 — Follow the recited word, and save the recited ayah as the place

Date: 2026-10-29 · Status: accepted · Amends spec §12 (cancelling motion)

## Context

Phase 3 step 3b followed the recited ayah. A long ayah in Reading (2:282 is taller than the screen), or a Mushaf surah paragraph at a large font, can still put the recited word off screen while its ayah or page is in view. The saved reading place (`reader.lastVerseKey`, `lastPage`, and what Home's continue-reading card and the reopen use) followed the reader's scroll, not the recitation.

## Decision

1. **The recited word stays in view while the reader follows.** The line holding the word is kept in the middle 60% of the visible area (the list viewport above the mini bar). When that line leaves the band, the list scrolls it to a third down the viewport, animated (or a jump under Reduce Motion). Nothing scrolls while the line is inside the band. Focus uses the same rule for its ayah when that ayah scrolls.
2. **The saved place is the recited ayah while playing and following**, in Reading, Mushaf and Focus. Viewability does not write the saved place while following. A drag pauses the follow; viewability then updates the saved place again. Paused or idle playback never moves it.
3. **The visible verse is still what the list reports on screen.** The resume pill compares it with the recited ayah, so the recitation does not set it.

Following and the 5 s resume are unchanged (`follow.ts`). Word scrolls obey the same pause.

## Consequences

- Measuring uses `onTextLayout` lines and `measureLayout` against the viewport. Each line's text length must add up to the Text's string, so the word's offset lands on the right line. This is checked in Jest, not yet on a device.
- A Mushaf paragraph's offset counts the spaces and end-mark characters the page draws, through `paragraphWordOffset` in `mushaf-paragraph.ts`. The Quran text is not changed.
- After a drag, the saved place stays on the last recited ayah until the list reports another one.
