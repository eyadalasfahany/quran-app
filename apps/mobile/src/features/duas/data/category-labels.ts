import type { TFunction } from 'i18next';

import { formatNumber, type Locale } from '@/core/i18n';
import { formatHadithNumber } from '@/features/hadith/format';

import type { DuaCategory } from './model';

/**
 * Labels for a Duas category (ADR 0091): its name and its count. The sources are not shown on Duas screens (developer,
 * 15 Nov 2026); they live in Settings › المصادر. The data keeps its source kind; the UI stops rendering it.
 */

/**
 * The category's name: its i18n name for `quran` and `hisn`, the HadeethEnc group title as received, and for a hadith
 * book its Arabic title, or the hadith feature's «كتاب {n}» when the title is empty (`hadith.untitled.book`).
 */
export function categoryName(category: DuaCategory, t: TFunction, locale: Locale): string {
  if (category.titleKey !== null) {
    return t(category.titleKey as never);
  }
  if (category.kind === 'hadithbook') {
    return category.title ?? t('hadith.untitled.book', { n: formatHadithNumber(category.bookNumber ?? '', locale) });
  }
  return category.title ?? '';
}

/** «٢٨ دعاءً» in the locale's plural form (`duas.home.categoryCount`). Used by a home tile and the category header. */
export function categoryCountText(count: number, locale: Locale, t: TFunction): string {
  return t('duas.home.categoryCount', { count, number: formatNumber(count, locale) });
}
