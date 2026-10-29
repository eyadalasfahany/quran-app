import type { SqlExecutor } from '@/core/db/sql-executor';
import { getHighlights, getNotes, listBookmarks, type HighlightColor, type Note, type UserStore } from '@/features/library/data';

import { getChapter, type ChapterRecord } from '../data/chapters';
import { getTafsirForVerse, listCatalogTafsirs, listInstalledTafsirs } from '../data/tafsir';
import { getVerseByKey, getVerseRange, idToVerseKey, type VerseRecord } from '../data/verses';
import type { TafsirOption } from './TafsirPanel';

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

export function loadTafsirOptions(db: SqlExecutor): TafsirOption[] {
  return listInstalledTafsirs(db).map((row) => ({
    authorAr: row.authorAr,
    authorName: row.authorName,
    direction: row.direction,
    name: row.name,
    nameAr: row.nameAr,
    resourceId: row.resourceId,
  }));
}

export type CatalogTafsirOption = TafsirOption & { installed: boolean; packSizeBytes: number };

/**
 * Every Arabic tafsir the device knows: the catalogue, plus installed tafsirs the catalogue doesn't list
 * (installs from before it existed, which have no pack size). Sorted by resource id.
 */
export function loadCatalogTafsirOptions(db: SqlExecutor): CatalogTafsirOption[] {
  const catalogue = listCatalogTafsirs(db);
  const catalogueIds = new Set(catalogue.map((tafsir) => tafsir.resourceId));
  const listed = catalogue.map((tafsir) => ({
    authorAr: tafsir.authorAr,
    authorName: tafsir.authorName,
    direction: tafsir.direction,
    installed: tafsir.installed,
    name: tafsir.name,
    nameAr: tafsir.nameAr,
    packSizeBytes: tafsir.packSizeBytes,
    resourceId: tafsir.resourceId,
  }));
  const unlisted = loadTafsirOptions(db)
    .filter((tafsir) => !catalogueIds.has(tafsir.resourceId))
    .map((tafsir) => ({ ...tafsir, installed: true, packSizeBytes: 0 }));
  return [...listed, ...unlisted].sort((a, b) => a.resourceId - b.resourceId);
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
