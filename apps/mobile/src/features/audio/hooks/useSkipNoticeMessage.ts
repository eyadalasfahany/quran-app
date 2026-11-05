import { useEffect, useMemo } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useTranslation } from 'react-i18next';

import { openContentDb } from '@/core/db/content/open';
import { formatNumber } from '@/core/i18n/numbers';
import type { Locale } from '@/core/i18n/locale';
import { useLocale } from '@/core/i18n/useLocale';
import { chapterDisplayName, getChapter } from '@/features/reader/data/chapters';

import { listReciters } from '../data/reciters';
import { reciterDisplayName } from '../reciter-list';
import { useSkipNoticeStore, type SkipNotice } from '../skip-notice';

// The id of the last notice announced. Module-level, so a notice is announced once even when both mini bars mount.
let announcedId: number | null = null;

// The reciter's name and, for one surah, its name. Empty strings when the content database is not open yet.
function skipNames(notice: SkipNotice, locale: Locale, unnamed: string): { surah: string; reciter: string } {
  try {
    const db = openContentDb().executor;
    const reciter = listReciters(db).find((row) => row.resourceId === notice.reciterId);
    const reciterName = reciter === undefined ? unnamed : reciterDisplayName(reciter, locale, unnamed);
    const single = notice.chapterIds.length === 1 ? notice.chapterIds[0] : undefined;
    const chapter = single === undefined ? undefined : getChapter(db, single);
    return { reciter: reciterName, surah: chapter === undefined ? '' : chapterDisplayName(chapter, locale) };
  } catch {
    return { reciter: unnamed, surah: '' };
  }
}

/**
 * The skip notice's text for the playing bar, or null. One skipped surah names it; several give the count. Also
 * announces the notice to VoiceOver and TalkBack, once per notice id.
 */
export function useSkipNoticeMessage(): string | null {
  const { t } = useTranslation();
  const locale = useLocale();
  const notice = useSkipNoticeStore((state) => state.notice);

  const message = useMemo(() => {
    if (notice === null) {
      return null;
    }
    const names = skipNames(notice, locale, t('listen.unnamed'));
    if (notice.chapterIds.length === 1) {
      return t('player.mini.skipped', { surah: names.surah, reciter: names.reciter });
    }
    return t('player.mini.skippedMany', {
      count: formatNumber(notice.chapterIds.length, locale),
      reciter: names.reciter,
    });
  }, [notice, locale, t]);

  useEffect(() => {
    if (notice === null || message === null || notice.id === announcedId) {
      return;
    }
    // Announce only the notice still in the store: a notice replaced or cleared before its effect ran is not spoken.
    if (useSkipNoticeStore.getState().notice?.id !== notice.id) {
      return;
    }
    announcedId = notice.id;
    AccessibilityInfo.announceForAccessibility(message);
  }, [notice, message]);

  return message;
}

/** Test-only: forget which notice was announced. */
export function resetSkipAnnouncementForTests(): void {
  announcedId = null;
}
