import { useMemo } from 'react';

import { openContentDb } from '@/core/db/content/open';
import { useCatalogVersion } from '@/core/sync';
import { useLocale } from '@/core/i18n/useLocale';
import { getChapter } from '@/features/reader/data/chapters';

import { listReciters, type CatalogReciter } from '../data/reciters';
import { useReciterDownloads } from '../reciter-downloads';
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
  // The mini player mounts at app start, often before the content database opens or the catalogue syncs. A failed
  // open is not cached: the lookup runs again after an install or a catalogue sync.
  const installedVersion = useReciterDownloads((state) => state.installedVersion);
  const catalogVersion = useCatalogVersion((state) => state.version);

  // The mini player is mounted on every tab, idle or not, so a missing content database means no names, not a crash.
  const { reciter, chapter } = useMemo(() => {
    try {
      const executor = openContentDb().executor;
      const reciters = listReciters(executor);
      return {
        reciter: reciters.find((row) => row.resourceId === (storedReciterId ?? defaultReciterId(reciters))),
        chapter: chapterId === null ? undefined : getChapter(executor, chapterId),
      };
    } catch {
      return { reciter: undefined, chapter: undefined };
    }
    // installedVersion and catalogVersion are not read here: they only re-run the lookup after an install or a sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogVersion, chapterId, installedVersion, storedReciterId]);

  // An empty Arabic or English name falls back to the other language, as a missing one does.
  const reciterName = (locale === 'ar' ? reciter?.nameAr || reciter?.name : reciter?.name || reciter?.nameAr) || '';
  const chapterName = chapter === undefined ? null : locale === 'ar' ? chapter.nameArabic : chapter.nameEn;

  return { reciter, reciterName, chapterName };
}
