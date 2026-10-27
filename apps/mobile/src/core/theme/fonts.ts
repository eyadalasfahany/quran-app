import type { FontWeight } from '@quran/design-tokens';

// One family name per weight. Text styles set the family and never `fontWeight`:
// on Android a weight on top of a bold face can pick the wrong file or fake-bold it.
export const uiFontFamilies: Record<FontWeight, string> = {
  400: 'IBMPlexSansArabic-Regular',
  500: 'IBMPlexSansArabic-Medium',
  600: 'IBMPlexSansArabic-SemiBold',
  700: 'IBMPlexSansArabic-Bold',
};

// Only the weights the type scale uses. Quran and display fonts arrive with the reader (Phase 1).
export const uiFonts = {
  'IBMPlexSansArabic-Regular': require('../../../assets/fonts/IBMPlexSansArabic/IBMPlexSansArabic-Regular.ttf'),
  'IBMPlexSansArabic-Medium': require('../../../assets/fonts/IBMPlexSansArabic/IBMPlexSansArabic-Medium.ttf'),
  'IBMPlexSansArabic-SemiBold': require('../../../assets/fonts/IBMPlexSansArabic/IBMPlexSansArabic-SemiBold.ttf'),
  'IBMPlexSansArabic-Bold': require('../../../assets/fonts/IBMPlexSansArabic/IBMPlexSansArabic-Bold.ttf'),
};
