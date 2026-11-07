import type { TFunction } from 'i18next';

import { i18n } from '@/core/i18n';

import { bookTitle, chapterTitle, collectionAuthor, collectionTitle, coverTitle } from './titles';

// The real i18n instance, set to the language under test, so `t` returns the locale's copy.
function tFor(language: 'ar' | 'en'): TFunction {
  void i18n.changeLanguage(language);
  return i18n.t.bind(i18n) as unknown as TFunction;
}

describe('titles', () => {
  it('collectionTitle uses titleAr in Arabic', () => {
    expect(collectionTitle({ titleAr: '[اسم]', titleEn: '[Name]', number: 1 }, 'ar', tFor('ar'))).toBe('[اسم]');
  });

  it('collectionTitle uses titleEn in English', () => {
    expect(collectionTitle({ titleAr: '[اسم]', titleEn: '[Name]', number: 1 }, 'en', tFor('en'))).toBe('[Name]');
  });

  it('collectionTitle falls back to «مجموعة n» when titleAr is null, even if titleEn exists', () => {
    expect(collectionTitle({ titleAr: null, titleEn: '[Name]', number: 3 }, 'ar', tFor('ar'))).toBe('مجموعة ٣');
  });

  it('collectionTitle falls back to "Collection n" when titleEn is null', () => {
    expect(collectionTitle({ titleAr: '[اسم]', titleEn: null, number: 3 }, 'en', tFor('en'))).toBe('Collection 3');
  });

  it('collectionTitle treats an empty string as missing', () => {
    expect(collectionTitle({ titleAr: '', titleEn: null, number: 2 }, 'ar', tFor('ar'))).toBe('مجموعة ٢');
  });

  it('bookTitle falls back to «كتاب n» with Arabic digits', () => {
    expect(bookTitle({ titleAr: null, titleEn: null, bookNumber: '12' }, 'ar', tFor('ar'))).toBe('كتاب ١٢');
  });

  it('bookTitle falls back to "Book n" in English', () => {
    expect(bookTitle({ titleAr: null, titleEn: null, bookNumber: '12' }, 'en', tFor('en'))).toBe('Book 12');
  });

  it('bookTitle formats a decimal book number', () => {
    expect(bookTitle({ titleAr: null, titleEn: null, bookNumber: '2.1' }, 'ar', tFor('ar'))).toBe('كتاب ٢٫١');
  });

  it('chapterTitle shows the Arabic title in English', () => {
    expect(chapterTitle({ titleAr: '[اسم الباب]', chapterNumber: 1 }, 'en', tFor('en'))).toBe('[اسم الباب]');
  });

  it('chapterTitle falls back to «باب n»', () => {
    expect(chapterTitle({ titleAr: null, chapterNumber: 4 }, 'ar', tFor('ar'))).toBe('باب ٤');
  });

  it('coverTitle returns null when the title is missing', () => {
    expect(coverTitle({ titleAr: null, titleEn: '[Name]' }, 'ar')).toBeNull();
    expect(coverTitle({ titleAr: '[اسم]', titleEn: null }, 'en')).toBeNull();
  });

  it('collectionAuthor returns null when missing', () => {
    expect(collectionAuthor({ authorAr: null, authorEn: '[Author]' }, 'ar')).toBeNull();
    expect(collectionAuthor({ authorAr: '[مؤلف]', authorEn: null }, 'en')).toBeNull();
    expect(collectionAuthor({ authorAr: '[مؤلف]', authorEn: '[Author]' }, 'ar')).toBe('[مؤلف]');
  });
});
