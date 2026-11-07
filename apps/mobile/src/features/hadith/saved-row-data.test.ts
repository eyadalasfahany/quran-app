import type { SavedHadithItem } from './personal/model';
import { savedItemHref, toSavedRowData } from './saved-row-data';

// Placeholders only (no real hadith text, titles or numbers).
const TEXT = 'نَصٌّ تَجْرِيبِيٌّ مُشَكَّلٌ لِلْعَرْضِ فَقَطْ — لَيْسَ حَدِيثًا';

function item(over: Partial<SavedHadithItem> = {}): SavedHadithItem {
  return {
    saved: { collectionSlug: 'bukhari', hadithNumber: '1234', bookNumber: '2', unverified: false, createdAt: 1 },
    collection: { slug: 'bukhari', number: 1, titleAr: '[اسم المجموعة]', titleEn: '[Collection name]', attributionAr: '', attributionEn: '' },
    book: { id: 7, bookNumber: '2', titleAr: '[اسم الكتاب]', titleEn: '[Book name]' },
    hadith: {
      resourceId: -1,
      id: 1,
      bookId: 7,
      chapterId: null,
      hadithNumber: '1234',
      arabicNumber: null,
      position: 1,
      textAr: TEXT,
      collection: { slug: 'bukhari', number: 1, titleAr: null, titleEn: null, attributionAr: '', attributionEn: '' },
      book: { id: 7, bookNumber: '2', titleAr: null, titleEn: null, position: 1 },
      chapter: null,
      sourceUrl: null,
    },
    openNumber: '1234',
    ...over,
  };
}

describe('toSavedRowData', () => {
  it('maps a verified item with its text and number', () => {
    const row = toSavedRowData(item());
    expect(row.unverified).toBe(false);
    expect(row.hadithNumber).toBe('1234');
    expect(row.textAr).toBe(TEXT);
    expect(row.collection).toEqual({ number: 1, titleAr: '[اسم المجموعة]', titleEn: '[Collection name]' });
    expect(row.book).toEqual({ bookNumber: '2', titleAr: '[اسم الكتاب]', titleEn: '[Book name]' });
  });

  it('marks an item unverified when the saved flag is set', () => {
    const row = toSavedRowData(item({ saved: { collectionSlug: 'bukhari', hadithNumber: '1234', bookNumber: '2', unverified: true, createdAt: 1 } }));
    expect(row.unverified).toBe(true);
    expect(row.hadithNumber).toBeNull();
    expect(row.textAr).toBeNull();
  });

  it('marks an item unverified when the hadith can no longer be found', () => {
    const row = toSavedRowData(item({ hadith: null, openNumber: null }));
    expect(row.unverified).toBe(true);
    expect(row.textAr).toBeNull();
  });

  it('falls back to the saved book number when the book is missing', () => {
    const row = toSavedRowData(item({ book: null }));
    expect(row.book).toEqual({ bookNumber: '2', titleAr: null, titleEn: null });
  });

  it('falls back to the numbered collection when the collection is not installed', () => {
    const row = toSavedRowData(item({ collection: null, book: null, hadith: null, openNumber: null }));
    expect(row.collection).toEqual({ number: 1, titleAr: null, titleEn: null });
  });

  it('keeps the stored text byte for byte', () => {
    expect(toSavedRowData(item()).textAr).toBe(TEXT);
  });
});

describe('savedItemHref', () => {
  it('opens the reader for a verified item', () => {
    expect(savedItemHref(item())).toBe('/hadith/bukhari/hadith/1234');
  });

  it('opens the book for an unverified item', () => {
    const href = savedItemHref(item({ saved: { collectionSlug: 'bukhari', hadithNumber: '1234', bookNumber: '2', unverified: true, createdAt: 1 }, openNumber: null }));
    expect(href).toBe('/hadith/bukhari/books/7');
  });

  it('opens the collection when the book is unknown', () => {
    expect(savedItemHref(item({ book: null, openNumber: null, hadith: null }))).toBe('/hadith/bukhari');
  });

  it('opens the list when the collection is not installed', () => {
    expect(savedItemHref(item({ collection: null, book: null, openNumber: null, hadith: null }))).toBe('/hadith');
  });
});
