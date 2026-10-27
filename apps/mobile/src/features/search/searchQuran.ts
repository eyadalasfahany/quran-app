import type { SqlExecutor } from '@/core/db/sql-executor';
import { getChapter, listChapters, type ChapterRecord } from '@/features/reader/data/chapters';
import { getVerseByKey, idToVerseKey } from '@/features/reader/data/verses';
import { getWords } from '@/features/reader/data/words';

import { buildFtsMatch } from './ftsQuery';
import { matchedWordPositions } from './highlight';
import { parseQuery, parseSurahNumber, type ParsedQuery } from './parseQuery';
import { matchSurahNames } from './surahMatch';

export const SEARCH_PAGE_SIZE = 50;

export type SurahSearchResult = {
  kind: 'surah';
  chapter: ChapterRecord;
};

export type VerseSearchResult = {
  kind: 'verse';
  verse: NonNullable<ReturnType<typeof getVerseByKey>>;
  chapter: ChapterRecord;
  highlightedPositions: number[];
};

export type SearchResult = SurahSearchResult | VerseSearchResult;

export type SearchResultsPage = {
  results: SearchResult[];
  hasMore: boolean;
  parsed: ParsedQuery;
};

export function searchQuran(
  db: SqlExecutor,
  rawQuery: string,
  { offset = 0, limit = SEARCH_PAGE_SIZE }: { offset?: number; limit?: number } = {},
): SearchResultsPage {
  const parsed = parseQuery(rawQuery);
  if (parsed.kind === 'empty') {
    return { results: [], hasMore: false, parsed };
  }

  const chapters = listChapters(db);
  const surahResults: SurahSearchResult[] = [];
  const seenSurah = new Set<number>();

  const pushSurah = (chapterId: number) => {
    if (seenSurah.has(chapterId)) {
      return;
    }
    const chapter = getChapter(db, chapterId);
    if (chapter === undefined) {
      return;
    }
    seenSurah.add(chapterId);
    surahResults.push({ kind: 'surah', chapter });
  };

  if (parsed.kind === 'verse') {
    const verse = getVerseByKey(db, parsed.verseKey);
    if (verse !== undefined) {
      const chapter = getChapter(db, verse.chapterId);
      if (chapter !== undefined) {
        return {
          results: [{ kind: 'verse', verse, chapter, highlightedPositions: [] }],
          hasMore: false,
          parsed,
        };
      }
    }
    return { results: [], hasMore: false, parsed };
  }

  const surahNumber = parseSurahNumber(rawQuery);
  if (surahNumber !== undefined) {
    pushSurah(surahNumber);
  }

  for (const chapter of matchSurahNames(chapters, rawQuery)) {
    pushSurah(chapter.id);
  }

  const fts = buildFtsMatch(parsed.tokens);
  if (fts === null) {
    return { results: surahResults, hasMore: false, parsed };
  }

  const hits = db.all<{ verseId: number }>(
    `SELECT verse_id AS verseId
     FROM search_quran
     WHERE search_quran MATCH ?
     ORDER BY bm25(search_quran), verse_id
     LIMIT ? OFFSET ?`,
    [fts, limit + 1, offset],
  );

  const page = hits.slice(0, limit);
  const hasMore = hits.length > limit;
  const verseResults: VerseSearchResult[] = [];

  for (const hit of page) {
    const verseKey = idToVerseKey(db, hit.verseId);
    if (verseKey === undefined) {
      continue;
    }
    const verse = getVerseByKey(db, verseKey);
    const chapter = verse === undefined ? undefined : getChapter(db, verse.chapterId);
    if (verse === undefined || chapter === undefined) {
      continue;
    }
    const words = getWords(db, hit.verseId);
    verseResults.push({
      kind: 'verse',
      verse,
      chapter,
      highlightedPositions: matchedWordPositions(words, parsed.tokens),
    });
  }

  return { results: [...surahResults, ...verseResults], hasMore, parsed };
}
