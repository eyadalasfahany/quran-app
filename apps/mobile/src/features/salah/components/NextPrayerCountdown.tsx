import { useLocale } from '@/core/i18n/useLocale';

import { useNow } from '../hooks/useNow';
import { formatRemaining } from '../data/time-format';
import { NextPrayerHero } from './NextPrayerHero';

/**
 * The next-prayer hero with its ticking countdown. The one-second clock lives here, not on the screen, so only this
 * component re-renders each second; the screen re-renders only when the prayer state changes (usePrayerClock).
 */
export function NextPrayerCountdown({
  prayerName,
  time,
  previousTime,
  nextTime,
  city,
  sourceLabel,
  testID,
}: {
  /** Localized prayer name («المغرب»). */
  prayerName: string;
  /** Formatted prayer time («٥:٤٧»). */
  time: string;
  /** The start of the current interval: the prayer that has just passed. */
  previousTime: Date;
  /** The next obligatory prayer's time, which the countdown runs to. */
  nextTime: Date;
  /** Manual city name; omitted under automatic location. */
  city?: string;
  /** «تلقائي» / «يدوي». */
  sourceLabel: string;
  testID?: string;
}) {
  const locale = useLocale();
  const now = useNow(1000);
  const span = nextTime.getTime() - previousTime.getTime();
  const progress = (now.getTime() - previousTime.getTime()) / span;

  return (
    <NextPrayerHero
      city={city}
      prayerName={prayerName}
      progress={progress}
      remaining={formatRemaining(nextTime.getTime() - now.getTime(), locale)}
      sourceLabel={sourceLabel}
      testID={testID}
      time={time}
    />
  );
}
