import type { SqlExecutor } from '@/core/db/sql-executor';

import { getEntry } from './content-repository';
import { firstArabicText, quranRefs, type QuranPreviewRef } from './preview';
import type { AzkarFavorite, AzkarOccasion } from './model';

export type FavoriteCard = {
  entryKey: string;
  occasion: AzkarOccasion | null;
  /** The first Arabic text segment, or null. */
  preview: string | null;
  /** Every Quran passage of the entry in order (empty when it has none), shown even when there is a text preview. */
  quranRefs: QuranPreviewRef[];
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
      quranRefs: quranRefs(detail.items),
    });
  }
  return cards;
}
