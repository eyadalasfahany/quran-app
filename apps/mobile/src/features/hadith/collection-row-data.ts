import type { CollectionRowData } from './components/CollectionRow';
import { hadithCollectionNumber } from './data';
import type { HadithCatalogEntry, HadithCollection } from './types';

/**
 * The row data of one catalogue entry. An installed entry (matched by resource id) takes its counts and slug from the
 * installed collection. A not-installed entry takes its names and authors from the catalogue and has no counts.
 */
export function collectionRowDataFor(entry: HadithCatalogEntry, installed: HadithCollection | undefined): CollectionRowData {
  if (installed !== undefined) {
    return {
      slug: installed.slug,
      number: installed.number,
      titleAr: installed.titleAr,
      titleEn: installed.titleEn,
      authorAr: installed.authorAr,
      authorEn: installed.authorEn,
      totalHadith: installed.totalHadith,
      booksCount: installed.booksCount,
      soleBook: installed.soleBookId !== null,
    };
  }
  return {
    slug: entry.slug,
    number: hadithCollectionNumber(entry.slug ?? '') ?? 0,
    titleAr: entry.nameAr,
    titleEn: entry.name,
    // The author comes from the catalogue (`catalog_resources`), so the row shows it before install.
    authorAr: entry.authorAr,
    authorEn: entry.authorEn,
    totalHadith: null,
    booksCount: null,
    soleBook: false,
  };
}

/** Catalogue entries in the fixed collection order. Entries without a known slug follow, by resource id. */
export function orderCatalogEntries(entries: readonly HadithCatalogEntry[]): HadithCatalogEntry[] {
  const rank = (entry: HadithCatalogEntry): number => (entry.slug === null ? Number.POSITIVE_INFINITY : (hadithCollectionNumber(entry.slug) ?? Number.POSITIVE_INFINITY));
  return [...entries].sort((a, b) => {
    const difference = rank(a) - rank(b);
    if (difference !== 0 && !Number.isNaN(difference)) {
      return difference;
    }
    return a.resourceId - b.resourceId;
  });
}
