// Values from quran-app-design-system.html until the Figma text styles can be read (ADR 0005).

// One family name each; the app maps a family and weight to the font file it loads.
export const fontFamilies = {
  quran: 'KFGQPC HAFS Uthmanic Script',
  quranIndopak: 'IndoPak Nastaleeq',
  display: 'Amiri',
  ui: 'IBM Plex Sans Arabic',
} as const;

export type FontFamilyToken = keyof typeof fontFamilies;

export type FontWeight = 400 | 500 | 600 | 700;

// Quran sizes keep a unitless line height: the reader scales Quran text 80–160%,
// so the line height has to follow the scaled size.
export type QuranTextStyle = {
  family: 'quran';
  size: number;
  lineHeightRatio: number;
  weight: FontWeight;
};

// iOS text style each interface style scales with (React Native `dynamicTypeRamp`).
export type DynamicTypeRamp = 'title2' | 'headline' | 'body' | 'subheadline' | 'footnote' | 'caption1';

export type TextStyleToken = {
  family: 'display' | 'ui';
  size: number;
  lineHeight: number;
  weight: FontWeight;
  ramp?: DynamicTypeRamp;
};

// Amiri's natural leading: hhea ascender 1124 + descender 634 per 1000 em. A display line
// shorter than this clips marks above letters (the madda in «آل», the hamza in «أ») on iOS.
export const amiriNaturalLeading = 1.758;

export const quranTypeScale = {
  // Phone frames in quran-app-screens.html (ADR 0013). Focus current ayah is 38 / 2.1;
  // the ayahs before and after it are 24 / 2 at 22% opacity.
  quranMushaf: { family: 'quran', size: 25, lineHeightRatio: 2.35, weight: 400 },
  quranReading: { family: 'quran', size: 27, lineHeightRatio: 2.1, weight: 400 },
  quranFocus: { family: 'quran', size: 38, lineHeightRatio: 2.1, weight: 400 },
  quranFocusAside: { family: 'quran', size: 24, lineHeightRatio: 2, weight: 400 },
  // The ayah card in the tafsir panel (quran-app-screens.html, Tafsir and ReaderExpandedTafsir).
  quranPanel: { family: 'quran', size: 24, lineHeightRatio: 2, weight: 400 },
  quranWord: { family: 'quran', size: 20, lineHeightRatio: 1.7, weight: 400 },
  // A search result's ayah (Search frame).
  quranResult: { family: 'quran', size: 21, lineHeightRatio: 1.9, weight: 400 },
} as const satisfies Record<string, QuranTextStyle>;

export const typeScale = {
  displayLg: { family: 'display', size: 34, lineHeight: 46, weight: 700 },
  displayMd: { family: 'display', size: 28, lineHeight: 36, weight: 700 },
  displaySm: { family: 'display', size: 20, lineHeight: 26, weight: 700 },
  // round(14 × amiriNaturalLeading); the medallion number is the only user of this token.
  numeral: { family: 'display', size: 14, lineHeight: 25, weight: 400 },
  // Azkar (ADR 0031): the reader's dhikr text and the category list preview. Both at least amiriNaturalLeading.
  dhikr: { family: 'display', size: 24, lineHeight: 48, weight: 400 },
  dhikrList: { family: 'display', size: 19, lineHeight: 34, weight: 400 },
  title: { family: 'ui', size: 22, lineHeight: 30, weight: 700, ramp: 'title2' },
  headline: { family: 'ui', size: 17, lineHeight: 24, weight: 600, ramp: 'headline' },
  body: { family: 'ui', size: 17, lineHeight: 26, weight: 400, ramp: 'body' },
  subhead: { family: 'ui', size: 15, lineHeight: 22, weight: 400, ramp: 'subheadline' },
  caption: { family: 'ui', size: 13, lineHeight: 18, weight: 400, ramp: 'footnote' },
  label: { family: 'ui', size: 12, lineHeight: 16, weight: 500, ramp: 'caption1' },
} as const satisfies Record<string, TextStyleToken>;

export type QuranTypeToken = keyof typeof quranTypeScale;
export type TypeToken = keyof typeof typeScale;
