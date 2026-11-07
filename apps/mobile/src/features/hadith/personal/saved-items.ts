import type { SqlExecutor } from '@/core/db/sql-executor';

import { getCollection, getHadith, listBooks } from '../data';
import type { HadithCollectionRef } from '../types';
import { canonicalHadithNumber } from './covering-number';
import { readHadithBookmarks } from './bookmarks-repository';
import type { HadithPersonalStore, SavedHadith, SavedHadithItem } from './model';
import { resolveHadithStore } from './store';

function unresolved(saved: SavedHadith): SavedHadithItem {
  return { saved, collection: null, book: null, hadith: null, openNumber: null };
}

function itemFor(content: SqlExecutor, saved: SavedHadith, resolver: ReturnType<typeof resolveHadithStore>['resolver']): SavedHadithItem {
  const collection = getCollection(content, saved.collectionSlug);
  const collectionRef: HadithCollectionRef | null =
    collection === undefined
      ? null
      : {
          slug: collection.slug,
          number: collection.number,
          titleAr: collection.titleAr,
          titleEn: collection.titleEn,
          attributionAr: collection.attributionAr,
          attributionEn: collection.attributionEn,
        };

  const bookRow = listBooks(content, saved.collectionSlug).find((book) => book.bookNumber === saved.bookNumber);
  const book =
    bookRow === undefined
      ? null
      : { id: bookRow.id, bookNumber: bookRow.bookNumber, titleAr: bookRow.titleAr, titleEn: bookRow.titleEn };

  // An unverified item is shown at book level only: no number and no text.
  if (saved.unverified) {
    return { saved, collection: collectionRef, book, hadith: null, openNumber: null };
  }

  const openNumber = canonicalHadithNumber(content, saved.collectionSlug, saved.hadithNumber, resolver);
  const hadith = getHadith(content, saved.collectionSlug, openNumber) ?? null;
  return { saved, collection: collectionRef, book, hadith, openNumber: hadith === null ? null : openNumber };
}

/** Saved rows joined with `content.db`, newest first. Content read failures give an empty join for that row only. */
export function listSavedHadithItems(store?: HadithPersonalStore): SavedHadithItem[] {
  const { db, content, resolver } = resolveHadithStore(store);
  return readHadithBookmarks(db).map((saved) => {
    if (content === undefined) {
      return unresolved(saved);
    }
    try {
      return itemFor(content, saved, resolver);
    } catch {
      return unresolved(saved);
    }
  });
}
