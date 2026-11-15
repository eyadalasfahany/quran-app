import type { TFunction } from 'i18next';

import { formatNumber, type Locale } from '@/core/i18n';

import type { DuaCategory, DuaCategoryKind } from './model';

/**
 * Labels for a Duas category (ADR 0091): its name, the count with its source, and a Hisn card's book number. Used by
 * Duas home and the category screen, so both read the same words.
 */

const SOURCE_KEYS = {
  quran: 'duas.sources.quran',
  hadeethenc: 'duas.sources.hadeethenc',
  hisn: 'duas.sources.hisn',
} as const satisfies Record<DuaCategoryKind, string>;

/** The source's name as shown in the UI: «القرآن», «HadeethEnc», «حصن المسلم». */
export function categorySourceName(kind: DuaCategoryKind, t: TFunction): string {
  return t(SOURCE_KEYS[kind] as never);
}

/** The category's name: its i18n name for `quran` and `hisn`, the HadeethEnc group title as received. */
export function categoryName(category: DuaCategory, t: TFunction): string {
  if (category.titleKey !== null) {
    return t(category.titleKey as never);
  }
  return category.title ?? '';
}

/** «٢٨ دعاءً» in the locale's plural form (`duas.home.categoryCount`). */
export function categoryCountText(count: number, locale: Locale, t: TFunction): string {
  return t('duas.home.categoryCount', { count, number: formatNumber(count, locale) });
}

/** «٢٨ دعاءً · القرآن»: the count with its source. Used on a home tile and the category header. */
export function categoryCaption(category: DuaCategory, locale: Locale, t: TFunction): string {
  return t('duas.category.caption', {
    count: categoryCountText(category.count, locale, t),
    source: categorySourceName(category.kind, t),
  });
}

/** A Hisn book number in digits for the locale; a value that is not a plain number is shown as received. */
export function formatBookNumber(bookNumber: string, locale: Locale): string {
  return /^\d+$/.test(bookNumber) ? formatNumber(Number(bookNumber), locale) : bookNumber;
}

/** «حصن المسلم · ١٥٠», the caption of a Hisn card. */
export function hisnCardCaption(bookNumber: string, locale: Locale, t: TFunction): string {
  return t('duas.category.cardCaption', {
    source: t(SOURCE_KEYS.hisn as never),
    number: formatBookNumber(bookNumber, locale),
  });
}
