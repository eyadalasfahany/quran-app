import { useMemo } from 'react';

import { openContentDb } from '@/core/db/content/open';
import { getVersesBySurah } from '@/features/reader/data/verses';

export type SurahVerse = { id: number; number: number };

/**
 * The ayahs of a surah, in order, as their global ids and numbers. Reads the content database only; with no
 * database (a test, or before it opens) or no surah, it is empty.
 */
export function useSurahVerses(chapterId: number | null): SurahVerse[] {
  const db = useMemo(() => {
    try {
      return openContentDb().executor;
    } catch {
      return null;
    }
  }, []);
  return useMemo(
    () =>
      db === null || chapterId === null
        ? []
        : getVersesBySurah(db, chapterId).map((verse) => ({ id: verse.id, number: verse.verseNumber })),
    [db, chapterId],
  );
}

/** The ayah number of a verse id in these verses, or undefined when it is not one of them. */
export function verseNumberOf(verses: readonly SurahVerse[], verseId: number): number | undefined {
  return verses.find((verse) => verse.id === verseId)?.number;
}
