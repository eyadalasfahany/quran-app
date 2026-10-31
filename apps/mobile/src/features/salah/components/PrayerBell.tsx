import { useTranslation } from 'react-i18next';

import { IconButton, type IconName } from '@/shared/ui';

import type { NextPrayerName } from '../data/prayer-times';
import { useBell } from '../hooks';

const BELL_OFF: IconName = { ios: 'bell', android: 'notifications' };
const BELL_ON: IconName = { ios: 'bell.fill', android: 'notifications_active' };

/**
 * A prayer's reminder toggle: brand and selected while armed, muted outline while not.
 * The tap persists to MMKV (step 3); the scheduler picks it up in step 4.
 */
export function PrayerBell({ prayer, testID }: { prayer: NextPrayerName; testID?: string }) {
  const { t } = useTranslation();
  const { enabled, toggle } = useBell(prayer);

  return (
    <IconButton
      icon={enabled ? BELL_ON : BELL_OFF}
      label={t('salah.notify', { name: t(`home.salah.${prayer}`) })}
      onPress={toggle}
      pressed={enabled}
      testID={testID}
      tone="muted"
    />
  );
}
