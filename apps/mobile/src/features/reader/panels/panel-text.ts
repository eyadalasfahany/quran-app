import type { TFunction } from 'i18next';

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

/**
 * The author in the interface language, with the same fallback as the name: Arabic author in
 * Arabic and English author in English, then the other one. Null when neither is set.
 */
export function tafsirAuthorName(
  option: { authorName: string | null; authorAr: string | null },
  locale: 'ar' | 'en',
): string | null {
  const primary = locale === 'ar' ? option.authorAr : option.authorName;
  const secondary = locale === 'ar' ? option.authorName : option.authorAr;
  if (primary !== null && primary.trim() !== '') {
    return primary;
  }
  if (secondary !== null && secondary.trim() !== '') {
    return secondary;
  }
  return null;
}

export type TafsirRowStatus = 'downloading' | 'failed';

/**
 * The subtitle of a tafsir's download row: the status while a download runs or after one fails, then
 * the author and the pack size, joined with « · ». The size is left out when it is 0.
 */
export function tafsirRowSubtitle(
  row: { status?: TafsirRowStatus; author: string | null; packSizeBytes: number },
  t: TFunction,
  locale: 'ar' | 'en',
): string {
  const parts: string[] = [];
  if (row.status === 'downloading') {
    parts.push(t('ui.download.downloading'));
  }
  if (row.status === 'failed') {
    parts.push(t('ui.download.failed'));
  }
  if (row.author !== null) {
    // An author in the other script pulls the size after it into its own direction («MB 1 · المحلي» in English).
    // First-strong isolates (U+2068 … U+2069) keep the name to itself.
    const interfaceDirection: TextDirection = locale === 'ar' ? 'rtl' : 'ltr';
    const sameDirection = textDirection(row.author, interfaceDirection) === interfaceDirection;
    parts.push(sameDirection ? row.author : `⁨${row.author}⁩`);
  }
  if (row.packSizeBytes > 0) {
    parts.push(t('ui.download.size', { size: formatNumber(Number((row.packSizeBytes / 1e6).toFixed(1)), locale) }));
  }
  return parts.join(' · ');
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
