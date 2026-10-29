# Step 14 — Sheet detents and slide-down dismiss

Follow [README.md](README.md). Changes the reader sheets, the frames and spec §12, so the frames and this plan are approved before code. Starts after step 13's panel wiring lands, because both touch the tafsir panel's scroll view.

**Goal (developer, 29 Oct 2026):** every sheet behaves like an iOS sheet with two detents:
- It opens at half the screen.
- Swiping up takes it to full screen.
- Swiping down from full returns it to half, and swiping down again closes it.
- The X, a tap outside and Android back close it by sliding it down, the reverse of the entrance. It doesn't fade out.

**Decision (developer, 29 Oct 2026):** the mid detent is **50% of the window height for every sheet**. The frames draw other heights today: Ayah actions' top is at 330 of 844 (61% tall), Reader settings at 170 (80%), Tafsir at 52 (94%). They are redrawn (see Design). ADR 0013 stands: sheets stay custom cards in a transparent modal, not the native form sheet.

**Sheets covered:** every route that renders through `SheetHost`: `ayah/[verseKey]`, `tafsir/[verseKey]` and `reader-settings`. Delete account and later sheets use the same host when they are built. The side panel on expanded windows is not a sheet and doesn't change.

## Design (frame first)
- **Approved by the developer (29 Oct 2026). Also cleaned up in the same edit:** the old «تنزيل هذا التفسير للقراءة بدون إنترنت» button is removed from `#Tafsir` and `#TafsirFull`, because step 13 replaces it. The «[اسم المؤلف …]» placeholder in `#Tafsir`, `#TafsirFull` and `#ReaderExpandedTafsir` now reads «عبد الله بن عبد المحسن التركي وآخرون», the author of the selected chip (التفسير الميسر).
- **The redraw:**
  - In `quran-app-screens.html`, the open states of `#AyahSheet`, `#Tafsir`, `#TafsirDownload` and `#ReaderSettings` are redrawn at the mid detent, with the card's top at 422 of 844. Their captions say "mid detent (50%)".
  - New frame `#TafsirFull`: the full detent, with the card's top at 55. That is the 390 × 844 frame's 47 pt safe area plus 8.
  - A CSS rule keeps the mid-detent cards' children at their natural size, so the content runs under the card's bottom edge and doesn't squash. In the app that content scrolls.
  - `check:html` still passes.
- **`#DeleteAccount` is not redrawn.** Its card is sized to its content and anchored to the bottom, and the screen isn't built yet. When it's built, a sheet whose content is shorter than 50% opens at its content height and has no full detent. That is the iOS behaviour for a short sheet.
- Shapes are unchanged:
  - Ayah and settings stay the inset card (8 pt margins, 36 pt corners).
  - Tafsir stays full width with 28 pt top corners.
  - At the full detent the inset card keeps its margins.
- At the mid detent, content that doesn't fit scrolls inside the card. The ayah actions grid and the settings list get a scroll view if they don't already have one.
- The developer approves the redrawn frames before part B starts.

## Behaviour
**Geometry:**
- `fullTop = safeArea.top + SHEET_MARGIN`.
- `midTop = windowHeight × 0.5`.
- Closed is the card fully below the bottom edge.

**The card's height follows the detent:** it is `windowHeight − top`. Don't translate a full-height card down, because the bottom of the content would then sit off screen at mid, including the tafsir panel's previous and next bar and the actions' last row. Animate the height, or a translate paired with a matching bottom inset. The reviewer checks for 60 fps on the iPhone 17 simulator.

**Open:** slides from closed to mid with `spring()` from `core/theme/motion.ts`. The scrim's opacity follows the card's position: 0 when closed, full at mid and above.

**Drag:**
- A pan on the grabber and the header always moves the sheet.
- On the body, at mid:
  - Dragging up expands the sheet. The content scroll is locked until the sheet reaches full.
  - Dragging down moves the sheet toward closed.
- At full:
  - The content scrolls.
  - A downward drag that starts with the scroll at the top moves the sheet instead.
- This is the iOS sheet behaviour, built with `react-native-gesture-handler` 3.3 (`Gesture.Pan` plus `Gesture.Native` on the scroll view, run simultaneously). It's already installed and listed for sheets in the content plan, so there's no new dependency.

**Release:**
- Go to the next detent in the drag direction when the drag passes 25% of the distance to it, or its velocity is over 800 pt/s. Otherwise return.
- Never skip a detent: full → mid → closed.
- Release with `spring()`.

**Close (the X, the scrim tap, Android back, the VoiceOver escape gesture):**
- The card animates down to closed with the same spring, and the scrim fades with its position.
- Then `router.back()` runs on completion.
- The stack's own animation and gesture are turned off (`animation: 'none'`, `gestureEnabled: false` in `sheetScreenOptions`), so the route doesn't fade over our slide.
- Android back is caught with `BackHandler` while the sheet is mounted.

**Keyboard:** when the note editor focuses, the sheet goes to full.

**Reduce Motion:**
- Open and close become fades of the card and scrim, through `useSlideUp`'s rule.
- Drags still track the finger.
- Snaps don't spring: `ReduceMotion.System` makes them jump, which is the system behaviour.

**Accessibility:**
- The grabber is a button with the accessibility actions "Expand" and "Collapse" («توسيع» / «تصغير»), and it announces the new detent.
- The card is `accessibilityViewIsModal`, and `onAccessibilityEscape` closes the sheet.

**Medium windows:** the 560-wide centred card gets the same detents.

## Code (part B, after the frames are approved)
- **`form-sheet.ts`:**
  - Replace the per-sheet tops (`AYAH_SHEET_TOP`, `TAFSIR_SHEET_TOP`, `SETTINGS_SHEET_TOP`) and `sheetTopFor` with a pure `sheetDetents(windowHeight, safeTop)` → `{ full, mid, closed }`.
  - Add a pure `nextDetent(current, translation, velocity, detents)`.
  - Change `sheetScreenOptions` as above.
- **`SheetHost`:** owns the shared value for the sheet's top, the pan gesture, the scrim and the animated close. It exposes `close()` and the current detent through a small context (`useSheet()`).
  - `SheetContainer`'s close, the header X and the backdrop call `close()` instead of `router.back()`.
  - The routes `app/ayah`, `app/tafsir` and `app/reader-settings` drop their `topGap`.
- **`SheetScrollView`:** a new component in `src/features/reader/components/`. It reads `useSheet()`, locks scrolling below full, and wires the `Gesture.Native` hand-off. `TafsirPanel`, the actions panel and the settings sheet use it in place of `ScrollView` when they render in a sheet. The side panel keeps a plain `ScrollView`.
- **Spec and ADR:**
  - Spec §12 "Motion" (the reader sheets sentence) and §4's sheet rows describe the detents.
  - New ADR 0020, "Sheet detents": a 50% mid detent, a full detent, slide-down dismiss, and the frames redrawn. It amends ADR 0013's sheet heights.
- **Tests:**
  - `sheetDetents` and `nextDetent`: every threshold, velocity in each direction, never skipping a detent, a small window, and a large safe area.
  - `SheetHost`: it opens at mid; `close()` animates and then calls `router.back` once; the scrim press and Android back close it; Reduce Motion uses a fade; the a11y actions expand and collapse.
  - `SheetScrollView`: scrolling is locked at mid and unlocked at full.
  - Run the route tests in ar and en.

## Review
- **Frames:** compare each sheet at mid and at full on the iPhone 17 simulator with its redrawn frame (`frame-shot.py AyahSheet`, `Tafsir`, `TafsirFull`, `TafsirDownload`, `ReaderSettings`).
- **Recording:** a screen recording (`xcrun simctl io booted recordVideo`) of open → full → mid → closed, and of a close from the X, to check the slide-down and that there's no fade.
- **Settings:** run all of these with Reduce Motion on and off, and in Arabic and English.
