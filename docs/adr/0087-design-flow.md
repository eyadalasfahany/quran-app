# 0087 — The design flow: screens/ source, design/ reference (9 Nov 2026)

Date: 2026-11-09 · Status: **accepted** (developer, 9 Nov 2026) · Amends ADR 0075 and ADR 0010.

## Context

Two design folders exist. `screens/` (ADR 0075) holds one HTML file per frame and is what CI and `frame-shot.py` read. `design/` is a reference built from it: one folder per screen, with light and dark, Arabic and English variants at each window size. Another team developer built `design/` (commit 9166d4b4) and its README and AGENTS files. Variants nobody drew are derived by the build, and reviewers can open them on one page.

Until now, `design/` was not rebuilt after every frame change, so it lagged behind the frames it was built from. The developer wants one flow for every new or changed design.

## Decision

1. **Draw.** Draw the frame as one HTML file in `screens/frames/<section>/<FrameId>.html`, the source (ADR 0075). Copy a sibling in the same section to start. Shared styles, script and images stay in `screens/screens.css`, `screens/screens.js` and `design-assets/`; they are never copied and never inlined as base64. A hand-drawn dark or English variant, when drawn, is a sibling file `<FrameId>Dark.html` or `<FrameId>English.html`.
2. **Index.** Add the frame's `gx-fig` block, with its iframe, to `screens/index.html`. A new design's caption contains «(بانتظار الموافقة)» (or "awaiting" or "proposed"), which makes its status `awaiting-approval`. On the developer's approval the marker is removed from the caption.
3. **Rebuild.** From the repo root, run:

   ```bash
   python3 design/screens/scripts/build.py
   python3 design/scripts/build_reference.py
   ```

   This writes `design/<stack>/<Screen>/` with `index.html` (the canvas) and four variants: `light-rtl.html`, `dark-rtl.html`, `light-ltr.html` and `dark-ltr.html`, at compact, medium, expanded and short window sizes. Variants nobody drew are derived: dark from the learned colour map, LTR mirrored and translated from `ar.json`, `en.json` and `design/scripts/ltr-strings.json`. Quran, dhikr, dua and hadith text is never changed, and the build fails if it is. Strings listed in `design/scripts/untranslated.txt` get English in `ltr-strings.json` (UI strings only), then the build runs again.
4. **Review.** The design is presented, shared and reviewed at `design/<stack>/<Screen>/index.html`, handed over as a link such as `design/<stack>/<Screen>/index.html?theme=light&dir=rtl&sizes=compact%2Cmedium%2Cexpanded%2Clandscape` (`theme` light|dark|both, `dir` rtl|ltr|both, `sizes` any of compact, medium, expanded, landscape; developer, 9 Nov 2026). App code starts only after the developer approves an `awaiting-approval` screen (ADR 0010). A derived variant is a draft: a mismatch with it is a question for the developer, not a review failure. A drawn variant must match.
5. **Generated files are never hand-edited.** That covers `design/<stack>/**`, `design/index.html`, `design/CATALOG.md`, `design/catalog.json`, `design/common/catalog.js`, `design/common/assets/`, `design/common/frames.css` and `design/screens/**`. The rebuild deletes and regenerates them. Change the frame or the build's inputs instead.
6. **Checks and tools.** `npm run check:html -w @quran/design-tokens` still checks `screens/`. `packages/design-tokens/scripts/frame-shot.py <frame-id> <out.png>` still renders a frame from `screens/` for the simulator comparison (ADR 0010).

## Consequences

- Every design change ends with a rebuild. A frame change without its rebuilt `design/` output is incomplete.
- `design/` diffs are generated. They are committed with the frame change, and reviewers should not read them line by line.
- Reviewers open `design/<stack>/<Screen>/index.html` to see all variants at once. The frame in `screens/` stays the source for the simulator comparison.
- `design/AGENTS.md` and `design/README.md` are hand-written and not written by either build. They describe this flow.
- The rebuild regenerates every stack, not only the changed screen, so one commit can touch many files when the committed `design/` output was out of date.
- `design/screens/` keeps only the build's inputs (lean frame copies, `frames.json`, `assets/`, `common/styles.css`). Its old viewer and extras pages were removed (developer, 9 Nov 2026: no unused HTML).
