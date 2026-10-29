import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { openContentDb, useContentDb } from '@/core/db/content/open';
import { useLocale } from '@/core/i18n';
import { useRecentListens } from '@/features/audio/data/recent-listens-hooks';
import { listReciters } from '@/features/audio/data/reciters';
import { recitationStyleKey, reciterInitial } from '@/features/audio/player-view';
import { reciterDisplayName } from '@/features/audio/reciter-list';
import type { RecentListen } from '@/features/audio/data/recent-listens';
import { getChapter } from '@/features/reader/data/chapters';

export type RecentListenItem = {
  key: string;
  /** The saved listen, so play can resume it. */
  listen: RecentListen;
  /** Whether the reciter's pack is installed; a play installs it first when it is not. */
  installed: boolean;
  letter: string;
  name: string;
  subtitle: string;
  playLabel: string;
};

/**
 * Home's recent listens, joined to the catalogue for the reciter's name and style and to the surah's name.
 * A listen whose reciter or surah is unknown is left out, as Home leaves out what it has no data for.
 */
export function useRecentListenItems(limit = 2): RecentListenItem[] {
  const { t } = useTranslation();
  const locale = useLocale();
  const { ready } = useContentDb();
  const { data: listens } = useRecentListens(limit);

  return useMemo(() => {
    if (!ready || listens.length === 0) {
      return [];
    }
    try {
      const executor = openContentDb().executor;
      const reciters = listReciters(executor);
      return listens.flatMap((listen) => {
        const reciter = reciters.find((row) => row.resourceId === listen.reciterResourceId);
        const chapter = getChapter(executor, listen.chapterId);
        if (reciter === undefined || chapter === undefined) {
          return [];
        }
        const name = reciterDisplayName(reciter, locale, t('listen.unnamed'));
        const surah = t('reader.surahTitle', { name: locale === 'ar' ? chapter.nameArabic : chapter.nameSimple });
        const styleKey = recitationStyleKey(reciter.style);
        return [
          {
            key: String(listen.audioFileId),
            listen,
            installed: reciter.installed,
            letter: reciterInitial(name),
            name,
            subtitle: styleKey === null ? surah : t('home.recent.subtitle', { surah, style: t(styleKey) }),
            playLabel: t('home.recent.play', { surah }),
          },
        ];
      });
    } catch {
      // The content database is closed: Home draws without the section.
      return [];
    }
  }, [listens, locale, ready, t]);
}
