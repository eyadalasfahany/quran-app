# 0048 — The reader offers a choice of Uthmani Quran fonts; Mushaf mode renders Tanzil Hafs pages

Date: 2026-11-02 · Status: **accepted** (developer, 2 Nov 2026; only the copy wording below stays to confirm; the step 1 iPhone 17 and Mushaf-page checks still gate shipping the second font) · Supersedes the QCF-for-Mushaf-mode part of ADR 0011 and of spec §12 ("Mushaf rendering", Item sizing for Mushaf pages), spec §4 ("Mushaf page sizing"), the §14 604-page row and the §16 QCF risk rows. Amends ADR 0011 §4 (fonts), ADR 0013 §3 (the script picker waits for its feature) and the content-plan fonts rows. Plan: `docs/plans/quran-fonts.md`.

## Context

The developer wants more than one Quran font. Today every Quran string goes through `QuranText` and `quranText()` in `apps/mobile/src/shared/ui/`, which hard-code `quranFontFamily = 'AmiriQuran'` (`apps/mobile/src/core/theme/fonts.ts`; ADR 0011 §4). The «خط المصحف» radio group is drawn in the `ReaderSettings` frame of `quran-app-screens.html` with four rows: «الرسم العثماني · حفص» (subtitle «الخط الافتراضي · مجمع الملك فهد», i.e. KFGQPC), «مصحف المدينة · مطابق للصفحات», «الخط الهندي · IndoPak» («يتطلب التنزيل») and «العثماني الملوّن · التجويد». ADR 0013 §3 left it unbuilt until its feature.

Facts that shape the decision:

- **Mushaf mode is not QCF in code.** `ReaderScreen.tsx:366` renders `HafsMushafList` (Tanzil text through `QuranText`, so Amiri Quran). The QCF `MushafList` is not wired into the screen. Spec §12 and ADR 0011 describe QCF. The developer has settled it (Decision 1).
- **KFGQPC Hafs Uthmanic Script does not work with Tanzil text (plan step 1, 2 Nov 2026).** Input: the pinned Tanzil Uthmani file in `packages/quran-text-check/data/`, 6,236 verses, 70 distinct codepoints. KFGQPC 2.2 (a test copy from [QUL's mirror](https://qul.tarteel.ai/resources/font/245)) has every codepoint but expects the King Fahd Complex's own text encoding:
  - U+06DF, U+06E3 and U+06EB are spacing glyphs (advance 1442), not marks, so they draw as large filled circles between letters.
  - Tatweel plus U+0670 (U+0640 U+0670) shapes as a wide kashida with the superscript alef displaced.
  - **4,159 of 6,236 verses (67%)** are affected (U+06DF in 2,240; U+0640 U+0670 in 3,484; U+06E3 and U+06EB in one each, 52:37 and 12:11). Seen by eye in 1:1, 2:2, 11:41, 12:11, 41:44, 52:37.
  - It also lacks U+FD3E/U+FD3F, the ornate brackets `AyahEndMark` draws.
  - Amiri Quran 1.003 shapes all 6,236 verses with 0 `.notdef` and 0 dotted circles.
- **KFGQPC: origin and licence (for the record).** It is the King Fahd Glorious Quran Printing Complex's font ([Font Introduction](https://fonts.qurancomplex.gov.sa/wp02/en/?p=19)), not a Quran Foundation font, so it is not "QF data" under non-negotiable #3. Public sources about its terms conflict ([ScanCode](https://scancode-licensedb.aboutcode.org/kfgqpc-uthmanic-script-hafs.html) restrictive; a second-hand [Wikimedia T301871](https://phabricator.wikimedia.org/T301871) report permissive). The file itself embeds its EULA (name ID 13): use, copy and distribution free of cost; selling, modifying or reproducing the font software forbidden; `fsType` 0. The licence is no longer needed, because the font is rejected.
- **Scheherazade New 4.500** (SIL OFL 1.1, released 2026-04-15, `github.com/silnrsi/font-scheherazade`; the release zip's SHA-512 matched the release's `SHA512SUMS.txt`) passes the checks run so far: all 70 codepoints present including U+FD3E/U+FD3F; 0 `.notdef`, 0 dotted circles; U+06DF/06E3/06EA/06EB/06EC/06E8 shape as zero-advance positioned marks; U+0640 U+0670 shapes correctly. Seen by eye beside Amiri in 1:1, 2:2, 7:206, 11:41, 12:11, 21:88, 41:44, 52:37. HarfBuzz shaping matches Android only; iOS uses CoreText, so the iPhone 17 simulator run is the iOS gate. Its line metrics differ from Amiri's. Like Amiri, it is a naskh face.
- IndoPak and Tajweed have no text (ADR 0010 "Not in v1"; spec §5 `text_indopak` empty) and no tajweed source with a clear licence.

## Decision

Decided by the developer (2 Nov 2026):

1. **Mushaf mode renders the Tanzil Hafs pages** (`HafsMushafList`, as the code does now) **in the user's chosen font. It does not use QCF.** This supersedes the QCF-for-Mushaf-mode parts of ADR 0011 and spec §12/§4/§14/§16 listed above; the spec is edited in plan step 2. The Mushaf page is a flowed page of Tanzil text, so its line breaks depend on the font, and the spec's "15 lines per page" statement is revised to match what the renderer guarantees. The unused QCF path (`MushafList`, `MushafListPage`, `useMushafPageFont`, the `qcfV2` cache) is left in place; deleting it is decided after this feature ships.
2. **Two Uthmani fonts: Amiri Quran (default, store key `amiriQuran`) and Scheherazade New 4.500 (store key `scheherazadeNew`, Regular weight only unless a need appears).** The chosen font applies everywhere Quran text shows: Mushaf, Reading, Focus, Azkar Quran segments, the onboarding preview, `AyahEndMark`, tafsir panel verse text, Now Playing and search highlights.
3. **KFGQPC Hafs is rejected** for the evidence above. **Option C is rejected for now:** using KFGQPC would need the Complex's own Hafs text as a second Quran text source, a separate content decision. Text is never altered to suit a font (non-negotiable #1).
4. **The picker lists fonts only.** No mode switching; Mushaf stays a display mode in `ModePicker`, unchanged.
5. **Approved differences from the `ReaderSettings` frame:**
   - The frame's second option, KFGQPC («مجمع الملك فهد»), is Scheherazade New.
   - Neither row says "default" (the frame tagged KFGQPC «الخط الافتراضي»); Amiri stays the default.
   - The «مصحف المدينة · مطابق للصفحات» row is dropped.
   - The IndoPak and Tajweed rows are hidden until their content exists («يتطلب التنزيل» would promise a download that does not exist, and ADR 0010 bars that text in v1).
6. **Picker:** a `radiogroup` of `OnboardingRadioCard`s inline in the reader settings sheet, the pattern of `OnboardingScriptScreen`. No new picker component. `OnboardingRadioCard` gains a `subtitle` prop (title over a muted second line, as the frame draws) and a small `density` prop, because the frames' cards differ (language cards padding `0 16`, picker cards `8 14`). The frames' selected ring (1 px border plus 1 px inset ring) is applied in the card for every user. `detail` keeps its meaning.
7. **Persistence:** a new `quranFont` field in the existing `reader.settings` MMKV JSON, default `amiriQuran`; a missing or unknown value (including a stray `kfgqpc`) reads the default. Applied instantly. Local only in v1 (ADR 0027); it maps to `user_settings.settings.script` (spec §5) when sync arrives.
8. **Size tokens are reused** (`quranMushaf`, `quranReading`, `quranFocus`, `quranFocusAside`) for both fonts. Per-font adjustments only if the step 1 checks show a real problem.
9. **Design token `fontFamilies.quran`** is renamed to match the real default (Amiri Quran).
10. **Layout caches** (Reading row heights, Mushaf page layout, word-follow measurements) include the font in their key, because Scheherazade New's line metrics differ from Amiri's.
11. **Mushaf line alignment is per font** (decided 2 Nov 2026 after step 1 (d)). On iOS, `textAlign: 'justify'` widens word spaces for Amiri Quran, but justifies Scheherazade New with kashida inside words, including inside the Name of Allah («ٱلـلَّه»). So Mushaf lines stay justified for Amiri and use `start` alignment for Scheherazade New. The lines are ragged on the left, with no stretching. The registry entry carries the alignment (`mushafAlign: 'justify' | 'start'`), and `HafsMushafPage` reads it. Reading and Focus are unaffected.
12. **Gate:** plan step 1 (c) iPhone 17 simulator and (d) the 15-line Mushaf pages in both fonts are a go/no-go before any picker code. No licence letter blocks anything: both fonts are OFL.

## To confirm (the developer): copy

New copy, not in the frame; confirm or reword. Neither row says default.

| Font | Name ar / en | Subtitle ar / en (proposed) |
| --- | --- | --- |
| Amiri Quran | «أميري» / "Amiri" | «الرسم العثماني · خط أميري القرآني» / "Uthmani script, Amiri Quran font" |
| Scheherazade New | «شهرزاد» / "Scheherazade" | «الرسم العثماني · خط شهرزاد الجديد» / "Uthmani script, Scheherazade New font" |

## Consequences

- Scheherazade New is a new bundled asset and a content-plan version-table row (4.500, OFL 1.1, 2026-04-15, inside the 12-month rule). It ships in a store build. The `expo-font` plugin entry in `app.config.ts` has no `fonts` list and fonts load from `require`, so a JS-only update could technically carry the file; this ADR keeps the store build the developer asked for.
- **Visible difference:** Scheherazade New has U+FD3E/U+FD3F but draws the ayah-end brackets as a different rosette design than Amiri's; `AyahEndMark` looks different between the fonts.
- The content-plan licence row 105 is corrected (KFGQPC is the Complex's font, not QF data, and is unused), `expo-font` and "Fonts and display types" rows drop KFGQPC, and spec §4, §5, §12, §14, §16 are edited in the same change as acceptance. ADR 0011 gets a "partly superseded by 0048" note.
- The Mushaf 604-page pass runs on the Hafs renderer in both fonts.
- If step 1 (c) or (d) fails, the app keeps Amiri Quran alone and no picker, and nothing else changes.
