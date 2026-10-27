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
const rtlStrong = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/u;
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
