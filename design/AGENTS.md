# AGENTS — design/

The design reference: one folder per stack, one folder per screen, four variant pages per screen.

## Source of truth

- `screens/` (repo root, ADR 0075) is the design source, one file per frame, and what CI and
  `frame-shot.py` use. A UI review still compares against its frame there (root `CLAUDE.md`,
  frontend rule). Edit frames in `screens/frames/<section>/<FrameId>.html`, never here.
- Only **drawn** variants are designs. **Derived** variants (built by `scripts/build_reference.py`)
  are drafts: a mismatch with a derived variant is a question for the developer, not a review fail.
- Never edit generated files by hand: `<stack>/**`, `index.html`, `CATALOG.md`, `catalog.json`,
  `common/catalog.js`, `common/assets/`, `common/frames.css`. Change the build or its inputs.

## Read order (save tokens)

1. This file.
2. `CATALOG.md`: find the screen, its stack, and which variants are drawn (D) or derived (d).
3. Only if you need markup: one `<stack>/<Screen>/<variant>.html`. Never open many.
4. Never open `common/catalog.js`, `common/assets/` or the monolith unless rebuilding.

## Hard rules

1. Quran, dhikr, dua and hadith text is byte-for-byte and stays RTL; the build checks it.
2. `scripts/ltr-strings.json` holds UI strings only. Never put religious text in it.
3. Layout follows the window class, never the device (spec §4); `common/frame.js` is the one place
   that lays a frame out per window size.
4. `awaiting-approval` screens need the developer's sign-off before app code (ADR 0010).

## New designs (ADR 0087)

1. Draw the frame in `screens/frames/<section>/<FrameId>.html` (never here).
2. Add its `gx-fig` block to `screens/index.html`. A new design's caption carries «(بانتظار الموافقة)», so it is `awaiting-approval` until the developer approves it.
3. Rebuild (below), then review at `design/<stack>/<Screen>/index.html`. Share it as `design/<stack>/<Screen>/index.html?theme=light&dir=rtl&sizes=compact%2Cmedium%2Cexpanded%2Clandscape` (`theme` light|dark|both, `dir` rtl|ltr|both, `sizes` any of compact, medium, expanded, landscape).
4. Never hand-edit the files the build writes. Commit the regenerated output with the frame change.

## Rebuild

```bash
python3 design/screens/scripts/build.py      # screens/ -> design/screens
python3 design/scripts/build_reference.py    # design/screens -> this reference
```
