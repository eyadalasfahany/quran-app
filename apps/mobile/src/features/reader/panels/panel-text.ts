import { formatNumber } from '@/core/i18n';

export type TextDirection = 'rtl' | 'ltr';

/**
 * The copy and share text: the ayah exactly as stored, its «﴿N﴾» marker, then the reference line.
 * The ayah string is concatenated as is; nothing here trims or normalizes it.
 */
export function ayahShareText(textUthmani: string, verseNumber: number, reference: string): string {
  return `${textUthmani} ﴿${formatNumber(verseNumber, 'ar')}﴾\n${reference}`;
}

// Hebrew, Arabic, Syriac, Thaana, NKo and the Arabic presentation forms.
/**
 * The name a tafsir shows in the interface language: its Arabic name in Arabic and its English
 * name in English, falling back to the other one, then to the caller's placeholder.
 */
export function tafsirDisplayName(
  names: { name: string | null; nameAr: string | null },
  locale: 'ar' | 'en',
  fallback: string,
): string {
  const primary = locale === 'ar' ? names.nameAr : names.name;
  const secondary = locale === 'ar' ? names.name : names.nameAr;
  if (primary !== null && primary.trim() !== '') {
    return primary;
  }
  if (secondary !== null && secondary.trim() !== '') {
    return secondary;
  }
  return fallback;
}

const rtlStrong =/[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/u;
const ltrStrong = /[A-Za-z\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF]/u;

/** Direction of the first strong character, so a field follows what the reader types. */
export function textDirection(text: string, fallback: TextDirection): TextDirection {
  for (const char of text) {
    if (rtlStrong.test(char)) {
      return 'rtl';
    }
    if (ltrStrong.test(char)) {
      return 'ltr';
    }
  }
  return fallback;
}
