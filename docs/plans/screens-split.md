# Screens split (ADR 0075)

Date: 7 Nov 2026 · Developer request, same day.

## Steps

1. Images out of the file: the 28 base64 photos (7 distinct, 4 copies each) became `design-assets/salah/*.jpg` paths. 8.2 MB to 2.4 MB.
2. Split `quran-app-screens.html` into `screens/`: `index.html` (sections, notes, frame wrappers, one lazy iframe per frame), `screens.css` (head styles, the loading animation with `#loading` rewritten to `.gx-sec-loading`, the frame-page rules), `screens.js` (the tablet reader's selected-line script), and 230 frame pages in 21 section folders. Done by a one-off script, not kept in the repo.
3. Tools: `screens_lib.py` (new), `frame-shot.py` (renders the frame page), `check-screens.mjs` (folder checks, in `check:html`), `design/screens/scripts/build.py` (reads `screens_lib.combined()`), the widget catalog test (reads `screens/index.html`).
4. References: the instruction files (root and mobile `CLAUDE.md` and `AGENTS.md`, `.cursor/rules`, the feature-reviewer agent, `design/` docs), the spec, the active Phase 7 plan, 165 code comments, ADR 0010 and 0013 headers. Finished plans and older ADRs keep their wording as history; ADR 0075 says the old name now means `screens/`.
5. `quran-app-screens.html` deleted, with the one-off scripts that patched it.
6. Follow-ups (developer, 7 Nov 2026): `WidgetAddConfirm`'s switch and buttons moved into its dialog (matching the dark frame); the five broken links retargeted; `AndroidWidgetsDark` rebuilt on the light frame's structure in dark colours (the stale centred next-prayer widget removed, the status bar and footnote restored).

## Repairs made by the split

The old file had broken nesting. A browser read it with some frames inside the frame before them.

- Missing `</div>`s closed: the Duas section (`DuasHome` … `MyDuasEmpty`), `HomeHijriDate`, `WidgetsHelpDark`, `LoadingTafsir` (its screen element itself), and the wrappers after them: 28 tags in all.
- 10 stray `</div>`s dropped (sections Salah, Widgets and entry points).
- Markup that sat outside the 390 × 844 screen, invisible, moved into the frame's own file below the visible area: `WidgetAddConfirm` (a Cancel / Continue row) and `AndroidWidgetsDark` (truncated mid-attribute, a known issue in `design/README.md`). Both were then fixed (step 6).
- Five links pointed at frames that do not exist (`MainDark`, `MushafDark`, `RecitersDark`, `MyQuranDark`); retargeted in step 6 to `HomeDark`, `Mushaf`, `Reciters`, `MyQuran`.

## Verification

- With every `</div>` removed, the combined document equals the old file's body byte for byte (no text, attribute or tag other than `</div>` changed), and the index is well-formed: no open tags, no strays, no frame inside another.
- Every frame was rendered with the old `frame-shot.py` on the old file and with the new one on its frame page, and the PNGs compared pixel by pixel: 178 of 229 identical, 40 within 1–35 px (anti-aliasing), 11 HadithColl frames identical once re-rendered one at a time (the first pass lost the Google Fonts race), and two real differences: `AndroidWidgetsDark` (its spilled widgets now show below the broken header; the frame was already broken) and `ReaderExpandedActions`/`ReaderExpandedDark` (692 px: the selected-line rule from `screens.js` now draws, as it always did in the browser). `ReaderMedium` had no old render (the old tool could not size a medium window).
- `design/screens/scripts/build.py` from `screens/` matches its output from the old file except in the repaired frames (closing tags and whitespace only).
- `npm run check:html -w @quran/design-tokens` passes; the widget catalog and Qibla tests pass.
