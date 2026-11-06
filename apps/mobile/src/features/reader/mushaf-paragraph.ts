// The Mushaf page's text model: one paragraph per surah run, with the spaces and end marks the page draws between
// ayahs. The page renders from these runs and the list counts offsets in them, so both see the same pieces.

import type { SqlExecutor } from '@/core/db/sql-executor';
import { ayahEndMarkText } from '@/shared/ui/AyahEndMark';

import { pageForVerse } from './anchor/page';
import { getVersesByPage, type VerseRecord } from './data/verses';
import { recitedWordOffset } from './word-follow';

// Separates an ayah from its end mark and from the next ayah. Kept outside the stored ayah text.
export const MUSHAF_WORD_SPACE = ' ';

// Splits a page's verses where a surah starts, so each surah's ayahs flow as one paragraph under its cartouche.
export type SurahRun = [VerseRecord, ...VerseRecord[]];

export function surahRuns(verses: readonly VerseRecord[]): SurahRun[] {
  const runs: SurahRun[] = [];
  for (const verse of verses) {
    const current = runs.at(-1);
    if (current === undefined || verse.verseNumber === 1) {
      runs.push([verse]);
    } else {
      current.push(verse);
    }
  }
  return runs;
}

/** The paragraph (surah run on its page) holding the ayah, or null when the ayah is not in the content database. */
export function paragraphOf(db: SqlExecutor, verseKey: string): SurahRun | null {
  const page = pageForVerse(db, verseKey);
  if (page === undefined) {
    return null;
  }
  return surahRuns(getVersesByPage(db, page)).find((run) => run.some((verse) => verse.verseKey === verseKey)) ?? null;
}

/** Where each ayah's own text starts and ends in the paragraph, as the page draws it. */
export function paragraphVerseRanges(
  run: readonly VerseRecord[],
): { verseKey: string; start: number; textEnd: number }[] {
  const ranges: { verseKey: string; start: number; textEnd: number }[] = [];
  let offset = 0;
  for (const [index, verse] of run.entries()) {
    if (index > 0) {
      offset += MUSHAF_WORD_SPACE.length;
    }
    const start = offset;
    const textEnd = start + verse.textUthmani.length;
    ranges.push({ start, textEnd, verseKey: verse.verseKey });
    offset = textEnd + MUSHAF_WORD_SPACE.length + ayahEndMarkText(verse.verseNumber).length;
  }
  return ranges;
}

/**
 * The character offset of the recited word in the paragraph's text, as the page draws it: each earlier ayah with
 * its space and end mark, then the recited ayah up to its word. Null when the ayah or word is not there.
 */
export function paragraphWordOffset(
  run: readonly VerseRecord[],
  recitedKey: string,
  activeWord: number,
): number | null {
  const index = run.findIndex((verse) => verse.verseKey === recitedKey);
  if (index < 0) {
    return null;
  }
  const within = recitedWordOffset(run[index]!.textUthmani, activeWord);
  return within === null ? null : paragraphVerseRanges(run)[index]!.start + within;
}

/**
 * The ayah at a character offset. An offset in an end mark or the spaces around it belongs to the next ayah, or the
 * last one. Null for an empty run or a negative offset.
 */
export function verseKeyAtOffset(run: readonly VerseRecord[], offset: number): string | null {
  if (run.length === 0 || offset < 0) {
    return null;
  }
  const ranges = paragraphVerseRanges(run);
  const owner = ranges.find((range) => offset < range.textEnd) ?? ranges.at(-1);
  return owner?.verseKey ?? null;
}
