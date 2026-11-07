import type { IconName } from '@/shared/ui';
import { useTranslation } from 'react-i18next';

import { useLocale } from '@/core/i18n';
import { prayerClock } from '@/core/i18n/clock';
import { minutesUntil, remainingLabel } from '@/core/i18n/durations';
import { useNextPrayer, useNow, usePrayerLocation, useTodayTimes } from '@/features/salah/hooks';

import { isTime } from '@/features/home/data/next-prayer';

import { MenuCard } from './MenuCard';

// A minute tick is enough: the menu only shows minutes, and the Salah screen keeps the second-by-second countdown.
export const MENU_SALAH_TICK_MS = 60_000;

/**
 * The menu's prayer card (screens/, #Menu). It owns the minute clock, so the tick re-renders this card and
 * not the menu. The title is the next prayer's name and the preview its time and the time left; without a location it
 * shows a neutral line instead. Opens the Salah screen through `onPress`.
 */
export function MenuSalahCard({
  caption,
  icon,
  onPress,
  testID = 'menu-card-salah',
}: {
  caption: string;
  icon: IconName;
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const now = useNow(MENU_SALAH_TICK_MS);
  const { coords } = usePrayerLocation();
  const times = useTodayTimes(coords, now);
  const next = useNextPrayer(times, coords, now);

  if (next === null || coords === null || !isTime(next.time)) {
    return (
      <MenuCard
        caption={caption}
        icon={icon}
        onPress={onPress}
        preview={t('menu.salah.noLocation')}
        testID={testID}
        title={t('menu.salah.title')}
      />
    );
  }

  const remaining = remainingLabel(minutesUntil(next.time, now), locale, t);
  return (
    <MenuCard
      caption={caption}
      icon={icon}
      onPress={onPress}
      preview={t('menu.salah.preview', { remaining, time: prayerClock(next.time, locale) })}
      testID={testID}
      title={t(`home.salah.${next.name}`)}
    />
  );
}
