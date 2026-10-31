import type { SqlExecutor } from '@/core/db/sql-executor';

import { getEntry } from './content-repository';
import { firstArabicText } from './preview';
import type { AzkarFavorite, AzkarOccasion } from './model';

export type FavoriteCard = {
  entryKey: string;
  occasion: AzkarOccasion | null;
  preview: string | null;
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
    cards.push({
      entryKey: favorite.entryKey,
      occasion: detail.entry.occasion,
      preview: firstArabicText(detail.items),
    });
  }
  return cards;
}
