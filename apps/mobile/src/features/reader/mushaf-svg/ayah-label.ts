// The accessible label of one ayah on the Mushaf page (ADR 0090 decision 10). Hafs reads the Imla'i text as today;
// every other riwayah has no text source here, so it reads the surah name and the ayah number.
import type { TFunction } from 'i18next';

import type { SqlExecutor } from '@/core/db/sql-executor';
import { formatNumber, type Locale } from '@/core/i18n';
import type { SvgMushafKey } from '@/core/mushaf-pack';

import { chapterDisplayName, getChapter } from '../data/chapters';
import { getVerseByKey } from '../data/verses';
import type { PageRegionGeometry } from './region-geometry';

export function ayahLabelFor({
  mushafKey,
  region,
  executor,
  locale,
  t,
}: {
  mushafKey: SvgMushafKey;
  region: Pick<PageRegionGeometry, 'surah' | 'ayah' | 'verseKey'>;
  executor: SqlExecutor;
  locale: Locale;
  t: TFunction;
}): string {
  const number = t('ui.ayahNumber', { number: formatNumber(region.ayah, locale) });
  if (mushafKey === 'hafs') {
    const verse = getVerseByKey(executor, region.verseKey);
    if (verse !== undefined) {
      return `${verse.textUthmani} ${number}`;
    }
  }
  const chapter = getChapter(executor, region.surah);
  const name = chapter === undefined ? String(region.surah) : chapterDisplayName(chapter, locale);
  return `${name} ${number}`;
}
