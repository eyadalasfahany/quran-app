import type { Href } from 'expo-router';

/** Hadith routes (app/hadith/*). Dynamic segments are encoded. `bookId` and `chapterId` are database ids (browsing keys only). */
export const hadithHref = {
  home: '/hadith' as Href,
  search: '/hadith/search' as Href,
  saved: '/hadith/saved' as Href,
  downloads: (resourceId?: number): Href =>
    (resourceId === undefined ? '/hadith/downloads' : `/hadith/downloads?resource=${resourceId}`) as Href,
  collection: (slug: string): Href => `/hadith/${encodeURIComponent(slug)}` as Href,
  book: (slug: string, bookId: number): Href => `/hadith/${encodeURIComponent(slug)}/books/${bookId}` as Href,
  /** A run of chapterless hadith: the book route with the run's position range (`from`, `to`, inclusive). */
  run: (slug: string, bookId: number, from: number, to: number): Href =>
    `/hadith/${encodeURIComponent(slug)}/books/${bookId}?from=${from}&to=${to}` as Href,
  chapter: (slug: string, bookId: number, chapterId: number): Href =>
    `/hadith/${encodeURIComponent(slug)}/books/${bookId}/chapters/${chapterId}` as Href,
  /** A chapter, or its only hadith straight away when it holds one (developer, 8 Nov 2026). */
  openChapter: (slug: string, bookId: number, chapter: { id: number; soleHadithNumber: string | null }): Href =>
    chapter.soleHadithNumber !== null
      ? hadithHref.reader(slug, chapter.soleHadithNumber)
      : hadithHref.chapter(slug, bookId, chapter.id),
  reader: (slug: string, hadithNumber: string): Href =>
    `/hadith/${encodeURIComponent(slug)}/hadith/${encodeURIComponent(hadithNumber)}` as Href,
  /** The Menu's home tab, where Hadith is reached from. */
  homeTab: '/(main)/(home)' as Href,
};

export { goBackOr } from '@/core/navigation/go-back';

/**
 * Parses a database id from a route segment or query value. Returns null for anything that is not a whole decimal
 * number (`'12a'`, `''`, `'1.5'`), so a bad URL shows the not-found state instead of a wrong row.
 */
export function parseHadithId(value: string | undefined): number | null {
  if (value === undefined || value.trim() === '') {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || String(parsed) !== value.trim()) {
    return null;
  }
  return parsed;
}
