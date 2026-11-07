import { router } from 'expo-router';

import { goBackOr, hadithHref, parseHadithId } from './routes';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(), replace: jest.fn() },
}));

describe('hadithHref', () => {
  it('builds the fixed routes', () => {
    expect(hadithHref.home).toBe('/hadith');
    expect(hadithHref.search).toBe('/hadith/search');
    expect(hadithHref.saved).toBe('/hadith/saved');
    expect(hadithHref.downloads()).toBe('/hadith/downloads');
    expect(hadithHref.homeTab).toBe('/(main)/(home)');
  });

  it('passes the resource in the query', () => {
    expect(hadithHref.downloads(-1)).toBe('/hadith/downloads?resource=-1');
  });

  it('builds the collection, book, chapter and reader routes', () => {
    expect(hadithHref.collection('bukhari')).toBe('/hadith/bukhari');
    expect(hadithHref.book('bukhari', 7)).toBe('/hadith/bukhari/books/7');
    expect(hadithHref.chapter('bukhari', 7, 9)).toBe('/hadith/bukhari/books/7/chapters/9');
    expect(hadithHref.run('bukhari', 7, 10, 20)).toBe('/hadith/bukhari/books/7?from=10&to=20');
    expect(hadithHref.reader('bukhari', '3.1')).toBe('/hadith/bukhari/hadith/3.1');
  });

  it('encodes a number with a slash or a space', () => {
    expect(hadithHref.reader('bukhari', '3/1')).toBe('/hadith/bukhari/hadith/3%2F1');
    expect(hadithHref.reader('bukhari', '3 1')).toBe('/hadith/bukhari/hadith/3%201');
    expect(hadithHref.collection('a b')).toBe('/hadith/a%20b');
  });
});

describe('parseHadithId', () => {
  it('parses a whole decimal id', () => {
    expect(parseHadithId('12')).toBe(12);
    expect(parseHadithId(' 7 ')).toBe(7);
  });

  it('returns null for a missing, empty, decimal or non-numeric value', () => {
    expect(parseHadithId(undefined)).toBeNull();
    expect(parseHadithId('')).toBeNull();
    expect(parseHadithId('12a')).toBeNull();
    expect(parseHadithId('1.5')).toBeNull();
    expect(parseHadithId('abc')).toBeNull();
  });
});

describe('goBackOr', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('pops when history exists', () => {
    jest.mocked(router.canGoBack).mockReturnValue(true);
    goBackOr(hadithHref.home);
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('replaces with the home route when history is empty', () => {
    jest.mocked(router.canGoBack).mockReturnValue(false);
    goBackOr(hadithHref.home);
    expect(router.replace).toHaveBeenCalledWith('/hadith');
  });
});
