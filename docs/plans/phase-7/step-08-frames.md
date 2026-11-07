# Step 8 — Hadith collections design frames

> **Since 7 Nov 2026 (ADR 0075)** the frames are no longer in `quran-app-screens.html`; that file was split into `screens/`. The Hadith frames are `screens/frames/hadith/HadithColl*.html`, shown together in `screens/index.html` (section `hadith`). Read every mention of `quran-app-screens.html` below as `screens/`. To change a frame, edit its own file; to add one, copy a sibling and add its iframe to `index.html`. Check with `npm run check:html -w @quran/design-tokens`.

ADR 0010 (frames before code), ADR 0012 (HIG), ADR 0013 (sheets), ADR 0020 (sheet detents), ADR 0033 (Android tab bar, see "Android"), ADR 0042 `0042-hadith-collections-source.md` (the Hadith ADR, not `0042-features-enabled-by-default.md`), ADR 0051 (tablet tab bar, see Open questions). Plan: `docs/plans/phase-7.md` ("Frames needed (step 8)", "Components", D5, D8, D9, D13, step 13). Model: `docs/plans/phase-6/step-04-frames.md`.

The frames are **proposed until the developer approves them**. Steps 9 (cover tokens and `CollectionCover`) and 12 (components) do not start before that approval. The step-16 review compares the built UI with these frames.

Read first: `.claude/agent-rules.md`, `CLAUDE.md`, `docs/plans/phase-7/README.md`, `.agents/skills/apple-design/SKILL.md` (load `accessibility.md`, `layout.md`, `typography.md`, `color.md`, `designing-for-ios.md`, `lists-and-tables.md`, `sheets.md`, `search-fields.md`, `loading.md`, `dark-mode.md`). Check the branch with `git branch --show-current` (expected `main`). Do not commit.

Steps 3 and 5 (API only) run in parallel. They do not touch `quran-app-screens.html`, `quran-app-design-system.html` or `packages/design-tokens`.

## Goal
Draw the Hadith collections section as static HTML frames in `quran-app-screens.html`, in a new section at the end of the file, from existing tokens and existing component markup. Render each frame, check it, and hand the developer a fixed review set. **HTML only.**

## Files
Change:
- `/Applications/MAMP/htdocs/quran-app/quran-app-screens.html` only.

Do **not** touch (cover tokens are step 9):
- `quran-app-design-system.html`
- `packages/design-tokens/src/*` (colors, typography, scale)
- any file under `apps/`

If a frame seems to need a token that is not in `packages/design-tokens/src/colors.ts`, `scale.ts` or `typography.ts`, stop and report it. The one exception is the ten cover grounds (next section).

## Rules
- **Existing language only.**
  - Colours as `rgb(...)` exactly as the Azkar frames write them. Light page `rgb(247, 243, 234)`, card `rgb(255, 253, 248)`, hairline `rgb(231, 223, 204)`, muted `rgb(91, 106, 100)`, brand `rgb(31, 77, 64)`, ink `rgb(19, 35, 31)`, medallion fill `rgb(239, 232, 216)`. For dark, copy the values from `AzkarHomeDark` (page `rgb(14, 23, 21)`, ink `#ece6d8`, card `#1c2b27`, line `#2a3a34`, muted `#a7b3ad`, brand `#8cc5af`).
  - IBM Plex Sans Arabic for UI; Amiri for titles and hadith text. Hadith body uses the existing `dhikr` scale (Amiri 400, 24 / 48) in the reader and `dhikrList` (Amiri 400, 19 / 34) in lists and previews. No new type sizes. Amiri Quran is not used in this section (no Quran passage).
  - Radii, spacing, 44 pt round icon button, hairline cards, number medallion, brand card with gold `#C9A961` ornament: copy markup from the source frames in the tables below.
  - **No new colours except the cover grounds** (carve-out, section "Cover palette"). Covers are the only new colour use, they are proposed for approval, and they become tokens in step 9.
- **No religious text, not even as an example.** Every hadith text, hadith preview, book name, section title and author is a bracketed placeholder:
  - hadith text: «[نص الحديث كما ورد في المصدر]» (repeat it two or three times for long text, to show wrapping)
  - collection: «[اسم المجموعة]» ; author: «[اسم المؤلف]» ; book: «[اسم الكتاب]» ; chapter: «[اسم الباب]»
  - source line / attribution: «[سطر النسبة من المصدر]»
  - a search query and its highlighted match: «[كلمة البحث]»; surrounding preview text: «[نص قريب من النتيجة]»
  - Numbers (hadith numbers, counts, sizes) are UI mock values in Arabic-Indic digits. They are not claims about the real collections. Use plausible mock values (for example `١٢٣٤`, `٧٥٦٣`); never a row of zeros such as `٠٠٠٠`, which looks like a bug.
  - **No grade text anywhere** except `HadithCollReaderGrade`, and there it is «[الحكم] — [اسم المحدّث]». No collection-level «صحيح» label.
  - UI copy (buttons, titles of screens, hints, empty states) is real Arabic and real English, written by you in the plain style of the Azkar frames.
- **Never copy text from `#Hadith`, `#HadithDetail`, `#HadithDetailEnglish`.** They hold a real hadith, real narrator text and a real grade. Do not use them as a markup source either, except the glass toolbar layout of `#HadithDetail` (the back button and the three-button glass pill at the top), and then every string is replaced. Structure comes from the Azkar, Tafsir and Search frames listed below.
- **Arabic-first, RTL.** Arabic frames use `dir="rtl"`. English frames use `dir="ltr"`, English UI labels, mirrored chevrons (copy `AzkarHomeEnglish` for how it mirrors), and **English placeholders for titles** («[Collection name]», «[Book name]», «[Chapter name]»). Arabic hadith placeholder blocks inside English frames keep `dir="rtl"` and `text-align: right`. Never type a `title_en` value; English names are placeholders too.
- **Hidden-when-empty.** A null Arabic title is not drawn and not replaced by the English name. The Arabic UI shows «مجموعة {n}» / «كتاب {n}» and the cover shows the ornament only (D9). No chapters level exists for the fawazahmed0 source: a book lists its hadith directly (D8).
- **Single-book collections** (`nawawi40`, `qudsi40`, `shahwaliullah40`, D13) open straight to the hadith list; no books screen.
- **Grades are hidden** (D4). No grade section in any frame except `HadithCollReaderGrade`, which is labelled as a future state.
- **No English hadith text** (ADR 0042 §6): the English reader frame shows the Arabic hadith with English UI labels.
- **No generated religious content.** No "virtue", "explanation" or "benefits" section appears in this section at all (those belong to the deferred HadeethEnc design).
- **Frame wrapper.** Phone frames are 390 × 844 in the standard `<div class="gx-fig" id="..."><div class="gx-cap">...</div><div class="device"><div class="screen"><div class="sc-host" data-sc-name="...">` wrapper, `data-sc-name` equal to the id. The expanded frames use the `xw-device` wrapper as in `#AzkarExpanded`. Copy the wrapper from the source frame, change `id`, `data-sc-name` and the `gx-cap`, and keep the rest.
- Captions (`gx-cap`) are short English phrases like the Azkar ones («Hadith collections · list · Arabic»).
- Links between new frames use `href="#<id>"` of another new frame. Back buttons point to the parent frame.
- Targets are at least 44 × 44 pt. Type sizes follow the source frames (the ladder they use: captions 12 or 13, UI 15 or 17, titles 19 to 26, hadith text 19 or 24); never raise a caption to fit a rule. Nothing is smaller than 11 pt. No Arabic mark may be clipped (line heights as in the source frames).

## Cover palette (proposed; the developer approves it in this step, ADR 0010)
Computed by the orchestrator (WCAG relative luminance). Do not change a value. Title colour on every cover is the existing on-brand cream `#F7F3EA`. The ornament is the existing brand-card ornament (gold `#C9A961`, stroke 0.8, opacity 0.35, copied from the `AzkarHome` brand card SVG). Light and sepia use the same ground. Dark uses the ground mixed 30% toward the dark page `#0e1715`.

| Slug | Position | Light and sepia ground | Contrast with cream | Dark ground | Contrast with cream |
| --- | :---: | --- | :---: | --- | :---: |
| `bukhari` | 1 | `#1B5E4B` | 6.90 | `#17473b` | 9.24 |
| `muslim` | 2 | `#7A2E3A` | 8.32 | `#5a272f` | 10.74 |
| `abudawud` | 3 | `#1F4A6E` | 8.38 | `#1a3b53` | 10.57 |
| `tirmidhi` | 4 | `#5B3A78` | 8.17 | `#442f5a` | 10.53 |
| `ibnmajah` | 5 | `#8A4B1E` | 6.11 | `#653b1b` | 8.64 |
| `nasai` | 6 | `#0F5B66` | 7.00 | `#0f474e` | 9.33 |
| `malik` | 7 | `#6B5A1E` | 6.10 | `#4f461b` | 8.53 |
| `nawawi40` | 8 | `#3D4F8A` | 7.07 | `#2f3e67` | 9.45 |
| `qudsi40` | 9 | `#8A3F5E` | 6.42 | `#653348` | 8.94 |
| `shahwaliullah40` | 10 | `#4A5B2A` | 6.72 | `#384724` | 9.05 |
| fallback (unknown slug) | — | `#4A5A55` | 6.57 | `#384642` | 8.93 |

- All title contrasts are ≥ 4.5 : 1. The ornament is decorative, so the 4.5 : 1 rule does not apply to it (see Open questions).
- In dark, every cover gets a 1 px `#2a3a34` border, because the dark grounds are only 1.5 to 1.9 : 1 against the page.
- Cover geometry (use the same in every frame, scaled by a `width` only): ratio 3 : 4, radius 14, padding 10, ornament top-leading, title Amiri 700 at 17 (small size 12) centred near the bottom, line-height 1.35, max 3 lines. Sizes used: thumbnail 56 × 75 (list rows), 40 × 54 (compact), large 132 × 176 (collection header), specimen 98 × 131 (covers frames).
- The title is «[اسم المجموعة]» in Arabic frames and «[Collection name]» in English frames. The **ornament-only cover** has the ornament and no title (D9). The **fallback cover** (unknown slug) uses the fallback ground and carries the title placeholder.

## Source frames to copy (all inside `quran-app-screens.html`)
Open each source with `grep -n 'id="<id>"' quran-app-screens.html` and copy its inner markup. Remove the parts listed under "Drop". Do not copy hadith, grade or dhikr text.

| Need | Copy from | Drop / change |
| --- | --- | --- |
| Screen header (back button, Amiri 26 title, round trailing buttons) | `AzkarHome` | trailing buttons per frame; title text |
| Dark and English variants | `AzkarHomeDark`, `AzkarHomeEnglish` | same changes as the light frame |
| Section title (15 / 600 muted), grouped list card (radius 20, hairline), ListRow | `AzkarHome` ("أذكار اليوم") | progress ring |
| Number medallion (36 pt, gold ring, Amiri 14) and card (radius 20, padding 14) | `AzkarCategory` | check mark, count chip, clamp 2 becomes clamp 3, Quran-passage styling |
| Progress bar | `AzkarCategory` (6 px bar) | only where this brief asks for it |
| Pill label «licensed recording (future)» | `AzkarDownloads` | text; used for "future" state labels |
| Search field, recents, highlight (outlined match) | `AzkarSearchEmpty`, `AzkarSearch`; chips from `Search` | strings; chips are collection chips |
| EmptyState (glyph, title, hint, button) | `AzkarFavoritesEmpty`, `AzkarUnavailable` | strings, glyph |
| Skeletons | `AzkarLoading` | row shapes become cover + two lines |
| Sheet chrome (grabber, SheetHeader, detent) | `AzkarDetails`, `TafsirDownload` | content |
| Download row with progress, cancel, retry | `AzkarDownloads`, `TafsirDownload`, `PlayerReciterDownloading` | strings |
| Offline banner | `Offline` | strings |
| Reader shell (top bar, centred text column, bottom controls) | `AzkarReader` | counter ring, Quran passage, action row; see `HadithCollReader` |
| Round previous / next buttons | `AzkarReader` (flanking the counter) | |
| Glass pill toolbar (bookmark, copy, share) | `HadithDetail` (layout only) | all strings and the grade pill |
| Expanded window | `AzkarExpanded` | content (see frame list) |
| Menu card style | `Menu`, `MenuDark`, `MenuEnglish` | add one card |
| Source rows | `Sources` | add rows |

## Frames
New section, **immediately before the final `</body></html>`** of `quran-app-screens.html` (decision: the plan says both "after the Azkar section" and "at the end"; the merge-risk table says "at the end", so the end wins; see Open questions). Do not repair the file's existing unbalanced `<section>`; do not touch any other section.

Markup of the section opener (copy the form from the Azkar section):
`<section class="gx-sec"><h2 class="gx-h2">الحديث — Hadith collections (proposed 2026-11-07)</h2><p class="gx-note">Proposed under ADR 0042 (Hadith collections); not approved until the developer signs off. Hadith text, collection, book, chapter and author names are bracketed placeholders. Counts and sizes are UI mock values. No grade is shown except in the labelled future frame.</p><div class="gx-row">` then the frames in the order below, then `</div></section>`.

**One id per screen.** `frame-shot.py` renders one frame per id. Every row below is one `gx-fig`. Order in the file = order in the table (the review order). All ids are unique and start with `HadithColl`.

### A. Covers (3 frames)
Phone frame with the `AzkarHome` header (title «أغلفة المجموعات»), a two-column grid (gap 14) of **12 covers**: the ten slugs in the table's position order, then the fallback cover, then the ornament-only cover. Under each cover: slug in `dir="ltr"` 11 pt muted, and `<contrast> : 1` (the contrast in the cover table for that theme; «—» for the ornament-only cover). All 12 covers must be visible in the 390 × 844 frame, so use a three-column grid (gap 12) with 98 × 131 covers. Do not clip any cover.

| id | Content |
| --- | --- |
| `HadithCollCovers` | Light page. Light grounds. |
| `HadithCollCoversSepia` | Sepia page: background `#f4ead5`, text `#2b2116`, muted `#6b5a44`, hairline `#e0d0b0`. Same grounds as light. |
| `HadithCollCoversDark` | Dark page. Dark grounds, 1 px `#2a3a34` border on each. |

### B. Collections list (3 frames)
Source: `AzkarHome` header and card list. Header: back button to `#Main`, title «الحديث», trailing search round button (`href="#HadithCollSearch"`) and a downloads round button (`href="#HadithCollDownload"`, arrow-down glyph copied from `AzkarDownloads`). Then one grouped list card of **six rows** (no section titles, one list): each row = thumbnail cover 56 × 75, `[اسم المجموعة]` (Amiri 19 / 700), author line `[اسم المؤلف]` (13 muted), counts line «٥٤٣٢ حديثًا · ٤٢ كتابًا» (12 muted), trailing chevron. Row states, in order:
1. installed (bukhari ground)
2. installed (muslim ground)
3. installed (abudawud ground)
4. **not installed**: counts line replaced by «٩٫٨ م.ب» and a trailing pill button «تنزيل» (44 pt tall touch area, brand fill, cream text; copy the «تنزيل» button from `TafsirDownload`)
5. **downloading**: counts line replaced by a 4 px progress bar at 60% and «جارٍ التنزيل · ٦٠٪»; trailing round «×» cancel button
6. installed (the single-book collection `nawawi40` ground; counts «٤٢ حديثًا · كتاب واحد»)

Footer under the list (caption, 12 / muted, centred): «المصدر: fawazahmed0/hadith-api · Unlicense». This wording is the plan's proposed default; the developer decides it (Open questions). Rows 1 to 3 and 6 link to the next frames: 1 to `#HadithCollBooks`, 6 to `#HadithCollSingle`.

| id | Content |
| --- | --- |
| `HadithCollList` | Light, Arabic. |
| `HadithCollListDark` | Dark, Arabic. Dark grounds. |
| `HadithCollListEnglish` | English LTR: title «Hadith», counts «5432 hadith · 42 books» (Western digits), «Download», «Downloading · 60%», footer «Source: fawazahmed0/hadith-api · Unlicense», placeholders in English. |

### C. Untitled fallback (6 frames)
The same as B and E but with every Arabic title null (D9). Covers are **ornament-only**; row titles are «مجموعة {n}» with n = the collection's position (1 to 6 here); author lines are omitted (hidden when empty). Book rows are «كتاب {n}».

| id | Content |
| --- | --- |
| `HadithCollUntitled` | Collections list, light, Arabic: six rows titled «مجموعة ١» … «مجموعة ٦»; one not installed; ornament-only covers on the light grounds. |
| `HadithCollUntitledDark` | Same, dark. |
| `HadithCollUntitledEnglish` | English: rows 1 to 3 «[Source collection name]» (English may show the source's name), rows 4 to 6 «Collection 4» … «Collection 6»; ornament-only covers on rows 4 to 6 only; rows 1 to 3 use titled covers with the English placeholder. |
| `HadithCollUntitledBooks` | Books list (as E) for a collection whose header has no title: header title «مجموعة ١», ornament-only large cover, no author line; every book row «كتاب ١» … «كتاب ٨» with a medallion number and a hadith count. Light, Arabic. |
| `HadithCollUntitledBooksDark` | Same, dark. |
| `HadithCollUntitledBooksEnglish` | English: header «Collection 1», rows «Book 1» … «Book 8». |

### D. Collection header and books (3 frames)
Source: `AzkarCategory` for the list and medallion, `AzkarHome` for the header row. Header block (no card): back button to `#HadithCollList`, large cover 132 × 176 centred, then `[اسم المجموعة]` (Amiri 26 / 700 centred), `[اسم المؤلف]` (15 muted), counts «٥٤٣٢ حديثًا · ٤٢ كتابًا» (13 muted), source credit caption «المصدر: fawazahmed0/hadith-api» (12 muted) and a small search round button on the header row (to `#HadithCollSearch`). Below: grouped list card of eight **book rows**: number medallion (the book number), title `[اسم الكتاب]` (Amiri 19 / 700) and a muted hadith count «١٢٣ حديثًا» at the end; row 5 and row 7 have **no title** and show «كتاب ٥» / «كتاب ٧» with the medallion (null title rule); chevron at the end. Rows link to `#HadithCollBook`.

| id | Content |
| --- | --- |
| `HadithCollBooks` | Light, Arabic. |
| `HadithCollBooksDark` | Dark. |
| `HadithCollBooksEnglish` | English: «[Collection name]», «[Author name]», «5432 hadith · 42 books», rows «[Book name]» and «Book 5», «Book 7», counts «123 hadith». |

### E. A book's hadith list, no chapters (3 frames)
Source: `AzkarCategory`. Header: back button to `#HadithCollBooks`; title `[اسم الكتاب]` (Amiri 26), subtitle `[اسم المجموعة]` · «١٢٣ حديثًا» (13 muted); trailing search round button. **No progress bar, no bell, no «ابدأ» button.** Hadith cards (six): medallion with the hadith number (use a pill-shaped medallion: min-width 36, horizontal padding 8, radius 18, for 4-digit numbers), a **3-line clamp** of «[نص الحديث كما ورد في المصدر]» repeated, in `dhikrList` (Amiri 19 / 34), colour muted as in `AzkarCategory`. Card 3 shows a saved state: a filled bookmark glyph at the end (a 24 pt brand glyph; no pill). Cards link to `#HadithCollReader`. Number examples: ١، ٢، ٣، ٤، ٥، ٦ plus one decimal «٢٧٨٧٫٢» on card 6 to show a wide medallion.

| id | Content |
| --- | --- |
| `HadithCollBook` | Light, Arabic. |
| `HadithCollBookDark` | Dark. |
| `HadithCollBookEnglish` | English labels; Arabic placeholder text blocks keep `dir="rtl"`; title «[Book name]». |

### F. Single-book collection (3 frames)
For `nawawi40`, `qudsi40`, `shahwaliullah40`: collection header **and** the hadith list in one screen, no books screen. Source: the header block of D at a smaller cover (compact 40 × 54 beside the title, not centred: a row with cover, then title and author), then the hadith cards of E (six cards). The back button goes to `#HadithCollList`. The cover uses the `nawawi40` ground.

| id | Content |
| --- | --- |
| `HadithCollSingle` | Light, Arabic. |
| `HadithCollSingleDark` | Dark. |
| `HadithCollSingleEnglish` | English. |

### G. Chapters (6 frames)
Both frames carry the pill label (from `AzkarDownloads`) «shown when the source has chapters (Sunnah.com)» under the header, `dir="ltr"`, even in the Arabic frames.
- **Chapters list** (`HadithCollChapters*`): header like E (title `[اسم الكتاب]`, subtitle `[اسم المجموعة]`), grouped list card of seven chapter rows: title `[اسم الباب]` (17 / 600), muted count «٢٤ حديثًا», chevron. Rows link to the chapter's hadith list.
- **Chapter's hadith list** (`HadithCollChapterHadith*`): header title `[اسم الباب]`, subtitle `[اسم الكتاب]` · `[اسم المجموعة]` (13 muted) and the hadith cards of E (five cards). Back goes to `#HadithCollChapters`.

| id | Content |
| --- | --- |
| `HadithCollChapters` | Light, Arabic. |
| `HadithCollChaptersDark` | Dark. |
| `HadithCollChaptersEnglish` | English. |
| `HadithCollChapterHadith` | Light, Arabic. |
| `HadithCollChapterHadithDark` | Dark. |
| `HadithCollChapterHadithEnglish` | English. |

### H. Hadith reader (4 frames)
Source: `AzkarReader` shell (top bar and centred column) and its round previous / next buttons; glass toolbar layout from `#HadithDetail`.
- Top bar (copy `AzkarReader`): back button (to `#HadithCollBook`) and a **breadcrumb** (`HadithBreadcrumb`) as two lines: line 1 `[اسم المجموعة]` (15 / 600), line 2 `[اسم الكتاب]` (13 muted). Beside it the glass pill with three 44 pt buttons: bookmark («حفظ الحديث»), copy («نسخ»), share («مشاركة»), exactly the `aria-label` strings of `#HadithDetail`.
- Number chip centred above the text: «حديث رقم ١٢٣٤» (pill, medallion fill, 13 / 600).
- Hadith text: «[نص الحديث كما ورد في المصدر]» repeated to six or seven lines, Amiri `dhikr` (24 / 48), centred as in `AzkarReader`, no Quran passage, no instruction line.
- Source line (caption 12 muted): «المصدر: fawazahmed0/hadith-api» (proposed wording) and under it «[سطر النسبة من المصدر]». **No link** (the source has no URL; the plan shows a link only when `source_url` exists).
- Bottom: `HadithPager`: round previous and next buttons (copy the 44 pt round buttons of the `AzkarReader` counter row) with the centred label «١٢٣٤ من ٧٥٦٣» (mock). Next is on the end side in Arabic (RTL: previous on the right).
- **No grade section. No English text. No explanation section.**

| id | Content |
| --- | --- |
| `HadithCollReader` | Light, Arabic. |
| `HadithCollReaderDark` | Dark. |
| `HadithCollReaderEnglish` | English LTR labels: breadcrumb «[Collection name]» / «[Book name]», chip «Hadith 1234», aria-labels «Save hadith», «Copy», «Share»; Arabic text block `dir="rtl"`; source line «Source: fawazahmed0/hadith-api». |
| `HadithCollReaderGrade` | Light, Arabic. Pill label (from `AzkarDownloads`) «future state: after the developer turns grades on (not built now)» under the top bar, `dir="ltr"`. Same as `HadithCollReader` plus a section after the source line, in the section anatomy of `AzkarDetailsFull`: label «الدرجة» (13 / 600 muted), body «[الحكم] — [اسم المحدّث]» (17 / 26), caption «المصدر: [اسم المصدر]» (13 muted). The body sits in a dashed placeholder box (radius 16, padding 14 16, `1.5px dashed rgb(217, 208, 188)`, copied from the «الشرح» placeholder box of `#HadithDetail`, style only, no text). Layout only. |

### I. Search (3 frames)
Source: `AzkarSearchEmpty`, `AzkarSearch`, and the chip row of `Search`. Light, Arabic only (no dark or English variants in this step).
Common top: back button to `#HadithCollList`, search field with placeholder «ابحث في الحديث» and a cancel link «إلغاء». Below the field, a horizontal chip row (the scope chips of `Search`): «الكل» selected, then four chips «[اسم المجموعة]» (collection scope).

| id | Content |
| --- | --- |
| `HadithCollSearch` | Empty query: «عمليات البحث الأخيرة» header with «مسح السجل», three recent rows with the text «[كلمة البحث]», and the hint «البحث يتجاهل التشكيل والهمزات.» |
| `HadithCollSearchResults` | Query «[كلمة البحث]» in the field. Result count line «٣٢ نتيجة». Four result rows (card radius 20): line 1 `[اسم المجموعة]` · `[اسم الكتاب]` · «١٢٣٤» (13 muted), line 2 the preview «[نص قريب من النتيجة] [كلمة البحث] [نص قريب من النتيجة]» in `dhikrList`, 2-line clamp, with the match drawn as the outlined highlight of `AzkarSearch`. |
| `HadithCollSearchEmpty` | Query «[كلمة البحث]»; EmptyState (search glyph): «لا توجد نتائج»; hint «جرّب كلمة أخرى أو اختر «الكل».» |

### J. Download sheet (1 frame)
Source: `TafsirDownload` (mid detent, ADR 0020): a frame whose own background is the scrim `rgba(19, 35, 31, 0.4)` and a bottom sheet (`role="dialog"`, radius 28 28 0 0, grabber 36 × 5) inset from the top; copy that structure. No other screen is drawn behind it.
| id | Content |
| --- | --- |
| `HadithCollDownload` | Sheet «تنزيل المجموعة»: a compact cover 40 × 54, `[اسم المجموعة]`, size row «الحجم» · «٩٫٨ م.ب»; ToggleRow «على شبكة Wi-Fi فقط» on (copy a row with a `role="switch"` button, 52 × 32, from `Settings`); the downloading state: 4 px progress bar at 60%, «جارٍ التنزيل · ٦٠٪»; one button «إلغاء» (secondary). Do not draw «تنزيل». Caption: «تعمل المجموعة بعد التنزيل دون إنترنت.» |

### K. States (5 frames)
| id | Source | Content |
| --- | --- | --- |
| `HadithCollLoading` | `AzkarLoading` | Header «الحديث», six skeleton rows (cover rectangle 56 × 75 + two bars). |
| `HadithCollOffline` | `Offline`, `AzkarUnavailable` | Header; offline banner «أنت غير متصل.»; EmptyState «لا توجد مجموعات محمّلة» with hint «اتصل بالإنترنت لتنزيل مجموعة.» (offline, nothing downloaded) |
| `HadithCollOfflineDownloaded` | `Offline`, B | Offline banner «أنت غير متصل. المجموعات المحمّلة تعمل كالمعتاد.» over the list of B with the not-installed row dimmed and its «تنزيل» button disabled, showing the pill «غير متاح دون اتصال» (copy it from `AzkarReaderAudio`, where it exists). |
| `HadithCollDownloadFailed` | B, `AzkarDownloads` | List of B where row 4 shows «تعذّر التنزيل» in the failed-text colour `rgb(163, 57, 43)` used by `AzkarDownloads` (dark: copy from the dark Azkar frame or keep the same value if none) and a «إعادة المحاولة» button. |
| `HadithCollError` | `AzkarUnavailable` | EmptyState «تعذّر تحميل المجموعات», hint «تحقق من الاتصال ثم حاول مرة أخرى.», button «إعادة المحاولة». |

### L. Saved (3 frames)
Source: E for the card, `AzkarFavorites` for the screen and `AzkarFavoritesEmpty` for the empty state. Title «المحفوظات». Each saved row: line 1 breadcrumb `[اسم المجموعة]` · `[اسم الكتاب]` · «١٢٣٤» (13 muted), line 2 a 2-line clamp of «[نص الحديث كما ورد في المصدر]» in `dhikrList`, trailing bookmark glyph. A saved item is shown by **collection + number**, with the book as a fallback place.

| id | Content |
| --- | --- |
| `HadithCollSaved` | Light, Arabic. Five rows. |
| `HadithCollSavedUnverified` | Light, Arabic. `UnverifiedNotice` banner under the header (radius 16, medallion fill, 15 / 600 title «تغيّر مصدر الأحاديث», body «تُعرض بعض المحفوظات على مستوى الكتاب حتى نتحقق منها.»). Rows 1 and 2 as saved; rows 3 and 4 **unverified**: pill «غير مؤكد» (12 / 600, radius 12, medallion fill) after the breadcrumb, shown at book level (no number, no text preview; the row shows `[اسم الكتاب]` and «حديث محفوظ سابقًا»). |
| `HadithCollSavedEmpty` | EmptyState: bookmark glyph, «لا توجد أحاديث محفوظة بعد», hint «اضغط على أيقونة الحفظ في أي حديث لتجده هنا.», button «تصفّح المجموعات» (to `#HadithCollList`). Not in the plan's list; added so step 13 has a frame (Open questions). |

### M. Expanded window (2 frames, 1194 × 834) — **DO NOT DRAW until Open questions 5 and 6 are answered**
The two frames below are specified so the developer's answer can be applied quickly, but they are **not part of this step's deliverable** and are not in the id list, the gates or the review set. ADR 0051 removed the expanded sidebar as navigation; drawing it in new frames would describe UI step 13 will not build. Report them as pending.
Source: `AzkarExpanded` (`xw-device`; the sidebar region and its `.xw-item[aria-current=page]` selection are the default **if** the developer confirms the sidebar; if he asks for the tablet tab bar instead, copy that from the `MainLandscapeRail` frame; see Open questions 5).
| id | Content |
| --- | --- |
| `HadithCollExpanded` | Start-side pane (RTL: right of the content area), 340 wide: compact collection header (cover 40 × 54, `[اسم المجموعة]`) and the books list of D (eight rows, book 3 selected with the `glassSelected`-style fill used for selection in `AzkarExpanded`). Main area: the hadith list of E for that book in the centred column, card 2 selected. |
| `HadithCollExpandedReader` | Same start-side pane. Main area: the reader of H in the centred column with the hadith text, **and** a persistent side panel «المصدر والتفاصيل» (copy the side panel of `AzkarExpanded`): rows «المجموعة» · `[اسم المجموعة]`, «الكتاب» · `[اسم الكتاب]`, «رقم الحديث» · «١٢٣٤», «المصدر» · «المصدر: fawazahmed0/hadith-api» and `[سطر النسبة من المصدر]`. No grade row. |

### N. Entry points (4 frames, variants; existing frames stay as they are)
| id | Source | Change |
| --- | --- | --- |
| `HadithCollMenu` | `Menu` | Add one **nav** card «الحديث» (icon plate, Amiri title, one muted 13 subtitle «المجموعات والكتب»; same anatomy as the existing nav cards of `Menu`). It sits after the «الأذكار» card in the dealing order. The card links to `#HadithCollList`. The rest of the grid keeps its order and the staggered dealing; if the extra card changes a column height, keep the existing dealing rule (alternate columns). |
| `HadithCollMenuDark` | `MenuDark` | Same, dark. |
| `HadithCollMenuEnglish` | `MenuEnglish` | Same, English; card title «Hadith», subtitle «Collections and books». |
| `HadithCollSources` | `Sources` | Add one row at the end of the list card (before the footer caption, if any): title «fawazahmed0/hadith-api», subtitle «نص الأحاديث · Unlicense» (an Arabic description plus the licence, the pattern of the Tanzil row: «نص القرآن المضمَّن · CC BY 3.0»), `href="https://github.com/fawazahmed0/hadith-api"`. Whether ummahapi.com and hadithapi.com also get rows is an open question; **draw only this one row.** |

**Home tile and sidebar.** `#Main` already draws an «الحديث» tile and the sidebars draw an «الحديث» entry. Their pixels do not change, so no variant frame is drawn. Only their link target changes. Retarget in place (see "Existing frames edits").

## Existing frames edits (exact)
Make these edits and no others.

1. Captions of the three deferred frames. In `quran-app-screens.html`:
   - `<div class="gx-cap">Hadith</div>` inside `id="Hadith"` becomes `<div class="gx-cap">Hadith · deferred: HadeethEnc, ADR 0042</div>`
   - `<div class="gx-cap">Hadith detail</div>` inside `id="HadithDetail"` becomes `<div class="gx-cap">Hadith detail · deferred: HadeethEnc, ADR 0042</div>`
   - `<div class="gx-cap">Hadith detail · English</div>` inside `id="HadithDetailEnglish"` becomes `<div class="gx-cap">Hadith detail · English · deferred: HadeethEnc, ADR 0042</div>`.
   Leave the frame markup, including its text, untouched (it is the deferred HadeethEnc design; this step does not redraw it).
2. Retarget the الحديث entry links, **only** in these frame ids (all outside the Azkar, Duas and Menu V2 sections): `Main`, `MainMenuTab`, `HomeDark`, `HomeEnglish`, `HomeAndroid`, `LoadingHome`, `ExpandedHome`, `ExpandedHomeDark`, `HomeHijriDate`, `HomeHijriDateDark`. Run `grep -n 'href="#Hadith"' quran-app-screens.html`. In each of those ten frames, for every hit whose anchor's visible text is «الحديث» (the tile or the sidebar entry), change `href="#Hadith"` to `href="#HadithCollList"` (`ExpandedHome` and `ExpandedHomeDark` have two hits each). **Do not change** any other hit: the ones in `HadithDetail` and `HadithDetailEnglish` (their back links return to the deferred `#Hadith`), and the ones in `AzkarExpanded`, `DuasHome`, `DuasHomeDark` and `DuasHomeEnglish` (inside the Azkar and Duas sections, which this step does not touch; they stay pending, Open questions 16). Report every retargeted hit with its frame id, and every hit left unchanged with the reason.
3. Nothing else in existing sections changes. In particular do not touch the Azkar, Duas and Menu V2 sections (not even a link), the existing `Menu*` frames, `Sources`, or the file's header paragraph.

## Android
ADR 0033 gives Android a floating tab bar with the same geometry as iOS. The frames here are the platform-neutral phone frames. **No Android frames in this step.** The existing `HomeAndroid` stays as is. If a frame differs on Android, step 13 reports it; the developer decides then.

## Implementation notes (precise)
1. Work in a scratch copy first if you like, but the result must be in `quran-app-screens.html`. Build the section with a small Python script in the scratchpad (not in the repo) that reads the source frames' markup by id (see how `packages/design-tokens/scripts/frame-shot.py` finds a frame: `s.find('id="<id>"')` and the matching closing `</div>`), applies string replacements, and writes the new section. Do not leave the script in the repo.
2. Take exact rgb strings from the source frames, not from memory.
3. Every `data-sc-name` equals its frame id. Every link `href="#X"` in the new section points to an existing id.
4. Fix text wrapping by reading the PNG, not by guessing. Arabic must not be clipped at the top or bottom of a line.
5. Dark frames: copy from the dark Azkar frames. Do not invert colours by hand.

## Gates (all must pass; write PNGs to the scratchpad, never into the repo)
Set nothing for Chrome on the Mac: `frame-shot.py` finds `/Applications/Google Chrome.app` itself. Use `python3` (not `python`).

1. **No regression of existing frames.** Before editing, render the last existing frame:
   `python3 /Applications/MAMP/htdocs/quran-app/packages/design-tokens/scripts/frame-shot.py WidgetAddConfirmAlreadyDark <scratchpad>/before.png`
   After the edit, render it again to `after.png`. `frame-shot.py` loads Google Fonts over the network (4 s budget), so two renders of one input may differ. First render `before.png` twice (`before2.png`) and run `cmp before.png before2.png`. If they are identical, `cmp before.png after.png` must also be identical. If they differ, the gate is a side-by-side look at the two PNGs with the Read tool (same layout, same text, nothing shifted). Do the same for `Main` (its link change does not alter pixels) and `AzkarHome`.
2. **Render every new frame** (the 47 ids below; `HadithCollExpanded*` are not drawn), each as
   `python3 /Applications/MAMP/htdocs/quran-app/packages/design-tokens/scripts/frame-shot.py <id> <scratchpad>/<id>.png`
   and read each PNG with the Read tool. Check: no overflow or clipped Arabic marks; every target at least 44 × 44; contrast (text on cover, muted text on page) is readable; spacing matches `AzkarHome` and `AzkarCategory`; no unbracketed hadith-like Arabic; the dark frames use the dark tokens.
3. **Id uniqueness.** For each of the 47 ids: `grep -c 'id="<id>"' quran-app-screens.html` is exactly 1. Also check `data-sc-name="<id>"` appears exactly once. Then confirm that the total count of `class="gx-fig"` increased by 47.
4. **Text-node dump for the reviewer.** Produce a plain-text dump of every text node of the new section (strip tags) into `<scratchpad>/hadith-frames-text.txt` and scan it. Every Arabic string must be (a) bracketed placeholder text from this brief, (b) UI copy from this brief or written in its style, or (c) a mock number. Report the number of distinct unbracketed Arabic strings and list them (UI copy, not hadith text). If any line looks like hadith, narration, grade, ruling or Quran text, delete it and report it.
5. **`npm run check:html -w @quran/design-tokens`** (run from `/Applications/MAMP/htdocs/quran-app`, Node 26 through nvm). It compares `quran-app-design-system.html` with `packages/design-tokens/src`; this step changes neither, so it is a **no-regression gate**: it must report 0 mismatches. It does not check the frames.
6. `git status --short` shows only `quran-app-screens.html` (and the pre-existing modified files from other steps; do not touch those). `git diff --stat quran-app-design-system.html packages/` is empty.
7. Link check: every `href="#..."` added or retargeted resolves to an `id` present in the file.

The 47 new ids, in file order:
`HadithCollCovers`, `HadithCollCoversSepia`, `HadithCollCoversDark`, `HadithCollList`, `HadithCollListDark`, `HadithCollListEnglish`, `HadithCollUntitled`, `HadithCollUntitledDark`, `HadithCollUntitledEnglish`, `HadithCollUntitledBooks`, `HadithCollUntitledBooksDark`, `HadithCollUntitledBooksEnglish`, `HadithCollBooks`, `HadithCollBooksDark`, `HadithCollBooksEnglish`, `HadithCollBook`, `HadithCollBookDark`, `HadithCollBookEnglish`, `HadithCollSingle`, `HadithCollSingleDark`, `HadithCollSingleEnglish`, `HadithCollChapters`, `HadithCollChaptersDark`, `HadithCollChaptersEnglish`, `HadithCollChapterHadith`, `HadithCollChapterHadithDark`, `HadithCollChapterHadithEnglish`, `HadithCollReader`, `HadithCollReaderDark`, `HadithCollReaderEnglish`, `HadithCollReaderGrade`, `HadithCollSearch`, `HadithCollSearchResults`, `HadithCollSearchEmpty`, `HadithCollDownload`, `HadithCollLoading`, `HadithCollOffline`, `HadithCollOfflineDownloaded`, `HadithCollDownloadFailed`, `HadithCollError`, `HadithCollSaved`, `HadithCollSavedUnverified`, `HadithCollSavedEmpty`, `HadithCollMenu`, `HadithCollMenuDark`, `HadithCollMenuEnglish`, `HadithCollSources`.

## Review set for the developer (render these, show these)
Render all 47 into `<scratchpad>/hadith-frames/` and show them in this order, in three batches. Each batch is one message with the PNG paths.
1. **Decide first (colours and structure, 12 frames):** `HadithCollCovers`, `HadithCollCoversSepia`, `HadithCollCoversDark`, `HadithCollList`, `HadithCollListDark`, `HadithCollListEnglish`, `HadithCollUntitled`, `HadithCollBooks`, `HadithCollBook`, `HadithCollSingle`, `HadithCollReader`, `HadithCollReaderDark`.
2. **Remaining screens (19 frames):** `HadithCollReaderEnglish`, `HadithCollReaderGrade`, `HadithCollChapters`, `HadithCollChapterHadith`, `HadithCollSearch`, `HadithCollSearchResults`, `HadithCollSearchEmpty`, `HadithCollDownload`, `HadithCollLoading`, `HadithCollOffline`, `HadithCollOfflineDownloaded`, `HadithCollDownloadFailed`, `HadithCollError`, `HadithCollSaved`, `HadithCollSavedUnverified`, `HadithCollSavedEmpty`, `HadithCollMenu`, `HadithCollSources`, `HadithCollUntitledBooks`.
3. **Variants (16 frames, same design in the other theme or language):** `HadithCollBooksDark`, `HadithCollBooksEnglish`, `HadithCollBookDark`, `HadithCollBookEnglish`, `HadithCollSingleDark`, `HadithCollSingleEnglish`, `HadithCollChaptersDark`, `HadithCollChaptersEnglish`, `HadithCollChapterHadithDark`, `HadithCollChapterHadithEnglish`, `HadithCollUntitledDark`, `HadithCollUntitledEnglish`, `HadithCollUntitledBooksDark`, `HadithCollUntitledBooksEnglish`, `HadithCollMenuDark`, `HadithCollMenuEnglish`.

## Out of scope
- `quran-app-design-system.html` and `packages/design-tokens` (the ten cover tokens and the fallback: step 9).
- Any app, API or contract code; any i18n key.
- Redrawing `#Hadith`, `#HadithDetail`, `#HadithDetailEnglish` (deferred HadeethEnc).
- Android frames, iPad-only variants other than the two expanded frames, widgets, watch, notifications.
- Grades visible by default (only the labelled future frame), English hadith text, audio, share-sheet frames, the Sunnah.com switch UI beyond `HadithCollSavedUnverified`.
- Choosing wording the developer owns (the final source-line text, the Arabic names): the frames use bracketed placeholders and the plan's proposed wording only.

## Approval (fill in after the developer reviews; the step is not done until this block is complete)
- Date approved: ____
- Approved ids (list or "all 47"): ____
- Ids changed after review, and what changed: ____
- Approved cover palette (confirm the table above or write the changed values): ____
- Open questions answered (numbers): ____

## Open questions
Each needs the developer's answer, or his confirmation of the default used in this brief.

1. **Old slugs in docs.** Plan D6, the step-13 row and the `HadithCollSingle` row, and ADR 0042 §4a and §7, still say `nawawi`, `qudsi`, `dehlawi`; D13 (7 Nov 2026) froze `nawawi40`, `qudsi40`, `shahwaliullah40`. This brief uses D13's slugs. The older text needs a doc edit (not part of this step).
2. **ADR numbers are duplicated and mis-cited.** The plan cites "ADR 0045" for "no switch", but `0045-english-surah-names.md` is a different ADR; the no-switch decision is in `0042-features-enabled-by-default.md`. There are also two `0042` files (`0042-features-enabled-by-default.md`, `0042-hadith-collections-source.md`), two `0043`, two `0044`, two `0046`, two `0047` and two `0047`. This brief cites the Hadith ADR by file name.
3. **Placement of the new section.** The plan's frames text says "after the Azkar section"; its merge-risk table and this task say "at the end". The brief puts it at the end, immediately before `</body></html>`. The file also has an unbalanced `<section>` that this step must not repair.
4. **Branch.** `phase-7/README.md` and the plan say `ft/hadith`; `CLAUDE.md` and this task say `main`. The brief assumes `main`.
5. **Expanded frames and ADR 0051 (blocks `HadithCollExpanded` and `HadithCollExpandedReader`, not drawn).** The plan asks for the "expanded window with the sidebar". ADR 0051 (2 Nov 2026) says tablets use the tab bar and the sidebar is no longer navigation; it approves the sidebar only in the existing frames as a known difference. New frames that draw it would describe UI step 13 will not build, so they are not drawn until the developer chooses: the sidebar as in `AzkarExpanded`, or the tablet tab bar.
6. **Expanded layout is not defined by the plan.** Proposed (applies once Q5 is answered): start-side pane = the open collection's books list; main area = the book's hadith list (`HadithCollExpanded`) or the reader with a side panel (`HadithCollExpandedReader`). The side panel holds the source details (collection, book, number, source line), because there is no grade and no explanation to show. Confirm.
7. **Menu and Sources: variants or in-place edits?** The plan says "updated" (in place). The brief draws `HadithCollMenu*` and `HadithCollSources` as new variants, as Phase 6 did with `MainAzkar`, and leaves the existing `Menu`, `MenuDark`, `MenuEnglish`, `Sources` untouched. Three Menu styles exist (`Menu*`, proposed `MenuV2*`, proposed `MenuNewCards*`); the brief copies `Menu*` because ADR 0032 names those. Confirm both choices.
8. **Home tile and sidebar.** No variant frame is drawn: the tile and sidebar entries already exist and only their link target changes, so the brief retargets `#Hadith` links in place (rule in "Existing frames edits"). The plan's `#Main` and expanded-Home "updated" wording is read this way. Confirm.
9. **Credit rows and wording on `Sources`.** The plan says "a Hadith credit row". ADR 0042 §4a also uses ummahapi.com (ten collection names) and hadithapi.com (section titles, one-off). The brief draws only the fawazahmed0 row; the developer decides whether the other two get rows and with what wording. The source-line wording («المصدر: fawazahmed0/hadith-api» with the licence name) is the plan's proposed default (open question 4 there), shown as draft UI copy. The row's Arabic subtitle «نص الأحاديث · Unlicense» follows the Tanzil row's pattern and is also the developer's to word.
10. **Hadith text sizes.** Default: reuse the existing `dhikr` (24 / 48) and `dhikrList` (19 / 34) specimens for hadith text. Step 9 only plans cover tokens, so no new type token is added. If the developer wants named hadith tokens (for example `hadithText`), that is an addition to step 9, not to this step.
11. **Contrast of the ornament-only cover.** The 4.5 : 1 rule (plan step 9 test, RB11) is about the title. With no title there is no text; the ornament is decorative, so the rule does not apply. Confirm, or set a non-text contrast target for the ornament.
12. **Cover colours.** The ten grounds and the fallback in the "Cover palette" table are proposals for approval (plan open question 9). Light and sepia share a ground; dark is darkened by 30%. Confirm or change.
13. **`HadithCollSavedEmpty` and `HadithCollSearchResults/Empty`.** The plan lists `HadithCollSaved` and `HadithCollSearch` only. The brief adds `HadithCollSavedEmpty`, and splits the search row into three frames so each state has an id. Confirm the extra frames.
14. **Variants beyond the plan.** The plan says "plus dark and English" for List, Untitled, Books, Book, Single, Chapters and Reader; it says nothing for Search, Download, States, Saved and Expanded. The brief draws those light and Arabic only. Confirm.
15. **Deferred frames contain religious text.** `#Hadith`, `#HadithDetail`, `#HadithDetailEnglish` hold a real hadith and a grade string. This step only changes their captions; whether to replace their text with placeholders is for the developer.
16. **`#Hadith` links inside the Azkar and Duas sections.** `AzkarExpanded` (sidebar entry) and `DuasHome`, `DuasHomeDark`, `DuasHomeEnglish` still link «الحديث» to the deferred `#Hadith`. The plan's merge-risk table says not to touch the Azkar sections, so this step leaves them and reports them. Retarget them (href only) in a follow-up, or allow it now?

## Answers to the open questions (orchestrator, 7 Nov 2026)

These override anything above that conflicts with them.

- **Q1 slugs:** use D13's slugs (`nawawi40`, `qudsi40`, `shahwaliullah40`); ADR 0042 has a 7 Nov amendment.
- **Q2 ADR numbers:** cite "no switch" as `0042-features-enabled-by-default.md` in anything new; don't renumber existing ADRs.
- **Q3 placement:** at the end of the file, before `</body></html>`.
- **Q4 branch:** `main`.
- **Q5, Q6 expanded frames: draw both.** Tablets use the **vertical tab rail** (ADR 0051 amendment, 2 Nov 2026), not a sidebar: copy the rail from `MainLandscapeRail` (76 wide, on the start edge, 12 past the safe area, vertically centred). `HadithCollExpanded` = rail + start-side pane with the collection's books list + main area with the book's hadith list. `HadithCollExpandedReader` = rail + the reader in the centred column + the docked side panel «المصدر والتفاصيل». No sidebar anywhere in the new frames.
- **Q7 Menu and Sources:** new variants (`HadithCollMenu*`, `HadithCollSources`), not in-place edits. Base the Menu variants on **`MenuNewCards*`** (the style the app ships: `MenuDuasCard`, `MenuHijriCard`), not `Menu*`.
- **Q8:** yes, link retarget only for Home.
- **Q9:** only the fawazahmed0 row; the developer sets the final wording at review.
- **Q10, Q11, Q13, Q14:** accepted as proposed.
- **Q12 cover colours:** proposed in the frames; the developer approves at review.
- **Q15:** captions only.
- **Q16:** leave the Azkar and Duas `#Hadith` links untouched (pending).

The review set is therefore 49 frames (47 plus the two expanded frames).

## Approval

**Approved by the developer, 7 Nov 2026** ("ok for screens"), after these rounds of feedback:
- hadith text is the main focus;
- sunnah.com-style colouring (chain in the accent colour, once, at the start; single colour until the source marks the chain: `HadithCollReaderPlain`);
- covers drawn as bound books in four muted tones;
- hadith text never centred, always RTL start-aligned and justified;
- Amiri for hadith text, with tashkeel room;
- list rows as separate cards with gaps.

The frames now live in `screens/frames/hadith/HadithColl*.html` (ADR 0075). Known nit: the mark tips of a hidden fourth line can show under some list previews; fix it with the chapter frame changes.
- 7 Nov 2026 (orchestrator, on the developer's behalf): collections list header gains a Saved (bookmark) icon button to reach `HadithCollSaved` (step 13 answer 3).
- 7 Nov 2026 (orchestrator, on the developer's behalf): the reader shows one source line, the collection attribution with its licence, instead of the credit line drawn in `HadithCollReader`; filled rows still show their own credit plus the attribution.
