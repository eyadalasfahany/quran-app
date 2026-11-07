import type { TFunction } from 'i18next';

import type { Locale } from '@/core/i18n';
import { formatNumber } from '@/core/i18n';

// Shared count text for the collection and book components (hadith.count.* plural keys, ADR 0042).
export function countHadith(count: number, locale: Locale, t: TFunction): string {
  return t('hadith.count.hadith', { count, n: formatNumber(count, locale) });
}

export function countBooks(count: number, locale: Locale, t: TFunction): string {
  return t('hadith.count.books', { count, n: formatNumber(count, locale) });
}

/** «٥٤٣٢ حديث · ٤٢ كتابًا» or «… · كتاب واحد» for a single-book collection. */
export function collectionSummary(totalHadith: number, booksCount: number, soleBook: boolean, locale: Locale, t: TFunction): string {
  const hadith = countHadith(totalHadith, locale, t);
  if (soleBook) {
    return t('hadith.count.collectionSummarySingle', { hadith });
  }
  return t('hadith.count.collectionSummary', { hadith, books: countBooks(booksCount, locale, t) });
}
