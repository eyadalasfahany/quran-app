import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useLocale } from '@/core/i18n';
import { prayerClock } from '@/core/i18n/clock';
import { minutesUntil, remainingLabel } from '@/core/i18n/durations';
import { useNextPrayer, usePrayerLocation, useTodayTimes } from '@/features/salah/hooks';

/** A computed prayer time that exists. Polar latitudes can yield no time, and minutesUntil needs a real Date. */
export function isTime(value: Date | null | undefined): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

/** What Home's next-prayer card shows: the prayer, its time and the time left, or a prompt for a location. */
export type NextPrayerCard =
  | { kind: 'prayer'; name: string; time: string; remaining: string }
  | { kind: 'noLocation' };

/**
 * The next prayer for Home (ADR 0034 §6). It reads the Salah hooks without changing them, and shares the menu's
 * formatter for «بعد ساعتين و٥ دقائق». Without a location it asks for one.
 *
 * `now` is the caller's clock. The card component owns the minute tick (`HomeNextPrayer`), so the tick re-renders that
 * card alone and not the whole of Home.
 */
export function useNextPrayerCard(now: Date): NextPrayerCard {
  const { t } = useTranslation();
  const locale = useLocale();
  const { coords } = usePrayerLocation();
  const times = useTodayTimes(coords, now);
  const next = useNextPrayer(times, coords, now);

  return useMemo((): NextPrayerCard => {
    // A prayer time can be missing at extreme latitudes (adhan returns no time), so a missing time reads as no prayer.
    if (next === null || coords === null || !isTime(next.time)) {
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
