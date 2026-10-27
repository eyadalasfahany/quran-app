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
export const quranFontFamily = 'AmiriQuran';

export const readingFonts = {
  'Amiri-Regular': require('../../../assets/fonts/Amiri/Amiri-Regular.ttf'),
  'Amiri-Bold': require('../../../assets/fonts/Amiri/Amiri-Bold.ttf'),
  AmiriQuran: require('../../../assets/fonts/Amiri/AmiriQuran.ttf'),
};

export const bundledFonts = { ...uiFonts, ...readingFonts };
