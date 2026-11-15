# Step 6 — Frames for the Madinah SVG mushaf (ADR 0090, design flow ADR 0087)

Branch `ft/madinah-svg-mushaf`, worktree `/Applications/MAMP/htdocs/quran-app-mushaf`. Stage nothing. HTML frames only: no app code, and nothing under `design/` edited by hand.

## Read first

- Root `CLAUDE.md`, «Design source» and «Flow for every new or changed design».
- `docs/adr/0090-madinah-svg-mushaf.md`: decisions 2, 3, 8 and 9, and «Decided» 3 and 4.
- The four frames you change:
  - `screens/frames/core/Mushaf.html`
  - `screens/frames/core/ReaderSettings.html`
  - `screens/frames/onboarding/OnboardScript.html`
  - `screens/frames/loading/LoadingMushaf.html`
- `screens/index.html`: their `gx-fig` blocks and captions.
- `screens/screens.css`: shared styles. Never copy them into a frame.
- Tokens in `quran-app-design-system.html`. Use only existing colours; the values below are the light-theme tokens these frames already use.

## Assets (already added)

`design-assets/mushaf/hafs-050.svg` and `design-assets/mushaf/hafs-051.svg`: two printed pages, each 345 × 550 units. Reference them from a frame as `../../../design-assets/mushaf/hafs-050.svg`, the same way `azkar/SalahAzkar.html` references `design-assets/salah/`. Never inline them, never base64.

## 1. `core/Mushaf.html`: the printed page

Keep everything outside the two page boxes exactly as it is: toolbar, title pill, scroll indicator, top fade and player bar.

Inside the page boxes:

- Keep both page boxes and their gold double border (`data-dc-tpl` 5/6 and 31/32). Inside each box, replace the surah-title band, the basmala and the Amiri ayah paragraphs with the page artwork:
  - first box: `hafs-050.svg`;
  - second box: `hafs-051.svg`.
- Change the inner box padding to `10px`.
- **No cartouche band.** The artwork's own surah title is the title (ADR 0090 «Decided» 3). Remove the `sh-compact` band and the «سورة …» span.
- **Page container:** `position: relative; width: 100%; aspect-ratio: 345 / 550;`. Place the `<img>` inside at `position:absolute; inset:0; width:100%; height:100%`, with `alt=""` and `aria-hidden="true"`. Keep the first box's `margin-top: -190px`, so page 50 starts scrolled under the toolbar as page 1 did; adjust it only if the toolbar then covers the surah title, and keep the title visible.
- **Overlay rectangles** inside the first page only, positioned in percent of the page container, behind the image (`z-index` below the `<img>`):
  - Recited ayah wash, two rectangles, background `rgb(236, 236, 229)` (`highlight-active`), `border-radius: 6px`:
    - A: `left 0.00%; top 13.59%; width 33.30%; height 6.91%`
    - B: `left 7.50%; top 20.50%; width 91.77%; height 6.73%`
  - Recited word pill: `left 74.58%; top 20.52%; width 12.68%; height 6.71%`, background `rgb(31, 77, 64)` (`brand`), `border-radius: 8px`.
- **Light word on the pill:** a second `<img>` of the same page above everything, `position:absolute; inset:0; width:100%; height:100%`, `aria-hidden="true"`, with:
  - `clip-path: inset(20.52% 12.74% 72.77% 74.58%)`;
  - `filter: brightness(0) invert(1)`, so only the recited word is drawn light on the pill, as in Reading mode's pill (ADR 0039).
- **Divider** between the pages: `صفحة ٥١ · الجزء ٣`.
- **Title pill:**
  - first line `آل عمران`;
  - second line `صفحة ٥٠ · الجزء ٣`.
- **Player bar** text: `آل عمران · الآية ٣`. Keep the reciter name as it is.

## 2. `core/ReaderSettings.html`: the mushaf picker replaces the font picker

Find the Quran-font radio group. Its section title is about the font (`خط المصحف` or similar). Replace the group, keeping its card style, selected ring and layout:

- **Section title:** `المصحف`
- **Five radio cards, in this order.** The first is selected. Title, then muted subtitle:

  | Title | Subtitle |
  | --- | --- |
  | `حفص عن عاصم` | `مجمع الملك فهد · ١٤٤١هـ · مُنزَّل` |
  | `ورش عن نافع` | `مجمع الملك فهد · ١٤٤٢هـ · ٧٣ ميغابايت` |
  | `قالون عن نافع` | `مجمع الملك فهد · ١٤٤٣هـ · ٧٨ ميغابايت` |
  | `شعبة عن عاصم` | `مجمع الملك فهد · ١٤٤٣هـ · ٦٩ ميغابايت` |
  | `الدوري عن أبي عمرو` | `مجمع الملك فهد · ١٤٤٣هـ · ٦٧ ميغابايت` |

- If the frame shows any other font row (Scheherazade, IndoPak, Tajweed), remove it. Change nothing else on the sheet.

## 3. `onboarding/OnboardScript.html`: pick a mushaf on first install

Keep the frame id and the onboarding chrome: progress, buttons, layout.

- **Title:** `اختر المصحف`
- **Subtitle:** `يمكنك تغييره لاحقًا من الإعدادات.`
- **Cards:** replace the script or font cards with the same five radio cards as in section 2. Hafs is selected, and its subtitle reads `مجمع الملك فهد · ١٤٤١هـ · ٦٣ ميغابايت`, because nothing is downloaded yet.
- **Preview:** if the frame has a text preview, replace it with a cropped preview of `hafs-050.svg`: the top third of the page, in a rounded container clipped by `overflow:hidden`.

## 4. `loading/LoadingMushaf.html`: the mushaf download

Keep the reader chrome (toolbar, background). Replace the page skeleton area with a centred download card in the existing card style:

- **Title:** `تنزيل المصحف`
- **Body:** `مصحف حفص عن عاصم · ٦٣ ميغابايت`
- **Progress bar** at 42%, with the label `٤٢٪`. Track `rgb(231, 223, 204)`, fill `rgb(31, 77, 64)`. The fill starts from the right (RTL).
- **Note:** `يمكنك القراءة في وضع القراءة أثناء التنزيل.`
- **Buttons:**
  - primary `القراءة الآن`, linking `../../index.html#Reading` if a `Reading` frame exists; otherwise `#Main`;
  - secondary `إلغاء التنزيل`.

## 5. Captions and rebuild

- In `screens/index.html`, append ` (بانتظار الموافقة)` to the `gx-fig` caption of each of the four frames.
- Run, from the repo root:
  - `python3 design/screens/scripts/build.py && python3 design/scripts/build_reference.py`
  - `npm run check:html -w @quran/design-tokens`
- Render each frame at 390 × 844 with `python3 packages/design-tokens/scripts/frame-shot.py <FrameId> <out.png>`, writing to `/private/tmp/claude-501/-Applications-MAMP-htdocs-quran-app/45caaed8-c2a1-4fa5-a801-974871103e43/scratchpad/frames/`. The frame ids are `Mushaf`, `ReaderSettings`, `OnboardScript` and `LoadingMushaf`.

## Report

- The files changed.
- The check output.
- The four PNG paths.
- Anything that did not fit the frame as described. Stop and report rather than redesign.
