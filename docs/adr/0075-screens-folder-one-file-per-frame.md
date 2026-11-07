# 0075 — The screen designs live in `screens/`, one file per frame

Date: 2026-11-07 · Status: **accepted** (developer, 7 Nov 2026) · Amends ADR 0010 decision 1 (where the screen designs live; the HTML files stay the design source) and ADR 0013 (the screens win over other references, wherever they live). Supersedes every mention of `quran-app-screens.html` as a file to read or edit; older ADRs and plans that name it now mean `screens/`.

## Context

`quran-app-screens.html` held all 230 frames in one file. It reached 8.2 MB, 5.9 MB of which was seven Salah photos pasted inline as base64, four times each. Every open or render in a browser was slow, and agents could not read or patch one frame without loading or rewriting the whole file. Two sessions editing it at once overwrote each other on 7 Nov 2026. The images moved to `design-assets/salah/` the same day, but the file was still 2.4 MB.

The split also showed 21 frames with missing or stray `</div>` tags, so that some frames nested inside the one before (the Duas section, `LoadingTafsir`, `WidgetsHelpDark`, `HomeHijriDate`), and two frames with markup that had spilled outside the 390 × 844 screen (`WidgetAddConfirm`, `AndroidWidgetsDark`).

## Decision

Developer, 7 Nov 2026 («a folder that has the screens, another directory containing each screen in a separate file and an html combining them»; «anything that is reusable should be used across htmls»):

1. **Layout.**

   ```
   screens/
     index.html                      sections, headings, notes, and one iframe per frame
     screens.css                     shared styles: fonts, tokens, device chrome, frame classes
     screens.js                      shared script (the tablet reader's selected-line rule)
     frames/<section>/<FrameId>.html one frame, a standalone page
   design-assets/                    shared images (already used by the frames)
   ```

   Sections: `core`, `reading`, `salah`, `azkar`, `duas`, `menu`, `menu-cards`, `home`, `onboarding`, `khatma-account`, `states`, `hadith-daily`, `loading`, `widgets`, `expanded`, `tablet-reader`, `names`, `hijri`, `moon`, `entry-points`, `hadith`.

2. **A frame file is a standalone page.** It links `../../screens.css`, ends with `<script src="../../screens.js"></script>`, and its body holds exactly the screen element (the 390 × 844 root for a phone frame, the `xw-device` or `xr-device-md` window for a tablet frame). Links to other frames are `href="../../index.html#FrameId"` (with `<base target="_top">`, so a click inside the combined page moves the whole page). Images are `../../../design-assets/...`. A phone frame's body has the class `screen`, so it inherits what the device wrapper gives it in the combined page.
3. **`index.html` combines the frames.** Each frame keeps its `gx-fig` wrapper, caption and device chrome in the index; the screen element is replaced by `<iframe class="gx-frame" src="frames/<section>/<FrameId>.html" width="…" height="…" loading="lazy" title="FrameId">`. Frames load only when scrolled into view, so the page opens fast. No build step: edit a frame file, refresh the index.
4. **Anything reusable is shared, never copied.** Styles go in `screens.css`, scripts in `screens.js`, images in `design-assets/`. A frame page has no `<style>` or `<script>` of its own and no base64 image. The design system (`quran-app-design-system.html`) shares only one rule with the screens, so it stays separate.
5. **Tools.** `packages/design-tokens/scripts/screens_lib.py` lists frames, reads one frame's markup, and rebuilds the whole design as one document in the old single-file form for tools that want that (`design/screens/scripts/build.py`). `frame-shot.py <FrameId> <out.png>` renders the frame page itself, on white with animations stopped, at the size the index declares. `npm run check:html -w @quran/design-tokens` runs `check-screens.mjs`, which fails when a frame file is missing or not loaded, an id repeats, a page lacks the shared CSS or script, or an image is inlined or missing. Links to frames that do not exist are warnings. Five existed before the split, from `ExpandedHomeDark` and `SalahDark`; they now point at the drawn frames (`MainDark` → `HomeDark`; `MushafDark`, `RecitersDark`, `MyQuranDark` → `Mushaf`, `Reciters`, `MyQuran`, which have no dark frame).
6. **Broken markup was repaired, not redrawn.** The split closed the 21 frames' missing tags and dropped 10 stray ones, so no frame nests in another. The two spilled blocks moved into their own frame files. In `WidgetAddConfirm` the spill was the dialog's Cancel / Continue row, and its Home / Lock switch had also fallen out of the dialog; both now sit inside the dialog, as in `WidgetAddConfirmDark` (developer, 7 Nov 2026). `AndroidWidgetsDark` was truncated mid-attribute (its root tag, status bar and the first widget's opening were lost, and an older centred next-prayer widget was left behind); it was rebuilt on the light frame's structure with the dark colours already used in the frame and its siblings, so it now matches `AndroidWidgets` (developer, 7 Nov 2026). No other drawn content changed. Every frame was rendered before and after and compared (see the plan, `docs/plans/screens-split.md`).
7. **`quran-app-screens.html` is removed**, with the one-off scripts that patched it (`insert-widget-add-confirm-frames.py`, `insert-widgets-help-frames.py`, `patch-android-widgets-next-prayer.py`, four `tmp/` scripts, `scratch-run1.js`). Git history keeps them.

## How to work with it

- **Find a frame:** `screens/index.html` (search for `id="FrameId"`), or `design/CATALOG.md`.
- **Edit a frame:** open only `screens/frames/<section>/<FrameId>.html`. Use inline styles as before; put any style or script that two frames share in `screens.css` or `screens.js`.
- **Add a frame:** copy a sibling frame file in the same section, rename it to the new id, and add its `gx-fig` block (caption, device chrome, iframe) to that section in `index.html`.
- **Review:** compare the app with `frame-shot.py <FrameId>` (ADR 0010 and the frontend rule in `CLAUDE.md`, unchanged).
- **Concurrent work:** two agents can now edit different frames without touching the same file.

## Consequences

- Opening the designs loads a 100 KB page and only the frames on screen, instead of 8.2 MB.
- Agents read 5–40 KB per frame instead of searching a 2.4 MB file.
- A frame and its index entry are two files to keep in step when adding or renaming a frame; the check catches a mismatch.
- `design/screens` (the earlier split) is still generated, now from `screens/`, and `design/` builds on it unchanged.
