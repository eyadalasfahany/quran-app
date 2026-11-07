import { useMemo, useState } from 'react';

import type { SqlExecutor } from '@/core/db/sql-executor';

import type {
  HadithBook,
  HadithBookOutlineItem,
  HadithCatalogEntry,
  HadithChapter,
  HadithCollection,
  HadithListItem,
  HadithPositionRange,
  HadithReaderData,
} from '../types';
import { HADITH_LIST_PAGE_SIZE } from '../constants';
import {
  getBook,
  getCollection,
  getHadithReaderData,
  hadithResourceId,
  hasHadithContent,
  listBookHadith,
  listBookHadithRange,
  listBookOutline,
  listBooks,
  listChapterHadith,
  listChapters,
  listHadithCatalog,
  listInstalledCollections,
} from '../data';
import { useHadithContent } from './useHadithContent';

const EMPTY_COLLECTIONS: HadithCollection[] = [];
const EMPTY_CATALOG: HadithCatalogEntry[] = [];
const EMPTY_BOOKS: HadithBook[] = [];
const EMPTY_CHAPTERS: HadithChapter[] = [];
const EMPTY_ITEMS: HadithListItem[] = [];
const EMPTY_OUTLINE: HadithBookOutlineItem[] = [];

export function useHadithAvailable(): boolean {
  return useHadithContent(false, hasHadithContent, []);
}

export function useInstalledHadithCollections(): HadithCollection[] {
  return useHadithContent(EMPTY_COLLECTIONS, listInstalledCollections, []);
}

export function useHadithCollection(slug: string): HadithCollection | undefined {
  return useHadithContent(undefined, (db) => getCollection(db, slug), [slug]);
}

/** Every catalogue entry (installed or not) for the downloads list. Size and install state come from here. */
export function useHadithCatalog(): HadithCatalogEntry[] {
  return useHadithContent(EMPTY_CATALOG, listHadithCatalog, []);
}

export function useHadithBooks(slug: string): HadithBook[] {
  return useHadithContent(EMPTY_BOOKS, (db) => listBooks(db, slug), [slug]);
}

export function useHadithBook(slug: string, bookId: number): HadithBook | undefined {
  return useHadithContent(undefined, (db) => getBook(db, slug, bookId), [slug, bookId]);
}

export function useBookChapters(slug: string, bookId: number): HadithChapter[] {
  return useHadithContent(EMPTY_CHAPTERS, (db) => listChapters(db, slug, bookId), [slug, bookId]);
}

/** The chapters and chapterless runs of a book in reading order (ADR 0076, option B). Empty for a flat book. */
export function useBookOutline(slug: string, bookId: number): HadithBookOutlineItem[] {
  return useHadithContent(
    EMPTY_OUTLINE,
    (db) => {
      const resourceId = hadithResourceId(db, slug);
      return resourceId === undefined ? EMPTY_OUTLINE : listBookOutline(db, resourceId, bookId);
    },
    [slug, bookId],
  );
}

export type PagedHadith = {
  items: HadithListItem[];
  hasMore: boolean;
  /** Adds one page. Does nothing when there is no more, so `onEndReached` may call it freely. */
  loadMore: () => void;
};

/**
 * A paged list of hadith rows. It starts with one page of `HADITH_LIST_PAGE_SIZE` and grows by one page per `loadMore`.
 * The page count resets when the arguments change, so a new book starts at its first page.
 */
function usePagedHadith(
  argsKey: string,
  read: (db: SqlExecutor, pages: number) => HadithListItem[],
): PagedHadith {
  const [paging, setPaging] = useState({ argsKey, pages: 1 });
  const pages = paging.argsKey === argsKey ? paging.pages : 1;
  const limit = pages * HADITH_LIST_PAGE_SIZE;

  const rows = useHadithContent<HadithListItem[]>(EMPTY_ITEMS, (db) => read(db, pages), [argsKey, pages]);
  const hasMore = rows.length > limit;
  const items = useMemo(() => rows.slice(0, limit), [rows, limit]);

  return {
    items,
    hasMore,
    loadMore: () => {
      if (!hasMore) {
        return;
      }
      setPaging({ argsKey, pages: pages + 1 });
    },
  };
}

/** Hadith of a whole book in book order, across chapters, one page at a time. */
export function useBookHadith(slug: string, bookId: number): PagedHadith {
  return usePagedHadith(JSON.stringify([slug, bookId]), (db, pages) =>
    listBookHadith(db, slug, bookId, { limit: pages * HADITH_LIST_PAGE_SIZE + 1, offset: 0 }),
  );
}

/** Hadith of one run (a position range of a book), in position order, one page at a time. No range reads nothing. */
export function useRunHadith(slug: string, bookId: number, range: HadithPositionRange | null): PagedHadith {
  return usePagedHadith(JSON.stringify([slug, bookId, range]), (db, pages) =>
    range === null
      ? EMPTY_ITEMS
      : listBookHadithRange(db, slug, bookId, range, { limit: pages * HADITH_LIST_PAGE_SIZE + 1, offset: 0 }),
  );
}

/** Hadith of one chapter in position order, one page at a time. */
export function useChapterHadith(slug: string, chapterId: number): PagedHadith {
  return usePagedHadith(JSON.stringify([slug, chapterId]), (db, pages) =>
    listChapterHadith(db, slug, chapterId, { limit: pages * HADITH_LIST_PAGE_SIZE + 1, offset: 0 }),
  );
}

export function useHadithReader(slug: string, hadithNumber: string): HadithReaderData | undefined {
  return useHadithContent(undefined, (db) => getHadithReaderData(db, slug, hadithNumber), [slug, hadithNumber]);
}
