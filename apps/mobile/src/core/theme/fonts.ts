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

export const displayFontFamilies = {
  400: 'Amiri-Regular',
  700: 'Amiri-Bold',
} as const;

export const readingFonts = {
  'Amiri-Regular': require('../../../assets/fonts/Amiri/Amiri-Regular.ttf'),
  'Amiri-Bold': require('../../../assets/fonts/Amiri/Amiri-Bold.ttf'),
  AmiriQuran: require('../../../assets/fonts/Amiri/AmiriQuran.ttf'),
};

/** The one Quran font (ADR 0090 decision 3). Every Quran string renders in it, exactly as stored. */
export const quranFontFamily = 'AmiriQuran' as const;

export const bundledFonts = { ...uiFonts, ...readingFonts };
