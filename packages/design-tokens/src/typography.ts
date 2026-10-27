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

export type TextStyleToken = {
  family: 'display' | 'ui';
  size: number;
  lineHeight: number;
  weight: FontWeight;
};

export const quranTypeScale = {
  quranMushaf: { family: 'quran', size: 25, lineHeightRatio: 2.35, weight: 400 },
  quranReading: { family: 'quran', size: 28, lineHeightRatio: 2.2, weight: 400 },
  quranFocus: { family: 'quran', size: 36, lineHeightRatio: 2, weight: 400 },
  quranWord: { family: 'quran', size: 20, lineHeightRatio: 1.7, weight: 400 },
} as const satisfies Record<string, QuranTextStyle>;

export const typeScale = {
  displayLg: { family: 'display', size: 34, lineHeight: 46, weight: 700 },
  displayMd: { family: 'display', size: 28, lineHeight: 36, weight: 700 },
  displaySm: { family: 'display', size: 20, lineHeight: 26, weight: 700 },
  numeral: { family: 'display', size: 14, lineHeight: 14, weight: 400 },
  title: { family: 'ui', size: 21, lineHeight: 28, weight: 700 },
  headline: { family: 'ui', size: 16, lineHeight: 24, weight: 600 },
  body: { family: 'ui', size: 15, lineHeight: 22, weight: 400 },
  caption: { family: 'ui', size: 13, lineHeight: 18, weight: 400 },
  label: { family: 'ui', size: 12, lineHeight: 16, weight: 500 },
} as const satisfies Record<string, TextStyleToken>;

export type QuranTypeToken = keyof typeof quranTypeScale;
export type TypeToken = keyof typeof typeScale;
