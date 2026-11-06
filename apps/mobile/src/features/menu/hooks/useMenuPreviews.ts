import type { Href } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { openContentDb, useContentDb } from '@/core/db/content/open';
import { formatNumber, useLocale } from '@/core/i18n';
import { storage, storageKeys } from '@/core/storage/mmkv';
import { useLastReadVerseKey } from '@/features/reader/anchor/useLastReadVerseKey';
import { chapterDisplayName, getChapter } from '@/features/reader/data/chapters';
import { getVerseByKey } from '@/features/reader/data/verses';
import { planProgress, toLocalDateString, useActivePlan, usePlanLogs } from '@/features/khatma/data';
import { resolvePlanBounds } from '@/features/khatma/plan-bounds';
import { qiblaBearing } from '@/features/salah/data/prayer-times';
import { usePrayerLocation } from '@/features/salah/hooks';

export type MenuPreviews = {
  qiblaPreview: string;
  /** Null without an active plan: the Khatma card then shows no preview line. */
  khatmaPreview: string | null;
  /** The «تابع القراءة» card: the saved position, opened at its ayah. Null on a fresh install. */
  continueReading: { title: string; preview: string; href: Href } | null;
};

/**
 * Live previews for the menu cards. Every string is localised here, so the screen only places them. The prayer card has
 * its own minute clock (`MenuSalahCard`), so this hook keeps no timer and the menu does not re-render each minute.
 */
export function useMenuPreviews(): MenuPreviews {
  const { t } = useTranslation();
  const locale = useLocale();

  // Qibla: the bearing from the saved or GPS location (read-only use of the Salah hooks).
  const { coords } = usePrayerLocation();
  const bearing = useMemo(() => (coords ? qiblaBearing(coords) : null), [coords]);

  // Khatma: today's day of the active plan.
  const { ready } = useContentDb();
  const activePlan = useActivePlan().data[0] ?? null;
  const planLogs = usePlanLogs(activePlan?.id);
  // Read on each render: the day rolls over on the next render after midnight (as `useHomeWird` does).
  const today = toLocalDateString(new Date());
  const khatmaPreview = useMemo(() => {
    if (activePlan === null || !ready) {
      return null;
    }
    try {
      const bounds = resolvePlanBounds(openContentDb().executor, activePlan.startVerseId);
      if (bounds === null) {
        return null;
      }
      const progress = planProgress(activePlan, planLogs.data, today, bounds.pagesTotal);
      return t('menu.khatma.today', {
        day: formatNumber(progress.dayIndex, locale),
        total: formatNumber(activePlan.durationDays, locale),
      });
    } catch {
      return null;
    }
  }, [activePlan, planLogs.data, ready, today, locale, t]);

  // Continue reading: the saved position (the same source Home's card reads). A fresh install has none saved.
  const savedVerseKey = useLastReadVerseKey();
  const hasSavedPosition = storage.getString(storageKeys.readerLastVerseKey) !== undefined;
  const continueReading = useMemo(() => {
    if (!hasSavedPosition || !ready) {
      return null;
    }
    try {
      const executor = openContentDb().executor;
      const verse = getVerseByKey(executor, savedVerseKey);
      const chapter = verse === undefined ? undefined : getChapter(executor, verse.chapterId);
      if (verse === undefined || chapter === undefined) {
        return null;
      }
      return {
        title: chapterDisplayName(chapter, locale),
        preview: t('menu.continueReading.preview', {
          ayah: formatNumber(verse.verseNumber, locale),
          page: formatNumber(verse.page, locale),
        }),
        href: `/read/${verse.verseKey}?place=1` as Href,
      };
    } catch {
      return null;
    }
  }, [hasSavedPosition, ready, savedVerseKey, locale, t]);

  return {
    qiblaPreview:
      bearing === null
        ? t('menu.qibla.noLocation')
        : t('menu.qibla.bearing', { degrees: formatNumber(Math.round(bearing), locale) }),
    khatmaPreview,
    continueReading,
  };
}
