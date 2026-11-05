import type { SqlExecutor } from '@/core/db/sql-executor';
import type { QuranPreviewRef } from '@/features/azkar/data/preview';

import { getPropheticDua, getQuranicDua } from './content-repository';

export type DuaFavoriteCard = {
  duaKey: string;
  kind: 'quran' | 'hadith';
  /** The Arabic title of a prophetic dua. Quranic duas have no text preview. */
  preview: string | null;
  /** «سورة … · …» for a Quranic dua, from `quranReference`. Null for a prophetic dua. */
  quranReference: string | null;
};

/**
 * The favourites that still resolve to a dua, in the order given (newest first). A favourite whose row is gone from the
 * content pack is skipped, not deleted. A Quranic dua never carries its verse text here: only its surah and verses.
 */
export function listDuaFavoriteCards(
  db: SqlExecutor,
  favorites: readonly { duaKey: string }[],
  quranReference: (ref: QuranPreviewRef | null) => string | null,
): DuaFavoriteCard[] {
  const cards: DuaFavoriteCard[] = [];

  for (const favorite of favorites) {
    const quran = getQuranicDua(db, favorite.duaKey);
    if (quran !== undefined) {
      cards.push({
        duaKey: favorite.duaKey,
        kind: 'quran',
        preview: null,
        quranReference: quranReference({
          surah: quran.surah,
          verseFrom: quran.verseFrom,
          verseTo: quran.verseTo ?? quran.verseFrom,
        }),
      });
      continue;
    }

    const prophetic = getPropheticDua(db, favorite.duaKey);
    if (prophetic !== undefined) {
      cards.push({ duaKey: favorite.duaKey, kind: 'hadith', preview: prophetic.title, quranReference: null });
    }
  }

  return cards;
}
