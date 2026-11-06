# 0070 — Tap removes a highlight; the saved ayah and the reader's place show a wash

Date: 2026-11-06 · Status: decisions 1 and 2 superseded by ADR 0072; the rest accepted (developer, 6 Nov 2026) · Amends ADR 0069 (decisions 2 and 3) and spec §12 (Highlights, Tapping an ayah). ADR 0028 (one bookmark) and ADR 0037 (a tap never moves the place or the audio) are unchanged.

## Context

After ADR 0069 a tap added a highlight, but removing it needed the sheet. The saved ayah had no mark on the page, and in Mushaf mode a reader sent back to their place could not see which ayah it was. The developer chose the answers below (6 Nov 2026).

## Decision

1. **A tap on a highlighted ayah's text removes the highlight and opens nothing.** This works in Mushaf and Reading, for any colour. Screen readers hear that it was removed.
2. **Long-press and the ayah number never remove.** They open the options, adding the default gold if the ayah has no colour (ADR 0069). Focus has only the number, so it always opens the options.
3. **The saved ayah shows a green wash in every reading mode, unless it has its own colour.** It is display only: not stored as a highlight, not in My Quran's highlights, and it moves or goes with the bookmark. An ayah's own colour wins (ADR 0073).
4. **Going to your place marks it in Mushaf mode.** Opening the reader from a continue-reading control (home, index, menu, khatma) washes that ayah with `highlightActive` until the first drag or a mode change. It is not stored and does not change the ayah marker. An ayah with a colour shows that colour.
5. **The return pill needs nothing new.** It goes to the recited ayah, which already has the recited wash.

## Consequences

- A tap can delete a colour the reader chose, with no undo. The accepted trade-off is a simple on/off tap.
- A saved ayah looks the same as a green highlight, and screen readers announce it as one.- The saved place comes from scrolling, so the washed ayah is the top visible ayah when the reader left, not always the exact one they were reading.
- Other ways to reach an ayah (bookmark, search, highlight lists, reminders) add no wash.
