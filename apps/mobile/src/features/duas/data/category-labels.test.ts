import type { TFunction } from 'i18next';

import { i18n, type Locale } from '@/core/i18n';

import type { DuaCategory } from './model';
import { categoryCountText, categoryName } from './category-labels';

async function tFor(locale: Locale): Promise<TFunction> {
  await i18n.changeLanguage(locale);
  return i18n.getFixedT(locale);
}

// Fixture names only: no dua text is written here.
const quran: DuaCategory = { id: 'quran', kind: 'quran', titleKey: 'duas.categories.quran', title: null, count: 28, sourceKind: 'duas' };
const hadith: DuaCategory = { id: 'hadeethenc:3', kind: 'hadeethenc', titleKey: null, title: 'FIXTURE group title', count: 41, sourceKind: 'duas' };
const hisn: DuaCategory = { id: 'hisn:death', kind: 'hisn', titleKey: 'azkar.categories.death', title: null, count: 10, sourceKind: 'azkar' };
const book: DuaCategory = {
  id: 'hadithbook:bukhari:80',
  kind: 'hadithbook',
  titleKey: null,
  title: 'FIXTURE book title',
  count: 4,
  sourceKind: 'hadith',
  bookNumber: '80',
};
const untitledBook: DuaCategory = { ...book, id: 'hadithbook:muslim:48', title: null, bookNumber: '48' };

describe('category labels', () => {
  it('names a quran and a hisn category from i18n, and a HadeethEnc category as received', async () => {
    const t = await tFor('ar');
    expect(categoryName(quran, t, 'ar')).toBe('من القرآن الكريم');
    expect(categoryName(hadith, t, 'ar')).toBe('FIXTURE group title');
    expect(categoryName(hisn, t, 'ar')).not.toBe('');
  });

  it('names a hadith book by its Arabic title', async () => {
    const t = await tFor('ar');
    expect(categoryName(book, t, 'ar')).toBe('FIXTURE book title');
  });

  it('falls back to the hadith feature’s «كتاب {n}» when the book has no title, with Arabic digits', async () => {
    const t = await tFor('ar');
    expect(categoryName(untitledBook, t, 'ar')).toBe('كتاب ٤٨');
  });

  it('keeps the book number as stored in English, where the fallback reads "Book {n}"', async () => {
    const t = await tFor('en');
    expect(categoryName(untitledBook, t, 'en')).toBe('Book 48');
  });

  it('gives the count alone, in the plural form, with no source', async () => {
    const ar = await tFor('ar');
    expect(categoryCountText(28, 'ar', ar)).toBe('٢٨ دعاءً');
    expect(categoryCountText(1, 'ar', ar)).toBe('دعاء واحد');
    expect(categoryCountText(10, 'ar', ar)).not.toMatch(/المصادر|حصن|HadeethEnc|القرآن/);

    const en = await tFor('en');
    expect(categoryCountText(41, 'en', en)).toBe('41 duas');
  });
});
