import { useMemo } from 'react';

import { openContentDb } from '@/core/db/content/open';
import { useCatalogVersion } from '@/core/sync';
import { useLocale } from '@/core/i18n/useLocale';
import { chapterDisplayName, getChapter } from '@/features/reader/data/chapters';

import { listReciters, type CatalogReciter } from '../data/reciters';
import { useReciterDownloads } from '../reciter-downloads';
import { usePlayerStore } from '../playerStore';
import { useAudioSettings } from '../settings';
import { defaultReciterId, resolveReciterId } from '../settings-model';

export type PlayerNames = {
  reciter: CatalogReciter | undefined;
  /** The reciter's name in the app's language, or '' when nothing is loaded. */
  reciterName: string;
  /** The surah's bare name in the app's language (no «سورة» prefix), or null when no surah is loaded. */
  chapterName: string | null;
};

// The reciter and surah names the player shows. While audio plays or loads it is the playing reciter; otherwise it is the
// selected one (ADR 0062 decision 7), so the paused player names the reciter a play would use.
export function usePlayerNames(): PlayerNames {
  const locale = useLocale();
  const storedReciterId = usePlayerStore((state) => state.reciterId);
  const chapterId = usePlayerStore((state) => state.chapterId);
  const playingNow = usePlayerStore((state) => state.status === 'playing' || state.status === 'loading');
  const selectedReciterId = useAudioSettings((state) => state.reciterId);
  // The mini player mounts at app start, often before the content database opens or the catalogue syncs. A failed
  // open is not cached: the lookup runs again after an install or a catalogue sync.
  const installedVersion = useReciterDownloads((state) => state.installedVersion);
  const catalogVersion = useCatalogVersion((state) => state.version);

  // The mini player is mounted on every tab, idle or not, so a missing content database means no names, not a crash.
  const { reciter, chapter } = useMemo(() => {
    try {
      const executor = openContentDb().executor;
      const reciters = listReciters(executor);
      const wanted = playingNow
        ? (storedReciterId ?? defaultReciterId(reciters))
        : resolveReciterId(selectedReciterId, reciters, defaultReciterId(reciters));
      return {
        reciter: reciters.find((row) => row.resourceId === wanted),
        chapter: chapterId === null ? undefined : getChapter(executor, chapterId),
      };
    } catch {
      return { reciter: undefined, chapter: undefined };
    }
    // installedVersion and catalogVersion are not read here: they only re-run the lookup after an install or a sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogVersion, chapterId, installedVersion, playingNow, selectedReciterId, storedReciterId]);

  // An empty Arabic or English name falls back to the other language, as a missing one does.
  const reciterName = (locale === 'ar' ? reciter?.nameAr || reciter?.name : reciter?.name || reciter?.nameAr) || '';
  const chapterName = chapter === undefined ? null : chapterDisplayName(chapter, locale);

  return { reciter, reciterName, chapterName };
}
