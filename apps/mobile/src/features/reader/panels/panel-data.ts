import type { SqlExecutor } from '@/core/db/sql-executor';
import { getHighlights, getNotes, listBookmarks, type HighlightColor, type Note, type UserStore } from '@/features/library/data';

import { getChapter, type ChapterRecord } from '../data/chapters';
import { getTafsirForVerse, listInstalledTafsirs } from '../data/tafsir';
import { getTranslations, listInstalledTranslations } from '../data/translations';
import { getVerseByKey, getVerseRange, idToVerseKey, type VerseRecord } from '../data/verses';
import { getWords } from '../data/words';
import type { WordMeaning } from './AyahActionsPanel';
import type { AyahTranslation } from './TranslationPanel';
import type { TafsirOption } from './TafsirPanel';
import { textDirection } from './panel-text';

export type AyahPanelData = {
  verse: VerseRecord;
  chapter: ChapterRecord | undefined;
  previousKey: string | undefined;
  nextKey: string | undefined;
};

export function loadAyahPanelData(db: SqlExecutor, verseKey: string): AyahPanelData | null {
  const verse = getVerseByKey(db, verseKey);
  if (verse === undefined) {
    return null;
  }
  return {
    chapter: getChapter(db, verse.chapterId),
    nextKey: idToVerseKey(db, verse.id + 1),
    previousKey: idToVerseKey(db, verse.id - 1),
    verse,
  };
}

/**
 * Word chips pair each Uthmani word with its word-by-word meaning. Without the meanings resource,
 * or when any word lacks one, there are no chips.
 */
export function loadWordMeanings(
  db: SqlExecutor,
  verseId: number,
  meanings: ReadonlyMap<number, string> | null,
): WordMeaning[] {
  if (meanings === null) {
    return [];
  }
  const words = getWords(db, verseId).filter((word) => word.charType === 'word');
  const chips: WordMeaning[] = [];
  for (const word of words) {
    const meaning = meanings.get(word.position);
    if (meaning === undefined) {
      return [];
    }
    chips.push({ meaning, position: word.position, word: word.textUthmani });
  }
  return chips;
}

export function loadTafsirOptions(db: SqlExecutor, nameFor: (resourceId: number) => string): TafsirOption[] {
  return listInstalledTafsirs(db).map((row) => ({ authorName: null, name: nameFor(row.resourceId), resourceId: row.resourceId }));
}

export type TafsirPassage = { html: string; coverage: { from: number; to: number } | null };

export function loadTafsirPassage(db: SqlExecutor, resourceId: number, verse: VerseRecord): TafsirPassage | null {
  const entry = getTafsirForVerse(db, resourceId, verse.id);
  if (entry === undefined) {
    return null;
  }
  if (entry.firstVerseId === entry.lastVerseId) {
    return { coverage: null, html: entry.html };
  }
  const from = verseNumberOf(db, entry.firstVerseId);
  const to = verseNumberOf(db, entry.lastVerseId);
  return { coverage: from === null || to === null ? null : { from, to }, html: entry.html };
}

/** The reader's selected translations that are installed, in the reader's order. */
export function loadAyahTranslations(
  db: SqlExecutor,
  verseId: number,
  selectedIds: readonly number[],
  nameFor: (resourceId: number) => string,
): AyahTranslation[] {
  const installed = new Set(listInstalledTranslations(db).map((row) => row.resourceId));
  const ids = selectedIds.filter((id) => installed.has(id));
  const entries = new Map(getTranslations(db, [verseId], ids).map((entry) => [entry.resourceId, entry.text]));
  return ids.map((resourceId) => {
    const text = entries.get(resourceId) ?? null;
    return {
      meta: {
        authorName: null,
        // The device keeps no resource catalogue yet, so direction comes from the text itself.
        direction: text === null ? 'ltr' : textDirection(text, 'ltr'),
        name: nameFor(resourceId),
        resourceId,
      },
      text,
    };
  });
}

export type AyahUserState = { bookmarked: boolean; highlight: HighlightColor | null; note: Note | null };

export function readAyahUserState(verseId: number, store?: UserStore): AyahUserState {
  try {
    return {
      bookmarked: listBookmarks(store).some((bookmark) => bookmark.kind === 'verse' && bookmark.verseId === verseId),
      highlight: getHighlights([verseId], store)[0]?.color ?? null,
      note: getNotes(verseId, store)[0] ?? null,
    };
  } catch {
    return { bookmarked: false, highlight: null, note: null };
  }
}

function verseNumberOf(db: SqlExecutor, verseId: number): number | null {
  return getVerseRange(db, verseId, verseId)[0]?.verseNumber ?? null;
}
