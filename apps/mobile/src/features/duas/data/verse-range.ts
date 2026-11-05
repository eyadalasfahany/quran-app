import { formatNumber } from '@/core/i18n/numbers';
import type { Locale } from '@/core/i18n/locale';

/** The ayah number, or «from–to» for a span, in the locale's digits. */
export function verseRangeLabel(verseFrom: number, verseTo: number | null, locale: Locale): string {
  const from = formatNumber(verseFrom, locale);
  if (verseTo === null || verseTo === verseFrom) {
    return from;
  }
  return `${from}–${formatNumber(verseTo, locale)}`;
}
