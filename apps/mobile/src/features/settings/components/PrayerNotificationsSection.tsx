import { useTranslation } from 'react-i18next';

import { BELL_PRAYERS } from '@/features/salah/data/bells';

import { PrayerReminderRow } from './PrayerReminderRow';
import { SettingsGroup } from './SettingsGroup';

/**
 * The «إشعارات الصلاة» group in Settings: one switch per obligatory prayer (ADR 0030 §3). It mirrors the five bells on
 * the الصلاة tab and shares their state, so nothing is pre-enabled and the two never disagree.
 */
export function PrayerNotificationsSection({ testID = 'prayer-notifications-section' }: { testID?: string }) {
  const { t } = useTranslation();

  return (
    <SettingsGroup testID={testID} title={t('settings.sections.prayerNotifications')}>
      {BELL_PRAYERS.map((prayer) => (
        <PrayerReminderRow key={prayer} prayer={prayer} />
      ))}
    </SettingsGroup>
  );
}
