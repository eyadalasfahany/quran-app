# 0020 — Sheet detents

Date: 2026-10-29 · Status: accepted · Amends ADR 0013 (sheet heights), spec §4 and §12

## Context

ADR 0013 kept the reader sheets as custom cards in a transparent modal, and drew each one at the height of its frame: the ayah actions card with its top at 330 of 844, the reader settings card at 170, the tafsir sheet at 52. A sheet could not be resized, and closing faded the route out, which is not how an iOS sheet leaves.

The developer's goal (29 Oct 2026): every sheet behaves like an iOS sheet with two detents. It opens at half the screen. Swiping up takes it to full screen. Swiping down from full returns it to half, and swiping down again closes it. The X, a tap outside and Android back close it by sliding it down, not by fading.

## Decision

1. **Mid detent at 50%.** Every reader sheet opens at a mid detent whose card top is half the window height. The frames draw other heights today, and they are redrawn at mid: `#AyahSheet`, `#Tafsir`, `#TafsirDownload` and `#ReaderSettings`.
2. **Full detent at the safe area plus 8.** The card's top sits at the safe-area top plus the 8 pt card margin. The new frame `#TafsirFull` shows it (top at 55 on a 390 × 844 frame with a 47 pt safe area).
3. **Closed.** The card is fully below the bottom edge. Its height is the window height minus its top, so the content stays on screen at every detent. The card is not translated.
4. **Release.** A drag moves the sheet to the next detent in its direction when it passes 25% of the distance to that detent, or when its velocity is over 800 pt/s. A sheet never skips a detent: full → mid → closed going down, and mid → full going up. A release settles with `spring()`.
5. **Drag on the body.** At mid the content is locked and the sheet follows the finger both ways. At full the content scrolls first; a downward drag that starts with the content at its top moves the sheet. A pan on the grabber or the header always moves the sheet.
6. **Close.** The X, a scrim tap, Android back and the VoiceOver escape gesture slide the card down with the same spring, and the scrim fades with the card's position. The route is left once the slide finishes. The stack's own animation and swipe are off (`animation: 'none'`, `gestureEnabled: false`), so the route doesn't fade over the slide.
7. **Keyboard.** When the note editor takes focus, the sheet expands to full.
8. **Reduce Motion.** Opening and closing become fades of the card and scrim. Drags still track the finger; releases use the system behaviour.
9. **Accessibility.** The grabber is a button with the actions Expand and Collapse, and it announces the new detent. The card is `accessibilityViewIsModal`.
10. **Short sheets** (`#DeleteAccount`, which is not redrawn) open at their content height when built, with no full detent. That is iOS's behaviour for a short sheet.

The shapes in ADR 0013 are unchanged: the ayah and settings cards keep their 8 pt margins and 36 pt corners, and the tafsir sheet keeps its full width and 28 pt top corners. The side panel on expanded windows is not a sheet and doesn't change.

## Consequences

- Every sheet's scrolling content uses `SheetScrollView`. It locks scrolling below full and hands its native gesture off to the sheet's pan. The side panel keeps a plain `ScrollView`.
- The detent arithmetic lives in `form-sheet.ts` as pure functions with tests. The gesture feel is checked on the iPhone 17 simulator at 60 fps, with a recording of open, full, mid and close.
- The 560-wide card on medium windows is still not built. When it is, it takes the same detents.
- On a window too short for half its height to clear the full detent, mid is raised to full. Both detents stay within the window, so a very large safe area can't push the card off screen.
- The frames for mid-detent sheets show the content at its natural size under the card's bottom edge; the content scrolls inside the card.
