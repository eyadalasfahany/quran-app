import type { SqlExecutor } from '@/core/db/sql-executor';

import { getEntry } from './content-repository';
import { firstArabicText, firstQuranRef, type QuranPreviewRef } from './preview';
import type { AzkarFavorite, AzkarOccasion } from './model';

export type FavoriteCard = {
  entryKey: string;
  occasion: AzkarOccasion | null;
  preview: string | null;
  /** The opening Quran passage when there is no text preview, or null. */
  quranRef: QuranPreviewRef | null;
};

/**
 * The favourites that still resolve to an entry, in the order given (newest first). A favourite whose entry was
 * removed by a content rebuild is skipped, not deleted.
 */
export function listFavoriteCards(db: SqlExecutor, favorites: readonly AzkarFavorite[]): FavoriteCard[] {
  const cards: FavoriteCard[] = [];
  for (const favorite of favorites) {
    const detail = getEntry(db, favorite.entryKey);
    if (detail === undefined) {
      continue;
    }
    const preview = firstArabicText(detail.items);
    cards.push({
      entryKey: favorite.entryKey,
      occasion: detail.entry.occasion,
      preview,
      quranRef: preview === null ? firstQuranRef(detail.items) : null,
    });
  }
  return cards;
}
