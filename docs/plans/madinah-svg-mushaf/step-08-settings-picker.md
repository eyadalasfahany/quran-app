# Step 8 — The mushaf setting and picker; Amiri Quran only (ADR 0090 decisions 2 and 3)

Branch `ft/madinah-svg-mushaf`, worktree `/Applications/MAMP/htdocs/quran-app-mushaf`. Stage nothing. Mobile app only (`apps/mobile`). The Mushaf view itself stays on today's `HafsMushafList` until step 7. This step changes the setting, the pickers and the font.

## Read first

- `docs/adr/0090-madinah-svg-mushaf.md`: decisions 2 and 3, and «Decided» 1.
- `apps/mobile/CLAUDE.md`: components and tests rule, i18n, theme tokens.
- The approved frames:
  - `screens/frames/core/ReaderSettings.html`: «المصحف», five cards, sheet at its large detent;
  - `screens/frames/onboarding/OnboardScript.html`: «اختر المصحف», the preview, five cards.
- Today's code:
  - `src/features/reader/settings-model.ts`, `settings.ts`;
  - `src/core/theme/fonts.ts`, `QuranFontProvider.tsx`, `index.ts`;
  - `src/features/reader/settings/components/QuranFontPicker.tsx`;
  - `src/features/reader/screens/ReaderSettingsSheet.tsx`;
  - `src/features/settings/screens/SettingsScreen.tsx`, `components/ReadingSection.tsx`;
  - `src/features/onboarding/screens/OnboardingScriptScreen.tsx`, `components/ScriptPreviewCard.tsx`;
  - `src/shared/ui/OnboardingRadioCard.tsx`, `QuranText.tsx`, `AyahEndMark.tsx`, `textStyles.ts`;
  - `src/features/reader/components/{RecitedQuranText,FocusAyah,HafsMushafPage}.tsx`;
  - `src/features/reader/ReadingList.tsx`;
  - `app/_layout.tsx`.

## A. The setting

- New file `src/features/reader/mushafs.ts`:
  - `MUSHAF_KEYS = ['hafs', 'warsh', 'qalun', 'shubah', 'duri'] as const`;
  - `type MushafKey`;
  - `DEFAULT_MUSHAF: MushafKey = 'hafs'`;
  - `MUSHAF_EDITION_YEAR: Record<MushafKey, number> = { hafs: 1441, warsh: 1442, qalun: 1443, shubah: 1443, duri: 1443 }`;
  - `isMushafKey(value: unknown)`.
- `settings-model.ts`: replace the `quranFont` field with `mushaf: MushafKey`.
  - Reading: a missing or unknown value gives `'hafs'`.
  - The old stored `quranFont` is ignored and not written back.
  - Keep every other field and its behaviour.
- `settings.ts`: replace `setQuranFont` with `setMushaf(mushaf: MushafKey)`.
- Tests in `settings-model.test.ts`:
  - defaults;
  - each key round-trips;
  - an unknown value reads as `hafs`;
  - a blob holding only an old `quranFont: 'scheherazadeNew'` reads as `mushaf: 'hafs'`, with the other fields intact.

## B. One Quran font: Amiri Quran

1. **Remove the font choice entirely:**
   - `QURAN_FONTS`, the `QuranFont` type and the `quranFonts` map in `fonts.ts`;
   - the `ScheherazadeNew-Regular` entry in the font map;
   - `QuranFontProvider.tsx` and `useQuranFont`, plus their exports in `core/theme/index.ts`;
   - the provider in `app/_layout.tsx`;
   - `QuranFontPicker.tsx` and its test;
   - the folder `assets/fonts/ScheherazadeNew/`.
2. **Keep `quranFontFamily`** (Amiri Quran) as the one family. Every former caller reads it directly:
   - `QuranText`, `AyahEndMark`, `RecitedQuranText`, `FocusAyah`, `HafsMushafPage` and `textStyles`;
   - `HafsMushafPage` always uses the justified paragraph: Amiri's `mushafAlign` was `justify`.
3. **`ReadingList` height-cache signature:** drop the font part. The key becomes (mode, width, font scale, …).
4. **Tests:** update the existing tests that referenced the removed font API. Keep their coverage of Amiri rendering. Delete tests whose only subject was the Scheherazade choice.

## C. `MushafPicker`

New component `src/features/reader/components/MushafPicker.tsx`, with a colocated test.

- **Props:**
  - `value: MushafKey`;
  - `onChange(key)`;
  - `downloaded?: (key) => boolean`;
  - `sizeBytes?: (key) => number | undefined`;
  - `accessibilityLabel: string`;
  - `testID?`.
- **Render:** a `View` with `accessibilityRole="radiogroup"`, holding five `OnboardingRadioCard`s in `MUSHAF_KEYS` order, testIDs `mushaf-${key}`. Each card has:
  - `title`: `t('reader.mushafs.${key}.name')`;
  - `subtitle`: the parts below, joined by ` · `.
- **Subtitle parts, in order:**
  1. `t('reader.mushafs.publisher')`;
  2. the year: `t('reader.mushafs.year', { year })`, with `year` in locale digits. Use the app's existing locale number formatter; search `src/core/i18n` for it. Arabic gives «١٤٤١هـ», English "1441 AH";
  3. if `downloaded?.(key)`: `t('reader.mushafs.downloaded')`. Otherwise, if `sizeBytes?.(key)` is a number: `t('reader.mushafs.size', { mb })`, with `mb` = bytes ÷ 1,000,000 rounded, in locale digits.

  Neither callback is wired until step 5, so for now the subtitle is publisher and year only.
- **Test:**
  - five radios, the selected state on `value`, a press calls `onChange`;
  - the subtitle with `downloaded`, with `sizeBytes`, and with neither;
  - Arabic and English;
  - roles and labels;
  - no raw hex.

## D. Where the picker goes

- **`ReaderSettingsSheet`:**
  - Replace `QuranFontPicker` with `MushafPicker` (`value` from settings, `onChange` `setMushaf`). The section title is `t('reader.settings.mushaf')`.
  - The approved frame draws the sheet at its large detent so all five cards show. Use the sheet's existing large detent (ADR 0020). If this sheet cannot open there, make its content scroll, and say which you did.
  - The font-size control stays as it is.
- **Settings › Reading (`ReadingSection` and `SettingsScreen`):** the row that showed the Quran font now shows `t('settings.reading.mushaf')`, with its value as the current mushaf's name. It keeps the old row's behaviour; check what it opened and open the same place.
- **Onboarding (`OnboardingScriptScreen`), as in the approved `OnboardScript` frame:**
  - title `t('onboarding.script.title')`, now «اختر المصحف»;
  - subtitle `t('onboarding.script.subtitle')`;
  - the preview;
  - `MushafPicker` in place of the three mode cards;
  - «متابعة» calls `setMushaf(selected)`, then goes on to the reciter step as today.

  The reading mode is no longer chosen in onboarding; it keeps its default. Remove `ScriptPreviewCard` and its test if nothing else uses them.
- **Preview:** new component `src/features/onboarding/components/MushafPreviewCard.tsx`, with a test.
  - A rounded card in the existing card style, holding `<Image source={require('../../../../assets/mushaf/onboarding-preview-hafs.png')} />` at full card width, aspect ratio 1074 / 571.
  - `tintColor` is the theme's primary text token, so the transparent artwork follows light and dark.
  - `accessible={false}`: it is decorative. The asset already exists. Do not edit it.

## E. i18n (`ar.json` and `en.json`)

Remove `reader.settings.fonts.*` and `settings.reading.quranFont`. Add:

| Key | ar | en |
| --- | --- | --- |
| `reader.settings.mushaf` | المصحف | Mushaf |
| `settings.reading.mushaf` | المصحف | Mushaf |
| `reader.mushafs.publisher` | مجمع الملك فهد | King Fahd Complex |
| `reader.mushafs.year` | {{year}}هـ | {{year}} AH |
| `reader.mushafs.downloaded` | مُنزَّل | Downloaded |
| `reader.mushafs.size` | {{mb}} ميغابايت | {{mb}} MB |
| `reader.mushafs.hafs.name` | حفص عن عاصم | Hafs from Asim |
| `reader.mushafs.warsh.name` | ورش عن نافع | Warsh from Nafi |
| `reader.mushafs.qalun.name` | قالون عن نافع | Qalun from Nafi |
| `reader.mushafs.shubah.name` | شعبة عن عاصم | Shu'bah from Asim |
| `reader.mushafs.duri.name` | الدوري عن أبي عمرو | Al-Duri from Abu Amr |
| `reader.mushafs.group` | اختيار المصحف | Choose a mushaf |
| `onboarding.script.title` | اختر المصحف | Choose your mushaf |
| `onboarding.script.subtitle` | يمكنك تغييره لاحقًا من الإعدادات. | You can change it later in Settings. |

Remove `onboarding.script.modeGroup` if nothing uses it any more.

## Gates

1. Kill orphaned Jest first: `pkill -f "jest" || true`. Never run two Jest processes at once.
2. Then, in `apps/mobile`:
   - `npm run lint`
   - `npx tsc --noEmit`
   - `npx jest --maxWorkers=2 <the test files you touched or that reference the removed APIs>`
   - finally the full `npx jest --maxWorkers=2` once
   - `npx expo-doctor`

## Report

- The files created, changed and deleted.
- The gate results.
- Which sheet behaviour you used (large detent or scroll).
- Any conflict with the frames or the code. Stop and report rather than redesign.
