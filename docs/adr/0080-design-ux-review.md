# 0080 — UX review of the screen designs (8 Nov 2026)

Date: 2026-11-08 · Status: **proposed** (waiting for the developer) · Amends the frames listed below in `screens/` (ADR 0075). The app is not changed. Each fix reaches the app when its feature is next built or reviewed against its frame.

## Context

The developer asked for a UI/UX review of every frame in `screens/` (phone, tablet, widgets, Apple Watch), with fixes made only in the designs. The review used the `apple-design` skill (HIG: accessibility, layout, typography, color, tab bars and sidebars) and the `ui-ux-pro-max` pre-delivery checklist. All 238 frames were rendered in headless Chrome. A script measured text size, contrast, hit areas, accessible names, nested controls and clipping in each frame, and every section was checked by eye from screenshots.

## Decision

Fixes made in the frames:

1. **Layout bugs**
   - `Search`, `HadithCollSearch*`: the search field couldn't shrink, so «إلغاء» was pushed off the screen. The field now shrinks, and «إلغاء» keeps a 44 pt hit area.
   - `HomeAzkarLower*`: the five quick links were clipped mid-word. The row now scrolls edge to edge with 76 pt tiles, and the fifth tile peeks in at the screen edge.
   - `AndroidWidgets*`: in the 2×2 next-prayer widget, the countdown was cut off and the dots overlapped the time. The time and dots now share one row, and the countdown sits on a single line.
   - `AzkarReaderDone`: the count button and previous/next moved about 30 pt between dhikr. They now stay in the same place as `AzkarReader`, so repeated taps land where the thumb already is.
2. **Accessibility**
   - Buttons nested inside links were split into a link plus a sibling `<button>`. This covers remove-favourite in `AzkarFavorites`, the reminder bell in `MyDuas*`/`MyDuaEditor*`, and cancel-download in `HadithCollList*`, `HadithCollOfflineDownloaded` and `HadithCollDownloadFailed`.
   - `<span role="button">` became real buttons, which keyboards and screen readers can focus: Hijri day cells, `AsmaaDetail*` and `AzkarSearchEmpty`. In `DiscoverTip`, close and skip are now real buttons too.
   - The text glyphs ✓ and ✕ used as icons were replaced with vector strokes (`AyahSheet`, `DiscoverTip`, and the tablet swatch check in `screens.css`).
   - Hit areas raised to 44 pt: Focus previous/next, «تعديل» on Home, and the Home Hijri date pill (its look is unchanged).
   - Contrast: Focus neighbour ayahs went from opacity 0.22 to 0.5 (1.6:1 → 3.3:1; the Quran text itself is untouched). Out-of-month Hijri days went from 0.4 to 0.6. Muted text on selected Hadith rows in the expanded layout now passes 4.5:1. The «غير متاح دون اتصال» reason in `HadithCollOfflineDownloaded` is legible again (the row stays dimmed).
   - English frames: the navigation landmark is labelled «Main navigation».
3. **Consistency**
   - `HomeAzkarEnglish`: the continue-reading card was still in Arabic and its ornament covered the label. It now uses the strings and mirrored ornament from the approved `HomeEnglish`.
   - `ExpandedHome*`, `AzkarExpanded`: the sidebar was reordered here. **Superseded by ADR 0081:** the sidebar is replaced by the tab rail of ADR 0051.
   - `WidgetAddConfirm` (light): it previewed the dark widget. It now previews the light widget, like its siblings.
   - English Hadith frames: Latin text is start-aligned instead of justified, which left wide gaps between words.

Checked and left as they are: segmented controls 40 pt tall inside a 46 pt track; iOS switches 51×31 inside full-width rows; text fields whose 44–48 pt container is the hit area; content dimmed behind a scrim or in a disabled or sending state; the 10 pt figures in Watch complications (watchOS sizes); and the bracketed placeholders (no generated religious content, ADR 0076).

## Consequences

- The affected features follow these frames when they are next built or reviewed. The Frontend rule's review against the HTML applies as usual.
- The app needs no new strings: the English card uses existing translations, and «Main navigation» is an accessibility label only.
