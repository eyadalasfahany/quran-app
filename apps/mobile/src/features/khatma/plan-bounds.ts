import type { SqlExecutor } from '@/core/db/sql-executor';
import { getVerseRange } from '@/features/reader/data/verses';

import { pagesRemaining } from './data/plan';

/** Mushaf page span for a plan from its start verse (content.db). */
export function resolvePlanBounds(
  executor: SqlExecutor,
  startVerseId: number,
): { startPage: number; pagesTotal: number } | null {
  const verse = getVerseRange(executor, startVerseId, startVerseId)[0];
  if (verse === undefined) {
    return null;
  }
  return { startPage: verse.page, pagesTotal: pagesRemaining(verse.page) };
}
