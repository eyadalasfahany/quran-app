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

## Rebuild

```bash
python design/screens/scripts/build.py      # monolith -> design/screens
python design/scripts/build_reference.py    # design/screens -> this reference
```
