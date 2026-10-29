import { useMemo } from 'react';

import { openContentDb } from '@/core/db/content/open';
import { useLocale } from '@/core/i18n/useLocale';
import { getChapter } from '@/features/reader/data/chapters';

import { listReciters, type CatalogReciter } from '../data/reciters';
import { usePlayerStore } from '../playerStore';
import { defaultReciterId } from '../settings-model';

export type PlayerNames = {
  reciter: CatalogReciter | undefined;
  /** The reciter's name in the app's language, or '' when nothing is loaded. */
  reciterName: string;
  /** The surah's bare name in the app's language (no «سورة» prefix), or null when no surah is loaded. */
  chapterName: string | null;
};

// The reciter and surah names the player shows. Reads the content database and playerStore only.
export function usePlayerNames(): PlayerNames {
  const locale = useLocale();
  const storedReciterId = usePlayerStore((state) => state.reciterId);
  const chapterId = usePlayerStore((state) => state.chapterId);

  // The mini player is mounted on every tab, idle or not, so a missing content database means no names, not a crash.
  const db = useMemo(() => {
    try {
      return openContentDb().executor;
    } catch {
      return null;
    }
  }, []);
  const reciters = useMemo(() => (db === null ? [] : listReciters(db)), [db]);
  const reciter = reciters.find((row) => row.resourceId === (storedReciterId ?? defaultReciterId(reciters)));
  const chapter = useMemo(
    () => (db === null || chapterId === null ? undefined : getChapter(db, chapterId)),
    [db, chapterId],
  );

  const reciterName = (locale === 'ar' ? reciter?.nameAr ?? reciter?.name : reciter?.name ?? reciter?.nameAr) ?? '';
  const chapterName = chapter === undefined ? null : locale === 'ar' ? chapter.nameArabic : chapter.nameEn;

  return { reciter, reciterName, chapterName };
}
