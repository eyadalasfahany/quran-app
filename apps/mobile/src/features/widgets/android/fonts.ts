/**
 * The font families a widget can name. The library reads a `fontFamily` as the bundled asset whose file name starts with
 * it (`fonts/<name>.ttf`); a name with no file falls back to the system font. These files are listed in `app.config.ts`
 * (the plugin's `fonts`), and a test checks that each name has its file.
 */
export const WIDGET_FONTS = {
  /** Body and labels: IBM Plex Sans Arabic, the UI face (ADR 0011). One family per weight, never `fontWeight`. */
  regular: 'IBMPlexSansArabic-Regular',
  medium: 'IBMPlexSansArabic-Medium',
  semiBold: 'IBMPlexSansArabic-SemiBold',
  bold: 'IBMPlexSansArabic-Bold',
  /** Display: surah names and the large prayer name, as the frames draw them in Amiri. */
  display: 'Amiri-Bold',
} as const;

export type WidgetFontName = (typeof WIDGET_FONTS)[keyof typeof WIDGET_FONTS];
