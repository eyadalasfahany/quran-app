import { useTranslation } from 'react-i18next';

import { PrayerPermissionDialog } from '@/features/salah/components/PrayerPermissionDialog';
import { useBell } from '@/features/salah/hooks';
import type { NextPrayerName } from '@/features/salah/data/prayer-times';
import { ToggleRow } from '@/shared/ui/ToggleRow';

/**
 * One prayer's notification switch in Settings. It is the same bell the الصلاة row shows: both read and write the
 * MMKV key through `useBell`, so the two stay in step. Turning it on asks for permission; a refusal reverts the switch
 * and shows the shared permission dialog.
 */
export function PrayerReminderRow({ prayer }: { prayer: NextPrayerName }) {
  const { t } = useTranslation();
  const { enabled, setEnabled, permissionDenied, dismissPermissionDenied } = useBell(prayer);

  return (
    <>
      <ToggleRow
        onValueChange={(on) => {
          void setEnabled(on);
        }}
        testID={`prayer-reminder-${prayer}`}
        title={t('salah.notify', { name: t(`home.salah.${prayer}`) })}
        value={enabled}
      />
      <PrayerPermissionDialog onClose={dismissPermissionDenied} visible={permissionDenied} />
    </>
  );
}
