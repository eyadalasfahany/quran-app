import type { SqlExecutor } from '@/core/db/sql-executor';
import { listHisnDuaFavorites, type QuranPreviewRef } from '@/features/azkar/data';

import { getPropheticDua, getPropheticGroupTitle, getQuranicDua, getQuranicDuaText } from './content-repository';
import type { DuaFavoriteCategory } from './model';

export type DuaFavoriteCard = {
  duaKey: string;
  kind: 'quran' | 'hadith';
  /** The Arabic title of a prophetic dua. Null for a Quranic dua. */
  preview: string | null;
  /** The stored verse text of a Quranic dua, never truncated. Null for a prophetic dua. */
  text: string | null;
  /** «سورة … · …» for a Quranic dua, from `quranReference`. Null for a prophetic dua. */
  quranReference: string | null;
  /** The muted category line: «من القرآن الكريم» or the HadeethEnc group title. */
  category: DuaFavoriteCategory | null;
};

/** A saved Hisn dua (an Azkar favourite whose entry is a Hisn dua, ADR 0091), shown read-only on the favourites list. */
export type HisnFavoriteCard = {
  kind: 'hisn';
  entryKey: string;
  /** The recited text of the entry (never instruction, never Quran text), or null. */
  preview: string | null;
  /** «سورة … · …» of the entry's Quran passages, or null. */
  quranReference: string | null;
  /** The muted category line: the Duas topic the entry is listed under. */
  category: DuaFavoriteCategory | null;
};

/** One row of the favourites list: a Duas favourite or a saved Hisn dua. */
export type DuaFavoriteListCard = DuaFavoriteCard | HisnFavoriteCard;

type ReferenceFormatter = (ref: QuranPreviewRef | null) => string | null;
type ReferencesFormatter = (refs: readonly QuranPreviewRef[]) => string | null;

/** A Duas favourite resolved to its card, or undefined when its row is gone from the content pack. */
function resolveDuaFavorite(db: SqlExecutor, duaKey: string, quranReference: ReferenceFormatter): DuaFavoriteCard | undefined {
  const quran = getQuranicDua(db, duaKey);
  if (quran !== undefined) {
    return {
      duaKey,
      kind: 'quran',
      preview: null,
      text: getQuranicDuaText(db, quran),
      quranReference: quranReference({
        surah: quran.surah,
        verseFrom: quran.verseFrom,
        verseTo: quran.verseTo ?? quran.verseFrom,
      }),
      category: { kind: 'quran' },
    };
  }

  const prophetic = getPropheticDua(db, duaKey);
  if (prophetic !== undefined) {
    return {
      duaKey,
      kind: 'hadith',
      preview: prophetic.title,
      text: null,
      quranReference: null,
      category: {
        kind: 'hadeethenc',
        title: prophetic.groupId === null ? null : getPropheticGroupTitle(db, prophetic.groupId),
      },
    };
  }

  return undefined;
}

/**
 * The favourites that still resolve to a dua, in the order given (newest first). A favourite whose row is gone from the
 * content pack is skipped, not deleted. A Quranic dua carries its stored verse text and its surah and verses.
 */
export function listDuaFavoriteCards(
  db: SqlExecutor,
  favorites: readonly { duaKey: string }[],
  quranReference: ReferenceFormatter,
): DuaFavoriteCard[] {
  const cards: DuaFavoriteCard[] = [];
  for (const favorite of favorites) {
    const card = resolveDuaFavorite(db, favorite.duaKey, quranReference);
    if (card !== undefined) {
      cards.push(card);
    }
  }
  return cards;
}

/**
 * The favourites list (screens/, #DuasFavorites): the Duas favourites and the saved Hisn duas, newest first across both.
 * A tie in time puts the Duas favourite first. A Hisn dua is read from the Azkar favourites, and only while its entry is
 * still a Hisn dua. With no azkar pack the Hisn rows are skipped and the Duas ones still show.
 */
export function listDuaFavoriteList(
  db: SqlExecutor,
  duaFavorites: readonly { duaKey: string; createdAt: number }[],
  hisnFavorites: readonly { entryKey: string; createdAt: number }[],
  quranReference: ReferenceFormatter,
  quranReferences: ReferencesFormatter,
): DuaFavoriteListCard[] {
  const items: { createdAt: number; rank: number; card: DuaFavoriteListCard }[] = [];

  for (const favorite of duaFavorites) {
    const card = resolveDuaFavorite(db, favorite.duaKey, quranReference);
    if (card !== undefined) {
      items.push({ createdAt: favorite.createdAt, rank: 0, card });
    }
  }

  for (const hisn of listHisnDuaFavorites(db, hisnFavorites)) {
    items.push({
      createdAt: hisn.createdAt,
      rank: 1,
      card: {
        kind: 'hisn',
        entryKey: hisn.entryKey,
        preview: hisn.preview,
        quranReference: quranReferences(hisn.quranRefs),
        category: hisn.topicId === null ? null : { kind: 'hisn', topicId: hisn.topicId },
      },
    });
  }

  return items.sort((a, b) => b.createdAt - a.createdAt || a.rank - b.rank).map((item) => item.card);
}
