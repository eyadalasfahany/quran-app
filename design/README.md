# Taybah design reference

Every screen of the app on its own page, laid out like a Figma file: light and dark, Arabic (RTL)
and English (LTR), at every window size. Open [`index.html`](index.html) in a browser. It works
from disk; no server needed.

`screens/` (repo root, one file per frame, ADR 0075) is the design source and what CI and `frame-shot.py`
read (ADR 0010). This folder is built from it and adds the variants nobody drew yet.

## Layout

```
design/
  index.html                 the file: every stack as a card
  <stack>/index.html         one stack: all its screens on a canvas
  <stack>/<Screen>/
    index.html               one screen: every window size x theme x direction
    light-rtl.html           the four variants, each a standalone page
    dark-rtl.html            (add ?size=compact|medium|expanded|landscape)
    light-ltr.html
    dark-ltr.html
  common/                    shared by every page
    frames.css               the frame classes from the monolith (tablet windows)
    frame.js / frame.css     lays one variant out for a window size
    canvas.js / canvas.css   the canvas: pages list, pan and zoom, inspector
    catalog.js               the screen list the canvas reads (generated)
    assets/                  the frame images, stored once
  CATALOG.md / catalog.json  one row per screen, for people and agents (generated)
  scripts/                   the build (see below)
  screens/                   the earlier one-file-per-frame split; the build reads it
```

## Using the canvas

- **Theme, Direction, Window** in the top bar pick what the canvas shows. "Both" shows both side
  by side. Your choice is kept per browser.
- **Pan:** drag the empty canvas, scroll, or hold Space and drag. **Zoom:** Ctrl/⌘ + scroll, the
  − / + buttons, Shift+1 to fit, Shift+0 for 100%.
- **Select** a frame to see where it came from in the inspector. Double-click a frame on a stack
  page to open its screen.
- **Prototype** (key P) lets clicks reach the frames, so the links between screens work.
- **Badges** shows which variants were drawn and which were derived. **Untranslated** outlines UI
  text the LTR build left in Arabic.

## Drawn and derived

| Badge | Meaning |
|---|---|
| Drawn | The designer drew it: a frame in `screens/` (`X`, `XDark`, `XEnglish`). |
| Derived | Built from a drawn frame. Treat it as a strong draft, not an approved design. |

How a variant is derived:

- **Dark:** every inline colour goes through the light→dark map learned from the 26 drawn
  light/dark pairs (matched element by element), falling back to the dark tokens in
  `packages/design-tokens/src/colors.ts`.
- **LTR (English):** the layout is mirrored (direction, physical sides, chevrons and transport
  icons). UI strings are translated from the app's `ar.json`/`en.json`, the drawn English frames,
  and `scripts/ltr-strings.json`. Strings with no translation stay Arabic and are counted.
- **Quran, dhikr, dua and hadith text is never translated or changed.** It stays byte-for-byte
  and keeps RTL order inside LTR frames. The build fails if any of it changes.
- **Window sizes** (spec §4, ADR 0036, ADR 0051 as amended 2 Nov 2026), applied by
  `common/frame.js`:

  | Window | Size | Layout |
  |---|---|---|
  | Compact | 390 × 844 | as drawn: bottom tab bar, bottom sheets |
  | Medium | 744 × 1133 | content in the 720 column, bottom bar capped at 720, sheets as a 560 card |
  | Expanded | 1194 × 834 | the 76 pt rail on the start edge, content clears 100, sheets as a 400 side panel |
  | Short | 844 × 390 | the rail; uses the drawn landscape frame where one exists |

  Feature layouts that change with the window (the two-column Home, the reader's docked panel) are
  only as good as the drawn tablet frames, which still show the sidebar ADR 0051 retired. The
  inspector links to them.

Widgets and the watch are boards, shown at their drawn size only. The watch is dark only.

## New designs (ADR 0087)

Every new or changed design follows this flow:

1. Draw the frame as one file in `screens/frames/<section>/<FrameId>.html`. Copy a sibling in the same section to start. Shared styles, script and images stay in `screens/screens.css`, `screens/screens.js` and `design-assets/`. A hand-drawn variant is a sibling `<FrameId>Dark.html` or `<FrameId>English.html`.
2. Add its `gx-fig` block with the iframe to `screens/index.html`. A new design's caption contains «(بانتظار الموافقة)», which makes it `awaiting-approval`. The developer removes the marker on approval.
3. Rebuild with the two commands below.
4. Review it at `design/<stack>/<Screen>/index.html`; share it as `design/<stack>/<Screen>/index.html?theme=light&dir=rtl&sizes=compact%2Cmedium%2Cexpanded%2Clandscape` (`theme` light|dark|both, `dir` rtl|ltr|both, `sizes` any of compact, medium, expanded, landscape). Derived variants are drafts; drawn variants must match.

Never hand-edit anything under `design/` that the build writes. Commit the regenerated `design/` output with the frame change.

## Rebuild

After a frame in `screens/` changes, refresh the split, then this reference:

```bash
python design/screens/scripts/build.py
python design/scripts/build_reference.py
```

The build prints how many variants were drawn and derived, warns about damaged drawn frames, and
writes the UI strings it could not translate to `scripts/untranslated.txt`. Add English for those
to `scripts/ltr-strings.json` (UI text only) and rebuild.

