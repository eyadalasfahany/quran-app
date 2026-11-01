import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useLocale } from '@/core/i18n';
import { prayerClock } from '@/core/i18n/clock';
import { minutesUntil, remainingLabel } from '@/core/i18n/durations';
import { useNextPrayer, useNow, usePrayerLocation, useTodayTimes } from '@/features/salah/hooks';

/** What Home's next-prayer card shows: the prayer, its time and the time left, or a prompt for a location. */
export type NextPrayerCard =
  | { kind: 'prayer'; name: string; time: string; remaining: string }
  | { kind: 'noLocation' };

// The card shows minutes, so a minute tick is enough (the Salah screen keeps the second-by-second countdown).
const CARD_TICK_MS = 60_000;

/**
 * The next prayer for Home (ADR 0034 §6). It reads the Salah hooks without changing them, and shares the menu's
 * formatter for «بعد ساعتين و٥ دقائق». Without a location it asks for one.
 */
export function useNextPrayerCard(): NextPrayerCard {
  const { t } = useTranslation();
  const locale = useLocale();
  const now = useNow(CARD_TICK_MS);
  const { coords } = usePrayerLocation();
  const times = useTodayTimes(coords, now);
  const next = useNextPrayer(times, coords, now);

  return useMemo((): NextPrayerCard => {
    if (next === null || coords === null) {
      return { kind: 'noLocation' };
    }
    return {
      kind: 'prayer',
      name: t(`home.salah.${next.name}`),
      remaining: remainingLabel(minutesUntil(next.time, now), locale, t),
      time: prayerClock(next.time, locale),
    };
  }, [coords, locale, next, now, t]);
}
