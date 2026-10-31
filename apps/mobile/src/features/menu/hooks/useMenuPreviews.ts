import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { openContentDb, useContentDb } from '@/core/db/content/open';
import { formatNumber, useLocale } from '@/core/i18n';
import { planProgress, toLocalDateString, useActivePlan, usePlanLogs } from '@/features/khatma/data';
import { resolvePlanBounds } from '@/features/khatma/plan-bounds';
import { qiblaBearing } from '@/features/salah/data/prayer-times';
import { useNextPrayer, useNow, usePrayerLocation, useTodayTimes } from '@/features/salah/hooks';

import { minutesUntil, prayerClock, remainingLabel } from '../data/previews';


export type MenuPreviews = {
  prayerTitle: string;
  prayerPreview: string;
  qiblaPreview: string;
  /** Null without an active plan: the Khatma card then shows no preview line. */
  khatmaPreview: string | null;
};

// A minute tick is enough: the menu only shows minutes, and the Salah screen keeps the second-by-second countdown.
const MENU_TICK_MS = 60_000;

/** Live previews for the prayer, Qibla and Khatma cards. Every string is localised here, so the screen only places them. */
export function useMenuPreviews(): MenuPreviews {
  const { t } = useTranslation();
  const locale = useLocale();
  const now = useNow(MENU_TICK_MS);

  // Prayer and Qibla (read-only use of the Salah hooks).
  const { coords } = usePrayerLocation();
  const times = useTodayTimes(coords, now);
  const next = useNextPrayer(times, coords, now);
  const bearing = useMemo(() => (coords ? qiblaBearing(coords) : null), [coords]);

  // Khatma: today's day of the active plan.
  const { ready } = useContentDb();
  const activePlan = useActivePlan().data[0] ?? null;
  const planLogs = usePlanLogs(activePlan?.id);
  const today = toLocalDateString(now);
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

  if (next === null || coords === null) {
    return {
      prayerTitle: t('menu.salah.title'),
      prayerPreview: t('menu.salah.noLocation'),
      qiblaPreview: t('menu.qibla.noLocation'),
      khatmaPreview,
    };
  }

  const remaining = remainingLabel(minutesUntil(next.time, now), locale, t);
  return {
    prayerTitle: t(`home.salah.${next.name}`),
    prayerPreview: t('menu.salah.preview', { remaining, time: prayerClock(next.time, locale) }),
    qiblaPreview:
      bearing === null
        ? t('menu.qibla.noLocation')
        : t('menu.qibla.bearing', { degrees: formatNumber(Math.round(bearing), locale) }),
    khatmaPreview,
  };
}
