import { collectionRowDataFor, orderCatalogEntries } from './collection-row-data';
import type { HadithCatalogEntry, HadithCollection } from './types';

// Placeholders only.
const INSTALLED: HadithCollection = {
  resourceId: 5,
  id: 1,
  slug: 'bukhari',
  number: 1,
  titleAr: '[اسم المجموعة]',
  titleEn: '[Collection name]',
  authorAr: '[اسم المؤلف]',
  authorEn: '[Author name]',
  attributionAr: '[سطر النسبة]',
  attributionEn: '[Attribution line]',
  sourceUrl: null,
  totalHadith: 5432,
  booksCount: 42,
  soleBookId: null,
};

function entry(over: Partial<HadithCatalogEntry> = {}): HadithCatalogEntry {
  return {
    resourceId: 9,
    name: '[Catalogue name]',
    nameAr: '[اسم الكتالوج]',
    version: 1,
    packSizeBytes: 1000,
    installed: false,
    slug: null,
    ...over,
  };
}

describe('collectionRowDataFor', () => {
  it('maps an installed collection with its counts', () => {
    expect(collectionRowDataFor(entry({ installed: true, slug: 'bukhari' }), INSTALLED)).toEqual({
      slug: 'bukhari',
      number: 1,
      titleAr: '[اسم المجموعة]',
      titleEn: '[Collection name]',
      authorAr: '[اسم المؤلف]',
      authorEn: '[Author name]',
      totalHadith: 5432,
      booksCount: 42,
      soleBook: false,
    });
  });

  it('marks a single-book collection as soleBook', () => {
    const row = collectionRowDataFor(entry({ installed: true, slug: 'nawawi40' }), { ...INSTALLED, slug: 'nawawi40', soleBookId: 3 });
    expect(row.soleBook).toBe(true);
  });

  it('maps a not-installed entry with the catalogue names and no counts', () => {
    const row = collectionRowDataFor(entry({ slug: 'abudawud' }), undefined);
    expect(row.titleAr).toBe('[اسم الكتالوج]');
    expect(row.titleEn).toBe('[Catalogue name]');
    expect(row.totalHadith).toBeNull();
    expect(row.booksCount).toBeNull();
    expect(row.authorAr).toBeNull();
    expect(row.soleBook).toBe(false);
  });

  it('uses the neutral cover (slug null) when the entry has no slug', () => {
    const row = collectionRowDataFor(entry({ slug: null }), undefined);
    expect(row.slug).toBeNull();
    expect(row.number).toBe(0);
  });

  it('keeps a null title null', () => {
    const row = collectionRowDataFor(entry({ nameAr: null, name: null, slug: 'abudawud' }), undefined);
    expect(row.titleAr).toBeNull();
    expect(row.titleEn).toBeNull();
  });
});

describe('orderCatalogEntries', () => {
  it('orders entries by the fixed collection order, then by resource id', () => {
    const ordered = orderCatalogEntries([
      entry({ resourceId: 3, slug: null }),
      entry({ resourceId: 2, slug: 'muslim' }),
      entry({ resourceId: 1, slug: 'bukhari' }),
      entry({ resourceId: 4, slug: null }),
    ]);
    expect(ordered.map((item) => item.resourceId)).toEqual([1, 2, 3, 4]);
  });
});
