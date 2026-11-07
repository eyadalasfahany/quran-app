import type { Href } from 'expo-router';

import type { SavedHadithItem } from './personal/model';
import type { SavedHadithRowData } from './components/SavedHadithRow';
import { hadithCollectionNumber } from './data';
import { hadithHref } from './routes';

/**
 * Maps a saved item to its row. An item is unverified when the saved flag is set or the hadith can no longer be found;
 * an unverified row shows no number and no text. A missing collection or book falls back to the saved numbers.
 */
export function toSavedRowData(item: SavedHadithItem): SavedHadithRowData {
  const unverified = item.saved.unverified || item.hadith === null;
  const collection =
    item.collection !== null
      ? { number: item.collection.number, titleAr: item.collection.titleAr, titleEn: item.collection.titleEn }
      : { number: hadithCollectionNumber(item.saved.collectionSlug) ?? 0, titleAr: null, titleEn: null };
  const book =
    item.book !== null
      ? { bookNumber: item.book.bookNumber, titleAr: item.book.titleAr, titleEn: item.book.titleEn }
      : { bookNumber: item.saved.bookNumber, titleAr: null, titleEn: null };

  return {
    collection,
    book,
    hadithNumber: unverified || item.hadith === null ? null : item.hadith.hadithNumber,
    textAr: unverified || item.hadith === null ? null : item.hadith.textAr,
    unverified,
  };
}

/** Where a saved row opens: the reader when verified, else its book, else its collection, else the hadith home. */
export function savedItemHref(item: SavedHadithItem): Href {
  const slug = item.saved.collectionSlug;
  const verified = !item.saved.unverified && item.openNumber !== null;
  if (verified && item.openNumber !== null) {
    return hadithHref.reader(slug, item.openNumber);
  }
  if (item.collection !== null && item.book !== null) {
    return hadithHref.book(slug, item.book.id);
  }
  if (item.collection !== null) {
    return hadithHref.collection(slug);
  }
  return hadithHref.home;
}
