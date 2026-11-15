import type { TFunction } from 'i18next';

import type { SqlExecutor } from '@/core/db/sql-executor';

import { ayahLabelFor } from './ayah-label';
import type { PageRegionGeometry } from './region-geometry';

// Placeholder text only: never Quran text in a test.
jest.mock('../data/verses', () => ({
  getVerseByKey: (_db: unknown, key: string) =>
    key === '1:1' ? { textUthmani: 'نص تجريبي ليس قرآنًا', verseKey: key } : undefined,
}));
jest.mock('../data/chapters', () => ({
  chapterDisplayName: (chapter: { nameArabic: string; nameSimple: string }, locale: string) =>
    locale === 'ar' ? chapter.nameArabic : chapter.nameSimple,
  getChapter: (_db: unknown, id: number) => (id === 1 ? { nameArabic: 'اسم تجريبي', nameSimple: 'Test name' } : undefined),
}));

const executor = {} as SqlExecutor;
const t = ((key: string, options: { number: string }) => `${key}:${options.number}`) as unknown as TFunction;
const region = (surah: number, ayah: number): Pick<PageRegionGeometry, 'surah' | 'ayah' | 'verseKey'> => ({
  ayah,
  surah,
  verseKey: `${surah}:${ayah}`,
});

describe('ayahLabelFor', () => {
  it('reads the verse text and the ayah number for Hafs', () => {
    expect(ayahLabelFor({ executor, locale: 'ar', mushafKey: 'hafs', region: region(1, 1), t })).toBe(
      'نص تجريبي ليس قرآنًا ui.ayahNumber:١',
    );
  });

  it('falls back to the surah name and number when the verse is missing', () => {
    expect(ayahLabelFor({ executor, locale: 'ar', mushafKey: 'hafs', region: region(1, 2), t })).toBe(
      'اسم تجريبي ui.ayahNumber:٢',
    );
  });

  it('reads the surah name and number for every other riwayah, even when the verse exists', () => {
    expect(ayahLabelFor({ executor, locale: 'en', mushafKey: 'warsh', region: region(1, 1), t })).toBe(
      'Test name ui.ayahNumber:1',
    );
  });
});
