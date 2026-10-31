# Step 4 — Azkar design frames

ADR 0010 (frames before code), ADR 0012 (HIG), ADR 0013 (sheets), ADR 0031. The frames are **proposed until the developer approves them**. Step 6 builds to them, and the step-10 review compares against them.

## Rules
- **Existing language only.**
  - Colours from `packages/design-tokens/src/colors.ts` (light and dark values as rgb, exactly as the existing frames write them).
  - IBM Plex Sans Arabic for UI; Amiri for display and dhikr text; Amiri Quran only for Quran passages.
  - Radii, spacing, the 44 pt round icon button, hairline-bordered cards, the deep-green brand card with the gold `#C9A961` ornament, the segmented control: copy the markup patterns of `#Khatma`, `#Main`, `#Salah` and `#Settings`.
  - No new colours. No new components where an existing one fits.
- **No religious text in the frames.** Dhikr text is a bracketed placeholder in Arabic, the way existing frames write `[عدد الأحاديث]`:
  - «[نص الذكر كما ورد في المصدر]» (two or three lines, long enough to show wrapping)
  - Quran passages: «﴿[آية من المصحف بخط المصحف]﴾» in Amiri Quran
  - sourced notes: «[نص الشرح من المصدر]», «[اسم المصدر]»
  - Numbers, labels and UI copy are real.
- **Hidden-when-empty:** a sourced section with no source is not drawn. One frame (`AzkarDetailsFull`) shows every section populated, to fix their layout and order.
- **Repetition:** sourced count → counter. No count → «تم». Never «١ / ١».
- **Audio:** no audio control unless the recording is licensed. Audio frames are labelled "licensed recording (future)".
- **Reminder copy** must say the time is the user's choice: «وقت التذكير من اختيارك، وليس وقتًا محددًا للذكر».
- **No "relevant now by clock" claims.** Home's lead card is «تابع» (the last unfinished session), not «حان وقت أذكار الصباح».
- RTL (`dir="rtl"`) for Arabic frames; one English LTR frame. Phone frames are 390 × 844 in the standard `gx-fig` / `device` / `screen` / `sc-host` wrapper. The expanded frame uses the `xw-device` wrapper as in `#ExpandedHome`.

## New type tokens (add to the design system in this step)
Add two specimens to `quran-app-design-system.html` where `typeScale` specimens live, and the matching entries to `packages/design-tokens/src/typography.ts` `typeScale`, so `npm run check:html -w @quran/design-tokens` passes:
- `dhikr`: display (Amiri) 400, 24 / 48
- `dhikrList`: display 400, 19 / 34

Both are at least `amiriNaturalLeading`.

## Frames (ids are the review ids; captions in the `gx-cap`)
New section «الأذكار — Azkar (proposed 2026-10-31)», placed after the الصلاة والقبلة section.

| id | Content |
| --- | --- |
| `AzkarHome` | Back button and «الأذكار» title (Amiri 26, like `#Khatma`); trailing round buttons: search, favourites (bookmark), reminders (bell). Brand card «تابع» showing «أذكار الصباح · ١٢ من ٢٤» with a progress bar. Section «أذكار اليوم»: five session rows (الصباح، المساء، بعد الصلاة، النوم، الاستيقاظ), each a ListRow with a small progress ring and «٥ / ٢٤» (one complete, with a check). Section «المواضيع»: a two-column grid of browse-category tiles (show 6 of 19) like Hadith's topic grid, each with a count «١٢ ذكرًا». |
| `AzkarHomeDark` | Same, dark theme. |
| `AzkarHomeEnglish` | Same, English, LTR. |
| `AzkarCategory` | Back button; title «أذكار الصباح»; subtitle «حصن المسلم · ٢٤ ذكرًا»; progress bar with «١٢ / ٢٤»; bell button. List of item cards: a NumberMedallion with the book number, a 2-line preview in `dhikrList`, a trailing count chip «×٣» when sourced (none otherwise); completed items show a check and muted text. Primary button «ابدأ» / «تابع» pinned at the bottom. |
| `AzkarReader` | Top: close button, «أذكار الصباح», «٥ من ٢٤» and a thin progress bar. Centre column: instruction line (subhead, muted) «[تعليمات من المصدر]»; dhikr text in `dhikr`, centred; a Quran passage in Amiri Quran with ﴿ ﴾; a source line «حصن المسلم · ٧٥» with an info button «المصدر والتفاصيل». Bottom: the counter, a 120 pt circle with a brand progress ring and «٢ / ٣» (Amiri bold) plus caption «اضغط للعدّ», flanked by previous and next round buttons. Above it, a quiet action row: favourite, share, text size (Aa). **No audio buttons.** |
| `AzkarReaderDone` | Same, for an item without a sourced count: a full-width «تم» button in place of the counter; no count anywhere. |
| `AzkarReaderComplete` | Session finished: medallion with a check, «أتممت أذكار الصباح», «٢٤ من ٢٤», buttons «العودة إلى الأذكار» and «البدء من جديد». No religious phrase added. |
| `AzkarDetails` | Sheet over the reader (mid detent, ADR 0020), «المصدر والتفاصيل». Only the sections OpenDua supports today: المناسبة (from the occasion code, e.g. «عند دخول المسجد») and المصدر («حصن المسلم · رقم ٢٠» plus the attribution line in caption). |
| `AzkarDetailsFull` | The same sheet at the full detent with every section, in order: المناسبة، التعليمات، السياق، المعنى، الفضل، المرجع، الدرجة. Each has its body placeholder and a caption «المصدر: [اسم المصدر] · [المرجع]». الدرجة shows «[الحكم] — [اسم المحدّث]». |
| `AzkarSearch` | Search field with «ابحث في الأذكار»; results grouped «الأبواب» and «الأذكار», with the match highlighted in the preview; empty-query state with recent searches. |
| `AzkarFavorites` | «المفضلة» list in the category-card style. |
| `AzkarFavoritesEmpty` | EmptyState: bookmark glyph, «لا توجد أذكار مفضلة بعد», hint. |
| `AzkarReminders` | Sheet «تذكير الأذكار». One SettingsGroup per session category with a ToggleRow. Expanded row: segmented «وقت محدد · بعد صلاة»; for «وقت محدد» a time row «٦:٣٠ ص»; for «بعد صلاة» a prayer picker (الفجر…العشاء) and an offset stepper «بعد ١٠ دقائق». Footnote: the reminder-time sentence from the rules. |
| `AzkarRemindersDenied` | The same sheet with the notification-permission-denied banner, matching Settings' daily-reminder copy pattern. |
| `AzkarDownloads` | «الصوتيات المحفوظة». Storage summary «١٢ م.ب»; rows labelled "licensed recording (future)": one done, one downloading with progress and cancel, one failed with «إعادة المحاولة»; «حذف الكل». |
| `AzkarDownloadsEmpty` | EmptyState «لا تتوفر تسجيلات صوتية بعد» with a caption that recordings appear once licensed. No buttons. |
| `AzkarReaderAudio` | Licensed-recording variant (future) of the reader: a play button in the action row; a download button only when downloading is allowed; a second inline state showing the «غير متاح دون اتصال» pill when offline and not downloaded. |
| `AzkarLoading` | Skeletons for the home (like `#LoadingHome`). |
| `AzkarUnavailable` | Content not installed: EmptyState «الأذكار غير متاحة بعد» with «يتوفر المحتوى عند اكتمال إذن النشر» (shown only if the route is opened directly; entry points are hidden). |
| `AzkarExpanded` | 1194 × 834: sidebar (unchanged), reader in the centred column, `AzkarDetails` content as the persistent side panel. |
| `MainAzkar` | Variant of `#Main`'s tile row with an «الأذكار» tile (ADR 0017: tile once the feature ships). Rest of Home unchanged. |
| `SalahAzkar` | Variant of `#Salah` with a «أذكار بعد الصلاة» row under the Qibla row, styled like `QiblaRow`. |

## Check
Render every frame with `python packages/design-tokens/scripts/frame-shot.py <id> <out.png>` (set `CHROME` to `C:/Program Files/Google/Chrome/Application/chrome.exe`; write PNGs to the scratchpad, never into the repo). Look at each PNG:
- no overflow or clipped Arabic marks
- 44 pt targets
- contrast
- matches the existing frames' spacing

`npm run check:html -w @quran/design-tokens` must report 0 mismatches.
