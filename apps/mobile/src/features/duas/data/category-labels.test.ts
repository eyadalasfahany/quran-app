import type { TFunction } from 'i18next';

import { i18n, type Locale } from '@/core/i18n';

import type { DuaCategory } from './model';
import { categoryCaption, categoryName, categorySourceName, formatBookNumber, hisnCardCaption } from './category-labels';

async function tFor(locale: Locale): Promise<TFunction> {
  await i18n.changeLanguage(locale);
  return i18n.getFixedT(locale);
}

// Fixture names only: no dua text is written here.
const quran: DuaCategory = { id: 'quran', kind: 'quran', titleKey: 'duas.categories.quran', title: null, count: 28, sourceKind: 'duas' };
const hadith: DuaCategory = { id: 'hadeethenc:3', kind: 'hadeethenc', titleKey: null, title: 'FIXTURE group title', count: 41, sourceKind: 'duas' };
const hisn: DuaCategory = { id: 'hisn:death', kind: 'hisn', titleKey: 'azkar.categories.death', title: null, count: 10, sourceKind: 'azkar' };

describe('category labels', () => {
  it('names a quran and a hisn category from i18n, and a HadeethEnc category as received', async () => {
    const t = await tFor('ar');
    expect(categoryName(quran, t)).toBe('من القرآن الكريم');
    expect(categoryName(hadith, t)).toBe('FIXTURE group title');
    expect(categoryName(hisn, t)).not.toBe('');
  });

  it('gives each source its own name in Arabic and English', async () => {
    const ar = await tFor('ar');
    expect(categorySourceName('quran', ar)).toBe('القرآن');
    expect(categorySourceName('hadeethenc', ar)).toBe('HadeethEnc');
    expect(categorySourceName('hisn', ar)).toBe('حصن المسلم');

    const en = await tFor('en');
    expect(categorySourceName('quran', en)).toBe('Quran');
    expect(categorySourceName('hisn', en)).toBe('Hisn al-Muslim');
  });

  it('joins the plural count and the source with a middle dot', async () => {
    const ar = await tFor('ar');
    expect(categoryCaption(quran, 'ar', ar)).toBe('٢٨ دعاءً · القرآن');
    expect(categoryCaption(hisn, 'ar', ar)).toBe('١٠ أدعية · حصن المسلم');

    const en = await tFor('en');
    expect(categoryCaption(hadith, 'en', en)).toBe('41 duas · HadeethEnc');
  });

  it('formats a Hisn book number in the locale digits, and keeps a value that is not a number', () => {
    expect(formatBookNumber('150', 'ar')).toBe('١٥٠');
    expect(formatBookNumber('150', 'en')).toBe('150');
    expect(formatBookNumber('12a', 'ar')).toBe('12a');
  });

  it('captions a Hisn card with its source and book number', async () => {
    const ar = await tFor('ar');
    expect(hisnCardCaption('150', 'ar', ar)).toBe('حصن المسلم · ١٥٠');
    const en = await tFor('en');
    expect(hisnCardCaption('150', 'en', en)).toBe('Hisn al-Muslim · 150');
  });
});
