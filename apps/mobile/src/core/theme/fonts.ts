import type { FontWeight } from '@quran/design-tokens';

export const uiFontFamilies: Record<FontWeight, string> = {
  400: 'IBMPlexSansArabic-Regular',
  500: 'IBMPlexSansArabic-Medium',
  600: 'IBMPlexSansArabic-SemiBold',
  700: 'IBMPlexSansArabic-Bold',
};

export const uiFonts = {
  'IBMPlexSansArabic-Regular': require('../../../assets/fonts/IBMPlexSansArabic/IBMPlexSansArabic-Regular.ttf'),
  'IBMPlexSansArabic-Medium': require('../../../assets/fonts/IBMPlexSansArabic/IBMPlexSansArabic-Medium.ttf'),
  'IBMPlexSansArabic-SemiBold': require('../../../assets/fonts/IBMPlexSansArabic/IBMPlexSansArabic-SemiBold.ttf'),
  'IBMPlexSansArabic-Bold': require('../../../assets/fonts/IBMPlexSansArabic/IBMPlexSansArabic-Bold.ttf'),
};

// Amiri ships Regular and Bold only; display styles use one of the two.
export const displayFontFamilies = {
  400: 'Amiri-Regular',
  700: 'Amiri-Bold',
} as const;

// Uthmani ayah text in Reading and Focus modes (ADR 0011). Page-exact Mushaf uses the QCF page fonts instead.
export const readingFonts = {
  'Amiri-Regular': require('../../../assets/fonts/Amiri/Amiri-Regular.ttf'),
  'Amiri-Bold': require('../../../assets/fonts/Amiri/Amiri-Bold.ttf'),
  AmiriQuran: require('../../../assets/fonts/Amiri/AmiriQuran.ttf'),
  'ScheherazadeNew-Regular': require('../../../assets/fonts/ScheherazadeNew/ScheherazadeNew-Regular.ttf'),
};

// The Quran fonts the reader can pick (ADR 0048). Both render the Tanzil text as stored. On iOS a justified
// Scheherazade New line stretches inside words (kashida), even inside the Name of Allah, so its Mushaf lines keep
// to the start instead (ADR 0048 §11).
export const QURAN_FONTS = ['amiriQuran', 'scheherazadeNew'] as const;
export type QuranFont = (typeof QURAN_FONTS)[number];
export const DEFAULT_QURAN_FONT: QuranFont = 'amiriQuran';

export const quranFonts: Record<QuranFont, { family: keyof typeof readingFonts; mushafAlign: 'justify' | 'start' }> = {
  amiriQuran: { family: 'AmiriQuran', mushafAlign: 'justify' },
  scheherazadeNew: { family: 'ScheherazadeNew-Regular', mushafAlign: 'start' },
};

export const quranFontFamily = quranFonts[DEFAULT_QURAN_FONT].family;

export function isQuranFont(value: unknown): value is QuranFont {
  return typeof value === 'string' && (QURAN_FONTS as readonly string[]).includes(value);
}

export const bundledFonts = { ...uiFonts, ...readingFonts };
