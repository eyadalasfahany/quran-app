import { useTranslation } from 'react-i18next';

import { IconButton, type IconName } from '@/shared/ui';

import type { NextPrayerName } from '../data/prayer-times';
import { useBell } from '../hooks';

import { PrayerPermissionDialog } from './PrayerPermissionDialog';

const BELL_OFF: IconName = { ios: 'bell', android: 'notifications' };
const BELL_ON: IconName = { ios: 'bell.fill', android: 'notifications_active' };

/**
 * A prayer's reminder toggle: brand and selected while armed, muted outline while not.
 * The tap runs `useBell`: permission on the first turn-on, then MMKV and a re-plan of the prayer notifications
 * (ADR 0030 §3). A refusal leaves the bell off and shows the shared permission dialog (ADR 0034).
 */
export function PrayerBell({ prayer, testID }: { prayer: NextPrayerName; testID?: string }) {
  const { t } = useTranslation();
  const { enabled, toggle, permissionDenied, dismissPermissionDenied } = useBell(prayer);

  return (
    <>
      <IconButton
        icon={enabled ? BELL_ON : BELL_OFF}
        label={t('salah.notify', { name: t(`home.salah.${prayer}`) })}
        onPress={toggle}
        pressed={enabled}
        testID={testID}
        tone="muted"
      />
      <PrayerPermissionDialog onClose={dismissPermissionDenied} visible={permissionDenied} />
    </>
  );
}
