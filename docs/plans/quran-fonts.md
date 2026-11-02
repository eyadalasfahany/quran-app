# Quran font picker (plan)

Status: planned, not started · Planned on `main`, nothing committed · ADR: `docs/adr/0048-quran-font-picker.md` (proposed)

## Rests on

- Root `CLAUDE.md` non-negotiables #1 (text never altered), #3 (no QF data in the binary), #5 (window class), #7 (i18n).
- Spec §4 ("Mushaf page sizing", reading column), §5 (`user_settings.settings.script`), §12 ("Item sizing", "Mushaf rendering"), §14 (Maestro 604-page row), §16 (QCF risk rows, ~886) and content-plan open question on font approval (~514).
- Content plan: Amiri row (~37), mushaf fonts (~38), `expo-font` (~54), licence table (~105), "Fonts and display types" (~399-405), risk row (~506).
- ADRs 0010 (no IndoPak/Tajweed text in v1), 0011 (fonts, partly superseded by 0048), 0013 §3, 0014, 0027 (local-only v1), 0039 (word pill).
- Frames in `quran-app-screens.html`: `ReaderSettings` radiogroup «خط المصحف» (~line 561), Settings row (~2094), onboarding language cards (~4550) and the onboarding download-row cards (~4594).
- `docs/plans/phase-2.md` line 27 and `phase-2/step-11-design-conformance.md` (~70).

## Decided by the developer (2 Nov 2026), recorded in ADR 0048

1. **Mushaf mode renders the Tanzil Hafs pages** (`HafsMushafList`, as now) in the chosen font. Not QCF. Supersedes the QCF-for-Mushaf-mode parts of ADR 0011 and spec §12 / §4 / §14 / §16.
2. **Two fonts:** Amiri Quran (default, unchanged) and **Scheherazade New 4.500** (SIL OFL 1.1, released 2026-04-15), applied everywhere Quran text shows: Mushaf, Reading, Focus, Azkar Quran segments, onboarding preview, `AyahEndMark`, tafsir panel verse text, Now Playing, search highlights. Store keys `amiriQuran` (default) and `scheherazadeNew`.
3. **KFGQPC Hafs is rejected** (step 1 evidence below). Option C, the Complex's own Hafs text as a second Quran text source, is rejected for now.
4. **The picker lists fonts only.** `ModePicker` is unchanged and nothing switches mode. The frame's «مصحف المدينة» row is dropped, IndoPak and Tajweed are hidden until their content exists, and the frame's second option (KFGQPC) is Scheherazade New. Neither row says "default". These are approved frame differences.
5. Reuse the current Quran size tokens. Rename `fontFamilies.quran` to match the real default. The font ships in a store build.
6. `OnboardingRadioCard`: apply the frame's selected ring everywhere ("do what's best", decided). The QCF cleanup waits until after this feature ships.
7. No licence letter blocks anything: both fonts are OFL.

## Current state (code read)

- One constant, `quranFontFamily = 'AmiriQuran'` (`apps/mobile/src/core/theme/fonts.ts`), used by `quranText()` (`shared/ui/textStyles.ts:51`) and directly by `AyahEndMark.tsx:66`. Fonts load from `bundledFonts` via `require`.
- `quranText()` is a pure function in `shared/ui`. Type tokens (`packages/design-tokens/src/typography.ts:42-45`) are per variant, not per font.
- Settings: MMKV JSON `reader.settings` (`features/reader/settings-model.ts`, `settings.ts`: `mode`, `fontScale`, `tafsirId`).
- Reading row heights cache on `heightCacheSignature(width, fontScale, mode)` (`features/reader/reading-heights.ts:11`, used `ReadingList.tsx:149`).
- Mushaf mode: `ReaderScreen.tsx:366` renders `HafsMushafList` to `HafsPage`/`HafsMushafPage` with paragraph layout from `mushaf-paragraph.ts`. The QCF files are unused by the screen.
- Settings row «خط المصحف» exists (`ReadingSection.tsx`) with a static value `settings.reading.quranFontValue` = «العثماني · حفص», which names a font the app does not render today.

## Card comparison (decides how `OnboardingRadioCard` changes)

Measured from `quran-app-screens.html`:

| Frame | min-height | padding | layout | selected state |
| --- | --- | --- | --- | --- |
| Onboarding language (~4550) | 60 | 0 / 16 (= `space[4]`) | one line: title 17/600 and a trailing 12 muted caption | 1 px border plus 1 px inset ring |
| `ReaderSettings` «خط المصحف» (~561) | 60 | 8 / 14 | column: title 17/600/24 over 12/16 muted | same ring |
| Onboarding download-row cards (~4594) | 64 | 8 / 14 | column plus a trailing 12/600 tag | same ring |

Common to all: radius 20 (= `radius.lg`), gap 12, 20 px radio. The cards differ (padding `0 16` vs `8 14`, and the two-line layout), so one set of values would break the other frame. Decision: add `subtitle` (stacked second line) and one small prop `density?: 'regular' | 'compact'` (`regular` = today's values, `compact` = padding `8 14`). The picker passes `compact`; the language screen is unchanged. The code today draws a selected 1 px border with no inset ring, while every frame draws the ring (effective 2 px). That is common to all frames, so it is fixed in the card for all users (decided): React Native has no inset shadow, so draw it as a 2 px selected border with 1 px less padding, verified against the frames, and compare the onboarding screens afterwards.

## Conflicts and risks

- **C1 (closed):** Mushaf mode code is Hafs pages, the spec says QCF. Resolved by ADR 0048 Decision 1.
- **C2** Content-plan row 105 files KFGQPC under "QF font files … bundled" (wrong: it is the Complex's font, and is now unused). Corrected in step 2 anyway.
- **C3** Frame card vs component: settled above.
- **C4** Approved frame differences: second option is Scheherazade New (the frame drew KFGQPC), no default tag, «مصحف المدينة» row dropped, IndoPak and Tajweed hidden.
- **C5** Settings value «العثماني · حفص» is static and wrong for Amiri; becomes dynamic (step 7).
- **C6** The design token `fontFamilies.quran` names KFGQPC while the app uses Amiri; renamed (step 5).
- **C7** Spec §4 says page-exact mode keeps 15 lines per page. A flowed Hafs page does not guarantee that in a different font; step 1(d) measures it and step 2 rewrites the sentence.
- **R1 Line metrics.** Scheherazade New's ascent, descent and advance widths differ from Amiri's. The Reading row-height cache (`heightCacheSignature`, `estimateReadingRowHeight`) and the Mushaf page fit (overflow, line count, re-wrap) are explicit risks. Both are tested in step 5 and measured in step 1(c) and (d).
- **R2 `AyahEndMark`.** Scheherazade New has U+FD3E/U+FD3F but draws them as a different rosette design. This is a visible difference between the fonts, accepted unless the developer objects; the mark's size and baseline are re-checked in step 9.
- **R3 CoreText.** HarfBuzz shaping matched Android only. The iPhone 17 simulator run (step 1(c)) is the iOS gate.

## Steps (each reviewed on its own; implementation by Haiku subagents, briefs by the orchestrator)

### Step 1 — Render check on Tanzil text, GO / NO-GO (no picker code, no repo font file)
Test copies of the fonts stay in a scratchpad directory; never committed, never in the build.
- a. Scratch script (`python3 -I`, fontTools; fonts and text in their own directories, the script elsewhere): collect the distinct codepoints of the 6,236 Tanzil lines; compare against each font's cmap. Output: codepoints missing from each font and the verse keys that use them. Reports carry codepoints and verse keys only, never ayah text (agent-rules #6, #12). **Done, see result.**
- b. Shape (HarfBuzz) a list of tricky verse keys in each font: each rare codepoint from (a), small high marks, dagger alif, madd and waqf marks, 95:1 and 97:1 (ADR 0010), the Basmala line and the `AyahEndMark` glyph. **Done, see result.**
- c. **To run:** iPhone 17 simulator (dev build with a throwaway local font registration, not committed), light and dark, font scale 80 and 160: Reading and Focus screenshots of the tricky verses in Amiri Quran and Scheherazade New. This is the iOS/CoreText gate.
- d. **To run: Mushaf-mode pages, both fonts:** the 15-line Hafs pages (`HafsMushafList`) at a phone width (390) and the tablet page cap (600, spec §4): overflow, clipping, re-wrap on font scale and rotation, line count per page, justification, surah header and Basmala slots. Sample: pages with the longest and shortest paragraphs plus the first pages of a few surahs; then a full 604-page screenshot sweep if (a) to (c) pass.
- Output: a note appended here with go / no-go / go-with-conditions, listing codepoints, verse keys and page numbers only. No-go on (c) or (d) means ship one font with no picker.
- Tests: none in the repo. Gate: the developer reads the note.

#### Step 1 result (2 Nov 2026): KFGQPC no-go; Scheherazade New candidate passes (a) and (b)

Input: `packages/quran-text-check/data/tanzil-quran-uthmani-1.1.txt`, 6,236 verses, 70 distinct codepoints. Scratch scripts and fonts stayed in the session scratchpad; nothing in the repo.

- **Amiri Quran 1.003 (current):** (a) 0 codepoints missing. (b) 0 `.notdef`, 0 dotted circles across all 6,236 verses; every mark shapes as a zero-advance mark.
- **KFGQPC HAFS Uthmanic Script 2.2** (test copy from QUL's mirror, SHA-256 `aa68bffc…c723f145`): **no-go.**
  - (a) 0 codepoints missing, but it lacks U+FD3E/U+FD3F, the ornate brackets `AyahEndMark` draws.
  - (b) It shapes Tanzil's encoding wrongly. U+06DF, U+06E3 and U+06EB are spacing glyphs (advance 1442), not marks, so they draw as large filled circles between letters. U+0640 U+0670 (tatweel plus superscript alef) gives a wide kashida with the alef displaced, including 1:1.
  - Affected verses: U+06DF 2,240; U+0640 U+0670 3,484; U+06E3/06EB 1 each (52:37, 12:11). **4,159 of 6,236 verses (67%)** render wrong. Seen by eye in 1:1, 2:2, 11:41, 12:11, 41:44, 52:37.
  - Cause: the font expects the Complex's own text encoding. Tanzil text can't be changed to suit it (non-negotiable #1). Using KFGQPC would need the Complex's Hafs text as a second Quran text source, a separate content decision.
  - Licence finding, for the record: the file embeds its EULA (name ID 13). It grants use, copy and distribution free of cost, and forbids selling, modifying or reproducing the font software. `fsType` 0.
- **Scheherazade New 4.500** (SIL OFL 1.1, released 2026-04-15, GitHub `silnrsi/font-scheherazade`, zip SHA-512 matched the release's `SHA512SUMS.txt`): **passes (a) and (b).**
  - (a) 0 codepoints missing, and it has U+FD3E/U+FD3F.
  - (b) 0 `.notdef`, 0 dotted circles. U+06DF/06E3/06EA/06EB/06EC/06E8 shape as zero-advance positioned marks, and U+0640 U+0670 shapes correctly.
  - Seen by eye beside Amiri in 1:1, 2:2, 7:206 (sajdah sign), 11:41, 12:11, 21:88, 41:44 and 52:37, plus the `AyahEndMark` string. Its ayah-end brackets and sajdah sign are a different design.
  - **Caveat:** HarfBuzz shaping matches Android. iOS shapes with CoreText, so (c) on the iPhone 17 simulator is the iOS gate. Line metrics differ from Amiri's, which (d) and the row-height cache must cover. Like Amiri, it is a naskh face, so the two look close.
- Tricky keys used: 52:37 21:88 11:41 12:11 41:44 2:245 2:2 2:26 7:206 2:258 2:41 2:61 2:25 2:4 1:1 2:1 2:255 9:1 19:1 42:2 95:1 97:1 112:1.
- The swap from KFGQPC to Scheherazade New is decided by the developer (option B).
- **(c) iPhone 17 simulator, partial (2 Nov 2026):**
  - Setup: dev build, throwaway local registration of Scheherazade New 4.500 as `quranFontFamily`, reverted afterwards.
  - Reading mode, light theme, font scale 100%: 1:1, 11:41, 12:11, 41:44 and 52:37, beside the same verses in Amiri.
  - Marks attach correctly under CoreText (U+06DF, U+06E3, U+06EB, the stop marks, the rub' sign). `AyahEndMark` digits read in the right order, with the rosette brackets.
  - Not yet covered: Focus mode, dark theme, font scales 80% and 160%.
- **(d) Mushaf mode, partial:** pages 1, 2, 48 (2:282) and 604 (112:1) at 390 wide, in both fonts.
  - Headers, Basmala lines and page boundaries hold, and Al-Fatiha is 7 lines in both fonts.
  - **Finding:** `HafsMushafPage` uses `textAlign: 'justify'` (`QuranText` `align="justify"`). On iOS this justifies Amiri by widening word spaces, but Scheherazade New by kashida inside words, including inside the Name of Allah («ٱلـلَّه» in 1:1 and 112:1). The stored text is unchanged; only the layout stretches. Letters stay joined.
  - **Decided (developer, 2 Nov 2026), ADR 0048 §11:** Scheherazade New's Mushaf lines use `start` alignment and Amiri stays justified. Built in step 5.
  - Not yet covered: the 600 tablet width, rotation, the full 604-page sweep, and Android (`justificationMode` stretches word spaces only).

### Step 2 — ADR acceptance and spec / content-plan edits
**Done (2 Nov 2026):** ADR 0048 accepted; spec §4, §5, §12, §14, §16 and the content-plan rows edited; ADR 0011 and 0013 status lines and `phase-2.md` line 27 annotated.
- ADR 0048 accepted (or revised after step 1 (c) and (d)). Add "partly superseded by 0048" to ADR 0011 and "amended by 0048" to ADR 0013 §3.
- Spec: §4 "Mushaf page sizing" (line ~254) and the 15-lines sentence (C7); §12 "Mushaf rendering" and Item sizing (~260-261, ~655-656: Mushaf mode is Tanzil Hafs pages in the chosen font, Reading row-height key adds the font); §14 604-page row (pages rendered in both fonts); §16 QCF risk rows (~886; the "fall back to KFGQPC Hafs" mitigation is replaced); §5 `script` values (`amiriQuran`, `scheherazadeNew`).
- Content plan:
  - **Version table:** add a row "Quran font (second choice) | Scheherazade New (bundled asset, SIL OFL 1.1) | 4.500 | released 2026-04-15, inside the 12-month rule; Regular weight only; source `github.com/silnrsi/font-scheherazade`, zip SHA-512 checked against the release's `SHA512SUMS.txt`".
  - Licence table row 105: KFGQPC is the King Fahd Complex's font, not QF data, and the app no longer uses it (rejected, ADR 0048); QCF and IndoPak stay as written.
  - Amiri row (~37), mushaf fonts row (~38: QCF unused by the app, kept), `expo-font` row (~54, drop "KFGQPC"), "Fonts and display types" (~399-405: scripts are now Amiri Quran and Scheherazade New; QCF/IndoPak/Tajweed not offered), risk row ~506, open question ~514; `phase-2.md` line 27 note.
- Tests: none (docs). `check:html` unaffected.

### Step 3 — `OnboardingRadioCard`: `subtitle`, `density`, ring
- Add optional `subtitle` (column under the title, 12/16 muted) and `density` as in the comparison table. `detail` and `trailing` unchanged. Accessibility label defaults to title plus subtitle. Selected ring per the frames, for all users.
- Tests (`OnboardingRadioCard.test.tsx`, updated): render with and without subtitle; each density; selected and unselected (ring); press callback; RTL (ar and en); role `radio`, `checked` state and label; no raw hex. `OnboardingLanguageScreen` and `OnboardingScriptScreen` tests still pass. Visual: onboarding language and script screens against their frames.

### Step 4 — Settings model and store
- Add `quranFont: 'amiriQuran' | 'scheherazadeNew'` to `ReaderSettings`, `defaultReaderSettings` (`amiriQuran`), `migrateReaderSettings` (missing or unknown value reads the default; no version bump), `writeReaderSettings`, and `setQuranFont` in `settings.ts`. Same `reader.settings` key.
- Tests (`settings.test.ts`, model tests): default; an old blob without the field, and a pre-ADR-0014 blob with `translationIds`, read `amiriQuran`; invalid value (including a stray `kfgqpc`) falls back; setter persists and updates the store; unrelated fields unchanged.

### Step 5 — Font registry and plumbing (Amiri only still)
- `core/theme`: a registry `quranFonts` (key, family, bundled asset, availability, `mushafAlign: 'justify' | 'start'`; Amiri `justify`, Scheherazade New `start`, ADR 0048 §11) and `useQuranFontFamily()` reading the store. `HafsMushafPage` passes the active font's `mushafAlign` to `QuranText` instead of the fixed `align="justify"` (test: Amiri justify, Scheherazade start). `quranText(token, fontScale, family?)` takes an optional family (default Amiri, so the pure function and its tests stay valid). `QuranText` passes the hook's value. `AyahEndMark` uses the same hook, not the constant. Rename `fontFamilies.quran` in `packages/design-tokens` (run `check:html`).
- Consumers to verify (re-grep `quranFontFamily|QuranText|fontFamily` at the start): `ReadingAyahRow`, `RecitedQuranText`, `RecitedWords`, `FocusAyah`, `FocusAside`, `BismillahLine`, `HafsMushafPage`, `TafsirPanel`, `NowPlayingAyah`, `UthmaniHighlightText`, `DhikrText` (Azkar Quran segments), `ScriptPreviewCard` (its caption `onboarding.script.previewCaption` becomes dynamic), `AyahEndMark`. Check `docs/plans/widgets-watch.md` for any native Quran text. No share/export feature was found.
- Caches (R1): `heightCacheSignature(width, fontScale, mode, font)` and its use in `ReadingList.tsx:149`; `estimateReadingRowHeight` (per-font metric if (c) shows a difference); the Hafs page layout/measure state in `HafsMushafList`/`mushaf-paragraph`; word-pill and word-follow measurements (ADR 0039). A font change clears them and restores the anchor.
- Tests: `textStyles.test.ts` (override and unchanged default); `QuranText.test.tsx` (follows the store, never truncates, `allowFontScaling` false); `AyahEndMark.test.tsx`; `reading-heights.test.ts` (different font gives a different signature); `ReadingList.test.tsx` and `HafsMushafList.test.tsx` (font change re-measures, keeps anchor); existing tests keep passing.

### Step 6 — Picker in reader settings
- In `ReaderSettingsSheet`, a `SettingsSection` «خط المصحف» holding an inline `radiogroup` View of `OnboardingRadioCard`s (`density="compact"`), as `OnboardingScriptScreen` does. No new picker component. Rows come from the registry: Amiri, and Scheherazade New once marked available (step 8). The section stays hidden while one font is available. Row text in `ar.json` and `en.json` (`reader.settings.fonts.*`). Layout via `useWindowClass()` and `ContentColumn`.
- The change applies instantly, in every mode, with no restart and no mode switch.
- Tests (`ReaderSettingsSheet.test.tsx`; a section component, if extracted, gets its own test): rows and selection from the store; press sets the font; mode untouched; section hidden with one font; ar/en RTL; radiogroup role and label, radio checked states; no hard-coded text; no raw hex.

### Step 7 — Settings row value
- `ReadingSection` `fontValue` comes from the store (names below); the row opens reader settings as the frame links `#ReaderSettings`. Replace `settings.reading.quranFontValue`.
- Tests: `ReadingSection.test.tsx`, value per font in ar and en; row press calls its handler.

### Step 8 — Add the Scheherazade New font (not blocked on any licence letter)
- `apps/mobile/assets/fonts/ScheherazadeNew/` with the Regular `.ttf`, `OFL.txt`, and a `README.md` (source release URL, version 4.500, release date, download date, SHA-256 of each file, the SHA-512 check against `SHA512SUMS.txt`), like `assets/fonts/Amiri/README.md`. Register in `readingFonts`/`bundledFonts`, mark available in the registry. Another weight only if step 9 shows a need. Add a Sources credit line only if the OFL notice requires one in the app.
- Tests: registry families match `bundledFonts` keys; the picker now shows both rows.
- Store build, not OTA.

### Step 9 — Visual and integration exit check
- Compare the built sheet with `python3 packages/design-tokens/scripts/frame-shot.py ReaderSettings <out.png>` against an iPhone 17 simulator screenshot (`xcrun simctl io booted screenshot`). Allowed differences: the ADR 0048 list. Anything else fails.
- Every consumer in the step 5 list in both fonts, Arabic and English UI, compact and expanded windows, font scale 80 to 160, dark theme, audio highlight and word pill, resize keeping the anchor, `AyahEndMark` look (R2).
- Maestro screenshots (spec §14): sample ayahs in both fonts and the Mushaf pages sweep.
- Gates: `npm run lint && npx tsc --noEmit && npm test && npx expo-doctor` in `apps/mobile`. No API or contract change.

## Copy (names and subtitles, for the developer to confirm)

| Font | Name ar / en | Subtitle ar / en (proposed) |
| --- | --- | --- |
| Amiri Quran (default) | «أميري» / "Amiri" | «الرسم العثماني · خط أميري القرآني» / "Uthmani script, Amiri Quran font" |
| Scheherazade New | «شهرزاد» / "Scheherazade" | «الرسم العثماني · خط شهرزاد الجديد» / "Uthmani script, Scheherazade New font" |

Neither subtitle says "default". The Settings row value shows the name only.

## Follow-up for the developer to decide (after this feature ships)

The QCF path is unused by the screen and is left in place: `MushafList`, `MushafListPage`, `MushafLine`, `MushafPage`, `useMushafPageFont`, `features/reader/mushaf/` (fonts, constants), the `qcfV2` MMKV cache keys (`qcfV2FontKeys` in `core/storage/mmkv.ts`), and their tests. Delete it, or keep it for a later page-exact mode. If deleted, ADR 0011's QCF download rule, the credit "Quran fonts provided by Quran Foundation" and the content-plan mushaf-fonts row are retired in the same change.

## Release blockers

1. Step 1 (c) and (d) go: iPhone 17 simulator rendering and the Mushaf 15-line pages in Scheherazade New.
2. Spec and content-plan edits from step 2 landed (Mushaf mode renderer, 15 lines, 604-page row, risk rows, Scheherazade version row, row 105 correction).
3. The copy table confirmed.
4. Store build with a device pass of both fonts.

## Open questions for the developer

1. **Copy:** the font name «شهرزاد» / "Scheherazade" and both subtitles (table above). This is the one item to confirm.

## Implementation status (2 Nov 2026)

Steps 3–8 are implemented in one uncommitted change on `main`, built directly at the developer's request instead of by a Haiku subagent.
- **Step 3:** `OnboardingRadioCard` gains `subtitle`, `density` (`regular` / `compact`) and the selected ring.
- **Step 4:** `quranFont` in the `reader.settings` blob, plus `setQuranFont`.
- **Step 5:** the font registry, `QuranFontProvider` / `useQuranFont` (fed at the root from the reader store, so `shared/ui` never imports a feature), `QuranText`, `AyahEndMark`, Mushaf alignment per font, and the font in the Reading height key, the recited-word layout key and the Focus fit key.
- **Step 6:** `QuranFontPicker` in the sheet.
- **Step 7:** the Settings row value.
- **Step 8:** `assets/fonts/ScheherazadeNew/`.

Not done:
- The `fontFamilies.quran` token rename. `check:html` ties it to the design-system HTML, which still names KFGQPC.
- Step 9's remaining device checks.
