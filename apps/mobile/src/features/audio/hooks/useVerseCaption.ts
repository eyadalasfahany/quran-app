import { useMemo } from 'react';

import { openContentDb } from '@/core/db/content/open';
import { useLocale } from '@/core/i18n/useLocale';
import { chapterDisplayName, getChapter } from '@/features/reader/data/chapters';
import { getVerseByKey } from '@/features/reader/data/verses';

export type VerseCaption = { surah: string; ayah: number };

// The surah's name and the ayah's number for a verse key, in the app's language. Null when there is no key or the
// content database is not open yet.
export function useVerseCaption(verseKey: string | null): VerseCaption | null {
  const locale = useLocale();
  return useMemo(() => {
    if (verseKey === null) {
      return null;
    }
    try {
      const db = openContentDb().executor;
      const verse = getVerseByKey(db, verseKey);
      const chapter = verse === undefined ? undefined : getChapter(db, verse.chapterId);
      if (verse === undefined || chapter === undefined) {
        return null;
      }
      return { ayah: verse.verseNumber, surah: chapterDisplayName(chapter, locale) };
    } catch {
      return null;
    }
  }, [verseKey, locale]);
}
